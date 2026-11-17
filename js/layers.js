// FlightGlobe — layer drawing: flight arcs + planes, quakes, satellites.
import { project } from './math.js';
import { sampleArc } from './geo.js';
import { quakeColor, quakeRadiusPx } from './quakes.js';
import { satelliteOrbitRing, satellitePosition } from './satellites.js';

/** Draw great-circle arcs for airborne flights (faint) + full route arcs. */
export function drawFlightArcs(ctx, flights, airportsByCode, view, radius, selectedId, projector) {
  const proj = projector ?? ((lat, lon, lift = 1) => {
    const { centerLat, centerLon, cx, cy } = view;
    return project(lat, lon, centerLat, centerLon, radius * lift, cx, cy);
  });
  for (const f of flights) {
    const a = airportsByCode.get(f.from);
    const b = airportsByCode.get(f.to);
    if (!a || !b) continue;
    const pts = sampleArc(a.lat, a.lon, b.lat, b.lon, 48, 0.09);
    ctx.beginPath();
    let pen = false;
    for (const pt of pts) {
      const p = proj(pt.lat, pt.lon, pt.lift);
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
  const proj = opts.projector ?? ((la, lo, li = 1) => {
    const { centerLat, centerLon, cx, cy } = view;
    return project(la, lo, centerLat, centerLon, radius * li, cx, cy);
  });
  const p = proj(lat, lon, lift);
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
export function drawAirports(ctx, airports, view, radius, projector) {
  const proj = projector ?? ((lat, lon) => {
    const { centerLat, centerLon, cx, cy } = view;
    return project(lat, lon, centerLat, centerLon, radius, cx, cy);
  });
  for (const a of airports) {
    const p = proj(a.lat, a.lon);
    if (!p.visible) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232, 238, 252, 0.75)';
    ctx.fill();
  }
}

/** Draw earthquake markers, sized + coloured by magnitude. */
export function drawQuakes(ctx, quakes, view, radius, projector) {
  const proj = projector ?? ((lat, lon) => {
    const { centerLat, centerLon, cx, cy } = view;
    return project(lat, lon, centerLat, centerLon, radius, cx, cy);
  });
  for (const q of quakes) {
    const p = proj(q.lat, q.lon);
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
export function drawSatellites(ctx, satellites, nowMin, view, radius, projector) {
  const proj = projector ?? ((lat, lon, lift = 1) => {
    const { centerLat, centerLon, cx, cy } = view;
    return project(lat, lon, centerLat, centerLon, radius * lift, cx, cy);
  });
  for (const s of satellites) {
    const ring = satelliteOrbitRing(s, 96);
    ctx.beginPath();
    let pen = false;
    for (const pt of ring) {
      const p = proj(pt.lat, pt.lon, 1.12);
      if (!p.visible) { pen = false; continue; }
      if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.28)';
    ctx.lineWidth = 1;
    ctx.stroke();

    const pos = satellitePosition(s, nowMin);
    const p = proj(pos.lat, pos.lon, 1.12);
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

/** Draw a fading trail behind a flight: the arc segment already flown. */
export function drawTrail(ctx, flight, airportsByCode, progress, view, radius, projector) {
  const a = airportsByCode.get(flight.from);
  const b = airportsByCode.get(flight.to);
  if (!a || !b || progress <= 0) return;
  const proj = projector ?? ((lat, lon, lift = 1) => {
    const { centerLat, centerLon, cx, cy } = view;
    return project(lat, lon, centerLat, centerLon, radius * lift, cx, cy);
  });
  const pts = sampleArc(a.lat, a.lon, b.lat, b.lon, 48, 0.09)
    .filter((_, i) => i / 48 <= progress);
  if (pts.length < 2) return;
  ctx.beginPath();
  let pen = false;
  for (const pt of pts) {
    const p = proj(pt.lat, pt.lon, pt.lift);
    if (!p.visible) { pen = false; continue; }
    if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
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

/** Draw live OpenSky flight positions as green dots (no schedule attached). */
export function drawLiveFlights(ctx, liveFlights, view, radius) {
  const { centerLat, centerLon, cx, cy } = view;
  for (const f of liveFlights) {
    const p = project(f.lat, f.lon, centerLat, centerLon, radius * 1.02, cx, cy);
    if (!p.visible) continue;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#4ade80';
    ctx.shadowColor = '#22c55e';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

/** Draw a sun marker at the subsolar point. */
export function drawSunMarker(ctx, sunLat, sunLon, view, radius) {
  const { centerLat, centerLon, cx, cy } = view;
  const p = project(sunLat, sunLon, centerLat, centerLon, radius * 1.05, cx, cy);
  if (!p.visible) return;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(253, 230, 138, 0.9)';
  ctx.shadowColor = '#fde68a';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fef08a';
  ctx.fill();
}

/** Hit-test: nearest airport within `tolPx` of a screen point. */
export function hitTestAirports(airports, view, radius, px, py, tolPx = 12) {
  const { centerLat, centerLon, cx, cy } = view;
  let best = null;
  let bestD = tolPx;
  for (const a of airports) {
    const p = project(a.lat, a.lon, centerLat, centerLon, radius, cx, cy);
    if (!p.visible) continue;
    const d = Math.hypot(p.x - px, p.y - py);
    if (d < bestD) { bestD = d; best = { airport: a, screen: p }; }
  }
  return best;
}

/** Hit-test: nearest satellite dot within `tolPx` of a screen point. */
export function hitTestSatellites(satellites, nowMin, view, radius, px, py, tolPx = 14) {
  const { centerLat, centerLon, cx, cy } = view;
  let best = null;
  let bestD = tolPx;
  for (const s of satellites) {
    const pos = satellitePosition(s, nowMin);
    const p = project(pos.lat, pos.lon, centerLat, centerLon, radius * 1.12, cx, cy);
    if (!p.visible) continue;
    const d = Math.hypot(p.x - px, p.y - py);
    if (d < bestD) { bestD = d; best = { satellite: s, screen: p }; }
  }
  return best;
}

/** Hit-test: nearest quake within `tolPx` of a screen point. */
export function hitTestQuakes(quakes, view, radius, px, py, tolPx = 16) {
  const { centerLat, centerLon, cx, cy } = view;
  let best = null;
  let bestD = tolPx;
  for (const q of quakes) {
    const p = project(q.lat, q.lon, centerLat, centerLon, radius, cx, cy);
    if (!p.visible) continue;
    const d = Math.hypot(p.x - px, p.y - py);
    if (d < bestD) { bestD = d; best = { quake: q, screen: p }; }
  }
  return best;
}

/** Draw a pulsing ring at a lat/lon (e.g. a searched airport). */
export function drawPulse(ctx, lat, lon, view, radius, phase) {
  const { centerLat, centerLon, cx, cy } = view;
  const p = project(lat, lon, centerLat, centerLon, radius, cx, cy);
  if (!p.visible) return;
  const r = 6 + (phase % 1) * 18;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(56, 189, 248, ${0.8 * (1 - (phase % 1))})`;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Draw the measurement line + endpoints, if a measurement is in progress. */
export function drawMeasurement(ctx, measurement, view, radius) {
  if (!measurement || !measurement.start) return;
  const { centerLat, centerLon, cx, cy } = view;
  const s = project(measurement.start.lat, measurement.start.lon, centerLat, centerLon, radius, cx, cy);
  if (s.visible) {
    ctx.beginPath();
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }
  if (!measurement.end) return;
  const pts = sampleArc(measurement.start.lat, measurement.start.lon,
    measurement.end.lat, measurement.end.lon, 48, 0.05);
  ctx.beginPath();
  let pen = false;
  for (const pt of pts) {
    const p = project(pt.lat, pt.lon, centerLat, centerLon, radius * pt.lift, cx, cy);
    if (!p.visible) { pen = false; continue; }
    if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
    else ctx.lineTo(p.x, p.y);
  }
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
  const e = project(measurement.end.lat, measurement.end.lon, centerLat, centerLon, radius, cx, cy);
  if (e.visible) {
    ctx.beginPath();
    ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }
}
