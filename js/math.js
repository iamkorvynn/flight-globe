// FlightGlobe — projection math: lat/lon <-> screen for an orthographic globe.
// Pure functions, no DOM. Angles in degrees unless a name says radians.
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;

export function toRad(deg) { return deg * DEG; }
export function toDeg(rad) { return rad * RAD; }

/** Clamp a number into [lo, hi]. */
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/** Normalise longitude into (-180, 180]. */
export function normLon(lon) {
  let l = ((lon + 180) % 360 + 360) % 360 - 180;
  if (l === -180) l = 180;
  return l;
}

/** Unit 3D vector for a lat/lon point on the sphere. */
export function latLonToVec(lat, lon) {
  const la = toRad(lat);
  const lo = toRad(lon);
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}

/** lat/lon back from a unit 3D vector. */
export function vecToLatLon([x, y, z]) {
  const lat = toDeg(Math.asin(clamp(z, -1, 1)));
  const lon = normLon(toDeg(Math.atan2(y, x)));
  return { lat, lon };
}

/**
 * Rotate a unit vector so the globe centre (centerLat, centerLon) faces the viewer.
 * Returns view-space [x, y, z] where +z points at the viewer, +x right, +y up.
 * Standard orthographic projection:
 *   x = cos φ · sin(λ − λ0)
 *   y = cos φ0 · sin φ − sin φ0 · cos φ · cos(λ − λ0)
 *   z = sin φ0 · sin φ + cos φ0 · cos φ · cos(λ − λ0)
 */
export function rotateToView(vec, centerLat, centerLon) {
  const { lat, lon } = vecToLatLon(vec);
  const phi = toRad(lat);
  const phi0 = toRad(centerLat);
  const dLambda = toRad(lon - centerLon);
  return [
    Math.cos(phi) * Math.sin(dLambda),
    Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(dLambda),
    Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(dLambda),
  ];
}

/** Inverse of rotateToView: view-space vector back to world unit vector. */
export function rotateFromView([x, y, z], centerLat, centerLon) {
  const phi0 = toRad(centerLat);
  const lat = toDeg(Math.asin(clamp(z * Math.sin(phi0) + y * Math.cos(phi0), -1, 1)));
  const lon = centerLon + toDeg(Math.atan2(x, z * Math.cos(phi0) - y * Math.sin(phi0)));
  return latLonToVec(lat, lon);
}

/**
 * Project lat/lon to canvas pixels.
 * @param {number} lat @param {number} lon @param {number} centerLat @param {number} centerLon
 * @param {number} radius globe radius in px @param {number} cx centre x @param {number} cy centre y
 * @returns {{x:number,y:number,visible:boolean,z:number}}
 */
export function project(lat, lon, centerLat, centerLon, radius, cx, cy) {
  const v = rotateToView(latLonToVec(lat, lon), centerLat, centerLon);
  return {
    x: cx + v[0] * radius,
    y: cy - v[1] * radius,
    visible: v[2] > 0,
    z: v[2],
  };
}

/**
 * Unproject canvas pixels back to lat/lon. Returns null outside the disc.
 */
export function unproject(px, py, centerLat, centerLon, radius, cx, cy) {
  const nx = (px - cx) / radius;
  const ny = (cy - py) / radius;
  const r2 = nx * nx + ny * ny;
  if (r2 > 1) return null;
  const nz = Math.sqrt(Math.max(0, 1 - r2));
  return vecToLatLon(rotateFromView([nx, ny, nz], centerLat, centerLon));
}

/** Angular distance (degrees) between two lat/lon points. */
export function angularDistance(lat1, lon1, lat2, lon2) {
  const a = latLonToVec(lat1, lon1);
  const b = latLonToVec(lat2, lon2);
  const dot = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1);
  return toDeg(Math.acos(dot));
}

// ---- Equirectangular (flat-map) projection ---------------------------------

/** Flat-map: lat/lon to pixels in a w×h rectangle. */
export function projectFlat(lat, lon, w, h) {
  return {
    x: ((normLon(lon) + 180) / 360) * w,
    y: ((90 - lat) / 180) * h,
    visible: true,
    z: 1,
  };
}

/** Flat-map inverse: pixels back to lat/lon (null outside the rectangle). */
export function unprojectFlat(px, py, w, h) {
  if (px < 0 || px > w || py < 0 || py > h) return null;
  return { lat: 90 - (py / h) * 180, lon: (px / w) * 360 - 180 };
}

/**
 * Build a projector function (lat, lon, lift=1) => {x, y, visible, z}
 * for the orthographic globe, for a given view + radius.
 */
export function makeGlobeProjector(view, radius) {
  const { centerLat, centerLon, cx, cy } = view;
  return (lat, lon, lift = 1) => project(lat, lon, centerLat, centerLon, radius * lift, cx, cy);
}

/** Build a projector function for the flat equirectangular map. */
export function makeFlatProjector(w, h) {
  return (lat, lon) => projectFlat(lat, lon, w, h);
}
