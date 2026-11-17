# Testing

FlightGlobe's tests run on Node's built-in runner — no test framework to
install.

```bash
npm test                    # everything
node --test tests/math.test.js   # one file
```

## What is covered

| File | Covers |
| --- | --- |
| `tests/math.test.js` | Orthographic projection, round-trips, antipodes, limb |
| `tests/geo.test.js` | Great-circle distance, bearing, slerp, arc sampling |
| `tests/time.test.js` | Scrubber math, subsolar point, terminator, overnight flights |
| `tests/data.test.js` | Validators + every bundled dataset |
| `tests/flights.test.js` | Flight positions, durations, distances, airborne sets |
| `tests/satellites.test.js` | Orbit positions, period repeat, ring closure |
| `tests/quakes.test.js` | Magnitude → size/colour/severity |
| `tests/render.test.js` | Canvas drawing with a stub 2D context |
| `tests/keyboard.test.js` | Arrow/zoom key handling, clamping |
| `tests/persist.test.js` | localStorage save/load/merge |
| `tests/measure.test.js` | Two-click measurement state machine |
| `tests/flatmap.test.js` | Equirectangular projection + projectors |
| `tests/live.test.js` | OpenSky/USGS parsing with a stubbed fetch |

## Other checks

- `npm run build` — every required file exists, all JS parses
  (`node --check`), all JSON parses.
- `npm run validate-data` — every bundled dataset validates.
- `npm run verify` — starts the static server and fetches every page, JS
  module, stylesheet and dataset over HTTP.

## Writing a new test

- One test file per module, named `tests/<module>.test.js`.
- Prefer exact expectations (known city-pair distances, known angles) over
  vague ranges, and fix the test when the test is wrong — the projection
  tests caught a real rotation bug this way.
- The renderer is tested with a stub canvas context (`makeCtx()` in
  `tests/render.test.js`); no browser or canvas library is needed.
