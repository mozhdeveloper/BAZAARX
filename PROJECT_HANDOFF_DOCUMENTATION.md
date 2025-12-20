# BazaarX Project Handoff Documentation

## 1. Project Overview
**BazaarX** is a comprehensive multi-vendor e-commerce platform designed for the Philippines market. It connects Buyers, Sellers, and Administrators through a unified ecosystem consisting of a responsive Web Application and a Mobile App.

**Core Value Proposition:**
- **For Buyers:** A seamless shopping experience with advanced search, collections, and secure checkout.
- **For Sellers:** A powerful dashboard to manage products, orders, and earnings, with a rigorous verification process.
- **For Admins:** Complete oversight of the platform, including seller approval, content moderation, and analytics.

---

## 2. Tech Stack

### Web Application (`/web`)
- **Framework:** React 18.3.1
- **Build Tool:** Vite 6.0.1
- **Language:** TypeScript 5.6.2
- **Styling:** Tailwind CSS 3.4.15, shadcn/ui (Radix UI primitives)
- **State Management:** Zustand 5.0.2 (with persistence)
- **Routing:** React Router DOM 7.10.1
- **Icons:** Lucide React
- **Charts:** Recharts

### Mobile Application (`/mobile-app`)
- **Framework:** React Native (Expo SDK 52)
- **Language:** TypeScript
- **Navigation:** React Navigation 7.0 (Native Stack + Bottom Tabs)
- **Icons:** Lucide React Native
- **Gestures:** React Native Gesture Handler

---

## 3. Branding & Design System

### Color Palette (Updated December 2025)
| Token | Hex Code | Usage |
|-------|----------|-------|
| **Primary (Bright Orange)** | `#FF5722` | Brand identity, CTA buttons, Active states, Headers |
| **Primary Dark** | `#E64A19` | Hover states, pressed states |
| **Primary Light** | `#FF7043` | Gradients, accents |
| **Background White** | `#FFFFFF` | Cards, modals, primary surfaces |
| **Background Gray** | `#F5F5F7` | Page background, conversation views |
| **Text Primary** | `#1F2937` / `#1A1A1A` | Headings, body text |
| **Text Secondary** | `#6B7280` | Supporting text |
| **Text Muted** | `#9CA3AF` | Placeholders, disabled states |
| **Border Light** | `#F3F4F6` / `#E5E7EB` | Subtle dividers |

**⚠️ Forbidden Colors:** Green (`#22C55E`) and Blue (`#2563EB`) have been completely removed from the mobile app to maintain strict brand consistency.

### Typography
- **Web:** Inter, system-ui, sans-serif
- **Mobile:** System default (SF Pro on iOS, Roboto on Android)
- **Weight Scale:** 
  - 800 (Extra Bold) for headings and primary actions
  - 700 (Bold) for subheadings
  - 600 (Semibold) for labels
  - 500 (Medium) for body text
  - 400 (Regular) for secondary content
- **Letter Spacing:** Negative values (-0.1 to -0.8) for premium, tight feel

### Design Philosophy
**"Apple Meets Nike"** - Premium, clean, high-contrast interfaces inspired by modern consumer tech and sportswear brands.

#### Visual Principles:
1. **Deep Rounded Corners:**
   - Cards: 16-24px borderRadius
   - Buttons/Pills: 999px borderRadius
   - Inputs: 20px+ borderRadius

2. **Shadows Over Borders:**
   - Soft, diffused shadows (elevation 2-8)
   - Shadow opacity: 0.04-0.15
   - NO borders on white cards (shadows provide depth)

3. **Edge-to-Edge Headers:**
   - Extend behind status bar using `useSafeAreaInsets`
   - Solid orange background (#FF5722)
   - White text and icons
   - Consistent across all modal/detail screens

4. **Floating Elements:**
   - Search bars hover over content with heavy shadows
   - Bottom action bars float with rounded top corners
   - Input areas separate from main content

5. **White Space:**
   - Generous padding (16-20px)
   - Clear visual hierarchy
   - Cards separated by 12px gaps

---

## 4. Mobile Component Patterns & Architecture

### Universal Header Pattern
A consistent header design used across all modal and detail screens in the mobile app:

**Structure:**
```tsx
<View style={[styles.header, { paddingTop: insets.top + 12 }]}>
  <Pressable onPress={onBack}>  {/* Left */}
    <ArrowLeft size={24} color="#FFFFFF" />
  </Pressable>
  <Text style={styles.headerTitle}>  {/* Center */}
    Screen Title
  </Text>
  <Pressable onPress={onAction}>  {/* Right */}
    <ActionIcon size={22} color="#FFFFFF" />
  </Pressable>
</View>
```

**Key Features:**
- Solid orange background (#FF5722)
- Extends behind status bar using `useSafeAreaInsets`
- White text and icons for high contrast
- Three zones: Back (left), Title (center), Action (right)
- Consistent padding: `paddingTop: insets.top + 12-16`

**Implemented In:**
- ProductDetailScreen.tsx
- CartScreen.tsx
- CheckoutScreen.tsx
- AIChatModal.tsx
- LocationModal.tsx (with variations)
- DeliveryTrackingScreen.tsx

### Home Header Pattern (Unique)
The Home screen uses a special **3-row tall header**:

**Row 1: Greeting & Icons**
- "Good Morning, Welcome" + Username
- AI Assistant icon (Bot)
- Notifications bell with badge

**Row 2: Search Bar**
- White pill-shaped TextInput
- Search icon (left)
- Camera icon inside (right)
- Back arrow appears when focused
- Cancel button appears when focused (outside bar)

**Row 3: Location Bar**
- MapPin icon + "Delivery to: [Address]"
- ChevronDown icon
- Tappable → Opens LocationModal
- Hides when search is focused

### Component Hierarchy

```
Screens (Full page views)
  ├── HomeScreen
  ├── ShopScreen
  ├── ProductDetailScreen
  ├── CartScreen
  └── CheckoutScreen

Modals (Overlay components)
  ├── AIChatModal (AI Assistant)
  ├── CameraSearchModal (Visual search)
  ├── LocationModal (Address picker)
  ├── ProductRequestModal
  └── Notifications Modal

Reusable Components
  ├── ProductCard (Product grid item)
  ├── CartItemRow (Cart line item)
  ├── QuantityStepper (+/- control)
  ├── BadgePill (Status tags)
  └── OrderCard (Order history item)

Layout Components
  └── Navigation (Bottom Tabs + Stack)
```

### State Management Strategy

**Zustand Stores:**
- `cartStore.ts`: Shopping cart state (add, remove, update quantity, clear)
- `orderStore.ts`: Order management (create, track, history)
- Future: `authStore.ts`, `sellerStore.ts`

**Local Component State:**
- UI interactions (modals, focus states, selections)
- Search queries and filters
- Form inputs

**Persistence:**
- Cart persists to AsyncStorage (mobile) / localStorage (web)
- Orders persist for order history
- User preferences persist

---

## 5. Project Structure

### Root Directory
```
/Users/jcuady/Dev/BAZAARX/
├── web/                  # React Web Application
├── mobile-app/           # React Native Mobile Application
├── package.json          # Root dependencies
└── ...                   # Documentation files (.md)
```

### Web Structure (`/web`)
```
web/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/           # shadcn/ui primitives (Button, Input, etc.)
│   │   ├── layout/       # Layout wrappers
│   │   └── ...           # Feature-specific components (AdminSidebar, etc.)
│   ├── data/             # Mock data (products.ts, categories.ts)
│   ├── lib/              # Utilities (utils.ts)
│   ├── pages/            # Route components
│   │   ├── Admin*.tsx    # Admin portal pages
│   │   ├── Seller*.tsx   # Seller portal pages
│   │   └── ...           # Buyer pages (Home, Shop, Cart)
│   ├── stores/           # Zustand stores
│   │   ├── adminStore.ts # Admin state
│   │   ├── cartStore.ts  # Shopping cart state
│   │   └── sellerStore.ts# Seller state (The "Brain" of the seller app)
│   ├── styles/           # Global CSS
│   └── App.tsx           # Main Router configuration
└── tailwind.config.js    # Theme configuration
```

### Mobile Structure (`/mobile-app`)
```
mobile-app/
├── app/                  # Screen components
│   ├── HomeScreen.tsx            # Main landing (Search Active, Discovery)
│   ├── ShopScreen.tsx            # Product browsing with filters
│   ├── CartScreen.tsx            # Shopping cart
│   ├── CheckoutScreen.tsx        # Purchase flow
│   ├── OrdersScreen.tsx          # Order history
│   ├── OrderDetailScreen.tsx    # Order tracking
│   ├── DeliveryTrackingScreen.tsx
│   ├── ProductDetailScreen.tsx   # Product view
│   ├── ProfileScreen.tsx         # User profile
│   └── seller/                   # Seller Module (NEW)
│       ├── SellerTabs.tsx        # Bottom tab navigator (5 tabs)
│       ├── login.tsx             # Seller authentication
│       └── (tabs)/               # Seller dashboard screens
│           ├── dashboard.tsx     # Overview with stats & charts
│           ├── products.tsx      # Inventory management
│           ├── orders.tsx        # Order fulfillment
│           ├── analytics.tsx     # Sales performance
│           └── settings.tsx      # Store settings & account switching
├── src/
│   ├── components/       # Mobile UI components
│   │   ├── AIChatModal.tsx          # AI Assistant with comparison widgets
│   │   ├── CameraSearchModal.tsx    # Visual search
│   │   ├── LocationModal.tsx        # Address selection
│   │   ├── ProductRequestModal.tsx
│   │   ├── ProductCard.tsx
│   │   ├── CartItemRow.tsx          # Modernized cart item
│   │   ├── QuantityStepper.tsx      # Orange-branded stepper
│   │   └── ...
│   ├── data/             # Mobile mock data
│   │   ├── products.ts   # Product catalog
│   │   └── ...
│   ├── stores/           # Mobile state management
│   │   ├── cartStore.ts  # Shopping cart (Zustand)
│   │   ├── orderStore.ts # Order management
│   │   ├── sellerStore.ts# Seller dashboard state (NEW)
│   │   └── ...
│   └── types/            # TypeScript definitions
│       └── index.ts
└── App.tsx               # Navigation configuration (Tabs + Stack)
```

---

## 6. Navigation & Routing

### Web Routing (`web/src/App.tsx`)
The web app uses `react-router-dom` with three distinct sections:

1.  **Buyer Routes (Public):**
    -   `/` (Home)
    -   `/shop`, `/search`, `/collections` (Browsing)
    -   `/product/:id` (Detail)
    -   `/cart`, `/checkout` (Purchase)
    -   `/seller/:sellerId` (Storefront View)

2.  **Seller Routes (Protected):**
    -   `/seller/auth`, `/seller/login`, `/seller/register` (Entry)
    -   `/seller/onboarding` (Registration Wizard)
    -   `/seller/dashboard` (Main Hub)
    -   `/seller/products`, `/seller/orders` (Management)
    -   `/seller/store-profile`, `/seller/earnings` (Business)

3.  **Admin Routes (Protected):**
    -   `/admin/login`
    -   `/admin/dashboard`
    -   `/admin/sellers` (Approval Workflow)

### Mobile Navigation (`mobile-app/App.tsx`)
The mobile app uses a nested navigator approach:

1.  **MainTabs (Bottom Tab Navigator):**
    -   `Home` (HomeScreen)
    -   `Shop` (ShopScreen)
    -   `Cart` (CartScreen)
    -   `Orders` (OrdersScreen)
    -   `Profile` (ProfileScreen)

2.  **RootStack (Native Stack Navigator):**
    -   `MainTabs` (The tabs above)
    -   `ProductDetail` (Modal/Push)
    -   `Checkout`
    -   `OrderDetail`
    -   `DeliveryTracking`
    -   `SellerLogin` (Seller authentication)
    -   `SellerTabs` (Seller dashboard with 5 tabs)

3.  **SellerTabs (Bottom Tab Navigator - NEW):**
    -   `Dashboard` (Stats overview with revenue charts)
    -   `Products` (Inventory management)
    -   `Orders` (Order fulfillment workflow)
    -   `Analytics` (Sales performance & insights)
    -   `Settings` (Store configuration & account switching)

---

## 7. Key Features & User Flows

### A. Seller Onboarding Flow
1.  **Registration:** User fills out a 5-step form (Personal, Business, Address, Banking, Documents).
2.  **Pending State:** Account is created with `approvalStatus: 'pending'`. User is redirected to a "Waiting for Approval" page.
3.  **Admin Review:** Admin logs in, views the application in `/admin/sellers`, and clicks "Approve".
4.  **Activation:** Seller status becomes `approved`. Dashboard access is granted.
5.  **Security:** Once approved, critical business fields (Bank Info, Tax ID) are **locked** in the profile to prevent fraud.

### B. Buyer Purchase Flow
1.  **Discovery:** Buyer browses Home/Shop or searches for items.
2.  **Cart:** Adds items to cart (persisted in `cartStore`).
3.  **Checkout:** Enters shipping details and payment method.
4.  **Order Creation:** Order is generated and appears in:
    -   Buyer's "My Orders"
    -   Seller's "Seller Orders"
    -   Admin's "Admin Orders"

---

## 8. Data Models (JSON Schemas)

### Seller Model (`sellerStore.ts`)
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "businessName": "string",
  "storeName": "string",
  "storeCategory": ["string"],
  "businessRegistrationNumber": "string",
  "taxIdNumber": "string",
  "bankName": "string",
  "accountNumber": "string",
  "isVerified": boolean,
  "approvalStatus": "pending" | "approved" | "rejected",
  "totalSales": number,
  "avatar": "string (url)"
}
```

### Product Model
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "price": number,
  "originalPrice": number,
  "stock": number,
  "category": "string",
  "images": ["string"],
  "isActive": boolean,
  "sellerId": "string",
  "rating": number
}
```

### Order Model
```json
{
  "id": "string",
  "items": [{
    "productId": "string",
    "quantity": number,
    "price": number
  }],
  "total": number,
  "status": "pending" | "confirmed" | "shipped" | "delivered",
  "paymentStatus": "paid" | "pending",
  "shippingAddress": { ... }
}
```

---

## 9. Recent Updates & Achievements (December 2025)

### Mobile App Modernization
The mobile app underwent a comprehensive UI/UX overhaul inspired by Apple, Nike, and modern e-commerce leaders (Shopee, Lazada). All screens now follow the **White & Bright Orange** (#FF5722) design system.

#### Completed Features:

**1. Universal Header Pattern (Edge-to-Edge Orange)**
- Implemented across Product Details, Cart, Checkout, AI Chat, and ALL Seller screens
- Uses `useSafeAreaInsets` to extend behind status bar
- Consistent layout: Back arrow (left) → Title (center) → Action (right)
- Seller screens: Menu (left) → Title + Subtitle (center) → Bell with badge (right)
- White text and icons on solid orange background
- No borders, uses shadow for depth

**2. Seller Module (Complete Mobile Dashboard - NEW)**
- **Architecture:**
  - React Navigation Bottom Tabs (replacing expo-router for seller module)
  - 5 tabs: Dashboard, Products, Orders, Analytics, Settings
  - Integrated into RootStack navigation
  - Demo credentials: seller@bazaarx.ph / seller123
  
- **Dashboard Screen:**
  - Immersive header: Menu + "Seller Hub" + Store name subtitle + Bell
  - Stats cards (horizontal scroll): Total Sales, Products, Orders, Customers
  - 7-day revenue LineChart with gradient
  - Recent orders list with status badges
  - All using #FF5722 orange branding
  
- **Products Screen:**
  - Header with "Add Product" button (orange pill)
  - Search bar for inventory filtering
  - Product cards with images, stock count, price
  - Active/Inactive toggle switches (orange)
  - Edit/Delete action buttons
  
- **Orders Screen:**
  - Segmented control filter: All / Pending / To Ship / Completed
  - Order cards with customer info and items
  - Dynamic action buttons based on status:
    - Pending → "Accept Order" (orange)
    - To Ship → "Mark as Shipped" (blue)
    - Completed → "View Details" (grey)
  - Status badges with color coding
  
- **Analytics Screen:**
  - Time range pills: 7D / 30D / 90D (orange active state)
  - Revenue LineChart with 7-day data
  - Category breakdown PieChart
  - Top 5 products table with sales metrics
  
- **Settings Screen (Premium Redesign):**
  - **Store Identity Card:**
    - Floating white card with soft shadow
    - Large circular avatar (64px) with camera badge
    - Store name + email display
    - "Preview" button with eye icon
  - **Horizontal Pill Tabs:**
    - Active: Solid orange with white text
    - Inactive: White with grey border
    - Tabs: Profile, Store Info, Notifications, Security, Payments
  - **Modern Form Inputs:**
    - Bold dark grey labels
    - Light grey backgrounds (#F9FAFB)
    - Deep rounded corners (borderRadius: 12)
    - No borders - clean minimal look
  - **Orange Toggle Switches:** For notification preferences
  - **"Switch to Buyer Mode" Button:**
    - Airbnb-style account switching
    - Premium white card with orange icon circle
    - Title: "Switch to Buyer Mode"
    - Subtitle: "Continue shopping as a customer"
    - Positioned above logout button
  - **Logout Button:** Red on light red background
  
- **Technical Implementation:**
  - All TypeScript errors resolved
  - Consistent header design across all 5 tabs
  - Safe area handling with `useSafeAreaInsets`
  - Zustand store integration (sellerStore.ts)
  - Mock data: 6 products, 5 orders, revenue charts, category sales
  - No expo-router conflicts (pure React Navigation)

**3. Home Screen Enhancements**
- **Tall Orange Header (3 Rows):**
  - Row 1: Greeting + Username, AI Assistant icon, Notifications bell
  - Row 2: Search bar (white pill) with camera icon inside, back arrow when focused
  - Row 3: Location bar (tappable) with MapPin icon and address
- **Search Active View:**
  - Recent Searches: Clock icons, individual remove buttons, "Clear All" action
  - Trending Searches: Orange TrendingUp icons, 5 curated terms
  - Popular Categories: Horizontal scroll with image backgrounds, dark overlays
- **Discovery Mode:** Browse by Category grid + Official Stores scroll
- **Real-time Filtering:** Instant product search as user types
- Header transitions: Hides greeting/location when search is focused

**4. Shop Screen Fixes**
- Fixed category visibility (removed clipping)
- Updated filter logic to match product data categories
- Categories: electronics, fashion, home-garden, food-beverages, books, beauty-personal-care, music-instruments

**5. Product Details Redesign**
- Orange header with embedded search bar (white pill)
- Floating Share/Heart icons (white circles, orange icons)
- Overlapping white card (borderTopRadius: 30, marginTop: -60)
- Bestseller/Discount badges (purple/red pills)
- Quantity selector with orange borders and Plus/Minus icons
- Bottom actions: "Add to Cart" (outline) + "Buy Now" (solid orange)
- All green colors removed

**6. Cart & Checkout Modernization**
- Edge-to-edge orange header
- Free shipping banners: Soft orange (#FFF5F0) instead of green
- Checkout button: Solid orange pill instead of green gradient
- Floating bottom action bar with rounded corners (borderRadius: 24)
- CartItemRow: White cards, borderRadius: 20, no borders, soft shadows
- QuantityStepper: Orange borders, orange icons, pill-shaped

**7. AI Chat / Assistant Redesign**
- Universal orange header with "Clear Chat" text button
- Light grey background (#F5F5F7) for conversation area
- **User Messages:** Orange gradient bubbles, sharp bottom-right corner
- **AI Messages:** White bubbles with robot avatar (32px circle), soft shadow
- **Product Comparison Widget:** 
  - Custom cards with side-by-side product comparison
  - Product images, specs list, orange prices
  - Selectable with orange border highlight
  - Scale icon in header
  - Triggers: "compare earbuds", "compare laptop"
- Floating white input bar at bottom
- Circular orange send button (48px) with paper plane icon
- Suggested questions as white pills on first load

**8. Location Selection Modal**
- Full-screen modal with white background
- Header: "Select Delivery Location" with circular close button (#F5F5F7)
- **Map Simulation:**
  - Unsplash map image background
  - Central orange MapPin (48px) in absolute center
  - Floating tooltip: "Move map to pin location"
- **Floating Search Bar:**
  - Deep pill shape (borderRadius: 999)
  - Heavy shadow for elevation
  - Dropdown suggestions on typing
- **Saved Addresses:**
  - 3 pre-configured cards: Home, Office, Mom's House
  - Orange border when selected, checkmark indicator
  - Location-specific icons (Home, Briefcase, Heart)
- **"Use Current Location" Button:**
  - Orange border, target/crosshair icon
  - GPS enablement message
- Fixed orange confirmation button at bottom
- Integrated: Taps location bar in Home header to open

**9. Component Library Updates**
- **ProductCard:** Consistent orange accents, no green
- **CartItemRow:** Modernized with white background, no borders
- **QuantityStepper:** Orange-branded, matches Product Details
- **BadgePill:** Reusable component for tags and labels
- **OrderCard:** Orange status indicators

#### Technical Improvements:
- ✅ All TypeScript errors resolved
- ✅ No ESLint warnings
- ✅ Consistent use of `useSafeAreaInsets` for iPhone X+ support
- ✅ Zustand state management for cart and orders
- ✅ Smooth animations and transitions
- ✅ Accessibility: Proper contrast ratios, touch targets 44px+

#### Design System Enforcement:
- **Removed Colors:** All instances of green (#22C55E) and blue (#2563EB)
- **Replaced With:** Bright orange (#FF5722) for all primary actions
- **Shadows:** elevation 2-8 with opacity 0.04-0.15
- **Border Radius:** 16-24px for cards, 999px for pills/buttons
- **Typography:** Weight 800 for headings, negative letter-spacing

### Web Application Status
- **Status:** Fully functional UI for all three portals (Buyer, Seller, Admin)
- **Seller Onboarding:** 5-step wizard with validation
- **Admin Approval:** Full workflow for seller verification
- **State Persistence:** Zustand with localStorage
- **Pending:** Mobile-style modernization updates

### Backend Integration
- **Current:** Mock data with Zustand persistence (localStorage)
- **Planned:** REST API or GraphQL endpoints
- **State Management:** Ready for API integration (stores are API-agnostic)

---

## 10. Implementation Status Summary

### ✅ Completed (Mobile)
- [x] Shop screen category filtering
- [x] Product Details complete redesign
- [x] Cart & Checkout modernization
- [x] Home screen tall orange header
- [x] Search Active view (Recent/Trending/Categories)
- [x] AI Chat with product comparison widgets
- [x] Location selection modal with map simulation
- [x] Universal header pattern across all modals
- [x] Component library (ProductCard, CartItemRow, QuantityStepper)
- [x] Orange/White branding enforcement
- [x] Edge-to-edge layouts with safe area handling
- [x] **Seller Module (Complete Mobile Dashboard)**
  - [x] React Navigation bottom tabs (5 tabs)
  - [x] Dashboard with stats, charts, and recent orders
  - [x] Products inventory management screen
  - [x] Orders fulfillment workflow with status filters
  - [x] Analytics with revenue charts and category breakdown
  - [x] Settings with premium UI (store identity card, pill tabs, modern forms)
  - [x] "Switch to Buyer Mode" feature (Airbnb-style)
  - [x] Seller login with demo credentials
  - [x] Immersive headers across all seller screens
  - [x] Integration with sellerStore.ts (Zustand)

### ✅ Completed (Web)
- [x] Seller onboarding workflow
- [x] Admin seller approval system
- [x] Buyer purchase flow
- [x] Three-portal navigation (Buyer/Seller/Admin)
- [x] State management with Zustand
- [x] shadcn/ui component library integration

### 🔄 In Progress
- [ ] Mobile: Order management features (buyer side)
- [ ] Mobile: Profile and user settings
- [ ] Web: Mobile-style visual updates
- [ ] API integration layer

### 📋 Planned
- [ ] Backend API development
- [ ] Real-time order tracking
- [ ] Push notifications
- [ ] Payment gateway integration
- [ ] Image upload and CDN
- [ ] Advanced search with filters

---

This document serves as the master reference for the BazaarX architecture and recent modernization efforts as of December 19, 2025.

---

## 11. Seller Module (Mobile) - Complete Implementation Guide

### Overview
The mobile seller module provides a complete dashboard for vendors to manage their business on-the-go. It mirrors the web seller portal functionality but with a mobile-first design optimized for touch interactions.

### Navigation Architecture
```
App.tsx (RootStack)
  └── SellerLogin (Authentication)
       └── SellerTabs (Bottom Tab Navigator)
            ├── Dashboard
            ├── Products  
            ├── Orders
            ├── Analytics
            └── Settings
```

### Authentication
**File:** `mobile-app/app/seller/login.tsx`

**Demo Credentials:**
- Email: `seller@bazaarx.ph`
- Password: `seller123`

**Flow:**
1. User enters credentials
2. Success screen shows "Enter Seller Dashboard" button
3. Navigation replaces current screen with SellerTabs

**Key Implementation:**
- Uses React Navigation (`NativeStackScreenProps`)
- Success state triggers `navigation.replace('SellerTabs')`
- Premium UI with demo credentials displayed for easy testing

### Tab Structure
**File:** `mobile-app/app/seller/SellerTabs.tsx`

**Configuration:**
```typescript
const Tab = createBottomTabNavigator<SellerTabParamList>();

Tabs:
- Dashboard: LayoutDashboard icon
- Products: Package icon  
- Orders: ShoppingCart icon
- Analytics: TrendingUp icon
- Settings: Settings icon
```

**Styling:**
- Active tint: #FF5722 (Bright Orange)
- Inactive tint: #9CA3AF (Grey)
- Tab bar height: 70px
- Background: White with top border (#F3F4F6)
- Shadow: offset (0, -2), opacity 0.05, radius 8, elevation 8

### Screen Implementations

#### 1. Dashboard (`dashboard.tsx`)
**Purpose:** Overview of store performance and recent activity

**Header:**
- Title: "Seller Hub"
- Subtitle: Store name (from sellerStore)
- Menu button (left), Bell with badge (right)

**Content:**
- **Stats Cards (Horizontal Scroll):**
  - Total Sales (₱ amount, percentage change)
  - Products (count, active status)
  - Orders (count, pending highlight)
  - Customers (count, monthly trend)
  - Design: White cards, orange accent colors, rounded corners (16px)

- **Revenue Chart:**
  - 7-day LineChart using react-native-gifted-charts
  - Orange line (#FF5722) with gradient fill
  - Displays daily revenue data
  - Interactive data points

- **Recent Orders:**
  - List of latest 3-5 orders
  - Shows: Order ID, customer name, amount, status
  - Status badges: Pending (orange), Shipped (blue), Delivered (green)

**Data Source:** `src/stores/sellerStore.ts`

#### 2. Products (`products.tsx`)
**Purpose:** Inventory management and product catalog

**Header:**
- Title: "Products"
- Subtitle: "Inventory Management"
- "Add Product" button (orange pill with Plus icon)

**Content:**
- **Search Bar:**
  - White background, rounded corners (12px)
  - Search icon (left)
  - Placeholder: "Search products..."

- **Product Cards:**
  - Product image (100x100)
  - Name, category, price
  - Stock count with color coding (red if low)
  - Active/Inactive toggle switch (orange when active)
  - Edit (pencil) and Delete (trash) buttons

**Interactions:**
- Toggle product active status
- Edit product details (placeholder)
- Delete product with confirmation
- Add new product (placeholder)

**Data Source:** `sellerStore.products` array

#### 3. Orders (`orders.tsx`)
**Purpose:** Order fulfillment workflow

**Header:**
- Title: "Orders"  
- Subtitle: "Order Management"

**Content:**
- **Segmented Control:**
  - All | Pending | To Ship | Completed
  - Active segment: Orange background, white text
  - Inactive: Grey text on white

- **Order Cards:**
  - Order ID and date
  - Customer name and address
  - Items list with images and quantities
  - Total amount
  - Status badge
  - Dynamic action button based on status:
    - Pending → "Accept Order" (orange)
    - To Ship → "Mark as Shipped" (blue)
    - Completed → "View Details" (grey outline)

**Workflow:**
1. Orders start as "Pending"
2. Seller accepts → Status: "To Ship"
3. Seller marks shipped → Status: "Completed"

**Data Source:** `sellerStore.orders` filtered by selected segment

#### 4. Analytics (`analytics.tsx`)
**Purpose:** Sales insights and performance metrics

**Header:**
- Title: "Analytics"
- Subtitle: "Store Performance"

**Content:**
- **Time Range Selector:**
  - Pills: 7D | 30D | 90D
  - Active: Orange solid, white text
  - Inactive: White with grey border

- **Revenue Chart:**
  - LineChart showing daily/weekly/monthly trends
  - Orange line with gradient area fill
  - Animated data points
  - X-axis: Dates, Y-axis: Revenue (₱)

- **Category Sales (PieChart):**
  - Breakdown by product category
  - Color-coded segments
  - Labels with percentages
  - Total revenue in center

- **Top Products Table:**
  - Rank | Product | Sales | Revenue
  - Top 5 best-selling items
  - Sortable columns (future enhancement)

**Data Source:** `sellerStore.revenue` and `sellerStore.categorySales`

#### 5. Settings (`settings.tsx`)
**Purpose:** Store configuration and account management

**Header:**
- Title: "Store Settings"
- Subtitle: "Manage your store"

**Content:**

**A. Store Identity Card:**
- Premium white card with soft shadow
- **Left:** Circular avatar (64px) with camera badge (orange circle)
  - Shows store logo emoji
  - Tappable to upload image (future)
- **Center:** Store name (bold) and email
- **Right:** "Preview" button with eye icon
  - Opens public storefront (future)

**B. Horizontal Pill Tabs:**
- Profile | Store Info | Notifications | Security | Payments
- Active tab: Solid orange (#FF5722), white text
- Inactive: White background, grey border, grey text
- Smooth horizontal scroll

**C. Form Content (Tab-Specific):**

**Profile Tab:**
- Store Name (TextInput)
- Email Address (TextInput)
- Phone Number (TextInput)
- All inputs: Light grey background (#F9FAFB), no borders, borderRadius: 12

**Store Info Tab:**
- Store Description (TextArea, multiline)
- Business Address (TextInput)
- City (TextInput)

**Notifications Tab:**
- Toggle switches for:
  - New Orders
  - Order Updates
  - Promotions
  - Customer Reviews
  - Messages
  - Low Stock Alerts
- Each toggle: Label + description + orange switch

**Security Tab:**
- Current Password (secure TextInput)
- New Password (secure TextInput)
- Confirm Password (secure TextInput)
- "Enable 2FA" button (orange border, white background)

**Payments Tab:**
- Bank Name (TextInput)
- Account Number (TextInput)
- Account Name (TextInput)
- GCash Number (TextInput)

**D. Switch to Buyer Mode Button:**
- Airbnb-style account switching
- White card with soft shadow
- Orange icon circle (48px) with User icon
- Title: "Switch to Buyer Mode"
- Subtitle: "Continue shopping as a customer"
- Tappable (currently dummy, ready for future implementation)

**E. Logout Button:**
- Red text on light red background (#FEE2E2)
- LogOut icon + "Logout from Store" text
- Shows confirmation alert before logout
- Navigates to SellerLogin screen

**Key Feature:** Auto-save functionality removed in favor of manual save or real-time updates (future API integration)

### State Management
**File:** `src/stores/sellerStore.ts`

**Store Structure:**
```typescript
{
  seller: {
    storeName: string
    storeDescription: string
    storeLogo: string (emoji)
    email: string
    totalSales: number
    totalProducts: number
    totalOrders: number
    totalCustomers: number
  },
  products: Product[],
  orders: Order[],
  revenue: DailyRevenue[],
  categorySales: CategorySale[]
}
```

**Actions:**
- `toggleProductStatus(id)`: Activate/deactivate product
- `updateOrderStatus(id, status)`: Change order workflow state
- Future: `addProduct()`, `updateProduct()`, `deleteProduct()`

### Design Specifications

**Header Pattern (All Screens):**
```typescript
style={[styles.header, { paddingTop: insets.top + 12 }]}
```
- Background: #FF5722
- Padding horizontal: 16px
- Padding bottom: 16px
- Shadow: elevation 4, opacity 0.1

**Header Layout:**
- Left: Menu icon (24px, white)
- Center: Title (20px, weight 800) + Subtitle (13px, weight 500)
- Right: Bell icon (22px) with red badge (8px circle)

**Card Styling:**
- Background: #FFFFFF
- Border radius: 16-20px
- Shadow: offset (0, 2-4), opacity 0.05-0.08, radius 8-12
- Padding: 16-20px
- No borders (shadows provide depth)

**Input Styling:**
- Background: #F9FAFB (light grey)
- Border radius: 12px
- Padding: 14-16px
- Font size: 15px
- Color: #1F2937 (dark grey)
- No borders

**Button Styling:**
- Primary: #FF5722 background, white text, borderRadius: 12
- Secondary: #FF5722 border, white background, orange text
- Destructive: #EF4444 text, #FEE2E2 background

**Toggle Switches:**
- Track color (false): #E5E7EB (grey)
- Track color (true): #FF5722 (orange)
- Thumb color: #FFFFFF (white)
- iOS background color: #E5E7EB

### Integration Points

**With Buyer Module:**
- "Switch to Buyer Mode" button in Settings
- Future: Unified account with role switching
- Shares authentication state (when implemented)

**With Web Seller Portal:**
- Same data models and business logic
- Consistent order statuses and workflows
- Mock data matches web implementation

**Future API Integration:**
- All Zustand actions ready for async operations
- Add `loading` and `error` states to store
- Implement optimistic updates for better UX
- WebSocket for real-time order notifications

### Testing Guide

**Manual Testing Flow:**
1. Launch app → Tap "Access Seller Portal" on buyer login
2. Enter credentials: seller@bazaarx.ph / seller123
3. Tap "Enter Seller Dashboard"
4. **Dashboard:** Verify stats display, chart renders, recent orders show
5. **Products:** Toggle product status, search products
6. **Orders:** Switch segments, interact with action buttons
7. **Analytics:** Change time range, verify charts update
8. **Settings:** 
   - Navigate through all pill tabs
   - Toggle notification switches
   - Tap "Switch to Buyer Mode" (dummy)
   - Tap "Logout" → Confirm alert → Return to login

**Expected Behavior:**
- All screens load without errors
- Bottom tabs switch smoothly
- Headers are immersive (extend behind status bar)
- Orange branding is consistent
- No green or blue colors present
- TypeScript compiles without errors

### Known Limitations & Future Enhancements

**Current Limitations:**
- No image upload functionality
- Switch to Buyer Mode is placeholder (no navigation)
- Forms don't persist changes to store
- No API integration
- Mock data only

**Planned Enhancements:**
- [ ] Image picker for store logo and product photos
- [ ] Real-time order notifications via WebSocket
- [ ] Barcode scanner for product management
- [ ] Bulk product import/export
- [ ] Advanced analytics (conversion rates, profit margins)
- [ ] Customer messaging integration
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Offline mode with sync
- [ ] Role-based permissions (multi-user stores)

---

**Last Updated:** December 20, 2025
**Mobile Seller Module Version:** 1.0.0 (Complete)
