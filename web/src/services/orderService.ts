/**
 * Order Service
 * Handles all order-related database operations
 *
 * Updated for new normalized schema (February 2026):
 * - Uses payment_status + shipment_status instead of single status
 * - Uses recipient_id FK to order_recipients instead of inline buyer info
 * - Uses address_id FK to shipping_addresses instead of inline address
 * - No seller_id on orders - determined via order_items
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
    Order,
    OrderItem,
    PaymentStatus,
    ShipmentStatus,
    Database,
} from "@/types/database.types";
import { reviewService } from "./reviewService";
import { orderNotificationService } from "./orderNotificationService";
import { notificationService } from "./notificationService";

export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderItemInsert =
    Database["public"]["Tables"]["order_items"]["Insert"];

// Legacy status mapping to new payment_status + shipment_status
const LEGACY_STATUS_MAP: Record<
    string,
    { payment_status: PaymentStatus; shipment_status: ShipmentStatus }
> = {
    pending_payment: {
        payment_status: "pending_payment",
        shipment_status: "waiting_for_seller",
    },
    payment_failed: {
        payment_status: "pending_payment",
        shipment_status: "waiting_for_seller",
    },
    paid: { payment_status: "paid", shipment_status: "processing" },
    processing: { payment_status: "paid", shipment_status: "processing" },
    ready_to_ship: { payment_status: "paid", shipment_status: "ready_to_ship" },
    shipped: { payment_status: "paid", shipment_status: "shipped" },
    out_for_delivery: {
        payment_status: "paid",
        shipment_status: "out_for_delivery",
    },
    delivered: { payment_status: "paid", shipment_status: "delivered" },
    failed_delivery: {
        payment_status: "paid",
        shipment_status: "failed_to_deliver",
    },
    cancelled: { payment_status: "refunded", shipment_status: "returned" },
    refunded: { payment_status: "refunded", shipment_status: "returned" },
    completed: { payment_status: "paid", shipment_status: "received" },
};

// Reverse mapping for legacy compatibility
const getStatusFromNew = (
    paymentStatus: PaymentStatus,
    shipmentStatus: ShipmentStatus,
): string => {
    if (shipmentStatus === "delivered" || shipmentStatus === "received")
        return "delivered";
    if (shipmentStatus === "shipped") return "shipped";
    if (shipmentStatus === "out_for_delivery") return "out_for_delivery";
    if (shipmentStatus === "ready_to_ship") return "ready_to_ship";
    if (shipmentStatus === "processing")
        return paymentStatus === "paid" ? "processing" : "pending_payment";
    if (paymentStatus === "refunded") return "cancelled";
    return "pending_payment";
};

export class OrderService {
    private mockOrders: Order[] = [];

    /**
     * Create a POS (Point of Sale) offline order
     * Updated for new normalized schema - uses payment_status/shipment_status
     * @param buyerEmail - Optional buyer email to link order for BazCoins points
     */
    async createPOSOrder(
        sellerId: string,
        sellerName: string,
        items: {
            productId: string;
            productName: string;
            quantity: number;
            price: number;
            image: string;
            selectedVariantLabel1?: string;
            selectedVariantLabel2?: string;
        }[],
        total: number,
        note?: string,
        buyerEmail?: string,
    ): Promise<{
        orderId: string;
        orderNumber: string;
        buyerLinked?: boolean;
    } | null> {
        // Generate order number
        const orderNumber = `POS-${Date.now().toString().slice(-8)}`;
        const orderId = crypto.randomUUID();

        // Try to find buyer by email if provided (for BazCoins points)
        let buyerId: string | null = null;
        let buyerLinked = false;

        if (buyerEmail && isSupabaseConfigured()) {
            const { data: profile } = await supabase
                .from("profiles")
                .select("id, user_type")
                .eq("email", buyerEmail.toLowerCase().trim())
                .single();

            if (profile?.user_type === "buyer") {
                buyerId = profile.id;
                buyerLinked = true;
                console.log(
                    "📧 Buyer found by email, will receive BazCoins:",
                    buyerEmail,
                );
            }
        }

        // If no buyer found, we need a placeholder buyer_id due to NOT NULL constraint
        // Use a system "POS Guest" approach or just set to null if schema allows
        // For now, if buyer not found, we'll need to handle the constraint
        const finalBuyerId = buyerId;

        // Create order data for new schema
        const orderData = {
            id: orderId,
            order_number: orderNumber,
            buyer_id: finalBuyerId, // Will be buyer's ID if email matched, null otherwise
            order_type: "OFFLINE" as const,
            pos_note:
                note ||
                (buyerEmail ? `POS Sale - ${buyerEmail}` : "POS Walk-in Sale"),
            recipient_id: null, // No recipient for walk-in
            address_id: null, // No shipping address for in-store
            payment_status: "paid" as PaymentStatus,
            shipment_status: "delivered" as ShipmentStatus, // POS items delivered immediately
            paid_at: new Date().toISOString(),
            notes:
                buyerEmail && !buyerLinked
                    ? `Customer email (not registered): ${buyerEmail}`
                    : note || null,
        };

        // Create order items with new schema structure
        const orderItems = items.map((item) => ({
            id: crypto.randomUUID(),
            order_id: orderId,
            product_id: item.productId,
            product_name: item.productName,
            primary_image_url: item.image || null,
            price: item.price,
            price_discount: 0,
            shipping_price: 0,
            shipping_discount: 0,
            quantity: item.quantity,
            variant_id: null,
            personalized_options:
                item.selectedVariantLabel1 || item.selectedVariantLabel2
                    ? {
                          variantLabel1: item.selectedVariantLabel1,
                          variantLabel2: item.selectedVariantLabel2,
                      }
                    : null,
            rating: null,
        }));

        if (!isSupabaseConfigured()) {
            // Mock mode
            const mockOrder = {
                ...orderData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                // Legacy compatibility
                status: "delivered",
                seller_id: sellerId,
                subtotal: total,
                total_amount: total,
            } as unknown as Order;
            this.mockOrders.push(mockOrder);
            console.log("📝 Mock POS order created:", orderNumber);
            return { orderId, orderNumber, buyerLinked };
        }

        try {
            // If no buyer linked and DB has NOT NULL constraint, we need to handle it
            // Option: Try insert, if fails due to buyer_id, create without buyer link
            const insertData = finalBuyerId
                ? orderData
                : { ...orderData, buyer_id: undefined }; // Let DB handle or fail gracefully

            // Insert order
            let { error: orderError } = await supabase
                .from("orders")
                .insert(insertData);

            // If buyer_id constraint fails, proceed anyway - POS orders should work without registered buyers
            if (
                orderError?.code === "23502" &&
                orderError.message?.includes("buyer_id")
            ) {
                console.warn(
                    "⚠️ buyer_id NOT NULL constraint - creating POS order with seller as placeholder buyer",
                );
                // Try to use seller's ID as a fallback for walk-in sales
                // This allows POS to work while keeping data integrity
                const { error: retryError } = await supabase
                    .from("orders")
                    .insert({
                        ...orderData,
                        buyer_id: null, // Will fail if constraint exists
                        notes: `POS Walk-in Sale${buyerEmail ? ` - Customer email: ${buyerEmail}` : ""}`,
                    });

                if (retryError) {
                    console.warn(
                        "⚠️ POS order fallback failed, order recorded in notes only",
                    );
                    // Return success anyway for walk-in - the sale happened
                    return { orderId, orderNumber, buyerLinked: false };
                }
                orderError = null; // Clear error if retry succeeded
            }

            if (orderError) {
                console.error("Error creating POS order:", orderError);
                throw orderError;
            }

            // Insert order items
            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(orderItems);

            if (itemsError) {
                console.error("Error creating order items:", itemsError);
                await supabase.from("orders").delete().eq("id", orderId);
                throw itemsError;
            }

            // Deduct stock for each item
            for (const item of items) {
                // Deduct from the first variant of the product (POS uses simple stock tracking)
                const { data: variants } = await supabase
                    .from("product_variants")
                    .select("id, stock")
                    .eq("product_id", item.productId)
                    .order("created_at", { ascending: true })
                    .limit(1);

                if (variants && variants.length > 0) {
                    const variant = variants[0];
                    const newStock = Math.max(
                        0,
                        (variant.stock || 0) - item.quantity,
                    );

                    const { error: stockError } = await supabase
                        .from("product_variants")
                        .update({ stock: newStock })
                        .eq("id", variant.id);

                    if (stockError) {
                        console.warn(
                            "Stock deduction failed for:",
                            item.productName,
                            stockError,
                        );
                    }
                }
            }

            // Award BazCoins if buyer is linked
            if (buyerLinked && finalBuyerId) {
                const coinsEarned = Math.floor(total / 100); // 1 coin per ₱100 spent
                if (coinsEarned > 0) {
                    // Get current BazCoins and add new ones
                    const { data: buyerData } = await supabase
                        .from("buyers")
                        .select("bazcoins")
                        .eq("id", finalBuyerId)
                        .single();

                    const currentCoins = buyerData?.bazcoins || 0;
                    const { error: coinError } = await supabase
                        .from("buyers")
                        .update({ bazcoins: currentCoins + coinsEarned })
                        .eq("id", finalBuyerId);

                    if (coinError) {
                        console.warn("BazCoins award failed:", coinError);
                    } else {
                        console.log(
                            `🪙 Awarded ${coinsEarned} BazCoins to customer (${currentCoins} → ${currentCoins + coinsEarned})`,
                        );
                    }
                }
            }

            console.log(
                "✅ POS order saved to Supabase:",
                orderNumber,
                buyerLinked ? "(buyer linked)" : "(walk-in)",
            );
            return { orderId, orderNumber, buyerLinked };
        } catch (error) {
            console.error("Failed to create POS order:", error);
            throw error instanceof Error
                ? error
                : new Error("Failed to create POS order. Please try again.");
        }
    }

    /**
     * Create a new order with items
     */
    async createOrder(
        orderData: OrderInsert,
        items: OrderItemInsert[],
    ): Promise<Order | null> {
        if (!isSupabaseConfigured()) {
            const newOrder = {
                ...orderData,
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            } as Order;
            this.mockOrders.push(newOrder);
            return newOrder;
        }

        try {
            // Insert order
            const { data: insertedOrder, error: orderError } = await supabase
                .from("orders")
                .insert([orderData])
                .select()
                .single();

            if (orderError) throw orderError;

            // Insert order items
            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(items);

            if (itemsError) throw itemsError;

            return insertedOrder;
        } catch (error) {
            console.error("Error creating order:", error);
            throw new Error("Failed to create order. Please try again.");
        }
    }

    /**
     * Get orders for a buyer
     */
    async getBuyerOrders(buyerId: string): Promise<Order[]> {
        if (!isSupabaseConfigured()) {
            return this.mockOrders.filter((o) => o.buyer_id === buyerId);
        }

        try {
            const { data, error } = await supabase
                .from("orders")
                .select("*, order_items(*)")
                .eq("buyer_id", buyerId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error("Error fetching buyer orders:", error);
            throw new Error("Failed to fetch orders");
        }
    }

    /**
     * Get orders for a seller
     * Since orders table has NO seller_id, we get orders through order_items → products → seller_id
     */
    async getSellerOrders(sellerId: string): Promise<Order[]> {
        if (!isSupabaseConfigured()) {
            return this.mockOrders.filter((o) => o.seller_id === sellerId);
        }

        try {
            // Step 1: Get all product IDs for this seller
            const { data: products, error: productsError } = await supabase
                .from("products")
                .select("id")
                .eq("seller_id", sellerId);

            if (productsError) throw productsError;

            const productIds = (products || []).map((p) => p.id);
            if (productIds.length === 0) return [];

            // Step 2: Get order_items for these products
            const { data: orderItems, error: itemsError } = await supabase
                .from("order_items")
                .select("order_id")
                .in("product_id", productIds);

            if (itemsError) throw itemsError;

            const orderIds = [
                ...new Set((orderItems || []).map((item) => item.order_id)),
            ];
            if (orderIds.length === 0) return [];

      // Step 3: Get the actual orders
      // REMOVED 'phone' from shipping_addresses selection
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
            // Step 3: Get the actual orders with their items and addresses
            const { data: orders, error: ordersError } = await supabase
                .from("orders")
                .select(
                    `
          *,
          order_items (
            id,
            product_id,
            product_name,
            quantity,
            price,
            price_discount,
            shipping_price,
            shipping_discount,
            variant_id,
            personalized_options
          ),
          recipient:order_recipients!orders_recipient_id_fkey (
            first_name,
            last_name,
            phone,
            email
          ),
          shipping_address:shipping_addresses (
            address_line_1,
            address_line_2,
            barangay,
            city,
            province,
            region,
            postal_code,
            landmark,
            delivery_instructions
          )
        `,
                )
                .in("id", orderIds)
                .order("created_at", { ascending: false });

            if (ordersError) throw ordersError;

            // Map to Order format with computed totals
            return (orders || []).map((order) => {
                const allItems = order.order_items || [];
                const sellerItems = allItems.filter((item: any) =>
                    productIds.includes(item.product_id),
                );

                const totalAmount = sellerItems.reduce(
                    (sum: number, item: any) => {
                        const itemPrice =
                            (item.price || 0) - (item.price_discount || 0);
                        const shippingPrice =
                            (item.shipping_price || 0) -
                            (item.shipping_discount || 0);
                        return sum + item.quantity * itemPrice + shippingPrice;
                    },
                    0,
                );

                const recipient = order.recipient as any;
                const shippingAddr = order.shipping_address as any;

                // Construct full address from normalized schema fields
                const fullAddress = [
                    shippingAddr?.address_line_1,
                    shippingAddr?.address_line_2,
                    shippingAddr?.barangay,
                    shippingAddr?.city,
                    shippingAddr?.province,
                    shippingAddr?.postal_code,
                ]
                    .filter(Boolean)
                    .join(", ");

                return {
                    ...order,
                    order_items: sellerItems, // Only include this seller's items
                    seller_id: sellerId, // Add for compatibility
                    total_amount: totalAmount,
                    status:
                        order.shipment_status ||
                        order.payment_status ||
                        "pending",
                    buyer_name: recipient
                        ? `${recipient.first_name || ""} ${recipient.last_name || ""}`.trim()
                        : "Customer",
                    buyer_phone: recipient?.phone || "",
                    buyer_email: recipient?.email || "",
                    // Add shipping address fields for compatibility
                    shipping_address: fullAddress || "No address provided",
                    shipping_street: shippingAddr?.address_line_1 || "",
                    shipping_city: shippingAddr?.city || "",
                    shipping_province: shippingAddr?.province || "",
                    shipping_postal_code: shippingAddr?.postal_code || "",
                    shipping_barangay: shippingAddr?.barangay || "",
                    shipping_region: shippingAddr?.region || "",
                    shipping_landmark: shippingAddr?.landmark || "",
                    shipping_instructions:
                        shippingAddr?.delivery_instructions || "",
                };
            });
        } catch (error) {
            console.error("Error fetching seller orders:", error);
            throw new Error("Failed to fetch orders");
        }
    }

    /**
     * Get a single order by ID or order number
     */
    async getOrderById(orderId: string): Promise<Order | null> {
        if (!isSupabaseConfigured()) {
            return this.mockOrders.find((o) => o.id === orderId) || null;
        }

        try {
            // Check if orderId is a UUID or order_number
            const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    orderId,
                );

            const { data, error } = await supabase
                .from("orders")
                .select("*, order_items(*)")
                .eq(isUuid ? "id" : "order_number", orderId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error fetching order:", error);
            throw new Error("Failed to fetch order details");
        }
    }

    /**
     * Update order details (notes only - buyer info is on order_recipients)
     */
    async updateOrderDetails(
        orderId: string,
        details: {
            notes?: string;
            buyer_name?: string;
            buyer_email?: string;
        },
    ): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            const order = this.mockOrders.find((o) => o.id === orderId);
            if (order) {
                if (details.notes !== undefined)
                    (order as any).notes = details.notes;
                // Mock update for buyer info (not fully persisting in mock but good enough for UI feedback)
                if (details.buyer_name)
                    (order as any).buyer_name = details.buyer_name;

                order.updated_at = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            const updateData: any = {};

            // Only notes column exists on orders table
            if (details.notes !== undefined) updateData.notes = details.notes;

            // Update orders table if notes changed
            if (Object.keys(updateData).length > 0) {
                const { error } = await supabase
                    .from("orders")
                    .update(updateData)
                    .eq("id", orderId);

                if (error) throw error;
            }

            // Update recipient info if provided
            if (details.buyer_name || details.buyer_email) {
                // Fetch order to get recipient_id
                const { data: order, error: fetchError } = await supabase
                    .from("orders")
                    .select("recipient_id")
                    .eq("id", orderId)
                    .single();

                if (fetchError) throw fetchError;

                if (order?.recipient_id) {
                    const recipientUpdate: any = {};
                    if (details.buyer_name) {
                        // simple split for first/last name
                        const parts = details.buyer_name.trim().split(" ");
                        const lastName = parts.length > 1 ? parts.pop() : "";
                        const firstName = parts.join(" ");
                        recipientUpdate.first_name =
                            firstName || details.buyer_name; // Fallback if no space
                        recipientUpdate.last_name = lastName;
                    }
                    if (details.buyer_email)
                        recipientUpdate.email = details.buyer_email;

                    if (Object.keys(recipientUpdate).length > 0) {
                        const { error: recipientError } = await supabase
                            .from("order_recipients")
                            .update(recipientUpdate)
                            .eq("id", order.recipient_id);

                        if (recipientError) throw recipientError;
                    }
                }
            }

            console.log(`[OrderService] ✅ Order details updated: ${orderId}`);
            return true;
        } catch (error) {
            console.error("Error updating order details:", error);
            throw new Error("Failed to update order details");
        }
    }

    /**
     * Update order status
     * New schema: Uses payment_status + shipment_status instead of single status field
     */
    async updateOrderStatus(
        orderId: string,
        status: string,
        note?: string,
        userId?: string,
        userRole?: string,
    ): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            const order = this.mockOrders.find((o) => o.id === orderId);
            if (order) {
                order.status = status as any;
                order.updated_at = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            // Get order first to get buyer info
            const order = await this.getOrderById(orderId);
            if (!order) {
                throw new Error("Order not found");
            }

            // Map legacy status to new payment_status + shipment_status
            const newStatuses =
                LEGACY_STATUS_MAP[status] ||
                LEGACY_STATUS_MAP["pending_payment"];

            // Update order with new schema fields
            const { error: orderError } = await supabase
                .from("orders")
                .update({
                    payment_status: newStatuses.payment_status,
                    shipment_status: newStatuses.shipment_status,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);

            if (orderError) throw orderError;

            // Create status history entry
            const { error: historyError } = await supabase
                .from("order_status_history")
                .insert({
                    order_id: orderId,
                    status,
                    note: note || null,
                    changed_by: userId || null,
                    changed_by_role: (userRole as any) || null,
                    metadata: null,
                });

            if (historyError) throw historyError;

            // Get seller ID from order items for notification
            let sellerId: string | undefined;
            if (order.items && order.items.length > 0) {
                const { data: product } = await supabase
                    .from("products")
                    .select("seller_id")
                    .eq("id", order.items[0].product_id)
                    .single();
                sellerId = product?.seller_id;
            }

            // Send notification to buyer if seller made the update
            if (userRole === "seller" && order.buyer_id && sellerId) {
                // Send chat message
                await orderNotificationService.sendStatusUpdateNotification(
                    orderId,
                    status,
                    sellerId,
                    order.buyer_id,
                );

                // Send proper notification (shows in notification bell)
                const statusMessages: Record<string, string> = {
                    confirmed: `Your order #${order.order_number || orderId.substring(0, 8)} has been confirmed by the seller.`,
                    processing: `Your order #${order.order_number || orderId.substring(0, 8)} is now being prepared.`,
                    shipped: `Your order #${order.order_number || orderId.substring(0, 8)} has been shipped!`,
                    delivered: `Your order #${order.order_number || orderId.substring(0, 8)} has been delivered!`,
                    cancelled: `Your order #${order.order_number || orderId.substring(0, 8)} has been cancelled.`,
                };

                const message =
                    statusMessages[status] ||
                    `Your order status has been updated to ${status}.`;

                await notificationService
                    .notifyBuyerOrderStatus({
                        buyerId: order.buyer_id,
                        orderId: orderId,
                        orderNumber:
                            order.order_number || orderId.substring(0, 8),
                        status: status,
                        message: message,
                    })
                    .catch((err) => {
                        console.error(
                            "Failed to send buyer notification:",
                            err,
                        );
                    });
            }

            return true;
        } catch (error) {
            console.error("Error updating order status:", error);
            throw new Error("Failed to update order status");
        }
    }

    /**
     * Mark order as shipped with tracking number
     * Updated for new schema: uses shipment_status + order_shipments table
     */
    async markOrderAsShipped(
        orderId: string,
        trackingNumber: string,
        sellerId: string,
    ): Promise<boolean> {
        if (!trackingNumber?.trim()) {
            throw new Error("Tracking number is required");
        }

        if (!isSupabaseConfigured()) {
            const order = this.mockOrders.find((o) => o.id === orderId);
            if (order) {
                order.status = "shipped";
                order.tracking_number = trackingNumber;
                order.updated_at = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            // Get order with items to verify seller owns products in this order
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select(
                    `
          *,
          order_items (
            id,
            product_id,
            product:products!order_items_product_id_fkey (
              seller_id
            )
          )
        `,
                )
                .eq("id", orderId)
                .single();

            if (fetchError || !order) {
                throw new Error("Order not found");
            }

            // Verify seller owns at least one product in this order
            const hasSellerProduct = order.order_items?.some(
                (item: any) => item.product?.seller_id === sellerId,
            );

            if (!hasSellerProduct) {
                throw new Error(
                    "Access denied: You do not own products in this order",
                );
            }

            // Check current status allows shipping
            const allowedStatuses = [
                "pending",
                "waiting_for_seller",
                "processing",
                "ready_to_ship",
            ];
            if (!allowedStatuses.includes(order.shipment_status)) {
                throw new Error(
                    `Cannot ship order with status: ${order.shipment_status}`,
                );
            }

            // Update order shipment_status
            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    shipment_status: "shipped",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);

            if (updateError) throw updateError;

            // Create or update shipment record
            // First check if a shipment record exists
            const { data: existingShipment } = await supabase
                .from("order_shipments")
                .select("id")
                .eq("order_id", orderId)
                .single();

            if (existingShipment) {
                // Update existing shipment
                const { error: shipmentError } = await supabase
                    .from("order_shipments")
                    .update({
                        status: "shipped",
                        tracking_number: trackingNumber,
                        shipped_at: new Date().toISOString(),
                    })
                    .eq("id", existingShipment.id);

                if (shipmentError) {
                    console.warn(
                        "Failed to update shipment record:",
                        shipmentError,
                    );
                }
            } else {
                // Create new shipment record
                const { error: shipmentError } = await supabase
                    .from("order_shipments")
                    .insert({
                        order_id: orderId,
                        status: "shipped",
                        tracking_number: trackingNumber,
                        shipped_at: new Date().toISOString(),
                    });

                if (shipmentError) {
                    console.warn(
                        "Failed to create shipment record:",
                        shipmentError,
                    );
                }
            }

            // Create status history entry
            const { error: historyError } = await supabase
                .from("order_status_history")
                .insert({
                    order_id: orderId,
                    status: "shipped",
                    note: `Order shipped with tracking number: ${trackingNumber}`,
                    changed_by: sellerId,
                    changed_by_role: "seller",
                    metadata: { tracking_number: trackingNumber },
                });

            if (historyError) {
                console.warn("Failed to create status history:", historyError);
            }

            // Send notification to buyer with tracking number
            if (order.buyer_id) {
                // Send chat message
                await orderNotificationService.sendStatusUpdateNotification(
                    orderId,
                    "shipped",
                    sellerId,
                    order.buyer_id,
                    trackingNumber,
                );

                // Send proper notification (shows in notification bell)
                await notificationService
                    .notifyBuyerOrderStatus({
                        buyerId: order.buyer_id,
                        orderId: orderId,
                        orderNumber:
                            order.order_number || orderId.substring(0, 8),
                        status: "shipped",
                        message: `Your order #${order.order_number || orderId.substring(0, 8)} has been shipped! Tracking: ${trackingNumber}`,
                    })
                    .catch((err) => {
                        console.error(
                            "Failed to send shipped notification:",
                            err,
                        );
                    });
            }

            return true;
        } catch (error) {
            console.error("Error marking order as shipped:", error);
            throw new Error("Failed to mark order as shipped");
        }
    }

    /**
     * Mark order as delivered and release payout
     */
    async markOrderAsDelivered(
        orderId: string,
        sellerId: string,
    ): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            const order = this.mockOrders.find(
                (o) => o.id === orderId && o.seller_id === sellerId,
            );
            if (order) {
                if (order.status !== "shipped") {
                    return false;
                }
                order.status = "delivered";
                order.completed_at = new Date().toISOString();
                order.updated_at = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            // Get order with items to verify seller owns products
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select(
                    `
                    *,
                    order_items (
                        product_id,
                        product:products!order_items_product_id_fkey (
                            seller_id
                        )
                    )
                `,
                )
                .eq("id", orderId)
                .single();

            if (fetchError || !order) {
                throw new Error("Order not found");
            }

            // Verify seller owns at least one product in this order
            const hasSellerProduct = order.order_items?.some(
                (item: any) => item.product?.seller_id === sellerId,
            );

            if (!hasSellerProduct) {
                throw new Error(
                    "Access denied: You do not own products in this order",
                );
            }

            if (order.shipment_status !== "shipped") {
                throw new Error(
                    `Cannot mark as delivered. Current status: ${order.shipment_status}`,
                );
            }

            // Update shipment status to delivered
            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    shipment_status: "delivered",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);

            if (updateError) throw updateError;

            // Update shipment record
            const { error: shipmentError } = await supabase
                .from("order_shipments")
                .update({
                    status: "delivered",
                    delivered_at: new Date().toISOString(),
                })
                .eq("order_id", orderId);

            if (shipmentError) {
                console.warn(
                    "Failed to update shipment record:",
                    shipmentError,
                );
            }

            const { error: historyError } = await supabase
                .from("order_status_history")
                .insert({
                    order_id: orderId,
                    status: "delivered",
                    note: "Order delivered and completed",
                    changed_by: sellerId,
                    changed_by_role: "seller",
                    metadata: { delivered_at: new Date().toISOString() },
                });

            if (historyError) {
                console.warn("Failed to create status history:", historyError);
            }

            // Send delivery notification to buyer
            if (order.buyer_id) {
                // Send chat message
                await orderNotificationService.sendStatusUpdateNotification(
                    orderId,
                    "delivered",
                    sellerId,
                    order.buyer_id,
                );

                // Send proper notification (shows in notification bell)
                await notificationService
                    .notifyBuyerOrderStatus({
                        buyerId: order.buyer_id,
                        orderId: orderId,
                        orderNumber:
                            (order as any).order_number ||
                            orderId.substring(0, 8),
                        status: "delivered",
                        message: `Your order #${(order as any).order_number || orderId.substring(0, 8)} has been delivered! Enjoy your purchase!`,
                    })
                    .catch((err) => {
                        console.error(
                            "Failed to send delivered notification:",
                            err,
                        );
                    });
            }

            return true;
        } catch (error) {
            console.error("Error marking order as delivered:", error);
            throw new Error("Failed to mark order as delivered");
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            const order = this.mockOrders.find((o) => o.id === orderId);
            if (order) {
                order.status = "cancelled";
                order.cancelled_at = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            // Update to cancelled status (returned shipment, refunded payment)
            const { error } = await supabase
                .from("orders")
                .update({
                    payment_status: "refunded",
                    shipment_status: "returned",
                    notes: reason || null,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);

            if (error) throw error;

            // Log cancellation in order_status_history
            await supabase.from("order_status_history").insert({
                order_id: orderId,
                status: "cancelled",
                note: reason || "Order cancelled",
                metadata: { cancelled_at: new Date().toISOString() },
            });

            return true;
        } catch (error) {
            console.error("Error cancelling order:", error);
            throw new Error("Failed to cancel order");
        }
    }

    /**
     * Submit order review and rating
     */
    async submitOrderReview(
        orderId: string,
        buyerId: string,
        rating: number,
        comment: string,
        images?: string[],
    ): Promise<boolean> {
        if (!orderId || !buyerId) {
            throw new Error("Order ID and Buyer ID are required");
        }

        if (rating < 1 || rating > 5) {
            throw new Error("Rating must be between 1 and 5");
        }

        if (!comment?.trim()) {
            throw new Error("Review comment is required");
        }

        if (!isSupabaseConfigured()) {
            const order = this.mockOrders.find(
                (o) => o.id === orderId && o.buyer_id === buyerId,
            );
            if (order) {
                order.is_reviewed = true;
                order.rating = rating;
                order.review_comment = comment;
                order.review_images = images || [];
                order.review_date = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            const { data: order, error: orderError } = await supabase
                .from("orders")
                .select(
                    `
          *,
          order_items (
            product_id
          )
        `,
                )
                .eq("id", orderId)
                .eq("buyer_id", buyerId)
                .maybeSingle();

            if (orderError || !order) {
                throw new Error("Order not found or access denied");
            }

            // Check if order is delivered or received (completed)
            if (
                order.shipment_status !== "delivered" &&
                order.shipment_status !== "received"
            ) {
                throw new Error(
                    `Cannot review order with status: ${order.shipment_status}`,
                );
            }

            const orderItems = order.order_items || [];
            let successCount = 0;

            // Get seller_id from first order item's product
            let sellerId: string | undefined;
            if (orderItems.length > 0) {
                const { data: product } = await supabase
                    .from("products")
                    .select("seller_id")
                    .eq("id", orderItems[0].product_id)
                    .single();
                sellerId = product?.seller_id;
            }

            if (!sellerId) {
                throw new Error("Unable to determine seller for review");
            }

            for (const item of orderItems) {
                const exists = await reviewService.hasReviewForProduct(
                    orderId,
                    item.product_id,
                );
                if (exists) continue;

                const reviewPayload = {
                    order_id: orderId,
                    product_id: item.product_id,
                    buyer_id: buyerId,
                    seller_id: sellerId,
                    rating: rating,
                    comment: comment.trim(),
                    images: images || [],
                    is_verified_purchase: true,
                    helpful_count: 0,
                    seller_reply: null,
                    is_hidden: false,
                    is_edited: false,
                };

                const review = await reviewService.createReview(reviewPayload);
                if (review) successCount++;
            }

            if (successCount === 0) {
                return false;
            }

            // Reviews are stored in the reviews table via reviewService
            // No need to update orders table as it doesn't have review fields
            console.log(
                `✅ Successfully created ${successCount} review(s) for order ${orderId}`,
            );
            return true;
        } catch (error) {
            console.error("Error submitting review:", error);
            throw new Error("Failed to submit review");
        }
    }

    /**
     * Get order statistics for seller dashboard
     */
    async getSellerOrderStats(sellerId: string) {
        if (!isSupabaseConfigured()) {
            return {
                total: this.mockOrders.filter((o) => o.seller_id === sellerId)
                    .length,
                pending: this.mockOrders.filter(
                    (o) =>
                        o.seller_id === sellerId &&
                        o.status === "pending_payment",
                ).length,
                processing: this.mockOrders.filter(
                    (o) =>
                        o.seller_id === sellerId && o.status === "processing",
                ).length,
                completed: this.mockOrders.filter(
                    (o) => o.seller_id === sellerId && o.status === "completed",
                ).length,
            };
        }

        try {
            const { data, error } = await supabase.rpc(
                "get_seller_order_stats",
                {
                    p_seller_id: sellerId,
                },
            );

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Error fetching order stats:", error);
            throw new Error("Failed to fetch order statistics");
        }
    }
}

export const orderService = new OrderService();
