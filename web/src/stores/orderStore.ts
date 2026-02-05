import { trackShipment } from '@/services/tracking';
import type { UnifiedTrackingResponse } from '@/types/tracking';

// Add to your store definition:
interface TrackingState {
  trackingCache: Record<string, UnifiedTrackingResponse>;
  fetchTrackingForOrder: (orderId: string, trackingNumber: string) => Promise<void>;
  getTrackingForOrder: (orderId: string) => UnifiedTrackingResponse | null;
  clearTrackingCache: () => void;
}

// Implement the slice:
const trackingSlice = (set: any, get: any) => ({
  trackingCache: {},
  
  fetchTrackingForOrder: async (orderId: string, trackingNumber: string) => {
    try {
      const data = await trackShipment(trackingNumber);
      set((state: any) => ({
        trackingCache: {
          ...state.trackingCache,
          [orderId]: data,
        },
      }));
    } catch (error) {
      console.error('Failed to fetch tracking for order:', orderId, error);
    }
  },
  
 getTrackingForOrder: (orderId: string) => {
    const state = get();
    return state.trackingCache[orderId] || null;
  },
  
  clearTrackingCache: () => {
    set({ trackingCache: {} });
  },
});
