import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  businessType: string;
  description: string;
  logo?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  documents: SellerDocument[];
  metrics: SellerMetrics;
  joinDate: Date;
  approvedAt?: Date;
  approvedBy?: string;
}

export interface SellerDocument {
  id: string;
  type: 'business_permit' | 'dti_registration' | 'tax_id' | 'other';
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

        // Demo admin credentials
        const adminCredentials = [
          {
            email: 'admin@bazaarph.com',
            password: 'admin123',
            user: {
              id: 'admin_1',
              email: 'admin@bazaarph.com',
              name: 'Admin User',
              role: 'super_admin' as const,
              avatar: 'https://ui-avatars.io/api/?name=Admin+User&background=FF6A00&color=fff',
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
            error: 'Invalid credentials. Use admin@bazaarph.com / admin123',
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
      name: 'admin-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

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

    // Demo categories
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
    
    await new Promise(resolve => setTimeout(resolve, 600));
    
    set(state => ({
      categories: state.categories.filter(cat => cat.id !== id),
      selectedCategory: state.selectedCategory?.id === id ? null : state.selectedCategory,
      isLoading: false
    }));
  },

  selectCategory: (category) => set({ selectedCategory: category }),
  clearError: () => set({ error: null })
}));

// Seller Management Store
interface SellersState {
  sellers: Seller[];
  selectedSeller: Seller | null;
  pendingSellers: Seller[];
  isLoading: boolean;
  error: string | null;
  loadSellers: () => Promise<void>;
  approveSeller: (id: string) => Promise<void>;
  rejectSeller: (id: string, reason: string) => Promise<void>;
  suspendSeller: (id: string, reason: string) => Promise<void>;
  selectSeller: (seller: Seller | null) => void;
  clearError: () => void;
}

export const useAdminSellers = create<SellersState>((set) => ({
  sellers: [],
  selectedSeller: null,
  pendingSellers: [],
  isLoading: false,
  error: null,

  loadSellers: async () => {
    set({ isLoading: true });

    // Demo sellers data
    const demoSellers: Seller[] = [
      {
        id: 'seller_1',
        businessName: 'TechHub Philippines',
        ownerName: 'Maria Santos',
        email: 'maria@techhub.ph',
        phone: '+63 917 123 4567',
        address: 'Makati City, Metro Manila',
        businessType: 'Electronics Retailer',
        description: 'Leading supplier of latest gadgets and technology products',
        logo: 'https://ui-avatars.io/api/?name=TechHub&background=FF6A00&color=fff',
        status: 'approved',
        documents: [
          {
            id: 'doc_1',
            type: 'business_permit',
            fileName: 'business-permit.pdf',
            url: '/documents/business-permit.pdf',
            uploadDate: new Date('2024-01-10'),
            isVerified: true
          }
        ],
        metrics: {
          totalProducts: 156,
          totalOrders: 2340,
          totalRevenue: 1250000,
          rating: 4.8,
          responseRate: 95,
          fulfillmentRate: 98
        },
        joinDate: new Date('2024-01-10'),
        approvedAt: new Date('2024-01-12'),
        approvedBy: 'admin_1'
      },
      {
        id: 'seller_2',
        businessName: 'Fashion Forward Store',
        ownerName: 'Juan dela Cruz',
        email: 'juan@fashionforward.ph',
        phone: '+63 917 765 4321',
        address: 'Quezon City, Metro Manila',
        businessType: 'Fashion Retailer',
        description: 'Trendy fashion items for modern Filipino consumers',
        status: 'pending',
        documents: [
          {
            id: 'doc_2',
            type: 'business_permit',
            fileName: 'permit-fashion.pdf',
            url: '/documents/permit-fashion.pdf',
            uploadDate: new Date('2024-12-10'),
            isVerified: false
          },
          {
            id: 'doc_3',
            type: 'dti_registration',
            fileName: 'dti-registration.pdf',
            url: '/documents/dti-registration.pdf',
            uploadDate: new Date('2024-12-10'),
            isVerified: false
          }
        ],
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

    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const pendingSellers = demoSellers.filter(seller => seller.status === 'pending');
    
    set({ 
      sellers: demoSellers, 
      pendingSellers,
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

  rejectSeller: async (id, _reason) => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    set(state => {
      const updatedSellers = state.sellers.map(seller =>
        seller.id === id
          ? { ...seller, status: 'rejected' as const }
          : seller
      );
      
      return {
        sellers: updatedSellers,
        pendingSellers: updatedSellers.filter(seller => seller.status === 'pending'),
        isLoading: false
      };
    });
  },

  suspendSeller: async (id, _reason) => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    set(state => ({
      sellers: state.sellers.map(seller =>
        seller.id === id
          ? { ...seller, status: 'suspended' as const }
          : seller
      ),
      isLoading: false
    }));
  },

  selectSeller: (seller) => set({ selectedSeller: seller }),
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

    // Demo buyers data
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
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ buyers: demoBuyers, isLoading: false });
  },

  suspendBuyer: async (id, _reason) => {
    set({ isLoading: true });
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    set(state => ({
      buyers: state.buyers.map(buyer =>
        buyer.id === id
          ? { ...buyer, status: 'suspended' as const }
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
          ? { ...buyer, status: 'active' as const }
          : buyer
      ),
      isLoading: false
    }));
  },

  selectBuyer: (buyer) => set({ selectedBuyer: buyer }),
  clearError: () => set({ error: null })
}));

// Admin Dashboard Stats Store
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
  recentActivity: Array<{
    id: string;
    type: 'order' | 'seller_registration' | 'product_listing' | 'dispute';
    description: string;
    timestamp: Date;
    status: 'success' | 'warning' | 'error';
  }>;
  revenueChart: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  topCategories: Array<{
    name: string;
    revenue: number;
    growth: number;
  }>;
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
  recentActivity: [],
  revenueChart: [],
  topCategories: [],
  isLoading: false,

  loadDashboardData: async () => {
    set({ isLoading: true });

    // Demo dashboard data
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

    const demoActivity = [
      {
        id: 'activity_1',
        type: 'order' as const,
        description: 'New order #ORD-2024-15234 placed by Anna Reyes',
        timestamp: new Date('2024-12-15T14:30:00'),
        status: 'success' as const
      },
      {
        id: 'activity_2',
        type: 'seller_registration' as const,
        description: 'New seller application from Fashion Forward Store',
        timestamp: new Date('2024-12-15T13:45:00'),
        status: 'warning' as const
      },
      {
        id: 'activity_3',
        type: 'product_listing' as const,
        description: 'TechHub Philippines listed 5 new products',
        timestamp: new Date('2024-12-15T12:20:00'),
        status: 'success' as const
      }
    ];

    const demoRevenueChart = Array.from({ length: 30 }, (_, i) => ({
      date: new Date(2024, 11, i + 1).toISOString().split('T')[0],
      revenue: Math.floor(Math.random() * 100000) + 200000,
      orders: Math.floor(Math.random() * 500) + 800
    }));

    const demoTopCategories = [
      { name: 'Electronics', revenue: 5250000, growth: 18.5 },
      { name: 'Fashion & Apparel', revenue: 4120000, growth: 12.8 },
      { name: 'Home & Garden', revenue: 2890000, growth: 9.2 },
      { name: 'Health & Beauty', revenue: 1980000, growth: 15.6 }
    ];

    await new Promise(resolve => setTimeout(resolve, 1200));

    set({
      stats: demoStats,
      recentActivity: demoActivity,
      revenueChart: demoRevenueChart,
      topCategories: demoTopCategories,
      isLoading: false
    });
  }
}));