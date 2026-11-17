# Land outlines

The coastline in FlightGlobe is **hand-drawn and simplified**: 20 polygons
in `data/land/`, one file per continent or island, listed in
`data/land/manifest.json`. They are recognisable outlines, not survey-grade
geography — small islands are approximate blobs, coastlines are smoothed,
and Antarctica is a rough ring.

Why hand-drawn instead of a real dataset?

- **Zero runtime dependencies**: no map tiles, no CDN, no 10 MB GeoJSON.
- **Offline-first**: the whole app works with no network at all.
- **Reviewable**: each outline is a short list of lat/lon pairs anyone can
  read and fix.

To improve an outline, edit the polygon in `scripts/generate-data.py`
(the `LAND` dict), run the generator, and commit the regenerated file:

```bash
python3 scripts/generate-data.py
npm run validate-data
```

If a future version wants real coastlines, the swap is small: replace the
`data/land/` files with a simplified Natural Earth extract (110m) and keep
the same manifest format — the renderer only needs `{ polygons }`.
