import type { OrderTrackingSnapshot, SellerOrderSnapshot } from '@/types/orders';
import { buildPersonName, parseLegacyShippingAddressFromNotes } from '@/utils/orders/legacy';
import {
  mapNormalizedToSellerPaymentStatus,
  mapNormalizedToSellerUiStatus,
} from '@/utils/orders/status';
import { getLatestShipment } from '@/utils/orders/shipment';

const asNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  }

  if (value && typeof value === 'object') {
    const maybeName = (value as any).name || (value as any).full_name || (value as any).store_name;
    if (typeof maybeName === 'string' && maybeName.trim().length > 0) {
      return maybeName.trim();
    }
  }

  return fallback;
};

export const mapOrderRowToSellerSnapshot = (order: any): SellerOrderSnapshot => {
  const orderItems = Array.isArray(order?.order_items) ? order.order_items : [];
  const latestShipment = getLatestShipment(order?.shipments || []);
  const notesAddress = parseLegacyShippingAddressFromNotes(order?.notes);

  const recipient = order?.recipient || {};
  const shippingAddressJoin = order?.shipping_address || order?.address || {};
  const buyerProfile = order?.buyer_profile || null;

  const items = orderItems.map((item: any) => ({
    productId: String(item?.product_id || ''),
    productName: safeString(item?.product_name, 'Unknown Product'),
    image:
      item?.variant?.thumbnail_url ||
      item?.primary_image_url ||
      'https://placehold.co/100?text=Product',
    quantity: Math.max(1, asNumber(item?.quantity || 1)),
    price: asNumber(item?.variant?.price || item?.price || 0),
    selectedColor: item?.personalized_options?.color || item?.personalized_options?.variantLabel2,
    selectedSize: item?.personalized_options?.size || item?.personalized_options?.variantLabel1,
  }));

  const computedTotal = orderItems.reduce((sum: number, item: any) => {
    const itemPrice = asNumber(item?.price) - asNumber(item?.price_discount);
    const shippingPrice = asNumber(item?.shipping_price) - asNumber(item?.shipping_discount);
    return sum + itemPrice * Math.max(1, asNumber(item?.quantity || 1)) + shippingPrice;
  }, 0);
  const parsedTotal = asNumber(order?.total_amount);

  const recipientName =
    buildPersonName(recipient?.first_name, recipient?.last_name) ||
    buildPersonName(buyerProfile?.first_name, buyerProfile?.last_name) ||
    notesAddress?.fullName ||
    'Customer';

  const customerEmail =
    safeString(recipient?.email) || safeString(buyerProfile?.email) || safeString(order?.buyer_email);
  const customerPhone = safeString(recipient?.phone) || safeString(buyerProfile?.phone) || notesAddress?.phone || '';

  return {
    id: String(order?.id || ''),
    orderId: String(order?.order_number || order?.id || ''),
    orderNumber: safeString(order?.order_number),
    customerName: recipientName,
    customerEmail,
    customerPhone,
    shippingAddress: {
      fullName: recipientName,
      street:
        safeString(order?.shipping_street) ||
        safeString(shippingAddressJoin?.address_line_1) ||
        notesAddress?.street ||
        '',
      barangay:
        safeString(order?.shipping_barangay) ||
        safeString(shippingAddressJoin?.barangay) ||
        notesAddress?.barangay ||
        '',
      city:
        safeString(order?.shipping_city) ||
        safeString(shippingAddressJoin?.city) ||
        notesAddress?.city ||
        '',
      province:
        safeString(order?.shipping_province) ||
        safeString(shippingAddressJoin?.province) ||
        notesAddress?.province ||
        '',
      region:
        safeString(order?.shipping_region) ||
        safeString(shippingAddressJoin?.region) ||
        notesAddress?.region ||
        '',
      postalCode:
        safeString(order?.shipping_postal_code) ||
        safeString(shippingAddressJoin?.postal_code) ||
        notesAddress?.postalCode ||
        '',
      phone: customerPhone,
    },
    items,
    total: parsedTotal > 0 ? parsedTotal : computedTotal,
    status: mapNormalizedToSellerUiStatus(order?.payment_status, order?.shipment_status),
    paymentStatus: mapNormalizedToSellerPaymentStatus(order?.payment_status),
    trackingNumber: latestShipment?.tracking_number || safeString(order?.tracking_number) || undefined,
    createdAt: order?.created_at || new Date().toISOString(),
    type: order?.order_type === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
    posNote: safeString(order?.pos_note) || undefined,
    shipmentStatusRaw: order?.shipment_status || undefined,
    paymentStatusRaw: order?.payment_status || undefined,
    shippedAt: latestShipment?.shipped_at || order?.shipped_at || undefined,
    deliveredAt: latestShipment?.delivered_at || order?.delivered_at || undefined,
    buyerId: order?.buyer_id || null,
    sellerId: order?.seller_id || null,
  };
};

export const mapTrackingRowToSnapshot = (snapshot: any): OrderTrackingSnapshot | null => {
  if (!snapshot) return null;
  return snapshot as OrderTrackingSnapshot;
};
