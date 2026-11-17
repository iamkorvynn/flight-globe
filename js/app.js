// FlightGlobe — app bootstrap: state, animation loop, drag/zoom, follow mode.
import { clamp, project, unproject } from './math.js';
import { cleanDataset, loadBundledData, validateAirport, validateFlight, validateLand, validateQuake, validateSatellite } from './data.js';
import { airborneFlights, flightDistanceKm } from './flights.js';
import { fetchLiveData } from './live.js';
import { drawGraticule, drawLand, drawLimb, drawNight, drawOcean } from './render.js';
import { drawAirports, drawFlightArcs, drawLiveFlights, drawMeasurement, drawPlane, drawPulse, drawQuakes, drawSatellites, drawSunMarker, hitTestPlanes, hitTestQuakes } from './layers.js';
import { advanceSimMinutes, formatTimeUTC, minutesOfDay, subsolarPoint } from './time.js';
import { applyKey, isGlobeKey } from './keyboard.js';
import { loadPrefs, mergePrefs, savePrefs } from './persist.js';
import { clearMeasurement, measureClick, newMeasurement } from './measure.js';
import {
  el, renderFlightDetail, renderFlightList, renderLayerCounts, renderMeasureResult, renderQuakeDetail, renderStats,
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
  autoRotate: false,
  measureMode: false,
  measurement: newMeasurement(),
  pulse: null, // { lat, lon, startedAt } — airport search highlight
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
  if (state.layers.flights && state.liveFlights) drawLiveFlights(ctx, state.liveFlights, view, radius);

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

  // Sun marker + search pulse + measurement overlay sit above the shading.
  if (state.layers.night) {
    const sun = subsolarPoint(simDate());
    drawSunMarker(ctx, sun.lat, sun.lon, view, radius);
  }
  if (state.pulse) {
    const age = (performance.now() - state.pulse.startedAt) / 2000;
    if (age > 3) state.pulse = null;
    else drawPulse(ctx, state.pulse.lat, state.pulse.lon, view, radius, age);
  }
  drawMeasurement(ctx, state.measurement, view, radius);

  // Auto-rotate slowly when enabled and the user is not dragging/following.
  if (state.autoRotate && !state.dragging && !state.following) {
    state.centerLon = ((state.centerLon + 0.03 + 540) % 360) - 180;
  }

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
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      if (state.measureMode) {
        const ll = unproject(px, py, state.centerLat, state.centerLon,
          viewSize.size * 0.42 * state.zoom, rect.width / 2, rect.height / 2);
        if (ll) {
          const done = measureClick(state.measurement, ll.lat, ll.lon);
          if (done) {
            renderMeasureResult(done);
            state.measureMode = false;
            el('measureBtn').classList.remove('active');
            el('measureHint').hidden = true;
          }
        }
        return;
      }
      const hit = hitTestPlanes(state._planes ?? [], px, py);
      if (hit) { selectFlight(hit.flight); return; }
      const qhit = hitTestQuakes(state.quakes,
        { centerLat: state.centerLat, centerLon: state.centerLon, cx: rect.width / 2, cy: rect.height / 2 },
        viewSize.size * 0.42 * state.zoom, px, py);
      if (qhit) {
        state.selectedFlight = null;
        renderQuakeDetail(qhit.quake);
      }
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
  el('resetViewBtn').addEventListener('click', () => {
    state.centerLat = 20; state.centerLon = 10; state.zoom = 1; state.following = false;
  });
  el('rotateBtn').addEventListener('click', (e) => {
    state.autoRotate = !state.autoRotate;
    e.currentTarget.classList.toggle('active', state.autoRotate);
  });
  el('measureBtn').addEventListener('click', (e) => {
    state.measureMode = !state.measureMode;
    if (state.measureMode) clearMeasurement(state.measurement);
    e.currentTarget.classList.toggle('active', state.measureMode);
    el('measureHint').hidden = !state.measureMode;
  });
  el('measureCancelBtn').addEventListener('click', () => {
    state.measureMode = false;
    clearMeasurement(state.measurement);
    el('measureBtn').classList.remove('active');
    el('measureHint').hidden = true;
  });
  el('exportBtn').addEventListener('click', () => {
    const a = document.createElement('a');
    a.download = `flightglobe-${formatTimeUTC(state.simMin).replace(':', '')}-utc.png`;
    a.href = el('globe').toDataURL('image/png');
    a.click();
  });
  document.querySelectorAll('#presetBar [data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.simMin = Number(btn.dataset.preset);
      el('scrubber').value = String(state.simMin);
    });
  });
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    if (e.key === ' ') {
      e.preventDefault();
      state.playing = !state.playing;
      el('playBtn').textContent = state.playing ? '⏸' : '▶';
      return;
    }
    if (isGlobeKey(e.key)) {
      e.preventDefault();
      state.following = false;
      applyKey(state, e.key);
    }
  });
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
    state.pulse = { lat: a.lat, lon: a.lon, startedAt: performance.now() };
  });
  setDataSourceLabel('Bundled sample data', false);

  // Restore saved prefs (layers + camera), if any.
  const prefs = mergePrefs(
    { centerLat: 20, centerLon: 10, zoom: 1, layers: state.layers },
    loadPrefs(window.localStorage),
  );
  state.centerLat = prefs.centerLat;
  state.centerLon = prefs.centerLon;
  state.zoom = prefs.zoom;
  if (prefs.layers) {
    state.layers = { ...state.layers, ...prefs.layers };
    for (const [key, id] of [['flights', 'layerFlights'], ['quakes', 'layerQuakes'], ['sats', 'layerSats'], ['night', 'layerNight'], ['graticule', 'layerGraticule']]) {
      const box = el(id);
      if (box && typeof state.layers[key] === 'boolean') box.checked = state.layers[key];
    }
  }
  // Save prefs when the page unloads.
  window.addEventListener('beforeunload', () => {
    savePrefs(window.localStorage, {
      centerLat: state.centerLat, centerLon: state.centerLon, zoom: state.zoom, layers: state.layers,
    });
  });

  // Optional live data: best effort, never blocks the bundled experience.
  try {
    const live = await fetchLiveData();
    if (live.quakes) { state.quakes = live.quakes.filter(validateQuake); }
    if (live.flights) { state.liveFlights = live.flights; }
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
