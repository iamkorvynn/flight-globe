// Tests: satellite orbit model — positions, rings, period.
import test from 'node:test';
import assert from 'node:assert/strict';
import { orbitalSpeedKms, satelliteOrbitRing, satellitePosition } from '../js/satellites.js';

const ISS = { name: 'ISS', inclination: 51.6, periodMin: 92.9, phase: 12, altitudeKm: 420 };
const POLAR = { name: 'NOAA-20', inclination: 98.7, periodMin: 101.4, phase: 95, altitudeKm: 824 };

test('satellitePosition: latitude never exceeds inclination', () => {
  for (let m = 0; m < 1000; m += 7) {
    const p = satellitePosition(ISS, m);
    assert.ok(Math.abs(p.lat) <= 51.6 + 1e-9, `lat ${p.lat} at ${m}`);
    assert.ok(p.lon >= -180 && p.lon <= 180);
  }
});

test('satellitePosition: repeats after exactly one period', () => {
  const a = satellitePosition(ISS, 100);
  const b = satellitePosition(ISS, 100 + ISS.periodMin);
  assert.ok(Math.abs(a.lat - b.lat) < 1e-9);
  assert.ok(Math.abs(a.lon - b.lon) < 1e-9);
});

test('satellitePosition: phase shifts the position', () => {
  const a = satellitePosition(ISS, 0);
  const b = satellitePosition({ ...ISS, phase: 180 }, 0);
  assert.ok(Math.abs(a.lat - b.lat) > 1 || Math.abs(a.lon - b.lon) > 1,
    'opposite phase should be far apart');
});

test('satelliteOrbitRing: closed ring, all points within inclination', () => {
  const ring = satelliteOrbitRing(POLAR, 96);
  assert.equal(ring.length, 96);
  const first = ring[0];
  const last = ring[95];
  // Ring is periodic: point 0 and point 96 would coincide; adjacent points are close.
  const dLat = Math.abs(first.lat - last.lat);
  assert.ok(dLat < 5, `ring ends ${dLat}° apart in latitude`);
  for (const p of ring) assert.ok(Math.abs(p.lat) <= 98.7 + 1e-9);
});

test('orbitalSpeedKms: ISS ~7.7 km/s, GEO ~3.1 km/s', () => {
  const iss = orbitalSpeedKms(420);
  assert.ok(iss > 7.5 && iss < 7.9, `ISS ${iss}`);
  const geo = orbitalSpeedKms(35786);
  assert.ok(geo > 3.0 && geo < 3.2, `GEO ${geo}`);
  assert.ok(orbitalSpeedKms(550) < orbitalSpeedKms(420), 'higher orbit is slower');
});
