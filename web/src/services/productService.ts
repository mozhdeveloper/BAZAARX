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

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
    Product,
    ProductWithSeller,
    ProductImage,
    ProductVariant,
    Category,
    Database,
} from "@/types/database.types";

type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type ProductUpdate = Database["public"]["Tables"]["products"]["Update"];

export class ProductService {
    private static instance: ProductService;

    private constructor() {
        if (ProductService.instance) {
            throw new Error(
                "Use ProductService.getInstance() instead of new ProductService()",
            );
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
        categoryId?: string; // Changed from category to categoryId
        category?: string; // Legacy support - will be converted to categoryId lookup
        sellerId?: string;
        isActive?: boolean; // Legacy - maps to disabled_at IS NULL
        approvalStatus?: string;
        searchQuery?: string;
        limit?: number;
        offset?: number;
    }): Promise<ProductWithSeller[]> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured - cannot fetch products");
            return [];
        }

        try {
            // New normalized query with proper joins including reviews and seller
            // Also fetch sold counts from order_items (completed orders only)
            let query = supabase
                .from("products")
                .select(
                    `
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
            approval_status,
            business_profile:seller_business_profiles (
              city
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
        `,
                )
                .is("deleted_at", null) // Only non-deleted products
                .order("created_at", { ascending: false });

            // Apply filters
            if (filters?.categoryId) {
                query = query.eq("category_id", filters.categoryId);
            }
            // Legacy category string support - lookup by name
            if (filters?.category && !filters?.categoryId) {
                // For now, filter on the joined category name
                query = query.eq("category.name", filters.category);
            }
            if (filters?.sellerId) {
                // Note: seller_id may not exist in products table yet (needs migration 003)
                // This filter will work after running the migration
                // For now, skip this filter if it causes an error
                try {
                    query = query.eq("seller_id", filters.sellerId);
                } catch {
                    console.warn(
                        "seller_id column not in products table - run migration 003",
                    );
                }
            }
            if (filters?.isActive !== undefined) {
                // Map legacy is_active to disabled_at
                if (filters.isActive) {
                    query = query.is("disabled_at", null);
                } else {
                    query = query.not("disabled_at", "is", null);
                }
            }
            if (filters?.approvalStatus) {
                query = query.eq("approval_status", filters.approvalStatus);
            }
            if (filters?.searchQuery) {
                query = query.or(
                    `name.ilike.%${filters.searchQuery}%,description.ilike.%${filters.searchQuery}%`,
                );
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
            
            const { data: soldCountsData, error: soldCountsError } = await supabase
                .from('order_items')
                .select('product_id, quantity, order:orders!inner(payment_status, shipment_status, order_type)')
                .in('product_id', productIds)
                .eq('order.payment_status', 'paid')
                .in('order.shipment_status', ['delivered', 'received']);

            if (soldCountsError) {
                console.error('[ProductService] Error fetching sold counts:', soldCountsError);
            }

            // Calculate sold counts per product
            const soldCountsMap = new Map<string, number>();
            soldCountsData?.forEach(item => {
                const currentCount = soldCountsMap.get(item.product_id) || 0;
                soldCountsMap.set(item.product_id, currentCount + (item.quantity || 0));
            });

            // Transform to add legacy compatibility fields
            return data.map((p) => this.transformProduct(p, soldCountsMap.get(p.id) || 0));
        } catch (error) {
            console.error("Error fetching products:", error);
            throw new Error(
                "Failed to fetch products. Please try again later.",
            );
        }
    }

    /**
     * Transform product from DB to include legacy fields
     */
    private transformProduct(product: any, soldCount: number = 0): ProductWithSeller {
        const primaryImage =
            product.images?.find((img: ProductImage) => img.is_primary) ||
            product.images?.[0];
        const totalStock =
            product.variants?.reduce(
                (sum: number, v: ProductVariant) => sum + (v.stock || 0),
                0,
            ) || 0;

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

        // Calculate average rating from reviews
        const reviews = product.reviews || [];
        const totalRatings = reviews.length;
        const averageRating =
            totalRatings > 0
                ? reviews.reduce(
                      (sum: number, r: any) => sum + (r.rating || 0),
                      0,
                  ) / totalRatings
                : 0;

        return {
            ...product,
            // Legacy compatibility fields
            is_active: !product.disabled_at,
            stock: totalStock,
            // Primary image as main image
            primary_image_url: primaryImage?.image_url,
            // Category name for legacy code
            category: product.category?.name,
            // Variant labels
            variant_label_1: product.variant_label_1 || null,
            variant_label_2: product.variant_label_2 || null,
            // Rating from reviews
            rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
            reviewCount: totalRatings,
            // Sold count from completed orders (paid + delivered)
            sold: soldCount,
            sales: soldCount, // Alias for backward compatibility with UI
            sold_count: soldCount, // Another alias for consistency
            // Seller info
            sellerName: product.seller?.store_name,
            sellerLocation: product.seller?.business_profile?.city,
            // Flash sale info
            campaignBadge,
            campaignBadgeColor,
            campaignEndsAt,
            // Prices
            price: price,
            originalPrice: originalPrice,
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
     * Get products for a specific seller
     */
    async getSellerProducts(sellerId: string): Promise<ProductWithSeller[]> {
        return this.getProducts({ sellerId });
    }

    /**
     * Get products by category ID
     */
    async getProductsByCategory(
        categoryId: string,
    ): Promise<ProductWithSeller[]> {
        return this.getProducts({ categoryId });
    }

    /**
     * Search products by query
     */
    async searchProducts(
        query: string,
        limit?: number,
    ): Promise<ProductWithSeller[]> {
        return this.getProducts({ searchQuery: query, limit: limit || 20 });
    }

    /**
     * Get a single product by ID
     */
    async getProductById(id: string): Promise<ProductWithSeller | null> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured - cannot fetch product");
            return null;
        }

        try {
            const { data, error } = await supabase
                .from("products")
                .select(
                    `
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
            approval_status,
            avatar_url,
            business_profile:seller_business_profiles (
              city
            )
          ),
          product_discounts (
            id,
            sold_count,
            campaign:discount_campaigns (
              id,
              badge_text,
              badge_color,
              ends_at,
              status,
              starts_at
            )
          )
        `,
                )
                .eq("id", id)
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
            console.error("Error fetching product:", error);
            throw new Error("Failed to fetch product details.");
        }
    }

    /**
     * Create a new product
     */
    async createProduct(product: ProductInsert): Promise<Product> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured - cannot create product");
        }

        try {
            const { data, error } = await supabase
                .from("products")
                .insert(product)
                .select()
                .single();

            if (error) throw error;
            if (!data)
                throw new Error("No data returned upon product creation");

            return data;
        } catch (error) {
            console.error("Error creating product:", error);
            throw new Error(
                error instanceof Error
                    ? error.message
                    : "Failed to create product.",
            );
        }
    }

    /**
     * Create multiple products (bulk upload)
     */
    async createProducts(products: ProductInsert[]): Promise<Product[]> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured - cannot create products");
        }

        try {
            const { data, error } = await supabase
                .from("products")
                .insert(products)
                .select();

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error bulk creating products:", error);
            throw new Error("Failed to create products in bulk.");
        }
    }

    /**
     * Update an existing product
     */
    async updateProduct(id: string, updates: ProductUpdate): Promise<Product> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured - cannot update product");
        }

        try {
            const { data, error } = await supabase
                .from("products")
                .update(updates)
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            if (!data) throw new Error("Product not found or update failed");

            return data;
        } catch (error) {
            console.error("Error updating product:", error);
            throw new Error("Failed to update product.");
        }
    }

    /**
     * Delete a product (soft delete using deleted_at timestamp)
     * New schema uses deleted_at instead of is_active boolean
     */
    async deleteProduct(id: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured - cannot delete product");
        }

        try {
            const { error } = await supabase
                .from("products")
                .update({ deleted_at: new Date().toISOString() })
                .eq("id", id);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting product:", error);
            throw new Error("Failed to delete product.");
        }
    }

    /**
     * Disable a product (sets disabled_at timestamp)
     */
    async disableProduct(id: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured - cannot disable product");
        }

        try {
            const { error } = await supabase
                .from("products")
                .update({ disabled_at: new Date().toISOString() })
                .eq("id", id);

            if (error) throw error;
        } catch (error) {
            console.error("Error disabling product:", error);
            throw new Error("Failed to disable product.");
        }
    }

    /**
     * Enable a product (clears disabled_at timestamp)
     */
    async enableProduct(id: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured - cannot enable product");
        }

        try {
            const { error } = await supabase
                .from("products")
                .update({ disabled_at: null })
                .eq("id", id);

            if (error) throw error;
        } catch (error) {
            console.error("Error enabling product:", error);
            throw new Error("Failed to enable product.");
        }
    }

    /**
     * Delete all images for a product (for re-creation on edit)
     */
    async deleteProductImages(productId: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured");
        }

        try {
            const { error } = await supabase
                .from("product_images")
                .delete()
                .eq("product_id", productId);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting product images:", error);
            throw new Error("Failed to delete product images.");
        }
    }

    /**
     * Delete all variants for a product (for re-creation on edit)
     */
    async deleteProductVariants(productId: string): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured");
        }

        try {
            const { error } = await supabase
                .from("product_variants")
                .delete()
                .eq("product_id", productId);

            if (error) throw error;
        } catch (error) {
            console.error("Error deleting product variants:", error);
            throw new Error("Failed to delete product variants.");
        }
    }

    /**
     * Add images to a product
     */
    async addProductImages(
        productId: string,
        images: Omit<ProductImage, "id" | "uploaded_at">[],
    ): Promise<ProductImage[]> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured");
        }

        try {
            const { data, error } = await supabase
                .from("product_images")
                .insert(
                    images.map((img) => ({ ...img, product_id: productId })),
                )
                .select();

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error adding product images:", error);
            throw new Error("Failed to add product images.");
        }
    }

    /**
     * Add variants to a product
     */
    async addProductVariants(
        productId: string,
        variants: Omit<ProductVariant, "id" | "created_at" | "updated_at">[],
    ): Promise<ProductVariant[]> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured");
        }

        try {
            const { data, error } = await supabase
                .from("product_variants")
                .insert(variants.map((v) => ({ ...v, product_id: productId })))
                .select();

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error adding product variants:", error);
            throw new Error("Failed to add product variants.");
        }
    }

    /**
     * Update product variant stock
     */
    async updateVariantStock(variantId: string, stock: number): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured");
        }

        try {
            const { error } = await supabase
                .from("product_variants")
                .update({ stock })
                .eq("id", variantId);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating variant stock:", error);
            throw new Error("Failed to update stock.");
        }
    }

    /**
     * Update a product variant (price and/or stock)
     */
    async updateVariant(
        variantId: string,
        updates: { price?: number; stock?: number },
    ): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured");
        }

        try {
            const updateData: any = { updated_at: new Date().toISOString() };
            if (updates.price !== undefined) updateData.price = updates.price;
            if (updates.stock !== undefined) updateData.stock = updates.stock;

            const { error } = await supabase
                .from("product_variants")
                .update(updateData)
                .eq("id", variantId);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating variant:", error);
            throw new Error("Failed to update variant.");
        }
    }

    /**
     * Update multiple variants at once
     */
    async updateVariants(
        variants: { id: string; price?: number; stock?: number }[],
    ): Promise<void> {
        if (!isSupabaseConfigured()) {
            throw new Error("Supabase not configured");
        }

        try {
            // Update each variant individually (Supabase doesn't support bulk update with different values)
            await Promise.all(
                variants.map((v) =>
                    this.updateVariant(v.id, {
                        price: v.price,
                        stock: v.stock,
                    }),
                ),
            );
        } catch (error) {
            console.error("Error updating variants:", error);
            throw new Error("Failed to update variants.");
        }
    }

    /**
     * Deduct stock for a product variant (updates product_variants stock directly)
     */
    async deductStock(
        productId: string,
        quantity: number,
        reason: string,
        referenceId: string,
        userId?: string,
        variantId?: string,
    ): Promise<void> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured - stock deduction skipped");
            return;
        }

        try {
            if (variantId) {
                // Deduct from specific variant
                const { data: variant, error: fetchError } = await supabase
                    .from("product_variants")
                    .select("stock")
                    .eq("id", variantId)
                    .single();

                if (fetchError) throw fetchError;

                const newStock = Math.max(0, (variant?.stock || 0) - quantity);

                const { error: updateError } = await supabase
                    .from("product_variants")
                    .update({
                        stock: newStock,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", variantId);

                if (updateError) throw updateError;
            } else {
                // Deduct from first variant of product
                const { data: variants, error: fetchError } = await supabase
                    .from("product_variants")
                    .select("id, stock")
                    .eq("product_id", productId)
                    .limit(1);

                if (fetchError) throw fetchError;

                if (variants && variants.length > 0) {
                    const variant = variants[0];
                    const newStock = Math.max(
                        0,
                        (variant.stock || 0) - quantity,
                    );

                    const { error: updateError } = await supabase
                        .from("product_variants")
                        .update({
                            stock: newStock,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", variant.id);

                    if (updateError) throw updateError;
                }
            }

            console.log(
                `Stock deducted: ${quantity} units from ${variantId || productId}`,
            );
        } catch (error) {
            console.error("Stock deduction failed:", error);
            throw new Error("Failed to deduct stock.");
        }
    }

    /**
     * Add stock for a product variant
     */
    async addStock(
        productId: string,
        quantity: number,
        reason: string,
        userId?: string,
        variantId?: string,
    ): Promise<void> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured - stock addition skipped");
            return;
        }

        try {
            if (variantId) {
                // Add to specific variant
                const { data: variant, error: fetchError } = await supabase
                    .from("product_variants")
                    .select("stock")
                    .eq("id", variantId)
                    .single();

                if (fetchError) throw fetchError;

                const newStock = (variant?.stock || 0) + quantity;

                const { error: updateError } = await supabase
                    .from("product_variants")
                    .update({
                        stock: newStock,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("id", variantId);

                if (updateError) throw updateError;
            } else {
                // Add to first variant of product
                const { data: variants, error: fetchError } = await supabase
                    .from("product_variants")
                    .select("id, stock")
                    .eq("product_id", productId)
                    .limit(1);

                if (fetchError) throw fetchError;

                if (variants && variants.length > 0) {
                    const variant = variants[0];
                    const newStock = (variant.stock || 0) + quantity;

                    const { error: updateError } = await supabase
                        .from("product_variants")
                        .update({
                            stock: newStock,
                            updated_at: new Date().toISOString(),
                        })
                        .eq("id", variant.id);

                    if (updateError) throw updateError;
                }
            }

            console.log(
                `Stock added: ${quantity} units to ${variantId || productId}`,
            );
        } catch (error) {
            console.error("Stock addition failed:", error);
            throw new Error("Failed to add stock.");
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
            approvalStatus: "approved", // Changed to approved from pending for public view
        });
    }

    /**
     * Fetch all categories from DB
     */
    async getCategories(): Promise<Category[]> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured - cannot fetch categories");
            return [];
        }

        try {
            const { data, error } = await supabase
                .from("categories")
                .select("*")
                .order("sort_order", { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error fetching categories:", error);
            return [];
        }
    }

    /**
     * Get or create category by name
     * Returns the category_id for the given category name
     */
    async getOrCreateCategoryByName(name: string): Promise<string | null> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured");
            return null;
        }

        try {
            // First, try to find existing category
            const { data: existing, error: findError } = await supabase
                .from("categories")
                .select("id")
                .eq("name", name)
                .single();

            if (existing) {
                return existing.id;
            }

            // If not found and findError is not a "not found" error, throw
            if (findError && findError.code !== "PGRST116") {
                throw findError;
            }

            // Create new category
            const slug = name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "");
            const { data: created, error: createError } = await supabase
                .from("categories")
                .insert({ name, slug })
                .select("id")
                .single();

            if (createError) throw createError;
            return created?.id || null;
        } catch (error) {
            console.error("Error getting/creating category:", error);
            return null;
        }
    }

    /**
     * Visual Search - Find similar products by image (v2)
     */
    async visualSearch(imageFile: File): Promise<{ objects: any[] }> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured");
            return { objects: [] };
        }

        try {
            const base64 = await this.fileToBase64(imageFile);

            // Call the NEW v2 Edge Function
            const { data: searchData, error: searchError } = await supabase.functions.invoke('visual-search-v2', {
                body: { image_base64: base64 },
            });

            if (searchError) throw searchError;

            const detectedObjects = searchData?.detected_objects || [];
            if (detectedObjects.length === 0) return { objects: [] };

            // Enrich matches for ALL detected objects
            const enrichedObjects = await Promise.all(detectedObjects.map(async (obj: any) => {
                const productIds = obj.matches.map((m: any) => m.id);
                
                if (productIds.length === 0) {
                    return { object_label: obj.object_label, bbox: obj.bbox, matches: [] };
                }

                // Fetch full details from DB
                const { data: fullProducts } = await supabase
                    .from("products")
                    .select(`
                        *,
                        category:categories!products_category_id_fkey(id, name, slug),
                        images:product_images(image_url, is_primary),
                        variants:product_variants(id, color, size, price, stock),
                        seller:sellers!products_seller_id_fkey(id, store_name)
                    `)
                    .in('id', productIds)
                    .is('deleted_at', null)
                    .is('disabled_at', null);

                // Map back to maintain rank
                const mapped = obj.matches.map((match: any) => {
                    const p = fullProducts?.find(fp => fp.id === match.id);
                    if (!p) return null;
                    return this.transformProduct(p);
                }).filter(Boolean);

                return {
                    object_label: obj.object_label,
                    bbox: obj.bbox,
                    matches: mapped
                };
            }));

            return { objects: enrichedObjects };
        } catch (error) {
            console.error("Visual search error:", error);
            throw error;
        }
    }

    /**
     * Convert File to base64 string (Forces JPEG output to prevent backend crashes)
     */
    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return resolve((e.target?.result as string).split(',')[1]); 
                    
                    ctx.drawImage(img, 0, 0);
                    // Force strictly to JPEG format to prevent Deno backend crashes!
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                    resolve(dataUrl.split(',')[1]);
                };
                img.onerror = () => resolve((e.target?.result as string).split(',')[1]);
                img.src = e.target?.result as string;
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * Visual Search by URL - Find similar products by image URL (v2)
     */
    async visualSearchByUrl(imageUrl: string): Promise<{ objects: any[] }> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured - cannot perform visual search");
            return { objects: [] };
        }

        try {
            // Call the NEW v2 Edge Function with image_url
            const { data: searchData, error: searchError } = await supabase.functions.invoke('visual-search-v2', {
                body: { image_url: imageUrl },
            });

            if (searchError) throw searchError;

            const detectedObjects = searchData?.detected_objects || [];
            if (detectedObjects.length === 0) return { objects: [] };

            // Enrich matches for ALL detected objects
            const enrichedObjects = await Promise.all(detectedObjects.map(async (obj: any) => {
                const productIds = obj.matches.map((m: any) => m.id);
                
                if (productIds.length === 0) {
                    return { object_label: obj.object_label, bbox: obj.bbox, matches: [] };
                }

                // Fetch full details from DB
                const { data: fullProducts } = await supabase
                    .from("products")
                    .select(`
                        *,
                        category:categories!products_category_id_fkey(id, name, slug),
                        images:product_images(image_url, is_primary),
                        variants:product_variants(id, color, size, price, stock),
                        seller:sellers!products_seller_id_fkey(id, store_name)
                    `)
                    .in('id', productIds)
                    .is('deleted_at', null)
                    .is('disabled_at', null);

                // Map back to maintain rank
                const mapped = obj.matches.map((match: any) => {
                    const p = fullProducts?.find(fp => fp.id === match.id);
                    if (!p) return null;
                    return this.transformProduct(p);
                }).filter(Boolean);

                return {
                    object_label: obj.object_label,
                    bbox: obj.bbox,
                    matches: mapped
                };
            }));

            return { objects: enrichedObjects };
        } catch (error) {
            console.error("Visual search by URL error:", error);
            throw error;
        }
    }
}

export const productService = ProductService.getInstance();
