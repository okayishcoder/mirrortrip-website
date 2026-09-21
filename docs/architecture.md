---
status: current
owner: web-platform
last_verified: 2026-08-04
---

# Website architecture

The site is plain HTML, CSS, and JavaScript deployed from `public/` to Cloudflare Pages. There is no framework, build step, CMS, database, or trip-data API integration.

Canonical pages are `/`, `/terms`, `/privacy`, `/support`, and `/delete-account`. Cloudflare clean URLs handle legacy `.html` redirects. A checked-in `404.html` prevents unknown paths from becoming an accidental SPA fallback.

`public/_worker.js` runs in Pages advanced mode. It directly owns Apple/Android association files and `/t` share-link fallback routes; all other requests are delegated to the Pages `ASSETS` binding.

Only `public/` may be deployed. Tests, scripts, `.dev.vars`, logs, package metadata, documentation, and `legal-archive/` are repository-only. Moving or broadening the output directory is a security-sensitive deployment change.
