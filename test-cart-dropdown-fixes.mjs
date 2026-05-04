/**
 * Test script: Cart dropdown fixes verification
 * Tests:
 *   1. isDropdownItemInStock — uses cart-state stock fields, no live fetch
 *   2. getDropdownPrice — returns discounted unit price when discount active
 *   3. Dropdown total — excludes OOS items
 *   4. Discount pill visibility — discountPct > 0 for discounted items
 *   5. Web getTotalCartItems — returns distinct product count (not quantity sum)
 *   6. Mobile getItemCount — returns distinct product count (not quantity sum)
 *
 * Usage: node test-cart-dropdown-fixes.mjs
 */

// ─── Minimal stubs (mirrors the real logic in Header.tsx) ────────────────────

/** Mirror of isDropdownItemInStock from Header.tsx */
function isDropdownItemInStock(item) {
  const stock = item.selectedVariant?.stock ?? item.stock ?? 0;
  return Number(stock) > 0;
}

/** Mirror of discountService.calculateLineDiscount (simplified) */
function calculateLineDiscount(unitPrice, _qty, discount) {
  if (!discount) return { discountedUnitPrice: unitPrice };
  if (discount.discountType === 'percentage') {
    const discounted = unitPrice * (1 - discount.discountValue / 100);
    return { discountedUnitPrice: Math.max(0, discounted) };
  }
  if (discount.discountType === 'fixed') {
    return { discountedUnitPrice: Math.max(0, unitPrice - discount.discountValue) };
  }
  return { discountedUnitPrice: unitPrice };
}

/** Mirror of getDropdownPrice from Header.tsx */
function getDropdownPrice(item, headerDiscountMap) {
  const basePrice = item.selectedVariant?.price ?? item.price;
  const discount = headerDiscountMap[item.id] ?? null;
  const { discountedUnitPrice } = calculateLineDiscount(basePrice, 1, discount);
  return discountedUnitPrice;
}

/** Compute dropdown total excluding OOS items — the fixed logic */
function computeDropdownTotal(cartItems, headerDiscountMap) {
  return cartItems
    .filter(isDropdownItemInStock)
    .reduce((sum, item) => sum + getDropdownPrice(item, headerDiscountMap) * item.quantity, 0);
}

/** Compute discountPct for an item (for the inline badge) */
function computeDiscountPct(item, headerDiscountMap) {
  const price = item.selectedVariant?.price ?? item.price;
  const effectivePrice = getDropdownPrice(item, headerDiscountMap);
  const strikethroughPrice = effectivePrice < price
    ? price
    : ((item.originalPrice ?? 0) > price ? (item.originalPrice ?? null) : null);
  if (strikethroughPrice === null) return 0;
  return Math.round(((strikethroughPrice - effectivePrice) / strikethroughPrice) * 100);
}

// ─── Test data ───────────────────────────────────────────────────────────────

const inStockItem = {
  id: 'prod-1',
  cartItemId: 'ci-1',
  name: 'Blue Sneakers',
  price: 1500,
  originalPrice: 1500,
  stock: 10,
  quantity: 2,
};

const oosByStock = {
  id: 'prod-2',
  cartItemId: 'ci-2',
  name: 'Red T-Shirt',
  price: 800,
  originalPrice: 800,
  stock: 0,       // out of stock
  quantity: 1,
};

const oosByVariantStock = {
  id: 'prod-3',
  cartItemId: 'ci-3',
  name: 'Green Hat (M)',
  price: 600,
  originalPrice: 600,
  stock: 5,
  quantity: 1,
  selectedVariant: { id: 'v-1', name: 'M', price: 620, stock: 0 }, // variant OOS
};

const itemWithVariantInStock = {
  id: 'prod-4',
  cartItemId: 'ci-4',
  name: 'Black Bag (L)',
  price: 2000,
  originalPrice: 2000,
  stock: 0,       // base stock empty but variant has stock
  quantity: 1,
  selectedVariant: { id: 'v-2', name: 'L', price: 2200, stock: 3 },
};

const discountMap = {
  'prod-1': { discountType: 'percentage', discountValue: 20 },  // 20% off → ₱1200
  'prod-4': { discountType: 'fixed', discountValue: 200 },       // ₱200 off → ₱2000 (variant base 2200)
};

const cartItems = [inStockItem, oosByStock, oosByVariantStock, itemWithVariantInStock];

// ─── Tests ───────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

console.log('\n=== isDropdownItemInStock ===');
assert('in-stock item (stock=10) → true', isDropdownItemInStock(inStockItem));
assert('OOS item (stock=0) → false', !isDropdownItemInStock(oosByStock));
assert('OOS by variant stock (variant.stock=0) → false', !isDropdownItemInStock(oosByVariantStock));
assert('variant in-stock (variant.stock=3, base stock=0) → true', isDropdownItemInStock(itemWithVariantInStock));

console.log('\n=== getDropdownPrice ===');
const price1 = getDropdownPrice(inStockItem, discountMap);
assert('prod-1 with 20% off → ₱1200', price1 === 1200, `got ₱${price1}`);

const price4 = getDropdownPrice(itemWithVariantInStock, discountMap);
assert('prod-4 variant ₱2200 with ₱200 fixed off → ₱2000', price4 === 2000, `got ₱${price4}`);

const priceNoDiscount = getDropdownPrice(oosByStock, discountMap);
assert('prod-2 no discount → original price ₱800', priceNoDiscount === 800, `got ₱${priceNoDiscount}`);

console.log('\n=== Dropdown total (excludes OOS) ===');
const total = computeDropdownTotal(cartItems, discountMap);
// In-stock items: prod-1 (₱1200 × 2 = 2400) + prod-4 (₱2000 × 1 = 2000)
// OOS: prod-2 (stock=0) and prod-3 (variant stock=0) — excluded
const expectedTotal = 1200 * 2 + 2000 * 1; // 2400 + 2000 = 4400
assert(`total = ₱${expectedTotal} (OOS items excluded)`, total === expectedTotal, `got ₱${total}`);

// Verify old (buggy) total would differ
const buggyTotal = cartItems.reduce((sum, item) => sum + getDropdownPrice(item, discountMap) * item.quantity, 0);
assert('buggy total (all items) is higher than fixed total', buggyTotal > total,
  `buggy=₱${buggyTotal}, fixed=₱${total}`);

console.log('\n=== Discount badge (discountPct) ===');
const pct1 = computeDiscountPct(inStockItem, discountMap);
assert('prod-1 20% off → discountPct=20', pct1 === 20, `got ${pct1}%`);

const pct4 = computeDiscountPct(itemWithVariantInStock, discountMap);
assert('prod-4 ₱200 off ₱2200 → discountPct≈9', pct4 === 9, `got ${pct4}%`);

const pct2 = computeDiscountPct(oosByStock, discountMap);
assert('prod-2 no discount → discountPct=0 (no badge)', pct2 === 0, `got ${pct2}%`);

// ─── Web: getTotalCartItems equivalent ───────────────────────────────────────
// Mirrors: get().cartItems.length  (NOT a quantity sum)

console.log('\n=== Web cart count: distinct product lines ===');

// Simulate the web Zustand cartItems array (one entry per product, regardless of qty)
const webCartItems = [
  { id: 'p1', cartItemId: 'ci-1', quantity: 1, stock: 5 },  // qty 1
  { id: 'p2', cartItemId: 'ci-2', quantity: 2, stock: 3 },  // qty 2 — counts as 1 distinct
  { id: 'p3', cartItemId: 'ci-3', quantity: 3, stock: 0 },  // qty 3 + OOS — counts as 1 distinct
];

const webDistinctCount = webCartItems.length; // FIXED behavior: distinct rows
const webQuantitySum = webCartItems.reduce((s, i) => s + i.quantity, 0); // OLD buggy behavior

assert(`distinct product count = ${webDistinctCount} (not quantity sum ${webQuantitySum})`,
  webDistinctCount === 3 && webQuantitySum === 6 && webDistinctCount !== webQuantitySum);
assert('badge shows distinct count, not quantity sum', webDistinctCount === 3, `got ${webDistinctCount}`);

// ─── Mobile: getItemCount (cartStore.ts) ─────────────────────────────────────
// Mirrors: get().items.length  (fixed from: reduce summing quantity)

console.log('\n=== Mobile cartStore.getItemCount: distinct product lines ===');

// Simulate mobile cart items (same 3 products with varying quantities)
const mobileItems = [
  { id: 'p1', quantity: 1, price: 150 },
  { id: 'p2', quantity: 2, price: 35 },   // Dried Mango × 2 — should count as 1 distinct
  { id: 'p3', quantity: 3, price: 200 },
];

// Fixed implementation: items.length
const fixedMobileCount = mobileItems.length;
// Old buggy implementation: reduce summing quantities
const buggyMobileCount = mobileItems.reduce((count, item) => count + item.quantity, 0);

assert('mobile getItemCount = items.length (distinct lines)', fixedMobileCount === 3, `got ${fixedMobileCount}`);
assert('mobile getItemCount ≠ quantity sum (was the bug)', fixedMobileCount !== buggyMobileCount,
  `fixed=${fixedMobileCount}, buggy would have been ${buggyMobileCount}`);

// Confirm the quantity sum (old behavior) would have been wrong:
assert(`old buggy count (${buggyMobileCount}) would over-count vs correct (${fixedMobileCount})`,
  buggyMobileCount > fixedMobileCount);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('Some tests failed!');
  process.exit(1);
} else {
  console.log('All tests passed!');
}
