import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'public');
const archiveRoot = path.join(root, 'legal-archive');
const snapshots = [
  {
    publicFile: path.join(publicRoot, 'terms.html'),
    archiveFile: path.join(archiveRoot, 'terms', '2026-07-20.html'),
  },
  {
    publicFile: path.join(publicRoot, 'privacy.html'),
    archiveFile: path.join(archiveRoot, 'privacy', '2026-07-20.html'),
  },
];

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
  await Promise.all(snapshots.map(({ archiveFile }) => access(archiveFile)));
});

test('initial snapshots exactly match the current public legal documents', async () => {
  for (const { publicFile, archiveFile } of snapshots) {
    const [publicContents, archiveContents] = await Promise.all([
      readFile(publicFile),
      readFile(archiveFile),
    ]);
    assert.deepEqual(archiveContents, publicContents, archiveFile);
  }
});

test('public deployment contains no legal archive directory or references', async () => {
  await assert.rejects(access(path.join(publicRoot, 'legal-archive')), { code: 'ENOENT' });

  const publicTextFiles = (await filesUnder(publicRoot)).filter((filename) => (
    ['.css', '.html', '.js', '.json', '.txt', '.xml'].includes(path.extname(filename))
  ));

  for (const filename of publicTextFiles) {
    assert.doesNotMatch(await readFile(filename, 'utf8'), /legal-archive/i, filename);
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
