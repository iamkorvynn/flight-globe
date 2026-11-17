// FlightGlobe — earthquake helpers: display size, colour, severity label.
export function quakeRadiusPx(mag) {
  // Magnitude is logarithmic; radius grows ~exponentially but stays readable.
  return 2 + Math.pow(Math.max(0, mag), 1.6) * 0.9;
}

export function quakeColor(mag) {
  if (mag >= 7) return '#ef4444';
  if (mag >= 6) return '#f97316';
  if (mag >= 5) return '#f59e0b';
  return '#fbbf24';
}

export function quakeSeverity(mag) {
  if (mag >= 7) return 'Major';
  if (mag >= 6) return 'Strong';
  if (mag >= 5) return 'Moderate';
  if (mag >= 4) return 'Light';
  return 'Minor';
}

/** Strongest quake in a list (null for an empty list). */
export function strongestQuake(quakes) {
  if (!quakes.length) return null;
  return quakes.reduce((a, b) => (b.mag > a.mag ? b : a));
}

/** Quakes at or above a magnitude threshold. */
export function quakesAbove(quakes, minMag) {
  return quakes.filter((q) => q.mag >= minMag);
}
