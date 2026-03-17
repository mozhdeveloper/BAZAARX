/**
 * Delivery Store — Zustand store for delivery/courier management
 * 
 * Buyer: Track deliveries, view shipping rates
 * Seller: Book couriers, manage deliveries, view delivery stats
 */

import { create } from 'zustand';
import { deliveryService } from '@/services/deliveryService';
import type {
  ShippingRateResult,
  DeliveryBooking,
  DeliveryTrackingResult,
  BookDeliveryRequest,
  DeliveryBookingResult,
} from '@/types/delivery.types';
import type { DeliveryBookingStatus } from '@/types/database.types';

// ============================================================================
// Store Types
// ============================================================================

interface DeliveryState {
  // Rate calculation
  shippingRates: ShippingRateResult | null;
  ratesLoading: boolean;

  // Booking
  bookingResult: DeliveryBookingResult | null;
  bookingLoading: boolean;

  // Tracking (buyer + seller)
  activeTracking: DeliveryTrackingResult | null;
  trackingLoading: boolean;

  // Seller dashboard
  sellerDeliveries: DeliveryBooking[];
  sellerDeliveriesLoading: boolean;
  sellerDeliveryStats: {
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    failed: number;
  } | null;

  // Actions — Rates
  getShippingRates: (params: {
    originCity: string;
    originProvince: string;
    destinationCity: string;
    destinationProvince: string;
    weightKg: number;
    declaredValue?: number;
    isCod?: boolean;
  }) => Promise<ShippingRateResult>;

  // Actions — Booking (Seller)
  bookDelivery: (request: BookDeliveryRequest) => Promise<DeliveryBookingResult>;

  // Actions — Tracking (Buyer + Seller)
  trackDelivery: (bookingId: string) => Promise<void>;
  trackByOrderId: (orderId: string) => Promise<void>;
  trackByTrackingNumber: (trackingNumber: string) => Promise<void>;

  // Actions — Seller Dashboard
  loadSellerDeliveries: (sellerId: string, filters?: { status?: DeliveryBookingStatus }) => Promise<void>;
  loadSellerDeliveryStats: (sellerId: string) => Promise<void>;

  // Actions — Status Management
  cancelDelivery: (bookingId: string, reason?: string) => Promise<void>;
  sandboxAdvanceStatus: (bookingId: string) => Promise<DeliveryBookingStatus>;

  // Reset
  clearRates: () => void;
  clearTracking: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useDeliveryStore = create<DeliveryState>()((set) => ({
  // Initial state
  shippingRates: null,
  ratesLoading: false,
  bookingResult: null,
  bookingLoading: false,
  activeTracking: null,
  trackingLoading: false,
  sellerDeliveries: [],
  sellerDeliveriesLoading: false,
  sellerDeliveryStats: null,

  // ── Rate Calculation ──────────────────────────────────────────────────

  getShippingRates: async (params) => {
    set({ ratesLoading: true });
    try {
      const result = await deliveryService.getShippingRates(params);
      set({ shippingRates: result });
      return result;
    } finally {
      set({ ratesLoading: false });
    }
  },

  // ── Booking ───────────────────────────────────────────────────────────

  bookDelivery: async (request) => {
    set({ bookingLoading: true });
    try {
      const result = await deliveryService.bookDelivery(request);
      set({ bookingResult: result });
      return result;
    } finally {
      set({ bookingLoading: false });
    }
  },

  // ── Tracking ──────────────────────────────────────────────────────────

  trackDelivery: async (bookingId) => {
    set({ trackingLoading: true });
    try {
      const result = await deliveryService.getDeliveryTracking(bookingId);
      set({ activeTracking: result });
    } finally {
      set({ trackingLoading: false });
    }
  },

  trackByOrderId: async (orderId) => {
    set({ trackingLoading: true });
    try {
      const result = await deliveryService.getDeliveryByOrderId(orderId);
      set({ activeTracking: result });
    } finally {
      set({ trackingLoading: false });
    }
  },

  trackByTrackingNumber: async (trackingNumber) => {
    set({ trackingLoading: true });
    try {
      const result = await deliveryService.getDeliveryByTrackingNumber(trackingNumber);
      set({ activeTracking: result });
    } finally {
      set({ trackingLoading: false });
    }
  },

  // ── Seller Dashboard ──────────────────────────────────────────────────

  loadSellerDeliveries: async (sellerId, filters) => {
    set({ sellerDeliveriesLoading: true });
    try {
      const deliveries = await deliveryService.getSellerDeliveries(sellerId, filters);
      set({ sellerDeliveries: deliveries });
    } finally {
      set({ sellerDeliveriesLoading: false });
    }
  },

  loadSellerDeliveryStats: async (sellerId) => {
    try {
      const stats = await deliveryService.getSellerDeliveryStats(sellerId);
      set({ sellerDeliveryStats: stats });
    } catch {
      // Non-critical
    }
  },

  // ── Status Management ─────────────────────────────────────────────────

  cancelDelivery: async (bookingId, reason) => {
    await deliveryService.cancelDelivery(bookingId, reason);
  },

  sandboxAdvanceStatus: async (bookingId) => {
    const newStatus = await deliveryService.sandboxAdvanceStatus(bookingId);
    // Refresh tracking
    const result = await deliveryService.getDeliveryTracking(bookingId);
    set({ activeTracking: result });
    return newStatus;
  },

  // ── Reset ─────────────────────────────────────────────────────────────

  clearRates: () => set({ shippingRates: null }),
  clearTracking: () => set({ activeTracking: null }),
}));
