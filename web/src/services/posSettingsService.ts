/**
 * POS Settings Service - Database Integration
 * Handles CRUD operations for POS settings with Supabase
 * 
 * NOTE: Column name mapping between frontend and actual database:
 * - DB: tax_enabled → Frontend: enableTax
 * - DB: tax_inclusive → Frontend: taxIncludedInPrice
 * - DB: show_logo_on_receipt → Frontend: showLogo
 * - DB: cash_drawer_enabled → Frontend: enableCashDrawer
 * - DB: default_opening_cash → Frontend: openingCash
 * - DB: staff_tracking_enabled → Frontend: enableStaffTracking
 * - DB: barcode_scanner_enabled → Frontend: enableBarcodeScanner
 * - DB: sound_enabled → Frontend: enableSoundEffects
 * - DB: multi_branch_enabled → Frontend: enableMultiBranch
 * - DB: default_branch → Frontend: defaultBranchId
 * - DB: accept_cash/accept_card/accept_gcash/accept_maya → Frontend: acceptedPaymentMethods[]
 */

import { supabase } from '@/lib/supabase';
import type { POSSettings } from '@/types/pos.types';

// Schema version detection cache - defaults to false for safety
let schemaHasNewColumns: boolean = false;

/**
 * Invalidate schema cache and force to use base columns
 * Called when we get a 406 error during actual queries
 */
function forceBaseSchema(): void {
  schemaHasNewColumns = false;
  console.log('[POS Settings] Forced to base schema due to 406 error');
}

/**
 * Actual database column structure (matches Supabase schema)
 */
export interface DBPOSSettings {
  id: string;
  seller_id: string;
  // Payment methods as separate booleans
  accept_cash: boolean;
  accept_card: boolean;
  accept_gcash: boolean;
  accept_maya: boolean;
  // Barcode scanner
  barcode_scanner_enabled: boolean;
  scanner_type: 'camera' | 'usb' | 'bluetooth';
  auto_add_on_scan: boolean;
  // Sound
  sound_enabled: boolean;
  // Multi-branch
  multi_branch_enabled: boolean;
  default_branch: string | null;
  // Tax settings
  tax_enabled: boolean;
  tax_rate: number;
  tax_name: string;
  tax_inclusive: boolean;
  // Receipt settings
  receipt_header: string;
  receipt_footer: string;
  show_logo_on_receipt: boolean;
  logo_url: string | null;
  receipt_template: 'standard' | 'minimal' | 'detailed';
  auto_print_receipt: boolean;
  printer_type: string;
  printer_name: string | null;
  // Cash drawer
  cash_drawer_enabled: boolean;
  default_opening_cash: number;
  // Staff tracking
  staff_tracking_enabled: boolean;
  require_staff_login: boolean;
  // Low stock alerts  
  enable_low_stock_alert: boolean;
  low_stock_threshold: number;
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Convert database format to app format
 */
function dbToApp(db: DBPOSSettings): POSSettings {
  // Convert separate payment booleans to array
  const acceptedPaymentMethods: ('cash' | 'card' | 'ewallet' | 'bank_transfer')[] = [];
  if (db.accept_cash) acceptedPaymentMethods.push('cash');
  if (db.accept_card) acceptedPaymentMethods.push('card');
  if (db.accept_gcash || db.accept_maya) acceptedPaymentMethods.push('ewallet');

  return {
    id: db.id,
    sellerId: db.seller_id,
    enableTax: db.tax_enabled,
    taxRate: db.tax_rate,
    taxName: db.tax_name,
    taxIncludedInPrice: db.tax_inclusive,
    receiptHeader: db.receipt_header,
    receiptFooter: db.receipt_footer,
    showLogo: db.show_logo_on_receipt,
    logoUrl: db.logo_url || undefined,
    receiptTemplate: db.receipt_template,
    autoPrintReceipt: db.auto_print_receipt,
    printerName: db.printer_name || undefined,
    enableCashDrawer: db.cash_drawer_enabled,
    openingCash: db.default_opening_cash,
    enableStaffTracking: db.staff_tracking_enabled,
    requireStaffLogin: db.require_staff_login,
    enableBarcodeScanner: db.barcode_scanner_enabled,
    scannerType: db.scanner_type || 'camera',
    autoAddOnScan: db.auto_add_on_scan ?? true,
    enableMultiBranch: db.multi_branch_enabled,
    defaultBranchId: db.default_branch || undefined,
    acceptedPaymentMethods,
    enableLowStockAlert: db.enable_low_stock_alert ?? true,
    lowStockThreshold: db.low_stock_threshold ?? 10,
    enableSoundEffects: db.sound_enabled,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  };
}

/**
 * Convert app format to database format
 * @param includeNewColumns - Whether to include columns from migration 010
 */
function appToDb(app: POSSettings, sellerId: string, includeNewColumns = true): Partial<DBPOSSettings> {
  // Convert array to separate payment booleans
  const hasPaymentMethod = (method: string) => app.acceptedPaymentMethods?.includes(method as any) ?? false;

  const baseSettings = {
    seller_id: sellerId,
    // Payment methods as separate booleans
    accept_cash: hasPaymentMethod('cash'),
    accept_card: hasPaymentMethod('card'),
    accept_gcash: hasPaymentMethod('ewallet'),
    accept_maya: hasPaymentMethod('ewallet'),
    // Barcode scanner
    barcode_scanner_enabled: app.enableBarcodeScanner,
    // Sound
    sound_enabled: app.enableSoundEffects,
    // Multi-branch
    multi_branch_enabled: app.enableMultiBranch,
    default_branch: app.defaultBranchId || null,
    // Tax settings
    tax_enabled: app.enableTax,
    tax_rate: app.taxRate,
    tax_name: app.taxName,
    tax_inclusive: app.taxIncludedInPrice,
    // Receipt settings
    receipt_header: app.receiptHeader,
    receipt_footer: app.receiptFooter,
    show_logo_on_receipt: app.showLogo,
    receipt_template: app.receiptTemplate,
    auto_print_receipt: app.autoPrintReceipt,
    // Cash drawer
    cash_drawer_enabled: app.enableCashDrawer,
    default_opening_cash: app.openingCash,
    // Staff tracking
    staff_tracking_enabled: app.enableStaffTracking,
    require_staff_login: app.requireStaffLogin,
  };

  // Add new columns only if migration 010 has been applied
  if (includeNewColumns) {
    return {
      ...baseSettings,
      scanner_type: app.scannerType,
      auto_add_on_scan: app.autoAddOnScan,
      logo_url: app.logoUrl || null,
      printer_name: app.printerName || null,
      enable_low_stock_alert: app.enableLowStockAlert,
      low_stock_threshold: app.lowStockThreshold,
    };
  }

  return baseSettings;
}

/**
 * Get POS settings for a seller
 */
export async function getPOSSettings(sellerId: string): Promise<POSSettings | null> {
  try {
    // Select all available columns from pos_settings
    const { data, error } = await supabase
      .from('pos_settings')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle();

    if (error) {
      // Handle table not existing or no settings found gracefully
      // 42P01 = table doesn't exist, PGRST116 = no rows
      if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST204' || error.code === 'PGRST205' || (error as any).status === 406) {
        // Fallback to localStorage silently
        const localSettings = localStorage.getItem(`pos_settings_${sellerId}`);
        return localSettings ? JSON.parse(localSettings) : null;
      }
      throw error;
    }

    if (!data) {
      // No settings found, return null (will use defaults)
      return null;
    }

    return dbToApp(data as DBPOSSettings);
  } catch (error: any) {
    // Check if it's a table-not-exist error (don't log these as errors)
    if (error?.code === '42P01' || error?.code === 'PGRST204' || error?.code === 'PGRST205' || error?.status === 406) {
      console.warn('[POS Settings] Table not found, using localStorage fallback');
    } else {
      console.error('[POS Settings] Error fetching settings:', error);
    }
    
    // Fallback to localStorage if database fails
    const localSettings = localStorage.getItem(`pos_settings_${sellerId}`);
    return localSettings ? JSON.parse(localSettings) : null;
  }
}

/**
 * Save POS settings (create or update)
 */
export async function savePOSSettings(
  sellerId: string,
  settings: POSSettings
): Promise<POSSettings> {
  // Always save to localStorage first as backup
  localStorage.setItem(`pos_settings_${sellerId}`, JSON.stringify(settings));

  try {
    // Convert settings to DB format - use base columns only (migration 010 not applied yet)
    const dbSettings = appToDb(settings, sellerId, false);

    // Try to update first
    const { data: existingData, error: selectError } = await supabase
      .from('pos_settings')
      .select('id')
      .eq('seller_id', sellerId)
      .single();

    // Handle table not existing - just use localStorage
    if (selectError && (selectError.code === '42P01' || selectError.code === 'PGRST204' || selectError.code === 'PGRST205' || (selectError as any).status === 406)) {
      console.warn('[POS Settings] Table not found, using localStorage only');
      return settings;
    }

    let result;

    if (existingData) {
      // Update existing settings
      const { data, error } = await supabase
        .from('pos_settings')
        .update(dbSettings)
        .eq('seller_id', sellerId)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new settings
      const { data, error } = await supabase
        .from('pos_settings')
        .insert(dbSettings)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Add default values for new columns (not in database yet)
    if (result) {
      result = {
        ...result,
        scanner_type: 'camera',
        auto_add_on_scan: true,
        logo_url: null,
        printer_name: null,
        enable_low_stock_alert: true,
        low_stock_threshold: 10,
      };
    }

    return dbToApp(result as DBPOSSettings);
  } catch (error: any) {
    // Check if it's a table-not-exist error (don't log these as errors)
    if (error?.code === '42P01' || error?.code === 'PGRST204' || error?.code === 'PGRST205' || error?.status === 406) {
      console.warn('[POS Settings] Table not found, settings saved to localStorage');
    } else {
      console.error('[POS Settings] Error saving settings:', error);
    }
    
    // Already saved to localStorage, return the settings
    return settings;
  }
}

/**
 * Get default POS settings
 */
export function getDefaultPOSSettings(sellerId?: string): POSSettings {
  const now = new Date().toISOString();
  return {
    id: sellerId ? `settings_${sellerId}` : '',
    sellerId: sellerId || '',
    enableTax: false,
    taxRate: 12,
    taxName: 'VAT',
    taxIncludedInPrice: true,
    receiptHeader: 'Thank you for shopping with us!',
    receiptFooter: 'Please come again!',
    showLogo: true,
    receiptTemplate: 'standard',
    autoPrintReceipt: false,
    enableCashDrawer: false,
    openingCash: 1000,
    enableStaffTracking: false,
    requireStaffLogin: false,
    enableBarcodeScanner: false,
    scannerType: 'camera',
    autoAddOnScan: true,
    enableMultiBranch: false,
    acceptedPaymentMethods: ['cash', 'card', 'ewallet'],
    enableLowStockAlert: true,
    lowStockThreshold: 10,
    enableSoundEffects: true,
    // BIR-Compliant Philippine Receipt Fields (defaults)
    businessName: undefined,
    businessAddress: undefined,
    tin: undefined,
    minNumber: undefined,
    serialNumberRange: undefined,
    permitNumber: undefined,
    accreditationNumber: undefined,
    accreditedProvider: 'BazaarPH POS System',
    validityDate: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Check if pos_settings table exists (for migration status)
 */
export async function checkPOSSettingsTableExists(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('pos_settings')
      .select('id')
      .limit(1);

    // If no error or PGRST116 (no rows), table exists
    return !error || error.code === 'PGRST116';
  } catch (error: any) {
    // If error code 42P01, table doesn't exist
    return error?.code !== '42P01';
  }
}

/**
 * Reset schema detection cache
 * Call this after applying migration 010 to enable new columns
 * For now, this is a placeholder since we always use base schema
 */
export function resetSchemaCache(): void {
  schemaHasNewColumns = false; // Always false until migration is applied
  console.log('[POS Settings] Note: Migration 010 not applied yet - using base schema only');
}
