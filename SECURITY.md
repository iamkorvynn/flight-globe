# Security Policy

FlightGlobe is a static site with no backend, no accounts, and no secrets.
It fetches data only from the free public OpenSky and USGS endpoints, and
only in the browser — there is nothing server-side to attack.

If you find a security issue (for example, a way for crafted bundled data to
execute code in the page), please open a GitHub issue with the details. Do
not include any credentials — this project has none by design.
