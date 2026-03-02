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
            // 1. COMPREHENSIVE STOCK VALIDATION
            for (const item of items) {
                if (!item.product_id) continue;

                const { data: variants } = await supabase
                    .from('product_variants')
                    .select('id, stock, sku, variant_name, price')
                    .eq('product_id', item.product_id);

                const variantsList = variants || [];
                const selectedVar = item.selected_variant as any;

                const variant = selectedVar 
                    ? (variantsList.find(v => v.id === selectedVar.id) || 
                       variantsList.find(v => v.sku === selectedVar.sku) ||
                       variantsList.find(v => v.variant_name === selectedVar.name || v.variant_name === selectedVar.name))
                    : variantsList[0];

                if (variant) {
                    if (variant.stock < item.quantity) {
                        throw new Error(`Insufficient stock for ${variant.variant_name || 'product'}.`);
                    }
                    // Save the resolved variant ID securely to the item so we know EXACTLY what to deduct later
                    (item as any).resolved_variant_id = variant.id;
                }
            }

            // 2. DEDUPLICATED ADDRESS & RECIPIENT SETUP
            let recipientId: string | null = null;
            const { data: recipientData } = await supabase.from('order_recipients').insert({
                first_name: shippingAddress.fullName?.split(' ')[0] || '',
                last_name: shippingAddress.fullName?.split(' ').slice(1).join(' ') || '',
                phone: shippingAddress.phone || '',
                email: email || '',
            }).select().single();
            if (recipientData) recipientId = recipientData.id;

            let shippingAddressId: string | null = payload.selectedAddressId || null;
            if (!shippingAddressId) {
                const { data: existingAddr } = await supabase
                    .from('shipping_addresses')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('address_line_1', shippingAddress.street || '')
                    .eq('city', shippingAddress.city || '')
                    .eq('postal_code', shippingAddress.postalCode || '')
                    .maybeSingle();

                if (existingAddr) {
                    shippingAddressId = existingAddr.id;
                } else {
                    const { data: addressData } = await supabase.from('shipping_addresses').insert({
                        user_id: userId,
                        label: 'Order Address',
                        address_line_1: shippingAddress.street || '',
                        city: shippingAddress.city || '',
                        province: shippingAddress.province || '',
                        region: shippingAddress.province || '',
                        postal_code: shippingAddress.postalCode || '',
                        is_default: false
                    }).select().single();
                    if (addressData) shippingAddressId = addressData.id;
                }
            }

            // 3. GLOBAL PRICING LOGIC (Preserving your exact logic)
            const sharedBaseNumber = this.generateOrderNumber();
            
            const getUnitPrice = (item: CheckoutPayload['items'][number]): number => {
                const base =
                    Number((item.selected_variant as any)?.original_price) ||
                    Number((item.selected_variant as any)?.originalPrice) ||
                    Number(item.product?.price) ||
                    Number((item.selected_variant as any)?.price) ||
                    0;
                return Math.max(0, base);
            };

            const uniqueProductIds = [...new Set(items.map(item => item.product_id).filter(Boolean) as string[])];
            const activeDiscountsByProduct = await discountService.getActiveDiscountsForProducts(uniqueProductIds);
            
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

            // 4. MULTI-SELLER GROUPING & LOOP
            const itemsBySeller: Record<string, typeof items> = {};
            items.forEach(item => {
                const sId = item.product?.seller_id;
                if (!sId) throw new Error("Missing seller information.");
                if (!itemsBySeller[sId]) itemsBySeller[sId] = [];
                itemsBySeller[sId].push(item);
            });

            const createdOrderNumbers: string[] = [];
            const addressJson = JSON.stringify({
                fullName: shippingAddress.fullName, street: shippingAddress.street,
                city: shippingAddress.city, province: shippingAddress.province,
                postalCode: shippingAddress.postalCode, phone: shippingAddress.phone
            });

            for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
                // For multiple sellers, we can append a suffix or generate unique IDs
                const orderNumber = createdOrderNumbers.length === 0 ? sharedBaseNumber : this.generateOrderNumber();

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
                createdOrderNumbers.push(orderData.order_number);

                // Payment record per order
                await supabase.from('order_payments').insert({
                    order_id: orderData.id,
                    payment_method: paymentMethod,
                    amount: pricingSummary.total, // Or calculate seller-specific share
                    status: 'pending',
                });

                // Insert Order Items belonging to THIS seller
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

                await supabase.from('order_items').insert(orderItemsData);

                // Seller Notification
                const sellerTotal = sellerLinePricing.reduce((sum, lp) => sum + (lp.quantity * lp.discountedUnitPrice), 0);
                notificationService.notifySellerNewOrder({
                    sellerId, orderId: orderData.id, orderNumber: orderData.order_number,
                    buyerName: shippingAddress.fullName || 'Customer', total: sellerTotal
                }).catch(console.error);

                // Update Variant Stocks
                for (const lp of sellerLinePricing) {
                    const variantId = (lp.item as any).resolved_variant_id; // Safe and guaranteed ID from validation
                    const qty = lp.quantity;

                    // Deduct Stock from product_variants
                    if (variantId) {
                        const { data: v } = await supabase.from('product_variants').select('stock').eq('id', variantId).single();
                        if (v) await supabase.from('product_variants').update({ stock: Math.max(0, v.stock - qty) }).eq('id', variantId);
                    }
                }

                // Record Campaign Discounts per Order
                const sellerCampaignTotals = sellerLinePricing.reduce<Record<string, number>>((acc, lp) => {
                    const cId = lp.activeDiscount?.campaignId;
                    if (cId && lp.campaignDiscountTotal > 0) acc[cId] = (acc[cId] || 0) + lp.campaignDiscountTotal;
                    return acc;
                }, {});

                if (Object.keys(sellerCampaignTotals).length > 0) {
                    const discountRows = Object.entries(sellerCampaignTotals).map(([cId, amt]) => ({
                        buyer_id: userId, order_id: orderData.id, campaign_id: cId, discount_amount: amt
                    }));
                    await supabase.from('order_discounts').insert(discountRows);
                }
            }

            // 5. BAZCOINS & CART CLEANUP
            let newBalance: number | undefined;
            if (usedBazcoins > 0 || earnedBazcoins > 0) {
                const { data: b } = await supabase.from('buyers').select('bazcoins').eq('id', userId).single();
                newBalance = (b?.bazcoins || 0) - usedBazcoins + earnedBazcoins;
                await supabase.from('buyers').update({ bazcoins: newBalance }).eq('id', userId);
            }

            const itemIdsToRemove = items.map(i => i.id);
            if (itemIdsToRemove.length > 0) {
                await supabase.from('cart_items').delete().in('id', itemIdsToRemove);
            }

            return { success: true, orderIds: createdOrderNumbers, newBazcoinsBalance: newBalance };

        } catch (error: any) {
            console.error("Checkout processing failed:", error);
            throw new Error(error.message || 'Checkout process failed.');
        }
    }
}

export const checkoutService = CheckoutService.getInstance();