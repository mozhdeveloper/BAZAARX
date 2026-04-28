# Integration Test Pattern — Live DB Verification

> Reference implementation: `web/src/tests/cart-bug-fixes.test.ts`

## What Kind of Test Is This?

This is a **plain-TypeScript integration test** that runs directly against the real Supabase database.

| Dimension | This pattern | Vitest unit tests |
|-----------|-------------|-------------------|
| Framework | None — raw `async/await` + `process.exit` | Vitest + happy-dom |
| Network | Real Supabase fetch calls | Blocked by happy-dom |
| Data | Live DB rows | Mocked / fixture |
| Runner | `npx tsx <file>` | `npx vitest run` |
| Purpose | Verify a bug fix worked end-to-end | Verify logic in isolation |

Use this pattern when you need to **prove a fix works against real data** — schema validations, FK constraints, RLS policies, and query shapes that can't be faked locally.

---

## When to Write One

Write a DB integration test when:

- You fixed a query that referenced a **wrong column** (e.g. `products.stock` that doesn't exist).
- You fixed a **multi-step DB operation** (e.g. merge two cart rows atomically).
- You need to confirm **RLS policies** allow/deny the right operations.
- You need a **regression guard** for a fix that touched a Supabase service function.

---

## File Structure

```
web/src/tests/
└── <feature>-<type>.test.ts    # e.g. cart-bug-fixes.test.ts
```

> Keep DB integration tests in `web/src/tests/` alongside Vitest tests but note that
> they **cannot** be run by Vitest — see [Running Tests](#running-tests) below.

---

## Template

Copy this skeleton and fill in your test functions:

```ts
/**
 * <Feature> Integration Tests
 *
 * <Brief description of what is being verified and why>
 *
 * Run: cd web && npx tsx src/tests/<filename>.test.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL  ?? '<your-project-url>';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '<your-anon-key>';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ────────────────────────────────────────────────────────────────

interface Result { name: string; passed: boolean; message: string; ms: number; }
const results: Result[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, message: 'OK', ms: Date.now() - t });
    console.log(`  ✅  ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, message: err.message, ms: Date.now() - t });
    console.error(`  ❌  ${name}: ${err.message}`);
  }
}

// ── Test functions ──────────────────────────────────────────────────────────

async function test_dbConnection() {
  const { error } = await supabase.from('<any_table>').select('id').limit(1);
  if (error) throw new Error(error.message);
}

async function test_yourScenario() {
  // 1. Set up data (insert rows you need, remember to clean up)
  // 2. Execute the operation under test
  // 3. Assert expected DB state
  // 4. Clean up test data in a finally block
}

// ── Entry point ────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  <YOUR TEST SUITE NAME>');
  console.log('══════════════════════════════════════════════════\n');

  await test('DB connection', test_dbConnection);
  await test('your scenario', test_yourScenario);

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════\n');

  if (failed > 0) {
    results.filter(r => !r.passed).forEach(r =>
      console.log(`  ❌ ${r.name}: ${r.message}`)
    );
    process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
```

---

## Running Tests

```bash
# From the repo root
cd web
npx tsx src/tests/cart-bug-fixes.test.ts
```

> **Why `npx tsx` and not `npx vitest run`?**
> Vitest runs in a `happy-dom` environment that blocks real network requests.
> Any `fetch()` to Supabase will be aborted. `tsx` runs the file in plain Node.js
> with real networking, which is exactly what integration tests need.

---

## Key Rules

### 1. Always clean up test data

Wrap mutation tests in `try/finally`:

```ts
async function test_myScenario() {
  const { data: row } = await supabase.from('cart_items').insert(...).select('id').single();
  try {
    // assertions
  } finally {
    await supabase.from('cart_items').delete().eq('id', row.id);
  }
}
```

### 2. Resolve dynamic IDs — never hardcode

FKs require existing rows. Use a resolver function:

```ts
let TEST_BUYER_ID = '';

async function resolveTestBuyerId() {
  const { data } = await supabase.from('buyers').select('id').limit(1).maybeSingle();
  if (data) TEST_BUYER_ID = data.id;
  else console.warn('No buyers found — tests requiring a buyer will be skipped.');
}
```

Then in `main()`:
```ts
await resolveTestBuyerId();
// run tests that depend on TEST_BUYER_ID
```

And guard each test that needs it:
```ts
async function test_myCartTest() {
  if (!TEST_BUYER_ID) {
    console.log('     No buyer — skipping.');
    return;
  }
  // ...
}
```

### 3. Test the query shape, not just the result

For query-correctness bugs (wrong column names, missing joins), explicitly assert
that the query **succeeds** and returns the expected structure:

```ts
async function test_queryShape() {
  const { data, error } = await supabase
    .from('cart_items')
    .select(`
      id, quantity, variant_id,
      product:products ( id, approval_status ),
      variant:product_variants ( id, stock )
    `)
    .limit(1);

  if (error) throw new Error(`Query failed: ${error.message}`);
  // If we get here, the column names are valid
}
```

### 4. Verify both the positive and the cleanup

For merge/delete operations, assert that:
- The merged record has the correct final value.
- The deleted record is gone (`maybeSingle()` returns `null`).

```ts
const { data: gone } = await supabase.from('cart_items').select('id').eq('id', deletedId).maybeSingle();
if (gone) throw new Error('Row still exists after delete — operation failed');

const { data: merged } = await supabase.from('cart_items').select('quantity').eq('id', survivingId).single();
if (merged.quantity !== expectedQty) throw new Error(`Expected ${expectedQty}, got ${merged.quantity}`);
```

---

## Real Example — Bug #3 (wrong column reference)

The bug: `cartService.validateCheckoutItems` selected `stock` from `products`, but
that column doesn't exist — all stock is on `product_variants`.

The test proves the fixed query shape is valid:

```ts
async function bug3_nonVariantProductStockResolution() {
  // 1. Confirm the corrected query shape doesn't throw a DB error
  const { data: items, error } = await supabase
    .from('cart_items')
    .select(`
      id, quantity, variant_id,
      product:products ( id, approval_status, disabled_at, deleted_at, seller_id ),
      variant:product_variants ( id, stock )
    `)
    .limit(5);

  if (error) throw new Error(`Fixed query shape failed: ${error.message}`);
  console.log(`     Fixed validateCheckoutItems query shape (no products.stock) — valid ✓`);

  // 2. Simulate the batch-fetch fallback for null-variant items
  const nullVariantProductIds = [
    ...new Set(
      (items || [])
        .filter(i => !(i as any).variant_id)
        .map(i => (i.product as any)?.id)
        .filter(Boolean)
    ),
  ];

  if (nullVariantProductIds.length > 0) {
    const { data: variantRows, error: ve } = await supabase
      .from('product_variants')
      .select('product_id, stock')
      .in('product_id', nullVariantProductIds);

    if (ve) throw new Error(`Batch-fetch variant stock failed: ${ve.message}`);

    const totalStock = (variantRows || []).reduce((s, v) => s + (v.stock ?? 0), 0);
    console.log(`     product … — null-variant summed stock=${totalStock} ✓`);
  }
}
```

---

## Checklist Before Committing a DB Integration Test

- [ ] Test file is in `web/src/tests/` with `.test.ts` suffix
- [ ] File has a top-of-file comment with the run command
- [ ] `main()` is called at the bottom with `.catch`
- [ ] All inserted rows are cleaned up in `finally` blocks
- [ ] No hardcoded UUIDs that don't exist in the DB — use resolvers
- [ ] `process.exit(1)` on any failure (so CI can detect failures)
- [ ] Tested locally with `npx tsx` and all tests pass before pushing
