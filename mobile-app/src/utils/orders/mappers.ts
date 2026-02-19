import type { OrderTrackingSnapshot, SellerOrderSnapshot } from '@/types/orders';
import { buildPersonName, parseLegacyShippingAddressFromNotes } from '@/utils/orders/legacy';
import {
  mapNormalizedToSellerPaymentStatus,
  mapNormalizedToSellerUiStatus,
} from '@/utils/orders/status';
import { getLatestShipment } from '@/utils/orders/shipment';

const isHttpUrl = (value: unknown): value is string =>
  typeof value === 'string' && /^https?:\/\//i.test(value.trim());

const mapReviewImages = (review: any): string[] => {
  if (!Array.isArray(review?.review_images)) {
    return [];
  }

  return review.review_images
    .slice()
    .sort((a: any, b: any) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0))
    .map((image: any) => (typeof image === 'string' ? image : image?.image_url))
    .filter(isHttpUrl);
};

const mapSellerOrderReviews = (order: any) => {
  const joinedReviews = Array.isArray(order?.reviews) ? order.reviews : [];

  return joinedReviews
    .filter((review: any) => Boolean(review) && review.is_hidden !== true)
    .map((review: any) => ({
      id: review.id,
      productId: review.product_id || null,
      rating: Number(review.rating || 0),
      comment: review.comment || '',
      images: mapReviewImages(review),
      submittedAt: new Date(
        review.created_at || review.updated_at || order.updated_at || order.created_at || Date.now(),
      ).toISOString(),
    }))
    .sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
};

export const mapOrderRowToSellerSnapshot = (order: any): SellerOrderSnapshot => {
  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
  const latestShipment = getLatestShipment(order.shipments || []);
  const notesAddress = parseLegacyShippingAddressFromNotes(order.notes);
  const shippingAddr = order.shipping_address || order.address || {};
  const recipient = order.recipient || {};

  const items = orderItems.map((item: any) => ({
    productId: item.product_id || '',
    productName: item.product_name || 'Unknown Product',
    quantity: Math.max(1, Number(item.quantity || 1)),
    price: parseFloat((item.variant?.price || item.price || 0).toString()),
    image: item.variant?.thumbnail_url || item.primary_image_url || 'https://placehold.co/100?text=Product',
    selectedVariantLabel1: item.personalized_options?.variantLabel1 || item.variant?.size || undefined,
    selectedVariantLabel2: item.personalized_options?.variantLabel2 || item.variant?.color || undefined,
    selectedColor: item.personalized_options?.variantLabel2 || item.variant?.color || undefined,
    selectedSize: item.personalized_options?.variantLabel1 || item.variant?.size || undefined,
  }));

  const recipientName =
    buildPersonName(recipient?.first_name, recipient?.last_name) ||
    order.buyer_name ||
    notesAddress?.fullName ||
    'Customer';

  const computedTotal = orderItems.reduce((sum: number, item: any) => {
    const itemPrice = (item.price || 0) - (item.price_discount || 0);
    const shippingPrice = (item.shipping_price || 0) - (item.shipping_discount || 0);
    return sum + itemPrice * (item.quantity || 0) + shippingPrice;
  }, 0);

  const parsedTotal = parseFloat(order.total_amount?.toString() || '0');
  const reviews = mapSellerOrderReviews(order);
  const latestReview = reviews[0];
  const legacyReviewImages = Array.isArray(order.review_images)
    ? order.review_images.filter(isHttpUrl)
    : [];
  const resolvedReviewImages =
    latestReview?.images && latestReview.images.length > 0
      ? latestReview.images
      : legacyReviewImages;

  return {
    id: order.id,
    seller_id: order.seller_id,
    buyer_id: order.buyer_id,
    orderNumber: order.order_number,
    buyerName: recipientName,
    buyerEmail: recipient?.email || order.buyer_email || 'unknown@example.com',
    items,
    total: Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : computedTotal,
    status: mapNormalizedToSellerUiStatus(order.payment_status, order.shipment_status),
    paymentStatus: mapNormalizedToSellerPaymentStatus(order.payment_status),
    paymentMethod: (order.payment_method?.type ||
      (order.order_type === 'OFFLINE' ? 'cash' : 'online')) as
      | 'cash'
      | 'card'
      | 'ewallet'
      | 'bank_transfer'
      | 'cod'
      | 'online',
    orderDate: order.created_at,
    shippingAddress: {
      fullName: recipientName,
      street: order.shipping_street || notesAddress?.street || shippingAddr.address_line_1 || '',
      city: order.shipping_city || notesAddress?.city || shippingAddr.city || '',
      province: order.shipping_province || notesAddress?.province || shippingAddr.province || '',
      postalCode: order.shipping_postal_code || notesAddress?.postalCode || shippingAddr.postal_code || '',
      phone: order.buyer_phone || notesAddress?.phone || recipient?.phone || '',
    },
    trackingNumber: latestShipment?.tracking_number || order.tracking_number || undefined,
    shipmentStatusRaw: order.shipment_status || undefined,
    paymentStatusRaw: order.payment_status || undefined,
    shippedAt: latestShipment?.shipped_at || order.shipped_at || undefined,
    deliveredAt: latestShipment?.delivered_at || order.delivered_at || undefined,
    rating:
      latestReview?.rating ||
      (typeof order.rating === 'number' ? order.rating : undefined),
    reviewComment: latestReview?.comment || order.review_comment || undefined,
    reviewImages: resolvedReviewImages.length > 0 ? resolvedReviewImages : undefined,
    reviewDate: latestReview?.submittedAt || order.review_date || undefined,
    reviews: reviews.length > 0 ? reviews : undefined,
    type: order.order_type === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
    posNote: order.pos_note || undefined,
    notes: order.notes || undefined,

    // Compatibility aliases.
    orderId: order.order_number || order.id,
    customerName: recipientName,
    customerEmail: recipient?.email || order.buyer_email || 'unknown@example.com',
    customerPhone: order.buyer_phone || notesAddress?.phone || recipient?.phone || '',
    createdAt: order.created_at,
    buyerId: order.buyer_id || null,
    sellerId: order.seller_id || null,
  };
};

export const mapTrackingRowToSnapshot = (snapshot: any): OrderTrackingSnapshot | null => {
  if (!snapshot) return null;
  return snapshot as OrderTrackingSnapshot;
};
