---
status: current
owner: web-platform
last_verified: 2026-08-04
---

# Public sharing and app association

The Worker handles `/.well-known/apple-app-site-association`, `/.well-known/assetlinks.json`, `/t`, `/t/`, and `/t/*`. Association responses are generated from Cloudflare environment configuration and must match the production app's team ID, bundle ID, package name, and Play signing fingerprints.

A syntactically accepted `/t/{publicShareId}` request receives generic branded HTML with exact canonical/Open Graph URLs. The Worker intentionally accepts 6–128 URL-safe base64url-style characters, which is broader than the API/app's current exact 22-character identifier contract; the API/app remain authoritative. Crawlers are never auto-redirected. Eligible mobile browsers may be redirected once per session when a valid store URL is configured, while visible store controls remain as fallback. Missing or Worker-malformed identifiers return a branded 400.

The Worker does not validate exact API identifier length, trip existence, or availability and does not call the API. The native app performs authoritative exact-ID and trip resolution. This keeps crawler behavior predictable and avoids an edge/API dependency, at the cost of generic previews and a 200 fallback for some IDs the app will reject.

Changes must be tested against crawler, iOS, Android, malformed-ID, association-file, asset pass-through, and unknown-route cases.
