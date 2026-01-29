export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  images?: string[];
  rating: number;
  sold: number;
  seller: string;
  sellerId?: string;
  sellerRating: number;
  sellerVerified: boolean;
  isFreeShipping: boolean;
  isVerified: boolean;
  location: string;
  description?: string;
  category: string;
  stock?: number;
  reviews?: any[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  transactionId: string;
  items: CartItem[];
  total: number;
  shippingFee: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  isPaid: boolean;
  scheduledDate: string;
  deliveryDate?: string;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  createdAt: string;
  isGift?: boolean;
  isAnonymous?: boolean;
  recipientId?: string;
}

export interface ShippingAddress {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

export type ReturnStatus =
  | 'pending_review'
  | 'seller_response_required'
  | 'approved'
  | 'rejected'
  | 'item_returned'
  | 'refund_processing'
  | 'refunded'
  | 'escalated';

export type ReturnReason =
  | 'defective'
  | 'damaged'
  | 'incorrect'
  | 'not_as_described'
  | 'other';

export type ReturnType = 'refund_only' | 'return_refund' | 'replacement';

export interface ReturnRequest {
  id: string;
  orderId: string;
  userId: string;
  sellerId: string; // In case of multi-seller orders, returns might be per seller, but current Order structure seems to group items. Wait, Order has `items`, each item has `seller`. But the Order itself doesn't explicitly have `sellerId` at top level in the interface provided above, but the dummy data shows items have seller info. 
  // Looking at dummy data: items have 'seller' field. 
  // Let's assume an order can be mixed? 
  // The dummy data shows `items` array. 
  // Usually returns are per order or per item. The user flow says "Select Item(s)".
  items: {
    itemId: string;
    quantity: number;
  }[];
  reason: ReturnReason;
  description: string;
  images: string[];
  type: ReturnType;
  status: ReturnStatus;
  amount: number;
  createdAt: string;
  updatedAt: string;
  history: {
    status: ReturnStatus;
    timestamp: string;
    note?: string;
    by: 'buyer' | 'seller' | 'admin';
  }[];
}
