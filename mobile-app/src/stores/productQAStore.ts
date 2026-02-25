import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { qaService, QAProductWithDetails, ProductQAStatus as QAStatus } from '../services/qaService';
import { safeImageUri } from '../utils/imageUtils';

export type ProductQAStatus = 
  | 'PENDING_DIGITAL_REVIEW'    // Step 1: Needs Admin Digital Approval
  | 'WAITING_FOR_SAMPLE'         // Step 2: Needs Seller to Send Sample
  | 'IN_QUALITY_REVIEW'          // Step 3: Sample with Admin (Physical QA)
  | 'ACTIVE_VERIFIED'            // Step 4: Live & Verified
  | 'FOR_REVISION'               // Needs seller to revise/update
  | 'REJECTED';                  // Rejected by admin

export interface QAProduct {
  id: string;
  productId: string;
  name: string;
  description?: string;
  vendor: string;
  sellerId?: string;
  price: number;
  originalPrice?: number;
  category: string;
  status: ProductQAStatus;
  logistics: string | null;
  image: string;
  images?: string[];
  rejectionReason?: string;
  rejectionStage?: 'digital' | 'physical';
  submittedAt?: string;
  approvedAt?: string;
  verifiedAt?: string;
  rejectedAt?: string;
  revisionRequestedAt?: string;
}

interface ProductQAStore {
  products: QAProduct[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadProducts: (sellerId?: string) => Promise<void>;
  approveForSampleSubmission: (productId: string) => Promise<void>;
  submitSample: (productId: string, logisticsMethod: string) => Promise<void>;
  passQualityCheck: (productId: string) => Promise<void>;
  rejectProduct: (productId: string, reason: string, stage: 'digital' | 'physical') => Promise<void>;
  requestRevision: (productId: string, reason: string, stage: 'digital' | 'physical') => Promise<void>;
  getProductById: (productId: string) => QAProduct | undefined;
  getProductsByStatus: (status: ProductQAStatus) => QAProduct[];
  addProductToQA: (productId: string, vendorName: string, sellerId?: string) => Promise<void>;
  resetToInitialState: () => void;
}

// Convert database entry to store format
const convertDBToStore = (entry: QAProductWithDetails): QAProduct => {
  // Handle image extraction safely, sanitize social-media CDN URLs
  let imageUrl = 'https://placehold.co/100?text=Product';
  let images: string[] = [];

  if (entry.product?.images && Array.isArray(entry.product.images) && entry.product.images.length > 0) {
    // Check if it's an array of strings or objects
    const firstImg = entry.product.images[0];
    if (typeof firstImg === 'string') {
      imageUrl = safeImageUri(firstImg);
      images = (entry.product.images as string[]).map(img => safeImageUri(img));
    } else if (typeof firstImg === 'object' && firstImg !== null && 'image_url' in firstImg) {
      // It's from product_images table join
      imageUrl = safeImageUri((firstImg as any).image_url);
      images = entry.product.images.map((img: any) => safeImageUri(img.image_url)).filter(Boolean);
    }
  }

  // Ensure images array has at least a fallback
  if (images.length === 0) {
    images = [imageUrl];
  }

  return {
    id: entry.id,
    productId: entry.product_id,
    name: entry.product?.name || 'Unknown Product',
    description: entry.product?.description,
    vendor: entry.vendor,
    sellerId: entry.product?.seller_id,
    price: entry.product?.price || 0,
    originalPrice: entry.product?.original_price,
    category: typeof entry.product?.category === 'object' ? (entry.product.category as any)?.name : (entry.product?.category || 'Uncategorized'),
    status: entry.status as ProductQAStatus,
    logistics: entry.logistics,
    image: imageUrl,
    images: images,
    rejectionReason: entry.rejection_reason || undefined,
    rejectionStage: entry.rejection_stage || undefined,
    submittedAt: entry.submitted_at,
    approvedAt: entry.approved_at || undefined,
    verifiedAt: entry.verified_at || undefined,
    rejectedAt: entry.rejected_at || undefined,
    revisionRequestedAt: entry.revision_requested_at || undefined,
  };
};

export const useProductQAStore = create<ProductQAStore>()(
  persist(
    (set, get) => ({
      products: [],
      isLoading: false,
      error: null,

      loadProducts: async (sellerId?: string) => {
        set({ isLoading: true, error: null });
        try {
          let entries: QAProductWithDetails[];
          
          if (sellerId) {
            entries = await qaService.getQAEntriesBySeller(sellerId);
          } else {
            entries = await qaService.getAllQAEntries();
          }

          // Admin mode: auto-create assessments for orphan products
          if (!sellerId) {
            try {
              const orphans = await qaService.getOrphanProducts();
              if (orphans.length > 0) {
                console.log(`[QA Store Mobile] Reconciling ${orphans.length} orphan product(s)...`);
                await Promise.allSettled(
                  orphans.map(async (orphan: any) => {
                    try {
                      await qaService.createQAEntry(
                        orphan.id,
                        orphan.seller?.store_name || 'Unknown',
                        orphan.seller_id || ''
                      );
                    } catch (e) {
                      console.warn(`[QA Store Mobile] Orphan reconcile failed for ${orphan.id}:`, e);
                    }
                  })
                );
                // Re-fetch with newly created assessments
                entries = await qaService.getAllQAEntries();
              }
            } catch (orphanError) {
              console.warn('[QA Store Mobile] Orphan reconciliation error:', orphanError);
            }
          }

          
          // Deduplicate products based on ID
          const productsMap = new Map();
          entries.forEach(entry => {
            if (!productsMap.has(entry.product_id)) {
              productsMap.set(entry.product_id, convertDBToStore(entry));
            }
          });
          
          const products = Array.from(productsMap.values());
          set({ products, isLoading: false });
        } catch (error) {
          console.error('Error loading QA products:', error);
          set({ error: 'Failed to load products', isLoading: false });
        }
      },

      approveForSampleSubmission: async (productId: string) => {
        set({ isLoading: true });
        try {
          const product = get().products.find(p => p.productId === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status !== 'PENDING_DIGITAL_REVIEW') {
            throw new Error('Product must be in PENDING_DIGITAL_REVIEW status');
          }

          await qaService.approveForSampleSubmission(productId);

          // Update local state
          set((state) => ({
            products: state.products.map((p) =>
              p.productId === productId
                ? { 
                    ...p, 
                    status: 'WAITING_FOR_SAMPLE' as ProductQAStatus,
                    approvedAt: new Date().toISOString()
                  }
                : p
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error approving product:', error);
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
          throw error;
        }
      },

      submitSample: async (productId: string, logisticsMethod: string) => {
        set({ isLoading: true });
        try {
          if (!logisticsMethod || logisticsMethod.trim() === '') {
            throw new Error('Logistics method is required');
          }
          
          const product = get().products.find(p => p.productId === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status !== 'WAITING_FOR_SAMPLE') {
            throw new Error('Product must be in WAITING_FOR_SAMPLE status');
          }

          await qaService.submitSample(productId, logisticsMethod);

          // Update local state
          set((state) => ({
            products: state.products.map((p) =>
              p.productId === productId
                ? { 
                    ...p, 
                    status: 'IN_QUALITY_REVIEW' as ProductQAStatus,
                    logistics: logisticsMethod
                  }
                : p
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error submitting sample:', error);
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
          throw error;
        }
      },

      passQualityCheck: async (productId: string) => {
        set({ isLoading: true });
        try {
          const product = get().products.find(p => p.productId === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status !== 'IN_QUALITY_REVIEW') {
            throw new Error('Product must be in IN_QUALITY_REVIEW status');
          }

          await qaService.passQualityCheck(productId);

          // Update local state
          set((state) => ({
            products: state.products.map((p) =>
              p.productId === productId
                ? { 
                    ...p, 
                    status: 'ACTIVE_VERIFIED' as ProductQAStatus,
                    verifiedAt: new Date().toISOString()
                  }
                : p
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error passing quality check:', error);
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
          throw error;
        }
      },

      rejectProduct: async (productId: string, reason: string, stage: 'digital' | 'physical') => {
        set({ isLoading: true });
        try {
          if (!reason || reason.trim() === '') {
            throw new Error('Rejection reason is required');
          }
          
          const product = get().products.find(p => p.productId === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status === 'ACTIVE_VERIFIED' || product.status === 'REJECTED') {
            throw new Error('Product cannot be rejected from current status');
          }

          await qaService.rejectProduct(productId, reason, stage);

          // Update local state
          set((state) => ({
            products: state.products.map((p) =>
              p.productId === productId
                ? { 
                    ...p, 
                    status: 'REJECTED' as ProductQAStatus,
                    rejectionReason: reason,
                    rejectionStage: stage,
                    rejectedAt: new Date().toISOString()
                  }
                : p
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error rejecting product:', error);
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
          throw error;
        }
      },

      requestRevision: async (productId: string, reason: string, stage: 'digital' | 'physical') => {
        set({ isLoading: true });
        try {
          if (!reason || reason.trim() === '') {
            throw new Error('Revision reason is required');
          }
          
          const product = get().products.find(p => p.productId === productId);
          if (!product) {
            throw new Error('Product not found');
          }
          if (product.status === 'ACTIVE_VERIFIED' || product.status === 'REJECTED' || product.status === 'FOR_REVISION') {
            throw new Error('Product cannot request revision from current status');
          }

          await qaService.requestRevision(productId, reason, stage);

          // Update local state
          set((state) => ({
            products: state.products.map((p) =>
              p.productId === productId
                ? { 
                    ...p, 
                    status: 'FOR_REVISION' as ProductQAStatus,
                    rejectionReason: reason,
                    rejectionStage: stage,
                    revisionRequestedAt: new Date().toISOString()
                  }
                : p
            ),
            isLoading: false,
          }));
        } catch (error) {
          console.error('Error requesting revision:', error);
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
          throw error;
        }
      },

      getProductById: (productId: string) => {
        return get().products.find((p) => p.productId === productId);
      },

      getProductsByStatus: (status: ProductQAStatus) => {
        return get().products.filter((p) => p.status === status);
      },

      addProductToQA: async (productId: string, vendorName: string, sellerId?: string) => {
        set({ isLoading: true });
        try {
          await qaService.createQAEntry(productId, vendorName, sellerId || 'unknown');

          // Reload products for this seller so the new product appears
          if (sellerId) {
            await get().loadProducts(sellerId);
          } else {
            await get().loadProducts();
          }
        } catch (error) {
          console.error('Error adding product to QA:', error);
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Unknown error' });
          throw error;
        }
      },

      resetToInitialState: () => {
        set({ products: [], isLoading: false, error: null });
      },
    }),
    {
      name: 'bazaarx-mobile-product-qa',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
