/**
 * Delivery Store (Mobile)
 * Zustand store for courier delivery state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deliveryService } from '../services/deliveryService';
import type { CourierCode, DeliveryBookingStatus } from '../types/database.types';
import type {
  ShippingRateRequest,
  ShippingRateResult,
  BookDeliveryRequest,
  DeliveryBookingResult,
  DeliveryBooking,
  DeliveryTrackingResult,
  CourierProvider,
} from '../types/delivery.types';

interface DeliveryStore {
  // State
  shippingRates: ShippingRateResult | null;
  currentBooking: DeliveryBookingResult | null;
  tracking: DeliveryTrackingResult | null;
  sellerDeliveries: DeliveryBooking[];
  deliveryStats: { total: number; pending: number; inTransit: number; delivered: number; failed: number } | null;
  loading: boolean;
  error: string | null;
  isSandbox: boolean;

  // Courier Info
  getAvailableCouriers: () => CourierProvider[];
  getCourierByCode: (code: CourierCode) => CourierProvider;

  // Rate Calculation
  fetchShippingRates: (request: ShippingRateRequest) => Promise<void>;

  // Booking
  bookDelivery: (request: BookDeliveryRequest) => Promise<DeliveryBookingResult>;

  // Tracking
  fetchTracking: (bookingId: string) => Promise<void>;
  fetchTrackingByOrderId: (orderId: string) => Promise<void>;
  fetchTrackingByTrackingNumber: (trackingNumber: string) => Promise<void>;

  // Seller
  fetchSellerDeliveries: (sellerId: string, filters?: { status?: DeliveryBookingStatus; limit?: number }) => Promise<void>;
  fetchDeliveryStats: (sellerId: string) => Promise<void>;

  // Status Updates
  updateDeliveryStatus: (bookingId: string, status: DeliveryBookingStatus, description?: string, location?: string) => Promise<void>;
  sandboxAdvanceStatus: (bookingId: string) => Promise<DeliveryBookingStatus>;

  // Cancel
  cancelDelivery: (bookingId: string, reason?: string) => Promise<void>;

  // Reset
  clearDeliveryState: () => void;
}

export const useDeliveryStore = create<DeliveryStore>()(
  persist(
    (set, get) => ({
      shippingRates: null,
      currentBooking: null,
      tracking: null,
      sellerDeliveries: [],
      deliveryStats: null,
      loading: false,
      error: null,
      isSandbox: deliveryService.isSandbox,

      getAvailableCouriers: () => deliveryService.getAvailableCouriers(),

      getCourierByCode: (code: CourierCode) => deliveryService.getCourierByCode(code),

      fetchShippingRates: async (request: ShippingRateRequest) => {
        set({ loading: true, error: null });
        try {
          const rates = await deliveryService.getShippingRates(request);
          set({ shippingRates: rates, loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'Failed to fetch rates', loading: false });
        }
      },

      bookDelivery: async (request: BookDeliveryRequest) => {
        set({ loading: true, error: null });
        try {
          const result = await deliveryService.bookDelivery(request);
          set({ currentBooking: result, loading: false });
          return result;
        } catch (err: any) {
          const message = err?.message || 'Booking failed';
          set({ error: message, loading: false });
          throw err;
        }
      },

      fetchTracking: async (bookingId: string) => {
        set({ loading: true, error: null });
        try {
          const tracking = await deliveryService.getDeliveryTracking(bookingId);
          set({ tracking, loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'Failed to fetch tracking', loading: false });
        }
      },

      fetchTrackingByOrderId: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          const tracking = await deliveryService.getDeliveryByOrderId(orderId);
          set({ tracking, loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'Failed to fetch tracking', loading: false });
        }
      },

      fetchTrackingByTrackingNumber: async (trackingNumber: string) => {
        set({ loading: true, error: null });
        try {
          const tracking = await deliveryService.getDeliveryByTrackingNumber(trackingNumber);
          set({ tracking, loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'Failed to fetch tracking', loading: false });
        }
      },

      fetchSellerDeliveries: async (sellerId: string, filters?) => {
        set({ loading: true });
        try {
          const deliveries = await deliveryService.getSellerDeliveries(sellerId, filters);
          set({ sellerDeliveries: deliveries, loading: false });
        } catch {
          set({ loading: false });
        }
      },

      fetchDeliveryStats: async (sellerId: string) => {
        try {
          const stats = await deliveryService.getSellerDeliveryStats(sellerId);
          set({ deliveryStats: stats });
        } catch {
          // ignore
        }
      },

      updateDeliveryStatus: async (bookingId, status, description?, location?) => {
        set({ loading: true, error: null });
        try {
          await deliveryService.updateDeliveryStatus(bookingId, status, description, location);
          // Refetch tracking
          const tracking = await deliveryService.getDeliveryTracking(bookingId);
          set({ tracking, loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'Status update failed', loading: false });
          throw err;
        }
      },

      sandboxAdvanceStatus: async (bookingId: string) => {
        set({ loading: true, error: null });
        try {
          const nextStatus = await deliveryService.sandboxAdvanceStatus(bookingId);
          const tracking = await deliveryService.getDeliveryTracking(bookingId);
          set({ tracking, loading: false });
          return nextStatus;
        } catch (err: any) {
          set({ error: err?.message || 'Cannot advance status', loading: false });
          throw err;
        }
      },

      cancelDelivery: async (bookingId: string, reason?: string) => {
        set({ loading: true, error: null });
        try {
          await deliveryService.cancelDelivery(bookingId, reason);
          set({ loading: false });
        } catch (err: any) {
          set({ error: err?.message || 'Cancel failed', loading: false });
          throw err;
        }
      },

      clearDeliveryState: () => {
        set({
          shippingRates: null,
          currentBooking: null,
          tracking: null,
          error: null,
          loading: false,
        });
      },
    }),
    {
      name: 'delivery-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        sellerDeliveries: state.sellerDeliveries,
        deliveryStats: state.deliveryStats,
      }),
    },
  ),
);
