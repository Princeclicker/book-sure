/**
 * trace-module.js
 * 
 * Trace which files import a given module, helping identify Turbopack errors.
 * 
 * Usage:
 *   node scripts/trace-module.js @/lib/db
 *   node scripts/trace-module.js better-sqlite3
 *   node scripts/trace-module.js @/lib/auth
 *   node scripts/trace-module.js proxy.ts
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const target = process.argv[2];

if (!target) {
  console.log(`
Usage: node scripts/trace-module.js <module-path>

Examples:
  node scripts/trace-module.js @/lib/db
  node scripts/trace-module.js better-sqlite3
  node scripts/trace-module.js @/lib/auth
  node scripts/trace-module.js ./proxy
  node scripts/trace-module.js pg
`);
  process.exit(1);
}

function findFiles(ext) {
  const results = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(ext)) {
        results.push(path.relative(ROOT, full).replace(/\\/g, '/'));
      }
    }
  }
  walk(ROOT);
  return results;
}

function getFileContent(filePath) {
  try { return fs.readFileSync(path.join(ROOT, filePath), 'utf-8'); }
  catch { return ''; }
}

// ── Find all importers ───────────────────────────────────────────
const tsFiles = findFiles('.ts').concat(findFiles('.tsx'));
const importers = [];

for (const file of tsFiles) {
  const content = getFileContent(file);
  if (!content) continue;

  const lines = content.split('\n');
  lines.forEach((line, i) => {
    // Match import from target
    const patterns = [
      new RegExp(`from\\s+['"]${escapeRegex(target)}['"]`),
      new RegExp(`from\\s+['"]${escapeRegex(target)}/.*?['"]`),
      new RegExp(`require\\s*\\(\\s*['"]${escapeRegex(target)}['"]\\)`),
    ];

    for (const pat of patterns) {
      if (pat.test(line)) {
        importers.push({
          file,
          line: i + 1,
          content: line.trim(),
        });
        break;
      }
    }
  });
}

// ── Build dependency tree ─────────────────────────────────────────
function getImports(filePath) {
  const content = getFileContent(filePath);
  if (!content) return [];

  const imports = [];
  const regex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const imp = match[1];
    if (imp.startsWith('@/') || imp.startsWith('./') || imp.startsWith('../')) {
      imports.push(imp);
    }
  }
  return imports;
}

function resolveImport(fromFile, imp) {
  // Resolve @/ alias
  if (imp.startsWith('@/')) {
    const rel = imp.replace('@/', '');
    const exts = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
    for (const ext of exts) {
      const candidate = rel + ext;
      if (fs.existsSync(path.join(ROOT, candidate))) {
        return candidate;
      }
    }
  }
  // Resolve relative
  if (imp.startsWith('./') || imp.startsWith('../')) {
    const dir = path.dirname(fromFile);
    const resolved = path.join(dir, imp).replace(/\\/g, '/');
    const exts = ['', '.ts', '.tsx', '.js', '.jsx'];
    for (const ext of exts) {
      if (fs.existsSync(path.join(ROOT, resolved + ext))) return resolved + ext;
      if (fs.existsSync(path.join(ROOT, resolved + '/index' + ext))) return resolved + '/index' + ext;
    }
  }
  return null;
}

// ── Recursive chain tracer ───────────────────────────────────────
function traceChain(filePath, visited = new Set(), depth = 0) {
  if (depth > 10) return;
  if (visited.has(filePath)) return;
  visited.add(filePath);

  const imports = getImports(filePath);
  for (const imp of imports) {
    const resolved = resolveImport(filePath, imp);
    if (!resolved) continue;

    console.log(`${'  '.repeat(depth + 1}→ ${imp} (${resolved})`);
    
    // Check if this resolved file imports our target
    const content = getFileContent(resolved);
    if (content.includes(target) || content.includes(`'${target}'`) || content.includes(`"${target}"`)) {
      traceChain(resolved, visited, depth + 1);
    }
  }
}

// ── Output ───────────────────────────────────────────────────────
console.log(`\n=== Module Trace: ${target} ===\n`);

if (importers.length === 0) {
  console.log(`No files import "${target}" directly.\n`);
  
  // Try indirect trace
  console.log('Checking for indirect imports...\n');
  for (const file of tsFiles) {
    const content = getFileContent(file);
    if (content.includes(target) && !file.includes('node_modules')) {
      console.log(`  Found reference in: ${file}`);
    }
  }
} else {
  console.log(`Direct importers (${importers.length}):\n`);
  for (const { file, line, content } of importers) {
    console.log(`  ${file}:${line}`);
    console.log(`    ${content}\n`);
  }

  // Show import chain for first few importers
  console.log('Import chains:\n');
  const seen = new Set();
  for (const { file } of importers.slice(0, 5)) {
    if (!seen.has(file)) {
      console.log(`  ${file}`);
      traceChain(file, seen);
      console.log('');
    }
  }
}

// ── Check if target imports problematic modules ──────────────────
console.log('Downstream dependencies of target modules:\n');
for (const file of tsFiles) {
  const content = getFileContent(file);
  if (!content.includes(target)) continue;
  
  const problemModules = ['better-sqlite3', 'pg', 'nodemailer', 'resend'];
  for (const mod of problemModules) {
    if (content.includes(mod)) {
      console.log(`  ⚠️  ${file} imports both "${target}" and native module "${mod}"`);
    }
  }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
