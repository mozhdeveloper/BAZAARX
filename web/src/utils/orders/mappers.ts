import type {
  BuyerOrderSnapshot,
  OrderDetailSnapshot,
  OrderReviewSnapshot,
  OrderTrackingSnapshot,
  SellerOrderReviewSnapshot,
  SellerOrderSnapshot,
} from "@/types/orders";
import {
  buildPersonName,
  parseLegacyPricingSummaryFromNotes,
  parseLegacyShippingAddressFromNotes,
} from "@/utils/orders/legacy";
import {
  mapNormalizedToBuyerUiStatus,
  mapNormalizedToSellerPaymentStatus,
  mapNormalizedToSellerUiStatus,
} from "@/utils/orders/status";
import { getLatestCancellation, getLatestShipment } from "@/utils/orders/shipment";

const mapOrderItems = (orderItems: any[], fallbackStoreName: string, fallbackSellerId: string | null) =>
  orderItems.map((item: any) => {
    const variantData = item.variant;
    const personalized = (item.personalized_options || {}) as Record<string, string | undefined>;
    const variantLabel1 = personalized.variantLabel1 || variantData?.size;
    const variantLabel2 = personalized.variantLabel2 || variantData?.color;
    const variantParts = [];

    if (variantData?.variant_name) {
      variantParts.push(variantData.variant_name);
    }
    if (variantLabel1) {
      variantParts.push(`Size: ${variantLabel1}`);
    }
    if (variantLabel2) {
      variantParts.push(`Color: ${variantLabel2}`);
    }

    const basePrice = Number(item.price || variantData?.price || 0);
    const discountPerUnit = Number(item.price_discount || 0);
    const effectivePrice = Math.max(0, basePrice - discountPerUnit);

    return {
      id: item.product_id || item.id,
      orderItemId: item.id,
      name: item.product?.name || item.product_name,
      image: variantData?.thumbnail_url || item.primary_image_url || "https://placehold.co/100?text=Product",
      price: effectivePrice,
      originalPrice: discountPerUnit > 0 ? basePrice : undefined,
      quantity: Number(item.quantity || 1),
      seller: item.seller_name || fallbackStoreName,
      sellerId: item.seller_id || fallbackSellerId,
      variant: variantData
        ? {
          id: variantData.id,
          name: variantData.variant_name,
          size: variantData.size,
          color: variantData.color,
          sku: variantData.sku,
        }
        : undefined,
      selectedVariant: variantData
        ? {
          id: variantData.id,
          name: variantData.variant_name,
          size: variantData.size,
          color: variantData.color,
        }
        : null,
      variantDisplay: variantParts.length > 0 ? variantParts.join(" | ") : null,
      rating: 5,
      category: "General",
    };
  });

const isHttpUrl = (value: unknown): value is string =>
  typeof value === "string" && /^https?:\/\//i.test(value.trim());

const mapReviewImages = (review: any): string[] => {
  if (!Array.isArray(review?.review_images)) {
    return [];
  }

  return review.review_images
    .slice()
    .sort((a: any, b: any) => Number(a?.sort_order || 0) - Number(b?.sort_order || 0))
    .map((image: any) => (typeof image === "string" ? image : image?.image_url))
    .filter(isHttpUrl);
};

const mapOrderReviews = (order: any): OrderReviewSnapshot[] => {
  const joinedReviews = Array.isArray(order?.reviews) ? order.reviews : [];

  const normalized = joinedReviews
    .filter((review: any) => Boolean(review) && review.is_hidden !== true)
    .map((review: any) => {
      const submittedAt = new Date(
        review.created_at || review.updated_at || order.updated_at || order.created_at || Date.now(),
      );

      return {
        id: review.id,
        productId: review.product_id || null,
        rating: Number(review.rating || 0),
        comment: review.comment || "",
        images: mapReviewImages(review),
        submittedAt,
      } satisfies OrderReviewSnapshot;
    })
    .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

  if (normalized.length > 0) {
    return normalized;
  }

  if (!order?.is_reviewed) {
    return [];
  }

  return [
    {
      id: `legacy-${order.id || order.order_number || "review"}`,
      productId: null,
      rating: Number(order.rating || 5),
      comment: order.review_comment || "",
      images: Array.isArray(order.review_images)
        ? order.review_images.filter(isHttpUrl)
        : [],
      submittedAt: new Date(order.review_date || order.updated_at || order.created_at || Date.now()),
    },
  ];
};

const mapSellerOrderReviews = (order: any): SellerOrderReviewSnapshot[] => {
  return mapOrderReviews(order).map((review) => ({
    id: review.id,
    productId: review.productId,
    rating: review.rating,
    comment: review.comment,
    images: review.images,
    submittedAt: review.submittedAt.toISOString(),
  }));
};

export const mapOrderRowToBuyerSnapshot = (order: any): BuyerOrderSnapshot => {
  const notesAddress = parseLegacyShippingAddressFromNotes(order.notes);
  const notesPricing = parseLegacyPricingSummaryFromNotes(order.notes);
  const recipient = order.recipient || {};
  const shippingAddressJoin = order.shipping_address || order.address || {};
  const createdAt = new Date(order.created_at);
  const shippedAt = order.shipped_at ? new Date(order.shipped_at) : undefined;
  const deliveredAt = order.delivered_at ? new Date(order.delivered_at) : undefined;

  const rawItems = Array.isArray(order.order_items) ? order.order_items : [];
  const fallbackStoreName =
    order.store_name || rawItems.find((item: any) => item?.seller_name)?.seller_name || "Unknown Store";
  const fallbackSellerId =
    order.seller_id || rawItems.find((item: any) => item?.seller_id)?.seller_id || null;

  const items = mapOrderItems(rawItems, fallbackStoreName, fallbackSellerId);
  const reviews = mapOrderReviews(order);
  const latestReview = reviews[0];

  const orderDiscountRows = Array.isArray(order.order_discounts) ? order.order_discounts : [];
  const orderVoucherRows = Array.isArray(order.order_vouchers) ? order.order_vouchers : [];

  const subtotalBeforeDiscount = rawItems.reduce((sum: number, item: any) => {
    const basePrice = Number(item.price || 0);
    const quantity = Number(item.quantity || 0);
    return sum + (basePrice * quantity);
  }, 0);

  const campaignDiscountFromItems = rawItems.reduce((sum: number, item: any) => {
    const discountPerUnit = Number(item.price_discount || 0);
    const quantity = Number(item.quantity || 0);
    return sum + (discountPerUnit * quantity);
  }, 0);

  const campaignDiscountFromOrder = orderDiscountRows.reduce((sum: number, row: any) => {
    return sum + Number(row?.discount_amount || 0);
  }, 0);

  const campaignDiscountTotal =
    campaignDiscountFromOrder > 0 ? campaignDiscountFromOrder : campaignDiscountFromItems;

  const voucherDiscountTotal = orderVoucherRows.reduce((sum: number, row: any) => {
    return sum + Number(row?.discount_amount || 0);
  }, 0);

  const shippingTotal = rawItems.reduce((sum: number, item: any) => {
    const shippingPrice = Number(item.shipping_price || 0);
    const shippingDiscount = Number(item.shipping_discount || 0);
    return sum + Math.max(0, shippingPrice - shippingDiscount);
  }, 0);

  const computedTotal = rawItems.reduce((sum: number, item: any) => {
    const basePrice = Number(item.price || 0);
    const discountPerUnit = Number(item.price_discount || 0);
    const shippingPrice = Number(item.shipping_price || 0);
    const shippingDiscount = Number(item.shipping_discount || 0);
    const quantity = Number(item.quantity || 0);

    const effectiveItemPrice = Math.max(0, basePrice - discountPerUnit);
    const effectiveShipping = Math.max(0, shippingPrice - shippingDiscount);
    return sum + (effectiveItemPrice * quantity) + effectiveShipping;
  }, 0);
  const totalBeforeFallback = Math.max(
    0,
    subtotalBeforeDiscount - campaignDiscountTotal - voucherDiscountTotal + shippingTotal,
  );
  const numericTotal = Number(order.total_amount || 0);
  const resolvedTotal =
    notesPricing?.total != null
      ? Number(notesPricing.total)
      : numericTotal > 0
        ? numericTotal
        : (computedTotal > 0 ? computedTotal - voucherDiscountTotal : totalBeforeFallback);

  return {
    id: order.order_number || order.id,
    dbId: order.id,
    orderNumber: order.order_number,
    createdAt,
    date: createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    status: mapNormalizedToBuyerUiStatus(
      order.payment_status,
      order.shipment_status,
      Boolean(order.cancellation_reason || order.cancelled_at),
      reviews.length > 0,
    ),
    isPaid: order.payment_status === "paid",
    paymentStatus: order.payment_status,
    shipmentStatus: order.shipment_status,
    total: Math.max(0, resolvedTotal),
    estimatedDelivery:
      deliveredAt ||
      (shippedAt
        ? new Date(shippedAt.getTime() + 2 * 24 * 60 * 60 * 1000)
        : new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000)),
    shippedAt,
    deliveredAt,
    deliveryDate: deliveredAt,
    items,
    shippingAddress: {
      fullName:
        order.buyer_name ||
        buildPersonName(recipient?.first_name, recipient?.last_name) ||
        notesAddress?.fullName ||
        "Customer",
      street:
        order.shipping_street ||
        shippingAddressJoin.address_line_1 ||
        notesAddress?.street ||
        "",
      city: order.shipping_city || shippingAddressJoin.city || notesAddress?.city || "",
      province:
        order.shipping_province ||
        shippingAddressJoin.province ||
        notesAddress?.province ||
        "",
      postalCode:
        order.shipping_postal_code ||
        shippingAddressJoin.postal_code ||
        notesAddress?.postalCode ||
        "",
      phone:
        order.buyer_phone ||
        recipient?.phone ||
        notesAddress?.phone ||
        "",
    },
    paymentMethod: {
      type: "cod",
      details: "",
    },
    trackingNumber: order.tracking_number || undefined,
    storeName: fallbackStoreName,
    sellerId: fallbackSellerId,
    order_type: order.order_type,
    review: latestReview,
    reviews: reviews.length > 0 ? reviews : undefined,
    pricing: {
      subtotal:
        notesPricing?.subtotal != null ? Number(notesPricing.subtotal) : subtotalBeforeDiscount,
      shipping:
        notesPricing?.shipping != null ? Number(notesPricing.shipping) : shippingTotal,
      tax:
        notesPricing?.tax != null ? Number(notesPricing.tax) : undefined,
      campaignDiscount:
        notesPricing?.campaignDiscount != null
          ? Number(notesPricing.campaignDiscount)
          : campaignDiscountTotal,
      voucherDiscount:
        notesPricing?.voucherDiscount != null
          ? Number(notesPricing.voucherDiscount)
          : voucherDiscountTotal,
      bazcoinDiscount:
        notesPricing?.bazcoinDiscount != null
          ? Number(notesPricing.bazcoinDiscount)
          : undefined,
      total: Math.max(0, resolvedTotal),
    },
  };
};

export const mapOrderRowToSellerSnapshot = (order: any): SellerOrderSnapshot => {
  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
  const latestShipment = getLatestShipment(order.shipments || []);
  const notesAddress = parseLegacyShippingAddressFromNotes(order.notes);
  const shippingAddr = order.shipping_address || order.address || {};
  const recipient = order.recipient || {};

  const items = orderItems.map((item: any) => ({
    productId: item.product_id || "",
    productName: item.product_name || "Unknown Product",
    quantity: Math.max(1, Number(item.quantity || 1)),
    price: parseFloat((item.variant?.price || item.price || 0).toString()),
    image: item.variant?.thumbnail_url || item.primary_image_url || "https://placehold.co/100?text=Product",
    selectedVariantLabel1: item.personalized_options?.variantLabel1 || item.variant?.size || undefined,
    selectedVariantLabel2: item.personalized_options?.variantLabel2 || item.variant?.color || undefined,
  }));

  const recipientName =
    buildPersonName(recipient?.first_name, recipient?.last_name) ||
    order.buyer_name ||
    notesAddress?.fullName ||
    "Customer";

  const computedTotal = orderItems.reduce((sum: number, item: any) => {
    const itemPrice = (item.price || 0) - (item.price_discount || 0);
    const shippingPrice = (item.shipping_price || 0) - (item.shipping_discount || 0);
    return sum + itemPrice * (item.quantity || 0) + shippingPrice;
  }, 0);

  const parsedTotal = parseFloat(order.total_amount?.toString() || "0");
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
    buyerEmail: recipient?.email || order.buyer_email || "unknown@example.com",
    items,
    total: Number.isFinite(parsedTotal) && parsedTotal > 0 ? parsedTotal : computedTotal,
    status: mapNormalizedToSellerUiStatus(order.payment_status, order.shipment_status),
    paymentStatus: mapNormalizedToSellerPaymentStatus(order.payment_status),
    orderDate: order.created_at,
    shippingAddress: {
      fullName: recipientName,
      street: order.shipping_street || notesAddress?.street || shippingAddr.address_line_1 || "",
      city: order.shipping_city || notesAddress?.city || shippingAddr.city || "",
      province: order.shipping_province || notesAddress?.province || shippingAddr.province || "",
      postalCode: order.shipping_postal_code || notesAddress?.postalCode || shippingAddr.postal_code || "",
      phone: order.buyer_phone || notesAddress?.phone || recipient?.phone || "",
    },
    trackingNumber: latestShipment?.tracking_number || order.tracking_number || undefined,
    shipmentStatusRaw: order.shipment_status || undefined,
    paymentStatusRaw: order.payment_status || undefined,
    shippedAt: latestShipment?.shipped_at || order.shipped_at || undefined,
    deliveredAt: latestShipment?.delivered_at || order.delivered_at || undefined,
    rating:
      latestReview?.rating ||
      (typeof order.rating === "number" ? order.rating : undefined),
    reviewComment: latestReview?.comment || order.review_comment || undefined,
    reviewImages: resolvedReviewImages.length > 0 ? resolvedReviewImages : undefined,
    reviewDate: latestReview?.submittedAt || order.review_date || undefined,
    reviews: reviews.length > 0 ? reviews : undefined,
    type: order.order_type === "OFFLINE" ? "OFFLINE" : "ONLINE",
    posNote: order.pos_note || undefined,
    notes: order.notes || undefined,
    // Payment method - derive from order_payments or default based on order type
    paymentMethod: order.payment_method?.type ||
      (order.order_type === "OFFLINE" ? "cash" : "online") as "cash" | "card" | "ewallet" | "bank_transfer" | "cod" | "online",
  };
};

export const mapOrderRowToOrderDetailSnapshot = (orderData: any): OrderDetailSnapshot => {
  const latestShipment = getLatestShipment(orderData.shipments || []);
  const latestCancellation = getLatestCancellation(orderData.cancellations || []);

  const normalizedRow = {
    ...orderData,
    shipped_at: latestShipment?.shipped_at || orderData.shipped_at || null,
    delivered_at: latestShipment?.delivered_at || orderData.delivered_at || null,
    tracking_number: latestShipment?.tracking_number || orderData.tracking_number || null,
    cancellation_reason: latestCancellation?.reason || null,
    cancelled_at: latestCancellation?.cancelled_at || null,
  };

  const buyerSnapshot = mapOrderRowToBuyerSnapshot(normalizedRow);

  return {
    order: {
      ...buyerSnapshot,
      id: orderData.id,
      dbId: orderData.id,
    },
    buyer_id: orderData.buyer_id,
    is_reviewed: Boolean(
      buyerSnapshot.review ||
      (Array.isArray(buyerSnapshot.reviews) && buyerSnapshot.reviews.length > 0),
    ),
    shipping_cost: Number(orderData.shipping_cost || 0),
    sellerId: orderData.seller_id || null,
    storeName: orderData.store_name || "Seller",
  };
};

export const mapTrackingSnapshot = (snapshot: any): OrderTrackingSnapshot | null => {
  if (!snapshot) return null;
  return snapshot as OrderTrackingSnapshot;
};
