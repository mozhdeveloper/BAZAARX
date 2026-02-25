/**
 * POS Settings Service - Mobile
 * Handles POS configuration including tax, receipts, and store info
 */

import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPES
// ============================================================================

export interface POSSettings {
  // Store Info
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeEmail?: string;
  taxId?: string;
  
  // Tax Settings
  enableTax: boolean;
  taxRate: number;
  taxIncludedInPrice: boolean;
  taxLabel: string;
  
  // Receipt Settings
  receiptHeader?: string;
  receiptFooter?: string;
  showTaxBreakdown: boolean;
  showBarcode: boolean;
  
  // Scanner Settings
  enableBarcodeScanner: boolean;
  autoAddOnScan: boolean;
  enableSoundEffects: boolean;
  
  // Payment Methods
  enableCash: boolean;
  enableCard: boolean;
  enableEwallet: boolean;
  enableBankTransfer: boolean;
}

const POS_SETTINGS_KEY = 'pos_settings';

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_POS_SETTINGS: POSSettings = {
  storeName: 'BazaarPH Store',
  storeAddress: '',
  storePhone: '',
  storeEmail: '',
  taxId: '',
  
  enableTax: false,
  taxRate: 12, // Philippine VAT
  taxIncludedInPrice: true,
  taxLabel: 'VAT',
  
  receiptHeader: '',
  receiptFooter: 'Thank you for your purchase!',
  showTaxBreakdown: true,
  showBarcode: false,
  
  enableBarcodeScanner: true,
  autoAddOnScan: true,
  enableSoundEffects: true,
  
  enableCash: true,
  enableCard: true,
  enableEwallet: true,
  enableBankTransfer: false,
};

// ============================================================================
// STORAGE FUNCTIONS
// ============================================================================

/**
 * Get POS settings from local storage or database
 */
export async function getPOSSettings(sellerId: string): Promise<POSSettings> {
  try {
    // Try local storage first for faster load
    const localSettings = await AsyncStorage.getItem(`${POS_SETTINGS_KEY}_${sellerId}`);
    if (localSettings) {
      return { ...DEFAULT_POS_SETTINGS, ...JSON.parse(localSettings) };
    }
    
    // Try database
    const { data, error } = await supabase
      .from('pos_settings')
      .select('*')
      .eq('seller_id', sellerId)
      .maybeSingle();
    
    if (error) {
      console.warn('[POSSettings] Database error:', error.message);
      return DEFAULT_POS_SETTINGS;
    }
    
    if (data) {
      const settings: POSSettings = {
        storeName: data.store_name || DEFAULT_POS_SETTINGS.storeName,
        storeAddress: data.store_address || DEFAULT_POS_SETTINGS.storeAddress,
        storePhone: data.store_phone || DEFAULT_POS_SETTINGS.storePhone,
        storeEmail: data.store_email,
        taxId: data.tax_id,
        
        enableTax: data.enable_tax ?? DEFAULT_POS_SETTINGS.enableTax,
        taxRate: data.tax_rate ?? DEFAULT_POS_SETTINGS.taxRate,
        taxIncludedInPrice: data.tax_included_in_price ?? DEFAULT_POS_SETTINGS.taxIncludedInPrice,
        taxLabel: data.tax_label || DEFAULT_POS_SETTINGS.taxLabel,
        
        receiptHeader: data.receipt_header,
        receiptFooter: data.receipt_footer || DEFAULT_POS_SETTINGS.receiptFooter,
        showTaxBreakdown: data.show_tax_breakdown ?? DEFAULT_POS_SETTINGS.showTaxBreakdown,
        showBarcode: data.show_barcode ?? DEFAULT_POS_SETTINGS.showBarcode,
        
        enableBarcodeScanner: data.enable_barcode_scanner ?? DEFAULT_POS_SETTINGS.enableBarcodeScanner,
        autoAddOnScan: data.auto_add_on_scan ?? DEFAULT_POS_SETTINGS.autoAddOnScan,
        enableSoundEffects: data.enable_sound_effects ?? DEFAULT_POS_SETTINGS.enableSoundEffects,
        
        enableCash: data.enable_cash ?? DEFAULT_POS_SETTINGS.enableCash,
        enableCard: data.enable_card ?? DEFAULT_POS_SETTINGS.enableCard,
        enableEwallet: data.enable_ewallet ?? DEFAULT_POS_SETTINGS.enableEwallet,
        enableBankTransfer: data.enable_bank_transfer ?? DEFAULT_POS_SETTINGS.enableBankTransfer,
      };
      
      // Cache in local storage
      await AsyncStorage.setItem(`${POS_SETTINGS_KEY}_${sellerId}`, JSON.stringify(settings));
      
      return settings;
    }
    
    return DEFAULT_POS_SETTINGS;
  } catch (error) {
    console.error('[POSSettings] Error loading settings:', error);
    return DEFAULT_POS_SETTINGS;
  }
}

/**
 * Save POS settings to local storage and database
 */
export async function savePOSSettings(sellerId: string, settings: POSSettings): Promise<boolean> {
  try {
    // Save to local storage immediately
    await AsyncStorage.setItem(`${POS_SETTINGS_KEY}_${sellerId}`, JSON.stringify(settings));
    
    // Save to database
    const { error } = await supabase
      .from('pos_settings')
      .upsert({
        seller_id: sellerId,
        store_name: settings.storeName,
        store_address: settings.storeAddress,
        store_phone: settings.storePhone,
        store_email: settings.storeEmail,
        tax_id: settings.taxId,
        
        enable_tax: settings.enableTax,
        tax_rate: settings.taxRate,
        tax_included_in_price: settings.taxIncludedInPrice,
        tax_label: settings.taxLabel,
        
        receipt_header: settings.receiptHeader,
        receipt_footer: settings.receiptFooter,
        show_tax_breakdown: settings.showTaxBreakdown,
        show_barcode: settings.showBarcode,
        
        enable_barcode_scanner: settings.enableBarcodeScanner,
        auto_add_on_scan: settings.autoAddOnScan,
        enable_sound_effects: settings.enableSoundEffects,
        
        enable_cash: settings.enableCash,
        enable_card: settings.enableCard,
        enable_ewallet: settings.enableEwallet,
        enable_bank_transfer: settings.enableBankTransfer,
        
        updated_at: new Date().toISOString(),
      }, { onConflict: 'seller_id' });
    
    if (error) {
      console.warn('[POSSettings] Database save warning:', error.message);
      // Local save succeeded, so return true
    }
    
    return true;
  } catch (error) {
    console.error('[POSSettings] Error saving settings:', error);
    return false;
  }
}

// ============================================================================
// TAX CALCULATION
// ============================================================================

/**
 * Calculate tax based on settings
 */
export function calculateTax(
  subtotal: number,
  settings: POSSettings
): { tax: number; total: number; taxableAmount: number } {
  if (!settings.enableTax || !settings.taxRate) {
    return { tax: 0, total: subtotal, taxableAmount: subtotal };
  }
  
  let tax: number;
  let taxableAmount: number;
  
  if (settings.taxIncludedInPrice) {
    // Tax is already included in price
    // Formula: tax = subtotal - (subtotal / (1 + rate/100))
    taxableAmount = subtotal / (1 + settings.taxRate / 100);
    tax = subtotal - taxableAmount;
  } else {
    // Tax is added to price
    taxableAmount = subtotal;
    tax = (subtotal * settings.taxRate) / 100;
  }
  
  return {
    tax: Math.round(tax * 100) / 100,
    total: settings.taxIncludedInPrice ? subtotal : subtotal + tax,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
  };
}

// ============================================================================
// RECEIPT GENERATION
// ============================================================================

export type PaymentMethod = 'cash' | 'card' | 'ewallet' | 'bank_transfer';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReceiptData {
  orderId: string;
  orderNumber: string;
  date: Date;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  taxLabel: string;
  total: number;
  paymentMethod: PaymentMethod;
  cashier?: string;
  customer?: string;
  note?: string;
}

/**
 * Generate BIR-compliant receipt HTML
 */
export function generateReceiptHTML(
  data: ReceiptData,
  settings: POSSettings
): string {
  const paymentMethodLabels: Record<PaymentMethod, string> = {
    cash: 'Cash',
    card: 'Card',
    ewallet: 'E-Wallet',
    bank_transfer: 'Bank Transfer',
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      padding: 32px 20px;
      background: white;
      font-size: 14px;
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
      border-bottom: 2px solid #FF5722;
      padding-bottom: 16px;
    }
    .logo { 
      color: #FF5722; 
      font-size: 28px; 
      font-weight: bold;
      margin-bottom: 4px;
    }
    .store-name { 
      color: #1F2937; 
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .store-address { 
      color: #6B7280; 
      font-size: 12px;
      margin-bottom: 2px;
    }
    .store-phone { 
      color: #6B7280; 
      font-size: 12px;
    }
    ${settings.taxId ? `.tax-id { color: #6B7280; font-size: 12px; margin-top: 4px; }` : ''}
    .receipt-title {
      background: #FFF7ED;
      padding: 10px;
      border-radius: 6px;
      font-weight: bold;
      font-size: 16px;
      color: #EA580C;
      margin-top: 12px;
    }
    ${settings.receiptHeader ? `.custom-header { margin: 16px 0; text-align: center; color: #374151; font-size: 12px; }` : ''}
    .info-section {
      background: #F9FAFB;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
      border: 1px solid #E5E7EB;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed #E5E7EB;
    }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #6B7280; }
    .info-value { color: #1F2937; font-weight: 600; }
    .items-section { margin: 20px 0; }
    .section-title {
      font-size: 14px;
      font-weight: bold;
      color: #374151;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 2px solid #E5E7EB;
    }
    .item {
      padding: 12px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .item:last-child { border-bottom: none; }
    .item-name {
      font-weight: 600;
      font-size: 14px;
      color: #1F2937;
      margin-bottom: 4px;
    }
    .item-details {
      display: flex;
      justify-content: space-between;
      color: #6B7280;
      font-size: 13px;
    }
    .totals-section {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 2px solid #E5E7EB;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
    }
    .total-label { color: #6B7280; }
    .total-value { font-weight: 600; color: #1F2937; }
    .grand-total {
      background: #FF5722;
      color: white;
      padding: 14px;
      border-radius: 8px;
      margin-top: 8px;
    }
    .grand-total .total-label,
    .grand-total .total-value {
      color: white;
      font-size: 18px;
      font-weight: bold;
    }
    .paid-badge {
      background: #10B981;
      color: white;
      padding: 10px 16px;
      border-radius: 6px;
      text-align: center;
      margin: 16px 0;
      font-weight: bold;
      font-size: 14px;
    }
    .footer {
      margin-top: 32px;
      text-align: center;
      color: #9CA3AF;
      font-size: 11px;
      border-top: 1px solid #E5E7EB;
      padding-top: 16px;
    }
    .footer p { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">🛒 BazaarPH</div>
    <div class="store-name">${settings.storeName}</div>
    ${settings.storeAddress ? `<div class="store-address">${settings.storeAddress}</div>` : ''}
    ${settings.storePhone ? `<div class="store-phone">${settings.storePhone}</div>` : ''}
    ${settings.taxId ? `<div class="tax-id">TIN: ${settings.taxId}</div>` : ''}
    <div class="receipt-title">OFFICIAL RECEIPT</div>
  </div>

  ${settings.receiptHeader ? `<div class="custom-header">${settings.receiptHeader}</div>` : ''}

  <div class="info-section">
    <div class="info-row">
      <span class="info-label">Receipt #</span>
      <span class="info-value">${data.orderNumber}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date</span>
      <span class="info-value">${formatDate(data.date)}</span>
    </div>
    ${data.cashier ? `
    <div class="info-row">
      <span class="info-label">Cashier</span>
      <span class="info-value">${data.cashier}</span>
    </div>
    ` : ''}
    <div class="info-row">
      <span class="info-label">Customer</span>
      <span class="info-value">${data.customer || 'Walk-in'}</span>
    </div>
  </div>

  <div class="items-section">
    <div class="section-title">Items Purchased</div>
    ${data.items.map(item => `
    <div class="item">
      <div class="item-name">${item.name}</div>
      <div class="item-details">
        <span>${item.quantity} × ${formatCurrency(item.price)}</span>
        <span style="font-weight: 600; color: #1F2937;">${formatCurrency(item.total)}</span>
      </div>
    </div>
    `).join('')}
  </div>

  <div class="totals-section">
    ${settings.showTaxBreakdown && settings.enableTax ? `
    <div class="total-row">
      <span class="total-label">Subtotal</span>
      <span class="total-value">${formatCurrency(data.subtotal)}</span>
    </div>
    <div class="total-row">
      <span class="total-label">${data.taxLabel} (${settings.taxRate}%)</span>
      <span class="total-value">${formatCurrency(data.tax)}</span>
    </div>
    ` : ''}
    <div class="grand-total">
      <div class="total-row">
        <span class="total-label">TOTAL</span>
        <span class="total-value">${formatCurrency(data.total)}</span>
      </div>
    </div>
  </div>

  <div class="paid-badge">
    ✓ PAID - ${paymentMethodLabels[data.paymentMethod]}
  </div>

  ${data.note ? `
  <div style="background: #FEF3C7; padding: 10px; border-radius: 6px; margin: 16px 0;">
    <strong>Note:</strong> ${data.note}
  </div>
  ` : ''}

  <div class="footer">
    <p>${settings.receiptFooter || 'Thank you for your purchase!'}</p>
    <p>BazaarPH - Your Trusted Online Marketplace</p>
    <p>Receipt generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}
