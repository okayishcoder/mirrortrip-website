import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const pages = new Map([
  ['index.html', '/'],
  ['terms.html', '/terms'],
  ['privacy.html', '/privacy'],
  ['support.html', '/support'],
  ['delete-account.html', '/delete-account'],
]);
const canonicalRoutes = new Set(pages.values());
const requiredPublicFiles = [
  '_worker.js',
  '404.html',
  'index.html',
  'terms.html',
  'privacy.html',
  'support.html',
  'delete-account.html',
  'styles.css',
  'script.js',
  'assets/mt.png',
  'assets/favicon.png',
];
const repositoryOnlyPaths = [
  '.gitignore',
  'README.md',
  'package.json',
  'scripts',
  'tests',
  'debug.log',
  'legal-archive',
];

async function readPage(filename) {
  return readFile(path.join(publicRoot, filename), 'utf8');
}

function attributeValues(html, attribute) {
  const expression = new RegExp(`\\b${attribute}="([^"]+)"`, 'gi');
  return [...html.matchAll(expression)].map((match) => match[1]);
}

test('all required deployment files exist inside public', async () => {
  await Promise.all(
    requiredPublicFiles.map((filename) => access(path.join(publicRoot, filename))),
  );
});

test('repository-only paths are not copied into public', async () => {
  for (const pathname of repositoryOnlyPaths) {
    await assert.rejects(access(path.join(publicRoot, pathname)), { code: 'ENOENT' });
  }
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
      await access(path.join(publicRoot, pathname.slice(1)));
    }
  }
});

test('root-relative assets referenced by CSS and the Worker exist', async () => {
  const css = await readFile(path.join(publicRoot, 'styles.css'), 'utf8');
  const worker = await readFile(path.join(publicRoot, '_worker.js'), 'utf8');
  const references = [
    ...[...css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)].map((match) => match[2]),
    ...attributeValues(worker, 'href'),
    ...attributeValues(worker, 'src'),
  ].filter((value) => value.startsWith('/') && !canonicalRoutes.has(value));

  for (const reference of references) {
    const pathname = new URL(reference, 'https://mirrortrips.com').pathname;
    await access(path.join(publicRoot, pathname.slice(1)));
  }
});

test('local preview and deployment documentation target only public', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');

  assert.match(packageJson.scripts.dev, /\bwrangler pages dev public\b/);
  assert.match(readme, /Build output directory[^]*`public`/i);
  assert.doesNotMatch(packageJson.scripts.dev, /\bwrangler pages dev \.\s*$/);
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
