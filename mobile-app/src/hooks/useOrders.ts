import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useOrderStore } from '../stores/orderStore';
import type { Order } from '../types';

type BuyerUiStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'received' | 'returned' | 'cancelled' | 'reviewed';

function mapBuyerUiStatus(
  paymentStatus?: string | null,
  shipmentStatus?: string | null,
  hasCancellationRecord?: boolean,
  isReviewed?: boolean,
  hasReturnRequest?: boolean,
): BuyerUiStatus {
  if (hasReturnRequest) return 'returned';
  if (isReviewed) return 'reviewed';
  if (shipmentStatus === 'received') return 'received';
  if (shipmentStatus === 'delivered') return 'delivered';
  if (shipmentStatus === 'shipped' || shipmentStatus === 'out_for_delivery') return 'shipped';
  if (shipmentStatus === 'processing' || shipmentStatus === 'ready_to_ship') return 'confirmed';
  if (shipmentStatus === 'failed_to_deliver') return 'cancelled';
  if (shipmentStatus === 'returned') return hasCancellationRecord ? 'cancelled' : 'returned';
  if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') return hasCancellationRecord ? 'cancelled' : 'returned';
  return 'pending';
}

const ORDER_SELECT = `
  *,
  address:shipping_addresses!address_id (
    id, label, address_line_1, address_line_2, city, province, region, postal_code
  ),
  items:order_items (
    *,
    product:products (
      id, name, description, price, brand, is_free_shipping, seller_id,
      seller:sellers!products_seller_id_fkey (id, store_name, store_description, avatar_url),
      images:product_images (image_url, is_primary, sort_order)
    )
  ),
  reviews (*),
  cancellations:order_cancellations (id),
  vouchers:order_vouchers (*, voucher:vouchers (code, title, voucher_type)),
  return_requests:refund_return_periods (id, status, is_returnable, refund_date)
`;

function mapOrderRow(order: any, user: any): Order & { buyerUiStatus: BuyerUiStatus; isReviewed: boolean; returnRequestId?: string; review?: any } {
  const hasReviews = Array.isArray(order.reviews) && order.reviews.length > 0;
  const hasCancellationRecord =
    (Array.isArray(order.cancellations) && order.cancellations.length > 0) ||
    Boolean(order.cancellation_reason || order.cancelled_at);
  const hasReturnRequest = Array.isArray(order.return_requests) && order.return_requests.length > 0;
  const returnRequestId = hasReturnRequest ? order.return_requests[0].id : undefined;
  const buyerUiStatus = mapBuyerUiStatus(
    order.payment_status,
    order.shipment_status,
    hasCancellationRecord,
    hasReviews || Boolean(order.is_reviewed),
    hasReturnRequest,
  );

  const statusMap: Record<string, Order['status']> = {
    pending: 'pending', confirmed: 'processing', shipped: 'shipped',
    delivered: 'delivered', received: 'delivered', reviewed: 'delivered',
    returned: 'delivered', cancelled: 'cancelled',
  };
  const mappedStatus = statusMap[buyerUiStatus] || 'pending';

  const firstItem = order.items?.[0];
  const firstProduct = firstItem?.product || {};
  const productSeller = firstProduct.seller || {};
  const sellerName = productSeller.store_name || 'Shop';
  const sellerId = productSeller.id || firstProduct.seller_id;
  const linkedAddress = order.address || {};

  const items = (order.items || []).map((it: any) => {
    const p = it.product || {};
    const productImages = p.images || [];
    const primaryImg = productImages.find((img: any) => img.is_primary);
    const firstImg = productImages.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))[0];
    const image = it.primary_image_url || primaryImg?.image_url || firstImg?.image_url || '';
    const priceNum = typeof it.price === 'number' ? it.price
      : typeof it.unit_price === 'number' ? it.unit_price
      : typeof p.price === 'number' ? p.price : 0;
    const priceDiscount = typeof it.price_discount === 'number' ? it.price_discount : 0;
    const itemOriginalPrice = priceDiscount > 0 ? priceNum + priceDiscount : (typeof p.original_price === 'number' ? p.original_price : undefined);
    const itemSeller = p.seller || productSeller;

    const personalizedOptions = it.personalized_options || {};
    const selectedVariant = Object.keys(personalizedOptions).length > 0 ? {
      option1Label: personalizedOptions.option1Label,
      option1Value: personalizedOptions.option1Value,
      option2Label: personalizedOptions.option2Label,
      option2Value: personalizedOptions.option2Value,
      color: personalizedOptions.color,
      size: personalizedOptions.size,
      variantId: personalizedOptions.variantId || it.variant_id,
    } : it.selected_variant || null;

    return {
      id: it.id || `${order.id}_${it.product_id}`,
      productId: p.id || it.product_id,
      name: p.name || it.product_name || 'Product Unavailable',
      price: priceNum,
      originalPrice: itemOriginalPrice,
      image,
      images: productImages.map((img: any) => img.image_url),
      rating: typeof p.rating === 'number' ? p.rating : 0,
      sold: typeof p.sold === 'number' ? p.sold : 0,
      seller: itemSeller.store_name || sellerName,
      sellerId: itemSeller.id || sellerId,
      sellerInfo: itemSeller,
      sellerRating: itemSeller.rating || 0,
      sellerVerified: !!itemSeller.is_verified,
      isFreeShipping: !!p.is_free_shipping,
      isVerified: !!p.is_verified,
      location: 'Philippines',
      description: p.description || '',
      category: p.category || 'general',
      stock: typeof p.stock === 'number' ? p.stock : 0,
      reviews: p.reviews || [],
      quantity: it.quantity || 1,
      selectedVariant,
    };
  });

  const shippingFee = typeof order.shipping_cost === 'number'
    ? order.shipping_cost : parseFloat(order.shipping_cost || '0') || 0;

  const orderVouchers = order.vouchers || [];
  const voucherInfo = orderVouchers.length > 0 ? {
    code: orderVouchers[0].voucher?.code || 'VOUCHER',
    type: orderVouchers[0].voucher?.voucher_type || 'fixed',
    discountAmount: orderVouchers.reduce((sum: number, v: any) => sum + (v.discount_amount || 0), 0),
  } : null;

  const campaignDiscount = (order.items || []).reduce((sum: number, it: any) => {
    const pd = typeof it.price_discount === 'number' ? it.price_discount : 0;
    return sum + (pd * (it.quantity || 1));
  }, 0);

  const subtotal = items.reduce((sum: number, i: any) => sum + ((i.price || 0) * i.quantity), 0);
  const total = subtotal + shippingFee - (voucherInfo?.discountAmount || 0);

  const addressLine1 = linkedAddress.address_line_1 || '';
  const addressParts = addressLine1.split(', ');
  let addressName = user?.name || 'User';
  let addressPhone = '';
  let addressStreet = addressLine1;
  if (addressParts.length >= 2) {
    const possiblePhone = addressParts[1];
    if (/^\d{10,11}$/.test(possiblePhone?.replace(/\D/g, ''))) {
      addressName = addressParts[0] || addressName;
      addressPhone = possiblePhone;
      addressStreet = addressParts.slice(2).join(', ');
    }
  }

  return {
    id: order.order_number || order.id,
    orderId: order.id,
    transactionId: order.order_number || order.id,
    items,
    sellerInfo: productSeller,
    total,
    subtotal,
    shippingFee,
    discount: campaignDiscount + (voucherInfo?.discountAmount || 0),
    voucherInfo,
    campaignDiscounts: campaignDiscount > 0 ? [{
      campaignId: 'campaign', campaignName: 'Campaign Discount', discountAmount: campaignDiscount,
    }] : undefined,
    status: mappedStatus,
    isPaid: order.payment_status === 'paid',
    scheduledDate: new Date(order.created_at).toLocaleDateString(),
    deliveryDate: order.estimated_delivery_date || undefined,
    shippingAddress: {
      name: addressName,
      email: user?.email || '',
      phone: addressPhone,
      address: addressStreet,
      city: linkedAddress.city || '',
      region: linkedAddress.province || linkedAddress.region || '',
      postalCode: linkedAddress.postal_code || '',
    },
    paymentMethod: typeof order.payment_method === 'string'
      ? order.payment_method
      : ((order.payment_method as any)?.type === 'cod' ? 'Cash on Delivery'
        : (order.payment_method as any)?.type === 'gcash' ? 'GCash'
        : (order.payment_method as any)?.type === 'card' ? 'Card'
        : (order.payment_method as any)?.type === 'paymongo' ? 'PayMongo'
        : (order.payment_method as any)?.type || 'Cash on Delivery'),
    createdAt: order.created_at,
    buyerUiStatus,
    isReviewed: buyerUiStatus === 'reviewed',
    returnRequestId,
    review: order.reviews?.length > 0 ? order.reviews[0] : null,
  } as any;
}

/**
 * Encapsulates buyer order fetching, mapping, filtering, and status updates.
 * Centralizes the ~260-line Supabase query + mapping that was duplicated.
 */
export function useOrders() {
  const { user } = useAuthStore();
  const updateOrderStatus = useOrderStore((s) => s.updateOrderStatus);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) {
        console.error('[useOrders] load error:', error);
        setOrders([]);
        return;
      }

      setOrders((data || []).map((row: any) => mapOrderRow(row, user)));
    } catch (e) {
      console.error('[useOrders] unexpected error:', e);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const cancelOrder = useCallback(async (orderId: string, reason: string) => {
    const { orderMutationService } = await import('../services/orders/orderMutationService');
    await orderMutationService.cancelOrder({ orderId, reason, cancelledBy: user?.id });
    updateOrderStatus(orderId, 'cancelled');
    await loadOrders();
  }, [user?.id, updateOrderStatus, loadOrders]);

  const markAsReceived = useCallback(async (orderId: string) => {
    await supabase.from('orders').update({ shipment_status: 'received' }).eq('id', orderId);
    updateOrderStatus(orderId, 'delivered');
    await loadOrders();
  }, [updateOrderStatus, loadOrders]);

  return {
    orders,
    loading,
    refreshing,
    loadOrders,
    onRefresh,
    cancelOrder,
    markAsReceived,
    mapBuyerUiStatus,
  };
}
