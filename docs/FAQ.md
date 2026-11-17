# FAQ

**Does FlightGlobe need the internet?**
No. It runs fully offline on bundled sample data. Live OpenSky/USGS data is
optional and fails over silently.

**Why do some flights disappear when I scrub the timeline?**
Flights are only airborne inside their scheduled window. Scrub to a time
inside a flight's dep→arr window to see it; overnight flights wrap midnight.

**Why is the globe dark on one side?**
That's the real day/night terminator for the scrubbed time, computed from the
solar position. Drag the timeline and watch the night sweep across the map.

**Can I follow a plane?**
Click any plane on the globe (or a flight in the sidebar list), then press
"Follow this flight". Dragging the globe stops following.

**Are the flights real?**
The bundled flights are invented sample schedules on real routes between
real airports. Live OpenSky positions appear as extra markers when the
network is available.

**What does the Flat map button do?**
Switches the globe to an equirectangular flat map with the same layers —
useful for seeing all routes at once. Night shading is globe-only.

**What are the keyboard shortcuts?**
Arrows rotate, +/− zoom, Space plays/pauses time, F toggles flat map,
R resets the view, ? opens the shortcuts panel, Esc closes it.

**How do I measure a distance?**
Press the Measure button, then click two points on the globe. The
great-circle distance shows in the detail panel.

**Why is the coastline simplified?**
The land outlines are hand-drawn and bundled in the repo so the app needs no
map tiles. They're recognisable, not survey-grade.

**How do I run it?**
`npm start`, then open http://localhost:8080. Any static server works.
