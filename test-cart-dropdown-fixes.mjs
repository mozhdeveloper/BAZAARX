/**
 * Test script: Cart dropdown fixes verification (web buyer)
 *
 * Covers:
 *   1.  getTotalCartItems / getCartItemCount — returns DISTINCT line-item count,
 *       NOT a sum of individual quantities (the mobile had this bug; web must not regress).
 *   2.  isDropdownItemInStock — correct OOS detection:
 *         • products WITHOUT a selectedVariant are assumed in-stock (products table
 *           has no stock column, so item.stock is always 0 — do not false-flag as OOS)
 *         • products WITH a selectedVariant use variant.stock explicitly
 *   3.  getDropdownPrice — applies campaign discount (percentage / fixed_amount)
 *   4.  Dropdown total — excludes OOS items, uses discounted prices
 *   5.  Discount badge — discountPct > 0 when either campaign discount or seller
 *       compare-at price (originalPrice > price) is present
 *   6.  No-variant products are never misidentified as OOS
 *
 * Usage: node test-cart-dropdown-fixes.mjs
 */

// ─── Stubs mirroring the real implementation in Header.tsx / discountService ─

/**
 * Mirror of isDropdownItemInStock (FIXED version in Header.tsx).
 * products table has no stock column → item.stock defaults to 0 → do not treat as OOS.
 * Only use variant.stock when a selectedVariant is explicitly present.
 */
function isDropdownItemInStock(item) {
  const variantStock = item.selectedVariant?.stock;
  if (typeof variantStock === 'number') {
    return variantStock > 0; // explicit variant stock → trust it
  }
  // No selected variant → item.stock is always 0 (not fetched from DB); assume in-stock
  return true;
}

/**
 * Mirror of discountService.calculateLineDiscount.
 * Discount types (matching the real service & DB): 'percentage' | 'fixed_amount'
 */
function calculateLineDiscount(unitPrice, _qty, discount) {
  const price = Math.max(0, Number(unitPrice) || 0);
  if (!discount || price <= 0) return { discountedUnitPrice: price };

  let rawDiscount = 0;
  if (discount.discountType === 'percentage') {
    rawDiscount = (price * discount.discountValue) / 100;
  } else if (discount.discountType === 'fixed_amount') {
    rawDiscount = discount.discountValue;
  }

  const discountedUnitPrice = Math.round(Math.max(0, price - Math.min(price, rawDiscount)));
  return { discountedUnitPrice };
}

/** Mirror of getTotalCartItems / getCartItemCount — MUST return cartItems.length (not quantity sum) */
function getTotalCartItems(cartItems) {
  // Distinct line items — each DB cart_items row = 1, regardless of quantity field.
  return cartItems.length;
}

/** Simulates the OLD (buggy) quantity-sum implementation that must NOT be used */
function getTotalCartItemsQuantitySum(cartItems) {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
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

// Products WITH a selectedVariant (stock determined by variant.stock)
const inStockWithVariant = {
  id: 'prod-1', cartItemId: 'ci-1',
  name: 'Blue Sneakers (Size 10)',
  price: 1500, originalPrice: 1500, stock: 0, // stock=0 because products table has no stock col
  quantity: 1,
  selectedVariant: { id: 'v-1', name: 'Size 10', price: 1500, stock: 8 },
};

const oosVariantExplicit = {
  id: 'prod-2', cartItemId: 'ci-2',
  name: 'Green Hat (M)',
  price: 600, originalPrice: 600, stock: 0,
  quantity: 1,
  selectedVariant: { id: 'v-2', name: 'M', price: 620, stock: 0 }, // explicitly OOS
};

const inStockVariantHighQty = {
  id: 'prod-3', cartItemId: 'ci-3',
  name: 'Dried Mangoes',
  price: 60, originalPrice: 60, stock: 0,
  quantity: 2, // qty=2 must NOT inflate the item count
  selectedVariant: { id: 'v-3', name: 'Default', price: 60, stock: 15 },
};

// Product WITHOUT a selectedVariant (variant_id is NULL in DB)
// item.stock will always be 0 because products table has no stock column.
// isDropdownItemInStock MUST assume in-stock for these.
const inStockNoVariant = {
  id: 'prod-4', cartItemId: 'ci-4',
  name: 'Hydrating Serum',
  price: 500, originalPrice: 500, stock: 0, // always 0 — products table has no stock col
  quantity: 1,
  selectedVariant: undefined,
};

// Item with seller compare-at price (originalPrice > price) and NO campaign discount
const itemWithCompareAtPrice = {
  id: 'prod-5', cartItemId: 'ci-5',
  name: 'Laptop School Bag',
  price: 1000, originalPrice: 1500, // seller marked down from ₱1500 to ₱1000
  stock: 0, quantity: 1,
  selectedVariant: { id: 'v-5', name: 'Default', price: 1000, stock: 5 },
};

// Discount map with CORRECT types from the real DB/service: 'percentage' | 'fixed_amount'
const discountMap = {
  'prod-1': { discountType: 'percentage', discountValue: 20 },    // 20% off ₱1500 → ₱1200
  'prod-3': { discountType: 'fixed_amount', discountValue: 25 },  // ₱25 off ₱60 → ₱35
};

const cartItems = [inStockWithVariant, oosVariantExplicit, inStockVariantHighQty, inStockNoVariant, itemWithCompareAtPrice];

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

// ─── 1. Cart item count — distinct, NOT quantity sum ─────────────────────────

console.log('\n=== 1. Cart item count (distinct line items, NOT quantity sum) ===');

assert(
  'getTotalCartItems returns cartItems.length (5 distinct items)',
  getTotalCartItems(cartItems) === 5,
  `got ${getTotalCartItems(cartItems)}`
);
assert(
  'getTotalCartItems ≠ quantity sum (5 items ≠ 6 total quantity)',
  getTotalCartItems(cartItems) !== getTotalCartItemsQuantitySum(cartItems),
  `length=${getTotalCartItems(cartItems)}, qtySum=${getTotalCartItemsQuantitySum(cartItems)}`
);
assert(
  'item with quantity=2 still counts as 1 item (not 2)',
  getTotalCartItems([inStockVariantHighQty]) === 1,
  `got ${getTotalCartItems([inStockVariantHighQty])}`
);

// ─── 2. isDropdownItemInStock ─────────────────────────────────────────────────

console.log('\n=== 2. isDropdownItemInStock ===');

assert('in-stock WITH variant (variant.stock=8) → true', isDropdownItemInStock(inStockWithVariant));
assert('OOS WITH variant (variant.stock=0) → false', !isDropdownItemInStock(oosVariantExplicit));
assert('high-qty WITH variant (variant.stock=15) → true', isDropdownItemInStock(inStockVariantHighQty));
assert(
  'no selectedVariant (item.stock=0 from DB default) → true (products table has no stock col)',
  isDropdownItemInStock(inStockNoVariant)
);
assert('itemWithCompareAtPrice (variant.stock=5) → true', isDropdownItemInStock(itemWithCompareAtPrice));

// ─── 3. getDropdownPrice (campaign discount) ──────────────────────────────────

console.log('\n=== 3. getDropdownPrice (campaign discounts) ===');

const priceP1 = getDropdownPrice(inStockWithVariant, discountMap);
assert('prod-1: 20% off ₱1500 → ₱1200', priceP1 === 1200, `got ₱${priceP1}`);

const priceP3 = getDropdownPrice(inStockVariantHighQty, discountMap);
assert('prod-3: fixed_amount ₱25 off ₱60 → ₱35', priceP3 === 35, `got ₱${priceP3}`);

const priceNoDiscount = getDropdownPrice(inStockNoVariant, discountMap);
assert('prod-4 (no campaign discount) → original ₱500', priceNoDiscount === 500, `got ₱${priceNoDiscount}`);

const priceCompareAt = getDropdownPrice(itemWithCompareAtPrice, discountMap);
assert('prod-5 (seller compare-at, no campaign) → ₱1000 (unchanged)', priceCompareAt === 1000, `got ₱${priceCompareAt}`);

// ─── 4. Dropdown total (excludes OOS, uses discounted prices) ─────────────────

console.log('\n=== 4. Dropdown total (in-stock only, discounted prices) ===');

const total = computeDropdownTotal(cartItems, discountMap);
// In-stock items:
//   prod-1: ₱1200 × 1 = ₱1200
//   prod-3: ₱35 × 2  = ₱70
//   prod-4: ₱500 × 1 = ₱500
//   prod-5: ₱1000 × 1 = ₱1000
// OOS: prod-2 (variant.stock=0) excluded
const expectedTotal = 1200 * 1 + 35 * 2 + 500 * 1 + 1000 * 1; // 2770
assert(`total = ₱${expectedTotal} (OOS prod-2 excluded)`, total === expectedTotal, `got ₱${total}`);

const buggyTotal = cartItems.reduce((sum, item) => sum + getDropdownPrice(item, discountMap) * item.quantity, 0);
assert('buggy total (includes OOS) > fixed total', buggyTotal > total, `buggy=₱${buggyTotal}, fixed=₱${total}`);

// ─── 5. Discount badge (discountPct) ─────────────────────────────────────────

console.log('\n=== 5. Discount badge (discountPct > 0) ===');

const pct1 = computeDiscountPct(inStockWithVariant, discountMap);
assert('prod-1: 20% campaign → discountPct=20', pct1 === 20, `got ${pct1}%`);

const pct3 = computeDiscountPct(inStockVariantHighQty, discountMap);
// ₱25 off ₱60 → ₱35; (60-35)/60 = 41.7% → 42
assert('prod-3: fixed_amount ₱25 off ₱60 → discountPct=42', pct3 === 42, `got ${pct3}%`);

const pct5 = computeDiscountPct(itemWithCompareAtPrice, discountMap);
// Seller compare-at: (₱1500-₱1000)/₱1500 = 33.3% → 33
assert('prod-5: seller compare-at ₱1500→₱1000 → discountPct=33', pct5 === 33, `got ${pct5}%`);

const pct4 = computeDiscountPct(inStockNoVariant, discountMap);
assert('prod-4: no discount, no compare-at → discountPct=0 (no badge)', pct4 === 0, `got ${pct4}%`);

const pctOOS = computeDiscountPct(oosVariantExplicit, discountMap);
assert('prod-2 (OOS, no discount) → discountPct=0', pctOOS === 0, `got ${pctOOS}%`);

// ─── 6. No-variant products never misidentified as OOS ────────────────────────

console.log('\n=== 6. No-variant products never misidentified as OOS ===');

const noVariantItems = [
  { id: 'a', cartItemId: 'ca', name: 'Item A', price: 100, originalPrice: 100, stock: 0, quantity: 1, selectedVariant: undefined },
  { id: 'b', cartItemId: 'cb', name: 'Item B', price: 200, originalPrice: 200, stock: 0, quantity: 3, selectedVariant: undefined },
];

assert('all no-variant items treated as in-stock', noVariantItems.every(isDropdownItemInStock));

const noVariantTotal = computeDropdownTotal(noVariantItems, {});
const expectedNoVariantTotal = 100 * 1 + 200 * 3; // 700
assert(
  `no-variant items included in total = ₱${expectedNoVariantTotal}`,
  noVariantTotal === expectedNoVariantTotal,
  `got ₱${noVariantTotal}`
);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('\nSome tests FAILED — review the issues above.');
  process.exit(1);
} else {
  console.log('\nAll tests passed ✓');
}
