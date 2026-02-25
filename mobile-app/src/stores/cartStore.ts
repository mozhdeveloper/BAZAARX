import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';

interface CartStore {
  items: CartItem[];
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;

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
      quickOrder: null,

      addItem: (product) => {
        const items = get().items;
        const existingItem = items.find((item) => item.id === product.id);

        if (existingItem) {
          set({
            items: items.map((item) =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ),
          });
        } else {
          set({ items: [...items, { ...product, quantity: 1 }] });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((item) => item.id !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity === 0) {
          get().removeItem(productId);
          return;
        }

        set({
          items: get().items.map((item) =>
            item.id === productId ? { ...item, quantity } : item
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      // Quick Order (Buy Now) implementation
      setQuickOrder: (product, quantity = 1) => {
        set({
          quickOrder: {
            ...product,
            quantity,
          },
        });
      },

      clearQuickOrder: () => {
        set({ quickOrder: null });
      },

      getQuickOrderTotal: () => {
        const { quickOrder } = get();
        if (!quickOrder) return 0;
        return quickOrder.price * quickOrder.quantity;
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
