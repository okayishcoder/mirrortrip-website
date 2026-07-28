# Mirror Trip Website

Plain static HTML website hosted on Cloudflare Pages, with a Pages advanced-mode
Worker for mobile share-link fallbacks and app-association files. There is no
framework, build step, CMS, or database.

## Repository structure

```text
.
|-- public/                    # The only Cloudflare Pages deployment directory
|   |-- _worker.js             # Advanced-mode Pages Worker
|   |-- 404.html               # Prevents Pages SPA fallback for unknown routes
|   |-- index.html
|   |-- terms.html
|   |-- privacy.html
|   |-- support.html
|   |-- delete-account.html
|   |-- styles.css
|   |-- script.js
|   `-- assets/
|       |-- mt.png
|       `-- favicon.png
|-- scripts/
|   `-- verify-config.js       # Repository-only configuration check
|-- tests/                     # Repository-only Node tests
|-- README.md
|-- package.json
`-- legal-archive/             # Repository-only legal snapshots; never deploy
```

Only files under `public/` are deployment artifacts. Tests, documentation,
package files, local configuration, development tooling, logs, and the
`legal-archive/` directory belong outside `public/`.

## Public routes

| Page | Canonical route | Source file |
| --- | --- | --- |
| Home | `/` | `public/index.html` |
| Terms | `/terms` | `public/terms.html` |
| Privacy | `/privacy` | `public/privacy.html` |
| Support | `/support` | `public/support.html` |
| Delete account | `/delete-account` | `public/delete-account.html` |

Cloudflare Pages clean URLs serve the HTML files at extensionless routes and
redirect legacy `.html` requests to their canonical forms. The Worker passes
both forms through to the Pages asset binding.

## Legal documents

The current public legal pages are `public/terms.html` and
`public/privacy.html`. Internal historical snapshots live under
`legal-archive/` and are retained in Git for developers only. Cloudflare Pages
deploys only `public/`; archived snapshots must never be copied there or exposed
through public routes.

## Local development and tests

Use the Cloudflare Pages preview so clean URLs, the advanced-mode Worker, its
`ASSETS` binding, and association routes are included:

```powershell
npm run dev
```

This runs `npx wrangler pages dev public`.

Run all static-site, deployment-boundary, asset, route, redirect, Worker, and
association-file verification with:

```powershell
npm test
```

Check that required deployment variables are present with:

```powershell
npm run verify:config
```

For local Worker configuration, create `.dev.vars` or provide environment
variables without committing their values.

## Local configuration safety

Local configuration and generated tooling directories must not be committed.
The repository ignores:

- `.dev.vars`
- `.env`
- `.env.*`
- `.wrangler/`
- `node_modules/`

Never place configuration values in `public/`, tests, documentation, or logs.

## Share-link configuration

Cloudflare Pages environment variables are the deployment configuration system:

| Variable | Required value |
| --- | --- |
| `SHARE_DOMAIN` | `mirrortrips.com` (no path; scheme is optional) |
| `IOS_APP_STORE_URL` | Published Mirror Trip App Store URL |
| `ANDROID_PLAY_STORE_URL` | Published Mirror Trip Play Store URL |
| `APPLE_TEAM_ID` | Apple Developer Team ID for the production app |
| `IOS_BUNDLE_ID` | Production bundle ID (`com.mt.mtclient`) |
| `ANDROID_PACKAGE_NAME` | Production package (`com.mt.mtclient`) |
| `ANDROID_SHA256_FINGERPRINT` | Google Play App Signing SHA-256 fingerprint |

`IOS_ADDITIONAL_APP_IDS` is optional and accepts comma-separated fully qualified
app IDs such as `TEAMID.com.mt.mtclient.preview`. Multiple Android fingerprints
can be supplied as a comma-separated `ANDROID_SHA256_FINGERPRINT` value only
when those builds are intentionally authorized.

## Cloudflare Pages deployment

The Pages project remains framework-free and dashboard-configured:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | Leave blank |
| Build output directory | `public` |
| Root directory | Repository root |

The required manual migration is to change the existing Cloudflare Pages build
output directory from `.` to `public` before deploying the commit that moves the
files. Do not change the project root to `public`: doing so would make the
dashboard output path ambiguous and would exclude repository-level tooling from
the build environment.

`public/_worker.js` must be inside the configured output directory because
Cloudflare Pages advanced mode discovers `_worker.js` there. It controls all
incoming requests and delegates ordinary pages, assets, legacy `.html` URLs,
and unknown routes to `env.ASSETS.fetch(request)`. It directly handles only:

- `/.well-known/apple-app-site-association`
- `/.well-known/assetlinks.json`
- `/t`
- `/t/`
- `/t/*`

Keep the exact app-link hostname as `mirrortrips.com`; do not redirect its
association-file requests to `www` or another hostname.

## Deployment migration order

1. Run `npm test` on the restructuring commit.
2. In Cloudflare Pages, change the build output directory from `.` to `public`;
   keep the framework preset unset, build command blank, and root at the
   repository root.
3. Confirm production and preview environment-variable names are still present.
4. Deploy the restructuring commit.
5. Verify the canonical routes, legacy redirects, static assets, association
   files, and `/t/testPublicShareId` on the `pages.dev` preview URL.
6. Verify the same routes on `https://mirrortrips.com`.

Deploying the file move while the output directory is still `.` could expose
repository-only files. Changing the output directory too early, before a commit
containing `public/` is available to the selected branch, could produce an empty
or failed deployment. Coordinate the setting change and deployment together.

## Production verification

```powershell
curl.exe -i https://mirrortrips.com/
curl.exe -i https://mirrortrips.com/terms
curl.exe -i https://mirrortrips.com/terms.html
curl.exe -i https://mirrortrips.com/.well-known/apple-app-site-association
curl.exe -i https://mirrortrips.com/.well-known/assetlinks.json
curl.exe -i https://mirrortrips.com/t/testPublicShareId
curl.exe -i -A "facebookexternalhit/1.1" https://mirrortrips.com/t/testPublicShareId
```

Expected results:

- Canonical page routes return `200` HTML without a `Location` header.
- Legacy `.html` routes redirect once to the extensionless route.
- Association files return `200`, no `Location`, `application/json`, and valid
  JSON.
- A valid trip route returns `200` HTML with its exact canonical URL.
- A crawler trip request keeps Open Graph metadata and does not redirect.
- `/t/` and malformed identifiers return a branded `400` page.
- Referenced styles, scripts, and images return `200`.

## Link-preview scope

The edge route renders generic Mirror Trip Open Graph metadata and an exact
canonical URL for each shared path. It does not call the trip API. Dynamic trip
titles and images would require a secure server-side public-trip lookup in the
Worker (or a dedicated metadata endpoint); client-side fetching is intentionally
not used because social crawlers generally do not execute it.
