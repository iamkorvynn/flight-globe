// FlightGlobe — flight model: resolve a flight to a live position on the globe.
import { arcPoint, greatCircleDistanceKm, minutesBetween } from './geo.js';
import { flightProgress } from './time.js';

export const ARC_HEIGHT = 0.09; // peak lift above the surface, fraction of radius

export function depMinutes(f) {
  const [h, m] = f.dep.split(':').map(Number);
  return h * 60 + m;
}
export function arrMinutes(f) {
  const [h, m] = f.arr.split(':').map(Number);
  return h * 60 + m;
}

export function flightDurationMin(f) {
  return minutesBetween(f.dep, f.arr);
}

export function flightDistanceKm(f, airportsByCode) {
  const a = airportsByCode.get(f.from);
  const b = airportsByCode.get(f.to);
  if (!a || !b) return null;
  return greatCircleDistanceKm(a.lat, a.lon, b.lat, b.lon);
}

/**
 * Live position of a flight at nowMin (minutes since midnight UTC).
 * Returns null when not airborne. Otherwise { lat, lon, lift, progress, heading }.
 */
export function flightPosition(f, airportsByCode, nowMin) {
  const a = airportsByCode.get(f.from);
  const b = airportsByCode.get(f.to);
  if (!a || !b) return null;
  const p = flightProgress(depMinutes(f), arrMinutes(f), nowMin);
  if (p === null) return null;
  const pos = arcPoint(a.lat, a.lon, b.lat, b.lon, p, ARC_HEIGHT);
  // Heading: bearing a touch further along the arc.
  const ahead = arcPoint(a.lat, a.lon, b.lat, b.lon, Math.min(1, p + 0.01), ARC_HEIGHT);
  const heading = Math.atan2(ahead.lon - pos.lon, ahead.lat - pos.lat);
  return { ...pos, progress: p, heading };
}

/** Flights airborne at nowMin, with positions attached. */
export function airborneFlights(flights, airportsByCode, nowMin) {
  const out = [];
  for (const f of flights) {
    const pos = flightPosition(f, airportsByCode, nowMin);
    if (pos) out.push({ flight: f, ...pos });
  }
  return out;
}

/** Human route label: "SIN → LHR". */
export function routeLabel(f) { return `${f.from} → ${f.to}`; }
