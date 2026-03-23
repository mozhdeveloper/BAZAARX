# Seller Vacation Mode - Mobile Implementation Plan

## Overview

Enable sellers to mark their store as "on vacation" on mobile. When active:
- Products remain visible but show an "On Vacation" badge
- ProductDetailScreen shows disabled "Store Unavailable" buttons
- Add to Cart and Buy Now buttons are disabled
- VariantSelectionModal disables its confirm button
- Buyers see a "Store on Vacation" message instead of purchase options
- Checkout is blocked if cart contains items from vacation sellers (even if added before vacation mode was enabled)

---

## Step 1: Database Migration

Same SQL as web (run once in Supabase):

```sql
ALTER TABLE sellers
  ADD COLUMN IF NOT EXISTS is_vacation_mode BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS vacation_reason TEXT;
```

---

## Step 2: Update Types

### File: `mobile-app/src/types/database.types.ts`

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

### File: `mobile-app/src/types/index.ts`

Add to the `Product` interface:

```typescript
export interface Product {
  // ... existing fields ...
  is_vacation_mode?: boolean;
}
```

---

## Step 3: Update Seller Service

### File: `mobile-app/src/services/sellerService.ts`

Add to `SellerCoreData` interface:

```typescript
export interface SellerCoreData {
  // ... existing fields ...
  is_vacation_mode?: boolean;
  vacation_reason?: string | null;
}
```

Add two new methods to the `SellerService` class:

```typescript
/**
 * Enable vacation mode for a seller
 */
async enableVacationMode(
  sellerId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

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
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

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

## Step 4: Update Seller Store

### File: `mobile-app/src/stores/sellerStore.ts`

Add import:

```typescript
import { sellerService } from '@/services/sellerService';
import type { VacationReason } from '@/types/database.types';
```

Add vacation fields to the `Seller` interface in the store:

```typescript
interface Seller {
  // ... existing fields ...

  // Vacation mode
  is_vacation_mode?: boolean;
  vacation_reason?: string | null;
}
```

Add to the `AuthStore` interface:

```typescript
interface AuthStore {
  // ... existing fields ...
  setVacationMode: (reason?: string) => Promise<boolean>;
  disableVacationMode: () => Promise<boolean>;
}
```

Add to the store implementation:

```typescript
setVacationMode: async (reason?: string) => {
  const { seller } = get();
  if (!seller) return false;

  const result = await sellerService.enableVacationMode(seller.id, reason);
  if (result.success) {
    set({ seller: { ...seller, is_vacation_mode: true, vacation_reason: reason || null } });
  }
  return result.success;
},
disableVacationMode: async () => {
  const { seller } = get();
  if (!seller) return false;

  const result = await sellerService.disableVacationMode(seller.id);
  if (result.success) {
    set({ seller: { ...seller, is_vacation_mode: false, vacation_reason: null } });
  }
  return result.success;
},
```

Also export these actions in `useSellerStore()` hook:

```typescript
export const useSellerStore = () => {
  // ... existing code ...
  return {
    // ... existing fields ...
    setVacationMode: auth.setVacationMode,
    disableVacationMode: auth.disableVacationMode,
  };
};
```

### Update `mapDbSellerToSeller` (Critical Fix)

The local `mapDbSellerToSeller` function (around line 309) must map vacation fields so they load on login:

```typescript
const mapDbSellerToSeller = (s: any): Seller => {
  // ... existing mappings ...

  return {
    // ... existing fields ...

    // Vacation mode (ADD THIS)
    is_vacation_mode: s.is_vacation_mode === true,
    vacation_reason: s.vacation_reason || null,
  };
};
```

---

## Step 5: Update Product Service (Include Vacation Status)

### File: `mobile-app/src/services/productService.ts`

In `getProducts()` (line ~138), the seller join uses `*` which already includes `is_vacation_mode`:

```typescript
seller:sellers!products_seller_id_fkey (*, business_profile:seller_business_profiles (*))
```

In `getProductById()` (line ~422-432), add `is_vacation_mode` to the explicit field list:

```typescript
seller:sellers!products_seller_id_fkey (
  id,
  store_name,
  store_description,
  avatar_url,
  owner_name,
  approval_status,
  verified_at,
  is_vacation_mode,          -- ADD THIS
  business_profile:seller_business_profiles (
    business_type,
    city,
    province
  )
)
```

In `transformProduct()` (line ~357), add the mapping at the end of the return object:

```typescript
campaignDiscountValue,
campaignDiscountType,
// Seller vacation mode status (ADD THIS)
is_vacation_mode: product.seller?.is_vacation_mode === true,
```

### File: `mobile-app/src/services/featuredProductService.ts`

In the seller join (line ~46), add `is_vacation_mode`:

```typescript
seller:sellers(id, store_name, avatar_url, is_vacation_mode)
```

Also update the `FeaturedProductMobile` interface to include `is_vacation_mode` in the seller object:

```typescript
seller: { id: string; store_name: string; avatar_url: string | null; is_vacation_mode?: boolean } | null;
```

---

## Step 6: Update ProductDetailScreen (Block Purchases)

### File: `mobile-app/app/ProductDetailScreen.tsx`

In `handleAddToCart` (line ~767), add vacation check after guest check:

```typescript
// Check if seller is on vacation mode
if ((product as any).is_vacation_mode) {
  Alert.alert('Store Unavailable', 'This store is temporarily unavailable. You cannot add this item to cart.');
  return;
}
```

In `handleBuyNow` (line ~816), add vacation check after guest check:

```typescript
// Check if seller is on vacation mode
if ((product as any).is_vacation_mode) {
  Alert.alert('Store Unavailable', 'This store is temporarily unavailable. You cannot purchase this product.');
  return;
}
```

In the bottom bar buttons (around line 1464), disable them when on vacation:

```tsx
<Pressable
  style={[styles.addToCartBtn, ((Number(selectedVariantInfo.stock ?? 0) <= 0) || (product as any).is_vacation_mode) && styles.disabledBtn]}
  onPress={handleAddToCart}
  disabled={(Number(selectedVariantInfo.stock ?? 0) <= 0) || (product as any).is_vacation_mode}
>
  <ShoppingCart size={20} color={((Number(selectedVariantInfo.stock ?? 0) > 0) && !(product as any).is_vacation_mode) ? COLORS.primary : COLORS.gray400} />
</Pressable>

<Pressable
  style={[styles.buyNowBtn, ((Number(selectedVariantInfo.stock ?? 0) <= 0) || (product as any).is_vacation_mode) && styles.disabledBtn]}
  onPress={handleBuyNow}
  disabled={(Number(selectedVariantInfo.stock ?? 0) <= 0) || (product as any).is_vacation_mode}
>
  <Text style={[styles.buyNowText, ((Number(selectedVariantInfo.stock ?? 0) <= 0) || (product as any).is_vacation_mode) && { color: COLORS.gray400 }]}>
    {((product as any).is_vacation_mode ? 'Store Unavailable' : (Number(selectedVariantInfo.stock ?? 0) > 0 ? 'Buy Now' : 'Out of Stock'))}
  </Text>
</Pressable>
```

---

## Step 7: Update VariantSelectionModal (Disable Confirm Button)

### File: `mobile-app/src/components/VariantSelectionModal.tsx`

In `handleConfirm()` (around line 240), add vacation check at the start:

```typescript
const handleConfirm = () => {
  // Block if seller is on vacation
  if ((product as any).is_vacation_mode) {
    return;
  }

  // ... existing logic ...
};
```

In the action button section (around line 542), update to disable when on vacation:

```tsx
{(() => {
  const isVacationMode = (product as any).is_vacation_mode;
  const isSelectionValid = (hasOption1 ? !!selectedOption1 : true) && (hasOption2 ? !!selectedOption2 : true);
  const isOutOfStock = Number(activeVariantInfo.stock || 0) <= 0;
  const canConfirm = !isVacationMode && isSelectionValid && !isOutOfStock;
  return (
    <Pressable
      style={[
        styles.confirmBtn,
        canConfirm
          ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
          : { backgroundColor: COLORS.background, borderColor: COLORS.gray300, borderWidth: 1 }
      ]}
      onPress={handleConfirm}
      disabled={!canConfirm}
    >
      <Text style={[
        styles.confirmText,
        canConfirm ? { color: '#FFF' } : { color: COLORS.gray400 }
      ]}>
        {isVacationMode ? 'Store on Vacation' : isOutOfStock ? 'Out of Stock' : confirmLabel}
      </Text>
    </Pressable>
  );
})()}
```

---

## Step 8: Add "On Vacation" Badge to Product Card

### File: `mobile-app/src/components/ProductCard.tsx`

Add import:

```typescript
import { Palmtree } from 'lucide-react-native';
```

Add the badge in the image overlay area (after discount badge):

```tsx
{/* Vacation Mode Badge */}
{product.is_vacation_mode && (
  <View style={styles.vacationBadge}>
    <Palmtree size={12} color="#FFFFFF" />
    <Text style={styles.vacationBadgeText}>On Vacation</Text>
  </View>
)}
```

Add styles:

```typescript
vacationBadge: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: '#EA580C', // Orange-600
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
  zIndex: 10,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
vacationBadgeText: {
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: '700',
},
```

---

## Step 9: Update Seller Settings (Vacation Mode Toggle)

### File: `mobile-app/app/seller/(tabs)/settings.tsx`

Add imports:

```typescript
import React, { useState, useEffect } from 'react';
import { Palmtree } from 'lucide-react-native';
```

Update type:

```typescript
type SettingTab = 'profile' | 'store' | 'documents' | 'notifications' | 'security' | 'payments' | 'store-status';
```

Update useSellerStore destructuring:

```typescript
const { seller, updateSellerInfo, setVacationMode, disableVacationMode } = useSellerStore();
```

Add vacation mode state and handlers:

```typescript
// Vacation mode state
const [vacationReason, setVacationReason] = useState('');

useEffect(() => {
  if (seller?.vacation_reason) {
    setVacationReason(seller.vacation_reason);
  } else {
    setVacationReason('');
  }
}, [seller?.vacation_reason]);

const handleVacationToggle = async (enabled: boolean) => {
  if (enabled) {
    const success = await setVacationMode(vacationReason || undefined);
    if (success) {
      Alert.alert('Success', 'Vacation mode enabled. Buyers cannot purchase your products.');
    }
  } else {
    const success = await disableVacationMode();
    if (success) {
      Alert.alert('Success', 'Vacation mode disabled. Your store is now open for business.');
    }
  }
};
```

Update handleSave to save vacation reason:

```typescript
const handleSave = async () => {
  // If on store-status tab and vacation mode is enabled, save the reason
  if (selectedTab === 'store-status' && seller?.is_vacation_mode) {
    await setVacationMode(vacationReason || undefined);
  }

  // ... rest of existing save logic ...
  Alert.alert('Success', 'Settings saved successfully!');
};
```

Add "Store Status" tab trigger (after Payments tab):

```tsx
<Pressable
  style={[
    styles.pillTab,
    selectedTab === 'store-status' && styles.pillTabActive,
  ]}
  onPress={() => setSelectedTab('store-status')}
>
  <Text
    style={[
      styles.pillTabText,
      selectedTab === 'store-status' && styles.pillTabTextActive,
    ]}
  >
    Store Status
  </Text>
</Pressable>
```

Add "Store Status" tab content in renderTabContent:

```tsx
case 'store-status':
  return (
    <View style={styles.formCard}>
      <View style={styles.formSection}>
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Palmtree size={20} color="#EA580C" strokeWidth={2.5} />
            <Text style={styles.sectionTitle}>Store Status</Text>
          </View>
        </View>

        <View style={[styles.switchRow, { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 16 }]}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={styles.switchLabel}>Vacation Mode</Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>
              When enabled, buyers can still see your products but cannot purchase them.
            </Text>
          </View>
          <Switch
            value={seller?.is_vacation_mode || false}
            onValueChange={handleVacationToggle}
            trackColor={{ false: '#E5E7EB', true: '#FDBA74' }}
            thumbColor={seller?.is_vacation_mode ? '#EA580C' : '#F3F4F6'}
          />
        </View>

        {seller?.is_vacation_mode && (
          <View style={[styles.inputGroup, { backgroundColor: '#FFF7ED', borderRadius: 12, padding: 16, marginTop: 12, borderWidth: 1, borderColor: '#FFEDD5' }]}>
            <Text style={styles.inputLabel}>Vacation Reason</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {['vacation', 'personal', 'maintenance', 'other'].map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setVacationReason(reason)}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: vacationReason === reason ? '#EA580C' : '#FFFFFF',
                    borderWidth: 1,
                    borderColor: vacationReason === reason ? '#EA580C' : '#E5E7EB',
                  }}
                >
                  <Text style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: vacationReason === reason ? '#FFFFFF' : '#6B7280',
                    textTransform: 'capitalize',
                  }}>
                    {reason}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
```

Add styles:

```typescript
switchRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 12,
},
switchLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#1F2937',
},
```

---

## Step 10: Block Checkout for Cart Items from Vacation Sellers

### File: `mobile-app/app/CheckoutScreen.tsx`

Add `Palmtree` to lucide-react-native imports.

Add vacation seller state and check (after checkoutItems):

```typescript
// Check for vacation sellers
const [vacationSellers, setVacationSellers] = useState<string[]>([]);
const hasVacationSeller = vacationSellers.length > 0;

useEffect(() => {
  const checkVacationSellers = async () => {
    const sellerIds = [...new Set(checkoutItems.map((item: any) => item.sellerId || item.seller_id).filter(Boolean))];
    if (sellerIds.length === 0) {
      setVacationSellers([]);
      return;
    }

    const { data } = await (supabase as any)
      .from('sellers')
      .select('id, store_name, is_vacation_mode')
      .in('id', sellerIds)
      .eq('is_vacation_mode', true);

    const vacationSellerNames = (data || []).map((s: any) => s.store_name || 'Unknown Seller');
    setVacationSellers(vacationSellerNames);
  };

  checkVacationSellers();
}, [checkoutItems]);
```

Add vacation check at the start of `handlePlaceOrder`:

```typescript
const handlePlaceOrder = useCallback(async () => {
  // Check for vacation sellers
  if (hasVacationSeller) {
    Alert.alert(
      'Cannot Complete Order',
      `Some items in your cart are from sellers currently on vacation: ${vacationSellers.join(', ')}. Please remove these items to proceed.`
    );
    return;
  }

  // ... rest of existing code ...
}, [hasVacationSeller, vacationSellers, ...]);  // Add to dependencies
```

Add warning banner and disable Place Order button:

```tsx
{hasVacationSeller && (
  <View style={{ marginTop: 12, backgroundColor: '#FFF7ED', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5', flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
    <Palmtree size={20} color="#EA580C" style={{ marginTop: 2 }} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#C2410C' }}>Some sellers are currently unavailable</Text>
      <Text style={{ fontSize: 11, color: '#EA580C', marginTop: 4 }}>
        The following seller(s) are on vacation: <Text style={{ fontWeight: '700' }}>{vacationSellers.join(', ')}</Text>. Please remove their items from your cart to proceed.
      </Text>
    </View>
  </View>
)}

<Pressable
  onPress={handlePlaceOrder}
  disabled={isProcessing || !selectedAddress || hasVacationSeller}
  style={({ pressed }) => [
    styles.checkoutButton,
    pressed && styles.checkoutButtonPressed,
    (isProcessing || !selectedAddress || hasVacationSeller) && { opacity: 0.5 }
  ]}
>
```

---

## Verification Checklist

After implementation, verify:

1. [ ] Seller can enable vacation mode in mobile settings
2. [ ] Seller can select and save vacation reason
3. [ ] Vacation mode persists after logout and login
4. [ ] Toggling on web reflects on mobile (after navigating to settings)
5. [ ] Products from vacation sellers show "On Vacation" badge (orange) on ProductCard
6. [ ] ProductDetailScreen: Add to Cart and Buy Now buttons are disabled
7. [ ] ProductDetailScreen: Buttons show "Store Unavailable" text
8. [ ] ProductDetailScreen: VariantSelectionModal shows disabled button with "Store on Vacation"
9. [ ] Products from vacation sellers cannot be added to cart
10. [ ] Checkout: If cart has items from vacation seller, shows warning banner
11. [ ] Checkout: Place Order button is disabled when vacation sellers exist
12. [ ] Checkout: Tapping Place Order shows Alert with vacation seller names
13. [ ] Seller can disable vacation mode
14. [ ] After disabling, all purchase buttons work normally again
