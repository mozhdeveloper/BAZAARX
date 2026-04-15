/**
 * shipping.types.ts
 *
 * BX-09-002 / BX-09-003 — Shared types for shipping method selection and order persistence.
 */

import type { ShippingMethod, ShippingZone, ShippingBreakdown } from '@/services/shippingService';

/**
 * Per-seller selected shipping method state.
 * Stored in CheckoutScreen as: Record<string, SelectedShippingMethod>
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
 * Row shape for the order_shipments table in Supabase.
 * One row per seller per order.
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
