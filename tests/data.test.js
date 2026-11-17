// Tests: data loading / validation of the bundled datasets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  cleanDataset, isValidLat, isValidLon, validateAirport, validateFlight,
  validateLand, validateQuake, validateSatellite,
} from '../js/data.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
async function load(name) {
  return JSON.parse(await readFile(`${ROOT}/data/${name}.json`, 'utf8'));
}

test('bundled airports: 40 valid rows, unique codes', async () => {
  const airports = await load('airports');
  assert.equal(airports.length, 40);
  const { valid, dropped } = cleanDataset(airports, validateAirport);
  assert.equal(dropped, 0);
  assert.equal(new Set(valid.map((a) => a.code)).size, 40);
});

test('bundled flights: every route references known airports', async () => {
  const airports = await load('airports');
  const flights = await load('flights');
  const codes = new Set(airports.map((a) => a.code));
  const { valid, dropped } = cleanDataset(flights, (f) => validateFlight(f, codes));
  assert.ok(flights.length >= 40, `only ${flights.length} flights`);
  assert.equal(dropped, 0);
  assert.ok(valid.every((f) => f.from !== f.to));
});

test('bundled earthquakes: 30 valid rows, magnitudes in range', async () => {
  const quakes = await load('earthquakes');
  assert.equal(quakes.length, 30);
  const { dropped } = cleanDataset(quakes, validateQuake);
  assert.equal(dropped, 0);
  assert.ok(quakes.every((q) => q.mag >= 0 && q.mag <= 10));
});

test('bundled satellites: 12 valid rows', async () => {
  const sats = await load('satellites');
  assert.equal(sats.length, 12);
  const { dropped } = cleanDataset(sats, validateSatellite);
  assert.equal(dropped, 0);
});

test('bundled land: polygons valid, all points in range', async () => {
  const land = await load('land');
  assert.ok(validateLand(land));
  assert.ok(land.polygons.length >= 10);
});

test('validators reject bad rows', () => {
  assert.equal(validateAirport({ code: 'XX', city: 'Nowhere', lat: 0, lon: 0 }), false);
  assert.equal(validateAirport({ code: 'LHR', city: 'London', lat: 91, lon: 0 }), false);
  assert.equal(validateAirport({ code: 'LHR', city: 'London', lat: 51, lon: 200 }), false);
  assert.equal(validateAirport({ code: 'LHR', city: 'London', lat: 51.5, lon: -0.4 }), true);
  const codes = new Set(['SIN', 'LHR']);
  assert.equal(validateFlight({ id: 'SQ1', from: 'SIN', to: 'LHR', dep: '10:00', arr: '22:00' }, codes), true);
  assert.equal(validateFlight({ id: 'SQ1', from: 'SIN', to: 'XXX', dep: '10:00', arr: '22:00' }, codes), false);
  assert.equal(validateFlight({ id: 'SQ1', from: 'SIN', to: 'SIN', dep: '10:00', arr: '22:00' }, codes), false);
  assert.equal(validateFlight({ id: 'SQ1', from: 'SIN', to: 'LHR', dep: '25:00', arr: '22:00' }, codes), false);
  assert.equal(validateQuake({ lat: 0, lon: 0, mag: 11, place: 'x' }), false);
  assert.equal(validateQuake({ lat: 0, lon: 0, mag: 5.5, place: 'x' }), true);
  assert.equal(validateSatellite({ name: 'ISS', inclination: 51.6, periodMin: 93, phase: 0 }), true);
  assert.equal(validateSatellite({ name: 'ISS', inclination: 200, periodMin: 93, phase: 0 }), false);
  assert.equal(validateLand({ polygons: [[[0, 0], [1, 1]]] }), false); // < 3 points
});

test('isValidLat / isValidLon boundaries', () => {
  assert.equal(isValidLat(90), true);
  assert.equal(isValidLat(-90), true);
  assert.equal(isValidLat(90.1), false);
  assert.equal(isValidLon(180), true);
  assert.equal(isValidLon(NaN), false);
  assert.equal(isValidLon('10'), false);
});

test('cleanDataset counts dropped rows', () => {
  const { valid, dropped } = cleanDataset(
    [{ code: 'LHR', city: 'London', lat: 51, lon: 0 }, { code: 'BAD', city: '', lat: 0, lon: 0 }],
    validateAirport,
  );
  assert.equal(valid.length, 1);
  assert.equal(dropped, 1);
  assert.deepEqual(cleanDataset(null, validateAirport), { valid: [], dropped: 0 });
});
