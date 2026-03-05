import { create } from 'zustand';
import { ReturnRequest, ReturnStatus, ReturnReason, ReturnType } from '../types';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';
import { returnService, MobileReturnRequest } from '../services/returnService';

interface ReturnStore {
  returnRequests: ReturnRequest[]; // Buyer returns (legacy/sync)
  sellerReturns: MobileReturnRequest[]; // Real seller returns from Supabase
  isLoading: boolean;
  error: string | null;

  // Actions
  createReturnRequest: (request: Omit<ReturnRequest, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'history'>) => void;
  updateReturnStatus: (id: string, status: ReturnStatus, note?: string, by?: 'buyer' | 'seller' | 'admin') => void;
  
  // Real Seller Actions (Sync with returnService)
  fetchSellerReturns: (sellerId: string) => Promise<void>;
  approveReturn: (id: string) => Promise<void>;
  rejectReturn: (id: string, reason?: string) => Promise<void>;
  counterOfferReturn: (id: string, amount: number, note: string) => Promise<void>;
  requestItemBack: (id: string) => Promise<void>;
  confirmReturnReceived: (id: string) => Promise<void>;
  
  // Getters
  getReturnRequestsByOrder: (orderId: string) => ReturnRequest[];
  getReturnRequestsByUser: (userId: string) => ReturnRequest[];
  getReturnRequestsBySeller: (sellerId: string) => ReturnRequest[];
  getReturnRequestById: (id: string) => ReturnRequest | undefined;
  getSellerReturnById: (id: string) => MobileReturnRequest | undefined;
}

export const useReturnStore = create<ReturnStore>()(persist((set, get) => ({
  returnRequests: [],
  sellerReturns: [],
  isLoading: false,
  error: null,

  fetchSellerReturns: async (sellerId: string) => {
    set({ isLoading: true, error: null });
    try {
      const returns = await returnService.getReturnRequestsBySeller(sellerId);
      set({ sellerReturns: returns, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch returns', isLoading: false });
    }
  },

  approveReturn: async (id: string) => {
    set({ isLoading: true });
    try {
      await returnService.approveReturn(id);
      set((state) => ({
        sellerReturns: state.sellerReturns.map((r) =>
          r.id === id ? { ...r, status: 'approved', refundDate: new Date().toISOString() } : r
        ),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to approve return', isLoading: false });
      throw err;
    }
  },

  rejectReturn: async (id: string, reason?: string) => {
    set({ isLoading: true });
    try {
      await returnService.rejectReturn(id, reason);
      set((state) => ({
        sellerReturns: state.sellerReturns.map((r) =>
          r.id === id ? { ...r, status: 'rejected', rejectedReason: reason || 'Rejected by seller' } : r
        ),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to reject return', isLoading: false });
      throw err;
    }
  },

  counterOfferReturn: async (id: string, amount: number, note: string) => {
    set({ isLoading: true });
    try {
      await returnService.counterOfferReturn(id, amount, note);
      set((state) => ({
        sellerReturns: state.sellerReturns.map((r) =>
          r.id === id ? { ...r, status: 'counter_offered', counterOfferAmount: amount, sellerNote: note } : r
        ),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to send counter offer', isLoading: false });
      throw err;
    }
  },

  requestItemBack: async (id: string) => {
    set({ isLoading: true });
    try {
      await returnService.requestItemBack(id);
      set((state) => ({
        sellerReturns: state.sellerReturns.map((r) =>
          r.id === id ? { ...r, status: 'return_in_transit', resolutionPath: 'return_required' } : r
        ),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to request item back', isLoading: false });
      throw err;
    }
  },

  confirmReturnReceived: async (id: string) => {
    set({ isLoading: true });
    try {
      await returnService.confirmReturnReceived(id);
      set((state) => ({
        sellerReturns: state.sellerReturns.map((r) =>
          r.id === id ? { ...r, status: 'refunded', returnReceivedAt: new Date().toISOString(), refundDate: new Date().toISOString() } : r
        ),
        isLoading: false,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to confirm return received', isLoading: false });
      throw err;
    }
  },

  createReturnRequest: (request) => {
    const newRequest: ReturnRequest = {
      ...request,
      id: `ret_${Date.now()}`,
      status: 'pending_review' as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          status: 'pending_review' as any,
          timestamp: new Date().toISOString(),
          by: 'buyer',
          note: 'Request initiated',
        },
      ],
    };

    set((state) => ({
      returnRequests: [newRequest, ...state.returnRequests],
    }));

    // Notify seller (legacy flow)
    if (request.sellerId) {
      notificationService.notifySellerReturnRequest({
        sellerId: request.sellerId,
        orderId: request.orderId,
        returnId: newRequest.id,
        orderNumber: request.orderId,
        buyerName: 'A buyer',
        reason: (request.description || request.reason || 'Return requested') as any,
      }).catch(() => {});
    }
  },

  updateReturnStatus: (id, status, note, by = 'seller') => {
    const request = get().returnRequests.find((req) => req.id === id);
    set((state) => ({
      returnRequests: state.returnRequests.map((req) => {
        if (req.id === id) {
          return {
            ...req,
            status: status as any,
            updatedAt: new Date().toISOString(),
            history: [
              ...req.history,
              {
                status: status as any,
                timestamp: new Date().toISOString(),
                note,
                by,
              },
            ],
          };
        }
        return req;
      }),
    }));

    // Notify buyer (legacy flow)
    if (request && ['approved', 'rejected', 'refunded'].includes(status)) {
      notificationService.notifyBuyerReturnStatus({
        buyerId: request.userId,
        orderId: request.orderId,
        returnId: request.id,
        orderNumber: request.orderId,
        status: status as any,
        message: note,
      }).catch(() => {});
    }
  },

  getReturnRequestsByOrder: (orderId) => {
    return get().returnRequests.filter((req) => req.orderId === orderId);
  },

  getReturnRequestsByUser: (userId) => {
    return get().returnRequests.filter((req) => req.userId === userId);
  },

  getReturnRequestsBySeller: (sellerId) => {
    return get().returnRequests.filter((req) => req.sellerId === sellerId);
  },
  
  getReturnRequestById: (id) => {
    return get().returnRequests.find((req) => req.id === id);
  },

  getSellerReturnById: (id) => {
    return get().sellerReturns.find((req) => req.id === id);
  },
}),
  {
    name: 'return-storage',
    storage: createJSONStorage(() => AsyncStorage),
  }
));
