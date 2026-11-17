// FlightGlobe — time & sun math for the scrubber and the day/night terminator.
import { clamp, latLonToVec, toDeg, toRad } from './math.js';

/** Minutes since midnight (UTC) for a Date. */
export function minutesOfDay(date) {
  return date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
}

/** "HH:MM" (UTC) for minutes since midnight. */
export function formatTimeUTC(mins) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Fraction of a flight's journey completed at `nowMin` (minutes since midnight). */
export function flightProgress(depMin, arrMin, nowMin) {
  let dur = arrMin - depMin;
  if (dur <= 0) dur += 1440;
  let el = nowMin - depMin;
  if (el < 0) el += 1440;
  if (el > dur) return null; // not airborne at this time
  return el / dur;
}

/** Is the flight airborne at nowMin? */
export function isAirborne(depMin, arrMin, nowMin) {
  return flightProgress(depMin, arrMin, nowMin) !== null;
}

/**
 * Subsolar point (lat/lon where the sun is directly overhead) for a Date.
 * Uses the standard low-precision solar position algorithm (good to ~0.01°).
 */
export function subsolarPoint(date) {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const n = jd - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360; // mean longitude
  const g = toRad((357.528 + 0.9856003 * n) % 360); // mean anomaly
  const lambda = toRad(L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g));
  const eps = toRad(23.439 - 0.0000004 * n);
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * (jd - 2451545.0)) % 24;
  const lon = ((toDeg(ra) - gmst * 15 + 180 + 540) % 360) - 180;
  return { lat: toDeg(dec), lon };
}

/** Unit vector pointing from Earth's centre toward the sun. */
export function sunDirection(date) {
  const { lat, lon } = subsolarPoint(date);
  return latLonToVec(lat, lon);
}

/** Is a lat/lon point in daylight at this date? (dot with sun direction > 0) */
export function isDaylight(lat, lon, date) {
  const p = latLonToVec(lat, lon);
  const s = sunDirection(date);
  return p[0] * s[0] + p[1] * s[1] + p[2] * s[2] > 0;
}

/**
 * Points along the day/night terminator (great circle 90° from the subsolar
 * point), as lat/lon pairs, for a Date. `count` points around the circle.
 */
export function terminatorPoints(date, count = 128) {
  const sun = sunDirection(date);
  // Build an orthonormal basis perpendicular to the sun direction.
  const ref = Math.abs(sun[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
  const u = [
    sun[1] * ref[2] - sun[2] * ref[1],
    sun[2] * ref[0] - sun[0] * ref[2],
    sun[0] * ref[1] - sun[1] * ref[0],
  ];
  const un = Math.hypot(...u) || 1;
  const ux = u.map((v) => v / un);
  const vx = [
    sun[1] * ux[2] - sun[2] * ux[1],
    sun[2] * ux[0] - sun[0] * ux[2],
    sun[0] * ux[1] - sun[1] * ux[0],
  ];
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const v = [
      ux[0] * Math.cos(a) + vx[0] * Math.sin(a),
      ux[1] * Math.cos(a) + vx[1] * Math.sin(a),
      ux[2] * Math.cos(a) + vx[2] * Math.sin(a),
    ];
    const lat = toDeg(Math.asin(clamp(v[2], -1, 1)));
    const lon = toDeg(Math.atan2(v[1], v[0]));
    pts.push({ lat, lon });
  }
  return pts;
}

/** Advance simulated minutes by real seconds * speed (minutes per second). */
export function advanceSimMinutes(simMin, realSeconds, speed) {
  return (simMin + realSeconds * speed) % 1440;
}
