/**
 * Checkout Service
 * Handles split-order process, order creation, and stock management.
 * February 2026 Refactor: Every original logic point preserved.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { CartItem } from '@/types/database.types';
import { notificationService } from './notificationService';
import { discountService } from './discountService';
import type { ActiveDiscount } from '@/types/discount';

export interface CheckoutPayload {
    userId: string;
    items: (CartItem & {
        selected_variant?: any;
        product?: {
            price?: number;
            seller_id?: string;
            name?: string;
            images?: string[];
            primary_image?: string | null;
        } | null
    })[];
    totalAmount: number;
    shippingAddress: any;
    paymentMethod: string;
    usedBazcoins: number;
    earnedBazcoins: number;
    shippingFee: number;
    discount: number;
    email: string;
    voucherId?: string | null;
    selectedAddressId?: string | null;
}

export interface CheckoutResult {
    success: boolean;
    orderIds?: string[];
    error?: string;
    newBazcoinsBalance?: number;
}

type CheckoutLinePricing = {
    item: CheckoutPayload['items'][number];
    unitPrice: number;
    quantity: number;
    campaignDiscountPerUnit: number;
    campaignDiscountTotal: number;
    discountedUnitPrice: number;
    activeDiscount: ActiveDiscount | null;
};

export class CheckoutService {
    private static instance: CheckoutService;

    private constructor() { }

    public static getInstance(): CheckoutService {
        if (!CheckoutService.instance) {
            CheckoutService.instance = new CheckoutService();
        }
        return CheckoutService.instance;
    }

    private generateOrderNumber(): string {
        const year = new Date().getFullYear();
        const randomNum = Math.floor(100000 + Math.random() * 900000);
        const timestamp = Date.now().toString(36).slice(-4).toUpperCase();
        return `ORD-${year}${randomNum}${timestamp}`;
    }

    async processCheckout(payload: CheckoutPayload): Promise<CheckoutResult> {
        if (!isSupabaseConfigured()) {
            throw new Error('Supabase not configured - cannot process checkout');
        }

        const {
            userId, items, shippingAddress, paymentMethod,
            usedBazcoins, earnedBazcoins, email, voucherId, discount
        } = payload;

        console.log("Starting checkout process...", payload);

        try {
            // ─── PHASE 1: Parallel stock validation + recipient + address + discounts ───
            // All of these are independent — run simultaneously.

            const uniqueProductIds = [...new Set(items.map(item => item.product_id).filter(Boolean) as string[])];

            // Stock validation: all products in parallel (was a sequential for-loop)
            const stockValidationResults = await Promise.all(
                items.map(async (item) => {
                    if (!item.product_id) return { item, variant: null };
                    const { data: variants } = await supabase
                        .from('product_variants')
                        .select('id, stock, sku, variant_name, price')
                        .eq('product_id', item.product_id);
                    const variantsList = variants || [];
                    const selectedVar = item.selected_variant as any;
                    const variant = selectedVar
                        ? (variantsList.find(v => v.id === selectedVar.id) ||
                            variantsList.find(v => v.sku === selectedVar.sku) ||
                            variantsList.find(v => v.variant_name === selectedVar.name))
                        : variantsList[0];
                    return { item, variant: variant || null };
                })
            );

            // Batch query base product stock for products without variants
            const productIds = [...new Set(items.map(item => item.product_id).filter(Boolean))];
            const { data: productsData } = await supabase
                .from('products')
                .select('id, stock')
                .in('id', productIds);

            const productStockMap = new Map<string, number>();
            productsData?.forEach(p => productStockMap.set(p.id, p.stock || 0));

            // Validate stock and attach resolved variant IDs (reuse fetched data — no re-fetch later)
            const resolvedStockMap = new Map<string, number>(); // variantId -> current stock
            for (const { item, variant } of stockValidationResults) {
                if (variant) {
                    if (variant.stock < item.quantity) {
                        throw new Error(`Insufficient stock for ${item.name}. Only ${variant.stock} available.`);
                    }
                    (item as any).resolved_variant_id = variant.id;
                    resolvedStockMap.set(variant.id, variant.stock);
                } else {
                    // Validate base product stock (for products without variants)
                    const productStock = productStockMap.get(item.product_id) || 0;
                    if (productStock < item.quantity) {
                        throw new Error(`Insufficient stock for ${item.name}. Only ${productStock} available.`);
                    }
                }
            }

            // Recipient insert + shipping address lookup + discount fetch — all parallel
            const getOrCreateShippingAddress = async (): Promise<string | null> => {
                const { data: existingAddr } = await supabase
                    .from('shipping_addresses')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('address_line_1', shippingAddress.street || '')
                    .eq('city', shippingAddress.city || '')
                    .eq('postal_code', shippingAddress.postalCode || '')
                    .maybeSingle();
                if (existingAddr) return existingAddr.id;
                const { data: addressData } = await supabase.from('shipping_addresses').insert({
                    user_id: userId,
                    label: 'Order Address',
                    address_line_1: shippingAddress.street || '',
                    city: shippingAddress.city || '',
                    province: shippingAddress.province || '',
                    region: shippingAddress.province || '',
                    postal_code: shippingAddress.postalCode || '',
                    is_default: false
                }).select('id').single();
                return addressData?.id ?? null;
            };

            const [recipientResult, shippingAddressId, activeDiscountsByProduct] = await Promise.all([
                supabase.from('order_recipients').insert({
                    first_name: shippingAddress.fullName?.split(' ')[0] || '',
                    last_name: shippingAddress.fullName?.split(' ').slice(1).join(' ') || '',
                    phone: shippingAddress.phone || '',
                    email: email || '',
                }).select('id').single(),
                getOrCreateShippingAddress(),
                discountService.getActiveDiscountsForProducts(uniqueProductIds),
            ]);

            const recipientId: string | null = recipientResult.data?.id ?? null;

            // ─── PHASE 2: Pricing calculations (pure CPU, no DB) ───
            const getUnitPrice = (item: CheckoutPayload['items'][number]): number => {
                const base =
                    Number((item.selected_variant as any)?.original_price) ||
                    Number((item.selected_variant as any)?.originalPrice) ||
                    Number(item.product?.price) ||
                    Number((item.selected_variant as any)?.price) ||
                    0;
                return Math.max(0, base);
            };

            const linePricing: CheckoutLinePricing[] = items.map(item => {
                const unitPrice = getUnitPrice(item);
                const activeDiscount = item.product_id ? (activeDiscountsByProduct[item.product_id] || null) : null;
                const calculation = discountService.calculateLineDiscount(unitPrice, item.quantity, activeDiscount);
                return {
                    item, unitPrice, quantity: item.quantity,
                    campaignDiscountPerUnit: calculation.discountPerUnit,
                    campaignDiscountTotal: calculation.discountTotal,
                    discountedUnitPrice: calculation.discountedUnitPrice,
                    activeDiscount
                };
            });

            const campaignDiscountTotal = linePricing.reduce((sum, line) => sum + line.campaignDiscountTotal, 0);
            const subtotalBeforeDiscount = linePricing.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0);
            const taxAmount = Math.round(subtotalBeforeDiscount * 0.12);
            const pricingSummary = {
                subtotal: subtotalBeforeDiscount,
                shipping: Number(payload.shippingFee || 0),
                tax: taxAmount,
                campaignDiscount: campaignDiscountTotal,
                voucherDiscount: Number(discount || 0),
                bazcoinDiscount: Math.max(0, Number(usedBazcoins || 0)),
                total: Number(payload.totalAmount || 0),
            };

            // Group items by seller
            const itemsBySeller: Record<string, typeof items> = {};
            items.forEach(item => {
                const sId = item.product?.seller_id;
                if (!sId) throw new Error("Missing seller information.");
                if (!itemsBySeller[sId]) itemsBySeller[sId] = [];
                itemsBySeller[sId].push(item);
            });

            const addressJson = JSON.stringify({
                fullName: shippingAddress.fullName, street: shippingAddress.street,
                city: shippingAddress.city, province: shippingAddress.province,
                postalCode: shippingAddress.postalCode, phone: shippingAddress.phone
            });

            const sellerEntries = Object.entries(itemsBySeller);
            const sharedBaseNumber = this.generateOrderNumber();

            // ─── PHASE 3: Per-seller order creation (parallel across sellers) ───
            const createdOrderNumbers = await Promise.all(
                sellerEntries.map(async ([sellerId, _sellerItems], index) => {
                    const orderNumber = index === 0 ? sharedBaseNumber : this.generateOrderNumber();

                    const { data: orderData, error: orderError } = await supabase.from('orders').insert({
                        order_number: orderNumber,
                        buyer_id: userId,
                        address_id: shippingAddressId,
                        order_type: 'ONLINE',
                        payment_status: 'pending_payment',
                        shipment_status: 'waiting_for_seller',
                        recipient_id: recipientId,
                        notes: `SHIPPING_ADDRESS:${addressJson}|PRICING_SUMMARY:${JSON.stringify(pricingSummary)}|Payment: ${paymentMethod}|SELLER:${sellerId}`
                    }).select().single();

                    if (orderError) throw orderError;

                    const sellerLinePricing = linePricing.filter(lp => lp.item.product?.seller_id === sellerId);

                    const orderItemsData = sellerLinePricing.map(lp => ({
                        order_id: orderData.id,
                        product_id: lp.item.product_id,
                        product_name: (lp.item.selected_variant as any)?.name || lp.item.product?.name || 'Product',
                        primary_image_url: (lp.item.selected_variant as any)?.image || lp.item.product?.primary_image || null,
                        quantity: lp.quantity,
                        price: lp.unitPrice,
                        variant_id: (lp.item.selected_variant as any)?.id || null,
                        price_discount: lp.campaignDiscountPerUnit,
                        shipping_price: 0,
                        shipping_discount: 0
                    }));

                    // Stock deductions — use stock already fetched in Phase 1 (no re-fetch)
                    const stockUpdates = sellerLinePricing
                        .filter(lp => (lp.item as any).resolved_variant_id)
                        .map(lp => {
                            const variantId = (lp.item as any).resolved_variant_id as string;
                            const currentStock = resolvedStockMap.get(variantId) ?? lp.quantity;
                            return supabase.from('product_variants')
                                .update({ stock: Math.max(0, currentStock - lp.quantity) })
                                .eq('id', variantId);
                        });

                    // Campaign discount rows
                    const sellerCampaignTotals = sellerLinePricing.reduce<Record<string, number>>((acc, lp) => {
                        const cId = lp.activeDiscount?.campaignId;
                        if (cId && lp.campaignDiscountTotal > 0) acc[cId] = (acc[cId] || 0) + lp.campaignDiscountTotal;
                        return acc;
                    }, {});
                    const discountInserts = Object.keys(sellerCampaignTotals).length > 0
                        ? [supabase.from('order_discounts').insert(
                            Object.entries(sellerCampaignTotals).map(([cId, amt]) => ({
                                buyer_id: userId, order_id: orderData.id, campaign_id: cId, discount_amount: amt
                            }))
                        )]
                        : [];

                    // Fire all per-order writes in parallel
                    await Promise.all([
                        supabase.from('order_payments').insert({
                            order_id: orderData.id,
                            payment_method: paymentMethod,
                            amount: pricingSummary.total,
                            status: 'pending',
                        }),
                        supabase.from('order_items').insert(orderItemsData),
                        ...stockUpdates,
                        ...discountInserts,
                    ]);

                    // Seller notification (fire-and-forget, never blocks checkout)
                    const sellerTotal = sellerLinePricing.reduce((sum, lp) => sum + (lp.quantity * lp.discountedUnitPrice), 0);
                    notificationService.notifySellerNewOrder({
                        sellerId, orderId: orderData.id, orderNumber: orderData.order_number,
                        buyerName: shippingAddress.fullName || 'Customer', total: sellerTotal
                    }).catch(console.error);

                    return orderData.order_number as string;
                })
            );

            // ─── PHASE 4: Bazcoins update + cart cleanup in parallel ───
            let newBalance: number | undefined;
            const itemIdsToRemove = items.map(i => i.id).filter(Boolean);

            const postOrderTasks: Promise<any>[] = [];

            if (usedBazcoins > 0 || earnedBazcoins > 0) {
                postOrderTasks.push(
                    Promise.resolve(
                        supabase.from('buyers').select('bazcoins').eq('id', userId).single().then(({ data: b }) => {
                            newBalance = (b?.bazcoins || 0) - usedBazcoins + earnedBazcoins;
                            return supabase.from('buyers').update({ bazcoins: newBalance }).eq('id', userId);
                        })
                    )
                );
            }

            if (itemIdsToRemove.length > 0) {
                postOrderTasks.push(
                    Promise.resolve(supabase.from('cart_items').delete().in('id', itemIdsToRemove))
                );
            }

            await Promise.all(postOrderTasks);

            return { success: true, orderIds: createdOrderNumbers, newBazcoinsBalance: newBalance };

        } catch (error: any) {
            console.error("Checkout processing failed:", error);
            throw new Error(error.message || 'Checkout process failed.');
        }
    }
}

export const checkoutService = CheckoutService.getInstance();

// ─────────────────────────────────────────────────────────────────────────────
// Checkout Context — single concurrent fetch for addresses + seller metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckoutContextSellerMeta {
    id: string;
    store_name: string | null;
    shipping_origin: string | null;
    is_verified: boolean;
    avatar_url: string | null;
}

export interface CheckoutContextResult {
    addresses: any[];
    defaultAddress: any | null;
    sellers: Record<string, CheckoutContextSellerMeta>;
}

/**
 * Calls the `get-checkout-context` Edge Function which uses Promise.all
 * internally to fetch user addresses and seller metadata concurrently,
 * replacing multiple waterfall requests with a single round-trip.
 */
export async function getCheckoutContext(
    productIds: string[],
): Promise<CheckoutContextResult> {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        throw new Error('AUTH_EXPIRED');
    }

    const { data, error } = await supabase.functions.invoke<CheckoutContextResult>(
        'get-checkout-context',
        {
            body: { productIds },
            headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        },
    );

    if (error) {
        console.error('[checkoutService] getCheckoutContext error:', error);
        const msg = error.message || '';
        if (msg.includes('401') || msg.includes('non-2xx status code') || msg.includes('Unauthorized')) {
            throw new Error('AUTH_EXPIRED');
        }
        throw new Error(msg || 'Failed to load checkout context');
    }

    return data ?? { addresses: [], defaultAddress: null, sellers: {} };
}