// Tests: keyboard navigation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { applyKey, isGlobeKey } from '../js/keyboard.js';

function camera() { return { centerLat: 20, centerLon: 10, zoom: 1 }; }

test('ArrowRight / ArrowLeft rotate longitude by 10 degrees', () => {
  const c = camera();
  assert.equal(applyKey(c, 'ArrowRight'), true);
  assert.equal(c.centerLon, 20);
  applyKey(c, 'ArrowLeft');
  assert.equal(c.centerLon, 10);
});

test('longitude wraps at the antimeridian', () => {
  const c = camera();
  c.centerLon = 175;
  applyKey(c, 'ArrowRight');
  assert.equal(c.centerLon, -175);
  applyKey(c, 'ArrowLeft');
  assert.equal(c.centerLon, 175);
});

test('ArrowUp / ArrowDown move latitude and clamp at the poles', () => {
  const c = camera();
  applyKey(c, 'ArrowUp');
  assert.equal(c.centerLat, 30);
  c.centerLat = 80;
  applyKey(c, 'ArrowUp');
  assert.equal(c.centerLat, 85);
  applyKey(c, 'ArrowUp');
  assert.equal(c.centerLat, 85);
  c.centerLat = -80;
  applyKey(c, 'ArrowDown');
  assert.equal(c.centerLat, -85);
});

test('+ / - zoom in and out, clamped to [0.6, 3]', () => {
  const c = camera();
  applyKey(c, '+');
  assert.ok(c.zoom > 1);
  applyKey(c, '-');
  assert.ok(Math.abs(c.zoom - 1) < 1e-9);
  c.zoom = 3;
  applyKey(c, '+');
  assert.equal(c.zoom, 3);
  c.zoom = 0.6;
  applyKey(c, '-');
  assert.equal(c.zoom, 0.6);
});

test('unknown keys are not handled', () => {
  const c = camera();
  assert.equal(applyKey(c, 'a'), false);
  assert.equal(applyKey(c, 'Enter'), false);
  assert.equal(c.centerLon, 10);
});

test('isGlobeKey', () => {
  assert.equal(isGlobeKey('ArrowUp'), true);
  assert.equal(isGlobeKey('+'), true);
  assert.equal(isGlobeKey(' '), false);
});
