/**
 * Product Service
 * Handles all product-related database operations
 * Adheres to the Class-based Service Layer Architecture
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Product, ProductWithSeller, Database } from '@/types/database.types';

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export class ProductService {
  private static instance: ProductService;

  private constructor() {
    if (ProductService.instance) {
      throw new Error('Use ProductService.getInstance() instead of new ProductService()');
    }
  }

  public static getInstance(): ProductService {
    if (!ProductService.instance) {
      ProductService.instance = new ProductService();
    }
    return ProductService.instance;
  }

  /**
   * Fetch products with optional filters
   */
  async getProducts(filters?: {
    category?: string;
    sellerId?: string;
    isActive?: boolean;
    approvalStatus?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }): Promise<ProductWithSeller[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch products');
      return [];
    }

    try {
      let query = supabase
        .from('products')
        .select(`
          *,
          seller:sellers!products_seller_id_fkey (
            business_name,
            store_name,
            rating,
            business_address
          )
        `)
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
        const limit = filters.limit || 10;
        query = query.range(filters.offset, filters.offset + limit - 1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to fetch products. Please try again later.');
    }
  }

  /**
   * Get a single product by ID
   */
  async getProductById(id: string): Promise<ProductWithSeller | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch product');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:sellers!products_seller_id_fkey (
            business_name,
            store_name,
            rating,
            business_address
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error('Failed to fetch product details.');
    }
  }

  /**
   * Create a new product
   */
  async createProduct(product: ProductInsert): Promise<Product> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot create product');
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('No data returned upon product creation');

      return data;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to create product.');
    }
  }

  /**
   * Create multiple products (bulk upload)
   */
  async createProducts(products: ProductInsert[]): Promise<Product[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot create products');
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .insert(products)
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error bulk creating products:', error);
      throw new Error('Failed to create products in bulk.');
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: string, updates: ProductUpdate): Promise<Product> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot update product');
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Product not found or update failed');

      return data;
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product.');
    }
  }

  /**
   * Delete a product (soft delete by setting is_active to false)
   */
  async deleteProduct(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot delete product');
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product.');
    }
  }

  /**
   * Deduct stock for a product (creates inventory ledger entry)
   */
  async deductStock(
    productId: string,
    quantity: number,
    reason: string,
    referenceId: string,
    userId?: string
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - stock deduction skipped');
      return;
    }

    try {
      const { error } = await supabase.rpc('deduct_product_stock', {
        p_product_id: productId,
        p_quantity: quantity,
        p_reason: reason,
        p_reference_id: referenceId,
        p_user_id: userId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Stock deduction failed:', error);
      throw new Error('Failed to deduct stock.');
    }
  }

  /**
   * Add stock for a product
   */
  async addStock(
    productId: string,
    quantity: number,
    reason: string,
    userId?: string
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - stock addition skipped');
      return;
    }

    try {
      const { error } = await supabase.rpc('add_product_stock', {
        p_product_id: productId,
        p_quantity: quantity,
        p_reason: reason,
        p_user_id: userId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Stock addition failed:', error);
      throw new Error('Failed to add stock.');
    }
  }

  /**
   * Get products by seller
   */
  async getProductsBySeller(sellerId: string): Promise<Product[]> {
    return this.getProducts({ sellerId });
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(category: string): Promise<Product[]> {
    return this.getProducts({ category });
  }

  /**
   * Search products
   */
  async searchProducts(query: string, limit = 20): Promise<Product[]> {
    return this.getProducts({ searchQuery: query, limit });
  }

  /**
   * Get approved and active products (public view)
   */
  async getPublicProducts(filters?: {
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<Product[]> {
    return this.getProducts({
      ...filters,
      isActive: true,
      approvalStatus: 'approved', // Changed to approved from pending for public view
    });
  }
}

export const productService = ProductService.getInstance();
