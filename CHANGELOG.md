# Changelog

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
