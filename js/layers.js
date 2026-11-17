// FlightGlobe — layer drawing: flight arcs + planes, quakes, satellites.
import { project } from './math.js';
import { sampleArc } from './geo.js';
import { quakeColor, quakeRadiusPx } from './quakes.js';
import { satelliteOrbitRing, satellitePosition } from './satellites.js';

/** Draw great-circle arcs for airborne flights (faint) + full route arcs. */
export function drawFlightArcs(ctx, flights, airportsByCode, view, radius, selectedId) {
  const { centerLat, centerLon, cx, cy } = view;
  for (const f of flights) {
    const a = airportsByCode.get(f.from);
    const b = airportsByCode.get(f.to);
    if (!a || !b) continue;
    const pts = sampleArc(a.lat, a.lon, b.lat, b.lon, 48, 0.09);
    ctx.beginPath();
    let pen = false;
    for (const pt of pts) {
      const liftR = radius * pt.lift;
      const p = project(pt.lat, pt.lon, centerLat, centerLon, liftR, cx, cy);
      if (!p.visible) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
      else ctx.lineTo(p.x, p.y);
    }
    const selected = f.id === selectedId;
    ctx.strokeStyle = selected ? 'rgba(245, 158, 11, 0.95)' : 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();
  }
}

/** Draw a small plane marker (triangle) at a lat/lon, rotated by heading. */
export function drawPlane(ctx, lat, lon, lift, headingDeg, view, radius, opts = {}) {
  const { centerLat, centerLon, cx, cy } = view;
  const p = project(lat, lon, centerLat, centerLon, radius * lift, cx, cy);
  if (!p.visible) return null;
  const size = opts.size ?? 7;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate((headingDeg * Math.PI) / 180);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.7, size * 0.8);
  ctx.lineTo(0, size * 0.35);
  ctx.lineTo(-size * 0.7, size * 0.8);
  ctx.closePath();
  ctx.fillStyle = opts.color ?? '#7dd3fc';
  ctx.shadowColor = opts.color ?? '#38bdf8';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();
  return { x: p.x, y: p.y, z: p.z };
}

/** Draw airport dots. */
export function drawAirports(ctx, airports, view, radius) {
  const { centerLat, centerLon, cx, cy } = view;
  for (const a of airports) {
    const p = project(a.lat, a.lon, centerLat, centerLon, radius, cx, cy);
    if (!p.visible) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232, 238, 252, 0.75)';
    ctx.fill();
  }
}

/** Draw earthquake markers, sized + coloured by magnitude. */
export function drawQuakes(ctx, quakes, view, radius) {
  const { centerLat, centerLon, cx, cy } = view;
  for (const q of quakes) {
    const p = project(q.lat, q.lon, centerLat, centerLon, radius, cx, cy);
    if (!p.visible) continue;
    const r = quakeRadiusPx(q.mag);
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = quakeColor(q.mag);
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = quakeColor(q.mag);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Draw satellite orbit rings + moving dots. */
export function drawSatellites(ctx, satellites, nowMin, view, radius) {
  const { centerLat, centerLon, cx, cy } = view;
  for (const s of satellites) {
    const ring = satelliteOrbitRing(s, 96);
    ctx.beginPath();
    let pen = false;
    for (const pt of ring) {
      const p = project(pt.lat, pt.lon, centerLat, centerLon, radius * 1.12, cx, cy);
      if (!p.visible) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const pos = satellitePosition(s, nowMin);
    const p = project(pos.lat, pos.lon, centerLat, centerLon, radius * 1.12, cx, cy);
    if (!p.visible) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#c4b5fd';
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/** Hit-test: nearest airborne plane within `tolPx` of a screen point. */
export function hitTestPlanes(planes, px, py, tolPx = 14) {
  let best = null;
  let bestD = tolPx;
  for (const pl of planes) {
    if (!pl.screen) continue;
    const d = Math.hypot(pl.screen.x - px, pl.screen.y - py);
    if (d < bestD) { bestD = d; best = pl; }
  }
  return best;
}
