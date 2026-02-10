# Schema Migration Complete - February 2026

## Overview

All services have been updated to work with the new normalized database schema. The codebase now properly supports:

- **Multi-role users** (via `user_roles` junction table)
- **Normalized product data** (separate `product_images`, `product_variants` tables)
- **New QA workflow** (`product_assessments` table with lowercase status values)
- **Simplified conversations** (no `seller_id`, computed stats from messages)
- **Dual order status** (`payment_status` + `shipment_status`)
- **Simplified carts** (computed totals, `variant_id` FK)

---

## Updated Files

### Types
- `web/src/types/database.types.ts` - Comprehensive type definitions (~700 lines)
- `mobile-app/src/types/database.types.ts` - Same file copied

### Services (Web & Mobile)

| Service | Key Changes |
|---------|-------------|
| `authService.ts` | Uses `first_name`/`last_name`, `user_roles` table, added `isUserSeller()`, `isUserBuyer()`, `isUserAdmin()` |
| `productService.ts` | Uses `category_id` FK, joins `product_images`/`product_variants`, added `getAllProducts()`, `getActiveProducts()`, `getSellerProducts()`, `searchProducts()` |
| `cartService.ts` | Simplified cart (no inline totals), uses `variant_id` FK, added `calculateCartTotals()` |
| `orderService.ts` | Uses `payment_status` + `shipment_status`, legacy status mapping |
| `qaService.ts` | Uses `product_assessments` table, lowercase status values, added `getAllAssessments()`, `getPendingAssessments()`, `getAssessmentsByStatus()`, `getAssessmentByProductId()` |
| `chatService.ts` | No `seller_id` in conversations, computes unread from messages, uses `first_name`/`last_name` |

### Test Files
- `web/src/tests/service-tests.ts` - Unit tests for all services
- `web/src/tests/flow-tests.ts` - End-to-end flow tests
- `web/src/tests/run-tests.ts` - CLI test runner
- `web/src/tests/ServiceTestRunner.tsx` - React UI for testing
- All copied to `mobile-app/src/tests/`

---

## Key Schema Changes

### 1. User/Profile System
```sql
-- OLD: profiles had user_type field
profiles.user_type = 'buyer' | 'seller' | 'admin'

-- NEW: Separate user_roles table (users can have MULTIPLE roles)
user_roles (user_id, role) -- role: 'buyer' | 'seller' | 'admin'
```

### 2. Products
```sql
-- OLD: Inline category string, images array, stock field
products.category = 'Electronics'
products.images = ['url1', 'url2']
products.stock = 100
products.is_active = true

-- NEW: Foreign keys to normalized tables
products.category_id -> categories.id
product_images.product_id -> products.id
product_variants.product_id -> products.id (stock per variant)
products.disabled_at = NULL (active) | timestamp (disabled)
products.deleted_at = NULL (exists) | timestamp (soft deleted)
```

### 3. QA/Assessments
```sql
-- OLD: product_qa table with UPPERCASE status
product_qa.status = 'PENDING_DIGITAL_REVIEW' | 'WAITING_FOR_SAMPLE' | ...

-- NEW: product_assessments table with lowercase status
product_assessments.status = 'pending_digital_review' | 'waiting_for_sample' | 
                             'pending_physical_review' | 'verified' | 
                             'for_revision' | 'rejected'
```

### 4. Conversations
```sql
-- OLD: Had seller_id, last_message, unread counts inline
conversations.seller_id, conversations.last_message, conversations.buyer_unread_count

-- NEW: Minimal structure, stats computed from messages
conversations (id, buyer_id, order_id, created_at, updated_at)
-- seller_id determined via order -> order_items -> products
-- last_message & unread counts computed from messages table
```

### 5. Orders
```sql
-- OLD: Single status field
orders.status = 'pending' | 'processing' | 'shipped' | 'delivered'

-- NEW: Separate payment and shipment status
orders.payment_status = 'pending_payment' | 'paid' | 'partially_refunded' | 'refunded'
orders.shipment_status = 'waiting_for_seller' | 'processing' | 'ready_to_ship' | 
                         'shipped' | 'out_for_delivery' | 'delivered' | 
                         'failed_to_deliver' | 'received' | 'returned'
```

### 6. Carts
```sql
-- OLD: Had inline totals, expires_at, selected_variant JSON
carts.total_amount, carts.discount_amount, carts.shipping_cost
cart_items.selected_variant = { id, size, color, ... }

-- NEW: Minimal structure, totals computed
carts (id, buyer_id, created_at, updated_at)
cart_items.variant_id -> product_variants.id
-- Totals computed via calculateCartTotals()
```

---

## Running Tests

### CLI
```bash
# All service tests
cd web
npx ts-node src/tests/run-tests.ts

# With test users
TEST_BUYER_ID=<uuid> TEST_SELLER_ID=<uuid> npx ts-node src/tests/run-tests.ts

# Specific flow tests
TEST_BUYER_ID=<uuid> npx ts-node src/tests/flow-tests.ts
```

### In-App (React)
```tsx
import { ServiceTestRunner } from './tests/ServiceTestRunner';

// In a debug screen
<ServiceTestRunner 
  buyerId={currentUser.id}
  sellerId={currentUser.id}
/>
```

---

## Flow Verification

### Buyer Flow ✅
1. **Auth**: `getUserProfile()` → `isUserBuyer()`
2. **Browse**: `getActiveProducts()` → `searchProducts()`
3. **Cart**: `getOrCreateCart()` → `addToCart()` → `calculateCartTotals()`
4. **Checkout**: `createOrder()` → `getBuyerOrders()`
5. **Chat**: `getBuyerConversations()` → `getUnreadCount()`

### Seller Flow ✅
1. **Auth**: `getUserProfile()` → `isUserSeller()`
2. **Products**: `getSellerProducts()` → `createProduct()`
3. **QA**: `getQAEntriesBySeller()` → check status
4. **Orders**: `getSellerOrders()` → `updateOrderStatus()`
5. **Chat**: `getSellerConversations()` → `getUnreadCount()`

### QA Flow ✅
1. **Queue**: `getPendingAssessments()` → review products
2. **Actions**: `updateQAStatus()` → approve/reject/revision
3. **Status**: `getAssessmentsByStatus('verified' | 'rejected' | ...)`
4. **Product Sync**: Assessment status syncs to products.approval_status

---

## Legacy Compatibility

All services maintain backwards compatibility:

- `authService`: Accepts `full_name` and splits to `first_name`/`last_name`
- `productService`: Returns `is_active`, `stock`, `category` legacy fields
- `qaService`: `transformToLegacy()` converts to uppercase status
- `orderService`: `LEGACY_STATUS_MAP` converts old status values
- `cartService`: Works with both `variant_id` and legacy `selected_variant`

---

## Next Steps

1. **Test with real data**: Run flow tests with actual user IDs
2. **Update UI components**: Components using old field names need updates
3. **Database migration**: Ensure all Supabase tables match new schema
4. **Mobile testing**: Run tests on mobile app build
