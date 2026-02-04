# 🗄️ BazaarX Supabase Database Migrations

This directory contains all the SQL migration files needed to set up the BazaarX database schema in Supabase.

## 📋 Files Overview

### 1. `001_initial_schema.sql`

**Purpose**: Creates all database tables with proper structure, constraints, and indexes  
**Size**: ~1500 lines  
**Dependencies**: None  
**Execution Time**: ~5-10 seconds

**Tables Created**:

- User Management: `profiles`, `buyers`, `sellers`, `admins`
- Products: `products`, `product_qa`, `categories`
- Orders: `orders`, `order_items`, `order_status_history`
- Shopping: `carts`, `cart_items`, `reviews`
- Promotions: `vouchers`, `voucher_usage`
- Inventory: `inventory_ledger`, `low_stock_alerts`
- User Data: `addresses`, `notifications`

**Important**: This script creates the tables but DOES NOT enable RLS or apply policies.

---

### 2. `002_row_level_security.sql`

**Purpose**: Enables RLS on all tables and applies security policies  
**Size**: ~600 lines  
**Dependencies**: Requires `001_initial_schema.sql` to be executed first  
**Execution Time**: ~3-5 seconds

**Policies Applied**:

- User profile access control
- Product visibility rules (approved vs draft)
- Order access by buyer/seller/admin
- Cart isolation per buyer
- Review access rules
- Inventory ledger access control
- Notification privacy

**Important**: RLS must be applied AFTER table creation but BEFORE any data insertion for proper enforcement.

---

### 3. `003_functions_and_triggers.sql`

**Purpose**: Creates database functions and triggers for business logic  
**Size**: ~400 lines  
**Dependencies**: Requires both `001_initial_schema.sql` and `002_row_level_security.sql`  
**Execution Time**: ~2-3 seconds

**Functions Created**:

- `create_order_with_items()` - Atomically create orders with line items
- `deduct_product_stock()` - Deduct inventory and create ledger entry
- `add_product_stock()` - Add inventory and create ledger entry
- `get_seller_sales_summary()` - Get sales statistics for sellers
- `get_buyer_order_summary()` - Get order statistics for buyers

**Triggers Created**:

- `trg_update_product_rating` - Auto-update product rating from reviews
- `trg_update_seller_rating` - Auto-update seller rating from reviews
- `trg_check_low_stock` - Auto-create low stock alerts
- `trg_update_order_timestamp` - Auto-update order modified timestamp

---

### 4. `ROLLBACK_ALL.sql`

**Purpose**: Complete rollback script to remove ALL database objects  
**⚠️ WARNING**: This script will DELETE ALL DATA. Use with extreme caution!  
**Execution Time**: ~2-3 seconds

**What it removes**:

1. All triggers
2. All functions
3. All RLS policies
4. All tables

**When to use**:

- During development when starting fresh
- After testing to clean up the database
- In case of critical errors that require a complete reset

---

## 🚀 Execution Order

**Always execute in this order:**

```
1. 001_initial_schema.sql      (Creates tables)
   ↓
2. 002_row_level_security.sql  (Enables RLS)
   ↓
3. 003_functions_and_triggers.sql (Adds logic)
   ✓ Database is ready to use
```

## 📝 How to Execute in Supabase

### Method 1: SQL Editor (Recommended for small files)

1. Go to **Supabase Dashboard** → Your Project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `001_initial_schema.sql`
5. Paste into the editor
6. Click **RUN** (or press Ctrl+Enter)
7. Wait for completion message
8. Repeat for files 2 and 3

### Method 2: Supabase CLI (Recommended for production)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-id your-project-id

# Execute migrations
supabase db push < supabase-migrations/001_initial_schema.sql
supabase db push < supabase-migrations/002_row_level_security.sql
supabase db push < supabase-migrations/003_functions_and_triggers.sql
```

### Method 3: psql Command Line (Direct database access)

```bash
# Connect to your Supabase database
psql postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres

# Execute migrations
\i supabase-migrations/001_initial_schema.sql
\i supabase-migrations/002_row_level_security.sql
\i supabase-migrations/003_functions_and_triggers.sql
```

---

## ⏮️ How to Rollback

### If something goes wrong:

```bash
# Option 1: Using Supabase CLI
supabase db push < supabase-migrations/ROLLBACK_ALL.sql

# Option 2: Using SQL Editor
# Copy entire contents of ROLLBACK_ALL.sql into SQL Editor and RUN

# Option 3: Using psql
psql postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres
\i supabase-migrations/ROLLBACK_ALL.sql
```

---

## 🔍 Verification Steps

After executing all migrations, verify the setup:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify RLS is enabled
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = true;

-- Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

-- Check indexes
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public';
```

---

## 📊 Database Schema Overview

```
USERS
├── profiles (base user info)
├── buyers (buyer-specific)
├── sellers (seller-specific)
└── admins (admin-specific)

PRODUCTS
├── categories (product categories)
├── products (product listings)
└── product_qa (quality assurance workflow)

ORDERS
├── orders (order records)
├── order_items (line items)
├── order_status_history (order tracking)
└── reviews (order reviews)

SHOPPING
├── carts (shopping carts)
├── cart_items (cart line items)
├── addresses (saved addresses)
└── vouchers (promotional codes)
    └── voucher_usage (usage tracking)

INVENTORY
├── inventory_ledger (stock history)
└── low_stock_alerts (low stock notifications)

NOTIFICATIONS
└── notifications (user notifications)
```

---

## 🔐 Security Features

1. **Row Level Security (RLS)**: All tables have RLS enabled with specific access policies
2. **Role-Based Access**: Different policies for buyers, sellers, and admins
3. **Data Isolation**: Users can only access their own data
4. **Audit Trail**: `inventory_ledger` tracks all stock changes
5. **Soft Locks**: Foreign key constraints maintain referential integrity

---

## ⚙️ Customization

If you need to modify the schema:

1. **Never modify the migration files directly**
2. Create a new file: `004_custom_changes.sql`
3. Document what was changed and why
4. Keep a backup before applying changes
5. Test on a development database first

Example custom migration:

```sql
-- 004_add_seller_commission.sql
ALTER TABLE public.sellers
ADD COLUMN commission_rate DECIMAL(5,2) DEFAULT 5.0;

ALTER TABLE public.sellers
ADD COLUMN commission_payment_method TEXT;

CREATE INDEX idx_sellers_commission ON public.sellers(commission_rate);
```

---

## 📱 Storage Buckets (Setup Separately)

The migration files don't include storage bucket setup. Create these manually:

1. **product-images**: Store product photos
2. **profile-avatars**: Store user profile pictures
3. **review-images**: Store review photos
4. **seller-documents**: Store business documents
5. **voucher-images**: Store voucher banners

Set storage policies in Supabase Dashboard → Storage → Policies

---

## 🐛 Common Issues

### Issue: "Role does not exist"

**Solution**: Make sure you're executing as a superuser/admin

### Issue: "Foreign key constraint violation"

**Solution**: Execute files in the correct order. Never skip a file.

### Issue: "RLS policy conflicts"

**Solution**: Drop conflicting policies and re-run `002_row_level_security.sql`

### Issue: "Column already exists"

**Solution**: You may have already run the migration. Check tables with:

```sql
\dt+ public.*
```

---

## 📚 Additional Resources

- [Supabase SQL Documentation](https://supabase.com/docs/guides/database)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://www.postgresql.org/docs/current/sql-createfunction.html)

---

## ✅ Migration Checklist

- [ ] Backup existing data (if any)
- [ ] Execute `001_initial_schema.sql`
- [ ] Verify all tables exist
- [ ] Execute `002_row_level_security.sql`
- [ ] Test RLS policies
- [ ] Execute `003_functions_and_triggers.sql`
- [ ] Test functions with sample data
- [ ] Verify indexes for performance
- [ ] Update application connection strings
- [ ] Run integration tests
- [ ] Monitor database for 24 hours
- [ ] Document any customizations

---

**Ready to deploy! 🚀**

For questions or issues, refer to the [BazaarX Supabase Database Plan](../SUPABASE_DATABASE_PLAN%20%28TO%20BE%20REVIEWED%29.md) document.

---

_Last Updated: January 15, 2026_
