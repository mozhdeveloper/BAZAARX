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
import type { Database } from "@/types/database.types";
import { uploadReviewImages } from "@/utils/storage";
import { orderNotificationService } from "./orderNotificationService";
import { notificationService } from "./notificationService";

// Fallback types
type Order = any; 
type PaymentStatus = string;
type ShipmentStatus = string;

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
// NOTE: Payment status is now decoupled from shipment status.
// Only explicit payment-related status changes should update payment_status.
// Shipment status changes (shipped, delivered, etc.) should NOT auto-update payment_status.
const LEGACY_STATUS_MAP: Record<
    string,
    { payment_status: PaymentStatus | null; shipment_status: ShipmentStatus }
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
    processing: { payment_status: null, shipment_status: "processing" },
    ready_to_ship: { payment_status: null, shipment_status: "ready_to_ship" },
    shipped: { payment_status: null, shipment_status: "shipped" },
    out_for_delivery: {
        payment_status: null,
        shipment_status: "out_for_delivery",
    },
    delivered: { payment_status: null, shipment_status: "delivered" },
    failed_delivery: {
        payment_status: null,
        shipment_status: "failed_to_deliver",
    },
    cancelled: { payment_status: "refunded", shipment_status: "returned" },
    refunded: { payment_status: "refunded", shipment_status: "returned" },
    completed: { payment_status: null, shipment_status: "received" },
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
    if (shipmentStatus === "delivered" || shipmentStatus === "received" || shipmentStatus === "completed") {
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
        .filter((review) => Boolean(review))
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

    if (shipmentStatus === "delivered" || shipmentStatus === "received" || shipmentStatus === "completed") {
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

// ---------------------------------------------------------------------------
// TTL cache (30 s) — avoids redundant order fetches on hot seller/buyer pages
// ---------------------------------------------------------------------------
const ORDER_CACHE_TTL = 30_000;
interface OrderCacheEntry<T> { data: T; expiresAt: number; }
const _orderCache = new Map<string, OrderCacheEntry<unknown>>();

function _getOrderCache<T>(key: string): T | null {
    const entry = _orderCache.get(key) as OrderCacheEntry<T> | undefined;
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { _orderCache.delete(key); return null; }
    return entry.data;
}

function _setOrderCache<T>(key: string, data: T): void {
    _orderCache.set(key, { data, expiresAt: Date.now() + ORDER_CACHE_TTL });
}

export function invalidateOrderCache(pattern?: string): void {
    if (!pattern) { _orderCache.clear(); return; }
    for (const key of _orderCache.keys()) {
        if (key.includes(pattern)) _orderCache.delete(key);
    }
}
// ---------------------------------------------------------------------------

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
            void Promise.allSettled([
                orderNotificationService.sendStatusUpdateNotification(
                    orderId,
                    status,
                    sellerId,
                    buyerId,
                    trackingNumber,
                ),
                notificationService.notifyBuyerOrderStatus({
                    buyerId,
                    orderId,
                    orderNumber: orderNumberLabel,
                    status,
                    message,
                }),
            ]).then((results) => {
                const [chatResult, bellResult] = results;

                if (chatResult.status === "rejected") {
                    console.error(
                        "Failed to send order chat notification:",
                        chatResult.reason,
                    );
                }

                if (bellResult.status === "rejected") {
                    console.error(
                        "Failed to send buyer notification:",
                        bellResult.reason,
                    );
                }
            });
    }

    /**
     * Create a POS (Point of Sale) offline order
     * Updated for new normalized schema - uses payment_status/shipment_status
     * @param buyerEmail - Optional buyer email to link order for BazCoins points
     * @param paymentMethod - Payment method used (cash, card, ewallet, bank_transfer)
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
        paymentMethod?: 'cash' | 'card' | 'ewallet' | 'bank_transfer',
    ): Promise<{
        orderId: string;
        orderNumber: string;
        buyerLinked?: boolean;
    } | null> {
        // Generate order number (fallback — DB trigger will override if deployed)
        const orderNumber = `POS-${Date.now().toString(36).toUpperCase()}`;
        const orderId = crypto.randomUUID();

        // Try to find buyer by email if provided (for BazCoins points)
        let buyerId: string | null = null;
        let buyerLinked = false;

        if (buyerEmail && isSupabaseConfigured()) {
            const normalizedEmail = buyerEmail.toLowerCase().trim();
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", normalizedEmail)
                .maybeSingle();

            if (profileError) {
                console.warn(
                    "[OrderService] Failed to resolve profile by email:",
                    profileError,
                );
            } else if (profile?.id) {
                const [{ data: buyerRole }, { data: buyerRecord }] =
                    await Promise.all([
                        supabase
                            .from("user_roles")
                            .select("id")
                            .eq("user_id", profile.id)
                            .eq("role", "buyer")
                            .maybeSingle(),
                        supabase
                            .from("buyers")
                            .select("id")
                            .eq("id", profile.id)
                            .maybeSingle(),
                    ]);

                if (buyerRole?.id || buyerRecord?.id) {
                    buyerId = profile.id;
                    buyerLinked = true;
                    console.log(
                        "Buyer found by email, will receive BazCoins:",
                        buyerEmail,
                    );
                }
            }
        }
        // If no buyer found, we need a placeholder buyer_id due to NOT NULL constraint
        const finalBuyerId = buyerId;

        // Fetch warranty information for all products
        const productIds = items.map(item => item.productId);
        const productWarrantyMap = new Map<string, {
            has_warranty: boolean;
            warranty_type: string | null;
            warranty_duration_months: number | null;
        }>();
        
        if (isSupabaseConfigured() && productIds.length > 0) {
            const { data: warrantyData } = await supabase
                .from('products')
                .select('id, has_warranty, warranty_type, warranty_duration_months')
                .in('id', productIds);
            warrantyData?.forEach(p => {
                productWarrantyMap.set(p.id, {
                    has_warranty: p.has_warranty,
                    warranty_type: p.warranty_type,
                    warranty_duration_months: p.warranty_duration_months,
                });
            });
        }

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
        const orderDate = new Date();
        const orderItems = items.map((item) => {
            const warrantyInfo = productWarrantyMap.get(item.productId);
            
            // Calculate warranty dates if product has warranty
            let warrantyStartDate: string | null = null;
            let warrantyExpirationDate: string | null = null;
            let warrantyType: string | null = null;
            let warrantyDurationMonths: number | null = null;
            
            if (warrantyInfo?.has_warranty && warrantyInfo.warranty_type && warrantyInfo.warranty_duration_months) {
                warrantyType = warrantyInfo.warranty_type;
                warrantyDurationMonths = warrantyInfo.warranty_duration_months;
                warrantyStartDate = orderDate.toISOString();
                
                // Calculate expiration date
                const expirationDate = new Date(orderDate);
                expirationDate.setMonth(expirationDate.getMonth() + warrantyDurationMonths);
                warrantyExpirationDate = expirationDate.toISOString();
            }
            
            return {
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
                warranty_type: warrantyType,
                warranty_duration_months: warrantyDurationMonths,
                warranty_start_date: warrantyStartDate,
                warranty_expiration_date: warrantyExpirationDate,
            };
        });

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

            console.log(`[OrderService] Creating POS order with data:`, {
                order_number: orderNumber,
                order_type: orderData.order_type,
                payment_status: orderData.payment_status,
                shipment_status: orderData.shipment_status,
                buyer_id: finalBuyerId || 'null',
                items_count: orderItems.length
            });

            let { error: orderError } = await supabase
                .from("orders")
                .insert(insertData);

            if (
                orderError?.code === "23502" &&
                orderError.message?.includes("buyer_id")
            ) {
                console.log('[OrderService] Retrying order insert with buyer_id: null');
                const { error: retryError } = await supabase
                    .from("orders")
                    .insert({
                        ...orderData,
                        buyer_id: null,
                        notes: `POS Walk-in Sale${buyerEmail ? ` - Customer email: ${buyerEmail}` : ""}`,
                    });

                if (retryError) {
                    console.error('[OrderService] Retry failed:', retryError);
                    return { orderId, orderNumber, buyerLinked: false };
                }
                orderError = null;
            }

            if (orderError) {
                console.error('[OrderService] Order insert failed:', orderError);
                throw orderError;
            }

            console.log(`[OrderService] Order inserted successfully: ${orderId}`);
            console.log(`[OrderService] Inserting ${orderItems.length} order items...`);
           console.log(`[OrderService] Sample order item:`, orderItems[0]);
            const { error: itemsError } = await supabase
                .from("order_items")
                .insert(orderItems as any); // Bypass hyper-strict types

            if (itemsError) {
                console.error('[OrderService] Order items insert failed:', itemsError);
                await supabase.from("orders").delete().eq("id", orderId);
                throw itemsError;
            }

            console.log(`[OrderService] Order items inserted successfully`);

            // Verify the order was created correctly
            const { data: verifyOrder } = await supabase
                .from("orders")
                .select("payment_status, shipment_status, order_type")
                .eq("id", orderId)
                .single();

            console.log(`[OrderService] Verification - Order status:`, verifyOrder);

            // Verify order items were created
            const { data: verifyItems, count } = await supabase
                .from("order_items")
                .select("product_id, quantity", { count: 'exact' })
                .eq("order_id", orderId);

            console.log(`[OrderService] Verification - Created ${count} order items:`, verifyItems);

            // Insert payment record (canonical: order_payments, see migration 043c).
            // POS = OFFLINE order, no gateway involved, so no payment_transactions row.
            const paymentMethodValue = paymentMethod || 'cash';
            const paymentMethodLabel = {
                cash: 'Cash',
                card: 'Card',
                ewallet: 'E-Wallet',
                bank_transfer: 'Bank Transfer'
            }[paymentMethodValue] || 'Cash';

            const { error: paymentError } = await supabase
                .from("order_payments")
                .insert({
                    order_id: orderId,
                    payment_method: { type: paymentMethodValue, label: paymentMethodLabel },
                    amount: total,
                    status: 'completed',
                    payment_date: new Date().toISOString(),
                });

            if (paymentError) {
                console.warn("Failed to insert order_payments record:", paymentError);
                // Don't fail the order, payment record is supplementary
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
                    // Atomic, race-safe decrement (POS sale). Falls back if RPC unavailable.
                    const { error: rpcErr } = await supabase.rpc('decrement_stock_atomic', {
                        p_variant_id: variant.id,
                        p_qty: item.quantity,
                        p_order_id: orderId,
                        p_reason: 'pos_sale',
                        p_actor_id: sellerId,
                    });
                    if (rpcErr) {
                        console.warn('[POS] decrement_stock_atomic failed, falling back:', rpcErr.message);
                        const newStock = Math.max(0, (variant.stock || 0) - item.quantity);
                        await supabase
                            .from("product_variants")
                            .update({ stock: newStock })
                            .eq("id", variant.id);
                    }
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

            invalidateOrderCache();
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
        endDate?: Date | null,
        shipmentStatuses?: string[]
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

        // Cache check (skip when date range is specified to ensure fresh data)
        const shipmentStatusKey = shipmentStatuses?.length ? shipmentStatuses.join(',') : '';
        const cacheKey = `buyer_orders:${buyerId}:${startDate?.toISOString() ?? ''}:${endDate?.toISOString() ?? ''}:${shipmentStatusKey}`;
        const cached = _getOrderCache<Order[]>(cacheKey);
        if (cached) return cached;

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
                            id,
                            name,
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
                        seller_reply,
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

            if (shipmentStatuses && shipmentStatuses.length > 0) {
                query = shipmentStatuses.length === 1
                    ? query.eq("shipment_status", shipmentStatuses[0])
                    : query.in("shipment_status", shipmentStatuses);
            }

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
            const buyerResult = (data || []).map((order: any) => {
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
                    product_name: item?.product?.name || item.product_name,
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
                    shipping_street: order.is_registry_order && fallbackAddress?.street ? fallbackAddress.street : (shippingAddr?.address_line_1 || fallbackAddress?.street || ""),
                    shipping_city: order.is_registry_order && fallbackAddress?.city ? fallbackAddress.city : (shippingAddr?.city || fallbackAddress?.city || ""),
                    shipping_province: order.is_registry_order && fallbackAddress?.province ? fallbackAddress.province : (shippingAddr?.province || fallbackAddress?.province || ""),
                    shipping_postal_code: order.is_registry_order && fallbackAddress?.postalCode ? fallbackAddress.postalCode : (shippingAddr?.postal_code || fallbackAddress?.postalCode || ""),
                    shipping_barangay: order.is_registry_order ? "" : (shippingAddr?.barangay || ""),
                    shipping_region: order.is_registry_order ? "" : (shippingAddr?.region || ""),
                    shipping_landmark: order.is_registry_order ? "" : (shippingAddr?.landmark || ""),
                    shipping_instructions: order.is_registry_order ? "" : (shippingAddr?.delivery_instructions || ""),
                    shipping_country: "Philippines",
                } as Order;
            });
            _setOrderCache(cacheKey, buyerResult);
            return buyerResult;
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

        // Cache check
        const sellerCacheKey = `seller_orders:${sellerId}:${startDate?.toISOString() ?? ''}:${endDate?.toISOString() ?? ''}`;
        const cachedSeller = _getOrderCache<Order[]>(sellerCacheKey);
        if (cachedSeller) return cachedSeller;

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
                        delivery_instructions,
                        first_name,
                        last_name,
                        phone_number
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
                        seller_reply,
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
            const sellerResult = (orders || []).map((order) => {
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

                const recipientRaw = order.recipient || {};
                const recipient = Array.isArray(recipientRaw) ? recipientRaw[0] : recipientRaw;
                const shippingAddrRaw = order.shipping_address || {};
                const shippingAddr = Array.isArray(shippingAddrRaw) ? shippingAddrRaw[0] : shippingAddrRaw;
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
                    // BX-FIX: Keep shipping_address as an OBJECT so mapOrderRowToSellerSnapshot
                    // can read address_line_1, city, province, etc. individually.
                    // Previously this was overwritten with a flat string, breaking address resolution.
                    shipping_address: shippingAddr || null,
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
                    // Pass is_registry_order so mapOrderRowToSellerSnapshot can apply privacy rules
                    is_registry_order: order.is_registry_order || false,
                };
            });
            _setOrderCache(sellerCacheKey, sellerResult);
            return sellerResult;
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

            // Build update payload - only include payment_status if it's explicitly set
            const updatePayload: Record<string, unknown> = {
                shipment_status: newStatuses.shipment_status,
                updated_at: new Date().toISOString(),
            };

            // Only update payment_status if it's explicitly provided (not null)
            if (newStatuses.payment_status !== null) {
                updatePayload.payment_status = newStatuses.payment_status;
            }

            // test this
            console.log("updatePayload:", updatePayload);

            const { error: orderError } = await supabase
                .from("orders")
                .update(updatePayload)
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

            // Insert cancellation record so buyer-side queries can detect cancelled orders
            if (status === "cancelled") {
                const { error: cancellationInsertError } = await supabase
                    .from("order_cancellations")
                    .insert({
                        order_id: orderId,
                        reason: note || "Order cancelled",
                        cancelled_at: new Date().toISOString(),
                        cancelled_by: userId || null,
                    });

                if (cancellationInsertError) {
                    console.warn("[OrderService] Failed to insert cancellation record:", cancellationInsertError);
                }
            }

            // When a seller cancels an order, resolve any associated return requests
            if (status === "cancelled" && userRole === "seller") {
                const now = new Date().toISOString();
                // Reject any open/in-progress returns
                await supabase
                    .from("refund_return_periods")
                    .update({
                        status: "rejected",
                        is_returnable: false,
                        rejected_reason: "Order cancelled by seller",
                        resolved_at: now,
                        resolution_source: "seller",
                    })
                    .eq("order_id", orderId)
                    .in("status", ["pending", "seller_review", "counter_offered", "escalated"])
                    .is("resolution_source", null);
                // Attribute any already-closed returns that are missing a resolver
                await supabase
                    .from("refund_return_periods")
                    .update({ resolution_source: "seller", resolved_at: now })
                    .eq("order_id", orderId)
                    .in("status", ["approved", "refunded", "return_in_transit", "return_received", "rejected"])
                    .is("resolution_source", null);
            }

            const sellerId =
                userRole === "seller" && userId
                    ? userId
                    : await this.resolveOrderSellerId(orderId);

            if (userRole === "seller" && order.buyer_id && sellerId) {
                console.log(`[OrderService] Seller updated order ${orderId} to ${status}, dispatching buyer notifications for ${order.buyer_id}`);

                if (status === "processing") {
                    const message = `Your order #${order.order_number} has been confirmed! We're preparing it for shipment.`;

                    console.log(`[OrderService] Sending order confirmed notification to buyer ${order.buyer_id}`);

                    void Promise.allSettled([
                        orderNotificationService.sendStatusUpdateNotification(
                            orderId,
                            status,
                            sellerId,
                            order.buyer_id,
                        ),
                        notificationService.notifyBuyerOrderStatus({
                            buyerId: order.buyer_id,
                            orderId: orderId,
                            orderNumber: order.order_number,
                            status: "confirmed",
                            message,
                        }),
                    ]).then((results) => {
                        const [chatResult, bellResult] = results;

                        if (chatResult.status === "rejected") {
                            console.error(
                                "Failed to send order chat notification:",
                                chatResult.reason,
                            );
                        }

                        if (bellResult.status === "rejected") {
                            console.error(
                                "Failed to send buyer notification:",
                                bellResult.reason,
                            );
                        } else {
                            console.log(`[OrderService] Order confirmed notification sent to buyer ${order.buyer_id}`);
                        }
                    });
                } else {
                    void orderNotificationService
                        .sendStatusUpdateNotification(
                            orderId,
                            status,
                            sellerId,
                            order.buyer_id,
                        )
                        .catch((error) => {
                            console.error(
                                "Failed to send order chat notification:",
                                error,
                            );
                        });
                }
                // Skip bell notifications for other statuses - they'll be sent by their specific methods
            }

            invalidateOrderCache();
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
                            } as any) // Bypass hyper-strict types
                            .eq("id", existingShipment.id);
                    } else {
                        await supabase.from("order_shipments").insert({
                            order_id: orderId,
                            status: "shipped",
                            tracking_number: trackingNumber,
                            shipped_at: new Date().toISOString(),
                        } as any); // Bypass hyper-strict types
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
     * Confirm order received by buyer
     * Transitions shipment_status from "delivered" to "received"
     * This is the final confirmation that the buyer has received the package
     */
    async confirmOrderReceived(
        orderId: string,
        buyerId: string,
        receiptPhotoUrls?: string[],
    ): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            const order = this.mockOrders.find((o) => o.id === orderId && o.buyer_id === buyerId);
            if (order) {
                order.status = "completed";
                order.completed_at = new Date().toISOString();
                return true;
            }
            return false;
        }

        try {
            const { data: order, error: fetchError } = await supabase
                .from("orders")
                .select(`
                    id,
                    buyer_id,
                    order_number,
                    shipment_status,
                    payment_status
                `)
                .eq("id", orderId)
                .single();

            if (fetchError || !order) {
                throw new Error("Order not found");
            }

            if (order.buyer_id !== buyerId) {
                throw new Error("Access denied: You can only confirm receipt of your own orders");
            }

            if (order.shipment_status !== "delivered" && order.shipment_status !== "received") {
                throw new Error(
                    `Cannot confirm receipt. Order must be in "delivered" status. Current status: ${order.shipment_status}`
                );
            }

            // Already received — idempotent, just return success
            if (order.shipment_status === "received") {
                return true;
            }

            // For COD orders: mark as paid when buyer confirms receipt (cash collected on delivery)
            // Note: payment_method column may not be available in web, so we update based on payment_status
            const needsPaymentUpdate = order.payment_status !== "paid";

            const now = new Date().toISOString();
            const updateData: Record<string, any> = { 
                shipment_status: "received", 
                updated_at: now 
            };
            
            // Mark as paid if not already paid
            if (needsPaymentUpdate) {
                updateData.payment_status = "paid";
                updateData.paid_at = now;
            }

            const { error: updateError } = await supabase
                .from("orders")
                .update(updateData)
                .eq("id", orderId);

            if (updateError) throw updateError;

            await supabase.from("order_status_history").insert({
                order_id: orderId,
                status: "received",
                note: "Buyer confirmed receipt of order",
                changed_by: buyerId,
                changed_by_role: "buyer",
                metadata: {
                    confirmed_received_at: new Date().toISOString(),
                    ...(receiptPhotoUrls?.length ? { receipt_photos: receiptPhotoUrls } : {}),
                },
            });

            // Notify sellers about order receipt (fire-and-forget)
            (async () => {
                try {
                    // [COMMENTED OUT] Notification service function not implemented
                    // Uncomment when notifySellerOrderReceived is available in notificationService
                    /*
                    // Fetch order items with seller info
                    const { data: orderItems = [] } = await supabase
                        .from("order_items")
                        .select("*, products(seller_id)")
                        .eq("order_id", orderId);

                    // Get unique seller IDs
                    const sellerIds = Array.from(
                        new Set(orderItems
                            .map((item: any) => item.products?.seller_id)
                            .filter(Boolean))
                    );

                    // Fetch buyer name
                    const { data: buyer } = await supabase
                        .from("buyers")
                        .select("name")
                        .eq("id", buyerId)
                        .single();

                    // Notify each seller
                    sellerIds.forEach((sellerId) => {
                        void notificationService.notifySellerOrderReceived({
                            sellerId: sellerId as string,
                            orderId,
                            orderNumber: order.order_number,
                            buyerName: buyer?.name,
                        });
                    });
                    */
                } catch (notifyError) {
                    console.error("Error notifying sellers of order receipt:", notifyError);
                    // Non-blocking, don't rethrow
                }
            })();

            return true;
        } catch (error) {
            console.error("Error confirming order received:", error);
            throw new Error("Failed to confirm order receipt");
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
                .select("id, buyer_id, order_number, payment_status")
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
                changed_by_role:
                    cancelledBy && existingOrder.buyer_id === cancelledBy
                        ? "buyer"
                        : null,
                metadata: {
                    cancelled_at: nowIso,
                    payment_status: nextPaymentStatus,
                    shipment_status: "returned",
                },
            });

            if (cancelledBy && existingOrder.buyer_id === cancelledBy) {
                const sellerId = await this.resolveOrderSellerId(orderId);

                if (sellerId) {
                    const { data: buyerProfile } = await supabase
                        .from("profiles")
                        .select("first_name, last_name")
                        .eq("id", cancelledBy)
                        .maybeSingle();

                    const buyerName = [
                        buyerProfile?.first_name,
                        buyerProfile?.last_name,
                    ]
                        .filter(Boolean)
                        .join(" ");

                    void notificationService
                        .notifySellerOrderCancelled({
                            sellerId,
                            orderId,
                            orderNumber: existingOrder.order_number || orderId,
                            buyerName,
                            reason: normalizedReason,
                        })
                        .catch((error) => {
                            console.error(
                                "Failed to send seller cancellation notification:",
                                error,
                            );
                        });
                }
            }

            invalidateOrderCache();
            return true;
        } catch (error) {
            console.error("Error cancelling order:", error);
            throw new Error("Failed to cancel order");
        }
    }

    /**
     * Submit separate order reviews for individual products
     */
    async submitOrderReview(
        orderId: string,
        buyerId: string,
        reviews: Array<{
            productId: string;
            orderItemId?: string;
            rating: number;
            comment: string;
            images?: string[];
            imageFiles?: File[];
            isAnonymous?: boolean;
        }>
    ): Promise<boolean> {
        if (!orderId || !buyerId) {
            throw new Error("Order ID and Buyer ID are required");
        }

        if (!reviews || reviews.length === 0) {
            throw new Error("At least one product review is required");
        }

        const cleanOrderId = orderId.trim();
        // Determine if we are searching by UUID or order_number
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanOrderId);
        const orderColumn = isUuid ? "id" : "order_number";

        console.log(`[Review] Searching for order. Column: ${orderColumn}, Value: ${cleanOrderId}, Buyer: ${buyerId}`);

        try {
            // 1. Simplified Query: Removed complex nested joins to prevent PostgREST silent failures
            const { data: order, error: orderError } = await supabase
                .from("orders")
                .select(`
                    id,
                    buyer_id,
                    order_number,
                    shipment_status,
                    order_items (
                        id,
                        product_id,
                        variant_id
                    )
                `)
                .eq(orderColumn, cleanOrderId)
                .maybeSingle();

            // 2. Specific Error Diagnostics
            if (orderError) {
                console.error("[Review] DB Error:", orderError);
                throw new Error(`Database Error: ${orderError.message}`);
            }

            if (!order) {
                throw new Error(`Order ${cleanOrderId} could not be found in the database. (Check RLS policies)`);
            }

            if (order.buyer_id !== buyerId) {
                throw new Error(`Access Denied: Your Session ID (${buyerId}) does not match the Order Buyer ID (${order.buyer_id})`);
            }

            if (order.shipment_status !== "delivered" && order.shipment_status !== "received") {
                throw new Error(`Cannot review order right now. Current shipment status is: '${order.shipment_status}'. Order must be 'delivered' or 'received'.`);
            }

            const actualOrderId = order.id;
            const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

            // 3. Fetch existing reviews to prevent duplicates
            const { data: existingReviews, error: existingReviewsError } = await supabase
                .from("reviews")
                .select("id, product_id, order_item_id")
                .eq("order_id", actualOrderId)
                .eq("buyer_id", buyerId);

            if (existingReviewsError) {
                throw new Error(`Failed to check existing reviews: ${existingReviewsError.message}`);
            }

            const reviewedOrderItemIds = new Set(
                (existingReviews || []).map((r) => r.order_item_id).filter(Boolean)
            );
            const reviewedProductIds = new Set(
                (existingReviews || []).filter((r) => !r.order_item_id).map((r) => r.product_id).filter(Boolean)
            );

            let successCount = 0;

            for (const reviewData of reviews) {
                const { productId, rating, comment, images, imageFiles, isAnonymous } = reviewData;

                if (rating < 1 || rating > 5) continue;

                const orderItem = orderItems.find((item: any) => item.product_id === productId);
                if (!orderItem) continue;

                const orderItemId = orderItem.id as string;
                if (reviewedOrderItemIds.has(orderItemId) || reviewedProductIds.has(productId)) {
                    continue; // Skip already reviewed items
                }

                // Basic snapshot for the schema constraint
                const variantSnapshot = {
                    product_id: productId,
                    variant_id: orderItem.variant_id
                };

                const reviewPayload: Database["public"]["Tables"]["reviews"]["Insert"] = {
                    order_id: actualOrderId,
                    order_item_id: orderItemId,
                    product_id: productId,
                    buyer_id: buyerId,
                    rating,
                    comment: comment?.trim() || "Great product!",
                    variant_snapshot: variantSnapshot,
                    is_verified_purchase: true,
                    helpful_count: 0,
                    seller_reply: null,
                    is_hidden: isAnonymous ?? false,
                    is_edited: false,
                };

                const { data: createdReview, error: reviewInsertError } = await supabase
                    .from("reviews")
                    .insert(reviewPayload)
                    .select("id")
                    .single();

                if (reviewInsertError) {
                    if ((reviewInsertError as any)?.code === "23505") continue; // Skip unique constraint violations
                    console.error("[Review] Insert Error:", reviewInsertError);
                    throw new Error(`Failed to save review: ${reviewInsertError.message}`);
                }

                const validImageFiles = Array.isArray(imageFiles)
                    ? imageFiles.filter((file): file is File => isBrowserFile(file))
                    : [];

                let uploadedImageUrls: string[] = [];

                if (createdReview?.id && validImageFiles.length > 0) {
                    uploadedImageUrls = (await uploadReviewImages(validImageFiles, createdReview.id, buyerId)).filter(isHttpUrl);
                }

                const sanitizedImageUrls = (images || []).map((img) => img?.trim()).filter(isHttpUrl);
                const resolvedImageUrls = Array.from(new Set([...sanitizedImageUrls, ...uploadedImageUrls]));

                // Insert Images
                if (createdReview?.id && resolvedImageUrls.length > 0) {
                    const imageRows: Database["public"]["Tables"]["review_images"]["Insert"][] =
                        resolvedImageUrls.map((imageUrl, index) => ({
                            review_id: createdReview.id,
                            image_url: imageUrl,
                            sort_order: index,
                        }));

                    await supabase.from("review_images").insert(imageRows);
                }

                successCount++;
            }

            if (successCount === 0 && reviews.length > 0) {
                const allReviewed = reviews.every(r =>
                    reviewedProductIds.has(r.productId) ||
                    orderItems.find((i: any) => i.product_id === r.productId && reviewedOrderItemIds.has(i.id))
                );
                if (!allReviewed) return false;
            }

            console.log(`✅ Successfully created ${successCount} review(s) for order ${cleanOrderId}`);

            // Notify the seller of the new review(s)
            if (successCount > 0) {
                try {
                    const reviewedProductId = reviews.find(r => r.productId)?.productId;
                    if (reviewedProductId) {
                        const { data: productRow } = await supabase
                            .from('products')
                            .select('seller_id, name')
                            .eq('id', reviewedProductId)
                            .single();
                        if (productRow?.seller_id) {
                            const { data: buyerProfile } = await supabase
                                .from('profiles')
                                .select('first_name, last_name')
                                .eq('id', buyerId)
                                .single();
                            const buyerName = [buyerProfile?.first_name, buyerProfile?.last_name]
                                .filter(Boolean).join(' ') || 'A buyer';
                            const avgRating = Math.round(
                                reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
                            );
                            await notificationService.notifySellerNewReview({
                                sellerId: productRow.seller_id,
                                productId: reviewedProductId,
                                productName: productRow.name || 'Product',
                                rating: avgRating,
                                buyerName,
                            });
                        }
                    }
                } catch (notifErr) {
                    console.warn('[Review] Failed to send seller notification:', notifErr);
                }
            }

            return true;
        } catch (error) {
            console.error("Error submitting review:", error);
            // This ensures the EXACT specific error bubbles up to the frontend UI!
            if (error instanceof Error) {
                throw error;
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
                        (o.payment_status === "pending" || o.payment_status === "pending_payment"),
                ).length,
                processing: this.mockOrders.filter(
                    (o) =>
                        o.seller_id === sellerId && 
                        (o.shipment_status === "processing" || o.shipment_status === "ready_to_ship"),
                ).length,
                completed: this.mockOrders.filter(
                    (o) => o.seller_id === sellerId && 
                    (o.shipment_status === "delivered" || o.shipment_status === "received"),
                ).length,
            };
        }
        try {
            const { data, error } = await supabase.rpc(
                "get_seller_order_stats" as any,
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
