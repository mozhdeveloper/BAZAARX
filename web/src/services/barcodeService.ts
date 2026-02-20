/**
 * Barcode Service - Database Integration
 * Handles barcode lookup, generation, and scan logging for Bazaar POS
 */

import { supabase } from '@/lib/supabase';
import type { POSBarcodeLookupResult } from '@/hooks/useBarcodeScanner';

// ============================================================================
// TYPES
// ============================================================================

export type BarcodeFormat = 'EAN-13' | 'EAN-8' | 'CODE128' | 'CODE39' | 'ITF' | 'QR';

export type ScanSource = 'pos' | 'inventory' | 'receiving' | 'manual';

export type ScannerType = 'hardware' | 'camera' | 'manual';

export interface BarcodeScanLog {
  id: string;
  vendorId: string;
  productId: string | null;
  variantId: string | null;
  barcodeValue: string;
  isSuccessful: boolean;
  errorMessage: string | null;
  scanSource: ScanSource;
  orderId: string | null;
  scannerType: ScannerType;
  scanTimestamp: string;
}

export interface BarcodeScanStats {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  successRate: number;
  topScannedProducts: Array<{
    productId: string;
    productName: string;
    scanCount: number;
  }>;
  scansByDay: Array<{
    date: string;
    count: number;
  }>;
}

export interface ProductBarcodeLookup {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  vendorId: string;
  categoryId: string;
  primaryImageUrl: string | null;
  stock: number;
}

export interface VariantBarcodeLookup {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  thumbnailUrl: string | null;
}

// ============================================================================
// BARCODE LOOKUP FUNCTIONS
// ============================================================================

/**
 * Quick barcode lookup for POS - no logging, faster response
 * Searches product_variants by barcode, then by SKU
 */
export async function lookupBarcodeQuick(
  vendorId: string,
  barcode: string
): Promise<POSBarcodeLookupResult> {
  const notFound: POSBarcodeLookupResult = {
    type: null,
    id: null,
    name: null,
    price: null,
    stock: null,
    imageUrl: null,
    isFound: false,
  };

  if (!vendorId || !barcode) {
    return notFound;
  }

  const normalizedBarcode = barcode.trim().toUpperCase();

  try {
    // First, search product_variants by barcode
    // Use two-step query to avoid PostgREST nested filter issues
    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select(`
        id,
        product_id,
        variant_name,
        sku,
        barcode,
        price,
        stock,
        thumbnail_url
      `)
      .eq('barcode', normalizedBarcode);

    if (!variantError && variants && variants.length > 0) {
      // Check if this variant belongs to the seller's product
      for (const variant of variants) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, seller_id, deleted_at')
          .eq('id', variant.product_id)
          .eq('seller_id', vendorId)
          .is('deleted_at', null)
          .single();

        if (product) {
          return {
            type: 'variant',
            id: variant.id,
            name: product.name,
            variantName: variant.variant_name,
            productId: variant.product_id,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            imageUrl: variant.thumbnail_url,
            isFound: true,
          };
        }
      }
    }

    // Second, search product_variants by SKU
    const { data: variantsBySku, error: skuError } = await supabase
      .from('product_variants')
      .select(`
        id,
        product_id,
        variant_name,
        sku,
        barcode,
        price,
        stock,
        thumbnail_url
      `)
      .eq('sku', normalizedBarcode);

    if (!skuError && variantsBySku && variantsBySku.length > 0) {
      for (const variantBySku of variantsBySku) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, seller_id, deleted_at')
          .eq('id', variantBySku.product_id)
          .eq('seller_id', vendorId)
          .is('deleted_at', null)
          .single();

        if (product) {
          return {
            type: 'variant',
            id: variantBySku.id,
            name: product.name,
            variantName: variantBySku.variant_name,
            productId: variantBySku.product_id,
            sku: variantBySku.sku,
            price: variantBySku.price,
            stock: variantBySku.stock,
            imageUrl: variantBySku.thumbnail_url,
            isFound: true,
          };
        }
      }
    }

    // Third, search products by SKU (for products without variants)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, sku, price, seller_id')
      .eq('sku', normalizedBarcode)
      .eq('seller_id', vendorId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!productError && product) {
      // Get primary image separately to avoid nested query issues
      let imageUrl: string | null = null;
      try {
        const { data: imageData } = await supabase
          .from('product_images')
          .select('image_url')
          .eq('product_id', product.id)
          .eq('is_primary', true)
          .maybeSingle();
        imageUrl = imageData?.image_url || null;
      } catch {
        // Ignore image fetch errors
      }

      return {
        type: 'product',
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        stock: 0, // Products without variants - check inventory separately
        imageUrl,
        isFound: true,
      };
    }

    return notFound;
  } catch (error) {
    console.error('[BarcodeService] Lookup error:', error);
    return notFound;
  }
}

/**
 * Full barcode lookup with logging for analytics
 */
export async function lookupBarcode(
  vendorId: string,
  barcode: string,
  scanSource: ScanSource = 'pos',
  orderId?: string,
  scannerType: ScannerType = 'hardware'
): Promise<POSBarcodeLookupResult> {
  const startTime = Date.now();
  const result = await lookupBarcodeQuick(vendorId, barcode);
  const scanDuration = Date.now() - startTime;

  // Log the scan
  await logBarcodeScan({
    vendorId,
    barcodeValue: barcode,
    productId: result.type === 'product' ? result.id : result.productId || null,
    variantId: result.type === 'variant' ? result.id : null,
    isSuccessful: result.isFound,
    errorMessage: result.isFound ? null : 'Barcode not found',
    scanSource,
    orderId: orderId || null,
    scannerType,
    scanDurationMs: scanDuration,
  });

  return result;
}

// ============================================================================
// SCAN LOGGING
// ============================================================================

interface LogScanParams {
  vendorId: string;
  barcodeValue: string;
  productId: string | null;
  variantId: string | null;
  isSuccessful: boolean;
  errorMessage: string | null;
  scanSource: ScanSource;
  orderId: string | null;
  scannerType: ScannerType;
  scanDurationMs?: number;
}

/**
 * Log a barcode scan to the database
 */
export async function logBarcodeScan(params: LogScanParams): Promise<void> {
  try {
    const { error } = await supabase.from('barcode_scans').insert({
      vendor_id: params.vendorId,
      barcode_value: params.barcodeValue,
      product_id: params.productId,
      variant_id: params.variantId,
      is_successful: params.isSuccessful,
      error_message: params.errorMessage,
      scan_source: params.scanSource,
      order_id: params.orderId,
      scanner_type: params.scannerType,
      scan_duration_ms: params.scanDurationMs,
      scan_timestamp: new Date().toISOString(),
    });

    if (error) {
      // Don't throw - logging failures shouldn't break POS
      console.warn('[BarcodeService] Failed to log scan:', error);
    }
  } catch (error) {
    console.warn('[BarcodeService] Exception logging scan:', error);
  }
}

// ============================================================================
// BARCODE GENERATION
// ============================================================================

/**
 * Generate a unique barcode for a product variant
 * Format: BC + seller_prefix(4) + sequential(8)
 */
export function generateProductBarcode(
  vendorId: string,
  variantId: string,
  format: BarcodeFormat = 'CODE128'
): string {
  // Extract first 4 chars from seller ID (hex)
  const sellerPrefix = vendorId.replace(/-/g, '').slice(0, 4).toUpperCase();
  
  // Extract 8 chars from variant ID
  const variantSuffix = variantId.replace(/-/g, '').slice(0, 8).toUpperCase();
  
  if (format === 'EAN-13') {
    // EAN-13 needs exactly 12 digits + check digit
    const digits = (sellerPrefix + variantSuffix).replace(/[^0-9]/g, '').slice(0, 12).padStart(12, '0');
    const checkDigit = calculateEAN13CheckDigit(digits);
    return digits + checkDigit;
  }
  
  return `BC${sellerPrefix}${variantSuffix}`;
}

/**
 * Calculate EAN-13 check digit
 */
function calculateEAN13CheckDigit(digits: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(digits[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit.toString();
}

/**
 * Save a generated barcode to a variant
 */
export async function saveVariantBarcode(
  variantId: string,
  barcode: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('product_variants')
      .update({ 
        barcode: barcode,
        updated_at: new Date().toISOString()
      })
      .eq('id', variantId);

    if (error) {
      console.error('[BarcodeService] Failed to save barcode:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[BarcodeService] Exception saving barcode:', error);
    return false;
  }
}

/**
 * Generate and save barcode for a variant
 */
export async function generateAndSaveVariantBarcode(
  vendorId: string,
  variantId: string,
  format: BarcodeFormat = 'CODE128'
): Promise<string | null> {
  const barcode = generateProductBarcode(vendorId, variantId, format);
  const saved = await saveVariantBarcode(variantId, barcode);
  return saved ? barcode : null;
}

// ============================================================================
// SCAN STATISTICS
// ============================================================================

/**
 * Get barcode scan statistics for a seller
 */
export async function getBarcodeScanStats(
  vendorId: string,
  days: number = 30
): Promise<BarcodeScanStats | null> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get total and success counts
    const { data: stats, error: statsError } = await supabase
      .from('barcode_scans')
      .select('is_successful')
      .eq('vendor_id', vendorId)
      .gte('scan_timestamp', startDate.toISOString());

    if (statsError) {
      console.error('[BarcodeService] Stats error:', statsError);
      return null;
    }

    const totalScans = stats?.length || 0;
    const successfulScans = stats?.filter(s => s.is_successful).length || 0;
    const failedScans = totalScans - successfulScans;
    const successRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0;

    // Get top scanned products
    const { data: topProducts, error: topError } = await supabase
      .rpc('get_top_scanned_products', {
        p_vendor_id: vendorId,
        p_limit: 10,
        p_days: days,
      });

    // Get scans by day
    const { data: dailyScans, error: dailyError } = await supabase
      .rpc('get_daily_scan_counts', {
        p_vendor_id: vendorId,
        p_days: days,
      });

    return {
      totalScans,
      successfulScans,
      failedScans,
      successRate: Math.round(successRate * 10) / 10,
      topScannedProducts: topProducts || [],
      scansByDay: dailyScans || [],
    };
  } catch (error) {
    console.error('[BarcodeService] Exception getting stats:', error);
    return null;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate barcode format
 */
export function validateBarcode(barcode: string, format?: BarcodeFormat): boolean {
  if (!barcode || barcode.length < 4 || barcode.length > 50) {
    return false;
  }

  if (!format) {
    return true; // No format validation needed
  }

  switch (format) {
    case 'EAN-13':
      return /^\d{13}$/.test(barcode);
    case 'EAN-8':
      return /^\d{8}$/.test(barcode);
    case 'CODE128':
    case 'CODE39':
      return /^[A-Z0-9\-\.\/\+\%\$\s]+$/i.test(barcode);
    case 'ITF':
      return /^\d+$/.test(barcode) && barcode.length % 2 === 0;
    case 'QR':
      return true; // QR can contain any data
    default:
      return true;
  }
}

/**
 * Check if barcode_scans table exists
 */
export async function checkBarcodeScanTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('barcode_scans')
      .select('id')
      .limit(1);

    return !error || error.code === 'PGRST116';
  } catch {
    return false;
  }
}

/**
 * Get all variants with barcodes for a seller
 */
export async function getSellerVariantsWithBarcodes(
  vendorId: string
): Promise<VariantBarcodeLookup[]> {
  try {
    const { data, error } = await supabase
      .from('product_variants')
      .select(`
        id,
        product_id,
        variant_name,
        sku,
        barcode,
        price,
        stock,
        thumbnail_url,
        products!inner (
          id,
          name,
          vendor_id
        )
      `)
      .eq('products.vendor_id', vendorId)
      .not('barcode', 'is', null);

    if (error) {
      console.error('[BarcodeService] Error fetching variants:', error);
      return [];
    }

    return (data || []).map(v => ({
      id: v.id,
      productId: v.product_id,
      productName: (v.products as any).name,
      variantName: v.variant_name,
      sku: v.sku,
      barcode: v.barcode,
      price: v.price,
      stock: v.stock,
      thumbnailUrl: v.thumbnail_url,
    }));
  } catch (error) {
    console.error('[BarcodeService] Exception fetching variants:', error);
    return [];
  }
}
