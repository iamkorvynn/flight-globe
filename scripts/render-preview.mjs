// FlightGlobe — render a static SVG preview of the globe (for README/docs).
// Uses the same projection + arc math as the app, so the preview is honest.
// Run: node scripts/render-preview.mjs  ->  docs/preview.svg
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { project } from '../js/math.js';
import { sampleArc } from '../js/geo.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const W = 900, H = 900, R = 360, CX = 450, CY = 450;
const CENTER_LAT = 20, CENTER_LON = 10;

const airports = JSON.parse(await readFile(`${ROOT}/data/airports.json`, 'utf8'));
const flights = JSON.parse(await readFile(`${ROOT}/data/flights.json`, 'utf8'));
const manifest = JSON.parse(await readFile(`${ROOT}/data/land/manifest.json`, 'utf8'));
const landParts = [];
for (const f of manifest.files) {
  landParts.push(JSON.parse(await readFile(`${ROOT}/data/${f}`, 'utf8')));
}
const byCode = new Map(airports.map((a) => [a.code, a]));

function pathFor(points) {
  let d = '';
  let pen = false;
  for (const [lat, lon] of points) {
    const p = project(lat, lon, CENTER_LAT, CENTER_LON, R, CX, CY);
    if (!p.visible) { pen = false; continue; }
    d += pen ? ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : ` M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    pen = true;
  }
  return d + ' Z';
}

let landPaths = '';
for (const part of landParts) {
  for (const poly of part.polygons) {
    landPaths += `<path d="${pathFor(poly)}" fill="#1d3a2a" stroke="#3f6b4f" stroke-width="1"/>`;
  }
}

let arcPaths = '';
for (const f of flights.slice(0, 24)) {
  const a = byCode.get(f.from);
  const b = byCode.get(f.to);
  if (!a || !b) continue;
  const pts = sampleArc(a.lat, a.lon, b.lat, b.lon, 48, 0.09)
    .map((pt) => {
      const p = project(pt.lat, pt.lon, CENTER_LAT, CENTER_LON, R * pt.lift, CX, CY);
      return p.visible ? [p.x, p.y] : null;
    });
  let d = '';
  let pen = false;
  for (const pt of pts) {
    if (!pt) { pen = false; continue; }
    d += pen ? ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}` : ` M ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`;
    pen = true;
  }
  if (d) arcPaths += `<path d="${d}" fill="none" stroke="rgba(56,189,248,0.5)" stroke-width="1.2"/>`;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#05070d"/>
<circle cx="${CX}" cy="${CY}" r="${R}" fill="#0a1628" stroke="rgba(56,189,248,0.35)" stroke-width="1.5"/>
${landPaths}
${arcPaths}
<text x="450" y="860" text-anchor="middle" fill="#8b98b4" font-family="sans-serif" font-size="22">FlightGlobe — sample flights, orthographic globe</text>
</svg>
`;

await writeFile(`${ROOT}/docs/preview.svg`, svg);
console.log(`Wrote docs/preview.svg (${svg.length} bytes, ${landParts.length} land parts, ${flights.slice(0, 24).length} arcs)`);
