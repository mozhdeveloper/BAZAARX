import { create } from 'zustand';
import { ReturnRequest, ReturnStatus, ReturnReason, ReturnType } from '../types';

interface ReturnStore {
  returnRequests: ReturnRequest[];
  createReturnRequest: (request: Omit<ReturnRequest, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'history'>) => void;
  updateReturnStatus: (id: string, status: ReturnStatus, note?: string, by?: 'buyer' | 'seller' | 'admin') => void;
  getReturnRequestsByOrder: (orderId: string) => ReturnRequest[];
  getReturnRequestsByUser: (userId: string) => ReturnRequest[];
  getReturnRequestsBySeller: (sellerId: string) => ReturnRequest[];
  getReturnRequestById: (id: string) => ReturnRequest | undefined;
}

// Dummy data
const dummyReturnRequests: ReturnRequest[] = [
  {
    id: 'ret_1',
    orderId: '1',
    userId: 'user_1',
    sellerId: 'TechStore Official',
    items: [
      {
        itemId: '1',
        quantity: 1,
      },
    ],
    reason: 'defective',
    description: 'The left earbud is not charging.',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400'],
    type: 'return_refund',
    status: 'pending_review',
    amount: 2499,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    history: [
      {
        status: 'pending_review',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        by: 'buyer',
        note: 'Request initiated',
      },
    ],
  },
];

export const useReturnStore = create<ReturnStore>((set, get) => ({
  returnRequests: dummyReturnRequests,

  createReturnRequest: (request) => {
    const newRequest: ReturnRequest = {
      ...request,
      id: `ret_${Date.now()}`,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          status: 'pending_review',
          timestamp: new Date().toISOString(),
          by: 'buyer',
          note: 'Request initiated',
        },
      ],
    };

    set((state) => ({
      returnRequests: [newRequest, ...state.returnRequests],
    }));
  },

  updateReturnStatus: (id, status, note, by = 'seller') => {
    set((state) => ({
      returnRequests: state.returnRequests.map((req) => {
        if (req.id === id) {
          return {
            ...req,
            status,
            updatedAt: new Date().toISOString(),
            history: [
              ...req.history,
              {
                status,
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
  },

  getReturnRequestsByOrder: (orderId) => {
    return get().returnRequests.filter((req) => req.orderId === orderId);
  },

  getReturnRequestsByUser: (userId) => {
    return get().returnRequests.filter((req) => req.userId === userId);
  },

  getReturnRequestsBySeller: (sellerId) => {
    // In a real app, this would filter by sellerId. 
    // Since our dummy data uses 'TechStore Official' as seller name/ID equivalent in OrderStore, we match that.
    return get().returnRequests.filter((req) => req.sellerId === sellerId);
  },
  
  getReturnRequestById: (id) => {
    return get().returnRequests.find((req) => req.id === id);
  },
}));
