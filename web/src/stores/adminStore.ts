import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

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

  // Business Information
  businessName: string;
  storeName: string;
  storeDescription: string;
  storeCategory: string[];
  businessType: 'sole_proprietor' | 'partnership' | 'corporation' | string;
  businessRegistrationNumber: string;
  taxIdNumber: string;
  description: string;
  logo?: string;

  // Owner Information
  ownerName: string;
  email: string;
  phone: string;

  // Address Information
  businessAddress: string;
  city: string;
  province: string;
  postalCode: string;
  address: string; // Full address (combined)

  // Banking Information
  bankName: string;
  accountName: string;
  accountNumber: string;

  // Status and Documents
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  documents: SellerDocument[];
  metrics: SellerMetrics;

  // Admin info
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
  type: string;
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

        // Try Supabase authentication first
        if (isSupabaseConfigured()) {
          try {
            // Sign in with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (authError || !authData.user) {
              console.error('Admin auth error:', authError);
              set({
                error: 'Invalid credentials',
                isLoading: false
              });
              return false;
            }

            // Fetch admin profile to verify user_type
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            if (profileError || !profile) {
              console.error('Profile fetch error:', profileError);
              await supabase.auth.signOut();
              set({
                error: 'Admin profile not found',
                isLoading: false
              });
              return false;
            }

            // Verify user is an admin
            if (profile.user_type !== 'admin') {
              await supabase.auth.signOut();
              set({
                error: 'Access denied. Admin account required.',
                isLoading: false
              });
              return false;
            }

            // Create admin user object
            const adminUser: AdminUser = {
              id: authData.user.id,
              email: profile.email || email,
              name: profile.full_name || 'Admin User',
              role: 'admin',
              avatar: profile.avatar_url || `https://ui-avatars.io/api/?name=${encodeURIComponent(profile.full_name || 'Admin')}&background=FF6A00&color=fff`,
              lastLogin: new Date(),
              permissions: [
                { id: '1', name: 'Full Access', resource: 'users', actions: ['read', 'write', 'delete'] },
                { id: '2', name: 'Full Access', resource: 'sellers', actions: ['read', 'write', 'delete', 'approve'] },
                { id: '3', name: 'Full Access', resource: 'categories', actions: ['read', 'write', 'delete'] },
                { id: '4', name: 'Full Access', resource: 'products', actions: ['read', 'write', 'delete'] },
                { id: '5', name: 'Full Access', resource: 'orders', actions: ['read', 'write', 'delete'] },
                { id: '6', name: 'Full Access', resource: 'analytics', actions: ['read'] },
              ]
            };

            set({
              user: adminUser,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            return true;

          } catch (err) {
            console.error('Login error:', err);
            set({
              error: 'Login failed. Please try again.',
              isLoading: false
            });
            return false;
          }
        }

        // Fallback to demo admin credentials if Supabase not configured
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

      logout: async () => {
        // Sign out from Supabase if configured
        if (isSupabaseConfigured()) {
          await supabase.auth.signOut();
        }

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
  addSeller: (seller: Seller) => void;
  clearError: () => void;
  hasCompleteRequirements: (seller: Seller) => boolean;
}

export const useAdminSellers = create<SellersState>()(
  persist(
    (set) => ({
      sellers: [],
      selectedSeller: null,
      pendingSellers: [],
      isLoading: false,
      error: null,

      loadSellers: async () => {
        set({ isLoading: true, error: null });

        // Try to load from Supabase if configured
        if (isSupabaseConfigured()) {
          try {
            // Fetch sellers from Supabase with profile data (left join to include sellers without profiles)
            const { data: sellersData, error: sellersError } = await supabase
              .from('sellers')
              .select(`
                *,
                profiles(email, full_name, phone)
              `)
              .order('created_at', { ascending: false });

            if (sellersError) {
              console.error('Error loading sellers:', sellersError);
              set({ error: 'Failed to load sellers', isLoading: false });
              return;
            }

            console.log('Raw sellers data from Supabase:', sellersData);
            console.log('Number of sellers fetched:', sellersData?.length);

            // Map Supabase data to admin seller format
            const sellers: Seller[] = (sellersData || []).map((seller: any) => {
              // Build full address
              const addressParts = [
                seller.business_address,
                seller.city,
                seller.province,
                seller.postal_code
              ].filter(Boolean);
              const fullAddress = addressParts.join(', ');

              // Build documents array from document URL fields
              const documents: SellerDocument[] = [];
              if (seller.business_permit_url) {
                documents.push({
                  id: `doc_bp_${seller.id}`,
                  type: 'business_permit',
                  fileName: 'business-permit',
                  url: seller.business_permit_url,
                  uploadDate: new Date(seller.created_at),
                  isVerified: seller.approval_status === 'approved'
                });
              }
              if (seller.valid_id_url) {
                documents.push({
                  id: `doc_id_${seller.id}`,
                  type: 'valid_id',
                  fileName: 'valid-id',
                  url: seller.valid_id_url,
                  uploadDate: new Date(seller.created_at),
                  isVerified: seller.approval_status === 'approved'
                });
              }
              if (seller.proof_of_address_url) {
                documents.push({
                  id: `doc_poa_${seller.id}`,
                  type: 'proof_of_address',
                  fileName: 'proof-of-address',
                  url: seller.proof_of_address_url,
                  uploadDate: new Date(seller.created_at),
                  isVerified: seller.approval_status === 'approved'
                });
              }
              if (seller.dti_registration_url) {
                documents.push({
                  id: `doc_dti_${seller.id}`,
                  type: 'dti_registration',
                  fileName: 'dti-registration',
                  url: seller.dti_registration_url,
                  uploadDate: new Date(seller.created_at),
                  isVerified: seller.approval_status === 'approved'
                });
              }
              if (seller.tax_id_url) {
                documents.push({
                  id: `doc_tax_${seller.id}`,
                  type: 'tax_id',
                  fileName: 'tax-id',
                  url: seller.tax_id_url,
                  uploadDate: new Date(seller.created_at),
                  isVerified: seller.approval_status === 'approved'
                });
              }

              return {
                id: seller.id,
                businessName: seller.business_name || seller.store_name || 'Unknown Business',
                storeName: seller.store_name || 'Unknown Store',
                storeDescription: seller.store_description || '',
                storeCategory: Array.isArray(seller.store_category) ? seller.store_category : ['General'],
                businessType: seller.business_type || 'sole_proprietor',
                businessRegistrationNumber: seller.business_registration_number || 'N/A',
                taxIdNumber: seller.tax_id_number || 'N/A',
                description: seller.store_description || '',
                logo: `https://ui-avatars.io/api/?name=${encodeURIComponent(seller.store_name || 'S')}&background=FF6A00&color=fff`,
                ownerName: seller.profiles?.full_name || seller.business_name || 'Unknown Owner',
                email: seller.profiles?.email || 'No email',
                phone: seller.profiles?.phone || 'No phone',
                businessAddress: seller.business_address || 'Not provided',
                city: seller.city || 'Not specified',
                province: seller.province || 'Not specified',
                postalCode: seller.postal_code || 'N/A',
                address: fullAddress || seller.business_address || 'Address not provided',
                bankName: seller.bank_name || 'Not provided',
                accountName: seller.account_name || 'Not provided',
                accountNumber: seller.account_number || 'Not provided',
                status: seller.approval_status as 'pending' | 'approved' | 'rejected' | 'suspended',
                documents: documents,
                metrics: {
                  totalProducts: 0,
                  totalOrders: 0,
                  totalRevenue: seller.total_sales || 0,
                  rating: parseFloat(seller.rating) || 0,
                  responseRate: 0,
                  fulfillmentRate: 0
                },
                joinDate: new Date(seller.join_date || seller.created_at),
                approvedAt: seller.approved_at ? new Date(seller.approved_at) : undefined,
                approvedBy: seller.approved_by || undefined,
                rejectedAt: seller.rejected_at ? new Date(seller.rejected_at) : undefined,
                rejectedBy: seller.rejected_by || undefined,
                rejectionReason: seller.rejection_reason || undefined,
                suspendedAt: seller.suspended_at ? new Date(seller.suspended_at) : undefined,
                suspendedBy: seller.suspended_by || undefined,
                suspensionReason: seller.suspension_reason || undefined
              };
            });

            const pendingSellers = sellers.filter(s => s.status === 'pending');

            console.log('Mapped sellers:', sellers);
            console.log('Pending sellers:', pendingSellers);

            set({
              sellers,
              pendingSellers,
              isLoading: false
            });
            return;
          } catch (error) {
            console.error('Error loading sellers from Supabase:', error);
            set({ error: 'Failed to load sellers', isLoading: false });
            return;
          }
        }

        // Fallback to demo sellers data if Supabase not configured
        const demoSellers: Seller[] = [
          {
            id: 'seller_1',
            businessName: 'TechHub Electronics Corp.',
            storeName: 'TechHub Philippines',
            storeDescription: 'Leading supplier of latest gadgets and technology products',
            storeCategory: ['Electronics', 'Gadgets', 'Computers'],
            businessType: 'corporation',
            businessRegistrationNumber: 'SEC-2024-001234',
            taxIdNumber: '123-456-789-000',
            description: 'Leading supplier of latest gadgets and technology products',
            ownerName: 'Maria Santos',
            email: 'maria@techhub.ph',
            phone: '+63 917 123 4567',
            businessAddress: '123 Ayala Avenue, Brgy. Poblacion',
            city: 'Makati City',
            province: 'Metro Manila',
            postalCode: '1200',
            address: '123 Ayala Avenue, Makati City, Metro Manila 1200',
            bankName: 'BDO',
            accountName: 'TechHub Electronics Corp.',
            accountNumber: '1234567890',
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
              },
              {
                id: 'doc_1a',
                type: 'valid_id',
                fileName: 'owners-id.pdf',
                url: '/documents/owners-id.pdf',
                uploadDate: new Date('2024-01-10'),
                isVerified: true
              },
              {
                id: 'doc_1b',
                type: 'proof_of_address',
                fileName: 'utility-bill.pdf',
                url: '/documents/utility-bill.pdf',
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
            businessName: 'Fashion Forward Trading',
            storeName: 'Fashion Forward Store',
            storeDescription: 'Trendy fashion items for modern Filipino consumers',
            storeCategory: ['Fashion', 'Accessories', 'Beauty'],
            businessType: 'sole_proprietor',
            businessRegistrationNumber: 'DTI-2024-567890',
            taxIdNumber: '987-654-321-000',
            description: 'Trendy fashion items for modern Filipino consumers',
            ownerName: 'Juan dela Cruz',
            email: 'juan@fashionforward.ph',
            phone: '+63 917 765 4321',
            businessAddress: '456 Commonwealth Avenue, Brgy. Holy Spirit',
            city: 'Quezon City',
            province: 'Metro Manila',
            postalCode: '1127',
            address: '456 Commonwealth Avenue, Quezon City, Metro Manila 1127',
            bankName: 'BPI',
            accountName: 'Juan dela Cruz',
            accountNumber: '9876543210',
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
              },
              {
                id: 'doc_4',
                type: 'valid_id',
                fileName: 'valid-id.pdf',
                url: '/documents/valid-id.pdf',
                uploadDate: new Date('2024-12-10'),
                isVerified: false
              },
              {
                id: 'doc_5',
                type: 'proof_of_address',
                fileName: 'proof-address.pdf',
                url: '/documents/proof-address.pdf',
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
          },
          {
            id: 'seller_3',
            businessName: 'FoodHub Manila',
            storeName: 'FoodHub Delights',
            storeDescription: 'Fresh groceries and food products delivered daily',
            storeCategory: ['Food & Beverages', 'Groceries'],
            businessType: 'partnership',
            businessRegistrationNumber: 'DTI-2024-112233',
            taxIdNumber: '111-222-333-000',
            description: 'Quality food products for Filipino families',
            ownerName: 'Ana Reyes',
            email: 'ana@foodhub.ph',
            phone: '+63 918 234 5678',
            businessAddress: '789 Marcos Highway, Brgy. Dela Paz',
            city: 'Pasig City',
            province: 'Metro Manila',
            postalCode: '1600',
            address: '789 Marcos Highway, Pasig City, Metro Manila 1600',
            bankName: 'Metrobank',
            accountName: 'FoodHub Manila Partnership',
            accountNumber: '5555666677',
            status: 'rejected',
            documents: [
              {
                id: 'doc_6',
                type: 'business_permit',
                fileName: 'food-permit.pdf',
                url: '/documents/food-permit.pdf',
                uploadDate: new Date('2024-12-01'),
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
            joinDate: new Date('2024-12-01'),
            rejectedAt: new Date('2024-12-05'),
            rejectedBy: 'admin_1',
            rejectionReason: 'Incomplete documentation - missing valid ID and proof of address'
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

        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase
              .from('sellers')
              .update({
                approval_status: 'approved',
                approved_at: new Date().toISOString(),
                approved_by: 'admin' // TODO: Get actual admin ID from auth
              })
              .eq('id', id);

            if (error) {
              console.error('Error approving seller:', error);
              set({ error: 'Failed to approve seller', isLoading: false });
              return;
            }

            // Update local state
            set(state => {
              const updatedSellers = state.sellers.map(seller =>
                seller.id === id
                  ? { ...seller, status: 'approved' as const, approvedAt: new Date(), approvedBy: 'admin' }
                  : seller
              );

              return {
                sellers: updatedSellers,
                pendingSellers: updatedSellers.filter(seller => seller.status === 'pending'),
                isLoading: false
              };
            });
          } catch (error) {
            console.error('Error approving seller:', error);
            set({ error: 'Failed to approve seller', isLoading: false });
          }
          return;
        }

        // Fallback to demo behavior
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

        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase
              .from('sellers')
              .update({
                approval_status: 'rejected',
                rejected_at: new Date().toISOString(),
                rejected_by: 'admin', // TODO: Get actual admin ID from auth
                rejection_reason: reason
              })
              .eq('id', id);

            if (error) {
              console.error('Error rejecting seller:', error);
              set({ error: 'Failed to reject seller', isLoading: false });
              return;
            }

            // Update local state
            set(state => {
              const updatedSellers = state.sellers.map(seller =>
                seller.id === id
                  ? {
                    ...seller,
                    status: 'rejected' as const,
                    rejectedAt: new Date(),
                    rejectedBy: 'admin',
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
          } catch (error) {
            console.error('Error rejecting seller:', error);
            set({ error: 'Failed to reject seller', isLoading: false });
          }
          return;
        }

        // Fallback to demo behavior
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
            isLoading: false,
            error: null
          };
        });
      },

      suspendSeller: async (id, reason) => {
        set({ isLoading: true });

        if (isSupabaseConfigured()) {
          try {
            const { error } = await supabase
              .from('sellers')
              .update({
                approval_status: 'suspended',
                suspended_at: new Date().toISOString(),
                suspended_by: 'admin', // TODO: Get actual admin ID from auth
                suspension_reason: reason
              })
              .eq('id', id);

            if (error) {
              console.error('Error suspending seller:', error);
              set({ error: 'Failed to suspend seller', isLoading: false });
              return;
            }

            // Update local state
            set(state => ({
              sellers: state.sellers.map(seller =>
                seller.id === id
                  ? {
                    ...seller,
                    status: 'suspended' as const,
                    suspendedAt: new Date(),
                    suspendedBy: 'admin',
                    suspensionReason: reason
                  }
                  : seller
              ),
              isLoading: false
            }));
          } catch (error) {
            console.error('Error suspending seller:', error);
            set({ error: 'Failed to suspend seller', isLoading: false });
          }
          return;
        }

        // Fallback to demo behavior
        await new Promise(resolve => setTimeout(resolve, 1000));

        set(state => ({
          sellers: state.sellers.map(seller =>
            seller.id === id
              ? {
                ...seller,
                status: 'suspended' as const,
                suspendedAt: new Date(),
                suspendedBy: 'admin_1',
                suspensionReason: reason
              }
              : seller
          ),
          isLoading: false
        }));
      },

      selectSeller: (seller) => set({ selectedSeller: seller }),

      addSeller: (seller) => {
        set(state => ({
          sellers: [...state.sellers, seller]
        }));
      },

      clearError: () => set({ error: null }),

      hasCompleteRequirements: (seller: Seller) => {
        // Check if seller has all required documents
        const requiredDocTypes = ['valid_id', 'proof_of_address', 'dti_registration', 'tax_id'];
        const sellerDocTypes = seller.documents.map(doc => doc.type);

        // Check if all required documents exist
        const hasAllDocs = requiredDocTypes.every(type => sellerDocTypes.includes(type as any));

        // Also check if business address exists
        const hasBusinessAddress = seller.businessAddress && seller.businessAddress !== 'Not provided';

        return hasAllDocs && hasBusinessAddress;
      }
    }),
    {
      name: 'admin-sellers-storage',
      partialize: (state) => ({
        // Don't persist sellers data - always fetch fresh from Supabase
        selectedSeller: state.selectedSeller,
      }),
    }
  )
);

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

// Voucher Types
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

// Voucher Management Store
interface VouchersState {
  vouchers: Voucher[];
  selectedVoucher: Voucher | null;
  isLoading: boolean;
  error: string | null;
  loadVouchers: () => Promise<void>;
  addVoucher: (voucher: Omit<Voucher, 'id' | 'usedCount' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateVoucher: (id: string, updates: Partial<Voucher>) => Promise<void>;
  deleteVoucher: (id: string) => Promise<void>;
  toggleVoucherStatus: (id: string) => Promise<void>;
  selectVoucher: (voucher: Voucher | null) => void;
  clearError: () => void;
}

export const useAdminVouchers = create<VouchersState>((set) => ({
  vouchers: [],
  selectedVoucher: null,
  isLoading: false,
  error: null,

  loadVouchers: async () => {
    set({ isLoading: true });

    const demoVouchers: Voucher[] = [
      {
        id: 'vouch_1',
        code: 'WELCOME20',
        title: 'Welcome Discount',
        description: '20% off for new customers',
        type: 'percentage',
        value: 20,
        minPurchase: 500,
        maxDiscount: 500,
        usageLimit: 1000,
        usedCount: 342,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-03-31'),
        isActive: true,
        applicableTo: 'all',
        createdAt: new Date('2024-11-15'),
        updatedAt: new Date('2024-12-15')
      },
      {
        id: 'vouch_2',
        code: 'FREESHIP',
        title: 'Free Shipping',
        description: 'Free shipping on orders over ₱1000',
        type: 'free_shipping',
        value: 0,
        minPurchase: 1000,
        usageLimit: 5000,
        usedCount: 1256,
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-01-31'),
        isActive: true,
        applicableTo: 'all',
        createdAt: new Date('2024-11-20'),
        updatedAt: new Date('2024-12-10')
      },
      {
        id: 'vouch_3',
        code: 'FLASH500',
        title: 'Flash Sale Discount',
        description: '₱500 off on purchases ₱3000 and above',
        type: 'fixed',
        value: 500,
        minPurchase: 3000,
        usageLimit: 500,
        usedCount: 478,
        startDate: new Date('2024-12-15'),
        endDate: new Date('2024-12-20'),
        isActive: true,
        applicableTo: 'category',
        targetIds: ['cat_1', 'cat_2'],
        createdAt: new Date('2024-12-10'),
        updatedAt: new Date('2024-12-14')
      },
      {
        id: 'vouch_4',
        code: 'XMAS2024',
        title: 'Christmas Special',
        description: '15% off all items',
        type: 'percentage',
        value: 15,
        minPurchase: 1000,
        maxDiscount: 1000,
        usageLimit: 10000,
        usedCount: 234,
        startDate: new Date('2024-12-20'),
        endDate: new Date('2024-12-26'),
        isActive: false,
        applicableTo: 'all',
        createdAt: new Date('2024-11-01'),
        updatedAt: new Date('2024-12-01')
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 800));
    set({ vouchers: demoVouchers, isLoading: false });
  },

  addVoucher: async (voucherData) => {
    set({ isLoading: true });

    const newVoucher: Voucher = {
      ...voucherData,
      id: `vouch_${Date.now()}`,
      usedCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await new Promise(resolve => setTimeout(resolve, 1000));

    set(state => ({
      vouchers: [...state.vouchers, newVoucher],
      isLoading: false
    }));
  },

  updateVoucher: async (id, updates) => {
    set({ isLoading: true });

    await new Promise(resolve => setTimeout(resolve, 800));

    set(state => ({
      vouchers: state.vouchers.map(voucher =>
        voucher.id === id
          ? { ...voucher, ...updates, updatedAt: new Date() }
          : voucher
      ),
      isLoading: false
    }));
  },

  deleteVoucher: async (id) => {
    set({ isLoading: true });

    await new Promise(resolve => setTimeout(resolve, 600));

    set(state => ({
      vouchers: state.vouchers.filter(voucher => voucher.id !== id),
      selectedVoucher: state.selectedVoucher?.id === id ? null : state.selectedVoucher,
      isLoading: false
    }));
  },

  toggleVoucherStatus: async (id) => {
    set({ isLoading: true });

    await new Promise(resolve => setTimeout(resolve, 500));

    set(state => ({
      vouchers: state.vouchers.map(voucher =>
        voucher.id === id
          ? { ...voucher, isActive: !voucher.isActive, updatedAt: new Date() }
          : voucher
      ),
      isLoading: false
    }));
  },

  selectVoucher: (voucher) => set({ selectedVoucher: voucher }),
  clearError: () => set({ error: null })
}));

// Review Types
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

// Review Moderation Store
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
        content: 'It works but nothing special. Expected better for the price.',
        images: [],
        isVerifiedPurchase: true,
        status: 'pending',
        helpfulCount: 0,
        reportCount: 0,
        createdAt: new Date('2024-12-15T14:45:00')
      }
    ];

    await new Promise(resolve => setTimeout(resolve, 1000));

    const pendingReviews = demoReviews.filter(review => review.status === 'pending');
    const flaggedReviews = demoReviews.filter(review => review.status === 'flagged');

    set({
      reviews: demoReviews,
      pendingReviews,
      flaggedReviews,
      isLoading: false
    });
  },

  approveReview: async (id) => {
    set({ isLoading: true });

    await new Promise(resolve => setTimeout(resolve, 800));

    set(state => {
      const updatedReviews = state.reviews.map(review =>
        review.id === id
          ? {
            ...review,
            status: 'approved' as const,
            moderatedAt: new Date(),
            moderatedBy: 'admin_1'
          }
          : review
      );

      return {
        reviews: updatedReviews,
        pendingReviews: updatedReviews.filter(review => review.status === 'pending'),
        flaggedReviews: updatedReviews.filter(review => review.status === 'flagged'),
        isLoading: false
      };
    });
  },

  rejectReview: async (id, reason) => {
    set({ isLoading: true });

    await new Promise(resolve => setTimeout(resolve, 800));

    set(state => {
      const updatedReviews = state.reviews.map(review =>
        review.id === id
          ? {
            ...review,
            status: 'rejected' as const,
            moderationNote: reason,
            moderatedAt: new Date(),
            moderatedBy: 'admin_1'
          }
          : review
      );

      return {
        reviews: updatedReviews,
        pendingReviews: updatedReviews.filter(review => review.status === 'pending'),
        flaggedReviews: updatedReviews.filter(review => review.status === 'flagged'),
        isLoading: false
      };
    });
  },

  flagReview: async (id, reason) => {
    set({ isLoading: true });

    await new Promise(resolve => setTimeout(resolve, 600));

    set(state => {
      const updatedReviews = state.reviews.map(review =>
        review.id === id
          ? {
            ...review,
            status: 'flagged' as const,
            moderationNote: reason
          }
          : review
      );

      return {
        reviews: updatedReviews,
        flaggedReviews: updatedReviews.filter(review => review.status === 'flagged'),
        isLoading: false
      };
    });
  },

  unflagReview: async (id) => {
    set({ isLoading: true });

    await new Promise(resolve => setTimeout(resolve, 500));

    set(state => {
      const updatedReviews = state.reviews.map(review =>
        review.id === id
          ? {
            ...review,
            status: 'approved' as const,
            moderationNote: undefined
          }
          : review
      );

      return {
        reviews: updatedReviews,
        flaggedReviews: updatedReviews.filter(review => review.status === 'flagged'),
        isLoading: false
      };
    });
  },

  deleteReview: async (id) => {
    set({ isLoading: true });

    await new Promise(resolve => setTimeout(resolve, 600));

    set(state => ({
      reviews: state.reviews.filter(review => review.id !== id),
      pendingReviews: state.pendingReviews.filter(review => review.id !== id),
      flaggedReviews: state.flaggedReviews.filter(review => review.id !== id),
      selectedReview: state.selectedReview?.id === id ? null : state.selectedReview,
      isLoading: false
    }));
  },

  selectReview: (review) => set({ selectedReview: review }),
  clearError: () => set({ error: null })
}));

// Product Management Store
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

    // Demo products
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

// Payout Management Store
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