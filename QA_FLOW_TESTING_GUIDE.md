# Product Quality Assurance Flow - Testing Guide

## 🧪 Test Data Storage

The QA flow uses **Zustand with localStorage persistence**. All product data is automatically saved to your browser's localStorage under the key `product-qa-storage`.

- ✅ Data persists across page refreshes
- ✅ Data persists across browser sessions
- ✅ Each browser/device has separate test data
- ⚠️ Clearing browser data will reset the flow

## 🔄 How to Test the Complete Flow

### **Prerequisites**
1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:5173`

### **Step 1: View Initial State**

**Admin Side** (`/admin/product-approvals`):
- Open the Admin Product Approvals page
- You should see 4 products in different states:
  - PROD-001 (Vitamin C Serum) - PENDING_DIGITAL_REVIEW
  - PROD-002 (Wireless Earbuds) - WAITING_FOR_SAMPLE
  - PROD-003 (Chili Garlic Oil) - IN_QUALITY_REVIEW
  - PROD-004 (Heavy Duty Shelf) - ACTIVE_VERIFIED

**Seller Side** (`/seller/product-status-qa`):
- Login as a seller first
- Navigate to "QA Status" from the sidebar
- View all 4 products with their current statuses

### **Step 2: Test Digital Approval (Admin)**

1. Go to `/admin/product-approvals`
2. Click the **"Digital Review"** tab
3. Find "Vitamin C Serum" (PROD-001)
4. Click **"Approve for Sample Submission"**
5. ✅ Toast notification should appear
6. ✅ Product disappears from Digital Review tab
7. ✅ Product appears in History tab with "Awaiting Sample" status

### **Step 3: Test Sample Submission (Seller)**

1. Go to `/seller/product-status-qa`
2. Find "Vitamin C Serum" (now with orange "Action Required" badge)
3. Click **"Submit Sample"** button
4. Modal opens with 2 logistics options:
   - **Drop-off/Courier** (Free)
   - **Company Pickup** (+₱500)
5. Select either option
6. Click **"Confirm Submission"**
7. ✅ Toast notification should appear
8. ✅ Product badge changes to blue "In QA Lab"
9. ✅ Logistics method is displayed

### **Step 4: Test Quality Check (Admin)**

1. Go to `/admin/product-approvals`
2. Click the **"Physical QA Queue"** tab
3. Find "Vitamin C Serum" (should show logistics method)
4. Click **"Pass Quality Check"**
5. ✅ Success toast with "Badge Awarded" message
6. ✅ Product disappears from QA Queue
7. ✅ Product appears in History with green "Verified Active" badge

### **Step 5: Verify on Seller Side**

1. Go to `/seller/product-status-qa`
2. Find "Vitamin C Serum"
3. ✅ Should have green "Verified Active" badge
4. ✅ Checkmark icon should appear
5. ✅ No action button (flow complete)

---

## 🧹 Reset Test Data

**Method 1: Admin Page Reset Button**
1. Go to `/admin/product-approvals`
2. Click **"Reset Test Data"** button in the top-right
3. All products reset to initial state

**Method 2: Browser DevTools**
1. Open DevTools (F12)
2. Go to **Application** > **Local Storage**
3. Find `product-qa-storage`
4. Delete the entry
5. Refresh the page

**Method 3: Code**
```javascript
// In browser console
localStorage.removeItem('product-qa-storage')
location.reload()
```

---

## 🧪 Test Rejection Flow

### **Test Product Rejection from Digital Review**

1. Go to `/admin/product-approvals`
2. Go to "Digital Review" tab
3. Click **"Reject"** button on a product
4. Enter a rejection reason (e.g., "Incomplete product documentation")
5. Click **"Confirm Rejection"**
6. ✅ Product gets red "Rejected" badge
7. ✅ Appears in History tab
8. Go to `/seller/product-status-qa`
9. ✅ Product shows rejection reason

### **Test Product Failure from QA**

1. Go to `/admin/product-approvals`
2. Go to "Physical QA Queue" tab
3. Click **"Fail QA"** button
4. Enter failure reason (e.g., "Product does not meet quality standards")
5. Click **"Confirm Rejection"**
6. ✅ Product marked as rejected
7. ✅ Seller can see the reason

---

## 📊 Test Data Persistence

### **Test Browser Refresh**
1. Make changes to product statuses
2. Refresh the page (F5)
3. ✅ All changes should persist

### **Test Cross-Tab Sync**
1. Open `/admin/product-approvals` in Tab 1
2. Open `/seller/product-status-qa` in Tab 2
3. Approve a product in Tab 1
4. Switch to Tab 2 and refresh
5. ✅ Changes should be reflected

### **Test After Browser Restart**
1. Make changes to product statuses
2. Close the browser completely
3. Reopen browser and navigate back
4. ✅ All changes should persist

---

## 🎯 Complete Test Checklist

### **Admin Functionality**
- [ ] Can view products in Digital Review tab
- [ ] Can approve products for sample submission
- [ ] Can reject products from Digital Review
- [ ] Can view products in Physical QA Queue
- [ ] Can pass quality checks
- [ ] Can fail quality checks
- [ ] Can view all products in History tab
- [ ] Toast notifications appear for all actions
- [ ] Reset button resets all data
- [ ] Stats cards update correctly

### **Seller Functionality**
- [ ] Can view all products with correct status badges
- [ ] Can submit samples for approved products
- [ ] Sample submission modal opens correctly
- [ ] Can select logistics method (both options work)
- [ ] Toast notifications appear on submission
- [ ] Cannot submit samples for non-approved products
- [ ] Can view rejection reasons
- [ ] Can see verified badge for passed products
- [ ] Sidebar navigation works on all pages
- [ ] Stats cards show correct counts

### **Data Persistence**
- [ ] Data persists after page refresh
- [ ] Data persists after browser restart
- [ ] Reset button clears data correctly
- [ ] LocalStorage updates properly

---

## 🐛 Troubleshooting

### **Products not updating?**
- Check browser console for errors
- Verify localStorage is enabled
- Try the reset button
- Clear localStorage manually

### **Toast notifications not showing?**
- Verify `<Toaster />` is in App.tsx
- Check that no errors in console
- Try a hard refresh (Ctrl+Shift+R)

### **Seller login required?**
- Navigate to `/seller/auth`
- Use the seller registration flow
- Or check if `ProtectedSellerRoute` is working

---

## 📝 Test Scenarios

### **Scenario 1: Happy Path (Complete Flow)**
1. Admin approves product → WAITING_FOR_SAMPLE
2. Seller submits sample → IN_QUALITY_REVIEW
3. Admin passes QA → ACTIVE_VERIFIED
4. ✅ Product is live with verified badge

### **Scenario 2: Early Rejection**
1. Admin reviews product → Rejects immediately
2. Product status → REJECTED
3. ✅ Seller sees rejection reason

### **Scenario 3: QA Failure**
1. Admin approves → WAITING_FOR_SAMPLE
2. Seller submits sample → IN_QUALITY_REVIEW
3. Admin fails QA → REJECTED
4. ✅ Seller sees failure reason

---

## 💾 Data Structure in localStorage

```json
{
  "state": {
    "products": [
      {
        "id": "PROD-001",
        "name": "Vitamin C Serum",
        "vendor": "Glow Cosmetics",
        "price": 1500,
        "category": "Beauty",
        "status": "PENDING_DIGITAL_REVIEW",
        "logistics": null,
        "image": "https://placehold.co/100?text=Serum",
        "submittedAt": "2024-12-20T10:30:00Z"
      }
    ]
  },
  "version": 0
}
```

---

## 🎉 Success Criteria

The QA flow is working correctly when:

✅ Products can move through all 4 statuses  
✅ Both admin and seller see updated statuses  
✅ Toast notifications appear for all actions  
✅ Data persists across refreshes  
✅ Rejection reasons are stored and displayed  
✅ Logistics methods are saved and shown  
✅ Reset button restores initial state  
✅ Navigation works across all pages  
✅ No console errors appear  
✅ Build completes without errors
