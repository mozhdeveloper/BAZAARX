/**
 * Cart Service
 * Handles all cart-related database operations
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Cart, CartItem, Database } from '@/types/database.types';

type CartInsert = Database['public']['Tables']['carts']['Insert'];
type CartItemInsert = Database['public']['Tables']['cart_items']['Insert'];

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
    let { data: cart, error } = await supabase
      .from('carts')
      .select('*')
      .eq('buyer_id', buyerId)
      .is('expires_at', null)
      .single();

    // If no cart exists, create one
    if (error || !cart) {
      const { data: newCart, error: createError } = await supabase
        .from('carts')
        .insert({
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
          expires_at: null,
        })
        .select()
        .single();

      if (createError) throw createError;
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
    // Check if item already exists
    const { data: existing } = await supabase
      .from('cart_items')
      .select('*')
      .eq('cart_id', cartId)
      .eq('product_id', productId)
      .single();

    if (existing) {
      // Update quantity
      const { data, error } = await supabase
        .from('cart_items')
        .update({ quantity: existing.quantity + quantity })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Insert new item
      const { data, error } = await supabase
        .from('cart_items')
        .insert({
          cart_id: cartId,
          product_id: productId,
          quantity,
          selected_variant: selectedVariant || null,
          personalized_options: null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
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
    const { error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId);

    if (error) throw error;
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
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
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
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('cart_id', cartId);

    if (error) throw error;
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
    const { error } = await supabase
      .from('carts')
      .update(totals)
      .eq('id', cartId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating cart totals:', error);
    return false;
  }
};
