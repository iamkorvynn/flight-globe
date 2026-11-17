// Tests: equirectangular (flat-map) projection + projector factories.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeFlatProjector, makeGlobeProjector, projectFlat, unprojectFlat } from '../js/math.js';

test('projectFlat: corners and centre map as expected', () => {
  const w = 720, h = 360;
  // Note: normLon maps -180 to 180, so the -180 meridian lands at x = w,
  // the same line as +180 on an equirectangular map.
  assert.deepEqual(projectFlat(90, -180, w, h), { x: 720, y: 0, visible: true, z: 1 });
  assert.deepEqual(projectFlat(90, -179, w, h), { x: 2, y: 0, visible: true, z: 1 });
  assert.deepEqual(projectFlat(-90, 180, w, h), { x: 720, y: 360, visible: true, z: 1 });
  const c = projectFlat(0, 0, w, h);
  assert.equal(c.x, 360);
  assert.equal(c.y, 180);
  assert.equal(c.visible, true);
});

test('projectFlat / unprojectFlat round-trip', () => {
  const w = 720, h = 360;
  for (const [lat, lon] of [[0, 0], [51.5, -0.1], [-33.9, 151.2], [80, -170], [-80, 170]]) {
    const p = projectFlat(lat, lon, w, h);
    const back = unprojectFlat(p.x, p.y, w, h);
    assert.ok(Math.abs(back.lat - lat) < 1e-9);
    assert.ok(Math.abs(back.lon - lon) < 1e-9);
  }
});

test('unprojectFlat returns null outside the rectangle', () => {
  assert.equal(unprojectFlat(-1, 100, 720, 360), null);
  assert.equal(unprojectFlat(721, 100, 720, 360), null);
  assert.equal(unprojectFlat(100, 361, 720, 360), null);
});

test('makeFlatProjector is a function returning screen points', () => {
  const proj = makeFlatProjector(720, 360);
  const p = proj(0, 0);
  assert.equal(p.x, 360);
  assert.equal(p.y, 180);
  assert.equal(p.visible, true);
});

test('makeGlobeProjector matches project() for the centre', () => {
  const view = { centerLat: 20, centerLon: 10, cx: 450, cy: 450 };
  const proj = makeGlobeProjector(view, 300);
  const p = proj(20, 10);
  assert.equal(p.x, 450);
  assert.equal(p.y, 450);
  assert.equal(p.visible, true);
  // Lift moves the point outward from the centre along the view ray.
  const lifted = proj(20, 10, 1.1);
  assert.equal(lifted.x, 450);
  assert.equal(lifted.y, 450);
});
