import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const archiveRoot = path.join(root, 'legal-archive');
const legalDocuments = new Map([
  ['terms', {
    publicFile: path.join(publicRoot, 'terms.html'),
    currentSnapshot: path.join(archiveRoot, 'terms', '2026-07-20.html'),
  }],
  ['privacy', {
    publicFile: path.join(publicRoot, 'privacy.html'),
    currentSnapshot: path.join(archiveRoot, 'privacy', '2026-07-20.html'),
  }],
]);
const archiveFilenamePattern = /^\d{4}-\d{2}-\d{2}\.html$/;
const publicDatedRoutePattern = /\/(?:terms|privacy)\/\d{4}-\d{2}-\d{2}(?:\.html)?\b/i;

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await filesUnder(entryPath));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

test('legal archive and initial snapshots exist outside public', async () => {
  assert.equal(path.relative(publicRoot, archiveRoot), path.join('..', 'legal-archive'));
  await access(path.join(archiveRoot, 'README.md'));
  await Promise.all([...legalDocuments.values()].flatMap(({ publicFile, currentSnapshot }) => [
    access(publicFile),
    access(currentSnapshot),
  ]));
});

test('Terms and Privacy archives are independent and use dated HTML filenames', async () => {
  const archiveEntries = await readdir(archiveRoot, { withFileTypes: true });
  const archiveDirectories = archiveEntries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(archiveDirectories, [...legalDocuments.keys()].sort());

  for (const document of legalDocuments.keys()) {
    const entries = await readdir(path.join(archiveRoot, document), { withFileTypes: true });
    assert.ok(entries.length > 0, `${document} archive must not be empty`);

    for (const entry of entries) {
      assert.ok(entry.isFile(), `${document}/${entry.name} must be a file`);
      assert.match(entry.name, archiveFilenamePattern, `${document}/${entry.name}`);

      const date = entry.name.slice(0, -5);
      assert.equal(
        new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10),
        date,
        `${document}/${entry.name} must contain a valid calendar date`,
      );
    }
  }
});

test('public deployment contains no legal archive directory or references', async () => {
  await assert.rejects(access(path.join(publicRoot, 'legal-archive')), { code: 'ENOENT' });
  await assert.rejects(
    access(path.join(publicRoot, 'legal', 'manifest.json')),
    { code: 'ENOENT' },
  );

  const publicTextFiles = (await filesUnder(publicRoot)).filter((filename) => (
    ['.css', '.html', '.js', '.json', '.txt', '.xml'].includes(path.extname(filename))
  ));

  for (const filename of publicTextFiles) {
    const contents = await readFile(filename, 'utf8');
    assert.doesNotMatch(contents, /legal-archive/i, filename);
    assert.doesNotMatch(contents, /\/legal\/manifest\.json/i, filename);
  }
});

test('public deployment contains no dated Terms or Privacy routes or references', async () => {
  const publicFiles = await filesUnder(publicRoot);

  for (const filename of publicFiles) {
    const publicPath = `/${path.relative(publicRoot, filename).replaceAll(path.sep, '/')}`;
    assert.doesNotMatch(publicPath, publicDatedRoutePattern, publicPath);

    if (['.css', '.html', '.js', '.json', '.txt', '.xml'].includes(path.extname(filename))) {
      assert.doesNotMatch(
        await readFile(filename, 'utf8'),
        publicDatedRoutePattern,
        filename,
      );
    }
  }
});

test('build and deployment scripts do not copy the archive into public', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  assert.doesNotMatch(JSON.stringify(packageJson.scripts), /legal-archive/i);

  const toolingFiles = await filesUnder(path.join(root, 'scripts'));
  for (const filename of toolingFiles) {
    assert.doesNotMatch(await readFile(filename, 'utf8'), /legal-archive/i, filename);
  }
});
