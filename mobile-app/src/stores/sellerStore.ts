import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProductQAStore } from './productQAStore';
import { useOrderStore as useOrderStoreExternal } from './orderStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { productService } from '@/services/productService';
import { orderService } from '@/services/orderService';
import type { Seller as DBSeller, Database, Order, OrderItem } from '@/types/database.types';

// Types - Matches normalized database schema (February 2026)
interface Seller {
  // Core seller info (from sellers table)
  id: string;
  store_name: string;
  store_description: string;
  owner_name: string;
  avatar_url?: string;
  approval_status: 'pending' | 'verified' | 'rejected';
  verified_at?: string;
  created_at?: string;

  // Legacy fields for backward compatibility
  email?: string;
  phone?: string;
  rating?: number;
  totalSales?: number;
  storeCategory?: string[];

  // Nested business profile (from seller_business_profiles table)
  business_profile?: {
    business_type?: string;
    business_registration_number?: string;
    tax_id_number?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  };

  // Nested payout account (from seller_payout_accounts table)
  payout_account?: {
    bank_name?: string;
    account_name?: string;
    account_number?: string;
  };

  // Nested verification documents (from seller_verification_documents table)
  verification_documents?: {
    business_permit_url?: string;
    valid_id_url?: string;
    proof_of_address_url?: string;
    dti_registration_url?: string;
    tax_id_url?: string;
  };
}

export interface SellerProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  images: string[];
  sizes?: string[];
  colors?: string[];
  isActive: boolean;
  sellerId?: string;
  createdAt: string;
  updatedAt: string;
  sales: number;
  rating: number;
  reviews: number;
  approval_status?: 'pending' | 'approved' | 'rejected' | 'reclassified';
  rejectionReason?: string;
  vendorSubmittedCategory?: string;
  adminReclassifiedCategory?: string;
  sellerName?: string;
  sellerRating?: number;
  sellerLocation?: string;
}

interface SellerOrder {
  id: string;
  seller_id?: string; // UUID of the seller for database updates
  buyer_id?: string; // UUID of the buyer for notifications
  buyerName: string;
  buyerEmail: string;
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
  // Status aligned with Order Management UI: pending, to-ship, completed, cancelled
  status: 'pending' | 'to-ship' | 'completed' | 'cancelled' | 'confirmed' | 'shipped' | 'delivered';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  orderDate: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  trackingNumber?: string;
  rating?: number; // 1-5 stars from buyer after delivery
  reviewComment?: string;
  reviewImages?: string[];
  reviewDate?: string;
  type?: 'ONLINE' | 'OFFLINE'; // POS-Lite: Track order source
  posNote?: string; // POS-Lite: Optional note for offline sales
}

// Inventory Ledger - Immutable audit trail for all stock changes
interface InventoryLedgerEntry {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  changeType: 'DEDUCTION' | 'ADDITION' | 'ADJUSTMENT' | 'RESERVATION' | 'RELEASE';
  quantityBefore: number;
  quantityChange: number;
  quantityAfter: number;
  reason: 'ONLINE_SALE' | 'OFFLINE_SALE' | 'MANUAL_ADJUSTMENT' | 'STOCK_REPLENISHMENT' | 'ORDER_CANCELLATION' | 'RESERVATION';
  referenceId: string; // Order ID or adjustment ID
  userId: string; // Seller ID or 'SYSTEM'
  notes?: string;
}

// Low Stock Alert
interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
}

interface SellerStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  avgRating: number;
  monthlyRevenue: { month: string; revenue: number; value?: number; date?: string }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  recentActivity: {
    id: string;
    type: 'order' | 'product' | 'review';
    message: string;
    time: string;
  }[];
  revenueData?: { month: string; revenue: number; value?: number; date?: string }[];
  categorySales?: { category: string; sales: number; value?: number; color?: string }[];
  revenueChange?: number;
  ordersChange?: number;
  totalVisits?: number;
  visitsChange?: number;
}

interface AuthStore {
  seller: Seller | null;
  user: any;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (sellerData: Partial<Seller> & { email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<Seller>) => void;
  updateSellerDetails: (details: Partial<Seller>) => void;
  updateSellerInfo: (info: Partial<Seller>) => void;
  authenticateSeller: () => void;
  createBuyerAccount: () => Promise<boolean>;
  addRole: (role: string) => void;
  switchRole: (role: 'buyer' | 'seller') => void;
  setUser: (user: any) => void;
}

interface ProductStore {
  products: SellerProduct[];
  loading: boolean;
  error: string | null;
  inventoryLedger: InventoryLedgerEntry[];
  lowStockAlerts: LowStockAlert[];
  fetchProducts: (filters?: {
    category?: string;
    sellerId?: string;
    isActive?: boolean;
    approvalStatus?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }) => Promise<void>;
  addProduct: (product: Omit<SellerProduct, 'id' | 'createdAt' | 'updatedAt' | 'sales' | 'rating' | 'reviews'>) => Promise<string>;
  toggleProductStatus: (id: string) => Promise<void>;
  bulkAddProducts: (products: Array<{ name: string; description: string; price: number; originalPrice?: number; stock: number; category: string; imageUrl: string }>) => void;
  updateProduct: (id: string, updates: Partial<SellerProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProduct: (id: string) => SellerProduct | undefined;
  getProductById: (id: string) => SellerProduct | undefined;
  searchProducts: (query: string) => SellerProduct[];
  getProductsByCategory: (category: string) => SellerProduct[];
  addInventoryEntry: (entry: Omit<InventoryLedgerEntry, 'id' | 'timestamp'>) => void;
  // POS-Lite: Deduct stock when offline sale is made
  deductStock: (productId: string, quantity: number, reason: 'ONLINE_SALE' | 'OFFLINE_SALE', referenceId: string, notes?: string) => Promise<void>;
  // Inventory management
  addStock: (productId: string, quantity: number, reason: string, notes?: string) => Promise<void>;
  adjustStock: (productId: string, newQuantity: number, reason: string, notes: string) => void;
  reserveStock: (productId: string, quantity: number, orderId: string) => void;
  releaseStock: (productId: string, quantity: number, orderId: string) => void;
  getLedgerByProduct: (productId: string) => InventoryLedgerEntry[];
  getRecentLedgerEntries: (limit?: number) => InventoryLedgerEntry[];
  checkLowStock: () => void;
  acknowledgeLowStockAlert: (alertId: string) => void;
  getLowStockThreshold: () => number;
  subscribeToProducts: (filters?: {
    category?: string;
    sellerId?: string;
    isActive?: boolean;
    approvalStatus?: string;
  }) => () => void;
}

interface OrderStore {
  orders: SellerOrder[];
  sellerId: string | null;
  loading: boolean;
  error: string | null;
  fetchOrders: (sellerId: string) => Promise<void>;
  addOrder: (order: Omit<SellerOrder, 'id'>) => string;
  updateOrderStatus: (id: string, status: SellerOrder['status']) => Promise<void>;
  updatePaymentStatus: (id: string, status: SellerOrder['paymentStatus']) => void;
  getOrdersByStatus: (status: SellerOrder['status']) => SellerOrder[];
  getOrderById: (id: string) => SellerOrder | undefined;
  addTrackingNumber: (id: string, trackingNumber: string) => void;
  deleteOrder: (id: string) => void;
  addOrderRating: (id: string, rating: number, comment?: string, images?: string[]) => void;
  // POS-Lite functionality
  addOfflineOrder: (cartItems: { productId: string; productName: string; quantity: number; price: number; image: string; selectedColor?: string; selectedSize?: string }[], total: number, note?: string) => Promise<string>;
}

// Validation helpers for database readiness
const validateOrder = (order: Omit<SellerOrder, 'id'>): boolean => {
  if (!order.buyerName?.trim()) return false;
  if (!order.buyerEmail?.trim() || !order.buyerEmail.includes('@')) return false;
  if (!order.items || order.items.length === 0) return false;
  if (!order.shippingAddress || !order.shippingAddress.fullName) return false;
  if (order.total <= 0) return false;
  return true;
};

const sanitizeOrder = (order: Omit<SellerOrder, 'id'>): Omit<SellerOrder, 'id'> => {
  return {
    ...order,
    buyerName: order.buyerName.trim(),
    buyerEmail: order.buyerEmail.trim().toLowerCase(),
    items: order.items.map(item => ({
      ...item,
      productName: item.productName.trim(),
      quantity: Math.max(1, Math.floor(item.quantity)),
      price: Math.max(0, item.price)
    })),
    total: Math.max(0, order.total),
    orderDate: order.orderDate || new Date().toISOString()
  };
};

interface StatsStore {
  stats: SellerStats;
  refreshStats: () => void;
}

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

// Optional fallback seller ID for Supabase inserts (set in .env for testing)
// React Native uses process.env, not import.meta
const fallbackSellerId = process.env.EXPO_PUBLIC_SUPABASE_SELLER_ID || process.env.VITE_SUPABASE_SELLER_ID;

/**
 * Map database seller to Seller interface
 * Note: Actual schema has seller data split across:
 * - sellers: id, store_name, store_description, avatar_url, owner_name, approval_status
 * - seller_business_profiles: business_type, city, province, postal_code, business_address
 * - seller_payout_accounts: bank_name, account_name, account_number
 */
const mapDbSellerToSeller = (s: any): Seller => {
  const bp = s.business_profile || s.seller_business_profiles || {};
  const pa = s.payout_account || s.seller_payout_accounts || {};
  const vd = s.verification_documents || s.seller_verification_documents || {};

  return {
    id: s.id,
    store_name: s.store_name || '',
    store_description: s.store_description || '',
    owner_name: s.owner_name || '',
    avatar_url: s.avatar_url,
    approval_status: (s.approval_status as Seller['approval_status']) || 'pending',
    verified_at: s.verified_at,
    created_at: s.created_at,

    // Legacy fields for backward compatibility
    email: s.email || '',
    phone: s.phone || '',
    rating: 0, // Computed from reviews
    totalSales: 0, // Computed from orders
    storeCategory: [],

    // Nested business profile
    business_profile: bp.business_type || bp.business_registration_number || bp.tax_id_number || bp.address_line_1 ? {
      business_type: bp.business_type || '',
      business_registration_number: bp.business_registration_number || '',
      tax_id_number: bp.tax_id_number || '',
      address_line_1: bp.address_line_1 || bp.business_address || '',
      address_line_2: bp.address_line_2 || '',
      city: bp.city || '',
      province: bp.province || '',
      postal_code: bp.postal_code || '',
    } : undefined,

    // Nested payout account
    payout_account: pa.bank_name || pa.account_name || pa.account_number ? {
      bank_name: pa.bank_name || '',
      account_name: pa.account_name || '',
      account_number: pa.account_number || '',
    } : undefined,

    // Nested verification documents
    verification_documents: vd.business_permit_url || vd.valid_id_url || vd.proof_of_address_url || vd.dti_registration_url || vd.tax_id_url ? {
      business_permit_url: vd.business_permit_url || '',
      valid_id_url: vd.valid_id_url || '',
      proof_of_address_url: vd.proof_of_address_url || '',
      dti_registration_url: vd.dti_registration_url || '',
      tax_id_url: vd.tax_id_url || '',
    } : undefined,
  };
};

/**
 * Safely extract a string from a value that might be an object, e.g. {name:"..."} from JSONB
 */
const safeStr = (val: any, fallback = ''): string => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'object' && val.name) return String(val.name);
  if (typeof val === 'object' && val.full_name) return String(val.full_name);
  if (typeof val === 'object' && val.store_name) return String(val.store_name);
  return String(val);
};

/**
 * Map database product to SellerProduct interface
 * Note: Actual schema has product data split across:
 * - products: id, name, description, price, category_id, brand, sku, specifications, approval_status
 * - product_images: image_url, is_primary
 * - product_variants: size, color, stock, price
 */
const mapDbProductToSellerProduct = (p: any): SellerProduct => {
  // Handle images from product_images relation
  const images = Array.isArray(p.images)
    ? p.images.map((img: any) => typeof img === 'string' ? img : img.image_url)
    : [];

  // Handle variants to get colors, sizes, and stock
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const colors = [...new Set(variants.map((v: any) => v.color).filter(Boolean))];
  const sizes = [...new Set(variants.map((v: any) => v.size).filter(Boolean))];
  const totalStock = variants.reduce((sum: number, v: any) => sum + (v.stock || 0), 0);

  // Get category name from relation
  const categoryName = typeof p.category === 'string'
    ? p.category
    : (p.category?.name || p.categories?.name || '');

  return {
    id: p.id,
    name: safeStr(p.name, ''),
    description: safeStr(p.description, ''),
    price: Number(p.price ?? 0),
    originalPrice: undefined,
    stock: totalStock || p.stock || 0,
    category: categoryName,
    images: images,
    sizes: sizes as string[],
    colors: colors as string[],
    isActive: !p.disabled_at,
    sellerId: p.seller_id || '',
    createdAt: p.created_at || '',
    updatedAt: p.updated_at || '',
    sales: p.sales || p.sold || p.sold_count || 0, // Preserve sold count from transformProduct
    rating: 0,
    reviews: 0,
    approval_status: (p.approval_status as SellerProduct['approval_status']) || 'pending',
    rejectionReason: undefined,
    vendorSubmittedCategory: undefined,
    adminReclassifiedCategory: undefined,
    sellerName: p.seller?.store_name,
    sellerRating: 0,
    sellerLocation: p.seller?.business_profile?.city,
  };
};

/**
 * Build product insert for database
 * Note: Products table structure:
 * - Required: name, price, category_id
 * - Optional: description, brand, sku, specifications, weight, etc.
 * - Images and variants go to separate tables
 */
const buildProductInsert = (
  product: Omit<SellerProduct, 'id' | 'createdAt' | 'updatedAt' | 'sales' | 'rating' | 'reviews'>,
  sellerId: string,
  categoryId: string,
): any => ({
  name: product.name,
  description: product.description,
  price: product.price,
  category_id: categoryId,
  brand: null,
  sku: null,
  seller_id: sellerId,
  approval_status: 'pending',
  low_stock_threshold: 10,
  specifications: {},
  weight: null,
  dimensions: null,
  is_free_shipping: false,
  variant_label_1: (product as any).variant_label_1 || null,
  variant_label_2: (product as any).variant_label_2 || null,
});

const resolveCategoryIdByName = async (categoryName: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const normalizedName = categoryName.trim();
  if (!normalizedName) {
    return null;
  }

  const slug = normalizedName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  try {
    const { data: byName, error: byNameError } = await supabase
      .from('categories')
      .select('id')
      .eq('name', normalizedName)
      .maybeSingle();

    if (byNameError) throw byNameError;
    if (byName?.id) return byName.id;

    const { data: bySlug, error: bySlugError } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();

    if (bySlugError) throw bySlugError;
    if (bySlug?.id) return bySlug.id;

    const { data: created, error: createError } = await supabase
      .from('categories')
      .insert({ name: normalizedName, slug })
      .select('id')
      .single();

    if (createError) {
      const { data: existingBySlug } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingBySlug?.id) return existingBySlug.id;
      throw createError;
    }

    return created?.id || null;
  } catch (error) {
    console.error('Failed to resolve category ID:', error);
    return null;
  }
};

/**
 * Map seller product updates to database updates
 * Note: Many fields (images, variants) go to separate tables
 */
const mapSellerUpdatesToDb = (updates: Partial<SellerProduct>): any => {
  const dbUpdates: any = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.isActive !== undefined) dbUpdates.disabled_at = updates.isActive ? null : new Date().toISOString();
  if (updates.approval_status !== undefined) dbUpdates.approval_status = updates.approval_status;

  return dbUpdates;
};

// Dummy data removed for database parity

const dummyOrders: SellerOrder[] = [];

// Helper function to map database Order to SellerOrder
const mapOrderToSellerOrder = (order: any): SellerOrder => {
  // Extract buyer info from order data
  // For ONLINE orders: buyer_profile contains the customer info (fetched separately)
  // For OFFLINE orders: use recipient info or defaults to Walk-in
  // Note: buyer_profile is attached by orderService after fetching from profiles table
  const buyerProfile = order.buyer_profile; // Direct profile data, not nested
  const recipientInfo = order.recipient;
  const addressInfo = order.address;



  // Determine buyer name - priority: buyer profile (for ONLINE) > recipient > Walk-in
  let buyerName = 'Walk-in Customer';
  let buyerEmail = '';
  let buyerPhone = '';

  if (order.order_type === 'ONLINE') {
    // For ONLINE orders, get real customer info from buyer profile first, then recipient
    if (buyerProfile?.first_name || buyerProfile?.last_name) {
      buyerName = `${buyerProfile.first_name || ''} ${buyerProfile.last_name || ''}`.trim() || 'Customer';
      buyerEmail = buyerProfile.email || '';
      buyerPhone = buyerProfile.phone || '';
    } else if (buyerProfile?.email) {
      // Use email username as name if no name available
      buyerName = buyerProfile.email.split('@')[0];
      buyerEmail = buyerProfile.email;
    } else if (recipientInfo?.first_name || recipientInfo?.last_name) {
      // Fallback to recipient info if profile doesn't have name
      buyerName = `${recipientInfo.first_name || ''} ${recipientInfo.last_name || ''}`.trim() || 'Customer';
      buyerEmail = recipientInfo.email || '';
      buyerPhone = recipientInfo.phone || '';
    }
  } else {
    // For OFFLINE (POS) orders, check recipient table first (new schema)
    // then fall back to legacy fields
    if (recipientInfo?.first_name || recipientInfo?.last_name) {
      buyerName = `${recipientInfo.first_name || ''} ${recipientInfo.last_name || ''}`.trim() || 'Walk-in Customer';
      buyerEmail = recipientInfo.email || '';
      buyerPhone = recipientInfo.phone || '';
    } else {
      buyerName = 'Walk-in Customer';
      buyerEmail = '';
      buyerPhone = '';
    }
  }

  // Handle order_items - it might be nested or need to be fetched separately
  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

  const items = orderItems.map((item: any) => {
    const itemPrice = parseFloat(item.price?.toString() || '0');
    const itemQty = item.quantity || 1;

    return {
      productId: String(item.product_id || ''),
      productName: safeStr(item.product_name, safeStr(item.productName, 'Unknown Product')),
      quantity: itemQty,
      price: itemPrice,
      image: (Array.isArray(item.product_images) ? item.product_images[0] : null) || item.primary_image_url || item.image || 'https://via.placeholder.com/100',
      selectedColor: item.personalized_options?.color || undefined,
      selectedSize: item.personalized_options?.size || undefined
    };
  });

  // Always calculate total from items - this is more reliable than DB total_amount
  const calculatedTotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
    sum + (item.price * item.quantity), 0);
  const dbTotal = parseFloat(order.total_amount?.toString() || '0');

  // Use calculated total if DB total is 0 or missing
  const total = calculatedTotal > 0 ? calculatedTotal : dbTotal;

  // Map database status to Orders UI status (pending, to-ship, completed, cancelled)
  // Database uses: pending_payment, processing, ready_to_ship, shipped, delivered, etc.
  // UI expects: pending, to-ship, completed, cancelled
  const mapStatus = (dbStatus: string, paymentStatus?: string, shipmentStatus?: string): SellerOrder['status'] => {
    // First check shipment_status if available (new schema)
    if (shipmentStatus) {
      if (shipmentStatus === 'delivered' || shipmentStatus === 'received') return 'completed';
      if (['ready_to_ship', 'processing', 'shipped', 'out_for_delivery'].includes(shipmentStatus)) return 'to-ship';
      if (shipmentStatus === 'returned' || shipmentStatus === 'cancelled') return 'cancelled';
      if (shipmentStatus === 'waiting_for_seller') return 'pending';
    }

    // Fallback to legacy status mapping
    const statusMap: Record<string, SellerOrder['status']> = {
      'pending_payment': 'pending',
      'pending': 'pending',
      'confirmed': 'to-ship',
      'processing': 'to-ship',
      'ready_to_ship': 'to-ship',
      'shipped': 'to-ship',
      'out_for_delivery': 'to-ship',
      'delivered': 'completed',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'refunded': 'cancelled'
    };
    return statusMap[dbStatus] || 'pending';
  };

  // Map payment status
  const paymentStatusMap: Record<string, SellerOrder['paymentStatus']> = {
    'pending': 'pending',
    'pending_payment': 'pending',
    'paid': 'paid',
    'refunded': 'refunded',
    'failed': 'pending'
  };

  // Build shipping address from joined address relation or fallback to legacy fields
  const shippingAddress = {
    fullName: recipientInfo
      ? `${recipientInfo.first_name || ''} ${recipientInfo.last_name || ''}`.trim()
      : buyerName,
    street: addressInfo?.address_line_1 || order.shipping_address?.street || '',
    barangay: addressInfo?.barangay || '',
    city: addressInfo?.city || order.shipping_address?.city || '',
    province: addressInfo?.province || order.shipping_address?.province || '',
    region: addressInfo?.region || '',
    postalCode: addressInfo?.postal_code || order.shipping_address?.postalCode || '',
    phone: recipientInfo?.phone || buyerPhone || order.shipping_address?.phone || ''
  };

  return {
    id: order.id,
    orderId: order.order_number || order.id, // Add orderId for display
    seller_id: order.seller_id,
    buyer_id: order.buyer_id,
    buyerName: buyerName,
    buyerEmail: buyerEmail,
    customerName: buyerName,
    customerEmail: buyerEmail,
    items,
    total,
    status: mapStatus(order.status, order.payment_status, order.shipment_status),
    paymentStatus: paymentStatusMap[order.payment_status] || 'pending',
    orderDate: order.created_at,
    createdAt: order.created_at,
    shippingAddress,
    trackingNumber: order.tracking_number || undefined,
    rating: order.rating || undefined,
    reviewComment: order.review_comment || undefined,
    reviewImages: order.review_images || undefined,
    reviewDate: order.review_date || undefined,
    type: order.order_type === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
    posNote: order.pos_note || order.notes || undefined
  } as SellerOrder & { orderId: string; customerName: string; customerEmail: string; createdAt: string };
};

// Auth Store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      seller: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
          await new Promise(resolve => setTimeout(resolve, 500));
          console.warn('Mock login disabled - please configure Supabase');
          return false;
        }

        try {
          const result = await authService.signIn(email, password);
          if (!result || !result.user) {
            console.error('Supabase login failed: No user returned');
            return false;
          }

          const { user } = result;

          const sellerProfile = await authService.getSellerProfile(user.id);
          if (!sellerProfile) {
            console.error('No seller profile found for user');
            return false;
          }

          // Fetch email from profiles table and merge with seller profile
          const userEmail = await authService.getEmailFromProfile(user.id);
          const mappedSeller = mapDbSellerToSeller(sellerProfile);

          // Ensure email is set from profiles table
          if (userEmail) {
            mappedSeller.email = userEmail;
          }

          set({ seller: mappedSeller, isAuthenticated: true });
          return true;
        } catch (err) {
          console.error('Login error:', err);
          return false;
        }
      },
      register: async (sellerData) => {
        if (!isSupabaseConfigured()) {
          // Mock flow with new Seller interface structure
          const newSeller: Seller = {
            id: `seller-${Date.now()}`,
            store_name: (sellerData as any).storeName || (sellerData as any).store_name || 'My Store',
            store_description: (sellerData as any).storeDescription || (sellerData as any).store_description || '',
            owner_name: (sellerData as any).ownerName || (sellerData as any).owner_name || '',
            approval_status: 'pending',
            verified_at: undefined,
            created_at: new Date().toISOString(),

            // Legacy fields
            email: sellerData.email!,
            phone: (sellerData as any).phone || '',
            rating: 0,
            totalSales: 0,
            storeCategory: (sellerData as any).storeCategory || [],

            // Nested business profile
            business_profile: {
              business_type: (sellerData as any).businessType || '',
              business_registration_number: (sellerData as any).businessRegistrationNumber || '',
              tax_id_number: (sellerData as any).taxIdNumber || '',
              address_line_1: (sellerData as any).businessAddress || '',
              city: (sellerData as any).city || '',
              province: (sellerData as any).province || '',
              postal_code: (sellerData as any).postalCode || '',
            },

            // Nested payout account
            payout_account: {
              bank_name: (sellerData as any).bankName || '',
              account_name: (sellerData as any).accountName || '',
              account_number: (sellerData as any).accountNumber || '',
            },
          };
          set({ seller: newSeller, isAuthenticated: false });
          return true;
        }

        try {
          // First, try to sign in with the provided credentials
          // This will succeed if the user already exists, fail if they don't
          let user;
          let isExistingUser = false;

          try {
            const signInResult = await authService.signIn(sellerData.email!, sellerData.password!);
            if (signInResult && signInResult.user) {
              // User exists, get their profile to check user type
              user = signInResult.user;
              isExistingUser = true;

              // Check if they're already a seller
              const { data: existingProfile } = await supabase
                .from('profiles')
                .select('user_type')
                .eq('id', user.id)
                .single();

              if (existingProfile && existingProfile.user_type === 'seller') {
                console.error('User is already registered as a seller');
                return false;
              }
            }
          } catch (signInError) {
            // Sign in failed, meaning user doesn't exist, so we'll create a new account
            isExistingUser = false;
          }

          // If user doesn't exist, try to sign up
          if (!isExistingUser) {
            try {
              const legacyData = sellerData as any;
              const signUpResult = await authService.signUp(sellerData.email!, sellerData.password!, {
                full_name: sellerData.owner_name || legacyData.ownerName || sellerData.store_name || legacyData.storeName || sellerData.email?.split('@')[0],
                phone: sellerData.phone,
                user_type: 'seller',
                email: sellerData.email!,
                password: sellerData.password!,
              });

              if (!signUpResult || !signUpResult.user) {
                console.error('Signup failed: No user returned');
                return false;
              }

              user = signUpResult.user;
            } catch (signUpError: any) {
              // If signup fails because user already exists, try to sign in again
              if (signUpError?.isAlreadyRegistered ||
                signUpError?.message?.includes('User already registered') ||
                signUpError?.message?.includes('already exists') ||
                signUpError?.status === 422) {
                // User exists, sign in and continue with upgrade process
                const signInResult = await authService.signIn(sellerData.email!, sellerData.password!);
                if (signInResult && signInResult.user) {
                  user = signInResult.user;
                  isExistingUser = true;

                  // Check if they're already a seller
                  const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('user_type')
                    .eq('id', user.id)
                    .single();

                  if (existingProfile && existingProfile.user_type === 'seller') {
                    console.error('User is already registered as a seller');
                    return false;
                  }
                } else {
                  console.error('Could not sign in existing user after failed signup');
                  return false;
                }
              } else {
                // Some other error occurred
                console.error('Signup error:', signUpError);
                throw signUpError;
              }
            }
          }

          // At this point, we have a user account
          // If it's an existing user (not a new signup), upgrade their profile to seller
          if (isExistingUser) {
            // Use the authService to upgrade the user type
            await authService.upgradeUserType(user.id, 'seller');
          }

          // 2) Create or update seller record (use upsert to handle conflicts)
          const { sellerService } = await import('@/services/sellerService');

          const legacyData = sellerData as any;
          const sellerInsertData = {
            id: user.id,
            store_name: sellerData.store_name || legacyData.storeName || 'My Store',
            store_description: sellerData.store_description || legacyData.storeDescription || '',
            owner_name: sellerData.owner_name || legacyData.ownerName || '',
            approval_status: 'pending' as const,
            // Business profile data
            business_type: sellerData.business_profile?.business_type || legacyData.businessType || 'sole_proprietor',
            business_registration_number: sellerData.business_profile?.business_registration_number || legacyData.businessRegistrationNumber || '',
            tax_id_number: sellerData.business_profile?.tax_id_number || legacyData.taxIdNumber || '',
            business_address: sellerData.business_profile?.address_line_1 || legacyData.businessAddress || legacyData.storeAddress || '',
            city: sellerData.business_profile?.city || legacyData.city || '',
            province: sellerData.business_profile?.province || legacyData.province || '',
            postal_code: sellerData.business_profile?.postal_code || legacyData.postalCode || '',
            // Payout account data
            bank_name: sellerData.payout_account?.bank_name || legacyData.bankName || '',
            account_name: sellerData.payout_account?.account_name || legacyData.accountName || '',
            account_number: sellerData.payout_account?.account_number || legacyData.accountNumber || '',
            business_permit_url: null,
            valid_id_url: null,
            proof_of_address_url: null,
            dti_registration_url: null,
            tax_id_url: null,
          };

          const savedSeller = await sellerService.upsertSeller(sellerInsertData);

          if (!savedSeller) {
            console.error('Seller insert failed');
            return false;
          }

          // 3) Set local auth state as pending (awaiting approval)
          set({ seller: mapDbSellerToSeller(savedSeller), isAuthenticated: false });
          return true;
        } catch (err) {
          console.error('Registration error:', err);
          return false;
        }
      },
      logout: () => {
        set({ seller: null, isAuthenticated: false });
      },
      updateProfile: (updates) => {
        const { seller } = get();
        if (seller) {
          set({ seller: { ...seller, ...updates } });
        }
      },
      updateSellerDetails: (details) => {
        const { seller } = get();
        if (seller) {
          set({ seller: { ...seller, ...details } });
        }
      },
      authenticateSeller: () => {
        const { seller } = get();
        if (seller && seller.approval_status === 'verified') {
          set({ isAuthenticated: true });
        }
      },

      createBuyerAccount: async () => {
        if (!isSupabaseConfigured()) {
          console.warn('Supabase not configured - cannot create buyer account');
          return true;
        }

        try {
          const authStoreState = useAuthStore.getState();
          const userId = authStoreState.seller?.id;

          if (!userId) {
            console.error('No seller ID found - cannot create buyer account');
            return false;
          }

          // Use authService to create buyer account
          await authService.createBuyerAccount(userId);

          return true;
        } catch (error) {
          console.error('Error creating buyer account:', error);
          return false;
        }
      },

      updateSellerInfo: (info) => {
        const { seller } = get();
        if (seller) {
          set({ seller: { ...seller, ...info }, isAuthenticated: true });
        } else {
          // Create a new seller object when seller is null (e.g., during login.tsx flow)
          set({
            seller: {
              id: info.id || '',
              store_name: info.store_name || '',
              store_description: info.store_description || '',
              owner_name: info.owner_name || '',
              approval_status: info.approval_status || 'pending',
              ...info,
            } as Seller,
            isAuthenticated: true,
          });
        }
      },

      user: null,

      addRole: (role: string) => {
        // For seller store, this is a no-op or we could store roles locally if needed
        console.log(`Adding role: ${role}`);
      },

      switchRole: (role: 'buyer' | 'seller') => {
        console.log(`Switching role to: ${role}`);
      },

      setUser: (user: any) => {
        set({ user });
      },
    }),
    {
      name: 'seller-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Product Store
export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      loading: false,
      error: null,
      inventoryLedger: [],
      lowStockAlerts: [],

      fetchProducts: async (filters) => {
        if (!isSupabaseConfigured()) {
          console.warn('Supabase not configured, showing empty product list');
          set({ products: [], loading: false, error: null });
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await productService.getProducts(filters);
          const mappedProducts = (data || []).map(mapDbProductToSellerProduct);
          set({
            products: mappedProducts,
            loading: false,
          });
          get().checkLowStock();
        } catch (error: unknown) {
          console.error('Error loading products from Supabase:', error);
          set({ error: (error as Error)?.message || 'Failed to load products', loading: false });
        }
      },

      subscribeToProducts: (filters) => {
        if (!isSupabaseConfigured()) return () => { };

        console.log('Subscribing to product changes...', filters);

        const channel = supabase
          .channel('public:products')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'products',
              // Note: Supabase JS client handles basic equality filters on some versions,
              // but for complex stuff we might need to refetch or filter client-side.
              // For now, we'll refetch to ensure data consistency with relations (sellers).
            },
            async (payload) => {
              console.log('Product change received:', payload);
              // Refetch products to get updated list with joined seller data
              // This is safer than manually patching the state because of relations
              await get().fetchProducts(filters);
            }
          )
          .subscribe((status) => {
            console.log('Product subscription status:', status);
          });

        return () => {
          console.log('Unsubscribing from products...');
          supabase.removeChannel(channel);
        };
      },

      addProduct: async (product) => {
        try {
          // Validation
          if (!product.name || product.name.trim() === '') {
            throw new Error('Product name is required');
          }
          if (!product.price || product.price <= 0) {
            throw new Error('Product price must be greater than 0');
          }
          if (!product.stock || product.stock < 0) {
            throw new Error('Product stock cannot be negative');
          }
          if (!product.category || product.category.trim() === '') {
            throw new Error('Product category is required');
          }
          if (!product.images || product.images.length === 0) {
            throw new Error('At least one product image is required');
          }

          const authStoreState = useAuthStore.getState();
          const sellerId = isSupabaseConfigured()
            ? authStoreState.seller?.id || fallbackSellerId
            : authStoreState.seller?.id || 'seller-1';

          const resolvedSellerId = sellerId ?? '';

          if (isSupabaseConfigured() && !resolvedSellerId) {
            throw new Error('Missing seller ID for Supabase insert. Set VITE_SUPABASE_SELLER_ID or log in with a seller linked to Supabase.');
          }

          let newProduct: SellerProduct;

          // Use Supabase if configured
          if (isSupabaseConfigured()) {
            const categoryId = await resolveCategoryIdByName(product.category);
            if (!categoryId) {
              throw new Error('Failed to resolve category. Please try again.');
            }

            const insertData = buildProductInsert(product, resolvedSellerId, categoryId);
            const created = await productService.createProduct(insertData);
            if (!created) {
              throw new Error('Failed to create product in database');
            }
            newProduct = mapDbProductToSellerProduct(created);

            // Create product variants if provided
            const variants = (product as any).variants;
            if (variants && Array.isArray(variants) && variants.length > 0) {
              const variantInserts = variants.map((v: any, index: number) => ({
                product_id: newProduct.id, // Added by productService but required by type
                variant_name: [v.size || v.option2, v.color || v.option1].filter((x: any) => x && x !== '-').join(' - ') || 'Default',
                size: (v.size || v.option2 || '') === '-' ? null : (v.size || v.option2 || null),
                color: (v.color || v.option1 || '') === '-' ? null : (v.color || v.option1 || null),
                stock: parseInt(v.stock) || 0,
                price: parseFloat(v.price) || product.price,
                sku: v.sku || `${newProduct.id.substring(0, 8)}-${index}`,
                thumbnail_url: v.image || null,
                barcode: null,
                option_1_value: (v.color || v.option1 || '') === '-' ? null : (v.color || v.option1 || null),
                option_2_value: (v.size || v.option2 || '') === '-' ? null : (v.size || v.option2 || null),
                embedding: null,
              }));

              try {
                await productService.addProductVariants(newProduct.id, variantInserts);
                console.log(`✅ Created ${variantInserts.length} variants for product ${newProduct.id}`);
              } catch (variantError) {
                console.error('Failed to create variants:', variantError);
                // Don't fail the whole product creation, just log the error
              }
            } else {
              // Create a default variant with the product's base stock/price
              try {
                await productService.addProductVariants(newProduct.id, [{
                  product_id: newProduct.id,
                  variant_name: 'Default',
                  size: null,
                  color: null,
                  stock: product.stock,
                  price: product.price,
                  sku: `${newProduct.id.substring(0, 8)}-default`,
                  thumbnail_url: null,
                  barcode: null,
                  option_1_value: null,
                  option_2_value: null,
                  embedding: null,
                }]);
              } catch (variantError) {
                console.error('Failed to create default variant:', variantError);
              }
            }
          } else {
            // Fallback to local state
            newProduct = {
              ...product,
              id: `prod-${Date.now()}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              sales: 0,
              rating: 0,
              reviews: 0,
              approval_status: 'pending',
              vendorSubmittedCategory: product.category,
              sizes: product.sizes || [],
              colors: product.colors || [],
              sellerId: resolvedSellerId,
            };
          }

          // Keep UI stock in sync immediately after creation.
          // products table does not store aggregated stock, so the first mapped
          // product row can show 0 until the next full fetch.
          newProduct = {
            ...newProduct,
            stock: Number(product.stock ?? newProduct.stock ?? 0),
          };

          set((state) => ({ products: [...state.products, newProduct] }));

          // Create ledger entry for initial stock
          const ledgerEntry: InventoryLedgerEntry = {
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId: newProduct.id,
            productName: newProduct.name,
            changeType: 'ADDITION',
            quantityBefore: 0,
            quantityChange: product.stock,
            quantityAfter: product.stock,
            reason: 'STOCK_REPLENISHMENT',
            referenceId: newProduct.id,
            userId: sellerId || 'SYSTEM',
            notes: 'Initial stock for new product'
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry]
          }));

          // Check for low stock on new product
          get().checkLowStock();

          // Also add to QA flow store
          try {
            const qaStore = useProductQAStore.getState();
            await qaStore.addProductToQA(
              newProduct.id,
              authStoreState.seller?.store_name || 'Unknown Vendor',
              authStoreState.seller?.id
            );
          } catch (qaError) {
            console.error('Error adding product to QA flow:', qaError);
          }

          // Return the product ID
          return newProduct.id;
        } catch (error) {
          console.error('Error adding product:', error);
          throw error;
        }
      },

      bulkAddProducts: async (bulkProducts) => {
        try {
          const authStore = useAuthStore.getState();
          const qaStore = useProductQAStore.getState();
          const sellerId = isSupabaseConfigured()
            ? authStore.seller?.id || fallbackSellerId
            : authStore.seller?.id || 'seller-1';

          const resolvedSellerId = sellerId ?? '';

          if (isSupabaseConfigured() && !resolvedSellerId) {
            throw new Error('Missing seller ID for bulk upload. Please log in.');
          }

          let addedProducts: SellerProduct[] = [];

          if (isSupabaseConfigured()) {
            const uniqueCategories = [...new Set(bulkProducts.map(p => p.category))];
            const categoryMap: Record<string, string> = {};

            for (const categoryName of uniqueCategories) {
              const categoryId = await resolveCategoryIdByName(categoryName);
              if (categoryId) categoryMap[categoryName] = categoryId;
            }

            const productsToInsert = bulkProducts
              .filter((p) => categoryMap[p.category])
              .map((p) =>
                buildProductInsert({
                  name: p.name,
                  description: p.description,
                  price: p.price,
                  originalPrice: p.originalPrice,
                  stock: p.stock,
                  category: p.category,
                  images: [p.imageUrl],
                  isActive: true,
                  sellerId: resolvedSellerId,
                  vendorSubmittedCategory: p.category
                } as any, resolvedSellerId, categoryMap[p.category]),
              );

            if (productsToInsert.length === 0) {
              throw new Error('No valid products to upload: categories could not be resolved.');
            }

            const dbProducts = await productService.createProducts(productsToInsert);
            if (!dbProducts) throw new Error('Failed to create products in database');
            addedProducts = dbProducts.map(mapDbProductToSellerProduct);
          } else {
            // Mock implementation
            addedProducts = bulkProducts.map((productData) => {
              const timestamp = Date.now();
              const randomId = Math.random().toString(36).substr(2, 9);
              return {
                id: `prod-${timestamp}-${randomId}`,
                name: productData.name,
                description: productData.description,
                price: productData.price,
                originalPrice: productData.originalPrice,
                stock: productData.stock,
                category: productData.category,
                images: [productData.imageUrl],
                sizes: [],
                colors: [],
                isActive: true,
                sellerId: resolvedSellerId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sales: 0,
                rating: 0,
                reviews: 0,
                approval_status: 'pending',
                vendorSubmittedCategory: productData.category,
              };
            });
          }

          const newLedgerEntries: InventoryLedgerEntry[] = addedProducts.map(p => ({
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId: p.id,
            productName: p.name,
            changeType: 'ADDITION',
            quantityBefore: 0,
            quantityChange: p.stock,
            quantityAfter: p.stock,
            reason: 'STOCK_REPLENISHMENT',
            referenceId: p.id,
            userId: resolvedSellerId || 'SYSTEM',
            notes: 'Initial stock from bulk upload',
          }));

          // Add to QA flow store
          addedProducts.forEach(p => {
            try {
              qaStore.addProductToQA(
                p.id,
                authStore.seller?.store_name || 'Unknown Vendor',
                authStore.seller?.id
              );
            } catch (qaError) {
              console.error('Error adding product to QA flow:', qaError);
            }
          });

          // Add all products and ledger entries at once
          set((state) => ({
            products: [...state.products, ...addedProducts],
            inventoryLedger: [...state.inventoryLedger, ...newLedgerEntries],
          }));

          // Check for low stock on new products
          get().checkLowStock();
        } catch (error) {
          console.error('Error bulk adding products:', error);
          throw error;
        }
      },

      updateProduct: async (id, updates) => {
        try {
          const product = get().products.find(p => p.id === id);
          if (!product) {
            console.error(`Product not found: ${id}`);
            throw new Error('Product not found');
          }

          let updatedProduct: SellerProduct;

          // Use Supabase if configured
          if (isSupabaseConfigured()) {
            const updateData = mapSellerUpdatesToDb(updates);

            const categoryName = updates.category;
            if (typeof categoryName === 'string' && categoryName.trim().length > 0) {
              const categoryId = await resolveCategoryIdByName(categoryName);
              if (!categoryId) {
                throw new Error('Failed to resolve category. Please try again.');
              }
              updateData.category_id = categoryId;
            } else if ((updates as any).category_id !== undefined) {
              updateData.category_id = (updates as any).category_id;
            }

            const updated = await productService.updateProduct(id, updateData);
            if (!updated) {
              throw new Error('Failed to update product in database');
            }
            updatedProduct = mapDbProductToSellerProduct(updated);
          } else {
            // Fallback to local state
            updatedProduct = { ...product, ...updates, updatedAt: new Date().toISOString() };
          }

          set((state) => ({
            products: state.products.map(p =>
              p.id === id ? updatedProduct : p
            )
          }));
        } catch (error) {
          console.error('Error updating product:', error);
          throw error;
        }
      },

      deleteProduct: async (id) => {
        try {
          const product = get().products.find(p => p.id === id);
          if (!product) {
            console.error(`Product not found: ${id}`);
            throw new Error('Product not found');
          }

          // Use Supabase if configured
          if (isSupabaseConfigured()) {
            await productService.deleteProduct(id);
          }

          set((state) => ({
            products: state.products.filter(product => product.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting product:', error);
          throw error;
        }
      },

      toggleProductStatus: async (id) => {
        const previousProduct = get().products.find((p) => p.id === id);
        if (!previousProduct) {
          throw new Error('Product not found');
        }

        const newStatus = !previousProduct.isActive;

        set((state) => ({
          products: state.products.map((product) =>
            product.id === id
              ? {
                ...product,
                isActive: newStatus,
                updatedAt: new Date().toISOString(),
              }
              : product,
          ),
        }));

        try {
          if (isSupabaseConfigured()) {
            if (newStatus) {
              await productService.enableProduct(id);
            } else {
              await productService.disableProduct(id);
            }
          }
        } catch (error) {
          set((state) => ({
            products: state.products.map((product) =>
              product.id === id ? previousProduct : product,
            ),
          }));

          console.error('Error toggling product status:', error);
          throw error;
        }
      },

      getProduct: (id) => {
        return get().products.find(product => product.id === id);
      },

      getProductById: (id) => {
        return get().products.find(product => product.id === id);
      },

      searchProducts: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().products.filter(p =>
          p.name.toLowerCase().includes(lowerQuery) ||
          p.description.toLowerCase().includes(lowerQuery) ||
          p.category.toLowerCase().includes(lowerQuery)
        );
      },

      getProductsByCategory: (category) => {
        return get().products.filter(p => p.category === category);
      },

      addInventoryEntry: (entry) => {
        const newEntry: InventoryLedgerEntry = {
          ...entry,
          id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString()
        };
        set((state) => ({
          inventoryLedger: [...state.inventoryLedger, newEntry]
        }));
      },

      // POS-Lite: Deduct stock with full audit trail
      deductStock: async (productId, quantity, reason, referenceId, notes) => {
        try {
          console.log(`[deductStock] Starting - Product: ${productId}, Quantity: ${quantity}, Reason: ${reason}`);
          
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          console.log(`[deductStock] Current stock: ${product.stock}`);

          // RULE: No negative stock allowed
          if (product.stock < quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
          }

          const newStock = product.stock - quantity;
          const authStoreForStock = useAuthStore.getState();

          // Use Supabase if configured
          if (isSupabaseConfigured()) {
            console.log(`[deductStock] Updating database...`);
            await productService.deductStock(
              productId,
              quantity,
              reason,
              referenceId,
              authStoreForStock.seller?.id
            );
            console.log(`[deductStock] Database updated. Refetching products...`);
            // Refresh from DB to get updated stock
            await get().fetchProducts({ sellerId: authStoreForStock.seller?.id });
            console.log(`[deductStock] Products refetched. New product count: ${get().products.length}`);
            
            // Verify the stock was updated
            const updatedProduct = get().products.find((p) => p.id === productId);
            console.log(`[deductStock] Verified stock after refetch: ${updatedProduct?.stock}`);
          } else {
            // Fallback: Update product stock locally
            set((state) => ({
              products: state.products.map(p =>
                p.id === productId
                  ? { ...p, stock: newStock, sales: p.sales + quantity }
                  : p
              )
            }));
          }

          // Create immutable ledger entry
          const ledgerEntry: InventoryLedgerEntry = {
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId,
            productName: product.name,
            changeType: 'DEDUCTION',
            quantityBefore: product.stock,
            quantityChange: -quantity,
            quantityAfter: newStock,
            reason,
            referenceId,
            userId: authStoreForStock.seller?.id || 'SYSTEM',
            notes: notes || `Stock deducted for ${reason.replace('_', ' ').toLowerCase()}`
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry]
          }));

          // Check for low stock alerts
          get().checkLowStock();

          console.log(`✅ Stock deducted: ${product.name} - ${quantity} units. New stock: ${newStock}. Ledger ID: ${ledgerEntry.id}`);
        } catch (error) {
          console.error('Failed to deduct stock:', error);
          throw error;
        }
      },

      // Add stock (replenishment)
      addStock: async (productId, quantity, reason, notes) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
          }

          const newStock = product.stock + quantity;
          const authStoreForAdd = useAuthStore.getState();

          // Use Supabase if configured
          if (isSupabaseConfigured()) {
            await productService.addStock(
              productId,
              quantity,
              reason || 'STOCK_REPLENISHMENT',
              authStoreForAdd.seller?.id
            );
            // Refresh from DB to get updated stock
            await get().fetchProducts({ sellerId: authStoreForAdd.seller?.id });
          } else {
            // Fallback: Update locally
            set((state) => ({
              products: state.products.map(p =>
                p.id === productId
                  ? { ...p, stock: newStock }
                  : p
              )
            }));
          }

          // Create ledger entry
          const ledgerEntry: InventoryLedgerEntry = {
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId,
            productName: product.name,
            changeType: 'ADDITION',
            quantityBefore: product.stock,
            quantityChange: quantity,
            quantityAfter: newStock,
            reason: 'STOCK_REPLENISHMENT',
            referenceId: `REPL-${Date.now()}`,
            userId: authStoreForAdd.seller?.id || 'SYSTEM',
            notes: notes || reason
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry]
          }));

          get().checkLowStock();

          console.log(`✅ Stock added: ${product.name} + ${quantity} units. New stock: ${newStock}`);
        } catch (error) {
          console.error('Failed to add stock:', error);
          throw error;
        }
      },

      // Manual stock adjustment (requires reason)
      adjustStock: (productId, newQuantity, reason, notes) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          if (newQuantity < 0) {
            throw new Error('Stock quantity cannot be negative');
          }

          if (!notes || notes.trim() === '') {
            throw new Error('Adjustment notes are required');
          }

          const quantityChange = newQuantity - product.stock;

          set((state) => ({
            products: state.products.map(p =>
              p.id === productId
                ? { ...p, stock: newQuantity }
                : p
            )
          }));

          // Create ledger entry
          const ledgerEntry: InventoryLedgerEntry = {
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId,
            productName: product.name,
            changeType: 'ADJUSTMENT',
            quantityBefore: product.stock,
            quantityChange,
            quantityAfter: newQuantity,
            reason: 'MANUAL_ADJUSTMENT',
            referenceId: `ADJ-${Date.now()}`,
            userId: useAuthStore.getState().seller?.id || 'SYSTEM',
            notes: `${reason}: ${notes}`
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry]
          }));

          get().checkLowStock();

          console.log(`✅ Stock adjusted: ${product.name}. Old: ${product.stock}, New: ${newQuantity}`);
        } catch (error) {
          console.error('Failed to adjust stock:', error);
          throw error;
        }
      },

      // Reserve stock for online orders (before payment)
      reserveStock: (productId, quantity, orderId) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          if (product.stock < quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }

          const newStock = product.stock - quantity;

          set((state) => ({
            products: state.products.map(p =>
              p.id === productId
                ? { ...p, stock: newStock }
                : p
            )
          }));

          // Create ledger entry
          const ledgerEntry: InventoryLedgerEntry = {
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId,
            productName: product.name,
            changeType: 'RESERVATION',
            quantityBefore: product.stock,
            quantityChange: -quantity,
            quantityAfter: newStock,
            reason: 'RESERVATION',
            referenceId: orderId,
            userId: useAuthStore.getState().seller?.id || 'SYSTEM',
            notes: `Stock reserved for order ${orderId}`
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry]
          }));

          get().checkLowStock();
        } catch (error) {
          console.error('Failed to reserve stock:', error);
          throw error;
        }
      },

      // Release reserved stock (order cancelled)
      releaseStock: (productId, quantity, orderId) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          const newStock = product.stock + quantity;

          set((state) => ({
            products: state.products.map(p =>
              p.id === productId
                ? { ...p, stock: newStock }
                : p
            )
          }));

          // Create ledger entry
          const ledgerEntry: InventoryLedgerEntry = {
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId,
            productName: product.name,
            changeType: 'RELEASE',
            quantityBefore: product.stock,
            quantityChange: quantity,
            quantityAfter: newStock,
            reason: 'ORDER_CANCELLATION',
            referenceId: orderId,
            userId: useAuthStore.getState().seller?.id || 'SYSTEM',
            notes: `Stock released from cancelled order ${orderId}`
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry]
          }));

          get().checkLowStock();
        } catch (error) {
          console.error('Failed to release stock:', error);
          throw error;
        }
      },

      // Get ledger entries for a specific product
      getLedgerByProduct: (productId) => {
        return get().inventoryLedger
          .filter(entry => entry.productId === productId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      },

      // Get recent ledger entries
      getRecentLedgerEntries: (limit = 50) => {
        return get().inventoryLedger
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      },

      // Check for low stock and create alerts
      checkLowStock: () => {
        const threshold = get().getLowStockThreshold();
        const products = get().products;
        const currentAlerts = get().lowStockAlerts;

        products.forEach(product => {
          if (product.stock > 0 && product.stock < threshold) {
            // Check if alert already exists
            const existingAlert = currentAlerts.find(
              alert => alert.productId === product.id && !alert.acknowledged
            );

            if (!existingAlert) {
              const newAlert: LowStockAlert = {
                id: `alert-${Date.now()}-${product.id}`,
                productId: product.id,
                productName: product.name,
                currentStock: product.stock,
                threshold,
                timestamp: new Date().toISOString(),
                acknowledged: false
              };

              set((state) => ({
                lowStockAlerts: [...state.lowStockAlerts, newAlert]
              }));

              console.warn(`⚠️ LOW STOCK ALERT: ${product.name} - Only ${product.stock} units remaining!`);
            }
          }
        });
      },

      // Acknowledge low stock alert
      acknowledgeLowStockAlert: (alertId) => {
        set((state) => ({
          lowStockAlerts: state.lowStockAlerts.map(alert =>
            alert.id === alertId
              ? { ...alert, acknowledged: true }
              : alert
          )
        }));
      },

      // Get low stock threshold
      getLowStockThreshold: () => 10, // Can be made configurable later
    }),
    {
      name: 'seller-products-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (state: unknown, version: number) => {
        if (version < 2) {
          const oldState = (state || {}) as Record<string, unknown>;
          return {
            ...oldState,
            products: [],
            inventoryLedger: [],
            lowStockAlerts: [],
            loading: false,
            error: null,
          };
        }
        return state as ProductStore;
      },
    }
  )
);

// Legacy internal order store (kept private for backward compatibility)
const useLegacyOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: dummyOrders,
      sellerId: null,
      loading: false,
      error: null,

      fetchOrders: async (sellerId: string) => {
        if (!sellerId) {
          console.error('Seller ID is required to fetch orders');
          return;
        }

        set({ loading: true, error: null, sellerId });

        try {
          const dbOrders = await orderService.getSellerOrders(sellerId);
          const sellerOrders = dbOrders.map(mapOrderToSellerOrder);

          set({
            orders: sellerOrders,
            loading: false,
            error: null
          });

          console.log(`✅ Fetched ${sellerOrders.length} orders for seller ${sellerId}`);
        } catch (error) {
          console.error('Failed to fetch orders:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch orders'
          });
        }
      },

      addOrder: (orderData) => {
        try {
          // Validate order data
          if (!validateOrder(orderData)) {
            console.error('Invalid order data:', orderData);
            throw new Error('Invalid order data');
          }

          // Sanitize and normalize data
          const sanitizedOrder = sanitizeOrder(orderData);

          // Generate unique ID with timestamp for database compatibility
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substr(2, 9);
          const orderId = `ord-${timestamp}-${randomStr}`;

          // Create order object
          const newOrder: SellerOrder = {
            id: orderId,
            ...sanitizedOrder
          };

          // Atomic operation: add order to state
          set((state) => ({
            orders: [...state.orders, newOrder]
          }));

          console.log('Order created successfully:', orderId);
          return orderId;
        } catch (error) {
          console.error('Failed to create order:', error);
          throw error;
        }
      },

      updateOrderStatus: async (id, status) => {
        const order = get().orders.find(o => o.id === id);
        if (!order) {
          console.error('Order not found:', id);
          throw new Error(`Order ${id} not found`);
        }

        // Store previous status for rollback if needed
        const previousStatus = order.status;

        // OPTIMISTIC UPDATE: Update local state immediately for instant UI feedback
        set((state) => ({
          orders: state.orders.map(o =>
            o.id === id ? { ...o, status } : o
          ),
        }));

        try {
          // Validate status transition (UI status: pending, to-ship, completed, cancelled)
          const validTransitions: Record<string, string[]> = {
            'pending': ['to-ship', 'cancelled'],
            'to-ship': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': [],
            // Legacy status support
            'confirmed': ['to-ship', 'shipped', 'cancelled'],
            'shipped': ['delivered', 'completed', 'cancelled'],
            'delivered': []
          };

          const allowedTransitions = validTransitions[previousStatus] || [];
          if (allowedTransitions.length > 0 && !allowedTransitions.includes(status)) {
            console.warn(`Warning: Unusual status transition: ${previousStatus} -> ${status}`);
          }

          // Map UI status to database shipment_status
          const statusToDbMap: Record<string, string> = {
            'pending': 'waiting_for_seller',
            'to-ship': 'ready_to_ship',
            'completed': 'delivered',
            'cancelled': 'cancelled',
            // Legacy mappings
            'confirmed': 'processing',
            'shipped': 'shipped',
            'delivered': 'delivered'
          };

          const dbStatus = statusToDbMap[status] || status;
          console.log(`📝 Mapping UI status '${status}' to database status '${dbStatus}'`);

          // Get seller ID from OrderStore (stored in fetchOrders)
          let sellerId = get().sellerId;

          // Fallback: Extract seller ID from order object if store doesn't have it
          if (!sellerId && (order as any).seller_id) {
            sellerId = (order as any).seller_id;
            console.log(`✅ Fallback: Using seller_id from order object: ${sellerId}`);
          }

          if (!sellerId) {
            console.error('❌ No seller ID found! Cannot update database.');
            throw new Error('Seller ID is required to update order status');
          }

          console.log(`🔄 Updating order ${id} in database...`);
          const success = await orderService.updateOrderStatus(
            id,
            dbStatus,
            `Status updated to ${status}`,
            sellerId,
            'seller'
          );

          if (!success) {
            throw new Error('Database update failed');
          }

          console.log(`✅ Database updated successfully with status: ${dbStatus}`);

          // Create notification for buyer if order has buyer_id (fire and forget)
          if (order.buyer_id) {
            const statusMessages: Record<string, string> = {
              'confirmed': `Your order #${id.slice(-8)} has been confirmed and is being prepared.`,
              'shipped': `Your order #${id.slice(-8)} has been shipped and is on its way!`,
              'delivered': `Your order #${id.slice(-8)} has been delivered. Enjoy your purchase!`,
              'cancelled': `Your order #${id.slice(-8)} has been cancelled.`
            };

            const message = statusMessages[status] || `Order #${id.slice(-8)} status updated to ${status}`;

            // Fire and forget - don't wait for notification
            import('../services/notificationService').then(({ notificationService }) => {
              notificationService.notifyBuyerOrderStatus({
                buyerId: order.buyer_id!,
                orderId: id,
                orderNumber: id.slice(-8),
                status,
                message
              }).catch(err => {
                console.error('❌ Failed to create buyer notification:', err);
              });
            });
          }

          console.log(`✅ Order ${id} status updated to ${status}`);
        } catch (error) {
          // ROLLBACK: Revert local state on error
          console.error('Failed to update order status, rolling back:', error);
          set((state) => ({
            orders: state.orders.map(o =>
              o.id === id ? { ...o, status: previousStatus } : o
            ),
          }));
          throw error;
        }
      },

      updatePaymentStatus: (id, status) => {
        try {
          const order = get().orders.find(o => o.id === id);
          if (!order) {
            throw new Error(`Order ${id} not found`);
          }

          set((state) => ({
            orders: state.orders.map(order =>
              order.id === id ? { ...order, paymentStatus: status } : order
            )
          }));
        } catch (error) {
          console.error('Failed to update payment status:', error);
          throw error;
        }
      },

      getOrdersByStatus: (status) => {
        return get().orders.filter(order => order.status === status);
      },

      getOrderById: (id) => {
        return get().orders.find(order => order.id === id);
      },

      addTrackingNumber: (id, trackingNumber) => {
        try {
          const order = get().orders.find(o => o.id === id);
          if (!order) {
            throw new Error(`Order ${id} not found`);
          }

          if (!trackingNumber?.trim()) {
            throw new Error('Invalid tracking number');
          }

          set((state) => ({
            orders: state.orders.map(order =>
              order.id === id ? { ...order, trackingNumber: trackingNumber.trim().toUpperCase() } : order
            )
          }));
        } catch (error) {
          console.error('Failed to add tracking number:', error);
          throw error;
        }
      },

      deleteOrder: (id) => {
        try {
          const order = get().orders.find(o => o.id === id);
          if (!order) {
            throw new Error(`Order ${id} not found`);
          }

          set((state) => ({
            orders: state.orders.filter(order => order.id !== id)
          }));
        } catch (error) {
          console.error('Failed to delete order:', error);
          throw error;
        }
      },

      addOrderRating: (id, rating, comment, images) => {
        try {
          const order = get().orders.find(o => o.id === id);
          if (!order) {
            throw new Error(`Order ${id} not found`);
          }

          if (rating < 1 || rating > 5) {
            throw new Error('Rating must be between 1 and 5');
          }

          set((state) => ({
            orders: state.orders.map(order =>
              order.id === id
                ? {
                  ...order,
                  rating,
                  reviewComment: comment,
                  reviewImages: images,
                  reviewDate: new Date().toISOString(),
                  status: 'delivered', // Ensure delivered when rated
                  paymentStatus: 'paid' // Mark as paid after successful delivery
                }
                : order
            )
          }));

          console.log(`Order ${id} rated: ${rating} stars`);
        } catch (error) {
          console.error('Failed to add order rating:', error);
          throw error;
        }
      },

      // POS-Lite: Add offline order and deduct stock
      addOfflineOrder: async (cartItems, total, note) => {
        try {
          // Validate cart items
          if (!cartItems || cartItems.length === 0) {
            throw new Error('Cart is empty');
          }

          if (total <= 0) {
            throw new Error('Invalid order total');
          }

          // Check stock availability for all items before proceeding
          const productStore = useProductStore.getState();
          for (const item of cartItems) {
            const product = productStore.products.find(p => p.id === item.productId);
            if (!product) {
              throw new Error(`Product ${item.productName} not found`);
            }
            if (product.stock < item.quantity) {
              throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
            }
          }

          // Get seller info for database order
          const authStore = useAuthStore.getState();
          const sellerId = authStore.seller?.id || '';
          const sellerName = authStore.seller?.store_name || authStore.seller?.owner_name || 'Unknown Store';

          console.log(`[createOfflineOrder] Creating POS order in database for seller: ${sellerId}`);

          // Create order in database using orderService
          const result = await orderService.createPOSOrder(
            sellerId,
            sellerName,
            cartItems,
            total,
            note,
          );

          if (!result) {
            throw new Error('Failed to create POS order in database');
          }

          const { orderId, orderNumber } = result;
          console.log(`[createOfflineOrder] Order created in database: ${orderNumber} (${orderId})`);

          // Create local order for UI (backwards compatibility)
          const newOrder: SellerOrder = {
            id: orderId,
            buyerName: 'Walk-in Customer',
            buyerEmail: 'pos@offline.sale',
            items: cartItems,
            total,
            status: 'delivered', // POS orders are immediately completed
            paymentStatus: 'paid', // POS orders are paid upfront
            orderDate: new Date().toISOString(),
            shippingAddress: {
              fullName: 'Walk-in Customer',
              street: 'In-Store Purchase',
              city: 'N/A',
              province: 'N/A',
              postalCode: '0000',
              phone: 'N/A'
            },
            type: 'OFFLINE', // Mark as offline order
            posNote: note || 'POS Sale',
            trackingNumber: orderNumber
          };

          // Add order to local store
          set((state) => ({
            orders: [newOrder, ...state.orders]
          }));

          // Refresh products to show updated stock and sold counts
          console.log(`[createOfflineOrder] Refreshing products to update stock and sold counts...`);
          await productStore.fetchProducts({ sellerId });
          console.log(`[createOfflineOrder] Products refreshed. New product count: ${productStore.products.length}`);

          console.log(
            `✅ Offline order created: ${orderNumber}. Stock deducted and sold count updated in database.`,
          );
          return orderId;
        } catch (error) {
          console.error('Failed to create offline order:', error);
          throw error;
        }
      },
    }),
    {
      name: 'seller-orders-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1, // Version for migration support
    }
  )
);

// Stats Store
export const useStatsStore = create<StatsStore>()((set) => ({
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    avgRating: 0,
    monthlyRevenue: [],
    topProducts: [],
    recentActivity: [],
    revenueData: [],
    categorySales: []
  },
  refreshStats: () => {
    const orderStore = useLegacyOrderStore.getState();
    const productStore = useProductStore.getState();
    const authStore = useAuthStore.getState();

    const orders = orderStore.orders;
    const products = productStore.products;
    const seller = authStore.seller;

    // Calculate total revenue from delivered orders
    const totalRevenue = orders
      .filter(order => order.status === 'delivered')
      .reduce((sum, order) => sum + order.total, 0);

    // Total orders count
    const totalOrders = orders.length;

    // Total products count
    const totalProducts = products.length;

    // Calculate average rating from orders with ratings
    const ordersWithRatings = orders.filter(order => order.rating);
    const avgRating = ordersWithRatings.length > 0
      ? ordersWithRatings.reduce((sum, order) => sum + (order.rating || 0), 0) / ordersWithRatings.length
      : 0;

    // Calculate monthly revenue (last 12 months)
    const monthlyRevenue = calculateMonthlyRevenue(orders);

    // Calculate top products by sales
    const topProducts = calculateTopProducts(products, orders);

    // Generate recent activity from orders and products
    const recentActivity = generateRecentActivity(orders, products);

    set({
      stats: {
        totalRevenue,
        totalOrders,
        totalProducts,
        avgRating: Math.round(avgRating * 10) / 10,
        monthlyRevenue,
        topProducts,
        recentActivity,
        revenueData: monthlyRevenue, // Use same data as monthlyRevenue
        categorySales: [] // Would need to be computed from order data
      }
    });
  }
}));

// Helper function to calculate monthly revenue
function calculateMonthlyRevenue(orders: SellerOrder[]): { month: string; revenue: number }[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const monthlyData: { month: string; revenue: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    const revenue = orders
      .filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate.getMonth() === date.getMonth() &&
          orderDate.getFullYear() === year &&
          order.status === 'delivered';
      })
      .reduce((sum, order) => sum + order.total, 0);

    monthlyData.push({ month: monthName, revenue });
  }

  return monthlyData;
}

// Helper function to calculate top products
function calculateTopProducts(_products: SellerProduct[], orders: SellerOrder[]): { name: string; sales: number; revenue: number }[] {
  const productStats = new Map<string, { name: string; sales: number; revenue: number }>();

  orders.forEach(order => {
    order.items.forEach(item => {
      const existing = productStats.get(item.productId) || { name: item.productName, sales: 0, revenue: 0 };
      existing.sales += item.quantity;
      existing.revenue += item.price * item.quantity;
      productStats.set(item.productId, existing);
    });
  });

  return Array.from(productStats.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3);
}

// Helper function to generate recent activity
function generateRecentActivity(orders: SellerOrder[], products: SellerProduct[]): { id: string; type: 'order' | 'product' | 'review'; message: string; time: string }[] {
  const activities: { id: string; type: 'order' | 'product' | 'review'; message: string; time: string; timestamp: Date }[] = [];

  // Add recent orders
  orders
    .slice(-5)
    .forEach(order => {
      activities.push({
        id: order.id,
        type: 'order',
        message: `New order from ${order.buyerName}`,
        time: getRelativeTime(order.orderDate),
        timestamp: new Date(order.orderDate)
      });
    });

  // Add low stock alerts
  products
    .filter(p => p.stock < 10 && p.stock > 0)
    .slice(0, 3)
    .forEach(product => {
      activities.push({
        id: product.id,
        type: 'product',
        message: `${product.name} stock is running low (${product.stock} left)`,
        time: getRelativeTime(product.updatedAt),
        timestamp: new Date(product.updatedAt)
      });
    });

  // Add recent reviews
  orders
    .filter(order => order.rating && order.reviewDate)
    .slice(-3)
    .forEach(order => {
      activities.push({
        id: order.id,
        type: 'review',
        message: `New ${order.rating}-star review for ${order.items[0]?.productName}`,
        time: getRelativeTime(order.reviewDate!),
        timestamp: new Date(order.reviewDate!)
      });
    });

  // Sort by timestamp and return top 5
  return activities
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5)
    .map(({ timestamp, ...rest }) => rest);
}

// Helper function to get relative time
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}

// Combined useSellerStore hook for backward compatibility
// This provides a unified interface to all seller-related stores
export const useSellerStore = () => {
  const auth = useAuthStore();
  const products = useProductStore();
  const stats = useStatsStore();
  const orders = useOrderStoreExternal();

  return {
    // Auth store
    seller: auth.seller,
    isAuthenticated: auth.isAuthenticated,
    login: auth.login,
    register: auth.register,
    logout: auth.logout,
    updateSellerInfo: auth.updateSellerInfo,
    addRole: auth.addRole,
    switchRole: auth.switchRole,
    setUser: auth.setUser,
    user: auth.user,

    // Product store (with fallback to empty array)
    products: products.products || [],
    loading: products.loading,
    error: products.error,
    inventoryLedger: products.inventoryLedger || [],
    lowStockAlerts: products.lowStockAlerts || [],
    fetchProducts: products.fetchProducts,
    addProduct: products.addProduct,
    updateProduct: products.updateProduct,
    deleteProduct: products.deleteProduct,
    toggleProductStatus: products.toggleProductStatus,
    getProductById: products.getProductById,
    getProductsByCategory: products.getProductsByCategory,
    searchProducts: products.searchProducts,
    addInventoryEntry: products.addInventoryEntry,
    deductStock: products.deductStock,
    releaseStock: products.releaseStock,
    getLedgerByProduct: products.getLedgerByProduct,
    getRecentLedgerEntries: products.getRecentLedgerEntries,
    checkLowStock: products.checkLowStock,
    acknowledgeLowStockAlert: products.acknowledgeLowStockAlert,
    getLowStockThreshold: products.getLowStockThreshold,
    subscribeToProducts: products.subscribeToProducts,

    // Stats store
    stats: stats.stats,
    refreshStats: stats.refreshStats,

    // Revenue data & category sales
    revenueData: stats.stats.revenueData || [],
    categorySales: stats.stats.categorySales || [],

    // Order store (with fallback to empty array)
    orders: orders.sellerOrders || [],
    ordersLoading: orders.sellerOrdersLoading,
    fetchOrders: orders.fetchSellerOrders,
    updateOrderStatus: orders.updateSellerOrderStatus,
    markOrderAsShipped: orders.markOrderAsShipped,
    markOrderAsDelivered: orders.markOrderAsDelivered,
    addOfflineOrder: orders.addOfflineOrder,
  };
};
