import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules']);
const TEXT_EXTS = new Set(['.html', '.js', '.css', '.md', '.json', '.jsonc', '.yml', '.yaml', '.gs']);
const VERSIONED = /(?:[A-Za-z0-9_-]+)-v(?:0?\d{2,4})(?:-[A-Za-z0-9_-]+)?\.(?:js|css)/g;
const FRONTEND_EXTS = new Set(['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp']);
const NON_RUNTIME_PREFIXES = ['backend/', 'docs/', 'scripts/', 'tests/', '.github/', 'apps-script/'];
const STATIC_IMPORT = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g;

function walk(dir = '.') {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function normalized(path) {
  return relative('.', path).replaceAll('\\', '/');
}

function isRuntimeText(path) {
  const rel = normalized(path);
  if (!TEXT_EXTS.has(extname(rel))) return false;
  return !NON_RUNTIME_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

function isFrontendCandidate(path) {
  const rel = normalized(path);
  if (!FRONTEND_EXTS.has(extname(rel).toLowerCase())) return false;
  if (NON_RUNTIME_PREFIXES.some((prefix) => rel.startsWith(prefix))) return false;
  return !rel.startsWith('.');
}

function resolveJsImport(fromFile, specifier) {
  if (!specifier.startsWith('.')) return null;
  const direct = resolve(dirname(fromFile), specifier);
  const candidates = [direct, `${direct}.js`, join(direct, 'index.js')];
  return candidates.find((candidate) => existsSync(candidate)) || null;
}

const allFiles = walk();
const textFiles = allFiles.filter((file) => TEXT_EXTS.has(extname(file)));
const references = new Map();
for (const file of textFiles) {
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(VERSIONED)) {
    const asset = match[0];
    if (!references.has(asset)) references.set(asset, new Set());
    references.get(asset).add(normalized(file));
  }
}

const rows = [...references.entries()]
  .map(([asset, refs]) => ({ asset, refs: [...refs].sort() }))
  .sort((a, b) => a.asset.localeCompare(b.asset));

console.log(`Legacy versioned references: ${rows.length}`);
for (const row of rows) console.log(`- ${row.asset} <- ${row.refs.join(', ')}`);

const runtimeSources = allFiles.filter(isRuntimeText);
const runtimeContents = new Map(runtimeSources.map((file) => [normalized(file), readFileSync(file, 'utf8')]));
const candidates = allFiles.filter(isFrontendCandidate);
const entrypoints = new Set(['index.html']);
const orphanRows = [];

for (const candidate of candidates) {
  const rel = normalized(candidate);
  if (entrypoints.has(rel)) continue;

  const names = new Set([rel, basename(rel)]);
  const refs = [];
  for (const [sourcePath, source] of runtimeContents) {
    if (sourcePath === rel) continue;
    if ([...names].some((name) => source.includes(name))) refs.push(sourcePath);
  }

  if (refs.length === 0) orphanRows.push(rel);
}

orphanRows.sort((a, b) => a.localeCompare(b));
console.log(`Potential unreferenced frontend files: ${orphanRows.length}`);
for (const file of orphanRows) console.log(`- ${file}`);

const backendFiles = allFiles
  .filter((file) => normalized(file).startsWith('backend/src/') && extname(file) === '.js')
  .map((file) => resolve(file));
const backendSet = new Set(backendFiles);
const wrangler = readFileSync('backend/wrangler.jsonc', 'utf8');
const mainMatch = wrangler.match(/"main"\s*:\s*"([^"]+)"/);
const backendEntry = mainMatch ? resolve('backend', mainMatch[1]) : null;
const reachable = new Set();

function visitBackend(file) {
  if (!file || reachable.has(file) || !backendSet.has(file)) return;
  reachable.add(file);
  const source = readFileSync(file, 'utf8');
  for (const match of source.matchAll(STATIC_IMPORT)) {
    const imported = resolveJsImport(file, match[1]);
    if (imported) visitBackend(imported);
  }
}

visitBackend(backendEntry);
const unreachableBackend = backendFiles
  .filter((file) => !reachable.has(file))
  .map(normalized)
  .sort((a, b) => a.localeCompare(b));

console.log(`Backend modules reachable from Wrangler entry: ${reachable.size}/${backendFiles.length}`);
console.log(`Potential unreachable backend modules: ${unreachableBackend.length}`);
for (const file of unreachableBackend) console.log(`- ${file}`);
