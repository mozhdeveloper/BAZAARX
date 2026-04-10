# Order Map Tracking Implementation

## Overview

The BAZAARX web application implements a **two-tier tracking system** for orders:

1. **Visual Tracking Page** - Animated SVG-based delivery visualization with courier info
2. **Map-Based Address Picking** - Leaflet-powered interactive maps for pinning delivery addresses
3. **External Courier Tracking** - AfterShip integration for real-world courier tracking data

---

## Architecture

### Tier 1: Visual Tracking Page

**File:** `src/pages/DeliveryTrackingPage.tsx`  
**Route:** `/delivery-tracking/:orderNumber`

#### Features
- Animated SVG route visualization with gradient path
- Delivery checkpoints positioned at fixed coordinates
- Animated delivery truck icon that moves between checkpoints
- Courier info banner with tracking number, ETA, and external tracking links
- Fallback to dummy delivery steps if no real courier data exists

#### Implementation Details
- Uses **Framer Motion** for animations (truck movement, checkpoint transitions)
- Fetches order data from **Supabase** using `orderNumber` URL parameter
- Calls `trackByOrderId()` from delivery store to fetch courier-level tracking
- Renders SVG path with animated `pathLength` attribute
- If no real tracking events exist, displays hardcoded Philippine coordinates (Manila, Quezon City, Makati)

#### Access Points
- `OrderDetailPage.tsx` - "Track Order" button (line ~990)
- `NotificationsDropdown.tsx` - Order notifications (line ~277)
- `OrderNotificationModal.tsx` - Notification modal (line ~32)

---

### Tier 2: Map-Based Address Picking

#### Components

**1. MapPicker**  
**File:** `src/components/ui/MapPicker.tsx`

- Full-screen map picker component
- Uses `react-leaflet` with OpenStreetMap tiles
- Place search via Nominatim geocoding API
- Click-to-pin functionality on the map
- GPS "My Location" button using `navigator.geolocation`
- Reverse geocoding to convert coordinates to addresses

**2. AddressPicker**  
**File:** `src/components/ui/address-picker.tsx`

- More feature-rich address picker with similar map functionality
- Leaflet map with search, GPS, and reverse geocoding
- Address parsing into structured fields:
  - Street
  - Barangay
  - City
  - Province
  - Postal code
- Used in buyer settings/address flow (`BuyerSettingsPage.tsx`, `AddressModal.tsx`)

#### How Coordinates Are Stored
- Addresses in `shipping_addresses` / buyer addresses can store `coordinates: { lat, lng }`
- Coordinates captured via `AddressPicker` / `MapPicker` during address creation
- Database schema includes `coordinates` fields on address types (see `src/types/database.types.ts` lines 237, 1191)

---

### Tier 3: External Courier Tracking

#### AfterShip Integration

**Files:**
- `src/services/tracking/aftership.ts` - AfterShip API response transformation
- `src/services/tracking/index.ts` - Tracking service entry point
- `api/track.ts` - HTTP API proxy endpoint

**How It Works:**
1. Configured via `VITE_TRACKING_PROVIDER` environment variable (defaults to `aftership`)
2. `api/track.ts` proxies requests to AfterShip API to avoid CORS issues
3. `aftership.ts` transforms AfterShip checkpoint data into unified format
4. Maps AfterShip tags (`InfoReceived`, `InTransit`, `OutForDelivery`, `Delivered`, etc.) to internal `TrackingStatus` values

**Supported Philippine Couriers:**
- J&T Express
- LBC
- Flash Express
- Ninja Van
- Grab Express
- Lalamove

Each courier has a `trackingUrlTemplate` for linking to their tracking page.

---

## Services & State Management

### Delivery Service

**File:** `src/services/deliveryService.ts`

**Responsibilities:**
- Courier rate calculation
- Delivery booking
- Status updates
- Tracking event retrieval
- Sandbox mode for testing (enabled by default)

**Key Features:**
- Operates in **sandbox mode** by default for development
- Simulates courier responses with auto-generated tracking numbers
- Syncs delivery status with `orders.shipment_status`
- Inserts records into `order_status_history` on status changes

### Delivery Store (State Management)

**File:** `src/stores/deliveryStore.ts`

**Key Functions:**
- `trackDelivery()` - Track delivery by various criteria
- `trackByOrderId()` - Track using order ID
- `trackByTrackingNumber()` - Track using tracking number
- `bookDelivery()` - Book a delivery with a courier
- `sandboxAdvanceStatus()` - Advance status in sandbox mode

Uses **Zustand** for state management.

---

## Type Definitions

### Delivery Types

**File:** `src/types/delivery.types.ts`

Defines:
- `CourierProvider` - Courier provider enum
- `DeliveryBooking` - Delivery booking structure
- `DeliveryTrackingEvent` - Tracking event structure
- `DeliveryTrackingResult` - Tracking result structure
- `DeliveryAddress` - Address with optional `coordinates: { lat, lng }`
- `ShippingRateRequest` - Shipping rate request structure

### Tracking Types

**File:** `src/types/tracking.ts`

Defines:
- `UnifiedTrackingResponse` - Unified tracking response format
- `TrackingStatus` - Internal tracking status enum
- `TrackingEvent` - Tracking event structure
- AfterShip-specific interfaces

---

## Utilities

### Tracking Steps

**File:** `src/utils/orders/shipment.ts`

- `buildTrackingSteps()` - Builds a tracking timeline from shipment status, dates, and tracking number

**File:** `src/data/orders/tracking-steps.ts`

- Defines the 4 canonical tracking steps:
  1. Confirmed
  2. Processing
  3. Shipped
  4. Delivered

### Mappers

**File:** `src/utils/orders/mappers.ts`

- `mapTrackingSnapshot()` - Maps tracking snapshot data (line 455)

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `leaflet` | `^1.9.4` | Interactive map rendering |
| `react-leaflet` | `^5.0.0` | React bindings for Leaflet |
| `@types/leaflet` | `^1.9.21` | TypeScript types for Leaflet |
| `framer-motion` | - | Animations (truck, checkpoints, SVG) |
| `zustand` | - | State management |
| `@supabase/supabase-js` | - | Database operations |

**External APIs:**
- **OpenStreetMap** - Free map tile provider
- **Nominatim** - Free geocoding/reverse geocoding API
- **AfterShip** - Courier tracking aggregation (`api.aftership.com/tracking/2026-01/trackings`)

---

## Database Schema

### Key Tables & Relationships

- **`orders`** - Has `tracking_number` and `shipment_status` columns
- **`delivery_bookings`** - Links to `orders` via `order_id`
- **`delivery_tracking_events`** - Links to `delivery_bookings` via `delivery_booking_id`
- **`order_shipments`** - Stores `tracking_number` per order
- **`shipping_addresses`** - Can store `coordinates: { lat, lng }` for map-pinned locations

---

## Styling

**File:** `src/styles/globals.css` (lines 246-271)

Contains Leaflet map fix styles for proper z-index layering of:
- Map panes
- Tiles
- Markers
- Controls

---

## How to Test

### Test Visual Tracking Page

1. **Via Order Detail:**
   - Navigate to any order detail page
   - Click the **"Track Order"** button
   - You'll be redirected to `/delivery-tracking/:orderNumber`

2. **Direct URL:**
   - Go to `/delivery-tracking/ORDER123` (replace with real order number)

3. **What You'll See:**
   - Animated SVG route with gradient path
   - Delivery checkpoints
   - Animated truck moving between checkpoints
   - Courier info banner with tracking number and ETA
   - Links to courier's external tracking page

### Test Map Address Picker

1. Navigate to **Buyer Settings** or **Address creation** flow
2. Use the `AddressPicker` component
3. Click on the map to pin a location
4. Search for a place using the search bar
5. Click "My Location" button for GPS detection
6. The component will capture coordinates and reverse-geocode to an address

### Test Sandbox Mode

The delivery service runs in **sandbox mode** by default:
- Simulates courier responses
- Auto-generates tracking numbers
- Use `sandboxAdvanceStatus()` to manually advance tracking status

---

## Environment Variables

- `VITE_TRACKING_PROVIDER` - Set to `aftership` (default) or other provider
- `AFTERSHIP_API_KEY` - API key for AfterShip integration

---

## Notable Design Decisions

1. **SVG Animation Instead of Real Map** - The tracking page uses an animated SVG visualization rather than an interactive map for simplicity and performance

2. **Open-Source Map Stack** - Uses Leaflet + OpenStreetMap + Nominatim instead of Google Maps or Mapbox to avoid licensing costs

3. **Sandbox-First Development** - Delivery service defaults to sandbox mode for easy testing without real courier APIs

4. **AfterShip Integration** - External courier tracking is abstracted via AfterShip to support multiple courier providers with a unified interface

5. **Coordinate Storage** - Delivery addresses can store GPS coordinates for precise location pinning, captured during address creation

---

## Tests

**File:** `src/tests/unit/services/deliveryService.test.ts`

Unit tests for `getDeliveryTracking` and related delivery service functions.

---

## Related Files

```
src/
├── pages/
│   └── DeliveryTrackingPage.tsx          # Main tracking page
├── components/ui/
│   ├── MapPicker.tsx                      # Map picker component
│   └── address-picker.tsx                 # Address picker with map
├── services/
│   ├── deliveryService.ts                 # Core delivery service
│   └── tracking/
│       ├── index.ts                       # Tracking service entry
│       └── aftership.ts                   # AfterShip integration
├── stores/
│   └── deliveryStore.ts                   # Zustand state management
├── types/
│   ├── delivery.types.ts                  # Delivery type definitions
│   ├── tracking.ts                        # Tracking type definitions
│   └── database.types.ts                  # Database schema types
├── utils/orders/
│   ├── shipment.ts                        # Tracking steps builder
│   └── mappers.ts                         # Tracking snapshot mapper
├── data/orders/
│   └── tracking-steps.ts                  # Canonical tracking steps
└── styles/
    └── globals.css                        # Leaflet map fix styles

api/
└── track.ts                               # AfterShip proxy endpoint
```
