/**
 * Product Service
 * Handles all product-related database operations
 * Updated for new normalized schema (February 2026)
 * 
 * Key changes:
 * - Uses category_id FK instead of category string
 * - Joins product_images and product_variants tables
 * - Uses disabled_at/deleted_at instead of is_active boolean
 * - Products may not have seller_id directly (check schema)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Product, ProductWithSeller, ProductImage, ProductVariant, Category, Database } from '@/types/database.types';

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
   * Updated for new normalized schema with separate images/variants tables
   */
  async getProducts(filters?: {
    categoryId?: string;  // Changed from category to categoryId
    category?: string;    // Legacy support - will be converted to categoryId lookup
    sellerId?: string;
    isActive?: boolean;   // Legacy - maps to disabled_at IS NULL
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
      // New normalized query with proper joins
      // Includes variant_label_1/2 for dynamic variant labels
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories!products_category_id_fkey (
            id,
            name,
            slug,
            parent_id
          ),
          images:product_images (
            id,
            image_url,
            alt_text,
            sort_order,
            is_primary
          ),
          variants:product_variants (
            id,
            sku,
            barcode,
            variant_name,
            size,
            color,
            option_1_value,
            option_2_value,
            price,
            stock,
            thumbnail_url
          ),
          seller:sellers!products_seller_id_fkey (
            id,
            store_name,
            store_description,
            avatar_url,
            owner_name,
            approval_status,
            verified_at,
            business_profile:seller_business_profiles (
              business_type,
              city,
              province
            )
          )
        `)
        .is('deleted_at', null)  // Only non-deleted products
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      // Legacy category string support - lookup by name
      if (filters?.category && !filters?.categoryId) {
        // For now, filter on the joined category name
        query = query.eq('category.name', filters.category);
      }
      if (filters?.sellerId) {
        // Note: seller_id may not exist in products table yet (needs migration 003)
        // This filter will work after running the migration
        // For now, skip this filter if it causes an error
        try {
          query = query.eq('seller_id', filters.sellerId);
        } catch {
          console.warn('seller_id column not in products table - run migration 003');
        }
      }
      if (filters?.isActive !== undefined) {
        // Map legacy is_active to disabled_at
        if (filters.isActive) {
          query = query.is('disabled_at', null);
        } else {
          query = query.not('disabled_at', 'is', null);
        }
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

      // Transform to add legacy compatibility fields
      return (data || []).map(this.transformProduct);
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to fetch products. Please try again later.');
    }
  }

  /**
   * Transform product from DB to include legacy fields
   * Also handles dynamic variant labels (variant_label_1, variant_label_2)
   */
  private transformProduct(product: any): ProductWithSeller {
    const primaryImage = product.images?.find((img: ProductImage) => img.is_primary) || product.images?.[0];
    const images = product.images?.map((img: ProductImage) => img.image_url).filter(Boolean) || [];
    const totalStock = product.variants?.reduce((sum: number, v: ProductVariant) => sum + (v.stock || 0), 0) || product.stock || 0;

    // Extract colors and sizes from variants for legacy support
    const colors = [...new Set(product.variants?.map((v: ProductVariant) => v.color).filter(Boolean) || [])] as string[];
    const sizes = [...new Set(product.variants?.map((v: ProductVariant) => v.size).filter(Boolean) || [])] as string[];

    // Extract option_1 and option_2 values for dynamic variant support
    const option1Values = [...new Set(product.variants?.map((v: ProductVariant) => (v as any).option_1_value).filter(Boolean) || [])] as string[];
    const option2Values = [...new Set(product.variants?.map((v: ProductVariant) => (v as any).option_2_value).filter(Boolean) || [])] as string[];

    // Extract seller info
    const businessProfile = Array.isArray(product.seller?.business_profile)
      ? product.seller.business_profile[0]
      : product.seller?.business_profile;

    return {
      ...product,
      // Legacy compatibility fields
      is_active: !product.disabled_at,
      stock: totalStock,
      // Primary image as main image
      primary_image_url: primaryImage?.image_url,
      primary_image: primaryImage?.image_url,
      // Images array
      images: images,
      // Category name for legacy code
      category: product.category?.name,
      // Extracted variants data for legacy compatibility
      colors: colors,
      sizes: sizes,
      // Dynamic variant labels and values
      variant_label_1: product.variant_label_1,
      variant_label_2: product.variant_label_2,
      option1Values: option1Values,
      option2Values: option2Values,
      // Seller info for legacy code
      seller: product.seller ? {
        ...product.seller,
        business_profile: businessProfile,
      } : undefined,
      // Ensure originalPrice is mapped from original_price
      originalPrice: product.original_price,
    };
  }

  /**
   * Get all products (alias for getProducts without filters)
   */
  async getAllProducts(): Promise<ProductWithSeller[]> {
    return this.getProducts();
  }

  /**
   * Get only active products (not disabled or deleted)
   */
  async getActiveProducts(): Promise<ProductWithSeller[]> {
    return this.getProducts({ isActive: true });
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
          category:categories!products_category_id_fkey (
            id,
            name,
            slug,
            parent_id,
            icon,
            image_url
          ),
          images:product_images (
            id,
            image_url,
            alt_text,
            sort_order,
            is_primary
          ),
          variants:product_variants (
            id,
            sku,
            barcode,
            variant_name,
            size,
            color,
            option_1_value,
            option_2_value,
            price,
            stock,
            thumbnail_url
          ),
          seller:sellers!products_seller_id_fkey (
            id,
            store_name,
            store_description,
            avatar_url,
            owner_name,
            approval_status,
            verified_at,
            business_profile:seller_business_profiles (
              business_type,
              city,
              province
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data ? this.transformProduct(data) : null;
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
   * Delete a product (soft delete using deleted_at timestamp)
   * New schema uses deleted_at instead of is_active boolean
   */
  async deleteProduct(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot delete product');
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product.');
    }
  }

  /**
   * Disable a product (sets disabled_at timestamp)
   */
  async disableProduct(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot disable product');
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ disabled_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error disabling product:', error);
      throw new Error('Failed to disable product.');
    }
  }

  /**
   * Enable a product (clears disabled_at timestamp)
   */
  async enableProduct(id: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured - cannot enable product');
    }

    try {
      const { error } = await supabase
        .from('products')
        .update({ disabled_at: null })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error enabling product:', error);
      throw new Error('Failed to enable product.');
    }
  }

  /**
   * Add images to a product
   */
  async addProductImages(productId: string, images: Omit<ProductImage, 'id' | 'uploaded_at'>[]): Promise<ProductImage[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('product_images')
        .insert(images.map(img => ({ ...img, product_id: productId })))
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error adding product images:', error);
      throw new Error('Failed to add product images.');
    }
  }

  /**
   * Add variants to a product
   */
  async addProductVariants(productId: string, variants: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>[]): Promise<ProductVariant[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const { data, error } = await supabase
        .from('product_variants')
        .insert(variants.map(v => ({ ...v, product_id: productId })))
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error adding product variants:', error);
      throw new Error('Failed to add product variants.');
    }
  }

  /**
   * Update product variant stock
   */
  async updateVariantStock(variantId: string, stock: number): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ stock })
        .eq('id', variantId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating variant stock:', error);
      throw new Error('Failed to update stock.');
    }
  }

  /**
   * Update a product variant (price and/or stock)
   */
  async updateVariant(variantId: string, updates: { price?: number; stock?: number }): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.price !== undefined) updateData.price = updates.price;
      if (updates.stock !== undefined) updateData.stock = updates.stock;

      const { error } = await supabase
        .from('product_variants')
        .update(updateData)
        .eq('id', variantId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating variant:', error);
      throw new Error('Failed to update variant.');
    }
  }

  /**
   * Update multiple variants at once
   */
  async updateVariants(variants: { id: string; price?: number; stock?: number }[]): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      // Update each variant individually (Supabase doesn't support bulk update with different values)
      await Promise.all(
        variants.map(v => this.updateVariant(v.id, { price: v.price, stock: v.stock }))
      );
    } catch (error) {
      console.error('Error updating variants:', error);
      throw new Error('Failed to update variants.');
    }
  }

  /**
   * Deduct stock for a product (updates product_variants directly)
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
      // Get the first variant of the product and deduct stock
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, stock')
        .eq('product_id', productId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (variants && variants.length > 0) {
        const variant = variants[0];
        const newStock = Math.max(0, (variant.stock || 0) - quantity);

        const { error } = await supabase
          .from('product_variants')
          .update({ stock: newStock })
          .eq('id', variant.id);

        if (error) throw error;
      }
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
      // Get the first variant of the product and add stock
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, stock')
        .eq('product_id', productId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (variants && variants.length > 0) {
        const variant = variants[0];
        const newStock = (variant.stock || 0) + quantity;

        const { error } = await supabase
          .from('product_variants')
          .update({ stock: newStock })
          .eq('id', variant.id);

        if (error) throw error;
      }
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
