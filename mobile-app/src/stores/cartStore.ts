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
            if (cartChannel) {
              try { await supabase.removeChannel(cartChannel); } catch {}
              cartChannel = null;
            }
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
              const image =
                p.primary_image ||
                (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '');
              const priceNum =
                typeof p.price === 'number' ? p.price : parseFloat(p.price || '0');
              const sellerObj = p.seller || {};
              return {
                id: p.id || row.product_id,
                name: p.name || 'Product',
                price: priceNum || 0,
                originalPrice:
                  typeof p.original_price === 'number'
                    ? p.original_price
                    : parseFloat(p.original_price || '0') || undefined,
                image: image || '',
                images: Array.isArray(p.images) ? p.images : [],
                rating: typeof p.rating === 'number' ? p.rating : 0,
                sold: typeof p.sold === 'number' ? p.sold : 0,
                seller:
                  sellerObj.store_name || sellerObj.business_name || 'Official Store',
                sellerId: p.seller_id || sellerObj.id,
                sellerRating:
                  typeof sellerObj.rating === 'number'
                    ? sellerObj.rating
                    : parseFloat(sellerObj.rating || '0') || 0,
                sellerVerified: !!sellerObj.is_verified,
                isFreeShipping: !!p.is_free_shipping,
                isVerified: !!p.is_verified,
                location: sellerObj.business_address || 'Philippines',
                description: p.description || '',
                category: p.category || 'general',
                stock:
                  typeof p.stock === 'number'
                    ? p.stock
                    : parseInt(p.stock || '0') || undefined,
                reviews: p.reviews || [],
                quantity: row.quantity || 1,
              };
            });
            set({ items: mapped });
            // Start realtime sync for this cart
            cartChannel = supabase
              .channel(`cart-items-${cartId}`)
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'cart_items', filter: `cart_id=eq.${cartId}` },
                () => {
                  get().initializeForCurrentUser();
                }
              )
              .subscribe();
          } else {
            set({ items: [] });
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
          const state = get();
          let cartId = state.cartId;
          if (!cartId) {
            const { data: cart } = await supabase
              .from('carts')
              .select('*')
              .eq('buyer_id', userId)
              .is('expires_at', null)
              .maybeSingle();
            cartId = cart?.id || null;
            if (!cartId) {
              const { data: newCart } = await supabase
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
              cartId = newCart?.id || null;
            }
            set({ cartId });
          }
          if (!cartId) return;
          const { data: existing } = await supabase
            .from('cart_items')
            .select('*')
            .eq('cart_id', cartId)
            .eq('product_id', product.id)
            .is('selected_variant', null)
            .maybeSingle();
          if (existing) {
            const newQty = (existing as any).quantity + 1;
            const unitPrice =
              typeof product.price === 'number'
                ? product.price
                : parseFloat(String(product.price) || '0');
            await supabase
              .from('cart_items')
              .update({
                quantity: newQty,
                subtotal: newQty * unitPrice,
              })
              .eq('id', (existing as any).id);
          } else {
            const unitPrice =
              typeof product.price === 'number'
                ? product.price
                : parseFloat(String(product.price) || '0');
            await supabase
              .from('cart_items')
              .insert({
                cart_id: cartId,
                product_id: product.id,
                quantity: 1,
                subtotal: unitPrice,
                selected_variant: null,
                personalized_options: null,
                notes: null,
              });
          }
          await get().initializeForCurrentUser();
        };
        run();
      },

      removeItem: (productId) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === 'guest') {
          set({ items: get().items.filter((item) => item.id !== productId) });
          return;
        }
        const run = async () => {
          const state = get();
          const cartId = state.cartId;
          if (!cartId) return;
          const { data: item } = await supabase
            .from('cart_items')
            .select('id')
            .eq('cart_id', cartId)
            .eq('product_id', productId)
            .is('selected_variant', null)
            .maybeSingle();
          if (item?.id) {
            await supabase.from('cart_items').delete().eq('id', item.id);
          }
          await get().initializeForCurrentUser();
        };
        run();
      },

      updateQuantity: (productId, quantity) => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === 'guest') {
          if (quantity === 0) {
            get().removeItem(productId);
            return;
          }
          set({
            items: get().items.map((item) =>
              item.id === productId ? { ...item, quantity } : item
            ),
          });
          return;
        }
        const run = async () => {
          if (quantity === 0) {
            await get().removeItem(productId);
            return;
          }
          const state = get();
          const cartId = state.cartId;
          if (!cartId) return;
          const { data: item } = await supabase
            .from('cart_items')
            .select('id')
            .eq('cart_id', cartId)
            .eq('product_id', productId)
            .is('selected_variant', null)
            .maybeSingle();
          if (item?.id) {
            const uiItem = state.items.find(i => i.id === productId);
            const unitPrice =
              typeof (uiItem?.price || 0) === 'number'
                ? (uiItem?.price || 0)
                : parseFloat(String(uiItem?.price || 0));
            await supabase
              .from('cart_items')
              .update({
                quantity,
                subtotal: quantity * unitPrice,
              })
              .eq('id', item.id);
            await get().initializeForCurrentUser();
          }
        };
        run();
      },

      clearCart: () => {
        const userId = useAuthStore.getState().user?.id;
        if (!userId || userId === 'guest') {
          set({ items: [] });
          return;
        }
        const run = async () => {
          const cartId = get().cartId;
          if (!cartId) {
            set({ items: [] });
            return;
          }
          await supabase.from('cart_items').delete().eq('cart_id', cartId);
          await supabase.from('carts').delete().eq('id', cartId);
          set({ items: [], cartId: null });
          if (cartChannel) {
            try { await supabase.removeChannel(cartChannel); } catch {}
            cartChannel = null;
          }
        };
        run();
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
