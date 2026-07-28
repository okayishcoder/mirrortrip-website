import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { handleRequest } from '../public/_worker.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
]);

async function fetchStaticAsset(request) {
  const url = new URL(request.url);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return new Response('Not Found', { status: 404 });
  }

  if (pathname === '/index.html') {
    return Response.redirect(`${url.origin}/`, 308);
  }

  if (/^\/[^/]+\.html$/.test(pathname)) {
    return Response.redirect(`${url.origin}${pathname.slice(0, -5)}`, 308);
  }

  const relativePath = pathname === '/'
    ? 'index.html'
    : pathname.slice(1).includes('.')
      ? pathname.slice(1)
      : `${pathname.slice(1)}.html`;
  const resolvedPath = path.resolve(publicRoot, relativePath);
  if (!resolvedPath.startsWith(`${publicRoot}${path.sep}`)) {
    return new Response('Not Found', { status: 404 });
  }

  try {
    const body = await readFile(resolvedPath);
    const contentType = contentTypes.get(path.extname(resolvedPath));
    return new Response(body, {
      status: 200,
      headers: contentType ? { 'Content-Type': contentType } : undefined,
    });
  } catch (error) {
    if (error.code === 'ENOENT') return new Response('Not Found', { status: 404 });
    throw error;
  }
}

const config = {
  SHARE_DOMAIN: 'mirrortrips.com',
  IOS_APP_STORE_URL: 'https://apps.apple.com/app/id123456789',
  ANDROID_PLAY_STORE_URL: 'https://play.google.com/store/apps/details?id=com.mt.mtclient',
  APPLE_TEAM_ID: 'ABCDE12345',
  IOS_BUNDLE_ID: 'com.mt.mtclient',
  ANDROID_PACKAGE_NAME: 'com.mt.mtclient',
  ANDROID_SHA256_FINGERPRINT:
    'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99',
  ASSETS: {
    fetch: fetchStaticAsset,
  },
};

function request(path, userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)') {
  return new Request(`https://mirrortrips.com${path}`, {
    headers: { 'User-Agent': userAgent },
  });
}

test('valid trip links return a generic fallback with an exact canonical URL', async () => {
  const response = await handleRequest(request('/t/testPublicShareId'), config);
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html/);
  assert.match(body, /https:\/\/mirrortrips\.com\/t\/testPublicShareId/);
  assert.match(body, /Download on the App Store/);
  assert.match(body, /Get it on Google Play/);
});

test('iOS and Android clients receive the correct client-side store target', async () => {
  const iosResponse = await handleRequest(
    request('/t/testPublicShareId', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'),
    config,
  );
  const androidResponse = await handleRequest(
    request('/t/testPublicShareId', 'Mozilla/5.0 (Linux; Android 15; Pixel 9)'),
    config,
  );

  assert.match(await iosResponse.text(), /https:\/\/apps\.apple\.com\/app\/id123456789/);
  assert.match(
    await androidResponse.text(),
    /https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.mt\.mtclient/,
  );
});

test('crawler HTML keeps metadata available and disables automatic redirection', async () => {
  const response = await handleRequest(
    request('/t/testPublicShareId', 'facebookexternalhit/1.1'),
    config,
  );
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.match(body, /"enabled":false/);
  assert.match(body, /property="og:title"/);
});

test('missing and malformed identifiers fail gracefully', async () => {
  for (const path of ['/t/', '/t/no spaces allowed', '/t/%E0%A4%A']) {
    const response = await handleRequest(request(path), config);
    const body = await response.text();

    assert.equal(response.status, 400);
    assert.match(body, /Invalid Mirror Trip link/);
  }
});

test('association files are valid JSON with expected identifiers and content types', async () => {
  const appleResponse = await handleRequest(
    request('/.well-known/apple-app-site-association'),
    config,
  );
  const androidResponse = await handleRequest(request('/.well-known/assetlinks.json'), config);
  const apple = await appleResponse.json();
  const android = await androidResponse.json();

  assert.equal(appleResponse.status, 200);
  assert.equal(androidResponse.status, 200);
  assert.match(appleResponse.headers.get('content-type'), /^application\/json/);
  assert.match(androidResponse.headers.get('content-type'), /^application\/json/);
  assert.deepEqual(apple.applinks.details[0].appIDs, ['ABCDE12345.com.mt.mtclient']);
  assert.equal(android[0].target.package_name, 'com.mt.mtclient');
  assert.equal(android[0].target.sha256_cert_fingerprints.length, 1);
});

test('association files report missing deployment configuration without redirecting', async () => {
  const appleResponse = await handleRequest(
    request('/.well-known/apple-app-site-association'),
    { ASSETS: config.ASSETS },
  );

  assert.equal(appleResponse.status, 503);
  assert.equal(appleResponse.headers.get('location'), null);
});

test('canonical static routes pass through to existing HTML files', async () => {
  const routes = ['/', '/terms', '/privacy', '/support', '/delete-account'];

  for (const route of routes) {
    const response = await handleRequest(request(route), config);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get('content-type'), /^text\/html/, route);
    assert.equal(response.headers.get('location'), null, route);
    assert.match(await response.text(), /<html\b/i, route);
  }
});

test('legacy HTML routes retain Cloudflare clean-URL compatibility', async () => {
  const routes = ['/terms.html', '/privacy.html', '/support.html', '/delete-account.html'];

  for (const route of routes) {
    const response = await handleRequest(request(route), config);
    assert.equal(response.status, 308, route);
    assert.equal(
      response.headers.get('location'),
      `https://mirrortrips.com${route.slice(0, -5)}`,
      route,
    );

    const redirectedPath = new URL(response.headers.get('location')).pathname;
    const destination = await handleRequest(request(redirectedPath), config);
    assert.equal(destination.status, 200, `${route} destination`);
    assert.equal(destination.headers.get('location'), null, `${route} redirect loop`);
  }
});

test('referenced static assets pass through and missing routes return 404', async () => {
  for (const route of ['/styles.css', '/script.js', '/assets/mt.png', '/assets/favicon.png']) {
    const response = await handleRequest(request(route), config);
    assert.equal(response.status, 200, route);
  }

  const response = await handleRequest(request('/not-a-real-page'), config);
  assert.equal(response.status, 404);
});

test('guessed legal archive routes are not publicly accessible', async () => {
  const routes = [
    '/legal-archive',
    '/legal-archive/',
    '/legal-archive/terms/2026-07-20.html',
    '/legal-archive/privacy/2026-07-20.html',
    '/terms/2026-07-20',
    '/privacy/2026-07-20',
  ];

  for (const route of routes) {
    const response = await handleRequest(request(route), config);
    assert.equal(response.status, 404, route);
    assert.equal(response.headers.get('location'), null, route);
  }
});
