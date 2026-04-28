import { Alert } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';
import { cartService } from '../services/cartService';
import { discountService } from '../services/discountService';
import { useAuthStore } from './authStore';
import { PLACEHOLDER_PRODUCT } from '../utils/imageUtils';

let cartChannel: any = null;
let debounceTimers: Record<string, ReturnType<typeof setTimeout> | undefined> = {};

interface CartStore {
  items: CartItem[];
  cartId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  initializeForCurrentUser: () => Promise<void>;
  addItem: (product: Product, options?: { forceNewItem?: boolean }) => Promise<string | undefined>;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemVariant: (cartItemId: string, variantId?: string, options?: any) => Promise<void>;
  removeItems: (cartItemIds: string[]) => Promise<void>;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;

  // Checkout Validation
  isValidatingCheckout: boolean;
  checkoutErrors: Record<string, string>;
  validateCheckout: (selectedIds: string[]) => Promise<boolean>;
  
  hasSeenUnavailableModal: boolean;
  setHasSeenUnavailableModal: () => void;

  // Quick Order (Buy Now)
  quickOrder: CartItem | null;
  setQuickOrder: (product: Product, quantity?: number) => void;
  clearQuickOrder: () => void;
  getQuickOrderTotal: () => number;
  reset: () => void;
}

/**
 * Maps raw DB cart_items (with nested product/variant) to flat CartItem objects
 * Filters out items with missing/deleted products
 */
function mapDbCartItemsToCartItems(dbItems: any[]): CartItem[] {
  return dbItems
    .filter((ci: any) => {
      // Skip cart items whose product was deleted or is null
      if (!ci.product || !ci.product.id) {
        console.warn('[CartStore] Skipping cart item with missing product:', ci.id);
        return false;
      }
      return true;
    })
    .map((ci: any) => {
      const product = ci.product || {};
      const variant = ci.variant || null;
      const productImages = product.images || [];

      // Evaluate seller operational status based on restriction columns
      const seller = product.seller || {};
      const now = new Date();
      const tempBlacklistUntil = seller.temp_blacklist_until ? new Date(seller.temp_blacklist_until) : null;
      const isTempBlacklistExpired = tempBlacklistUntil && now > tempBlacklistUntil;

      const isSellerActive = !(
        seller.is_permanently_blacklisted ||
        seller.suspended_at ||
        seller.is_vacation_mode ||
        seller.approval_status === 'rejected' ||
        seller.approval_status === 'suspended' ||
        (tempBlacklistUntil && !isTempBlacklistExpired)
      );

      let sellerRestrictionReason: string | null = null;
      if (!isSellerActive) {
        if (seller.is_vacation_mode) {
          sellerRestrictionReason = 'ON VACATION';
        } else if (seller.suspended_at || seller.is_permanently_blacklisted || (tempBlacklistUntil && now <= tempBlacklistUntil)) {
          sellerRestrictionReason = 'RESTRICTED';
        } else {
          sellerRestrictionReason = 'UNAVAILABLE';
        }
      }

      // Find primary image or first image
      const primaryImg = productImages.find((img: any) => img.is_primary);
      const sortedImages = [...productImages].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      const firstImg = sortedImages[0];
      const imageUrl = variant?.thumbnail_url || primaryImg?.image_url || firstImg?.image_url || PLACEHOLDER_PRODUCT;

      // Price: use variant price if available, else product price
      const originalPrice = (variant?.price != null && variant.price > 0) ? variant.price : (product.price || 0);

      // Calculate discounted price from active campaign
      let discountedPrice = originalPrice;
      
      // First, check if discount info is embedded in personalized_options (for newly added items)
      if (ci.personalized_options?.discountInfo) {
        // Use embedded discount info to reconstruct discounted price
        const discountInfo = ci.personalized_options.discountInfo;
        const basePrice = discountInfo.originalPrice || originalPrice;
        if (discountInfo.discountType === 'percentage') {
          discountedPrice = Math.round(basePrice * (1 - discountInfo.discountValue / 100));
        } else if (discountInfo.discountType === 'fixed_amount') {
          discountedPrice = Math.max(0, basePrice - discountInfo.discountValue);
        }
      } else {
        // Fallback: Calculate discounted price from active campaign in product_discounts
        const productDiscounts = product.product_discounts || [];
        const now = new Date();

        const activeDiscount = productDiscounts.find((pd: any) => {
          const campaign = pd.campaign;
          if (!campaign || campaign.status !== 'active') return false;
          const startsAt = new Date(campaign.starts_at);
          const endsAt = new Date(campaign.ends_at);
          return now >= startsAt && now <= endsAt;
        });

        if (activeDiscount) {
          const campaign = activeDiscount.campaign;
          const dType = activeDiscount.discount_type || campaign.discount_type;
          const dValue = Number(activeDiscount.discount_value || campaign.discount_value);

          if (dType === 'percentage') {
            // No maxDiscountAmount cap — matches calculateLineDiscount and product detail screen
            discountedPrice = Math.round(originalPrice * (1 - dValue / 100));
          } else if (dType === 'fixed_amount') {
            discountedPrice = Math.max(0, originalPrice - dValue);
          }
        }
      }

      // Use discounted price as the cart price if there's an active discount
      const price = discountedPrice < originalPrice ? discountedPrice : originalPrice;

      // Get seller info
      const sellerName = seller.store_name || 'Shop';
      const sellerId = seller.id || product.seller_id || '';

      // Build selectedVariant if variant exists
      let selectedVariant = null;
      if (variant) {
        const hasLegacySizeAxis1 = !variant.option_1_value && !!variant.size;
        const hasLegacyColorAxis2 = !variant.option_2_value && !!variant.color;
        selectedVariant = {
          variantId: variant.id,
          color: variant.color || undefined,
          size: variant.size || undefined,
          option1Value: variant.option_1_value || variant.size || undefined,
          option2Value: variant.option_2_value || variant.color || undefined,
          option1Label: product.variant_label_1 || (hasLegacySizeAxis1 ? 'Size' : 'Option 1'),
          option2Label: product.variant_label_2 || (hasLegacyColorAxis2 ? 'Color' : 'Option 2'),
        };
      }
      // Also check personalized_options for variant info
      if (!selectedVariant && ci.personalized_options) {
        const po = ci.personalized_options;
        if (po.variantId || po.color || po.size || po.option1Value) {
          selectedVariant = {
            variantId: po.variantId,
            color: po.color,
            size: po.size,
            option1Label: po.option1Label,
            option1Value: po.option1Value,
            option2Label: po.option2Label,
            option2Value: po.option2Value,
          };
        }
      }

      // Store campaign discount info if active
      // (Now handled via embedded discountInfo in personalizedOptions)

      return {
        id: product.id || ci.product_id,
        cartItemId: ci.id,
        name: product.name || 'Product',
        description: product.description || '',
        price,
        // Store original price (before discount) for display
        originalPrice: originalPrice,
        image: imageUrl,
        images: productImages.map((img: any) => img.image_url),
        seller: sellerName,
        sellerId: sellerId,
        seller_id: sellerId,
        category: product.category?.name || '',
        stock: variant?.stock != null
          ? variant.stock
          : (product.variants?.reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0) ?? null),
        isFreeShipping: !!product.is_free_shipping,
        is_vacation_mode: !!product.seller?.is_vacation_mode,
        quantity: ci.quantity || 1,
        selectedVariant,
        // Pass essential product fields for variant selection modal
        variants: product.variants || [],
        variant_label_1: product.variant_label_1,
        variant_label_2: product.variant_label_2,
        option1Values: product.option1Values || [],
        option2Values: product.option2Values || [],
        // Seller operational status
        isSellerActive,
        sellerRestrictionReason,
        isVacationMode: !!seller.is_vacation_mode,
      } as CartItem;
    });
}

function isLocalCartItem(item: CartItem): boolean {
  return typeof item?.cartItemId === 'string' && item.cartItemId.startsWith('local-');
}

function mergeDbAndLocalItems(dbItems: CartItem[], currentItems: CartItem[]): CartItem[] {
  const localItems = currentItems.filter(isLocalCartItem);
  if (localItems.length === 0) return dbItems;

  const dbKeys = new Set(
    dbItems.map((item) => {
      const variantKey = item.selectedVariant?.variantId || 'no-variant';
      return `${item.id}::${variantKey}`;
    })
  );

  const missingLocalItems = localItems.filter((item) => {
    const variantKey = item.selectedVariant?.variantId || 'no-variant';
    const key = `${item.id}::${variantKey}`;
    return !dbKeys.has(key);
  });

  return [...missingLocalItems, ...dbItems];
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      isLoading: false,
      error: null,
      quickOrder: null,
      isValidatingCheckout: false,
      checkoutErrors: {},
      hasSeenUnavailableModal: false,
      setHasSeenUnavailableModal: () => set({ hasSeenUnavailableModal: true }),

      validateCheckout: async (selectedIds: string[]) => {
        set({ isValidatingCheckout: true, checkoutErrors: {} });
        try {
          const result = await cartService.validateCheckoutItems(selectedIds);
          const errors: Record<string, string> = { ...result.errors };

          // Flash sale expiry check
          const { items } = get();
          const selectedItems = items.filter(
            i => selectedIds.includes(i.cartItemId) || selectedIds.includes(i.id)
          );
          const productIds = [...new Set(selectedItems.map(i => i.id).filter(Boolean))];

          if (productIds.length > 0) {
            const freshDiscounts = await discountService.getActiveDiscountsForProducts(productIds);
            for (const item of selectedItems) {
              const hadDiscount = !!(item as any).campaignDiscount;
              const stillActive = !!freshDiscounts[item.id];
              if (hadDiscount && !stillActive && !errors[item.cartItemId]) {
                errors[item.cartItemId] = 'The flash sale for this item has ended. Price updated — please review before checkout.';
                result.isValid = false;
              }
            }
          }

          if (!result.isValid || Object.keys(errors).length > 0) {
            set({ checkoutErrors: errors });
          }
          return result.isValid && Object.keys(errors).length === 0;
        } catch (e: any) {
          set({ error: e.message || 'Validation failed' });
          return false;
        } finally {
          set({ isValidatingCheckout: false });
        }
      },

      // HELPER: Calculates the sum of subtotals
      syncCartTotal: async (cartId: string) => {
        try {
          await cartService.syncCartTotal(cartId);
        } catch (e) {
          console.error('[CartStore] Failed to sync total:', e);
        }
      },

      initializeForCurrentUser: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === 'guest') return;
        set({ isLoading: true, error: null });
        try {
          const cart = await cartService.getOrCreateCart(userId);
          set({ cartId: cart.id });

          const cartId = get().cartId;
          if (cartId) {
            const rawItems = await cartService.getCartItems(cartId);
            const dbItems = mapDbCartItemsToCartItems(rawItems);
            const mergedItems = mergeDbAndLocalItems(dbItems, get().items);
            set({ items: mergedItems });
          }
        } catch (e: any) {
          set({ error: e?.message || 'Failed to load cart', items: [] });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: (product, options) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === 'guest') return Promise.resolve(undefined);
        
        const run = async () => {
          let cartId = get().cartId;
          if (!cartId) {
            await get().initializeForCurrentUser();
            cartId = get().cartId;
          }
          if (!cartId) return;

          const unitPrice = typeof product.price === 'number' ? product.price : parseFloat(String(product.price) || '0');
          const quantity = (product as any).quantity || 1;
          const selectedVariant = (product as any).selectedVariant || null;

          // Extract variantId string from selectedVariant object (fix UUID error)
          const variantId = selectedVariant?.variantId || null;

          // Build personalized options from selected variant, including discount info for persistence
          const discount = (product as any).activeCampaignDiscount;
          const personalizedOptions = {
            // Variant selection fields
            ...(selectedVariant?.color ? { color: selectedVariant.color } : {}),
            ...(selectedVariant?.size ? { size: selectedVariant.size } : {}),
            ...(selectedVariant?.variantId ? { variantId: selectedVariant.variantId } : {}),
            ...(selectedVariant?.option1Label ? { option1Label: selectedVariant.option1Label } : {}),
            ...(selectedVariant?.option1Value ? { option1Value: selectedVariant.option1Value } : {}),
            ...(selectedVariant?.option2Label ? { option2Label: selectedVariant.option2Label } : {}),
            ...(selectedVariant?.option2Value ? { option2Value: selectedVariant.option2Value } : {}),
            // Discount info to preserve calculated discount
            ...(discount ? {
              discountInfo: {
                campaignId: discount.campaignId,
                discountType: discount.discountType,
                discountValue: discount.discountValue,
                originalPrice: (product as any).originalPrice || product.price || 0,
              }
            } : {}),
          };

          try {
            const added = await cartService.addItem(
              cartId,
              product.id,
              unitPrice,
              quantity,
              variantId,
              personalizedOptions,
              !!options?.forceNewItem
            );
            // Only refresh from DB if the insert succeeded
            await get().initializeForCurrentUser();
            return (added as any)?.id as string | undefined;
          } catch (e: any) {
            const msg = String(e?.message || e || '');
            console.error('[CartStore] Failed to add item:', msg || e);
            set({ error: msg || 'Failed to add item to cart' });
            return undefined;
          }
        };
        
        return run();
      },

      removeItem: (itemId) => {
        const run = async () => {
          const cartId = get().cartId;
          const currentItems = get().items;
          const localItem = currentItems.find(i => i.cartItemId === itemId && isLocalCartItem(i));

          if (localItem) {
            set(state => ({ items: state.items.filter(i => i.cartItemId !== itemId) }));
            return;
          }

          // If no cartId, try to initialize first
          if (!cartId) {
            await get().initializeForCurrentUser();
            if (!get().cartId) return;
          }

          const verifiedCartId = get().cartId as string;
          const previousItems = get().items;
          set(state => ({
            items: state.items.filter(i => i.cartItemId !== itemId && i.id !== itemId)
          }));

          try {
            // New logic: Check if itemId looks like a UUID (cart item ID) or try to find by product ID
            // Ideally we should move to only using cartItemId
            // For now, if itemId exists in our local items as cartItemId, use that
            const item = previousItems.find(i => i.cartItemId === itemId);
            if (item) {
              await cartService.removeFromCart(item.cartItemId);
            } else {
              // Fallback for legacy calls using productId: try to find item by productId
              await cartService.removeItem(verifiedCartId, itemId);
            }

            // Background refresh to catch any sync adjustments
            const rawItems = await cartService.getCartItems(verifiedCartId);
            const dbItems = mapDbCartItemsToCartItems(rawItems);
            set({ items: mergeDbAndLocalItems(dbItems, get().items) });
          } catch (e) {
            // Rollback on error
            set({ items: previousItems, error: 'Failed to remove item. Please try again.' });
            console.error('[CartStore] Failed to remove item:', e);
          }
        };
        run();
      },

      updateQuantity: (itemId, quantity) => {
        const run = async () => {
          const currentItems = get().items;
          const targetItem = currentItems.find(i => i.cartItemId === itemId || i.id === itemId);
          const maxStock = Math.max(1, Number(targetItem?.stock ?? 99));
          const nextQuantity = Math.max(1, Math.min(quantity, maxStock));
          const localItem = currentItems.find(i => (i.cartItemId === itemId || i.id === itemId) && isLocalCartItem(i));

          if (localItem) {
            if (nextQuantity <= 0) {
              set(state => ({ items: state.items.filter(i => i.cartItemId !== localItem.cartItemId) }));
              return;
            }

            set(state => ({
              items: state.items.map(i =>
                i.cartItemId === localItem.cartItemId
                  ? { ...i, quantity: nextQuantity }
                  : i
              )
            }));
            return;
          }

          const cartId = get().cartId;
          if (!cartId) {
            await get().initializeForCurrentUser();
            if (!get().cartId) return;
          }

          if (nextQuantity <= 0) {
            return get().removeItem(itemId);
          }

          // Optimistic update — reflects instantly in UI
          const previousItems = get().items;
          set(state => ({
            items: state.items.map(i =>
              (i.cartItemId === itemId || i.id === itemId)
                ? { ...i, quantity: nextQuantity }
                : i
            )
          }));

          // Clear any existing debounce timer for this item
          if (debounceTimers[itemId]) {
            clearTimeout(debounceTimers[itemId]);
          }

          // Debounce the API call by 500ms from the user's last tap
          debounceTimers[itemId] = setTimeout(async () => {
            try {
              const item = previousItems.find(i => i.cartItemId === itemId);
              if (item) {
                await cartService.updateCartItemQuantity(item.cartItemId, nextQuantity);
              } else {
                const verifiedCartId = cartId as string;
                await cartService.updateQuantity(verifiedCartId, itemId, nextQuantity);
              }
              // No re-fetch needed — optimistic update is accurate.
              // A full refresh happens automatically on next screen focus.
              delete debounceTimers[itemId];
            } catch (e) {
              // Rollback on error
              set({ items: previousItems });
              console.error('[CartStore] Failed to update quantity:', e);
              Alert.alert('Cannot Update Quantity', e instanceof Error ? e.message : 'Unable to update item quantity');
              delete debounceTimers[itemId];
            }
          }, 500);
        };
        return run();
      },

      updateItemVariant: async (cartItemId, variantId, options) => {
        // Optimistically update local state if needed, or just wait for refresh
        const run = async () => {
          const localItem = get().items.find(i => i.cartItemId === cartItemId && isLocalCartItem(i));
          if (localItem) {
            set(state => ({
              items: state.items.map(i => {
                if (i.cartItemId !== cartItemId) return i;
                return {
                  ...i,
                  selectedVariant: {
                    ...(i.selectedVariant || {}),
                    ...(options || {}),
                    ...(variantId ? { variantId } : {}),
                  },
                };
              }),
            }));
            return;
          }

          const cartId = get().cartId;
          if (!cartId) return;
          try {
            // Call service
            await cartService.updateCartItemVariant(cartItemId, variantId, options);
            // Refresh
            await get().initializeForCurrentUser();
          } catch (e) {
            console.error('[CartStore] Failed to update item variant:', e);
            set({ error: 'Failed to update item variant' });
          }
        };
        return run();
      },

      clearCart: () => {
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) return;

          const previousItems = get().items;
          // BX-04-009: Wipe the cartId from device memory so a fresh cart is created next time
          set({ items: [], cartId: null });
          try {
            await cartService.clearCart(cartId);
          } catch (e) {
            // Rollback on error
            set({ items: previousItems, cartId });
            console.error('[CartStore] Failed to clear cart:', e);
          }
        };
        run();
      },

      removeItems: async (cartItemIds: string[]) => {
        if (!cartItemIds || cartItemIds.length === 0) return;

        const previousItems = get().items;
        // O(n+m) — build a Set so each item lookup is O(1) instead of O(m)
        const removeSet = new Set(cartItemIds);
        set(state => ({
          items: state.items.filter(i => !removeSet.has(i.cartItemId) && !removeSet.has(i.id))
        }));

        const localOnlyIds = previousItems
          .filter(i => isLocalCartItem(i) && removeSet.has(i.cartItemId))
          .map(i => i.cartItemId);
        const remoteIds = cartItemIds.filter(id => !localOnlyIds.includes(id));

        if (remoteIds.length === 0) {
          return;
        }

        try {
          await cartService.removeItems(remoteIds);

          // Background refresh
          const cartId = get().cartId;
          if (cartId) {
            const rawItems = await cartService.getCartItems(cartId);
            const dbItems = mapDbCartItemsToCartItems(rawItems);
            set({ items: mergeDbAndLocalItems(dbItems, get().items) });
          }
        } catch (e) {
          // Rollback on error
          set({ items: previousItems, error: 'Failed to remove item. Please try again.' });
          console.error('[CartStore] Failed to remove multiple items:', e);
        }
      },

      getTotal: () => get().items.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0),
      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),

      setQuickOrder: (product, quantity = 1) => {
        const selectedVariant = (product as any).selectedVariant || null;
        set({
          quickOrder: {
            ...product,
            quantity,
            selectedVariant,
            originalPrice: product.originalPrice || product.original_price, // Ensure originalPrice is carried over
          } as CartItem
        });
      },
      clearQuickOrder: () => set({ quickOrder: null }),
      getQuickOrderTotal: () => get().quickOrder ? ((get().quickOrder!.price ?? 0) * get().quickOrder!.quantity) : 0,
      reset: () => set({ items: [], cartId: null, isLoading: false, error: null, quickOrder: null }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      // Only persist cartId and quickOrder — items always come fresh from DB
      partialize: (state) => ({
        cartId: state.cartId,
        quickOrder: state.quickOrder,
      }),
      // Migrate from old versions (drop old items array)
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Version 0 or 1: had items array persisted, remove it
          return {
            cartId: persistedState?.cartId || null,
            quickOrder: persistedState?.quickOrder || null,
          };
        }
        return persistedState;
      },
    }
  )
);