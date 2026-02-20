# Bazaar POS - Barcode Scanning System

## Overview

The Bazaar POS barcode scanning system provides USB hardware scanner integration for fast product lookup and cart management. It uses keyboard-emulation detection to distinguish scanner input from manual typing.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Barcode Scanning System                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Hardware   │───▶│    Input     │───▶│     React        │  │
│  │   Scanner    │    │   Handler    │    │     Hooks        │  │
│  └──────────────┘    └──────────────┘    └────────┬─────────┘  │
│                                                    │            │
│                                                    ▼            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │   Audio      │◀───│   Barcode    │◀───│     POS          │  │
│  │   Feedback   │    │   Service    │    │   Component      │  │
│  └──────────────┘    └──────────────┘    └──────────────────┘  │
│                             │                                   │
│                             ▼                                   │
│                      ┌──────────────┐                          │
│                      │   Supabase   │                          │
│                      │   Database   │                          │
│                      └──────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Barcode Input Handler (`src/lib/barcodeInputHandler.ts`)

Low-level keyboard event capture for USB barcode scanners.

**How It Works:**
- USB HID barcode scanners emulate keyboard input
- Characters arrive rapidly (<100ms between keystrokes)
- Manual typing is slower (>200ms between keystrokes)
- Handler buffers characters and triggers on Enter or timeout

**Configuration:**
```typescript
interface BarcodeInputConfig {
  minLength?: number;      // Default: 4
  maxLength?: number;      // Default: 50  
  bufferTimeout?: number;  // Default: 100ms
  preventEnterSubmit?: boolean;  // Default: true
}
```

**Usage:**
```typescript
import { BarcodeInputHandler } from '@/lib/barcodeInputHandler';

const handler = new BarcodeInputHandler(
  (barcode) => console.log('Scanned:', barcode),
  { minLength: 4, maxLength: 50 }
);

handler.start();  // Begin listening
handler.stop();   // Stop listening
handler.pause();  // Temporarily pause
handler.resume(); // Resume after pause
```

### 2. Barcode Scanner Hooks (`src/hooks/useBarcodeScanner.ts`)

React hooks for integrating barcode scanners with components.

**`useBarcodeScanner`** - General-purpose scanner hook
```typescript
const {
  lastScan,       // Most recent barcode
  lastScanTime,   // Timestamp of scan
  isActive,       // Scanner listening status
  pause,          // Pause scanning
  resume,         // Resume scanning
  buffer,         // Current character buffer
  scanCount,      // Total scans this session
} = useBarcodeScanner({
  onScan: (barcode) => handleScan(barcode),
  enabled: true,
  minLength: 4,
  maxLength: 50,
});
```

**`usePOSBarcodeScanner`** - POS-specific with product lookup
```typescript
const { lastScan, isActive, pause, resume } = usePOSBarcodeScanner({
  vendorId: seller.id,
  onProductFound: (product) => addToCart(product),
  onScanError: (error) => showError(error),
  soundEnabled: true,
});
```

**`useBarcodeScanSimulator`** - Testing utility
```typescript
const { simulateScan } = useBarcodeScanSimulator({
  onScan: (barcode) => handleScan(barcode),
});

// Simulate a barcode scan for testing
simulateScan('1234567890');
```

### 3. Barcode Service (`src/services/barcodeService.ts`)

Database operations for barcode lookup and analytics.

**Quick Lookup (without logging):**
```typescript
import { lookupBarcodeQuick } from '@/services/barcodeService';

const result = await lookupBarcodeQuick(vendorId, '1234567890');
if (result.found) {
  console.log('Found:', result.product.name);
}
```

**Full Lookup (with audit logging):**
```typescript
import { lookupBarcode } from '@/services/barcodeService';

const result = await lookupBarcode(
  supabase,
  vendorId,
  '1234567890',
  'pos',           // source: 'pos' | 'inventory' | 'receiving'
  orderId,         // optional
  'usb'            // scanner_type: 'usb' | 'bluetooth' | 'camera' | 'manual'
);
```

**Generate Barcode:**
```typescript
import { generateProductBarcode } from '@/services/barcodeService';

const barcode = await generateProductBarcode(
  vendorId,
  variantId,
  'CODE128'  // format: 'CODE128' | 'EAN-13' | 'EAN-8' | 'CODE39' | 'ITF' | 'QR'
);
```

**Get Scan Statistics:**
```typescript
import { getBarcodeScanStats } from '@/services/barcodeService';

const stats = await getBarcodeScanStats(vendorId, 30); // Last 30 days
console.log(`Total scans: ${stats.totalScans}`);
console.log(`Success rate: ${stats.successRate}%`);
```

### 4. Barcode Display Components (`src/components/ui/BarcodeDisplay.tsx`)

UI components for barcode rendering and feedback.

**`BarcodeDisplay`** - Full barcode with label
```tsx
<BarcodeDisplay
  value="1234567890"
  width={200}
  height={80}
  showLabel={true}
  labelPosition="bottom"
/>
```

**`BarcodeInline`** - Compact inline display
```tsx
<BarcodeInline value="1234567890" />
```

**`BarcodeScannable`** - Interactive scannable barcode
```tsx
<BarcodeScannable
  value="1234567890"
  onScan={(barcode) => handleManualScan(barcode)}
/>
```

**`ScannerStatus`** - Scanner connection status
```tsx
<ScannerStatus
  isActive={isActive}
  onToggle={() => isActive ? pause() : resume()}
  lastScan={lastScan}
  lastScanTime={lastScanTime}
/>
```

**Audio Feedback:**
```typescript
import { playBeepSound } from '@/components/ui/BarcodeDisplay';

playBeepSound('success'); // Short beep for successful scan
playBeepSound('error');   // Lower tone for errors
```

## Database Schema

### `barcode_scans` Table

Stores all barcode scan events for analytics.

```sql
CREATE TABLE barcode_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id),
  barcode_value TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  variant_id UUID REFERENCES product_variants(id),
  scan_source TEXT NOT NULL, -- 'pos', 'inventory', 'receiving'
  scanner_type TEXT DEFAULT 'usb', -- 'usb', 'bluetooth', 'camera', 'manual'
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  order_id UUID REFERENCES orders(id),
  metadata JSONB DEFAULT '{}',
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `product_variants` Table (Existing)

Products are looked up by the `barcode` column:

```sql
-- Already exists in schema
barcode TEXT UNIQUE  -- Stores product barcode
```

### Database Functions

**`generate_product_barcode`** - Generates unique barcode for product
```sql
SELECT generate_product_barcode(
  '123e4567-e89b-12d3-a456-426614174000'::uuid,  -- vendor_id
  '987fcdeb-51a2-4276-b7e9-426614174000'::uuid,  -- variant_id
  'CODE128'  -- format
);
```

**`record_barcode_scan`** - Records scan event
```sql
SELECT record_barcode_scan(
  vendor_id := '...'::uuid,
  barcode := '1234567890',
  source := 'pos',
  order_id := '...'::uuid,
  scanner_type := 'usb'
);
```

**`get_top_scanned_products`** - Analytics
```sql
SELECT * FROM get_top_scanned_products(
  '...'::uuid,  -- vendor_id
  10,           -- limit
  30            -- days
);
```

**`get_daily_scan_counts`** - Daily statistics
```sql
SELECT * FROM get_daily_scan_counts(
  '...'::uuid,  -- vendor_id
  7             -- days
);
```

## POS Integration

### SellerPOS.tsx Integration

The barcode scanner is integrated into the POS page:

```typescript
// src/pages/SellerPOS.tsx

import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { lookupBarcodeQuick, playBeepSound, ScannerStatus } from '@/services/barcodeService';

// Inside component:
const [soundEnabled, setSoundEnabled] = useState(true);
const [scannerPaused, setScannerPaused] = useState(false);

const handleHardwareScan = useCallback(async (barcode: string) => {
  const result = await lookupBarcodeQuick(vendorId, barcode);
  
  if (result.found) {
    if (soundEnabled) playBeepSound('success');
    addToCart(result.product);
  } else {
    if (soundEnabled) playBeepSound('error');
    showNotification('Product not found');
  }
}, [vendorId, soundEnabled]);

const { lastScan, isActive, pause, resume, scanCount } = useBarcodeScanner({
  onScan: handleHardwareScan,
  enabled: !scannerPaused,
  minLength: 4,
  maxLength: 50,
});
```

### Scanner Workflow

1. **Scan barcode** → Hardware scanner sends keystrokes
2. **Input handler** → Detects rapid input, buffers characters
3. **Timeout/Enter** → Triggers `onScan` callback with barcode
4. **Product lookup** → Query database for matching product
5. **Cart update** → Add product to cart if found
6. **Audio feedback** → Play success/error beep
7. **Log scan** → Record in `barcode_scans` for analytics

## Supported Barcode Formats

| Format | Length | Characters | Use Case |
|--------|--------|------------|----------|
| CODE128 | Variable | All ASCII | General purpose |
| EAN-13 | 13 | Numeric | Retail products |
| EAN-8 | 8 | Numeric | Small products |
| CODE39 | Variable | A-Z, 0-9, special | Industrial |
| ITF | Even length | Numeric | Cartons |
| QR | Variable | All | 2D codes |

## Testing

Run the barcode system tests:

```bash
cd web
npm run test:barcode
```

**Test Categories:**
- DB Schema - Table structure and constraints
- Barcode Generation - Format correctness and uniqueness
- Validation - Length and format validation
- Input Handler - Buffer management and timing detection
- Lookup Results - Query result handling
- Scan Logging - Audit trail creation
- Audio Feedback - Sound generation
- Statistics - Analytics calculations
- Integration - Full POS workflow

## Hardware Compatibility

### Recommended Scanners

Any USB HID barcode scanner that emulates keyboard input:

- **YHDAIA YHD-1100L** (Tested, recommended)
- **Honeywell Xenon 1900** (Enterprise grade)
- **Symbol/Zebra DS2208** (Popular choice)

### Scanner Configuration

Most scanners need no configuration. Ensure:
- USB HID mode enabled (not serial)
- Enter suffix enabled (CR/LF after barcode)
- Code 128/EAN-13 symbologies enabled

## Troubleshooting

### Scanner Not Detected

1. Check USB connection
2. Test in Notepad - scanner should type barcode + Enter
3. Ensure browser tab is focused
4. Check if scanner paused via `ScannerStatus` component

### Scans Not Adding to Cart

1. Check product has barcode in `product_variants` table
2. Verify barcode format matches database
3. Check console for lookup errors
4. Ensure vendor_id matches product owner

### Audio Not Playing

1. Check browser audio permissions
2. Ensure `soundEnabled` is true
3. Try clicking on page first (user interaction required)

## Migration

To add barcode scanning to your database, run:

```sql
-- From supabase-migrations/009_barcode_scanning_system.sql
-- Creates barcode_scans table and functions
```

Or apply via Supabase CLI:

```bash
supabase db push
```
