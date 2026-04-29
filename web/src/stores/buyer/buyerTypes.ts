/**
 * Buyer Store Types
 * Shared type definitions for the buyer store.
 */
import type { ActiveDiscount } from '@/types/discount';

export interface Message {
  id: string;
  senderId: string;
  text: string;
  images?: string[];
  timestamp: string;
  isRead: boolean;
}

// Registry Product Extension
export type RegistryPrivacy = 'public' | 'link' | 'private';

export interface RegistryDeliveryPreference {
  addressId?: string;
  showAddress: boolean;
  instructions?: string;
  recipientName?: string;
  recipientPhone?: string;
  city?: string;
  province?: string;
}

export interface RegistryProduct extends Product {
  sourceProductId?: string;
  requestedQty: number;
  receivedQty: number;
  note?: string;
  isMostWanted?: boolean;
  selectedVariant?: ProductVariant; // snapshot of the chosen variant
  delivery?: RegistryDeliveryPreference; // item-level override if ever needed
  status?: 'available' | 'out_of_stock' | 'seller_on_vacation' | 'restricted' | 'deleted';
}

export interface RegistryItem {
  id: string;
  title: string;
  recipientName?: string;
  sharedDate: string;
  imageUrl: string;
  category?: string;
  products?: RegistryProduct[];
  privacy?: RegistryPrivacy;
  delivery?: RegistryDeliveryPreference;
}

export interface Conversation {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerImage?: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  messages: Message[];
  isOnline: boolean;
}

export interface Seller {
  id: string;
  name: string;
  avatar: string;
  contactNumber?: string;
  rating: number;
  totalReviews: number;
  followers: number;
  isVerified: boolean;
  description: string;
  location: string;
  established: string;
  tierLevel?: string;
  products: Product[];
  badges: string[];
  responseTime: string;
  categories: string[];
}

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  stock: number;
  image: string;
  images: string[];
  seller: Seller;
  sellerId: string;
  rating: number;
  totalReviews: number;
  category: string;
  sold: number;
  isFreeShipping: boolean;
  location: string;
  description: string;
  specifications: Record<string, string>;
  variants: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  thumbnail_url?: string;
  size?: string;
  color?: string;
  option_1_value?: string;
  option_2_value?: string;
  attributes?: Record<string, string>; // optional snapshot of variant options (color/size)
}

export interface CartItem extends Product {
  cartItemId?: string;
  quantity: number;
  selectedVariant?: ProductVariant;
  notes?: string;
  selected?: boolean;
  registryId?: string;
  createdAt?: string;
  // Added for BX-06 OrdersPage UI mapping compatibility:
  warranty?: any;
  orderItemId?: string;
  durationMonths?: number;
}

export interface GroupedCart {
  [sellerId: string]: {
    seller: Seller;
    items: CartItem[];
    subtotal: number;
    shippingFee: number;
    freeShippingEligible: boolean;
  };
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'shipping';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  sellerId?: string; // null for platform vouchers
  validFrom: Date;
  validTo: Date;
  usageLimit: number;
  used: number;
  isActive: boolean;
}

export type VoucherValidationErrorCode =
  | 'NOT_FOUND'
  | 'INACTIVE'
  | 'NOT_STARTED'
  | 'EXPIRED'
  | 'MIN_ORDER_NOT_MET'
  | 'SELLER_MISMATCH'
  | 'ALREADY_USED'
  | 'UNKNOWN';

export interface VoucherValidationResult {
  voucher: Voucher | null;
  errorCode: VoucherValidationErrorCode | null;
}

export interface Review {
  id: string;
  productId: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  rating: number;
  comment: string;
  images: string[];
  helpful: number;
  reply?: {
    sellerId: string;
    sellerName: string;
    comment: string;
    date: Date;
  };
  date: Date;
  verified: boolean;
}

export interface Address {
  lastName: string;
  firstName: string;
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  region: string;
  postalCode: string;
  country?: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  landmark?: string;
  deliveryInstructions?: string;
}

export interface BuyerProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatar: string;
  birthdate?: Date;
  gender?: 'male' | 'female' | 'other';
  preferences: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    privacy: {
      showProfile: boolean;
      showPurchases: boolean;
      showFollowing: boolean;
    };
    interestedCategories?: string[];
  };
  memberSince: Date;
  totalOrders: number;
  totalSpent: number;
  bazcoins: number;
  paymentMethods?: PaymentMethod[];
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet';
  brand: string; // Visa, MasterCard, GCash, Maya, etc.
  last4?: string; // For cards
  expiry?: string; // For cards
  accountNumber?: string; // For wallets (masked)
  isDefault: boolean;
}
