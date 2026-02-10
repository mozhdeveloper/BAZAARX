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
   */
  async getCart(buyerId: string): Promise<Cart | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch cart');
      return null;
    }

    try {
      const { data: cart, error } = await supabase
        .from('carts')
        .select('*')
        .eq('buyer_id', buyerId)
        .maybeSingle();

      if (error) throw error;
      return cart;
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
            category_id,
            seller_id,
            seller:sellers (
              id,
              store_name,
              avatar_url,
              approval_status
            ),
            category:categories (name),
            images:product_images (image_url, is_primary, sort_order)
          ),
          variant:product_variants (
            id,
            sku,
            variant_name,
            size,
            color,
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

      const { data: existing, error: findError } = await query.maybeSingle();

      if (findError) throw findError;

      if (existing) {
        // Update quantity
        const newQuantity = (existing as any).quantity + quantity;
        const { data, error } = await supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
            personalized_options: personalizedOptions || (existing as any).personalized_options,
            notes: notes || (existing as any).notes,
            updated_at: new Date().toISOString()
          })
          .eq('id', (existing as any).id)
          .select()
          .single();

        if (error) throw error;
        return data; // Return immediately
      }

      // Insert new item if not exists
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

      if (error) throw error;
      if (!data) throw new Error('Failed to insert cart item');

      return data;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add item to cart.');
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
}

export const cartService = CartService.getInstance();
