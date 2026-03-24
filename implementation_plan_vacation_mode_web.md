# Seller Vacation Mode - Web Implementation Plan

## Overview

Enable sellers to mark their store as "on vacation." When active:
- Products remain visible but show an "On Vacation" badge
- ProductDetailPage shows a "Store Temporarily Unavailable" banner
- Add to Cart and Buy Now buttons are disabled
- Modals (BuyNowModal, VariantSelectionModal) disable their confirm buttons
- Buyers see a "Store on Vacation" message instead of purchase options
- Checkout is blocked if cart contains items from vacation sellers (even if added before vacation mode was enabled)

---

## Step 1: Database Migration

Run this SQL in Supabase:

```sql
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS is_vacation_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vacation_reason TEXT;

COMMENT ON COLUMN sellers.is_vacation_mode IS 'When true, products are visible but cannot be purchased';
COMMENT ON COLUMN sellers.vacation_reason IS 'vacation | personal | maintenance | other';
```

---

## Step 2: Update Types

### File: `web/src/types/database.types.ts`

Add `VacationReason` type and update `Seller` interface:

```typescript
// Add this type
export type VacationReason = 'vacation' | 'personal' | 'maintenance' | 'other';

// In the Seller interface, add:
export interface Seller {
  // ... existing fields ...
  is_vacation_mode?: boolean;
  vacation_reason?: VacationReason | null;
}
```

### File: `web/src/stores/seller/sellerTypes.ts`

Update the `Seller` interface:

```typescript
import type { VacationReason } from '@/types/database.types';

export interface Seller {
  // ... existing fields ...

  // Vacation Mode
  isVacationMode?: boolean;
  vacationReason?: VacationReason | null;
}
```

### File: `web/src/types/shop.ts`

Add to `ShopProduct`:

```typescript
export type ShopProduct = {
  // ... existing fields ...
  isVacationMode?: boolean;
};
```

### File: `web/src/stores/cartStore.ts`

Add `isVacationMode` to the `Product` interface:

```typescript
export interface Product {
  // ... existing fields ...
  isVacationMode?: boolean;
}
```

---

## Step 3: Update Seller Mapper

### File: `web/src/stores/seller/sellerHelpers.ts`

In `mapDbSellerToSeller`, add:

```typescript
export const mapDbSellerToSeller = (s: any): Seller => {
  return {
    // ... existing mappings ...

    // Vacation mode
    isVacationMode: s.is_vacation_mode === true,
    vacationReason: s.vacation_reason || null,
  };
};
```

---

## Step 4: Update Seller Service

### File: `web/src/services/sellerService.ts`

Add two new methods to the `SellerService` class:

```typescript
/**
 * Enable vacation mode for a seller
 */
async enableVacationMode(
  sellerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('sellers')
      .update({
        is_vacation_mode: true,
        vacation_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sellerId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error enabling vacation mode:', error);
    return { success: false, error: 'Failed to enable vacation mode' };
  }
}

/**
 * Disable vacation mode for a seller
 */
async disableVacationMode(sellerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('sellers')
      .update({
        is_vacation_mode: false,
        vacation_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sellerId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error disabling vacation mode:', error);
    return { success: false, error: 'Failed to disable vacation mode' };
  }
}
```

---

## Step 5: Update Seller Auth Store

### File: `web/src/stores/seller/sellerAuthStore.ts`

Add import:

```typescript
import { sellerService } from '@/services/sellerService';
import type { VacationReason } from '@/types/database.types';
```

Add to the `AuthStore` interface:

```typescript
interface AuthStore {
  // ... existing fields ...
  setVacationMode: (reason?: VacationReason) => Promise<boolean>;
  disableVacationMode: () => Promise<boolean>;
}
```

Add to the store implementation:

```typescript
setVacationMode: async (reason?: VacationReason) => {
  const { seller } = get();
  if (!seller) return false;

  const result = await sellerService.enableVacationMode(seller.id, reason);
  if (result.success) {
    set({ seller: { ...seller, isVacationMode: true, vacationReason: reason || null } });
  }
  return result.success;
},

disableVacationMode: async () => {
  const { seller } = get();
  if (!seller) return false;

  const result = await sellerService.disableVacationMode(seller.id);
  if (result.success) {
    set({ seller: { ...seller, isVacationMode: false, vacationReason: null } });
  }
  return result.success;
},
```

---

## Step 6: Update Product Queries (Include Vacation Status)

### File: `web/src/services/productService.ts`

In `getProducts()` (around line 130), add `is_vacation_mode` to the seller join:

```typescript
seller:sellers!products_seller_id_fkey (
  id,
  store_name,
  approval_status,
  is_vacation_mode,          -- ADD THIS
  business_profile:seller_business_profiles (
    city
  )
)
```

In `getProductById()` (around line 487), add `is_vacation_mode` to the seller join:

```typescript
seller:sellers!products_seller_id_fkey (
  id,
  store_name,
  approval_status,
  avatar_url,
  is_vacation_mode,          -- ADD THIS
  business_profile:seller_business_profiles (
    city
  )
)
```

Also update the other seller joins in the same file (there are 2-3 more in bulk fetch methods). Search for `seller:sellers!products_seller_id_fkey` and add `is_vacation_mode` to each one.

In `transformProduct()` (around line 370), add the mapping:

```typescript
// Seller info
sellerName: product.seller?.store_name,
sellerLocation: product.seller?.business_profile?.city,
// Seller vacation mode status
isVacationMode: product.seller?.is_vacation_mode === true,
```

### File: `web/src/services/featuredProductService.ts`

In the seller join, add `is_vacation_mode`:

```typescript
seller:sellers(id, store_name, avatar_url, is_vacation_mode)
```

Also update the `FeaturedProductWithDetails` interface to include `is_vacation_mode` in the seller object.

### File: `web/src/services/adBoostService.ts`

In the seller join(s), add `is_vacation_mode`:

```typescript
seller:sellers(id, store_name, avatar_url, is_vacation_mode)
```

---

## Step 7: Update Product Mapper

### File: `web/src/utils/productMapper.ts`

Add `isVacationMode` to the `NormalizedProductDetail` interface:

```typescript
export interface NormalizedProductDetail {
  // ... existing fields ...
  isVacationMode?: boolean;
}
```

In `mapDbProductToNormalized()`, add:

```typescript
isVacationMode: (p.seller as any)?.is_vacation_mode === true || false,
```

In `mapDbProductToSellerProduct()`, add:

```typescript
isVacationMode: (p.seller as any)?.is_vacation_mode === true || false,
```

In `mapSellerProductToNormalized()`, add:

```typescript
isVacationMode: p.isVacationMode || false,
```

---

## Step 8: Update ProductDetailPage (Block Purchases)

### File: `web/src/pages/ProductDetailPage.tsx`

In `handleAddToCart()`, add vacation check after the login check:

```typescript
// Check if seller is on vacation mode
if (normalizedProduct?.isVacationMode) {
  toast({
    title: "Store on Vacation",
    description: "This store is temporarily unavailable. You cannot add items to cart.",
    variant: "destructive",
  });
  return;
}
```

In `handleBuyNow()`, add vacation check after the login check:

```typescript
// Check if seller is on vacation mode
if (normalizedProduct?.isVacationMode) {
  toast({
    title: "Store on Vacation",
    description: "This store is temporarily unavailable. You cannot purchase this item.",
    variant: "destructive",
  });
  return;
}
```

In the bottom bar where the Add to Cart and Buy Now buttons are rendered, disable them when on vacation:

```typescript
<Button
  onClick={handleAddToCart}
  disabled={(() => {
    const currentVariant = getSelectedVariant();
    const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
    return stockQty === 0 || (normalizedProduct?.isVacationMode ?? false);
  })()}
  title={normalizedProduct?.isVacationMode ? "This store is temporarily unavailable" : undefined}
>
  <ShoppingCart className="w-5 h-5" />
  Add to Cart
</Button>

<Button
  onClick={handleBuyNow}
  disabled={(() => {
    const currentVariant = getSelectedVariant();
    const stockQty = currentVariant?.stock ?? normalizedProduct?.stock ?? 0;
    return stockQty === 0 || (normalizedProduct?.isVacationMode ?? false);
  })()}
  title={normalizedProduct?.isVacationMode ? "This store is temporarily unavailable" : undefined}
>
  Buy Now
</Button>
```

In the BuyNowModal render, add `is_vacation_mode` to the product object:

```typescript
<BuyNowModal
  isOpen={showBuyNowModal}
  onClose={() => setShowBuyNowModal(false)}
  product={{
    // ... existing fields ...
    is_vacation_mode: normalizedProduct.isVacationMode || false,
  }}
  onConfirm={(qty, variant) => {
    proceedToCheckout(qty, variant);
  }}
/>
```

### Add "Store Unavailable" Banner (Step 8b)

Add a visible banner right below the product name to indicate the store is on vacation:

```tsx
{/* Vacation Mode Banner */}
{normalizedProduct?.isVacationMode && (
  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
    <Palmtree className="w-5 h-5 text-orange-500 flex-shrink-0" />
    <div>
      <p className="text-sm font-bold text-orange-700">Store Temporarily Unavailable</p>
      <p className="text-xs text-orange-600">This seller is currently on vacation. You can view this product but cannot purchase it at this time.</p>
    </div>
  </div>
)}
```

Also add `Palmtree` to the lucide-react imports.

---

## Step 9: Update BuyNowModal (Disable Confirm Button)

### File: `web/src/components/ui/buy-now-modal.tsx`

Update the interface to include vacation mode:

```typescript
interface BuyNowModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    // ... existing fields ...
    is_vacation_mode?: boolean;
  };
  onConfirm: (quantity: number, variant?: ProductVariant) => void;
}
```

In the component, check vacation mode:

```typescript
const isVacationMode = product.is_vacation_mode || false;
```

Disable the confirm button:

```typescript
<Button
  onClick={handleConfirm}
  disabled={isVacationMode}
  className={isVacationMode ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600 text-white"}
>
  {isVacationMode ? "Store on Vacation" : "Proceed to Checkout"}
</Button>
```

---

## Step 10: Update VariantSelectionModal (Disable Confirm Button)

### File: `web/src/components/ui/variant-selection-modal.tsx`

Update the interface to include vacation mode:

```typescript
interface VariantSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    // ... existing fields ...
    is_vacation_mode?: boolean;
  };
  // ... rest of props ...
}
```

In `handleConfirm()`, add vacation check at the start:

```typescript
const handleConfirm = () => {
  if (product.is_vacation_mode) return;
  // ... existing logic ...
};
```

Update the disabled state and button text:

```typescript
const isVacationMode = product.is_vacation_mode || false;
const isDisabled = isVacationMode || (hasVariants && ...);

<Button
  onClick={handleConfirm}
  disabled={isDisabled}
>
  {isVacationMode ? "Store on Vacation" : buttonText}
</Button>
```

---

## Step 11: Update ShopVariantModal and ShopBuyNowModal

### File: `web/src/components/shop/ShopVariantModal.tsx`

In `modalProduct`, add `is_vacation_mode`:

```typescript
const modalProduct = useMemo(() => ({
  ...product,
  price: product.price,
  is_vacation_mode: product.isVacationMode,  // ADD THIS
  variants: ...
}), [product]);
```

### File: `web/src/components/shop/ShopBuyNowModal.tsx`

In `modalProduct`, add `is_vacation_mode`:

```typescript
const modalProduct = useMemo(() => ({
  ...product,
  price: product.price,
  is_vacation_mode: product.isVacationMode,  // ADD THIS
  variants: ...
}), [product]);
```

---

## Step 12: Update ShopPage (Block Purchases from Product Cards)

### File: `web/src/pages/ShopPage.tsx`

In the `allProducts` mapping, add `isVacationMode`:

```typescript
const allProducts = useMemo<ShopProduct[]>(() => {
  const dbProducts = sellerProducts
    .filter((p) => p.approvalStatus === "approved" && p.isActive)
    .map((p) => ({
      // ... existing fields ...
      isVacationMode: (p as any).isVacationMode || false,
    }));
  return dbProducts;
}, [sellerProducts, categories]);
```

In the Add to Cart button click handler, add vacation check after login check:

```typescript
onClick={(e) => {
  e.stopPropagation();
  if (!profile) {
    toast({ title: "Login Required", ... });
    navigate("/login");
    return;
  }

  // ADD THIS CHECK
  if ((product as any).isVacationMode) {
    toast({
      title: "Store on Vacation",
      description: "This store is temporarily unavailable.",
      variant: "destructive",
    });
    return;
  }

  // ... existing logic (variant check, modal open, etc.) ...
}}
```

In the Buy Now button click handler, add vacation check after login check:

```typescript
onClick={(e) => {
  e.stopPropagation();
  if (!profile) {
    toast({ title: "Login Required", ... });
    navigate("/login");
    return;
  }

  // ADD THIS CHECK
  if ((product as any).isVacationMode) {
    toast({
      title: "Store on Vacation",
      description: "This store is temporarily unavailable.",
      variant: "destructive",
    });
    return;
  }

  // ... existing logic (variant check, modal open, etc.) ...
}}
```

---

## Step 13: Update SearchPage (Same as ShopPage)

### File: `web/src/pages/SearchPage.tsx`

In the mapped results, add `isVacationMode`:

```typescript
const mappedResults = results.map(p => {
  const product = p as any;
  return {
    ...product,
    // ... existing fields ...
    isVacationMode: product.isVacationMode || false,
  };
});
```

Add vacation check in both Add to Cart and Buy Now button handlers (same pattern as ShopPage).

---

## Step 14: Update StorefrontProductCard

### File: `web/src/components/StorefrontProductCard.tsx`

In `handleCartClick`, add vacation check:

```typescript
const handleCartClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (!profile) {
    onLoginRequired();
    return;
  }
  // ADD THIS CHECK
  if (product.isVacationMode || product.is_vacation_mode) {
    return;
  }
  // ... existing logic ...
};
```

In `handleBuyNowClick`, add vacation check:

```typescript
const handleBuyNowClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (!profile) {
    onLoginRequired();
    return;
  }
  // ADD THIS CHECK
  if (product.isVacationMode || product.is_vacation_mode) {
    return;
  }
  // ... existing logic ...
};
```

Also disable the buttons visually when on vacation:

```tsx
<div className="mt-4 flex gap-1.5">
  <Button
    variant="outline"
    size="icon"
    className="h-9 w-9 rounded-xl border-[var(--brand-primary)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/[0.05] hover:text-[var(--brand-primary)] transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
    onClick={handleCartClick}
    disabled={product.isVacationMode || product.is_vacation_mode}
  >
    <ShoppingCart className="h-4 w-4 text-[var(--brand-primary)]" />
  </Button>
  <Button
    className={`flex-1 h-9 font-bold rounded-xl shadow-lg active:scale-95 transition-all text-[11px] ${
      product.isVacationMode || product.is_vacation_mode
        ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
        : "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-[var(--brand-primary)]/20"
    }`}
    onClick={handleBuyNowClick}
    disabled={product.isVacationMode || product.is_vacation_mode}
  >
    {product.isVacationMode || product.is_vacation_mode ? "Unavailable" : "Buy Now"}
  </Button>
</div>
```

---

## Step 15: Update SellerStorefrontPage

### File: `web/src/pages/SellerStorefrontPage.tsx`

Add `Palmtree` to lucide-react imports.

Add `isVacationMode` to the seller object construction (around line 322):

```typescript
const seller = realSeller ? {
  // ... existing fields ...
  isVacationMode: (realSeller as any).is_vacation_mode === true,
  // ... rest of fields ...
} : ...
```

Add `isVacationMode` to the `displayProducts` mapping (around line 416):

```typescript
const displayProducts = realProducts.length > 0
  ? realProducts.map(p => ({
      // ... existing fields ...
      isVacationMode: seller?.isVacationMode,
    }))
  : demoProducts.map(p => ({
      ...p,
      // ... existing fields ...
      isVacationMode: seller?.isVacationMode,
    }));
```

Add vacation badge next to store name (around line 594, after Premium Outlet badge):

```tsx
{seller.isVacationMode && (
  <Badge className="bg-orange-500 text-white hover:bg-orange-600 border-none py-0.5 px-3 hidden md:flex items-center gap-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
    <Palmtree className="w-3 h-3" />
    On Vacation
  </Badge>
)}
```

Add vacation banner below store header (around line 669):

```tsx
{/* Vacation Mode Banner */}
{seller.isVacationMode && (
  <div className="max-w-7xl mx-auto px-4 pt-4">
    <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
      <Palmtree className="w-5 h-5 text-orange-500 flex-shrink-0" />
      <div>
        <p className="text-sm font-bold text-orange-700">This store is currently on vacation</p>
        <p className="text-xs text-orange-600">Products are available to view but cannot be purchased at this time.</p>
      </div>
    </div>
  </div>
)}
```

In `handleAddToCart`, add vacation check:

```typescript
const handleAddToCart = (product: any) => {
  if (product.isVacationMode || product.is_vacation_mode) {
    toast({
      title: "Store on Vacation",
      description: "This store is temporarily unavailable.",
      variant: "destructive",
    });
    return;
  }
  // ... existing logic ...
};
```

In `onBuyNow`, add vacation check:

```typescript
const onBuyNow = (product: any) => {
  if (product.isVacationMode || product.is_vacation_mode) {
    toast({
      title: "Store on Vacation",
      description: "This store is temporarily unavailable.",
      variant: "destructive",
    });
    return;
  }
  // ... existing logic ...
};
```

---

## Step 16: Add "On Vacation" Badge to Product Cards

### File: `web/src/components/ProductCard.tsx`

Add `Palmtree` to lucide-react imports.

Add `isVacationMode` to the `ProductCardProduct` interface:

```typescript
export interface ProductCardProduct {
  // ... existing fields ...
  isVacationMode?: boolean;
}
```

Add the badge in the image overlay area:

```tsx
{product.isVacationMode && (
  <div className="absolute top-3 left-3 bg-orange-500 text-white px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 shadow-sm">
    <Palmtree className="w-3 h-3" />
    On Vacation
  </div>
)}
```

---

## Step 17: Update SellerSettings (Vacation Mode Toggle)

### File: `web/src/pages/SellerSettings.tsx`

Add imports:

```typescript
import { useState, useEffect } from "react";
import { Palmtree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { VacationReason } from "@/types/database.types";
```

Add vacation mode state and handlers:

```typescript
const { seller, logout, setVacationMode, disableVacationMode } = useAuthStore();
const { toast } = useToast();

// Vacation mode state
const [vacationReason, setVacationReason] = useState<VacationReason | ''>('');
const [isSavingReason, setIsSavingReason] = useState(false);

// Sync with seller data
useEffect(() => {
  if (seller?.vacationReason) {
    setVacationReason(seller.vacationReason as VacationReason);
  } else {
    setVacationReason('');
  }
}, [seller?.vacationReason]);

// Toggle handler
const handleVacationToggle = async (enabled: boolean) => {
  if (enabled) {
    const success = await setVacationMode(vacationReason || undefined);
    if (success) {
      toast({
        title: "Vacation Mode Enabled",
        description: "Your store is now on vacation. Buyers cannot purchase your products.",
      });
    }
  } else {
    const success = await disableVacationMode();
    if (success) {
      toast({
        title: "Vacation Mode Disabled",
        description: "Your store is now open for business.",
      });
    }
  }
};

// Save reason handler
const handleSaveVacationReason = async () => {
  if (!seller?.isVacationMode) return;
  setIsSavingReason(true);
  try {
    const success = await setVacationMode(vacationReason || undefined);
    if (success) {
      toast({
        title: "Reason Saved",
        description: "Vacation reason has been updated.",
      });
    }
  } finally {
    setIsSavingReason(false);
  }
};
```

Add a new "Store Status" tab trigger:

```tsx
<TabsTrigger value="store-status" className="...">
  Store Status
</TabsTrigger>
```

Add the "Store Status" tab content with orange theme:

```tsx
<TabsContent value="store-status">
  <Card className="border-0 shadow-md rounded-xl bg-white overflow-hidden">
    <CardHeader className="bg-white p-8 pb-2">
      <CardTitle className="flex items-center gap-3 text-xl font-black text-[var(--text-headline)]">
        <Palmtree className="h-6 w-6 text-orange-500" />
        Store Status
      </CardTitle>
      <CardDescription className="text-[var(--text-muted)]">
        Manage your store's availability for buyers
      </CardDescription>
    </CardHeader>
    <CardContent className="pt-6 px-8 pb-8 space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div>
          <p className="font-semibold text-gray-900">Vacation Mode</p>
          <p className="text-sm text-gray-500">
            When enabled, buyers can still see your products but cannot purchase them.
          </p>
        </div>
        <Switch
          checked={seller?.isVacationMode || false}
          onCheckedChange={handleVacationToggle}
          className="data-[state=checked]:bg-orange-500"
        />
      </div>

      {seller?.isVacationMode && (
        <div className="space-y-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
          <div className="space-y-2">
            <Label htmlFor="vacation-reason">Vacation Reason</Label>
            <select
              id="vacation-reason"
              value={vacationReason}
              onChange={(e) => setVacationReason(e.target.value as VacationReason | '')}
              className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a reason...</option>
              <option value="vacation">Vacation</option>
              <option value="personal">Personal</option>
              <option value="maintenance">Maintenance</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Button
            onClick={handleSaveVacationReason}
            disabled={isSavingReason}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-lg"
          >
            {isSavingReason ? (
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Save Reason
          </Button>
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>
```

---

## Step 18: Block Checkout for Cart Items from Vacation Sellers

### File: `web/src/pages/CheckoutPage.tsx`

Add `Palmtree` to lucide-react imports.

Add vacation seller state and check:

```typescript
import { Palmtree } from "lucide-react";

// Check for vacation sellers
const [vacationSellers, setVacationSellers] = useState<string[]>([]);
const hasVacationSeller = vacationSellers.length > 0;

useEffect(() => {
  const checkVacationSellers = async () => {
    const sellerIds = [...new Set(checkoutItems.map(item => item.sellerId || item.seller_id).filter(Boolean))];
    if (sellerIds.length === 0) {
      setVacationSellers([]);
      return;
    }

    const { data } = await supabase
      .from('sellers')
      .select('id, store_name, is_vacation_mode')
      .in('id', sellerIds)
      .eq('is_vacation_mode', true);

    const vacationSellerNames = (data || []).map(s => s.store_name || 'Unknown Seller');
    setVacationSellers(vacationSellerNames);
  };

  checkVacationSellers();
}, [checkoutItems]);
```

Add vacation seller check in `handleSubmit`:

```typescript
const handleSubmit = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();

  // Check for vacation sellers
  if (hasVacationSeller) {
    toast({
      title: "Cannot Complete Order",
      description: `Some items in your cart are from sellers currently on vacation: ${vacationSellers.join(', ')}. Please remove these items to proceed.`,
      variant: "destructive"
    });
    return;
  }

  // ... rest of existing code ...
}, [..., hasVacationSeller, vacationSellers]);  // Add to dependencies
```

Add warning banner and disable Place Order button:

```tsx
{hasVacationSeller && (
  <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
    <Palmtree className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-bold text-orange-700">Some sellers are currently unavailable</p>
      <p className="text-xs text-orange-600">
        The following seller(s) are on vacation: <span className="font-semibold">{vacationSellers.join(', ')}</span>.
        Please remove their items from your cart to proceed.
      </p>
    </div>
  </div>
)}

<Button
  type="submit"
  disabled={isLoading || !selectedAddress || hasVacationSeller}
  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
>
  {/* ... existing content ... */}
</Button>
```

---

## Verification Checklist

After implementation, verify:

1. [ ] Seller can enable vacation mode in settings
2. [ ] Seller can select and save vacation reason
3. [ ] Vacation reason persists after page refresh
4. [ ] Products from vacation sellers show "On Vacation" badge (orange)
5. [ ] ProductDetailPage: Shows "Store Temporarily Unavailable" banner
6. [ ] ProductDetailPage: Add to Cart and Buy Now buttons are disabled
7. [ ] ProductDetailPage: Buttons show disabled state with title tooltip
8. [ ] ProductDetailPage: BuyNowModal shows disabled button with "Store on Vacation"
9. [ ] ShopPage: Add to Cart and Buy Now show toast and don't open modals
10. [ ] SearchPage: Same as ShopPage
11. [ ] SellerStorefrontPage: Shows "On Vacation" badge next to store name
12. [ ] SellerStorefrontPage: Shows vacation banner below store header
13. [ ] SellerStorefrontPage: Product cards show disabled buttons with "Unavailable" text
14. [ ] Checkout: If cart has items from vacation seller, shows warning banner
15. [ ] Checkout: Place Order button is disabled when vacation sellers exist
16. [ ] Checkout: Submitting shows toast with vacation seller names
17. [ ] Seller can disable vacation mode
18. [ ] After disabling, all purchase buttons work normally again
