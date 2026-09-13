import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';

const SKIP_DIRS = new Set(['.git', '.github', 'backend', 'node_modules']);
const TEXT_EXTS = new Set(['.html', '.js', '.css', '.md', '.json']);
const VERSIONED = /(?:[A-Za-z0-9_-]+)-v(?:0?\d{2,4})(?:-[A-Za-z0-9_-]+)?\.(?:js|css)/g;

function walk(dir = '.') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile() && TEXT_EXTS.has(extname(entry.name))) files.push(path);
  }
  return files;
}

const references = new Map();
for (const file of walk()) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(VERSIONED)) {
    const asset = match[0];
    if (!references.has(asset)) references.set(asset, new Set());
    references.get(asset).add(relative('.', file));
  }
}

const rows = [...references.entries()]
  .map(([asset, refs]) => ({ asset, refs: [...refs].sort() }))
  .sort((a, b) => a.asset.localeCompare(b.asset));

console.log(`Legacy versioned frontend references: ${rows.length}`);
for (const row of rows) console.log(`- ${row.asset} <- ${row.refs.join(', ')}`);
