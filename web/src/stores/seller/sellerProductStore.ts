/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useProductQAStore } from '../productQAStore';
import { productService } from '@/services/productService';
import { bulkUploadService } from '@/services/BulkUploadService';
import { BulkProductData } from '@/components/BulkUploadModal';
import { mapDbProductToSellerProduct } from '@/utils/productMapper';
import type { Database } from '@/types/database.types';
import type { SellerProduct, InventoryLedgerEntry, LowStockAlert } from './sellerTypes';
import { useAuthStore } from './sellerAuthStore';
import { fallbackSellerId, buildProductInsert, mapSellerUpdatesToDb } from './sellerHelpers';

// Product Store
// Module-level singleton: prevents React 18 Strict Mode double-mount from
// creating duplicate realtime channels.
const _productChannels = new Map<string, ReturnType<typeof supabase.channel>>();

export const useProductStore = create<ProductStore>()(
    persist(
        (set, get) => ({
            products: [],
            loading: false,
            error: null,
            inventoryLedger: [],
            lowStockAlerts: [],

            fetchProducts: async (filters) => {
                if (!isSupabaseConfigured()) {
                    console.warn(
                        "Supabase not configured, showing empty product list",
                    );
                    set({ products: [], loading: false, error: null });
                    return;
                }

                set({ loading: true, error: null });
                try {
                    const data = await productService.getProducts(filters);
                    const mappedProducts = (data || []).map(
                        mapDbProductToSellerProduct,
                    );
                    set({
                        products: mappedProducts,
                        loading: false,
                    });
                    get().checkLowStock();
                } catch (error: unknown) {
                    console.error(
                        "Error loading products from Supabase:",
                        error,
                    );
                    set({
                        error:
                            (error as Error)?.message ||
                            "Failed to load products",
                        loading: false,
                    });
                }
            },

            subscribeToProducts: (filters) => {
                if (!isSupabaseConfigured()) return () => { };

                const channelKey = `public:products:${filters?.sellerId || 'all'}`;

                // If a channel with this key already exists, reuse it
                if (_productChannels.has(channelKey)) {
                    return () => {
                        const ch = _productChannels.get(channelKey);
                        if (ch) {
                            supabase.removeChannel(ch);
                            _productChannels.delete(channelKey);
                        }
                    };
                }

                const channel = supabase
                    .channel(channelKey)
                    .on(
                        "postgres_changes",
                        {
                            event: "*",
                            schema: "public",
                            table: "products",
                        },
                        async () => {
                            await get().fetchProducts(filters);
                        },
                    )
                    .subscribe();

                _productChannels.set(channelKey, channel);

                return () => {
                    supabase.removeChannel(channel);
                    _productChannels.delete(channelKey);
                };
            },

            addProduct: async (product) => {
                try {
                    // Validation
                    if (!product.name || product.name.trim() === "") {
                        throw new Error("Product name is required");
                    }
                    if (!product.price || product.price <= 0) {
                        throw new Error("Product price must be greater than 0");
                    }
                    if (!product.stock || product.stock < 0) {
                        throw new Error("Product stock cannot be negative");
                    }
                    if (!product.category || product.category.trim() === "") {
                        throw new Error("Product category is required");
                    }
                    if (!product.images || product.images.length === 0) {
                        throw new Error(
                            "At least one product image is required",
                        );
                    }

                    const authStoreState = useAuthStore.getState();
                    const sellerId = isSupabaseConfigured()
                        ? authStoreState.seller?.id || fallbackSellerId
                        : authStoreState.seller?.id || "seller-1";

                    const resolvedSellerId = sellerId ?? "";

                    if (isSupabaseConfigured() && !resolvedSellerId) {
                        throw new Error(
                            "Missing seller ID for Supabase insert. Set VITE_SUPABASE_SELLER_ID or log in with a seller linked to Supabase.",
                        );
                    }

                    let newProduct: SellerProduct;

                    // Use Supabase if configured
                    if (isSupabaseConfigured()) {
                        // Resolve category name to category_id
                        const categoryId =
                            await productService.getOrCreateCategoryByName(
                                product.category,
                            );
                        if (!categoryId) {
                            throw new Error(
                                "Failed to resolve category. Please try again.",
                            );
                        }

                        const insertData = buildProductInsert(
                            product,
                            resolvedSellerId,
                            categoryId,
                        );
                        const created =
                            await productService.createProduct(insertData);
                        if (!created) {
                            throw new Error(
                                "Failed to create product in database",
                            );
                        }
                        newProduct = mapDbProductToSellerProduct(created);

                        // Save product images
                        if (product.images && product.images.length > 0) {
                            const validImages = product.images.filter(
                                (url) => url && url.trim().length > 0,
                            );
                            if (validImages.length > 0) {
                                try {
                                    await productService.addProductImages(
                                        newProduct.id,
                                        validImages.map((url, idx) => ({
                                            product_id: newProduct.id,
                                            alt_text: "",
                                            image_url: url,
                                            sort_order: idx,
                                            is_primary: idx === 0,
                                        })),
                                    );
                                    console.log(
                                        `✅ Created ${validImages.length} images for product ${newProduct.id}`,
                                    );
                                } catch (imageError) {
                                    console.error(
                                        "Failed to create product images:",
                                        imageError,
                                    );
                                }
                            }
                        }

                        // Create product variants if provided
                        const variants = (product as any).variants;
                        if (
                            variants &&
                            Array.isArray(variants) &&
                            variants.length > 0
                        ) {
                            const variantInserts = variants.map(
                                (v: any, index: number) => ({
                                    product_id: newProduct.id,
                                    variant_name:
                                        [
                                            v.variantLabel1Value,
                                            v.variantLabel2Value,
                                        ]
                                            .filter(Boolean)
                                            .join(" - ") || "Default",
                                    size: v.variantLabel1Value || null,
                                    color: v.variantLabel2Value || null,
                                    option_1_value:
                                        v.variantLabel1Value || null,
                                    option_2_value:
                                        v.variantLabel2Value || null,
                                    stock: v.stock || 0,
                                    price: v.price || product.price,
                                    sku: `${newProduct.id.substring(0, 8)}-${(v.sku || `V${index}`).replace(/[^a-zA-Z0-9-]/g, '').substring(0, 20)}`,
                                    thumbnail_url: v.image || null,
                                    barcode: null,
                                    embedding: null,
                                }),
                            );

                            try {
                                await productService.addProductVariants(
                                    newProduct.id,
                                    variantInserts,
                                );
                                console.log(
                                    `✅ Created ${variantInserts.length} variants for product ${newProduct.id}`,
                                );
                            } catch (variantError) {
                                console.error(
                                    "Failed to create variants:",
                                    variantError,
                                );
                                // Don't fail the whole product creation, just log the error
                            }
                        } else {
                            // Create a default variant with the product's base stock/price
                            try {
                                await productService.addProductVariants(
                                    newProduct.id,
                                    [
                                        {
                                            variant_name: "Default",
                                            product_id: newProduct.id,
                                            size: null,
                                            color: null,
                                            option_1_value: null,
                                            option_2_value: null,
                                            stock: product.stock,
                                            price: product.price,
                                            sku: `${newProduct.id.substring(0, 8)}-default`,
                                            thumbnail_url: null,
                                            barcode: null,
                                            embedding: null,
                                        },
                                    ],
                                );
                            } catch (variantError) {
                                console.error(
                                    "Failed to create default variant:",
                                    variantError,
                                );
                            }
                        }
                    } else {
                        // Fallback to local state
                        newProduct = {
                            ...product,
                            id: `prod-${Date.now()}`,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            sales: 0,
                            rating: 0,
                            reviews: 0,
                            approvalStatus: "pending",
                            vendorSubmittedCategory: product.category,
                            variantLabel1Values:
                                product.variantLabel1Values || [],
                            variantLabel2Values:
                                product.variantLabel2Values || [],
                            sellerId: resolvedSellerId,
                        };
                    }

                    set((state) => ({
                        products: [...state.products, newProduct],
                    }));

                    // Create ledger entry for initial stock
                    const ledgerEntry: InventoryLedgerEntry = {
                        id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: new Date().toISOString(),
                        productId: newProduct.id,
                        productName: newProduct.name,
                        changeType: "ADDITION",
                        quantityBefore: 0,
                        quantityChange: product.stock,
                        quantityAfter: product.stock,
                        reason: "STOCK_REPLENISHMENT",
                        referenceId: newProduct.id,
                        userId: sellerId || "SYSTEM",
                        notes: "Initial stock for new product",
                    };

                    set((state) => ({
                        inventoryLedger: [
                            ...state.inventoryLedger,
                            ledgerEntry,
                        ],
                    }));

                    // Check for low stock on new product
                    get().checkLowStock();

                    // Also add to QA flow store
                    try {
                        const qaStore = useProductQAStore.getState();
                        await qaStore.addProductToQA({
                            id: newProduct.id,
                            name: newProduct.name,
                            vendor:
                                authStoreState.seller?.storeName || authStoreState.seller?.name || "Unknown Vendor",
                            sellerId: resolvedSellerId, // Pass seller ID for proper filtering
                            price: newProduct.price,
                            // Use original submitted category (name string) since newProduct
                            // is mapped from DB which stores category_id, not the name
                            category: product.category || newProduct.category,
                            image:
                                newProduct.images[0] ||
                                "https://placehold.co/100?text=Product",
                        });
                    } catch (qaError) {
                        console.error(
                            "Error adding product to QA flow:",
                            qaError,
                        );
                    }

                    // Trigger image embedding generation for visual search (fire-and-forget)
                    supabase.functions.invoke('backfill-vectors-v2').catch(e =>
                        console.warn('[addProduct] Embedding backfill trigger failed:', e)
                    );
                } catch (error) {
                    console.error("Error adding product:", error);
                    throw error;
                }
            },

            bulkAddProducts: async (bulkProducts: BulkProductData[]) => {
                try {
                    const authStore = useAuthStore.getState();
                    const sellerId = authStore.seller?.id || fallbackSellerId;

                    if (!sellerId) {
                        throw new Error("Missing seller ID for bulk upload. Please log in.");
                    }

                    // Call the new relational service we created
                    const results = await bulkUploadService.processBulkUpload(bulkProducts, sellerId);

                    // Refresh the products list to show new items
                    await get().fetchProducts({ sellerId });

                    // Trigger image embedding generation for visual search (fire-and-forget)
                    supabase.functions.invoke('backfill-vectors-v2').catch(e =>
                        console.warn('[bulkAddProducts] Embedding backfill trigger failed:', e)
                    );


                    return results;
                } catch (error) {
                    console.error("Error bulk adding products:", error);
                    throw error;
                }
            },

            updateProduct: async (id, updates) => {
                try {
                    const product = get().products.find((p) => p.id === id);
                    if (!product) {
                        console.error(`Product not found: ${id}`);
                        throw new Error("Product not found");
                    }

                    // Use Supabase if configured
                    if (isSupabaseConfigured()) {
                        const updateData = mapSellerUpdatesToDb(updates);
                        const updated = await productService.updateProduct(
                            id,
                            updateData,
                        );
                        if (!updated) {
                            throw new Error(
                                "Failed to update product in database",
                            );
                        }
                    }

                    // Merge updates with existing local product data
                    // (DB updateProduct only returns the products row without joins)
                    const updatedProduct: SellerProduct = {
                        ...product,
                        ...updates,
                        updatedAt: new Date().toISOString(),
                    };

                    set((state) => ({
                        products: state.products.map((p) =>
                            p.id === id ? updatedProduct : p,
                        ),
                    }));
                } catch (error) {
                    console.error("Error updating product:", error);
                    throw error;
                }
            },

            deleteProduct: async (id) => {
                try {
                    const product = get().products.find((p) => p.id === id);
                    if (!product) {
                        console.error(`Product not found: ${id}`);
                        throw new Error("Product not found");
                    }

                    // Use Supabase if configured
                    if (isSupabaseConfigured()) {
                        await productService.deleteProduct(id);
                    }

                    set((state) => ({
                        products: state.products.filter(
                            (product) => product.id !== id,
                        ),
                    }));
                } catch (error) {
                    console.error("Error deleting product:", error);
                    throw error;
                }
            },

            getProduct: (id) => {
                return get().products.find((product) => product.id === id);
            },

            // POS-Lite: Deduct stock with full audit trail
            deductStock: async (
                productId,
                quantity,
                reason,
                referenceId,
                notes,
            ) => {
                try {
                    console.log(`[deductStock] Starting - Product: ${productId}, Quantity: ${quantity}, Reason: ${reason}`);

                    const product = get().products.find(
                        (p) => p.id === productId,
                    );
                    if (!product) {
                        throw new Error(`Product ${productId} not found`);
                    }

                    console.log(`[deductStock] Current stock: ${product.stock}`);

                    // RULE: No negative stock allowed
                    if (product.stock < quantity) {
                        throw new Error(
                            `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`,
                        );
                    }

                    const newStock = product.stock - quantity;
                    const authStoreForStock = useAuthStore.getState();

                    // Use Supabase if configured
                    if (isSupabaseConfigured()) {
                        console.log(`[deductStock] Updating database...`);
                        await productService.deductStock(
                            productId,
                            quantity,
                            reason,
                            referenceId,
                            authStoreForStock.seller?.id,
                        );
                        console.log(`[deductStock] Database updated. Refetching products...`);
                        // Refresh from DB to get updated stock
                        await get().fetchProducts({
                            sellerId: authStoreForStock.seller?.id,
                        });
                        console.log(`[deductStock] Products refetched. New product count: ${get().products.length}`);

                        // Verify the stock was updated
                        const updatedProduct = get().products.find((p) => p.id === productId);
                        console.log(`[deductStock] Verified stock after refetch: ${updatedProduct?.stock}`);
                    } else {
                        // Fallback: Update product stock locally
                        set((state) => ({
                            products: state.products.map((p) =>
                                p.id === productId
                                    ? {
                                        ...p,
                                        stock: newStock,
                                        sales: p.sales + quantity,
                                    }
                                    : p,
                            ),
                        }));
                    }

                    // Create immutable ledger entry
                    const ledgerEntry: InventoryLedgerEntry = {
                        id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: new Date().toISOString(),
                        productId,
                        productName: product.name,
                        changeType: "DEDUCTION",
                        quantityBefore: product.stock,
                        quantityChange: -quantity,
                        quantityAfter: newStock,
                        reason,
                        referenceId,
                        userId: authStoreForStock.seller?.id || "SYSTEM",
                        notes:
                            notes ||
                            `Stock deducted for ${reason.replace("_", " ").toLowerCase()}`,
                    };

                    set((state) => ({
                        inventoryLedger: [
                            ...state.inventoryLedger,
                            ledgerEntry,
                        ],
                    }));

                    // Check for low stock alerts
                    get().checkLowStock();

                    console.log(
                        `Stock deducted: ${product.name} - ${quantity} units. New stock: ${newStock}. Ledger ID: ${ledgerEntry.id}`,
                    );
                } catch (error) {
                    console.error("Failed to deduct stock:", error);
                    throw error;
                }
            },

            // Add stock (replenishment)
            addStock: async (productId, quantity, reason, notes) => {
                try {
                    const product = get().products.find(
                        (p) => p.id === productId,
                    );
                    if (!product) {
                        throw new Error(`Product ${productId} not found`);
                    }

                    if (quantity <= 0) {
                        throw new Error("Quantity must be greater than 0");
                    }

                    const newStock = product.stock + quantity;
                    const authStoreForAdd = useAuthStore.getState();

                    // Use Supabase if configured
                    if (isSupabaseConfigured()) {
                        await productService.addStock(
                            productId,
                            quantity,
                            reason || "STOCK_REPLENISHMENT",
                            authStoreForAdd.seller?.id,
                        );
                        // Refresh from DB to get updated stock
                        await get().fetchProducts({
                            sellerId: authStoreForAdd.seller?.id,
                        });
                    } else {
                        // Fallback: Update locally
                        set((state) => ({
                            products: state.products.map((p) =>
                                p.id === productId
                                    ? { ...p, stock: newStock }
                                    : p,
                            ),
                        }));
                    }

                    // Create ledger entry
                    const ledgerEntry: InventoryLedgerEntry = {
                        id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: new Date().toISOString(),
                        productId,
                        productName: product.name,
                        changeType: "ADDITION",
                        quantityBefore: product.stock,
                        quantityChange: quantity,
                        quantityAfter: newStock,
                        reason: "STOCK_REPLENISHMENT",
                        referenceId: `REPL-${Date.now()}`,
                        userId: authStoreForAdd.seller?.id || "SYSTEM",
                        notes: notes || reason,
                    };

                    set((state) => ({
                        inventoryLedger: [
                            ...state.inventoryLedger,
                            ledgerEntry,
                        ],
                    }));

                    get().checkLowStock();

                    console.log(
                        `✅ Stock added: ${product.name} + ${quantity} units. New stock: ${newStock}`,
                    );
                } catch (error) {
                    console.error("Failed to add stock:", error);
                    throw error;
                }
            },

            // Manual stock adjustment (requires reason)
            adjustStock: (productId, newQuantity, reason, notes) => {
                try {
                    const product = get().products.find(
                        (p) => p.id === productId,
                    );
                    if (!product) {
                        throw new Error(`Product ${productId} not found`);
                    }

                    if (newQuantity < 0) {
                        throw new Error("Stock quantity cannot be negative");
                    }

                    if (!notes || notes.trim() === "") {
                        throw new Error("Adjustment notes are required");
                    }

                    const quantityChange = newQuantity - product.stock;

                    set((state) => ({
                        products: state.products.map((p) =>
                            p.id === productId
                                ? { ...p, stock: newQuantity }
                                : p,
                        ),
                    }));

                    // Create ledger entry
                    const ledgerEntry: InventoryLedgerEntry = {
                        id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: new Date().toISOString(),
                        productId,
                        productName: product.name,
                        changeType: "ADJUSTMENT",
                        quantityBefore: product.stock,
                        quantityChange,
                        quantityAfter: newQuantity,
                        reason: "MANUAL_ADJUSTMENT",
                        referenceId: `ADJ-${Date.now()}`,
                        userId: useAuthStore.getState().seller?.id || "SYSTEM",
                        notes: `${reason}: ${notes}`,
                    };

                    set((state) => ({
                        inventoryLedger: [
                            ...state.inventoryLedger,
                            ledgerEntry,
                        ],
                    }));

                    get().checkLowStock();

                    console.log(
                        `Stock adjusted: ${product.name}. Old: ${product.stock}, New: ${newQuantity}`,
                    );
                } catch (error) {
                    console.error("Failed to adjust stock:", error);
                    throw error;
                }
            },

            // Reserve stock for online orders (before payment)
            reserveStock: (productId, quantity, orderId) => {
                try {
                    const product = get().products.find(
                        (p) => p.id === productId,
                    );
                    if (!product) {
                        throw new Error(`Product ${productId} not found`);
                    }

                    if (product.stock < quantity) {
                        throw new Error(
                            `Insufficient stock for ${product.name}`,
                        );
                    }

                    const newStock = product.stock - quantity;

                    set((state) => ({
                        products: state.products.map((p) =>
                            p.id === productId ? { ...p, stock: newStock } : p,
                        ),
                    }));

                    // Create ledger entry
                    const ledgerEntry: InventoryLedgerEntry = {
                        id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: new Date().toISOString(),
                        productId,
                        productName: product.name,
                        changeType: "RESERVATION",
                        quantityBefore: product.stock,
                        quantityChange: -quantity,
                        quantityAfter: newStock,
                        reason: "RESERVATION",
                        referenceId: orderId,
                        userId: useAuthStore.getState().seller?.id || "SYSTEM",
                        notes: `Stock reserved for order ${orderId}`,
                    };

                    set((state) => ({
                        inventoryLedger: [
                            ...state.inventoryLedger,
                            ledgerEntry,
                        ],
                    }));

                    get().checkLowStock();
                } catch (error) {
                    console.error("Failed to reserve stock:", error);
                    throw error;
                }
            },

            // Release reserved stock (order cancelled)
            releaseStock: (productId, quantity, orderId) => {
                try {
                    const product = get().products.find(
                        (p) => p.id === productId,
                    );
                    if (!product) {
                        throw new Error(`Product ${productId} not found`);
                    }

                    const newStock = product.stock + quantity;

                    set((state) => ({
                        products: state.products.map((p) =>
                            p.id === productId ? { ...p, stock: newStock } : p,
                        ),
                    }));

                    // Create ledger entry
                    const ledgerEntry: InventoryLedgerEntry = {
                        id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        timestamp: new Date().toISOString(),
                        productId,
                        productName: product.name,
                        changeType: "RELEASE",
                        quantityBefore: product.stock,
                        quantityChange: quantity,
                        quantityAfter: newStock,
                        reason: "ORDER_CANCELLATION",
                        referenceId: orderId,
                        userId: useAuthStore.getState().seller?.id || "SYSTEM",
                        notes: `Stock released from cancelled order ${orderId}`,
                    };

                    set((state) => ({
                        inventoryLedger: [
                            ...state.inventoryLedger,
                            ledgerEntry,
                        ],
                    }));

                    get().checkLowStock();
                } catch (error) {
                    console.error("Failed to release stock:", error);
                    throw error;
                }
            },

            // Get ledger entries for a specific product
            getLedgerByProduct: (productId) => {
                return get()
                    .inventoryLedger.filter(
                        (entry) => entry.productId === productId,
                    )
                    .sort(
                        (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime(),
                    );
            },

            // Get recent ledger entries
            getRecentLedgerEntries: (limit = 50) => {
                return get()
                    .inventoryLedger.sort(
                        (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime(),
                    )
                    .slice(0, limit);
            },

            // Check for low stock and create alerts
            checkLowStock: () => {
                const threshold = get().getLowStockThreshold();
                const products = get().products;
                const currentAlerts = get().lowStockAlerts;

                products.forEach((product) => {
                    if (product.stock > 0 && product.stock < threshold) {
                        // Check if alert already exists
                        const existingAlert = currentAlerts.find(
                            (alert) =>
                                alert.productId === product.id &&
                                !alert.acknowledged,
                        );

                        if (!existingAlert) {
                            const newAlert: LowStockAlert = {
                                id: `alert-${Date.now()}-${product.id}`,
                                productId: product.id,
                                productName: product.name,
                                currentStock: product.stock,
                                threshold,
                                timestamp: new Date().toISOString(),
                                acknowledged: false,
                            };

                            set((state) => ({
                                lowStockAlerts: [
                                    ...state.lowStockAlerts,
                                    newAlert,
                                ],
                            }));

                            console.warn(
                                `LOW STOCK ALERT: ${product.name} - Only ${product.stock} units remaining!`,
                            );
                        }
                    }
                });
            },

            // Acknowledge low stock alert
            acknowledgeLowStockAlert: (alertId) => {
                set((state) => ({
                    lowStockAlerts: state.lowStockAlerts.map((alert) =>
                        alert.id === alertId
                            ? { ...alert, acknowledged: true }
                            : alert,
                    ),
                }));
            },

            // Get low stock threshold
            getLowStockThreshold: () => 10, // Can be made configurable later
        }),
        {
            name: "seller-products-storage",
            version: 2,
            migrate: (state: unknown, version: number) => {
                if (version < 2) {
                    const oldState = (state || {}) as Record<string, unknown>;
                    return {
                        ...oldState,
                        products: [],
                        inventoryLedger: [],
                        lowStockAlerts: [],
                        loading: false,
                        error: null,
                    };
                }
                return state as ProductStore;
            },
        },
    ),
);
