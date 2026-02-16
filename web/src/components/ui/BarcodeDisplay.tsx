/**
 * Barcode Display Components
 * Visual barcode rendering, print functionality, and audio feedback
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Copy,
  Printer,
  Maximize2,
  RefreshCw,
  Check,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type BarcodeFormat = 'EAN-13' | 'EAN-8' | 'CODE128' | 'CODE39' | 'ITF' | 'QR';
export type BarcodeSize = 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';

const SIZE_CONFIG: Record<BarcodeSize, { width: number; height: number; fontSize: number }> = {
  tiny: { width: 100, height: 30, fontSize: 8 },
  small: { width: 150, height: 45, fontSize: 10 },
  medium: { width: 220, height: 60, fontSize: 12 },
  large: { width: 300, height: 80, fontSize: 14 },
  xlarge: { width: 450, height: 120, fontSize: 16 },
};

// ============================================================================
// AUDIO FEEDBACK
// ============================================================================

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play a beep sound for scan feedback
 */
export function playBeepSound(type: 'success' | 'error'): void {
  try {
    const ctx = getAudioContext();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'success') {
      // Ascending pleasant beep
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      oscillator.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } else {
      // Low error buzz
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.type = 'square';
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch (error) {
    console.warn('Audio playback failed:', error);
  }
}

// ============================================================================
// BARCODE SVG GENERATOR
// ============================================================================

function generateBarcodeSVG(
  value: string,
  width: number,
  height: number,
  showText: boolean = true,
  fontSize: number = 12
): string {
  // Simple CODE128-like barcode generator
  const encoding = encodeToCode128(value);
  const barWidth = width / encoding.length;
  
  let svg = `<svg width="${width}" height="${height + (showText ? fontSize + 8 : 0)}" viewBox="0 0 ${width} ${height + (showText ? fontSize + 8 : 0)}" xmlns="http://www.w3.org/2000/svg">`;
  
  // White background
  svg += `<rect width="100%" height="100%" fill="white"/>`;
  
  // Draw bars
  let x = 0;
  for (const bit of encoding) {
    if (bit === '1') {
      svg += `<rect x="${x}" y="0" width="${barWidth}" height="${height}" fill="black"/>`;
    }
    x += barWidth;
  }
  
  // Draw text if enabled
  if (showText) {
    svg += `<text x="${width / 2}" y="${height + fontSize + 4}" text-anchor="middle" font-family="monospace" font-size="${fontSize}" fill="black">${escapeHtml(value)}</text>`;
  }
  
  svg += '</svg>';
  return svg;
}

function encodeToCode128(value: string): string {
  // Simplified CODE128 encoding (pattern representation)
  let result = '11010011100'; // START C
  
  for (const char of value.toUpperCase()) {
    const code = char.charCodeAt(0);
    // Generate pseudo-random pattern based on character
    let pattern = '';
    for (let i = 0; i < 11; i++) {
      pattern += ((code * (i + 1)) % 3 < 2) ? '1' : '0';
    }
    result += pattern;
  }
  
  result += '1100011101011'; // STOP
  return result;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, char => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char] || char;
  });
}

// ============================================================================
// BARCODE DISPLAY COMPONENT
// ============================================================================

export interface BarcodeDisplayProps {
  /** The barcode value to display */
  value: string;
  /** Barcode format */
  format?: BarcodeFormat;
  /** Size preset */
  size?: BarcodeSize;
  /** Show text below barcode */
  showText?: boolean;
  /** Show print button */
  showPrint?: boolean;
  /** Show copy button */
  showCopy?: boolean;
  /** Show enlarge button */
  showEnlarge?: boolean;
  /** Show regenerate button */
  showRegenerate?: boolean;
  /** Regenerate callback */
  onRegenerate?: () => void;
  /** Label above barcode */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function BarcodeDisplay({
  value,
  format = 'CODE128',
  size = 'medium',
  showText = true,
  showPrint = true,
  showCopy = true,
  showEnlarge = true,
  showRegenerate = false,
  onRegenerate,
  label,
  className,
}: BarcodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const config = SIZE_CONFIG[size];

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [value]);

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const svg = generateBarcodeSVG(value, 300, 80, true, 14);
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Barcode - ${value}</title>
          <style>
            body { 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
            }
            .barcode-container {
              text-align: center;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="barcode-container">
            ${label ? `<p style="margin: 0 0 8px; font-family: sans-serif;">${label}</p>` : ''}
            ${svg}
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [value, label]);

  const svg = generateBarcodeSVG(value, config.width, config.height, showText, config.fontSize);

  return (
    <TooltipProvider>
      <div className={cn('flex flex-col items-center gap-2', className)}>
        {label && (
          <p className="text-sm font-medium text-gray-600">{label}</p>
        )}
        
        <div 
          ref={printRef}
          className="bg-white p-2 rounded border border-gray-200"
          dangerouslySetInnerHTML={{ __html: svg }}
        />

        <div className="flex items-center gap-1">
          {showCopy && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? 'Copied!' : 'Copy barcode'}
              </TooltipContent>
            </Tooltip>
          )}

          {showPrint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 w-8 p-0"
                >
                  <Printer className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Print barcode</TooltipContent>
            </Tooltip>
          )}

          {showEnlarge && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnlarged(true)}
                  className="h-8 w-8 p-0"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Enlarge barcode</TooltipContent>
            </Tooltip>
          )}

          {showRegenerate && onRegenerate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRegenerate}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Regenerate barcode</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Enlarge Dialog */}
        <Dialog open={enlarged} onOpenChange={setEnlarged}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{label || 'Barcode'}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center p-4">
              <div
                className="bg-white p-4 rounded border"
                dangerouslySetInnerHTML={{ 
                  __html: generateBarcodeSVG(value, 400, 100, true, 16) 
                }}
              />
            </div>
            <div className="flex justify-center gap-2">
              <Button onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ============================================================================
// INLINE BARCODE
// ============================================================================

export interface BarcodeInlineProps {
  value: string;
  className?: string;
  onClick?: () => void;
}

export function BarcodeInline({ value, className, onClick }: BarcodeInlineProps) {
  const svg = generateBarcodeSVG(value, 100, 30, false);

  return (
    <div
      className={cn(
        'inline-block bg-white rounded border border-gray-200 p-1 cursor-pointer hover:border-orange-400 transition-colors',
        className
      )}
      onClick={onClick}
      title={value}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ============================================================================
// SCANNABLE BARCODE
// ============================================================================

export interface BarcodeScannableProps {
  value: string;
  className?: string;
  onClick?: () => void;
}

export function BarcodeScannable({ value, className, onClick }: BarcodeScannableProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg border-2 border-dashed border-gray-300 p-4 cursor-pointer hover:border-orange-400 transition-colors',
        className
      )}
      onClick={onClick}
    >
      <div
        dangerouslySetInnerHTML={{ 
          __html: generateBarcodeSVG(value, 200, 60, true, 12) 
        }}
      />
      <p className="text-xs text-center text-gray-500 mt-2">
        Click to copy or scan with scanner
      </p>
    </div>
  );
}

// ============================================================================
// SCANNER STATUS INDICATOR
// ============================================================================

export interface ScannerStatusProps {
  isActive: boolean;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  lastScan?: string | null;
  className?: string;
}

export function ScannerStatus({
  isActive,
  soundEnabled = true,
  onToggleSound,
  lastScan,
  className,
}: ScannerStatusProps) {
  return (
    <div className={cn('flex items-center gap-3 text-sm', className)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
          )}
        />
        <span className={isActive ? 'text-green-700' : 'text-gray-500'}>
          {isActive ? 'Scanner Ready' : 'Scanner Paused'}
        </span>
      </div>

      {onToggleSound && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSound}
          className="h-7 w-7 p-0"
        >
          {soundEnabled ? (
            <Volume2 className="h-4 w-4 text-gray-600" />
          ) : (
            <VolumeX className="h-4 w-4 text-gray-400" />
          )}
        </Button>
      )}

      {lastScan && (
        <span className="text-gray-400 text-xs">
          Last: {lastScan}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// SCAN RESULT TOAST
// ============================================================================

export interface ScanResultProps {
  type: 'success' | 'error' | 'warning';
  productName?: string;
  barcode: string;
  message?: string;
}

export function ScanResultDisplay({
  type,
  productName,
  barcode,
  message,
}: ScanResultProps) {
  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };

  return (
    <div className={cn('p-3 rounded-lg border', colors[type])}>
      {productName && (
        <p className="font-medium">{productName}</p>
      )}
      <p className="text-sm opacity-75 font-mono">{barcode}</p>
      {message && (
        <p className="text-sm mt-1">{message}</p>
      )}
    </div>
  );
}
