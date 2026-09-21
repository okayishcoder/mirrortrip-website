---
status: current
owner: web-platform
last_verified: 2026-09-21
---

# Website deployment

Cloudflare Pages settings:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | Blank |
| Output directory | `public` |
| Root directory | Repository root |

Before deployment, run `npm run docs:check`, `npm test`, and `npm run verify:config` in an environment containing the required variable names. Do not print configuration values.

Verify canonical pages, legacy redirects, static assets, unknown routes, both association files, valid and malformed trip links, and crawler behavior on the Pages preview URL before production. The exact `mirrortrips.com` association hostname must not redirect to another host.

For a meaningful legal update, deploy and verify the website before changing the backend version. For identity/signing changes, coordinate with the mobile release and verify real installed builds rather than relying only on HTTP responses.
