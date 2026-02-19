/**
 * Barcode Scanner React Hooks
 * Provides React integration for the barcode input handler
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarcodeInputHandler, 
  type BarcodeInputConfig,
  type BarcodeCallback 
} from '@/lib/barcodeInputHandler';

export interface UseBarcodeScanner {
  /** Last successfully scanned barcode */
  lastScan: string | null;
  /** Timestamp of last scan */
  lastScanTime: Date | null;
  /** Whether the scanner is actively listening */
  isActive: boolean;
  /** Pause scanning (e.g., when dialog opens) */
  pause: () => void;
  /** Resume scanning */
  resume: () => void;
  /** Current buffer contents (for debugging) */
  buffer: string;
  /** Total scan count this session */
  scanCount: number;
}

/**
 * Hook for hardware barcode scanner integration
 * 
 * @param onScan - Callback when a barcode is scanned
 * @param config - Scanner configuration options
 * @returns Scanner state and controls
 * 
 * @example
 * ```tsx
 * const { lastScan, isActive, pause, resume } = useBarcodeScanner(
 *   (barcode) => console.log('Scanned:', barcode),
 *   { debug: true }
 * );
 * ```
 */
export function useBarcodeScanner(
  onScan: BarcodeCallback,
  config: Partial<BarcodeInputConfig> = {}
): UseBarcodeScanner {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [buffer, setBuffer] = useState('');
  const [scanCount, setScanCount] = useState(0);
  
  const handlerRef = useRef<BarcodeInputHandler | null>(null);
  const onScanRef = useRef(onScan);
  const bufferIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep onScan ref updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  // Initialize handler
  useEffect(() => {
    const handler = new BarcodeInputHandler(config);
    handlerRef.current = handler;

    const handleScan = (barcode: string) => {
      setLastScan(barcode);
      setLastScanTime(new Date());
      setScanCount(prev => prev + 1);
      onScanRef.current(barcode);
    };

    handler.start(handleScan);
    setIsActive(true);

    // Poll buffer for debugging
    bufferIntervalRef.current = setInterval(() => {
      if (handlerRef.current) {
        setBuffer(handlerRef.current.getBuffer());
      }
    }, 50);

    return () => {
      handler.stop();
      setIsActive(false);
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current);
      }
    };
  }, []); // Only run once on mount

  const pause = useCallback(() => {
    handlerRef.current?.pause();
    setIsActive(false);
  }, []);

  const resume = useCallback(() => {
    handlerRef.current?.resume();
    setIsActive(true);
  }, []);

  return {
    lastScan,
    lastScanTime,
    isActive,
    pause,
    resume,
    buffer,
    scanCount,
  };
}

export interface UsePOSBarcodeScanner extends UseBarcodeScanner {
  /** Whether a lookup is in progress */
  isLookingUp: boolean;
  /** Last lookup error */
  lookupError: string | null;
  /** Clear the error */
  clearError: () => void;
}

export interface POSBarcodeLookupResult {
  type: 'product' | 'variant' | null;
  id: string | null;
  name: string | null;
  price: number | null;
  stock: number | null;
  imageUrl: string | null;
  variantName?: string | null;
  productId?: string | null;
  sku?: string | null;
  isFound: boolean;
}

/**
 * POS-specific barcode scanner hook with automatic product lookup
 * 
 * @param vendorId - The seller's ID for scoping lookups
 * @param onProductFound - Callback when a product is found
 * @param onNotFound - Callback when barcode is not found
 * @param config - Scanner configuration
 * 
 * @example
 * ```tsx
 * const { isActive, isLookingUp } = usePOSBarcodeScanner(
 *   vendorId,
 *   (product) => addToCart(product),
 *   (barcode) => showError(`Not found: ${barcode}`)
 * );
 * ```
 */
export function usePOSBarcodeScanner(
  vendorId: string | undefined,
  onProductFound: (result: POSBarcodeLookupResult) => void,
  onNotFound: (barcode: string) => void,
  config: Partial<BarcodeInputConfig> = {}
): UsePOSBarcodeScanner {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  
  const onProductFoundRef = useRef(onProductFound);
  const onNotFoundRef = useRef(onNotFound);

  useEffect(() => {
    onProductFoundRef.current = onProductFound;
  }, [onProductFound]);

  useEffect(() => {
    onNotFoundRef.current = onNotFound;
  }, [onNotFound]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!vendorId) {
      setLookupError('No seller ID');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);

    try {
      // Dynamic import to avoid circular dependencies
      const { lookupBarcodeQuick } = await import('@/services/barcodeService');
      const result = await lookupBarcodeQuick(vendorId, barcode);

      if (result.isFound) {
        onProductFoundRef.current(result);
      } else {
        onNotFoundRef.current(barcode);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lookup failed';
      setLookupError(message);
      onNotFoundRef.current(barcode);
    } finally {
      setIsLookingUp(false);
    }
  }, [vendorId]);

  const scanner = useBarcodeScanner(handleScan, config);

  const clearError = useCallback(() => {
    setLookupError(null);
  }, []);

  return {
    ...scanner,
    isLookingUp,
    lookupError,
    clearError,
  };
}

/**
 * Hook for simulating barcode scans (for testing)
 */
export function useBarcodeScanSimulator(
  onScan: BarcodeCallback
): {
  simulateScan: (barcode: string) => void;
  simulateRandomScan: () => void;
} {
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const simulateScan = useCallback((barcode: string) => {
    onScanRef.current(barcode);
  }, []);

  const simulateRandomScan = useCallback(() => {
    // Generate random barcode-like string
    const prefix = 'BC';
    const random = Math.random().toString().slice(2, 14).padStart(12, '0');
    simulateScan(`${prefix}${random}`);
  }, [simulateScan]);

  return { simulateScan, simulateRandomScan };
}
