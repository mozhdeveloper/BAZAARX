# Data Sync Architecture - Mobile vs Web

**Date:** January 8, 2026  
**Status:** ⚠️ Important Information

---

## 🔍 Current Architecture

### Storage Layer Reality

The BazaarX platform currently uses **local storage** for both mobile and web:

```
┌─────────────────────────────────────────────────────────────┐
│                      MOBILE APP                              │
│  Platform: iOS/Android (React Native)                       │
│  Storage: AsyncStorage (Device Local Storage)               │
│  Key: 'bazaarx-product-qa-shared'                           │
│  Location: /data/data/com.bazaarx/files/AsyncStorage        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      WEB APP                                 │
│  Platform: Browser (React)                                   │
│  Storage: localStorage (Browser Storage)                    │
│  Key: 'bazaarx-product-qa-shared'                           │
│  Location: Browser Storage (e.g., Chrome DevTools)          │
└─────────────────────────────────────────────────────────────┘
```

### ⚠️ Key Point: **No Automatic Cross-Platform Sync**

Mobile `AsyncStorage` and Web `localStorage` are **completely separate storage systems**:
- Mobile stores data on the physical device
- Web stores data in the browser
- They **DO NOT** automatically sync with each other

---

## ✅ What IS Working

### 1. **Same Storage Key**
Both platforms use the same storage key: `'bazaarx-product-qa-shared'`

### 2. **Identical Data Structure**
Both implement the same interfaces:
```typescript
// Mobile & Web - Identical Interface
export interface QAProduct {
  id: string;
  name: string;
  description?: string;
  vendor: string;
  price: number;
  originalPrice?: number;
  category: string;
  status: ProductQAStatus;
  logistics: string | null;
  image: string;
  images?: string[];
  // ... other fields
}
```

### 3. **Same Store Logic**
Both use Zustand with persist middleware and implement identical actions.

---

## ❌ What Is NOT Working (By Design)

### **Cross-Platform Data Visibility**

```
❌ Mobile Product → Web Admin
   (Different storage systems)

❌ Web Product → Mobile App
   (Different storage systems)
```

**Why?**
- Mobile app runs on a device (phone/simulator)
- Web app runs in a browser
- No shared storage between these environments

---

## 🧪 How to Test the QA Flow

### Option 1: **Web-to-Web Testing** ✅ WORKS
```
1. Open web app in browser
2. Login as Seller → /seller/products
3. Add product via web seller form
4. Product saves to browser localStorage
5. Open new tab → /admin/product-approvals
6. Admin can see and approve the product ✅
```

### Option 2: **Mobile-to-Mobile Testing** ✅ WORKS
```
1. Open mobile app on device/simulator
2. Login as Seller
3. Add product via mobile seller form
4. Product saves to device AsyncStorage
5. Navigate to QA Products tab
6. Can see product status ✅
```

### Option 3: **Export/Import Data** ⚙️ Manual
```
1. Add product on mobile
2. Export AsyncStorage data
3. Import to browser localStorage
4. Admin can now see it
```

---

## 🚀 Production Solution: Backend API

For **real cross-platform sync**, implement a backend:

### Architecture with Backend:
```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   MOBILE APP    │      │   BACKEND API   │      │    WEB ADMIN    │
│                 │      │                 │      │                 │
│  Add Product ───┼──────┼───> POST        │      │                 │
│                 │      │     /products   │      │                 │
│                 │      │                 │      │                 │
│                 │      │   Shared DB     │      │                 │
│                 │      │   PostgreSQL    │      │                 │
│                 │      │   MySQL         │      │                 │
│                 │      │   MongoDB       │      │                 │
│                 │      │                 │      │                 │
│  View Status ◄──┼──────┼───  GET         │◄─────┼─ View Products │
│                 │      │     /products   │      │   Approve/Reject│
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### Implementation Steps:

#### 1. **Backend Setup** (Node.js + Express example)
```javascript
// server.js
const express = require('express');
const app = express();

// POST /api/products - Add product
app.post('/api/products', async (req, res) => {
  const product = req.body;
  await db.products.insert(product);
  res.json({ success: true, id: product.id });
});

// GET /api/products - Get all products
app.get('/api/products', async (req, res) => {
  const products = await db.products.findAll();
  res.json(products);
});

// PATCH /api/products/:id/approve - Approve product
app.patch('/api/products/:id/approve', async (req, res) => {
  await db.products.update({ status: 'WAITING_FOR_SAMPLE' });
  res.json({ success: true });
});
```

#### 2. **Update Mobile Store**
```typescript
// mobile-app/src/stores/productQAStore.ts
const API_URL = 'https://api.bazaarx.com';

addProductToQA: async (productData) => {
  try {
    // Save to API instead of AsyncStorage
    const response = await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...productData,
        status: 'PENDING_DIGITAL_REVIEW',
        submittedAt: new Date().toISOString(),
      }),
    });
    
    const data = await response.json();
    
    // Update local state
    set((state) => ({
      products: [...state.products, data.product],
    }));
  } catch (error) {
    console.error('Failed to add product:', error);
  }
},
```

#### 3. **Update Web Admin Store**
```typescript
// web/src/stores/productQAStore.ts
const API_URL = 'https://api.bazaarx.com';

// Fetch products on load
const useProductQAStore = create<ProductQAStore>()(
  (set, get) => ({
    products: [],
    
    // Load products from API
    loadProducts: async () => {
      const response = await fetch(`${API_URL}/api/products`);
      const products = await response.json();
      set({ products });
    },
    
    approveForSampleSubmission: async (productId) => {
      await fetch(`${API_URL}/api/products/${productId}/approve`, {
        method: 'PATCH',
      });
      // Reload products
      get().loadProducts();
    },
  })
);
```

---

## 📊 Comparison: Current vs With Backend

| Feature | Current (Local Storage) | With Backend API |
|---------|-------------------------|------------------|
| Mobile Add Product | ✅ Works locally | ✅ Syncs to server |
| Web See Mobile Products | ❌ Can't see | ✅ Can see |
| Admin Approve Mobile Products | ❌ Can't see | ✅ Can approve |
| Real-time Sync | ❌ No sync | ✅ Real-time |
| Multi-device | ❌ Device-specific | ✅ Works everywhere |
| Offline Support | ✅ Works offline | ⚠️ Needs internet |
| Data Persistence | ✅ Local only | ✅ Cloud backup |

---

## 🎯 Current Best Practice for Development

### For Testing Without Backend:

1. **Test Seller Features on Web:**
   - Use `/seller/products` to add products
   - Use `/admin/product-approvals` to approve
   - Both share browser localStorage ✅

2. **Test Mobile UI/UX:**
   - Test mobile form layout and validation
   - Test image upload functionality
   - Test navigation and user experience

3. **Verify Data Structure:**
   - Both platforms create identical data
   - Console.log products to verify structure
   - Ensure all fields match

### Mock Backend Testing:
```typescript
// Create a mock sync function for development
const syncToMockBackend = async (product: QAProduct) => {
  console.log('📤 Would sync to backend:', product);
  // In real implementation, this would POST to API
  localStorage.setItem(`mock-api-product-${product.id}`, JSON.stringify(product));
};
```

---

## ✅ Summary

### What We Have Now:
- ✅ Identical data structures (mobile & web)
- ✅ Same storage key naming
- ✅ Same QA workflow logic
- ✅ Perfect form parity

### What We Need for Cross-Platform Sync:
- ⏳ Backend API server
- ⏳ Network requests instead of local storage
- ⏳ Authentication/authorization
- ⏳ Real-time updates (WebSockets/polling)

### Current Workaround:
**Test all features on web** until backend is implemented:
- Seller adds product: `/seller/products`
- Admin approves product: `/admin/product-approvals`
- Both work perfectly in same browser environment ✅

---

## 🔧 Quick Fix for Immediate Testing

If you need to test mobile products in web admin right now:

1. **Add product on mobile**
2. **Get AsyncStorage data:**
   ```javascript
   // In mobile app, add this code temporarily
   import AsyncStorage from '@react-native-async-storage/async-storage';
   
   const exportData = async () => {
     const data = await AsyncStorage.getItem('bazaarx-product-qa-shared');
     console.log('Export this:', data);
   };
   ```

3. **Import to web:**
   ```javascript
   // In browser console
   localStorage.setItem('bazaarx-product-qa-shared', 'PASTE_DATA_HERE');
   location.reload();
   ```

This is **manual** but works for testing!

---

**Recommendation:** Implement backend API for production use. Until then, test seller and admin workflows on the same platform (both on web).
