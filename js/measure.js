// FlightGlobe — two-point distance measurement on the globe.
// Pure state machine: click once to set the start, click again for the end;
// the great-circle distance between them is the result.
import { greatCircleDistanceKm } from './geo.js';

/** Fresh measurement state. */
export function newMeasurement() {
  return { start: null, end: null };
}

/** Record a clicked lat/lon. Returns the completed measurement or null. */
export function measureClick(state, lat, lon) {
  if (!state.start || (state.start && state.end)) {
    state.start = { lat, lon };
    state.end = null;
    return null;
  }
  state.end = { lat, lon };
  return completedMeasurement(state);
}

export function completedMeasurement(state) {
  if (!state.start || !state.end) return null;
  return {
    start: state.start,
    end: state.end,
    km: greatCircleDistanceKm(state.start.lat, state.start.lon, state.end.lat, state.end.lon),
  };
}

export function clearMeasurement(state) {
  state.start = null;
  state.end = null;
}
