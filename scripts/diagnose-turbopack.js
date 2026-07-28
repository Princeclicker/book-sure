/**
 * diagnose-turbopack.js
 * 
 * Run: node scripts/diagnose-turbopack.js
 * 
 * Checks for common Turbopack runtime error causes:
 * - Import resolution failures
 * - Server/client boundary violations
 * - Native module bundling issues
 * - Module initialization side effects
 * - Schema mismatches
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const issues = [];
const warnings = [];

function issue(severity, file, line, message) {
  issues.push({ severity, file, line, message });
}

function warn(file, line, message) {
  warnings.push({ file, line, message });
}

// ── Helpers ──────────────────────────────────────────────────────
function readLines(filePath) {
  try {
    return fs.readFileSync(path.join(ROOT, filePath), 'utf-8').split('\n');
  } catch { return []; }
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

// ── 1. Check for import resolution ───────────────────────────────
console.log('\n=== 1. Import Resolution Check ===\n');

const tsFiles = findFiles('.ts').concat(findFiles('.tsx'));
const aliasMap = {};

// Build alias map from tsconfig paths
try {
  const tsconfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'tsconfig.json'), 'utf-8'));
  const paths = tsconfig.compilerOptions?.paths || {};
  for (const [alias, targets] of Object.entries(paths)) {
    const key = alias.replace(/\/\*$/, '');
    const target = targets[0].replace(/\/\*$/, '');
    aliasMap[key] = target;
  }
} catch (e) {
  warn('tsconfig.json', 0, 'Could not parse tsconfig.json');
}

for (const file of tsFiles) {
  const lines = readLines(file);
  lines.forEach((line, i) => {
    const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
    if (!importMatch) return;
    const imp = importMatch[1];

    // Check @/ alias
    if (imp.startsWith('@/')) {
      const resolved = imp.replace('@/', aliasMap['@/'] || '');
      const fullPath = path.join(ROOT, resolved);
      const exts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
      const found = exts.some(ext => fs.existsSync(fullPath + ext));
      if (!found) {
        issue('ERROR', file, i + 1, `Cannot resolve alias import: ${imp}`);
      }
    }

    // Check for importing .js in .ts files
    if (file.endsWith('.ts') && imp.endsWith('.js')) {
      warn(file, i + 1, `TypeScript file imports .js extension: ${imp}`);
    }

    // Check for importing native modules that may fail with Turbopack
    const nativeModules = ['better-sqlite3', 'pg', 'nodemailer', 'resend', 'node-fetch'];
    for (const mod of nativeModules) {
      if (imp === mod || imp.startsWith(mod + '/')) {
        const isServerFile = !file.includes('/components/') && 
                             !file.includes('/app/') || 
                             file.includes('/api/') ||
                             file.includes('/actions/');
        if (!isServerFile) {
          issue('ERROR', file, i + 1, `Native module "${mod}" imported in non-server file`);
        }
      }
    }
  });
}

// ── 2. Check server/client boundaries ────────────────────────────
console.log('=== 2. Server/Client Boundary Check ===\n');

const clientFiles = tsFiles.filter(f => {
  const content = fs.readFileSync(path.join(ROOT, f), 'utf-8');
  return content.includes("'use client'");
});

const serverModules = ['@/lib/db', '@/lib/auth', '@/lib/email', 'better-sqlite3', 'pg', 'nodemailer'];

for (const file of clientFiles) {
  const lines = readLines(file);
  lines.forEach((line, i) => {
    for (const mod of serverModules) {
      if (line.includes(`'${mod}'`) || line.includes(`"${mod}"`)) {
        issue('BOUNDARY', file, i + 1, `Client file imports server module: ${mod}`);
      }
    }
  });
}

// ── 3. Check for problematic module-level side effects ────────────
console.log('=== 3. Module-Level Side Effects ===\n');

for (const file of tsFiles) {
  const lines = readLines(file);
  lines.forEach((line, i) => {
    // Detect synchronous DB operations at module scope
    if (line.match(/^(?:const|let|var)\s+/) && 
        (line.includes('.exec(') || line.includes('.run(') || line.includes('.prepare('))) {
      issue('SIDE_EFFECT', file, i + 1, 'Synchronous DB operation at module scope (causes Turbopack issues)');
    }
    // Detect prototype monkey-patching
    if (line.includes('.prototype') && line.includes('mapToDriverValue')) {
      warn(file, i + 1, 'Prototype monkey-patching at module scope');
    }
    // Detect console.log at module scope (outside function)
    if (line.trimStart().startsWith('console.log') && !line.includes('=>') && !line.includes('function')) {
      warn(file, i + 1, 'console.log at module scope (runs on every import)');
    }
  });
}

// ── 4. Check native module compatibility ──────────────────────────
console.log('=== 4. Native Module Check ===\n');

const nativeModules = ['better-sqlite3', 'pg'];
for (const mod of nativeModules) {
  try {
    require.resolve(mod, { paths: [ROOT] });
    console.log(`  ✓ ${mod} found`);
  } catch {
    issue('MISSING', 'package.json', 0, `Native module "${mod}" not installed`);
  }
}

// ── 5. Check Next.js config ──────────────────────────────────────
console.log('\n=== 5. Next.js Config Check ===\n');

const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
let configFound = false;
for (const cf of configFiles) {
  if (fs.existsSync(path.join(ROOT, cf))) {
    configFound = true;
    const content = fs.readFileSync(path.join(ROOT, cf), 'utf-8');
    
    if (content.includes('webpack:')) {
      issue('CONFIG', cf, 0, 'Custom webpack config detected - not supported by Turbopack');
    }
    
    if (!content.includes('serverExternalPackages')) {
      warn(cf, 0, 'No serverExternalPackages - native modules may fail to bundle');
    }
    
    console.log(`  ✓ ${cf} found`);
  }
}
if (!configFound) {
  warn('next.config.js', 0, 'No Next.js config file found');
}

// ── 6. Check .next build cache ───────────────────────────────────
console.log('\n=== 6. Build Cache Check ===\n');

const nextDir = path.join(ROOT, '.next');
if (fs.existsSync(nextDir)) {
  const size = getDirSize(nextDir);
  console.log(`  .next/ exists (${(size / 1024 / 1024).toFixed(1)} MB)`);
  if (size > 500 * 1024 * 1024) {
    warn('.next/', 0, 'Build cache is very large - consider clearing it');
  }
} else {
  console.log('  .next/ does not exist (clean state)');
}

function getDirSize(dir) {
  let size = 0;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) size += getDirSize(full);
      else size += fs.statSync(full).size;
    }
  } catch {}
  return size;
}

// ── 7. Check for dead code at project root ───────────────────────
console.log('\n=== 7. Dead Code at Root ===\n');

const rootTsFiles = tsFiles.filter(f => !f.includes('/') && !f.includes('\\'));
for (const f of rootTsFiles) {
  if (f === 'proxy.ts') {
    const content = fs.readFileSync(path.join(ROOT, f), 'utf-8');
    const isImported = tsFiles.some(other => {
      if (other === f) return false;
      const otherContent = fs.readFileSync(path.join(ROOT, other), 'utf-8');
      return otherContent.includes(`'./${f}'`) || otherContent.includes(`"./${f}"`);
    });
    if (!isImported) {
      issue('DEAD_CODE', f, 0, 'File exists but is never imported - may confuse Turbopack bundler');
    }
  }
}

// ── Results ──────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log('RESULTS');
console.log('='.repeat(60));

if (issues.length === 0 && warnings.length === 0) {
  console.log('\n✓ No issues found!\n');
  process.exit(0);
}

if (issues.length > 0) {
  console.log(`\n❌ ${issues.length} ERROR(S):`);
  for (const { severity, file, line, message } of issues) {
    const loc = line ? `:${line}` : '';
    console.log(`  [${severity}] ${file}${loc} — ${message}`);
  }
}

if (warnings.length > 0) {
  console.log(`\n⚠️  ${warnings.length} WARNING(S):`);
  for (const { file, line, message } of warnings) {
    const loc = line ? `:${line}` : '';
    console.log(`  ${file}${loc} — ${message}`);
  }
}

console.log('');
process.exit(issues.length > 0 ? 1 : 0);
