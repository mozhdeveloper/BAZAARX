/**
 * Cart Service
 * Handles all cart-related database operations
 * Adheres to the Class-based Service Layer Architecture
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
        .is('expires_at', null)
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
            discount_amount: 0,
            shipping_cost: 0,
            tax_amount: 0,
            total_amount: 0,
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
   * Get cart items
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
      return data || [];
    } catch (error) {
      console.error('Error fetching cart items:', error);
      throw new Error('Failed to fetch cart items.');
    }
  }

  /**
   * Add item to cart
   */
  async addToCart(
    cartId: string,
    productId: string,
    quantity: number,
    selectedVariant?: any,
    notes?: string
  ): Promise<CartItem> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot add to cart');
    }

    try {
      // Get product price
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      const unitPrice = selectedVariant?.price || (product as any)?.price || 0;

      // Check if item already exists with the same variant
      let query = supabase
        .from('cart_items')
        .select('*')
        .eq('cart_id', cartId)
        .eq('product_id', productId);

      if (selectedVariant) {
        query = query.eq('selected_variant', selectedVariant);
      } else {
        query = query.is('selected_variant', null);
      }

      const { data: existing, error: findError } = await query.maybeSingle();
      if (findError) throw findError;

      let result;
      if (existing) {
        // Update quantity and subtotal
        const newQuantity = (existing as any).quantity + quantity;
        const { data, error } = await supabase
          .from('cart_items')
          .update({
            quantity: newQuantity,
            subtotal: newQuantity * unitPrice
          })
          .eq('id', (existing as any).id)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new item with subtotal
        const { data, error } = await supabase
          .from('cart_items')
          .insert({
            cart_id: cartId,
            product_id: productId,
            quantity,
            subtotal: quantity * unitPrice,
            selected_variant: selectedVariant || null,
            personalized_options: null,
            notes: notes || null,
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      if (!result) throw new Error('Failed to add or update cart item');

      // Recalculate cart totals
      await this.recalculateCartTotals(cartId);
      return result;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to add item to cart.');
    }
  }

  /**
   * Update cart item quantity
   */
  async updateCartItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot update cart item');
    }

    try {
      // Fetch item to get product price
      const { data: item, error: fetchError } = await supabase
        .from('cart_items')
        .select('*, product:products(price)')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;
      if (!item) throw new Error('Cart item not found');

      const unitPrice = (item as any).selected_variant?.price || (item as any).product?.price || 0;

      const { error } = await supabase
        .from('cart_items')
        .update({
          quantity,
          subtotal: quantity * unitPrice
        })
        .eq('id', itemId);

      if (error) throw error;

      // Recalculate cart totals
      await this.recalculateCartTotals((item as any).cart_id);
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
      // Fetch item to get cartId before deletion
      const { data: item, error: fetchError } = await supabase
        .from('cart_items')
        .select('cart_id')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;

      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      if (item) {
        await this.recalculateCartTotals((item as any).cart_id);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw new Error('Failed to remove item from cart.');
    }
  }

  /**
   * Clear cart
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

      // Then delete the cart itself (since it's now empty)
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
   * Update cart totals
   */
  async updateCartTotals(
    cartId: string,
    totals: {
      subtotal: number;
      discount_amount?: number;
      shipping_cost?: number;
      tax_amount?: number;
      total_amount: number;
    }
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot update totals');
    }

    try {
      // Remove subtotal from the update payload as it doesn't exist in the carts table
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { subtotal, ...updatePayload } = totals;

      const { error } = await supabase
        .from('carts')
        .update(updatePayload)
        .eq('id', cartId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating cart totals:', error);
      throw new Error('Failed to update cart totals.');
    }
  }

  /**
   * Recalculate cart totals
   */
  async recalculateCartTotals(cartId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - skipping totals recalculation');
      return;
    }

    try {
      const items = await this.getCartItems(cartId);

      // If no items left, delete the cart
      if (items.length === 0) {
        const { error } = await supabase
          .from('carts')
          .delete()
          .eq('id', cartId);

        if (error) throw error;
        return;
      }

      const subtotal = items.reduce((acc, item) => acc + ((item as any).subtotal || 0), 0);

      // For now: total_amount = subtotal (can add shipping/tax/discount later)
      await this.updateCartTotals(cartId, {
        subtotal,
        total_amount: subtotal
      });
    } catch (error) {
      console.error('Error recalculating cart totals:', error);
      throw new Error('Failed to recalculate cart totals.');
    }
  }
}

export const cartService = CartService.getInstance();
