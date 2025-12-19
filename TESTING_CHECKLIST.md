# Quick Testing Checklist ✅

## 🚀 Run the Application

```bash
cd web
npm run dev
# Open http://localhost:5173
```

---

## 🧪 Test Scenarios

### **Scenario 1: Cart Navigation** (2 minutes)

**Steps**:
1. [ ] Open homepage
2. [ ] Click on any product (e.g., "Gaming Mouse")
3. [ ] Click "Add to cart" button
4. [ ] **VERIFY**: Toast notification appears in top-right
5. [ ] **VERIFY**: Notification shows "Added to cart!"
6. [ ] **VERIFY**: Shows correct quantity
7. [ ] Click "View Cart →" in notification
8. [ ] **VERIFY**: Redirects to `/enhanced-cart`
9. [ ] **VERIFY**: Items are grouped by seller
10. [ ] **VERIFY**: Shopping bag icon in header shows badge with count

**Expected Result**: ✅ Clear navigation to enhanced cart with visual feedback

---

### **Scenario 2: Voucher Application** (1 minute)

**Steps**:
1. [ ] Have items in enhanced cart
2. [ ] Scroll to voucher input section
3. [ ] Type `SAVE10` in voucher field
4. [ ] Click "Apply" button
5. [ ] **VERIFY**: Green success message appears
6. [ ] **VERIFY**: Discount (10%) applied to subtotal
7. [ ] **VERIFY**: New total calculated correctly

**Test Other Vouchers**:
- [ ] `SAVE20` → 20% discount
- [ ] `FREESHIP` → Free shipping
- [ ] `INVALID` → Error message

**Expected Result**: ✅ Vouchers apply correctly with visual feedback

---

### **Scenario 3: Complete Order Flow** (5 minutes)

**Steps**:
1. [ ] Add items to cart from multiple sellers
2. [ ] Go to enhanced cart
3. [ ] Apply voucher `SAVE10`
4. [ ] Click "Proceed to Checkout" for a seller
5. [ ] Fill in shipping address:
   - Name: John Doe
   - Street: 123 Main St
   - City: Manila
   - Province: Metro Manila
   - Postal Code: 1000
   - Phone: 09123456789
6. [ ] Select payment method (e.g., GCash)
7. [ ] Click "Place Order"
8. [ ] **VERIFY**: Redirects to order confirmation
9. [ ] **VERIFY**: Shows order ID and success message
10. [ ] Click "Track Your Order"
11. [ ] **VERIFY**: Redirects to delivery tracking

**Expected Result**: ✅ Smooth checkout flow with confirmation

---

### **Scenario 4: Delivery Tracking & Review** (2 minutes)

**Steps**:
1. [ ] On delivery tracking page
2. [ ] **VERIFY**: Map with animated route visible
3. [ ] **VERIFY**: Delivery progress bar showing
4. [ ] **VERIFY**: Current step indicator (blue with pulse)
5. [ ] Wait 8 seconds
6. [ ] **VERIFY**: Progress moves to next step
7. [ ] Continue waiting (total ~32 seconds to complete)
8. [ ] **VERIFY**: Reaches "Delivered" status (Step 4)
9. [ ] **VERIFY**: Progress bar shows 100%
10. [ ] Wait 2 more seconds
11. [ ] **VERIFY**: Review modal appears automatically
12. [ ] Rate 5 stars
13. [ ] Write review: "Great product, fast delivery!"
14. [ ] Click camera icon to add image (optional)
15. [ ] Click "Submit Review"
16. [ ] **VERIFY**: Success message "Thank You!" appears
17. [ ] **VERIFY**: Modal auto-closes after 2 seconds

**Expected Result**: ✅ Automatic review prompt after delivery with smooth submission

---

### **Scenario 5: Review Visibility** (1 minute)

**Steps**:
1. [ ] After submitting review, go to homepage
2. [ ] Click on the same product you reviewed
3. [ ] Scroll to "Reviews" tab
4. [ ] **VERIFY**: Your review appears in the list
5. [ ] **VERIFY**: Shows correct rating (5 stars)
6. [ ] **VERIFY**: Shows review text
7. [ ] **VERIFY**: Shows "Verified Purchase" badge
8. [ ] **VERIFY**: Shows your name "John Doe"

**Also Check**:
- [ ] Go to `/reviews` page
- [ ] **VERIFY**: Review appears in "My Reviews"
- [ ] **VERIFY**: Can see product info

**Expected Result**: ✅ Reviews visible on product page and profile

---

### **Scenario 6: Multi-Seller Cart** (2 minutes)

**Steps**:
1. [ ] Go to shop page
2. [ ] Add "Gaming Mouse" from TechHub Store
3. [ ] Add "Premium Watch" from Fashion Haven
4. [ ] Add "Wireless Headphones" from AudioPro
5. [ ] Click shopping bag icon
6. [ ] **VERIFY**: Items grouped into 3 sections by seller
7. [ ] **VERIFY**: Each group shows:
   - Seller name with verification badge
   - Individual items with quantity/price
   - Subtotal per seller
   - "Proceed to Checkout" button per seller
   - "Follow" button for each seller
8. [ ] Click "Follow" on TechHub Store
9. [ ] **VERIFY**: Button changes to "Following"
10. [ ] Go to `/profile` → "Following" tab
11. [ ] **VERIFY**: TechHub Store appears in followed list

**Expected Result**: ✅ Clean multi-seller cart with grouping and follow functionality

---

### **Scenario 7: Profile & Address Book** (2 minutes)

**Steps**:
1. [ ] Click profile icon in header
2. [ ] Select "My Profile"
3. [ ] **VERIFY**: Lands on profile page with tabs
4. [ ] **Personal Info Tab**:
   - [ ] Shows name, email, phone
   - [ ] Click "Edit Profile"
   - [ ] **VERIFY**: Fields become editable
5. [ ] **Addresses Tab**:
   - [ ] Click "Add New Address"
   - [ ] Fill in address details
   - [ ] Click "Save"
   - [ ] **VERIFY**: Address appears in list
   - [ ] **VERIFY**: Can set as default
6. [ ] **Following Tab**:
   - [ ] **VERIFY**: Shows followed stores (TechHub if followed earlier)
   - [ ] Click "Unfollow"
   - [ ] **VERIFY**: Removed from list
7. [ ] **Settings Tab**:
   - [ ] Toggle notification preferences
   - [ ] **VERIFY**: Toggles update

**Expected Result**: ✅ Functional profile management with all features working

---

### **Scenario 8: Seller Storefront** (1 minute)

**Steps**:
1. [ ] From enhanced cart, click seller name (e.g., "TechHub Store")
2. [ ] **VERIFY**: Redirects to `/seller/:sellerId`
3. [ ] **VERIFY**: Shows seller header with:
   - Store name and verification badge
   - Rating and review count
   - Total products
   - Response rate and time
   - Join date
4. [ ] **VERIFY**: Shows "Follow" button
5. [ ] **VERIFY**: Displays seller's products in grid
6. [ ] Click category filter (e.g., "Electronics")
7. [ ] **VERIFY**: Products filter correctly
8. [ ] Toggle between grid/list view
9. [ ] **VERIFY**: Layout changes

**Expected Result**: ✅ Professional storefront with filtering and follow feature

---

## 🎯 Critical Checks

### **No Errors**:
- [ ] Console has no errors (press F12)
- [ ] No TypeScript compilation errors
- [ ] No 404 errors for routes
- [ ] All images load correctly

### **Visual Polish**:
- [ ] Shopping bag icon has orange badge
- [ ] Toast notifications slide in smoothly
- [ ] Review modal has gradient header
- [ ] Delivery tracking has animated truck
- [ ] Progress bars animate smoothly
- [ ] Star ratings have hover effects

### **Data Persistence**:
- [ ] Cart items persist after page refresh
- [ ] Reviews persist after submission
- [ ] Followed stores persist
- [ ] Addresses persist
- [ ] Orders persist

---

## 🐛 Common Issues & Fixes

### **Issue**: Toast notification not appearing
**Fix**: Check browser console, verify ProductDetailPage.tsx changes

### **Issue**: Review modal not showing
**Fix**: Wait full 32 seconds for delivery to complete (4 steps × 8 seconds)

### **Issue**: Cart items not showing
**Fix**: Make sure you're using `/enhanced-cart` not `/cart`

### **Issue**: Voucher not applying
**Fix**: Use exact codes: `SAVE10`, `SAVE20`, `FREESHIP` (case-sensitive)

### **Issue**: Seller not in following list
**Fix**: Click "Follow" button first, then check profile → Following tab

---

## ✅ Success Criteria

All features pass if:
- ✅ Single cart icon in header
- ✅ Toast appears on "Add to cart"
- ✅ Enhanced cart groups by seller
- ✅ Vouchers apply correctly
- ✅ Delivery tracking animates
- ✅ Review modal auto-appears
- ✅ Reviews save and display
- ✅ Follow/unfollow works
- ✅ Address book functional
- ✅ No console errors

---

## 📊 Testing Summary

**Total Test Scenarios**: 8  
**Estimated Time**: 15-20 minutes  
**Critical Tests**: Scenarios 1, 4, 6 (core features)  
**Nice-to-Have Tests**: Scenarios 5, 7, 8 (supporting features)

---

## 🎉 When All Tests Pass

Congratulations! The BazaarX buyer flow is:
- ✅ Intuitive and user-friendly
- ✅ Properly navigated
- ✅ Feature-complete
- ✅ Production-ready

You can now:
1. Deploy to staging/production
2. Share with stakeholders
3. Begin user acceptance testing
4. Start Phase 2 development

---

**Testing Date**: _____________  
**Tested By**: _____________  
**Status**: [ ] Pass [ ] Fail  
**Notes**: _____________________________________________
