/**
 * shipping.types.ts
 *
 * BX-09-001 / BX-09-002 / BX-09-003 — Shared types for shipping method selection
 * and per-seller order persistence.
 */

export type ShippingZone = 'NCR' | 'Luzon' | 'Visayas' | 'Mindanao';
export type ShippingMethod = 'standard' | 'economy' | 'same_day' | 'bulky';

/**
 * Fee breakdown for a shipping method
 */
export interface ShippingBreakdown {
  baseRate: number;
  weightSurcharge: number;
  valuationFee: number;
  odzFee: number;
  internationalFee: number;
}

/**
 * Single shipping method option available to user
 */
export interface ShippingMethodOption {
  method: ShippingMethod;
  label: string;
  fee: number;
  breakdown: ShippingBreakdown;
  estimatedDays: string;
  originZone: ShippingZone;
  destinationZone: ShippingZone;
}

/**
 * Per-seller shipping calculation result
 */
export interface SellerShippingResult {
  sellerId: string;
  sellerName: string;
  originZone: ShippingZone;
  destinationZone: ShippingZone;
  chargeableWeight: number;
  methods: ShippingMethodOption[];
  defaultMethod: ShippingMethodOption | null;
  error: string | null;
  sellerHasOrigin: boolean;
  warning: string | null;
}

/**
 * Input for calculating shipping for a single seller group
 */
export interface SellerShippingInput {
  sellerId: string;
  sellerName: string;
  sellerCoords: { latitude: number; longitude: number } | null;
  sellerProvince?: string | null;
  sellerRegion?: string | null;
  items: any[];
}

/**
 * Per-seller selected shipping method (stored in state)
 */
export interface SelectedShippingMethod {
  sellerId: string;
  method: ShippingMethod;
  label: string;
  fee: number;
  breakdown: ShippingBreakdown;
  estimatedDays: string;
  originZone: ShippingZone;
  destinationZone: ShippingZone;
}

/**
 * Row shape for order_shipments table (one per seller per order)
 */
export interface OrderShipmentInsert {
  order_id: string;
  seller_id: string;
  shipping_method: ShippingMethod;
  shipping_method_label: string;
  calculated_fee: number;
  fee_breakdown: ShippingBreakdown;
  origin_zone: ShippingZone;
  destination_zone: ShippingZone;
  estimated_days_text: string;
  chargeable_weight_kg: number;
  tracking_number: string | null;
  status: 'pending' | 'shipped' | 'in_transit' | 'delivered';
}
