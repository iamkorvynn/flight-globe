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
 */
export function rotateToView(vec, centerLat, centerLon) {
  const [x, y, z] = vec;
  const lo = toRad(-centerLon);
  const cLo = Math.cos(lo), sLo = Math.sin(lo);
  // Rotate around the z axis by -centerLon so centre longitude faces +x.
  const x1 = x * cLo - y * sLo;
  const y1 = x * sLo + y * cLo;
  const z1 = z;
  // Rotate around the y axis by -centerLat so centre latitude faces +z.
  const la = toRad(-centerLat);
  const cLa = Math.cos(la), sLa = Math.sin(la);
  const x2 = x1 * cLa + z1 * sLa;
  const z2 = -x1 * sLa + z1 * cLa;
  return [x2, y1, z2];
}

/** Inverse of rotateToView: view-space vector back to world unit vector. */
export function rotateFromView([x, y, z], centerLat, centerLon) {
  const la = toRad(centerLat);
  const cLa = Math.cos(la), sLa = Math.sin(la);
  const x1 = x * cLa - z * sLa;
  const z1 = x * sLa + z * cLa;
  const y1 = y;
  const lo = toRad(centerLon);
  const cLo = Math.cos(lo), sLo = Math.sin(lo);
  const x2 = x1 * cLo - y1 * sLo;
  const y2 = x1 * sLo + y1 * cLo;
  return [x2, y2, z1];
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
