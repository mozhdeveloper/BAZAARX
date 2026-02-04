# Supabase Setup Checklist

## What's been set up?

All the infrastructure is in place to connect Supabase. Everything works with mock data right now, but swaps to real database once you add credentials.

## Files Created

- `src/lib/supabase.ts` - Client configuration
- `src/types/database.types.ts` - All database types
- `src/services/authService.ts` - Auth operations
- `src/services/productService.ts` - Product operations
- `src/services/orderService.ts` - Order operations
- `src/services/cartService.ts` - Cart operations
- `src/utils/storage.ts` - File uploads
- `src/utils/validation.ts` - Input validation
- `src/utils/formatting.ts` - Display formatting
- `src/utils/realtime.ts` - Real-time subscriptions
- `.env.local` - Credentials go here
- `.env.local.example` - Template

## Getting Started

### 1. Create Supabase Project

Go to https://supabase.com and create a new project. Pick Singapore as the region.

### 2. Get Your Credentials

After it's created, grab the URL and anon key from Settings → API keys.

### 3. Update `.env.local`

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Restart the dev server after this.

### 4. Run Database Migrations

Go to SQL Editor in Supabase dashboard. Copy the SQL from `SUPABASE_DATABASE_PLAN (TO BE REVIEWED).md` and paste it in. This creates all the tables and policies.

### 5. Create Storage Buckets

In the Storage section, create these buckets:

- product-images
- profile-avatars
- review-images
- seller-documents
- voucher-images

## Migrating Your Code

Don't try to do everything at once. Pick one thing and finish it.

### Step 1: Products

1. Open `src/stores/sellerStore.ts`
2. Add import: `import { getProducts } from '@/services/productService';`
3. Replace mock data calls with service calls
4. Test that products load correctly
5. Test creating/updating a product

### Step 2: Authentication

1. Find your signup/login pages
2. Import: `import { signUp, signIn } from '@/services/authService';`
3. Replace auth logic with service calls
4. Test user registration
5. Test login flow

### Step 3: Cart & Orders

1. Update `src/stores/cartStore.ts` to use `cartService`
2. Update order creation to use `orderService`
3. Test adding items to cart
4. Test checkout flow

### Step 4: Real-time Features

1. Import: `import { subscribeToOrderUpdates } from '@/utils/realtime';`
2. Add to order tracking page
3. Test live updates

## Code Examples

### Use a Service

```typescript
import { getProducts } from "@/services/productService";

const products = await getProducts({ isActive: true, limit: 20 });
```

### Check if Supabase is Connected

```typescript
import { isSupabaseConfigured } from "@/lib/supabase";

if (!isSupabaseConfigured()) {
  console.warn("Using mock data");
}
```

### Upload a File

```typescript
import { uploadProductImage } from "@/utils/storage";

const imageUrl = await uploadProductImage(file, sellerId, productId);
```

### Real-time Order Updates

```typescript
import { subscribeToOrderUpdates } from "@/utils/realtime";

const channel = subscribeToOrderUpdates(buyerId, (order) => {
  console.log("Order updated:", order);
  updateUI(order);
});
```

### Validate Input

```typescript
import { validateEmail, validatePassword } from "@/utils/validation";

if (!validateEmail(email)) {
  setError("Invalid email");
}
```

### Format for Display

```typescript
import { formatPrice, formatDate } from "@/utils/formatting";

console.log(formatPrice(1500)); // ₱1,500.00
console.log(formatDate(order.created_at)); // January 14, 2026
```

## Before Going Live

- Enable RLS on all tables (already in the SQL)
- Test that buyers can only see their own orders
- Test that sellers can only manage their products
- Never commit the service role key to git
- Set up backups in Supabase dashboard
- Test with actual user accounts

## Troubleshooting

### "Supabase not configured" warning

This is normal while developing without a live database. Services will use mock data. The warning goes away once you add credentials to `.env.local`.

### TypeScript errors

Restart the TS server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Env vars not loading

Restart the dev server after updating `.env.local`

---

That's it. Services work with or without Supabase.

````
web/src/
├── lib/
│   └── supabase.ts              Client setup
├── services/
│   ├── authService.ts           Login/signup/profile
│   ├── productService.ts        Products
│   ├── orderService.ts          Orders
│   └── cartService.ts           Shopping cart
├── types/
│   └── database.types.ts        All database types
├── utils/
│   ├── storage.ts               File uploads
│   ├── validation.ts            Input checks
│   ├── formatting.ts            Display formatting
│   └── realtime.ts              Live updates
└── .env.local                   Your credentials go her
3. Test checkout flow

### Phase 4: Real-time Features
1. Add order status subscriptions
2. Add notification subscriptions
3. Test live updates

---

## 🔒 Security Checklist (Before Production)

- [ ] Enable Row Level Security (RLS) on all tables
- [ ] Test RLS policies with different user roles
- [ ] Secure storage bucket policies
## How to Migrate

Don't try to do everything at once. Pick one thing and finish it.

**Start with Products:**
1. Update `sellerStore.ts` to import from `productService`
2. Test that products still load
3. Test creating/editing a product

**Then Auth:**
1. Update signup/login pages to use `authService`
2. Test creating an account
3. Test logging in

**Then Cart & Orders:**
1. Update cart to use `cartService`
2. Test adding items
3. Test checkout

**Finally Real-time:**
1. Add `subscribeToOrderUpdates` to order detail page
2. Test that order status updates live
### 3. **File Uploads**
Ready-to-use storage utilities:
## Before Going Live

- Enable RLS on all tables (already in the SQL)
- Test that buyers can only see their own orders
- Test that sellers can only manage their products
- Never commit the service role key
- Set up backups in Supabase dashboard
- Add rate limiting if you expect heavy trafficderUpdates(buyerId, (order) => {
  console.log('Order updated:', order);
});
## Useful Patterns

**Check if Supabase is connected:**
```typescript
import { isSupabaseConfigured } from '@/lib/supabase';

if (!isSupabaseConfigured()) {
  console.warn('Using mock data');
}
````

**Upload a file:**

```typescript
import { uploadProductImage } from "@/utils/storage";
const url = await uploadProductImage(file, sellerId, productId);
```

**Real-time updates:**

```typescript
import { subscribeToOrderUpdates } from '@/utils/realtime';
const channel = subscribeToOrderUpdates(buyerId, (order) => {
## Quick Troubleshooting

**"Supabase not configured" warning?**
Normal. Services fall back to mock data. Goes away once you add the credentials.

**TypeScript complaining?**
Restart the TS server. In VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

**Env vars not working?**
Restart the dev server after updating `.env.local`

---
```
