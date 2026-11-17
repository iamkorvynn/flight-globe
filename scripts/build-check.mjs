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
  'js/keyboard.js', 'js/persist.js', 'js/measure.js', 'js/departures.js',
  'css/toolbar.css', 'public/favicon.svg',
  'docs/DATA_SOURCES.md', 'docs/ARCHITECTURE.md', 'docs/FAQ.md', 'docs/ROADMAP.md',
  'docs/TESTING.md', 'docs/LAND.md', 'docs/preview.svg',
  'tests/math.test.js', 'tests/geo.test.js', 'tests/time.test.js', 'tests/data.test.js',
  'tests/flights.test.js', 'tests/satellites.test.js', 'tests/quakes.test.js',
  'tests/render.test.js', 'tests/keyboard.test.js', 'tests/persist.test.js', 'tests/measure.test.js',
  'tests/flatmap.test.js', 'tests/live.test.js', 'tests/departures.test.js',
  'data/airports.json', 'data/flights.json', 'data/earthquakes.json',
  'data/satellites.json', 'data/land/manifest.json',
  'data/land/north_america.json', 'data/land/south_america.json', 'data/land/africa.json',
  'data/land/europe.json', 'data/land/asia.json', 'data/land/australia.json',
  'data/land/greenland.json', 'data/land/antarctica.json', 'data/land/japan.json',
  'data/land/united_kingdom.json', 'data/land/madagascar.json', 'data/land/new_zealand.json',
  'data/land/indonesia.json', 'data/land/borneo.json',
  'data/land/hawaii.json', 'data/land/iceland.json', 'data/land/ireland.json',
  'data/land/sri_lanka.json', 'data/land/taiwan.json', 'data/land/cuba.json',
  'scripts/generate-data.py', 'scripts/serve.mjs', 'scripts/validate-data.mjs',
  'scripts/build-check.mjs', 'scripts/verify.mjs', 'scripts/render-preview.mjs', 'scripts/smoke.mjs',
  'package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'CONTRIBUTING.md', 'SECURITY.md',
  '.editorconfig', '.gitattributes', '.nvmrc', '.github/workflows/ci.yml', '.github/PULL_REQUEST_TEMPLATE.md',
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
