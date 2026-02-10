# 🧪 BAZAARX TESTING GUIDE

## Quick Start Testing

### 🚀 Start the Development Server
```bash
cd /Users/jcuady/Dev/BAZAARX/web
npm run dev
```

Server will start at: `http://localhost:5173`

---

## 🧑‍💼 **ADMIN PANEL TESTING**

### Demo Credentials
```
Email: admin@bazaarph.com
Password: admin123
```

### Test These Admin Routes:
1. **Login** → http://localhost:5173/admin/login
   - Enter demo credentials
   - Should redirect to dashboard

2. **Dashboard** → http://localhost:5173/admin
   - View statistics cards
   - Check revenue chart
   - See recent activity

3. **Categories** → http://localhost:5173/admin/categories  ⭐ FIXED
   - Create new category
   - Edit existing category
   - Delete category

4. **Sellers** → http://localhost:5173/admin/sellers  ⭐ FIXED
   - View pending sellers
   - Approve/reject sellers
   - View seller details

5. **Buyers** → http://localhost:5173/admin/buyers  ⭐ FIXED
   - View buyer list
   - Search buyers
   - View buyer details

6. **Orders** → http://localhost:5173/admin/orders  ✨ NEW
   - View all platform orders
   - Search by order number
   - Filter by status

7. **Analytics** → http://localhost:5173/admin/analytics  ✨ NEW
   - View revenue trends
   - Check category distribution
   - See top products

8. **Settings** → http://localhost:5173/admin/settings  ✨ NEW
   - General settings
   - Notifications
   - Security
   - Appearance
   - Email config

### ✅ Admin Navigation Check
- Click each sidebar link
- Verify page loads correctly
- No 404 errors
- User profile dropdown works
- Logout redirects to login

---

## 🛍️ **SELLER PORTAL TESTING**

### Demo Credentials
```
Email: seller@bazaarph.com
Password: password
```

### Test These Seller Routes:
1. **Login** → http://localhost:5173/seller/login
2. **Dashboard** → http://localhost:5173/seller
3. **Products** → http://localhost:5173/seller/products
4. **Add Product** → http://localhost:5173/seller/products/add
5. **Orders** → http://localhost:5173/seller/orders

---

## 🛒 **BUYER FLOW TESTING**

### Complete Purchase Flow:
1. **Homepage** → http://localhost:5173/
   - Browse trending products
   - Click category chips

2. **Shop** → http://localhost:5173/shop
   - Search products
   - Apply filters
   - Sort by price

3. **Product Detail** → http://localhost:5173/product/1
   - View product info
   - Select variants
   - Add to cart

4. **Cart** → http://localhost:5173/cart
   - Update quantities
   - Remove items
   - See total price

5. **Checkout** → http://localhost:5173/checkout
   - Fill shipping address
   - Select payment method
   - Place order

6. **Order Confirmation** → Auto-redirected
   - View order summary
   - See tracking number

7. **Delivery Tracking** → Click "Track Order"
   - See map with location
   - View delivery status

8. **Orders** → http://localhost:5173/orders
   - View order history
   - Track multiple orders

---

## ✅ **CART SCHEMA VALIDATION**

### Test Cart Functionality:
1. Add product to cart
2. Refresh page → Cart should persist
3. Update quantity → Total should recalculate
4. Remove item → Cart updates correctly
5. Checkout → Order created with correct data

### Verify in Browser DevTools:
```javascript
// Open Console and check:
localStorage.getItem('bazaar-cart-store')
```

Should show cart data with:
- `items` array
- `orders` array
- Correct quantities and prices

---

## 🔍 **COMMON ISSUES & FIXES**

### Issue: "Cannot find module" errors
**Fix:** 
```bash
cd web
npm install
```

### Issue: Port already in use
**Fix:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Issue: Cart not persisting
**Fix:** Clear localStorage and try again
```javascript
localStorage.clear()
```

---

## 📊 **SUCCESS CRITERIA**

### ✅ All Tests Pass When:
- [ ] Admin can login and access all 8 pages
- [ ] Admin sidebar navigation works completely
- [ ] Seller can manage products and orders
- [ ] Buyer can complete purchase from homepage to order confirmation
- [ ] Cart persists across page refreshes
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors
- [ ] All routes return 200 (no 404s)

---

## 🎯 **SPECIFIC TESTS FOR TODAY'S FIXES**

### Test 1: Cart Schema Consistency
```
1. Add product to cart from homepage
2. Go to cart page
3. Proceed to checkout
4. Complete order
5. View order in orders page
→ All data should flow correctly without errors
```

### Test 2: Admin Navigation
```
1. Login to admin panel
2. Click each sidebar link:
   - Dashboard ✓
   - Categories ✓
   - Seller Approvals ✓
   - Buyers ✓
   - Orders ✓ (NEW)
   - Analytics ✓ (NEW)
   - Settings ✓ (NEW)
→ All should load without 404 errors
```

### Test 3: Order Data Flow
```
1. Create order as buyer
2. View order in seller panel
3. View same order in admin orders page
→ Order should appear with consistent data
```

---

## 🐛 **DEBUGGING TIPS**

### Check Browser Console
- Press F12 or Cmd+Option+I
- Look for red errors
- Note any warnings

### Check Network Tab
- Monitor API calls
- Check for 404 errors
- Verify data payloads

### Check React DevTools
- Install React DevTools extension
- Inspect component props
- Monitor state changes

---

## 📝 **TESTING NOTES**

- All dummy data is pre-populated
- Orders auto-progress from pending → confirmed → shipped
- Sample orders included for testing tracking
- Admin credentials work for all admin pages
- Seller credentials work for seller portal

---

## ✨ **WHAT'S NEW (Today's Fixes)**

1. ✅ **Unified Cart Schema**
   - No more duplicate store files
   - Consistent types everywhere
   - Clean imports

2. ✅ **3 New Admin Pages**
   - Orders page with filtering
   - Analytics with charts
   - Settings with tabs

3. ✅ **Fixed Admin Navigation**
   - All sidebar links work
   - No more 404s
   - Complete route coverage

---

**Last Updated:** December 13, 2025  
**Status:** All tests should pass ✅
