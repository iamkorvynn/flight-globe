// Tests: preferences persistence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEY, loadPrefs, mergePrefs, savePrefs } from '../js/persist.js';

function memStorage() {
  const map = new Map();
  return {
    setItem(k, v) { map.set(k, v); },
    getItem(k) { return map.has(k) ? map.get(k) : null; },
  };
}

test('save then load round-trips prefs', () => {
  const s = memStorage();
  assert.equal(savePrefs(s, { layers: { flights: false }, zoom: 1.5 }), true);
  assert.deepEqual(loadPrefs(s), { layers: { flights: false }, zoom: 1.5 });
});

test('loadPrefs returns null when empty or corrupt', () => {
  const s = memStorage();
  assert.equal(loadPrefs(s), null);
  s.setItem(STORAGE_KEY, 'not json{');
  assert.equal(loadPrefs(s), null);
  s.setItem(STORAGE_KEY, '"just a string"');
  assert.equal(loadPrefs(s), null);
});

test('mergePrefs keeps defaults for missing keys and ignores unknown keys', () => {
  const merged = mergePrefs({ a: 1, b: 2 }, { b: 20, c: 99 });
  assert.deepEqual(merged, { a: 1, b: 20 });
  assert.deepEqual(mergePrefs({ a: 1 }, null), { a: 1 });
});

test('savePrefs returns false when storage throws', () => {
  const bad = { setItem() { throw new Error('full'); }, getItem() { return null; } };
  assert.equal(savePrefs(bad, { a: 1 }), false);
});
