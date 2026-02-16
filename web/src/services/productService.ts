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
          order_items (
            id,
            quantity
          ),
          seller:sellers!products_seller_id_fkey (
            id,
            store_name,
            approval_status,
            business_profile:seller_business_profiles (
              city
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

            if (error) throw error;

            // Transform to add legacy compatibility fields
            return (data || []).map((p) => this.transformProduct(p));
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
    private transformProduct(product: any): ProductWithSeller {
        const primaryImage =
            product.images?.find((img: ProductImage) => img.is_primary) ||
            product.images?.[0];
        const totalStock =
            product.variants?.reduce(
                (sum: number, v: ProductVariant) => sum + (v.stock || 0),
                0,
            ) || 0;

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

        // Calculate sold count from order_items
        const orderItems = product.order_items || [];
        const soldCount = orderItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);

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
            // Sold count calculated from order_items
            sold: soldCount,
            // Seller info
            sellerName: product.seller?.store_name,
            sellerLocation: product.seller?.business_profile?.city,
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
          order_items (
            id,
            quantity
          ),
          seller:sellers!products_seller_id_fkey (
            id,
            store_name,
            approval_status,
            avatar_url,
            business_profile:seller_business_profiles (
              city
            )
          )
        `,
                )
                .eq("id", id)
                .single();

            if (error) throw error;
            return data ? this.transformProduct(data) : null;
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
     * Visual Search - Find similar products by image
     * Uses Supabase edge function with vector similarity search
     */
    async visualSearch(imageFile: File): Promise<{
        products: ProductWithSeller[];
        detectedInfo?: {
            category?: string;
            possibleBrand?: string;
            detectedItem?: string;
        };
    }> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured - cannot perform visual search");
            return { products: [] };
        }

        try {
            // 1. Convert image to base64 (no storage upload needed!)
            const base64 = await this.fileToBase64(imageFile);

            // 2. Call the visual-search edge function directly with base64
            const { data: searchData, error: searchError } = await supabase.functions
                .invoke('visual-search', {
                    body: { image_base64: base64 },
                });

            if (searchError) {
                console.error('Visual search error:', searchError);
                throw new Error('Visual search failed');
            }

            // 3. Get product IDs from search results
            const matchedProducts = searchData?.products || [];
            const detectedItem = searchData?.detectedItem;
            const detectedCategory = searchData?.detectedCategory;
            
            if (matchedProducts.length === 0) {
                return { 
                    products: [],
                    detectedInfo: detectedItem ? { detectedItem, category: detectedCategory } : undefined
                };
            }

            // 4. Fetch full product details for matched products
            const productIds = matchedProducts.map((p: any) => p.id);
            
            const { data: fullProducts, error: productsError } = await supabase
                .from("products")
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
                        approval_status
                    )
                `)
                .in('id', productIds)
                .is('deleted_at', null)
                .is('disabled_at', null);

            if (productsError) {
                console.error('Error fetching product details:', productsError);
                return { products: [] };
            }

            // 6. Transform and maintain similarity order
            const transformedProducts = (fullProducts || []).map((p: any) => this.transformProduct(p));
            
            // Sort by original similarity order
            const sortedProducts = productIds
                .map((id: string) => transformedProducts.find((p: any) => p.id === id))
                .filter(Boolean) as ProductWithSeller[];

            // 5. Build detected info - use AI detection if available, otherwise infer from results
            const detectedInfo: { category?: string; possibleBrand?: string; detectedItem?: string } = {};
            
            // Use AI-detected item if available
            if (detectedItem) {
                detectedInfo.detectedItem = detectedItem;
            }
            
            // Use AI-detected category or infer from results
            if (detectedCategory) {
                detectedInfo.category = detectedCategory;
            } else if (sortedProducts.length > 0) {
                // Most common category from results
                const categoryCount: Record<string, number> = {};
                sortedProducts.forEach(p => {
                    const cat = p.category?.name || (p as any).category;
                    if (cat) {
                        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                    }
                });
                const mostCommonCategory = Object.entries(categoryCount)
                    .sort((a, b) => b[1] - a[1])[0]?.[0];
                if (mostCommonCategory) {
                    detectedInfo.category = mostCommonCategory;
                }
            }

            // Detect possible brand from results
            if (sortedProducts.length > 0) {
                const brandCount: Record<string, number> = {};
                sortedProducts.forEach(p => {
                    if (p.brand) {
                        brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
                    }
                });
                const mostCommonBrand = Object.entries(brandCount)
                    .sort((a, b) => b[1] - a[1])[0]?.[0];
                if (mostCommonBrand) {
                    detectedInfo.possibleBrand = mostCommonBrand;
                }
            }

            return { 
                products: sortedProducts,
                detectedInfo: Object.keys(detectedInfo).length > 0 ? detectedInfo : undefined
            };
        } catch (error) {
            console.error("Visual search error:", error);
            
            // Fallback: Try to return some products if visual search failed
            try {
                console.log("Attempting fallback: returning recent products");
                const fallbackProducts = await this.getProducts({ 
                    isActive: true, 
                    approvalStatus: 'approved',
                    limit: 6 
                });
                return { 
                    products: fallbackProducts,
                    detectedInfo: undefined
                };
            } catch (fallbackError) {
                console.error("Fallback also failed:", fallbackError);
                throw error;
            }
        }
    }

    /**
     * Convert File to base64 string
     */
    private async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove data:image/xxx;base64, prefix
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Visual Search by URL - Find similar products by image URL
     * Directly calls the edge function with the image URL
     */
    async visualSearchByUrl(imageUrl: string): Promise<{
        products: ProductWithSeller[];
        detectedInfo?: {
            category?: string;
            possibleBrand?: string;
            detectedItem?: string;
        };
    }> {
        if (!isSupabaseConfigured()) {
            console.warn("Supabase not configured - cannot perform visual search");
            return { products: [] };
        }

        try {
            // Call the visual-search edge function directly with URL
            const { data: searchData, error: searchError } = await supabase.functions
                .invoke('visual-search', {
                    body: { primary_image: imageUrl },
                });

            if (searchError) {
                console.error('Visual search error:', searchError);
                throw new Error('Visual search failed');
            }

            // Get product IDs from search results
            const matchedProducts = searchData?.products || [];
            const detectedItem = searchData?.detectedItem;
            const detectedCategory = searchData?.detectedCategory;
            
            if (matchedProducts.length === 0) {
                return { 
                    products: [],
                    detectedInfo: detectedItem ? { detectedItem, category: detectedCategory } : undefined
                };
            }

            // Fetch full product details for matched products
            const productIds = matchedProducts.map((p: any) => p.id);
            
            const { data: fullProducts, error: productsError } = await supabase
                .from("products")
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
                        approval_status
                    )
                `)
                .in('id', productIds)
                .is('deleted_at', null)
                .is('disabled_at', null);

            if (productsError) {
                console.error('Error fetching product details:', productsError);
                return { products: [] };
            }

            // Transform and maintain similarity order
            const transformedProducts = (fullProducts || []).map((p: any) => this.transformProduct(p));
            
            // Sort by original similarity order
            const sortedProducts = productIds
                .map((id: string) => transformedProducts.find((p: any) => p.id === id))
                .filter(Boolean) as ProductWithSeller[];

            // Build detected info - use AI detection if available, otherwise infer from results
            const detectedInfo: { category?: string; possibleBrand?: string; detectedItem?: string } = {};
            
            // Use AI-detected item if available
            if (detectedItem) {
                detectedInfo.detectedItem = detectedItem;
            }
            
            // Use AI-detected category or infer from results
            if (detectedCategory) {
                detectedInfo.category = detectedCategory;
            } else if (sortedProducts.length > 0) {
                // Most common category from results
                const categoryCount: Record<string, number> = {};
                sortedProducts.forEach(p => {
                    const cat = p.category?.name || (p as any).category;
                    if (cat) {
                        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
                    }
                });
                const mostCommonCategory = Object.entries(categoryCount)
                    .sort((a, b) => b[1] - a[1])[0]?.[0];
                if (mostCommonCategory) {
                    detectedInfo.category = mostCommonCategory;
                }
            }

            // Detect possible brand from results
            if (sortedProducts.length > 0) {
                const brandCount: Record<string, number> = {};
                sortedProducts.forEach(p => {
                    if (p.brand) {
                        brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
                    }
                });
                const mostCommonBrand = Object.entries(brandCount)
                    .sort((a, b) => b[1] - a[1])[0]?.[0];
                if (mostCommonBrand) {
                    detectedInfo.possibleBrand = mostCommonBrand;
                }
            }

            return { 
                products: sortedProducts,
                detectedInfo: Object.keys(detectedInfo).length > 0 ? detectedInfo : undefined
            };
        } catch (error) {
            console.error("Visual search by URL error:", error);
            throw error;
        }
    }
}

export const productService = ProductService.getInstance();
