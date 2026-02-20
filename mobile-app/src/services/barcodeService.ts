/**
 * Barcode Service - Mobile App
 * Handles barcode lookup, and scan operations for Bazaar POS Mobile
 */

import { supabase } from '@/lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export type ScanSource = 'pos' | 'inventory' | 'receiving' | 'manual';
export type ScannerType = 'camera' | 'hardware' | 'manual';

export interface POSBarcodeLookupResult {
  type: 'product' | 'variant' | null;
  id: string | null;
  name: string | null;
  variantName?: string;
  variantId?: string;
  productId?: string;
  sku?: string | null;
  price: number | null;
  stock: number | null;
  imageUrl: string | null;
  isFound: boolean;
  color?: string;
  size?: string;
}

export interface BarcodeScanStats {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  successRate: number;
}

// ============================================================================
// BARCODE LOOKUP FUNCTIONS
// ============================================================================

/**
 * Quick barcode lookup for POS - no logging, faster response
 * Searches product_variants by barcode, then by SKU
 */
export async function lookupBarcodeQuick(
  sellerId: string,
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

  if (!sellerId || !barcode) {
    return notFound;
  }

  const normalizedBarcode = barcode.trim().toUpperCase();

  try {
    // First, search product_variants by barcode
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
        thumbnail_url,
        color,
        size
      `)
      .eq('barcode', normalizedBarcode);

    if (!variantError && variants && variants.length > 0) {
      // Check if this variant belongs to the seller's product
      for (const variant of variants) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, seller_id, deleted_at')
          .eq('id', variant.product_id)
          .eq('seller_id', sellerId)
          .is('deleted_at', null)
          .single();

        if (product) {
          return {
            type: 'variant',
            id: variant.id,
            variantId: variant.id,
            name: product.name,
            variantName: variant.variant_name,
            productId: variant.product_id,
            sku: variant.sku,
            price: variant.price,
            stock: variant.stock,
            imageUrl: variant.thumbnail_url,
            isFound: true,
            color: variant.color || undefined,
            size: variant.size || undefined,
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
        thumbnail_url,
        color,
        size
      `)
      .eq('sku', normalizedBarcode);

    if (!skuError && variantsBySku && variantsBySku.length > 0) {
      for (const variantBySku of variantsBySku) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, seller_id, deleted_at')
          .eq('id', variantBySku.product_id)
          .eq('seller_id', sellerId)
          .is('deleted_at', null)
          .single();

        if (product) {
          return {
            type: 'variant',
            id: variantBySku.id,
            variantId: variantBySku.id,
            name: product.name,
            variantName: variantBySku.variant_name,
            productId: variantBySku.product_id,
            sku: variantBySku.sku,
            price: variantBySku.price,
            stock: variantBySku.stock,
            imageUrl: variantBySku.thumbnail_url,
            isFound: true,
            color: variantBySku.color || undefined,
            size: variantBySku.size || undefined,
          };
        }
      }
    }

    // Third, search products by SKU (for products without variants)
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, sku, price, seller_id')
      .eq('sku', normalizedBarcode)
      .eq('seller_id', sellerId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!productError && product) {
      // Get primary image separately
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
 * Log a barcode scan to the database (optional analytics)
 */
export async function logBarcodeScan(params: {
  sellerId: string;
  barcodeValue: string;
  productId: string | null;
  variantId: string | null;
  isSuccessful: boolean;
  scanSource: ScanSource;
  scannerType: ScannerType;
}): Promise<void> {
  try {
    await supabase.from('barcode_scans').insert({
      vendor_id: params.sellerId,
      barcode_value: params.barcodeValue,
      product_id: params.productId,
      variant_id: params.variantId,
      is_successful: params.isSuccessful,
      scan_source: params.scanSource,
      scanner_type: params.scannerType,
      scan_timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Don't throw - logging failures shouldn't break POS
    console.warn('[BarcodeService] Failed to log scan:', error);
  }
}

/**
 * Create a new product with variant and barcode
 */
export async function createProductWithBarcode(params: {
  sellerId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  barcode: string;
  imageUrl?: string;
  brand?: string;
  weight?: number;
}): Promise<{ productId: string; variantId: string } | null> {
  try {
    // Create product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: params.name,
        description: params.description,
        sku: params.barcode || null,
        price: params.price,
        category_id: params.categoryId,
        seller_id: params.sellerId,
        brand: params.brand || null,
        weight: params.weight || null,
        approval_status: 'approved',
      })
      .select()
      .single();

    if (productError) throw productError;

    // Create product image if provided
    if (params.imageUrl) {
      await supabase.from('product_images').insert({
        product_id: product.id,
        image_url: params.imageUrl,
        is_primary: true,
        sort_order: 0,
      });
    }

    // Create default variant with barcode
    const { data: variant, error: variantError } = await supabase
      .from('product_variants')
      .insert({
        product_id: product.id,
        variant_name: 'Default',
        sku: params.barcode || `SKU-${product.id.slice(0, 8)}`,
        barcode: params.barcode || null,
        price: params.price,
        stock: params.stock,
      })
      .select()
      .single();

    if (variantError) {
      console.error('Variant creation error:', variantError);
    }

    return {
      productId: product.id,
      variantId: variant?.id || '',
    };
  } catch (error) {
    console.error('[BarcodeService] Create product error:', error);
    return null;
  }
}
