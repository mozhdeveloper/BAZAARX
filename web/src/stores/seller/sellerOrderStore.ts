/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { orderService } from '@/services/orderService';
import { orderReadService } from '@/services/orders/orderReadService';
import { orderMutationService } from '@/services/orders/orderMutationService';
import type { SellerOrder } from './sellerTypes';
import { useAuthStore } from './sellerAuthStore';
import { useProductStore } from './sellerProductStore';
import { validateOrder, sanitizeOrder, dummyOrders } from './sellerHelpers';

// Order Store
export const useOrderStore = create<OrderStore>()(
    persist(
        (set, get) => ({
            orders: dummyOrders,
            sellerId: null,
            loading: false,
            error: null,

            activeTab: "all",
            setActiveTab: (tab) => set({ activeTab: tab }),

            fetchOrders: async (sellerId: string, startDate?: Date | null, endDate?: Date | null) => {
                if (!sellerId) return;

                set({ loading: true, error: null, sellerId });

                try {
                    // Pass the startDate and endDate to the read service
                    const dbOrders = await orderReadService.getSellerOrders({
                        sellerId,
                        startDate,
                        endDate
                    });
                    const sellerOrders = dbOrders as SellerOrder[];

                    set({
                        orders: sellerOrders,
                        loading: false,
                        error: null,
                    });
                } catch (error) {
                    set({ loading: false, error: "Failed to fetch orders" });
                }
            },

            addOrder: (orderData) => {
                try {
                    // Validate order data
                    if (!validateOrder(orderData)) {
                        console.error("Invalid order data:", orderData);
                        throw new Error("Invalid order data");
                    }

                    // Sanitize and normalize data
                    const sanitizedOrder = sanitizeOrder(orderData);

                    // Generate unique ID with timestamp for database compatibility
                    const timestamp = Date.now();
                    const randomStr = Math.random().toString(36).substr(2, 9);
                    const orderId = `ord-${timestamp}-${randomStr}`;

                    // Create order object
                    const newOrder: SellerOrder = {
                        id: orderId,
                        ...sanitizedOrder,
                    };

                    // Atomic operation: add order to state
                    set((state) => ({
                        orders: [...state.orders, newOrder],
                    }));

                    console.log("Order created successfully:", orderId);
                    return orderId;
                } catch (error) {
                    console.error("Failed to create order:", error);
                    throw error;
                }
            },

            updateOrderStatus: async (id, status) => {
                const order = get().orders.find((o) => o.id === id);
                if (!order) {
                    console.error("Order not found:", id);
                    throw new Error(`Order ${id} not found`);
                }



                // Store previous status for rollback if needed
                const previousStatus = order.status;

                // OPTIMISTIC UPDATE: Update local state immediately for instant UI feedback
                set((state) => ({
                    orders: state.orders.map((o) =>
                        o.id === id ? { ...o, status } : o,
                    ),
                }));

                try {
                    // Validate status transition (database-ready logic)
                    const validTransitions: Record<
                        SellerOrder["status"],
                        SellerOrder["status"][]
                    > = {
                        pending: ["confirmed", "cancelled"],
                        confirmed: ["shipped", "cancelled"],
                        shipped: ["delivered", "cancelled"],
                        delivered: [],
                        cancelled: [],
                    };

                    if (!validTransitions[previousStatus].includes(status)) {
                        console.warn(
                            `Invalid status transition: ${previousStatus} -> ${status}`,
                        );
                    }

                    // Map seller status to database status
                    const statusToDbMap: Record<SellerOrder["status"], string> =
                    {
                        pending: "pending_payment",
                        confirmed: "processing",
                        shipped: "shipped",
                        delivered: "delivered",
                        cancelled: "cancelled",
                    };

                    const dbStatus = statusToDbMap[status] || status;
                    console.log(
                        `Mapping seller status '${status}' to database status '${dbStatus}'`,
                    );

                    // Get seller ID from OrderStore (stored in fetchOrders)
                    let sellerId = get().sellerId;

                    console.log(
                        `Current seller ID from OrderStore:`,
                        sellerId,
                    );

                    // Fallback: Extract seller ID from order object if store doesn't have it
                    if (!sellerId && (order as any).seller_id) {
                        sellerId = (order as any).seller_id;
                        console.log(
                            `Fallback: Using seller_id from order object: ${sellerId}`,
                        );
                    }

                    if (!sellerId) {
                        console.error(
                            "No seller ID found! Cannot update database.",
                        );
                        console.error(
                            "Seller from store:",
                            useAuthStore.getState().seller,
                        );
                        console.error("Order object:", order);
                        throw new Error(
                            "Seller ID is required to update order status",
                        );
                    }

                    console.log(
                        `Updating order ${id} in database with seller ${sellerId}...`,
                    );

                    const success = await orderMutationService.updateOrderStatus(
                        {
                            orderId: id,
                            nextStatus: dbStatus,
                            note: `Status updated to ${status}`,
                            actorId: sellerId,
                            actorRole: "seller",
                        },
                    );

                    console.log(
                        `Database update result: ${success ? "SUCCESS" : "FAILED"}`,
                    );

                    if (!success) {
                        console.error(
                            "Failed to update order status in database",
                        );
                        throw new Error("Database update failed");
                    }

                    console.log(
                        `Database updated successfully with status: ${dbStatus}`,
                    );

                    // Create notification for buyer if order has buyer_id
                    console.log(`Order object:`, order);
                    console.log(`Order buyer_id:`, order.buyer_id);

                    if (order.buyer_id) {
                        const statusMessages: Record<string, string> = {
                            confirmed: `Your order #${order.orderNumber} has been confirmed and is being prepared.`,
                            shipped: `Your order #${order.orderNumber} has been shipped and is on its way!`,
                            delivered: `Your order #${order.orderNumber} has been delivered. Enjoy your purchase!`,
                            cancelled: `Your order #${order.orderNumber} has been cancelled.`,
                        };

                        const message =
                            statusMessages[status] ||
                            `Order #${order.orderNumber} status updated to ${status}`;

                        console.log(
                            `🚀 Creating buyer notification for order ${id}`,
                        );

                        // Import notification service dynamically to avoid circular dependency
                        import("@/services/notificationService").then(
                            ({ notificationService }) => {
                                notificationService
                                    .notifyBuyerOrderStatus({
                                        buyerId: order.buyer_id!,
                                        orderId: id,
                                        orderNumber: id.slice(-8),
                                        status,
                                        message,
                                    })
                                    .catch((refreshError) => {
                                        console.error(
                                            "Failed to refresh orders after status update:",
                                            refreshError,
                                        );
                                    });
                            },
                        );

                        // Fire transactional email using data already in the order (non-blocking)
                        if (order.buyerEmail) {
                            console.log(`[SellerOrderStore] ▶ Sending ${dbStatus} email to ${order.buyerEmail}`);
                            import("@/services/transactionalEmails").then(
                                (emails) => {
                                    const base = {
                                        buyerEmail: order.buyerEmail,
                                        buyerId: order.buyer_id!,
                                        orderNumber: order.orderNumber || id,
                                        buyerName: order.buyerName || 'Valued Customer',
                                    };
                                    const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://bazaar.ph';
                                    const trackUrl = `${BASE_URL}/orders/${id}`;
                                    (
                                        dbStatus === 'processing' ? emails.sendOrderConfirmedEmail({ ...base, estimatedDelivery: '3–7 business days' }) :
                                        dbStatus === 'shipped' ? emails.sendOrderShippedEmail({ ...base, trackingNumber: order.trackingNumber || 'N/A', courierName: 'courier', trackingUrl: trackUrl }) :
                                        dbStatus === 'delivered' ? emails.sendOrderDeliveredEmail(base) :
                                        dbStatus === 'cancelled' ? emails.sendOrderCancelledEmail({ ...base, cancelReason: 'Order cancelled' }) :
                                        Promise.resolve()
                                    ).then((result) => {
                                        console.log(`[SellerOrderStore] ${dbStatus} email result:`, result);
                                    }).catch((emailErr: unknown) => {
                                        console.error("[SellerOrderStore] ✖ Email error:", emailErr);
                                    });
                                }
                            ).catch((importErr: unknown) => {
                                console.warn("[SellerOrderStore] Failed to import transactionalEmails:", importErr);
                            });
                        } else {
                            console.warn(`[SellerOrderStore] ⚠ No buyerEmail — skipping ${dbStatus} email for order ${id}`);
                        }
                    } else {
                        console.warn(
                            `⚠️ No buyer_id found for order ${id}, skipping buyer notification`,
                        );
                    }

                    // Local state already updated optimistically above
                    console.log(`✅ Order ${id} status updated to ${status}`);
                } catch (error) {
                    // ROLLBACK: Revert local state on error
                    console.error("Failed to update order status, rolling back:", error);
                    set((state) => ({
                        orders: state.orders.map((o) =>
                            o.id === id ? { ...o, status: previousStatus } : o,
                        ),
                    }));
                    throw error;
                }
            },

            updatePaymentStatus: (id, status) => {
                try {
                    const order = get().orders.find((o) => o.id === id);
                    if (!order) {
                        throw new Error(`Order ${id} not found`);
                    }

                    set((state) => ({
                        orders: state.orders.map((order) =>
                            order.id === id
                                ? { ...order, paymentStatus: status }
                                : order,
                        ),
                    }));
                } catch (error) {
                    console.error("Failed to update payment status:", error);
                    throw error;
                }
            },

            getOrdersByStatus: (status) => {
                return get().orders.filter((order) => order.status === status);
            },

            getOrderById: (id) => {
                return get().orders.find((order) => order.id === id);
            },

            addTrackingNumber: (id, trackingNumber) => {
                try {
                    const order = get().orders.find((o) => o.id === id);
                    if (!order) {
                        throw new Error(`Order ${id} not found`);
                    }

                    if (!trackingNumber?.trim()) {
                        throw new Error("Invalid tracking number");
                    }

                    set((state) => ({
                        orders: state.orders.map((order) =>
                            order.id === id
                                ? {
                                    ...order,
                                    trackingNumber: trackingNumber
                                        .trim()
                                        .toUpperCase(),
                                }
                                : order,
                        ),
                    }));
                } catch (error) {
                    console.error("Failed to add tracking number:", error);
                    throw error;
                }
            },

            markOrderAsShipped: async (id, trackingNumber) => {
                const order = get().orders.find((o) => o.id === id);
                if (!order) {
                    throw new Error(`Order ${id} not found`);
                }

                const sellerId =
                    get().sellerId ||
                    order.seller_id ||
                    useAuthStore.getState().seller?.id ||
                    null;

                if (!sellerId) {
                    throw new Error(
                        "Seller ID is required to mark order as shipped",
                    );
                }

                const sanitizedTrackingNumber = trackingNumber.trim().toUpperCase();
                if (!sanitizedTrackingNumber) {
                    throw new Error("Tracking number is required");
                }

                // OPTIMISTIC UPDATE: Update UI immediately
                const previousStatus = order.status;
                const previousTracking = order.trackingNumber;

                set((state) => ({
                    orders: state.orders.map((existing) =>
                        existing.id === id
                            ? {
                                ...existing,
                                status: "shipped",
                                trackingNumber: sanitizedTrackingNumber,
                                shipmentStatusRaw: "shipped",
                                shippedAt: new Date().toISOString(),
                            }
                            : existing,
                    ),
                }));

                try {
                    // Sync to database in background
                    const success = await orderMutationService.markOrderShipped({
                        orderId: id,
                        trackingNumber: sanitizedTrackingNumber,
                        sellerId,
                    });
                    if (!success) {
                        throw new Error("Database update failed");
                    }

                    // Fire transactional email using data already in the order (non-blocking)
                    if (order.buyerEmail) {
                        import("@/services/transactionalEmails").then(
                            ({ sendOrderShippedEmail }) => {
                                const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://bazaar.ph';
                                sendOrderShippedEmail({
                                    buyerEmail: order.buyerEmail,
                                    buyerId: order.buyer_id!,
                                    orderNumber: order.orderNumber || id,
                                    buyerName: order.buyerName || 'Valued Customer',
                                    trackingNumber: sanitizedTrackingNumber,
                                    courierName: 'courier',
                                    trackingUrl: `${BASE_URL}/orders/${id}`,
                                }).catch((emailErr: unknown) => {
                                    console.warn("[SellerOrderStore] Shipped email error:", emailErr);
                                });
                            }
                        ).catch((importErr: unknown) => {
                            console.warn("[SellerOrderStore] Failed to import transactionalEmails:", importErr);
                        });
                    }
                } catch (error) {
                    // ROLLBACK on error
                    console.error("Failed to mark order as shipped, rolling back:", error);
                    set((state) => ({
                        orders: state.orders.map((existing) =>
                            existing.id === id
                                ? {
                                    ...existing,
                                    status: previousStatus,
                                    trackingNumber: previousTracking,
                                }
                                : existing,
                        ),
                    }));
                    throw error;
                }
            },

            markOrderAsDelivered: async (id) => {
                const order = get().orders.find((o) => o.id === id);
                if (!order) {
                    throw new Error(`Order ${id} not found`);
                }

                const sellerId =
                    get().sellerId ||
                    order.seller_id ||
                    useAuthStore.getState().seller?.id ||
                    null;

                if (!sellerId) {
                    throw new Error(
                        "Seller ID is required to mark order as delivered",
                    );
                }

                // OPTIMISTIC UPDATE: Update UI immediately
                const previousStatus = order.status;
                const previousShipmentStatus = order.shipmentStatusRaw;

                set((state) => ({
                    orders: state.orders.map((existing) =>
                        existing.id === id
                            ? {
                                ...existing,
                                status: "delivered",
                                shipmentStatusRaw: "delivered",
                                deliveredAt: new Date().toISOString(),
                            }
                            : existing,
                    ),
                }));

                try {
                    // Sync to database in background
                    const success = await orderMutationService.markOrderDelivered({
                        orderId: id,
                        sellerId,
                    });
                    if (!success) {
                        throw new Error("Database update failed");
                    }

                    // Fire transactional email using data already in the order (non-blocking)
                    // Send in-app notification + push to buyer
                    if (order.buyer_id) {
                        import("@/services/notificationService").then(
                            ({ notificationService }) => {
                                notificationService.notifyBuyerOrderStatus({
                                    buyerId: order.buyer_id!,
                                    orderId: id,
                                    orderNumber: order.orderNumber || id,
                                    status: 'delivered',
                                    message: `Your order #${order.orderNumber || id} has been delivered. Enjoy your purchase!`,
                                }).catch((err: unknown) => {
                                    console.error('[SellerOrderStore] ✖ Delivered notification error:', err);
                                });
                            }
                        ).catch((importErr: unknown) => {
                            console.warn('[SellerOrderStore] Failed to import notificationService:', importErr);
                        });
                    }

                    if (order.buyerEmail) {
                        import("@/services/transactionalEmails").then(
                            ({ sendOrderDeliveredEmail }) => {
                                console.log('[SellerOrderStore] ▶ Sending delivered email to', order.buyerEmail);
                                sendOrderDeliveredEmail({
                                    buyerEmail: order.buyerEmail,
                                    buyerId: order.buyer_id!,
                                    orderNumber: order.orderNumber || id,
                                    buyerName: order.buyerName || 'Valued Customer',
                                }).then((result) => {
                                    console.log('[SellerOrderStore] Delivered email result:', result);
                                }).catch((emailErr: unknown) => {
                                    console.error("[SellerOrderStore] ✖ Delivered email error:", emailErr);
                                });
                            }
                        ).catch((importErr: unknown) => {
                            console.warn("[SellerOrderStore] Failed to import transactionalEmails:", importErr);
                        });
                    } else {
                        console.warn('[SellerOrderStore] ⚠ No buyerEmail on order — skipping delivered email', { orderId: id, hasEmail: !!order.buyerEmail });
                    }
                } catch (error) {
                    // ROLLBACK on error
                    console.error("Failed to mark order as delivered, rolling back:", error);
                    set((state) => ({
                        orders: state.orders.map((existing) =>
                            existing.id === id
                                ? {
                                    ...existing,
                                    status: previousStatus,
                                    shipmentStatusRaw: previousShipmentStatus,
                                    deliveredAt: undefined,
                                }
                                : existing,
                        ),
                    }));
                    throw error;
                }
            },

            deleteOrder: (id) => {
                try {
                    const order = get().orders.find((o) => o.id === id);
                    if (!order) {
                        throw new Error(`Order ${id} not found`);
                    }

                    set((state) => ({
                        orders: state.orders.filter((order) => order.id !== id),
                    }));
                } catch (error) {
                    console.error("Failed to delete order:", error);
                    throw error;
                }
            },

            addOrderRating: (id, rating, comment, images) => {
                try {
                    const order = get().orders.find((o) => o.id === id);
                    if (!order) {
                        throw new Error(`Order ${id} not found`);
                    }

                    if (rating < 1 || rating > 5) {
                        throw new Error("Rating must be between 1 and 5");
                    }

                    set((state) => ({
                        orders: state.orders.map((order) =>
                            order.id === id
                                ? {
                                    ...order,
                                    rating,
                                    reviewComment: comment,
                                    reviewImages: images,
                                    reviewDate: new Date().toISOString(),
                                    status: "delivered", // Ensure delivered when rated
                                    paymentStatus: "paid", // Mark as paid after successful delivery
                                }
                                : order,
                        ),
                    }));

                    console.log(`Order ${id} rated: ${rating} stars`);
                } catch (error) {
                    console.error("Failed to add order rating:", error);
                    throw error;
                }
            },

            // POS-Lite: Add offline order and deduct stock
            addOfflineOrder: async (cartItems, total, note) => {
                try {
                    // Validate cart items
                    if (!cartItems || cartItems.length === 0) {
                        throw new Error("Cart is empty");
                    }

                    if (total <= 0) {
                        throw new Error("Invalid order total");
                    }

                    // Check stock availability for all items before proceeding
                    const productStore = useProductStore.getState();
                    for (const item of cartItems) {
                        const product = productStore.products.find(
                            (p) => p.id === item.productId,
                        );
                        if (!product) {
                            throw new Error(
                                `Product ${item.productName} not found`,
                            );
                        }
                        if (product.stock < item.quantity) {
                            throw new Error(
                                `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`,
                            );
                        }
                    }

                    // Get seller info for database order
                    const authStore = useAuthStore.getState();
                    const sellerId = authStore.seller?.id || '';
                    const sellerName = authStore.seller?.storeName || authStore.seller?.name || 'Unknown Store';

                    console.log(`[createOfflineOrder] Creating POS order in database for seller: ${sellerId}`);

                    // Create order in database using orderService
                    const result = await orderService.createPOSOrder(
                        sellerId,
                        sellerName,
                        cartItems,
                        total,
                        note,
                    );

                    if (!result) {
                        throw new Error("Failed to create POS order in database");
                    }

                    const { orderId, orderNumber } = result;
                    console.log(`[createOfflineOrder] Order created in database: ${orderNumber} (${orderId})`);

                    // Create local order for UI (backwards compatibility)
                    const newOrder: SellerOrder = {
                        id: orderId,
                        buyerName: "Walk-in Customer",
                        buyerEmail: "pos@offline.sale",
                        items: cartItems,
                        total,
                        status: "delivered", // POS orders are immediately completed
                        paymentStatus: "paid", // POS orders are paid upfront
                        orderDate: new Date().toISOString(),
                        shippingAddress: {
                            fullName: "Walk-in Customer",
                            street: "In-Store Purchase",
                            city: "N/A",
                            province: "N/A",
                            postalCode: "0000",
                            phone: "N/A",
                        },
                        type: "OFFLINE", // Mark as offline order
                        posNote: note || "POS Sale",
                        trackingNumber: orderNumber,
                    };

                    // Add order to local store
                    set((state) => ({
                        orders: [newOrder, ...state.orders],
                    }));

                    // Refresh products to show updated stock and sold counts
                    console.log(`[createOfflineOrder] Refreshing products to update stock and sold counts...`);
                    await productStore.fetchProducts({ sellerId });
                    console.log(`[createOfflineOrder] Products refreshed. New product count: ${productStore.products.length}`);

                    console.log(
                        `✅ Offline order created: ${orderNumber}. Stock deducted and sold count updated in database.`,
                    );
                    return orderId;
                } catch (error) {
                    console.error("Failed to create offline order:", error);
                    throw error;
                }
            },
        }),
        {
            name: "seller-orders-storage",
            version: 1, // Version for migration support
        },
    ),
);

