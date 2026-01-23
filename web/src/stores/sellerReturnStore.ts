import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

export interface SellerReturnRequest {
  id: string;
  orderId: string; // "transactionId" in OrderStore, but often ID for linking
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
  approveRequest: (id: string) => void;
  rejectRequest: (id: string) => void;
  getRequestsByStatus: (status: ReturnStatus | 'all') => SellerReturnRequest[];
}

// Dummy Data matching Mobile Side
const dummyRequests: SellerReturnRequest[] = [
  {
    id: 'ret_1',
    orderId: 'A238567K',
    buyerName: 'John Doe',
    buyerEmail: 'john@example.com',
    items: [
      {
        productName: 'Premium Wireless Earbuds',
        quantity: 1,
        price: 2499,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
        reason: 'defective'
      }
    ],
    totalRefundAmount: 2499,
    requestDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'pending',
    reason: 'Defective / Not Working',
    description: 'The left earbud is not charging even after 24 hours of case charging.',
    images: ['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400'],
  },
  {
    id: 'ret_2',
    orderId: 'B892341M',
    buyerName: 'Jane Smith',
    buyerEmail: 'jane@example.com',
    items: [
      {
        productName: 'Sustainable Water Bottle',
        quantity: 1,
        price: 899,
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
        reason: 'damaged'
      }
    ],
    totalRefundAmount: 899,
    requestDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'approved',
    reason: 'Damaged / Broken',
    description: 'Arrived with a dent on the side.',
    images: [],
  }
];

export const useSellerReturnStore = create<SellerReturnStore>()(
  persist(
    (set, get) => ({
      requests: dummyRequests,

      approveRequest: (id) => {
        set((state) => ({
          requests: state.requests.map((req) =>
            req.id === id ? { ...req, status: 'approved' } : req
          ),
        }));
      },

      rejectRequest: (id) => {
        set((state) => ({
          requests: state.requests.map((req) =>
            req.id === id ? { ...req, status: 'rejected' } : req
          ),
        }));
      },

      getRequestsByStatus: (status) => {
        const { requests } = get();
        if (status === 'all') return requests;
        return requests.filter((req) => req.status === status);
      },
    }),
    {
      name: 'seller-return-storage',
    }
  )
);
