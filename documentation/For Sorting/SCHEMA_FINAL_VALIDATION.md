# BAZAAR Database Schema Final Validation
## February 5, 2026

## ✅ Test Results: 92/92 PASSED

All comprehensive database tests pass successfully with the new normalized schema.

---

## Schema Overview

### Core Tables (Tested & Working)

| Table | Status | Key Columns |
|-------|--------|-------------|
| `profiles` | ✅ | `id`, `email`, `first_name`, `last_name`, `phone` |
| `user_roles` | ✅ | `id`, `user_id`, `role` (buyer/seller/admin) |
| `buyers` | ✅ | `id`, `avatar_url`, `preferences`, `bazcoins` |
| `sellers` | ✅ | `id`, `store_name`, `store_description`, `avatar_url`, `owner_name`, `approval_status` |
| `seller_business_profiles` | ✅ | `seller_id`, `business_type`, `business_registration_number`, `tax_id_number` |
| `seller_payout_accounts` | ✅ | `seller_id`, `bank_name`, `account_name`, `account_number` |
| `seller_verification_documents` | ✅ | `seller_id`, `business_permit_url`, `valid_id_url`, etc. |
| `admins` | ✅ | `id`, `permissions` |

### Product Tables (Tested & Working)

| Table | Status | Key Columns |
|-------|--------|-------------|
| `categories` | ✅ | `id`, `name`, `slug`, `parent_id`, `sort_order` |
| `products` | ✅ | `id`, `name`, `description`, `category_id`, `price`, `approval_status` |
| `product_images` | ✅ | `id`, `product_id`, `image_url`, `is_primary`, `sort_order` |
| `product_variants` | ✅ | `id`, `product_id`, `sku`, `size`, `color`, `price`, `stock` |

### QA Tables (Tested & Working)

| Table | Status | Key Columns |
|-------|--------|-------------|
| `product_assessments` | ✅ | `id`, `product_id`, `status`, `submitted_at` |
| `product_approvals` | ✅ | `id`, `assessment_id`, `created_by` |
| `product_rejections` | ✅ | `id`, `assessment_id`, `description` |
| `product_revisions` | ✅ | `id`, `assessment_id`, `description` |
| `product_assessment_logistics` | ✅ | `id`, `assessment_id`, `details` |

### Order Tables (Tested & Working)

| Table | Status | Key Columns |
|-------|--------|-------------|
| `orders` | ✅ | `id`, `order_number`, `buyer_id`, `payment_status`, `shipment_status` |
| `order_items` | ✅ | `id`, `order_id`, `product_id`, `quantity`, `price` |
| `order_recipients` | ✅ | `id`, `first_name`, `last_name`, `phone`, `email` |
| `shipping_addresses` | ✅ | `id`, `user_id`, `label`, `address_line_1`, `city`, `province`, `region` |
| `carts` | ✅ | `id`, `buyer_id` |
| `cart_items` | ✅ | `id`, `cart_id`, `product_id`, `variant_id`, `quantity` |

### Messaging Tables (Tested & Working)

| Table | Status | Key Columns |
|-------|--------|-------------|
| `conversations` | ✅ | `id`, `buyer_id`, `order_id` (NO seller_id!) |
| `messages` | ✅ | `id`, `conversation_id`, `sender_id`, `sender_type`, `content`, `is_read` |

### AI Tables (Tested & Working)

| Table | Status | Key Columns |
|-------|--------|-------------|
| `ai_conversations` | ✅ | `id`, `user_id`, `user_type`, `title` |
| `ai_messages` | ✅ | `id`, `conversation_id`, `sender` ('user'/'ai'), `message` |

---

## Multi-Role Support

### Key Feature: Buyer Can Also Be Seller (Same Email)

The schema supports multi-role users through the `user_roles` junction table:

```sql
-- A user can have multiple roles
UNIQUE(user_id, role)  -- Allows: user_id + buyer, AND user_id + seller
```

### Implementation in authService:

```typescript
// Register existing buyer as seller
async registerBuyerAsSeller(
  userId: string,
  sellerData: { store_name: string; store_description?: string; owner_name?: string; }
): Promise<any | null>

// Check if user has multiple roles
async getUserRoles(userId: string): Promise<UserRole[]>

// Check specific roles
async isUserBuyer(userId: string): Promise<boolean>
async isUserSeller(userId: string): Promise<boolean>
async isUserAdmin(userId: string): Promise<boolean>
```

---

## Key Schema Differences from Old Schema

| Aspect | Old Schema | New Schema |
|--------|------------|------------|
| User type | `profiles.user_type` | `user_roles` table (multi-role) |
| Buyer points | `loyalty_points` | `bazcoins` |
| Seller status | `status` | `approval_status` |
| Profile avatar | `profiles.avatar_url` | `buyers.avatar_url` / `sellers.avatar_url` |
| Message read | `read_at` (timestamp) | `is_read` (boolean) |
| AI message | `role` + `content` | `sender` + `message` |
| Shipping address | `buyer_id` | `user_id` (references profiles) |
| Order recipient | `order_recipients.order_id` | `orders.recipient_id` (FK on orders) |
| Seller tables | `seller_business_info`, `seller_store_info` | `seller_business_profiles`, `seller_payout_accounts`, `seller_verification_documents` |

---

## Status Values

### Product Assessment Status
- `pending_digital_review`
- `waiting_for_sample`
- `pending_physical_review`
- `verified`
- `for_revision`
- `rejected`

### Payment Status
- `pending_payment`
- `paid`
- `refunded`
- `partially_refunded`

### Shipment Status
- `waiting_for_seller`
- `processing`
- `ready_to_ship`
- `shipped`
- `out_for_delivery`
- `delivered`
- `failed_to_deliver`
- `received`
- `returned`

### Seller Approval Status
- `pending`
- `verified`
- `rejected`

---

## Files Updated

### Services (web & mobile)
- `authService.ts` - Added `registerBuyerAsSeller()`, multi-role support
- `productService.ts` - Uses `category_id`, `product_images`, `product_variants`
- `cartService.ts` - Uses `variant_id`, simplified structure
- `orderService.ts` - Uses `payment_status` + `shipment_status`
- `qaService.ts` - Uses `product_assessments` with lowercase status
- `chatService.ts` - No `seller_id` on conversations, uses `is_read`

### Types
- `database.types.ts` - Complete type definitions for new schema

### Tests
- `comprehensive-db-test.ts` - 92 tests covering all tables and flows

---

## Running Tests

```bash
cd web
npx ts-node --transpile-only src/tests/comprehensive-db-test.ts
```

Optional: Provide test user IDs for flow tests:
```bash
TEST_BUYER_ID=uuid TEST_SELLER_ID=uuid npx ts-node --transpile-only src/tests/comprehensive-db-test.ts
```

---

## Migration Scripts

The following SQL files are available in `/supabase-migrations/`:

1. `000_new_database.sql` - Complete schema definition
2. `001_ai_assistant.sql` - AI tables (already applied)
3. `002_schema_completion.sql` - Schema completion script
4. `003_schema_fixes.sql` - Optional column additions

---

## Conclusion

The database schema is fully validated and all services are updated to work with the new normalized structure. The multi-role support allows buyers to also register as sellers using the same email, which is handled through the `user_roles` junction table.
