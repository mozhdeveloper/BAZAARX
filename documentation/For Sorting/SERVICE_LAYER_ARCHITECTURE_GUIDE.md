# BAZAARX Service Layer Architecture - Refactoring Guide

**Date:** January 27, 2026  
**Author:** Development Team  
**Version:** 1.0  

---

## 📋 Table of Contents

1. [Original Architecture Issues](#original-architecture-issues)
2. [Changes Made](#changes-made)
3. [Service Layer Pattern](#service-layer-pattern)
4. [Implementation Examples](#implementation-examples)
5. [Pattern Checklist](#pattern-checklist)

---

## 🔴 Original Architecture Issues

### Problem 1: Tight Coupling
**Location:** Throughout pages and stores  
**Issue:** Direct Supabase client usage scattered across the codebase

```typescript
// ❌ BAD: Direct database calls in components
// BuyerSettingsPage.tsx (Line 197)
const { supabase } = await import('../lib/supabase');
await supabase.from('addresses').update({ is_default: false });
await supabase.from('addresses').insert([dbPayload]);
await supabase.from('addresses').delete().eq('id', address.id);

// ❌ BAD: Direct database calls in stores
// sellerStore.ts (Line 572)
const { error } = await supabase.from('sellers').upsert(sellerRow, {
  onConflict: 'id',
  ignoreDuplicates: false
});
```

**Consequences:**
- 🔴 **Hard to test** - Can't mock database calls without complex setup
- 🔴 **Not reusable** - Same queries duplicated across files
- 🔴 **Difficult to maintain** - Changes require editing multiple files
- 🔴 **Poor separation of concerns** - Business logic mixed with data access

---

### Problem 2: Inconsistent Error Handling
**Issue:** Mix of error handling strategies across the codebase

```typescript
// ❌ BAD: Inconsistent error handling
// BuyerSettingsPage.tsx
try {
  const { error } = await supabase.from('addresses').delete();
  // No error feedback to user!
} catch (error) {
  console.error(error); // Silent failure
}

// CheckoutPage.tsx
try {
  const { error } = await supabase.from('addresses').insert([data]);
  if (error) throw error;
} catch (error) {
  console.error("Error:", error); // No user notification
}
```

**Consequences:**
- 🔴 **Poor UX** - Users don't see what went wrong
- 🔴 **Hard to debug** - Errors only in console
- 🔴 **No centralized logging** - Can't track failures

---

### Problem 3: Redundant Code
**Issue:** Same database operations duplicated in multiple places

```typescript
// ❌ BAD: Database mapping logic duplicated
// OrderDetailPage.tsx (Line 111-145)
let query = supabase.from("orders").select(`
  *,
  order_items(*)
`);
const isUuid = /^[0-9a-f]{8}-...$/i.test(orderId);
if (isUuid) {
  query = query.eq("id", orderId);
} else {
  query = query.eq("order_number", orderId);
}

// DeliveryTrackingPage.tsx (Line 59-95)
// EXACT SAME CODE DUPLICATED!
let query = supabase.from("orders").select(`
  *,
  order_items(*)
`);
// ... same logic repeated
```

**Consequences:**
- 🔴 **Code duplication** - Same logic in 2+ places
- 🔴 **Bug multiplication** - Fix in one place, bug remains elsewhere
- 🔴 **Hard to update** - Need to change multiple files

---

### Problem 4: No Type Safety in Data Transformations
**Issue:** Database-to-UI transformations scattered without type guards

```typescript
// ❌ BAD: Inline transformations without validation
const mappedOrder = {
  id: orderData.id,
  total: parseFloat(order.total_amount?.toString() || '0'), // Unsafe!
  status: statusMap[order.status] || 'pending', // No validation
  // ... 30 more lines of mapping
};
```

**Consequences:**
- 🔴 **Runtime errors** - No compile-time safety
- 🔴 **Inconsistent data** - Different mappings in different files
- 🔴 **Hard to refactor** - Schema changes require updating many files

---

## ✅ Changes Made

### Service Classes Created

#### 1. **addressService.ts** (236 lines)
Centralizes all address-related database operations.

**Methods:**
```typescript
class AddressService {
  getUserAddresses(userId: string): Promise<Address[]>
  createAddress(address: AddressInsert): Promise<Address>
  updateAddress(id: string, updates: AddressUpdate): Promise<Address>
  deleteAddress(id: string): Promise<void>
  setDefaultAddress(userId: string, addressId: string): Promise<void>
  getDefaultAddress(userId: string): Promise<Address | null>
}
```

**Benefits:**
- ✅ Single source of truth for address operations
- ✅ Consistent error handling with proper exceptions
- ✅ Type-safe transformations (DB → UI models)
- ✅ Easy to test with mocks

---

#### 2. **sellerService.ts** (211 lines)
Handles all seller-related business logic.

**Methods:**
```typescript
class SellerService {
  getSellerById(sellerId: string): Promise<SellerData | null>
  upsertSeller(seller: SellerInsert): Promise<SellerData | null>
  updateSeller(sellerId: string, updates: SellerUpdate): Promise<SellerData | null>
  getAllSellers(): Promise<SellerData[]>
  approveSeller(sellerId: string): Promise<boolean>
  rejectSeller(sellerId: string, reason: string): Promise<boolean>
  getSellerStats(sellerId: string): Promise<any>
  updateSellerRating(sellerId: string): Promise<boolean>
}
```

**Benefits:**
- ✅ Admin operations separated from seller operations
- ✅ Clear approval workflow methods
- ✅统一 rating calculation logic

---

#### 3. **adminService.ts** (141 lines)
Admin-specific operations for platform management.

**Methods:**
```typescript
class AdminService {
  getAdminById(adminId: string): Promise<AdminData | null>
  getPendingSellers(): Promise<SellerData[]>
  getPlatformStats(): Promise<any>
  getAllBuyers(): Promise<any[]>
  getAllOrders(): Promise<any[]>
  banUser(userId: string, userType: 'buyer' | 'seller'): Promise<boolean>
}
```

**Benefits:**
- ✅ Admin logic isolated from business logic
- ✅ Platform-wide statistics centralized
- ✅ User management operations grouped

---

### Files Refactored

#### **Pages:**

**BuyerSettingsPage.tsx** - 3 refactorings
```typescript
// ✅ BEFORE: Direct Supabase calls
await supabase.from('addresses').update(dbPayload);
await supabase.from('addresses').insert([dbPayload]);
await supabase.from('addresses').delete().eq('id', id);

// ✅ AFTER: Service layer
const { addressService } = await import('../services/addressService');
await addressService.updateAddress(id, addressPayload);
await addressService.createAddress(addressPayload);
await addressService.deleteAddress(id);
```

**CheckoutPage.tsx** - 1 refactoring
```typescript
// ✅ BEFORE
const { data, error } = await supabase.from('addresses').insert([payload]);

// ✅ AFTER
const { addressService } = await import('../services/addressService');
const savedAddress = await addressService.createAddress(payload);
```

---

#### **Stores:**

**sellerStore.ts** - Critical refactoring
```typescript
// ✅ BEFORE: Direct upsert in registration
const { error } = await supabase.from('sellers').upsert(sellerRow, {
  onConflict: 'id',
  ignoreDuplicates: false
});

// ✅ AFTER: Service method
const { sellerService } = await import('@/services/sellerService');
const savedSeller = await sellerService.upsertSeller(sellerData);
```

---

## 🎯 Service Layer Pattern

### Core Principles

#### 1. **Separation of Concerns**
- **Services** = Database access + Business logic
- **Stores** = State management + UI logic
- **Pages** = UI rendering + User interaction

#### 2. **Single Responsibility**
- Each service handles ONE domain (addresses, sellers, orders, etc.)
- Each method does ONE thing
- Clear, descriptive method names

#### 3. **Type Safety**
- Services define clear input/output types
- Database types → Service types → UI types
- No `any` types in service interfaces

#### 4. **Error Handling**
- Services throw meaningful errors
- Calling code handles user feedback
- Consistent error patterns

---

### File Organization

```
src/
├── services/              # ✅ Service Layer (Business Logic)
│   ├── addressService.ts
│   ├── sellerService.ts
│   ├── adminService.ts
│   ├── orderService.ts
│   ├── productService.ts
│   └── cartService.ts
│
├── stores/               # State Management (UI State)
│   ├── buyerStore.ts    # Uses services, no direct DB calls
│   ├── sellerStore.ts   # Uses services, no direct DB calls
│   └── adminStore.ts    # Uses services, no direct DB calls
│
└── pages/               # UI Components
    ├── BuyerSettingsPage.tsx    # Uses services
    ├── CheckoutPage.tsx         # Uses services
    └── OrderDetailPage.tsx      # Uses services
```

---

## 💡 Implementation Examples

### Example 1: Creating a New Service

**Scenario:** You need to add review management functionality.

**Step 1: Create the service file**
```typescript
// services/reviewService.ts
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface Review {
  id: string;
  productId: string;
  buyerId: string;
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
}

type ReviewInsert = Omit<Review, 'id' | 'createdAt'>;

export class ReviewService {
  /**
   * Get reviews for a product
   */
  async getProductReviews(productId: string): Promise<Review[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw new Error('Failed to fetch reviews');
    }
  }

  /**
   * Submit a review
   */
  async createReview(review: ReviewInsert): Promise<Review> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured');
    }

    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([review])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating review:', error);
      throw new Error('Failed to submit review');
    }
  }
}

// Export singleton
export const reviewService = new ReviewService();
```

**Step 2: Use in your component**
```typescript
// pages/ProductDetailPage.tsx
import { reviewService } from '@/services/reviewService';

const loadReviews = async () => {
  try {
    const reviews = await reviewService.getProductReviews(productId);
    setReviews(reviews);
  } catch (error) {
    toast.error('Failed to load reviews');
  }
};

const submitReview = async () => {
  try {
    await reviewService.createReview({
      productId,
      buyerId: user.id,
      rating: selectedRating,
      comment: reviewText,
      images: uploadedImages
    });
    toast.success('Review submitted!');
    loadReviews(); // Refresh
  } catch (error) {
    toast.error('Failed to submit review');
  }
};
```

---

### Example 2: Refactoring Existing Code

**BEFORE:** Direct Supabase call in page
```typescript
// ❌ OLD WAY
const handleDeleteProduct = async (productId: string) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) throw error;
    alert('Product deleted');
  } catch (error) {
    console.error(error);
    alert('Failed to delete');
  }
};
```

**AFTER:** Using service layer
```typescript
// ✅ NEW WAY

// 1. Add method to productService.ts
export class ProductService {
  async deleteProduct(productId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Database not configured');
    }

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }
}

// 2. Use in component
const handleDeleteProduct = async (productId: string) => {
  try {
    const { productService } = await import('@/services/productService');
    await productService.deleteProduct(productId);
    toast.success('Product deleted successfully');
    refreshProducts(); // Refresh the list
  } catch (error) {
    toast.error('Failed to delete product');
  }
};
```

---

## ✅ Pattern Checklist

Use this checklist when adding new features:

### For New Database Operations:

- [ ] **Check if service exists** for this domain
  - If NO → Create new service file in `/services/`
  - If YES → Add method to existing service

- [ ] **Service class follows pattern:**
  ```typescript
  export class MyService {
    async myMethod(params): Promise<ReturnType> {
      if (!isSupabaseConfigured()) {
        throw new Error('Database not configured');
      }
      
      try {
        const { data, error } = await supabase.from('table')...;
        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Error description:', error);
        throw new Error('User-friendly message');
      }
    }
  }
  ```

- [ ] **Export singleton instance:**
  ```typescript
  export const myService = new MyService();
  ```

- [ ] **Use service in component:**
  ```typescript
  const { myService } = await import('@/services/myService');
  const result = await myService.myMethod(params);
  ```

- [ ] **Handle errors in UI:**
  ```typescript
  try {
    await myService.method();
    toast.success('Success message');
  } catch (error) {
    toast.error('Error message');
  }
  ```

---

### For Stores:

- [ ] **NO direct `supabase.from()` calls**
- [ ] **Only use services for data access**
- [ ] **Only use `supabase.auth` for authentication** ✅ (This is OK)
- [ ] **Only use `supabase.channel()` for realtime** ✅ (This is OK)

---

### Code Review Checklist:

Before merging code, verify:

- [ ] No `await supabase.from(` in pages or stores
- [ ] All database operations go through services
- [ ] Services have proper error handling
- [ ] Services return typed data (no `any`)
- [ ] Components show user feedback (toast/alert) for errors
- [ ] Service methods are testable (can be mocked)

---

## 🚀 Benefits Achieved

### Before → After Comparison

| Aspect | Before | After |
|--------|--------|-------|
| **Testability** | Hard (need full Supabase mock) | Easy (mock service) |
| **Maintainability** | Change in 5+ files | Change in 1 service |
| **Code Reuse** | Copy-paste queries | Import service |
| **Error Handling** | Inconsistent | Centralized |
| **Type Safety** | Weak (inline transforms) | Strong (typed services) |
| **Debugging** | Hard (scattered logic) | Easy (centralized) |

---

## 📚 Related Files

- **Comprehensive Analysis:** [`bazaarx_comprehensive_analysis.md`](./bazaarx_comprehensive_analysis.md)
- **Refactoring Progress:** [`refactoring_progress.md`](./refactoring_progress.md)
- **Task Checklist:** [`task.md`](./task.md)

---

## 🎓 Key Takeaway

> **"Database operations should NEVER be called directly in pages or stores. Always use a service."**

This simple rule ensures:
- ✅ Clean, maintainable code
- ✅ Easy testing
- ✅ Consistent error handling
- ✅ Scalable architecture

**When in doubt, ask yourself:** 
> "If I need this same query somewhere else, will I copy-paste this code?"

If the answer is YES → **Create a service method!**

---

**Document Version:** 1.0  
**Last Updated:** January 27, 2026  
**Maintained By:** BAZAARX Development Team
