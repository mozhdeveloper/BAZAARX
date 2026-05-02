# PayMongo Payment Method Fix & COD Payment Due Date Enhancement

This PR fixes a critical payment method display bug where PayMongo orders were incorrectly showing "Cash on Delivery" in the Order Details screen, and enhances the COD payment instruction messaging with calculated payment due dates.

---

## 🛠️ Changes by Area

### 1. PayMongo Payment Method Display Fix
- **Root Cause**: The `orderService.getOrders()` method was not fetching from the `order_payments` table where the actual payment method is stored (moved from orders table in previous migration).
- **Solution**: 
  - Updated Supabase SELECT query to include `order_payments(payment_method, status)` join
  - Implemented safe extraction of payment_method from JSONB: `order_payments[0]?.payment_method?.type`
  - Applied same fix to `getSellerOrders()` for consistency
  - Added comprehensive `__DEV__` logging for debugging payment method data flow
- **Behavior**: Orders now correctly display "PayMongo", "GCash", etc. instead of defaulting to "Cash on Delivery"

### 2. COD Payment Instruction Message Enhancement
- **Mobile (OrderDetailScreen.tsx)**:
  - Removed fallback message: "Delivery date will be updated when J&T booking is confirmed"
  - Added intelligent date calculation: If estimated delivery exists, use it; otherwise calculate 5 business days from order creation date
  - Shows "Estimated Payment Due: [Calculated Date]"
  - Message hidden for terminal statuses: `received`, `returned`, `reviewed`, `cancelled`

- **Web (OrderDetailPage.tsx)**:
  - Applied identical logic for consistency across platforms
  - Calculates estimated payment due date from order creation + 5 days when delivery date unavailable
  - Same terminal status checks to prevent showing message on completed/cancelled orders

### 3. Enhanced Logging & Debugging
- Added detailed console logging (with `__DEV__` flag) in:
  - `checkoutService.ts`: Logs payment_method creation with order_payments record
  - `orderService.ts`: Logs payment_method extraction and data flow
  - `CheckoutScreen.tsx`: Logs order object creation with payment method details
  - Helps future debugging of payment-related issues

---

## 📄 Files Changed Summary

### Mobile (`mobile-app/`)

| File | Type | Description |
|---|---|---|
| `src/services/checkoutService.ts` | Modified | Added logging when creating order_payments with payment_method |
| `src/services/orderService.ts` | Modified | Added order_payments fetch to SELECT query; fixed payment_method extraction with JSONB handling; added detailed logging |
| `app/CheckoutScreen.tsx` | Modified | Enhanced console logging for order creation and payment method tracking |
| `app/OrderDetailScreen.tsx` | Modified | Enhanced COD payment message with calculated payment due date (5 days from order creation); removed fallback message |

### Web (`web/`)

| File | Type | Description |
|---|---|---|
| `src/pages/OrderDetailPage.tsx` | Modified | Enhanced COD payment message to calculate estimated payment due date; consistent with mobile behavior |

---

## ✅ Testing Done

- [x] **Payment Method Display**: Verified PayMongo orders now show correct payment method instead of "Cash on Delivery"
- [x] **Database Fetching**: Confirmed order_payments table is properly joined and payment_method data is extracted
- [x] **COD Message**: Verified message shows calculated payment due date based on order creation date
- [x] **Terminal Statuses**: Confirmed COD message doesn't show when order is received, returned, reviewed, or cancelled
- [x] **Mobile Logging**: Verified `__DEV__` console logs display payment method extraction details
- [x] **Cross-Platform Consistency**: Confirmed mobile and web have identical COD payment message behavior

---

## 💡 Notes for Reviewer

### Payment Method Fix
- The payment_method JSONB is stored as `{type: 'paymongo'}` in the database
- The fix safely accesses this nested structure with optional chaining
- Comprehensive logging helps diagnose any payment method related issues in the future

### Payment Due Date Logic
- **Calculation**: If estimatedDelivery exists → use it; Otherwise → order creation date + 5 business days
- **Terminal Statuses**: Message intentionally hidden for `received`, `returned`, `reviewed`, `cancelled` to keep completed orders clean
- **Edge Cases**: Works even if estimated delivery is null, providing sensible default to customers

### Backward Compatibility
- All changes are backward compatible with existing orders
- No database migrations required; only uses existing order_payments table
- Logging is non-blocking and won't affect performance
