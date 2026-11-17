// Tests: time scrubber math, subsolar point and terminator.
import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceSimMinutes, flightProgress, formatTimeUTC, isAirborne, isDaylight, minutesOfDay, subsolarPoint, sunDirection, terminatorPoints } from '../js/time.js';
import { angularDistance } from '../js/math.js';

test('formatTimeUTC wraps and pads', () => {
  assert.equal(formatTimeUTC(0), '00:00');
  assert.equal(formatTimeUTC(720), '12:00');
  assert.equal(formatTimeUTC(1439), '23:59');
  assert.equal(formatTimeUTC(1440), '00:00');
  assert.equal(formatTimeUTC(65), '01:05');
});

test('minutesOfDay reads a Date in UTC', () => {
  const d = new Date(Date.UTC(2026, 10, 18, 14, 30, 0));
  assert.equal(minutesOfDay(d), 870);
});

test('flightProgress: mid-flight is 0.5, outside returns null', () => {
  assert.equal(flightProgress(600, 1080, 840), 0.5);
  assert.equal(flightProgress(600, 1080, 600), 0);
  assert.equal(flightProgress(600, 1080, 1080), 1);
  assert.equal(flightProgress(600, 1080, 599), null);
  assert.equal(flightProgress(600, 1080, 1081), null);
  // Overnight flight wraps midnight: dep 23:00, arr 02:00 (180 min).
  // 00:30 is 90 min in -> halfway.
  assert.equal(flightProgress(1380, 120, 30), 0.5);
  assert.equal(flightProgress(1380, 120, 1300), null);
  assert.equal(isAirborne(1380, 120, 60), true);
  assert.equal(isAirborne(1380, 120, 600), false);
});

test('advanceSimMinutes wraps at 1440', () => {
  assert.equal(advanceSimMinutes(1400, 60, 1), 20);
  assert.equal(advanceSimMinutes(0, 10, 30), 300);
});

test('subsolarPoint: latitude stays within the tropics', () => {
  for (const month of [0, 3, 6, 9]) {
    const p = subsolarPoint(new Date(Date.UTC(2026, month, 15, 12, 0, 0)));
    assert.ok(Math.abs(p.lat) <= 23.5, `month ${month}: lat ${p.lat}`);
    assert.ok(p.lon >= -180 && p.lon <= 180);
  }
  // Near the June solstice the sun is close to the Tropic of Cancer.
  const june = subsolarPoint(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)));
  assert.ok(june.lat > 23, `June lat ${june.lat}`);
  // Near the December solstice it is close to the Tropic of Capricorn.
  const dec = subsolarPoint(new Date(Date.UTC(2026, 11, 21, 12, 0, 0)));
  assert.ok(dec.lat < -23, `Dec lat ${dec.lat}`);
});

test('terminatorPoints: every point is ~90 degrees from the subsolar point', () => {
  const date = new Date(Date.UTC(2026, 10, 18, 12, 0, 0));
  const sun = subsolarPoint(date);
  const pts = terminatorPoints(date, 64);
  assert.equal(pts.length, 64);
  for (const p of pts) {
    const d = angularDistance(p.lat, p.lon, sun.lat, sun.lon);
    assert.ok(Math.abs(d - 90) < 0.5, `terminator point ${d}° from sun`);
  }
});

test('isDaylight: subsolar point is day, antipode is night', () => {
  const date = new Date(Date.UTC(2026, 10, 18, 12, 0, 0));
  const sun = subsolarPoint(date);
  assert.equal(isDaylight(sun.lat, sun.lon, date), true);
  assert.equal(isDaylight(-sun.lat, sun.lon > 0 ? sun.lon - 180 : sun.lon + 180, date), false);
  // Sun direction is a unit vector.
  const s = sunDirection(date);
  assert.ok(Math.abs(Math.hypot(...s) - 1) < 1e-9);
});
