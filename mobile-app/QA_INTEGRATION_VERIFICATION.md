# QA Integration Verification Guide

## ✅ TypeScript Compilation Status
**PASSED** - No TypeScript errors detected

## 🔄 Product QA Flow Overview

### Flow Diagram
```
SELLER                          ADMIN
  │                               │
  ├─ Submit Product ──────────►  │
  │  (addProductToQA)             ├─ Digital Review
  │                               │  (PENDING_DIGITAL_REVIEW)
  │                               │
  │  ◄──────── Approved/Rejected ─┤
  │                               │
  ├─ Submit Sample ───────────►  │
  │  (logistics method)            ├─ Physical QA
  │                               │  (IN_QUALITY_REVIEW)
  │                               │
  │  ◄──────── Pass/Fail ────────┤
  │                               │
  └─ Product Live                └─ Product Active
     (ACTIVE_VERIFIED)
```

## 📋 Integration Points

### 1. Seller Product Submission
**File:** `mobile-app/app/seller/(tabs)/products.tsx`

**Process:**
```typescript
1. Seller fills product form
2. handleAddProduct() validates and creates product
3. addProduct() adds to seller store (useSellerStore)
4. addProductToQA() submits to QA flow (useProductQAStore)
5. Product status: PENDING_DIGITAL_REVIEW
```

**Key Code:**
```typescript
const { addProduct } = useSellerStore.getState();
addProduct(newProduct);

addProductToQA({
  id: newProduct.id,
  name: newProduct.name,
  description: newProduct.description,
  vendor: seller?.storeName || 'Tech Shop PH',
  price: newProduct.price,
  category: newProduct.category,
  image: firstImage,
  images: validImages,
});
```

### 2. Admin Digital Review
**File:** `mobile-app/app/admin/(tabs)/product-approvals.tsx`

**Process:**
```typescript
1. Admin views pendingDigitalReview list
2. Reviews product details and images
3. Options:
   a. Approve → approveForSampleSubmission()
      - Status changes to: WAITING_FOR_SAMPLE
      - Seller notified to submit sample
   b. Reject → rejectDigitalReview()
      - Status changes to: REJECTED
      - Seller sees rejection reason
```

**Key Functions:**
- `useAdminProductQA().pendingDigitalReview` - Get products awaiting digital review
- `approveForSampleSubmission(id, notes)` - Approve listing
- `rejectDigitalReview(id, reason)` - Reject listing

### 3. Seller Sample Submission
**File:** `mobile-app/app/seller/(tabs)/qa-products.tsx`

**Process:**
```typescript
1. Seller sees products with status: WAITING_FOR_SAMPLE
2. Chooses logistics method:
   - drop_off_courier: Seller sends via courier
   - company_pickup: BazaarPH picks up
   - meetup: Arrange meetup point
3. submitSample() updates status to: IN_QUALITY_REVIEW
```

### 4. Admin Physical QA
**File:** `mobile-app/app/admin/(tabs)/product-approvals.tsx`

**Process:**
```typescript
1. Admin views inQualityReview list
2. Physically inspects product sample
3. Options:
   a. Pass → passQualityCheck()
      - Status changes to: ACTIVE_VERIFIED
      - Product goes live on marketplace
   b. Fail → failQualityCheck()
      - Status changes to: REJECTED
      - Product removed from marketplace
```

## 🗄️ Data Store Architecture

### Seller Store (useProductQAStore)
**File:** `mobile-app/src/stores/productQAStore.ts`

**States:**
- PENDING_DIGITAL_REVIEW
- WAITING_FOR_SAMPLE  
- IN_QUALITY_REVIEW
- ACTIVE_VERIFIED
- FOR_REVISION
- REJECTED

**Key Methods:**
- `addProductToQA()` - Submit new product
- `submitSample()` - Send sample to admin
- `getProductsByStatus()` - Filter by QA status

### Admin Store (useAdminProductQA)
**File:** `mobile-app/src/stores/adminStore.ts`

**States:**
- pendingDigitalReview[]
- waitingForSample[]
- inQualityReview[]
- activeVerified[]
- rejected[]

**Key Methods:**
- `approveForSampleSubmission()` - Approve listing
- `rejectDigitalReview()` - Reject listing
- `passQualityCheck()` - Pass physical QA
- `failQualityCheck()` - Fail physical QA

## 🔐 Account Switching Verification

### Admin to Seller Switch Test
1. **Login as Admin:**
   - Email: `admin@bazaarph.com`
   - Password: `admin123`
   - Navigate to: Admin Product Approvals tab

2. **Logout from Admin:**
   - Admin Profile → Logout
   - Redirects to: AdminLogin screen

3. **Login as Seller:**
   - From HomeScreen → "Start Selling" button
   - Navigate to: Seller Login
   - Email: `seller@bazaarx.ph`
   - Password: `seller123`

4. **Verify Seller Portal:**
   - Should see: SellerTabs (5 tabs)
   - Products tab shows seller's products
   - QA Products tab shows QA status

### Seller to Admin Switch Test
1. **Login as Seller:**
   - Seller Portal accessible
   - Can submit products

2. **Logout from Seller:**
   - Settings → Logout
   - Returns to: Seller Login

3. **Switch to Admin:**
   - Navigate to: HomeScreen
   - Go to Admin Login (if accessible)
   - Or use deep link/navigation

## ✅ Verification Checklist

### Seller Side:
- [ ] Can submit new products
- [ ] Products appear in QA Products tab with status
- [ ] Can submit sample when status is WAITING_FOR_SAMPLE
- [ ] Receives rejection notifications
- [ ] Can see active verified products

### Admin Side:
- [ ] Can view pendingDigitalReview products
- [ ] Can approve/reject digital review
- [ ] Can view inQualityReview products
- [ ] Can pass/fail quality check
- [ ] Can see rejection history

### Account Switching:
- [ ] Admin logout works correctly
- [ ] Seller logout works correctly
- [ ] Can switch between admin/seller without errors
- [ ] Store states persist correctly
- [ ] No data leakage between roles

## 🐛 Common Issues & Solutions

### Issue 1: Products not syncing between stores
**Solution:** Both stores use AsyncStorage persistence. They are independent but can be linked via product ID.

### Issue 2: Status not updating after action
**Solution:** Ensure both stores update their respective states:
```typescript
// In adminStore
await approveForSampleSubmission(id);
// Should also update productQAStore
useProductQAStore.getState().approveForSampleSubmission(id);
```

### Issue 3: Account switch shows old data
**Solution:** Clear store cache or force reload:
```typescript
useAdminProductQA.getState().loadProducts();
useProductQAStore.getState().resetToInitialState();
```

## 📊 Demo Data

### Seller QA Products:
1. **Vitamin C Serum** - PENDING_DIGITAL_REVIEW
2. **Wireless Earbuds** - WAITING_FOR_SAMPLE
3. **Chili Garlic Oil** - IN_QUALITY_REVIEW
4. **Gaming Mouse** - ACTIVE_VERIFIED
5. **Face Mask** - REJECTED

### Admin Product Approvals:
- **Digital Review Queue:** 3 products
- **Physical QA Queue:** 2 products
- **Active Verified:** 5 products
- **Rejected:** 2 products

## 🔧 Testing Commands

```bash
# Check TypeScript errors
cd mobile-app
npx tsc --noEmit

# Run app
npm run start

# Test on iOS simulator
npm run ios

# Test on Android emulator
npm run android
```

## 📝 Notes

1. **Data Persistence:** Both stores use AsyncStorage, so data persists across sessions
2. **Real-time Sync:** Currently stores are independent. For production, implement WebSocket sync
3. **Notifications:** Add push notifications when QA status changes
4. **Image Upload:** Currently using URLs. Implement actual image upload for production
5. **Validation:** Add server-side validation for QA actions

## 🎯 Next Steps

1. **Implement Store Sync:**
   - Add listener when admin approves → update seller store
   - Add listener when seller submits → update admin store

2. **Add Notifications:**
   - Push notifications for QA status changes
   - Email notifications for important actions

3. **Add Analytics:**
   - Track QA approval times
   - Monitor rejection rates
   - Measure time-to-market

4. **Enhance Security:**
   - Add role-based access control
   - Implement JWT authentication
   - Add action logging/audit trail

---

**Last Updated:** January 9, 2026  
**Status:** ✅ All TypeScript errors fixed  
**Version:** 1.0.0
