import { create } from 'zustand';
import {
  returnService,
  ReturnRequest,
  ReturnStatus,
  ReturnType,
  ResolutionPath,
  ReturnItem,
  getStatusLabel,
  getStatusColor,
} from '../services/returnService';

export type { ReturnStatus };
export { getStatusLabel, getStatusColor };

export interface SellerReturnRequest {
  id: string;
  orderId: string;
  orderNumber: string;
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
  // v2 fields
  returnType: ReturnType | null;
  resolutionPath: ResolutionPath | null;
  itemsJson: ReturnItem[] | null;
  evidenceUrls: string[] | null;
  sellerNote: string | null;
  rejectedReason: string | null;
  counterOfferAmount: number | null;
  sellerDeadline: string | null;
  escalatedAt: string | null;
  returnTrackingNumber: string | null;
  returnLabelUrl: string | null;
  buyerShippedAt: string | null;
  returnReceivedAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface SellerReturnStore {
  requests: SellerReturnRequest[];
  isLoading: boolean;
  error: string | null;
  loadRequests: (sellerId: string) => Promise<void>;
  approveRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string, reason?: string) => Promise<void>;
  counterOfferRequest: (id: string, amount: number, note: string) => Promise<void>;
  requestItemBack: (id: string) => Promise<void>;
  confirmReturnReceived: (id: string) => Promise<void>;
  escalateRequest: (id: string) => Promise<void>;
  getRequestsByStatus: (status: ReturnStatus | 'all') => SellerReturnRequest[];
}

function mapToSellerReturn(r: ReturnRequest): SellerReturnRequest {
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
    status: r.status,
    reason: r.returnReason || '',
    description: r.description || r.returnReason || '',
    images: r.evidenceUrls || [],
    // v2 fields
    returnType: r.returnType,
    resolutionPath: r.resolutionPath,
    itemsJson: r.itemsJson,
    evidenceUrls: r.evidenceUrls,
    sellerNote: r.sellerNote,
    rejectedReason: r.rejectedReason,
    counterOfferAmount: r.counterOfferAmount,
    sellerDeadline: r.sellerDeadline,
    escalatedAt: r.escalatedAt,
    returnTrackingNumber: r.returnTrackingNumber,
    returnLabelUrl: r.returnLabelUrl,
    buyerShippedAt: r.buyerShippedAt,
    returnReceivedAt: r.returnReceivedAt,
    resolvedAt: r.resolvedAt,
    resolvedBy: r.resolvedBy,
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
        await returnService.approveReturn(id);
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
        await returnService.rejectReturn(id, reason);
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'rejected' as ReturnStatus, rejectedReason: reason || null } : r
          ),
        }));
      } catch (error: any) {
        set({ error: error.message || 'Failed to reject return' });
      }
    },

    counterOfferRequest: async (id: string, amount: number, note: string) => {
      try {
        await returnService.counterOfferReturn(id, amount, note);
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id
              ? { ...r, status: 'counter_offered' as ReturnStatus, counterOfferAmount: amount, sellerNote: note }
              : r
          ),
        }));
      } catch (error: any) {
        set({ error: error.message || 'Failed to send counter offer' });
      }
    },

    requestItemBack: async (id: string) => {
      try {
        await returnService.requestItemBack(id);
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'return_in_transit' as ReturnStatus, resolutionPath: 'return_required' as ResolutionPath } : r
          ),
        }));
      } catch (error: any) {
        set({ error: error.message || 'Failed to request item back' });
      }
    },

    confirmReturnReceived: async (id: string) => {
      try {
        await returnService.confirmReturnReceived(id);
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'refunded' as ReturnStatus, returnReceivedAt: new Date().toISOString() } : r
          ),
        }));
      } catch (error: any) {
        set({ error: error.message || 'Failed to confirm return received' });
      }
    },

    escalateRequest: async (id: string) => {
      try {
        await returnService.escalateReturn(id);
        set((state) => ({
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'escalated' as ReturnStatus, escalatedAt: new Date().toISOString() } : r
          ),
        }));
      } catch (error: any) {
        set({ error: error.message || 'Failed to escalate return' });
      }
    },

    getRequestsByStatus: (status) => {
      const { requests } = get();
      if (status === 'all') return requests;
      return requests.filter((req) => req.status === status);
    },
  })
);
