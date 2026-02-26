import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CheckCircle,
  LogOut,
  CreditCard,
  Scan,
  TrendingUp,
  AlertCircle,
  Package,
  Star,
  Hash,
  Printer,
  Receipt,
  Settings,
  User,
  DollarSign,
  Building2,
  Calculator,
  Volume2,
  VolumeX,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { useAuthStore, useProductStore, useOrderStore } from '@/stores/sellerStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { orderMutationService } from '@/services/orders/orderMutationService';
import { BarcodeScanner } from '@/components/pos/BarcodeScanner';
import { QuickProductModal } from '@/components/pos/QuickProductModal';
import { StaffLogin, StaffBadge } from '@/components/pos/StaffLogin';
import { CashDrawerManager, CashDrawerBadge } from '@/components/pos/CashDrawerManager';
import { BranchSelector, BranchBadge, MOCK_BRANCHES } from '@/components/pos/BranchSelector';
import { POSSettingsModal } from '@/components/pos/POSSettingsModal';
import { getPOSSettings } from '@/services/posSettingsService';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { lookupBarcodeQuick } from '@/services/barcodeService';
import { playBeepSound, ScannerStatus } from '@/components/ui/BarcodeDisplay';
import type { POSSettings, StaffMember, CashDrawerSession, Branch } from '@/types/pos.types';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  image: string;
  maxStock: number;
  selectedVariantLabel1?: string;
  selectedVariantLabel2?: string;
  variantKey?: string; // Unique key for variant combo
}

interface ReceiptData {
  orderId: string;
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  note: string;
  date: Date;
  sellerName: string;
  cashier: string;
  paymentMethod: 'cash' | 'card' | 'ewallet' | 'bank_transfer';
}

export function SellerPOS() {
  const navigate = useNavigate();
  const { seller } = useAuthStore();
  const { products, fetchProducts, loading } = useProductStore();
  const { addOfflineOrder, fetchOrders } = useOrderStore();

  // Fetch seller's products when component mounts
  useEffect(() => {
    if (seller?.id) {
      console.log('[SellerPOS] Fetching products for seller:', seller.id);
      fetchProducts({ sellerId: seller.id });
    }
  }, [seller?.id, fetchProducts]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'low-stock' | 'best-sellers'>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState('');
  const [note, setNote] = useState('');
  const [buyerEmail, setBuyerEmail] = useState(''); // Optional buyer email for points
  const [isProcessing, setIsProcessing] = useState(false);
  const [flashingProduct, setFlashingProduct] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [selectedVariantLabel1, setSelectedVariantLabel1] = useState<string>('');
  const [selectedVariantLabel2, setSelectedVariantLabel2] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // POS Settings & Features
  const [posSettings, setPOSSettings] = useState<POSSettings | null>(null);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | undefined>();
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [cashDrawerSession, setCashDrawerSession] = useState<CashDrawerSession | undefined>();
  const [showCashDrawer, setShowCashDrawer] = useState(false);
  const [currentBranch, setCurrentBranch] = useState<Branch | undefined>();
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showPOSSettings, setShowPOSSettings] = useState(false);
  const [showQuickProductModal, setShowQuickProductModal] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'ewallet' | 'bank_transfer'>('cash');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scannerPaused, setScannerPaused] = useState(false);

  // Hardware Barcode Scanner Handler
  const handleHardwareScan = useCallback(async (barcode: string) => {
    // Only process hardware scans when:
    // 1. Seller is logged in
    // 2. Scanner is not paused (dialogs closed)
    // 3. Barcode scanner is enabled in settings
    // 4. Scanner type is USB or Bluetooth (hardware scanners)
    const isHardwareScannerEnabled = posSettings?.enableBarcodeScanner &&
      (posSettings?.scannerType === 'usb' || posSettings?.scannerType === 'bluetooth');

    if (!seller?.id || scannerPaused || !isHardwareScannerEnabled) return;

    console.log('[SellerPOS] Hardware scan detected:', barcode);

    try {
      // Look up barcode in database
      const result = await lookupBarcodeQuick(seller.id, barcode);

      if (result.isFound && result.id) {
        // Find the product in local products array
        const productId = result.productId || result.id;
        const product = products.find(p => p.id === productId);

        if (product) {
          // Play success sound
          if (soundEnabled && posSettings?.enableSoundEffects !== false) {
            playBeepSound('success');
          }

          // Add to cart
          if (posSettings?.autoAddOnScan !== false) {
            addToCart(product, false, undefined, undefined);
          } else {
            showDetails(product);
          }
        } else {
          // Product found in DB but not loaded locally - add by result data
          if (soundEnabled && posSettings?.enableSoundEffects !== false) {
            playBeepSound('success');
          }

          // Create cart item from lookup result
          const variantKey = `${result.id}-direct-scan`;
          const existingItem = cart.find(item => item.variantKey === variantKey);

          if (existingItem) {
            setCart(cart.map(item =>
              item.variantKey === variantKey
                ? { ...item, quantity: item.quantity + 1 }
                : item
            ));
          } else {
            setCart([...cart, {
              productId: result.id,
              productName: result.variantName
                ? `${result.name} (${result.variantName})`
                : result.name || 'Unknown Product',
              quantity: 1,
              price: result.price || 0,
              image: result.imageUrl || '',
              maxStock: result.stock || 999,
              variantKey
            }]);
          }
        }
      } else {
        // Not found - play error sound
        if (soundEnabled) {
          playBeepSound('error');
        }
        console.warn('[SellerPOS] Barcode not found:', barcode);
      }
    } catch (error) {
      console.error('[SellerPOS] Barcode lookup error:', error);
      if (soundEnabled) {
        playBeepSound('error');
      }
    }
  }, [seller?.id, products, cart, posSettings, soundEnabled, scannerPaused]);

  // Initialize hardware barcode scanner
  const {
    isActive: scannerActive,
    lastScan,
    lastScanTime,
    pause: pauseScanner,
    resume: resumeScanner,
    scanCount
  } = useBarcodeScanner(handleHardwareScan, {
    debug: false,
    minLength: 4,
    maxLength: 50,
    timeoutMs: 100,
    ignoredTags: [], // Allow scanning even when inputs are focused
  });

  // Pause scanner when dialogs are open
  useEffect(() => {
    const dialogOpen = showProductDetails || showSuccess || showReceipt ||
      showStaffLogin || showCashDrawer || showBarcodeScanner || showPOSSettings;
    if (dialogOpen) {
      pauseScanner();
      setScannerPaused(true);
    } else {
      resumeScanner();
      setScannerPaused(false);
    }
  }, [showProductDetails, showSuccess, showReceipt, showStaffLogin, showCashDrawer, showBarcodeScanner, showPOSSettings, pauseScanner, resumeScanner]);

  // Load POS Settings
  useEffect(() => {
    async function loadPOSSettings() {
      if (!seller?.id) return;

      try {
        // Try to load from database first
        const dbSettings = await getPOSSettings(seller.id);
        if (dbSettings) {
          setPOSSettings(dbSettings);
        }
      } catch (error) {
        console.error('[SellerPOS] Error loading POS settings:', error);
        // Settings will remain null, features will be disabled
      }

      // Auto-select main branch if multi-branch is enabled
      const mainBranch = MOCK_BRANCHES.find(b => b.isMainBranch);
      if (mainBranch) {
        setCurrentBranch(mainBranch);
      }
    }

    loadPOSSettings();
  }, [seller?.id]);

  // Tax Calculation
  const calculateTax = (subtotal: number): { tax: number; total: number } => {
    if (!posSettings?.enableTax) {
      return { tax: 0, total: subtotal };
    }

    let taxAmount: number;
    if (posSettings.taxIncludedInPrice) {
      // Tax is already included in price
      taxAmount = (subtotal * posSettings.taxRate) / (100 + posSettings.taxRate);
    } else {
      // Tax is added to price
      taxAmount = (subtotal * posSettings.taxRate) / 100;
    }

    return {
      tax: taxAmount,
      total: posSettings.taxIncludedInPrice ? subtotal : subtotal + taxAmount
    };
  };

  // Barcode Handler
  const handleBarcodeScanned = async (barcode: string): Promise<boolean> => {
    if (!seller?.id) {
      alert('Seller not logged in');
      return false;
    }

    // Lookup product by barcode/SKU from database
    const result = await lookupBarcodeQuick(seller.id, barcode);

    if (result.isFound) {
      // Find the product in our loaded products list
      const productId = result.type === 'variant' ? result.productId : result.id;
      const product = products.find(p => p.id === productId);

      if (product) {
        if (posSettings?.autoAddOnScan) {
          addToCart(product);
        } else {
          showDetails(product);
        }

        // Play success sound
        if (posSettings?.enableSoundEffects) {
          playBeepSound('success');
        }
        return true;
      } else {
        // Product exists in database but not loaded - refresh and add
        await fetchProducts({ sellerId: seller.id });
        return false;
      }
    } else {
      // Product not found - try searching by name in loaded products
      const searchByName = products.find(p =>
        p.name.toLowerCase().includes(barcode.toLowerCase())
      );

      if (searchByName) {
        if (posSettings?.autoAddOnScan) {
          addToCart(searchByName);
          playBeepSound('success');
        } else {
          showDetails(searchByName);
        }
        return true;
      } else {
        // Product not found anywhere - show create modal
        playBeepSound('error');
        setPendingBarcode(barcode);
        setShowBarcodeScanner(false);
        setShowQuickProductModal(true);
        return false;
      }
    }
  };

  // Handle product created from quick modal
  const handleQuickProductCreated = (product: any) => {
    // Refresh products list
    if (seller?.id) {
      fetchProducts({ sellerId: seller.id });
    }

    // Add to cart immediately
    const cartProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      primaryImageUrl: product.primaryImageUrl || null,
      stock: product.stock || 0,
    };
    addToCart(cartProduct as any);
    playBeepSound('success');
  };

  // Staff Management
  const handleStaffLogin = (staff: StaffMember) => {
    setCurrentStaff(staff);

    // Auto-start cash drawer session if enabled
    if (posSettings?.enableCashDrawer && !cashDrawerSession) {
      setShowCashDrawer(true);
    }
  };

  const handleStaffLogout = () => {
    // Close cash drawer session if open
    if (cashDrawerSession) {
      setShowCashDrawer(true); // Prompt to close session
    } else {
      setCurrentStaff(undefined);
    }
  };

  // Cash Drawer Management
  const handleSessionStart = (session: CashDrawerSession) => {
    setCashDrawerSession(session);
    // Save to localStorage
    localStorage.setItem(`cash_session_${seller?.id}`, JSON.stringify(session));
  };

  const handleSessionEnd = (session: CashDrawerSession) => {
    setCashDrawerSession(undefined);
    setCurrentStaff(undefined);
    // Save closed session to history
    const history = JSON.parse(localStorage.getItem(`cash_sessions_history_${seller?.id}`) || '[]');
    history.unshift(session);
    localStorage.setItem(`cash_sessions_history_${seller?.id}`, JSON.stringify(history.slice(0, 50)));
    localStorage.removeItem(`cash_session_${seller?.id}`);
  };

  // Update cash drawer on sale
  const updateCashDrawerOnSale = (amount: number, method: 'cash' | 'card' | 'ewallet' | 'bank_transfer') => {
    if (!cashDrawerSession) return;

    const updatedSession: CashDrawerSession = {
      ...cashDrawerSession,
      totalSales: cashDrawerSession.totalSales + amount,
      totalTransactions: cashDrawerSession.totalTransactions + 1,
      cashSales: method === 'cash' ? cashDrawerSession.cashSales + amount : cashDrawerSession.cashSales,
      cardSales: method === 'card' ? cashDrawerSession.cardSales + amount : cashDrawerSession.cardSales,
      ewalletSales: method === 'ewallet' ? cashDrawerSession.ewalletSales + amount : cashDrawerSession.ewalletSales,
      expectedCash: method === 'cash' ? cashDrawerSession.expectedCash + amount : cashDrawerSession.expectedCash,
      updatedAt: new Date().toISOString(),
    };

    setCashDrawerSession(updatedSession);
    localStorage.setItem(`cash_session_${seller?.id}`, JSON.stringify(updatedSession));
  };

  // Filter products based on search and filter tab
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(query) ||
        product.id.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    if (filterTab === 'low-stock') {
      filtered = filtered.filter(product => product.stock > 0 && product.stock < 10);
    } else if (filterTab === 'best-sellers') {
      // Mock best sellers - in real app, this would be based on sales data
      filtered = filtered.filter(product => product.stock > 0);
    }

    return filtered;
  }, [products, searchQuery, filterTab]);

  // Calculate cart total
  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  // Show product details
  const showDetails = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setSelectedVariantLabel1(product.variantLabel2Values?.[0] || '');
    setSelectedVariantLabel2(product.variantLabel1Values?.[0] || '');
    setShowProductDetails(true);
  };

  // Add product to cart with visual feedback
  const addToCart = (product: typeof products[0], fromModal = false, color?: string, size?: string) => {
    if (product.stock <= 0) return;

    // Flash orange border effect
    if (!fromModal) {
      setFlashingProduct(product.id);
      setTimeout(() => setFlashingProduct(null), 300);
    }

    // Create variant key for unique cart item identification
    const variantKey = `${product.id}-${color || 'default'}-${size || 'default'}`;
    const existingItem = cart.find(item => item.variantKey === variantKey);

    if (existingItem) {
      // Check if we can add more
      if (existingItem.quantity >= product.stock) {
        return; // Cannot add more than available stock
      }

      setCart(cart.map(item =>
        item.variantKey === variantKey
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const variantLabel = [color, size].filter(Boolean).join(' / ');
      setCart([...cart, {
        productId: product.id,
        productName: variantLabel ? `${product.name} (${variantLabel})` : product.name,
        quantity: 1,
        price: product.price,
        image: product.images[0],
        maxStock: product.stock,
        selectedVariantLabel1: color,
        selectedVariantLabel2: size,
        variantKey
      }]);
    }

    if (fromModal) {
      setShowProductDetails(false);
    }
  };

  // Update quantity in cart
  const updateQuantity = (variantKey: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.variantKey === variantKey) {
        const newQuantity = item.quantity + delta;
        if (newQuantity <= 0) return item; // Will be removed below
        if (newQuantity > item.maxStock) return item; // Don't exceed stock
        return { ...item, quantity: newQuantity };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Remove from cart
  const removeFromCart = (variantKey: string) => {
    setCart(cart.filter(item => item.variantKey !== variantKey));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setNote('');
    setBuyerEmail('');
  };

  // Complete sale
  const completeSale = async () => {
    if (cart.length === 0) return;
    if (!seller) {
      alert('Please log in to complete a sale');
      return;
    }

    // Check staff login requirement
    if (posSettings?.enableStaffTracking && posSettings?.requireStaffLogin && !currentStaff) {
      setShowStaffLogin(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Store cart data for receipt before clearing
      const receiptItems = [...cart];
      const subtotal = cartTotal;
      const { tax, total } = calculateTax(subtotal);
      const receiptNote = note;

      // Save to Supabase using orderService
      const result = await orderMutationService.createPOSOrder({
        sellerId: seller.id,
        sellerName: seller.storeName || seller.businessName || 'Store',
        items: cart.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
          image: item.image,
          selectedVariantLabel1: item.selectedVariantLabel1,
          selectedVariantLabel2: item.selectedVariantLabel2
        })),
        total,
        note: receiptNote,
        buyerEmail: buyerEmail.trim() || undefined,
        paymentMethod
      });

      if (!result) {
        throw new Error('Failed to create order');
      }

      // Also update local store for immediate UI update
      await addOfflineOrder(cart, total, receiptNote);

      // Update cash drawer session
      updateCashDrawerOnSale(total, paymentMethod);

      // Set receipt data with professional format
      setReceiptData({
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        items: receiptItems,
        subtotal,
        tax,
        total,
        note: receiptNote,
        date: new Date(),
        sellerName: seller.storeName || seller.businessName || 'BazaarPH Store',
        cashier: currentStaff?.name || seller.ownerName || 'Staff',
        paymentMethod
      });

      // Show success
      setSuccessOrderId(result.orderNumber);
      setShowSuccess(true);
      setShowReceipt(true);

      // Auto-print if enabled
      if (posSettings?.autoPrintReceipt) {
        setTimeout(() => {
          printReceipt();
        }, 500);
      }

      // Refresh orders to show new POS order
      if (seller.id) {
        fetchOrders(seller.id);
      }

      // Clear cart after 2 seconds
      setTimeout(() => {
        clearCart();
      }, 2000);
    } catch (error) {
      console.error('Failed to complete sale:', error);
      alert(error instanceof Error ? error.message : 'Failed to complete sale');
    } finally {
      setIsProcessing(false);
    }
  };

  // Print receipt
  const printReceipt = () => {
    if (!receiptData) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    };

    // Calculate VAT breakdown (12% VAT)
    const vatRate = posSettings?.enableTax ? (posSettings.taxRate / 100) : 0.12;
    const total = receiptData.total;
    const vatableSales = total / (1 + vatRate);
    const vatAmount = total - vatableSales;
    const vatExemptSales = posSettings?.enableTax ? 0 : total; // If tax disabled, treat as VAT-exempt

    const itemsHtml = receiptData.items.map((item, index) => `
      <tr>
        <td colspan="3" style="padding: 4px 0; font-size: 12px;">
          ${index + 1}. ${item.productName}
          ${item.selectedVariantLabel1 || item.selectedVariantLabel2 ? `
            <div style="font-size: 10px; padding-left: 10px; color: #666;">
              ${item.selectedVariantLabel1 ? `${item.selectedVariantLabel1}` : ''}
              ${item.selectedVariantLabel1 && item.selectedVariantLabel2 ? ' | ' : ''}
              ${item.selectedVariantLabel2 ? `${item.selectedVariantLabel2}` : ''}
            </div>
          ` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding: 0 0 8px 10px; font-size: 11px;">${item.quantity} x ₱${item.price.toFixed(2)}</td>
        <td colspan="2" style="padding: 0 0 8px 0; text-align: right; font-size: 11px;">₱${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    // Get BIR-related settings from posSettings or use defaults
    const businessName = posSettings?.businessName || receiptData.sellerName;
    const businessAddress = posSettings?.businessAddress || 'Business Address Not Set';
    const tin = posSettings?.tin || 'XXX-XXX-XXX-XXX';
    const minNumber = posSettings?.minNumber || 'MIN-XXXXXXXXXX';
    const serialNumberRange = posSettings?.serialNumberRange || '00001-99999';
    const permitNumber = posSettings?.permitNumber || 'FP-XXXXXX';
    const accreditationNumber = posSettings?.accreditationNumber || 'ACCR-XXXXXX';
    const accreditedProvider = posSettings?.accreditedProvider || 'BazaarPH POS System';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptData.orderNumber}</title>
          <meta charset="UTF-8">
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', Courier, monospace;
              width: 80mm;
              margin: 0 auto;
              padding: 10px;
              font-size: 11px;
              line-height: 1.3;
              color: #000;
            }
            .receipt { 
              width: 100%;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .large { font-size: 13px; }
            .small { font-size: 9px; }
            .line { 
              border-top: 1px dashed #000; 
              margin: 8px 0;
            }
            .double-line {
              border-top: 1px solid #000;
              margin: 8px 0;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
            }
            .info-row {
              display: table;
              width: 100%;
              margin: 2px 0;
            }
            .info-label {
              display: table-cell;
              width: 40%;
              font-size: 10px;
            }
            .info-value {
              display: table-cell;
              width: 60%;
              text-align: right;
              font-size: 10px;
            }
            .totals-row {
              display: table;
              width: 100%;
              margin: 3px 0;
            }
            .totals-label {
              display: table-cell;
              text-align: left;
              font-size: 11px;
            }
            .totals-value {
              display: table-cell;
              text-align: right;
              font-size: 11px;
            }
            .grand-total {
              font-size: 14px;
              font-weight: bold;
              padding: 5px 0;
            }
            .uppercase { text-transform: uppercase; }
            .mt-1 { margin-top: 4px; }
            .mt-2 { margin-top: 8px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            @media print {
              body { padding: 5px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- HEADER: Business Information -->
            <div class="center bold large mb-1">${businessName}</div>
            <div class="center small mb-1">${businessAddress}</div>
            <div class="center small mb-1">TIN: ${tin}</div>
            
            <div class="line"></div>
            
            <!-- MACHINE INFORMATION -->
            <div class="center small mb-1">
              <div>MIN: ${minNumber}</div>
              <div>SN: ${serialNumberRange}</div>
            </div>
            
            <div class="line"></div>
            
            <!-- OFFICIAL RECEIPT HEADER -->
            <div class="center bold large mt-1 mb-1">OFFICIAL RECEIPT</div>
            
            <!-- TRANSACTION DETAILS -->
            <div class="info-row">
              <div class="info-label">Receipt No:</div>
              <div class="info-value bold">${receiptData.orderNumber}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Date:</div>
              <div class="info-value">${formatDate(receiptData.date)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Time:</div>
              <div class="info-value">${formatTime(receiptData.date)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Cashier:</div>
              <div class="info-value">${receiptData.cashier}</div>
            </div>
            <div class="info-row mb-1">
              <div class="info-label">Customer:</div>
              <div class="info-value">Walk-in</div>
            </div>
            
            <div class="line"></div>
            
            <!-- ITEMS -->
            <div class="bold mb-1" style="font-size: 11px;">ITEMS PURCHASED:</div>
            <table>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <div class="line"></div>
            
            <!-- VAT BREAKDOWN -->
            <div class="mt-1">
              ${posSettings?.enableTax ? `
                <div class="totals-row">
                  <div class="totals-label">VATable Sales:</div>
                  <div class="totals-value">₱${vatableSales.toFixed(2)}</div>
                </div>
                <div class="totals-row">
                  <div class="totals-label">VAT (${(vatRate * 100).toFixed(0)}%):</div>
                  <div class="totals-value">₱${vatAmount.toFixed(2)}</div>
                </div>
                <div class="totals-row">
                  <div class="totals-label">VAT-Exempt Sales:</div>
                  <div class="totals-value">₱0.00</div>
                </div>
                <div class="totals-row">
                  <div class="totals-label">Zero-Rated Sales:</div>
                  <div class="totals-value">₱0.00</div>
                </div>
              ` : `
                <div class="totals-row">
                  <div class="totals-label">VATable Sales:</div>
                  <div class="totals-value">₱0.00</div>
                </div>
                <div class="totals-row">
                  <div class="totals-label">VAT-Exempt Sales:</div>
                  <div class="totals-value">₱${vatExemptSales.toFixed(2)}</div>
                </div>
                <div class="totals-row">
                  <div class="totals-label">Zero-Rated Sales:</div>
                  <div class="totals-value">₱0.00</div>
                </div>
              `}
            </div>
            
            <div class="double-line"></div>
            
            <!-- TOTAL -->
            <div class="totals-row grand-total">
              <div class="totals-label">TOTAL AMOUNT DUE:</div>
              <div class="totals-value">₱${total.toFixed(2)}</div>
            </div>
            
            <div class="double-line"></div>
            
            <!-- PAYMENT INFO -->
            <div class="center mt-1 mb-1">
              <div class="bold">✓ PAID - ${receiptData.paymentMethod === 'cash' ? 'CASH' :
        receiptData.paymentMethod === 'card' ? 'CARD' :
          receiptData.paymentMethod === 'ewallet' ? 'E-WALLET' :
            receiptData.paymentMethod === 'bank_transfer' ? 'BANK TRANSFER' : 'CASH'
      }</div>
            </div>
            
            ${receiptData.note ? `
              <div class="line"></div>
              <div class="small mt-1 mb-1">
                <div class="bold">Note:</div>
                <div>${receiptData.note}</div>
              </div>
            ` : ''}
            
            <div class="line"></div>
            
            <!-- BIR FOOTER -->
            <div class="center small mt-2 mb-1">
              <div class="bold mb-1">${!posSettings?.enableTax ? 'THIS DOCUMENT IS NOT VALID' : ''}</div>
              <div class="bold mb-1">${!posSettings?.enableTax ? 'FOR CLAIM OF INPUT TAX' : ''}</div>
              ${posSettings?.enableTax ? '<div class="mb-1">THIS SERVES AS AN OFFICIAL RECEIPT</div>' : ''}
            </div>
            
            <!-- ACCREDITATION INFO -->
            <div class="center small mt-1 mb-1">
              <div>BIR Permit No: ${permitNumber}</div>
              <div>Accreditation No: ${accreditationNumber}</div>
              <div>Date Issued: ${posSettings?.validityDate || 'MM/DD/YYYY'}</div>
              <div class="mt-1">POS Provider:</div>
              <div>${accreditedProvider}</div>
            </div>
            
            <div class="line"></div>
            
            <!-- THANK YOU MESSAGE -->
            <div class="center mt-2 mb-1">
              <div class="bold" style="font-size: 12px;">Thank you for shopping with us!</div>
              <div class="small mt-1">Please come again</div>
            </div>
            
            <div class="center small mt-2">
              <div>www.bazaarph.com</div>
              <div>Powered by BazaarPH POS</div>
            </div>
            
            <!-- END OF RECEIPT MARKER -->
            <div class="center mt-2 mb-1 small">--- END OF RECEIPT ---</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
              // Close window after printing (optional)
              // window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Get stock badge


  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden h-[calc(100vh-theme(spacing.0))]">
        {/* Left Panel: Product Catalog */}
        <div className="w-full lg:w-[65%] flex flex-col bg-[var(--brand-wash)] overflow-hidden">
          {/* Header with Search and Filters */}
          <div className="px-6 py-5 bg-white/80 backdrop-blur-sm flex-shrink-0">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-black text-[var(--text-headline)] font-heading tracking-tight">POS Lite</h1>
                <p className="text-sm text-gray-400 mt-0.5">Quick checkout for offline sales</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPOSSettings(true)}
                  className="h-9 w-9 hover:bg-transparent text-gray-500 hover:text-[var(--text-accent)] rounded-full transition-colors"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* POS Status Bar */}
            {(posSettings?.enableStaffTracking || posSettings?.enableCashDrawer || posSettings?.enableMultiBranch) && (
              <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-2">
                {/* Staff Status */}
                {posSettings?.enableStaffTracking && (
                  <div>
                    {currentStaff ? (
                      <StaffBadge staff={currentStaff} onLogout={handleStaffLogout} />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowStaffLogin(true)}
                        className="w-full gap-2"
                      >
                        <User className="h-4 w-4" />
                        Staff Login
                      </Button>
                    )}
                  </div>
                )}

                {/* Cash Drawer Status */}
                {posSettings?.enableCashDrawer && (
                  <div>
                    <CashDrawerBadge
                      session={cashDrawerSession}
                      onClick={() => setShowCashDrawer(true)}
                    />
                  </div>
                )}

                {/* Branch Selector */}
                {posSettings?.enableMultiBranch && (
                  <div>
                    <BranchSelector
                      branches={MOCK_BRANCHES}
                      currentBranch={currentBranch}
                      onSelect={setCurrentBranch}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Hardware Scanner Status - Show when settings enabled */}
            {(posSettings?.enableBarcodeScanner || posSettings?.scannerType) && (
              <div className="mb-4 flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2 border border-gray-200">
                <div className="flex items-center gap-3">
                  {/* Scanner Type Indicator */}
                  {posSettings.scannerType === 'usb' && (
                    <>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        scannerActive && !scannerPaused ? "bg-green-500 animate-pulse" : "bg-gray-400"
                      )} />
                      <span className="text-sm text-gray-600">
                        {scannerActive && !scannerPaused
                          ? 'USB Scanner Ready'
                          : 'USB Scanner Paused'}
                      </span>
                    </>
                  )}
                  {posSettings.scannerType === 'bluetooth' && (
                    <>
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        scannerActive && !scannerPaused ? "bg-blue-500 animate-pulse" : "bg-gray-400"
                      )} />
                      <span className="text-sm text-gray-600">
                        {scannerActive && !scannerPaused
                          ? 'Bluetooth Scanner Ready'
                          : 'Bluetooth Scanner Paused'}
                      </span>
                    </>
                  )}
                  {posSettings.scannerType === 'camera' && (
                    <>
                      <div className="w-2 h-2 rounded-full bg-orange-400" />
                      <span className="text-sm text-gray-600">
                        Camera Mode - Click Scan to use
                      </span>
                    </>
                  )}
                  {lastScan && (posSettings.scannerType === 'usb' || posSettings.scannerType === 'bluetooth') && (
                    <span className="text-xs text-gray-400">
                      Last: {lastScan.slice(0, 12)}{lastScan.length > 12 ? '...' : ''}
                    </span>
                  )}
                  {scanCount > 0 && (posSettings.scannerType === 'usb' || posSettings.scannerType === 'bluetooth') && (
                    <Badge variant="secondary" className="text-xs">
                      {scanCount} scans
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="h-8 w-8 p-0"
                  title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                >
                  {soundEnabled ? (
                    <Volume2 className="h-4 w-4 text-gray-600" />
                  ) : (
                    <VolumeX className="h-4 w-4 text-gray-400" />
                  )}
                </Button>
              </div>
            )}

            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row items-center gap-3 -mb-2">
              {/* Quick Filter Pills */}
              <div className="w-full lg:flex-1 overflow-x-auto scrollbar-hide pb-0.5">
                <div className="inline-flex items-center p-1 bg-white rounded-full border border-orange-100/50 shadow-sm min-w-full md:min-w-0">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300",
                      filterTab === 'all'
                        ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                        : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    )}
                  >
                    All Items
                  </button>
                  <button
                    onClick={() => setFilterTab('low-stock')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300",
                      filterTab === 'low-stock'
                        ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                        : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    )}
                  >
                    <AlertCircle className={cn("h-3.5 w-3.5", filterTab === 'low-stock' ? "text-white" : "text-gray-400 group-hover:text-[var(--brand-primary)]")} />
                    Low Stock
                  </button>
                  <button
                    onClick={() => setFilterTab('best-sellers')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300",
                      filterTab === 'best-sellers'
                        ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                        : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50"
                    )}
                  >
                    <TrendingUp className={cn("h-3.5 w-3.5", filterTab === 'best-sellers' ? "text-white" : "text-gray-400 group-hover:text-[var(--brand-primary)]")} />
                    Best Sellers
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full lg:w-auto flex-shrink-0">
                <div className="flex gap-2">
                  <div className="relative flex-1 group lg:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                    <Input
                      type="text"
                      placeholder="Search for products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 rounded-xl text-sm border-orange-200 bg-white focus-visible:ring-2 focus-visible:ring-orange-100 focus-visible:border-orange-300 transition-all shadow-sm placeholder:text-gray-400"
                    />
                  </div>
                  <Button
                    onClick={() => setShowBarcodeScanner(true)}
                    className="h-10 px-4 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--text-accent)] gap-2 shadow-md shadow-[var(--brand-primary)]/20 font-bold transition-all text-xs"
                  >
                    <Scan className="h-4 w-4" />
                    Scan
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Grid - Scrollable */}
          <ScrollArea className="flex-1 px-6 py-5">
            <div className="mb-4 text-sm text-gray-500">
              Showing <span className="font-bold text-[var(--brand-primary)]">{filteredProducts.length}</span> products
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock === 0;
                const cartItem = cart.find(item => item.productId === product.id);
                const remainingStock = product.stock - (cartItem?.quantity || 0);
                const isFlashing = flashingProduct === product.id;

                return (
                  <motion.div
                    key={product.id}
                    whileHover={!isOutOfStock ? { y: -2 } : {}}
                    className="group relative"
                  >
                    <Card
                      className={cn(
                        "overflow-hidden transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 bg-white cursor-pointer rounded-xl border-orange-100/50 hover:border-orange-200",
                        isOutOfStock && "opacity-50 grayscale cursor-not-allowed",
                        isFlashing && "ring-4 ring-[#FF5722]/30 ring-offset-2"
                      )}
                      onClick={() => !isOutOfStock && showDetails(product)}
                    >
                      {/* Product Image with Overlays */}
                      <div className="aspect-square relative overflow-hidden bg-gray-50">
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Cart Quantity Badge - Top Right */}
                        {cartItem && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 bg-[#FF5722] text-white rounded-full h-7 w-7 flex items-center justify-center text-xs shadow-lg z-10"
                          >
                            ×{cartItem.quantity}
                          </motion.div>
                        )}

                        {/* Hover Add Indicator */}
                        {!isOutOfStock && !cartItem && (
                          <div className="absolute inset-0 bg-[#FF5722]/0 group-hover:bg-[#FF5722]/10 transition-all duration-200 flex items-center justify-center">
                            <Plus className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </div>

                      {/* Product Info - Detailed */}
                      <div className="p-3 space-y-2">
                        {/* Product Name */}
                        <h3 className="font-semibold text-sm line-clamp-2 text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-colors min-h-[2.5rem] leading-tight" title={product.name}>
                          {product.name}
                        </h3>

                        {/* Category Badge */}
                        <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-5 border-gray-300">
                          {product.category}
                        </Badge>

                        {/* Product Details Grid */}
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground pt-1">
                          {/* SKU */}
                          <div className="flex items-center gap-1">
                            <Hash className="h-3 w-3 text-gray-400" />
                            <span className="font-mono truncate">{product.id.slice(-8)}</span>
                          </div>

                          {/* Stock Count */}
                          <div className="flex items-center gap-1 justify-end">
                            <Package className="h-3 w-3 text-gray-400" />
                            <span className={cn(
                              "font-semibold",
                              remainingStock === 0 ? "text-red-600" :
                                remainingStock < 10 ? "text-orange-600" :
                                  "text-green-600"
                            )}>
                              {remainingStock} in stock
                            </span>
                          </div>

                          {/* Sales */}
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-gray-400" />
                            <span>{product.sales || 0} sold</span>
                          </div>

                          {/* Rating */}
                          <div className="flex items-center gap-1 justify-end">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span>{product.rating ? product.rating.toFixed(1) : '0.0'} ({product.reviews || 0})</span>
                          </div>
                        </div>

                        {/* Price - Prominent */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                          <span className="text-lg font-bold text-[#FF5722]">
                            ₱{product.price.toLocaleString()}
                          </span>
                          {!isOutOfStock && (
                            <Button
                              size="sm"
                              className="h-7 px-3 bg-[#FF5722] hover:bg-[#F4511E] text-white text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Search className="h-16 w-16 mb-4" />
                <p className="text-lg font-medium">No products found</p>
                <p className="text-sm">Try a different search or filter</p>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Right Panel: Cart/Register */}
        <div className="hidden lg:flex lg:w-[35%] flex-col bg-background border-l border-gray-200">
          {/* Cart Header */}
          <div className="px-5 py-4 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--secondary-foreground)]">Current Sale</h2>
              {cart.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-3"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Cart Items - Scrollable Area */}
          <ScrollArea className="flex-1 px-5 py-3">
            <AnimatePresence>
              {cart.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center py-12"
                >
                  <div className="h-20 w-20 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <ShoppingCart className="h-10 w-10 text-gray-300" />
                  </div>
                  <p className="text-base font-bold text-gray-900 mb-1">Cart is empty</p>
                  <p className="text-sm text-muted-foreground">Click products to add</p>
                </motion.div>
              ) : (
                <div className="space-y-2 pb-3">
                  {cart.map((item) => (
                    <motion.div
                      key={item.variantKey}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      layout
                      className="group bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 p-3">
                        {/* Thumbnail */}
                        <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs line-clamp-1 text-gray-900">
                            {item.productName}
                          </h4>
                          {/* Show variant info (color/size) if available */}
                          {(item.selectedVariantLabel1 || item.selectedVariantLabel2) && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {item.selectedVariantLabel1 && (
                                <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                  {item.selectedVariantLabel1}
                                </span>
                              )}
                              {item.selectedVariantLabel2 && (
                                <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                  {item.selectedVariantLabel2}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-0.5">
                            ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each
                          </p>

                          {/* Quantity Controls - Unified Pill */}
                          <div className="flex items-center gap-1.5 mt-2">
                            <div className="flex items-center border border-gray-300 rounded-full overflow-hidden">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.variantKey!, -1);
                                }}
                                className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 transition-colors"
                              >
                                <Minus className="h-3 w-3 text-gray-600" />
                              </button>

                              <span className="text-xs font-bold w-8 text-center text-gray-900">
                                {item.quantity}
                              </span>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateQuantity(item.variantKey!, 1);
                                }}
                                disabled={item.quantity >= item.maxStock}
                                className="h-6 w-6 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                              >
                                <Plus className="h-3 w-3 text-gray-600" />
                              </button>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromCart(item.variantKey!);
                              }}
                              className="h-6 w-6 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Item Subtotal */}
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-gray-900">
                            ₱{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Sticky Footer - Payment Section */}
          {cart.length > 0 && (
            <div className="border-t border-gray-200 bg-white flex-shrink-0">
              {/* Buyer Email Input - Optional for points */}
              <div className="px-5 py-3 border-b border-gray-100">
                <label className="text-xs font-medium text-gray-500 mb-1 block">Customer Email (optional - for BazCoins)</label>
                <Input
                  type="email"
                  placeholder="customer@email.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                  className="border-gray-300 h-9 text-sm"
                />
              </div>

              {/* Note Input */}
              <div className="px-5 py-3 border-b border-gray-100">
                <Input
                  placeholder="Add note (optional)..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="border-gray-300 h-9 text-sm"
                />
              </div>

              {/* Financial Breakdown */}
              <div className="px-5 py-4 space-y-2 bg-gray-50/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-gray-700">₱{cartTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-medium text-gray-700">₱0.00</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {posSettings?.enableTax && (
                      <Calculator className="h-3 w-3" />
                    )}
                    Tax {posSettings?.enableTax && `(${posSettings.taxRate}%)`}
                  </span>
                  <span className="font-medium text-gray-700">
                    ₱{calculateTax(cartTotal).tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Total - Massive */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-3xl font-extrabold text-gray-900">
                    ₱{calculateTax(cartTotal).total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Payment Method Selector */}
              {posSettings && posSettings.acceptedPaymentMethods.length > 1 && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <label className="text-xs font-medium text-gray-500 mb-2 block">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    {posSettings.acceptedPaymentMethods.includes('cash') && (
                      <Button
                        variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('cash')}
                        className={paymentMethod === 'cash' ? 'bg-[#FF6A00] hover:bg-[#E65F00]' : ''}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Cash
                      </Button>
                    )}
                    {posSettings.acceptedPaymentMethods.includes('card') && (
                      <Button
                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('card')}
                        className={paymentMethod === 'card' ? 'bg-[#FF6A00] hover:bg-[#E65F00]' : ''}
                      >
                        <CreditCard className="h-4 w-4 mr-1" />
                        Card
                      </Button>
                    )}
                    {posSettings.acceptedPaymentMethods.includes('ewallet') && (
                      <Button
                        variant={paymentMethod === 'ewallet' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('ewallet')}
                        className={paymentMethod === 'ewallet' ? 'bg-[#FF6A00] hover:bg-[#E65F00]' : ''}
                      >
                        E-Wallet
                      </Button>
                    )}
                    {posSettings.acceptedPaymentMethods.includes('bank_transfer') && (
                      <Button
                        variant={paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className={paymentMethod === 'bank_transfer' ? 'bg-[#FF6A00] hover:bg-[#E65F00]' : ''}
                      >
                        Bank
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Charge Button */}
              <div className="px-5 py-4 bg-white">
                <Button
                  onClick={completeSale}
                  disabled={isProcessing}
                  className="w-full h-14 text-base font-bold bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:shadow-lg hover:shadow-orange-500/30 text-white rounded-2xl transition-all transform active:scale-95"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      {paymentMethod === 'cash' && <DollarSign className="h-5 w-5 mr-2" />}
                      {paymentMethod === 'card' && <CreditCard className="h-5 w-5 mr-2" />}
                      Charge ₱{calculateTax(cartTotal).total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Details Modal */}
      <Dialog open={showProductDetails} onOpenChange={setShowProductDetails}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-[var(--secondary-foreground)]">
                  Product Details
                </DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Product Images */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      <img
                        src={selectedProduct.images[0]}
                        alt={selectedProduct.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Thumbnail Gallery */}
                    {selectedProduct.images.length > 1 && (
                      <div className="grid grid-cols-4 gap-2">
                        {selectedProduct.images.slice(1, 5).map((img, idx) => (
                          <div key={idx} className="aspect-square rounded-md overflow-hidden bg-gray-100 border border-gray-200">
                            <img src={img} alt={`${selectedProduct.name} ${idx + 2}`} className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Key Metrics List */}
                  <div className="space-y-3 pt-2">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Stock Available</span>
                      <span className={cn(
                        "text-base",
                        selectedProduct.stock === 0 ? "text-red-600" :
                          selectedProduct.stock < 10 ? "text-orange-600" :
                            "text-green-600"
                      )}>
                        {selectedProduct.stock}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Total Sales</span>
                      <span className="text-base text-[var(--secondary-foreground)]">
                        {selectedProduct.sales || 0}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Rating</span>
                      <span className="text-base text-[var(--secondary-foreground)]">
                        {selectedProduct.rating ? selectedProduct.rating.toFixed(1) : '0.0'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Reviews</span>
                      <span className="text-base text-[var(--secondary-foreground)]">
                        {selectedProduct.reviews || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Product Information */}
                <div className="space-y-4">
                  {/* Name & Price */}
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--secondary-foreground)] mb-2">
                      {selectedProduct.name}
                    </h2>
                    <div className="text-3xl font-extrabold text-[var(--brand-primary)]">
                      ₱{selectedProduct.price.toLocaleString()}
                    </div>
                  </div>

                  {/* Category & Status */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-sm font-medium">
                      {selectedProduct.category}
                    </Badge>
                    <Badge
                      className={cn(
                        "text-sm font-medium",
                        selectedProduct.approvalStatus === 'approved' ? "bg-green-500" :
                          selectedProduct.approvalStatus === 'pending' ? "bg-yellow-500" :
                            "bg-red-500"
                      )}
                    >
                      {selectedProduct.approvalStatus}
                    </Badge>
                  </div>



                  {/* Variant Selection - Colors */}
                  {selectedProduct.variantLabel2Values && selectedProduct.variantLabel2Values.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Variant 1</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.variantLabel2Values.map((val) => (
                          <button
                            key={val}
                            onClick={() => setSelectedVariantLabel1(val)}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              selectedVariantLabel1 === val
                                ? "border-[#FF5722] bg-orange-50 text-[#FF5722]"
                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Variant Selection - Sizes */}
                  {selectedProduct.variantLabel1Values && selectedProduct.variantLabel1Values.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Variant 2</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.variantLabel1Values.map((val) => (
                          <button
                            key={val}
                            onClick={() => setSelectedVariantLabel2(val)}
                            className={cn(
                              "px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                              selectedVariantLabel2 === val
                                ? "border-[#FF5722] bg-orange-50 text-[#FF5722]"
                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-muted-foreground font-medium">Product ID</span>
                      <span className="font-mono text-gray-900">{selectedProduct.id}</span>
                    </div>

                    {selectedProduct.description && (
                      <div className="py-2">
                        <span className="text-muted-foreground font-medium block mb-2">Description</span>
                        <p className="text-gray-700 leading-relaxed">{selectedProduct.description}</p>
                      </div>
                    )}

                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-muted-foreground font-medium">Created</span>
                      <span className="text-gray-900">
                        {new Date(selectedProduct.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-muted-foreground font-medium">Last Updated</span>
                      <span className="text-gray-900">
                        {new Date(selectedProduct.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <div className="pt-4">
                    <Button
                      onClick={() => addToCart(selectedProduct, true, selectedVariantLabel1 || undefined, selectedVariantLabel2 || undefined)}
                      disabled={selectedProduct.stock === 0}
                      className="w-full h-12 text-base font-bold bg-[#FF5722] hover:bg-[#E64A19] text-white"
                    >
                      {selectedProduct.stock === 0 ? (
                        'Out of Stock'
                      ) : (
                        <>
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog with Receipt */}
      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Sale Completed!
            </DialogTitle>
            <DialogDescription>
              Order saved to database and inventory updated
            </DialogDescription>
          </DialogHeader>

          {/* Receipt Preview */}
          <div ref={receiptRef} className="bg-gradient-to-b from-orange-50 to-white border border-orange-200 rounded-lg overflow-hidden mt-2">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#FF5722] to-[#FF7043] text-white px-4 py-3 text-center">
              <div className="text-lg font-bold">🛒 BazaarPH</div>
              <div className="text-xs opacity-90">{receiptData?.sellerName || 'Store'}</div>
            </div>

            {/* Order Info */}
            <div className="p-4">
              <div className="flex justify-between text-xs text-gray-600 mb-3">
                <div>
                  <div className="font-medium text-gray-800">Receipt #{receiptData?.orderNumber}</div>
                  <div>{receiptData?.date.toLocaleDateString('en-PH', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}</div>
                </div>
                <div className="text-right">
                  <div>Cashier: {receiptData?.cashier || 'Staff'}</div>
                  <div>Customer: Walk-in</div>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-b border-dashed border-gray-300 py-2 my-2">
                {receiptData?.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm py-1.5">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{item.productName}</div>
                      {(item.selectedVariantLabel1 || item.selectedVariantLabel2) && (
                        <div className="text-xs text-gray-500">
                          {[item.selectedVariantLabel1, item.selectedVariantLabel2].filter(Boolean).join(' / ')}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {item.quantity} × ₱{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div className="font-medium text-gray-800">
                      ₱{(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-sm">
                {posSettings?.enableTax && posSettings?.taxIncludedInPrice ? (
                  // Tax-inclusive display - show VAT breakdown
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>VATable Sales</span>
                      <span>₱{((receiptData?.subtotal || 0) / (1 + (posSettings?.taxRate || 12) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>VAT ({posSettings?.taxRate || 12}%)</span>
                      <span>₱{(receiptData?.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : posSettings?.enableTax ? (
                  // Tax-exclusive display - tax added on top
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>₱{(receiptData?.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax ({posSettings?.taxRate || 12}%)</span>
                      <span>₱{(receiptData?.tax || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </>
                ) : (
                  // No tax
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₱{(receiptData?.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-[#FF5722] pt-2 border-t border-gray-200">
                  <span>TOTAL</span>
                  <span>₱{(receiptData?.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {receiptData?.note && (
                <div className="text-xs text-gray-600 mt-3 p-2 bg-orange-50 rounded border-l-2 border-orange-400">
                  <span className="font-medium">Note:</span> {receiptData.note}
                </div>
              )}

              {/* Payment Badge */}
              <div className="text-center mt-3">
                <Badge className="bg-green-500 text-white">
                  ✓ PAID - {
                    receiptData?.paymentMethod === 'cash' ? 'CASH' :
                      receiptData?.paymentMethod === 'card' ? 'CARD' :
                        receiptData?.paymentMethod === 'ewallet' ? 'E-WALLET' :
                          receiptData?.paymentMethod === 'bank_transfer' ? 'BANK TRANSFER' : 'CASH'
                  }
                </Badge>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 text-center border-t">
              <div className="text-xs text-gray-600">Thank you for shopping! 🧡</div>
              <div className="text-[10px] text-gray-400 mt-1">Powered by BazaarPH POS</div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              onClick={printReceipt}
              variant="outline"
              className="flex-1 border-orange-200 hover:bg-orange-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button
              onClick={() => navigate('/seller/orders')}
              className="flex-1 bg-[#FF5722] hover:bg-[#E64A19]"
            >
              <Receipt className="h-4 w-4 mr-2" />
              View Orders
            </Button>
          </div>
          <Button
            onClick={() => setShowSuccess(false)}
            variant="ghost"
            className="w-full mt-2 text-gray-500"
          >
            Close & New Sale
          </Button>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcode={handleBarcodeScanned}
        scannerType={posSettings?.scannerType ?? 'camera'}
        autoAddOnScan={posSettings?.autoAddOnScan ?? true}
      />

      {/* Staff Login Dialog */}
      <StaffLogin
        open={showStaffLogin}
        onClose={() => setShowStaffLogin(false)}
        onLogin={handleStaffLogin}
        currentStaff={currentStaff}
      />

      {/* Cash Drawer Manager Dialog */}
      <CashDrawerManager
        open={showCashDrawer}
        onClose={() => setShowCashDrawer(false)}
        currentSession={cashDrawerSession}
        staff={currentStaff}
        onSessionStart={handleSessionStart}
        onSessionEnd={handleSessionEnd}
      />

      {/* POS Settings Modal */}
      {seller?.id && (
        <POSSettingsModal
          open={showPOSSettings}
          onClose={() => setShowPOSSettings(false)}
          sellerId={seller.id}
          onSettingsChange={(newSettings) => setPOSSettings(newSettings)}
        />
      )}

      {/* Quick Product Modal - for creating products from barcode scan */}
      {seller?.id && (
        <QuickProductModal
          open={showQuickProductModal}
          onClose={() => {
            setShowQuickProductModal(false);
            setPendingBarcode('');
          }}
          onProductCreated={handleQuickProductCreated}
          initialBarcode={pendingBarcode}
          sellerId={seller.id}
        />
      )}
    </div>
  );
}

export default SellerPOS;

