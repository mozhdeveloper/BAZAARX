import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { productService } from '@/services/productService';
import { authService } from '@/services/authService';
import { orderService } from '@/services/orderService';
import type { Product as DbProduct } from '@/types/database.types';

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
  variants?: {
    id: string;
    option1: string; // Generic name for "Color" / "Model"
    option2: string; // Generic name for "Size" / "Capacity"
    price: string;
    stock: string;
    sku: string;
    image?: string;
  }[];
}

export interface SellerOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: {
    productId: string;
    productName: string;
    image: string;
    quantity: number;
    price: number;
    selectedColor?: string;
    selectedSize?: string;
  }[];
  total: number;
  status: 'pending' | 'to-ship' | 'completed' | 'cancelled';
  createdAt: string;
  type?: 'OFFLINE' | 'ONLINE'; // Mark walk-in vs online orders
  posNote?: string; // Note for POS orders
}

export interface RevenueData {
  date: string;
  value: number;
}

export interface CategorySales {
  category: string;
  value: number;
  color: string;
}

export interface SellerDocument {
  id: string;
  type: 'business_permit' | 'valid_id' | 'proof_of_address';
  fileName: string;
  url: string;
  uploadDate: string;
  isVerified: boolean;
}

export interface SellerProfile {
  id: string;
  // Personal
  ownerName: string;
  email: string;
  phone: string;

  // Business
  businessName: string;
  storeName: string;
  storeDescription: string;
  storeLogo: string;
  storeCategory: string[];
  businessType: 'sole_proprietor' | 'partnership' | 'corporation';
  businessRegistrationNumber: string;
  taxIdNumber: string;

  // Address
  businessAddress: string;
  city: string;
  province: string;
  postalCode: string;

  // Banking
  bankName: string;
  accountName: string;
  accountNumber: string;

  // Status
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  documents: SellerDocument[];

  // Document URLs for verification
  business_permit_url?: string | null;
  valid_id_url?: string | null;
  proof_of_address_url?: string | null;
  dti_registration_url?: string | null;
  tax_id_url?: string | null;
}

interface SellerStats {
  totalRevenue: number;
  totalOrders: number;
  totalVisits: number;
  revenueChange: number;
  ordersChange: number;
  visitsChange: number;
}

// Inventory Ledger Entry for tracking all stock changes
export interface InventoryLedgerEntry {
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
export interface LowStockAlert {
  id: string;
  productId: string;
  productName: string;
  currentStock: number;
  threshold: number;
  timestamp: string;
  acknowledged: boolean;
}

// Low stock threshold constant
const LOW_STOCK_THRESHOLD = 10;

interface SellerStore {
  // Seller Info
  seller: SellerProfile;

  // Stats
  stats: SellerStats;

  // Products
  products: SellerProduct[];
  loading: boolean;
  error: string | null;
  fetchProducts: (sellerId?: string) => Promise<void>;
  addProduct: (product: SellerProduct) => Promise<string>; // Returns the database product ID
  updateProduct: (id: string, updates: Partial<SellerProduct>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  toggleProductStatus: (id: string) => void;

  // Inventory Management
  inventoryLedger: InventoryLedgerEntry[];
  lowStockAlerts: LowStockAlert[];
  deductStock: (productId: string, quantity: number, reason: 'ONLINE_SALE' | 'OFFLINE_SALE', referenceId: string, notes?: string) => void;
  addStock: (productId: string, quantity: number, reason: string, notes?: string) => void;
  adjustStock: (productId: string, newQuantity: number, reason: string, notes: string) => void;
  reserveStock: (productId: string, quantity: number, orderId: string) => void;
  releaseStock: (productId: string, quantity: number, orderId: string) => void;
  // Variant-level stock management
  deductVariantStock: (productId: string, variantId: string, quantity: number, reason: 'ONLINE_SALE' | 'OFFLINE_SALE', referenceId: string, notes?: string) => void;
  addVariantStock: (productId: string, variantId: string, quantity: number, reason: string, notes?: string) => void;
  getLedgerByProduct: (productId: string) => InventoryLedgerEntry[];
  getRecentLedgerEntries: (limit?: number) => InventoryLedgerEntry[];
  checkLowStock: () => void;
  acknowledgeLowStockAlert: (alertId: string) => void;
  getLowStockThreshold: () => number;

  // Orders
  orders: SellerOrder[];
  ordersLoading: boolean;
  fetchOrders: (sellerId?: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: SellerOrder['status']) => void;
  addOfflineOrder: (cartItems: { productId: string; productName: string; quantity: number; price: number; image: string; selectedColor?: string; selectedSize?: string }[], total: number, note?: string) => string;

  // Analytics
  revenueData: RevenueData[];
  categorySales: CategorySales[];

  // Settings
  updateSellerInfo: (updates: Partial<SellerStore['seller']>) => void;
  logout: () => void;
}

// Dummy Data
const dummyProducts: SellerProduct[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    description: 'Latest iPhone with A17 Pro chip and titanium design',
    price: 75999,
    stock: 24,
    images: ['https://images.unsplash.com/photo-1696446702877-c040ff34b6d4?w=300'],
    category: 'Electronics',
    isActive: true,
    sales: 156,
    rating: 4.5,
    reviews: 12,
    approvalStatus: 'approved',
    sellerId: '1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Flagship Android phone with S Pen and 200MP camera',
    price: 69999,
    stock: 18,
    images: ['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300'],
    category: 'Electronics',
    isActive: true,
    sales: 142,
    rating: 4.5,
    reviews: 12,
    approvalStatus: 'approved',
    sellerId: '1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '3',
    name: 'MacBook Pro M3',
    description: 'Powerful laptop with M3 chip and Liquid Retina XDR display',
    price: 129999,
    stock: 12,
    images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300'],
    category: 'Electronics',
    isActive: true,
    sales: 89,
    rating: 4.5,
    reviews: 12,
    approvalStatus: 'approved',
    sellerId: '1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '4',
    name: 'AirPods Pro (2nd Gen)',
    description: 'Premium wireless earbuds with active noise cancellation',
    price: 14999,
    stock: 45,
    images: ['https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=300'],
    category: 'Accessories',
    isActive: true,
    sales: 234,
    rating: 4.5,
    reviews: 12,
    approvalStatus: 'approved',
    sellerId: '1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '5',
    name: 'iPad Air M2',
    description: 'Versatile tablet with M2 chip and Apple Pencil support',
    price: 42999,
    stock: 8,
    images: ['https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300'],
    category: 'Electronics',
    isActive: false,
    sales: 67,
    rating: 4.5,
    reviews: 12,
    approvalStatus: 'approved',
    sellerId: '1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '6',
    name: 'Sony WH-1000XM5',
    description: 'Industry-leading noise cancelling headphones',
    price: 19999,
    stock: 32,
    images: ['https://images.unsplash.com/photo-1618366712010-f4ae9c647dcf?w=300'],
    category: 'Accessories',
    isActive: true,
    sales: 178,
    rating: 4.5,
    reviews: 12,
    approvalStatus: 'approved',
    sellerId: '1',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

const dummyOrders: SellerOrder[] = [
  {
    id: '1',
    orderId: 'ORD-2024-001',
    customerName: 'Juan Dela Cruz',
    customerEmail: 'juan@example.com',
    items: [
      {
        productId: '1',
        productName: 'iPhone 15 Pro Max',
        image: 'https://images.unsplash.com/photo-1696446702877-c040ff34b6d4?w=100',
        quantity: 1,
        price: 75999,
      },
    ],
    total: 75999,
    status: 'pending',
    createdAt: '2024-12-20T10:30:00Z',
  },
  {
    id: '2',
    orderId: 'ORD-2024-002',
    customerName: 'Maria Santos',
    customerEmail: 'maria@example.com',
    items: [
      {
        productId: '4',
        productName: 'AirPods Pro (2nd Gen)',
        image: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=100',
        quantity: 2,
        price: 14999,
      },
    ],
    total: 29998,
    status: 'to-ship',
    createdAt: '2024-12-19T15:45:00Z',
  },
  {
    id: '3',
    orderId: 'ORD-2024-003',
    customerName: 'Carlos Garcia',
    customerEmail: 'carlos@example.com',
    items: [
      {
        productId: '3',
        productName: 'MacBook Pro M3',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100',
        quantity: 1,
        price: 129999,
      },
      {
        productId: '6',
        productName: 'Sony WH-1000XM5',
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcf?w=100',
        quantity: 1,
        price: 19999,
      },
    ],
    total: 149998,
    status: 'completed',
    createdAt: '2024-12-18T09:20:00Z',
  },
  {
    id: '4',
    orderId: 'ORD-2024-004',
    customerName: 'Ana Reyes',
    customerEmail: 'ana@example.com',
    items: [
      {
        productId: '2',
        productName: 'Samsung Galaxy S24 Ultra',
        image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100',
        quantity: 1,
        price: 69999,
      },
    ],
    total: 69999,
    status: 'completed',
    createdAt: '2024-12-17T14:10:00Z',
  },
  {
    id: '5',
    orderId: 'ORD-2024-005',
    customerName: 'Pedro Lim',
    customerEmail: 'pedro@example.com',
    items: [
      {
        productId: '6',
        productName: 'Sony WH-1000XM5',
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcf?w=100',
        quantity: 1,
        price: 19999,
      },
    ],
    total: 19999,
    status: 'pending',
    createdAt: '2024-12-20T11:00:00Z',
  },
];

const dummyRevenueData: RevenueData[] = [
  { date: 'Dec 14', value: 45000 },
  { date: 'Dec 15', value: 52000 },
  { date: 'Dec 16', value: 48000 },
  { date: 'Dec 17', value: 69999 },
  { date: 'Dec 18', value: 149998 },
  { date: 'Dec 19', value: 29998 },
  { date: 'Dec 20', value: 95998 },
];

const dummyCategorySales: CategorySales[] = [
  { category: 'Electronics', value: 65, color: '#FF5722' },
  { category: 'Accessories', value: 25, color: '#FFA726' },
  { category: 'Wearables', value: 10, color: '#FFB74D' },
];

export const useSellerStore = create<SellerStore>()(
  persist(
    (set, get) => ({
      // Seller Info
      seller: {
        id: '',
        // Personal
        ownerName: '',
        email: '',
        phone: '',

        // Business
        businessName: '',
        storeName: '',
        storeDescription: '',
        storeLogo: '',
        storeCategory: [],
        businessType: 'sole_proprietor',
        businessRegistrationNumber: '',
        taxIdNumber: '',

        // Address
        businessAddress: '',
        city: '',
        province: '',
        postalCode: '',

        // Banking
        bankName: '',
        accountName: '',
        accountNumber: '',

        // Status
        approval_status: 'pending',
        documents: [],
        business_permit_url: null,
        valid_id_url: null,
        proof_of_address_url: null,
        dti_registration_url: null,
        tax_id_url: null,
      },

      // Stats
      stats: {
        totalRevenue: 490991,
        totalOrders: 156,
        totalVisits: 3420,
        revenueChange: 12.5,
        ordersChange: 8.3,
        visitsChange: 15.7,
      },

      // Products
      products: dummyProducts,
      loading: false,
      error: null,

      // Inventory Management
      inventoryLedger: [],
      lowStockAlerts: [],

      fetchProducts: async (sellerId?: string) => {
        console.log('[sellerStore] fetchProducts called with provided sellerId:', sellerId);
        set({ loading: true, error: null });
        try {
          let actualSellerId = sellerId;
          const isValidUUID =
            sellerId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId);

          if (!isValidUUID) {
            console.log('[sellerStore] SellerId is not a valid UUID, getting from session via authService...');
            const session = await authService.getSession();
            if (session?.user?.id) {
              actualSellerId = session.user.id;
              console.log('[sellerStore] Got seller ID from session:', actualSellerId);
            } else {
              console.log('[sellerStore] No authenticated session, fetching all products');
              actualSellerId = undefined;
            }
          }

          console.log('[sellerStore] Calling productService.getProducts with sellerId:', actualSellerId);
          const data = await productService.getProducts({ sellerId: actualSellerId });
          console.log('[sellerStore] Got products from service:', data?.length || 0, 'items');

          const mappedProducts: SellerProduct[] = data.map((p) => ({
            id: p.id || '',
            name: p.name || '',
            description: p.description || '',
            price: p.price ?? 0,
            originalPrice: p.original_price ?? undefined,
            stock: p.stock ?? 0,
            category: p.category || '',
            images: p.images || [],
            sizes: p.sizes || [],
            colors: p.colors || [],
            isActive: p.is_active ?? true,
            sellerId: p.seller_id || '',
            createdAt: p.created_at || '',
            updatedAt: p.updated_at || '',
            sales: p.sales_count ?? 0,
            rating: p.rating ?? 0,
            reviews: p.review_count ?? 0,
            approvalStatus: (p.approval_status as SellerProduct['approvalStatus']) || 'pending',
            rejectionReason: p.rejection_reason || undefined,
            vendorSubmittedCategory: p.vendor_submitted_category || undefined,
            adminReclassifiedCategory: p.admin_reclassified_category || undefined,
            sellerName: p.seller?.store_name || p.seller?.business_name,
            sellerRating: p.seller?.rating,
            sellerLocation: p.seller?.business_address,
          }));
          console.log('[sellerStore] Mapped', mappedProducts.length, 'products');
          set({ products: mappedProducts, loading: false });
        } catch (error) {
          console.error('[sellerStore] Error fetching products:', error);
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch products',
            loading: false,
          });
        }
      },

      addProduct: async (product) => {
        try {
          if (!product.name || product.name.trim() === '') {
            throw new Error('Product name is required');
          }
          if (!product.price || product.price <= 0) {
            throw new Error('Product price must be greater than 0');
          }
          if (product.stock < 0) {
            throw new Error('Product stock cannot be negative');
          }
          if (!product.category || product.category.trim() === '') {
            throw new Error('Product category is required');
          }

          let actualSellerId = product.sellerId;
          const isValidUUID =
            actualSellerId &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actualSellerId);

          if (!isValidUUID) {
            console.log('[sellerStore] addProduct: SellerId is not a valid UUID, getting from session via authService...');
            const session = await authService.getSession();
            if (session?.user?.id) {
              actualSellerId = session.user.id;
              console.log('[sellerStore] addProduct: Got seller ID from session:', actualSellerId);
            } else {
              throw new Error('Not authenticated. Please log in to add products.');
            }
          }

          try {
            const dbProduct = await productService.createProduct({
              name: product.name,
              description: product.description,
              price: product.price,
              original_price: product.originalPrice,
              stock: product.stock,
              category: product.category,
              images: product.images,
              sizes: product.sizes,
              colors: product.colors,
              is_active: product.isActive,
              seller_id: actualSellerId,
              approval_status: 'pending',
              vendor_submitted_category: product.category,
            });
            const newProduct: SellerProduct = {
              ...product,
              id: dbProduct.id || product.id,
              createdAt: dbProduct.created_at || new Date().toISOString(),
              updatedAt: dbProduct.updated_at || new Date().toISOString(),
            };
            set((state) => ({ products: [...state.products, newProduct] }));
            return dbProduct.id || product.id;
          } catch (dbErr) {
            console.warn('[sellerStore] addProduct: DB unavailable, saving locally only');
            set((state) => ({ products: [...state.products, product] }));
            return product.id;
          }
        } catch (error) {
          console.error('Error adding product:', error);
          throw error;
        }
      },

      updateProduct: async (id, updates) => {
        try {
          const dbUpdates: Record<string, unknown> = {};
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

          try {
            await productService.updateProduct(id, dbUpdates);
          } catch (dbErr) {
            console.warn('[sellerStore] updateProduct: DB unavailable, updating local state only');
          }

          set((state) => ({
            products: state.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          }));
        } catch (error) {
          console.error('Error updating product:', error);
          throw error;
        }
      },

      deleteProduct: async (id) => {
        try {
          try {
            await productService.deleteProduct(id);
          } catch (dbErr) {
            console.warn('[sellerStore] deleteProduct: DB unavailable, removing from local state only');
          }
          set((state) => ({
            products: state.products.filter((p) => p.id !== id),
          }));
        } catch (error) {
          console.error('Error deleting product:', error);
          throw error;
        }
      },

      toggleProductStatus: (id) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, isActive: !p.isActive } : p
          ),
        })),

      // Orders
      orders: [],
      ordersLoading: false,

      fetchOrders: async (sellerId?: string) => {
        const targetSellerId = sellerId || get().seller.id;
        if (!targetSellerId) {
          console.warn('[SellerStore] No seller ID available for fetchOrders');
          return;
        }

        set({ ordersLoading: true });
        try {
          const orders = await orderService.getSellerOrders(targetSellerId);
          set({ orders: orders as SellerOrder[], ordersLoading: false });
          console.log(`[SellerStore] Fetched ${orders.length} orders from database`);
        } catch (error) {
          console.error('[SellerStore] Error fetching orders:', error);
          set({ ordersLoading: false });
        }
      },

      updateOrderStatus: async (orderId, status) => {
        // Map UI status to database status
        const dbStatusMap: Record<string, string> = {
          pending: 'pending',
          'to-ship': 'processing',
          completed: 'delivered',
          cancelled: 'cancelled',
        };
        const dbStatus = dbStatusMap[status] || status;

        // Optimistically update local state
        set((state) => ({
          orders: state.orders.map((o) =>
            o.orderId === orderId || o.id === orderId ? { ...o, status } : o
          ),
        }));

        // Find the actual order ID (database UUID)
        const order = get().orders.find(o => o.orderId === orderId || o.id === orderId);
        const actualOrderId = order?.id || orderId;

        // Update in database
        try {
          await orderService.updateOrderStatus(actualOrderId, dbStatus);
          console.log(`[SellerStore] ✅ Order status updated in DB: ${orderId} → ${dbStatus}`);
        } catch (error) {
          console.error('[SellerStore] Failed to update order status in DB:', error);
          // Revert on failure
          await get().fetchOrders();
        }

        // SYNC TO BUYER: Also update the buyer's order store
        try {
          import('./orderStore').then(({ useOrderStore }) => {
            const orderStore = useOrderStore.getState();

            // Find the corresponding buyer order by matching transaction ID
            const buyerOrder = orderStore.orders.find(
              (o) => o.transactionId === orderId
            );

            if (buyerOrder) {
              // Map seller status to buyer status
              const buyerStatus =
                status === 'pending' ? 'pending' :
                  status === 'to-ship' ? 'processing' :
                    status === 'completed' ? 'delivered' :
                      'canceled';

              orderStore.updateOrderStatus(buyerOrder.id, buyerStatus as any);
              console.log(`✅ Order status synced to buyer: ${orderId} → ${buyerStatus}`);
            }
          });
        } catch (error) {
          console.error('Failed to sync order status to buyer:', error);
        }
      },

      // POS: Add offline order (walk-in purchase)
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
          const state = get();
          for (const item of cartItems) {
            const product = state.products.find(p => p.id === item.productId);
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
            orderId: orderId,
            customerName: 'Walk-in Customer',
            customerEmail: 'pos@offline.sale',
            items: cartItems,
            total,
            status: 'completed', // POS orders are immediately completed
            createdAt: new Date().toISOString(),
            type: 'OFFLINE', // Mark as offline/walk-in order
            posNote: note || 'In-Store Purchase',
          };

          // Add order to store and deduct stock
          set((state) => {
            // Update products stock
            const updatedProducts = state.products.map(product => {
              const cartItem = cartItems.find(item => item.productId === product.id);
              if (cartItem) {
                return {
                  ...product,
                  stock: product.stock - cartItem.quantity,
                  sales: product.sales + cartItem.quantity,
                };
              }
              return product;
            });

            return {
              orders: [newOrder, ...state.orders],
              products: updatedProducts,
            };
          });

          console.log(`✅ Offline order created: ${orderId}. Stock updated.`);
          
          // Create ledger entries for each item sold
          const ledgerEntries: InventoryLedgerEntry[] = cartItems.map(item => {
            const product = get().products.find(p => p.id === item.productId);
            const quantityBefore = (product?.stock ?? 0) + item.quantity; // Stock before deduction
            return {
              id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: new Date().toISOString(),
              productId: item.productId,
              productName: item.productName,
              changeType: 'DEDUCTION' as const,
              quantityBefore,
              quantityChange: -item.quantity,
              quantityAfter: quantityBefore - item.quantity,
              reason: 'OFFLINE_SALE' as const,
              referenceId: orderId,
              userId: get().seller.id || 'SYSTEM',
              notes: `POS sale: ${item.productName} x${item.quantity}`,
            };
          });
          
          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ...ledgerEntries],
          }));
          
          // Check for low stock alerts
          get().checkLowStock();
          
          return orderId;
        } catch (error) {
          console.error('Failed to create offline order:', error);
          throw error;
        }
      },

      // ============ INVENTORY MANAGEMENT METHODS ============

      // Deduct stock with full audit trail
      deductStock: (productId, quantity, reason, referenceId, notes) => {
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

          // Update product stock
          set((state) => ({
            products: state.products.map(p =>
              p.id === productId
                ? { ...p, stock: newStock, sales: p.sales + quantity }
                : p
            ),
          }));

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
            userId: get().seller.id || 'SYSTEM',
            notes: notes || `Stock deducted for ${reason.replace('_', ' ').toLowerCase()}`,
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry],
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
      addStock: (productId, quantity, reason, notes) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
          }

          const newStock = product.stock + quantity;

          // Update product stock
          set((state) => ({
            products: state.products.map(p =>
              p.id === productId
                ? { ...p, stock: newStock }
                : p
            ),
          }));

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
            userId: get().seller.id || 'SYSTEM',
            notes: notes || reason,
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry],
          }));

          get().checkLowStock();

          console.log(`✅ Stock added: ${product.name} + ${quantity} units. New stock: ${newStock}`);
        } catch (error) {
          console.error('Failed to add stock:', error);
          throw error;
        }
      },

      // Manual stock adjustment (requires reason notes)
      adjustStock: (productId, newQuantity, reason, notes) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          if (newQuantity < 0) {
            throw new Error('Stock quantity cannot be negative');
          }

          // RULE: Adjustments require reason notes
          if (!notes || notes.trim() === '') {
            throw new Error('Adjustment notes are required');
          }

          const quantityChange = newQuantity - product.stock;

          set((state) => ({
            products: state.products.map(p =>
              p.id === productId
                ? { ...p, stock: newQuantity }
                : p
            ),
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
            userId: get().seller.id || 'SYSTEM',
            notes: `${reason}: ${notes}`,
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry],
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

          // RULE: No negative stock allowed
          if (product.stock < quantity) {
            throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}`);
          }

          const newStock = product.stock - quantity;

          set((state) => ({
            products: state.products.map(p =>
              p.id === productId
                ? { ...p, stock: newStock }
                : p
            ),
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
            userId: get().seller.id || 'SYSTEM',
            notes: `Stock reserved for order ${orderId}`,
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry],
          }));

          get().checkLowStock();

          console.log(`✅ Stock reserved: ${product.name} - ${quantity} units for order ${orderId}`);
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
            ),
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
            userId: get().seller.id || 'SYSTEM',
            notes: `Stock released from cancelled order ${orderId}`,
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry],
          }));

          get().checkLowStock();

          console.log(`✅ Stock released: ${product.name} + ${quantity} units from order ${orderId}`);
        } catch (error) {
          console.error('Failed to release stock:', error);
          throw error;
        }
      },

      // Get ledger entries for a specific product
      getLedgerByProduct: (productId) => {
        return get().inventoryLedger.filter(entry => entry.productId === productId);
      },

      // Get recent ledger entries
      getRecentLedgerEntries: (limit = 50) => {
        return get().inventoryLedger
          .slice()
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      },

      // Check and create low stock alerts
      checkLowStock: () => {
        const { products, lowStockAlerts } = get();
        const threshold = LOW_STOCK_THRESHOLD;

        products.forEach(product => {
          // Check if stock is low (between 0 and threshold)
          if (product.stock > 0 && product.stock < threshold) {
            // Check if alert already exists for this product
            const existingAlert = lowStockAlerts.find(
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
                acknowledged: false,
              };

              set((state) => ({
                lowStockAlerts: [...state.lowStockAlerts, newAlert],
              }));

              console.log(`⚠️ LOW STOCK ALERT: ${product.name} - Only ${product.stock} units remaining!`);
            }
          }
        });
      },

      // Acknowledge low stock alert
      acknowledgeLowStockAlert: (alertId) => {
        set((state) => ({
          lowStockAlerts: state.lowStockAlerts.map(alert =>
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          ),
        }));
      },

      // Get low stock threshold
      getLowStockThreshold: () => LOW_STOCK_THRESHOLD,

      // Deduct variant stock (SKU level)
      deductVariantStock: (productId, variantId, quantity, reason, referenceId, notes) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          if (!product.variants || product.variants.length === 0) {
            throw new Error(`Product ${product.name} has no variants`);
          }

          const variantIndex = product.variants.findIndex(v => v.id === variantId);
          if (variantIndex === -1) {
            throw new Error(`Variant ${variantId} not found in product ${product.name}`);
          }

          const variant = product.variants[variantIndex];
          const currentStock = parseInt(variant.stock, 10) || 0;

          // RULE: No negative stock allowed
          if (currentStock < quantity) {
            throw new Error(`Insufficient stock for ${product.name} (${variant.option1}/${variant.option2}). Available: ${currentStock}, Requested: ${quantity}`);
          }

          const newStock = currentStock - quantity;

          // Update variant stock
          set((state) => ({
            products: state.products.map(p => {
              if (p.id === productId && p.variants) {
                return {
                  ...p,
                  variants: p.variants.map((v, i) =>
                    i === variantIndex ? { ...v, stock: newStock.toString() } : v
                  ),
                  sales: p.sales + quantity,
                };
              }
              return p;
            }),
          }));

          // Create ledger entry
          const ledgerEntry: InventoryLedgerEntry = {
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId,
            productName: `${product.name} (${variant.option1}/${variant.option2})`,
            changeType: 'DEDUCTION',
            quantityBefore: currentStock,
            quantityChange: -quantity,
            quantityAfter: newStock,
            reason,
            referenceId,
            userId: get().seller.id || 'SYSTEM',
            notes: notes || `Variant stock deducted: SKU ${variant.sku}`,
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry],
          }));

          get().checkLowStock();

          console.log(`✅ Variant stock deducted: ${product.name} (${variant.option1}/${variant.option2}) - ${quantity} units. New stock: ${newStock}`);
        } catch (error) {
          console.error('Failed to deduct variant stock:', error);
          throw error;
        }
      },

      // Add variant stock (SKU level replenishment)
      addVariantStock: (productId, variantId, quantity, reason, notes) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error(`Product ${productId} not found`);
          }

          if (!product.variants || product.variants.length === 0) {
            throw new Error(`Product ${product.name} has no variants`);
          }

          const variantIndex = product.variants.findIndex(v => v.id === variantId);
          if (variantIndex === -1) {
            throw new Error(`Variant ${variantId} not found in product ${product.name}`);
          }

          if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
          }

          const variant = product.variants[variantIndex];
          const currentStock = parseInt(variant.stock, 10) || 0;
          const newStock = currentStock + quantity;

          // Update variant stock
          set((state) => ({
            products: state.products.map(p => {
              if (p.id === productId && p.variants) {
                return {
                  ...p,
                  variants: p.variants.map((v, i) =>
                    i === variantIndex ? { ...v, stock: newStock.toString() } : v
                  ),
                };
              }
              return p;
            }),
          }));

          // Create ledger entry
          const ledgerEntry: InventoryLedgerEntry = {
            id: `ledger-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date().toISOString(),
            productId,
            productName: `${product.name} (${variant.option1}/${variant.option2})`,
            changeType: 'ADDITION',
            quantityBefore: currentStock,
            quantityChange: quantity,
            quantityAfter: newStock,
            reason: 'STOCK_REPLENISHMENT',
            referenceId: `REPL-${Date.now()}`,
            userId: get().seller.id || 'SYSTEM',
            notes: notes || `Variant stock added: SKU ${variant.sku} - ${reason}`,
          };

          set((state) => ({
            inventoryLedger: [...state.inventoryLedger, ledgerEntry],
          }));

          get().checkLowStock();

          console.log(`✅ Variant stock added: ${product.name} (${variant.option1}/${variant.option2}) + ${quantity} units. New stock: ${newStock}`);
        } catch (error) {
          console.error('Failed to add variant stock:', error);
          throw error;
        }
      },

      // Analytics
      revenueData: dummyRevenueData,
      categorySales: dummyCategorySales,

      // Settings
      updateSellerInfo: (updates) =>
        set((state) => ({
          seller: { ...state.seller, ...updates },
        })),

      // Auth
      logout: () => {
        // Clear seller data - can be enhanced to clear AsyncStorage if needed
        console.log('Seller logged out');
      },
    }),
    {
      name: 'seller-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
