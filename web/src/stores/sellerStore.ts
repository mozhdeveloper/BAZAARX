import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProductQAStore } from './productQAStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { authService } from '@/services/authService';
import { productService } from '@/services/productService';
import { orderService } from '@/services/orderService';
import type { Seller as DBSeller, Database, Order, OrderItem } from '@/types/database.types';

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
  addOfflineOrder: (cartItems: { productId: string; productName: string; quantity: number; price: number; image: string; selectedColor?: string; selectedSize?: string }[], total: number, note?: string) => string;
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
  sellerName: p.seller?.store_name || p.seller?.business_name,
  sellerRating: p.seller?.rating,
  sellerLocation: p.seller?.business_address
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

const mapSellerUpdatesToDb = (updates: Partial<SellerProduct>): ProductUpdate => {
  const dbUpdates: ProductUpdate = {};

  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.price !== undefined) dbUpdates.price = updates.price;
  if (updates.originalPrice !== undefined) dbUpdates.original_price = updates.originalPrice;
  if (updates.stock !== undefined) dbUpdates.stock = updates.stock;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.images !== undefined) dbUpdates.images = updates.images;
  if (updates.sizes !== undefined) dbUpdates.sizes = updates.sizes;
  if (updates.colors !== undefined) dbUpdates.colors = updates.colors;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.approvalStatus !== undefined) dbUpdates.approval_status = updates.approvalStatus;
  if (updates.rejectionReason !== undefined) dbUpdates.rejection_reason = updates.rejectionReason;
  if (updates.vendorSubmittedCategory !== undefined) dbUpdates.vendor_submitted_category = updates.vendorSubmittedCategory;
  if (updates.adminReclassifiedCategory !== undefined) dbUpdates.admin_reclassified_category = updates.adminReclassifiedCategory;

  return dbUpdates;
};

// Dummy data removed for database parity

const dummyOrders: SellerOrder[] = [];

// Helper function to map database Order to SellerOrder
const mapOrderToSellerOrder = (order: any): SellerOrder => {
  // Handle order_items - it might be nested or need to be fetched separately
  const orderItems = Array.isArray(order.order_items) ? order.order_items : [];

  const items = orderItems.map((item: any) => ({
    productId: item.product_id || '',
    productName: item.product_name || 'Unknown Product',
    quantity: item.quantity || 1,
    price: parseFloat(item.price?.toString() || '0'),
    image: item.product_images?.[0] || 'https://via.placeholder.com/100'
  }));

  // Map database status to SellerOrder status
  const statusMap: Record<string, SellerOrder['status']> = {
    'pending_payment': 'pending',
    'pending': 'pending',
    'confirmed': 'confirmed',
    'processing': 'confirmed',
    'shipped': 'shipped',
    'delivered': 'delivered',
    'cancelled': 'cancelled',
    'completed': 'delivered'
  };

  // Map payment status
  const paymentStatusMap: Record<string, SellerOrder['paymentStatus']> = {
    'pending': 'pending',
    'paid': 'paid',
    'refunded': 'refunded',
    'failed': 'pending'
  };

  const shippingAddr = order.shipping_address || {};

  return {
    id: order.id,
    seller_id: order.seller_id,
    buyer_id: order.buyer_id,
    buyerName: order.buyer_name || 'Unknown',
    buyerEmail: order.buyer_email || 'unknown@example.com',
    items,
    total: parseFloat(order.total_amount?.toString() || '0'),
    status: statusMap[order.status] || 'pending',
    paymentStatus: paymentStatusMap[order.payment_status] || 'pending',
    orderDate: order.created_at,
    shippingAddress: {
      fullName: shippingAddr.fullName || order.buyer_name || 'Unknown',
      street: shippingAddr.street || '',
      city: shippingAddr.city || '',
      province: shippingAddr.province || '',
      postalCode: shippingAddr.postalCode || '',
      phone: shippingAddr.phone || order.buyer_phone || ''
    },
    trackingNumber: order.tracking_number || undefined,
    rating: order.rating || undefined,
    reviewComment: order.review_comment || undefined,
    reviewImages: order.review_images || undefined,
    reviewDate: order.review_date || undefined,
    type: order.order_type === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
    posNote: order.pos_note || undefined
  };
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
          const result = await authService.signUp(sellerData.email!, sellerData.password!, {
            full_name: sellerData.ownerName || sellerData.storeName || sellerData.email?.split('@')[0],
            phone: sellerData.phone,
            user_type: 'seller',
            email: sellerData.email!,
            password: sellerData.password!,
          });

          if (!result || !result.user) {
            console.error('Signup failed: No user returned');
            return false;
          }

          const { user } = result;

          // 2) Create seller record (use upsert to handle conflicts)
          const { sellerService } = await import('@/services/sellerService');

          const sellerInsertData = {
            id: user.id,
            business_name: sellerData.businessName || sellerData.storeName || 'My Store',
            store_name: sellerData.storeName || 'My Store',
            store_description: sellerData.storeDescription || '',
            store_category: sellerData.storeCategory || ['General'],
            business_type: sellerData.businessType || 'sole_proprietor',
            business_registration_number: sellerData.businessRegistrationNumber || '',
            tax_id_number: sellerData.taxIdNumber || '',
            business_address: sellerData.businessAddress || sellerData.storeAddress || '',
            city: sellerData.city || '',
            province: sellerData.province || '',
            postal_code: sellerData.postalCode || '',
            bank_name: sellerData.bankName || '',
            account_name: sellerData.accountName || '',
            account_number: sellerData.accountNumber || '',
            business_permit_url: null,
            valid_id_url: null,
            proof_of_address_url: null,
            dti_registration_url: null,
            tax_id_url: null,
            is_verified: false,
            approval_status: 'pending' as const,
            rating: 0,
            total_sales: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            join_date: new Date().toISOString().split('T')[0],
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
          console.warn('Supabase not configured, showing empty product list');
          set({ products: [], loading: false, error: null });
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await productService.getProducts(filters);
          console.log('🔍 Raw product data from DB:', data);
          console.log('🔍 First product seller info:', data?.[0]?.seller);
          const mappedProducts = (data || []).map(mapDbProductToSellerProduct);
          console.log('🔍 Mapped products:', mappedProducts);
          console.log('🔍 First mapped product:', mappedProducts[0]);
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
            const insertData = buildProductInsert(product, resolvedSellerId);
            const created = await productService.createProduct(insertData);
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
            await qaStore.addProductToQA({
              id: newProduct.id,
              name: newProduct.name,
              vendor: authStoreState.seller?.name || 'Unknown Vendor',
              sellerId: resolvedSellerId, // Pass seller ID for proper filtering
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
                sellerId: resolvedSellerId, // Pass seller ID for proper filtering
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
            await productService.deductStock(
              productId,
              quantity,
              reason,
              referenceId,
              authStoreForStock.seller?.id
            );
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

          // Map seller status to database status
          const statusToDbMap: Record<SellerOrder['status'], string> = {
            'pending': 'pending_payment',
            'confirmed': 'processing',
            'shipped': 'shipped',
            'delivered': 'delivered',
            'cancelled': 'cancelled'
          };

          const dbStatus = statusToDbMap[status] || status;
          console.log(`📝 Mapping seller status '${status}' to database status '${dbStatus}'`);

          // Get seller ID from OrderStore (stored in fetchOrders)
          let sellerId = get().sellerId;

          console.log(`👤 Current seller ID from OrderStore:`, sellerId);
          console.log(`📦 Order object:`, order);

          // Fallback: Extract seller ID from order object if store doesn't have it
          if (!sellerId && (order as any).seller_id) {
            sellerId = (order as any).seller_id;
            console.log(`✅ Fallback: Using seller_id from order object: ${sellerId}`);
          }

          if (!sellerId) {
            console.error('❌ No seller ID found! Cannot update database.');
            console.error('Seller from store:', useAuthStore.getState().seller);
            console.error('Order object:', order);
            throw new Error('Seller ID is required to update order status');
          }

          console.log(`🔄 Updating order ${id} in database with seller ${sellerId}...`);
          const success = await orderService.updateOrderStatus(
            id,
            dbStatus,
            `Status updated to ${status}`,
            sellerId,
            'seller'
          );

          console.log(`📊 Database update result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);

          if (!success) {
            console.error('❌ Failed to update order status in database');
            throw new Error('Database update failed');
          }

          console.log(`✅ Database updated successfully with status: ${dbStatus}`);

          // Create notification for buyer if order has buyer_id
          console.log(`📦 Order object:`, order);
          console.log(`🆔 Order buyer_id:`, order.buyer_id);

          if (order.buyer_id) {
            const statusMessages: Record<string, string> = {
              'confirmed': `Your order #${id.slice(-8)} has been confirmed and is being prepared.`,
              'shipped': `Your order #${id.slice(-8)} has been shipped and is on its way!`,
              'delivered': `Your order #${id.slice(-8)} has been delivered. Enjoy your purchase!`,
              'cancelled': `Your order #${id.slice(-8)} has been cancelled.`
            };

            const message = statusMessages[status] || `Order #${id.slice(-8)} status updated to ${status}`;

            console.log(`🚀 Creating buyer notification for order ${id}`);

            // Import notification service dynamically to avoid circular dependency
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
          } else {
            console.warn(`⚠️ No buyer_id found for order ${id}, skipping buyer notification`);
          }

          // Update local state
          set((state) => ({
            orders: state.orders.map(order =>
              order.id === id ? { ...order, status } : order
            )
          }));

          console.log(`✅ Order ${id} status updated to ${status}`);
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
export const useStatsStore = create<StatsStore>()((set) => ({
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