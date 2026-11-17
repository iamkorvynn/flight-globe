// FlightGlobe — headless verification: starts the static server, fetches the
// page + every JS module + every dataset, and checks the page references the
// app entrypoint. Run: npm run verify
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = 8131;

const CHECKS = [
  '/',
  '/index.html',
  '/js/app.js', '/js/math.js', '/js/geo.js', '/js/time.js', '/js/data.js',
  '/js/live.js', '/js/flights.js', '/js/quakes.js', '/js/satellites.js',
  '/js/render.js', '/js/layers.js', '/js/ui.js',
  '/js/keyboard.js', '/js/persist.js', '/js/measure.js',
  '/css/base.css', '/css/globe.css', '/css/panel.css', '/css/controls.css', '/css/responsive.css',
  '/css/toolbar.css', '/public/favicon.svg',
  '/data/airports.json', '/data/flights.json', '/data/earthquakes.json',
  '/data/satellites.json', '/data/land/manifest.json',
  '/data/land/north_america.json', '/data/land/south_america.json', '/data/land/africa.json',
  '/data/land/europe.json', '/data/land/asia.json', '/data/land/australia.json',
  '/data/land/greenland.json', '/data/land/antarctica.json',
];

const server = spawn('node', ['scripts/serve.mjs'], {
  cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore',
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;
try {
  await sleep(1200);
  for (const path of CHECKS) {
    const res = await fetch(`http://localhost:${PORT}${path}`);
    const body = await res.text();
    const ok = res.status === 200 && body.length > 0;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${res.status} ${path} (${body.length}B)`);
    if (!ok) failed = true;
    if (path.endsWith('.json')) JSON.parse(body); // must parse
    if (path === '/') {
      if (!body.includes('js/app.js') || !body.includes('id="globe"')) {
        console.log('FAIL / does not reference the globe app');
        failed = true;
      }
    }
  }
} catch (e) {
  console.error('Verification error:', e.message);
  failed = true;
} finally {
  server.kill();
}
if (failed) { console.error('VERIFY FAILED'); process.exit(1); }
console.log(`Verify passed: ${CHECKS.length} URLs served, all JSON parses, app entrypoint present.`);
