import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CartItem, Product } from '../types';
import { supabase } from '../lib/supabase';
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
          const { data: items, error: fetchErr } = await supabase
            .from('cart_items')
            .select('subtotal')
            .eq('cart_id', cartId);

          if (fetchErr) throw fetchErr;

          const newTotal = (items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);

          await supabase
            .from('carts')
            .update({ total_amount: newTotal })
            .eq('id', cartId);

          console.log(`[CartStore] Updated total_amount to ${newTotal}`);
        } catch (e) {
          console.error('[CartStore] Failed to sync total:', e);
        }
      },

      initializeForCurrentUser: async () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === 'guest') return;
        set({ isLoading: true, error: null });
        try {
          const { data: existingCart } = await supabase
            .from('carts')
            .select('*')
            .eq('buyer_id', userId)
            .is('expires_at', null)
            .maybeSingle();

          let cartId = existingCart?.id || null;
          if (!cartId) {
            const { data: newCart, error: createErr } = await supabase
              .from('carts')
              .insert({
                buyer_id: userId,
                discount_amount: 0,
                shipping_cost: 0,
                tax_amount: 0,
                total_amount: 0,
              })
              .select()
              .single();
            if (createErr) throw createErr;
            cartId = newCart?.id || null;
          }
          set({ cartId });

          if (cartId) {
            const { data, error } = await supabase
              .from('cart_items')
              .select(`
                *,
                product:products (
                  *,
                  seller:sellers!products_seller_id_fkey (
                    business_name,
                    store_name,
                    business_address,
                    rating,
                    is_verified
                  )
                )
              `)
              .eq('cart_id', cartId);

            if (error) throw error;

            const mapped: CartItem[] = (data || []).map((row: any) => {
              const p = row.product || {};
              const image = p.primary_image || (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '');
              const sellerObj = p.seller || {};
              return {
                id: p.id || row.product_id,
                name: p.name || 'Product',
                price: typeof p.price === 'number' ? p.price : parseFloat(p.price || '0'),
                originalPrice: typeof p.original_price === 'number' ? p.original_price : parseFloat(p.original_price || '0') || undefined,
                image: image || '',
                images: Array.isArray(p.images) ? p.images : [],
                rating: typeof p.rating === 'number' ? p.rating : 0,
                sold: typeof p.sales_count === 'number' ? p.sales_count : 0,
                seller: sellerObj.store_name || sellerObj.business_name || 'Official Store',
                sellerId: p.seller_id || sellerObj.id,
                sellerRating: typeof sellerObj.rating === 'number' ? sellerObj.rating : 4.8,
                sellerVerified: !!sellerObj.is_verified,
                isFreeShipping: !!p.is_free_shipping,
                isVerified: !!p.is_verified,
                location: sellerObj.business_address || 'Philippines',
                description: p.description || '',
                category: p.category || 'general',
                stock: typeof p.stock === 'number' ? p.stock : 0,
                quantity: row.quantity || 1,
              };
            });
            set({ items: mapped });
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

          const { data: existing } = await supabase
            .from('cart_items')
            .select('*')
            .eq('cart_id', cartId)
            .eq('product_id', product.id)
            .maybeSingle();

          if (existing) {
            const newQty = (existing as any).quantity + 1;
            await supabase
              .from('cart_items')
              .update({ quantity: newQty, subtotal: newQty * unitPrice })
              .eq('id', (existing as any).id);
          } else {
            await supabase
              .from('cart_items')
              .insert({
                cart_id: cartId,
                product_id: product.id,
                quantity: 1,
                subtotal: unitPrice,
              });
          }

          // CRITICAL: Sync the parent total
          await get().syncCartTotal(cartId);
          await get().initializeForCurrentUser();
        };
        run();
      },

      removeItem: (productId) => {
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) return;

          await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', cartId)
            .eq('product_id', productId);

          // CRITICAL: Sync the parent total
          await get().syncCartTotal(cartId);
          await get().initializeForCurrentUser();
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

          await supabase
            .from('cart_items')
            .update({
              quantity,
              subtotal: quantity * unitPrice,
            })
            .eq('cart_id', cartId)
            .eq('product_id', productId);

          // CRITICAL: Sync the parent total
          await get().syncCartTotal(cartId);
          await get().initializeForCurrentUser();
        };
        run();
      },

      clearCart: () => {
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) return;
          await supabase.from('cart_items').delete().eq('cart_id', cartId);
          await supabase.from('carts').update({ total_amount: 0 }).eq('id', cartId);
          set({ items: [] });
        };
        run();
      },

      getTotal: () => get().items.reduce((total, item) => total + item.price * item.quantity, 0),
      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),

      setQuickOrder: (product, quantity = 1) => set({ quickOrder: { ...product, quantity } as CartItem }),
      clearQuickOrder: () => set({ quickOrder: null }),
      getQuickOrderTotal: () => get().quickOrder ? (get().quickOrder!.price * get().quickOrder!.quantity) : 0,
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);