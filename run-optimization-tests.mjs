/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║   BAZAAR Performance Optimization Test Runner                    ║
 * ║   Tests mobile, web, and database optimizations end-to-end      ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 *
 * Usage:
 *   node run-optimization-tests.mjs
 *
 * Prerequisites:
 *   - Mobile: cd mobile-app && npm install (jest + ts-jest)
 *   - Web:    cd web && npm install (vitest)
 */

import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MOBILE_DIR = resolve(__dirname, 'mobile-app');
const WEB_DIR = resolve(__dirname, 'web');

const MOBILE_TEST = 'src/tests/performance-optimizations.test.ts';
const WEB_TEST = 'src/tests/performance-optimizations.test.ts';

const SEP = '═'.repeat(65);
const THIN = '─'.repeat(65);

let mobileResult = { passed: false, output: '' };
let webResult = { passed: false, output: '' };

// ─── Mobile Tests ────────────────────────────────────────────────────
console.log(`\n╔${SEP}╗`);
console.log(`║  MOBILE APP — Performance Optimization Tests                   ║`);
console.log(`╚${SEP}╝\n`);

if (!existsSync(resolve(MOBILE_DIR, 'node_modules'))) {
  console.log('⚠️  node_modules not found in mobile-app/. Run: cd mobile-app && npm install\n');
} else {
  try {
    const out = execSync(
      `npx jest --config jest.config.js --testPathPattern="${MOBILE_TEST}" --verbose --no-cache 2>&1`,
      { cwd: MOBILE_DIR, encoding: 'utf-8', timeout: 120_000 }
    );
    console.log(out);
    mobileResult = { passed: true, output: out };
  } catch (err) {
    // Jest exits with code 1 on test failures — still capture output
    const out = err.stdout || err.stderr || String(err);
    console.log(out);
    mobileResult = { passed: false, output: out };
  }
}

// ─── Web Tests ───────────────────────────────────────────────────────
console.log(`\n╔${SEP}╗`);
console.log(`║  WEB APP — Performance Optimization Tests                      ║`);
console.log(`╚${SEP}╝\n`);

if (!existsSync(resolve(WEB_DIR, 'node_modules'))) {
  console.log('⚠️  node_modules not found in web/. Run: cd web && npm install\n');
} else {
  try {
    const out = execSync(
      `npx vitest run ${WEB_TEST} --reporter=verbose 2>&1`,
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 120_000 }
    );
    console.log(out);
    webResult = { passed: true, output: out };
  } catch (err) {
    const out = err.stdout || err.stderr || String(err);
    console.log(out);
    webResult = { passed: false, output: out };
  }
}

// ─── DB Migration Check ─────────────────────────────────────────────
console.log(`\n╔${SEP}╗`);
console.log(`║  DATABASE — Migration File Validation                          ║`);
console.log(`╚${SEP}╝\n`);

const migrationPath = resolve(__dirname, 'supabase', 'migrations', '20250602090000_performance_indexes.sql');
let dbResult = { passed: false };

if (!existsSync(migrationPath)) {
  console.log('❌ Migration file not found at:');
  console.log(`   supabase/migrations/20250602090000_performance_indexes.sql\n`);
} else {
  const { readFileSync } = await import('fs');
  const sql = readFileSync(migrationPath, 'utf-8');
  const indexCount = (sql.match(/CREATE INDEX IF NOT EXISTS/gi) || []).length;
  const tables = new Set(
    (sql.match(/ON\s+(\w+)\s*\(/gi) || []).map(m => {
      const match = m.match(/ON\s+(\w+)/i);
      return match ? match[1] : '';
    })
  );

  console.log(`  Indexes defined:  ${indexCount}`);
  console.log(`  Tables covered:   ${[...tables].join(', ')}`);
  console.log(`  Uses IF NOT EXISTS: ${indexCount === (sql.match(/CREATE INDEX/gi) || []).length ? '✅ Yes' : '❌ No'}`);
  
  if (indexCount >= 20) {
    console.log(`\n  ✅ Migration looks good (${indexCount} indexes across ${tables.size} tables)\n`);
    dbResult.passed = true;
  } else {
    console.log(`\n  ⚠️  Only ${indexCount} indexes found (expected ≥ 20)\n`);
  }
}

// ─── Final Summary ──────────────────────────────────────────────────
console.log(`\n╔${SEP}╗`);
console.log(`║                  FINAL RESULTS SUMMARY                         ║`);
console.log(`╠${SEP}╣`);
console.log(`║                                                                 ║`);
console.log(`║  Mobile Tests:  ${mobileResult.passed ? '✅ PASSED' : '❌ FAILED '}                                      ║`);
console.log(`║  Web Tests:     ${webResult.passed ? '✅ PASSED' : '❌ FAILED '}                                      ║`);
console.log(`║  DB Migration:  ${dbResult.passed ? '✅ PASSED' : '❌ FAILED '}                                      ║`);
console.log(`║                                                                 ║`);

const allPassed = mobileResult.passed && webResult.passed && dbResult.passed;
if (allPassed) {
  console.log(`║  🎉 All optimization checks passed!                            ║`);
} else {
  console.log(`║  ⚠️  Some checks need attention — review output above          ║`);
}
console.log(`║                                                                 ║`);
console.log(`╚${SEP}╝\n`);

process.exit(allPassed ? 0 : 1);
