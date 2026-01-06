import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProductQAStore } from './productQAStore';

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
  inventoryLedger: InventoryLedgerEntry[];
  lowStockAlerts: LowStockAlert[];
  addProduct: (product: Omit<SellerProduct, 'id' | 'createdAt' | 'updatedAt' | 'sales' | 'rating' | 'reviews'>) => void;
  updateProduct: (id: string, updates: Partial<SellerProduct>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => SellerProduct | undefined;
  // POS-Lite: Deduct stock when offline sale is made
  deductStock: (productId: string, quantity: number, reason: 'ONLINE_SALE' | 'OFFLINE_SALE', referenceId: string, notes?: string) => void;
  // Inventory management
  addStock: (productId: string, quantity: number, reason: string, notes?: string) => void;
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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        if ((email === 'seller@bazaarph.com' || email === 'juan@example.com') && (password === 'password' || password === 'password123')) {
          set({ seller: dummySeller, isAuthenticated: true });
          return true;
        }
        return false;
      },
      register: async (sellerData) => {
        // Simulate API call - in real app, this would submit to admin approval
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Create full address
        const fullAddress = `${sellerData.businessAddress}, ${sellerData.city}, ${sellerData.province} ${sellerData.postalCode}`;
        
        const newSeller: Seller = {
          id: `seller-${Date.now()}`,
          
          // Personal Info
          name: sellerData.ownerName || sellerData.email?.split('@')[0] || 'New Seller',
          ownerName: sellerData.ownerName || '',
          email: sellerData.email!,
          phone: sellerData.phone || '',
          
          // Business Info
          businessName: sellerData.businessName || '',
          storeName: sellerData.storeName || 'My Store',
          storeDescription: sellerData.storeDescription || '',
          storeCategory: sellerData.storeCategory || [],
          businessType: sellerData.businessType || '',
          businessRegistrationNumber: sellerData.businessRegistrationNumber || '',
          taxIdNumber: sellerData.taxIdNumber || '',
          
          // Address
          businessAddress: sellerData.businessAddress || '',
          city: sellerData.city || '',
          province: sellerData.province || '',
          postalCode: sellerData.postalCode || '',
          storeAddress: fullAddress,
          
          // Banking
          bankName: sellerData.bankName || '',
          accountName: sellerData.accountName || '',
          accountNumber: sellerData.accountNumber || '',
          
          // Status
          isVerified: false,
          approvalStatus: 'pending',  // Awaiting admin approval
          rating: 0,
          totalSales: 0,
          joinDate: new Date().toISOString().split('T')[0]
        };
        
        // In real app, seller would NOT be authenticated immediately
        // They would need to wait for admin approval
        // For demo purposes, we'll show a pending status message
        set({ seller: newSeller, isAuthenticated: false });
        
        return true;
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
      products: dummyProducts,
      inventoryLedger: [],
      lowStockAlerts: [],

      addProduct: (product) => {
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
          
          const newProduct: SellerProduct = {
            ...product,
            id: `prod-${Date.now()}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sales: 0,
            rating: 0,
            reviews: 0,
            approvalStatus: 'pending',
            vendorSubmittedCategory: product.category
          };
          
          set((state) => ({ products: [...state.products, newProduct] }));

          // Create ledger entry for initial stock
          const authStore = useAuthStore.getState();
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
            userId: authStore.seller?.id || 'SYSTEM',
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
              vendor: authStore.seller?.name || 'Unknown Vendor',
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

      updateProduct: (id, updates) => {
        try {
          const product = get().products.find(p => p.id === id);
          if (!product) {
            console.error(`Product not found: ${id}`);
            throw new Error('Product not found');
          }
          set((state) => ({
            products: state.products.map(product =>
              product.id === id
                ? { ...product, ...updates, updatedAt: new Date().toISOString() }
                : product
            )
          }));
        } catch (error) {
          console.error('Error updating product:', error);
          throw error;
        }
      },

      deleteProduct: (id) => {
        try {
          const product = get().products.find(p => p.id === id);
          if (!product) {
            console.error(`Product not found: ${id}`);
            throw new Error('Product not found');
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
          const authStore = useAuthStore.getState();

          // Update product stock
          set((state) => ({
            products: state.products.map(p =>
              p.id === productId
                ? { ...p, stock: newStock, sales: p.sales + quantity }
                : p
            )
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
            userId: authStore.seller?.id || 'SYSTEM',
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
          const authStore = useAuthStore.getState();

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
            changeType: 'ADDITION',
            quantityBefore: product.stock,
            quantityChange: quantity,
            quantityAfter: newStock,
            reason: 'STOCK_REPLENISHMENT',
            referenceId: `REPL-${Date.now()}`,
            userId: authStore.seller?.id || 'SYSTEM',
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
          const authStore = useAuthStore.getState();

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
            userId: authStore.seller?.id || 'SYSTEM',
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
          const authStore = useAuthStore.getState();

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
            userId: authStore.seller?.id || 'SYSTEM',
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
          const authStore = useAuthStore.getState();

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
            userId: authStore.seller?.id || 'SYSTEM',
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
      name: 'seller-products-storage'
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
export const useStatsStore = create<StatsStore>()(() => ({
  stats: {
    totalRevenue: 1580000,
    totalOrders: 256,
    totalProducts: 45,
    avgRating: 4.8,
    monthlyRevenue: [
      { month: 'Jan', revenue: 120000 },
      { month: 'Feb', revenue: 150000 },
      { month: 'Mar', revenue: 180000 },
      { month: 'Apr', revenue: 200000 },
      { month: 'May', revenue: 160000 },
      { month: 'Jun', revenue: 220000 },
      { month: 'Jul', revenue: 250000 },
      { month: 'Aug', revenue: 180000 },
      { month: 'Sep', revenue: 190000 },
      { month: 'Oct', revenue: 210000 },
      { month: 'Nov', revenue: 240000 },
      { month: 'Dec', revenue: 170000 }
    ],
    topProducts: [
      { name: 'iPhone 15 Pro Max', sales: 45, revenue: 4049550 },
      { name: 'Samsung Galaxy S24 Ultra', sales: 32, revenue: 2559680 },
      { name: 'MacBook Pro M3', sales: 18, revenue: 2339820 }
    ],
    recentActivity: [
      {
        id: '1',
        type: 'order',
        message: 'New order from Maria Santos',
        time: '2 hours ago'
      },
      {
        id: '2',
        type: 'product',
        message: 'iPhone 15 Pro Max stock is running low',
        time: '4 hours ago'
      },
      {
        id: '3',
        type: 'review',
        message: 'New 5-star review for MacBook Pro M3',
        time: '1 day ago'
      }
    ]
  },
  refreshStats: () => {
    // In a real app, this would fetch from API
    console.log('Refreshing stats...');
  }
}));