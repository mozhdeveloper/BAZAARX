# Implementation Plan: Checkout Total Price Accuracy Fix

## Context

A QA review identified critical bugs in the checkout total price calculation that cause discrepancies between:
1. The price displayed to the user during checkout
2. The price sent to the backend checkout service
3. The final order total stored in the database

---

## Current State Analysis

### Files Involved

| File | Purpose | Issues |
|------|---------|--------|
| `web/src/pages/CheckoutPage.tsx` | Checkout UI & pricing display | Tax not included in total, wrong tax base |
| `web/src/pages/OrderDetailPage.tsx` | Order detail display | Tax always 0 (not recalculated) |
| `web/src/pages/DeliveryTrackingPage.tsx` | Track order & view receipt | computedTotal missing all discounts/shipping/tax, hardcoded delivery fee |
| `web/src/services/checkoutService.ts` | Backend checkout processing | Correct pricing logic but frontend sends mismatched data |
| `web/src/services/discountService.ts` | Discount calculations | Working correctly |

### Pricing Calculation Comparison

| Aspect | CheckoutPage (Frontend) | OrderDetailPage (Display) | checkoutService (Backend) |
|--------|------------------------|--------------------------|--------------------------|
| **Tax Base** | `subtotalAfterCampaign` (after campaign discount only) | ❌ Always 0 (fallback) | `subtotalBeforeDiscount` (original subtotal) |
| **Tax Formula** | `Math.round((subtotal / 1.12) * 0.12)` | ❌ `order.pricing?.tax ?? 0` | `Math.round(subtotal * 0.12)` |
| **Discount Order** | Campaign → Voucher → Bazcoins → Shipping | Campaign → Voucher → Bazcoins → Shipping | Campaign → Voucher → Bazcoins → Shipping |
| **Tax in Total** | ❌ NOT included in `finalTotal` | ❌ NOT included (tax = 0) | ✅ Included in pricing summary |

### Frontend Calculation (CheckoutPage.tsx)

```typescript
// Line 331-342: Original subtotal and campaign discount
const originalSubtotal = checkoutItems.reduce((sum, item) => {
  return sum + (getOriginalUnitPrice(item) * item.quantity);
}, 0);
const campaignDiscountTotal = checkoutItems.reduce((sum, item) => {
  const activeDiscount = activeCampaignDiscounts[item.id] || null;
  const unitPrice = getOriginalUnitPrice(item);
  const calculation = discountService.calculateLineDiscount(unitPrice, item.quantity, activeDiscount);
  return sum + calculation.discountTotal;
}, 0);
const subtotalAfterCampaign = Math.max(0, originalSubtotal - campaignDiscountTotal);

// Line 387-394: Tax (calculated but NOT added!) and Final Total
const tax = Math.round((subtotalAfterCampaign / 1.12) * 0.12);
const couponSavings = campaignDiscountTotal + discount + bazcoinDiscount;
const finalTotal = Math.max(0, originalSubtotal + shippingFee - couponSavings); // MISSING: + tax
```

### Backend Calculation (checkoutService.ts)

```typescript
// Line 207-217: Correct pricing summary
const campaignDiscountTotal = linePricing.reduce((sum, line) => sum + line.campaignDiscountTotal, 0);
const subtotalBeforeDiscount = linePricing.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0);
const taxAmount = Math.round(subtotalBeforeDiscount * 0.12);
const pricingSummary = {
  subtotal: subtotalBeforeDiscount,
  shipping: Number(payload.shippingFee || 0),
  tax: taxAmount,
  campaignDiscount: campaignDiscountTotal,
  voucherDiscount: Number(discount || 0),
  bazcoinDiscount: Math.max(0, Number(usedBazcoins || 0)),
  total: Number(payload.totalAmount || 0),
};
```

---

## Identified Bugs

### Bug #1: Tax Not Included in Displayed Total
**Severity:** Critical  
**Location:** `CheckoutPage.tsx:394`

The `tax` variable is calculated and displayed as a separate line item, but is never added to `finalTotal`.

```typescript
// Current (BUGGY)
const finalTotal = Math.max(0, originalSubtotal + shippingFee - couponSavings);

// Should be
const finalTotal = Math.max(0, originalSubtotal + shippingFee - couponSavings + tax);
```

### Bug #2: Tax Calculated on Wrong Base
**Severity:** Critical  
**Location:** `CheckoutPage.tsx:388`

Tax should be calculated on the original subtotal (before discounts) per Philippine VAT regulations, then discounts apply on top. Current code calculates tax after campaign discounts only.

```typescript
// Current (BUGGY) - Tax on subtotalAfterCampaign
const tax = Math.round((subtotalAfterCampaign / 1.12) * 0.12);

// Should be - Tax on originalSubtotal
const tax = Math.round(originalSubtotal * 0.12);
```

### Bug #3: OrderDetailPage Missing Tax Calculation
**Severity:** Critical  
**Location:** `OrderDetailPage.tsx:443`

The `taxAmount` falls back to 0 because `order.pricing` is never populated. The order notes store pricing summary as a JSON string, but it's not parsed.

```typescript
// Current (BUGGY)
const taxAmount = order.pricing?.tax ?? 0; // Always falls back to 0!

// Should be - Recalculate tax from original subtotal
const taxAmount = Math.round(subtotalAmount * 0.12);
```

### Bug #4: Display Discrepancy
**Severity:** High  
**Location:** `CheckoutPage.tsx:1370-1379`

The displayed "Total" label says "Tax (12% VAT Included)" but the total doesn't actually include tax. This is misleading to users.

### Bug #5: DeliveryTrackingPage computedTotal Missing Discounts
**Severity:** Critical  
**Location:** `DeliveryTrackingPage.tsx:113-116`

The `computedTotal` calculation only includes item prices without discounts, shipping, or tax. This affects order totals and receipts.

```typescript
// Current (BUGGY) - No discounts, no shipping, no tax
const computedTotal = items.reduce((sum: number, item: any) => {
  const itemPrice = (item.variant?.price || item.price || 0);
  return sum + (item.quantity * itemPrice);
}, 0);

// Should include: item prices - discounts + shipping + tax
```

### Bug #6: DeliveryTrackingPage Payment Summary Hardcoded Values
**Severity:** Critical  
**Location:** `DeliveryTrackingPage.tsx:1048-1063`

The payment summary section has hardcoded values that don't reflect actual order data.

```typescript
// Line 1050 - WRONG: Assumes order.total minus hardcoded 50
₱{Math.max(0, (order.total || 0) - 50)}

// Line 1055 - WRONG: Hardcoded delivery fee of 50
<span className="font-medium">₱50</span>

// Should calculate actual subtotal, shipping, tax, and discounts
```

---

## Implementation Steps

### Step 1: Fix Tax Calculation Base
**Files:** `web/src/pages/CheckoutPage.tsx`

Change tax calculation to use original subtotal as the base:

```typescript
// Line 388 - Change from:
const tax = Math.round((subtotalAfterCampaign / 1.12) * 0.12);

// To:
const tax = Math.round(originalSubtotal * 0.12);
```

### Step 2: Include Tax in Final Total
**Files:** `web/src/pages/CheckoutPage.tsx`

Add tax to the final total calculation:

```typescript
// Line 394 - Change from:
const finalTotal = Math.max(0, originalSubtotal + shippingFee - couponSavings);

// To:
const finalTotal = Math.max(0, originalSubtotal + shippingFee - couponSavings + tax);
```

### Step 3: Update Tax Display Label
**Files:** `web/src/pages/CheckoutPage.tsx`

Remove misleading "(12% VAT Included)" from the label since we're showing it as a separate line item:

```typescript
// Line 1370-1373 - Change from:
<div className="flex justify-between text-sm">
  <span className="text-gray-600">Tax (12% VAT Included)</span>
  <span className="text-gray-600 font-medium">₱{tax.toLocaleString()}</span>
</div>

// To:
<div className="flex justify-between text-sm">
  <span className="text-gray-600">Tax (12% VAT)</span>
  <span className="text-gray-600 font-medium">₱{tax.toLocaleString()}</span>
</div>
```

### Step 4: Verify Checkout Service Consistency
**Files:** `web/src/services/checkoutService.ts`

Verify that the checkout service correctly:
1. Calculates tax on original subtotal (already correct, see line 208)
2. Applies discounts after tax calculation
3. Stores correct totals in the database

Review these lines for consistency:
- Line 207-208: Tax calculation
- Line 257-268: Order items insertion
- Line 299-302: Payment record insertion

### Step 4.5: Fix OrderDetailPage Tax Calculation
**Files:** `web/src/pages/OrderDetailPage.tsx`

Recalculate tax in OrderDetailPage using the same formula as CheckoutPage (12% of original subtotal). This ensures consistency between checkout and order detail views.

```typescript
// Line 443 - Change from:
const taxAmount = order.pricing?.tax ?? 0;

// To:
const taxAmount = Math.round(subtotalAmount * 0.12);
```

**Why this approach:**
- ✅ Only 1 line changed
- ✅ Consistent with CheckoutPage fix
- ✅ Uses same tax formula (12% of original subtotal)
- ✅ Works for both stored orders and local orders
- ✅ No database changes needed

### Step 7: Fix DeliveryTrackingPage Pricing Calculations
**Files:** `web/src/pages/DeliveryTrackingPage.tsx`

Fix the computedTotal and payment summary to match the corrected pricing logic from CheckoutPage.

#### 7a. Fix computedTotal (Lines 113-116)
Recalculate total to include discounts, shipping, and tax:

```typescript
// Change from:
const computedTotal = items.reduce((sum: number, item: any) => {
  const itemPrice = (item.variant?.price || item.price || 0);
  return sum + (item.quantity * itemPrice);
}, 0);

// To: (Same formula as CheckoutPage)
const originalSubtotal = items.reduce((sum: number, item: any) => {
  const originalPrice = item.variant?.price || item.price || 0;
  const priceDiscount = (item.price_discount || 0);
  return sum + ((originalPrice - priceDiscount) * (item.quantity || 1));
}, 0);

const campaignDiscount = items.reduce((sum: number, item: any) => {
  return sum + ((item.price_discount || 0) * (item.quantity || 1));
}, 0);

const subtotalAfterDiscount = Math.max(0, originalSubtotal);
const tax = Math.round(originalSubtotal * 0.12);
const shippingFee = 100; // Default, can be enhanced to check for free shipping eligibility

const computedTotal = originalSubtotal + shippingFee - campaignDiscount + tax;
```

#### 7b. Fix Payment Summary (Lines 1048-1063)
Use actual calculated values instead of hardcoded ones:

```typescript
// Change from:
<div className="flex justify-between">
  <span className="text-gray-600">Subtotal</span>
  <span className="font-medium">
    ₱{Math.max(0, (order.total || 0) - 50).toLocaleString()}
  </span>
</div>
<div className="flex justify-between">
  <span className="text-gray-600">Delivery Fee</span>
  <span className="font-medium">₱50</span>
</div>

// To:
<div className="flex justify-between">
  <span className="text-gray-600">Subtotal</span>
  <span className="font-medium">
    ₱{originalSubtotal.toLocaleString()}
  </span>
</div>
<div className="flex justify-between">
  <span className="text-gray-600">Discount</span>
  <span className="font-medium text-green-600">
    -₱{campaignDiscount.toLocaleString()}
  </span>
</div>
<div className="flex justify-between">
  <span className="text-gray-600">Delivery Fee</span>
  <span className="font-medium">
    {shippingFee === 0 ? "Free" : `₱${shippingFee}`}
  </span>
</div>
<div className="flex justify-between">
  <span className="text-gray-600">Tax (12% VAT)</span>
  <span className="font-medium">₱{tax.toLocaleString()}</span>
</div>
```

### Step 8: Add Unit Tests
**Files:** `web/src/tests/checkout-pricing.test.ts` (new file)

Create unit tests covering:
- Single product × quantity
- Multiple products with different quantities
- Campaign discount scenarios
- Voucher discount scenarios (percentage and fixed)
- Bazcoin redemption
- Combined discounts (campaign + voucher + bazcoins)
- Free shipping eligibility
- Tax calculation accuracy
- Edge cases (zero quantity, max discounts, etc.)

### Step 9: Manual Testing Checklist
**Instructions for QA:**

1. **Single Product Checkout**
   - [ ] Add product priced ₱1,000 to cart
   - [ ] Proceed to checkout
   - [ ] Verify total shows: ₱1,000 + ₱100 shipping + ₱120 tax = ₱1,220

2. **Multiple Products**
   - [ ] Add Product A (₱500 × 2) and Product B (₱1,000 × 1)
   - [ ] Proceed to checkout
   - [ ] Verify total: ₱2,000 + ₱100 shipping + ₱240 tax = ₱2,340

3. **Campaign Discount**
   - [ ] Add product with 10% campaign discount
   - [ ] Verify discount applied: ₱900 - ₱90 campaign = ₱810 + ₱100 + ₱120 = ₱1,030

4. **Voucher Discount (Percentage)**
   - [ ] Apply 10% voucher
   - [ ] Verify: original ₱2,000 - ₱200 campaign - ₱200 voucher = ₱1,800 + ₱100 + ₱240 = ₱2,140

5. **Voucher Discount (Fixed)**
   - [ ] Apply ₱500 fixed voucher
   - [ ] Verify: original ₱2,000 - ₱500 = ₱1,500 + ₱100 + ₱240 = ₱1,840

6. **Bazcoin Redemption**
   - [ ] Apply 100 bazcoins (₱100 discount)
   - [ ] Verify: original - all discounts - bazcoins = correct total

7. **Free Shipping**
   - [ ] Add products totaling ≥₱1,000 from same seller
   - [ ] Verify shipping = ₱0

8. **Complete Order Flow**
   - [ ] Place order
   - [ ] Verify order detail page shows same total
   - [ ] Verify database record matches

9. **Delivery Tracking Page**
   - [ ] Go to track your order page
   - [ ] Verify payment summary shows correct subtotal (original prices × quantities)
   - [ ] Verify discounts are displayed correctly
   - [ ] Verify shipping fee is shown (or "Free" if eligible)
   - [ ] Verify tax (12% VAT) is shown
   - [ ] Verify total matches checkout total

10. **View Receipt**
    - [ ] Open receipt from delivery tracking page
    - [ ] Verify receipt shows correct subtotal, discount, shipping, tax, and total
    - [ ] Verify total matches what was paid

---

## Implementation Steps Summary

| Step | Description | Files Changed | Complexity |
|------|-------------|---------------|------------|
| Step 1 | Fix tax calculation base | `CheckoutPage.tsx` | 1 line |
| Step 2 | Include tax in final total | `CheckoutPage.tsx` | 1 line |
| Step 3 | Update tax display label | `CheckoutPage.tsx` | 1 line |
| Step 4 | Verify checkout service | `checkoutService.ts` | Review only |
| Step 4.5 | Fix OrderDetailPage tax | `OrderDetailPage.tsx` | 1 line |
| **Step 7** | **Fix DeliveryTrackingPage pricing** | **`DeliveryTrackingPage.tsx`** | **~20 lines** |
| Step 8 | Add unit tests | `checkout-pricing.test.ts` | New file |
| Step 9 | Manual testing | All | QA testing |

---

## Testing & Verification

### Unit Test Requirements
- Tax calculation accuracy (12% VAT)
- Discount application order
- Total calculation with all discount types
- Edge cases (max discounts, free shipping, zero items)

### Integration Test Requirements
- CheckoutPage ↔ checkoutService consistency
- Final order total matches checkout display
- Database record matches displayed total

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing checkout flow | High | Thorough testing of all scenarios |
| Tax rounding discrepancies | Medium | Use `Math.round()` consistently |
| Existing orders affected | Low | Fix is forward-looking only |

---

## Success Criteria

1. ✅ Tax is correctly calculated on original subtotal
2. ✅ Tax is included in displayed final total
3. ✅ Checkout total matches order detail page total
4. ✅ All discount combinations work correctly
5. ✅ No regression in existing checkout functionality
6. ✅ Delivery tracking page shows accurate pricing summary
7. ✅ Receipt displays correct subtotal, discounts, shipping, tax, and total
