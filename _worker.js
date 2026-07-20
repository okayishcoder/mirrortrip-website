const SHARE_ID_PATTERN = /^[A-Za-z0-9_-]{6,128}$/;
const CRAWLER_PATTERN =
  /bot|crawler|spider|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|pinterest|embedly|quora link preview/i;

function normalizeDomain(value, requestUrl) {
  const fallback = new URL(requestUrl).origin;
  if (!value) return fallback;

  const candidate = value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`;

  try {
    const url = new URL(candidate);
    url.protocol = 'https:';
    return url.origin;
  } catch {
    return fallback;
  }
}

function normalizeStoreUrl(value) {
  if (!value) return '';

  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.href : '';
  } catch {
    return '';
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse(value, status = 200) {
  return new Response(`${JSON.stringify(value, null, 2)}\n`, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? 'public, max-age=3600' : 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function missingConfigResponse(names) {
  return jsonResponse(
    {
      error: 'Share-link association configuration is incomplete.',
      missing: names,
    },
    503,
  );
}

function redirectResponse(location) {
  return new Response(null, {
    status: 301,
    headers: {
      Location: location,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

function appleAssociation(env) {
  const missing = ['APPLE_TEAM_ID', 'IOS_BUNDLE_ID'].filter((name) => !env[name]);
  if (missing.length) return missingConfigResponse(missing);

  const appIDs = [`${env.APPLE_TEAM_ID}.${env.IOS_BUNDLE_ID}`];
  if (env.IOS_ADDITIONAL_APP_IDS) {
    appIDs.push(
      ...env.IOS_ADDITIONAL_APP_IDS.split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    );
  }

  return jsonResponse({
    applinks: {
      details: [
        {
          appIDs,
          components: [
            {
              '/': '/t/*',
              comment: 'Mirror Trip public trip links',
            },
          ],
        },
      ],
    },
  });
}

function androidAssociation(env) {
  const missing = ['ANDROID_PACKAGE_NAME', 'ANDROID_SHA256_FINGERPRINT'].filter(
    (name) => !env[name],
  );
  if (missing.length) return missingConfigResponse(missing);

  const fingerprints = env.ANDROID_SHA256_FINGERPRINT.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return jsonResponse([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: env.ANDROID_PACKAGE_NAME,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}

function storeLink(url, label, className) {
  if (!url) {
    return `<span class="store-button ${className} store-button--disabled" aria-disabled="true">${label} unavailable</span>`;
  }

  return `<a class="store-button ${className}" href="${escapeHtml(url)}" rel="noopener noreferrer">${label}</a>`;
}

function tripFallback(request, env, shareId) {
  const requestUrl = new URL(request.url);
  const shareDomain = normalizeDomain(env.SHARE_DOMAIN, request.url);
  const canonicalUrl = `${shareDomain}${requestUrl.pathname}`;
  const previewImage = `${shareDomain}/assets/mt.png`;
  const validShareId = SHARE_ID_PATTERN.test(shareId);
  const title = validShareId ? 'Open this trip in Mirror Trip' : 'Invalid Mirror Trip link';
  const description = validShareId
    ? 'View this shared trip in the Mirror Trip mobile app.'
    : 'This shared trip link is incomplete or malformed.';
  const crawler = CRAWLER_PATTERN.test(request.headers.get('User-Agent') || '');
  const status = validShareId ? 200 : 400;
  const iosUrl = normalizeStoreUrl(env.IOS_APP_STORE_URL);
  const androidUrl = normalizeStoreUrl(env.ANDROID_PLAY_STORE_URL);

  const redirectConfig = JSON.stringify({
    enabled: validShareId && !crawler,
    iosUrl,
    androidUrl,
    path: requestUrl.pathname,
  }).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} | Mirror Trip</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="theme-color" content="#219EBC">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Mirror Trip">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(previewImage)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <link rel="icon" href="/assets/favicon.png" type="image/png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="share-page">
  <main class="share-fallback">
    <section class="share-card" aria-labelledby="share-title">
      <img src="/assets/mt.png" alt="" class="share-card__logo">
      <p class="eyebrow">Mirror Trip</p>
      <h1 id="share-title">${escapeHtml(title)}</h1>
      <p class="share-card__lede">${escapeHtml(description)}</p>
      ${
        validShareId
          ? '<p id="redirect-status" class="share-card__status" aria-live="polite">Choose your app store to continue.</p>'
          : '<p class="share-card__status">Check that you copied the complete shared URL.</p>'
      }
      <div class="share-card__actions">
        ${storeLink(iosUrl, 'Download on the App Store', 'store-button--ios')}
        ${storeLink(androidUrl, 'Get it on Google Play', 'store-button--android')}
      </div>
      <a class="share-card__home" href="/">Visit the Mirror Trip website</a>
    </section>
  </main>
  <script>
    (function () {
      var config = ${redirectConfig};
      if (!config.enabled) return;

      var ua = navigator.userAgent || '';
      var platform = navigator.userAgentData && navigator.userAgentData.platform
        ? navigator.userAgentData.platform
        : navigator.platform || '';
      var isAndroid = /Android/i.test(ua);
      var isIOS = /iPhone|iPad|iPod/i.test(ua) ||
        (/Mac/i.test(platform) && navigator.maxTouchPoints > 1);
      var destination = isAndroid ? config.androidUrl : (isIOS ? config.iosUrl : '');
      if (!destination) return;

      var key = 'mirror-trip-store-redirect:' + config.path;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, 'attempted');
      } catch (_) {
        // Continue when storage is unavailable; the store URL is still user-visible.
      }

      var status = document.getElementById('redirect-status');
      if (status) status.textContent = 'Taking you to the app store…';
      window.setTimeout(function () {
        window.location.replace(destination);
      }, 900);
    })();
  </script>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  });
}

export async function handleRequest(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/privacy' || url.pathname === '/privacy/') {
    return redirectResponse('/privacy.html');
  }

  if (url.pathname === '/terms' || url.pathname === '/terms/') {
    return redirectResponse('/terms.html');
  }

  if (url.pathname === '/.well-known/apple-app-site-association') {
    return appleAssociation(env);
  }

  if (url.pathname === '/.well-known/assetlinks.json') {
    return androidAssociation(env);
  }

  if (url.pathname === '/t' || url.pathname === '/t/') {
    return tripFallback(request, env, '');
  }

  if (url.pathname.startsWith('/t/')) {
    const pathRemainder = url.pathname.slice(3);
    let decoded = '';
    try {
      decoded = decodeURIComponent(pathRemainder);
    } catch {
      return tripFallback(request, env, '');
    }
    return tripFallback(request, env, decoded);
  }

  return env.ASSETS.fetch(request);
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
