import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { notificationService } from '@/services/notificationService';

export type SellerDocumentField =
  | 'business_permit_url'
  | 'valid_id_url'
  | 'proof_of_address_url'
  | 'dti_registration_url'
  | 'tax_id_url';

export interface PartialSellerRejectionInput {
  note?: string;
  items: {
    documentField: SellerDocumentField;
    reason?: string;
  }[];
}

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
  status: 'pending' | 'approved' | 'rejected' | 'suspended' | 'needs_resubmission';
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
  field: SellerDocumentField;
  type: string;
  fileName: string;
  url: string;
  uploadDate: Date;
  isVerified: boolean;
  isRejected?: boolean;
  rejectionReason?: string;
}

export interface SellerMetrics {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  rating: number;
  responseRate: number;
  fulfillmentRate: number;
}

interface SellerRejectionRecord {
  id: string;
  seller_id: string;
  description: string | null;
  rejection_type: 'full' | 'partial';
  created_at: string;
  created_by: string | null;
  items?: {
    document_field: SellerDocumentField;
    reason: string | null;
  }[];
}

const SELLER_DOCUMENT_CONFIG: {
  field: SellerDocumentField;
  type: string;
  fileName: string;
  label: string;
}[] = [
  {
    field: 'business_permit_url',
    type: 'business_permit',
    fileName: 'business-permit',
    label: 'Business Permit',
  },
  {
    field: 'valid_id_url',
    type: 'valid_id',
    fileName: 'valid-id',
    label: 'Valid ID',
  },
  {
    field: 'proof_of_address_url',
    type: 'proof_of_address',
    fileName: 'proof-of-address',
    label: 'Proof of Address',
  },
  {
    field: 'dti_registration_url',
    type: 'dti_registration',
    fileName: 'dti-registration',
    label: 'DTI/SEC Registration',
  },
  {
    field: 'tax_id_url',
    type: 'tax_id',
    fileName: 'tax-id',
    label: 'BIR Tax ID (TIN)',
  },
];

const DOCUMENT_FIELD_LABELS: Record<SellerDocumentField, string> = {
  business_permit_url: 'Business Permit',
  valid_id_url: 'Valid ID',
  proof_of_address_url: 'Proof of Address',
  dti_registration_url: 'DTI/SEC Registration',
  tax_id_url: 'BIR Tax ID (TIN)',
};

const toUiSellerStatus = (
  status: string | null | undefined,
  latestRejectionType?: 'full' | 'partial',
): Seller['status'] => {
  if (status === 'verified' || status === 'approved') {
    return 'approved';
  }

  if (status === 'needs_resubmission') {
    return 'needs_resubmission';
  }

  if (status === 'rejected' && latestRejectionType === 'partial') {
    return 'needs_resubmission';
  }

  if (status === 'rejected') {
    return 'rejected';
  }

  if (status === 'suspended') {
    return 'suspended';
  }

  return 'pending';
};

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
  bazcoins: number;
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

            // Verify user is an admin by checking the admins table
            const { data: adminRecord, error: adminError } = await supabase
              .from('admins')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            if (adminError || !adminRecord) {
              console.error('Admin record not found:', adminError);
              await supabase.auth.signOut();
              set({
                error: 'Access denied. Admin account required.',
                isLoading: false
              });
              return false;
            }

            // Create admin user object
            const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Admin User';
            const adminUser: AdminUser = {
              id: authData.user.id,
              email: profile.email || email,
              name: fullName,
              role: 'admin',
              avatar: `https://ui-avatars.io/api/?name=${encodeURIComponent(fullName)}&background=FF6A00&color=fff`,
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
  rejectSeller: (id: string, reason?: string) => Promise<void>;
  partiallyRejectSeller: (id: string, payload: PartialSellerRejectionInput) => Promise<void>;
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
            let sellersData: any[] | null = null;
            let sellersError: any = null;

            const primaryResult = await supabase
              .from('sellers')
              .select(`
                *,
                profiles(*),
                business_profile:seller_business_profiles(*),
                payout_account:seller_payout_accounts(*),
                verification_documents:seller_verification_documents(*)
              `)
              .order('created_at', { ascending: false });

            sellersData = primaryResult.data as any[] | null;
            sellersError = primaryResult.error;

            if (sellersError) {
              const fallbackResult = await supabase
                .from('sellers')
                .select(`
                  *,
                  profiles(*)
                `)
                .order('created_at', { ascending: false });

              sellersData = fallbackResult.data as any[] | null;
              sellersError = fallbackResult.error;
            }

            if (sellersError) {
              console.error('Error loading sellers:', sellersError);
              set({ error: 'Failed to load sellers', isLoading: false });
              return;
            }

            const sellerIds = (sellersData || []).map((seller) => seller.id).filter(Boolean);
            const latestRejectionsBySeller = new Map<string, SellerRejectionRecord>();

            if (sellerIds.length > 0) {
              const { data: rejectionRows, error: rejectionError } = await supabase
                .from('seller_rejections')
                .select(`
                  id,
                  seller_id,
                  description,
                  rejection_type,
                  created_at,
                  created_by,
                  items:seller_rejection_items(document_field, reason)
                `)
                .in('seller_id', sellerIds)
                .order('created_at', { ascending: false });

              if (rejectionError) {
                console.warn('[AdminSellers] Could not load rejection details:', rejectionError.message);
              } else {
                for (const row of (rejectionRows || []) as SellerRejectionRecord[]) {
                  if (!row?.seller_id || latestRejectionsBySeller.has(row.seller_id)) {
                    continue;
                  }
                  latestRejectionsBySeller.set(row.seller_id, row);
                }
              }
            }

            const sellers: Seller[] = (sellersData || []).map((seller: any) => {
              const profileRaw = seller.profiles || seller.profile || null;
              const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
              const businessProfile = seller.business_profile || seller.seller_business_profiles || {};
              const payoutAccount = seller.payout_account || seller.seller_payout_accounts || {};
              const verificationDocuments = seller.verification_documents || seller.seller_verification_documents || {};
              const latestRejection = latestRejectionsBySeller.get(seller.id);
              const status = toUiSellerStatus(seller.approval_status, latestRejection?.rejection_type);

              const rejectionItemsMap = new Map<SellerDocumentField, string | undefined>();
              if (latestRejection?.rejection_type === 'partial' && Array.isArray(latestRejection.items)) {
                for (const item of latestRejection.items) {
                  if (!item?.document_field) continue;
                  rejectionItemsMap.set(item.document_field, item.reason || undefined);
                }
              }

              const businessAddress =
                businessProfile.address_line_1 ||
                seller.business_address ||
                'Not provided';
              const city = businessProfile.city || seller.city || 'Not specified';
              const province = businessProfile.province || seller.province || 'Not specified';
              const postalCode = businessProfile.postal_code || seller.postal_code || 'N/A';

              const addressParts = [businessAddress, city, province, postalCode].filter(Boolean);
              const fullAddress = addressParts.join(', ');

              const profileName =
                profile?.full_name ||
                [profile?.first_name, profile?.last_name].filter(Boolean).join(' ').trim();

              const parsedStoreCategory = Array.isArray(seller.store_category)
                ? seller.store_category
                : typeof seller.store_category === 'string' && seller.store_category.trim().length > 0
                  ? seller.store_category
                    .split(',')
                    .map((entry: string) => entry.trim())
                    .filter(Boolean)
                  : ['General'];

              const documents: SellerDocument[] = SELLER_DOCUMENT_CONFIG.reduce((acc, config) => {
                const url = verificationDocuments?.[config.field] || seller?.[config.field];
                if (!url) return acc;

                const rejectionReason = rejectionItemsMap.get(config.field);
                acc.push({
                  id: `doc_${config.field}_${seller.id}`,
                  field: config.field,
                  type: config.type,
                  fileName: config.fileName,
                  url,
                  uploadDate: new Date(verificationDocuments?.created_at || seller.created_at || Date.now()),
                  isVerified: status === 'approved',
                  isRejected: Boolean(rejectionReason),
                  rejectionReason,
                });

                return acc;
              }, [] as SellerDocument[]);

              return {
                id: seller.id,
                businessName:
                  seller.business_name ||
                  businessProfile.business_name ||
                  seller.store_name ||
                  'Unknown Business',
                storeName: seller.store_name || 'Unknown Store',
                storeDescription: seller.store_description || '',
                storeCategory: parsedStoreCategory,
                businessType: seller.business_type || businessProfile.business_type || 'sole_proprietor',
                businessRegistrationNumber:
                  seller.business_registration_number ||
                  businessProfile.business_registration_number ||
                  'N/A',
                taxIdNumber:
                  seller.tax_id_number ||
                  businessProfile.tax_id_number ||
                  'N/A',
                description: seller.store_description || '',
                logo:
                  seller.avatar_url ||
                  `https://ui-avatars.io/api/?name=${encodeURIComponent(seller.store_name || 'S')}&background=FF6A00&color=fff`,
                ownerName: seller.owner_name || profileName || seller.business_name || seller.store_name || 'Unknown Owner',
                email: profile?.email || seller.email || 'No email',
                phone: profile?.phone || seller.phone || 'No phone',
                businessAddress,
                city,
                province,
                postalCode,
                address: fullAddress || 'Address not provided',
                bankName: seller.bank_name || payoutAccount.bank_name || 'Not provided',
                accountName: seller.account_name || payoutAccount.account_name || 'Not provided',
                accountNumber: seller.account_number || payoutAccount.account_number || 'Not provided',
                status,
                documents,
                metrics: {
                  totalProducts: 0,
                  totalOrders: 0,
                  totalRevenue: Number(seller.total_sales) || 0,
                  rating: Number.parseFloat(seller.rating) || 0,
                  responseRate: 0,
                  fulfillmentRate: 0,
                },
                joinDate: new Date(seller.join_date || seller.created_at || Date.now()),
                approvedAt: seller.approved_at ? new Date(seller.approved_at) : seller.verified_at ? new Date(seller.verified_at) : undefined,
                approvedBy: seller.approved_by || undefined,
                rejectedAt: seller.rejected_at ? new Date(seller.rejected_at) : latestRejection?.created_at ? new Date(latestRejection.created_at) : undefined,
                rejectedBy: seller.rejected_by || latestRejection?.created_by || undefined,
                rejectionReason:
                  seller.rejection_reason ||
                  latestRejection?.description ||
                  (latestRejection?.rejection_type === 'partial'
                    ? 'Some submitted documents require updates before approval.'
                    : undefined),
                suspendedAt: seller.suspended_at ? new Date(seller.suspended_at) : undefined,
                suspendedBy: seller.suspended_by || undefined,
                suspensionReason: seller.suspension_reason || undefined,
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
                field: 'business_permit_url',
                type: 'business_permit',
                fileName: 'business-permit.pdf',
                url: '/documents/business-permit.pdf',
                uploadDate: new Date('2024-01-10'),
                isVerified: true
              },
              {
                id: 'doc_1a',
                field: 'valid_id_url',
                type: 'valid_id',
                fileName: 'owners-id.pdf',
                url: '/documents/owners-id.pdf',
                uploadDate: new Date('2024-01-10'),
                isVerified: true
              },
              {
                id: 'doc_1b',
                field: 'proof_of_address_url',
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
                field: 'business_permit_url',
                type: 'business_permit',
                fileName: 'permit-fashion.pdf',
                url: '/documents/permit-fashion.pdf',
                uploadDate: new Date('2024-12-10'),
                isVerified: false
              },
              {
                id: 'doc_3',
                field: 'dti_registration_url',
                type: 'dti_registration',
                fileName: 'dti-registration.pdf',
                url: '/documents/dti-registration.pdf',
                uploadDate: new Date('2024-12-10'),
                isVerified: false
              },
              {
                id: 'doc_4',
                field: 'valid_id_url',
                type: 'valid_id',
                fileName: 'valid-id.pdf',
                url: '/documents/valid-id.pdf',
                uploadDate: new Date('2024-12-10'),
                isVerified: false
              },
              {
                id: 'doc_5',
                field: 'proof_of_address_url',
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
                field: 'business_permit_url',
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
        set({ isLoading: true, error: null });
        const now = new Date();
        const nowIso = now.toISOString();
        const adminId = useAdminAuth.getState().user?.id || 'admin';

        if (isSupabaseConfigured()) {
          try {
            const statusUpdateCandidates = [
              {
                approval_status: 'verified',
                updated_at: nowIso,
                verified_at: nowIso,
              },
              {
                approval_status: 'approved',
                updated_at: nowIso,
              },
            ];

            let statusUpdateError: any = null;
            for (const statusUpdate of statusUpdateCandidates) {
              const { error } = await supabase
                .from('sellers')
                .update(statusUpdate)
                .eq('id', id);

              if (!error) {
                statusUpdateError = null;
                break;
              }

              statusUpdateError = error;
            }

            if (statusUpdateError) {
              throw statusUpdateError;
            }

            await notificationService
              .notifySellerVerificationApproved({
                sellerId: id,
              })
              .catch((notificationError) => {
                console.warn('[AdminSellers] Failed to send approval notification:', notificationError);
              });

            // Update local state
            set(state => {
              const updatedSellers = state.sellers.map(seller =>
                seller.id === id
                  ? {
                    ...seller,
                    status: 'approved' as const,
                    approvedAt: now,
                    approvedBy: adminId,
                    rejectedAt: undefined,
                    rejectedBy: undefined,
                    rejectionReason: undefined,
                    documents: seller.documents.map((doc) => ({
                      ...doc,
                      isVerified: true,
                      isRejected: false,
                      rejectionReason: undefined,
                    })),
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
              ? {
                ...seller,
                status: 'approved' as const,
                approvedAt: now,
                approvedBy: adminId,
                rejectedAt: undefined,
                rejectedBy: undefined,
                rejectionReason: undefined,
                documents: seller.documents.map((doc) => ({
                  ...doc,
                  isVerified: true,
                  isRejected: false,
                  rejectionReason: undefined,
                })),
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

      rejectSeller: async (id, reason) => {
        set({ isLoading: true, error: null });
        const now = new Date();
        const nowIso = now.toISOString();
        const adminId = useAdminAuth.getState().user?.id || 'admin';
        const normalizedReason = reason?.trim();
        const rejectionDescription = normalizedReason || 'Your seller verification submission was rejected.';

        if (isSupabaseConfigured()) {
          try {
            const { error: statusError } = await supabase
              .from('sellers')
              .update({
                approval_status: 'rejected',
                updated_at: nowIso,
              })
              .eq('id', id);

            if (statusError) {
              throw statusError;
            }

            const { error: rejectionInsertError } = await supabase
              .from('seller_rejections')
              .insert({
                seller_id: id,
                description: rejectionDescription,
                rejection_type: 'full',
                created_by: adminId,
              });

            if (rejectionInsertError) {
              console.warn('[AdminSellers] Could not record full rejection event:', rejectionInsertError.message);
            }

            await notificationService
              .notifySellerVerificationRejected({
                sellerId: id,
                reason: rejectionDescription,
              })
              .catch((notificationError) => {
                console.warn('[AdminSellers] Failed to send rejection notification:', notificationError);
              });

            // Update local state
            set(state => {
              const updatedSellers = state.sellers.map(seller =>
                seller.id === id
                  ? {
                    ...seller,
                    status: 'rejected' as const,
                    rejectedAt: now,
                    rejectedBy: adminId,
                    rejectionReason: rejectionDescription,
                    documents: seller.documents.map((doc) => ({
                      ...doc,
                      isVerified: false,
                    })),
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
                rejectedAt: now,
                rejectedBy: adminId,
                rejectionReason: rejectionDescription,
                documents: seller.documents.map((doc) => ({
                  ...doc,
                  isVerified: false,
                })),
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

      partiallyRejectSeller: async (id, payload) => {
        set({ isLoading: true, error: null });
        const now = new Date();
        const nowIso = now.toISOString();
        const adminId = useAdminAuth.getState().user?.id || 'admin';
        const selectedItems = payload.items.filter((item) => Boolean(item.documentField));

        if (selectedItems.length === 0) {
          set({
            isLoading: false,
            error: 'Select at least one document for partial rejection.',
          });
          return;
        }

        const normalizedNote = payload.note?.trim();
        const rejectionDescription = normalizedNote || 'Some submitted documents need to be updated before approval.';
        const selectedFields = new Set(selectedItems.map((item) => item.documentField));
        const itemReasons = new Map<SellerDocumentField, string | undefined>();
        selectedItems.forEach((item) => {
          itemReasons.set(item.documentField, item.reason?.trim() || undefined);
        });

        if (isSupabaseConfigured()) {
          try {
            let rejectionId: string | null = null;

            const { data: rejectionRecord, error: rejectionInsertError } = await supabase
              .from('seller_rejections')
              .insert({
                seller_id: id,
                description: rejectionDescription,
                rejection_type: 'partial',
                created_by: adminId,
              })
              .select('id')
              .single();

            if (rejectionInsertError) {
              console.warn('[AdminSellers] Could not create partial rejection record:', rejectionInsertError.message);
            } else {
              rejectionId = rejectionRecord?.id || null;
            }

            if (rejectionId) {
              const { error: rejectionItemsError } = await supabase
                .from('seller_rejection_items')
                .insert(
                  selectedItems.map((item) => ({
                    rejection_id: rejectionId,
                    document_field: item.documentField,
                    reason: item.reason?.trim() || null,
                  })),
                );

              if (rejectionItemsError) {
                console.warn('[AdminSellers] Could not insert partial rejection items:', rejectionItemsError.message);
              }
            }

            const statusCandidates = [
              {
                approval_status: 'needs_resubmission',
                updated_at: nowIso,
              },
              {
                approval_status: 'rejected',
                updated_at: nowIso,
              },
            ];

            let appliedDbStatus: 'needs_resubmission' | 'rejected' = 'needs_resubmission';
            let statusUpdateError: any = null;

            for (const statusCandidate of statusCandidates) {
              const { error } = await supabase
                .from('sellers')
                .update(statusCandidate)
                .eq('id', id);

              if (!error) {
                appliedDbStatus = statusCandidate.approval_status as 'needs_resubmission' | 'rejected';
                statusUpdateError = null;
                break;
              }

              statusUpdateError = error;
            }

            if (statusUpdateError) {
              throw statusUpdateError;
            }

            await notificationService
              .notifySellerVerificationPartiallyRejected({
                sellerId: id,
                rejectedDocuments: selectedItems.map((item) => DOCUMENT_FIELD_LABELS[item.documentField]),
                note: normalizedNote,
              })
              .catch((notificationError) => {
                console.warn('[AdminSellers] Failed to send partial rejection notification:', notificationError);
              });

            const nextUiStatus = toUiSellerStatus(appliedDbStatus, 'partial');

            set(state => {
              const updatedSellers = state.sellers.map((seller) => {
                if (seller.id !== id) return seller;

                return {
                  ...seller,
                  status: nextUiStatus,
                  rejectedAt: now,
                  rejectedBy: adminId,
                  rejectionReason: rejectionDescription,
                  documents: seller.documents.map((doc) => {
                    const reason = itemReasons.get(doc.field);
                    const isRejected = selectedFields.has(doc.field);

                    return {
                      ...doc,
                      isVerified: false,
                      isRejected,
                      rejectionReason: isRejected ? reason || rejectionDescription : undefined,
                    };
                  }),
                };
              });

              return {
                sellers: updatedSellers,
                pendingSellers: updatedSellers.filter((seller) => seller.status === 'pending'),
                isLoading: false,
                error: null,
              };
            });
          } catch (error) {
            console.error('Error partially rejecting seller:', error);
            set({ error: 'Failed to partially reject seller', isLoading: false });
          }
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        set(state => {
          const updatedSellers = state.sellers.map((seller) => {
            if (seller.id !== id) return seller;

            return {
              ...seller,
              status: 'needs_resubmission' as const,
              rejectedAt: now,
              rejectedBy: adminId,
              rejectionReason: rejectionDescription,
              documents: seller.documents.map((doc) => {
                const reason = itemReasons.get(doc.field);
                const isRejected = selectedFields.has(doc.field);

                return {
                  ...doc,
                  isVerified: false,
                  isRejected,
                  rejectionReason: isRejected ? reason || rejectionDescription : undefined,
                };
              }),
            };
          });

          return {
            sellers: updatedSellers,
            pendingSellers: updatedSellers.filter((seller) => seller.status === 'pending'),
            isLoading: false,
            error: null,
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
        const requiredDocTypes = ['business_permit', 'valid_id', 'proof_of_address', 'dti_registration', 'tax_id'];
        const sellerDocTypes = seller.documents.map(doc => doc.type);

        // Check if all required documents exist
        const hasAllDocs = requiredDocTypes.every(type => sellerDocTypes.includes(type));

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
          bazcoins: 1250
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
          bazcoins: 567
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
  /** Max uses per customer (claim_limit). 1 = once per person, null = unlimited */
  claimLimit?: number | null;
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

export const useAdminVouchers = create<VouchersState>((set, get) => ({
  vouchers: [],
  selectedVoucher: null,
  isLoading: false,
  error: null,

  loadVouchers: async () => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('../services/voucherService');
      const dbVouchers = await voucherService.getAllVouchers();

      // Map database vouchers to admin store format
      const mappedVouchers: Voucher[] = dbVouchers.map(v => ({
        id: v.id,
        code: v.code,
        title: v.title,
        description: v.description || '',
        type: v.voucher_type === 'shipping' ? 'free_shipping' : v.voucher_type as 'percentage' | 'fixed',
        value: v.value,
        minPurchase: v.min_order_value,
        maxDiscount: v.max_discount || undefined,
        usageLimit: v.usage_limit || 0,
        claimLimit: v.claim_limit ?? null,
        usedCount: 0,
        startDate: new Date(v.claimable_from),
        endDate: new Date(v.claimable_until),
        isActive: v.is_active,
        applicableTo: v.seller_id ? 'seller' : 'all',
        targetIds: v.seller_id ? [v.seller_id] : undefined,
        createdAt: new Date(v.created_at),
        updatedAt: new Date(v.updated_at)
      }));

      set({ vouchers: mappedVouchers, isLoading: false });
    } catch (error) {
      console.error('Error loading vouchers:', error);
      set({ error: 'Failed to load vouchers', isLoading: false, vouchers: [] });
    }
  },

  addVoucher: async (voucherData) => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('../services/voucherService');

      // Map admin store format to database format
      const dbVoucherData = {
        code: voucherData.code.toUpperCase(),
        title: voucherData.title,
        description: voucherData.description,
        voucher_type: (voucherData.type === 'free_shipping' ? 'shipping' : voucherData.type) as 'percentage' | 'fixed' | 'shipping',
        value: voucherData.value,
        min_order_value: voucherData.minPurchase,
        max_discount: voucherData.maxDiscount || null,
        seller_id: voucherData.applicableTo === 'seller' && voucherData.targetIds?.[0] ? voucherData.targetIds[0] : null,
        claimable_from: voucherData.startDate.toISOString(),
        claimable_until: voucherData.endDate.toISOString(),
        usage_limit: voucherData.usageLimit || null,
        claim_limit: voucherData.claimLimit ?? null,
        duration: null,
        is_active: voucherData.isActive
      };

      const newDbVoucher = await voucherService.createVoucher(dbVoucherData);

      // Map back to admin store format
      const newVoucher: Voucher = {
        id: newDbVoucher.id,
        code: newDbVoucher.code,
        title: newDbVoucher.title,
        description: newDbVoucher.description || '',
        type: newDbVoucher.voucher_type === 'shipping' ? 'free_shipping' : newDbVoucher.voucher_type as 'percentage' | 'fixed',
        value: newDbVoucher.value,
        minPurchase: newDbVoucher.min_order_value,
        maxDiscount: newDbVoucher.max_discount || undefined,
        usageLimit: newDbVoucher.usage_limit || 0,
        claimLimit: newDbVoucher.claim_limit ?? null,
        usedCount: 0,
        startDate: new Date(newDbVoucher.claimable_from),
        endDate: new Date(newDbVoucher.claimable_until),
        isActive: newDbVoucher.is_active,
        applicableTo: newDbVoucher.seller_id ? 'seller' : 'all',
        targetIds: newDbVoucher.seller_id ? [newDbVoucher.seller_id] : undefined,
        createdAt: new Date(newDbVoucher.created_at),
        updatedAt: new Date(newDbVoucher.updated_at)
      };

      set(state => ({
        vouchers: [...state.vouchers, newVoucher],
        isLoading: false
      }));
    } catch (error) {
      console.error('Error adding voucher:', error);
      set({ error: 'Failed to create voucher', isLoading: false });
    }
  },

  updateVoucher: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('../services/voucherService');

      // Map admin store updates to database format
      const dbUpdates: any = {};
      if (updates.code) dbUpdates.code = updates.code.toUpperCase();
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.type) dbUpdates.voucher_type = updates.type === 'free_shipping' ? 'shipping' : updates.type;
      if (updates.value !== undefined) dbUpdates.value = updates.value;
      if (updates.minPurchase !== undefined) dbUpdates.min_order_value = updates.minPurchase;
      if (updates.maxDiscount !== undefined) dbUpdates.max_discount = updates.maxDiscount || null;
      if (updates.usageLimit !== undefined) dbUpdates.usage_limit = updates.usageLimit || null;
      if (updates.claimLimit !== undefined) dbUpdates.claim_limit = updates.claimLimit ?? null;
      if (updates.startDate) dbUpdates.claimable_from = updates.startDate.toISOString();
      if (updates.endDate) dbUpdates.claimable_until = updates.endDate.toISOString();
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const updatedDbVoucher = await voucherService.updateVoucher(id, dbUpdates);

      set(state => ({
        vouchers: state.vouchers.map(voucher =>
          voucher.id === id
            ? {
              ...voucher,
              code: updatedDbVoucher.code,
              title: updatedDbVoucher.title,
              description: updatedDbVoucher.description || '',
              type: updatedDbVoucher.voucher_type === 'shipping' ? 'free_shipping' : updatedDbVoucher.voucher_type as 'percentage' | 'fixed',
              value: updatedDbVoucher.value,
              minPurchase: updatedDbVoucher.min_order_value,
              maxDiscount: updatedDbVoucher.max_discount || undefined,
              usageLimit: updatedDbVoucher.usage_limit || 0,
              claimLimit: updatedDbVoucher.claim_limit ?? null,
              startDate: new Date(updatedDbVoucher.claimable_from),
              endDate: new Date(updatedDbVoucher.claimable_until),
              isActive: updatedDbVoucher.is_active,
              updatedAt: new Date(updatedDbVoucher.updated_at)
            }
            : voucher
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error updating voucher:', error);
      set({ error: 'Failed to update voucher', isLoading: false });
    }
  },

  deleteVoucher: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('../services/voucherService');
      await voucherService.deleteVoucher(id);

      set(state => ({
        vouchers: state.vouchers.filter(voucher => voucher.id !== id),
        selectedVoucher: state.selectedVoucher?.id === id ? null : state.selectedVoucher,
        isLoading: false
      }));
    } catch (error) {
      console.error('Error deleting voucher:', error);
      set({ error: 'Failed to delete voucher', isLoading: false });
    }
  },

  toggleVoucherStatus: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const { voucherService } = await import('../services/voucherService');
      const currentVoucher = get().vouchers.find(v => v.id === id);

      if (!currentVoucher) {
        throw new Error('Voucher not found');
      }

      const updatedDbVoucher = await voucherService.updateVoucher(id, {
        is_active: !currentVoucher.isActive
      });

      set(state => ({
        vouchers: state.vouchers.map(voucher =>
          voucher.id === id
            ? { ...voucher, isActive: updatedDbVoucher.is_active, updatedAt: new Date(updatedDbVoucher.updated_at) }
            : voucher
        ),
        isLoading: false
      }));
    } catch (error) {
      console.error('Error toggling voucher status:', error);
      set({ error: 'Failed to toggle voucher status', isLoading: false });
    }
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
