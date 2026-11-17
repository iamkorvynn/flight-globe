// FlightGlobe — localStorage persistence for layer toggles and camera.
// Storage is injected so the module is testable in Node (pass a Map-like).
export const STORAGE_KEY = 'flightglobe-prefs-v1';

export function savePrefs(storage, prefs) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export function loadPrefs(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const prefs = JSON.parse(raw);
    if (typeof prefs !== 'object' || prefs === null) return null;
    return prefs;
  } catch {
    return null;
  }
}

/** Merge stored prefs over defaults, keeping only known keys. */
export function mergePrefs(defaults, stored) {
  if (!stored) return { ...defaults };
  const out = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in stored) out[key] = stored[key];
  }
  return out;
}
