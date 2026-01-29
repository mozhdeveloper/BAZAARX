/**
 * CartService
 * Mobile App Port of web/src/services/cartService.ts
 * Handles all cart-related operations between client and Supabase
 * Following the Service Layer Architecture pattern
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CartItem, Product } from '../types';

export class CartService {
    private static instance: CartService;

    private constructor() { }

    public static getInstance(): CartService {
        if (!CartService.instance) {
            CartService.instance = new CartService();
        }
        return CartService.instance;
    }

    /**
     * Get or create cart for a buyer
     */
    async getOrCreateCart(buyerId: string): Promise<string> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured');
        }

        try {
            const { data: existingCart } = await supabase
                .from('carts')
                .select('id')
                .eq('buyer_id', buyerId)
                .is('expires_at', null)
                .maybeSingle();

            if (existingCart) {
                return existingCart.id;
            }

            const { data: newCart, error: createErr } = await supabase
                .from('carts')
                .insert({
                    buyer_id: buyerId,
                    discount_amount: 0,
                    shipping_cost: 0,
                    tax_amount: 0,
                    total_amount: 0,
                })
                .select()
                .single();

            if (createErr) throw createErr;
            if (!newCart) throw new Error('Failed to create cart');

            return newCart.id;
        } catch (error) {
            console.error('[CartService] Error in getOrCreateCart:', error);
            throw error;
        }
    }

    /**
     * Get cart items for a cart ID
     */
    async getCartItems(cartId: string): Promise<CartItem[]> {
        if (!isSupabaseConfigured()) return [];

        try {
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
              is_verified,
              id
            )
          )
        `)
                .eq('cart_id', cartId);

            if (error) throw error;

            return (data || []).map((row: any) => {
                const p = row.product || {};
                const image = p.primary_image || (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '');
                const sellerObj = p.seller || {};
                return {
                    id: p.id || row.product_id,
                    name: p.name || 'Product',
                    price: typeof p.price === 'number' ? p.price : parseFloat(p.price || '0'),
                    originalPrice: typeof p.original_price === 'number' ? p.original_price : parseFloat(p.original_price || '0') || undefined,
                    images: Array.isArray(p.images) ? p.images : [],
                    rating: typeof p.rating === 'number' ? p.rating : 0,
                    sold: typeof p.sales_count === 'number' ? p.sales_count : 0,
                    seller: sellerObj.store_name || sellerObj.business_name || 'Official Store',
                    sellerId: p.seller_id || sellerObj.id,
                    seller_id: p.seller_id || sellerObj.id,
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
        } catch (error) {
            console.error('[CartService] Error in getCartItems:', error);
            throw error;
        }
    }

    /**
     * Add item to cart or increment quantity
     */
    async addItem(cartId: string, productId: string, unitPrice: number): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            const { data: existing } = await supabase
                .from('cart_items')
                .select('*')
                .eq('cart_id', cartId)
                .eq('product_id', productId)
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
                        product_id: productId,
                        quantity: 1,
                        subtotal: unitPrice,
                    });
            }

            await this.syncCartTotal(cartId);
        } catch (error) {
            console.error('[CartService] Error in addItem:', error);
            throw error;
        }
    }

    /**
     * Update item quantity
     */
    async updateQuantity(cartId: string, productId: string, quantity: number, unitPrice: number): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            if (quantity <= 0) {
                await this.removeItem(cartId, productId);
                return;
            }

            await supabase
                .from('cart_items')
                .update({
                    quantity,
                    subtotal: quantity * unitPrice,
                })
                .eq('cart_id', cartId)
                .eq('product_id', productId);

            await this.syncCartTotal(cartId);
        } catch (error) {
            console.error('[CartService] Error in updateQuantity:', error);
            throw error;
        }
    }

    /**
     * Remove item from cart
     */
    async removeItem(cartId: string, productId: string): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            await supabase
                .from('cart_items')
                .delete()
                .eq('cart_id', cartId)
                .eq('product_id', productId);

            await this.syncCartTotal(cartId);
        } catch (error) {
            console.error('[CartService] Error in removeItem:', error);
            throw error;
        }
    }

    /**
     * Clear all items in cart
     */
    async clearCart(cartId: string): Promise<void> {
        if (!isSupabaseConfigured()) return;

        try {
            await supabase.from('cart_items').delete().eq('cart_id', cartId);
            await supabase.from('carts').update({ total_amount: 0 }).eq('id', cartId);
        } catch (error) {
            console.error('[CartService] Error in clearCart:', error);
            throw error;
        }
    }

    /**
     * Sync the parent cart total amount
     */
    async syncCartTotal(cartId: string): Promise<number> {
        if (!isSupabaseConfigured()) return 0;

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

            return newTotal;
        } catch (error) {
            console.error('[CartService] Error in syncCartTotal:', error);
            throw error;
        }
    }
}

export const cartService = CartService.getInstance();
