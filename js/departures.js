// FlightGlobe — departures board: which sample flights depart soonest
// after the scrubbed time, plus the busiest-airport computation.
// Pure functions, no DOM.
import { depMinutes } from './flights.js';

/** Minutes until a flight departs after nowMin (0–1439). */
export function minutesUntilDeparture(flight, nowMin) {
  const dep = depMinutes(flight);
  return (dep - nowMin + 1440) % 1440;
}

/** Next `count` departures after nowMin, soonest first. */
export function nextDepartures(flights, nowMin, count = 8) {
  return [...flights]
    .map((f) => ({ flight: f, inMin: minutesUntilDeparture(f, nowMin) }))
    .sort((a, b) => a.inMin - b.inMin)
    .slice(0, count);
}

/** Busiest airport across a flight list (departures + arrivals). */
export function busiestAirport(flights) {
  const counts = new Map();
  for (const f of flights) {
    counts.set(f.from, (counts.get(f.from) ?? 0) + 1);
    counts.set(f.to, (counts.get(f.to) ?? 0) + 1);
  }
  let best = null;
  for (const [code, count] of counts) {
    if (!best || count > best.count) best = { code, count };
  }
  return best;
}
