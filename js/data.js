// FlightGlobe — data loading & validation for the bundled datasets.
// All bundled data is plain JSON under data/; live APIs are optional (see live.js)
// and every loader falls back to bundled data when the network is unavailable.
import { clamp } from './math.js';

export const DATA_FILES = {
  airports: 'data/airports.json',
  flights: 'data/flights.json',
  earthquakes: 'data/earthquakes.json',
  satellites: 'data/satellites.json',
  landManifest: 'data/land/manifest.json',
};

export function isValidLat(lat) {
  return typeof lat === 'number' && Number.isFinite(lat) && lat >= -90 && lat <= 90;
}
export function isValidLon(lon) {
  return typeof lon === 'number' && Number.isFinite(lon) && lon >= -180 && lon <= 180;
}

export function validateAirport(a) {
  return a && typeof a.code === 'string' && a.code.length >= 3
    && typeof a.city === 'string' && a.city.length > 0
    && isValidLat(a.lat) && isValidLon(a.lon);
}

export function validateFlight(f, airportCodes) {
  if (!f || typeof f.id !== 'string' || !airportCodes.has(f.from) || !airportCodes.has(f.to)) return false;
  if (f.from === f.to) return false;
  const hhmm = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  return hhmm(f.dep) && hhmm(f.arr);
}

export function validateQuake(q) {
  return q && isValidLat(q.lat) && isValidLon(q.lon)
    && typeof q.mag === 'number' && q.mag >= 0 && q.mag <= 10
    && typeof q.place === 'string' && q.place.length > 0;
}

export function validateSatellite(s) {
  return s && typeof s.name === 'string' && s.name.length > 0
    && typeof s.inclination === 'number' && s.inclination >= 0 && s.inclination <= 180
    && typeof s.periodMin === 'number' && s.periodMin > 0
    && typeof s.phase === 'number';
}

export function validateLand(land) {
  if (!land || !Array.isArray(land.polygons)) return false;
  return land.polygons.every((poly) => Array.isArray(poly) && poly.length >= 3
    && poly.every(([lat, lon]) => isValidLat(lat) && isValidLon(lon)));
}

/** Fetch JSON, returning null (not throwing) on any failure. */
export async function fetchJson(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Load every bundled dataset at once; returns { airports, flights, ... }. */
export async function loadBundledData() {
  const [airports, flights, earthquakes, satellites, land] = await Promise.all([
    fetchJson(DATA_FILES.airports),
    fetchJson(DATA_FILES.flights),
    fetchJson(DATA_FILES.earthquakes),
    fetchJson(DATA_FILES.satellites),
    loadLand(),
  ]);
  return { airports, flights, earthquakes, satellites, land };
}

/** Load the coastline from its per-continent parts via the manifest. */
export async function loadLand() {
  const manifest = await fetchJson(DATA_FILES.landManifest);
  if (!manifest || !Array.isArray(manifest.files)) return null;
  const parts = await Promise.all(manifest.files.map((f) => fetchJson(`data/${f}`)));
  const polygons = [];
  for (const part of parts) {
    if (part && Array.isArray(part.polygons)) polygons.push(...part.polygons);
  }
  return polygons.length ? { polygons } : null;
}

/** Merge already-loaded land parts (used by tests and the validator). */
export function mergeLandParts(parts) {
  const polygons = [];
  for (const part of parts) {
    if (part && Array.isArray(part.polygons)) polygons.push(...part.polygons);
  }
  return { polygons };
}

/** Filter a dataset to its valid rows and count what was dropped. */
export function cleanDataset(rows, validator, extra) {
  const valid = [];
  let dropped = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (validator(row, extra)) valid.push(row);
    else dropped += 1;
  }
  return { valid, dropped };
}

/** Clamp a magnitude into the display range [0, 10]. */
export function clampMagnitude(mag) { return clamp(mag, 0, 10); }
