import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const normalize = (value) => value.replaceAll('\\', '/').replace(/^\.\//, '');
const escapeRegex = (value) => value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
const globRegex = (glob) => { const marker = '__DOUBLE_STAR__'; return new RegExp(`^${escapeRegex(normalize(glob)).replaceAll('**', marker).replaceAll('*', '[^/]*').replaceAll(marker, '.*')}$`); };
const matchesAny = (file, globs) => globs.some((glob) => globRegex(glob).test(normalize(file)));
function walk(directory) { if (!existsSync(directory)) return []; return readdirSync(directory).flatMap((name) => { if (['.git', 'node_modules', 'coverage', 'dist'].includes(name)) return []; const absolute = path.join(directory, name); return statSync(absolute).isDirectory() ? walk(absolute) : [absolute]; }); }
const policy = JSON.parse(readFileSync(path.join(root, 'docs', 'docs-policy.json'), 'utf8'));
for (const relative of policy.requiredDocuments ?? []) {
  const absolute = path.join(root, relative);
  if (!existsSync(absolute)) { errors.push(`Required documentation is missing: ${relative}`); continue; }
}
const linkPattern = /\[[^\]]*\]\(([^)]+)\)/g;
for (const file of walk(root).filter((item) => item.endsWith('.md'))) {
  const content = readFileSync(file, 'utf8');
  const relative = normalize(path.relative(root, file));
  if (relative.startsWith('docs/')) {
    const opening = content.split(/\r?\n/).slice(0, 20).join('\n');
    for (const field of ['status:', 'owner:', 'last_verified:']) if (!opening.includes(field)) errors.push(`${relative} is missing metadata field ${field}`);
  }
  let match;
  while ((match = linkPattern.exec(content))) {
    const target = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
    if (!target || /^(https?:|mailto:|tel:|#|\/|[A-Za-z]:)/.test(target)) continue;
    if (!existsSync(path.resolve(path.dirname(file), decodeURIComponent(target)))) errors.push(`${relative} has a broken link: ${target}`);
  }
}
const baseIndex = process.argv.indexOf('--base');
let changedFiles = process.argv.flatMap((argument, index) => argument === '--changed-file' && process.argv[index + 1] ? [normalize(process.argv[index + 1])] : []);
if (!changedFiles.length && baseIndex !== -1 && process.argv[baseIndex + 1]) { const base = process.argv[baseIndex + 1]; try { changedFiles = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).map(normalize).filter(Boolean); } catch (error) { errors.push(`Unable to calculate documentation drift from base ${base}: ${error.message}`); } }
for (const rule of policy.rules ?? []) { const sourceChanges = changedFiles.filter((file) => matchesAny(file, rule.sources)); if (sourceChanges.length && !changedFiles.some((file) => matchesAny(file, rule.documents))) errors.push(`Documentation drift rule "${rule.name}" requires one of [${rule.documents.join(', ')}] because these files changed: ${sourceChanges.join(', ')}`); }
if (errors.length) { console.error(`Documentation validation failed (${errors.length} issues):`); for (const error of errors) console.error(`- ${error}`); process.exit(1); }
console.log('Documentation validation passed.');
