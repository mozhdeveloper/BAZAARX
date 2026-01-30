import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';
import { cartService } from '../services/cartService';
import { useAuthStore } from './authStore';

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
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  syncCartTotal: (cartId: string) => Promise<void>; // Added to interface

  // Quick Order (Buy Now)
  quickOrder: CartItem | null;
  setQuickOrder: (product: Product, quantity?: number) => void;
  clearQuickOrder: () => void;
  getQuickOrderTotal: () => number;
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
          const cartId = await cartService.getOrCreateCart(userId);
          set({ cartId });

          if (cartId) {
            const items = await cartService.getCartItems(cartId);
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

          try {
            await cartService.addItem(cartId, product.id, unitPrice, quantity, selectedVariant);
            await get().initializeForCurrentUser();
          } catch (e) {
            console.error('[CartStore] Failed to add item:', e);
          }
        };
        run();
      },

      removeItem: (productId) => {
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) return;

          try {
            await cartService.removeItem(cartId, productId);
            await get().initializeForCurrentUser();
          } catch (e) {
            console.error('[CartStore] Failed to remove item:', e);
          }
        };
        run();
      },

      updateQuantity: (productId, quantity) => {
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) return;

          if (quantity <= 0) {
            return get().removeItem(productId);
          }

          const item = get().items.find(i => i.id === productId);
          const unitPrice = item?.price || 0;

          try {
            await cartService.updateQuantity(cartId, productId, quantity, unitPrice);
            await get().initializeForCurrentUser();
          } catch (e) {
            console.error('[CartStore] Failed to update quantity:', e);
          }
        };
        run();
      },

      clearCart: () => {
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) return;
          try {
            await cartService.clearCart(cartId);
            set({ items: [] });
          } catch (e) {
            console.error('[CartStore] Failed to clear cart:', e);
          }
        };
        run();
      },

      getTotal: () => get().items.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0),
      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),

      setQuickOrder: (product, quantity = 1) => {
        const selectedVariant = (product as any).selectedVariant || null;
        set({ 
          quickOrder: { 
            ...product, 
            quantity,
            selectedVariant 
          } as CartItem 
        });
      },
      clearQuickOrder: () => set({ quickOrder: null }),
      getQuickOrderTotal: () => get().quickOrder ? ((get().quickOrder!.price ?? 0) * get().quickOrder!.quantity) : 0,
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);