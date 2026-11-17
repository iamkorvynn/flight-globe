# Architecture

FlightGlobe is a pure static site: `index.html` + `css/` + `js/` + `data/`.
No framework, no bundler, no dependencies. The only runtime requirement is a
static file server (the browser's ES-module loader needs `http(s)`, not
`file://`).

## Rendering pipeline (one animation frame)

1. `app.js` `tick()` advances simulated time (if playing) and calls `draw()`.
2. `render.js` draws the ocean disc, land polygons, optional graticule.
3. `layers.js` draws flight arcs, airport dots, quake markers, satellite
   orbit rings + dots, then plane markers (screen positions saved for
   hit-testing).
4. `render.js` `drawNight()` shades the night side using the terminator
   computed in `time.js` from the real solar position for the scrubbed time.
5. `drawLimb()` strokes the glowing disc edge.
6. Follow mode eases the camera centre toward the selected plane.

All drawing goes through `js/math.js` `project()` (orthographic projection)
so every layer shares one consistent lat/lon → screen mapping. The inverse,
`unproject()`, exists for future click-to-locate features and is covered by
tests.

## State

`app.js` holds a single `state` object: camera (centre lat/lon, zoom),
simulated minutes, playing/speed, layer toggles, selected + followed flight,
and the loaded datasets. The sidebar (`ui.js`) is re-rendered every frame
from that state — simple, and fast enough at this scale.

## Time model

- Simulated time is **minutes since midnight UTC** on a fixed date
  (18 Nov 2026), driven by the scrubber or the play button.
- `flightProgress(dep, arr, now)` handles overnight wrap-around; a flight is
  airborne only inside its window, so scrubbing to 03:00 shows a different
  sky than noon.
- The terminator uses the standard low-precision solar position algorithm
  (accurate to ~0.01°), so the night shading is real for the scrubbed time.

## Data flow

```
data/*.json ──fetch──> data.js (validate + clean) ──> state
OpenSky / USGS ──fetch (6s timeout)──> live.js ──> state (fallback: bundled)
```

Live data never replaces the bundled flights list wholesale for the arcs —
OpenSky gives live positions without schedules, so live flights are shown as
extra markers when available; bundled schedules remain the source of truth
for arcs and the detail panel. (See `js/live.js`.)

## Testing

`node:test` suites under `tests/`, one per module. The renderer is tested
with a stub canvas 2D context — no browser or canvas library needed.
`npm run build` additionally checks that every required file exists, all JS
parses (`node --check`), and all JSON is valid.
