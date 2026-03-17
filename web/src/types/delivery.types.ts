/**
 * Delivery & Courier Types
 * Philippine courier integration for marketplace
 */

import type {
  CourierCode,
  DeliveryBookingStatus,
  CourierServiceType,
} from './database.types';

// ============================================================================
// Courier Provider Info
// ============================================================================

export interface CourierProvider {
  code: CourierCode;
  name: string;
  logo: string;
  serviceTypes: CourierServiceType[];
  maxWeight: number;          // kg
  codSupported: boolean;
  trackingUrlTemplate: string;
  estimatedDays: { standard: string; express: string };
}

/** Philippines courier providers */
export const PH_COURIERS: Record<CourierCode, CourierProvider> = {
  jnt: {
    code: 'jnt',
    name: 'J&T Express',
    logo: '/couriers/jnt.png',
    serviceTypes: ['standard', 'express'],
    maxWeight: 50,
    codSupported: true,
    trackingUrlTemplate: 'https://www.jtexpress.ph/trajectoryQuery?billcode={tracking}',
    estimatedDays: { standard: '3-5 days', express: '1-3 days' },
  },
  lbc: {
    code: 'lbc',
    name: 'LBC Express',
    logo: '/couriers/lbc.png',
    serviceTypes: ['standard', 'express', 'same_day'],
    maxWeight: 100,
    codSupported: true,
    trackingUrlTemplate: 'https://www.lbcexpress.com/tracking?tracking_no={tracking}',
    estimatedDays: { standard: '3-7 days', express: '1-3 days' },
  },
  flash: {
    code: 'flash',
    name: 'Flash Express',
    logo: '/couriers/flash.png',
    serviceTypes: ['standard', 'express'],
    maxWeight: 50,
    codSupported: true,
    trackingUrlTemplate: 'https://www.flashexpress.ph/tracking?se={tracking}',
    estimatedDays: { standard: '3-5 days', express: '1-2 days' },
  },
  ninjavan: {
    code: 'ninjavan',
    name: 'Ninja Van',
    logo: '/couriers/ninjavan.png',
    serviceTypes: ['standard', 'next_day'],
    maxWeight: 30,
    codSupported: true,
    trackingUrlTemplate: 'https://www.ninjavan.co/en-ph/tracking?id={tracking}',
    estimatedDays: { standard: '3-5 days', express: '1-2 days' },
  },
  grabexpress: {
    code: 'grabexpress',
    name: 'Grab Express',
    logo: '/couriers/grab.png',
    serviceTypes: ['same_day', 'next_day'],
    maxWeight: 20,
    codSupported: false,
    trackingUrlTemplate: '',
    estimatedDays: { standard: 'Same day', express: 'Same day' },
  },
  lalamove: {
    code: 'lalamove',
    name: 'Lalamove',
    logo: '/couriers/lalamove.png',
    serviceTypes: ['same_day', 'express'],
    maxWeight: 300,
    codSupported: false,
    trackingUrlTemplate: '',
    estimatedDays: { standard: 'Same day', express: '1-3 hours' },
  },
};

// ============================================================================
// Rate Calculation
// ============================================================================

export interface ShippingRateRequest {
  originCity: string;
  originProvince: string;
  destinationCity: string;
  destinationProvince: string;
  weightKg: number;
  declaredValue?: number;
  isCod?: boolean;
  codAmount?: number;
}

export interface ShippingRate {
  courierCode: CourierCode;
  courierName: string;
  serviceType: CourierServiceType;
  rate: number;
  estimatedDays: string;
  isCod: boolean;
  insuranceFee: number;
}

export interface ShippingRateResult {
  rates: ShippingRate[];
  cheapest: ShippingRate | null;
  fastest: ShippingRate | null;
}

// ============================================================================
// Delivery Booking
// ============================================================================

export interface BookDeliveryRequest {
  orderId: string;
  sellerId: string;
  buyerId: string;
  courierCode: CourierCode;
  serviceType: CourierServiceType;
  pickup: DeliveryAddress;
  delivery: DeliveryAddress;
  packageDetails: PackageDetails;
  isCod?: boolean;
  codAmount?: number;
  declaredValue?: number;
}

export interface DeliveryAddress {
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  barangay?: string;
  city: string;
  province: string;
  postalCode: string;
  landmark?: string;
  coordinates?: { lat: number; lng: number };
}

export interface PackageDetails {
  weight: number;           // kg
  length?: number;          // cm
  width?: number;           // cm
  height?: number;          // cm
  description: string;
  itemCount: number;
}

export interface DeliveryBookingResult {
  success: boolean;
  bookingId: string;
  bookingReference: string;
  trackingNumber: string;
  waybillUrl?: string;
  estimatedDelivery: string;
  shippingFee: number;
  error?: string;
}

// ============================================================================
// Tracking
// ============================================================================

export interface DeliveryBooking {
  id: string;
  orderId: string;
  sellerId: string;
  buyerId: string;
  courierCode: CourierCode;
  courierName: string;
  serviceType: CourierServiceType;
  bookingReference: string | null;
  trackingNumber: string | null;
  waybillUrl: string | null;
  pickupAddress: DeliveryAddress;
  deliveryAddress: DeliveryAddress;
  packageWeight: number | null;
  packageDimensions: { length: number; width: number; height: number } | null;
  packageDescription: string | null;
  declaredValue: number | null;
  shippingFee: number;
  insuranceFee: number;
  codAmount: number;
  isCod: boolean;
  status: DeliveryBookingStatus;
  bookedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  estimatedDelivery: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryTrackingEvent {
  id: string;
  deliveryBookingId: string;
  status: string;
  description: string | null;
  location: string | null;
  courierStatusCode: string | null;
  eventAt: string;
  createdAt: string;
}

export interface DeliveryTrackingResult {
  booking: DeliveryBooking;
  events: DeliveryTrackingEvent[];
  currentStatus: DeliveryBookingStatus;
  estimatedDelivery: string | null;
  courierTrackingUrl: string | null;
}

// ============================================================================
// Sandbox Simulation
// ============================================================================

/** For sandbox mode: simulate courier responses */
export interface SandboxDeliveryConfig {
  simulateDelay: boolean;
  autoAdvanceStatus: boolean;
  failureRate: number;       // 0-1, percentage of "failed" deliveries
}

export const DEFAULT_SANDBOX_CONFIG: SandboxDeliveryConfig = {
  simulateDelay: false,
  autoAdvanceStatus: true,
  failureRate: 0.05,
};
