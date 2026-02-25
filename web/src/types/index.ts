/**
 * Legacy types for existing components
 * These will be gradually migrated to use database types from database.types.ts
 * 
 * Import database types with:
 * import type { Product, Order, etc. } from '@/types/database.types';
 */

// Re-export database types for convenience
export type {
  // User Types
  Profile,
  Buyer,
  Seller,
  Admin,
  UserType,
  
  // Product Types
  Product,
  ProductVariant,
  ProductQA,
  ApprovalStatus,
  
  // Order Types
  Order,
  OrderItem,
  OrderStatus,
  OrderType,
  PaymentStatus,
  
  // Cart Types
  Cart,
  CartItem,
  
  // Review & Rating
  Review,
  
  // Vouchers
  Voucher,
  VoucherUsage,
  VoucherType,
  
  // Inventory
  InventoryLedger,
  LowStockAlert,
  
  // Notifications
  Notification,
  NotificationType,
  NotificationPriority,
  
  // Categories & Addresses
  Category,
  Address,
  
  // Helper Types
  ShippingAddress,
  ShippingMethod,
  PaymentMethod,
  
  // Database Type
  Database,
} from './database.types';

// Legacy interfaces for backward compatibility
// TODO: Gradually remove these as components are migrated

export interface Store {
  id: string;
  name: string;
  logo: string;
  avatar: string;
  banner: string;
  rating: number;
  followers: number;
  products: number;
  totalReviews: number;
  isVerified: boolean;
  description: string;
  location: string;
  categories: string[];
  badges: string[];
}

export interface Collection {
  id: string;
  title: string;
  name: string;
  image: string;
  productCount: number;
  description: string;
  rating: number;
  badge?: 'trending' | 'new' | 'popular';
}