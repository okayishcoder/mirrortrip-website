# Mirror Trip Website

Plain static HTML website hosted on Cloudflare Pages, with a Pages Worker for
mobile share-link fallbacks and app-association files. There is no framework,
build step, CMS, or database.

## Files that matter most

- `index.html`: landing page and public app overview
- `terms.html`: published Terms of Service
- `privacy.html`: published privacy policy
- `support.html`: support and contact page
- `delete-account.html`: public account deletion information
- `styles.css`: shared design system and page styling
- `script.js`: lightweight navigation and active-link behavior
- `assets/mt.png`: copied app brand asset used for the site icon and favicon
- `_worker.js`: Cloudflare Pages edge routing for share links and app-association files
- `tests/site.test.js`: static files, links, asset references, and metadata checks
- `tests/worker.test.js`: static route, share route, crawler, and association checks

## Public routes

The public, canonical page routes are:

| Page | Canonical route | Source file |
| --- | --- | --- |
| Home | `/` | `index.html` |
| Terms | `/terms` | `terms.html` |
| Privacy | `/privacy` | `privacy.html` |
| Support | `/support` | `support.html` |
| Delete account | `/delete-account` | `delete-account.html` |

Cloudflare Pages serves matching HTML files at extensionless URLs. Its default
clean-URL handling redirects legacy `.html` requests such as `/terms.html` to
their extensionless form such as `/terms`. The HTML files remain in the static
site and `_worker.js` passes these requests through to the Pages asset binding.

## Local preview

The informational pages remain plain static files. Use the Cloudflare preview
for route-sensitive work so extensionless routing and Worker behavior are
included:

```powershell
npx wrangler pages dev .
```

Run all lightweight static-site and Worker verification with:

```powershell
npm test
```

Check that required deployment variables are present with:

```powershell
npm run verify:config
```

For local Worker configuration, create `.dev.vars` or use environment variables
without committing their values.

## Local configuration safety

Local configuration and generated tooling directories must not be committed.
The repository ignores:

- `.dev.vars`
- `.env`
- `.env.*`
- `.wrangler/`
- `node_modules/`

Never place configuration values in tests, documentation, or logs.

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

Run `npm run verify:config` in an environment containing the deployment values
to catch missing configuration.

## Deployment

The share route requires a host capable of edge/server rewrites. GitHub Pages
cannot return HTTP 200 for arbitrary `/t/{publicShareId}` paths, so production
must use Cloudflare Pages (or an equivalent host adapted to run `_worker.js`).

1. Create a Cloudflare Pages project connected to this repository.
2. Use no framework preset and no build command. Set the output directory to `.`.
3. Add all required environment variables for production and preview.
4. Attach `mirrortrips.com` as the Pages custom domain.
5. Remove or replace the current GitHub Pages DNS records as Cloudflare directs.
6. Keep the exact app-link hostname as `mirrortrips.com`; do not redirect its
   association-file requests to `www` or another hostname.
7. Deploy and run the verification commands below.

Cloudflare Pages serves static pages through `env.ASSETS`. `_worker.js` handles
only `/.well-known/*`, `/t`, and `/t/*`; all page, asset, legacy `.html`, and
unknown requests pass through to Cloudflare's static asset handling.

## Production verification

```powershell
curl.exe -i https://mirrortrips.com/.well-known/apple-app-site-association
curl.exe -i https://mirrortrips.com/.well-known/assetlinks.json
curl.exe -i https://mirrortrips.com/t/testPublicShareId
curl.exe -i -A "facebookexternalhit/1.1" https://mirrortrips.com/t/testPublicShareId
```

Expected results:

- Association files return `200`, do not include `Location`, use
  `application/json`, and parse as JSON.
- The trip route returns `200` and `text/html` for a valid identifier.
- The crawler request returns HTML containing Open Graph metadata and does not
  redirect.
- `/t/` and malformed identifiers return a branded `400` page.
- `/`, `/terms`, `/privacy`, `/support`, and `/delete-account` return their
  static HTML pages.
- Legacy `.html` page URLs redirect to the corresponding extensionless
  canonical routes without a loop.

## Link-preview scope

The edge route renders generic Mirror Trip Open Graph metadata and an exact
canonical URL for each shared path. It does not call the trip API. Dynamic trip
titles and images would require a secure server-side public-trip lookup in the
worker (or a dedicated metadata endpoint); client-side fetching is intentionally
not used because social crawlers generally do not execute it.
