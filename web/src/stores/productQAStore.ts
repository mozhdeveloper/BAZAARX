import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ProductQAStatus = 
  | 'PENDING_DIGITAL_REVIEW'    // Step 1: Needs Admin Digital Approval
  | 'WAITING_FOR_SAMPLE'         // Step 2: Needs Seller to Send Sample
  | 'IN_QUALITY_REVIEW'          // Step 3: Sample with Admin (Physical QA)
  | 'ACTIVE_VERIFIED'            // Step 4: Live & Verified
  | 'FOR_REVISION'               // Needs seller to revise/update
  | 'REJECTED';                  // Rejected by admin

export interface QAProduct {
  id: string;
  name: string;
  description?: string;
  vendor: string;
  price: number;
  originalPrice?: number;
  category: string;
  status: ProductQAStatus;
  logistics: string | null;
  image: string;
  images?: string[];
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
  
  // Actions
  approveForSampleSubmission: (productId: string) => void;
  submitSample: (productId: string, logisticsMethod: string) => void;
  passQualityCheck: (productId: string) => void;
  rejectProduct: (productId: string, reason: string, stage: 'digital' | 'physical') => void;
  requestRevision: (productId: string, reason: string, stage: 'digital' | 'physical') => void;
  getProductById: (productId: string) => QAProduct | undefined;
  getProductsByStatus: (status: ProductQAStatus) => QAProduct[];
  resetToInitialState: () => void;
  addProductToQA: (productData: Omit<QAProduct, 'status' | 'logistics' | 'submittedAt'>) => void;
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

      approveForSampleSubmission: (productId: string) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            console.error(`Product not found: ${productId}`);
            throw new Error('Product not found');
          }
          if (product.status !== 'PENDING_DIGITAL_REVIEW') {
            console.error(`Invalid status transition: ${product.status} -> WAITING_FOR_SAMPLE`);
            throw new Error('Product must be in PENDING_DIGITAL_REVIEW status');
          }
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
        } catch (error) {
          console.error('Error approving product for sample submission:', error);
          throw error;
        }
      },

      submitSample: (productId: string, logisticsMethod: string) => {
        try {
          if (!logisticsMethod || logisticsMethod.trim() === '') {
            throw new Error('Logistics method is required');
          }
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            console.error(`Product not found: ${productId}`);
            throw new Error('Product not found');
          }
          if (product.status !== 'WAITING_FOR_SAMPLE') {
            console.error(`Invalid status transition: ${product.status} -> IN_QUALITY_REVIEW`);
            throw new Error('Product must be in WAITING_FOR_SAMPLE status');
          }
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
        } catch (error) {
          console.error('Error submitting sample:', error);
          throw error;
        }
      },

      passQualityCheck: (productId: string) => {
        try {
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            console.error(`Product not found: ${productId}`);
            throw new Error('Product not found');
          }
          if (product.status !== 'IN_QUALITY_REVIEW') {
            console.error(`Invalid status transition: ${product.status} -> ACTIVE_VERIFIED`);
            throw new Error('Product must be in IN_QUALITY_REVIEW status');
          }
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
          
          // Sync with seller store - update approval status
          if (typeof window !== 'undefined') {
            import('./sellerStore')
              .then(({ useProductStore }) => {
                try {
                  const sellerStore = useProductStore.getState();
                  sellerStore.updateProduct(productId, { approvalStatus: 'approved' });
                } catch (error) {
                  console.error('Error syncing to seller store:', error);
                }
              })
              .catch((error) => {
                console.error('Error loading seller store:', error);
              });
          }
        } catch (error) {
          console.error('Error passing quality check:', error);
          throw error;
        }
      },

      rejectProduct: (productId: string, reason: string, stage: 'digital' | 'physical') => {
        try {
          if (!reason || reason.trim() === '') {
            throw new Error('Rejection reason is required');
          }
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            console.error(`Product not found: ${productId}`);
            throw new Error('Product not found');
          }
          if (product.status === 'ACTIVE_VERIFIED' || product.status === 'REJECTED') {
            console.error(`Cannot reject product in ${product.status} status`);
            throw new Error('Product cannot be rejected from current status');
          }
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
          
          // Sync with seller store - update approval status
          if (typeof window !== 'undefined') {
            import('./sellerStore')
              .then(({ useProductStore }) => {
                try {
                  const sellerStore = useProductStore.getState();
                  sellerStore.updateProduct(productId, { 
                    approvalStatus: 'rejected',
                    rejectionReason: reason 
                  });
                } catch (error) {
                  console.error('Error syncing to seller store:', error);
                }
              })
              .catch((error) => {
                console.error('Error loading seller store:', error);
              });
          }
        } catch (error) {
          console.error('Error rejecting product:', error);
          throw error;
        }
      },

      requestRevision: (productId: string, reason: string, stage: 'digital' | 'physical') => {
        try {
          if (!reason || reason.trim() === '') {
            throw new Error('Revision reason is required');
          }
          const product = get().products.find(p => p.id === productId);
          if (!product) {
            console.error(`Product not found: ${productId}`);
            throw new Error('Product not found');
          }
          if (product.status === 'ACTIVE_VERIFIED' || product.status === 'REJECTED' || product.status === 'FOR_REVISION') {
            console.error(`Cannot request revision for product in ${product.status} status`);
            throw new Error('Product cannot request revision from current status');
          }
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
          
          // Sync with seller store
          if (typeof window !== 'undefined') {
            import('./sellerStore')
              .then(({ useProductStore }) => {
                try {
                  const sellerStore = useProductStore.getState();
                  sellerStore.updateProduct(productId, { 
                    approvalStatus: 'reclassified',
                    rejectionReason: reason 
                  });
                } catch (error) {
                  console.error('Error syncing to seller store:', error);
                }
              })
              .catch((error) => {
                console.error('Error loading seller store:', error);
              });
          }
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

      resetToInitialState: () => {
        set({ products: initialProducts });
      },

      addProductToQA: (productData) => {
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
          
          const newQAProduct: QAProduct = {
            ...productData,
            status: 'PENDING_DIGITAL_REVIEW',
            logistics: null,
            submittedAt: new Date().toISOString(),
          };
          set((state) => ({
            products: [...state.products, newQAProduct],
          }));
        } catch (error) {
          console.error('Error adding product to QA:', error);
          throw error;
        }
      },
    }),
    {
      name: 'bazaarx-product-qa-shared',
    }
  )
);
