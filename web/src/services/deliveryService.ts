/**
 * Delivery Service — Philippine Courier Integration (Sandbox)
 * 
 * Supports: J&T Express, LBC, Flash Express, Ninja Van, Grab Express, Lalamove
 * Provides: Rate calculation, booking, tracking, status updates
 * 
 * In sandbox mode, simulates courier API responses.
 * In production, replace sandbox methods with real courier API calls.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { CourierCode, DeliveryBookingStatus, CourierServiceType } from '@/types/database.types';
import type {
  ShippingRateRequest,
  ShippingRate,
  ShippingRateResult,
  BookDeliveryRequest,
  DeliveryBookingResult,
  DeliveryBooking,
  DeliveryTrackingEvent,
  DeliveryTrackingResult,
  DeliveryAddress,
  CourierProvider,
} from '@/types/delivery.types';
import { PH_COURIERS } from '@/types/delivery.types';

// ============================================================================
// Configuration
// ============================================================================

const IS_SANDBOX = (import.meta.env.VITE_DELIVERY_SANDBOX ?? 'true') === 'true';

// Base rates per courier (PHP per kg, within Metro Manila)
const BASE_RATES: Record<CourierCode, Record<CourierServiceType, number>> = {
  jnt:         { standard: 85,  express: 130, same_day: 0,   next_day: 0 },
  lbc:         { standard: 110, express: 170, same_day: 350, next_day: 0 },
  flash:       { standard: 75,  express: 115, same_day: 0,   next_day: 0 },
  ninjavan:    { standard: 90,  express: 0,   same_day: 0,   next_day: 150 },
  grabexpress: { standard: 0,   express: 0,   same_day: 250, next_day: 200 },
  lalamove:    { standard: 0,   express: 180, same_day: 200, next_day: 0 },
};

// Provincial surcharges
const PROVINCIAL_SURCHARGE: Record<string, number> = {
  'metro_manila': 0,
  'luzon': 30,
  'visayas': 60,
  'mindanao': 80,
};

// Region mapping for major PH cities
const REGION_MAP: Record<string, string> = {
  'manila': 'metro_manila', 'quezon city': 'metro_manila', 'makati': 'metro_manila',
  'taguig': 'metro_manila', 'pasig': 'metro_manila', 'mandaluyong': 'metro_manila',
  'pasay': 'metro_manila', 'paranaque': 'metro_manila', 'las pinas': 'metro_manila',
  'muntinlupa': 'metro_manila', 'caloocan': 'metro_manila', 'valenzuela': 'metro_manila',
  'marikina': 'metro_manila', 'san juan': 'metro_manila', 'navotas': 'metro_manila',
  'malabon': 'metro_manila', 'pateros': 'metro_manila',
  'cebu': 'visayas', 'iloilo': 'visayas', 'bacolod': 'visayas', 'tacloban': 'visayas',
  'davao': 'mindanao', 'cagayan de oro': 'mindanao', 'zamboanga': 'mindanao', 'general santos': 'mindanao',
  'baguio': 'luzon', 'angeles': 'luzon', 'batangas': 'luzon', 'lipa': 'luzon',
  'lucena': 'luzon', 'naga': 'luzon', 'legazpi': 'luzon', 'cabanatuan': 'luzon',
  'dagupan': 'luzon', 'olongapo': 'luzon', 'san fernando': 'luzon',
};

// ============================================================================
// Delivery Service
// ============================================================================

export class DeliveryService {
  private static instance: DeliveryService;

  private constructor() {}

  static getInstance(): DeliveryService {
    if (!DeliveryService.instance) {
      DeliveryService.instance = new DeliveryService();
    }
    return DeliveryService.instance;
  }

  get isSandbox(): boolean {
    return IS_SANDBOX;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Get Available Couriers
  // ──────────────────────────────────────────────────────────────────────────

  getAvailableCouriers(): CourierProvider[] {
    return Object.values(PH_COURIERS);
  }

  getCourierByCode(code: CourierCode): CourierProvider {
    return PH_COURIERS[code];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Rate Calculation
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Calculate shipping rates from all available couriers.
   * Returns sorted rates with cheapest and fastest options highlighted.
   */
  async getShippingRates(request: ShippingRateRequest): Promise<ShippingRateResult> {
    const originRegion = this.getRegion(request.originCity);
    const destRegion = this.getRegion(request.destinationCity);
    const isSameRegion = originRegion === destRegion;

    // Check cached rates first
    const cached = await this.getCachedRates(request);
    if (cached.length > 0) {
      return this.buildRateResult(cached);
    }

    const rates: ShippingRate[] = [];

    for (const [code, courier] of Object.entries(PH_COURIERS)) {
      const courierCode = code as CourierCode;
      const baseRates = BASE_RATES[courierCode];

      for (const serviceType of courier.serviceTypes) {
        const baseRate = baseRates[serviceType];
        if (baseRate === 0) continue; // Service not available for this courier

        // Same-day/express only available within same region
        if ((serviceType === 'same_day' || serviceType === 'express') && !isSameRegion && 
            (courierCode === 'grabexpress' || courierCode === 'lalamove')) {
          continue;
        }

        // Calculate rate
        const weightCharge = baseRate * Math.max(1, Math.ceil(request.weightKg));
        const surcharge = (PROVINCIAL_SURCHARGE[destRegion] || 0) + (PROVINCIAL_SURCHARGE[originRegion] || 0);
        const insuranceFee = request.declaredValue ? Math.max(15, request.declaredValue * 0.01) : 0;
        const rate = Math.round(weightCharge + surcharge + insuranceFee);

        rates.push({
          courierCode,
          courierName: courier.name,
          serviceType,
          rate,
          estimatedDays: this.getEstimatedDays(courierCode, serviceType, isSameRegion),
          isCod: request.isCod ? courier.codSupported : false,
          insuranceFee: Math.round(insuranceFee),
        });
      }
    }

    // Cache the rates
    await this.cacheRates(request, rates);

    return this.buildRateResult(rates);
  }

  private buildRateResult(rates: ShippingRate[]): ShippingRateResult {
    const sorted = [...rates].sort((a, b) => a.rate - b.rate);
    return {
      rates: sorted,
      cheapest: sorted[0] || null,
      fastest: [...rates].sort((a, b) => {
        const aDays = parseInt(a.estimatedDays) || 99;
        const bDays = parseInt(b.estimatedDays) || 99;
        return aDays - bDays;
      })[0] || null,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Book Delivery
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Book a delivery with a courier.
   * In sandbox mode, simulates the booking and generates a tracking number.
   */
  async bookDelivery(request: BookDeliveryRequest): Promise<DeliveryBookingResult> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const courier = PH_COURIERS[request.courierCode];
    if (!courier) throw new Error(`Unknown courier: ${request.courierCode}`);

    // Validate weight
    if (request.packageDetails.weight > courier.maxWeight) {
      throw new Error(`Package exceeds ${courier.name} weight limit of ${courier.maxWeight}kg`);
    }

    // Validate COD
    if (request.isCod && !courier.codSupported) {
      throw new Error(`${courier.name} does not support COD`);
    }

    // Calculate rate
    const rateResult = await this.getShippingRates({
      originCity: request.pickup.city,
      originProvince: request.pickup.province,
      destinationCity: request.delivery.city,
      destinationProvince: request.delivery.province,
      weightKg: request.packageDetails.weight,
      declaredValue: request.declaredValue,
      isCod: request.isCod,
      codAmount: request.codAmount,
    });

    const selectedRate = rateResult.rates.find(
      r => r.courierCode === request.courierCode && r.serviceType === request.serviceType
    );

    const shippingFee = selectedRate?.rate || 0;

    // Book with courier API (sandbox or real)
    const booking = IS_SANDBOX
      ? this.sandboxBookDelivery(request, courier)
      : await this.realBookDelivery(request, courier);

    // Save booking to DB. UPSERT on (order_id, seller_id) — re-clicking "Book
    // Delivery" must update the existing booking, not insert a new row.
    // Enforced by UNIQUE constraint delivery_bookings_order_seller_key (043e).
    const { data: dbBooking, error } = await supabase
      .from('delivery_bookings')
      .upsert({
        order_id: request.orderId,
        seller_id: request.sellerId,
        buyer_id: request.buyerId,
        courier_code: request.courierCode,
        courier_name: courier.name,
        service_type: request.serviceType,
        booking_reference: booking.bookingReference,
        tracking_number: booking.trackingNumber,
        waybill_url: booking.waybillUrl,
        pickup_address: request.pickup,
        delivery_address: request.delivery,
        package_weight: request.packageDetails.weight,
        package_dimensions: request.packageDetails.length ? {
          length: request.packageDetails.length,
          width: request.packageDetails.width,
          height: request.packageDetails.height,
        } : null,
        package_description: request.packageDetails.description,
        declared_value: request.declaredValue,
        shipping_fee: shippingFee,
        insurance_fee: selectedRate?.insuranceFee || 0,
        cod_amount: request.codAmount || 0,
        is_cod: request.isCod || false,
        status: 'booked',
        booked_at: new Date().toISOString(),
        estimated_delivery: booking.estimatedDelivery,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'order_id,seller_id' })
      .select('id')
      .single();

    if (error || !dbBooking) throw new Error(`Failed to save delivery booking: ${error?.message || 'unknown'}`);

    // Add initial tracking event
    await supabase.from('delivery_tracking_events').insert({
      delivery_booking_id: dbBooking.id,
      status: 'booked',
      description: `Package booked with ${courier.name} — ${request.serviceType} service`,
      location: request.pickup.city,
    });

    // Update order shipment tracking
    await supabase
      .from('orders')
      .update({
        shipment_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.orderId);

    // Update the canonical order_shipments row (created at checkout) with
    // tracking info. UPDATE, not INSERT — order_shipments is unique on
    // (order_id, seller_id) per migration 043e and is created at checkout.
    const { error: shipUpdErr } = await supabase
      .from('order_shipments')
      .update({
        tracking_number: booking.trackingNumber,
        status: 'processing',
        shipped_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('order_id', request.orderId)
      .eq('seller_id', request.sellerId);
    if (shipUpdErr) {
      // Non-fatal: booking succeeded; tracking_number sync can be reconciled later.
      console.warn('[deliveryService] order_shipments update failed:', shipUpdErr.message);
    }

    return {
      success: true,
      bookingId: dbBooking.id,
      bookingReference: booking.bookingReference,
      trackingNumber: booking.trackingNumber,
      waybillUrl: booking.waybillUrl,
      estimatedDelivery: booking.estimatedDelivery,
      shippingFee,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Tracking
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get full delivery tracking info with event history.
   * Available to both buyer and seller.
   */
  async getDeliveryTracking(bookingId: string): Promise<DeliveryTrackingResult | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: booking } = await supabase
      .from('delivery_bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (!booking) return null;

    const { data: events } = await supabase
      .from('delivery_tracking_events')
      .select('*')
      .eq('delivery_booking_id', bookingId)
      .order('event_at', { ascending: false });

    const courier = PH_COURIERS[booking.courier_code as CourierCode];
    const trackingUrl = courier?.trackingUrlTemplate?.replace('{tracking}', booking.tracking_number || '') || null;

    return {
      booking: this.transformBooking(booking),
      events: (events || []).map(this.transformEvent),
      currentStatus: booking.status,
      estimatedDelivery: booking.estimated_delivery,
      courierTrackingUrl: trackingUrl,
    };
  }

  /**
   * Get tracking by order ID (convenience for buyer view)
   */
  async getDeliveryByOrderId(orderId: string): Promise<DeliveryTrackingResult | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: booking } = await supabase
      .from('delivery_bookings')
      .select('id')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!booking) return null;
    return this.getDeliveryTracking(booking.id);
  }

  /**
   * Get tracking by tracking number
   */
  async getDeliveryByTrackingNumber(trackingNumber: string): Promise<DeliveryTrackingResult | null> {
    if (!isSupabaseConfigured()) return null;

    const { data: booking } = await supabase
      .from('delivery_bookings')
      .select('id')
      .eq('tracking_number', trackingNumber)
      .single();

    if (!booking) return null;
    return this.getDeliveryTracking(booking.id);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // SELLER: View Deliveries
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Get all delivery bookings for a seller
   */
  async getSellerDeliveries(
    sellerId: string,
    filters?: { status?: DeliveryBookingStatus; limit?: number },
  ): Promise<DeliveryBooking[]> {
    if (!isSupabaseConfigured()) return [];

    let query = supabase
      .from('delivery_bookings')
      .select('*')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query.limit(filters?.limit || 50);
    if (error || !data) return [];

    return data.map(this.transformBooking);
  }

  /**
   * Get delivery stats for seller dashboard
   */
  async getSellerDeliveryStats(sellerId: string): Promise<{
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    failed: number;
  }> {
    if (!isSupabaseConfigured()) {
      return { total: 0, pending: 0, inTransit: 0, delivered: 0, failed: 0 };
    }

    const { data } = await supabase
      .from('delivery_bookings')
      .select('status')
      .eq('seller_id', sellerId);

    if (!data) return { total: 0, pending: 0, inTransit: 0, delivered: 0, failed: 0 };

    return {
      total: data.length,
      pending: data.filter(d => ['pending', 'booked', 'pickup_scheduled'].includes(d.status)).length,
      inTransit: data.filter(d => ['picked_up', 'in_transit', 'out_for_delivery'].includes(d.status)).length,
      delivered: data.filter(d => d.status === 'delivered').length,
      failed: data.filter(d => ['failed', 'returned_to_sender'].includes(d.status)).length,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Status Updates (webhook simulation in sandbox)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Update delivery status (called by webhook or manual update).
   * Syncs with order shipment_status.
   */
  async updateDeliveryStatus(
    bookingId: string,
    newStatus: DeliveryBookingStatus,
    description?: string,
    location?: string,
  ): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const now = new Date().toISOString();
    const update: Record<string, string> = { status: newStatus, updated_at: now };

    if (newStatus === 'picked_up') update.picked_up_at = now;
    if (newStatus === 'delivered') update.delivered_at = now;

    await supabase
      .from('delivery_bookings')
      .update(update)
      .eq('id', bookingId);

    // Add tracking event
    await supabase.from('delivery_tracking_events').insert({
      delivery_booking_id: bookingId,
      status: newStatus,
      description: description || this.getStatusDescription(newStatus),
      location,
      event_at: now,
    });

    // Sync with order shipment_status
    const { data: booking } = await supabase
      .from('delivery_bookings')
      .select('order_id')
      .eq('id', bookingId)
      .single();

    if (booking?.order_id) {
      const orderStatus = this.mapToOrderShipmentStatus(newStatus);
      if (orderStatus) {
        await supabase
          .from('orders')
          .update({ shipment_status: orderStatus, updated_at: now })
          .eq('id', booking.order_id);

        await supabase.from('order_status_history').insert({
          order_id: booking.order_id,
          status: `delivery_${newStatus}`,
          note: description || this.getStatusDescription(newStatus),
          changed_by_role: 'system',
        });
      }
    }
  }

  /**
   * Sandbox: Advance delivery to next status (for testing)
   */
  async sandboxAdvanceStatus(bookingId: string): Promise<DeliveryBookingStatus> {
    if (!IS_SANDBOX) throw new Error('Only available in sandbox mode');

    const { data: booking } = await supabase
      .from('delivery_bookings')
      .select('status, courier_code, pickup_address, delivery_address')
      .eq('id', bookingId)
      .single();

    if (!booking) throw new Error('Booking not found');

    const pickup = booking.pickup_address as DeliveryAddress;
    const delivery = booking.delivery_address as DeliveryAddress;

    const statusFlow: DeliveryBookingStatus[] = [
      'booked', 'pickup_scheduled', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered',
    ];

    const currentIdx = statusFlow.indexOf(booking.status);
    if (currentIdx === -1 || currentIdx >= statusFlow.length - 1) {
      throw new Error(`Cannot advance from status: ${booking.status}`);
    }

    const nextStatus = statusFlow[currentIdx + 1];
    const locations: Record<string, string> = {
      pickup_scheduled: pickup.city,
      picked_up: pickup.city,
      in_transit: `${PH_COURIERS[booking.courier_code as CourierCode]?.name || ''} Hub`,
      out_for_delivery: delivery.city,
      delivered: delivery.city,
    };

    await this.updateDeliveryStatus(
      bookingId,
      nextStatus,
      this.getStatusDescription(nextStatus),
      locations[nextStatus],
    );

    return nextStatus;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Cancel Delivery
  // ──────────────────────────────────────────────────────────────────────────

  async cancelDelivery(bookingId: string, reason?: string): Promise<void> {
    if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

    const { data: booking } = await supabase
      .from('delivery_bookings')
      .select('status, order_id')
      .eq('id', bookingId)
      .single();

    if (!booking) throw new Error('Booking not found');

    const cancellableStatuses: DeliveryBookingStatus[] = ['pending', 'booked', 'pickup_scheduled'];
    if (!cancellableStatuses.includes(booking.status as DeliveryBookingStatus)) {
      throw new Error('Cannot cancel delivery after pickup');
    }

    await this.updateDeliveryStatus(bookingId, 'cancelled', reason || 'Delivery cancelled');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  private getRegion(city: string): string {
    const normalized = city.toLowerCase().trim();
    return REGION_MAP[normalized] || 'luzon'; // Default to luzon if unknown
  }

  private getEstimatedDays(courier: CourierCode, service: CourierServiceType, sameRegion: boolean): string {
    if (service === 'same_day') return 'Same day';
    if (service === 'express') return sameRegion ? '1-2 days' : '2-3 days';
    if (service === 'next_day') return '1-2 days';
    return sameRegion ? '2-3 days' : '3-7 days'; // standard
  }

  private getStatusDescription(status: DeliveryBookingStatus): string {
    const descriptions: Record<DeliveryBookingStatus, string> = {
      pending: 'Delivery booking created',
      booked: 'Delivery booked with courier',
      pickup_scheduled: 'Courier pickup scheduled',
      picked_up: 'Package picked up by courier',
      in_transit: 'Package is in transit to destination',
      out_for_delivery: 'Package is out for delivery',
      delivered: 'Package delivered successfully',
      failed: 'Delivery attempt failed',
      returned_to_sender: 'Package returned to sender',
      cancelled: 'Delivery cancelled',
    };
    return descriptions[status] || status;
  }

  private mapToOrderShipmentStatus(deliveryStatus: DeliveryBookingStatus): string | null {
    const map: Record<string, string> = {
      booked: 'processing',
      pickup_scheduled: 'ready_to_ship',
      picked_up: 'shipped',
      in_transit: 'shipped',
      out_for_delivery: 'out_for_delivery',
      delivered: 'delivered',
      failed: 'failed_to_deliver',
      returned_to_sender: 'returned',
    };
    return map[deliveryStatus] || null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Sandbox Booking Simulation
  // ──────────────────────────────────────────────────────────────────────────

  private sandboxBookDelivery(
    request: BookDeliveryRequest,
    _courier: CourierProvider,
  ): { bookingReference: string; trackingNumber: string; waybillUrl: string; estimatedDelivery: string } {
    const prefix = request.courierCode.toUpperCase();
    const ref = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
    const tracking = `${prefix}${Date.now().toString().slice(-10)}PH`;

    const estimatedDays = request.serviceType === 'same_day' ? 0
      : request.serviceType === 'express' ? 2
      : request.serviceType === 'next_day' ? 1
      : 5;

    const est = new Date();
    est.setDate(est.getDate() + estimatedDays);

    return {
      bookingReference: ref,
      trackingNumber: tracking,
      waybillUrl: `/sandbox/waybill/${tracking}.pdf`,
      estimatedDelivery: est.toISOString(),
    };
  }

  private async realBookDelivery(
    _request: BookDeliveryRequest,
    _courier: CourierProvider,
  ): Promise<{ bookingReference: string; trackingNumber: string; waybillUrl: string; estimatedDelivery: string }> {
    // Production: Call real courier APIs here
    // Each courier has its own API format:
    // - J&T: https://jet.co.id/api-document
    // - LBC: https://developers.lbc.ph/
    // - Flash: https://api.flashexpress.ph/
    // - Ninja Van: https://api-docs.ninjavan.co/
    throw new Error('Real courier API integration not yet configured. Use sandbox mode.');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Rate Caching
  // ──────────────────────────────────────────────────────────────────────────

  private async getCachedRates(request: ShippingRateRequest): Promise<ShippingRate[]> {
    if (!isSupabaseConfigured()) return [];

    const { data } = await supabase
      .from('courier_rate_cache')
      .select('*')
      .eq('origin_city', request.originCity.toLowerCase())
      .eq('destination_city', request.destinationCity.toLowerCase())
      .eq('weight_kg', Math.ceil(request.weightKg))
      .gt('expires_at', new Date().toISOString());

    if (!data || data.length === 0) return [];

    return data.map((r: any) => ({
      courierCode: r.courier_code,
      courierName: PH_COURIERS[r.courier_code as CourierCode]?.name || r.courier_code,
      serviceType: r.service_type,
      rate: Number(r.rate),
      estimatedDays: `${r.estimated_days || '3-5'} days`,
      isCod: false,
      insuranceFee: 0,
    }));
  }

  private async cacheRates(request: ShippingRateRequest, rates: ShippingRate[]): Promise<void> {
    if (!isSupabaseConfigured() || rates.length === 0) return;

    const rows = rates.map(r => ({
      courier_code: r.courierCode,
      origin_city: request.originCity.toLowerCase(),
      destination_city: request.destinationCity.toLowerCase(),
      weight_kg: Math.ceil(request.weightKg),
      service_type: r.serviceType,
      rate: r.rate,
      estimated_days: parseInt(r.estimatedDays) || null,
    }));

    await supabase.from('courier_rate_cache').insert(rows);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Transform DB rows → typed objects
  // ──────────────────────────────────────────────────────────────────────────

  private transformBooking(row: any): DeliveryBooking {
    return {
      id: row.id,
      orderId: row.order_id,
      sellerId: row.seller_id,
      buyerId: row.buyer_id,
      courierCode: row.courier_code,
      courierName: row.courier_name,
      serviceType: row.service_type,
      bookingReference: row.booking_reference,
      trackingNumber: row.tracking_number,
      waybillUrl: row.waybill_url,
      pickupAddress: row.pickup_address,
      deliveryAddress: row.delivery_address,
      packageWeight: row.package_weight ? Number(row.package_weight) : null,
      packageDimensions: row.package_dimensions,
      packageDescription: row.package_description,
      declaredValue: row.declared_value ? Number(row.declared_value) : null,
      shippingFee: Number(row.shipping_fee),
      insuranceFee: Number(row.insurance_fee),
      codAmount: Number(row.cod_amount),
      isCod: row.is_cod,
      status: row.status,
      bookedAt: row.booked_at,
      pickedUpAt: row.picked_up_at,
      deliveredAt: row.delivered_at,
      estimatedDelivery: row.estimated_delivery,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private transformEvent(row: any): DeliveryTrackingEvent {
    return {
      id: row.id,
      deliveryBookingId: row.delivery_booking_id,
      status: row.status,
      description: row.description,
      location: row.location,
      courierStatusCode: row.courier_status_code,
      eventAt: row.event_at,
      createdAt: row.created_at,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const deliveryService = DeliveryService.getInstance();
