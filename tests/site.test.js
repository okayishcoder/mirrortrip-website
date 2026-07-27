import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pages = new Map([
  ['index.html', '/'],
  ['terms.html', '/terms'],
  ['privacy.html', '/privacy'],
  ['support.html', '/support'],
  ['delete-account.html', '/delete-account'],
]);
const canonicalRoutes = new Set(pages.values());

async function readPage(filename) {
  return readFile(path.join(root, filename), 'utf8');
}

function attributeValues(html, attribute) {
  const expression = new RegExp(`\\b${attribute}="([^"]+)"`, 'gi');
  return [...html.matchAll(expression)].map((match) => match[1]);
}

test('required static HTML files exist', async () => {
  await Promise.all([...pages.keys()].map((filename) => access(path.join(root, filename))));
});

test('internal page links use canonical root-relative routes', async () => {
  for (const filename of pages.keys()) {
    const html = await readPage(filename);
    const links = attributeValues(html, 'href');

    assert.doesNotMatch(
      html,
      /\b(?:href|src)="(?:\.{0,2}\/)?(?:index|terms|privacy|support|delete-account)\.html(?:[#?"][^"]*)?/i,
      filename,
    );

    for (const route of canonicalRoutes) {
      if (route === '/') continue;
      assert.ok(links.includes(route), `${filename} should link to ${route}`);
    }
    assert.ok(links.includes('/'), `${filename} should link to /`);
  }
});

test('referenced root-relative local assets exist', async () => {
  for (const filename of pages.keys()) {
    const html = await readPage(filename);
    const references = [
      ...attributeValues(html, 'href'),
      ...attributeValues(html, 'src'),
    ].filter((value) => (
      value.startsWith('/') &&
      !canonicalRoutes.has(value) &&
      value !== '/#main-content'
    ));

    for (const reference of references) {
      const pathname = new URL(reference, 'https://mirrortrips.com').pathname;
      await access(path.join(root, pathname.slice(1)));
    }
  }
});

test('first-party website URLs are HTTPS and extensionless', async () => {
  for (const filename of pages.keys()) {
    const html = await readPage(filename);
    assert.doesNotMatch(html, /http:\/\/(?:www\.)?mirrortrips\.com/i, filename);
    assert.doesNotMatch(
      html,
      /https:\/\/(?:www\.)?mirrortrips\.com\/(?:index|terms|privacy|support|delete-account)\.html/i,
      filename,
    );
  }
});

test('every page declares its absolute canonical and Open Graph URL', async () => {
  for (const [filename, route] of pages) {
    const html = await readPage(filename);
    const expected = `https://mirrortrips.com${route}`;
    assert.match(
      html,
      new RegExp(`<link rel="canonical" href="${expected.replace('/', '\\/')}"`),
      filename,
    );
    assert.match(
      html,
      new RegExp(`<meta property="og:url" content="${expected.replace('/', '\\/')}"`),
      filename,
    );
  }
});
