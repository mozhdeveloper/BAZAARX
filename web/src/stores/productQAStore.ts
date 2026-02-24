import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { qaService, type ProductQAStatus } from '@/services/qaService';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useProductStore } from './sellerStore';

export type { ProductQAStatus };

// Variant interface matching the database
export interface QAProductVariant {
  id: string;
  variant_name: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price: number;
  stock: number;
  thumbnail_url?: string | null;
}

export interface QAProduct {
  id: string;
  assessmentId?: string; // Unique assessment UUID (product_assessments.id)
  name: string;
  description?: string;
  vendor: string;
  sellerId?: string; // Added seller ID for proper filtering
  price: number;
  originalPrice?: number;
  category: string;
  status: ProductQAStatus;
  logistics: string | null;
  image: string;
  images?: string[];
  variants?: QAProductVariant[]; // Product variants
  variantLabel1?: string | null; // Label for first variant option (e.g., "Size")
  variantLabel2?: string | null; // Label for second variant option (e.g., "Color")
  rejectionReason?: string;
  rejectionStage?: 'digital' | 'physical'; // Track which stage rejected
  submittedAt?: string;
  approvedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  revisionRequestedAt?: string;
}

interface ProductQAStore {
  products: QAProduct[];
  isLoading: boolean;
  _lastSellerId?: string; // Track the last seller ID used for reload after actions
  
  // Actions
  loadProducts: (sellerId?: string) => Promise<void>;
  approveForSampleSubmission: (productId: string) => Promise<void>;
  submitSample: (productId: string, logisticsMethod: string) => Promise<void>;
  passQualityCheck: (productId: string) => Promise<void>;
  rejectProduct: (productId: string, reason: string, stage: 'digital' | 'physical') => Promise<void>;
  requestRevision: (productId: string, reason: string, stage: 'digital' | 'physical') => Promise<void>;
  getProductById: (productId: string) => QAProduct | undefined;
  getProductsByStatus: (status: ProductQAStatus) => QAProduct[];
  getProductsBySeller: (sellerId: string) => QAProduct[];
  resetToInitialState: () => void;
  addProductToQA: (productData: Omit<QAProduct, 'status' | 'logistics' | 'submittedAt'>) => Promise<void>;
}

const initialProducts: QAProduct[] = [
  {
    id: "PROD-001",
    name: "Vitamin C Serum",
    vendor: "Glow Cosmetics",
    price: 1500,
    category: "Beauty",
    status: "PENDING_DIGITAL_REVIEW",
    logistics: null,
    image: "https://placehold.co/100?text=Serum",
    submittedAt: "2024-12-20T10:30:00Z"
  },
  {
    id: "PROD-002",
    name: "Wireless Earbuds",
    vendor: "Tech Haven",
    price: 3500,
    category: "Electronics",
    status: "WAITING_FOR_SAMPLE",
    logistics: null,
    image: "https://placehold.co/100?text=Buds",
    submittedAt: "2024-12-19T14:20:00Z",
    approvedAt: "2024-12-20T09:15:00Z"
  },
  {
    id: "PROD-003",
    name: "Chili Garlic Oil",
    vendor: "Mama's Kitchen",
    price: 250,
    category: "Food",
    status: "IN_QUALITY_REVIEW",
    logistics: "Drop-off by Courier",
    image: "https://placehold.co/100?text=Chili",
    submittedAt: "2024-12-18T11:00:00Z",
    approvedAt: "2024-12-19T10:30:00Z"
  },
  {
    id: "PROD-004",
    name: "Heavy Duty Shelf",
    vendor: "BuildRight",
    price: 4500,
    category: "Furniture",
    status: "ACTIVE_VERIFIED",
    logistics: "Onsite Visit",
    image: "https://placehold.co/100?text=Shelf",
    submittedAt: "2024-12-15T08:00:00Z",
    approvedAt: "2024-12-16T09:00:00Z",
    verifiedAt: "2024-12-18T15:45:00Z"
  }
];

export const useProductQAStore = create<ProductQAStore>()(
  persist(
    (set, get) => ({
      products: initialProducts,
      isLoading: false,
      _lastSellerId: undefined,

      // Load products from database (for admin) or by seller (for seller)
      loadProducts: async (sellerId?: string) => {
        if (!isSupabaseConfigured()) {
          console.log('Using mock QA data (Supabase not configured)');
          return;
        }

        // Remember sellerId for reload after actions
        if (sellerId !== undefined) {
          set({ _lastSellerId: sellerId });
        }
        const effectiveSellerId = sellerId ?? get()._lastSellerId;

        set({ isLoading: true });
        try {
          const qaEntries = effectiveSellerId 
            ? await qaService.getQAEntriesBySeller(effectiveSellerId)
            : await qaService.getAllQAEntries();

          const qaProducts: QAProduct[] = qaEntries.map((entry: any) => {
            // Extract category name from nested object or use string directly
            const categoryValue = entry.product?.category;
            const categoryName = typeof categoryValue === 'object' && categoryValue?.name 
              ? categoryValue.name 
              : (typeof categoryValue === 'string' ? categoryValue : 'Uncategorized');
            
            // Extract image URL from nested image objects
            const imageList = entry.product?.images || [];
            const primaryImage = imageList.find((img: any) => img.is_primary) || imageList[0];
            const imageUrl = primaryImage?.image_url || primaryImage || 'https://placehold.co/100?text=Product';
            const imageUrls = imageList.map((img: any) => img.image_url || img).filter(Boolean);

            // Extract variants
            const variants = (entry.product?.variants || []).map((v: any) => ({
              id: v.id,
              variant_name: v.variant_name,
              sku: v.sku,
              size: v.size,
              color: v.color,
              price: v.price,
              stock: v.stock,
              thumbnail_url: v.thumbnail_url,
            }));

            return {
              id: entry.product_id,
              assessmentId: entry.id, // Keep the unique assessment ID for React keys
              name: entry.product?.name || 'Unknown Product',
              description: entry.product?.description,
              vendor: entry.vendor,
              sellerId: entry.product?.seller_id,
              price: entry.product?.price || 0,
              category: categoryName,
              status: entry.status,
              logistics: entry.logistics,
              image: imageUrl,
              images: imageUrls.length > 0 ? imageUrls : ['https://placehold.co/100?text=Product'],
              variants: variants.length > 0 ? variants : undefined,
              variantLabel1: entry.product?.variant_label_1,
              variantLabel2: entry.product?.variant_label_2,
              rejectionReason: entry.rejection_reason,
              rejectionStage: entry.rejection_stage,
              submittedAt: entry.submitted_at,
              approvedAt: entry.approved_at,
              verifiedAt: entry.verified_at,
              rejectedAt: entry.rejected_at,
              revisionRequestedAt: entry.revision_requested_at,
            };
          });

          // Deduplicate by product_id (keep latest assessment per product to avoid React duplicate key warnings)
          const seen = new Set<string>();
          const deduped = qaProducts.filter(p => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });

          set({ products: deduped, isLoading: false });
        } catch (error) {
          console.error('Error loading QA products:', error);
          set({ isLoading: false });
        }
      },

      approveForSampleSubmission: async (productId: string) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status !== 'PENDING_DIGITAL_REVIEW') {
            throw new Error('Product must be in PENDING_DIGITAL_REVIEW status');
          }

          // Update database if configured
          if (isSupabaseConfigured()) {
            await qaService.approveForSampleSubmission(productId);
            // Reload to get fresh data
            await get().loadProducts();
          } else {
            // Fallback to local state
            set((state) => ({
              products: state.products.map((product) =>
                product.id === productId
                  ? { 
                      ...product, 
                      status: 'WAITING_FOR_SAMPLE' as ProductQAStatus,
                      approvedAt: new Date().toISOString()
                    }
                  : product
              ),
            }));
          }

          // Sync with seller store
          syncToSellerStore(productId, 'pending');
        } catch (error) {
          console.error('Error approving product for sample submission:', error);
          throw error;
        }
      },

      submitSample: async (productId: string, logisticsMethod: string) => {
        try {
          if (!logisticsMethod || logisticsMethod.trim() === '') {
            throw new Error('Logistics method is required');
          }
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status !== 'WAITING_FOR_SAMPLE') {
            throw new Error('Product must be in WAITING_FOR_SAMPLE status');
          }

          // Update database if configured
          if (isSupabaseConfigured()) {
            await qaService.submitSample(productId, logisticsMethod);
            await get().loadProducts();
          } else {
            // Fallback to local state
            set((state) => ({
              products: state.products.map((product) =>
                product.id === productId
                  ? { 
                      ...product, 
                      status: 'IN_QUALITY_REVIEW' as ProductQAStatus,
                      logistics: logisticsMethod
                    }
                  : product
              ),
            }));
          }
        } catch (error) {
          console.error('Error submitting sample:', error);
          throw error;
        }
      },

      passQualityCheck: async (productId: string) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status !== 'IN_QUALITY_REVIEW') {
            throw new Error('Product must be in IN_QUALITY_REVIEW status');
          }

          // Update database if configured
          if (isSupabaseConfigured()) {
            await qaService.passQualityCheck(productId);
            await get().loadProducts();
          } else {
            // Fallback to local state
            set((state) => ({
              products: state.products.map((product) =>
                product.id === productId
                  ? { 
                      ...product, 
                      status: 'ACTIVE_VERIFIED' as ProductQAStatus,
                      verifiedAt: new Date().toISOString()
                    }
                  : product
              ),
            }));
          }
          
          // Sync with seller store
          syncToSellerStore(productId, 'approved');
        } catch (error) {
          console.error('Error passing quality check:', error);
          throw error;
        }
      },

      rejectProduct: async (productId: string, reason: string, stage: 'digital' | 'physical') => {
        try {
          if (!reason || reason.trim() === '') {
            throw new Error('Rejection reason is required');
          }
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status === 'ACTIVE_VERIFIED' || product.status === 'REJECTED') {
            throw new Error('Product cannot be rejected from current status');
          }

          // Update database if configured
          if (isSupabaseConfigured()) {
            await qaService.rejectProduct(productId, reason, stage);
            await get().loadProducts();
          } else {
            // Fallback to local state
            set((state) => ({
              products: state.products.map((product) =>
                product.id === productId
                  ? { 
                      ...product, 
                      status: 'REJECTED' as ProductQAStatus,
                      rejectionReason: reason,
                      rejectionStage: stage,
                      rejectedAt: new Date().toISOString()
                    }
                  : product
              ),
            }));
          }
          
          // Sync with seller store
          syncToSellerStore(productId, 'rejected', reason);
        } catch (error) {
          console.error('Error rejecting product:', error);
          throw error;
        }
      },

      requestRevision: async (productId: string, reason: string, stage: 'digital' | 'physical') => {
        try {
          if (!reason || reason.trim() === '') {
            throw new Error('Revision reason is required');
          }
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status === 'ACTIVE_VERIFIED' || product.status === 'REJECTED' || product.status === 'FOR_REVISION') {
            throw new Error('Product cannot request revision from current status');
          }

          // Update database if configured
          if (isSupabaseConfigured()) {
            await qaService.requestRevision(productId, reason, stage);
            await get().loadProducts();
          } else {
            // Fallback to local state
            set((state) => ({
              products: state.products.map((product) =>
                product.id === productId
                  ? { 
                      ...product, 
                      status: 'FOR_REVISION' as ProductQAStatus,
                      rejectionReason: reason,
                      rejectionStage: stage,
                      revisionRequestedAt: new Date().toISOString()
                    }
                  : product
              ),
            }));
          }
          
          // Sync with seller store (use pending, not reclassified)
          syncToSellerStore(productId, 'pending', reason);
        } catch (error) {
          console.error('Error requesting revision:', error);
          throw error;
        }
      },

      getProductById: (productId: string) => {
        return get().products.find((p) => p.id === productId);
      },

      getProductsByStatus: (status: ProductQAStatus) => {
        return get().products.filter((p) => p.status === status);
      },

      getProductsBySeller: (sellerId: string) => {
        return get().products.filter((p) => p.sellerId === sellerId);
      },

      resetToInitialState: () => {
        set({ products: initialProducts });
      },

      addProductToQA: async (productData) => {
        try {
          // Validation
          if (!productData.id || !productData.name || !productData.vendor) {
            throw new Error('Product data is incomplete');
          }
          if (!productData.price || productData.price <= 0) {
            throw new Error('Product price must be greater than 0');
          }
          if (!productData.category || productData.category.trim() === '') {
            throw new Error('Product category is required');
          }
          
          // Check for duplicate
          const exists = get().products.find(p => p.id === productData.id);
          if (exists) {
            console.warn(`Product ${productData.id} already exists in QA flow`);
            return;
          }

          // Create in database if configured
          if (isSupabaseConfigured() && productData.sellerId) {
            await qaService.createQAEntry(
              productData.id,
              productData.vendor,
              productData.sellerId
            );
            // Reload products to get fresh data
            await get().loadProducts();
          } else {
            // Fallback to local state
            const newQAProduct: QAProduct = {
              ...productData,
              status: 'PENDING_DIGITAL_REVIEW',
              logistics: null,
              submittedAt: new Date().toISOString(),
            };
            set((state) => ({
              products: [...state.products, newQAProduct],
            }));
          }
        } catch (error) {
          console.error('Error adding product to QA:', error);
          throw error;
        }
      },
    }),
    {
      name: 'bazaarx-product-qa-shared',
      partialize: (state) => ({
        products: state.products,
        isLoading: state.isLoading,
        // Exclude _lastSellerId from persistence (runtime-only)
      }),
      merge: (persistedState: any, currentState: any) => {
        const merged = { ...currentState, ...persistedState };
        // Deduplicate products on rehydration to prevent duplicate key warnings
        if (merged.products && Array.isArray(merged.products)) {
          const seen = new Set<string>();
          merged.products = merged.products.filter((p: QAProduct) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        }
        return merged;
      },
    }
  )
);

// Helper function to sync with seller store
function syncToSellerStore(
  productId: string, 
  approvalStatus: 'pending' | 'approved' | 'rejected',
  rejectionReason?: string
) {
  try {
    const sellerStore = useProductStore.getState();
    const updates: any = { approvalStatus };
    if (rejectionReason) {
      updates.rejectionReason = rejectionReason;
    }
    sellerStore.updateProduct(productId, updates);
  } catch (error) {
    console.error('Error syncing to seller store:', error);
  }
}
