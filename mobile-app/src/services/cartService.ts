/**
 * Cart Service
 * Handles all cart-related database operations
 * 
 * Updated for new normalized schema (February 2026):
 * - Simplified carts table: id, buyer_id, created_at, updated_at
 * - cart_items: product_id, variant_id (FK), quantity, personalized_options, notes
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { productService } from './productService';
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
        .select('id, buyer_id, created_at, updated_at')
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
   * Handles race condition: if INSERT fails due to duplicate key, fetch existing cart
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

        if (createError) {
          // Handle race condition: if duplicate key error, fetch the existing cart
          if (createError.code === '23505') {
            console.log('[CartService] ⚠️ Duplicate key error (race condition), fetching existing cart...');
            const existingCart = await this.getCart(buyerId);
            if (existingCart) {
              console.log('[CartService] ✅ Retrieved existing cart after race condition:', existingCart.id);
              return existingCart;
            }
          }
          throw createError;
        }
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
              avatar_url,
              is_vacation_mode,
              approval_status,
              is_permanently_blacklisted,
              temp_blacklist_until,
              suspended_at
            ),
            variants:product_variants (
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
            ),
            product_discounts (
              id,
              discount_type,
              discount_value,
              sold_count,
              campaign:discount_campaigns (
                id,
                badge_text,
                badge_color,
                discount_type,
                discount_value,
                max_discount_amount,
                ends_at,
                status,
                starts_at
              )
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
      return (data || []) as unknown as CartItem[];
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
    notes?: string,
    forceNewItem: boolean = false
  ): Promise<CartItem> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot add to cart');
    }

    try {
      // Verify product exists before inserting to avoid FK constraint errors
      const prod = await productService.getProductById(productId);
      if (!prod) {
        throw new Error('Product not found');
      }

      let existing: any = null;
      if (!forceNewItem) {
        // Check if item already exists with the same variant
        let query = supabase
          .from('cart_items')
          .select('id, cart_id, product_id, variant_id, quantity, created_at')
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
        existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;
      }

      let result;
      if (existing) {
        // Calculate new quantity from cumulative addition
        const newQuantity = (existing as any).quantity + quantity;

        // Check available stock before updating
        const availableStock = await this.getAvailableStock(productId, variantId || null);
        if (newQuantity > availableStock) {
          throw new Error(`Cannot add to cart. Only ${availableStock} items left in stock.`);
        }

        // Update quantity
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
          } as any)
          .select()
          .single();

        if (error) {
          throw error;
        }
        result = data;
      }

      if (!result) throw new Error('Failed to add or update cart item');
      return result as unknown as CartItem;
    } catch (error: any) {
      const msg = String(error?.message || error || '');
      if (msg.includes('Product not found') || msg.includes('violates foreign key')) {
        // Silently re-throw for cart store to handle with fallback
        throw error;
      } else {
        console.error('[CartService] addToCart failed:', msg);
        throw new Error(msg || 'Failed to add item to cart.');
      }
    }
  }

  /**
   * Get available stock for a product or variant
   * Returns stock from product_variants or sum of all variants
   */
  private async getAvailableStock(productId: string, variantId?: string | null): Promise<number> {
    if (variantId) {
      // Variant exists: check product_variants table
      const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('id', variantId)
        .single();

      if (variantError) throw variantError;
      if (!variant) throw new Error('Variant not found.');

      return variant.stock || 0;
    } else {
      // No variant: sum all variants for this product
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('stock')
        .eq('product_id', productId);

      if (variantsError) throw variantsError;

      return (variants || []).reduce((sum: number, v: any) => sum + (v.stock || 0), 0);
    }
  }

  /**
   * Update cart item quantity with strict stock validation
   * New schema: no subtotal on cart_items
   * 
   * 1. Fetch cart item to get product_id and variant_id
   * 2. Check current stock from product_variant or sum variants
   * 3. Validate quantity against available stock
   * 4. Update only if valid
   */
  async updateCartItemQuantity(
    itemId: string,
    quantity: number
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot update cart item');
    }

    try {
      // Step 1: Get cart item to extract product_id and variant_id
      const { data: cartItem, error: fetchError } = await supabase
        .from('cart_items')
        .select('product_id, variant_id')
        .eq('id', itemId)
        .single();

      if (fetchError) throw fetchError;
      if (!cartItem) throw new Error('Cart item not found.');

      const { product_id, variant_id } = cartItem;

      // Step 2: Check product/variant stock using helper method
      const availableStock = await this.getAvailableStock(product_id, variant_id);

      // Step 3: Validate requested quantity against available stock
      if (availableStock === 0) {
        throw new Error('This item is currently out of stock.');
      }

      if (quantity > availableStock) {
        throw new Error(`Only ${availableStock} items left in stock.`);
      }

      // Step 4: Update quantity only if validation passes
      const { error: updateError } = await supabase
        .from('cart_items')
        .update({ quantity })
        .eq('id', itemId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update item quantity.');
    }
  }

  /**
   * Update cart item variant
   */
  async updateCartItemVariant(
    itemId: string,
    variantId?: string | null,
    personalizedOptions?: Record<string, unknown> | null
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
       throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ 
          variant_id: variantId || null,
          personalized_options: (personalizedOptions || null) as any
        })
        .eq('id', itemId);

      if (error) throw error;
    } catch (error) {
       console.error('Error updating cart item variant:', error);
       throw new Error('Failed to update item variant.');
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
   * Remove multiple items from cart
   */
  async removeItems(itemIds: string[]): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot remove items');
    }

    if (!itemIds || itemIds.length === 0) return;

    try {
      const { error: deleteError } = await supabase
        .from('cart_items')
        .delete()
        .in('id', itemIds);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error removing multiple items from cart:', error);
      throw new Error('Failed to remove items from cart.');
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
  async addItem(cartId: string, productId: string, unitPrice: number, quantity: number, variantId?: string | null, personalizedOptions?: Record<string, unknown> | null, forceNewItem: boolean = false): Promise<CartItem> {
    return this.addToCart(cartId, productId, quantity, variantId || undefined, personalizedOptions || undefined, undefined, forceNewItem);
  }

  async removeItem(cartId: string, productId: string, variantId?: string | null): Promise<void> {
    // Find item by product ID (and variant if provided) and cart ID, then delete
    let query = supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('product_id', productId);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    const { data: items } = await query;

    if (items && items.length > 0) {
      await this.removeFromCart(items[0].id);
    }
  }

  async updateQuantity(cartId: string, productId: string, quantity: number, variantId?: string | null): Promise<void> {
    let query = supabase
      .from('cart_items')
      .select('id')
      .eq('cart_id', cartId)
      .eq('product_id', productId);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    }

    const { data: items } = await query;

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
