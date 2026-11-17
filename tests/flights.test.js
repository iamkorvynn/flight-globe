// Tests: flight model — positions, durations, distances, airborne sets.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { airborneFlights, arrMinutes, depMinutes, flightDistanceKm, flightDurationMin, flightPosition, routeLabel } from '../js/flights.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
async function load(name) {
  return JSON.parse(await readFile(`${ROOT}/data/${name}.json`, 'utf8'));
}

let airportsByCode, flights;
test.before(async () => {
  const airports = await load('airports');
  airportsByCode = new Map(airports.map((a) => [a.code, a]));
  flights = await load('flights');
});

test('depMinutes / arrMinutes parse HH:MM', () => {
  assert.equal(depMinutes({ dep: '10:50', arr: '23:55' }), 650);
  assert.equal(arrMinutes({ dep: '10:50', arr: '23:55' }), 1435);
});

test('flightDurationMin wraps overnight flights', () => {
  const f = flights.find((x) => x.id === 'SQ321'); // LHR 01:20 -> SIN 13:35
  assert.ok(f, 'SQ321 exists');
  assert.equal(flightDurationMin(f), 735);
  const overnight = flights.find((x) => {
    const d = depMinutes(x), a = arrMinutes(x);
    return a < d;
  });
  assert.ok(overnight, 'at least one overnight flight in the dataset');
  assert.ok(flightDurationMin(overnight) > 0 && flightDurationMin(overnight) < 1440);
});

test('flightDistanceKm: Singapore–London is ~10,850 km', () => {
  const f = flights.find((x) => x.id === 'SQ318');
  const km = flightDistanceKm(f, airportsByCode);
  assert.ok(km > 10700 && km < 11000, `got ${km}`);
  assert.equal(flightDistanceKm({ from: 'XXX', to: 'LHR' }, airportsByCode), null);
});

test('flightPosition: mid-flight position is halfway along the arc', () => {
  const f = flights.find((x) => x.id === 'SQ318'); // dep 10:50, arr 23:55 (785 min)
  const mid = flightPosition(f, airportsByCode, 1043); // 17:23, ~halfway
  assert.ok(mid, 'should be airborne');
  assert.ok(Math.abs(mid.progress - 0.5) < 0.02, `progress ${mid.progress}`);
  assert.ok(mid.lift > 1.05, `lift ${mid.lift}`);
  // At departure the plane is at the origin airport.
  const start = flightPosition(f, airportsByCode, 650);
  assert.ok(Math.abs(start.lat - 1.36) < 0.01 && Math.abs(start.lon - 103.99) < 0.01);
  // Before departure / after arrival: null.
  assert.equal(flightPosition(f, airportsByCode, 649), null);
  assert.equal(flightPosition(f, airportsByCode, 1436), null);
});

test('airborneFlights: a reasonable number are airborne at noon UTC', () => {
  const air = airborneFlights(flights, airportsByCode, 720);
  assert.ok(air.length >= 5 && air.length <= flights.length, `airborne at noon: ${air.length}`);
  assert.ok(air.every((a) => a.progress >= 0 && a.progress <= 1));
  // At 03:00 UTC some long-haul flights are still up, but not all.
  const night = airborneFlights(flights, airportsByCode, 180);
  assert.ok(night.length >= 1, 'some flights airborne at night');
});

test('routeLabel', () => {
  assert.equal(routeLabel({ from: 'SIN', to: 'LHR' }), 'SIN → LHR');
});
