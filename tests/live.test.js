// Tests: live data fetching with a stubbed global fetch (no network).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveFlights, fetchLiveQuakes } from '../js/live.js';

function stubFetch(handler) {
  const orig = globalThis.fetch;
  globalThis.fetch = handler;
  return () => { globalThis.fetch = orig; };
}

test('fetchLiveQuakes parses the USGS GeoJSON feed', async () => {
  const restore = stubFetch(async () => ({
    ok: true,
    json: async () => ({
      features: [
        { geometry: { coordinates: [142.4, 38.3, 10] }, properties: { mag: 6.1, place: 'Off Honshu, Japan', time: 1700000000000 } },
        { geometry: { coordinates: [-122.4, 37.8, 5] }, properties: { mag: 3.2, place: 'California', time: 1700000000000 } },
      ],
    }),
  }));
  try {
    const quakes = await fetchLiveQuakes();
    assert.equal(quakes.length, 2);
    assert.equal(quakes[0].place, 'Off Honshu, Japan');
    assert.equal(quakes[0].mag, 6.1);
    assert.equal(quakes[0].lat, 38.3);
    assert.equal(quakes[0].lon, 142.4);
  } finally { restore(); }
});

test('fetchLiveFlights keeps only states with a callsign and coordinates', async () => {
  const restore = stubFetch(async () => ({
    ok: true,
    json: async () => ({
      states: [
        ['abc123', 'BAW117  ', 'UK', 0, 0, -0.45, 51.47, 0, 0, 270],
        ['def456', '  ', 'UK', 0, 0, 0, 0, 0, 0, 0],
        ['ghi789', 'UAE215', 'AE', 0, 0, 55.36, 25.25, 0, 0, 90],
        ['jkl012', 'NOCALL', 'US', 0, 0, null, null, 0, 0, 0],
      ],
    }),
  }));
  try {
    const flights = await fetchLiveFlights();
    assert.equal(flights.length, 2);
    assert.equal(flights[0].callsign, 'BAW117');
    assert.equal(flights[1].callsign, 'UAE215');
  } finally { restore(); }
});

test('live fetchers return null on HTTP error, bad payload, or throw', async () => {
  const restore404 = stubFetch(async () => ({ ok: false, json: async () => ({}) }));
  try {
    assert.equal(await fetchLiveQuakes(), null);
    assert.equal(await fetchLiveFlights(), null);
  } finally { restore404(); }

  const restoreThrow = stubFetch(async () => { throw new Error('offline'); });
  try {
    assert.equal(await fetchLiveQuakes(), null);
    assert.equal(await fetchLiveFlights(), null);
  } finally { restoreThrow(); }

  const restoreEmpty = stubFetch(async () => ({ ok: true, json: async () => ({ states: [] }) }));
  try {
    assert.equal(await fetchLiveFlights(), null);
  } finally { restoreEmpty(); }
});
