# Contributing

FlightGlobe is a small, dependency-free static site. Contributions that keep
it that way are welcome.

## Workflow

1. Clone the repo and serve it locally: `npm start` → http://localhost:8080
2. Make small, focused commits: one file or one feature per commit.
3. Run the checks before pushing:
   ```bash
   npm run build          # file list, JS syntax, JSON validity
   npm test               # unit tests (node:test, no deps)
   npm run validate-data  # bundled datasets
   npm run verify         # headless serve check
   ```
4. Never commit secrets, API keys, or credentials. There are none in this
   project by design — the live APIs used need no keys.

## Data

Bundled data is generated, not hand-edited: change
`scripts/generate-data.py` and run it, then commit the regenerated JSON.
Airport coordinates are public knowledge; flight schedules are invented
sample data for 18 Nov 2026 — keep them clearly labelled as samples.

## Code style

- Vanilla JS, ES modules, no framework, no build step.
- Pure functions where possible; keep DOM access in `js/ui.js` / `js/app.js`.
- Every new module gets a `tests/<name>.test.js` suite.
- Two-space indent, single quotes, semicolons.
