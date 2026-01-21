/**
 * Product Service
 * Handles all product-related database operations
 * This service abstracts Supabase queries and provides a clean API for product management
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Product, Database } from '@/types/database.types';

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

// Mock data fallback (when Supabase is not configured)
const mockProducts: Product[] = [];

/**
 * Fetch products with optional filters
 */
export const getProducts = async (filters?: {
  category?: string;
  sellerId?: string;
  isActive?: boolean;
  approvalStatus?: string;
  searchQuery?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('Using mock data - Supabase not configured');
    return mockProducts;
  }

  try {
    let query = supabase
      .from('products')
      .select('*, seller:sellers(business_name, store_name, rating)')
      .order('created_at', { ascending: false });

    // Apply filters
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }
    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }
    if (filters?.approvalStatus) {
      query = query.eq('approval_status', filters.approvalStatus);
    }
    if (filters?.searchQuery) {
      query = query.or(`name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`);
    }
    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

/**
 * Get a single product by ID
 */
export const getProductById = async (id: string): Promise<Product | null> => {
  if (!isSupabaseConfigured()) {
    return mockProducts.find(p => p.id === id) || null;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*, seller:sellers(business_name, store_name, rating)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    return null;
  }
};

/**
 * Create a new product
 */
export const createProduct = async (product: ProductInsert): Promise<Product | null> => {
  if (!isSupabaseConfigured()) {
    const newProduct = {
      ...product,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Product;
    mockProducts.push(newProduct);
    return newProduct;
  }

  try {
    const { data, error } = await supabase
      .from('products')

      .insert(product)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error: unknown) {
    // Surface detailed error info instead of a generic Object log
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : JSON.stringify(error, null, 2);
    console.error('Error creating product:', message, error);
    throw error;
  }
};

/**
 * Create multiple products (bulk upload)
 */
export const createProducts = async (products: ProductInsert[]): Promise<Product[] | null> => {
  if (!isSupabaseConfigured()) {
    const newProducts = products.map(product => ({
      ...product,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as Product[];
    mockProducts.push(...newProducts);
    return newProducts;
  }

  try {
    const { data, error } = await supabase
      .from('products')

      .insert(products)
      .select();

    if (error) throw error;
    return data;
  } catch (error: unknown) {
    const message =
      error && typeof error === 'object' && 'message' in error
        ? (error as { message: string }).message
        : JSON.stringify(error, null, 2);
    console.error('Error bulk creating products:', message, error);
    throw error;
  }
};

/**
 * Update an existing product
 */
export const updateProduct = async (id: string, updates: ProductUpdate): Promise<Product | null> => {
  if (!isSupabaseConfigured()) {
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts[index] = {
        ...mockProducts[index],
        ...updates,
        updated_at: new Date().toISOString(),
      } as Product;
      return mockProducts[index];
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('products')

      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating product:', error);
    return null;
  }
};

/**
 * Delete a product (hard delete from database)
 */
export const deleteProduct = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const index = mockProducts.findIndex(p => p.id === id);
    if (index !== -1) {
      mockProducts.splice(index, 1);
      return true;
    }
    return false;
  }

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    return false;
  }
};

/**
 * Deduct stock for a product (creates inventory ledger entry)
 */
export const deductStock = async (
  productId: string,
  quantity: number,
  reason: string,
  referenceId: string,
  userId?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const product = mockProducts.find(p => p.id === productId);
    if (product) {
      product.stock -= quantity;
      return true;
    }
    return false;
  }

  try {
    // Call database function to handle stock deduction atomically

    const { error } = await supabase.rpc('deduct_product_stock', {
      p_product_id: productId,
      p_quantity: quantity,
      p_reason: reason,
      p_reference_id: referenceId,
      p_user_id: userId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Stock deduction failed:', error);
    return false;
  }
};

/**
 * Add stock for a product
 */
export const addStock = async (
  productId: string,
  quantity: number,
  reason: string,
  userId?: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const product = mockProducts.find(p => p.id === productId);
    if (product) {
      product.stock += quantity;
      return true;
    }
    return false;
  }

  try {

    const { error } = await supabase.rpc('add_product_stock', {
      p_product_id: productId,
      p_quantity: quantity,
      p_reason: reason,
      p_user_id: userId,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Stock addition failed:', error);
    return false;
  }
};

/**
 * Get products by seller
 */
export const getProductsBySeller = async (sellerId: string): Promise<Product[]> => {
  return getProducts({ sellerId });
};

/**
 * Get products by category
 */
export const getProductsByCategory = async (category: string): Promise<Product[]> => {
  return getProducts({ category });
};

/**
 * Search products
 */
export const searchProducts = async (query: string, limit = 20): Promise<Product[]> => {
  return getProducts({ searchQuery: query, limit });
};

/**
 * Get approved and active products (public view)
 */
export const getPublicProducts = async (filters?: {
  category?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> => {
  return getProducts({
    ...filters,
    isActive: true,
    approvalStatus: 'approved',
  });
};
