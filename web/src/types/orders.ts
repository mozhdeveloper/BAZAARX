import type { PaymentStatus, ShipmentStatus } from "@/types/database.types";

export type OrderUiStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "received"
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
  productId?: string;
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
  sellerReply?: { message: string; repliedAt: string | null } | null;
}

export interface BuyerReturnRequestSnapshot {
  id: string;
  reason: string;
  solution: string;
  comments: string;
  files: File[];
  refundAmount: number;
  submittedAt: Date;
  status: 'pending' | 'seller_review' | 'counter_offered' | 'approved' | 'rejected' | 'escalated' | 'return_in_transit' | 'return_received' | 'refunded';
  resolvedBy?: string;
  rejectedReason?: string | null;
  description?: string | null;
  evidenceUrls?: string[];
  sellerNote?: string | null;
  type?: string;
  resolutionPath?: string;
  sellerDeadline?: string;
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
  confirmedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  deliveryDate?: Date;
  cancelledAt?: Date;
  receivedAt?: Date;
  updatedAt?: Date;
  items: BuyerOrderItemSnapshot[];
  shippingAddress: NormalizedShippingAddress;
  paymentMethod: {
    type: "card" | "gcash" | "maya" | "paymaya" | "grab_pay" | "cod";
    details?: string;
  };
  trackingNumber?: string;
  storeName?: string;
  sellerId?: string | null;
  order_type?: "ONLINE" | "OFFLINE";
  returnRequest?: BuyerReturnRequestSnapshot;
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
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" | "returned" | "reviewed";
  paymentStatus: "pending" | "paid" | "refunded";
  paymentMethod?: "cash" | "card" | "ewallet" | "bank_transfer" | "cod" | "online";
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
