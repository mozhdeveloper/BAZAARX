import { supabase } from '../lib/supabase';
import type { CartItem } from '../types';
import { cartService } from './cartService';
import { orderNotificationService } from './orderNotificationService';
import { notificationService } from './notificationService';

// Define the payload for the checkout process
export interface CheckoutPayload {
    userId: string;
    items: CartItem[];
    totalAmount: number;
    shippingAddress: {
        fullName: string;
        street: string;
        barangay: string;
        city: string;
        province: string;
        region: string;
        postalCode: string;
        phone: string;
        country?: string;
    };
    paymentMethod: string;
    usedBazcoins: number;
    earnedBazcoins: number;
    shippingFee: number;
    discount: number;
    voucherId?: string | null;
    discountAmount?: number;
    email: string;
    // Campaign discount info
    campaignDiscountTotal?: number;
    campaignDiscounts?: {
        campaignId?: string;
        campaignName: string;
        discountAmount: number;
        productId: string;
        quantity: number;
    }[];
    // BX-09-001 — Per-seller shipping breakdown
    shippingBreakdown?: {
        sellerId: string;
        sellerName: string;
        method: string;
        methodLabel: string;
        fee: number;
        breakdown: {
            baseRate: number;
            weightSurcharge: number;
            valuationFee: number;
            odzFee: number;
        };
        estimatedDays: string;
        originZone: string;
        destinationZone: string;
    }[];
}

export interface CheckoutResult {
    success: boolean;
    orderIds?: string[];
    orderUuids?: string[];
    error?: string;
    newBazcoinsBalance?: number;
}

/**
 * Generate a fallback order number (only used if DB trigger is not deployed).
 * Prefer server-side generation via the trg_set_order_number trigger.
 */
const generateOrderNumber = (): string => {
    const year = new Date().getFullYear();
    const seq = Date.now().toString(36).toUpperCase();
    return `ORD-${year}${seq}`;
};

/**
 * Process checkout for mobile app
 * - Validates stock
 * - Creates orders (grouped by seller)
 * - Creates order items
 * - Updates product stock and sales count
 * - Updates Bazcoins balance
 * - Clears cart items
 */
export const processCheckout = async (payload: CheckoutPayload): Promise<CheckoutResult> => {
    const {
        userId,
        items,
        totalAmount,
        shippingAddress,
        paymentMethod,
        usedBazcoins,
        earnedBazcoins,
        shippingFee,
        discount,
        voucherId,
        discountAmount,
        email,
        campaignDiscountTotal,
        campaignDiscounts
    } = payload;

    try {
        // 1. Validate Stock — batch query all variants at once instead of per-item loop
        const productIdsForStock = items.map(i => i.id).filter(Boolean) as string[];

        let allVariants: { id: string; product_id: string; stock: number }[] = [];
        let allProducts: { id: string; stock: number }[] = [];
        // Note: 'stock' doesn't exist on products table; derived from variants below

        if (productIdsForStock.length > 0) {
            // Fetch variants
            const { data: variantsData, error: variantError } = await supabase
                .from('product_variants')
                .select('id, product_id, stock')
                .in('product_id', productIdsForStock);

            if (variantError) {
                console.warn('[Checkout] Batch stock check error:', variantError.message);
            } else {
                allVariants = variantsData || [];
            }

            // Derive base product stock from variants for products without specific variant selection
            const productStockMap = new Map<string, number>();
            for (const v of allVariants) {
                productStockMap.set(v.product_id, (productStockMap.get(v.product_id) || 0) + (v.stock || 0));
            }
            allProducts = productIdsForStock.map(id => ({ id, stock: productStockMap.get(id) || 0 }));
        }

        // Validate stock per item using the batched result
        for (const item of items) {
            if (!item.id) continue;

            const itemVariants = allVariants.filter(v => v.product_id === item.id);
            const productStock = allProducts.find(p => p.id === item.id)?.stock || 0;

            // If product has variants, validate using variants
            if (itemVariants.length > 0) {
                let availableStock = 0;
                if (item.selectedVariant?.variantId) {
                    const selectedVariant = itemVariants.find(v => v.id === item.selectedVariant?.variantId);

                    if (!selectedVariant) {
                        console.warn(`[Checkout] Variant ${item.selectedVariant.variantId} not found for product ${item.name}`);
                        throw new Error(`Selected variant for "${item.name}" is no longer available. Please remove and re-add to cart.`);
                    }

                    availableStock = selectedVariant?.stock || 0;
                } else {
                    // No variant selected, use sum of all variant stocks
                    availableStock = itemVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
                }

                if (availableStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.name}. Only ${availableStock} available.`);
                }
            } else {
                // Product has no variants, validate against base product stock
                if (productStock < item.quantity) {
                    throw new Error(`Insufficient stock for ${item.name}. Only ${productStock} available.`);
                }
            }
        }

        // 2. Group items by seller — batch query all seller IDs at once
        const itemsMissingSeller = items.filter(item =>
            item.id && !(item as any).seller_id && !(item as any).sellerId
        );
        const sellerLookupMap = new Map<string, string>();

        if (itemsMissingSeller.length > 0) {
            const idsToLookup = itemsMissingSeller.map(i => i.id).filter(Boolean) as string[];
            const { data: prodData, error: prodErr } = await supabase
                .from('products')
                .select('id, seller_id')
                .in('id', idsToLookup);
            if (!prodErr && prodData) {
                prodData.forEach(p => {
                    if (p.seller_id) sellerLookupMap.set(p.id, p.seller_id as string);
                });
            }
        }

        const itemsBySeller: Record<string, typeof items> = {};
        for (const item of items) {
            let sellerId: string | undefined = (item as any).seller_id || (item as any).sellerId;
            if (!sellerId && item.id) {
                sellerId = sellerLookupMap.get(item.id);
            }

            if (!sellerId) {
                throw new Error(`Missing seller information for product: ${item.name}`);
            }

            if (!itemsBySeller[sellerId]) {
                itemsBySeller[sellerId] = [];
            }
            itemsBySeller[sellerId].push(item);
        }

        const createdOrderIds: string[] = [];
        const createdOrderUuids: string[] = [];
        const sharedBaseNumber = generateOrderNumber();
        let sellerIndex = 1;

        // 3. Process orders per seller
        for (const [sellerId, sellerItems] of Object.entries(itemsBySeller)) {
            const orderNumber = `${sharedBaseNumber}#${sellerIndex++}`;

            // Calculate subtotal for this specific order
            const orderSubtotal = sellerItems.reduce(
                (sum, item) => sum + (item.quantity * (item.price || 0)),
                0
            );

            // Calculate tax (12% VAT — aligned with web checkout)
            const taxAmount = Math.round(orderSubtotal * 0.12);

            // First, create a shipping address record
            // Build address_line_1 properly - filter out empty values
            const addressParts = [
                shippingAddress.fullName || '',
                shippingAddress.phone || '',
                shippingAddress.street || ''
            ].filter(Boolean);
            const addressLine1 = addressParts.length > 0 ? addressParts.join(', ') : shippingAddress.street || 'Address';

            // Check for existing matching address to avoid duplicates
            let addressData: { id: string } | null = null;
            const { data: existingAddr } = await supabase
                .from('shipping_addresses')
                .select('id')
                .eq('user_id', userId)
                .eq('address_line_1', addressLine1)
                .eq('city', shippingAddress.city || 'Manila')
                .eq('postal_code', shippingAddress.postalCode || '0000')
                .limit(1)
                .maybeSingle();

            if (existingAddr) {
                addressData = existingAddr;
            } else {
                // Extract first and last name from fullName
                const nameParts = (shippingAddress.fullName || '').trim().split(' ');
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';

                const { data: newAddr, error: addressError } = await supabase
                    .from('shipping_addresses')
                    .insert({
                        user_id: userId,
                        label: 'Checkout Address',
                        address_line_1: addressLine1,
                        first_name: firstName,
                        last_name: lastName,
                        phone_number: shippingAddress.phone || '',
                        barangay: shippingAddress.barangay || '',
                        city: shippingAddress.city || 'Manila',
                        province: shippingAddress.province || 'Metro Manila',
                        region: shippingAddress.region || 'NCR',
                        postal_code: shippingAddress.postalCode || '0000',
                        is_default: false,
                        address_type: 'residential',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (addressError) throw addressError;
                addressData = newAddr;
            }

            if (!addressData) throw new Error('Failed to resolve shipping address');

            // Create order with multiple fallback strategies for robustness
            let orderData: { id: string; order_number: string; buyer_id: string } | null = null;

            // Strategy 1: Try the safe RPC function (if it exists in the database)
            // This function has built-in exception handling for trigger errors
            const { data: rpcResult, error: rpcError } = await supabase
                .rpc('create_order_safe', {
                    p_order_number: orderNumber,
                    p_buyer_id: userId,
                    p_order_type: 'ONLINE',
                    p_address_id: addressData.id,
                    p_payment_status: 'pending_payment',
                    p_shipment_status: 'waiting_for_seller',
                    p_notes: `Order from ${shippingAddress.fullName}`
                });

            if (!rpcError && rpcResult && (rpcResult as any).success) {
                // RPC function worked
                console.log('[Checkout] ✅ Order created via safe RPC:', orderNumber);
                if ((rpcResult as any).warning) {
                    console.warn('[Checkout] ⚠️ RPC warning:', (rpcResult as any).warning);
                }
                orderData = {
                    id: (rpcResult as any).order_id,
                    order_number: (rpcResult as any).order_number,
                    buyer_id: (rpcResult as any).buyer_id
                };
            } else {
                // Strategy 2: Fall back to direct insert (RPC might not exist yet)
                console.log('[Checkout] RPC not available or failed, using direct insert...');

                const { data: insertedOrder, error: orderError } = await supabase
                    .from('orders')
                    .insert({
                        order_number: orderNumber,
                        buyer_id: userId,
                        order_type: 'ONLINE',
                        address_id: addressData.id,
                        payment_status: 'pending_payment',
                        shipment_status: 'waiting_for_seller',
                        notes: `Order from ${shippingAddress.fullName}`,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (orderError) {
                    const isMaterializedViewError = orderError.message?.includes('materialized view') ||
                        orderError.message?.includes('concurrently') ||
                        orderError.code === '55000';

                    if (isMaterializedViewError) {
                        console.warn('[Checkout] ⚠️ Materialized view error detected, attempting recovery...');

                        // Wait a moment for any async operations to complete
                        await new Promise(resolve => setTimeout(resolve, 200));

                        // Try to fetch the order with retry logic
                        let retryCount = 0;
                        const maxRetries = 3;

                        while (retryCount < maxRetries && !orderData) {
                            const { data: existingOrder } = await supabase
                                .from('orders')
                                .select('id, order_number, buyer_id')
                                .eq('order_number', orderNumber)
                                .eq('buyer_id', userId)
                                .maybeSingle();

                            if (existingOrder) {
                                console.log('[Checkout] ✅ Order found on retry', retryCount + 1, ':', orderNumber);
                                orderData = existingOrder as { id: string; order_number: string; buyer_id: string };
                            } else {
                                retryCount++;
                                if (retryCount < maxRetries) {
                                    await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
                                }
                            }
                        }

                        if (!orderData) {
                            // Order wasn't created - need database fix
                            console.error('[Checkout] ❌ Order not found after retries. Database fix required.');
                            console.error('[Checkout] Please run the SQL migration: 004_fix_buyer_orders_view.sql');
                            throw new Error(
                                'Order creation blocked by database trigger. ' +
                                'Please contact support or run the database migration to fix this issue.'
                            );
                        }
                    } else {
                        throw orderError;
                    }
                } else {
                    orderData = insertedOrder as { id: string; order_number: string; buyer_id: string };
                }
            }

            if (!orderData) {
                throw new Error('Failed to create order - no order data returned');
            }

            createdOrderIds.push(orderData.order_number);
            createdOrderUuids.push(orderData.id);

            console.log(`[Checkout] ✅ Order created: ${orderData.order_number} for seller ${sellerId}`);

            // BX-09-002 — Persist per-seller shipment record
            if (payload.shippingBreakdown && payload.shippingBreakdown.length > 0) {
                const sellerBreakdown = payload.shippingBreakdown.find(sb => sb.sellerId === sellerId);
                if (sellerBreakdown) {
                    supabase
                        .from('order_shipments')
                        .insert({
                            order_id: orderData.id,
                            seller_id: sellerId,
                            shipping_method: sellerBreakdown.method,
                            shipping_method_label: sellerBreakdown.methodLabel,
                            calculated_fee: sellerBreakdown.fee,
                            fee_breakdown: sellerBreakdown.breakdown,
                            origin_zone: sellerBreakdown.originZone,
                            destination_zone: sellerBreakdown.destinationZone,
                            estimated_days_text: sellerBreakdown.estimatedDays,
                            chargeable_weight_kg: 0,
                            tracking_number: null,
                            status: 'pending',
                        })
                        .then(({ error: shipErr }) => {
                            if (shipErr) {
                                console.warn(`[Checkout] ⚠️ Failed to insert order_shipment for seller ${sellerId}:`, shipErr.message);
                            } else {
                                console.log(`[Checkout] ✅ Shipment record created for order ${orderData!.order_number}, seller ${sellerId}`);
                            }
                        });
                }
            }

            // � Send bell notification to buyer about order placed (only this one, no duplicate 'pending')
            notificationService.notifyBuyerOrderStatus({
                buyerId: orderData.buyer_id,
                orderId: orderData.id,
                orderNumber: orderData.order_number,
                status: 'placed',
                message: `Your order #${orderData.order_number} has been placed! We'll notify you when the seller confirms.`
            }).catch(err => {
                console.error('[Checkout] ❌ Failed to send order placed notification:', err);
            });

            // 🔔 Send bell notification to seller about new order
            notificationService.notifySellerNewOrder({
                sellerId: sellerId,
                orderId: orderData.id,
                orderNumber: orderData.order_number,
                buyerName: shippingAddress.fullName,
                total: orderSubtotal
            }).catch(err => {
                console.error('[Checkout] ❌ Failed to send seller notification:', err);
            });

            // 📧 Send order receipt email to buyer (fire-and-forget)
            const sellerCount = Object.keys(itemsBySeller).length;
            const perSellerShipping = sellerCount > 0 ? shippingFee / sellerCount : shippingFee;
            const perSellerDiscount = sellerCount > 0 ? discount / sellerCount : discount;
            const orderTotal = orderSubtotal + perSellerShipping - perSellerDiscount;
            const itemsHtml = sellerItems.map(item => {
                const imgUrl = item.image || '';
                const lineTotal = (item.price ?? 0) * item.quantity;
                const imgCell = imgUrl
                    ? `<td style="padding:12px 0;width:56px;vertical-align:top"><img src="${imgUrl}" alt="" width="56" height="56" style="display:block;border-radius:8px;border:1px solid #E4E4E7;object-fit:cover" /></td>`
                    : `<td style="padding:12px 0;width:56px;vertical-align:top"><div style="width:56px;height:56px;border-radius:8px;background:#F4F4F5"></div></td>`;
                return `<tr style="border-bottom:1px solid #E4E4E7">${imgCell}<td style="padding:12px 0 12px 12px;vertical-align:top"><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18181B">${item.name || 'Product'}</p><p style="margin:0;font-size:13px;color:#71717A">Qty: ${item.quantity}</p></td><td align="right" style="padding:12px 0;vertical-align:top;white-space:nowrap"><span style="font-size:14px;font-weight:600;color:#18181B">₱${lineTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span></td></tr>`;
            }).join('');
            supabase.functions.invoke('send-email', {
                body: {
                    to: email,
                    templateSlug: 'order_receipt',
                    recipientId: userId,
                    category: 'transactional',
                    variables: {
                        buyer_name: shippingAddress.fullName,
                        order_number: orderData.order_number,
                        order_date: new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
                        items_html: itemsHtml,
                        subtotal: orderSubtotal.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
                        shipping_fee: perSellerShipping.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
                        discount: perSellerDiscount.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
                        total_amount: orderTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 }),
                        payment_method: paymentMethod,
                        shipping_address: [shippingAddress.street, shippingAddress.barangay, shippingAddress.city, shippingAddress.province].filter(Boolean).join(', '),
                    },
                },
            }).catch(err => {
                console.error('[Checkout] ❌ Failed to send receipt email:', err);
            });

            // Create order items
            const orderItemsData = sellerItems.map(item => {
                // Build personalized options with dynamic labels and legacy support
                let personalizedOptions: Record<string, any> | null = null;

                if (item.selectedVariant) {
                    personalizedOptions = {};

                    // Store dynamic variant labels and values
                    if (item.selectedVariant.option1Value) {
                        personalizedOptions.option1Label = item.selectedVariant.option1Label || 'Option 1';
                        personalizedOptions.option1Value = item.selectedVariant.option1Value;
                    }
                    if (item.selectedVariant.option2Value) {
                        personalizedOptions.option2Label = item.selectedVariant.option2Label || 'Option 2';
                        personalizedOptions.option2Value = item.selectedVariant.option2Value;
                    }

                    // Legacy support for color/size
                    if (item.selectedVariant.size) {
                        personalizedOptions.size = item.selectedVariant.size;
                    }
                    if (item.selectedVariant.color) {
                        personalizedOptions.color = item.selectedVariant.color;
                    }

                    // Store variant ID if available
                    if (item.selectedVariant.variantId) {
                        personalizedOptions.variantId = item.selectedVariant.variantId;
                    }

                    // Build display name
                    const displayParts: string[] = [];
                    if (personalizedOptions.option1Value) {
                        displayParts.push(`${personalizedOptions.option1Label}: ${personalizedOptions.option1Value}`);
                    }
                    if (personalizedOptions.option2Value) {
                        displayParts.push(`${personalizedOptions.option2Label}: ${personalizedOptions.option2Value}`);
                    }
                    // Fallback to legacy
                    if (displayParts.length === 0) {
                        if (personalizedOptions.size) displayParts.push(`Size: ${personalizedOptions.size}`);
                        if (personalizedOptions.color) displayParts.push(`Color: ${personalizedOptions.color}`);
                    }

                    if (displayParts.length > 0) {
                        personalizedOptions.name = displayParts.join(', ');
                    }
                }

                // Calculate price discount (campaign discount) per item
                const itemOriginalPrice = item.originalPrice ?? item.price ?? 0;
                const itemPriceDiscount = itemOriginalPrice - (item.price ?? 0);

                return {
                    order_id: orderData.id,
                    product_id: item.id,
                    product_name: item.name,
                    primary_image_url: item.image, // Use primary image URL field
                    price: item.price || 0, // This is the discounted price
                    price_discount: itemPriceDiscount, // Store the discount amount
                    shipping_price: 0, // No shipping price initially
                    shipping_discount: 0, // No shipping discount initially
                    quantity: item.quantity,
                    variant_id: item.selectedVariant?.variantId || null,
                    personalized_options: personalizedOptions,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
            });

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsData as any);

            // Handle materialized view error on order_items - the insert might have succeeded
            if (itemsError) {
                const isMaterializedViewError = itemsError.message?.includes('materialized view') ||
                    itemsError.message?.includes('concurrently') ||
                    itemsError.code === '55000';

                if (isMaterializedViewError) {
                    console.warn('[Checkout] ⚠️ Materialized view error on order_items, checking if items were created...');

                    // Wait briefly and check if items exist
                    await new Promise(resolve => setTimeout(resolve, 200));

                    const { data: existingItems } = await supabase
                        .from('order_items')
                        .select('id')
                        .eq('order_id', orderData.id);

                    if (existingItems && existingItems.length > 0) {
                        console.log('[Checkout] ✅ Order items found despite trigger error');
                        // Items were created - continue
                    } else {
                        // Items weren't created - try one more time without the trigger issue
                        console.warn('[Checkout] Order items not found, retrying insert...');

                        const { error: retryError } = await supabase
                            .from('order_items')
                            .insert(orderItemsData as any);

                        if (retryError && !retryError.message?.includes('materialized view')) {
                            throw retryError; // Real error
                        }

                        // Check again
                        const { data: retryItems } = await supabase
                            .from('order_items')
                            .select('id')
                            .eq('order_id', orderData.id);

                        if (!retryItems || retryItems.length === 0) {
                            console.error('[Checkout] ❌ Failed to create order items. Database fix required.');
                            throw new Error(
                                'Order items creation blocked by database trigger. ' +
                                'Please contact support or run the database migration.'
                            );
                        }
                        console.log('[Checkout] ✅ Order items created on retry');
                    }
                } else {
                    throw itemsError;
                }
            }

            // Create payment record
            const { error: paymentError } = await supabase
                .from('order_payments')
                .insert({
                    order_id: orderData.id,
                    payment_method: { type: paymentMethod }, // Store payment method as JSON
                    amount: orderSubtotal,
                    status: 'pending', // Payment status
                    created_at: new Date().toISOString()
                });

            if (paymentError) throw paymentError;

            // Record voucher usage if voucher was applied
            if (voucherId && discountAmount && discountAmount > 0) {
                const { error: voucherError } = await supabase
                    .from('order_vouchers')
                    .insert({
                        voucher_id: voucherId,
                        buyer_id: userId,
                        order_id: orderData.id,
                        discount_amount: discountAmount,
                        created_at: new Date().toISOString()
                    });

                if (voucherError) {
                    console.error('[Checkout] Failed to record voucher usage:', voucherError);
                } else {
                    console.log('[Checkout] ✅ Voucher usage recorded:', voucherId, 'discount:', discountAmount);
                }
            }

            // Record campaign discount usage — batch insert all at once
            if (campaignDiscounts && campaignDiscounts.length > 0) {
                const sellerDiscounts = campaignDiscounts.filter(cd =>
                    sellerItems.some(si => si.id === cd.productId)
                );

                const discountInserts = sellerDiscounts
                    .filter(cd => cd.campaignId && cd.discountAmount > 0)
                    .map(cd => ({
                        buyer_id: userId,
                        order_id: orderData.id,
                        campaign_id: cd.campaignId!,
                        discount_amount: cd.discountAmount,
                    }));

                if (discountInserts.length > 0) {
                    const { error: discError } = await supabase
                        .from('order_discounts')
                        .insert(discountInserts);
                    if (discError) {
                        console.warn('[Checkout] Failed to record campaign discounts:', discError.message);
                    }
                }
            }

            // Update stock in product_variants — batch fetch current stock then update
            const variantIdsToUpdate: string[] = [];
            const productIdsForFallback: string[] = [];

            for (const item of sellerItems) {
                if (!item.id) continue;
                if (item.selectedVariant?.variantId) {
                    variantIdsToUpdate.push(item.selectedVariant.variantId);
                } else {
                    productIdsForFallback.push(item.id);
                }
            }

            try {
                // Batch fetch all variant stocks we need
                const variantStockMap = new Map<string, number>();

                if (variantIdsToUpdate.length > 0) {
                    const { data: varStocks } = await supabase
                        .from('product_variants')
                        .select('id, stock')
                        .in('id', variantIdsToUpdate);
                    varStocks?.forEach(v => variantStockMap.set(v.id, v.stock || 0));
                }

                // For items without specific variant, get primary variant per product
                if (productIdsForFallback.length > 0) {
                    const { data: fallbackVars } = await supabase
                        .from('product_variants')
                        .select('id, product_id, stock')
                        .in('product_id', productIdsForFallback)
                        .order('created_at', { ascending: true });
                    // Take only first variant per product
                    const seen = new Set<string>();
                    fallbackVars?.forEach(v => {
                        if (!seen.has(v.product_id)) {
                            seen.add(v.product_id);
                            variantStockMap.set(v.id, v.stock || 0);
                        }
                    });
                }

                // Now update each variant stock (these are individual UPDATEs but with pre-fetched data)
                for (const item of sellerItems) {
                    if (!item.id) continue;
                    let variantId = item.selectedVariant?.variantId;
                    if (!variantId) {
                        // Find the fallback variant ID from our map
                        for (const [vid, _] of variantStockMap) {
                            // Match by checking if this variant belongs to this product
                            // We stored the primary variant's id in the map
                            const belongsToProduct = allVariants.some(v => v.id === vid && v.product_id === item.id);
                            if (belongsToProduct) { variantId = vid; break; }
                        }
                    }
                    if (variantId && variantStockMap.has(variantId)) {
                        const currentStock = variantStockMap.get(variantId) || 0;
                        await supabase
                            .from('product_variants')
                            .update({ stock: Math.max(0, currentStock - item.quantity) })
                            .eq('id', variantId);
                    }
                }
            } catch (stockErr) {
                console.warn('[Checkout] Failed to update stock:', stockErr);
                // Continue — don't fail checkout for stock update issues
            }
        }

        // 4. Handle Bazcoins (Buyer Update)
        if (usedBazcoins > 0 || earnedBazcoins > 0) {
            const { data: buyer, error: fetchError } = await supabase
                .from('buyers')
                .select('bazcoins')
                .eq('id', userId)
                .single();

            if (fetchError) {
                console.error('[Checkout] Error fetching buyer for Bazcoins:', fetchError);
                throw new Error('Failed to fetch user profile for Bazcoins update');
            }

            const currentCoins = buyer?.bazcoins || 0;
            const newBalance = currentCoins - usedBazcoins + earnedBazcoins;

            const { error: updateError } = await supabase
                .from('buyers')
                .update({ bazcoins: newBalance })
                .eq('id', userId);

            if (updateError) {
                console.error('[Checkout] Error updating Bazcoins:', updateError);
                throw new Error('Failed to update Bazcoins balance');
            }

        }

        // 5. Clear checked-out items from cart
        const productIdsToRemove = items.map(i => i.id).filter(Boolean);
        if (productIdsToRemove.length > 0) {
            // Get cart for this user (simple query without expires_at filter)
            const { data: cart } = await supabase
                .from('carts')
                .select('id')
                .eq('buyer_id', userId)
                .maybeSingle();

            if (cart) {
                const { error: deleteError } = await supabase
                    .from('cart_items')
                    .delete()
                    .eq('cart_id', cart.id)
                    .in('product_id', productIdsToRemove);

                if (deleteError) {
                    console.warn('[Checkout] Failed to clear cart items:', deleteError.message);
                } else {
                    console.log('[Checkout] ✅ Cleared', productIdsToRemove.length, 'items from cart');
                }
            }
        }


        return {
            success: true,
            orderIds: createdOrderIds,
            orderUuids: createdOrderUuids
        };

    } catch (error: any) {
        console.error('[Checkout] \u274c Checkout processing failed:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
    }
};

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
 * Calls the `get-checkout-context` Edge Function which concurrently fetches
 * user addresses and seller metadata via Promise.all on the server, replacing
 * multiple waterfall requests with a single round-trip.
 */
export const getCheckoutContext = async (
    productIds: string[],
): Promise<CheckoutContextResult> => {
    const { data: { session } } = await supabase.auth.getSession();

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
};
