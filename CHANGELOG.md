# Changelog

## 1.1.0 — 18 Nov 2026

- Flat-map (equirectangular) projection toggle — same layers, new view.
- Live OpenSky flight markers drawn on the globe; sun marker at the
  subsolar point; fading trail behind the selected flight.
- Two-point distance measurement (click twice on the globe).
- Keyboard navigation (arrows, +/−, Space, F, R, ?) with a shortcuts panel.
- Airport click detail (approx local time from longitude), satellite click
  detail, quake list + departures board in the sidebar, busiest-airport stat,
  flight progress bar.
- Region jump buttons, time-of-day presets, auto-rotate, reset view,
  export-PNG, layer/camera persistence in localStorage.
- Data expanded: 50 airports, 61 flights, 16 satellites, 20 land outlines
  (6 islands added); coastline now loads per-continent from `data/land/`.
- SVG preview generator (`docs/preview.svg`), headless verify, smoke script.
- 88 unit tests.

## 1.0.0 — 18 Nov 2026

- Initial release: one-screen interactive globe (orthographic canvas).
- Layers: flights (49 sample flights, 40 airports), earthquakes (30 sample
  quakes), satellites (12, circular-orbit model).
- Time scrubber with day/night terminator, play/pause, 1×–120× speed.
- Follow-a-flight camera mode, airport search, flight detail panel,
  layer stats.
- Optional live data: OpenSky flights + USGS quakes, graceful fallback to
  bundled data, no keys.
- 58 unit tests (`node:test`), build check, data validation, headless verify.
