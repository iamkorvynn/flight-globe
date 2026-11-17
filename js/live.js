// FlightGlobe — optional live data (OpenSky flights, USGS earthquakes).
// Free public APIs, no keys. Every call is best-effort with a timeout and
// the caller always falls back to bundled sample data on any failure,
// so the app works fully offline.
import { fetchJson } from './data.js';

const FETCH_TIMEOUT_MS = 6000;

async function fetchJsonTimeout(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Live flights from OpenSky (states in a bounding box around the globe is not
 * supported, so we sample the global feed and keep states with a callsign).
 * Returns a list of { id, callsign, lat, lon, heading } or null on failure.
 */
export async function fetchLiveFlights(limit = 60) {
  const data = await fetchJsonTimeout('https://opensky-network.org/api/states/all');
  if (!data || !Array.isArray(data.states)) return null;
  const out = [];
  for (const s of data.states) {
    const [, callsign, , , , lon, lat, , , heading] = s;
    if (typeof lat !== 'number' || typeof lon !== 'number') continue;
    if (!callsign || !callsign.trim()) continue;
    out.push({ id: callsign.trim(), callsign: callsign.trim(), lat, lon, heading: heading ?? 0 });
    if (out.length >= limit) break;
  }
  return out.length ? out : null;
}

/**
 * Live earthquakes from USGS (past day, magnitude 2.5+).
 * Returns a list of { lat, lon, mag, place, time } or null on failure.
 */
export async function fetchLiveQuakes() {
  const data = await fetchJsonTimeout(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
  );
  if (!data || !Array.isArray(data.features)) return null;
  const out = data.features.map((f) => {
    const [lon, lat] = f.geometry.coordinates;
    return {
      lat, lon,
      mag: f.properties.mag ?? 0,
      place: f.properties.place ?? 'Unknown location',
      time: f.properties.time ?? null,
    };
  }).filter((q) => Number.isFinite(q.lat) && Number.isFinite(q.lon));
  return out.length ? out : null;
}

/** Try both live sources in parallel; nulls mean "keep bundled data". */
export async function fetchLiveData() {
  const [flights, quakes] = await Promise.all([fetchLiveFlights(), fetchLiveQuakes()]);
  return { flights, quakes, live: Boolean(flights || quakes) };
}

export { fetchJson };
