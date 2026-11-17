// Tests: two-point distance measurement.
import test from 'node:test';
import assert from 'node:assert/strict';
import { clearMeasurement, completedMeasurement, measureClick, newMeasurement } from '../js/measure.js';

test('first click sets start, second click completes with a distance', () => {
  const m = newMeasurement();
  assert.equal(measureClick(m, 51.47, -0.45), null);
  const done = measureClick(m, 40.64, -73.78);
  assert.ok(done, 'second click completes');
  assert.ok(done.km > 5400 && done.km < 5750, `LHR–JFK ${done.km}`);
  assert.deepEqual(done.start, { lat: 51.47, lon: -0.45 });
});

test('completedMeasurement is null until both points exist', () => {
  const m = newMeasurement();
  assert.equal(completedMeasurement(m), null);
  measureClick(m, 0, 0);
  assert.equal(completedMeasurement(m), null);
});

test('a third click starts a new measurement', () => {
  const m = newMeasurement();
  measureClick(m, 0, 0);
  measureClick(m, 0, 90);
  assert.ok(completedMeasurement(m));
  measureClick(m, 10, 10);
  assert.equal(completedMeasurement(m), null);
  assert.deepEqual(m.start, { lat: 10, lon: 10 });
});

test('clearMeasurement resets', () => {
  const m = newMeasurement();
  measureClick(m, 0, 0);
  measureClick(m, 0, 90);
  clearMeasurement(m);
  assert.equal(m.start, null);
  assert.equal(m.end, null);
});

test('same point measures zero', () => {
  const m = newMeasurement();
  measureClick(m, 10, 20);
  const done = measureClick(m, 10, 20);
  assert.equal(done.km, 0);
});
