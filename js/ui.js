// FlightGlobe — sidebar UI: search, flight list, detail panel, stats.
import { formatDuration, formatKm, minutesBetween } from './geo.js';
import { flightDistanceKm, flightDurationMin } from './flights.js';
import { formatTimeUTC } from './time.js';
import { quakeSeverity, strongestQuake } from './quakes.js';

export function el(id) { return document.getElementById(id); }

/** Render the top-bar stat chips. */
export function renderTopStats({ airborne, quakes, sats }) {
  el('topStats').innerHTML = `
    <div class="stat"><b>${airborne}</b><span>Flights airborne</span></div>
    <div class="stat"><b>${quakes}</b><span>Earthquakes · 24h</span></div>
    <div class="stat"><b>${sats}</b><span>Satellites tracked</span></div>`;
}

/** Render the layer counts next to each layer toggle. */
export function renderLayerCounts({ flights, quakes, sats }) {
  el('countFlights').textContent = flights;
  el('countQuakes').textContent = quakes;
  el('countSats').textContent = sats;
}

/** Render layer stats (definition list). */
export function renderStats({ airborne, totalFlights, quakes, sats, longest }) {
  const strong = strongestQuake(quakes);
  el('statsList').innerHTML = `
    <dt>Flights airborne now</dt><dd>${airborne} / ${totalFlights}</dd>
    <dt>Longest route in the air</dt><dd>${longest ? `${longest.flight.from} → ${longest.flight.to} · ${formatKm(longest.km)}` : '—'}</dd>
    <dt>Earthquakes (sample, 24h)</dt><dd>${quakes.length}</dd>
    <dt>Strongest quake</dt><dd>${strong ? `M${strong.mag.toFixed(1)} · ${quakeSeverity(strong.mag)} · ${strong.place}` : '—'}</dd>
    <dt>Satellites tracked</dt><dd>${sats}</dd>`;
}

/** Render the clickable list of airborne flights. */
export function renderFlightList(airborne, airportsByCode, selectedId, onPick) {
  const ul = el('flightList');
  ul.innerHTML = '';
  const sorted = [...airborne].sort((a, b) => b.progress - a.progress);
  for (const item of sorted) {
    const li = document.createElement('li');
    if (item.flight.id === selectedId) li.classList.add('active');
    const a = airportsByCode.get(item.flight.from);
    const b = airportsByCode.get(item.flight.to);
    li.innerHTML = `<span class="code">${item.flight.id}</span>
      <span class="route">${a ? a.city : item.flight.from} → ${b ? b.city : item.flight.to}</span>
      <span>${Math.round(item.progress * 100)}%</span>`;
    li.addEventListener('click', () => onPick(item.flight));
    ul.appendChild(li);
  }
  if (!sorted.length) ul.innerHTML = '<li class="muted">No flights airborne at this time — drag the timeline.</li>';
}

/** Render the flight detail panel. */
export function renderFlightDetail(flight, airportsByCode, nowMin) {
  const body = el('detailBody');
  const followBar = el('followBar');
  if (!flight) {
    el('detailTitle').textContent = 'Flight detail';
    body.innerHTML = '<p class="muted">Click a plane on the globe, or pick a flight below, to see its route, distance and timing — and to follow it.</p>';
    followBar.hidden = true;
    return;
  }
  const a = airportsByCode.get(flight.from);
  const b = airportsByCode.get(flight.to);
  const km = flightDistanceKm(flight, airportsByCode);
  const dur = flightDurationMin(flight);
  el('detailTitle').textContent = `${flight.id} · ${flight.from} → ${flight.to}`;
  body.innerHTML = `
    <p class="big">${a ? a.city : flight.from} → ${b ? b.city : flight.to}</p>
    <p>${a ? `${a.name} (${a.code})` : ''} → ${b ? `${b.name} (${b.code})` : ''}</p>
    <p>Distance <b>${km ? formatKm(km) : '—'}</b> · Duration <b>${formatDuration(dur)}</b></p>
    <p>Departs <b>${flight.dep} UTC</b> · Arrives <b>${flight.arr} UTC</b> · Now <b>${formatTimeUTC(nowMin)} UTC</b></p>
    <p class="muted">Aircraft: ${flight.aircraft ?? '—'} · Airline: ${flight.airline ?? '—'}</p>`;
  followBar.hidden = false;
}

/** Wire the airport search box; onPick fires with the chosen airport. */
export function wireAirportSearch(airports, onPick) {
  const input = el('airportSearch');
  const results = el('airportResults');
  const render = () => {
    const q = input.value.trim().toLowerCase();
    results.innerHTML = '';
    if (q.length < 2) return;
    const hits = airports.filter((a) =>
      a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
    ).slice(0, 8);
    for (const a of hits) {
      const li = document.createElement('li');
      li.innerHTML = `<span class="code">${a.code}</span><span>${a.city} — ${a.name}</span>`;
      li.addEventListener('click', () => { onPick(a); results.innerHTML = ''; input.value = ''; });
      results.appendChild(li);
    }
    if (!hits.length) results.innerHTML = '<li class="muted">No matching airport.</li>';
  };
  input.addEventListener('input', render);
}

/** Wire the layer checkboxes; onChange fires with the layer state object. */
export function wireLayerToggles(onChange) {
  const read = () => ({
    flights: el('layerFlights').checked,
    quakes: el('layerQuakes').checked,
    sats: el('layerSats').checked,
    night: el('layerNight').checked,
    graticule: el('layerGraticule').checked,
  });
  for (const id of ['layerFlights', 'layerQuakes', 'layerSats', 'layerNight', 'layerGraticule']) {
    el(id).addEventListener('change', () => onChange(read()));
  }
  return read();
}

export function setDataSourceLabel(text, live) {
  const d = el('dataSource');
  d.textContent = text;
  d.classList.toggle('live', Boolean(live));
}

/** Show a clicked earthquake in the detail panel. */
export function renderQuakeDetail(quake) {
  if (!quake) return;
  el('detailTitle').textContent = `Earthquake · M${quake.mag.toFixed(1)}`;
  el('detailBody').innerHTML = `
    <p class="big">${quake.place}</p>
    <p>Magnitude <b>M${quake.mag.toFixed(1)}</b> · ${quakeSeverity(quake.mag)}</p>
    <p>Location <b>${quake.lat.toFixed(2)}°, ${quake.lon.toFixed(2)}°</b>${quake.depthKm ? ` · Depth <b>${quake.depthKm} km</b>` : ''}</p>
    ${quake.time ? `<p class="muted">${quake.time}</p>` : ''}`;
  el('followBar').hidden = true;
}

/** Show a clicked satellite in the detail panel. */
export function renderSatelliteDetail(sat, nowMin) {
  if (!sat) return;
  el('detailTitle').textContent = `Satellite · ${sat.name}`;
  el('detailBody').innerHTML = `
    <p class="big">${sat.name}</p>
    <p>Inclination <b>${sat.inclination}°</b> · Period <b>${sat.periodMin} min</b></p>
    <p>Altitude <b>${sat.altitudeKm.toLocaleString('en-US')} km</b></p>
    <p class="muted">Position shown for ${formatTimeUTC(nowMin)} UTC. Circular-orbit model — sample data.</p>`;
  el('followBar').hidden = true;
}

/** Show the two-point measurement result in the detail panel. */
export function renderMeasureResult(measurement) {
  if (!measurement) return;
  el('detailTitle').textContent = 'Distance measurement';
  el('detailBody').innerHTML = `
    <p class="big">${formatKm(measurement.km)}</p>
    <p>${measurement.start.lat.toFixed(2)}°, ${measurement.start.lon.toFixed(2)}° → ${measurement.end.lat.toFixed(2)}°, ${measurement.end.lon.toFixed(2)}°</p>
    <p class="muted">Great-circle distance. Click the globe twice to measure again.</p>`;
  el('followBar').hidden = true;
}

export function setClockText(text) { el('clock').textContent = text; }
export function setScrubTime(text) { el('scrubTime').textContent = text; }
export { minutesBetween };
