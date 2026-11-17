// Tests: great-circle geometry — distances, bearings, arc interpolation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { arcPoint, formatDuration, formatKm, greatCircleDistanceKm, initialBearing, minutesBetween, sampleArc, slerpVec } from '../js/geo.js';
import { latLonToVec } from '../js/math.js';

test('greatCircleDistanceKm: known city pairs', () => {
  // Singapore–London ≈ 10,850 km; London–New York ≈ 5,570 km.
  const sinLhr = greatCircleDistanceKm(1.36, 103.99, 51.47, -0.45);
  assert.ok(sinLhr > 10700 && sinLhr < 11000, `SIN–LHR ${sinLhr}`);
  const lhrJfk = greatCircleDistanceKm(51.47, -0.45, 40.64, -73.78);
  assert.ok(lhrJfk > 5400 && lhrJfk < 5750, `LHR–JFK ${lhrJfk}`);
  assert.equal(greatCircleDistanceKm(10, 20, 10, 20), 0);
});

test('greatCircleDistanceKm: antipodes are half the circumference', () => {
  const d = greatCircleDistanceKm(0, 0, 0, 180);
  assert.ok(Math.abs(d - Math.PI * 6371) < 1, `got ${d}`);
});

test('initialBearing: roughly west from London to New York, north from equator', () => {
  const b = initialBearing(51.47, -0.45, 40.64, -73.78);
  assert.ok(b > 250 && b < 310, `got ${b}`);
  assert.ok(Math.abs(initialBearing(0, 0, 10, 0)) < 1e-9);
  assert.ok(Math.abs(initialBearing(0, 0, 0, 90) - 90) < 1e-9);
});

test('slerpVec: endpoints and midpoint', () => {
  const a = latLonToVec(0, 0);
  const b = latLonToVec(0, 90);
  const mid = slerpVec(a, b, 0.5);
  assert.ok(Math.abs(mid[0] - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(mid[1] - Math.SQRT1_2) < 1e-9);
  assert.ok(Math.abs(mid[2]) < 1e-9);
  const start = slerpVec(a, b, 0);
  const end = slerpVec(a, b, 1);
  assert.ok(Math.hypot(start[0] - a[0], start[1] - a[1], start[2] - a[2]) < 1e-12);
  assert.ok(Math.hypot(end[0] - b[0], end[1] - b[1], end[2] - b[2]) < 1e-12);
});

test('slerpVec: identical and antipodal inputs do not produce NaN', () => {
  const a = latLonToVec(10, 20);
  const same = slerpVec(a, a, 0.5);
  assert.ok(same.every(Number.isFinite));
  const anti = slerpVec(a, latLonToVec(-10, -160), 0.5);
  assert.ok(anti.every(Number.isFinite));
  assert.ok(Math.abs(Math.hypot(...anti) - 1) < 1e-9);
});

test('arcPoint: midpoint of London–New York is near Iceland/Greenland', () => {
  const mid = arcPoint(51.47, -0.45, 40.64, -73.78, 0.5);
  assert.ok(mid.lat > 45 && mid.lat < 60, `mid lat ${mid.lat}`);
  assert.ok(mid.lon > -45 && mid.lon < -25, `mid lon ${mid.lon}`);
  assert.equal(mid.lift, 1, 'no lift without arcHeight');
  const lifted = arcPoint(51.47, -0.45, 40.64, -73.78, 0.5, 0.09);
  assert.ok(lifted.lift > 1.08 && lifted.lift < 1.1, `lift ${lifted.lift}`);
  const start = arcPoint(51.47, -0.45, 40.64, -73.78, 0);
  assert.ok(Math.abs(start.lat - 51.47) < 1e-9 && Math.abs(start.lon - (-0.45)) < 1e-9);
});

test('sampleArc returns segments+1 points, endpoints exact', () => {
  const pts = sampleArc(0, 0, 0, 90, 10, 0.05);
  assert.equal(pts.length, 11);
  assert.ok(Math.abs(pts[0].lon) < 1e-9);
  assert.ok(Math.abs(pts[10].lon - 90) < 1e-9);
  assert.ok(pts[5].lift > 1.04);
});

test('minutesBetween wraps past midnight', () => {
  assert.equal(minutesBetween('23:30', '01:15'), 105);
  assert.equal(minutesBetween('08:00', '15:30'), 450);
  assert.equal(minutesBetween('10:00', '10:00'), 1440);
});

test('formatKm and formatDuration', () => {
  assert.equal(formatKm(10849.6), '10,850 km');
  assert.equal(formatDuration(445), '7h 25m');
  assert.equal(formatDuration(45), '45m');
});
