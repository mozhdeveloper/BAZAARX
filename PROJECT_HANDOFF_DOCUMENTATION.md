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
│   └── ShopScreen.tsx            # Seller storefront
├── src/
│   ├── components/       # Mobile UI components
│   │   ├── AIChatModal.tsx          # AI Assistant with comparison widgets
│   │   ├── CameraSearchModal.tsx    # Visual search
│   │   ├── LocationModal.tsx        # Address selection (NEW)
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
- Implemented across Product Details, Cart, Checkout, and AI Chat screens
- Uses `useSafeAreaInsets` to extend behind status bar
- Consistent layout: Back arrow (left) → Title (center) → Action (right)
- White text and icons on solid orange background
- No borders, uses shadow for depth

**2. Home Screen Enhancements**
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

**3. Shop Screen Fixes**
- Fixed category visibility (removed clipping)
- Updated filter logic to match product data categories
- Categories: electronics, fashion, home-garden, food-beverages, books, beauty-personal-care, music-instruments

**4. Product Details Redesign**
- Orange header with embedded search bar (white pill)
- Floating Share/Heart icons (white circles, orange icons)
- Overlapping white card (borderTopRadius: 30, marginTop: -60)
- Bestseller/Discount badges (purple/red pills)
- Quantity selector with orange borders and Plus/Minus icons
- Bottom actions: "Add to Cart" (outline) + "Buy Now" (solid orange)
- All green colors removed

**5. Cart & Checkout Modernization**
- Edge-to-edge orange header
- Free shipping banners: Soft orange (#FFF5F0) instead of green
- Checkout button: Solid orange pill instead of green gradient
- Floating bottom action bar with rounded corners (borderRadius: 24)
- CartItemRow: White cards, borderRadius: 20, no borders, soft shadows
- QuantityStepper: Orange borders, orange icons, pill-shaped

**6. AI Chat / Assistant Redesign**
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

**7. Location Selection Modal (NEW)**
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

**8. Component Library Updates**
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

### ✅ Completed (Web)
- [x] Seller onboarding workflow
- [x] Admin seller approval system
- [x] Buyer purchase flow
- [x] Three-portal navigation (Buyer/Seller/Admin)
- [x] State management with Zustand
- [x] shadcn/ui component library integration

### 🔄 In Progress
- [ ] Mobile: Seller dashboard screens
- [ ] Mobile: Profile and settings
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
