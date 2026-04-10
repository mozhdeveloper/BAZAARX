# Delivery Map Tracking - React Native Implementation Plan

## 📱 Current State Analysis

### What Already Exists ✅

| Feature | File | Status |
|---------|------|--------|
| **Delivery Tracking Screen** | `app/DeliveryTrackingScreen.tsx` | ✅ Built - vertical timeline with courier info |
| **Delivery Store** | `src/stores/deliveryStore.ts` | ✅ Built - Zustand store with all tracking actions |
| **Delivery Service** | `src/services/deliveryService.ts` | ✅ Built - courier integration (sandbox mode) |
| **Delivery Types** | `src/types/delivery.types.ts` | ✅ Built - all courier & tracking types |
| **Database Types** | `src/types/database.types.ts` | ✅ Built - Supabase types with `coordinates` field |
| **Order Detail Screen** | `app/OrderDetailScreen.tsx` | ✅ Built - has "Track Order" button |
| **Supabase Client** | `src/lib/supabase.ts` | ✅ Built - typed client with real-time subscriptions |
| **react-native-maps** | `package.json` | ✅ Installed (v1.20.1) but **NOT USED** |
| **expo-location** | `package.json` | ✅ Installed (v19.0.8) but **NOT USED** |
| **Real-time Subscriptions** | `DeliveryTrackingScreen.tsx` | ✅ Built - listens to `order_status_history` |

### What's Missing / Static 🟡

| Feature | Current Implementation | Issue |
|---------|----------------------|-------|
| **Map Visualization** | ❌ None | No actual map - only timeline cards |
| **Courier Live Location** | ❌ Not implemented | No GPS tracking from courier |
| **Address Coordinates** | Database supports it | No UI to capture/display lat/lng |
| **Route Visualization** | ❌ Not implemented | No polyline on map |
| **Real-time Map Updates** | Real-time works for timeline | Not connected to map markers |
| **Address Picker with Map** | Uses `select-philippines-address` | Text-based, no map interaction |

---

## 🎯 Implementation Strategy

### Philosophy: **Incremental Delivery**

```
Phase 1: Static UI (MVP) → Show something beautiful
Phase 2: Real Data Connection → Make it functional
Phase 3: Real-time Live Tracking → Make it magical
```

Each phase is **independently testable** and **production-safe**.

---

## Phase 1: Static Map Display (MVP)

**Goal:** Show a beautiful map with hardcoded checkpoints on the tracking screen.  
**Duration:** 2-3 days  
**Risk:** Zero - purely UI, no data dependencies

### 1.1 Create Map Tracking Component

**New File:** `src/components/delivery/OrderTrackingMap.tsx`

```
Purpose: Reusable map component that shows delivery route with checkpoints
Input: Array of checkpoint coordinates + current status
Output: Interactive MapView with markers, polyline, and custom UI overlays
```

**Component API:**
```typescript
interface OrderTrackingMapProps {
  origin: { lat: number; lng: number; label: string };
  destination: { lat: number; lng: number; label: string };
  currentStep: number; // 0-3 (pending, processing, shipped, delivered)
  checkpoints?: Array<{
    lat: number;
    lng: number;
    label: string;
    status: 'completed' | 'current' | 'pending';
    time?: string;
  }>;
  courierLocation?: { lat: number; lng: number }; // For Phase 3
  showCourierMarker?: boolean;
  onMarkerPress?: (checkpoint: Checkpoint) => void;
}
```

**Key Features:**
- Uses `react-native-maps` (already installed)
- Shows origin & destination markers
- Draws polyline route between checkpoints
- Custom marker icons for each status (completed ✅, current 🚚, pending ⏳)
- Animated "current location" marker with pulsing effect
- Custom callout bubbles with checkpoint info
- Map styling with light theme (matches app design)

**Dependencies Needed:**
```bash
# Already installed:
✅ react-native-maps@1.20.1
✅ expo-linear-gradient (for UI overlays)

# May need:
npm install react-native-maps-directions  # For polyline routing
```

### 1.2 Static Checkpoint Data

**New File:** `src/data/delivery/static-checkpoints.ts`

```typescript
// Static Philippine checkpoints for MVP
// Phase 2: Replace with real data from database

export const STATIC_CHECKPOINTS = {
  metro_manila: [
    {
      id: 'warehouse',
      label: 'BazaarPH Warehouse - Manila',
      lat: 14.5995,
      lng: 120.9842,
      status: 'completed' as const,
      time: '10:30 AM',
    },
    {
      id: 'processing',
      label: 'Processing Center - Quezon City',
      lat: 14.676,
      lng: 121.0437,
      status: 'current' as const,
      time: '11:15 AM',
    },
    {
      id: 'transit',
      label: 'Distribution Hub - Makati',
      lat: 14.5547,
      lng: 121.0244,
      status: 'pending' as const,
      time: '2:45 PM',
    },
    {
      id: 'delivery',
      label: 'Your Address',
      lat: 14.5564,
      lng: 121.0240,
      status: 'pending' as const,
      time: '4:20 PM',
    },
  ],
  // Add more routes for different cities...
};
```

### 1.3 Integrate Map into DeliveryTrackingScreen

**Modify:** `app/DeliveryTrackingScreen.tsx`

**Changes (implemented):**
1. Map fills the **full screen** as a persistent background layer (`StyleSheet.absoluteFill`)
2. A **dark gradient scrim** (top) ensures the floating header remains legible
3. Removed collapsible "Show/Hide Map" toggle — map is always visible
4. A **floating header** overlaid on the map with: back button, "Tracking" title, map-pin icon
5. A **bottom sheet card** (rounded top corners) contains all order details:
   - Order number + current status chip
   - Courier info row with message/call quick actions
   - Delivery address and ETA info panel
   - Proof of delivery image (if delivered)
   - Full scrollable delivery timeline

**Screen Layout (Implemented):**
```
┌─────────────────────────────────┐
│  MAP (full screen background)   │
│  ┌──── Floating Header ──────┐  │
│  │ ←  Tracking         📍   │  │
│  └───────────────────────────┘  │
│                                 │
│         [Map + Markers]         │
│   Completed path: amber ──→     │
│   Pending path: dashed gray     │
│                                 │
├─╮──────────────────────────────╭┤
│  ╰──── Bottom Sheet Card ────╯  │
│  Order Number    [Processing]   │
│  #TXN-12345                    │
│  ─────────────────────────────  │
│  🚚 J&T Express  Standard  📞  │
│  ─────────────────────────────  │
│  📍 Your address in manila      │
│  📦 Est. Delivery: Dec 15       │
│  ─────────────────────────────  │
│  Delivery Timeline ↓            │
│  ● Order Placed                 │
│  ● Processing                   │
│  ○ Shipped                      │
│  ○ Delivered                    │
└─────────────────────────────────┘
```

### 1.4 Custom Map Markers

**File:** `src/components/delivery/CustomMapMarker.tsx`

```typescript
// Renders different markers based on checkpoint status
// - Completed: Green checkmark circle
// - Current: Orange truck icon with pulsing ring animation + "LIVE" badge
// - Pending: Gray MapPin icon
```

### 1.5 Map Styling & Configuration

**Map Configuration:**
```typescript
<MapView
  provider={Platform.OS === 'ios' ? undefined : PROVIDER_GOOGLE}
  style={StyleSheet.absoluteFill}  // Full screen
  customMapStyle={mapStyle}         // Premium minimal style
  initialRegion={calculateRegion(origin, destination)}
  showsUserLocation={false}
  showsMyLocationButton={false}
  zoomEnabled={true}
  scrollEnabled={true}
  rotateEnabled={false}
  pitchEnabled={false}
>
  {/* Completed Polyline (solid amber) */}
  {/* Pending Polyline (dashed gray) */}
  {/* Origin, Destination, Checkpoint Markers */}
</MapView>
```

**Best Practices:**
- Use `Platform.OS` to switch between Apple Maps (iOS) and Google Maps (Android)
- Disable pitch/rotate for simpler UX (delivery tracking doesn't need 3D)
- Apply custom JSON map style to match app's soft amber/minimal theme
- Render map at full screen height, bottom sheet covers ~42% of screen

**Deliverables for Phase 1 (Completed ✅):**
- ✅ `src/components/delivery/OrderTrackingMap.tsx` — full-screen map with polylines
- ✅ `src/components/delivery/CustomMapMarker.tsx` — animated status markers
- ✅ `src/data/delivery/static-checkpoints.ts` — metro manila + cebu + default routes
- ✅ Updated `app/DeliveryTrackingScreen.tsx` — overlay architecture
- ✅ Map always visible as background (no toggle)
- ✅ Completed path (solid amber) and Pending path (dashed gray) polylines
- ✅ Floating header with safe area insets
- ✅ Bottom sheet card with all order/courier/timeline details
- ✅ Custom minimal map style matching app theme

---

## Phase 2: Real Data Connection

**Goal:** Replace static checkpoints with real data from database.  
**Duration:** 3-4 days  
**Risk:** Low - data already exists, just need to wire it up

### 2.1 Database Schema Enhancement

**What Already Exists:**
```sql
-- delivery_bookings table
- pickup_address (JSON with coordinates support)
- delivery_address (JSON with coordinates support)
- status (booked, in_transit, delivered, etc.)

-- delivery_tracking_events table
- status
- location (text)
- event_at (timestamp)
- description

-- shipping_addresses table
- coordinates (JSON: {lat, lng}) ✅ Already exists!
```

**What Needs to Be Added:**
```sql
-- Add courier location tracking columns to delivery_bookings
ALTER TABLE delivery_bookings
ADD COLUMN courier_lat DOUBLE PRECISION,
ADD COLUMN courier_lng DOUBLE PRECISION,
ADD COLUMN courier_last_updated TIMESTAMP;

-- Add route coordinates to delivery_tracking_events
ALTER TABLE delivery_tracking_events
ADD COLUMN location_lat DOUBLE PRECISION,
ADD COLUMN location_lng DOUBLE PRECISION;
```

**Migration File:** Create via Supabase Dashboard or SQL editor

### 2.2 Enhance Delivery Service

**Modify:** `src/services/deliveryService.ts`

**New Methods:**
```typescript
class DeliveryService {
  // Existing methods...
  
  /**
   * Get delivery route with real coordinates
   * Returns checkpoints with actual lat/lng from addresses
   */
  async getDeliveryRoute(bookingId: string): Promise<DeliveryRoute> {
    // 1. Fetch delivery booking with addresses
    // 2. Extract coordinates from pickup & delivery addresses
    // 3. Fetch tracking events with location coordinates
    // 4. Build route array with real checkpoints
    // 5. Calculate intermediate points for polyline
  }
  
  /**
   * Update courier location (called by courier app)
   */
  async updateCourierLocation(
    bookingId: string, 
    lat: number, 
    lng: number
  ): Promise<void> {
    // Update courier_lat, courier_lng in delivery_bookings
    // Set courier_last_updated to now()
  }
  
  /**
   * Get courier's current location
   */
  async getCourierLocation(bookingId: string): Promise<{
    lat: number;
    lng: number;
    lastUpdated: string;
  } | null> {
    // Fetch courier_lat, courier_lng from delivery_bookings
    // Return null if not available or stale (>5 min old)
  }
}
```

### 2.3 Enhance Delivery Store

**Modify:** `src/stores/deliveryStore.ts`

**New State & Actions:**
```typescript
interface DeliveryState {
  // Existing state...
  
  // New: Route data with real coordinates
  deliveryRoute: DeliveryRoute | null;
  courierLocation: { lat: number; lng: number } | null;
  routeLoading: boolean;
  
  // New actions
  fetchDeliveryRoute: (bookingId: string) => Promise<void>;
  fetchCourierLocation: (bookingId: string) => Promise<void>;
  updateCourierLocation: (
    bookingId: string, 
    lat: number, 
    lng: number
  ) => Promise<void>;
  clearRoute: () => void;
}
```

### 2.4 Connect Map to Real Data

**Modify:** `src/components/delivery/OrderTrackingMap.tsx`

**Changes:**
1. Accept `bookingId` as prop (in addition to checkpoints)
2. On mount, call `fetchDeliveryRoute(bookingId)`
3. Use real coordinates from:
   - **Origin:** `pickup_address.coordinates` (from `delivery_bookings`)
   - **Destination:** `delivery_address.coordinates` (from `delivery_bookings`)
   - **Checkpoints:** `delivery_tracking_events` with location coordinates
4. Fallback to static checkpoints if data not available
5. Show loading skeleton while fetching

**Data Flow:**
```
OrderTrackingMap.tsx
  ↓ (on mount)
useDeliveryStore.fetchDeliveryRoute(bookingId)
  ↓
deliveryService.getDeliveryRoute(bookingId)
  ↓
Supabase: SELECT * FROM delivery_bookings WHERE id = ?
  ↓
Extract coordinates from addresses
  ↓
Supabase: SELECT * FROM delivery_tracking_events WHERE booking_id = ?
  ↓
Build route array with real checkpoints
  ↓
Update store: deliveryRoute
  ↓
Map re-renders with real data
```

### 2.5 Update DeliveryTrackingScreen

**Modify:** `app/DeliveryTrackingScreen.tsx`

**Changes:**
1. After fetching booking info, extract `bookingId`
2. Call `fetchDeliveryRoute(bookingId)`
3. Pass real route data to `OrderTrackingMap`
4. Show loading state gracefully
5. Handle missing coordinate data (fallback to static)

**Updated Data Flow in Screen:**
```typescript
useEffect(() => {
  // Existing: Fetch tracking by order ID
  fetchTrackingByOrderId(orderUuid);
  
  // NEW: Fetch route with coordinates
  fetchDeliveryRoute(bookingId);
}, [orderUuid, bookingId]);

// In render:
<OrderTrackingMap
  origin={deliveryRoute?.origin}
  destination={deliveryRoute?.destination}
  checkpoints={deliveryRoute?.checkpoints || STATIC_CHECKPOINTS.default}
  currentStep={calculateCurrentStep(timeline)}
  courierLocation={courierLocation}
  showCourierMarker={!!courierLocation}
/>
```

### 2.6 Address Coordinate Capture

**Enhance Address Creation Flow:**

**Modify:** Address creation screens to capture coordinates

**Options:**
1. **Use `expo-location`** to get current GPS when user adds address
2. **Use `react-native-geocoding`** to convert address text to coordinates
3. **Add map picker** for manual coordinate selection

**Implementation (Option 1 - GPS):**
```typescript
import * as Location from 'expo-location';

async function getCurrentCoordinates() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  
  return {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  };
}
```

**Implementation (Option 2 - Geocoding):**
```typescript
import Geocoder from 'react-native-geocoding';

Geocoder.init(EXPO_PUBLIC_GOOGLE_MAPS_API_KEY);

async function geocodeAddress(address: string) {
  const json = await Geocoder.from(address);
  const location = json.results[0].geometry.location;
  
  return {
    lat: location.lat,
    lng: location.lng,
  };
}
```

**Best Practice:** Use Option 1 (GPS) as primary, Option 2 (geocoding) as fallback

### 2.7 Calculate Route Polyline

**New File:** `src/utils/delivery/route-calculator.ts`

```typescript
/**
 * Calculate intermediate points between checkpoints for smooth polyline
 * Uses simple interpolation (Phase 2) - can upgrade to real routing API later
 */
export function calculateRoutePoints(
  checkpoints: Array<{ lat: number; lng: number }>
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];
  
  for (let i = 0; i < checkpoints.length - 1; i++) {
    const start = checkpoints[i];
    const end = checkpoints[i + 1];
    
    // Generate 10 intermediate points between each checkpoint
    const steps = 10;
    for (let j = 0; j <= steps; j++) {
      const lat = start.lat + (end.lat - start.lat) * (j / steps);
      const lng = start.lng + (end.lng - start.lng) * (j / steps);
      points.push({ lat, lng });
    }
  }
  
  return points;
}

/**
 * Future: Use Google Directions API or Mapbox for real road routes
 */
export async function fetchRealRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<Array<{ lat: number; lng: number }>> {
  // Call Google Directions API or Mapbox Directions API
  // Returns actual road route, not straight line
  // Requires API key
}
```

**Deliverables for Phase 2:**
- ✅ Database migration for coordinate columns
- ✅ `deliveryService.getDeliveryRoute()` method
- ✅ `deliveryService.updateCourierLocation()` method
- ✅ `deliveryService.getCourierLocation()` method
- ✅ Updated `deliveryStore` with route state
- ✅ Real coordinate data flowing to `OrderTrackingMap`
- ✅ Fallback to static data if coordinates missing
- ✅ Address coordinate capture on creation
- ✅ Route polyline calculation
- ✅ Loading states & error handling

---

## Phase 3: Real-time Live Tracking

**Goal:** Show courier's live location updating in real-time.  
**Duration:** 4-5 days  
**Risk:** Medium - requires courier app integration

### 3.1 Courier Location Updates

**Two Scenarios:**

**Scenario A: Courier uses your app (React Native)**
- Courier app has "Start Delivery" button
- Uses `expo-location` to send GPS updates every 30 seconds
- Updates `delivery_bookings.courier_lat`, `courier_lng`

**Scenario B: Courier uses external service (J&T, LBC, etc.)**
- Poll courier's API every 2-3 minutes
- Or use webhooks if courier supports it
- Update local database with location data

### 3.2 Implement Live Location Tracking

**New File:** `src/hooks/useLiveCourierTracking.ts`

```typescript
/**
 * Hook for real-time courier location updates
 * Uses Supabase Realtime subscriptions
 */
export function useLiveCourierTracking(bookingId: string) {
  const [courierLocation, setCourierLocation] = useState<{
    lat: number;
    lng: number;
    lastUpdated: string;
  } | null>(null);
  
  useEffect(() => {
    if (!bookingId) return;
    
    // Subscribe to delivery_bookings changes
    const channel = supabase
      .channel(`courier-location-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'delivery_bookings',
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const { courier_lat, courier_lng, courier_last_updated } = payload.new;
          
          if (courier_lat && courier_lng) {
            setCourierLocation({
              lat: courier_lat,
              lng: courier_lng,
              lastUpdated: courier_last_updated,
            });
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId]);
  
  return courierLocation;
}
```

### 3.3 Courier App Location Broadcasting

**If building courier app (separate app or mode):**

**New File:** `src/hooks/useCourierLocationBroadcast.ts`

```typescript
/**
 * Hook for courier app to broadcast location
 * Call when delivery status is "picked_up" or "in_transit"
 */
export function useCourierLocationBroadcast(bookingId: string, isActive: boolean) {
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  
  useEffect(() => {
    if (!isActive || !bookingId) return;
    
    async function startBroadcasting() {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      // Watch position every 30 seconds
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 30000, // 30 seconds
          distanceInterval: 50, // or 50 meters
        },
        async (location) => {
          // Update database
          await supabase
            .from('delivery_bookings')
            .update({
              courier_lat: location.coords.latitude,
              courier_lng: location.coords.longitude,
              courier_last_updated: new Date().toISOString(),
            })
            .eq('id', bookingId);
        }
      );
    }
    
    startBroadcasting();
    
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [bookingId, isActive]);
}
```

### 3.4 Animate Courier Marker on Map

**Enhance:** `src/components/delivery/OrderTrackingMap.tsx`

**Add animated courier marker:**
```typescript
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming 
} from 'react-native-reanimated';
import MapView, { Marker } from 'react-native-maps';

function CourierMarker({ location }: { location: { lat: number; lng: number } }) {
  const latitude = useSharedValue(location.lat);
  const longitude = useSharedValue(location.lng);
  
  // Animate to new position when location updates
  useEffect(() => {
    latitude.value = withTiming(location.lat, { duration: 1000 });
    longitude.value = withTiming(location.lng, { duration: 1000 });
  }, [location]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: /* calculate from longitude */ },
      { translateY: /* calculate from latitude */ },
    ],
  }));
  
  return (
    <Animated.View style={animatedStyle}>
      <View style={styles.courierMarker}>
        <TruckIcon size={24} color={COLORS.primary} />
        <View style={styles.courierPulse} />
      </View>
    </Animated.View>
  );
}
```

### 3.5 Distance & ETA Calculation

**New File:** `src/utils/delivery/distance-calculator.ts`

```typescript
/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Calculate ETA based on distance and average speed
 */
export function calculateETA(
  distance: number,
  averageSpeed: number = 30 // km/h in city
): number {
  return (distance / averageSpeed) * 60; // minutes
}

/**
 * Get formatted ETA string
 */
export function getFormattedETA(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} mins`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours}h ${mins}m`;
}
```

### 3.6 Real-time Updates in DeliveryTrackingScreen

**Enhance:** `app/DeliveryTrackingScreen.tsx`

**Add live tracking:**
```typescript
function DeliveryTrackingScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const bookingId = // ... get from delivery booking
  
  // NEW: Live courier location
  const courierLocation = useLiveCourierTracking(bookingId);
  
  // Calculate distance & ETA
  const distanceRemaining = courierLocation 
    ? calculateDistance(courierLocation, order.deliveryAddress.coordinates)
    : null;
  
  const eta = distanceRemaining ? calculateETA(distanceRemaining) : null;
  
  return (
    <OrderTrackingMap
      origin={route.origin}
      destination={route.destination}
      checkpoints={route.checkpoints}
      currentStep={currentStep}
      courierLocation={courierLocation} // NEW: Real-time updates!
      showCourierMarker={!!courierLocation}
      distanceRemaining={distanceRemaining}
      eta={eta}
    />
  );
}
```

### 3.7 Push Notifications for Status Changes

**Enhance:** Existing real-time subscription to trigger notifications

**Modify:** `src/services/pushNotificationService.ts`

```typescript
// When order status changes to "out_for_delivery" or "delivered"
// Send push notification to buyer

export async function notifyDeliveryStatusChange(
  userId: string,
  orderId: string,
  status: string,
  courierLocation?: { lat: number; lng: number }
) {
  const messages = {
    out_for_delivery: '🚚 Your order is out for delivery!',
    delivered: '📦 Your order has been delivered!',
    nearby: '📍 Your courier is nearby!',
  };
  
  const message = messages[status];
  if (!message) return;
  
  // Check if courier is nearby (within 1km)
  if (status === 'out_for_delivery' && courierLocation) {
    const distance = calculateDistance(
      courierLocation,
      // Get buyer address coordinates
    );
    
    if (distance < 1) {
      await sendPushNotification(userId, messages.nearby);
    }
  }
  
  await sendPushNotification(userId, message);
}
```

**Deliverables for Phase 3:**
- ✅ `useLiveCourierTracking` hook (Supabase Realtime)
- ✅ `useCourierLocationBroadcast` hook (for courier app)
- ✅ Animated courier marker on map
- ✅ Distance & ETA calculation utilities
- ✅ Real-time distance display on map
- ✅ Push notifications for status changes
- ✅ "Courier is nearby" notification (< 1km)
- ✅ Background location permissions setup

---

## Phase 4: Advanced Features (Future)

**Goal:** Polish and advanced functionality.  
**Duration:** Ongoing

### 4.1 Real Routing with Google Directions API

**Replace straight-line polyline with actual road routes:**
```typescript
// Use Google Directions API
const response = await fetch(
  `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&key=${API_KEY}`
);

const route = response.routes[0].overview_polyline.points;
const decodedPoints = decodePolyline(route);
// Use decoded points for MapView.Polyline
```

### 4.2 Map-Based Address Picker

**Allow users to pin their address on a map:**

**New Screen:** `app/AddressMapPickerScreen.tsx`

```typescript
// User can:
// 1. See map with current location
// 2. Drag pin to exact spot
// 3. Search for address (geocoding)
// 4. "Use My Location" button
// 5. Save coordinates with address
```

### 4.3 Offline Map Support

**Cache map tiles for offline viewing:**
```typescript
// Use react-native-maps offline tile caching
// Download route area when tracking page opens
// Show cached map if no internet
```

### 4.4 Multiple Package Tracking

**Track multiple deliveries on one map:**
```typescript
// For sellers: Show all active deliveries on map
// Each delivery has a marker
// Tap marker to see details
// Useful for seller dashboard
```

### 4.5 Route Optimization

**Suggest optimal delivery routes for couriers:**
```typescript
// If courier has multiple deliveries
// Calculate optimal route using:
// - Google Routes API (optimizeWaypoints)
// - OR-Tools (open source)
// Show optimized route on map
```

---

## 📁 File Structure

```
mobile-app/
├── app/
│   ├── DeliveryTrackingScreen.tsx          [ENHANCE - Add map toggle]
│   └── AddressMapPickerScreen.tsx          [NEW - Phase 4]
│
├── src/
│   ├── components/
│   │   └── delivery/
│   │       ├── OrderTrackingMap.tsx        [NEW - Phase 1]
│   │       ├── CustomMapMarker.tsx         [NEW - Phase 1]
│   │       └── CourierMarker.tsx           [NEW - Phase 3]
│   │
│   ├── data/
│   │   └── delivery/
│   │       └── static-checkpoints.ts       [NEW - Phase 1]
│   │
│   ├── hooks/
│   │   ├── useLiveCourierTracking.ts       [NEW - Phase 3]
│   │   └── useCourierLocationBroadcast.ts  [NEW - Phase 3]
│   │
│   ├── services/
│   │   ├── deliveryService.ts              [ENHANCE - Add route methods]
│   │   └── pushNotificationService.ts      [ENHANCE - Add delivery notifications]
│   │
│   ├── stores/
│   │   └── deliveryStore.ts                [ENHANCE - Add route state]
│   │
│   ├── utils/
│   │   └── delivery/
│   │       ├── route-calculator.ts         [NEW - Phase 2]
│   │       └── distance-calculator.ts      [NEW - Phase 3]
│   │
│   └── types/
│       └── delivery.types.ts               [ENHANCE - Add route types]
│
├── app.json                                [ENHANCE - Add location permissions]
└── package.json                            [ENHANCE - Add react-native-maps-directions]
```

---

## 🔧 Configuration Changes

### app.json - Add Permissions

```json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow BazaarX to use your location to show delivery tracking.",
          "locationAlwaysPermission": "Allow BazaarX to use your location for delivery tracking even when the app is in the background.",
          "locationWhenInUsePermission": "Allow BazaarX to use your location to show delivery tracking.",
          "isAndroidBackgroundLocationEnabled": true
        }
      ]
    ],
    "android": {
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

### package.json - New Dependencies

```json
{
  "dependencies": {
    "react-native-maps": "^1.20.1",        // ✅ Already installed
    "expo-location": "~19.0.8",             // ✅ Already installed
    "react-native-maps-directions": "^1.9.2", // NEW - For polyline routing
    "react-native-geocoding": "^0.5.0"        // NEW - For address geocoding
  }
}
```

---

## 🧪 Testing Strategy

### Phase 1 Testing (Static Map)
- [ ] Map renders without errors
- [ ] Markers display correctly for each status
- [ ] Polyline draws between checkpoints
- [ ] Map is collapsible (show/hide toggle)
- [ ] Custom markers render properly
- [ ] Map styling matches app theme
- [ ] No performance issues (60 FPS)
- [ ] Works on iOS and Android

### Phase 2 Testing (Real Data)
- [ ] Fetches real coordinates from database
- [ ] Falls back to static data if coordinates missing
- [ ] Loading states display correctly
- [ ] Error handling works (no data, network error)
- [ ] Address creation captures coordinates
- [ ] Route polyline uses real data
- [ ] All database queries are performant

### Phase 3 Testing (Real-time)
- [ ] Courier location updates in real-time
- [ ] Animated marker moves smoothly
- [ ] Distance calculation is accurate
- [ ] ETA updates dynamically
- [ ] Push notifications trigger correctly
- [ ] "Courier nearby" notification works
- [ ] Background location works (courier app)
- [ ] Subscription cleanup on unmount

---

## ⚡ Performance Considerations

### Map Rendering
- Use `React.memo` for map component to prevent unnecessary re-renders
- Debounce location updates (max 1 update per 5 seconds)
- Use `shouldUpdateRegion` prop carefully (recalculating region is expensive)

### Real-time Updates
- Use Supabase Realtime (WebSocket) - already set up
- Throttle location broadcasts to avoid database spam
- Implement exponential backoff on connection failures

### Memory Management
- Always cleanup subscriptions in `useEffect` return
- Remove location watchers when component unmounts
- Clear tracking data when navigating away

### Battery Optimization (Courier App)
- Use `distanceInterval` in addition to `timeInterval`
- Stop broadcasting when courier is stationary
- Reduce accuracy when not needed (Balanced vs High)

---

## 🚀 Migration Path from Web

| Web Implementation | React Native Equivalent | Notes |
|-------------------|------------------------|-------|
| Leaflet (`react-leaflet`) | `react-native-maps` | Native performance |
| OpenStreetMap tiles | Apple Maps (iOS) / Google Maps (Android) | Built-in, no config |
| Nominatim geocoding | `react-native-geocoding` (Google) | More reliable |
| Browser Geolocation | `expo-location` | Better accuracy, background support |
| Framer Motion animations | `react-native-reanimated` | Native 60 FPS |
| SVG tracking visualization | Real MapView with markers | Much better UX |
| AfterShip integration | Reuse same API | No changes needed |
| Supabase client | Same `@supabase/supabase-js` | Identical API |
| Zustand stores | Same `zustand` | Works identically |

---

## 📊 Effort Estimation

| Phase | Complexity | Duration | Risk | Dependencies |
|-------|-----------|----------|------|--------------|
| **Phase 1: Static Map** | Low | 2-3 days | None | `react-native-maps` (installed) |
| **Phase 2: Real Data** | Medium | 3-4 days | Low | DB migration, address coordinates |
| **Phase 3: Live Tracking** | High | 4-5 days | Medium | Courier app or API integration |
| **Phase 4: Advanced** | Variable | Ongoing | Low | Phase 3 complete |

**Total MVP (Phases 1-2):** 5-7 days  
**Full Implementation (Phases 1-3):** 9-12 days

---

## ✅ Success Criteria

### MVP (Phase 1-2)
- [ ] User can see map on tracking screen
- [ ] Map shows delivery route with markers
- [ ] Data comes from real database (not static)
- [ ] Graceful fallback if data missing
- [ ] Beautiful UI matching app theme
- [ ] Works on iOS and Android
- [ ] No crashes or performance issues

### Full Feature (Phase 3)
- [ ] Courier location updates in real-time
- [ ] Animated marker moves smoothly on map
- [ ] Distance & ETA update dynamically
- [ ] Push notifications for status changes
- [ ] Background location tracking works
- [ ] Battery usage is reasonable
- [ ] Works reliably in production

---

## 🎯 Recommended Rollout Plan

**Week 1:** Phase 1 (Static Map)
- Build `OrderTrackingMap` component
- Integrate into `DeliveryTrackingScreen`
- Test with static data
- Deploy to beta testers

**Week 2:** Phase 2 (Real Data)
- Run database migration
- Wire up real coordinate data
- Add address coordinate capture
- Test with real orders
- Deploy to production

**Week 3:** Phase 3 (Live Tracking)
- Build real-time subscription
- Implement courier location broadcast
- Add animated marker & distance calc
- Test with actual deliveries
- Deploy to production

**Week 4+:** Phase 4 (Advanced)
- Google Directions API integration
- Map-based address picker
- Offline support
- Route optimization

---

## 💡 Best Practices Followed

1. **Incremental Delivery** - Each phase is independently testable
2. **Graceful Degradation** - Falls back to static data if real data unavailable
3. **Type Safety** - Full TypeScript throughout
4. **Existing Patterns** - Follows app's Zustand + Supabase architecture
5. **Performance First** - Native rendering, debounced updates, proper cleanup
6. **User Experience** - Smooth animations, loading states, error handling
7. **Platform Awareness** - Uses native map providers (Apple/Google)
8. **Battery Conscious** - Optimized location updates for courier app
9. **Offline Tolerant** - Works partially even without internet
10. **Future Proof** - Easy to upgrade to advanced features later
