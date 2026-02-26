import { create } from 'zustand';
import { returnService, ReturnRequest } from '../services/returnService';

export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

export interface SellerReturnRequest {
  id: string;
  orderId: string;  // Real UUID for API calls
  orderNumber: string; // Display order number
  buyerName: string;
  buyerEmail: string;
  items: {
    productName: string;
    quantity: number;
    price: number;
    image: string;
    reason: string;
  }[];
  totalRefundAmount: number;
  requestDate: string;
  status: ReturnStatus;
  reason: string;
  description: string;
  images: string[];
}

interface SellerReturnStore {
  requests: SellerReturnRequest[];
  isLoading: boolean;
  error: string | null;
  loadRequests: (sellerId: string) => Promise<void>;
  approveRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string, reason?: string) => Promise<void>;
  getRequestsByStatus: (status: ReturnStatus | 'all') => SellerReturnRequest[];
}

function mapToSellerReturn(r: ReturnRequest): SellerReturnRequest {
  // Determine status from DB fields
  let status: ReturnStatus = 'pending';
  if (r.refundDate) {
    status = 'refunded';
  } else if (r.paymentStatus === 'refunded') {
    status = 'refunded';
  } else if (!r.isReturnable) {
    status = 'rejected';
  } else if (r.orderStatus === 'returned') {
    status = 'pending'; // Submitted, waiting for seller action
  }

  return {
    id: r.id,
    orderId: r.orderId,
    orderNumber: r.orderNumber || r.orderId,
    buyerName: r.buyerName || 'Unknown',
    buyerEmail: r.buyerEmail || '',
    items: (r.items || []).map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      price: item.price,
      image: item.image || '',
      reason: r.returnReason || 'Return requested',
    })),
    totalRefundAmount: r.refundAmount || r.items?.reduce((sum, i) => sum + i.price * i.quantity, 0) || 0,
    requestDate: r.createdAt,
    status,
    reason: r.returnReason || '',
    description: r.returnReason || '',
    images: [],
  };
}

export const useSellerReturnStore = create<SellerReturnStore>()(
  (set, get) => ({
    requests: [],
    isLoading: false,
    error: null,

    loadRequests: async (sellerId: string) => {
      set({ isLoading: true, error: null });
      try {
        const data = await returnService.getReturnRequestsBySeller(sellerId);
        set({ requests: data.map(mapToSellerReturn), isLoading: false });
      } catch (error: any) {
        set({ error: error.message || 'Failed to load return requests', isLoading: false });
      }
    },

    approveRequest: async (id: string) => {
      const req = get().requests.find(r => r.id === id);
      if (!req) return;

      try {
        // Find the actual order ID (not order number) from the return request
        await returnService.approveReturn(id, req.orderId);
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'approved' as ReturnStatus } : r
          ),
        }));
      } catch (error: any) {
        set({ error: error.message || 'Failed to approve return' });
      }
    },

    rejectRequest: async (id: string, reason?: string) => {
      const req = get().requests.find(r => r.id === id);
      if (!req) return;

      try {
        await returnService.rejectReturn(id, req.orderId, reason);
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'rejected' as ReturnStatus } : r
          ),
        }));
      } catch (error: any) {
        set({ error: error.message || 'Failed to reject return' });
      }
    },

    getRequestsByStatus: (status) => {
      const { requests } = get();
      if (status === 'all') return requests;
      return requests.filter((req) => req.status === status);
    },
  })
);
