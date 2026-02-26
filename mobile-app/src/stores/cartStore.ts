import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';
import { cartService } from '../services/cartService';
import { useAuthStore } from './authStore';
import { PLACEHOLDER_PRODUCT } from '../utils/imageUtils';

let cartChannel: any = null;

interface CartStore {
  items: CartItem[];
  cartId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  initializeForCurrentUser: () => Promise<void>;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemVariant: (cartItemId: string, variantId?: string, options?: any) => Promise<void>;
  removeItems: (cartItemIds: string[]) => Promise<void>;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;

  // Quick Order (Buy Now)
  quickOrder: CartItem | null;
  setQuickOrder: (product: Product, quantity?: number) => void;
  clearQuickOrder: () => void;
  getQuickOrderTotal: () => number;
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

      // Find primary image or first image
      const primaryImg = productImages.find((img: any) => img.is_primary);
      const sortedImages = [...productImages].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      const firstImg = sortedImages[0];
      const imageUrl = variant?.thumbnail_url || primaryImg?.image_url || firstImg?.image_url || PLACEHOLDER_PRODUCT;

      // Price: use variant price if available, else product price
      const price = (variant?.price != null && variant.price > 0) ? variant.price : (product.price || 0);

      // Get seller info
      const seller = product.seller || {};
      const sellerName = seller.store_name || 'Shop';
      const sellerId = seller.id || product.seller_id || '';

      // Build selectedVariant if variant exists
      let selectedVariant = null;
      if (variant) {
        selectedVariant = {
          variantId: variant.id,
          color: variant.color || undefined,
          size: variant.size || undefined,
          option1Value: variant.option_1_value || undefined,
          option2Value: variant.option_2_value || undefined,
          option1Label: product.variant_label_1 || undefined,
          option2Label: product.variant_label_2 || undefined,
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

      return {
        id: product.id || ci.product_id,
        cartItemId: ci.id,
        name: product.name || 'Product',
        description: product.description || '',
        price,
        // Prioritize product original price (variants don't have original_price in schema)
        originalPrice: product.original_price || 0,
        image: imageUrl,
        images: productImages.map((img: any) => img.image_url),
        seller: sellerName,
        sellerId: sellerId,
        seller_id: sellerId,
        category: product.category?.name || '',
        stock: (variant?.stock != null) ? variant.stock : (product.stock || 0),
        isFreeShipping: !!product.is_free_shipping,
        quantity: ci.quantity || 1,
        selectedVariant,
        // Pass essential product fields for variant selection modal
        variants: product.variants || [],
        variant_label_1: product.variant_label_1,
        variant_label_2: product.variant_label_2,
        option1Values: product.option1Values || [],
        option2Values: product.option2Values || [],
      } as CartItem;
    });
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      isLoading: false,
      error: null,
      quickOrder: null,

      // HELPER: Calculates the sum of subtotals and updates the carts table
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
            const items = mapDbCartItemsToCartItems(rawItems);
            set({ items });
          }
        } catch (e: any) {
          set({ error: e?.message || 'Failed to load cart', items: [] });
        } finally {
          set({ isLoading: false });
        }
      },

      addItem: (product) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === 'guest') return;
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

          // Build personalized options from selected variant
          const personalizedOptions = selectedVariant ? {
            ...(selectedVariant.color ? { color: selectedVariant.color } : {}),
            ...(selectedVariant.size ? { size: selectedVariant.size } : {}),
            ...(selectedVariant.variantId ? { variantId: selectedVariant.variantId } : {}),
            ...(selectedVariant.option1Label ? { option1Label: selectedVariant.option1Label } : {}),
            ...(selectedVariant.option1Value ? { option1Value: selectedVariant.option1Value } : {}),
            ...(selectedVariant.option2Label ? { option2Label: selectedVariant.option2Label } : {}),
            ...(selectedVariant.option2Value ? { option2Value: selectedVariant.option2Value } : {}),
          } : null;

          try {
            await cartService.addItem(cartId, product.id, unitPrice, quantity, variantId, personalizedOptions);
            await get().initializeForCurrentUser();
          } catch (e: any) {
            console.error('[CartStore] Failed to add item:', e?.message || e);
            set({ error: e?.message || 'Failed to add item to cart' });
          }
        };
        run();
      },

      removeItem: (itemId) => {
        const run = async () => {
          const cartId = get().cartId;
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
            set({ items: mapDbCartItemsToCartItems(rawItems) });
          } catch (e) {
            // Rollback on error
            set({ items: previousItems });
            console.error('[CartStore] Failed to remove item:', e);
          }
        };
        run();
      },

      updateQuantity: (itemId, quantity) => {
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) {
            await get().initializeForCurrentUser();
            if (!get().cartId) return;
          }

          if (quantity <= 0) {
            return get().removeItem(itemId);
          }

          // Optimistic update — reflects instantly in UI
          const previousItems = get().items;
          set(state => ({
            items: state.items.map(i =>
              (i.cartItemId === itemId || i.id === itemId)
                ? { ...i, quantity }
                : i
            )
          }));

          try {
            const item = previousItems.find(i => i.cartItemId === itemId);
            if (item) {
              await cartService.updateCartItemQuantity(item.cartItemId, quantity);
            } else {
              const verifiedCartId = cartId as string;
              await cartService.updateQuantity(verifiedCartId, itemId, quantity);
            }
            // No re-fetch needed — optimistic update is accurate.
            // A full refresh happens automatically on next screen focus.
          } catch (e) {
            // Rollback on error
            set({ items: previousItems });
            console.error('[CartStore] Failed to update quantity:', e);
          }
        };
        run();
      },

      updateItemVariant: async (cartItemId, variantId, options) => {
        // Optimistically update local state if needed, or just wait for refresh
        const run = async () => {
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
        run();
      },

      clearCart: () => {
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) return;

          const previousItems = get().items;
          set({ items: [] });

          try {
            await cartService.clearCart(cartId);
          } catch (e) {
            // Rollback on error
            set({ items: previousItems });
            console.error('[CartStore] Failed to clear cart:', e);
          }
        };
        run();
      },

      removeItems: async (cartItemIds: string[]) => {
        if (!cartItemIds || cartItemIds.length === 0) return;

        const previousItems = get().items;
        set(state => ({
          items: state.items.filter(i => !cartItemIds.includes(i.cartItemId) && !cartItemIds.includes(i.id))
        }));

        try {
          await cartService.removeItems(cartItemIds);

          // Background refresh
          const cartId = get().cartId;
          if (cartId) {
            const rawItems = await cartService.getCartItems(cartId);
            set({ items: mapDbCartItemsToCartItems(rawItems) });
          }
        } catch (e) {
          // Rollback on error
          set({ items: previousItems });
          console.error('[CartStore] Failed to remove multiple items:', e);
          set({ error: 'Failed to delete selected items' });
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