// FlightGlobe — satellite positions from simple circular-orbit parameters.
// Each satellite: { name, inclination (deg), periodMin, phase (deg), altitudeKm }.
// Position at time t: the satellite advances along its orbit plane at a
// constant rate; this is a teaching model, not SGP4 — good enough to show
// orbit rings and moving dots honestly labelled as sample data.
import { toDeg, toRad } from './math.js';

/** Sub-satellite lat/lon at `minutes` since the epoch minute 0. */
export function satellitePosition(sat, minutes) {
  const frac = (((minutes / sat.periodMin) + sat.phase / 360) % 1 + 1) % 1;
  const u = frac * Math.PI * 2; // argument of latitude
  const inc = toRad(sat.inclination);
  const lat = toDeg(Math.asin(Math.sin(inc) * Math.sin(u)));
  const lon = toDeg(Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)));
  return { lat, lon };
}

/** Points along the satellite's full ground-track ring (lat/lon pairs). */
export function satelliteOrbitRing(sat, count = 96) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const u = (i / count) * Math.PI * 2;
    const inc = toRad(sat.inclination);
    const lat = toDeg(Math.asin(Math.sin(inc) * Math.sin(u)));
    const lon = toDeg(Math.atan2(Math.cos(inc) * Math.sin(u), Math.cos(u)));
    pts.push({ lat, lon });
  }
  return pts;
}

/** Orbital speed in km/s for a circular orbit at altitudeKm. */
export function orbitalSpeedKms(altitudeKm = 550) {
  const mu = 398600.4418; // km^3/s^2
  const r = 6371 + altitudeKm;
  return Math.sqrt(mu / r);
}
