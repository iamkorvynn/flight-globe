// FlightGlobe — app bootstrap: state, animation loop, drag/zoom, follow mode.
import { clamp, project, unproject } from './math.js';
import { cleanDataset, loadBundledData, validateAirport, validateFlight, validateLand, validateQuake, validateSatellite } from './data.js';
import { airborneFlights, flightDistanceKm } from './flights.js';
import { fetchLiveData } from './live.js';
import { drawGraticule, drawLand, drawLimb, drawNight, drawOcean } from './render.js';
import { drawAirports, drawFlightArcs, drawPlane, drawQuakes, drawSatellites, hitTestPlanes } from './layers.js';
import { advanceSimMinutes, formatTimeUTC, minutesOfDay } from './time.js';
import {
  el, renderFlightDetail, renderFlightList, renderLayerCounts, renderStats,
  renderTopStats, setClockText, setDataSourceLabel, setScrubTime,
  wireAirportSearch, wireLayerToggles,
} from './ui.js';

const SIM_DATE = new Date(Date.UTC(2026, 10, 18, 12, 0, 0)); // 18 Nov 2026

const state = {
  centerLat: 20,
  centerLon: 10,
  radius: 300,
  zoom: 1,
  simMin: 720, // noon UTC
  playing: false,
  speed: 30, // sim-minutes per real second
  layers: { flights: true, quakes: true, sats: true, night: true, graticule: false },
  selectedFlight: null,
  following: false,
  airports: [],
  airportsByCode: new Map(),
  flights: [],
  quakes: [],
  satellites: [],
  land: { polygons: [] },
  liveFlights: null,
  liveQuakes: null,
  dragging: false,
  lastX: 0,
  lastY: 0,
  moved: 0,
};

function simDate() {
  const d = new Date(SIM_DATE);
  d.setUTCHours(0, Math.floor(state.simMin), Math.floor((state.simMin % 1) * 60), 0);
  return d;
}

function canvasSize() {
  const canvas = el('globe');
  const wrap = el('globeWrap');
  const size = Math.max(320, Math.min(wrap.clientWidth, wrap.clientHeight) - 8);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  return { size, dpr };
}

let viewSize = { size: 600, dpr: 1 };

function draw() {
  const canvas = el('globe');
  const ctx = canvas.getContext('2d');
  const { size, dpr } = viewSize;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);
  const radius = size * 0.42 * state.zoom;
  const { cx, cy } = drawOcean(ctx, size, size, radius);
  const view = { centerLat: state.centerLat, centerLon: state.centerLon, cx, cy };

  drawLand(ctx, state.land, view, radius);
  if (state.layers.graticule) drawGraticule(ctx, view, radius);

  const airborne = airborneFlights(state.flights, state.airportsByCode, state.simMin);
  if (state.layers.flights) {
    drawFlightArcs(ctx, state.flights, state.airportsByCode, view, radius, state.selectedFlight?.id);
    drawAirports(ctx, state.airports, view, radius);
  }
  if (state.layers.quakes) drawQuakes(ctx, state.quakes, view, radius);
  if (state.layers.sats) drawSatellites(ctx, state.satellites, state.simMin, view, radius);

  // Planes on top, with screen positions saved for hit-testing.
  const planes = [];
  if (state.layers.flights) {
    for (const item of airborne) {
      const screen = drawPlane(ctx, item.lat, item.lon, item.lift,
        (item.heading * 180) / Math.PI, view, radius,
        { color: state.selectedFlight?.id === item.flight.id ? '#f59e0b' : '#7dd3fc',
          size: state.selectedFlight?.id === item.flight.id ? 9 : 7 });
      planes.push({ ...item, screen });
    }
  }
  state._planes = planes;
  state._airborne = airborne;

  if (state.layers.night) drawNight(ctx, simDate(), view, radius);
  drawLimb(ctx, cx, cy, radius);

  // Follow mode: ease the camera centre onto the selected plane.
  if (state.following && state.selectedFlight) {
    const cur = airborne.find((a) => a.flight.id === state.selectedFlight.id);
    if (cur) {
      state.centerLat += (cur.lat - state.centerLat) * 0.08;
      state.centerLon += ((cur.lon - state.centerLon + 540) % 360 - 180) * 0.08;
    }
  }
}

function refreshSidebar() {
  const airborne = state._airborne ?? [];
  renderTopStats({ airborne: airborne.length, quakes: state.quakes.length, sats: state.satellites.length });
  renderLayerCounts({ flights: state.flights.length, quakes: state.quakes.length, sats: state.satellites.length });
  let longest = null;
  for (const a of airborne) {
    const km = flightDistanceKm(a.flight, state.airportsByCode) ?? 0;
    if (!longest || km > longest.km) longest = { flight: a.flight, km };
  }
  renderStats({ airborne: airborne.length, totalFlights: state.flights.length, quakes: state.quakes, sats: state.satellites.length, longest });
  renderFlightList(airborne, state.airportsByCode, state.selectedFlight?.id, selectFlight);
  renderFlightDetail(state.selectedFlight, state.airportsByCode, state.simMin);
  setClockText(`${formatTimeUTC(state.simMin)} UTC`);
  setScrubTime(`${formatTimeUTC(state.simMin)} UTC`);
}

function selectFlight(f) {
  state.selectedFlight = f;
  state.following = false;
  refreshSidebar();
}

function fitCanvas() {
  viewSize = canvasSize();
  state.radius = viewSize.size * 0.42;
}

function tick(last) {
  const now = performance.now();
  const dt = Math.min(0.1, (now - last) / 1000);
  if (state.playing) {
    state.simMin = advanceSimMinutes(state.simMin, dt, state.speed);
    el('scrubber').value = String(Math.round(state.simMin));
  }
  draw();
  refreshSidebar();
  requestAnimationFrame(() => tick(now));
}

function wireControls() {
  const canvas = el('globe');
  canvas.addEventListener('pointerdown', (e) => {
    state.dragging = true; state.moved = 0;
    state.lastX = e.clientX; state.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!state.dragging) return;
    const dx = e.clientX - state.lastX;
    const dy = e.clientY - state.lastY;
    state.lastX = e.clientX; state.lastY = e.clientY;
    state.moved += Math.abs(dx) + Math.abs(dy);
    state.following = false;
    const scale = 180 / (viewSize.size * 0.42 * state.zoom);
    state.centerLon = ((state.centerLon + dx * scale + 540) % 360) - 180;
    state.centerLat = clamp(state.centerLat + dy * scale, -85, 85);
  });
  canvas.addEventListener('pointerup', (e) => {
    state.dragging = false;
    if (state.moved < 6) {
      const rect = canvas.getBoundingClientRect();
      const hit = hitTestPlanes(state._planes ?? [], e.clientX - rect.left, e.clientY - rect.top);
      if (hit) selectFlight(hit.flight);
    }
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.zoom = clamp(state.zoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.6, 3);
  }, { passive: false });

  el('scrubber').addEventListener('input', (e) => {
    state.simMin = Number(e.target.value);
    state.playing = false;
    el('playBtn').textContent = '▶';
  });
  el('playBtn').addEventListener('click', () => {
    state.playing = !state.playing;
    el('playBtn').textContent = state.playing ? '⏸' : '▶';
  });
  el('nowBtn').addEventListener('click', () => {
    state.simMin = minutesOfDay(new Date());
    el('scrubber').value = String(Math.round(state.simMin));
  });
  el('speedSel').addEventListener('change', (e) => { state.speed = Number(e.target.value); });
  el('followBtn').addEventListener('click', () => { state.following = true; });
  el('unfollowBtn').addEventListener('click', () => { state.following = false; });
  state.layers = wireLayerToggles((layers) => { state.layers = layers; });
  window.addEventListener('resize', fitCanvas);
}

async function init() {
  fitCanvas();
  wireControls();
  const raw = await loadBundledData();
  const airports = cleanDataset(raw.airports, validateAirport);
  const codes = new Set(airports.valid.map((a) => a.code));
  const flights = cleanDataset(raw.flights, (f) => validateFlight(f, codes));
  const quakes = cleanDataset(raw.earthquakes, validateQuake);
  const sats = cleanDataset(raw.satellites, validateSatellite);
  state.airports = airports.valid;
  state.airportsByCode = new Map(airports.valid.map((a) => [a.code, a]));
  state.flights = flights.valid;
  state.quakes = quakes.valid;
  state.satellites = sats.valid;
  if (raw.land && validateLand(raw.land)) state.land = raw.land;
  wireAirportSearch(state.airports, (a) => {
    state.centerLat = a.lat;
    state.centerLon = a.lon;
    state.following = false;
  });
  setDataSourceLabel('Bundled sample data', false);

  // Optional live data: best effort, never blocks the bundled experience.
  try {
    const live = await fetchLiveData();
    if (live.quakes) { state.quakes = live.quakes.filter(validateQuake); }
    if (live.flights || live.quakes) {
      setDataSourceLabel(
        `Live: ${live.flights ? 'OpenSky flights' : ''}${live.flights && live.quakes ? ' + ' : ''}${live.quakes ? 'USGS quakes' : ''} · fallback bundled`,
        true,
      );
    }
  } catch { /* offline — bundled data stands */ }

  state.simMin = minutesOfDay(new Date());
  el('scrubber').value = String(Math.round(state.simMin));
  requestAnimationFrame(() => tick(performance.now()));
}

init();
