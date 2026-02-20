import type { PaymentStatus, ShipmentStatus } from "@/types/database.types";

export type OrderUiStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned"
  | "reviewed";

export interface NormalizedShippingAddress {
  fullName: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
}

export interface BuyerOrderItemSnapshot {
  id: string;
  orderItemId?: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  seller: string;
  sellerId?: string | null;
  variant?: {
    id?: string;
    name?: string;
    size?: string;
    color?: string;
    sku?: string;
  };
  rating?: number;
  category?: string;
  variantDisplay?: string | null;
  selectedVariant?: {
    id?: string;
    name?: string;
    size?: string;
    color?: string;
  } | null;
}

export interface OrderReviewSnapshot {
  id: string;
  productId: string | null;
  rating: number;
  comment: string;
  images: string[];
  submittedAt: Date;
}

export interface SellerOrderReviewSnapshot {
  id: string;
  productId: string | null;
  rating: number;
  comment: string;
  images: string[];
  submittedAt: string;
}

export interface BuyerOrderSnapshot {
  id: string;
  dbId: string;
  orderNumber?: string | null;
  createdAt: Date;
  date: string;
  status: OrderUiStatus;
  isPaid: boolean;
  paymentStatus?: PaymentStatus | null;
  shipmentStatus?: ShipmentStatus | null;
  total: number;
  estimatedDelivery: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  deliveryDate?: Date;
  items: BuyerOrderItemSnapshot[];
  shippingAddress: NormalizedShippingAddress;
  paymentMethod: {
    type: "card" | "gcash" | "paymaya" | "cod";
    details?: string;
  };
  trackingNumber?: string;
  storeName?: string;
  sellerId?: string | null;
  order_type?: "ONLINE" | "OFFLINE";
  review?: OrderReviewSnapshot;
  reviews?: OrderReviewSnapshot[];
  pricing?: {
    subtotal: number;
    shipping: number;
    tax?: number;
    campaignDiscount: number;
    voucherDiscount: number;
    bazcoinDiscount?: number;
    total: number;
  };
}

export interface SellerOrderItemSnapshot {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  selectedVariantLabel1?: string;
  selectedVariantLabel2?: string;
}

export interface SellerOrderSnapshot {
  id: string;
  seller_id?: string;
  buyer_id?: string;
  orderNumber?: string;
  buyerName: string;
  buyerEmail: string;
  items: SellerOrderItemSnapshot[];
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "pending" | "paid" | "refunded";
  orderDate: string;
  shippingAddress: NormalizedShippingAddress;
  trackingNumber?: string;
  shipmentStatusRaw?: ShipmentStatus;
  paymentStatusRaw?: PaymentStatus;
  shippedAt?: string;
  deliveredAt?: string;
  rating?: number;
  reviewComment?: string;
  reviewImages?: string[];
  reviewDate?: string;
  reviews?: SellerOrderReviewSnapshot[];
  type?: "ONLINE" | "OFFLINE";
  posNote?: string;
  notes?: string;
}

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

export interface OrderDetailSnapshot {
  order: BuyerOrderSnapshot;
  buyer_id?: string;
  is_reviewed?: boolean;
  shipping_cost?: number;
  sellerId: string | null;
  storeName: string;
}
