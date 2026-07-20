import assert from 'node:assert/strict';
import test from 'node:test';

import { handleRequest } from '../_worker.js';

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
    fetch: async () => new Response('static asset', { status: 200 }),
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

test('legal page routes pass through to Cloudflare static assets', async () => {
  const privacyResponse = await handleRequest(request('/privacy/'), config);
  const termsResponse = await handleRequest(request('/terms'), config);

  assert.equal(privacyResponse.status, 200);
  assert.equal(await privacyResponse.text(), 'static asset');
  assert.equal(privacyResponse.headers.get('location'), null);
  assert.equal(termsResponse.status, 200);
  assert.equal(await termsResponse.text(), 'static asset');
  assert.equal(termsResponse.headers.get('location'), null);
});

test('unknown routes retain static-host behavior', async () => {
  const response = await handleRequest(request('/privacy.html'), config);

  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'static asset');
});
