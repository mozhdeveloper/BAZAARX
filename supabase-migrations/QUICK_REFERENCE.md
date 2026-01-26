# ⚡ Quick Migration Reference

## 🎯 TL;DR (Too Long; Didn't Read)

### Execute These 3 Files In Order:

```
1. 001_initial_schema.sql
2. 002_row_level_security.sql
3. 003_functions_and_triggers.sql
```

### If Something Breaks:

```
ROLLBACK_ALL.sql
```

---

## 📋 File Dependency Chain

```
001_initial_schema.sql
        ↓ (Creates: tables, indexes)
        ├─ Creates 19 tables
        ├─ Creates ~20 indexes
        └─ No RLS policies yet

        ↓

002_row_level_security.sql
        ↓ (Requires: 001 completed)
        ├─ Enables RLS on all tables
        ├─ Creates ~60 security policies
        └─ Ready for data access control

        ↓

003_functions_and_triggers.sql
        ↓ (Requires: 001 & 002 completed)
        ├─ Creates 5 database functions
        ├─ Creates 4 triggers
        └─ Business logic ready

        ✓ READY TO USE
```

---

## 📊 Tables Created

| Table                | Rows            | Purpose                    |
| -------------------- | --------------- | -------------------------- |
| profiles             | users           | Base user data             |
| buyers               | buyer accounts  | Buyer-specific info        |
| sellers              | seller accounts | Seller-specific info       |
| admins               | admins          | Admin accounts             |
| categories           | categories      | Product categories         |
| products             | products        | Product listings           |
| product_qa           | qa entries      | Quality assurance workflow |
| orders               | orders          | Order records              |
| order_items          | items           | Line items per order       |
| order_status_history | history         | Order tracking history     |
| carts                | carts           | Shopping carts             |
| cart_items           | items           | Cart contents              |
| addresses            | addresses       | Saved addresses            |
| reviews              | reviews         | Product reviews            |
| vouchers             | vouchers        | Promo codes                |
| voucher_usage        | usage           | Voucher usage tracking     |
| inventory_ledger     | ledger          | Stock movement log         |
| low_stock_alerts     | alerts          | Stock alerts               |
| notifications        | notifications   | User notifications         |

---

## 🚀 Quick Start (Supabase Dashboard)

1. Log in to Supabase
2. Select your project
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy contents of `001_initial_schema.sql`
6. Click **RUN**
7. Repeat for files 2 and 3

---

## 🔄 How to Rollback

**Option A**: Execute ROLLBACK_ALL.sql

```
This removes EVERYTHING - all tables, functions, policies
Use if you want to start completely fresh
```

**Option B**: Drop specific objects

```sql
-- Drop just tables (keeps RLS/functions)
DROP TABLE IF EXISTS public.notifications;
DROP TABLE IF EXISTS public.orders;
-- etc...

-- Then re-run: 001_initial_schema.sql
```

**Option C**: Disable RLS temporarily

```sql
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
-- Make changes
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
```

---

## 📈 File Sizes

```
001_initial_schema.sql          ~1,500 lines (49 KB)
002_row_level_security.sql      ~600 lines   (18 KB)
003_functions_and_triggers.sql  ~400 lines   (12 KB)
ROLLBACK_ALL.sql                ~300 lines   (10 KB)
README.md                        ~400 lines   (15 KB)
```

---

## ✅ What Gets Created

### Tables (19 total)

✓ profiles  
✓ buyers, sellers, admins  
✓ categories, products, product_qa  
✓ orders, order_items, order_status_history  
✓ carts, cart_items, addresses  
✓ reviews, vouchers, voucher_usage  
✓ inventory_ledger, low_stock_alerts  
✓ notifications

### Indexes (~20 total)

✓ Foreign key lookups  
✓ Status filtering  
✓ Date range queries  
✓ Search optimization

### RLS Policies (~60 total)

✓ User authentication checks  
✓ Buyer/seller access rules  
✓ Admin privileges  
✓ Data isolation policies

### Functions (5 total)

✓ `create_order_with_items()`  
✓ `deduct_product_stock()`  
✓ `add_product_stock()`  
✓ `get_seller_sales_summary()`  
✓ `get_buyer_order_summary()`

### Triggers (4 total)

✓ Auto-update product ratings  
✓ Auto-update seller ratings  
✓ Low stock alert creation  
✓ Order timestamp updates

---

## 🔐 Security Features

| Feature            | Status               |
| ------------------ | -------------------- |
| Row Level Security | ✓ Enabled            |
| Column Permissions | ✓ Via RLS            |
| Data Encryption    | ✓ At rest (Supabase) |
| User Isolation     | ✓ Enforced           |
| Admin Access       | ✓ Restricted         |
| Audit Logs         | ✓ Via ledger tables  |

---

## 🐛 Troubleshooting

### Error: "Syntax error in SQL statement"

→ Make sure you're copying the ENTIRE file  
→ Check for incomplete statements

### Error: "Foreign key constraint violation"

→ Execute files in order 1 → 2 → 3  
→ Don't skip files

### Error: "Permission denied"

→ You need at least "Editor" role in Supabase  
→ Switch to a superuser account

### Error: "Table already exists"

→ Run ROLLBACK_ALL.sql first  
→ Then run the migrations fresh

### Performance is slow

→ Check indexes are created: `SELECT * FROM pg_indexes`  
→ Update RLS policies to use indexes  
→ Consider denormalization if needed

---

## 📱 Integration Notes

After migration, update your app:

```typescript
// Connect to Supabase
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://your-project.supabase.co",
  "your-anon-key"
);

// Use functions
const { data, error } = await supabase.rpc("create_order_with_items", {
  p_buyer_id: buyerId,
  p_seller_id: sellerId,
  // ... other parameters
});

// Use RLS automatically
const { data } = await supabase.from("orders").select("*"); // User can only see their own orders
```

---

## 💾 Backup Strategy

Before running migrations:

1. **Create Supabase backup**

   - Supabase Dashboard → Backups → Create backup

2. **Export current schema** (if migrating from existing DB)

   ```bash
   pg_dump -s your_old_db > schema_backup.sql
   ```

3. **Keep migration files safe**
   - Store in version control
   - Document any custom changes

---

## 🚨 IMPORTANT: DO NOT

❌ Don't edit migration files after creation  
❌ Don't skip files in the sequence  
❌ Don't run ROLLBACK_ALL.sql unless you want to delete everything  
❌ Don't change RLS policies without testing  
❌ Don't remove foreign key constraints without understanding impact  
❌ Don't disable RLS in production

---

## ✓ DO THIS INSTEAD

✅ Create new files for additional changes (004*, 005*, etc.)  
✅ Test migrations on dev database first  
✅ Keep versions of the migration files  
✅ Document all customizations  
✅ Test RLS policies thoroughly  
✅ Monitor performance after migration  
✅ Set up automated backups

---

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **GitHub Issues**: Post questions/issues in project repo
- **Main Plan Doc**: See SUPABASE_DATABASE_PLAN.md

---

## 🎯 Migration Checklist

- [ ] Read this guide
- [ ] Create Supabase backup
- [ ] Execute 001_initial_schema.sql
- [ ] Execute 002_row_level_security.sql
- [ ] Execute 003_functions_and_triggers.sql
- [ ] Run verification queries
- [ ] Test with sample data
- [ ] Update application code
- [ ] Run integration tests
- [ ] Monitor for issues
- [ ] Update team documentation

---

**Version**: 1.0  
**Last Updated**: January 15, 2026  
**Status**: Ready for Production
