/**
 * Database Types for Supabase Integration (Mobile App)
 * Ported essential types from web/src/types/database.types.ts
 */

// ============================================================================
// ENUMS
// ============================================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'reclassified';

// ============================================================================
// DATABASE TABLES
// ============================================================================

export interface Product {
  id: string;
  seller_id?: string;
  name?: string;
  description?: string | null;
  category?: string;
  category_id?: string | null;
  brand?: string | null;
  sku?: string | null;
  price?: number;
  original_price?: number | null;
  stock?: number;
  low_stock_threshold?: number;
  images?: string[];
  primary_image?: string | null;
  sizes?: string[];
  colors?: string[];
  variants?: ProductVariant[];
  specifications?: Record<string, unknown>;
  is_active?: boolean;
  approval_status?: ApprovalStatus;
  rejection_reason?: string | null;
  vendor_submitted_category?: string | null;
  admin_reclassified_category?: string | null;
  rating?: number;
  review_count?: number;
  sales_count?: number;
  view_count?: number;
  weight?: number | null;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  } | null;
  is_free_shipping?: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  sku?: string;
}

export type ProductWithSeller = Product & {
  seller?: {
    business_name: string;
    store_name: string;
    rating: number;
    business_address: string;
  };
};

// ============================================================================
// DATABASE TYPE FOR SUPABASE
// ============================================================================

export type UserType = 'buyer' | 'seller' | 'admin';

export interface Profile {
  id: string;
  email?: string;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  user_type?: UserType;
  last_login_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Seller {
  id: string;
  business_name: string;
  store_name: string;
  store_description?: string | null;
  store_category?: string[];
  business_type?: string | null;
  business_registration_number?: string | null;
  tax_id_number?: string | null;
  business_address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  bank_name?: string | null;
  account_name?: string | null;
  account_number?: string | null;
  is_verified?: boolean;
  approval_status?: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  rating?: number;
  total_sales?: number;
  join_date?: string;
  created_at?: string;
  updated_at?: string;
  profile?: Profile;
}

export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: Omit<Product, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Product, 'id' | 'created_at'>>;
      };
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      sellers: {
        Row: Seller;
        Insert: Omit<Seller, 'created_at' | 'updated_at' | 'join_date'>;
        Update: Partial<Omit<Seller, 'id' | 'created_at' | 'join_date'>>;
      };
      shop_followers: {
        Row: {
          id: string;
          buyer_id: string;
          seller_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          buyer_id: string;
          seller_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          buyer_id?: string;
          seller_id?: string;
          created_at?: string;
        };
      };
    };
  };
}
