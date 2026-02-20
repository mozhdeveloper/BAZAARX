// POS System Types for Enhanced Features

export interface POSSettings {
  id: string;
  sellerId: string;
  
  // Tax Configuration
  enableTax: boolean;
  taxRate: number; // Percentage (e.g., 12 for 12%)
  taxName: string; // e.g., "VAT", "Sales Tax"
  taxIncludedInPrice: boolean;
  
  // Receipt Configuration
  receiptHeader: string;
  receiptFooter: string;
  showLogo: boolean;
  logoUrl?: string;
  receiptTemplate: 'standard' | 'minimal' | 'detailed';
  autoPrintReceipt: boolean;
  printerName?: string; // For direct printer integration
  
  // BIR-Compliant Philippine Receipt Fields
  businessName?: string; // Registered business name
  businessAddress?: string; // Complete business address
  tin?: string; // Tax Identification Number (12 digits + branch code)
  minNumber?: string; // Machine Identification Number (MIN) - required for accredited POS
  serialNumberRange?: string; // e.g., "00001-50000"
  permitNumber?: string; // BIR Permit to Use POS/CRM
  accreditationNumber?: string; // BIR Accreditation Number
  accreditedProvider?: string; // Accredited POS/CRM Provider Name
  validityDate?: string; // Permit validity date
  
  // Cash Drawer
  enableCashDrawer: boolean;
  openingCash: number;
  
  // Staff Management
  enableStaffTracking: boolean;
  requireStaffLogin: boolean;
  
  // Barcode Scanner
  enableBarcodeScanner: boolean;
  scannerType: 'camera' | 'usb' | 'bluetooth';
  autoAddOnScan: boolean;
  
  // Multi-branch
  enableMultiBranch: boolean;
  defaultBranchId?: string;
  
  // Payment Methods
  acceptedPaymentMethods: ('cash' | 'card' | 'ewallet' | 'bank_transfer')[];
  
  // Additional Settings
  enableLowStockAlert: boolean;
  lowStockThreshold: number;
  enableSoundEffects: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface Branch {
  id: string;
  sellerId: string;
  name: string;
  address: string;
  city: string;
  province: string;
  contactNumber: string;
  email?: string;
  isActive: boolean;
  isMainBranch: boolean;
  
  // Branch-specific settings
  openingHours?: {
    day: string;
    open: string;
    close: string;
  }[];
  
  createdAt: string;
  updatedAt: string;
}

export interface StaffMember {
  id: string;
  sellerId: string;
  branchId?: string;
  name: string;
  email: string;
  phone: string;
  role: 'cashier' | 'manager' | 'admin';
  pin?: string; // 4-6 digit PIN for quick login
  isActive: boolean;
  avatar?: string;
  
  // Permissions
  canProcessSales: boolean;
  canProcessReturns: boolean;
  canApplyDiscounts: boolean;
  canOpenCashDrawer: boolean;
  canViewReports: boolean;
  canManageInventory: boolean;
  
  hireDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface CashDrawerSession {
  id: string;
  sellerId: string;
  branchId?: string;
  staffId: string;
  staffName: string;
  
  // Session Info
  sessionNumber: string;
  startTime: string;
  endTime?: string;
  status: 'open' | 'closed';
  
  // Cash Tracking
  openingCash: number;
  expectedCash: number; // Based on sales
  actualCash?: number; // Counted at closing
  difference?: number; // actualCash - expectedCash
  
  // Transactions Summary
  totalSales: number;
  totalTransactions: number;
  cashSales: number;
  cardSales: number;
  ewalletSales: number;
  totalRefunds: number;
  
  // Cash Operations
  cashIn: number; // Money added to drawer
  cashOut: number; // Money removed from drawer
  
  // Notes
  openingNotes?: string;
  closingNotes?: string;
  discrepancyNotes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface CashDrawerTransaction {
  id: string;
  sessionId: string;
  sellerId: string;
  staffId: string;
  type: 'sale' | 'refund' | 'cash_in' | 'cash_out' | 'opening' | 'closing';
  amount: number;
  paymentMethod: 'cash' | 'card' | 'ewallet' | 'bank_transfer';
  orderId?: string;
  orderNumber?: string;
  notes?: string;
  timestamp: string;
}

export interface ProductBarcode {
  id: string;
  productId: string;
  sellerId: string;
  barcode: string;
  barcodeType: 'EAN13' | 'UPC' | 'CODE128' | 'QR';
  variantLabel1?: string;
  variantLabel2?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryByBranch {
  productId: string;
  branchId: string;
  stock: number;
  reservedStock: number;
  availableStock: number; // stock - reservedStock
  reorderPoint: number;
  reorderQuantity: number;
  lastRestocked?: string;
  updatedAt: string;
}

export interface TaxBreakdown {
  subtotal: number;
  taxableAmount: number;
  taxAmount: number;
  total: number;
  taxRate: number;
  taxName: string;
}

export interface POSTransaction {
  id: string;
  transactionNumber: string;
  sellerId: string;
  branchId?: string;
  staffId?: string;
  staffName?: string;
  sessionId?: string;
  
  // Items
  items: POSTransactionItem[];
  
  // Amounts
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  
  // Payment
  paymentMethod: 'cash' | 'card' | 'ewallet' | 'bank_transfer' | 'mixed';
  amountPaid: number;
  change: number;
  
  // Optional buyer info
  buyerEmail?: string;
  buyerPhone?: string;
  buyerName?: string;
  
  // Receipt
  receiptNumber: string;
  receiptUrl?: string;
  printed: boolean;
  
  // Transaction info
  status: 'completed' | 'refunded' | 'partially_refunded';
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface POSTransactionItem {
  productId: string;
  productName: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  variantLabel1?: string;
  variantLabel2?: string;
  image?: string;
}

export interface POSDiscount {
  id: string;
  sellerId: string;
  code: string;
  name: string;
  type: 'percentage' | 'fixed_amount';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  isActive: boolean;
  staffOnly: boolean; // Only staff can apply
  requiresApproval: boolean; // Manager approval needed
  validFrom?: string;
  validTo?: string;
  createdAt: string;
  updatedAt: string;
}
