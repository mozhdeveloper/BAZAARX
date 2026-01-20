import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProductQAStore } from './productQAStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { signIn, signUp, getSellerProfile, getEmailFromProfile } from '@/services/authService';
import {
  addStock as addStockDb,
  createProduct as createProductDb,
  createProducts as createProductsDb,
  deleteProduct as deleteProductDb,
  deductStock as deductStockDb,
  getProducts as fetchProductsDb,
  updateProduct as updateProductDb,
} from '@/services/productService';
import type { Product as DBProduct, Seller as DBSeller, Database } from '@/types/database.types';

// Types
interface Seller {
  id: string;

  // Personal Info
  name: string;
  ownerName: string;
  email: string;
  phone: string;

  // Business Info
  businessName: string;
  storeName: string;
  storeDescription: string;
  storeCategory: string[];
  businessType: string;
  businessRegistrationNumber: string;
  taxIdNumber: string;

  // Address
  businessAddress: string;
  city: string;
  province: string;
  postalCode: string;
  storeAddress: string; // Combined address

  // Banking
  bankName: string;
  accountName: string;
  accountNumber: string;

  // Document URLs
  businessPermitUrl?: string;
  validIdUrl?: string;
  proofOfAddressUrl?: string;
  dtiRegistrationUrl?: string;
  taxIdUrl?: string;

  // Status
  isVerified: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  rating: number;
  totalSales: number;
  joinDate: string;
  avatar?: string;
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
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  sales: number;
  rating: number;
  reviews: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'reclassified';
  rejectionReason?: string;
  vendorSubmittedCategory?: string;
  adminReclassifiedCategory?: string;
  sellerName?: string;
  sellerRating?: number;
}

interface SellerOrder {
  id: string;
  buyerName: string;
  buyerEmail: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
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
  monthlyRevenue: { month: string; revenue: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  recentActivity: {
    id: string;
    type: 'order' | 'product' | 'review';
    message: string;
    time: string;
  }[];
}

interface AuthStore {
  seller: Seller | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (sellerData: Partial<Seller> & { email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<Seller>) => void;
  updateSellerDetails: (details: Partial<Seller>) => void;
  authenticateSeller: () => void;
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
  addProduct: (product: Omit<SellerProduct, 'id' | 'createdAt' | 'updatedAt' | 'sales' | 'rating' | 'reviews'>) => Promise<void>;
  bulkAddProducts: (products: Array<{ name: string; description: string; price: number; originalPrice?: number; stock: number; category: string; imageUrl: string }>) => void;
  updateProduct: (id: string, updates: Partial<SellerProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProduct: (id: string) => SellerProduct | undefined;
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
}

interface OrderStore {
  orders: SellerOrder[];
  addOrder: (order: Omit<SellerOrder, 'id'>) => string;
  updateOrderStatus: (id: string, status: SellerOrder['status']) => void;
  updatePaymentStatus: (id: string, status: SellerOrder['paymentStatus']) => void;
  getOrdersByStatus: (status: SellerOrder['status']) => SellerOrder[];
  getOrderById: (id: string) => SellerOrder | undefined;
  addTrackingNumber: (id: string, trackingNumber: string) => void;
  deleteOrder: (id: string) => void;
  addOrderRating: (id: string, rating: number, comment?: string, images?: string[]) => void;
  // POS-Lite functionality
  addOfflineOrder: (cartItems: { productId: string; productName: string; quantity: number; price: number; image: string }[], total: number, note?: string) => string;
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

// Optional fallback seller ID for Supabase inserts (set VITE_SUPABASE_SELLER_ID in .env for testing)
const fallbackSellerId = (import.meta as { env?: { VITE_SUPABASE_SELLER_ID?: string } }).env?.VITE_SUPABASE_SELLER_ID;

const mapDbSellerToSeller = (s: DBSeller): Seller => ({
  id: s.id,
  name: s.business_name || s.store_name || 'Seller',
  ownerName: s.business_name || s.store_name || 'Seller',
  email: '',
  phone: s.business_address || '',
  businessName: s.business_name || '',
  storeName: s.store_name || '',
  storeDescription: s.store_description || '',
  storeCategory: s.store_category || [],
  businessType: s.business_type || '',
  businessRegistrationNumber: s.business_registration_number || '',
  taxIdNumber: s.tax_id_number || '',
  businessAddress: s.business_address || '',
  city: s.city || '',
  province: s.province || '',
  postalCode: s.postal_code || '',
  storeAddress: s.business_address || '',
  bankName: s.bank_name || '',
  accountName: s.account_name || '',
  accountNumber: s.account_number || '',
  isVerified: Boolean(s.is_verified),
  approvalStatus: (s.approval_status as Seller['approvalStatus']) || 'pending',
  rating: s.rating ?? 0,
  totalSales: s.total_sales ?? 0,
  joinDate: s.join_date || new Date().toISOString().split('T')[0],
  avatar: undefined,
});

const mapDbProductToSellerProduct = (p: any): SellerProduct => ({
  id: p.id,
  name: p.name || '',
  description: p.description || '',
  price: Number(p.price ?? 0),
  originalPrice: p.original_price ?? undefined,
  stock: p.stock ?? 0,
  category: p.category || '',
  images: p.images || [],
  sizes: p.sizes || [],
  colors: p.colors || [],
  isActive: Boolean(p.is_active),
  sellerId: p.seller_id || '',
  createdAt: p.created_at || '',
  updatedAt: p.updated_at || '',
  sales: p.sales_count ?? 0,
  rating: Number(p.rating ?? 0),
  reviews: p.review_count ?? 0,
  approvalStatus: (p.approval_status as SellerProduct['approvalStatus']) || 'pending',
  rejectionReason: p.rejection_reason || undefined,
  vendorSubmittedCategory: p.vendor_submitted_category || undefined,
  adminReclassifiedCategory: p.admin_reclassified_category || undefined,
  sellerName: p.seller?.store_name || p.seller?.business_name || 'Verified Seller',
  sellerRating: p.seller?.rating || 0
});

const buildProductInsert = (product: Omit<SellerProduct, 'id' | 'createdAt' | 'updatedAt' | 'sales' | 'rating' | 'reviews'>, sellerId: string): ProductInsert => ({
  name: product.name,
  description: product.description,
  price: product.price,
  original_price: product.originalPrice !== undefined ? product.originalPrice : null,
  stock: product.stock,
  category: product.category,
  images: product.images,
  sizes: product.sizes || [],
  colors: product.colors || [],
  is_active: product.isActive ?? true,
  seller_id: sellerId,
  approval_status: 'pending',
  vendor_submitted_category: product.vendorSubmittedCategory || product.category,
  // Optional fields with defaults
  category_id: null,
  brand: null,
  sku: null,
  low_stock_threshold: 10,
  primary_image: product.images[0] || null,
  variants: [],
  specifications: {},
  rejection_reason: null,
  admin_reclassified_category: null,
  rating: 0,
  review_count: 0,
  sales_count: 0,
  view_count: 0,
  weight: null,
  dimensions: null,
  is_free_shipping: false,
  tags: [],
});

const mapSellerUpdatesToDb = (updates: Partial<SellerProduct>): ProductUpdate => ({
  name: updates.name,
  description: updates.description,
  price: updates.price,
  original_price: updates.originalPrice,
  stock: updates.stock,
  category: updates.category,
  images: updates.images,
  sizes: updates.sizes,
  colors: updates.colors,
  is_active: updates.isActive,
  approval_status: updates.approvalStatus,
  rejection_reason: updates.rejectionReason,
  vendor_submitted_category: updates.vendorSubmittedCategory,
  admin_reclassified_category: updates.adminReclassifiedCategory,
});

// Dummy data
const dummySeller: Seller = {
  id: 'seller-1',
  name: 'Juan Cruz',
  ownerName: 'Juan Cruz',
  email: 'seller@bazaarph.com',
  phone: '+63 912 345 6789',
  businessName: 'Cruz Electronics Corp.',
  storeName: 'Cruz Electronics',
  storeDescription: 'Premium electronics and gadgets for the modern Filipino family',
  storeCategory: ['Electronics', 'Gadgets'],
  businessType: 'corporation',
  businessRegistrationNumber: 'SEC-2023-001234',
  taxIdNumber: '123-456-789-000',
  businessAddress: '123 Ayala Avenue, Brgy. Poblacion',
  city: 'Makati City',
  province: 'Metro Manila',
  postalCode: '1200',
  storeAddress: '123 Ayala Avenue, Makati City, Metro Manila 1200',
  bankName: 'BDO',
  accountName: 'Cruz Electronics Corp.',
  accountNumber: '1234567890',
  isVerified: true,
  approvalStatus: 'approved',
  rating: 4.8,
  totalSales: 1580000,
  joinDate: '2023-01-15',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
};

const dummyProducts: SellerProduct[] = [
  {
    id: 'prod-1',
    name: 'iPhone 15 Pro Max',
    description: 'Latest iPhone with A17 Pro chip',
    price: 89990,
    originalPrice: 95990,
    stock: 25,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1696446702188-41d37c5f1c9a?w=400'],
    isActive: true,
    sellerId: 'seller-1',
    createdAt: '2024-12-01',
    updatedAt: '2024-12-10',
    sales: 45,
    rating: 4.9,
    reviews: 128,
    approvalStatus: 'approved'
  },
  {
    id: 'prod-2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Flagship Android phone with S Pen',
    price: 79990,
    originalPrice: 85990,
    stock: 18,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400'],
    isActive: true,
    sellerId: 'seller-1',
    createdAt: '2024-11-15',
    updatedAt: '2024-12-08',
    sales: 32,
    rating: 4.7,
    reviews: 89,
    approvalStatus: 'pending'
  },
  {
    id: 'prod-3',
    name: 'MacBook Pro M3',
    description: '14-inch MacBook Pro with M3 chip',
    price: 129990,
    originalPrice: 139990,
    stock: 12,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400'],
    isActive: true,
    sellerId: 'seller-1',
    createdAt: '2024-11-20',
    updatedAt: '2024-12-05',
    sales: 18,
    rating: 4.8,
    reviews: 42,
    approvalStatus: 'approved'
  }
];

const dummyOrders: SellerOrder[] = [
  {
    id: 'ord-1',
    buyerName: 'Maria Santos',
    buyerEmail: 'maria@example.com',
    items: [
      {
        productId: 'prod-1',
        productName: 'iPhone 15 Pro Max',
        quantity: 1,
        price: 89990,
        image: 'https://images.unsplash.com/photo-1696446702188-41d37c5f1c9a?w=100'
      }
    ],
    total: 89990,
    status: 'pending',
    paymentStatus: 'paid',
    orderDate: '2024-12-12T10:30:00Z',
    shippingAddress: {
      fullName: 'Maria Santos',
      street: '123 Rizal Street',
      city: 'Quezon City',
      province: 'Metro Manila',
      postalCode: '1100',
      phone: '+63 917 123 4567'
    }
  },
  {
    id: 'ord-2',
    buyerName: 'Carlos Reyes',
    buyerEmail: 'carlos@example.com',
    items: [
      {
        productId: 'prod-2',
        productName: 'Samsung Galaxy S24 Ultra',
        quantity: 1,
        price: 79990,
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=100'
      }
    ],
    total: 79990,
    status: 'shipped',
    paymentStatus: 'paid',
    orderDate: '2024-12-10T14:20:00Z',
    trackingNumber: 'TRK123456789',
    shippingAddress: {
      fullName: 'Carlos Reyes',
      street: '456 Bonifacio Avenue',
      city: 'Makati City',
      province: 'Metro Manila',
      postalCode: '1200',
      phone: '+63 918 987 6543'
    }
  }
];

// Auth Store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      seller: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        if (!isSupabaseConfigured()) {
          await new Promise(resolve => setTimeout(resolve, 500));
          if ((email === 'seller@bazaarph.com' || email === 'juan@example.com') && (password === 'password' || password === 'password123')) {
            set({ seller: dummySeller, isAuthenticated: true });
            return true;
          }
          return false;
        }

        try {
          const { user, error } = await signIn(email, password);
          if (error || !user) {
            console.error('Supabase login failed:', error);
            return false;
          }

          const sellerProfile = await getSellerProfile(user.id);
          if (!sellerProfile) {
            console.error('No seller profile found for user');
            return false;
          }

          // Fetch email from profiles table and merge with seller profile
          const userEmail = await getEmailFromProfile(user.id);
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
          // Existing mock flow
          const fullAddress = `${sellerData.businessAddress}, ${sellerData.city}, ${sellerData.province} ${sellerData.postalCode}`;
          const newSeller: Seller = {
            id: `seller-${Date.now()}`,
            name: sellerData.ownerName || sellerData.email?.split('@')[0] || 'New Seller',
            ownerName: sellerData.ownerName || '',
            email: sellerData.email!,
            phone: sellerData.phone || '',
            businessName: sellerData.businessName || '',
            storeName: sellerData.storeName || 'My Store',
            storeDescription: sellerData.storeDescription || '',
            storeCategory: sellerData.storeCategory || [],
            businessType: sellerData.businessType || '',
            businessRegistrationNumber: sellerData.businessRegistrationNumber || '',
            taxIdNumber: sellerData.taxIdNumber || '',
            businessAddress: sellerData.businessAddress || '',
            city: sellerData.city || '',
            province: sellerData.province || '',
            postalCode: sellerData.postalCode || '',
            storeAddress: fullAddress,
            bankName: sellerData.bankName || '',
            accountName: sellerData.accountName || '',
            accountNumber: sellerData.accountNumber || '',
            isVerified: false,
            approvalStatus: 'pending',
            rating: 0,
            totalSales: 0,
            joinDate: new Date().toISOString().split('T')[0]
          };
          set({ seller: newSeller, isAuthenticated: false });
          return true;
        }

        try {
          // 1) Supabase Auth sign-up
          const { user, error } = await signUp(sellerData.email!, sellerData.password!, {
            full_name: sellerData.ownerName || sellerData.storeName || sellerData.email?.split('@')[0],
            phone: sellerData.phone,
            user_type: 'seller',
          });

          if (error || !user) {
            console.error('Signup failed:', error);
            // Check if it's a duplicate email error
            if (error?.message?.includes('already registered') || error?.code === '23505') {
              console.error('Email already exists. Please use a different email or try logging in.');
            }
            return false;
          }

          // 2) Create seller record (use upsert to handle conflicts)
          const sellerRow = {
            id: user.id,
            business_name: sellerData.businessName || sellerData.storeName || 'My Store',
            store_name: sellerData.storeName || 'My Store',
            store_description: sellerData.storeDescription || null,
            store_category: sellerData.storeCategory || ['General'],
            business_type: sellerData.businessType || 'sole_proprietor',
            business_registration_number: sellerData.businessRegistrationNumber || null,
            tax_id_number: sellerData.taxIdNumber || null,
            business_address: sellerData.businessAddress || sellerData.storeAddress || '',
            city: sellerData.city || null,
            province: sellerData.province || null,
            postal_code: sellerData.postalCode || null,
            bank_name: sellerData.bankName || null,
            account_name: sellerData.accountName || null,
            account_number: sellerData.accountNumber || null,
            is_verified: false,
            approval_status: 'pending' as const,
            rating: 0,
            total_sales: 0,
          };

          // @ts-expect-error - Database types need to be regenerated
          const { error: sellerError } = await supabase.from('sellers').upsert(sellerRow, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

          if (sellerError) {
            console.error('Seller insert failed:', sellerError);
            return false;
          }

          // 3) Set local auth state as pending (awaiting approval)
          set({ seller: mapDbSellerToSeller(sellerRow as DBSeller), isAuthenticated: false });
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
        if (seller && seller.isVerified) {
          set({ isAuthenticated: true });
        }
      }
    }),
    {
      name: 'seller-auth-storage'
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
          set({ products: dummyProducts, loading: false, error: null });
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await fetchProductsDb(filters);
          set({
            products: (data || []).map(mapDbProductToSellerProduct),
            loading: false,
          });
          get().checkLowStock();
        } catch (error: unknown) {
          console.error('Error loading products from Supabase:', error);
          set({ error: (error as Error)?.message || 'Failed to load products', loading: false });
        }
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
            const insertData = buildProductInsert(product, resolvedSellerId);
            const created = await createProductDb(insertData);
            if (!created) {
              throw new Error('Failed to create product in database');
            }
            newProduct = mapDbProductToSellerProduct(created);
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
              approvalStatus: 'pending',
              vendorSubmittedCategory: product.category,
              sizes: product.sizes || [],
              colors: product.colors || [],
              sellerId: resolvedSellerId,
            };
          }

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
            qaStore.addProductToQA({
              id: newProduct.id,
              name: newProduct.name,
              vendor: authStoreState.seller?.name || 'Unknown Vendor',
              price: newProduct.price,
              category: newProduct.category,
              image: newProduct.images[0] || 'https://placehold.co/100?text=Product',
            });
          } catch (qaError) {
            console.error('Error adding product to QA flow:', qaError);
          }
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
            const productsToInsert = bulkProducts.map(p => buildProductInsert({
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
            } as any, resolvedSellerId));

            const dbProducts = await createProductsDb(productsToInsert);
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
                approvalStatus: 'pending',
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
              qaStore.addProductToQA({
                id: p.id,
                name: p.name,
                description: p.description,
                vendor: authStore.seller?.name || 'Unknown Vendor',
                price: p.price,
                originalPrice: p.originalPrice,
                category: p.category,
                image: p.images[0],
              });
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
            const updated = await updateProductDb(id, updateData);
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
            const success = await deleteProductDb(id);
            if (!success) {
              throw new Error('Failed to delete product from database');
            }
          }

          set((state) => ({
            products: state.products.filter(product => product.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting product:', error);
          throw error;
        }
      },

      getProduct: (id) => {
        return get().products.find(product => product.id === id);
      },

      // POS-Lite: Deduct stock with full audit trail
      deductStock: async (productId, quantity, reason, referenceId, notes) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          // RULE: No negative stock allowed
          if (product.stock < quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
          }

          const newStock = product.stock - quantity;
          const authStoreForStock = useAuthStore.getState();

          // Use Supabase if configured
          if (isSupabaseConfigured()) {
            const success = await deductStockDb(
              productId,
              quantity,
              reason,
              referenceId,
              authStoreForStock.seller?.id
            );
            if (!success) {
              throw new Error('Failed to deduct stock in database');
            }
            // Refresh from DB to get updated stock
            await get().fetchProducts({ sellerId: authStoreForStock.seller?.id });
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
            const success = await addStockDb(
              productId,
              quantity,
              reason || 'STOCK_REPLENISHMENT',
              authStoreForAdd.seller?.id
            );
            if (!success) {
              throw new Error('Failed to add stock in database');
            }
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

// Order Store
export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: dummyOrders,

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

      updateOrderStatus: (id, status) => {
        try {
          const order = get().orders.find(o => o.id === id);
          if (!order) {
            console.error('Order not found:', id);
            throw new Error(`Order ${id} not found`);
          }

          // Validate status transition (database-ready logic)
          const validTransitions: Record<SellerOrder['status'], SellerOrder['status'][]> = {
            'pending': ['confirmed', 'cancelled'],
            'confirmed': ['shipped', 'cancelled'],
            'shipped': ['delivered', 'cancelled'],
            'delivered': [],
            'cancelled': []
          };

          if (!validTransitions[order.status].includes(status)) {
            console.warn(`Invalid status transition: ${order.status} -> ${status}`);
          }

          set((state) => ({
            orders: state.orders.map(order =>
              order.id === id ? { ...order, status } : order
            )
          }));
        } catch (error) {
          console.error('Failed to update order status:', error);
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
      addOfflineOrder: (cartItems, total, note) => {
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

          // Generate order ID
          const orderId = `POS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Create offline order
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
            trackingNumber: `OFFLINE-${Date.now().toString().slice(-8)}`
          };

          // Add order to store
          set((state) => ({
            orders: [newOrder, ...state.orders]
          }));

          // Deduct stock for each item with full audit trail
          for (const item of cartItems) {
            productStore.deductStock(
              item.productId,
              item.quantity,
              'OFFLINE_SALE',
              orderId,
              `POS sale: ${item.productName} x${item.quantity}`
            );
          }

          console.log(`✅ Offline order created: ${orderId}. Stock updated with ledger entries.`);
          return orderId;
        } catch (error) {
          console.error('Failed to create offline order:', error);
          throw error;
        }
      },
    }),
    {
      name: 'seller-orders-storage',
      version: 1, // Version for migration support
    }
  )
);

// Stats Store
export const useStatsStore = create<StatsStore>()((set, get) => ({
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    avgRating: 0,
    monthlyRevenue: [],
    topProducts: [],
    recentActivity: []
  },
  refreshStats: () => {
    const orderStore = useOrderStore.getState();
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
        recentActivity
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
function calculateTopProducts(products: SellerProduct[], orders: SellerOrder[]): { name: string; sales: number; revenue: number }[] {
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