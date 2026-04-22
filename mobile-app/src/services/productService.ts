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

import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Category, Product, ProductImage, ProductVariant, ProductWithSeller } from '@/types/database.types';
import type { Database } from '@/types/supabase-generated.types';
import { categoryService } from './categoryService';

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export class ProductService {
  private static instance: ProductService;

  // Query result cache with TTL
  private queryCache = new Map<string, { data: any[]; timestamp: number }>();
  private readonly CACHE_TTL = 60000; // 1 minute

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
   * Clear all cached query results.
   * Call after product mutations (create, update, delete).
   */
  public clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Invalidate a specific cache entry by filter key.
   */
  public invalidateCache(filters?: Record<string, any>): void {
    const key = JSON.stringify(filters || {});
    this.queryCache.delete(key);
  }

  private getCached<T>(cacheKey: string): T[] | null {
    const cached = this.queryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data as T[];
    }
    if (cached) {
      this.queryCache.delete(cacheKey); // Expired
    }
    return null;
  }

  private setCache(cacheKey: string, data: any[]): void {
    this.queryCache.set(cacheKey, { data, timestamp: Date.now() });
  }

  private async ensureCategoryId(
    payload: ProductInsert & { category?: string; category_name?: string },
  ): Promise<ProductInsert> {
    let categoryId = payload.category_id || null;

    if (!categoryId) {
      const categoryName = payload.category || payload.category_name;
      if (typeof categoryName === 'string') {
        categoryId = await categoryService.getOrCreateCategoryByName(categoryName);
      }
    }

    if (!categoryId) {
      categoryId = await categoryService.getDefaultCategoryId();
    }

    if (!categoryId) {
      throw new Error('Category is required and could not be resolved.');
    }

    const { category, category_name, ...rest } = payload;

    return {
      ...rest,
      category_id: categoryId,
    } as ProductInsert;
  }

  /**
   * Enhanced search that supports category and seller name matching
   * Uses intelligent ranking to ensure relevant results
   */
  async searchProducts(searchQuery: string, options?: { limit?: number; offset?: number }): Promise<ProductWithSeller[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot search products');
      return [];
    }

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return [];

    const limit = options?.limit || 30;
    const offset = options?.offset || 0;

    try {
      // Phase 1: Find matching categories
      const { data: matchingCategories } = await supabase
        .from('categories')
        .select('id')
        .or(`name.ilike.%${trimmedQuery}%,slug.ilike.%${trimmedQuery}%`);

      const categoryIds = matchingCategories?.map(c => c.id) || [];

      // Phase 2: Find matching sellers
      const { data: matchingSellers } = await supabase
        .from('sellers')
        .select('id')
        .ilike('store_name', `%${trimmedQuery}%`);

      const sellerIds = matchingSellers?.map(s => s.id) || [];

      console.log('[ProductService] Search query:', trimmedQuery, 'Category matches:', categoryIds.length, 'Seller matches:', sellerIds.length);

      // Phase 3: Fetch products - ONLY those matching name/description
      // We DON'T use OR with category/seller IDs directly to avoid returning irrelevant products
      // Instead, we fetch products that match the search query in name/description
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          seller_id,
          category_id,
          approval_status,
          disabled_at,
          deleted_at,
          created_at,
          updated_at,
          variant_label_1,
          variant_label_2,
          is_free_shipping,
          weight,
          category:categories!products_category_id_fkey (
            id, name, slug, parent_id, is_active
          ),
          images:product_images (id, image_url, alt_text, sort_order, is_primary),
          variants:product_variants (id, sku, variant_name, size, color, option_1_value, option_2_value, price, stock, thumbnail_url),
          reviews (id, rating),
          seller:sellers!products_seller_id_fkey (id, store_name, approval_status, avatar_url),
          product_discounts (id, discount_type, discount_value, sold_count, campaign:discount_campaigns (id, badge_text, badge_color, discount_type, discount_value, max_discount_amount, ends_at, status, starts_at))
        `)
        .is('deleted_at', null)
        .eq('category.is_active', true)
        .order('created_at', { ascending: false });

      // Search in product name and description ONLY at database level
      const searchPattern = `%${trimmedQuery}%`;
      query = query.or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`);

      query = query.limit(limit).range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      let products = data || [];

      console.log('[ProductService] Direct search returned:', products.length, 'products');

      // If direct search returned few or no results, expand to category matches
      // BUT we'll fetch more and then rank/filter them intelligently
      if (products.length < limit && (categoryIds.length > 0 || sellerIds.length > 0)) {
        console.log('[ProductService] Expanding search to include category/seller matches');
        
        // Fetch additional products from matching categories/sellers
        let expandedQuery = supabase
          .from('products')
          .select(`
            id,
            name,
            description,
            price,
            seller_id,
            category_id,
            approval_status,
            disabled_at,
            deleted_at,
            created_at,
            updated_at,
            variant_label_1,
            variant_label_2,
            is_free_shipping,
            weight,
            category:categories!products_category_id_fkey (
              id, name, slug, parent_id, is_active
            ),
            images:product_images (id, image_url, alt_text, sort_order, is_primary),
            variants:product_variants (id, sku, variant_name, size, color, option_1_value, option_2_value, price, stock, thumbnail_url),
            reviews (id, rating),
            seller:sellers!products_seller_id_fkey (id, store_name, approval_status, avatar_url),
            product_discounts (id, discount_type, discount_value, sold_count, campaign:discount_campaigns (id, badge_text, badge_color, discount_type, discount_value, max_discount_amount, ends_at, status, starts_at))
          `)
          .is('deleted_at', null)
          .eq('category.is_active', true)
          .order('created_at', { ascending: false });

        const expandedConditions: string[] = [];

        if (categoryIds.length > 0) {
          expandedConditions.push(`category_id.in.(${categoryIds.join(',')})`);
        }

        if (sellerIds.length > 0) {
          expandedConditions.push(`seller_id.in.(${sellerIds.join(',')})`);
        }

        if (expandedConditions.length > 0) {
          expandedQuery = expandedQuery.or(expandedConditions.join(','));
          expandedQuery = expandedQuery.limit(limit * 3); // Fetch more to filter client-side
          
          const { data: expandedData, error: expandedError } = await expandedQuery;
          
          if (expandedError) {
            console.error('[ProductService] Error in expanded search:', expandedError);
          } else {
            console.log('[ProductService] Expanded search returned:', expandedData?.length || 0, 'products');
            
            // Filter expanded results client-side to only include products somewhat relevant
            // We check if the product name, description, or variant names contain words from the search query
            const searchWords = trimmedQuery.toLowerCase().split(/\s+/).filter(w => w.length > 0);
            
            const relevantExpanded = (expandedData || []).filter((product: any) => {
              const productName = (product.name || '').toLowerCase();
              const description = (product.description || '').toLowerCase();
              const category = (product.category?.name || '').toLowerCase();
              const variants = (product.variants || []).map((v: any) => (v.variant_name || '').toLowerCase()).join(' ');
              
              // Check if ANY search word appears in product fields
              return searchWords.some(word => 
                productName.includes(word) || 
                description.includes(word) || 
                variants.includes(word)
              );
            });
            
            console.log('[ProductService] After client-side filtering:', relevantExpanded.length, 'relevant products');
            
            // Add non-duplicate products from expanded search
            const existingIds = new Set(products.map(p => p.id));
            const newProducts = relevantExpanded.filter(p => !existingIds.has(p.id));
            products = [...products, ...newProducts];
          }
        }
      }

      // Fetch sold counts for all products
      const productIds = products.map(p => p.id);
      const { data: soldCountsData } = await supabase
        .from('order_items')
        .select('product_id, quantity, order:orders!inner(payment_status, shipment_status)')
        .in('product_id', productIds)
        .in('order.shipment_status', ['processing', 'ready_to_ship', 'shipped', 'out_for_delivery', 'delivered', 'received']);

      const soldCountsMap = new Map<string, number>();
      (soldCountsData || []).forEach(item => {
        const id = item.product_id;
        if (id) {
          const currentCount = soldCountsMap.get(id) || 0;
          soldCountsMap.set(id, currentCount + (item.quantity || 0));
        }
      });

      // Transform products
      const result = products.map(p => this.transformProduct(p, soldCountsMap.get(p.id) || 0));

      console.log('[ProductService] Final search result count:', result.length);

      return result;
    } catch (error) {
      console.error('[ProductService] Error searching products:', error);
      throw new Error('Failed to search products.');
    }
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

    // Check cache first
    const cacheKey = `getProducts:${JSON.stringify(filters || {})}`;
    const cached = this.getCached<ProductWithSeller>(cacheKey);
    if (cached) return cached;

    try {
      // New normalized query with proper joins
      // Includes variant_label_1/2 for dynamic variant labels
      // Includes reviews for rating calculation
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          seller_id,
          category_id,
          approval_status,
          disabled_at,
          deleted_at,
          created_at,
          updated_at,
          variant_label_1,
          variant_label_2,
          is_free_shipping,
          weight,
          category:categories!products_category_id_fkey (
            id, name, slug, parent_id, is_active
          ),
          images:product_images (id, image_url, alt_text, sort_order, is_primary),
          variants:product_variants (id, sku, variant_name, size, color, option_1_value, option_2_value, price, stock, thumbnail_url),
          reviews (id, rating),
          seller:sellers!products_seller_id_fkey (id, store_name, approval_status, avatar_url),
          product_discounts (id, discount_type, discount_value, sold_count, campaign:discount_campaigns (id, badge_text, badge_color, discount_type, discount_value, max_discount_amount, ends_at, status, starts_at))
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      query = query.eq('category.is_active', true);

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
        // Enhanced search: match against product name and description
        // Note: Category and seller name matching is done client-side after fetching
        // because Supabase .or() doesn't support joined table fields
        const searchPattern = `%${filters.searchQuery}%`;
        query = query.or(`name.ilike.${searchPattern},description.ilike.${searchPattern}`);
      }
      // Apply pagination — default limit to avoid fetching entire table
      const effectiveLimit = filters?.limit || 30;
      query = query.limit(effectiveLimit);
      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + effectiveLimit - 1);
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

      const { data: soldCountsData, error: soldCountsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, order:orders!inner(payment_status, shipment_status, order_type)')
        .in('product_id', productIds)
        .in('order.shipment_status', ['processing', 'ready_to_ship', 'shipped', 'out_for_delivery', 'delivered', 'received']);

      if (soldCountsError) {
        console.error('[ProductService] Error fetching sold counts:', soldCountsError);
      }

      // Calculate sold counts per product
      const soldCountsMap = new Map<string, number>();
      (soldCountsData || []).forEach(item => {
        const id = item.product_id;
        if (id) {
          const currentCount = soldCountsMap.get(id) || 0;
          soldCountsMap.set(id, currentCount + (item.quantity || 0));
        }
      });

      // Transform to add legacy compatibility fields
      const result = data?.map(p => this.transformProduct(p, soldCountsMap.get(p.id) || 0)) || [];

      // Store in cache
      this.setCache(cacheKey, result);

      return result;
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
    const campaignDiscountType = activeDiscount
      ? (activeDiscount.discount_type || activeDiscount?.campaign?.discount_type)
      : undefined;
    const campaignDiscountValue = activeDiscount
      ? parseFloat(String(activeDiscount.discount_value ?? activeDiscount?.campaign?.discount_value ?? 0))
      : undefined;

    // Calculate discounted price if campaign is active
    // Compute base price as lowest among product and valid variants (mirrors web behavior)
    let basePrice = product.price;
    if (product.variants && product.variants.length > 0) {
      const variantPrices = product.variants
        .map((v: any) => Number(v.price))
        .filter((vp: number) => !isNaN(vp) && vp > 0);
      if (variantPrices.length > 0) {
        basePrice = Math.min(basePrice, ...variantPrices);
      }
    }

    let price = basePrice;
    let originalPrice = product.original_price;

    if (activeDiscount) {
      const campaign = activeDiscount.campaign;
      const dType = activeDiscount.discount_type || campaign.discount_type;
      const dValue = activeDiscount.discount_value || campaign.discount_value;

      if (dType === 'percentage') {
        price = basePrice * (1 - (dValue / 100));
        if (campaign.max_discount_amount) {
          const maxD = parseFloat(String(campaign.max_discount_amount));
          price = Math.max(price, basePrice - maxD);
        }
      } else if (dType === 'fixed_amount') {
        price = Math.max(0, basePrice - dValue);
      }
      originalPrice = basePrice; // Set original price to the base price before discount
    }

    // Calculate rating from reviews and sold count from query result
    const primaryImage = product.images?.find((img: ProductImage) => img.is_primary) || product.images?.[0];
    const images = product.images?.map((img: ProductImage) => img.image_url).filter(Boolean) || [];
    const totalStock = product.variants && product.variants.length > 0
      ? product.variants.reduce((sum: number, v: any) => sum + Number(v.stock || 0), 0)
      : Number(product.stock || 0);
      
    // Extract colors and sizes from variants for legacy support
    const colors = [...new Set((product.variants || []).map((v: any) => v.color).filter(Boolean).concat(product.colors || []))] as string[];
    const sizes = [...new Set((product.variants || []).map((v: any) => v.size).filter(Boolean).concat(product.sizes || []))] as string[];

    // Extract option_1 and option_2 values for dynamic variant support
    const option1Values = [...new Set((product.variants || []).map((v: any) => v.option_1_value || v.color).filter(Boolean).concat(product.colors || []))] as string[];
    const option2Values = [...new Set((product.variants || []).map((v: any) => v.option_2_value || v.size).filter(Boolean).concat(product.sizes || []))] as string[];

    // Calculate average rating from reviews
    const reviews = product.reviews || [];
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0
      ? Math.round((reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviewCount) * 10) / 10
      : 0;

    // Extract seller info
    // Note: business_profile is fetched separately in getFilteredProducts if needed
    const businessProfile = undefined;

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
      stock: totalStock,
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
      campaignDiscountValue,
      campaignDiscountType,
      // Seller vacation mode status
      is_vacation_mode: product.seller?.is_vacation_mode === true,
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
            is_vacation_mode,
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
        .maybeSingle();

      if (error) {
        console.error(`[ProductService] Error fetching product ${id}:`, error);
        return null;
      }

      if (!data) return null;

      // Fetch sold count for this product
      const { data: soldCountsData } = await supabase
        .from('order_items')
        .select('quantity, order:orders!inner(payment_status, shipment_status)')
        .eq('product_id', id)
        .in('order.shipment_status', ['processing', 'ready_to_ship', 'shipped', 'out_for_delivery', 'delivered', 'received']);

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

      this.clearCache(); // Invalidate query cache after mutation
      return data as unknown as Product;
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
      return (data || []) as unknown as Product[];
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

      this.clearCache(); // Invalidate query cache after mutation
      return data as unknown as Product;
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
      this.clearCache(); // Invalidate query cache after mutation
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
        .insert(variants.map(v => ({ ...v, product_id: productId })) as any)
        .select();

      if (error) throw error;
      return (data || []) as unknown as ProductVariant[];
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
   * Get products with advanced filtering and sorting
   * Supports all filter options from the filter modal
   */
  async getFilteredProducts(
    searchQuery: string,
    filters: {
      categoryId?: string;
      priceRange?: { min: number | null; max: number | null };
      minRating?: number | null;
      shippedFrom?: string | null;
      withVouchers?: boolean;
      onSale?: boolean;
      freeShipping?: boolean;
      preferredSeller?: boolean;
      officialStore?: boolean;
      selectedBrands?: string[];
      standardDelivery?: boolean;
      sameDayDelivery?: boolean;
      cashOnDelivery?: boolean;
      pickupAvailable?: boolean;
      sortBy?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ProductWithSeller[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch filtered products');
      return [];
    }

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return [];

    const limit = filters.limit || 30;
    const offset = filters.offset || 0;

    try {
      console.log('[ProductService] getFilteredProducts called with:', { searchQuery, filters });

      // Phase 1: Build the base query
      let query = supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          seller_id,
          category_id,
          approval_status,
          disabled_at,
          deleted_at,
          created_at,
          updated_at,
          variant_label_1,
          variant_label_2,
          is_free_shipping,
          weight,
          brand,
          category:categories!products_category_id_fkey (
            id, name, slug, parent_id, is_active
          ),
          images:product_images (id, image_url, alt_text, sort_order, is_primary),
          variants:product_variants (id, sku, variant_name, size, color, option_1_value, option_2_value, price, stock, thumbnail_url),
          reviews (id, rating),
          seller:sellers!products_seller_id_fkey (
            id,
            store_name,
            approval_status,
            avatar_url,
            is_vacation_mode
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
        .is('deleted_at', null)
        .is('disabled_at', null)
        .eq('category.is_active', true);

      // Phase 2: Apply filters

      // Search query filter
      if (trimmedQuery) {
        const safeQuery = trimmedQuery.replace(/[,()]/g, '');
        const searchPattern = `%${safeQuery}%`;

        const { data: matchingCategories, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', searchPattern)
          .eq('is_active', true);

        if (categoryError) {
          console.warn('[ProductService] Category lookup failed for search query:', categoryError);
        }

        const categoryIds = matchingCategories?.map((cat: any) => cat.id) || [];
        const orParts = [
          `name.ilike.%${safeQuery}%`,
          `description.ilike.%${safeQuery}%`,
        ];

        if (categoryIds.length > 0) {
          const inClause = categoryIds.join(',');
          orParts.push(`category_id.in.(${inClause})`);
        }

        query = query.or(orParts.join(','));
      }

      // Category filter
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      // Price range filter (will also apply client-side for accuracy with discounts)
      // Note: Database price filter uses base price before discounts

      // Brand filter
      if (filters.selectedBrands && filters.selectedBrands.length > 0) {
        query = query.in('brand', filters.selectedBrands);
      }

      // Free shipping filter
      if (filters.freeShipping) {
        query = query.eq('is_free_shipping', true);
      }

      // Order by sort option
      switch (filters.sortBy) {
        case 'price-low':
          query = query.order('price', { ascending: true });
          break;
        case 'price-high':
          query = query.order('price', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'best-selling':
          // Will sort by sales_count after fetching
          break;
        case 'rating-high':
          // Will sort by rating after fetching (requires calculation)
          break;
        case 'relevance':
        default:
          query = query.order('created_at', { ascending: false });
          break;
      }

      // Apply pagination and fetch enough rows to support client-side filtering
      const fetchLimit = offset + limit * 3;
      query = query.limit(fetchLimit);

      const { data, error } = await query;

      if (error) {
        console.error('[ProductService] Error in getFilteredProducts:', error);
        throw error;
      }

      let products = data || [];

      console.log('[ProductService] Raw query returned:', products.length, 'products');

      // Phase 3: Client-side filtering for complex filters

      // Calculate ratings and apply rating filter
      if (filters.minRating !== null && filters.minRating !== undefined) {
        products = products.filter(product => {
          const reviews = product.reviews || [];
          if (reviews.length === 0) return false;
          const avgRating = reviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / reviews.length;
          return avgRating >= filters.minRating!;
        });
        console.log('[ProductService] After rating filter:', products.length, 'products');
      }

      // Price range filter (applies to final price after discounts)
      if (filters.priceRange && (filters.priceRange.min !== null || filters.priceRange.max !== null)) {
        products = products.filter(product => {
          const now = new Date();
          const activeDiscount = product.product_discounts?.find((pd: any) => {
            const campaign = pd.campaign;
            if (!campaign || campaign.status !== 'active') return false;
            const startsAt = new Date(campaign.starts_at);
            const endsAt = new Date(campaign.ends_at);
            return now >= startsAt && now <= endsAt;
          });

          let finalPrice = product.price;
          if (activeDiscount) {
            const campaign = activeDiscount.campaign;
            const dType = activeDiscount.discount_type || campaign.discount_type;
            const dValue = activeDiscount.discount_value || campaign.discount_value;

            if (dType === 'percentage') {
              finalPrice = product.price * (1 - (dValue / 100));
              if (campaign.max_discount_amount) {
                const maxD = parseFloat(String(campaign.max_discount_amount));
                finalPrice = Math.max(finalPrice, product.price - maxD);
              }
            } else if (dType === 'fixed_amount') {
              finalPrice = Math.max(0, product.price - dValue);
            }
          }

          const min = filters.priceRange!.min;
          const max = filters.priceRange!.max;

          if (min !== null && finalPrice < min) return false;
          if (max !== null && finalPrice > max) return false;
          return true;
        });
        console.log('[ProductService] After price filter:', products.length, 'products');
      }

      // Shops & Promos filters
      if (filters.withVouchers) {
        products = products.filter(p => p.product_discounts && p.product_discounts.length > 0);
        console.log('[ProductService] After vouchers filter:', products.length, 'products');
      }

      if (filters.onSale) {
        products = products.filter(p => {
          const now = new Date();
          const hasActiveSale = p.product_discounts?.some((pd: any) => {
            const campaign = pd.campaign;
            if (!campaign || campaign.status !== 'active') return false;
            const startsAt = new Date(campaign.starts_at);
            const endsAt = new Date(campaign.ends_at);
            return now >= startsAt && now <= endsAt;
          });
          return hasActiveSale;
        });
        console.log('[ProductService] After onSale filter:', products.length, 'products');
      }

      if (filters.preferredSeller) {
        // Filter for preferred sellers - currently not in schema, skipping filter
        // TODO: Add preferred_seller flag to sellers table
        console.log('[ProductService] Preferred seller filter not yet supported');
      }

      if (filters.officialStore) {
        // Filter for official stores - currently not in schema, skipping filter
        // TODO: Add official_store flag to sellers table
        console.log('[ProductService] Official store filter not yet supported');
      }

      // Shipped from filter - requires fetching business profiles separately
      if (filters.shippedFrom) {
        // Metro Manila cities/municipalities for accurate matching
        const METRO_MANILA_CITIES = [
          'manila', 'quezon city', 'makati', 'makati city', 'pasig', 'pasig city',
          'taguig', 'taguig city', 'mandaluyong', 'mandaluyong city',
          'parañaque', 'paranaque', 'parañaque city', 'paranaque city',
          'las piñas', 'las pinas', 'las piñas city', 'las pinas city',
          'muntinlupa', 'muntinlupa city', 'marikina', 'marikina city',
          'caloocan', 'caloocan city', 'valenzuela', 'valenzuela city',
          'navotas', 'navotas city', 'malabon', 'malabon city',
          'san juan', 'san juan city', 'pasay', 'pasay city',
          'pateros',
        ];

        // Deduplicate seller IDs before querying
        const sellerIds = [...new Set(
          products
            .map(p => p.seller_id)
            .filter((id): id is string => id !== null && id !== undefined)
        )];
        
        if (sellerIds.length > 0) {
          // Fetch business profiles for these sellers
          const { data: businessProfiles } = await supabase
            .from('seller_business_profiles')
            .select('seller_id, city, province')
            .in('seller_id', sellerIds);
          
          const profileMap = new Map<string, any>();
          businessProfiles?.forEach(bp => {
            profileMap.set(bp.seller_id, bp);
          });
          
          products = products.filter(p => {
            if (!p.seller_id) return false;
            const businessProfile = profileMap.get(p.seller_id);
            
            if (filters.shippedFrom === 'philippines') {
              // All sellers are in Philippines by default
              return true;
            } else if (filters.shippedFrom === 'metro_manila') {
              if (!businessProfile) return false;
              const city = businessProfile.city?.toLowerCase().trim() || '';
              const province = businessProfile.province?.toLowerCase().trim() || '';
              // Match by province "Metro Manila" or by known Metro Manila city names
              return province.includes('metro manila') ||
                     METRO_MANILA_CITIES.some(mm => city.includes(mm));
            }
            return true;
          });
        } else {
          // No seller IDs found — filter out all products
          products = [];
        }
        console.log('[ProductService] After location filter:', products.length, 'products');
      }

      // Phase 4: Transform products with sold counts
      const productIds = products.map(p => p.id);
      const { data: soldCountsData } = await supabase
        .from('order_items')
        .select('product_id, quantity, order:orders!inner(payment_status, shipment_status)')
        .in('product_id', productIds)
        .in('order.shipment_status', ['processing', 'ready_to_ship', 'shipped', 'out_for_delivery', 'delivered', 'received']);

      const soldCountsMap = new Map<string, number>();
      (soldCountsData || []).forEach(item => {
        const id = item.product_id;
        if (id) {
          const currentCount = soldCountsMap.get(id) || 0;
          soldCountsMap.set(id, currentCount + (item.quantity || 0));
        }
      });

      // Transform products
      const result = products.map(p => this.transformProduct(p, soldCountsMap.get(p.id) || 0));

      // Phase 5: Client-side sorting for fields that require calculation
      if (filters.sortBy === 'best-selling') {
        result.sort((a, b) => {
          const soldA = (a as any).sold || 0;
          const soldB = (b as any).sold || 0;
          return soldB - soldA;
        });
      } else if (filters.sortBy === 'rating-high') {
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      }

      // Phase 6: Apply pagination after all filtering
      const paginatedResult = result.slice(offset, offset + limit);

      console.log('[ProductService] Final filtered result:', paginatedResult.length, 'products');
      return paginatedResult;
    } catch (error) {
      console.error('[ProductService] Error in getFilteredProducts:', error);
      throw new Error('Failed to fetch filtered products.');
    }
  }

  /**
   * Get all active categories with product count
   * Used for filter category selection
   */
  async getCategoriesWithProducts(): Promise<Array<{ id: string; name: string; path: string[]; productCount: number }>> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch categories');
      return [];
    }

    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, parent_id, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      // Build category tree with paths
      const categoryMap = new Map();
      categories?.forEach(cat => {
        categoryMap.set(cat.id, { ...cat, children: [] });
      });

      const rootCategories: any[] = [];
      categories?.forEach(cat => {
        const catData = categoryMap.get(cat.id);
        if (cat.parent_id && categoryMap.has(cat.parent_id)) {
          categoryMap.get(cat.parent_id).children.push(catData);
        } else {
          rootCategories.push(catData);
        }
      });

      // Build paths for each category
      const buildPath = (cat: any, parentPath: string[] = []): string[] => {
        return [...parentPath, cat.name];
      };

      const flattenCategories = (cats: any[], parentPath: string[] = []): Array<{ id: string; name: string; path: string[] }> => {
        const result: Array<{ id: string; name: string; path: string[] }> = [];
        for (const cat of cats) {
          const path = buildPath(cat, parentPath);
          result.push({ id: cat.id, name: cat.name, path });
          if (cat.children && cat.children.length > 0) {
            result.push(...flattenCategories(cat.children, path));
          }
        }
        return result;
      };

      const allCategories = flattenCategories(rootCategories);

      // Get product count for each category
      const categoriesWithCount = await Promise.all(
        allCategories.map(async cat => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id)
            .is('deleted_at', null)
            .is('disabled_at', null);

          return {
            ...cat,
            productCount: count || 0,
          };
        }),
      );

      // Only return categories with products
      return categoriesWithCount.filter(cat => cat.productCount > 0);
    } catch (error) {
      console.error('[ProductService] Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get all active brands from current result set
   * Used for filter brand selection
   */
  async getBrandsFromResults(searchQuery: string, filters?: { categoryId?: string }): Promise<Array<{ id: string; name: string }>> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot fetch brands');
      return [];
    }

    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return [];

    try {
      let query = supabase
        .from('products')
        .select('brand')
        .is('deleted_at', null)
        .is('disabled_at', null)
        .not('brand', 'is', null)
        .neq('brand', '');

      if (trimmedQuery) {
        const safeQuery = trimmedQuery.replace(/[,()]/g, '');
        const searchPattern = `%${safeQuery}%`;

        const { data: matchingCategories, error: categoryError } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', searchPattern)
          .eq('is_active', true);

        if (categoryError) {
          console.warn('[ProductService] Category lookup failed for brand search:', categoryError);
        }

        const categoryIds = matchingCategories?.map((cat: any) => cat.id) || [];
        const orParts = [
          `name.ilike.%${safeQuery}%`,
          `description.ilike.%${safeQuery}%`,
        ];

        if (categoryIds.length > 0) {
          const inClause = categoryIds.join(',');
          orParts.push(`category_id.in.(${inClause})`);
        }

        query = query.or(orParts.join(','));
      }

      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Extract unique brands
      const brandSet = new Set<string>();
      data?.forEach(product => {
        if (product.brand) {
          brandSet.add(product.brand);
        }
      });

      return Array.from(brandSet).map((brand, index) => ({
        id: brand.toLowerCase().replace(/\s+/g, '-'),
        name: brand,
      }));
    } catch (error) {
      console.error('[ProductService] Error fetching brands:', error);
      return [];
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
        .select('id, name, slug, parent_id, icon, image_url, sort_order, is_active, description, created_at, updated_at')
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
