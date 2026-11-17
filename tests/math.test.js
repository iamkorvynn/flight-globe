// Tests: orthographic projection math (lat/lon <-> screen and back).
import test from 'node:test';
import assert from 'node:assert/strict';
import { angularDistance, clamp, latLonToVec, normLon, project, rotateFromView, rotateToView, unproject, vecToLatLon } from '../js/math.js';

const R = 300, CX = 450, CY = 450;

test('project: globe centre maps to canvas centre and is visible', () => {
  const p = project(20, 10, 20, 10, R, CX, CY);
  assert.equal(p.x, CX);
  assert.equal(p.y, CY);
  assert.equal(p.visible, true);
  assert.ok(Math.abs(p.z - 1) < 1e-9);
});

test('project: antipode is hidden, limb point has z ~ 0', () => {
  const anti = project(-20, -170, 20, 10, R, CX, CY);
  assert.equal(anti.visible, false);
  const limb = project(20, 100, 20, 10, R, CX, CY);
  assert.ok(Math.abs(limb.z) < 1e-9, `limb z=${limb.z}`);
});

test('project/unproject round-trip for visible points', () => {
  const cases = [[0, 0, 0, 0], [51.47, -0.45, 20, 10], [-33.95, 151.18, 20, 10], [35.55, 139.78, 0, 120], [64, -20, 50, -30]];
  for (const [lat, lon, clat, clon] of cases) {
    const p = project(lat, lon, clat, clon, R, CX, CY);
    assert.equal(p.visible, true, `${lat},${lon} should be visible`);
    const back = unproject(p.x, p.y, clat, clon, R, CX, CY);
    assert.ok(Math.abs(back.lat - lat) < 1e-6, `lat ${back.lat} vs ${lat}`);
    assert.ok(Math.abs(back.lon - lon) < 1e-6, `lon ${back.lon} vs ${lon}`);
  }
});

test('unproject returns null outside the disc', () => {
  assert.equal(unproject(CX + R + 50, CY, 0, 0, R, CX, CY), null);
  assert.equal(unproject(CX, CY - R - 1, 0, 0, R, CX, CY), null);
});

test('rotateToView / rotateFromView are inverses', () => {
  const v = latLonToVec(40, -73);
  const rot = rotateToView(v, 20, 10);
  const back = rotateFromView(rot, 20, 10);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(back[i] - v[i]) < 1e-12);
});

test('latLonToVec / vecToLatLon round-trip', () => {
  for (const [lat, lon] of [[0, 0], [51.5, -0.1], [-33.9, 151.2], [89, 179], [-89, -179]]) {
    const { lat: la, lon: lo } = vecToLatLon(latLonToVec(lat, lon));
    assert.ok(Math.abs(la - lat) < 1e-9);
    assert.ok(Math.abs(lo - lon) < 1e-9, `${lo} vs ${lon}`);
  }
});

test('normLon wraps into (-180, 180]', () => {
  assert.equal(normLon(190), -170);
  assert.equal(normLon(-190), 170);
  assert.equal(normLon(360), 0);
  assert.equal(normLon(180), 180);
  assert.equal(normLon(-180), 180);
});

test('clamp', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(99, 0, 10), 10);
});

test('angularDistance: London–New York is about 50 degrees', () => {
  const d = angularDistance(51.47, -0.45, 40.64, -73.78);
  assert.ok(d > 48 && d < 52, `got ${d}`);
  assert.ok(Math.abs(angularDistance(0, 0, 0, 0)) < 1e-9);
  assert.ok(Math.abs(angularDistance(0, 0, 0, 180) - 180) < 1e-9);
});
