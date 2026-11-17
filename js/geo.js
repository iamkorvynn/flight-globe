// FlightGlobe — great-circle geometry: distances, bearings, arc interpolation.
import { clamp, latLonToVec, normLon, toDeg, toRad, vecToLatLon } from './math.js';

export const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km between two lat/lon points (haversine). */
export function greatCircleDistanceKm(lat1, lon1, lat2, lon2) {
  const dLa = toRad(lat2 - lat1);
  const dLo = toRad(lon2 - lon1);
  const a = Math.sin(dLa / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLo / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing in degrees (0 = north, clockwise) from point 1 to point 2. */
export function initialBearing(lat1, lon1, lat2, lon2) {
  const la1 = toRad(lat1), la2 = toRad(lat2);
  const dLo = toRad(lon2 - lon1);
  const y = Math.sin(dLo) * Math.cos(la2);
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLo);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Slerp between two unit vectors. t in [0,1]. Returns a unit vector.
 * Falls back to linear interpolation for (near-)identical or antipodal inputs.
 */
export function slerpVec(a, b, t) {
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
  const omega = Math.acos(dot);
  if (omega < 1e-6) return a.slice();
  if (Math.PI - omega < 1e-6) {
    // Antipodal: pick any perpendicular axis and rotate around it.
    const perp = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const axis = [
      a[1] * perp[2] - a[2] * perp[1],
      a[2] * perp[0] - a[0] * perp[2],
      a[0] * perp[1] - a[1] * perp[0],
    ];
    const n = Math.hypot(...axis) || 1;
    const [ax, ay, az] = axis.map((v) => v / n);
    const ang = Math.PI * t;
    const c = Math.cos(ang), s = Math.sin(ang);
    return [
      a[0] * c + (ay * a[2] - az * a[1]) * s,
      a[1] * c + (az * a[0] - ax * a[2]) * s,
      a[2] * c + (ax * a[1] - ay * a[0]) * s,
    ];
  }
  const so = Math.sin(omega);
  const k0 = Math.sin((1 - t) * omega) / so;
  const k1 = Math.sin(t * omega) / so;
  return [a[0] * k0 + b[0] * k1, a[1] * k0 + b[1] * k1, a[2] * k0 + b[2] * k1];
}

/**
 * Point along the great-circle arc from (lat1,lon1) to (lat2,lon2) at fraction t.
 * With arcHeight > 0 the point is lifted above the surface (peaks mid-arc),
 * expressed as a fraction of Earth radius — used for flight arcs.
 */
export function arcPoint(lat1, lon1, lat2, lon2, t, arcHeight = 0) {
  const a = latLonToVec(lat1, lon1);
  const b = latLonToVec(lat2, lon2);
  const v = slerpVec(a, b, clamp(t, 0, 1));
  const lift = 1 + arcHeight * Math.sin(Math.PI * clamp(t, 0, 1));
  const { lat, lon } = vecToLatLon(v);
  return { lat, lon, lift };
}

/** Sample an arc into N+1 evenly spaced points (lat/lon/lift). */
export function sampleArc(lat1, lon1, lat2, lon2, segments = 48, arcHeight = 0.08) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    pts.push(arcPoint(lat1, lon1, lat2, lon2, i / segments, arcHeight));
  }
  return pts;
}

/** Format a distance: "8,742 km". */
export function formatKm(km) {
  return `${Math.round(km).toLocaleString('en-US')} km`;
}

/** Format minutes as "7h 25m". */
export function formatDuration(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
}

/** Minutes between two "HH:MM" times, wrapping past midnight. */
export function minutesBetween(depHHMM, arrHHMM) {
  const toMin = (s) => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  };
  let d = toMin(arrHHMM) - toMin(depHHMM);
  if (d <= 0) d += 1440;
  return d;
}

/** Normalise a longitude difference into [-180, 180] for short-way interpolation. */
export function shortLonDelta(lon1, lon2) {
  return normLon(lon2 - lon1);
}
