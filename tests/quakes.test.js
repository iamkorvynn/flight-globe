// Tests: earthquake display helpers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { quakeColor, quakeRadiusPx, quakeSeverity, quakesAbove, strongestQuake } from '../js/quakes.js';

const QUAKES = [
  { lat: 0, lon: 0, mag: 3.1, place: 'a' },
  { lat: 0, lon: 0, mag: 5.4, place: 'b' },
  { lat: 0, lon: 0, mag: 7.2, place: 'c' },
  { lat: 0, lon: 0, mag: 6.0, place: 'd' },
];

test('quakeRadiusPx grows with magnitude', () => {
  assert.ok(quakeRadiusPx(3) < quakeRadiusPx(5));
  assert.ok(quakeRadiusPx(5) < quakeRadiusPx(7));
  assert.ok(quakeRadiusPx(2.5) >= 2, 'minimum readable size');
  assert.ok(Number.isFinite(quakeRadiusPx(0)));
});

test('quakeSeverity thresholds', () => {
  assert.equal(quakeSeverity(7.5), 'Major');
  assert.equal(quakeSeverity(6.5), 'Strong');
  assert.equal(quakeSeverity(5.5), 'Moderate');
  assert.equal(quakeSeverity(4.5), 'Light');
  assert.equal(quakeSeverity(3.0), 'Minor');
});

test('quakeColor: major quakes are red, minor ones amber', () => {
  assert.equal(quakeColor(7.5), '#ef4444');
  assert.equal(quakeColor(6.2), '#f97316');
  assert.equal(quakeColor(3.0), '#fbbf24');
});

test('strongestQuake picks the max magnitude', () => {
  assert.equal(strongestQuake(QUAKES).place, 'c');
  assert.equal(strongestQuake([]), null);
});

test('quakesAbove filters by threshold', () => {
  assert.equal(quakesAbove(QUAKES, 6).length, 2);
  assert.equal(quakesAbove(QUAKES, 8).length, 0);
  assert.equal(quakesAbove(QUAKES, 0).length, 4);
});
