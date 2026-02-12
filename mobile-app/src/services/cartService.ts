/**
 * Cart Service
 * Handles all cart-related database operations
 * 
 * Updated for new normalized schema (February 2026):
 * - Simplified carts table: id, buyer_id, created_at, updated_at
 * - cart_items: product_id, variant_id (FK), quantity, personalized_options, notes
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Cart, CartItem } from '@/types/database.types';

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
   * Get existing cart for a buyer
   * New schema: carts table only has id, buyer_id, created_at, updated_at
   * 
   * FIXED: Handle multiple carts by getting the most recent one
   * Also cleans up duplicate carts to prevent future issues
   */
  async getCart(buyerId: string): Promise<Cart | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch cart');
      return null;
    }

    try {
      // Get all carts for this buyer to check for duplicates
      const { data: carts, error } = await supabase
        .from('carts')
        .select('*')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If no carts, return null
      if (!carts || carts.length === 0) {
        return null;
      }

      // If multiple carts exist (data corruption), use the most recent and clean up
      if (carts.length > 1) {
        console.warn(`[CartService] Found ${carts.length} carts for buyer ${buyerId}, cleaning up duplicates...`);
        
        const mostRecentCart = carts[0];
        const duplicateCartIds = carts.slice(1).map(c => c.id);

        // Delete duplicate carts (keep the most recent)
        try {
          await supabase
            .from('carts')
            .delete()
            .in('id', duplicateCartIds);
          
          console.log(`[CartService] ✅ Cleaned up ${duplicateCartIds.length} duplicate cart(s)`);
        } catch (deleteError) {
          console.error('[CartService] Failed to clean up duplicate carts:', deleteError);
          // Continue anyway - we'll use the most recent cart
        }

        return mostRecentCart;
      }

      // Single cart found - normal case
      return carts[0];
    } catch (error) {
      console.error('Error getting cart:', error);
      throw new Error('Failed to retrieve cart.');
    }
  }

  /**
   * Get or create cart for a buyer
   * New schema: simplified cart creation
   */
  async getOrCreateCart(buyerId: string): Promise<Cart> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot get or create cart');
    }

    try {
      // Try to get existing cart
      const cart = await this.getCart(buyerId);

      // If no cart exists, create one
      if (!cart) {
        const { data: newCart, error: createError } = await supabase
          .from('carts')
          .insert({
            buyer_id: buyerId,
          })
          .select()
          .single();

        if (createError) throw createError;
        if (!newCart) throw new Error('Failed to create new cart');

        return newCart;
      }

      return cart;
    } catch (error) {
      console.error('Error getting/creating cart:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to manage cart.');
    }
  }

  /**
   * Get cart items with product and variant details
   * Updated for new normalized schema
   */
  async getCartItems(cartId: string): Promise<CartItem[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch cart items');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products (
            id,
            name,
            description,
            price,
            seller_id,
            is_free_shipping,
            variant_label_1,
            variant_label_2,
            category_id,
            category:categories (name),
            images:product_images (image_url, is_primary, sort_order),
            seller:sellers!products_seller_id_fkey (
              id,
              store_name,
              avatar_url
            )
          ),
          variant:product_variants (
            id,
            sku,
            variant_name,
            size,
            color,
            option_1_value,
            option_2_value,
            price,
            stock,
            thumbnail_url
          )
        `)
        .eq('cart_id', cartId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching cart items:', error);
      throw new Error('Failed to fetch cart items.');
    }
  }

  /**
   * Add item to cart
   * Updated for new schema with variant_id
   */
  async addToCart(
    cartId: string,
    productId: string,
    quantity: number,
    variantId?: string,
    personalizedOptions?: Record<string, unknown>,
    notes?: string
  ): Promise<CartItem> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot add to cart');
    }

    try {
      // Check if item already exists with the same variant
      let query = supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartId)
        .eq('product_id', productId);

      // If variant specified, filter by variant_id
      if (variantId) {
        query = query.eq('variant_id', variantId);
      } else {
        query = query.is('variant_id', null);
      }

      // Use limit(1) instead of maybeSingle() to avoid errors on duplicates
      const { data: existingRows, error: findError } = await query.limit(1);
      if (findError) {
        console.error('[CartService] Error finding existing cart item:', findError);
        throw findError;
      }
      const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

      let result;
      if (existing) {
        // Update quantity
        const newQuantity = (existing as any).quantity + quantity;
        const { data, error } = await supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
            personalized_options: personalizedOptions || (existing as any).personalized_options,
            notes: notes || (existing as any).notes,
          })
          .eq('id', (existing as any).id)
          .select()
          .single();

        if (error) {
          console.error('[CartService] Error updating cart item quantity:', error);
          throw error;
        }
        result = data;
      } else {
        // Insert new item
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cartId,
            product_id: productId,
            quantity,
            variant_id: variantId || null,
            personalized_options: personalizedOptions || null,
            notes: notes || null,
          })
          .select()
          .single();

        if (error) {
          console.error('[CartService] Error inserting cart item:', error);
          throw error;
        }
        result = data;
      }

      if (!result) throw new Error('Failed to add or update cart item');
      return result;
    } catch (error: any) {
      console.error('[CartService] addToCart failed:', error?.message || error);
      throw new Error(error?.message || 'Failed to add item to cart.');
    }
  }

  /**
   * Update cart item quantity
   * New schema: no subtotal on cart_items
   */
  async updateCartItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot update cart item');
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update item quantity.');
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(itemId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot remove from cart');
    }

    try {
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw new Error('Failed to remove item from cart.');
    }
  }

  /**
   * Clear cart (delete all items and the cart itself)
   */
  async clearCart(cartId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot clear cart');
    }

    try {
      // Delete all items first
      const { error: deleteItemsError } = await supabase
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId);

      if (deleteItemsError) throw deleteItemsError;

      // Then delete the cart itself
      const { error: deleteCartError } = await supabase
        .from('carts')
        .delete()
        .eq('id', cartId);

      if (deleteCartError) throw deleteCartError;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw new Error('Failed to clear cart.');
    }
  }

  /**
   * Calculate cart totals from items
   * In new schema, totals are computed not stored on carts table
   */
  async calculateCartTotals(cartId: string): Promise<{
    subtotal: number;
    itemCount: number;
    items: CartItem[];
  }> {
    const items = await this.getCartItems(cartId);

    let subtotal = 0;
    let itemCount = 0;

    for (const item of items) {
      const qty = (item as any).quantity || 0;
      // Get price from variant if available, otherwise from product
      const price = (item as any).variant?.price || (item as any).product?.price || 0;
      subtotal += qty * price;
      itemCount += qty;
    }

    return { subtotal, itemCount, items };
  }

  // Convenience wrapper methods for cart store compatibility
  async addItem(cartId: string, productId: string, unitPrice: number, quantity: number, variantId?: string | null, personalizedOptions?: Record<string, unknown> | null): Promise<CartItem> {
    return this.addToCart(cartId, productId, quantity, variantId || undefined, personalizedOptions || undefined);
  }

  async removeItem(cartId: string, productId: string): Promise<void> {
    // Find item by product ID and cart ID, then delete
    const { data: items } = await supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('product_id', productId);

    if (items && items.length > 0) {
      await this.removeFromCart(items[0].id);
    }
  }

  async updateQuantity(cartId: string, productId: string, quantity: number): Promise<void> {
    const { data: items } = await supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('product_id', productId);

    if (items && items.length > 0) {
      await this.updateCartItemQuantity(items[0].id, quantity);
    }
  }

  async syncCartTotal(cartId: string): Promise<void> {
    // In new schema, totals are computed on the fly, not stored
    // This method is a no-op for compatibility
    return Promise.resolve();
  }
}

export const cartService = CartService.getInstance();
