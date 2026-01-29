import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { qaService, QAProductWithDetails, ProductQAStatus as QAStatus } from '../services/qaService';

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
  addProductToQA: (productId: string, vendorName: string) => Promise<void>;
  resetToInitialState: () => void;
}

// Convert database entry to store format
const convertDBToStore = (entry: QAProductWithDetails): QAProduct => ({
  id: entry.id,
  productId: entry.product_id,
  name: entry.product?.name || 'Unknown Product',
  description: entry.product?.description,
  vendor: entry.vendor,
  sellerId: entry.product?.seller_id,
  price: entry.product?.price || 0,
  originalPrice: entry.product?.original_price,
  category: entry.product?.category || 'Uncategorized',
  status: entry.status as ProductQAStatus,
  logistics: entry.logistics,
  image: entry.product?.images?.[0] || 'https://placehold.co/100?text=Product',
  images: entry.product?.images,
  rejectionReason: entry.rejection_reason || undefined,
  rejectionStage: entry.rejection_stage || undefined,
  submittedAt: entry.submitted_at,
  approvedAt: entry.approved_at || undefined,
  verifiedAt: entry.verified_at || undefined,
  rejectedAt: entry.rejected_at || undefined,
  revisionRequestedAt: entry.revision_requested_at || undefined,
});

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

          const products = entries.map(convertDBToStore);
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

          const success = await qaService.approveForSampleSubmission(productId);
          if (!success) {
            throw new Error('Failed to approve product');
          }

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

          const success = await qaService.submitSample(productId, logisticsMethod);
          if (!success) {
            throw new Error('Failed to submit sample');
          }

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

          const success = await qaService.passQualityCheck(productId);
          if (!success) {
            throw new Error('Failed to pass quality check');
          }

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

          const success = await qaService.rejectProduct(productId, reason, stage);
          if (!success) {
            throw new Error('Failed to reject product');
          }

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

          const success = await qaService.requestRevision(productId, reason, stage);
          if (!success) {
            throw new Error('Failed to request revision');
          }

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

      addProductToQA: async (productId: string, vendorName: string) => {
        set({ isLoading: true });
        try {
          const entry = await qaService.createQAEntry(productId, vendorName);
          if (!entry) {
            throw new Error('Failed to create QA entry');
          }

          // Reload products to get the full data
          await get().loadProducts();
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
