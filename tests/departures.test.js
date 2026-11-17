// Tests: departures board + busiest airport.
import test from 'node:test';
import assert from 'node:assert/strict';
import { busiestAirport, minutesUntilDeparture, nextDepartures } from '../js/departures.js';

const FLIGHTS = [
  { id: 'A1', from: 'SIN', to: 'LHR', dep: '10:00', arr: '22:00' },
  { id: 'A2', from: 'LHR', to: 'JFK', dep: '11:00', arr: '16:00' },
  { id: 'A3', from: 'SIN', to: 'HND', dep: '23:30', arr: '06:00' },
  { id: 'A4', from: 'JFK', to: 'SIN', dep: '01:00', arr: '12:00' },
];

test('minutesUntilDeparture wraps past midnight', () => {
  assert.equal(minutesUntilDeparture(FLIGHTS[0], 600), 0); // departing now
  assert.equal(minutesUntilDeparture(FLIGHTS[0], 590), 10);
  assert.equal(minutesUntilDeparture(FLIGHTS[2], 1400), 10); // 23:30 after 23:20
  assert.equal(minutesUntilDeparture(FLIGHTS[3], 1200), 300); // 01:00 next day
});

test('nextDepartures returns the soonest first, limited to count', () => {
  const next = nextDepartures(FLIGHTS, 590, 2);
  assert.equal(next.length, 2);
  assert.equal(next[0].flight.id, 'A1');
  assert.equal(next[0].inMin, 10);
  assert.equal(next[1].flight.id, 'A2');
  const all = nextDepartures(FLIGHTS, 0);
  assert.equal(all.length, 4);
  assert.equal(all[0].flight.id, 'A4'); // 01:00 is soonest after midnight
});

test('busiestAirport counts departures + arrivals', () => {
  const best = busiestAirport(FLIGHTS);
  assert.equal(best.code, 'SIN');
  assert.equal(best.count, 3); // A1 dep, A3 dep, A4 arr
  assert.equal(busiestAirport([]), null);
});
