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

  private async ensureCategoryId(
    payload: ProductInsert & { category?: string; category_name?: string },
  ): Promise<ProductInsert> {
    let categoryId = payload.category_id || null;

    if (!categoryId) {
      const categoryName = payload.category || payload.category_name;
      if (typeof categoryName === 'string' && categoryName.trim().length > 0) {
        categoryId = await this.getOrCreateCategoryByName(categoryName);
      }
    }

    if (!categoryId) {
      const { data: defaultCategory, error } = await supabase
        .from('categories')
        .select('id')
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      categoryId = defaultCategory?.id || null;
    }

    if (!categoryId) {
      throw new Error('Category is required and could not be resolved.');
    }

    const { category, category_name, ...rest } = payload as ProductInsert & {
      category?: string;
      category_name?: string;
    };

    return {
      ...rest,
      category_id: categoryId,
    } as ProductInsert;
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
      // Includes reviews for rating calculation
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
          reviews (
            id,
            rating
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

      if (error) {
        throw error;
      }

      if (!data) {
        return [];
      }

      // Fetch sold counts for all products in a single query
      // Count only COMPLETED orders (paid + delivered)
      const productIds = data.map(p => p.id);
      
      console.log(`[ProductService] Querying sold counts for ${productIds.length} products...`);
      
      const { data: soldCountsData, error: soldCountsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, order:orders!inner(payment_status, shipment_status, order_type)')
        .in('product_id', productIds)
        .eq('order.payment_status', 'paid')
        .in('order.shipment_status', ['delivered', 'received']);

      if (soldCountsError) {
        console.error('[ProductService] Error fetching sold counts:', soldCountsError);
      }

      console.log(`[ProductService] Sold counts query returned ${soldCountsData?.length || 0} order items`);
      if (soldCountsData && soldCountsData.length > 0) {
        console.log('[ProductService] Sample sold count data:', soldCountsData.slice(0, 3));
      }

      // Calculate sold counts per product
      const soldCountsMap = new Map<string, number>();
      soldCountsData?.forEach(item => {
        const currentCount = soldCountsMap.get(item.product_id) || 0;
        const newCount = currentCount + (item.quantity || 0);
        soldCountsMap.set(item.product_id, newCount);
        console.log(`[ProductService] Product ${item.product_id.substring(0, 8)}: +${item.quantity} (total: ${newCount})`);
      });

      console.log(`[ProductService] Fetched ${data.length} products. Sold counts map has ${soldCountsMap.size} entries`);

      // Transform to add legacy compatibility fields
      return data.map(p => this.transformProduct(p, soldCountsMap.get(p.id) || 0));
    } catch (error) {
      console.error('Error fetching products:', error);
      throw new Error('Failed to fetch products. Please try again later.');
    }
  }

  /**
   * Transform product from DB to include legacy fields
   * Also handles dynamic variant labels (variant_label_1, variant_label_2)
   */
  private transformProduct(product: any, soldCount: number = 0): ProductWithSeller {
    // Extract campaign info if active
    const now = new Date();
    const activeDiscount = product.product_discounts?.find((pd: any) => {
      const campaign = pd.campaign;
      if (!campaign || campaign.status !== 'active') return false;
      const startsAt = new Date(campaign.starts_at);
      const endsAt = new Date(campaign.ends_at);
      return now >= startsAt && now <= endsAt;
    });

    const campaignBadge = activeDiscount?.campaign?.badge_text;
    const campaignBadgeColor = activeDiscount?.campaign?.badge_color;
    const campaignEndsAt = activeDiscount?.campaign?.ends_at;
    const campaignSoldCount = activeDiscount?.sold_count;

    // Calculate discounted price if campaign is active
    let price = product.price;
    let originalPrice = product.original_price;

    if (activeDiscount) {
      const campaign = activeDiscount.campaign;
      const dType = activeDiscount.discount_type || campaign.discount_type;
      const dValue = activeDiscount.discount_value || campaign.discount_value;

      if (dType === 'percentage') {
        price = product.price * (1 - (dValue / 100));
        if (campaign.max_discount_amount) {
          const maxD = parseFloat(String(campaign.max_discount_amount));
          price = Math.max(price, product.price - maxD);
        }
      } else if (dType === 'fixed_amount') {
        price = Math.max(0, product.price - dValue);
      }
      originalPrice = product.price; // Set original price to the regular price before discount
    }

    // Calculate rating from reviews and sold count from query result
    const primaryImage = product.images?.find((img: ProductImage) => img.is_primary) || product.images?.[0];
    const images = product.images?.map((img: ProductImage) => img.image_url).filter(Boolean) || [];
    const totalStock = product.variants?.reduce((sum: number, v: ProductVariant) => sum + (v.stock || 0), 0) || product.stock || 0;

    // Extract colors and sizes from variants for legacy support
    const colors = [...new Set(product.variants?.map((v: ProductVariant) => v.color).filter(Boolean) || [])] as string[];
    const sizes = [...new Set(product.variants?.map((v: ProductVariant) => v.size).filter(Boolean) || [])] as string[];

    // Extract option_1 and option_2 values for dynamic variant support
    const option1Values = [...new Set(product.variants?.map((v: ProductVariant) => (v as any).option_1_value).filter(Boolean) || [])] as string[];
    const option2Values = [...new Set(product.variants?.map((v: ProductVariant) => (v as any).option_2_value).filter(Boolean) || [])] as string[];

    // Calculate average rating from reviews
    const reviews = product.reviews || [];
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? Math.round((reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewCount) * 10) / 10
      : 0;

    // Extract seller info
    const businessProfile = Array.isArray(product.seller?.business_profile)
      ? product.seller.business_profile[0]
      : product.seller?.business_profile;

    return {
      ...product,
      // Legacy compatibility fields
      is_active: !product.disabled_at,
      price: price,
      originalPrice: originalPrice,
      original_price: originalPrice,
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
      // Rating calculated from reviews
      rating: averageRating,
      review_count: reviewCount,
      // Sold count from the campaign if active, otherwise lifetime sold count from completed orders
      sold: campaignSoldCount !== undefined ? campaignSoldCount : soldCount,
      sales: campaignSoldCount !== undefined ? campaignSoldCount : soldCount,
      sold_count: campaignSoldCount !== undefined ? campaignSoldCount : soldCount,
      // Seller info for legacy code
      seller: product.seller ? {
        ...product.seller,
        business_profile: businessProfile,
      } : undefined,
      // Flash sale info
      campaignBadge,
      campaignBadgeColor,
      campaignEndsAt,
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
          reviews (
            id,
            rating
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
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (!data) return null;

      // Fetch sold count for this product
      const { data: soldCountsData } = await supabase
        .from('order_items')
        .select('quantity, order:orders!inner(payment_status, shipment_status)')
        .eq('product_id', id)
        .eq('order.payment_status', 'paid')
        .in('order.shipment_status', ['delivered', 'received']);

      const soldCount = soldCountsData?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;

      return this.transformProduct(data, soldCount);
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
      const payload = await this.ensureCategoryId(product as ProductInsert & { category?: string; category_name?: string });

      const { data, error } = await supabase
        .from('products')
        .insert(payload)
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
      const payloads: ProductInsert[] = [];

      for (const product of products) {
        const payload = await this.ensureCategoryId(product as ProductInsert & { category?: string; category_name?: string });
        payloads.push(payload);
      }

      const { data, error } = await supabase
        .from('products')
        .insert(payloads)
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
   * Replace all images for a product (delete old, insert new)
   */
  async replaceProductImages(productId: string, imageUrls: string[]): Promise<ProductImage[]> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    try {
      // Filter to only valid http URLs (DB has CHECK constraint: ^https?://)
      const validUrls = imageUrls.filter(url => url && /^https?:\/\//i.test(url.trim()));
      if (validUrls.length === 0) return [];

      // Delete existing images for this product
      const { error: deleteError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);

      if (deleteError) {
        console.error('Error deleting old product images:', deleteError);
      }

      // Insert new images
      const { data, error } = await supabase
        .from('product_images')
        .insert(validUrls.map((url, idx) => ({
          product_id: productId,
          image_url: url.trim(),
          alt_text: '',
          sort_order: idx,
          is_primary: idx === 0,
        })))
        .select();

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error replacing product images:', error);
      throw new Error('Failed to replace product images.');
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
   * Fetch all categories from DB
   */
  async getCategories(): Promise<Category[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch categories');
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get or create category by name
   * Returns category_id for products table FK
   */
  async getOrCreateCategoryByName(name: string): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      return null;
    }

    try {
      const trimmedName = name.trim();
      if (!trimmedName) return null;

      const { data: existing, error: findError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', trimmedName)
        .single();

      if (existing) {
        return existing.id;
      }

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      const slug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { data: created, error: createError } = await supabase
        .from('categories')
        .insert({ name: trimmedName, slug })
        .select('id')
        .single();

      if (createError) throw createError;
      return created?.id || null;
    } catch (error) {
      console.error('Error getting/creating category:', error);
      return null;
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
