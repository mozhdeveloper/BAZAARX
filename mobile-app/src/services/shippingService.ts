/**
 * shippingService.ts
 *
 * BX-09-001 — Dynamic Shipping Fee Calculation
 *
 * Coordinate-based zone detection (react-native-maps coordinates) + J&T Express
 * math model. All business constants are fetched from the `shipping_config` and
 * `shipping_zones` Supabase tables at runtime — nothing is hardcoded in this file
 * except the geographic bounding boxes used for zone detection, which are physical
 * constants and not business configuration.
 *
 * Math model:
 *   Wv  = (L × W × H) / volumetric_divisor          (volumetric weight, cm³)
 *   Wc  = ceil(max(actual_weight, Wv))               (chargeable weight, kg)
 *   Sw  = max(0, Wc − 1) × per_kg_increment          (weight surcharge)
 *   Fv  = total_item_value × insurance_rate           (valuation / insurance fee)
 *   Fee = base_rate + Sw + Fv + odz_fee              (total per-method fee)
 */

import { supabase } from '@/lib/supabase';
import type { CartItem } from '../types';

// ---------------------------------------------------------------------------
// Zone types
// ---------------------------------------------------------------------------

export type ShippingZone = 'NCR' | 'Luzon' | 'Visayas' | 'Mindanao';
export type ShippingMethod = 'standard' | 'economy' | 'same_day' | 'bulky';

// ---------------------------------------------------------------------------
// Philippine island-group bounding boxes (geographic constants, NOT config)
// Source: approximate island-group extents used for logistics zone classification
// ---------------------------------------------------------------------------

const PH_BOUNDS = { minLat: 4.5, maxLat: 21.2, minLng: 116.9, maxLng: 126.6 };

const ZONE_BOUNDS: Record<ShippingZone, { minLat: number; maxLat: number; minLng: number; maxLng: number }[]> = {
    NCR: [
        // Metro Manila (NCR)
        { minLat: 14.35, maxLat: 14.78, minLng: 120.90, maxLng: 121.15 },
    ],
    // Luzon = Luzon island group excluding NCR bounding boxes
    Luzon: [
        { minLat: 12.00, maxLat: 21.20, minLng: 116.90, maxLng: 124.20 },
    ],
    Visayas: [
        { minLat: 9.00, maxLat: 12.50, minLng: 121.80, maxLng: 126.60 },
    ],
    Mindanao: [
        { minLat: 4.50, maxLat: 9.80, minLng: 118.00, maxLng: 127.00 },
    ],
};

/**
 * Resolve a Philippine shipping zone from GPS coordinates.
 *
 * Returns null when coordinates fall outside the Philippine bounding box
 * (used for serviceability check in BX-09-004).
 *
 * Zone priority: NCR → Visayas → Mindanao → Luzon (Luzon is the largest, so
 * match it last to avoid false positives in the southern regions).
 */
export function getZoneFromCoords(
    latitude: number,
    longitude: number,
): ShippingZone | null {
    // First check if within PH at all
    if (
        latitude < PH_BOUNDS.minLat || latitude > PH_BOUNDS.maxLat ||
        longitude < PH_BOUNDS.minLng || longitude > PH_BOUNDS.maxLng
    ) {
        return null;
    }

    const inBox = (lat: number, lng: number, boxes: typeof ZONE_BOUNDS[ShippingZone]) =>
        boxes.some(b => lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng);

    if (inBox(latitude, longitude, ZONE_BOUNDS.NCR)) return 'NCR';
    if (inBox(latitude, longitude, ZONE_BOUNDS.Visayas)) return 'Visayas';
    if (inBox(latitude, longitude, ZONE_BOUNDS.Mindanao)) return 'Mindanao';
    if (inBox(latitude, longitude, ZONE_BOUNDS.Luzon)) return 'Luzon';

    // Within PH bounds but no specific zone matched — default to Luzon
    return 'Luzon';
}

/**
 * String-based fallback for when GPS coordinates are unavailable (legacy data).
 * Used when seller hasn't pinned location or buyer address has no coordinates.
 */
export function getZoneFromText(province: string | null, region: string | null): ShippingZone {
    const text = `${province ?? ''} ${region ?? ''}`.toLowerCase();

    const ncrKeywords = ['metro manila', 'ncr', 'national capital', 'manila', 'quezon city',
        'makati', 'pasig', 'taguig', 'mandaluyong', 'marikina', 'caloocan',
        'malabon', 'navotas', 'valenzuela', 'las piñas', 'las pinas',
        'muntinlupa', 'parañaque', 'paranaque', 'pasay', 'pateros', 'san juan'];
    const visayasKeywords = ['cebu', 'bohol', 'leyte', 'samar', 'negros', 'iloilo', 'capiz',
        'aklan', 'antique', 'guimaras', 'biliran', 'western visayas',
        'central visayas', 'eastern visayas'];
    const mindanaoKeywords = ['davao', 'mindanao', 'cagayan de oro', 'zamboanga', 'cotabato',
        'general santos', 'bukidnon', 'lanao', 'maguindanao', 'sultan kudarat',
        'north cotabato', 'south cotabato', 'sarangani', 'misamis', 'camiguin',
        'agusan', 'surigao', 'basilan', 'sulu', 'tawi-tawi', 'soccsksargen',
        'caraga', 'barmm', 'armm'];

    if (ncrKeywords.some(k => text.includes(k))) return 'NCR';
    if (visayasKeywords.some(k => text.includes(k))) return 'Visayas';
    if (mindanaoKeywords.some(k => text.includes(k))) return 'Mindanao';
    return 'Luzon';
}

// ---------------------------------------------------------------------------
// DB types
// ---------------------------------------------------------------------------

interface ShippingConfigRow {
    volumetric_divisor: number;
    per_kg_increment: number;
    insurance_rate: number;
    free_shipping_threshold: number;
    bulky_weight_threshold: number;
    same_day_zones: string[];
}

interface ShippingZoneRow {
    origin_zone: string;
    destination_zone: string;
    shipping_method: string;
    base_rate: number;
    odz_fee: number;
    estimated_days_min: number;
    estimated_days_max: number;
}

// ---------------------------------------------------------------------------
// In-memory cache (1 per session)
// ---------------------------------------------------------------------------

let _configCache: ShippingConfigRow | null = null;
let _configCacheTime = 0;
const CONFIG_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function fetchShippingConfig(): Promise<ShippingConfigRow> {
    const now = Date.now();
    if (_configCache && now - _configCacheTime < CONFIG_TTL_MS) {
        return _configCache;
    }

    const { data, error } = await supabase
        .from('shipping_config')
        .select('*')
        .limit(1)
        .single();

    if (error || !data) {
        // Fallback defaults — only used when DB table hasn't been created yet
        console.warn('[shippingService] shipping_config not available, using defaults');
        return {
            volumetric_divisor: 3500,
            per_kg_increment: 15,
            insurance_rate: 0.01,
            free_shipping_threshold: 0,
            bulky_weight_threshold: 50,
            same_day_zones: ['NCR'],
        };
    }

    _configCache = data as ShippingConfigRow;
    _configCacheTime = now;
    return _configCache;
}

async function fetchShippingZones(
    originZone: ShippingZone,
    destinationZone: ShippingZone,
): Promise<ShippingZoneRow[]> {
    const { data, error } = await supabase
        .from('shipping_zones')
        .select('*')
        .eq('origin_zone', originZone)
        .eq('destination_zone', destinationZone);

    if (error || !data || data.length === 0) {
        console.warn(`[shippingService] No zones found for ${originZone}→${destinationZone}`);
        return [];
    }
    return data as ShippingZoneRow[];
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ShippingBreakdown {
    baseRate: number;        // from shipping_zones.base_rate
    weightSurcharge: number; // Sw = max(0, Wc−1) × per_kg_increment
    valuationFee: number;    // Fv = total_item_value × insurance_rate
    odzFee: number;          // from shipping_zones.odz_fee
}

export interface ShippingMethodOption {
    method: ShippingMethod;
    label: string;
    fee: number;
    breakdown: ShippingBreakdown;
    estimatedDays: string;
    originZone: ShippingZone;
    destinationZone: ShippingZone;
}

export interface SellerShippingResult {
    sellerId: string;
    sellerName: string;
    originZone: ShippingZone;
    destinationZone: ShippingZone;
    chargeableWeight: number;  // Wc, in kg
    methods: ShippingMethodOption[];
    defaultMethod: ShippingMethodOption | null;
    error: string | null;
}

export interface SellerShippingInput {
    sellerId: string;
    sellerName: string;
    /** GPS coords from sellers.shipping_origin_lat/lng (react-native-maps) */
    sellerCoords: { latitude: number; longitude: number } | null;
    sellerProvince?: string | null;
    sellerRegion?: string | null;
    items: CartItem[];
}

// ---------------------------------------------------------------------------
// Calculation helpers
// ---------------------------------------------------------------------------

function computeChargeableWeight(
    items: CartItem[],
    volumetricDivisor: number,
): number {
    let totalActual = 0;
    let totalVolumetric = 0;

    for (const item of items) {
        const qty = item.quantity ?? 1;
        const w = (item as any).weight ?? 0.5; // kg, fallback 0.5
        const l = (item as any).length_cm ?? 0;
        const b = (item as any).width_cm ?? 0;
        const h = (item as any).height_cm ?? 0;

        totalActual += w * qty;

        if (l > 0 && b > 0 && h > 0) {
            totalVolumetric += (l * b * h * qty) / volumetricDivisor;
        }
    }

    // Chargeable weight = ceil(max(actual, volumetric))
    return Math.ceil(Math.max(totalActual, totalVolumetric));
}

function computeTotalItemValue(items: CartItem[]): number {
    return items.reduce((sum, i) => sum + (i.price ?? 0) * (i.quantity ?? 1), 0);
}

const METHOD_LABELS: Record<ShippingMethod, string> = {
    standard: 'J&T Standard',
    economy: 'J&T Economy',
    same_day: 'J&T Same-Day',
    bulky: 'J&T Freight (Bulky)',
};

function buildMethodOption(
    row: ShippingZoneRow,
    chargeableWeight: number,
    totalValue: number,
    config: ShippingConfigRow,
    originZone: ShippingZone,
    destinationZone: ShippingZone,
): ShippingMethodOption {
    const Sw = Math.max(0, chargeableWeight - 1) * config.per_kg_increment;
    const Fv = totalValue * config.insurance_rate;
    const fee = Math.round(row.base_rate + Sw + Fv + row.odz_fee);

    const daysMin = row.estimated_days_min;
    const daysMax = row.estimated_days_max;
    const estimatedDays = daysMin === 0 && daysMax === 0
        ? 'Today'
        : daysMin === daysMax
            ? `${daysMin} day${daysMin !== 1 ? 's' : ''}`
            : `${daysMin}–${daysMax} days`;

    return {
        method: row.shipping_method as ShippingMethod,
        label: METHOD_LABELS[row.shipping_method as ShippingMethod] ?? row.shipping_method,
        fee,
        breakdown: {
            baseRate: row.base_rate,
            weightSurcharge: parseFloat(Sw.toFixed(2)),
            valuationFee: parseFloat(Fv.toFixed(2)),
            odzFee: row.odz_fee,
        },
        estimatedDays,
        originZone,
        destinationZone,
    };
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Calculate dynamic shipping fees for multiple seller groups.
 *
 * @param sellerInputs  - One entry per seller group from the checkout
 * @param buyerCoords   - Buyer's GPS coordinates (from shipping_addresses.coordinates)
 * @param buyerProvince - Fallback province string (used when coords are null)
 * @param buyerRegion   - Fallback region string  (used when coords are null)
 */
export async function calculateShippingForSellers(
    sellerInputs: SellerShippingInput[],
    buyerCoords: { latitude: number; longitude: number } | null,
    buyerProvince?: string | null,
    buyerRegion?: string | null,
): Promise<SellerShippingResult[]> {
    // Resolve buyer destination zone once (shared across all sellers)
    const destinationZone: ShippingZone = buyerCoords
        ? (getZoneFromCoords(buyerCoords.latitude, buyerCoords.longitude) ?? getZoneFromText(buyerProvince ?? null, buyerRegion ?? null))
        : getZoneFromText(buyerProvince ?? null, buyerRegion ?? null);

    // Fetch config once for all sellers
    const config = await fetchShippingConfig();

    const results: SellerShippingResult[] = [];

    for (const input of sellerInputs) {
        try {
            // Resolve seller origin zone
            const originZone: ShippingZone = input.sellerCoords
                ? (getZoneFromCoords(input.sellerCoords.latitude, input.sellerCoords.longitude) ?? getZoneFromText(input.sellerProvince ?? null, input.sellerRegion ?? null))
                : getZoneFromText(input.sellerProvince ?? null, input.sellerRegion ?? null);

            const chargeableWeight = computeChargeableWeight(input.items, config.volumetric_divisor);
            const totalValue = computeTotalItemValue(input.items);

            // Fetch rate rows for this zone pair
            const zoneRows = await fetchShippingZones(originZone, destinationZone);

            if (zoneRows.length === 0) {
                // DB not seeded yet — graceful fallback
                results.push({
                    sellerId: input.sellerId,
                    sellerName: input.sellerName,
                    originZone,
                    destinationZone,
                    chargeableWeight,
                    methods: [],
                    defaultMethod: null,
                    error: 'Shipping rates unavailable for this route. Please try again later.',
                });
                continue;
            }

            // Build method options, filtering by eligibility
            const methods: ShippingMethodOption[] = [];

            for (const row of zoneRows) {
                const method = row.shipping_method as ShippingMethod;

                // Same-day: only when both zones are in same_day_zones
                if (method === 'same_day') {
                    const eligibleZones = config.same_day_zones;
                    if (!eligibleZones.includes(originZone) || !eligibleZones.includes(destinationZone)) {
                        continue;
                    }
                }

                // Bulky: only when chargeable weight >= threshold
                if (method === 'bulky') {
                    if (chargeableWeight < config.bulky_weight_threshold) {
                        continue;
                    }
                }

                methods.push(buildMethodOption(row, chargeableWeight, totalValue, config, originZone, destinationZone));
            }

            // Sort: standard first, then economy, same_day, bulky
            const ORDER: ShippingMethod[] = ['standard', 'economy', 'same_day', 'bulky'];
            methods.sort((a, b) => ORDER.indexOf(a.method) - ORDER.indexOf(b.method));

            results.push({
                sellerId: input.sellerId,
                sellerName: input.sellerName,
                originZone,
                destinationZone,
                chargeableWeight,
                methods,
                defaultMethod: methods[0] ?? null,
                error: null,
            });
        } catch (err: any) {
            console.error(`[shippingService] Error for seller ${input.sellerId}:`, err.message);
            results.push({
                sellerId: input.sellerId,
                sellerName: input.sellerName,
                originZone: 'Luzon',
                destinationZone,
                chargeableWeight: 0,
                methods: [],
                defaultMethod: null,
                error: err.message ?? 'Shipping calculation failed.',
            });
        }
    }

    return results;
}
