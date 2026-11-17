// FlightGlobe — build check (npm run build). Pure static site: no bundling.
// Verifies that every file the app needs exists, all JSON parses, and all
// bundled data validates. Exits non-zero on any problem.
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);
const ROOT = fileURLToPath(new URL('..', import.meta.url));

const REQUIRED = [
  'index.html',
  'css/base.css', 'css/globe.css', 'css/panel.css', 'css/controls.css', 'css/responsive.css',
  'js/app.js', 'js/math.js', 'js/geo.js', 'js/time.js', 'js/data.js', 'js/live.js',
  'js/flights.js', 'js/quakes.js', 'js/satellites.js', 'js/render.js', 'js/layers.js', 'js/ui.js',
  'data/airports.json', 'data/flights.json', 'data/earthquakes.json',
  'data/satellites.json', 'data/land.json',
  'package.json', 'README.md',
];

let failed = false;
for (const f of REQUIRED) {
  try {
    await access(`${ROOT}/${f}`);
  } catch {
    console.error(`MISSING: ${f}`);
    failed = true;
  }
}

// Every JS module must at least parse (node --check).
for (const f of REQUIRED.filter((x) => x.endsWith('.js') || x.endsWith('.mjs'))) {
  try {
    await run('node', ['--check', `${ROOT}/${f}`]);
  } catch (e) {
    console.error(`SYNTAX ERROR in ${f}: ${e.stderr ?? e.message}`);
    failed = true;
  }
}

// Every JSON file must parse.
for (const f of REQUIRED.filter((x) => x.endsWith('.json'))) {
  try {
    JSON.parse(await readFile(`${ROOT}/${f}`, 'utf8'));
  } catch {
    console.error(`INVALID JSON: ${f}`);
    failed = true;
  }
}

if (failed) { console.error('BUILD CHECK FAILED'); process.exit(1); }
console.log(`Build check passed: ${REQUIRED.length} files present, all JS parses, all JSON valid.`);
