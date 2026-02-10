# 🔐 BazaarX Test Accounts Reference

## Quick Login Reference

| Role | Email | Password | Login URL |
|------|-------|----------|-----------|
| **Admin** | admin@bazaarph.com | Test@123456 | /admin/login |
| **QA Admin** | qa.admin@bazaarph.com | Test@123456 | /admin/login |
| **Seller 1** | seller1@bazaarph.com | Test@123456 | /seller/login |
| **Seller 2** | seller2@bazaarph.com | Test@123456 | /seller/login |
| **Seller 3** | seller3@bazaarph.com | Test@123456 | /seller/login |
| **Buyer 1** | buyer1@gmail.com | Test@123456 | /login |
| **Buyer 2** | buyer2@gmail.com | Test@123456 | /login |
| **Buyer 3** | buyer3@gmail.com | Test@123456 | /login |
| **Buyer 4** | buyer4@gmail.com | Test@123456 | /login |

**Universal Password:** `Test@123456`

---

## 🛠️ How to Seed the Database

### Option 1: Run Seed Script (Recommended)

```bash
cd web
npm run seed:database
```

Or manually:
```bash
npx tsx scripts/seed-complete-database.ts
```

### Option 2: Direct SQL in Supabase

Go to Supabase Dashboard → SQL Editor and run the queries from `supabase-migrations/seed_data.sql`

---

## 👤 Admin Accounts

### Primary Admin
- **Email:** admin@bazaarph.com
- **Name:** BazaarX Admin
- **Role:** Super Admin
- **Can do:**
  - Approve/reject sellers
  - Approve/reject products (QA)
  - Manage categories
  - View analytics
  - Manage all users

### QA Admin
- **Email:** qa.admin@bazaarph.com
- **Name:** QA Administrator
- **Role:** QA Admin
- **Focus:** Product quality assurance

---

## 🏪 Seller Accounts

### Seller 1: Maria's Fashion Boutique
- **Email:** seller1@bazaarph.com
- **Store:** Maria's Fashion Boutique
- **Category:** Fashion
- **Status:** Verified & Approved
- **Products:**
  - Elegant Silk Blouse (₱2,899) - 8 variants
  - Designer Leather Handbag (₱4,599) - 3 variants
  - High-Waist Wide Leg Pants (₱1,899) - 5 variants

### Seller 2: TechHub Electronics
- **Email:** seller2@bazaarph.com
- **Store:** TechHub Electronics
- **Category:** Electronics
- **Status:** Verified & Approved
- **Products:**
  - Wireless Noise-Canceling Headphones (₱8,999) - 3 variants
  - Smart Watch Pro Series (₱12,999) - 4 variants
  - Portable Bluetooth Speaker (₱3,499) - 3 variants
  - Aromatherapy Essential Oil Diffuser (₱1,499) - 2 variants

### Seller 3: Beauty Essentials PH
- **Email:** seller3@bazaarph.com
- **Store:** Beauty Essentials PH
- **Category:** Beauty
- **Status:** Verified & Approved
- **Products:**
  - Hydrating Serum Set (₱2,499) - 2 variants
  - Natural Lip Tint Collection (₱399) - 4 variants

---

## 🛒 Buyer Accounts

### Buyer 1: Anna Marie Cruz
- **Email:** buyer1@gmail.com
- **Bazcoins:** 1,500
- **Addresses:** Home (Makati), Office (Makati)

### Buyer 2: Miguel Antonio Santos
- **Email:** buyer2@gmail.com
- **Bazcoins:** 2,300
- **Addresses:** Home (Quezon City)

### Buyer 3: Sofia Gabrielle Reyes
- **Email:** buyer3@gmail.com
- **Bazcoins:** 800
- **Addresses:** Condo (Taguig BGC)

### Buyer 4: Carlos Miguel Garcia
- **Email:** buyer4@gmail.com
- **Bazcoins:** 450
- **Addresses:** Home (Pasig)

---

## 🔄 Complete Test Flow

### 1. Buyer Flow
1. Login as buyer: `buyer1@gmail.com`
2. Browse products at `/shop`
3. Click "Buy Now" or "Add to Cart"
4. Select variant (size/color)
5. Proceed to `/checkout`
6. Verify address and payment (COD default)
7. Place order
8. View order at `/orders`

### 2. Seller Flow
1. Login as seller: `seller1@bazaarph.com`
2. View dashboard at `/seller/dashboard`
3. Manage products at `/seller/products`
4. View incoming orders at `/seller/orders`
5. Confirm and ship orders

### 3. Admin QA Flow
1. Login as admin: `admin@bazaarph.com`
2. View dashboard at `/admin/dashboard`
3. Review pending products at `/admin/product-approvals`
4. Approve/reject seller applications at `/admin/sellers`
5. Moderate reviews at `/admin/reviews`

---

## 📊 Database Tables Reference

| Table | Purpose |
|-------|---------|
| `profiles` | Base user info (linked to auth.users) |
| `buyers` | Buyer-specific data (bazcoins, preferences) |
| `sellers` | Seller store info and verification |
| `products` | Product listings |
| `product_variants` | Size/color variants with stock |
| `product_images` | Product image URLs |
| `categories` | Product categories |
| `orders` | Order records |
| `order_items` | Order line items |
| `shipping_addresses` | Buyer saved addresses |
| `reviews` | Product reviews |

---

## ⚠️ Important Notes

1. **Service Role Key Required:** The seed script needs `SUPABASE_SERVICE_ROLE_KEY` in your `.env` file to create auth users.

2. **Mobile App:** These same accounts work on the mobile app - just use the same email/password.

3. **Password Policy:** The password `Test@123456` meets Supabase's default policy (min 6 chars).

4. **Re-running Seed:** The script cleans existing test data before seeding. Production data would need protection.

5. **Categories:** 8 categories are pre-created: Fashion, Electronics, Beauty, Home & Living, Sports, Toys & Games, Books, Food & Drinks.

---

## 🔧 Troubleshooting

### "Invalid credentials" on login
- Run the seed script to ensure accounts exist
- Check if auth users were created in Supabase Auth dashboard

### "Buyer/Seller profile not found"
- The profile may exist in auth but not in buyers/sellers table
- Re-run seed script to fix

### Products not showing variants
- Ensure `product_variants` table has entries
- Check if `variant_name`, `size`, `color` fields are populated

### Orders not creating
- Check browser console for errors
- Verify address is selected in checkout
- Ensure COD payment is selected (default)
