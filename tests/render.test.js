// Tests: canvas renderer with a stub 2D context (no browser needed).
// Verifies the draw functions call the right canvas primitives and that
// night shading / land drawing complete without throwing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawFlatGraticule, drawFlatMap, drawGraticule, drawLand, drawLimb, drawNight, drawOcean } from '../js/render.js';
import { drawPlane, drawQuakes, drawLiveFlights, drawPulse, drawSunMarker, drawTrail, hitTestAirports, hitTestPlanes, hitTestQuakes, hitTestSatellites, drawMeasurement } from '../js/layers.js';
import { makeFlatProjector, project } from '../js/math.js';
import { satellitePosition } from '../js/satellites.js';

function makeCtx() {
  const calls = [];
  const gradient = { addColorStop() {} };
  const ctx = {
    calls,
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, shadowColor: '', shadowBlur: 0,
    beginPath() { calls.push('beginPath'); },
    moveTo(x, y) { calls.push(['moveTo', Math.round(x), Math.round(y)]); },
    lineTo(x, y) { calls.push(['lineTo', Math.round(x), Math.round(y)]); },
    arc(x, y, r) { calls.push(['arc', Math.round(x), Math.round(y), Math.round(r)]); },
    closePath() { calls.push('closePath'); },
    fill() { calls.push('fill'); },
    stroke() { calls.push('stroke'); },
    fillRect() { calls.push('fillRect'); },
    save() { calls.push('save'); },
    restore() { calls.push('restore'); },
    translate() { calls.push('translate'); },
    rotate() { calls.push('rotate'); },
    createRadialGradient() { return gradient; },
  };
  return ctx;
}

const VIEW = { centerLat: 20, centerLon: 10, cx: 450, cy: 450 };
const LAND = { polygons: [[[51, 0], [52, 2], [50, 3], [49, 1]], [[-33, 151], [-32, 152], [-34, 150]]] };

test('drawOcean returns centre and radius and fills the disc', () => {
  const ctx = makeCtx();
  const { cx, cy, radius } = drawOcean(ctx, 900, 900, 300);
  assert.equal(cx, 450);
  assert.equal(cy, 450);
  assert.equal(radius, 300);
  assert.ok(ctx.calls.some((c) => c[0] === 'arc' && c[3] === 300), 'disc arc drawn');
});

test('drawLand fills one path per polygon', () => {
  const ctx = makeCtx();
  drawLand(ctx, LAND, VIEW, 300);
  const fills = ctx.calls.filter((c) => c === 'fill').length;
  assert.equal(fills, 2);
});

test('drawLand tolerates missing data', () => {
  const ctx = makeCtx();
  assert.doesNotThrow(() => drawLand(ctx, null, VIEW, 300));
  assert.doesNotThrow(() => drawLand(ctx, { polygons: [] }, VIEW, 300));
});

test('drawGraticule strokes lines without throwing', () => {
  const ctx = makeCtx();
  assert.doesNotThrow(() => drawGraticule(ctx, VIEW, 300));
  assert.ok(ctx.calls.filter((c) => c === 'stroke').length > 0);
});

test('drawNight fills a night region and completes', () => {
  const ctx = makeCtx();
  const date = new Date(Date.UTC(2026, 10, 18, 12, 0, 0));
  assert.doesNotThrow(() => drawNight(ctx, date, VIEW, 300));
  assert.ok(ctx.calls.includes('fill'), 'night fill drawn');
});

test('drawLimb strokes the disc edge', () => {
  const ctx = makeCtx();
  drawLimb(ctx, 450, 450, 300);
  assert.ok(ctx.calls.some((c) => c[0] === 'arc' && c[3] === 300));
});

test('drawPlane returns screen coords when visible, null when hidden', () => {
  const ctx = makeCtx();
  const vis = drawPlane(ctx, 20, 10, 1, 90, VIEW, 300);
  assert.ok(vis, 'centre point visible');
  assert.equal(Math.round(vis.x), 450);
  assert.equal(Math.round(vis.y), 450);
  const hidden = drawPlane(ctx, -20, -170, 1, 90, VIEW, 300);
  assert.equal(hidden, null);
});

test('drawQuakes draws one marker per visible quake', () => {
  const ctx = makeCtx();
  drawQuakes(ctx, [
    { lat: 20, lon: 10, mag: 6.5, place: 'centre' },
    { lat: -20, lon: -170, mag: 5.0, place: 'far side' },
  ], VIEW, 300);
  const arcs = ctx.calls.filter((c) => c[0] === 'arc');
  assert.equal(arcs.length, 2, 'visible quake gets fill + ring arcs');
});

test('hitTestPlanes finds the nearest plane within tolerance', () => {
  const planes = [
    { flight: { id: 'A' }, screen: { x: 100, y: 100 } },
    { flight: { id: 'B' }, screen: { x: 200, y: 200 } },
  ];
  assert.equal(hitTestPlanes(planes, 105, 102).flight.id, 'A');
  assert.equal(hitTestPlanes(planes, 500, 500), null);
  assert.equal(hitTestPlanes([], 100, 100), null);
});

test('drawLiveFlights draws green dots for visible live flights only', () => {
  const ctx = makeCtx();
  drawLiveFlights(ctx, [
    { lat: 20, lon: 10, callsign: 'BAW1' },
    { lat: -20, lon: -170, callsign: 'FAR1' },
  ], VIEW, 300);
  const arcs = ctx.calls.filter((c) => c[0] === 'arc');
  assert.equal(arcs.length, 1, 'only the visible live flight is drawn');
});

test('drawSunMarker draws at the subsolar point when visible', () => {
  const ctx = makeCtx();
  drawSunMarker(ctx, 20, 10, VIEW, 300);
  assert.ok(ctx.calls.some((c) => c[0] === 'arc'), 'sun marker drawn');
  const ctx2 = makeCtx();
  drawSunMarker(ctx2, -20, -170, VIEW, 300);
  assert.equal(ctx2.calls.filter((c) => c[0] === 'arc').length, 0, 'hidden sun not drawn');
});

test('hitTestQuakes finds the nearest quake', () => {
  const hit = hitTestQuakes(
    [{ lat: 20, lon: 10, mag: 6.5, place: 'centre' }, { lat: -20, lon: -170, mag: 5, place: 'far' }],
    VIEW, 300, 452, 448,
  );
  assert.ok(hit && hit.quake.place === 'centre');
  assert.equal(hitTestQuakes([{ lat: 20, lon: 10, mag: 6.5, place: 'centre' }], VIEW, 300, 100, 100), null);
});

test('drawPulse and drawMeasurement complete without throwing', () => {
  const ctx = makeCtx();
  assert.doesNotThrow(() => drawPulse(ctx, 20, 10, VIEW, 300, 0.5));
  assert.doesNotThrow(() => drawMeasurement(ctx, { start: { lat: 51, lon: 0 }, end: { lat: 40, lon: -74 } }, VIEW, 300));
  assert.doesNotThrow(() => drawMeasurement(ctx, { start: null, end: null }, VIEW, 300));
  assert.ok(ctx.calls.some((c) => c === 'stroke'), 'measurement arc stroked');
});

test('drawFlatMap fills the background and draws land polygons', () => {
  const ctx = makeCtx();
  const projector = makeFlatProjector(720, 360);
  drawFlatMap(ctx, LAND, 720, 360, projector);
  assert.ok(ctx.calls.includes('fillRect'), 'ocean background filled');
  assert.ok(ctx.calls.filter((c) => c === 'fill').length >= 2, 'land polygons filled');
});

test('drawFlatGraticule strokes straight grid lines', () => {
  const ctx = makeCtx();
  const projector = makeFlatProjector(720, 360);
  drawFlatGraticule(ctx, 720, 360, projector);
  assert.ok(ctx.calls.filter((c) => c === 'stroke').length >= 9, 'grid lines stroked');
});

test('hitTestSatellites finds a satellite dot near the cursor', () => {
  const sats = [{ name: 'ISS', inclination: 51.6, periodMin: 92.9, phase: 12, altitudeKm: 420 }];
  // Project the ISS position at minute 0 and click exactly on it.
  const pos = satellitePosition(sats[0], 0);
  const p = project(pos.lat, pos.lon, VIEW.centerLat, VIEW.centerLon, 300 * 1.12, VIEW.cx, VIEW.cy);
  assert.ok(p.visible, 'ISS should be visible from this centre at minute 0');
  const hit = hitTestSatellites(sats, 0, VIEW, 300, p.x, p.y);
  assert.ok(hit && hit.satellite.name === 'ISS');
  assert.equal(hitTestSatellites(sats, 0, VIEW, 300, 10, 10), null);
});

test('hitTestAirports finds the nearest airport', () => {
  const airports = [
    { code: 'LHR', city: 'London', lat: 51.47, lon: -0.45 },
    { code: 'JFK', city: 'New York', lat: 40.64, lon: -73.78 },
  ];
  const view = { centerLat: 51.47, centerLon: -0.45, cx: 450, cy: 450 };
  const hit = hitTestAirports(airports, view, 300, 450, 450);
  assert.ok(hit && hit.airport.code === 'LHR');
  assert.equal(hitTestAirports(airports, view, 300, 100, 100), null);
});

test('drawTrail draws the flown segment and skips zero progress', () => {
  const ctx = makeCtx();
  const byCode = new Map([
    ['SIN', { lat: 1.36, lon: 103.99 }],
    ['LHR', { lat: 51.47, lon: -0.45 }],
  ]);
  const view = { centerLat: 20, centerLon: 10, cx: 450, cy: 450 };
  drawTrail(ctx, { from: 'SIN', to: 'LHR' }, byCode, 0.5, view, 300);
  assert.ok(ctx.calls.includes('stroke'), 'trail stroked at 50%');
  const ctx2 = makeCtx();
  drawTrail(ctx2, { from: 'SIN', to: 'LHR' }, byCode, 0, view, 300);
  assert.equal(ctx2.calls.filter((c) => c === 'stroke').length, 0, 'no trail at 0%');
});
