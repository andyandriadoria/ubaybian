import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { basename } from 'node:path';

const rootEntries = readdirSync('.', { withFileTypes: true });
const jsFiles = rootEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
  .map((entry) => entry.name)
  .sort();

const failures = [];
for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (result.status !== 0) failures.push(file);
}

const refs = new Set();
const addRef = (raw) => {
  const value = String(raw || '').trim();
  if (!value || value.startsWith('http:') || value.startsWith('https:') || value.startsWith('data:') || value.startsWith('#')) return;
  const clean = value.replace(/^\.\//, '').split(/[?#]/)[0];
  if (!clean || !/\.(?:js|css|svg)$/i.test(clean)) return;
  refs.add(clean);
};

const html = readFileSync('index.html', 'utf8');
for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) addRef(match[1]);

for (const file of jsFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(/["'`]((?:\.\/)?[A-Za-z0-9_./-]+\.(?:js|css|svg)(?:\?[^"'`]*)?)["'`]/g)) addRef(match[1]);
}

const missing = [...refs].filter((file) => !existsSync(file));
if (missing.length) {
  console.error('\nMissing local frontend assets:');
  missing.forEach((file) => console.error(`- ${file}`));
  process.exitCode = 1;
}

if (failures.length) {
  console.error(`\nSyntax check failed: ${failures.join(', ')}`);
  process.exitCode = 1;
}

if (!process.exitCode) {
  console.log(`Frontend integrity OK: ${jsFiles.length} JS files parsed, ${refs.size} local asset references resolved.`);
}
