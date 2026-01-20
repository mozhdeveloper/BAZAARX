/**
 * Cart Service
 * Handles all cart-related database operations
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Cart, CartItem } from '@/types/database.types';


// Mock data fallback
let mockCart: Cart | null = null;
let mockCartItems: CartItem[] = [];

/**
 * Get or create cart for a buyer
 */
export const getOrCreateCart = async (buyerId: string): Promise<Cart | null> => {
  if (!isSupabaseConfigured()) {
    if (!mockCart) {
      mockCart = {
        id: crypto.randomUUID(),
        buyer_id: buyerId,
        subtotal: 0,
        discount_amount: 0,
        shipping_cost: 0,
        tax_amount: 0,
        total_amount: 0,
        promo_code: null,
        voucher_id: null,
        shipping_address_id: null,
        shipping_method: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        expires_at: null,
      };
    }
    return mockCart;
  }

  try {
    // Try to get existing cart
    const { data: cart } = await supabase
      .from('carts')
      .select('*')
      .eq('buyer_id', buyerId)
      .is('expires_at', null)
      .maybeSingle();

    // If no cart exists, create one
    if (!cart) {
      const { data: newCart, error: createError } = await (supabase as any)
        .from('carts')
        .insert({
          buyer_id: buyerId,
          discount_amount: 0,
          shipping_cost: 0,
          tax_amount: 0,
          total_amount: 0,
          promo_code: null,
          voucher_id: null,
          shipping_address_id: null,
          shipping_method: null,
          notes: null,
          expires_at: null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating cart:', createError);
        throw createError;
      }
      return newCart;
    }

    return cart;
  } catch (error) {
    console.error('Error getting/creating cart:', error);
    return null;
  }
};

/**
 * Get cart items
 */
export const getCartItems = async (cartId: string): Promise<CartItem[]> => {
  if (!isSupabaseConfigured()) {
    return mockCartItems;
  }

  try {
    const { data, error } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('cart_id', cartId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching cart items:', error);
    return [];
  }
};

/**
 * Add item to cart
 */
export const addToCart = async (
  cartId: string,
  productId: string,
  quantity: number,
  selectedVariant?: any,
  notes?: string
): Promise<CartItem | null> => {
  if (!isSupabaseConfigured()) {
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      cart_id: cartId,
      product_id: productId,
      quantity,
      selected_variant: selectedVariant || null,
      personalized_options: null,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    mockCartItems.push(newItem);
    return newItem;
  }

  try {
    // Get product price
    const { data: product } = await supabase
      .from('products')
      .select('price')
      .eq('id', productId)
      .single();

    const unitPrice = selectedVariant?.price || (product as any)?.price || 0;

    // Check if item already exists with the same variant
    let query = (supabase as any)
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId);

    if (selectedVariant) {
      query = query.eq('selected_variant', selectedVariant);
    } else {
      query = query.is('selected_variant', null);
    }

    const { data: existing } = await query.maybeSingle();

    let result;
    if (existing) {
      // Update quantity and subtotal
      const newQuantity = (existing as any).quantity + quantity;
      const { data, error } = await (supabase as any)
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
      const { data, error } = await (supabase as any)
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

    // Recalculate cart totals
    await recalculateCartTotals(cartId);
    return result;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return null;
  }
};

/**
 * Update cart item quantity
 */
export const updateCartItemQuantity = async (
  itemId: string,
  quantity: number
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const item = mockCartItems.find(i => i.id === itemId);
    if (item) {
      item.quantity = quantity;
      return true;
    }
    return false;
  }

  try {
    // Fetch item to get product price
    const { data: item } = await (supabase as any)
      .from('cart_items')
      .select('*, product:products(price)')
      .eq('id', itemId)
      .single();

    if (!item) return false;

    const unitPrice = item.selected_variant?.price || item.product?.price || 0;

    const { error } = await (supabase as any)
      .from('cart_items')
      .update({
        quantity,
        subtotal: quantity * unitPrice
      })
      .eq('id', itemId);

    if (error) throw error;

    // Recalculate cart totals
    await recalculateCartTotals(item.cart_id);
    return true;
  } catch (error) {
    console.error('Error updating cart item:', error);
    return false;
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (itemId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    mockCartItems = mockCartItems.filter(i => i.id !== itemId);
    return true;
  }

  try {
    // Fetch item to get cartId before deletion
    const { data: item } = await supabase
      .from('cart_items')
      .select('cart_id')
      .eq('id', itemId)
      .single();

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    if (item) {
      await recalculateCartTotals((item as any).cart_id);
    }
    return true;
  } catch (error) {
    console.error('Error removing from cart:', error);
    return false;
  }
};

/**
 * Clear cart
 */
export const clearCart = async (cartId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    mockCartItems = [];
    return true;
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

    return true;
  } catch (error) {
    console.error('Error clearing cart:', error);
    return false;
  }
};

/**
 * Update cart totals
 */
export const updateCartTotals = async (
  cartId: string,
  totals: {
    subtotal: number;
    discount_amount?: number;
    shipping_cost?: number;
    tax_amount?: number;
    total_amount: number;
  }
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    if (mockCart) {
      Object.assign(mockCart, totals);
      return true;
    }
    return false;
  }

  try {
    // Remove subtotal from the update payload as it doesn't exist in the carts table
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { subtotal, ...updatePayload } = totals;

    const { error } = await (supabase as any)
      .from('carts')
      .update(updatePayload)
      .eq('id', cartId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating cart totals:', error);
    return false;
  }
};

/**
 * Recalculate cart totals
 */
export const recalculateCartTotals = async (cartId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    if (mockCart) {
      const subtotal = mockCartItems.reduce((acc, item) => acc + ((item as any).subtotal || 0), 0);
      mockCart.subtotal = subtotal;
      mockCart.total_amount = subtotal;
      return true;
    }
    return false;
  }

  try {
    const items = await getCartItems(cartId);

    // If no items left, delete the cart
    if (items.length === 0) {
      const { error } = await supabase
        .from('carts')
        .delete()
        .eq('id', cartId);

      if (error) throw error;
      return true;
    }

    const subtotal = items.reduce((acc, item) => acc + ((item as any).subtotal || 0), 0);

    // For now: total_amount = subtotal (can add shipping/tax/discount later)
    return updateCartTotals(cartId, {
      subtotal,
      total_amount: subtotal
    });
  } catch (error) {
    console.error('Error recalculating cart totals:', error);
    return false;
  }
};
