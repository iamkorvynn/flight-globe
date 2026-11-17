// FlightGlobe — data validation script (npm run validate-data).
// Checks every bundled dataset against the same validators the app uses.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  validateAirport, validateFlight, validateLand, validateQuake, validateSatellite,
} from '../js/data.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

async function load(name) {
  return JSON.parse(await readFile(`${ROOT}/data/${name}.json`, 'utf8'));
}

let failed = false;
function check(name, rows, validator, extra) {
  const bad = rows.filter((r) => !validator(r, extra));
  console.log(`${name}: ${rows.length} rows, ${bad.length} invalid`);
  if (bad.length) { failed = true; console.log('  invalid:', JSON.stringify(bad.slice(0, 3))); }
}

const airports = await load('airports');
const flights = await load('flights');
const quakes = await load('earthquakes');
const sats = await load('satellites');
const land = await load('land');

check('airports', airports, validateAirport);
check('flights', flights, (f) => validateFlight(f, new Set(airports.map((a) => a.code))));
check('earthquakes', quakes, validateQuake);
check('satellites', sats, validateSatellite);
console.log(`land: ${land.polygons.length} polygons, valid=${validateLand(land)}`);
if (!validateLand(land)) failed = true;

if (failed) { console.error('DATA VALIDATION FAILED'); process.exit(1); }
console.log('All bundled datasets valid.');
