import { useState, useEffect, useRef } from 'react';
import { Scan, Camera, X, Keyboard, Volume2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface BarcodeScannerProps {
  open: boolean;
  onClose: () => void;
  onBarcode: (barcode: string) => Promise<boolean> | boolean; // Returns true if product was found
  scannerType: 'camera' | 'usb' | 'bluetooth';
  autoAddOnScan: boolean;
}

// Supported barcode formats
const SUPPORTED_FORMATS = [
  'code_128',
  'code_39',
  'code_93', 
  'ean_13',
  'ean_8',
  'itf',
  'upc_a',
  'upc_e',
  'qr_code'
] as const;

export function BarcodeScanner({
  open,
  onClose,
  onBarcode,
  scannerType: initialScannerType = 'camera',
  autoAddOnScan
}: BarcodeScannerProps) {
  const [currentMode, setCurrentMode] = useState<'camera' | 'usb' | 'bluetooth'>(initialScannerType);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastScan, setLastScan] = useState('');
  const [lastScanSuccess, setLastScanSuccess] = useState<boolean | null>(null);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isBarcodeDetectorSupported, setIsBarcodeDetectorSupported] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Check if BarcodeDetector API is supported (only check once)
  useEffect(() => {
    const isSupported = 'BarcodeDetector' in window;
    setIsBarcodeDetectorSupported(isSupported);
    // Don't log warning - just use fallback silently
  }, []);

  // Play scan sound
  const playBeep = (success: boolean = true) => {
    try {
      // Create short beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = success ? 800 : 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.error('Failed to play beep:', error);
    }
  };

  // USB/Bluetooth Scanner: Listen for keyboard input
  useEffect(() => {
    if (!open || currentMode === 'camera') return;

    let buffer = '';
    let timeout: NodeJS.Timeout;

    const handleKeyPress = (e: KeyboardEvent) => {
      // If scanning with USB/Bluetooth scanner, capture keypresses
      if (e.key === 'Enter') {
        if (buffer.length > 0) {
          handleScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        
        // Clear buffer after 100ms of no input (in case it's manual typing)
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          buffer = '';
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [open, currentMode]);

  // Camera Scanner: Initialize camera and start detection
  useEffect(() => {
    if (!open || currentMode !== 'camera' || !videoRef.current) return;

    let stream: MediaStream;
    let barcodeDetector: any;

    const startCamera = async () => {
      try {
        // Request camera access with back camera preference
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsScanning(true);
          setError('');

          // Initialize BarcodeDetector if supported
          if (isBarcodeDetectorSupported) {
            try {
              barcodeDetector = new (window as any).BarcodeDetector({
                formats: SUPPORTED_FORMATS
              });

              // Start continuous detection
              scanIntervalRef.current = setInterval(async () => {
                if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                  try {
                    const barcodes = await barcodeDetector.detect(videoRef.current);
                    if (barcodes && barcodes.length > 0) {
                      const barcode = barcodes[0].rawValue;
                      if (barcode && barcode !== lastScan) {
                        handleScan(barcode);
                      }
                    }
                  } catch (detectError) {
                    console.error('Barcode detection error:', detectError);
                  }
                }
              }, 300); // Scan every 300ms
            } catch (detectorError) {
              console.error('Failed to initialize BarcodeDetector:', detectorError);
              setError('Barcode detection failed. Please use manual entry.');
            }
          } else {
            setError('Camera barcode detection not supported. Please use manual entry or hardware scanner.');
          }
        }
      } catch (error) {
        console.error('Failed to access camera:', error);
        setError('Failed to access camera. Please check permissions or use manual entry.');
        setIsScanning(false);
      }
    };

    startCamera();

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setIsScanning(false);
    };
  }, [open, currentMode, isBarcodeDetectorSupported]);

  const handleScan = async (barcode: string) => {
    // Validate barcode (basic validation - not empty and alphanumeric)
    if (!barcode || barcode.trim().length === 0) {
      playBeep(false);
      return;
    }

    // Prevent duplicate scans while processing
    if (isProcessing || barcode === lastScan) {
      return;
    }

    setIsProcessing(true);
    setLastScan(barcode);
    setLastScanSuccess(null);
    
    // Trigger callback and wait for result
    try {
      const result = await onBarcode(barcode);
      const success = result === true;
      
      setLastScanSuccess(success);
      setScanHistory(prev => {
        const newHistory = [barcode, ...prev.filter(b => b !== barcode)].slice(0, 5);
        return newHistory;
      });
      
      // Play sound based on result
      playBeep(success);
      
      if (success && autoAddOnScan) {
        // Auto-close if successful and autoAddOnScan is enabled
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch {
      setLastScanSuccess(false);
      playBeep(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBarcode = manualBarcode.trim();
    
    if (!trimmedBarcode) {
      setError('Please enter a barcode');
      playBeep(false);
      return;
    }

    // Validate barcode format (alphanumeric, dashes, and spaces allowed)
    if (!/^[A-Za-z0-9\s\-]+$/.test(trimmedBarcode)) {
      setError('Invalid barcode format. Use letters, numbers, dashes, or spaces.');
      playBeep(false);
      return;
    }

    setError('');
    handleScan(trimmedBarcode);
    setManualBarcode('');
    
    // Keep focus on input for quick successive scans
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleClose = () => {
    setManualBarcode('');
    setLastScan('');
    setLastScanSuccess(null);
    setIsProcessing(false);
    setError('');
    setScanHistory([]);
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-[#FF6A00]" />
            Barcode Scanner
            {currentMode === 'camera' && <Camera className="h-4 w-4 text-gray-500" />}
            {currentMode !== 'camera' && <Keyboard className="h-4 w-4 text-gray-500" />}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Scan barcodes using camera or hardware scanner to add products to cart
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Selector */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Button
                type="button"
                size="sm"
                variant={currentMode === 'camera' ? 'default' : 'outline'}
                onClick={() => {
                  setCurrentMode('camera');
                  setError('');
                  setManualBarcode('');
                }}
                className={currentMode === 'camera' ? 'bg-[#FF6A00] hover:bg-[#E55F00]' : ''}
              >
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
              <Button
                type="button"
                size="sm"
                variant={currentMode !== 'camera' ? 'default' : 'outline'}
                onClick={() => {
                  setCurrentMode('usb');
                  setError('');
                  setManualBarcode('');
                }}
                className={currentMode !== 'camera' ? 'bg-[#FF6A00] hover:bg-[#E55F00]' : ''}
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Hardware Scanner
              </Button>
            </div>
            {autoAddOnScan && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                <Check className="h-3 w-3" />
                Auto-add enabled
              </span>
            )}
          </div>

          {/* Scanner Type Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              {currentMode === 'camera' ? <Camera className="h-4 w-4 text-blue-600 mt-0.5" /> : <Keyboard className="h-4 w-4 text-blue-600 mt-0.5" />}
              <div className="flex-1 text-sm text-blue-800">
                {currentMode === 'camera' && (
                  <p>
                    {isBarcodeDetectorSupported 
                      ? 'Camera will automatically detect barcodes. Point camera at barcode to scan.'
                      : 'Camera mode active but automatic detection not supported. Use manual entry below.'}
                  </p>
                )}
                {currentMode !== 'camera' && (
                  <p>
                    Connect your USB or Bluetooth barcode scanner and scan. Make sure scanner is in <strong>HID Keyboard mode</strong>.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
            >
              <X className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setError('')}
                className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          )}

          {/* Camera Scanner View */}
          {currentMode === 'camera' && (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              
              {/* Scanning Overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-48 border-2 border-[#FF6A00] rounded-lg">
                  {isScanning && isBarcodeDetectorSupported && (
                    <motion.div
                      className="absolute inset-x-0 h-0.5 bg-[#FF6A00] shadow-lg"
                      style={{ boxShadow: '0 0 10px #FF6A00' }}
                      animate={{ y: [0, 192, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  )}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#FF6A00]" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#FF6A00]" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#FF6A00]" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#FF6A00]" />
                </div>
              </div>

              <div className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-2">
                {!isScanning && 'Starting camera...'}
                {isScanning && isBarcodeDetectorSupported && 'Position barcode in frame - Auto-detecting'}
                {isScanning && !isBarcodeDetectorSupported && 'Camera active - Use manual entry below'}
              </div>

              {/* Scan indicator */}
              {isScanning && isBarcodeDetectorSupported && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Scanning
                </div>
              )}
            </div>
          )}

          {/* Hardware Scanner Instructions */}
          {currentMode !== 'camera' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                <Keyboard className="h-4 w-4" />
                Hardware Scanner Ready
              </h4>
              <p className="text-sm text-green-800 mb-2">
                Scan a barcode with your hardware scanner. 
                The product will be automatically detected.
              </p>
              <div className="text-xs text-green-700 space-y-1">
                <p>• Supported: YHDAIA YHD-1100L and compatible USB/Bluetooth scanners</p>
                <p>• Formats: CODE128, EAN-13, EAN-8, CODE39, ITF, UPC, QR</p>
                <p>• Scanner must be in HID Keyboard mode</p>
              </div>
            </div>
          )}

          {/* Manual Barcode Entry */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Keyboard className="h-4 w-4" />
              Or enter barcode manually:
            </label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={manualBarcode}
                onChange={(e) => {
                  setManualBarcode(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleManualSubmit(e as any);
                  }
                }}
                placeholder="Enter SKU, barcode, or product code..."
                className="flex-1 font-mono"
                autoFocus={currentMode !== 'camera'}
                autoComplete="off"
              />
              <Button 
                type="submit" 
                className="bg-[#FF6A00] hover:bg-[#E65F00] px-6"
                disabled={!manualBarcode.trim()}
              >
                <Scan className="h-4 w-4 mr-2" />
                Scan
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Tip: Type or paste the barcode and press Enter or click Scan
            </p>
          </form>

          {/* Last Scan Result */}
          <AnimatePresence>
            {lastScan && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`${lastScanSuccess === false ? 'bg-red-50 border-red-200' : lastScanSuccess === true ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isProcessing ? (
                        <>
                          <div className="h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-xs text-yellow-700 font-medium">Looking up product...</p>
                        </>
                      ) : lastScanSuccess === true ? (
                        <>
                          <Check className="h-4 w-4 text-green-600" />
                          <p className="text-xs text-green-700 font-medium">Product Found!</p>
                        </>
                      ) : lastScanSuccess === false ? (
                        <>
                          <X className="h-4 w-4 text-red-600" />
                          <p className="text-xs text-red-700 font-medium">Product Not Found</p>
                        </>
                      ) : (
                        <>
                          <Scan className="h-4 w-4 text-yellow-600" />
                          <p className="text-xs text-yellow-700 font-medium">Scanned:</p>
                        </>
                      )}
                    </div>
                    <p className={`text-lg font-bold font-mono ${lastScanSuccess === false ? 'text-red-900' : lastScanSuccess === true ? 'text-green-900' : 'text-yellow-900'}`}>{lastScan}</p>
                    {lastScanSuccess === true && autoAddOnScan && (
                      <p className="text-xs text-green-600 mt-1">Product added to cart</p>
                    )}
                    {lastScanSuccess === false && (
                      <p className="text-xs text-red-600 mt-1">Barcode/SKU not found in your products. Add it in Products page.</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setLastScan('');
                      setLastScanSuccess(null);
                    }}
                    className={`${lastScanSuccess === false ? 'text-red-700 hover:bg-red-100' : lastScanSuccess === true ? 'text-green-700 hover:bg-green-100' : 'text-yellow-700 hover:bg-yellow-100'}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scan History */}
          {scanHistory.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Recent Scans ({scanHistory.length}):
              </h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {scanHistory.map((scan, index) => (
                  <div 
                    key={`${scan}-${index}`}
                    className="text-xs bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded font-mono text-gray-700 flex items-center justify-between transition-colors"
                  >
                    <span className="flex-1">{scan}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleScan(scan)}
                      className="h-6 text-xs text-[#FF6A00] hover:bg-orange-50"
                    >
                      <Scan className="h-3 w-3 mr-1" />
                      Scan Again
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <Button
            variant="outline"
            onClick={handleClose}
            className="w-full border-gray-300 hover:bg-gray-50"
          >
            <X className="h-4 w-4 mr-2" />
            Close Scanner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
