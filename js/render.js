// FlightGlobe — canvas renderer: globe disc, land, graticule, night shading.
import { project } from './math.js';
import { subsolarPoint, terminatorPoints } from './time.js';

export const COLORS = {
  ocean: '#0a1628',
  oceanGlow: '#0e1e38',
  land: '#1d3a2a',
  landEdge: '#3f6b4f',
  graticule: 'rgba(148, 163, 184, 0.18)',
  night: 'rgba(2, 6, 23, 0.55)',
  limb: 'rgba(56, 189, 248, 0.35)',
};

/** Draw the ocean disc + subtle glow. Returns { cx, cy, radius }. */
export function drawOcean(ctx, w, h, radius) {
  const cx = w / 2, cy = h / 2;
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.55, cx, cy, radius * 1.25);
  glow.addColorStop(0, 'rgba(56, 189, 248, 0.10)');
  glow.addColorStop(0.75, 'rgba(56, 189, 248, 0.03)');
  glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const ocean = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.35, radius * 0.1, cx, cy, radius);
  ocean.addColorStop(0, COLORS.oceanGlow);
  ocean.addColorStop(1, COLORS.ocean);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = ocean;
  ctx.fill();
  return { cx, cy, radius };
}

/** Draw one land polygon (array of [lat, lon]); skips back-face segments. */
export function drawLandPolygon(ctx, poly, view, radius, projector) {
  const { centerLat, centerLon, cx, cy } = view;
  const proj = projector ?? ((lat, lon) => project(lat, lon, centerLat, centerLon, radius, cx, cy));
  ctx.beginPath();
  let started = false;
  let prevVisible = false;
  for (const [lat, lon] of poly) {
    const p = proj(lat, lon);
    if (p.visible) {
      if (!started || !prevVisible) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
      started = true;
    }
    prevVisible = p.visible;
  }
  ctx.closePath();
  ctx.fillStyle = COLORS.land;
  ctx.fill();
  ctx.strokeStyle = COLORS.landEdge;
  ctx.lineWidth = 0.7;
  ctx.stroke();
}

export function drawLand(ctx, land, view, radius, projector) {
  if (!land || !Array.isArray(land.polygons)) return;
  for (const poly of land.polygons) drawLandPolygon(ctx, poly, view, radius, projector);
}

/** Flat-map land: fills the rectangle background and draws every polygon. */
export function drawFlatMap(ctx, land, w, h, projector) {
  ctx.fillStyle = COLORS.ocean;
  ctx.fillRect(0, 0, w, h);
  if (!land || !Array.isArray(land.polygons)) return;
  for (const poly of land.polygons) {
    ctx.beginPath();
    poly.forEach(([lat, lon], i) => {
      const p = projector(lat, lon);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = COLORS.land;
    ctx.fill();
    ctx.strokeStyle = COLORS.landEdge;
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

/** Latitude/longitude grid lines every 30°. Accepts an optional projector. */
export function drawGraticule(ctx, view, radius, projector) {
  const { centerLat, centerLon, cx, cy } = view;
  const proj = projector ?? ((lat, lon) => project(lat, lon, centerLat, centerLon, radius, cx, cy));
  ctx.strokeStyle = COLORS.graticule;
  ctx.lineWidth = 0.6;
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    let pen = false;
    for (let lon = -180; lon <= 180; lon += 4) {
      const p = proj(lat, lon);
      if (!p.visible) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let lon = -180; lon < 180; lon += 30) {
    ctx.beginPath();
    let pen = false;
    for (let lat = -90; lat <= 90; lat += 4) {
      const p = proj(lat, lon);
      if (!p.visible) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

/** Flat-map graticule: straight lat/lon lines across the rectangle. */
export function drawFlatGraticule(ctx, w, h, projector) {
  ctx.strokeStyle = COLORS.graticule;
  ctx.lineWidth = 0.6;
  for (let lat = -60; lat <= 60; lat += 30) {
    const a = projector(lat, -180);
    const b = projector(lat, 180);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  for (let lon = -150; lon <= 150; lon += 30) {
    const a = projector(-90, lon);
    const b = projector(90, lon);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

const TAU = Math.PI * 2;
function normAngle(a) { return ((a % TAU) + TAU) % TAU; }

/**
 * Shade the night side of the globe. The terminator is projected, then the
 * path is closed along the disc limb on the side farthest from the subsolar
 * point (the night side).
 */
export function drawNight(ctx, date, view, radius) {
  const { centerLat, centerLon, cx, cy } = view;
  const pts = terminatorPoints(date, 180)
    .map(({ lat, lon }) => project(lat, lon, centerLat, centerLon, radius, cx, cy))
    .filter((p) => p.visible);
  if (pts.length < 3) return;
  const first = pts[0];
  const last = pts[pts.length - 1];
  const sun = subsolarPoint(date);
  const sunP = project(sun.lat, sun.lon, centerLat, centerLon, radius, cx, cy);
  // Night limb midpoint: the disc point farthest from the projected sun.
  const sunAngle = Math.atan2(sunP.y - cy, sunP.x - cx);
  const nightAngle = normAngle(sunAngle + Math.PI);
  const aLast = normAngle(Math.atan2(last.y - cy, last.x - cx));
  const aFirst = normAngle(Math.atan2(first.y - cy, first.x - cx));
  // Sweep from aLast to aFirst passing through nightAngle?
  const ccw = normAngle(aFirst - aLast); // counter-clockwise sweep size
  const passesNight = normAngle(nightAngle - aLast) <= ccw;
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (const p of pts) ctx.lineTo(p.x, p.y);
  // ctx.arc(x, y, r, start, end, anticlockwise). We want the arc from aLast
  // to aFirst that passes through nightAngle.
  ctx.arc(cx, cy, radius, aLast, aFirst, !passesNight);
  ctx.closePath();
  ctx.fillStyle = COLORS.night;
  ctx.fill();
}

/** Draw the glowing limb ring around the disc. */
export function drawLimb(ctx, cx, cy, radius) {
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.limb;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
