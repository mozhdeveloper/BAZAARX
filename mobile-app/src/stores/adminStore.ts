import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProductQAStore } from './productQAStore';

// Admin Types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'moderator';
  avatar?: string;
  lastLogin?: Date;
  permissions: AdminPermission[];
}

export interface AdminPermission {
  id: string;
  name: string;
  description?: string;
  resource: 'users' | 'sellers' | 'categories' | 'products' | 'orders' | 'analytics';
  actions: ('read' | 'write' | 'delete' | 'approve')[];
}

export interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  parentId?: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  productsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Seller {
  id: string;
  businessName: string;
  storeName: string;
  storeDescription: string;
  storeCategory: string[];
  businessType: 'sole_proprietor' | 'partnership' | 'corporation' | string;
  businessRegistrationNumber: string;
  taxIdNumber: string;
  description: string;
  logo?: string;
  ownerName: string;
  email: string;
  phone: string;
  businessAddress: string;
  city: string;
  province: string;
  postalCode: string;
  address: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  documents: SellerDocument[];
  metrics: SellerMetrics;
  joinDate: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  suspendedAt?: Date;
  suspendedBy?: string;
  suspensionReason?: string;
}

export interface SellerDocument {
  id: string;
  type: 'business_permit' | 'valid_id' | 'proof_of_address' | 'dti_registration' | 'tax_id' | 'other';
  fileName: string;
  url: string;
  uploadDate: Date;
  isVerified: boolean;
}

export interface SellerMetrics {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  rating: number;
  responseRate: number;
  fulfillmentRate: number;
}

export interface Buyer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  status: 'active' | 'suspended' | 'banned';
  addresses: BuyerAddress[];
  metrics: BuyerMetrics;
  joinDate: Date;
  lastActivity?: Date;
  suspensionReason?: string;
}

export interface BuyerAddress {
  id: string;
  label: string;
  street: string;
  city: string;
  province: string;
  zipCode: string;
  isDefault: boolean;
}

export interface BuyerMetrics {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  cancelledOrders: number;
  returnedOrders: number;
  loyaltyPoints: number;
}

export interface Voucher {
  id: string;
  code: string;
  title: string;
  description: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minPurchase: number;
  maxDiscount?: number;
  usageLimit: number;
  usedCount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  applicableTo: 'all' | 'category' | 'seller' | 'product';
  targetIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  sellerId: string;
  sellerName: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderationNote?: string;
  helpfulCount: number;
  reportCount: number;
  createdAt: Date;
  moderatedAt?: Date;
  moderatedBy?: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  status: 'active' | 'inactive' | 'banned';
  rating: number;
  sales: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payout {
  id: string;
  referenceNumber: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  periodStart: Date;
  periodEnd: Date;
  payoutDate?: Date;
  bankName: string;
  accountNumber: string;
}

// Admin Auth Store
interface AdminAuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        const adminCredentials = [
          {
            email: 'admin@bazaarph.com',
            password: 'admin123',
            user: {
              id: 'admin_1',
              email: 'admin@bazaarph.com',
              name: 'Admin User',
              role: 'super_admin' as const,
              avatar: 'https://ui-avatars.io/api/?name=Admin+User&background=FF5722&color=fff',
              lastLogin: new Date(),
              permissions: [
                { id: '1', name: 'Full Access', resource: 'users' as const, actions: ['read', 'write', 'delete'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '2', name: 'Full Access', resource: 'sellers' as const, actions: ['read', 'write', 'delete', 'approve'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '3', name: 'Full Access', resource: 'categories' as const, actions: ['read', 'write', 'delete'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '4', name: 'Full Access', resource: 'products' as const, actions: ['read', 'write', 'delete'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '5', name: 'Full Access', resource: 'orders' as const, actions: ['read', 'write', 'delete'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '6', name: 'Full Access', resource: 'analytics' as const, actions: ['read'] as ('read' | 'write' | 'delete' | 'approve')[] },
              ]
            }
          }
        ];

        await new Promise(resolve => setTimeout(resolve, 1500));

        const admin = adminCredentials.find(cred => cred.email === email && cred.password === password);

        if (admin) {
          set({
            user: admin.user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          return true;
        } else {
          set({
            error: 'Invalid credentials',
            isLoading: false
          });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'admin-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Admin Stats Store
interface AdminStatsState {
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalSellers: number;
    totalBuyers: number;
    pendingApprovals: number;
    revenueGrowth: number;
    ordersGrowth: number;
    sellersGrowth: number;
    buyersGrowth: number;
  };
  isLoading: boolean;
  loadDashboardData: () => Promise<void>;
}

export const useAdminStats = create<AdminStatsState>((set) => ({
  stats: {
    totalRevenue: 0,
    totalOrders: 0,
    totalSellers: 0,
    totalBuyers: 0,
    pendingApprovals: 0,
    revenueGrowth: 0,
    ordersGrowth: 0,
    sellersGrowth: 0,
    buyersGrowth: 0,
  },
  isLoading: false,

  loadDashboardData: async () => {
    set({ isLoading: true });

    const demoStats = {
      totalRevenue: 15750000,
      totalOrders: 45230,
      totalSellers: 1247,
      totalBuyers: 28940,
      pendingApprovals: 23,
      revenueGrowth: 15.2,
      ordersGrowth: 8.7,
      sellersGrowth: 12.3,
      buyersGrowth: 23.1,
    };

    await new Promise(resolve => setTimeout(resolve, 1200));
    set({ stats: demoStats, isLoading: false });
  }
}));

// Sellers Store
interface SellersState {
  sellers: Seller[];
  pendingSellers: Seller[];
  isLoading: boolean;
  loadSellers: () => Promise<void>;
  approveSeller: (id: string) => Promise<void>;
  rejectSeller: (id: string, reason: string) => Promise<void>;
}

export const useAdminSellers = create<SellersState>()(
  persist(
    (set, get) => ({
      sellers: [],
      pendingSellers: [],
      isLoading: false,

      loadSellers: async () => {
        set({ isLoading: true });

        const currentState = get();
        if (currentState.sellers.length > 0) {
          set({ 
            isLoading: false,
            pendingSellers: currentState.sellers.filter(s => s.status === 'pending')
          });
          return;
        }

        // Demo data - simulating API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const demoSellers: Seller[] = [
          {
            id: 'seller_pending_1',
            businessName: 'Fashion Forward Trading',
            storeName: 'Fashion Forward Store',
            storeDescription: 'Trendy fashion items',
            storeCategory: ['Fashion'],
            businessType: 'sole_proprietor',
            businessRegistrationNumber: 'DTI-2024-567890',
            taxIdNumber: '987-654-321-000',
            description: 'Trendy fashion items',
            ownerName: 'Juan dela Cruz',
            email: 'juan@fashion.ph',
            phone: '+63 917 765 4321',
            businessAddress: '456 Commonwealth',
            city: 'Quezon City',
            province: 'Metro Manila',
            postalCode: '1127',
            address: '456 Commonwealth, QC',
            bankName: 'BPI',
            accountName: 'Juan dela Cruz',
            accountNumber: '9876543210',
            status: 'pending',
            documents: [],
            metrics: {
              totalProducts: 0,
              totalOrders: 0,
              totalRevenue: 0,
              rating: 0,
              responseRate: 0,
              fulfillmentRate: 0
            },
            joinDate: new Date('2024-12-10')
          }
        ];
        
        set({ 
          sellers: demoSellers,
          pendingSellers: demoSellers.filter(s => s.status === 'pending'),
          isLoading: false 
        });
      },

      approveSeller: async (id) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        set(state => {
          const updatedSellers = state.sellers.map(seller =>
            seller.id === id
              ? { ...seller, status: 'approved' as const, approvedAt: new Date(), approvedBy: 'admin_1' }
              : seller
          );
          
          return {
            sellers: updatedSellers,
            pendingSellers: updatedSellers.filter(seller => seller.status === 'pending'),
            isLoading: false
          };
        });
      },

      rejectSeller: async (id, reason) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        set(state => {
          const updatedSellers = state.sellers.map(seller =>
            seller.id === id
              ? { 
                  ...seller, 
                  status: 'rejected' as const,
                  rejectedAt: new Date(),
                  rejectedBy: 'admin_1',
                  rejectionReason: reason
                }
              : seller
          );
          
          return {
            sellers: updatedSellers,
            pendingSellers: updatedSellers.filter(seller => seller.status === 'pending'),
            isLoading: false
          };
        });
      },
    }),
    {
      name: 'admin-sellers-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Product QA Store - Matching Web Flow
export interface ProductQA {
  id: string;
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  sku: string;
  category: string;
  subcategory?: string;
  brand?: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  sellerStoreName: string;
  
  // QA Status - Following Web Flow
  status: 'PENDING_DIGITAL_REVIEW' | 'WAITING_FOR_SAMPLE' | 'IN_QUALITY_REVIEW' | 'ACTIVE_VERIFIED' | 'REJECTED';
  
  // Logistics Method (Seller chooses when submitting sample)
  logisticsMethod?: 'drop_off_courier' | 'company_pickup' | 'meetup';
  logisticsAddress?: string;
  logisticsNotes?: string;
  
  // Review Timeline
  submittedAt: Date;
  digitalReviewedAt?: Date;
  digitalReviewedBy?: string;
  digitalReviewNotes?: string;
  
  sampleSubmittedAt?: Date;
  sampleLogistics?: string;
  
  qualityReviewedAt?: Date;
  qualityReviewedBy?: string;
  qualityCheckNotes?: string;
  
  rejectionReason?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  
  // Product Details
  specifications?: { label: string; value: string }[];
  tags?: string[];
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  shippingClass?: string;
  
  // Visibility
  isPublished?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

interface AdminProductQAState {
  products: ProductQA[];
  pendingDigitalReview: ProductQA[];
  waitingForSample: ProductQA[];
  inQualityReview: ProductQA[];
  activeVerified: ProductQA[];
  rejected: ProductQA[];
  isLoading: boolean;
  loadProducts: () => Promise<void>;
  
  // Stage 1: Digital Review (Admin reviews listing)
  approveForSampleSubmission: (id: string, notes?: string) => Promise<void>;
  rejectDigitalReview: (id: string, reason: string) => Promise<void>;
  
  // Stage 2: Sample Submission (Seller submits sample)
  submitSample: (id: string, logistics: 'drop_off_courier' | 'company_pickup' | 'meetup', address?: string, notes?: string) => Promise<void>;
  
  // Stage 3: Quality Check (Admin inspects physical product)
  passQualityCheck: (id: string, notes?: string) => Promise<void>;
  failQualityCheck: (id: string, reason: string) => Promise<void>;
}

export const useAdminProductQA = create<AdminProductQAState>()(
  persist(
    (set, get) => ({
      products: [],
      pendingDigitalReview: [],
      waitingForSample: [],
      inQualityReview: [],
      activeVerified: [],
      rejected: [],
      isLoading: false,

      loadProducts: async () => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 800));

        // Get products from shared productQAStore
        const productQAStore = useProductQAStore.getState();
        const qaProducts = productQAStore.products;

        // Convert QA products to admin ProductQA format
        const adminProducts: ProductQA[] = qaProducts.map(qp => ({
          id: qp.id,
          name: qp.name,
          description: qp.description || '',
          price: qp.price,
          compareAtPrice: qp.originalPrice,
          stock: 0, // QA products don't have stock initially
          sku: `SKU-${qp.id}`,
          category: qp.category,
          subcategory: undefined,
          brand: undefined,
          images: qp.images || [qp.image],
          sellerId: qp.vendor,
          sellerName: qp.vendor,
          sellerStoreName: qp.vendor,
          status: qp.status as any,
          logisticsMethod: qp.logistics as any,
          submittedAt: new Date(qp.submittedAt || new Date()),
          approvedAt: qp.approvedAt ? new Date(qp.approvedAt) : undefined,
          verifiedAt: qp.verifiedAt ? new Date(qp.verifiedAt) : undefined,
          rejectedAt: qp.rejectedAt ? new Date(qp.rejectedAt) : undefined,
          rejectionReason: qp.rejectionReason,
          specifications: [],
          tags: [],
          shippingClass: 'standard',
          isPublished: qp.status === 'ACTIVE_VERIFIED',
          approvalStatus: qp.status === 'ACTIVE_VERIFIED' ? 'approved' : 
                         qp.status === 'REJECTED' ? 'rejected' : 'pending',
        }));

        set({
          products: adminProducts,
          pendingDigitalReview: adminProducts.filter(p => p.status === 'PENDING_DIGITAL_REVIEW'),
          waitingForSample: adminProducts.filter(p => p.status === 'WAITING_FOR_SAMPLE'),
          inQualityReview: adminProducts.filter(p => p.status === 'IN_QUALITY_REVIEW'),
          activeVerified: adminProducts.filter(p => p.status === 'ACTIVE_VERIFIED'),
          rejected: adminProducts.filter(p => p.status === 'REJECTED'),
          isLoading: false,
        });
      },

      approveForSampleSubmission: async (id, note) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Sync with seller productQAStore
        try {
          const productQAStore = useProductQAStore.getState();
          productQAStore.approveForSampleSubmission(id);
        } catch (error) {
          console.error('Error syncing to productQAStore:', error);
        }

        // Reload products from shared store
        await get().loadProducts();
      },

      rejectDigitalReview: async (id, reason) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Sync with seller productQAStore
        try {
          const productQAStore = useProductQAStore.getState();
          productQAStore.rejectProduct(id, reason, 'digital');
        } catch (error) {
          console.error('Error syncing to productQAStore:', error);
        }

        // Reload products from shared store
        await get().loadProducts();
      },

      submitSample: async (id, logisticsMethod, address, note) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1000));

        set(state => {
          const updatedProducts = state.products.map(product =>
            product.id === id && product.status === 'WAITING_FOR_SAMPLE'
              ? {
                  ...product,
                  status: 'IN_QUALITY_REVIEW' as const,
                  sampleSubmittedAt: new Date(),
                  logisticsMethod,
                  logisticsAddress: address,
                  logisticsNotes: note,
                }
              : product
          );

          return {
            products: updatedProducts,
            waitingForSample: updatedProducts.filter(p => p.status === 'WAITING_FOR_SAMPLE'),
            inQualityReview: updatedProducts.filter(p => p.status === 'IN_QUALITY_REVIEW'),
            isLoading: false,
          };
        });
      },

      passQualityCheck: async (id, note) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Sync with seller productQAStore
        try {
          const productQAStore = useProductQAStore.getState();
          productQAStore.passQualityCheck(id);
        } catch (error) {
          console.error('Error syncing to productQAStore:', error);
        }

        // Reload products from shared store
        await get().loadProducts();
      },

      failQualityCheck: async (id, reason) => {
        set({ isLoading: true });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Sync with seller productQAStore
        try {
          const productQAStore = useProductQAStore.getState();
          productQAStore.rejectProduct(id, reason, 'physical');
        } catch (error) {
          console.error('Error syncing to productQAStore:', error);
        }

        // Reload products from shared store
        await get().loadProducts();
      },

    }),
    {
      name: 'admin-product-qa-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Payout Management Types and Store
export interface Payout {
  id: string;
  referenceNumber: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  periodStart: Date;
  periodEnd: Date;
  payoutDate?: Date;
  bankName: string;
  accountNumber: string;
}

interface PayoutsState {
  payouts: Payout[];
  isLoading: boolean;
  error: string | null;
  loadPayouts: () => Promise<void>;
  markAsPaid: (id: string, referenceNumber: string) => Promise<void>;
  processBatch: (ids: string[]) => Promise<void>;
}

export const useAdminPayouts = create<PayoutsState>((set) => ({
  payouts: [],
  isLoading: false,
  error: null,

  loadPayouts: async () => {
    set({ isLoading: true });

    const demoPayouts: Payout[] = [
      {
        id: 'payout_1',
        referenceNumber: 'PAY-2024-001',
        sellerId: 'seller_1',
        sellerName: 'TechHub Philippines',
        amount: 25000,
        status: 'pending',
        periodStart: new Date('2024-12-01'),
        periodEnd: new Date('2024-12-15'),
        bankName: 'BDO',
        accountNumber: '1234567890'
      },
      {
        id: 'payout_2',
        referenceNumber: 'PAY-2024-002',
        sellerId: 'seller_2',
        sellerName: 'Fashion Forward Store',
        amount: 12500,
        status: 'paid',
        periodStart: new Date('2024-11-16'),
        periodEnd: new Date('2024-11-30'),
        payoutDate: new Date('2024-12-05'),
        bankName: 'BPI',
        accountNumber: '9876543210'
      },
      {
        id: 'payout_3',
        referenceNumber: 'PAY-2024-003',
        sellerId: 'seller_3',
        sellerName: 'Local Crafts Manila',
        amount: 18750,
        status: 'processing',
        periodStart: new Date('2024-12-01'),
        periodEnd: new Date('2024-12-15'),
        bankName: 'Metrobank',
        accountNumber: '5555666677'
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ payouts: demoPayouts, isLoading: false });
  },

  markAsPaid: async (id, referenceNumber) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => ({
      payouts: state.payouts.map(p => 
        p.id === id 
          ? { ...p, status: 'paid' as const, referenceNumber, payoutDate: new Date() } 
          : p
      ),
      isLoading: false
    }));
  },

  processBatch: async (ids) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1500));
    set(state => ({
      payouts: state.payouts.map(p => 
        ids.includes(p.id) 
          ? { ...p, status: 'processing' as const } 
          : p
      ),
      isLoading: false
    }));
  }
}));

// Flash Sales Types and Store
export interface FlashSaleProduct {
  id: string;
  productId: string;
  productName: string;
  seller: string;
  variant?: string;
  image: string;
  originalPrice?: number;
  flashPrice: number;
  discount: number;
  stock: number;
  sold: number;
}

export interface FlashSale {
  id: string;
  name: string;
  products: FlashSaleProduct[];
  startDate: Date;
  endDate: Date;
  status: 'scheduled' | 'active' | 'ended';
  totalProducts: number;
  totalRevenue: number;
  createdBy: string;
}

interface FlashSalesState {
  flashSales: FlashSale[];
  isLoading: boolean;
  error: string | null;
  loadFlashSales: () => Promise<void>;
  createFlashSale: (sale: Omit<FlashSale, 'id'>) => Promise<void>;
  updateFlashSale: (id: string, updates: Partial<FlashSale>) => Promise<void>;
  deleteFlashSale: (id: string) => Promise<void>;
  toggleStatus: (id: string) => Promise<void>;
}

export const useAdminFlashSales = create<FlashSalesState>((set) => ({
  flashSales: [],
  isLoading: false,
  error: null,

  loadFlashSales: async () => {
    set({ isLoading: true });

    const demoFlashSales: FlashSale[] = [
      {
        id: 'fs-1',
        name: 'Holiday Mega Sale',
        products: [
          {
            id: 'fsp-1',
            productId: 'prod-1',
            productName: 'Fresh Organic Tomatoes',
            seller: 'Maria\'s Fresh Produce',
            image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337',
            originalPrice: 120,
            flashPrice: 89,
            discount: 26,
            stock: 100,
            sold: 67
          },
          {
            id: 'fsp-2',
            productId: 'prod-2',
            productName: 'Handwoven Abaca Bag',
            seller: 'Traditional Crafts PH',
            image: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7',
            originalPrice: 450,
            flashPrice: 299,
            discount: 34,
            stock: 50,
            sold: 34
          }
        ],
        startDate: new Date('2024-12-20T00:00:00'),
        endDate: new Date('2024-12-25T23:59:59'),
        status: 'scheduled',
        totalProducts: 2,
        totalRevenue: 0,
        createdBy: 'Admin'
      },
      {
        id: 'fs-2',
        name: 'Weekend Flash Deal',
        products: [
          {
            id: 'fsp-3',
            productId: 'prod-3',
            productName: 'Philippine Coffee Beans',
            seller: 'Mountain Brew Coffee',
            image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e',
            originalPrice: 350,
            flashPrice: 250,
            discount: 29,
            stock: 200,
            sold: 156
          }
        ],
        startDate: new Date('2024-03-15T00:00:00'),
        endDate: new Date('2024-03-17T23:59:59'),
        status: 'active',
        totalProducts: 1,
        totalRevenue: 39000,
        createdBy: 'Admin'
      },
      {
        id: 'fs-3',
        name: 'New Year Blowout',
        products: [],
        startDate: new Date('2024-01-01T00:00:00'),
        endDate: new Date('2024-01-05T23:59:59'),
        status: 'ended',
        totalProducts: 5,
        totalRevenue: 125000,
        createdBy: 'Admin'
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ flashSales: demoFlashSales, isLoading: false });
  },

  createFlashSale: async (sale) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    const newSale: FlashSale = {
      ...sale,
      id: `fs-${Date.now()}`
    };
    set(state => ({
      flashSales: [...state.flashSales, newSale],
      isLoading: false
    }));
  },

  updateFlashSale: async (id, updates) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => ({
      flashSales: state.flashSales.map(fs => 
        fs.id === id ? { ...fs, ...updates } : fs
      ),
      isLoading: false
    }));
  },

  deleteFlashSale: async (id) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => ({
      flashSales: state.flashSales.filter(fs => fs.id !== id),
      isLoading: false
    }));
  },

  toggleStatus: async (id) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => ({
      flashSales: state.flashSales.map(fs => 
        fs.id === id 
          ? { 
              ...fs, 
              status: fs.status === 'active' ? 'scheduled' as const : 'active' as const 
            } 
          : fs
      ),
      isLoading: false
    }));
  }
}));

// Product Requests Types and Store
export interface ProductRequest {
  id: string;
  productName: string;
  description: string;
  category: string;
  requestedBy: string;
  requestDate: Date;
  votes: number;
  comments: number;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  priority: 'low' | 'medium' | 'high';
  estimatedDemand: number;
  adminNotes?: string;
}

interface ProductRequestsState {
  requests: ProductRequest[];
  isLoading: boolean;
  error: string | null;
  loadRequests: () => Promise<void>;
  updateStatus: (id: string, status: 'approved' | 'rejected' | 'in_progress', notes?: string) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
}

export const useAdminProductRequests = create<ProductRequestsState>((set) => ({
  requests: [],
  isLoading: false,
  error: null,

  loadRequests: async () => {
    set({ isLoading: true });

    const demoRequests: ProductRequest[] = [
      {
        id: 'req-1',
        productName: 'Organic Rice from Ifugao',
        description: 'Looking for authentic organic rice directly from Ifugao rice terraces. Willing to pay premium for quality.',
        category: 'Food & Beverages',
        requestedBy: 'Maria Santos',
        requestDate: new Date('2024-03-10'),
        votes: 245,
        comments: 34,
        status: 'pending',
        priority: 'high',
        estimatedDemand: 1000
      },
      {
        id: 'req-2',
        productName: 'Handmade Pottery from Vigan',
        description: 'Traditional Vigan pottery items - jars, pots, and decorative pieces.',
        category: 'Handicrafts',
        requestedBy: 'Juan Dela Cruz',
        requestDate: new Date('2024-03-08'),
        votes: 189,
        comments: 23,
        status: 'approved',
        priority: 'medium',
        estimatedDemand: 500,
        adminNotes: 'Connected with 3 verified Vigan pottery sellers. Expected listing in 2 weeks.'
      },
      {
        id: 'req-3',
        productName: 'Fresh Mangosteen',
        description: 'Looking for fresh mangosteen during peak season. Bulk orders available.',
        category: 'Fruits',
        requestedBy: 'Carmen Reyes',
        requestDate: new Date('2024-03-05'),
        votes: 156,
        comments: 18,
        status: 'in_progress',
        priority: 'high',
        estimatedDemand: 2000,
        adminNotes: 'Coordinating with Davao fruit sellers. ETA 1 week.'
      },
      {
        id: 'req-4',
        productName: 'Baguio Vegetables Bundle',
        description: 'Mixed vegetables from Baguio - lettuce, carrots, tomatoes, etc.',
        category: 'Vegetables',
        requestedBy: 'Roberto Cruz',
        requestDate: new Date('2024-03-01'),
        votes: 312,
        comments: 45,
        status: 'approved',
        priority: 'high',
        estimatedDemand: 1500,
        adminNotes: 'Multiple Baguio sellers onboarded. Product live on marketplace.'
      },
      {
        id: 'req-5',
        productName: 'Imported Luxury Watches',
        description: 'Looking for authentic Rolex and Omega watches',
        category: 'Accessories',
        requestedBy: 'Suspicious User',
        requestDate: new Date('2024-02-28'),
        votes: 12,
        comments: 3,
        status: 'rejected',
        priority: 'low',
        estimatedDemand: 10,
        adminNotes: 'Request rejected - high risk of counterfeit goods. Does not align with marketplace focus.'
      },
      {
        id: 'req-6',
        productName: 'Mindanao Coffee Beans',
        description: 'Premium coffee beans from Mindanao. Looking for arabica and robusta varieties.',
        category: 'Beverages',
        requestedBy: 'Lisa Chen',
        requestDate: new Date('2024-03-12'),
        votes: 278,
        comments: 56,
        status: 'pending',
        priority: 'high',
        estimatedDemand: 800
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ requests: demoRequests, isLoading: false });
  },

  updateStatus: async (id, status, notes) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => ({
      requests: state.requests.map(req => 
        req.id === id 
          ? { ...req, status, adminNotes: notes || req.adminNotes } 
          : req
      ),
      isLoading: false
    }));
  },

  deleteRequest: async (id) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => ({
      requests: state.requests.filter(req => req.id !== id),
      isLoading: false
    }));
  }
}));

// Review Types and Store
export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar: string;
  sellerId: string;
  sellerName: string;
  rating: number;
  title: string;
  content: string;
  images: string[];
  isVerifiedPurchase: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderationNote?: string;
  helpfulCount: number;
  reportCount: number;
  createdAt: Date;
  moderatedAt?: Date;
  moderatedBy?: string;
}

interface ReviewsState {
  reviews: Review[];
  selectedReview: Review | null;
  pendingReviews: Review[];
  flaggedReviews: Review[];
  isLoading: boolean;
  error: string | null;
  loadReviews: () => Promise<void>;
  approveReview: (id: string) => Promise<void>;
  rejectReview: (id: string, reason: string) => Promise<void>;
  flagReview: (id: string, reason: string) => Promise<void>;
  unflagReview: (id: string) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
  selectReview: (review: Review | null) => void;
  clearError: () => void;
}

export const useAdminReviews = create<ReviewsState>((set) => ({
  reviews: [],
  selectedReview: null,
  pendingReviews: [],
  flaggedReviews: [],
  isLoading: false,
  error: null,

  loadReviews: async () => {
    set({ isLoading: true });

    const demoReviews: Review[] = [
      {
        id: 'rev_1',
        productId: 'prod_1',
        productName: 'Wireless Bluetooth Earbuds',
        productImage: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200',
        buyerId: 'buyer_1',
        buyerName: 'Anna Reyes',
        buyerAvatar: 'https://ui-avatars.io/api/?name=Anna+Reyes&background=FF6A00&color=fff',
        sellerId: 'seller_1',
        sellerName: 'TechHub Philippines',
        rating: 5,
        title: 'Excellent product!',
        content: 'Great sound quality and battery life. Highly recommended!',
        images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400'],
        isVerifiedPurchase: true,
        status: 'pending',
        helpfulCount: 0,
        reportCount: 0,
        createdAt: new Date('2024-12-15T10:30:00')
      },
      {
        id: 'rev_2',
        productId: 'prod_2',
        productName: 'Leather Crossbody Bag',
        productImage: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200',
        buyerId: 'buyer_2',
        buyerName: 'Miguel Cruz',
        buyerAvatar: 'https://ui-avatars.io/api/?name=Miguel+Cruz&background=FF6A00&color=fff',
        sellerId: 'seller_2',
        sellerName: 'Fashion Forward Store',
        rating: 1,
        title: 'Fake product, scam!',
        content: 'This is clearly a fake. Terrible quality and misleading photos. SCAM!',
        images: [],
        isVerifiedPurchase: false,
        status: 'flagged',
        moderationNote: 'Flagged for inappropriate language and potential false claims',
        helpfulCount: 2,
        reportCount: 5,
        createdAt: new Date('2024-12-14T15:20:00')
      },
      {
        id: 'rev_3',
        productId: 'prod_3',
        productName: 'Smart Watch Series 5',
        productImage: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200',
        buyerId: 'buyer_3',
        buyerName: 'Sofia Lim',
        buyerAvatar: 'https://ui-avatars.io/api/?name=Sofia+Lim&background=FF6A00&color=fff',
        sellerId: 'seller_1',
        sellerName: 'TechHub Philippines',
        rating: 4,
        title: 'Good value for money',
        content: 'Works well, battery could be better. Overall satisfied with purchase.',
        images: [],
        isVerifiedPurchase: true,
        status: 'approved',
        helpfulCount: 12,
        reportCount: 0,
        createdAt: new Date('2024-12-13T09:15:00'),
        moderatedAt: new Date('2024-12-13T10:00:00'),
        moderatedBy: 'admin_1'
      },
      {
        id: 'rev_4',
        productId: 'prod_4',
        productName: 'Coffee Maker Deluxe',
        productImage: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=200',
        buyerId: 'buyer_4',
        buyerName: 'Carlos Tan',
        buyerAvatar: 'https://ui-avatars.io/api/?name=Carlos+Tan&background=FF6A00&color=fff',
        sellerId: 'seller_3',
        sellerName: 'Home Essentials',
        rating: 3,
        title: 'Average quality',
        content: 'Decent product but nothing special. Gets the job done.',
        images: [],
        isVerifiedPurchase: true,
        status: 'approved',
        helpfulCount: 5,
        reportCount: 0,
        createdAt: new Date('2024-12-12T14:20:00'),
        moderatedAt: new Date('2024-12-12T15:00:00'),
        moderatedBy: 'admin_1'
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    const pending = demoReviews.filter(r => r.status === 'pending');
    const flagged = demoReviews.filter(r => r.status === 'flagged');
    set({ reviews: demoReviews, pendingReviews: pending, flaggedReviews: flagged, isLoading: false });
  },

  approveReview: async (id) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => {
      const updatedReviews = state.reviews.map(r => 
        r.id === id 
          ? { 
              ...r, 
              status: 'approved' as const, 
              moderatedAt: new Date(),
              moderatedBy: 'admin_1'
            } 
          : r
      );
      return {
        reviews: updatedReviews,
        pendingReviews: updatedReviews.filter(r => r.status === 'pending'),
        flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
        isLoading: false
      };
    });
  },

  rejectReview: async (id, reason) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => {
      const updatedReviews = state.reviews.map(r => 
        r.id === id 
          ? { 
              ...r, 
              status: 'rejected' as const, 
              moderationNote: reason,
              moderatedAt: new Date(),
              moderatedBy: 'admin_1'
            } 
          : r
      );
      return {
        reviews: updatedReviews,
        pendingReviews: updatedReviews.filter(r => r.status === 'pending'),
        flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
        isLoading: false
      };
    });
  },

  flagReview: async (id, reason) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => {
      const updatedReviews = state.reviews.map(r => 
        r.id === id 
          ? { 
              ...r, 
              status: 'flagged' as const, 
              moderationNote: reason,
              reportCount: r.reportCount + 1
            } 
          : r
      );
      return {
        reviews: updatedReviews,
        pendingReviews: updatedReviews.filter(r => r.status === 'pending'),
        flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
        isLoading: false
      };
    });
  },

  unflagReview: async (id) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => {
      const updatedReviews = state.reviews.map(r => 
        r.id === id 
          ? { 
              ...r, 
              status: 'approved' as const, 
              moderationNote: undefined
            } 
          : r
      );
      return {
        reviews: updatedReviews,
        pendingReviews: updatedReviews.filter(r => r.status === 'pending'),
        flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
        isLoading: false
      };
    });
  },

  deleteReview: async (id) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    set(state => {
      const updatedReviews = state.reviews.filter(r => r.id !== id);
      return {
        reviews: updatedReviews,
        pendingReviews: updatedReviews.filter(r => r.status === 'pending'),
        flaggedReviews: updatedReviews.filter(r => r.status === 'flagged'),
        isLoading: false
      };
    });
  },

  selectReview: (review) => set({ selectedReview: review }),
  clearError: () => set({ error: null })
}));

// Analytics Types and Data
export interface AnalyticsStats {
  totalRevenue: string;
  totalOrders: string;
  activeUsers: string;
  conversionRate: string;
  revenueChange: string;
  ordersChange: string;
  usersChange: string;
  conversionChange: string;
}

export interface RevenueData {
  month: string;
  revenue: number;
  orders: number;
}

export interface CategoryData {
  name: string;
  value: number;
  color: string;
}

export interface TopProductData {
  name: string;
  sales: number;
  revenue: number;
}

interface AnalyticsState {
  stats: AnalyticsStats;
  revenueData: RevenueData[];
  categoryData: CategoryData[];
  topProducts: TopProductData[];
  isLoading: boolean;
  loadAnalytics: () => Promise<void>;
}

export const useAdminAnalytics = create<AnalyticsState>((set) => ({
  stats: {
    totalRevenue: '₱823,000',
    totalOrders: '2,357',
    activeUsers: '1,289',
    conversionRate: '3.24%',
    revenueChange: '+12.5%',
    ordersChange: '+8.2%',
    usersChange: '+15.3%',
    conversionChange: '-2.1%'
  },
  revenueData: [],
  categoryData: [],
  topProducts: [],
  isLoading: false,

  loadAnalytics: async () => {
    set({ isLoading: true });

    const revenueData: RevenueData[] = [
      { month: 'Jan', revenue: 45000, orders: 120 },
      { month: 'Feb', revenue: 52000, orders: 145 },
      { month: 'Mar', revenue: 48000, orders: 132 },
      { month: 'Apr', revenue: 61000, orders: 168 },
      { month: 'May', revenue: 55000, orders: 151 },
      { month: 'Jun', revenue: 67000, orders: 189 },
      { month: 'Jul', revenue: 72000, orders: 203 },
      { month: 'Aug', revenue: 68000, orders: 195 },
      { month: 'Sep', revenue: 75000, orders: 218 },
      { month: 'Oct', revenue: 82000, orders: 241 },
      { month: 'Nov', revenue: 78000, orders: 229 },
      { month: 'Dec', revenue: 89000, orders: 267 }
    ];

    const categoryData: CategoryData[] = [
      { name: 'Electronics', value: 35, color: '#FF6A00' },
      { name: 'Fashion', value: 25, color: '#FF8533' },
      { name: 'Home & Garden', value: 20, color: '#FFA366' },
      { name: 'Books', value: 12, color: '#FFBC80' },
      { name: 'Others', value: 8, color: '#FFD4A6' }
    ];

    const topProducts: TopProductData[] = [
      { name: 'Wireless Earbuds', sales: 234, revenue: 584166 },
      { name: 'Leather Bag', sales: 189, revenue: 623511 },
      { name: 'Smart Watch', sales: 156, revenue: 779844 },
      { name: 'Running Shoes', sales: 143, revenue: 428857 },
      { name: 'Coffee Maker', sales: 128, revenue: 383872 }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ revenueData, categoryData, topProducts, isLoading: false });
  }
}));

// Categories Management Store
interface CategoriesState {
  categories: Category[];
  selectedCategory: Category | null;
  isLoading: boolean;
  error: string | null;
  loadCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'productsCount'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  selectCategory: (category: Category | null) => void;
  clearError: () => void;
}

export const useAdminCategories = create<CategoriesState>((set) => ({
  categories: [],
  selectedCategory: null,
  isLoading: false,
  error: null,

  loadCategories: async () => {
    set({ isLoading: true });

    const demoCategories: Category[] = [
      {
        id: 'cat_1',
        name: 'Electronics',
        description: 'Smartphones, laptops, gadgets and electronic devices',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
        slug: 'electronics',
        isActive: true,
        sortOrder: 1,
        productsCount: 1250,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-12-15')
      },
      {
        id: 'cat_2',
        name: 'Fashion & Apparel',
        description: 'Clothing, shoes, accessories for men, women and children',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400',
        slug: 'fashion-apparel',
        isActive: true,
        sortOrder: 2,
        productsCount: 2340,
        createdAt: new Date('2024-01-16'),
        updatedAt: new Date('2024-12-14')
      },
      {
        id: 'cat_3',
        name: 'Home & Garden',
        description: 'Furniture, home decor, kitchen appliances, garden tools',
        image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
        slug: 'home-garden',
        isActive: true,
        sortOrder: 3,
        productsCount: 890,
        createdAt: new Date('2024-01-17'),
        updatedAt: new Date('2024-12-13')
      },
      {
        id: 'cat_4',
        name: 'Health & Beauty',
        description: 'Skincare, makeup, supplements, personal care products',
        image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
        slug: 'health-beauty',
        isActive: true,
        sortOrder: 4,
        productsCount: 670,
        createdAt: new Date('2024-01-18'),
        updatedAt: new Date('2024-12-12')
      },
      {
        id: 'cat_5',
        name: 'Sports & Outdoors',
        description: 'Sports equipment, outdoor gear, fitness accessories',
        image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400',
        slug: 'sports-outdoors',
        isActive: false,
        sortOrder: 5,
        productsCount: 445,
        createdAt: new Date('2024-01-19'),
        updatedAt: new Date('2024-12-11')
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ categories: demoCategories, isLoading: false });
  },

  addCategory: async (categoryData) => {
    set({ isLoading: true });
    
    const newCategory: Category = {
      ...categoryData,
      id: `cat_${Date.now()}`,
      productsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    set(state => ({
      categories: [...state.categories, newCategory],
      isLoading: false
    }));
  },

  updateCategory: async (id, updates) => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    set(state => ({
      categories: state.categories.map(cat => 
        cat.id === id 
          ? { ...cat, ...updates, updatedAt: new Date() } 
          : cat
      ),
      isLoading: false
    }));
  },

  deleteCategory: async (id) => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    set(state => ({
      categories: state.categories.filter(cat => cat.id !== id),
      isLoading: false
    }));
  },

  selectCategory: (category) => set({ selectedCategory: category }),
  clearError: () => set({ error: null })
}));

// Buyers Management Store
interface BuyersState {
  buyers: Buyer[];
  selectedBuyer: Buyer | null;
  isLoading: boolean;
  error: string | null;
  loadBuyers: () => Promise<void>;
  suspendBuyer: (id: string, reason: string) => Promise<void>;
  activateBuyer: (id: string) => Promise<void>;
  selectBuyer: (buyer: Buyer | null) => void;
  clearError: () => void;
}

export const useAdminBuyers = create<BuyersState>((set) => ({
  buyers: [],
  selectedBuyer: null,
  isLoading: false,
  error: null,

  loadBuyers: async () => {
    set({ isLoading: true });

    const demoBuyers: Buyer[] = [
      {
        id: 'buyer_1',
        email: 'anna.reyes@gmail.com',
        firstName: 'Anna',
        lastName: 'Reyes',
        phone: '+63 917 111 2222',
        avatar: 'https://ui-avatars.io/api/?name=Anna+Reyes&background=FF6A00&color=fff',
        dateOfBirth: new Date('1990-05-15'),
        gender: 'female',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'active',
        addresses: [
          {
            id: 'addr_1',
            label: 'Home',
            street: '123 Rizal Street, Brgy. San Antonio',
            city: 'Makati City',
            province: 'Metro Manila',
            zipCode: '1200',
            isDefault: true
          }
        ],
        metrics: {
          totalOrders: 47,
          totalSpent: 89750,
          averageOrderValue: 1908,
          cancelledOrders: 2,
          returnedOrders: 1,
          loyaltyPoints: 1245
        },
        joinDate: new Date('2024-03-15'),
        lastActivity: new Date('2024-12-15')
      },
      {
        id: 'buyer_2',
        email: 'miguel.cruz@yahoo.com',
        firstName: 'Miguel',
        lastName: 'Cruz',
        phone: '+63 917 333 4444',
        avatar: 'https://ui-avatars.io/api/?name=Miguel+Cruz&background=FF6A00&color=fff',
        dateOfBirth: new Date('1985-08-20'),
        gender: 'male',
        isEmailVerified: true,
        isPhoneVerified: false,
        status: 'active',
        addresses: [
          {
            id: 'addr_2',
            label: 'Office',
            street: '456 EDSA, Ortigas Center',
            city: 'Pasig City',
            province: 'Metro Manila',
            zipCode: '1600',
            isDefault: true
          }
        ],
        metrics: {
          totalOrders: 23,
          totalSpent: 34500,
          averageOrderValue: 1500,
          cancelledOrders: 3,
          returnedOrders: 0,
          loyaltyPoints: 567
        },
        joinDate: new Date('2024-07-20'),
        lastActivity: new Date('2024-12-14')
      },
      {
        id: 'buyer_3',
        email: 'sofia.lim@hotmail.com',
        firstName: 'Sofia',
        lastName: 'Lim',
        phone: '+63 917 555 6666',
        avatar: 'https://ui-avatars.io/api/?name=Sofia+Lim&background=FF6A00&color=fff',
        dateOfBirth: new Date('1995-03-10'),
        gender: 'female',
        isEmailVerified: true,
        isPhoneVerified: true,
        status: 'suspended',
        suspensionReason: 'Multiple failed payment attempts',
        addresses: [
          {
            id: 'addr_3',
            label: 'Home',
            street: '789 Ayala Avenue',
            city: 'Quezon City',
            province: 'Metro Manila',
            zipCode: '1100',
            isDefault: true
          }
        ],
        metrics: {
          totalOrders: 12,
          totalSpent: 15600,
          averageOrderValue: 1300,
          cancelledOrders: 8,
          returnedOrders: 3,
          loyaltyPoints: 89
        },
        joinDate: new Date('2024-09-05'),
        lastActivity: new Date('2024-12-10')
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ buyers: demoBuyers, isLoading: false });
  },

  suspendBuyer: async (id, reason) => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    set(state => ({
      buyers: state.buyers.map(buyer =>
        buyer.id === id
          ? { ...buyer, status: 'suspended' as const, suspensionReason: reason }
          : buyer
      ),
      isLoading: false
    }));
  },

  activateBuyer: async (id) => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    set(state => ({
      buyers: state.buyers.map(buyer =>
        buyer.id === id
          ? { ...buyer, status: 'active' as const, suspensionReason: undefined }
          : buyer
      ),
      isLoading: false
    }));
  },

  selectBuyer: (buyer) => set({ selectedBuyer: buyer }),
  clearError: () => set({ error: null })
}));

// Admin Orders Store
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  variant?: string;
  originalPrice?: number;
}

interface OrderBuyer {
  name: string;
  email: string;
  phone: string;
}

interface OrderSeller {
  name: string;
  email: string;
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  buyer: OrderBuyer;
  seller: OrderSeller;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  shippingAddress: string;
  trackingNumber?: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  date: Date;
  canCancel: boolean;
  canRefund: boolean;
}

interface AdminOrdersState {
  orders: AdminOrder[];
  selectedOrder: AdminOrder | null;
  isLoading: boolean;
  error: string | null;
  loadOrders: () => Promise<void>;
  selectOrder: (order: AdminOrder | null) => void;
  clearError: () => void;
}

export const useAdminOrders = create<AdminOrdersState>((set) => ({
  orders: [],
  selectedOrder: null,
  isLoading: false,
  error: null,

  loadOrders: async () => {
    set({ isLoading: true, error: null });

    const demoOrders: AdminOrder[] = [
      {
        id: 'ORD-001',
        orderNumber: 'BZR-2024-001234',
        buyer: { name: 'Juan Dela Cruz', email: 'juan@email.com', phone: '+63 917 123 4567' },
        seller: { name: 'TechHub Manila', email: 'tech@hub.com' },
        items: [
          { name: 'Wireless Earbuds', quantity: 1, price: 1299 },
          { name: 'Phone Case', quantity: 1, price: 399 }
        ],
        subtotal: 1698,
        shippingFee: 150,
        discount: 0,
        total: 1848,
        paymentMethod: 'GCash',
        paymentStatus: 'paid',
        shippingAddress: 'Makati City, Metro Manila',
        trackingNumber: 'TRACK123456',
        status: 'shipped',
        date: new Date('2024-12-10T10:30:00'),
        canCancel: false,
        canRefund: true
      },
      {
        id: 'ORD-002',
        orderNumber: 'BZR-2024-001235',
        buyer: { name: 'Maria Santos', email: 'maria@email.com', phone: '+63 917 765 4321' },
        seller: { name: 'Fashion Central', email: 'fashion@central.com' },
        items: [
          { name: 'Summer Dress', quantity: 1, price: 2999 }
        ],
        subtotal: 2999,
        shippingFee: 200,
        discount: 300,
        total: 2899,
        paymentMethod: 'Credit Card',
        paymentStatus: 'paid',
        shippingAddress: 'Quezon City, Metro Manila',
        trackingNumber: 'TRACK789012',
        status: 'delivered',
        date: new Date('2024-12-09T14:15:00'),
        canCancel: false,
        canRefund: true
      },
      {
        id: 'ORD-003',
        orderNumber: 'BZR-2024-001236',
        buyer: { name: 'Pedro Garcia', email: 'pedro@email.com', phone: '+63 917 555 1234' },
        seller: { name: 'Home Essentials', email: 'home@essentials.com' },
        items: [
          { name: 'Coffee Maker', quantity: 1, price: 1299 },
          { name: 'Water Filter', quantity: 2, price: 599 }
        ],
        subtotal: 2497,
        shippingFee: 150,
        discount: 0,
        total: 2647,
        paymentMethod: 'COD',
        paymentStatus: 'pending',
        shippingAddress: 'Pasig City, Metro Manila',
        status: 'pending',
        date: new Date('2024-12-12T09:20:00'),
        canCancel: true,
        canRefund: false
      },
      {
        id: 'ORD-004',
        orderNumber: 'BZR-2024-001237',
        buyer: { name: 'Sofia Lim', email: 'sofia@email.com', phone: '+63 917 888 9999' },
        seller: { name: 'TechHub Manila', email: 'tech@hub.com' },
        items: [
          { name: 'Smart Watch', quantity: 1, price: 4999 }
        ],
        subtotal: 4999,
        shippingFee: 0,
        discount: 500,
        total: 4499,
        paymentMethod: 'PayMaya',
        paymentStatus: 'paid',
        shippingAddress: 'Taguig City, Metro Manila',
        trackingNumber: 'TRACK345678',
        status: 'confirmed',
        date: new Date('2024-12-11T16:45:00'),
        canCancel: true,
        canRefund: true
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ orders: demoOrders, isLoading: false });
  },

  selectOrder: (order) => set({ selectedOrder: order }),
  clearError: () => set({ error: null })
}));

// Admin Products Store
export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  status: 'active' | 'inactive' | 'banned';
  rating: number;
  sales: number;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductsState {
  products: AdminProduct[];
  isLoading: boolean;
  error: string | null;
  loadProducts: () => Promise<void>;
  deactivateProduct: (id: string, reason: string) => Promise<void>;
  activateProduct: (id: string) => Promise<void>;
}

export const useAdminProducts = create<ProductsState>((set) => ({
  products: [],
  isLoading: false,
  error: null,

  loadProducts: async () => {
    set({ isLoading: true });

    const demoProducts: AdminProduct[] = [
      {
        id: 'prod_1',
        name: 'Wireless Bluetooth Earbuds',
        description: 'High quality wireless earbuds with noise cancellation',
        price: 1299,
        stock: 50,
        category: 'Electronics',
        images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200'],
        sellerId: 'seller_1',
        sellerName: 'TechHub Philippines',
        status: 'active',
        rating: 4.8,
        sales: 120,
        isVerified: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-12-15')
      },
      {
        id: 'prod_2',
        name: 'Leather Crossbody Bag',
        description: 'Genuine leather bag for everyday use',
        price: 2499,
        stock: 20,
        category: 'Fashion',
        images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=200'],
        sellerId: 'seller_2',
        sellerName: 'Fashion Forward Store',
        status: 'active',
        rating: 4.5,
        sales: 85,
        isVerified: false,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-12-10')
      },
      {
        id: 'prod_3',
        name: 'Smart Watch Series 5',
        description: 'Fitness tracker and smart watch',
        price: 3999,
        stock: 15,
        category: 'Electronics',
        images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200'],
        sellerId: 'seller_1',
        sellerName: 'TechHub Philippines',
        status: 'banned',
        rating: 2.1,
        sales: 5,
        isVerified: false,
        createdAt: new Date('2024-03-05'),
        updatedAt: new Date('2024-03-10')
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ products: demoProducts, isLoading: false });
  },

  deactivateProduct: async (id, _reason) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 800));
    set(state => ({
      products: state.products.map(p => p.id === id ? { ...p, status: 'banned' as const } : p),
      isLoading: false
    }));
  },

  activateProduct: async (id) => {
    set({ isLoading: true });
    await new Promise(resolve => setTimeout(resolve, 800));
    set(state => ({
      products: state.products.map(p => p.id === id ? { ...p, status: 'active' as const } : p),
      isLoading: false
    }));
  }
}));

