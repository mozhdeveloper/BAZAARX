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
    PaymentStatus,
    ShipmentStatus,
    Database,
} from "@/types/database.types";
import { uploadReviewImages } from "@/utils/storage";
import { orderNotificationService } from "./orderNotificationService";
import { notificationService } from "./notificationService";

export type OrderInsert = Database["public"]["Tables"]["orders"]["Insert"];
export type OrderItemInsert =
    Database["public"]["Tables"]["order_items"]["Insert"];

export interface OrderTrackingSnapshot {
    order_id: string;
    order_number: string;
    buyer_id: string | null;
    payment_status: PaymentStatus;
    shipment_status: ShipmentStatus;
    created_at: string;
    tracking_number: string | null;
    shipped_at: string | null;
    delivered_at: string | null;
    recipient: {
        first_name: string | null;
        last_name: string | null;
        phone: string | null;
        email: string | null;
    } | null;
    address: {
        address_line_1: string | null;
        address_line_2: string | null;
        barangay: string | null;
        city: string | null;
        province: string | null;
        region: string | null;
        postal_code: string | null;
        landmark: string | null;
        delivery_instructions: string | null;
    } | null;
    shipment: {
        id: string;
        status: string;
        tracking_number: string | null;
        shipped_at: string | null;
        delivered_at: string | null;
        created_at: string;
    } | null;
}

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

const DEFAULT_LEGACY_STATUS = LEGACY_STATUS_MAP.pending_payment;

const parseLegacyShippingAddressFromNotes = (notes?: string | null) => {
    if (!notes || !notes.includes("SHIPPING_ADDRESS:")) {
        return null;
    }

    try {
        const jsonPart = notes.split("SHIPPING_ADDRESS:")[1]?.split("|")[0];
        if (!jsonPart) return null;
        return JSON.parse(jsonPart) as {
            fullName?: string;
            street?: string;
            city?: string;
            province?: string;
            postalCode?: string;
            phone?: string;
        };
    } catch {
        return null;
    }
};

const buildPersonName = (firstName?: string | null, lastName?: string | null) =>
    `${firstName || ""} ${lastName || ""}`.trim();

const mapNormalizedToLegacyStatus = (
    paymentStatus?: PaymentStatus | null,
    shipmentStatus?: ShipmentStatus | null,
): string => {
    if (shipmentStatus === "delivered" || shipmentStatus === "received") {
        return "delivered";
    }
    if (shipmentStatus === "shipped" || shipmentStatus === "out_for_delivery") {
        return "shipped";
    }
    if (shipmentStatus === "processing" || shipmentStatus === "ready_to_ship") {
        return "processing";
    }
    if (shipmentStatus === "returned" || shipmentStatus === "failed_to_deliver") {
        return "cancelled";
    }
    if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
        return "cancelled";
    }
    return "pending_payment";
};

const getLatestShipment = (shipments: any[]) => {
    if (!Array.isArray(shipments) || shipments.length === 0) return null;

    const sorted = [...shipments].sort((a, b) => {
        const aDate = new Date(
            a.delivered_at || a.shipped_at || a.created_at || 0,
        ).getTime();
        const bDate = new Date(
            b.delivered_at || b.shipped_at || b.created_at || 0,
        ).getTime();
        return bDate - aDate;
    });

    return sorted[0];
};

const getLatestCancellation = (cancellations: any[]) => {
    if (!Array.isArray(cancellations) || cancellations.length === 0) return null;

    const sorted = [...cancellations].sort((a, b) => {
        const aDate = new Date(a.cancelled_at || a.created_at || 0).getTime();
        const bDate = new Date(b.cancelled_at || b.created_at || 0).getTime();
        return bDate - aDate;
    });

    return sorted[0];
};

const isHttpUrl = (value: unknown): value is string =>
    typeof value === "string" && /^https?:\/\//i.test(value.trim());

const isBrowserFile = (value: unknown): value is File =>
    typeof File !== "undefined" && value instanceof File;

const getRelationRow = <T>(value: T | T[] | null | undefined): T | null => {
    if (Array.isArray(value)) {
        return value[0] || null;
    }

    return value || null;
};

const asNonEmptyString = (value: unknown): string | null => {
    if (typeof value !== "string") {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const compactRecord = (record: Record<string, unknown>): Record<string, unknown> => {
    return Object.fromEntries(
        Object.entries(record).filter(([, value]) => {
            if (value === null || value === undefined) {
                return false;
            }

            if (typeof value === "string" && value.trim().length === 0) {
                return false;
            }

            return true;
        }),
    );
};

const buildVariantSnapshot = (orderItem: any): Record<string, unknown> | null => {
    const variant = getRelationRow(orderItem?.variant);
    const product = getRelationRow(orderItem?.product);

    const option1Value =
        asNonEmptyString(variant?.option_1_value) ||
        asNonEmptyString(variant?.size) ||
        asNonEmptyString(orderItem?.personalized_options?.variantLabel1);
    const option2Value =
        asNonEmptyString(variant?.option_2_value) ||
        asNonEmptyString(variant?.color) ||
        asNonEmptyString(orderItem?.personalized_options?.variantLabel2);
    const option1Label = asNonEmptyString(product?.variant_label_1);
    const option2Label = asNonEmptyString(product?.variant_label_2);
    const variantName = asNonEmptyString(variant?.variant_name);

    const displayParts: string[] = [];
    if (variantName) {
        displayParts.push(variantName);
    }
    if (option1Value) {
        displayParts.push(
            option1Label ? `${option1Label}: ${option1Value}` : option1Value,
        );
    }
    if (option2Value) {
        displayParts.push(
            option2Label ? `${option2Label}: ${option2Value}` : option2Value,
        );
    }

    const snapshot = compactRecord({
        order_item_id: orderItem?.id || null,
        product_id: orderItem?.product_id || null,
        product_name:
            asNonEmptyString(orderItem?.product_name) ||
            asNonEmptyString(product?.name),
        variant_id: orderItem?.variant_id || variant?.id || null,
        variant_name: variantName,
        sku: asNonEmptyString(variant?.sku),
        option_1_label: option1Label,
        option_1_value: option1Value,
        option_2_label: option2Label,
        option_2_value: option2Value,
        display: displayParts.length > 0 ? displayParts.join(" / ") : null,
    });

    return Object.keys(snapshot).length > 0 ? snapshot : null;
};

const normalizeReviewRows = (reviews: any[]) => {
    if (!Array.isArray(reviews)) {
        return [];
    }

    return reviews
        .filter((review) => Boolean(review) && review.is_hidden !== true)
        .map((review) => ({
            ...review,
            review_images: Array.isArray(review.review_images)
                ? [...review.review_images].sort(
                      (a: any, b: any) =>
                          Number(a?.sort_order || 0) -
                          Number(b?.sort_order || 0),
                  )
                : [],
        }))
        .sort((a: any, b: any) => {
            const aDate = new Date(
                a.created_at || a.updated_at || 0,
            ).getTime();
            const bDate = new Date(
                b.created_at || b.updated_at || 0,
            ).getTime();
            return bDate - aDate;
        });
};

const mapNormalizedToBuyerUiStatus = (
    paymentStatus?: PaymentStatus | null,
    shipmentStatus?: ShipmentStatus | null,
    hasCancellationRecord?: boolean,
    isReviewed?: boolean,
):
    | "pending"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "returned"
    | "reviewed" => {
    if (isReviewed) {
        return "reviewed";
    }

    if (shipmentStatus === "delivered" || shipmentStatus === "received") {
        return "delivered";
    }

    if (shipmentStatus === "shipped" || shipmentStatus === "out_for_delivery") {
        return "shipped";
    }

    if (shipmentStatus === "processing" || shipmentStatus === "ready_to_ship") {
        return "confirmed";
    }

    if (shipmentStatus === "failed_to_deliver") {
        return "cancelled";
    }

    if (shipmentStatus === "returned") {
        return hasCancellationRecord ? "cancelled" : "returned";
    }

    if (paymentStatus === "refunded" || paymentStatus === "partially_refunded") {
        return hasCancellationRecord ? "cancelled" : "returned";
    }

    return "pending";
};

export class OrderService {
    private mockOrders: Order[] = [];

    private async resolveOrderSellerId(orderId: string): Promise<string | undefined> {
        try {
            const { data: orderItems } = await supabase
                .from("order_items")
                .select(
                    `
                    product:products!order_items_product_id_fkey (
                        seller_id
                    )
                `,
                )
                .eq("order_id", orderId);

            const firstItem: any = (orderItems || [])[0];
            if (!firstItem) return undefined;

            const product = Array.isArray(firstItem.product)
                ? firstItem.product[0]
                : firstItem.product;

            return product?.seller_id;
        } catch (error) {
            console.warn("Failed to resolve seller ID from order:", error);
            return undefined;
        }
    }

    private getOrderNumberLabel(orderNumber: string | null | undefined, orderId: string) {
        return orderNumber || orderId.substring(0, 8);
    }

    private buildBuyerStatusMessage(
        status: string,
        orderNumberLabel: string,
        trackingNumber?: string,
    ) {
        const statusMessages: Record<string, string> = {
            confirmed: `Your order #${orderNumberLabel} has been confirmed by the seller.`,
            processing: `Your order #${orderNumberLabel} is now being prepared.`,
            shipped: `Your order #${orderNumberLabel} has been shipped!`,
            delivered: `Your order #${orderNumberLabel} has been delivered!`,
            cancelled: `Your order #${orderNumberLabel} has been cancelled.`,
        };

        if (status === "shipped" && trackingNumber) {
            return `Your order #${orderNumberLabel} has been shipped! Tracking: ${trackingNumber}`;
        }

        return (
            statusMessages[status] ||
            `Your order #${orderNumberLabel} status has been updated to ${status}.`
        );
    }

    private dispatchStatusNotifications(params: {
        orderId: string;
        status: string;
        sellerId: string;
        buyerId: string;
        orderNumber: string | null | undefined;
        trackingNumber?: string;
    }) {
        const { orderId, status, sellerId, buyerId, orderNumber, trackingNumber } =
            params;
        const orderNumberLabel = this.getOrderNumberLabel(orderNumber, orderId);
        const message = this.buildBuyerStatusMessage(
            status,
            orderNumberLabel,
            trackingNumber,
        );

        // Notifications are non-blocking to keep order mutations responsive.
        void (async () => {
            await orderNotificationService
                .sendStatusUpdateNotification(
                    orderId,
                    status,
                    sellerId,
                    buyerId,
                    trackingNumber,
                )
                .catch((error) => {
                    console.error("Failed to send order chat notification:", error);
                });

            await notificationService
                .notifyBuyerOrderStatus({
                    buyerId,
                    orderId,
                    orderNumber: orderNumberLabel,
                    status,
                    message,
                })
                .catch((error) => {
                    console.error("Failed to send buyer notification:", error);
                });
        })();
    }

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
        const finalBuyerId = buyerId;

        // Create order data for new schema
        const orderData = {
            id: orderId,
            order_number: orderNumber,
            buyer_id: finalBuyerId,
            order_type: "OFFLINE" as const,
            pos_note:
                note ||
                (buyerEmail ? `POS Sale - ${buyerEmail}` : "POS Walk-in Sale"),
            recipient_id: null,
            address_id: null,
            payment_status: "paid" as PaymentStatus,
            shipment_status: "delivered" as ShipmentStatus,
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
                status: "delivered",
                seller_id: sellerId,
                subtotal: total,
                total_amount: total,
            } as unknown as Order;
            this.mockOrders.push(mockOrder);
            return { orderId, orderNumber, buyerLinked };
        }

        try {
            const insertData = finalBuyerId
                ? orderData
                : { ...orderData, buyer_id: undefined };

            let { error: orderError } = await supabase
                .from("orders")
                .insert(insertData);

            if (
                orderError?.code === "23502" &&
                orderError.message?.includes("buyer_id")
            ) {
                const { error: retryError } = await supabase
                    .from("orders")
                    .insert({
                        ...orderData,
                        buyer_id: null,
                        notes: `POS Walk-in Sale${buyerEmail ? ` - Customer email: ${buyerEmail}` : ""}`,
                    });

                if (retryError) {
                    return { orderId, orderNumber, buyerLinked: false };
                }
                orderError = null;
            }

            if (orderError) throw orderError;

            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(orderItems);

            if (itemsError) {
                await supabase.from("orders").delete().eq("id", orderId);
                throw itemsError;
            }

            for (const item of items) {
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

                    await supabase
                        .from("product_variants")
                        .update({ stock: newStock })
                        .eq("id", variant.id);
                }
            }

            if (buyerLinked && finalBuyerId) {
                const coinsEarned = Math.floor(total / 100);
                if (coinsEarned > 0) {
                    const { data: buyerData } = await supabase
                        .from("buyers")
                        .select("bazcoins")
                        .eq("id", finalBuyerId)
                        .single();

                    const currentCoins = buyerData?.bazcoins || 0;
                    await supabase
                        .from("buyers")
                        .update({ bazcoins: currentCoins + coinsEarned })
                        .eq("id", finalBuyerId);
                }
            }

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
            const { data: insertedOrder, error: orderError } = await supabase
                .from("orders")
                .insert([orderData])
                .select()
                .single();

            if (orderError) throw orderError;

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
     * Get orders for a buyer with optional date filtering
     */
    async getBuyerOrders(
        buyerId: string, 
        startDate?: Date | null, 
        endDate?: Date | null
    ): Promise<Order[]> {
        if (!isSupabaseConfigured()) {
            // Updated mock logic to handle date filters
            return this.mockOrders
                .filter((o) => {
                    const isBuyer = o.buyer_id === buyerId;
                    if (!startDate || !endDate) return isBuyer;
                    const created = new Date(o.created_at);
                    return isBuyer && created >= startDate && created <= endDate;
                })
                .map((order) => ({
                    ...order,
                    status: mapNormalizedToBuyerUiStatus(
                        order.payment_status,
                        order.shipment_status,
                        false,
                        Boolean((order as any).is_reviewed),
                    ),
                }));
        }

        try {
            // Step 1: Initialize the query
            let query = supabase
                .from("orders")
                .select(
                    `
                    *,
                    order_items (
                        id,
                        product_id,
                        product_name,
                        primary_image_url,
                        quantity,
                        price,
                        price_discount,
                        shipping_price,
                        shipping_discount,
                        variant_id,
                        personalized_options,
                        variant:product_variants!order_items_variant_id_fkey (
                            id,
                            variant_name,
                            size,
                            color,
                            price,
                            thumbnail_url
                        ),
                        product:products!order_items_product_id_fkey (
                            seller_id,
                            seller:sellers!products_seller_id_fkey (
                                id,
                                store_name
                            )
                        )
                    ),
                    recipient:order_recipients!orders_recipient_id_fkey (
                        first_name,
                        last_name,
                        phone,
                        email
                    ),
                    shipping_address:shipping_addresses!orders_address_id_fkey (
                        address_line_1,
                        address_line_2,
                        barangay,
                        city,
                        province,
                        region,
                        postal_code,
                        landmark,
                        delivery_instructions
                    ),
                    shipments:order_shipments (
                        id,
                        status,
                        tracking_number,
                        shipped_at,
                        delivered_at,
                        created_at
                    ),
                    cancellations:order_cancellations (
                        id,
                        reason,
                        cancelled_at,
                        cancelled_by,
                        created_at
                    ),
                    reviews (
                        id,
                        product_id,
                        buyer_id,
                        order_id,
                        order_item_id,
                        variant_snapshot,
                        rating,
                        comment,
                        is_hidden,
                        created_at,
                        updated_at,
                        review_images (
                            id,
                            image_url,
                            sort_order,
                            uploaded_at
                        )
                    )
                `,
                )
                .eq("buyer_id", buyerId);

            // Step 2: Apply dynamic date filters
            if (startDate) {
                query = query.gte("created_at", startDate.toISOString());
            }
            if (endDate) {
                query = query.lte("created_at", endDate.toISOString());
            }

            // Step 3: Execute query with sorting
            const { data, error } = await query.order("created_at", { ascending: false });

            if (error) throw error;

            // Step 4: Map results (remains the same)
            return (data || []).map((order: any) => {
                const fallbackAddress = parseLegacyShippingAddressFromNotes(order.notes);
                const recipient = order.recipient || {};
                const shippingAddr = order.shipping_address || {};
                const latestShipment = getLatestShipment(order.shipments || []);
                const latestCancellation = getLatestCancellation(
                    order.cancellations || [],
                );
                const orderReviews = normalizeReviewRows(order.reviews || []);
                const latestReview = orderReviews[0];
                const latestReviewImages = Array.isArray(
                    latestReview?.review_images,
                )
                    ? latestReview.review_images
                          .map((image: any) => image?.image_url)
                          .filter(isHttpUrl)
                    : [];

                const normalizedItems = (order.order_items || []).map((item: any) => ({
                    ...item,
                    seller_id: item?.product?.seller_id || null,
                    seller_name: item?.product?.seller?.store_name || "Unknown Store",
                }));

                const firstSellerItem = normalizedItems.find((item: any) => item.seller_id);

                const totalAmount = normalizedItems.reduce((sum: number, item: any) => {
                    const itemPrice = (item.price || 0) - (item.price_discount || 0);
                    const shippingPrice = (item.shipping_price || 0) - (item.shipping_discount || 0);
                    return sum + itemPrice * (item.quantity || 0) + shippingPrice;
                }, 0);

                const buyerName = buildPersonName(recipient?.first_name, recipient?.last_name) ||
                    fallbackAddress?.fullName || "Customer";

                const fullAddress = [
                    shippingAddr?.address_line_1 || fallbackAddress?.street,
                    shippingAddr?.address_line_2,
                    shippingAddr?.barangay,
                    shippingAddr?.city || fallbackAddress?.city,
                    shippingAddr?.province || fallbackAddress?.province,
                    shippingAddr?.postal_code || fallbackAddress?.postalCode,
                ].filter(Boolean).join(", ");

                const hasCancellationRecord = Boolean(latestCancellation);
                const hasReviews = orderReviews.length > 0;

                return {
                    ...order,
                    order_items: normalizedItems,
                    shipments: order.shipments || [],
                    cancellations: order.cancellations || [],
                    reviews: orderReviews,
                    seller_id: firstSellerItem?.seller_id || null,
                    store_name: firstSellerItem?.seller_name || "Unknown Store",
                    total_amount: totalAmount,
                    status: mapNormalizedToBuyerUiStatus(
                        order.payment_status,
                        order.shipment_status,
                        hasCancellationRecord,
                        hasReviews,
                    ),
                    is_reviewed: hasReviews,
                    rating:
                        typeof latestReview?.rating === "number"
                            ? latestReview.rating
                            : null,
                    review_comment: latestReview?.comment || null,
                    review_images: latestReviewImages,
                    review_date: latestReview?.created_at || null,
                    buyer_name: buyerName,
                    buyer_phone: recipient?.phone || fallbackAddress?.phone || "",
                    buyer_email: recipient?.email || "",
                    tracking_number: latestShipment?.tracking_number || null,
                    shipped_at: latestShipment?.shipped_at || null,
                    delivered_at: latestShipment?.delivered_at || null,
                    cancellation_reason: latestCancellation?.reason || null,
                    cancelled_at: latestCancellation?.cancelled_at || latestCancellation?.created_at || null,
                    shipping_address: fullAddress || "No address provided",
                    shipping_street: shippingAddr?.address_line_1 || fallbackAddress?.street || "",
                    shipping_city: shippingAddr?.city || fallbackAddress?.city || "",
                    shipping_province: shippingAddr?.province || fallbackAddress?.province || "",
                    shipping_postal_code: shippingAddr?.postal_code || fallbackAddress?.postalCode || "",
                    shipping_barangay: shippingAddr?.barangay || "",
                    shipping_region: shippingAddr?.region || "",
                    shipping_landmark: shippingAddr?.landmark || "",
                    shipping_instructions: shippingAddr?.delivery_instructions || "",
                    shipping_country: "Philippines",
                } as Order;
            });
        } catch (error) {
            console.error("Error fetching buyer orders:", error);
            throw new Error("Failed to fetch orders");
        }
    }

    /**
     * Get orders for a seller
     * Since orders table has NO seller_id, we get orders through order_items → products → seller_id
     */
    async getSellerOrders(sellerId: string, startDate?: Date | null, endDate?: Date | null): Promise<Order[]> {
        if (!isSupabaseConfigured()) {
            return this.mockOrders.filter((o) => {
                const isSeller = o.seller_id === sellerId;
                if (!startDate || !endDate) return isSeller;
                const created = new Date(o.created_at);
                return isSeller && created >= startDate && created <= endDate;
            });
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

            // Step 3: Get the actual orders with normalized joins and date filtering
            let query = supabase
                .from("orders")
                .select(`
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
                        primary_image_url,
                        variant_id,
                        personalized_options,
                        variant:product_variants!order_items_variant_id_fkey (
                            id,
                            variant_name,
                            size,
                            color,
                            thumbnail_url,
                            price
                        )
                    ),
                    recipient:order_recipients!orders_recipient_id_fkey (
                        id,
                        first_name,
                        last_name,
                        phone,
                        email
                    ),
                    shipping_address:shipping_addresses!orders_address_id_fkey (
                        address_line_1,
                        address_line_2,
                        barangay,
                        city,
                        province,
                        region,
                        postal_code,
                        landmark,
                        delivery_instructions
                    ),
                    shipments:order_shipments (
                        id,
                        status,
                        tracking_number,
                        shipped_at,
                        delivered_at,
                        created_at
                    ),
                    reviews (
                        id,
                        product_id,
                        buyer_id,
                        order_id,
                        order_item_id,
                        variant_snapshot,
                        rating,
                        comment,
                        is_hidden,
                        created_at,
                        updated_at,
                        product:products!reviews_product_id_fkey (
                            seller_id
                        ),
                        review_images (
                            id,
                            image_url,
                            sort_order,
                            uploaded_at
                        )
                    )
                `)
                .in("id", orderIds);

            // Apply date filters if provided
            if (startDate) {
                query = query.gte("created_at", startDate.toISOString());
            }
            if (endDate) {
                query = query.lte("created_at", endDate.toISOString());
            }

            const { data: orders, error: ordersError } = await query.order("created_at", { ascending: false });

            if (ordersError) throw ordersError;

            // Map to Order format with computed totals
            return (orders || []).map((order) => {
                const allItems = order.order_items || [];
                const sellerItems = allItems.filter((item: any) =>
                    productIds.includes(item.product_id),
                );
                const latestShipment = getLatestShipment(order.shipments || []);
                const orderReviews = normalizeReviewRows(order.reviews || []);
                const sellerReviews = orderReviews.filter((review: any) => {
                    const productRef = Array.isArray(review.product)
                        ? review.product[0]
                        : review.product;

                    if (productRef?.seller_id) {
                        return productRef.seller_id === sellerId;
                    }

                    return (
                        typeof review.product_id === "string" &&
                        productIds.includes(review.product_id)
                    );
                });
                const latestReview = sellerReviews[0];
                const latestReviewImages = Array.isArray(
                    latestReview?.review_images,
                )
                    ? latestReview.review_images
                          .map((image: any) => image?.image_url)
                          .filter(isHttpUrl)
                    : [];

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
                const fallbackAddress = parseLegacyShippingAddressFromNotes(
                    order.notes,
                );

                const fullAddress = [
                    shippingAddr?.address_line_1 || fallbackAddress?.street,
                    shippingAddr?.address_line_2,
                    shippingAddr?.barangay,
                    shippingAddr?.city || fallbackAddress?.city,
                    shippingAddr?.province || fallbackAddress?.province,
                    shippingAddr?.postal_code || fallbackAddress?.postalCode,
                ]
                    .filter(Boolean)
                    .join(", ");

                const legacyStatus = mapNormalizedToLegacyStatus(
                    order.payment_status,
                    order.shipment_status,
                );
                const buyerName =
                    buildPersonName(recipient?.first_name, recipient?.last_name) ||
                    fallbackAddress?.fullName ||
                    "Customer";

                return {
                    ...order,
                    order_items: sellerItems, // Only include this seller's items
                    shipments: order.shipments || [],
                    reviews: sellerReviews,
                    seller_id: sellerId, // Add for compatibility
                    total_amount: totalAmount,
                    status: legacyStatus,
                    is_reviewed: sellerReviews.length > 0,
                    rating:
                        typeof latestReview?.rating === "number"
                            ? latestReview.rating
                            : null,
                    review_comment: latestReview?.comment || null,
                    review_images: latestReviewImages,
                    review_date: latestReview?.created_at || null,
                    buyer_name: buyerName,
                    buyer_phone: recipient?.phone || fallbackAddress?.phone || "",
                    buyer_email: recipient?.email || "",
                    tracking_number: latestShipment?.tracking_number || null,
                    shipped_at: latestShipment?.shipped_at || null,
                    delivered_at: latestShipment?.delivered_at || null,
                    // Add shipping address fields for compatibility
                    shipping_address: fullAddress || "No address provided",
                    shipping_street:
                        shippingAddr?.address_line_1 || fallbackAddress?.street || "",
                    shipping_city:
                        shippingAddr?.city || fallbackAddress?.city || "",
                    shipping_province:
                        shippingAddr?.province || fallbackAddress?.province || "",
                    shipping_postal_code:
                        shippingAddr?.postal_code || fallbackAddress?.postalCode || "",
                    shipping_barangay: shippingAddr?.barangay || "",
                    shipping_region: shippingAddr?.region || "",
                    shipping_landmark: shippingAddr?.landmark || "",
                    shipping_instructions:
                        shippingAddr?.delivery_instructions || "",
                    shipping_country: "Philippines",
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
     * Get buyer-facing order tracking snapshot from normalized tables
     */
    async getOrderTrackingSnapshot(
        orderIdOrNumber: string,
        buyerId?: string,
    ): Promise<OrderTrackingSnapshot | null> {
        if (!isSupabaseConfigured()) {
            const mockOrder = this.mockOrders.find(
                (o) =>
                    o.id === orderIdOrNumber || o.order_number === orderIdOrNumber,
            );

            if (!mockOrder) return null;
            if (buyerId && mockOrder.buyer_id !== buyerId) return null;

            const normalized =
                LEGACY_STATUS_MAP[mockOrder.status || "pending_payment"] ||
                DEFAULT_LEGACY_STATUS;

            return {
                order_id: mockOrder.id,
                order_number: mockOrder.order_number || mockOrder.id,
                buyer_id: mockOrder.buyer_id || null,
                payment_status:
                    (mockOrder.payment_status as PaymentStatus) ||
                    normalized.payment_status,
                shipment_status:
                    (mockOrder.shipment_status as ShipmentStatus) ||
                    normalized.shipment_status,
                created_at: mockOrder.created_at || new Date().toISOString(),
                tracking_number: mockOrder.tracking_number || null,
                shipped_at: null,
                delivered_at: null,
                recipient: null,
                address: null,
                shipment: null,
            };
        }

        try {
            const isUuid =
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                    orderIdOrNumber,
                );

            let query = supabase
                .from("orders")
                .select(
                    `
                    id,
                    order_number,
                    buyer_id,
                    payment_status,
                    shipment_status,
                    created_at,
                    recipient:order_recipients!orders_recipient_id_fkey (
                        first_name,
                        last_name,
                        phone,
                        email
                    ),
                    address:shipping_addresses!orders_address_id_fkey (
                        address_line_1,
                        address_line_2,
                        barangay,
                        city,
                        province,
                        region,
                        postal_code,
                        landmark,
                        delivery_instructions
                    ),
                    shipments:order_shipments (
                        id,
                        status,
                        tracking_number,
                        shipped_at,
                        delivered_at,
                        created_at
                    )
                `,
                )
                .eq(isUuid ? "id" : "order_number", orderIdOrNumber)
            if (buyerId) {
                query = query.eq("buyer_id", buyerId);
            }

            const { data, error } = await query.maybeSingle();

            if (error) throw error;
            if (!data) return null;

            const latestShipment = getLatestShipment((data as any).shipments || []);

            return {
                order_id: data.id,
                order_number: data.order_number,
                buyer_id: data.buyer_id || null,
                payment_status: data.payment_status,
                shipment_status: data.shipment_status,
                created_at: data.created_at,
                tracking_number: latestShipment?.tracking_number || null,
                shipped_at: latestShipment?.shipped_at || null,
                delivered_at: latestShipment?.delivered_at || null,
                recipient: (data as any).recipient || null,
                address: (data as any).address || null,
                shipment: latestShipment
                    ? {
                          id: latestShipment.id,
                          status: latestShipment.status,
                          tracking_number: latestShipment.tracking_number,
                          shipped_at: latestShipment.shipped_at,
                          delivered_at: latestShipment.delivered_at,
                          created_at: latestShipment.created_at,
                      }
                    : null,
            };
        } catch (error) {
            console.error("Error fetching order tracking snapshot:", error);
            throw new Error("Failed to fetch order tracking details");
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
                if (details.buyer_name)
                    (order as any).buyer_name = details.buyer_name;

                order.updated_at = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            const updateData: any = {};
            if (details.notes !== undefined) updateData.notes = details.notes;

            if (Object.keys(updateData).length > 0) {
                const { error } = await supabase
                    .from("orders")
                    .update(updateData)
                    .eq("id", orderId);

                if (error) throw error;
            }

            if (details.buyer_name || details.buyer_email) {
                const { data: order, error: fetchError } = await supabase
                    .from("orders")
                    .select("recipient_id")
                    .eq("id", orderId)
                    .single();

                if (fetchError) throw fetchError;

                if (order?.recipient_id) {
                    const recipientUpdate: any = {};
                    if (details.buyer_name) {
                        const parts = details.buyer_name.trim().split(" ");
                        const lastName = parts.length > 1 ? parts.pop() : "";
                        const firstName = parts.join(" ");
                        recipientUpdate.first_name =
                            firstName || details.buyer_name;
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

            return true;
        } catch (error) {
            console.error("Error updating order details:", error);
            throw new Error("Failed to update order details");
        }
    }

    /**
     * Update order status
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
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select("id, buyer_id, order_number")
                .eq("id", orderId)
                .single();

            if (fetchError || !order) throw new Error("Order not found");

            const newStatuses = LEGACY_STATUS_MAP[status] || DEFAULT_LEGACY_STATUS;

            const { error: orderError } = await supabase
                .from("orders")
                .update({
                    payment_status: newStatuses.payment_status,
                    shipment_status: newStatuses.shipment_status,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);

            if (orderError) throw orderError;

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

            const sellerId =
                userRole === "seller" && userId
                    ? userId
                    : await this.resolveOrderSellerId(orderId);

            if (userRole === "seller" && order.buyer_id && sellerId) {
                await orderNotificationService.sendStatusUpdateNotification(
                    orderId,
                    status,
                    sellerId,
                    order.buyer_id,
                );
                
                const statusMessages: Record<string, string> = {
                    confirmed: `Your order #${order.order_number} has been confirmed by the seller.`,
                    processing: `Your order #${order.order_number} is now being prepared.`,
                    shipped: `Your order #${order.order_number} has been shipped!`,
                    delivered: `Your order #${order.order_number} has been delivered!`,
                    cancelled: `Your order #${order.order_number} has been cancelled.`,
                };

                const message =
                    statusMessages[status] ||
                    `Your order status has been updated to ${status}.`;

                await notificationService
                    .notifyBuyerOrderStatus({
                        buyerId: order.buyer_id,
                        orderId: orderId,
                        orderNumber: order.order_number,
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
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select(
                    `
          id,
          buyer_id,
          order_number,
          shipment_status,
          order_items (
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

            const hasSellerProduct = order.order_items?.some(
                (item: any) => item.product?.seller_id === sellerId,
            );

            if (!hasSellerProduct) {
                throw new Error(
                    "Access denied: You do not own products in this order",
                );
            }

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

            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    shipment_status: "shipped",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);

            if (updateError) throw updateError;

            // Update shipment record - non-blocking, errors won't stop the process
            const updateShipment = async () => {
                try {
                    const { data: existingShipments } = await supabase
                        .from("order_shipments")
                        .select("id")
                        .eq("order_id", orderId)
                        .order("created_at", { ascending: false })
                        .limit(1);

                    const existingShipment = existingShipments?.[0];

                    if (existingShipment) {
                        await supabase
                            .from("order_shipments")
                            .update({
                                status: "shipped",
                                tracking_number: trackingNumber,
                                shipped_at: new Date().toISOString(),
                            })
                            .eq("id", existingShipment.id);
                    } else {
                        await supabase.from("order_shipments").insert({
                            order_id: orderId,
                            status: "shipped",
                            tracking_number: trackingNumber,
                            shipped_at: new Date().toISOString(),
                        });
                    }
                } catch (error) {
                    console.warn("[OrderService] Non-critical: Failed to update order_shipments:", error);
                    // Don't throw - order status is already updated
                }
            };

            // Execute shipment update in parallel with other operations
            updateShipment();

            await supabase.from("order_status_history").insert({
                order_id: orderId,
                status: "shipped",
                note: `Order shipped with tracking number: ${trackingNumber}`,
                changed_by: sellerId,
                changed_by_role: "seller",
                metadata: { tracking_number: trackingNumber },
            });

            // Send notifications asynchronously (fire-and-forget for performance)
            if (order.buyer_id) {
                // Don't await - send notifications in background
                Promise.allSettled([
                    orderNotificationService.sendStatusUpdateNotification(
                        orderId,
                        "shipped",
                        sellerId,
                        order.buyer_id,
                        trackingNumber,
                    ),
                    notificationService.notifyBuyerOrderStatus({
                        buyerId: order.buyer_id,
                        orderId: orderId,
                        orderNumber: order.order_number,
                        status: "shipped",
                        message: `Your order #${order.order_number} has been shipped! Tracking: ${trackingNumber}`,
                    }),
                ]).catch((err) => {
                    console.error("Failed to send shipped notifications:", err);
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
                if (order.status !== "shipped") return false;
                order.status = "delivered";
                order.completed_at = new Date().toISOString();
                order.updated_at = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select(
                    `
                    id,
                    buyer_id,
                    order_number,
                    shipment_status,
                    order_items (
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

            const { error: updateError } = await supabase
                .from("orders")
                .update({
                    shipment_status: "delivered",
                    updated_at: new Date().toISOString(),
                })
                .eq("id", orderId);

            if (updateError) throw updateError;

            // Update shipment record - non-blocking, errors won't stop the process
            const updateShipment = async () => {
                try {
                    const { data: existingShipments } = await supabase
                        .from("order_shipments")
                        .select("id")
                        .eq("order_id", orderId)
                        .order("created_at", { ascending: false })
                        .limit(1);

                    if (existingShipments && existingShipments.length > 0) {
                        await supabase
                            .from("order_shipments")
                            .update({
                                status: "delivered",
                                delivered_at: new Date().toISOString(),
                            })
                            .eq("id", existingShipments[0].id);
                    }
                } catch (error) {
                    console.warn("[OrderService] Non-critical: Failed to update order_shipments:", error);
                    // Don't throw - order status is already updated
                }
            };

            // Execute shipment update in parallel
            updateShipment();

            await supabase.from("order_status_history").insert({
                order_id: orderId,
                status: "delivered",
                note: "Order delivered and completed",
                changed_by: sellerId,
                changed_by_role: "seller",
                metadata: { delivered_at: new Date().toISOString() },
            });

            // Send notifications asynchronously (fire-and-forget for performance)
            if (order.buyer_id) {
                // Don't await - send notifications in background
                Promise.allSettled([
                    orderNotificationService.sendStatusUpdateNotification(
                        orderId,
                        "delivered",
                        sellerId,
                        order.buyer_id,
                    ),
                    notificationService.notifyBuyerOrderStatus({
                        buyerId: order.buyer_id,
                        orderId: orderId,
                        orderNumber: (order as any).order_number,
                        status: "delivered",
                        message: `Your order #${(order as any).order_number} has been delivered! Enjoy your purchase!`,
                    }),
                ]).catch((err) => {
                    console.error("Failed to send delivered notifications:", err);
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
    async cancelOrder(
        orderId: string,
        reason?: string,
        cancelledBy?: string,
    ): Promise<boolean> {
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
            const nowIso = new Date().toISOString();
            const normalizedReason = reason?.trim() || null;

            const { data: existingOrder, error: fetchError } = await supabase
                .from("orders")
                .select("id, payment_status")
                .eq("id", orderId)
                .single();

            if (fetchError || !existingOrder) {
                throw new Error("Order not found");
            }

            const nextPaymentStatus: PaymentStatus =
                existingOrder.payment_status === "paid" ||
                existingOrder.payment_status === "partially_refunded"
                    ? "refunded"
                    : "pending_payment";

            const { error: orderUpdateError } = await supabase
                .from("orders")
                .update({
                    payment_status: nextPaymentStatus,
                    shipment_status: "returned",
                    notes: normalizedReason,
                    updated_at: nowIso,
                })
                .eq("id", orderId);

            if (orderUpdateError) throw orderUpdateError;

            const { error: cancellationError } = await supabase
                .from("order_cancellations")
                .insert({
                    order_id: orderId,
                    reason: normalizedReason,
                    cancelled_at: nowIso,
                    cancelled_by: cancelledBy || null,
                });

            if (cancellationError) throw cancellationError;

            await supabase.from("order_status_history").insert({
                order_id: orderId,
                status: "cancelled",
                note: normalizedReason || "Order cancelled",
                changed_by: cancelledBy || null,
                changed_by_role: cancelledBy ? "buyer" : null,
                metadata: {
                    cancelled_at: nowIso,
                    payment_status: nextPaymentStatus,
                    shipment_status: "returned",
                },
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
        imageFiles?: File[],
    ): Promise<boolean> {
        if (!orderId || !buyerId) {
            throw new Error("Order ID and Buyer ID are required");
        }

        if (rating < 1 || rating > 5) {
            throw new Error("Rating must be between 1 and 5");
        }

        const normalizedComment = comment?.trim();

        if (!normalizedComment) {
            throw new Error("Review comment is required");
        }

        const sanitizedImageUrls = (images || [])
            .map((image) => image?.trim())
            .filter(isHttpUrl);
        const validImageFiles = Array.isArray(imageFiles)
            ? imageFiles.filter((file): file is File => isBrowserFile(file))
            : [];

        if (!isSupabaseConfigured()) {
            const order = this.mockOrders.find(
                (o) => o.id === orderId && o.buyer_id === buyerId,
            );
            if (order) {
                const firstOrderItem = (order as any).order_items?.[0] || null;
                const mockUploadedImageUrls = validImageFiles.map(
                    (file) =>
                        `https://via.placeholder.com/300?text=${encodeURIComponent(
                            file.name,
                        )}`,
                );
                const resolvedImageUrls = Array.from(
                    new Set([...sanitizedImageUrls, ...mockUploadedImageUrls]),
                );

                const mockReview = {
                    id: crypto.randomUUID(),
                    order_id: orderId,
                    order_item_id: firstOrderItem?.id || null,
                    product_id: firstOrderItem?.product_id || null,
                    buyer_id: buyerId,
                    rating,
                    comment: normalizedComment,
                    variant_snapshot: buildVariantSnapshot(firstOrderItem),
                    created_at: new Date().toISOString(),
                    review_images: resolvedImageUrls.map((imageUrl, index) => ({
                        id: crypto.randomUUID(),
                        image_url: imageUrl,
                        sort_order: index,
                    })),
                };

                const existingReviews = Array.isArray((order as any).reviews)
                    ? (order as any).reviews
                    : [];

                (order as any).reviews = [mockReview, ...existingReviews];
                order.is_reviewed = true;
                order.rating = rating;
                order.review_comment = normalizedComment;
                order.review_images = resolvedImageUrls;
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
          id,
          buyer_id,
          shipment_status,
          order_items (
            id,
            product_id,
            product_name,
            variant_id,
            personalized_options,
            product:products!order_items_product_id_fkey (
              id,
              name,
              variant_label_1,
              variant_label_2
            ),
            variant:product_variants!order_items_variant_id_fkey (
              id,
              sku,
              variant_name,
              size,
              color,
              option_1_value,
              option_2_value,
              thumbnail_url
            )
          )
        `,
                )
                .eq("id", orderId)
                .eq("buyer_id", buyerId)
                .maybeSingle();

            if (orderError || !order) {
                throw new Error("Order not found or access denied");
            }

            if (
                order.shipment_status !== "delivered" &&
                order.shipment_status !== "received"
            ) {
                throw new Error(
                    `Cannot review order with status: ${order.shipment_status}`,
                );
            }

            const orderItems = Array.isArray(order.order_items)
                ? order.order_items
                : [];

            const reviewableOrderItems = orderItems.filter(
                (item: any) =>
                    typeof item?.id === "string" &&
                    item.id.length > 0 &&
                    typeof item?.product_id === "string" &&
                    item.product_id.length > 0,
            );

            if (reviewableOrderItems.length === 0) {
                throw new Error("No reviewable products found for this order");
            }

            const { data: existingReviews, error: existingReviewsError } =
                await supabase
                    .from("reviews")
                    .select("id, product_id, order_item_id")
                    .eq("order_id", orderId)
                    .eq("buyer_id", buyerId);

            if (existingReviewsError) {
                throw existingReviewsError;
            }

            const reviewedOrderItemIds = new Set(
                (existingReviews || [])
                    .map((review) => review.order_item_id)
                    .filter(
                        (orderItemId): orderItemId is string =>
                            typeof orderItemId === "string",
                    ),
            );

            const reviewedLegacyProductIds = new Set(
                (existingReviews || [])
                    .filter((review) => !review.order_item_id)
                    .map((review) => review.product_id)
                    .filter(
                        (productId): productId is string =>
                            typeof productId === "string",
                    ),
            );

            let successCount = 0;
            let skippedCount = 0;

            for (const orderItem of reviewableOrderItems) {
                const orderItemId = orderItem.id as string;
                const productId = orderItem.product_id as string;

                if (reviewedOrderItemIds.has(orderItemId)) {
                    skippedCount++;
                    continue;
                }

                if (reviewedLegacyProductIds.has(productId)) {
                    skippedCount++;
                    continue;
                }

                const variantSnapshot = buildVariantSnapshot(orderItem);

                const reviewPayload: Database["public"]["Tables"]["reviews"]["Insert"] = {
                    order_id: orderId,
                    order_item_id: orderItemId,
                    product_id: productId,
                    buyer_id: buyerId,
                    rating,
                    comment: normalizedComment,
                    variant_snapshot: variantSnapshot,
                    is_verified_purchase: true,
                    helpful_count: 0,
                    seller_reply: null,
                    is_hidden: false,
                    is_edited: false,
                };

                const { data: createdReview, error: reviewInsertError } =
                    await supabase
                        .from("reviews")
                        .insert(reviewPayload)
                        .select("id")
                        .single();

                if (reviewInsertError) {
                    if ((reviewInsertError as any)?.code === "23505") {
                        skippedCount++;
                        continue;
                    }
                    throw reviewInsertError;
                }

                let uploadedImageUrls: string[] = [];

                if (createdReview?.id && validImageFiles.length > 0) {
                    uploadedImageUrls = (
                        await uploadReviewImages(
                            validImageFiles,
                            createdReview.id,
                            buyerId,
                        )
                    ).filter(isHttpUrl);

                    if (uploadedImageUrls.length < validImageFiles.length) {
                        console.warn(
                            `Only ${uploadedImageUrls.length} of ${validImageFiles.length} review image(s) uploaded for review ${createdReview.id}`,
                        );
                    }
                }

                const resolvedImageUrls = Array.from(
                    new Set([...sanitizedImageUrls, ...uploadedImageUrls]),
                );

                if (createdReview?.id && resolvedImageUrls.length > 0) {
                    const imageRows: Database["public"]["Tables"]["review_images"]["Insert"][] =
                        resolvedImageUrls.map((imageUrl, index) => ({
                            review_id: createdReview.id,
                            image_url: imageUrl,
                            sort_order: index,
                        }));

                    const { error: reviewImagesError } = await supabase
                        .from("review_images")
                        .insert(imageRows);

                    if (reviewImagesError) {
                        console.warn(
                            "Failed to insert review images metadata:",
                            reviewImagesError,
                        );
                    }
                }

                successCount++;
            }

            const alreadyReviewedEverything =
                successCount === 0 &&
                skippedCount >= reviewableOrderItems.length;

            if (!alreadyReviewedEverything && successCount === 0) {
                return false;
            }

            console.log(
                `✅ Successfully created ${successCount} review(s) for order ${orderId}`,
            );
            return true;
        } catch (error) {
            console.error("Error submitting review:", error);

            if (error instanceof Error) {
                throw new Error(error.message);
            }

            throw new Error("Failed to submit review");
        }
    }

    /**
     * Get order statistics for seller dashboard
     */
    async getSellerOrderStats(sellerId: string, startDate?: Date | null, endDate?: Date | null) {
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
                    p_start_date: startDate?.toISOString(),
                    p_end_date: endDate?.toISOString(),
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
