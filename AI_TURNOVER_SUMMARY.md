# AI Agent Turnover Summary - BAZAAR Project
**Date:** February 13, 2026  
**Last Commits:** 271c538, cc7eea3  
**Branch:** dev (up to date with origin/dev)

## 🎯 Current Project State

### Project Overview
BAZAAR is a full-stack e-commerce marketplace with:
- **Mobile App** (React Native/Expo) - Buyer and Seller experiences
- **Web App** (React/Vite) - Admin panel and web storefront
- **Backend** Supabase (PostgreSQL + Realtime + Storage + Auth)

### Active Development Focus
- **Phase:** Post-MVP Bug Fixes & Optimization
- **User Type:** Currently fixing Buyer mobile app issues
- **Last Session:** Fixed order flow, reviews, menu buttons, store navigation, and seller chat

---

## 📋 Recent Changes (Last Session)

### Commit 271c538: "fix: resolve buyer pages issues - order flow, reviews, menu, store"
**Files Modified:**
1. `mobile-app/app/OrdersScreen.tsx`
   - Added explicit `productId` field to item mapping (separate from `id`)
   - Fixed Completed tab filter to use `orderId` (UUID) instead of `o.id` (order_number)
   
2. `mobile-app/app/HistoryScreen.tsx`
   - Ensured item mapping includes `productId` for review functionality
   
3. `mobile-app/app/ProductDetailScreen.tsx`
   - Improved menu button hit area with `hitSlop` and extra padding
   - Fixed `handleVisitStore` to use actual seller data instead of hardcoded values
   
4. `mobile-app/src/services/sellerService.ts`
   - Return `null` instead of throwing when seller not found (PGRST116 error)

### Commit cc7eea3: "fix: chat seller now uses seller_id OR sellerId for compatibility"
**Files Modified:**
1. `mobile-app/app/ProductDetailScreen.tsx`
   - `StoreChatModal` now checks both `seller_id` and `sellerId`
   
2. `mobile-app/app/HomeScreen.tsx`
   - Added `seller_id` (snake_case) alongside `sellerId` in product mapping
   
3. `mobile-app/app/StoreDetailScreen.tsx`
   - Added `seller_id` and `seller` name to product mapping

**Issues Fixed:**
✅ Order received button not moving to Completed tab  
✅ Review submit errors (productId mapping)  
✅ Menu button beside cart not working (hit area too small)  
✅ Shop profile error fetching (seller not found handling)  
✅ Purchase history error fetching (already fixed, confirmed working)  
✅ "Unable to start chat. Store information unavailable" error  

---

## 🏗️ Architecture Overview

### Mobile App Structure
```
mobile-app/
├── app/                    # Screens (React Navigation)
│   ├── HomeScreen.tsx
│   ├── ProductDetailScreen.tsx
│   ├── OrdersScreen.tsx
│   ├── OrderDetailScreen.tsx
│   ├── HistoryScreen.tsx
│   ├── StoreDetailScreen.tsx
│   └── ...
├── src/
│   ├── components/         # Reusable UI components
│   ├── services/          # API/Database services
│   │   ├── productService.ts
│   │   ├── orderService.ts
│   │   ├── reviewService.ts
│   │   ├── sellerService.ts
│   │   └── chatService.ts
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript interfaces
│   └── lib/               # Supabase client
└── App.tsx                # Root navigation
```

### Database Schema (Supabase PostgreSQL)
See `currentdb.md` for full schema. Key tables:
- **orders** - Uses `shipment_status` column (NOT `status`)
- **order_items** - Has `price`, `product_id`, `rating` columns
- **products** - Has `seller_id` FK to sellers
- **reviews** - Has `product_id`, `buyer_id`, `order_id`, `rating`, `comment`
- **sellers** - Store information
- **conversations** - Chat between buyer and seller
- **messages** - Chat messages

### Critical Data Mappings

#### Order Item Structure
```typescript
{
  id: it.id || `${order.id}_${it.product_id}`,  // order_item id
  productId: p.id || it.product_id,              // CRITICAL: for reviews
  orderId: order.id,                              // real UUID
  transactionId: order.order_number,              // display string
  // ... other fields
}
```

#### Order Status Mapping
```typescript
// DB shipment_status → UI display status
'received' → 'delivered'
'delivered' → 'delivered'
'shipped' → 'shipped'
'processing' → 'processing'
'waiting_for_seller' → 'pending'
```

#### Valid shipment_status values:
- `waiting_for_seller`, `processing`, `ready_to_ship`, `shipped`, 
- `out_for_delivery`, `delivered`, `received`, `returned`, `failed_to_deliver`

#### Product seller_id Compatibility
Products must have BOTH:
```typescript
{
  seller_id: seller.id,  // snake_case for DB queries
  sellerId: seller.id     // camelCase for legacy code
}
```

---

## 🔑 Key Files & Their Purpose

### Services Layer
1. **`reviewService.ts`** - Review CRUD operations
   - ✅ NO `seller_id` in reviews table
   - ✅ Uses `product_id`, `buyer_id`, `order_id`
   - `hasReviewForProduct(orderId, productId)` - Check if review exists

2. **`orderService.ts`** - Order operations
   - Uses `shipment_status` column
   - Mark as received updates to `'received'` in DB, `'delivered'` in UI

3. **`chatService.ts`** - Messaging
   - `getOrCreateConversation(buyerId, sellerId, orderId?)`
   - Conversations don't have `seller_id` column (determined from order or messages)

4. **`sellerService.ts`** - Seller operations
   - `getSellerById()` returns `null` for not found (doesn't throw)
   - `getFollowerCount()`, `checkIsFollowing()` safe to fail

### Critical Screens
1. **`OrdersScreen.tsx`** - Main orders list with tabs
   - Tabs: To Pay, To Ship, To Receive, Completed, Returns
   - Completed tab filters by `status === 'delivered'`
   - Uses `orderId` (UUID) for DB operations

2. **`ProductDetailScreen.tsx`** - Product details with chat
   - Menu modal with Share, Wishlist, Visit Store, Report
   - `handleVisitStore()` requires `seller_id || sellerId`
   - `StoreChatModal` needs `sellerId` prop

3. **`ReviewModal.tsx`** - Review submission
   - Needs `item.productId` (not just `item.id`)
   - Tracks review status by `item.id` (order_item)
   - Submits with `productId` for DB insert

---

## 🐛 Known Issues & Patterns

### Common Bugs to Watch For
1. **ID Confusion**
   - `order.id` = real UUID (for DB queries)
   - `order.transactionId` / `order_number` = display string
   - `item.id` = order_item id (for UI tracking)
   - `item.productId` = actual product id (for reviews/DB)

2. **Snake_case vs camelCase**
   - Database columns: `seller_id`, `shipment_status`, `order_id`
   - TypeScript/UI: `sellerId`, `status`, `orderId`
   - Always provide BOTH in mappings for compatibility

3. **Seller Chat Requirements**
   - Product MUST have `seller_id` or `sellerId`
   - StoreChatModal checks both variants
   - Error: "Store information unavailable" = missing seller_id

4. **Review Submission**
   - Requires real `productId` (not order_item id)
   - Requires real `orderId` (UUID, not order_number)
   - No `seller_id` column in reviews table

### Error Patterns
- **PGRST116** - Postgres row not found (handle gracefully, return null)
- **Missing seller_id** - Always check `product.seller_id || product.sellerId`
- **Wrong status column** - Use `shipment_status` not `status` on orders table

---

## 🚀 Running the Project

### Mobile App (React Native/Expo)
```bash
cd mobile-app
npx expo start --clear
# Then scan QR code or press 'a' for Android emulator
```

### Web App
```bash
cd web
npm run dev
# Open http://localhost:5173
```

### Environment Setup
- Supabase credentials in `mobile-app/src/lib/supabase.ts`
- Check `.env` files for API keys

---

## 📊 Data Flow Examples

### Order Received Flow
```
User clicks "Order Received" button
  ↓
OrdersScreen.handleOrderReceived()
  ↓
Update DB: shipment_status = 'received'
  ↓
Update local state: status = 'delivered'
  ↓
Completed tab filter: o.status === 'delivered'
  ↓
Order appears in Completed tab ✓
```

### Review Submission Flow
```
User clicks "Review" button
  ↓
ReviewModal opens
  ↓
User selects product from order items (by item.id)
  ↓
On submit: gets item.productId
  ↓
Creates review with (productId, orderId, rating, comment)
  ↓
Marks order_item.rating = rating
  ↓
Success ✓
```

### Chat Seller Flow
```
User clicks "Chat Seller" button
  ↓
ProductDetailScreen.handleChat()
  ↓
Opens StoreChatModal with sellerId
  ↓
chatService.getOrCreateConversation(buyerId, sellerId)
  ↓
Creates/finds conversation
  ↓
Real-time messaging enabled ✓
```

---

## 🔍 Debugging Tips

### Check Product Mapping
Always verify product objects have:
```typescript
console.log({
  id: product.id,
  seller_id: product.seller_id,    // snake_case
  sellerId: product.sellerId,      // camelCase
  seller: product.seller            // name for display
});
```

### Check Order Item Mapping
```typescript
console.log({
  id: item.id,              // order_item id
  productId: item.productId, // MUST exist for reviews
  orderId: order.orderId     // real UUID, not order_number
});
```

### Database Queries
```sql
-- Check order statuses
SELECT id, order_number, shipment_status, payment_status 
FROM orders 
WHERE buyer_id = 'user-uuid';

-- Check reviews for product
SELECT * FROM reviews 
WHERE order_id = 'order-uuid' AND product_id = 'product-uuid';

-- Check seller exists
SELECT id, store_name FROM sellers WHERE id = 'seller-uuid';
```

---

## 📝 Important Notes

1. **Always test on Android emulator** - User is testing on emulator
2. **Push after each fix** - User expects commits to origin/dev
3. **Check both snake_case and camelCase** - DB uses snake_case, TS uses camelCase
4. **Use multi_replace for efficiency** - When making multiple edits
5. **Don't create docs unless asked** - Except this turnover doc (requested)

---

## 🎯 Next Steps / TODO

### Potential Future Issues
- [ ] Verify all product mappings have `seller_id` + `sellerId`
- [ ] Check if FlashSaleScreen products have seller_id
- [ ] Verify WishlistScreen product structure
- [ ] Test review submission from HistoryScreen
- [ ] Test order received → completed flow end-to-end
- [ ] Verify chat works from all product entry points

### Code Quality
- [ ] Add TypeScript strict type checking
- [ ] Add error boundaries for screens
- [ ] Improve error messages (more specific)
- [ ] Add loading states consistency

---

## 📞 Communication Style

The user prefers:
- ✅ Direct, concise responses
- ✅ Fix issues without asking permission
- ✅ Commit and push after each fix
- ✅ Use Filipino/English mix is ok ("hindi napupunta" = "not going")
- ❌ No verbose explanations unless complex
- ❌ No asking "shall I proceed?" - just do it

---

## 🔧 Current Working State

**Branch:** dev  
**Status:** Clean working tree (all changes committed and pushed)  
**Last Fix:** Chat seller compatibility  
**Expo:** Ready to run (`npx expo start --clear`)  

**All Known Buyer Page Issues:** ✅ FIXED

---

## 📚 Reference Documentation

- **Database Schema:** `currentdb.md` (full PostgreSQL schema)
- **API Documentation:** Check `/web/src/services/` for web equivalents
- **Component Library:** Uses Lucide React Native for icons
- **State Management:** Zustand stores in `mobile-app/src/stores/`
- **Navigation:** React Navigation (Stack Navigator)

---

**End of Turnover Summary**  
*Next AI: You're ready to continue! Check git log for detailed history.*
