export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  sold: number;
  seller: string;
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
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'canceled';
  isPaid: boolean;
  scheduledDate: string;
  deliveryDate?: string;
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  createdAt: string;
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
