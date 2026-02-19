import type { PaymentStatus, ShipmentStatus } from '@/types/database.types';

export type BuyerUiStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'returned'
  | 'cancelled'
  | 'reviewed';

export type SellerUiStatus =
  | 'pending'
  | 'confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type SellerPaymentUiStatus = 'pending' | 'paid' | 'refunded';

export interface NormalizedShippingAddress {
  fullName: string;
  street: string;
  barangay?: string;
  city: string;
  province: string;
  region?: string;
  postalCode: string;
  phone: string;
}

export interface SellerOrderItemSnapshot {
  productId: string;
  productName: string;
  image: string;
  quantity: number;
  price: number;
  selectedVariantLabel1?: string;
  selectedVariantLabel2?: string;
  selectedColor?: string;
  selectedSize?: string;
}

export interface SellerOrderSnapshot {
  id: string;
  seller_id?: string;
  buyer_id?: string;
  orderNumber?: string;
  buyerName: string;
  buyerEmail: string;
  shippingAddress: NormalizedShippingAddress;
  items: SellerOrderItemSnapshot[];
  total: number;
  status: SellerUiStatus;
  paymentStatus: SellerPaymentUiStatus;
  paymentMethod?: 'cash' | 'card' | 'ewallet' | 'bank_transfer' | 'cod' | 'online';
  trackingNumber?: string;
  orderDate: string;
  type?: 'ONLINE' | 'OFFLINE';
  posNote?: string;
  shipmentStatusRaw?: ShipmentStatus;
  paymentStatusRaw?: PaymentStatus;
  shippedAt?: string;
  deliveredAt?: string;
  rating?: number;
  reviewComment?: string;
  reviewImages?: string[];
  reviewDate?: string;
  reviews?: {
    id: string;
    productId: string | null;
    rating: number;
    comment: string;
    images: string[];
    submittedAt: string;
  }[];
  notes?: string;

  // Compatibility aliases for existing mobile screens.
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt?: string;
  buyerId?: string | null;
  sellerId?: string | null;
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

export interface CreatePOSOrderInput {
  sellerId: string;
  sellerName: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
    selectedColor?: string;
    selectedSize?: string;
  }[];
  total: number;
  note?: string;
  buyerEmail?: string;
  paymentMethod?: 'cash' | 'card' | 'ewallet' | 'bank_transfer';
}

export interface POSOrderCreateResult {
  orderId: string;
  orderNumber: string;
  buyerLinked?: boolean;
}
