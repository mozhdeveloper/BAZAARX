# BAZAARX - Complete Project Overview

**Last Updated:** December 16, 2025  
**Project Type:** E-commerce Marketplace Platform  
**Tech Stack:** React (Web) + React Native/Expo (Mobile)  

---

## Table of Contents
1. [Project Summary](#project-summary)
2. [Web Application](#web-application)
3. [Mobile Application](#mobile-application)
4. [Shared Concepts](#shared-concepts)
5. [Completed Features](#completed-features)
6. [Architecture Overview](#architecture-overview)

---

## Project Summary

BAZAARX is a comprehensive e-commerce marketplace platform similar to Lazada/Shopee, featuring:
- **Multi-platform:** Web application (React + Vite + TypeScript) and Mobile app (React Native + Expo SDK 54)
- **User Roles:** Buyers, Sellers, and Admins with separate dashboards
- **Core Features:** Product browsing, cart management, checkout, order tracking, seller storefronts, admin management
- **Design System:** Primary color #FF6A00 (orange), light theme, modern UI with shadcn/ui (web) and NativeWind (mobile)

---

## Web Application

### Technology Stack
- **Framework:** React 18.3.1 + TypeScript 5.6.2
- **Build Tool:** Vite 6.0.1
- **Styling:** TailwindCSS 3.4.17 + shadcn/ui components
- **State Management:** Zustand 5.0.2
- **Routing:** React Router (assumed, based on page structure)
- **UI Libraries:** 
  - Lucide React (icons)
  - Framer Motion (animations)
  - Recharts (admin analytics)
  - React Hook Form + Zod (form validation)

### Directory Structure

```
web/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── AdminSidebar.tsx
│   │   ├── CategoriesFooterStrip.tsx
│   │   ├── CategoryChip.tsx
│   │   ├── CollectionCard.tsx
│   │   ├── FeaturedCollections.tsx
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   ├── HeroSection.tsx
│   │   ├── ProductCard.tsx
│   │   ├── StoreCard.tsx
│   │   ├── TrackingModal.tsx
│   │   ├── hooks/           # Custom React hooks
│   │   │   └── use-mouse-vector.ts
│   │   ├── layout/          # Layout components
│   │   │   └── BazaarFooter.tsx
│   │   ├── sections/        # Page sections
│   │   │   ├── FeatureStrip.tsx
│   │   │   ├── ProductRail.tsx
│   │   │   └── StoreRail.tsx
│   │   └── ui/              # shadcn/ui components (40+ files)
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── badge.tsx
│   │       ├── bazaar-3d-gallery.tsx
│   │       ├── bazaar-hero.tsx
│   │       ├── bazaar-product-gallery-3d.tsx
│   │       ├── category-showcase.tsx
│   │       ├── mobile-app-showcase.tsx
│   │       └── ... (30+ more UI components)
│   │
│   ├── pages/               # Main application pages
│   │   ├── HomePage.tsx
│   │   ├── ShopPage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── EnhancedCartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   ├── OrderConfirmationPage.tsx
│   │   ├── OrdersPage.tsx
│   │   ├── DeliveryTrackingPage.tsx
│   │   ├── ReviewsPage.tsx
│   │   ├── BuyerProfilePage.tsx
│   │   ├── SellerAuth.tsx
│   │   ├── SellerDashboard.tsx
│   │   ├── SellerProducts.tsx
│   │   ├── SellerOrders.tsx
│   │   ├── SellerStorefrontPage.tsx
│   │   ├── AdminAuth.tsx
│   │   ├── AdminDashboard.tsx
│   │   ├── AdminBuyers.tsx
│   │   ├── AdminSellers.tsx
│   │   └── AdminCategories.tsx
│   │
│   ├── stores/              # Zustand state management
│   │   ├── cartStore.ts
│   │   ├── buyerStore.ts
│   │   ├── sellerStore.ts
│   │   └── adminStore.ts
│   │
│   ├── data/                # Static data/mock data
│   │   ├── categories.ts
│   │   ├── collections.ts
│   │   ├── products.ts
│   │   └── stores.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── index.ts
│   │   └── orderSchema.ts
│   │
│   ├── styles/
│   │   └── globals.css
│   │
│   ├── lib/
│   │   └── utils.ts         # Utility functions (cn, etc.)
│   │
│   ├── App.tsx              # Root application component
│   └── main.tsx             # Application entry point
│
├── public/                  # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

### Key Web Components

#### **Components/UI**

1. **Header.tsx**
   - Navigation bar with logo, search, cart icon, user menu
   - Sticky positioning
   - Responsive design

2. **Footer.tsx & BazaarFooter.tsx**
   - Site information, links, social media
   - Newsletter subscription
   - Multiple column layout

3. **HeroSection.tsx & bazaar-hero.tsx**
   - Landing page hero with promotional content
   - Call-to-action buttons
   - Image/video backgrounds

4. **ProductCard.tsx**
   - Product display with image, name, price
   - Hover effects and animations
   - Add to cart quick action
   - Rating display

5. **StoreCard.tsx**
   - Seller storefront preview
   - Store rating, follower count
   - Product count display

6. **CategoryChip.tsx & category-showcase.tsx**
   - Category navigation elements
   - Icon + label display
   - Click to filter products

7. **TrackingModal.tsx**
   - Order tracking interface
   - Delivery status timeline
   - Driver information display

8. **AdminSidebar.tsx**
   - Admin navigation menu
   - Dashboard, Users, Sellers, Categories sections
   - Active state indication

9. **shadcn/ui Components (ui/ folder)**
   - **button.tsx:** Styled button with variants (default, destructive, outline, ghost)
   - **card.tsx:** Card container with header, content, footer sections
   - **dialog.tsx:** Modal dialog component
   - **input.tsx:** Form input field
   - **badge.tsx:** Status/label badges
   - **alert.tsx & alert-dialog.tsx:** Notification and confirmation dialogs
   - **bazaar-3d-gallery.tsx:** 3D product image gallery
   - **bazaar-product-gallery-3d.tsx:** Advanced product showcase
   - **mobile-app-showcase.tsx:** Mobile app preview section
   - **category-explorer.tsx:** Interactive category navigation
   - And 30+ more specialized UI components

#### **Pages**

1. **HomePage.tsx**
   - Hero section
   - Featured categories
   - Product rails (trending, new arrivals)
   - Store highlights
   - Promotional banners

2. **ShopPage.tsx**
   - Product grid with filters
   - Category sidebar
   - Search functionality
   - Sort options (price, rating, popularity)
   - Pagination

3. **ProductDetailPage.tsx**
   - Product images (gallery)
   - Product information (name, price, description)
   - Seller information
   - Add to cart / Buy now buttons
   - Product specifications
   - Reviews section
   - Related products

4. **CartPage.tsx & EnhancedCartPage.tsx**
   - Cart items list with quantity controls
   - Item removal option
   - Subtotal calculation
   - Proceed to checkout button
   - Empty cart state
   - EnhancedCartPage: Improved UI with better layout

5. **CheckoutPage.tsx**
   - Shipping address form
   - Payment method selection
   - Order summary
   - Place order button
   - Form validation

6. **OrderConfirmationPage.tsx**
   - Order success message
   - Order details summary
   - Transaction ID
   - Expected delivery date
   - Continue shopping button

7. **OrdersPage.tsx**
   - User order history
   - Order status filters (All, Pending, Shipped, Delivered)
   - Order cards with status
   - Track order buttons

8. **DeliveryTrackingPage.tsx**
   - Order status timeline
   - Current location (map integration assumed)
   - Driver information
   - Estimated delivery time
   - Contact options

9. **ReviewsPage.tsx**
   - Product reviews and ratings
   - Star rating display
   - Review text
   - User information
   - Review images
   - Write review form

10. **BuyerProfilePage.tsx**
    - User information
    - Order history
    - Saved addresses
    - Payment methods
    - Account settings

11. **SellerAuth.tsx**
    - Seller login/registration
    - Form validation
    - Authentication handling

12. **SellerDashboard.tsx**
    - Sales overview
    - Order statistics
    - Revenue charts (using Recharts)
    - Quick actions
    - Recent orders

13. **SellerProducts.tsx**
    - Seller's product list
    - Add new product button
    - Edit/delete product actions
    - Stock management
    - Product status toggle

14. **SellerOrders.tsx**
    - Orders for seller's products
    - Order status management
    - Order details view
    - Fulfillment tracking

15. **SellerStorefrontPage.tsx**
    - Public seller page
    - Store banner and logo
    - Product grid
    - Store rating and reviews
    - Follow store button

16. **AdminAuth.tsx**
    - Admin login
    - Secure authentication

17. **AdminDashboard.tsx**
    - Platform overview
    - User statistics
    - Sales metrics
    - Charts and graphs
    - System health

18. **AdminBuyers.tsx**
    - User management
    - User list with filters
    - User details view
    - Account status controls

19. **AdminSellers.tsx**
    - Seller management
    - Seller verification
    - Seller approval/rejection
    - Seller performance metrics

20. **AdminCategories.tsx**
    - Category management
    - Add/edit/delete categories
    - Category hierarchy
    - Product count per category

#### **Stores (State Management)**

1. **cartStore.ts**
   - **State:** items (CartItem[]), total
   - **Actions:**
     - `addItem(product)` - Add product to cart
     - `removeItem(productId)` - Remove product from cart
     - `updateQuantity(productId, quantity)` - Update item quantity
     - `clearCart()` - Empty the cart
     - `getTotal()` - Calculate cart total
   - **Persistence:** localStorage (web)

2. **buyerStore.ts**
   - **State:** user info, addresses, orders, wishlist
   - **Actions:** User profile management, address CRUD, wishlist management
   - **Assumed features:** Login/logout, profile updates

3. **sellerStore.ts**
   - **State:** seller info, products, orders, analytics
   - **Actions:** Product CRUD, order management, store settings
   - **Assumed features:** Inventory management, sales tracking

4. **adminStore.ts**
   - **State:** users, sellers, categories, platform metrics
   - **Actions:** User management, seller approval, category CRUD
   - **Assumed features:** Analytics, moderation tools

#### **Data Files**

1. **categories.ts**
   - Category definitions with IDs, names, icons
   - Category hierarchy/parent-child relationships
   - Used for navigation and filtering

2. **collections.ts**
   - Featured collections/promotions
   - Collection metadata (name, description, image)
   - Product associations

3. **products.ts**
   - Mock product data for development
   - Product schema: id, name, price, image, description, category, seller, rating, stock

4. **stores.ts**
   - Mock seller/store data
   - Store schema: id, name, logo, banner, rating, followers, products

### Web Features Completed

✅ **Core Shopping Experience**
- Homepage with hero, categories, product rails
- Product browsing with filters and search
- Product detail pages with image galleries
- Shopping cart with quantity management
- Checkout flow with address and payment
- Order confirmation and order history

✅ **Seller Platform**
- Seller authentication
- Seller dashboard with analytics
- Product management (CRUD)
- Order management
- Storefront customization

✅ **Admin Panel**
- Admin authentication
- Dashboard with platform metrics
- User management (buyers)
- Seller management and verification
- Category management

✅ **UI/UX**
- Responsive design for all screen sizes
- Modern component library (shadcn/ui)
- Smooth animations (Framer Motion)
- Consistent design system (#FF6A00 primary color)
- Accessibility considerations

✅ **Technical**
- TypeScript for type safety
- Zustand for state management
- TailwindCSS for styling
- Vite for fast development
- Component-based architecture

---

## Mobile Application

### Technology Stack
- **Framework:** React Native 0.81.5 + Expo SDK 54
- **Language:** TypeScript 5.9.2
- **Navigation:** 
  - @react-navigation/native 7.0.13
  - @react-navigation/native-stack 7.2.0
  - @react-navigation/bottom-tabs 7.2.0
- **State Management:** Zustand 5.0.2 with persist middleware
- **Storage:** @react-native-async-storage/async-storage 2.1.0
- **Styling:** NativeWind 4.1.23 (TailwindCSS for React Native)
- **UI/Gestures:**
  - react-native-gesture-handler 2.28.0
  - react-native-reanimated 4.1.1
  - react-native-safe-area-context 5.6.0
  - lucide-react-native 0.468.0 (icons)
- **Additional:**
  - expo-camera (for camera search feature)
  - expo-linear-gradient 15.0.8

### Directory Structure

```
mobile-app/
├── app/                     # Application screens
│   ├── App.tsx             # Root navigation setup
│   ├── HomeScreen.tsx
│   ├── ShopScreen.tsx
│   ├── ProductDetailScreen.tsx
│   ├── CartScreen.tsx
│   ├── CheckoutScreen.tsx
│   ├── OrdersScreen.tsx
│   ├── OrderDetailScreen.tsx
│   ├── DeliveryTrackingScreen.tsx
│   └── ProfileScreen.tsx
│
├── components/              # Reusable components
│   ├── ProductCard.tsx
│   ├── BadgePill.tsx
│   ├── QuantityStepper.tsx
│   ├── CartItemRow.tsx
│   ├── OrderCard.tsx
│   ├── CameraSearchModal.tsx
│   └── AIChatModal.tsx
│
├── stores/                  # Zustand stores
│   ├── cartStore.ts
│   └── orderStore.ts
│
├── types/                   # TypeScript types
│   └── index.ts
│
├── assets/                  # Images, fonts, etc.
├── package.json
└── tsconfig.json
```

### Navigation Structure

The mobile app uses a **nested navigation pattern**:

```typescript
RootStackNavigator
├── MainTabs (Tab Navigator)
│   ├── Home
│   ├── Shop
│   ├── Cart
│   ├── Orders
│   └── Profile
├── ProductDetail (Stack Screen)
├── Checkout (Stack Screen)
├── OrderDetail (Stack Screen)
└── DeliveryTracking (Stack Screen)
```

**Tab Navigator Configuration:**
- Height: 70px
- Position: Bottom
- Shadow and elevation for depth
- Active state with orange color (#FF6A00)
- Safe area handling for devices with notches/home indicators

### Key Mobile Components

#### **App.tsx (Root Navigation)**
- **Purpose:** Application entry point and navigation setup
- **Type Definitions:**
  ```typescript
  RootStackParamList {
    MainTabs: NavigatorScreenParams<TabParamList>
    ProductDetail: { productId: string }
    Checkout: undefined
    OrderDetail: { order: Order }
    DeliveryTracking: { order: Order }
  }
  
  TabParamList {
    Home, Shop, Cart, Orders, Profile
  }
  ```
- **Structure:** Stack Navigator wraps Tab Navigator
- **Configuration:** headerShown: false for clean UI

#### **Screens**

1. **HomeScreen.tsx** (387 lines)
   - **Purpose:** Main landing page
   - **Features:**
     - Category horizontal scroll
     - Product grid (2 columns)
     - Camera search button (top right) → opens CameraSearchModal
     - AI Chat button (bottom right floating) → opens AIChatModal
     - Pull to refresh
     - ScrollView with safe area insets
   - **Data:** Uses dummy products array
   - **Navigation:** Product cards link to ProductDetail screen

2. **ShopScreen.tsx** (~300 lines)
   - **Purpose:** Product browsing with search and filters
   - **Features:**
     - Search bar at top
     - Category filter chips
     - Sort options (price, popularity, rating)
     - Product grid (2 columns)
     - Pull to refresh
   - **State:** Search query, selected category, sort option
   - **Navigation:** Products link to ProductDetail

3. **ProductDetailScreen.tsx** (411 lines)
   - **Purpose:** Detailed product view
   - **Features:**
     - Product image with pinch-to-zoom
     - Product name, price, seller info
     - Tabs: Description, Specifications, Reviews
     - Seller badge (verified status)
     - Quantity selector
     - Bottom action bar with 2 buttons:
       - "Add to Cart" (white button)
       - "Buy Now" (orange button)
   - **Bottom Bar Position:** 60px from bottom (above tab bar)
   - **ScrollView Padding:** 140px bottom clearance
   - **Buy Now Flow:** addItem → navigate to Cart tab

4. **CartScreen.tsx** (292 lines)
   - **Purpose:** Shopping cart management
   - **Features:**
     - Cart item list with CartItemRow components
     - Quantity stepper for each item
     - Remove item button
     - Subtotal calculation
     - Free shipping badge (when total > ₱500)
     - Bottom checkout button (orange)
   - **Empty State:** "Your cart is empty" message
   - **Bottom Bar Position:** Dynamic with useSafeAreaInsets (insets.bottom + 60)
   - **ScrollView Padding:** 180 + insets.bottom
   - **Navigation:** Checkout button → Checkout screen

5. **CheckoutScreen.tsx** (405 lines)
   - **Purpose:** Order placement with address and payment
   - **Features:**
     - Shipping address form (9 fields):
       - Full Name, Email, Phone Number
       - Complete Address, City, Region, Postal Code
     - Payment method selection:
       - Cash on Delivery (COD)
       - GCash
       - Credit/Debit Card
     - Order summary section
     - Place order button (orange)
   - **Validation:** 
     - All fields required
     - Empty cart check before order creation
   - **Error Handling:** Try-catch with user-friendly alerts
   - **Flow:** 
     1. Validate form fields
     2. Check cart not empty
     3. Create order via orderStore
     4. Clear cart
     5. Show success alert
     6. Navigate to Orders tab
   - **Bottom Bar:** Fixed at bottom with safe area

6. **OrdersScreen.tsx** (150 lines)
   - **Purpose:** View order history
   - **Features:**
     - Tab switching: "In Progress" vs "Completed"
     - Order list with OrderCard components
     - Order cards clickable → navigate to OrderDetail
     - Empty states for each tab
     - Pull to refresh
   - **Data Source:**
     - Active orders: orderStore.getActiveOrders() (status !== 'delivered')
     - Completed orders: orderStore.getCompletedOrders() (status === 'delivered')
   - **OrderCard Actions:**
     - In Progress: Shows "Track Order" button (green)
     - Completed: Shows "View Receipt" button (orange)

7. **OrderDetailScreen.tsx** (480 lines) ⭐ NEW
   - **Purpose:** Complete order information with actions
   - **Features:**
     - **Status Card:** Colored badge (pending/processing/shipped/delivered), transaction ID, order date, delivery date
     - **Order Items Section:** List of products with quantities and prices
     - **Shipping Address:** Full delivery address display
     - **Payment Method:** Shows selected payment (COD/GCash/Card)
     - **Receipt Card:** 
       - Subtotal
       - Shipping Fee (₱50)
       - **Total (highlighted in orange)**
     - **Bottom Action Bar (conditional):**
       - Shows "Mark as Received" button (green, CheckCircle icon) for non-delivered orders
       - Hidden for already delivered orders
     - **Review Modal:**
       - 5-star rating (tap to select)
       - Multi-line text input for review
       - Skip button (gray)
       - Submit button (orange)
       - Slide-up animation
       - Semi-transparent overlay
   - **Actions:**
     - `handleMarkAsReceived()`: Shows confirmation alert → updateOrderStatus → opens review modal
     - `handleSubmitReview()`: Shows success alert → closes modal → navigates back
   - **ScrollView Padding:** 
     - 140px for active orders (to clear action bar)
     - 20px for completed orders
   - **Design:** Card-based layout with shadows, 16px border radius, proper spacing

8. **DeliveryTrackingScreen.tsx** (~350 lines)
   - **Purpose:** Real-time order tracking
   - **Features:**
     - Order status timeline with checkpoints
     - Map view (placeholder or map integration)
     - Driver information card
     - Estimated delivery time
     - Contact driver button
     - Live location updates (simulated)
   - **Status Timeline:**
     - Order Placed ✓
     - Processing ✓
     - Shipped ✓
     - Out for Delivery
     - Delivered
   - **Driver Card:** Photo, name, rating, vehicle info, contact button

9. **ProfileScreen.tsx** (~200 lines)
   - **Purpose:** User account settings
   - **Features:**
     - User avatar and name
     - Account information
     - Saved addresses
     - Payment methods
     - Settings options
     - Logout button
   - **Sections:** Profile, Addresses, Payments, Notifications, Help, About

#### **Components**

1. **ProductCard.tsx** (180 lines)
   - **Purpose:** Product display card
   - **Design:** Lazada/Shopee style
   - **Features:**
     - Product image
     - Product name (2 lines max, ellipsis)
     - Price (large, bold, orange)
     - Seller rating (star icon + number)
     - Verification badge (if verified)
     - Sold count badge
     - Pressable with onPress callback
   - **Badges:** 
     - Verified badge (blue checkmark)
     - Seller badge (gold star + rating)
     - Items sold badge (gray)
   - **Styling:** White card, shadow, 16px border radius, 8px padding

2. **BadgePill.tsx** (95 lines)
   - **Purpose:** Reusable badge component
   - **Variants:**
     - `verified`: Blue background, white checkmark icon
     - `seller`: Gold background, white star icon
     - `item`: Gray background, package icon
     - `success`: Green background, checkmark icon
   - **Props:** variant, text, icon (optional)
   - **Usage:** Product cards, order status, seller verification

3. **QuantityStepper.tsx** (110 lines)
   - **Purpose:** Quantity selection control
   - **Features:**
     - Minus button (-)
     - Quantity display (center)
     - Plus button (+)
     - Min/max constraints (min: 1, max: 99)
     - Disabled state for limits
   - **Styling:** Rounded buttons, gray borders, orange when active
   - **Props:** quantity, onQuantityChange, min, max

4. **CartItemRow.tsx** (165 lines)
   - **Purpose:** Cart item display
   - **Features:**
     - Product thumbnail (left)
     - Product name and price
     - QuantityStepper integration
     - Remove button (trash icon)
     - Subtotal calculation (price × quantity)
   - **Layout:** Horizontal with flex
   - **Styling:** White background, border bottom, padding
   - **Actions:** onQuantityChange, onRemove callbacks

5. **OrderCard.tsx** (195 lines)
   - **Purpose:** Order summary card
   - **Features:**
     - Order ID (truncated)
     - Order date
     - Total amount (large, bold)
     - Status badge (colored by status)
     - First product thumbnail + count
     - Conditional footer button:
       - **Delivered:** "View Receipt" (orange)
       - **Active:** "Track Order" (green)
   - **Safety:** Checks items array exists and not empty
   - **Image Fallback:** Placeholder if image URL missing
   - **Pressable:** Card click → navigate to OrderDetail
   - **Footer Button Click:** 
     - View Receipt: navigate to OrderDetail
     - Track Order: navigate to DeliveryTracking

6. **CameraSearchModal.tsx** (290 lines)
   - **Purpose:** Camera-based product search
   - **Features:**
     - Camera view with expo-camera
     - Capture button (center bottom)
     - Close button (top right)
     - Loading state during "search"
     - Product results display (dummy data)
     - Product cards clickable → ProductDetail
   - **Simulation:** Takes photo → shows loading (1.5s) → displays matching products
   - **Permissions:** Requests camera permission on mount
   - **Modal:** Full screen, animated slide-up

7. **AIChatModal.tsx** (320 lines)
   - **Purpose:** AI assistant chat interface
   - **Features:**
     - Message list (scrollable)
     - Text input at bottom
     - Send button
     - Dummy AI responses
     - Message bubbles (user: right/orange, AI: left/gray)
     - Typing indicator during AI "thinking"
   - **Responses:** Pre-defined responses to common queries
     - "What's on sale?" → Lists promotions
     - "Track my order" → Asks for order ID
     - "Help" → Lists available commands
     - Default: "I'm here to help..."
   - **Modal:** Full screen, animated slide-up
   - **Auto-scroll:** ScrollView scrolls to bottom on new messages

#### **Stores (State Management)**

1. **cartStore.ts** (142 lines)
   - **Purpose:** Shopping cart state management
   - **State:**
     ```typescript
     interface CartState {
       items: CartItem[]
     }
     ```
   - **Actions:**
     - `addItem(product: Product)` 
       - If item exists: increment quantity
       - If new: add with quantity 1
       - Shows success alert
     - `removeItem(productId: string)`
       - Filters out item by ID
     - `updateQuantity(productId: string, quantity: number)`
       - Updates quantity, removes if quantity = 0
     - `clearCart()`
       - Empties items array
     - `getTotal()`
       - Returns sum of (item.price × item.quantity)
   - **Persistence:** AsyncStorage with Zustand persist middleware
   - **Storage Key:** 'cart-storage'

2. **orderStore.ts** (182 lines)
   - **Purpose:** Order management
   - **State:**
     ```typescript
     interface OrderState {
       orders: Order[]
     }
     ```
   - **Actions:**
     - `createOrder(orderData)`
       - Validates: items array exists and not empty
       - Validates: all items have required properties (id, name, price, image)
       - Generates unique transaction ID (TXN + timestamp)
       - Sets initial status: 'pending'
       - Adds to orders array
       - Returns order ID or throws error
     - `updateOrderStatus(orderId: string, status: OrderStatus)`
       - Finds order by ID
       - Updates status
       - If status = 'delivered': sets deliveryDate to current date
     - `getActiveOrders()`
       - Returns orders where status !== 'delivered'
     - `getCompletedOrders()`
       - Returns orders where status === 'delivered'
   - **Dummy Data:** 2 pre-loaded orders for testing
   - **Persistence:** AsyncStorage
   - **Storage Key:** 'order-storage'

#### **Types (types/index.ts)**

```typescript
// Product with extended fields for mobile
interface Product {
  id: string
  name: string
  price: number
  image: string
  description: string
  category: string
  seller: string
  rating: number
  stock: number
  sellerRating?: number
  sellerVerified?: boolean
  isVerified?: boolean
  sold?: number
}

// Cart item extends Product
interface CartItem extends Product {
  quantity: number
}

// Shipping address
interface ShippingAddress {
  name: string
  email: string
  phone: string
  address: string
  city: string
  region: string
  postalCode: string
}

// Order
interface Order {
  id: string
  items: CartItem[]
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered'
  transactionId: string
  createdAt: string
  deliveryDate?: string
  shippingAddress: ShippingAddress
  paymentMethod: 'cod' | 'gcash' | 'card'
}
```

### Mobile App Design System

**Colors:**
- Primary: #FF6A00 (Orange) - buttons, active states, highlights
- Success: #22C55E (Green) - confirmations, track order buttons
- Background: #FFFFFF (White)
- Card Background: #FFFFFF with shadows
- Text Primary: #000000
- Text Secondary: #6B7280
- Border: #E5E7EB

**Typography:**
- Headings: 18-24px, bold/semibold
- Body: 14-16px, regular
- Captions: 12px, regular
- Prices: 18-20px, bold, orange

**Spacing:**
- Card padding: 16px
- Section margins: 16px
- Button padding: 16px vertical, 24px horizontal
- Input padding: 12px

**Borders:**
- Border radius: 16px (cards), 10px (buttons), 8px (inputs)
- Border width: 1px
- Shadow: elevation 4 (Android), shadowOpacity 0.1 (iOS)

**Safe Areas:**
- Uses `useSafeAreaInsets()` hook throughout
- Bottom tab bar positioned at `insets.bottom + 60`
- ScrollView padding: content + 140-180px for bottom button clearance

### Mobile Features Completed

✅ **Core Shopping Experience**
- Bottom tab navigation (Home, Shop, Cart, Orders, Profile)
- Product browsing with categories
- Product search and filters
- Product detail with image zoom
- Add to cart functionality
- Shopping cart with quantity controls
- Checkout with address and payment forms
- Order confirmation

✅ **Order Management** ⭐ NEW
- Order history (In Progress / Completed tabs)
- Order detail screen with complete information
- Receipt display (subtotal, shipping, total)
- Mark as Received functionality
- Rating & Review system (5 stars + text)
- Conditional UI (Track Order vs View Receipt based on status)
- Order status transitions (pending → delivered)

✅ **Delivery Tracking**
- Real-time order tracking screen
- Status timeline
- Driver information
- Estimated delivery time

✅ **Enhanced Features**
- Camera search modal (product search by photo)
- AI chat modal (customer support assistant)
- Pull to refresh on all list screens
- Empty states for cart and orders

✅ **UI/UX**
- Light theme with orange branding
- Responsive design for all mobile devices
- Safe area handling (notches, home indicators)
- Smooth animations and transitions
- Bottom buttons positioned above tab bar
- Proper scrolling with content padding
- Loading states and error handling
- Success/error alerts

✅ **Technical**
- TypeScript for type safety
- Zustand for state management
- AsyncStorage for data persistence
- React Navigation 7.x (latest stable)
- NativeWind for styling
- Expo SDK 54 (latest)
- Compatible with Android, iOS, and Expo Go
- No TypeScript errors
- Proper error handling throughout

---

## Shared Concepts

### User Roles

1. **Buyer**
   - Browse products
   - Search and filter
   - Add to cart
   - Checkout and payment
   - Track orders
   - Write reviews
   - Manage profile

2. **Seller**
   - Create storefront
   - Add/edit products
   - Manage inventory
   - Process orders
   - View analytics
   - Respond to reviews

3. **Admin**
   - Platform oversight
   - User management
   - Seller verification
   - Category management
   - Analytics dashboard
   - Content moderation

### Data Models (Shared Structure)

**Product:**
- id, name, price, description
- category, seller
- image(s), rating, stock
- Additional mobile: sellerRating, sellerVerified, sold count

**Order:**
- id, items[], total, status
- transactionId, timestamps
- shippingAddress, paymentMethod
- Mobile adds: deliveryDate for tracking

**User (Buyer):**
- id, name, email, phone
- addresses[], paymentMethods[]
- orderHistory[], wishlist[]

**Seller/Store:**
- id, name, logo, banner
- description, rating, followers
- products[], analytics

**Category:**
- id, name, icon, description
- parent (for hierarchy)
- productCount

### Order Status Flow

Both platforms follow same order lifecycle:

```
pending → processing → shipped → delivered
```

**Status Descriptions:**
- **pending:** Order placed, awaiting confirmation
- **processing:** Order confirmed, being prepared
- **shipped:** Order dispatched, in transit
- **delivered:** Order received by customer

### Payment Methods

Both platforms support:
- Cash on Delivery (COD)
- GCash (e-wallet)
- Credit/Debit Card

### Design Consistency

**Primary Color:** #FF6A00 (Orange)
- Used for: CTAs, highlights, active states, prices

**Typography Scale:**
- H1: 24-32px
- H2: 20-24px  
- H3: 18-20px
- Body: 14-16px
- Caption: 12px

**Spacing System:**
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

---

## Completed Features

### Web Application ✅
- [x] Responsive homepage with hero and product rails
- [x] Product catalog with search, filters, sort
- [x] Product detail pages with image galleries
- [x] Shopping cart with quantity management
- [x] Checkout flow with address and payment
- [x] Order confirmation and history
- [x] Delivery tracking interface
- [x] Product reviews and ratings
- [x] User profile management
- [x] Seller authentication
- [x] Seller dashboard with analytics
- [x] Seller product management (CRUD)
- [x] Seller order management
- [x] Seller storefront pages
- [x] Admin authentication
- [x] Admin dashboard with metrics
- [x] Admin user management
- [x] Admin seller management and verification
- [x] Admin category management
- [x] Component library (40+ shadcn/ui components)
- [x] State management with Zustand
- [x] TypeScript type safety
- [x] Modern UI with animations

### Mobile Application ✅
- [x] Bottom tab navigation (5 tabs)
- [x] Home screen with categories and products
- [x] Shop screen with search and filters
- [x] Product detail with image zoom
- [x] Shopping cart with quantity controls
- [x] Checkout with address and payment forms
- [x] Order history with status filters
- [x] **Order detail screen with receipt** ⭐ NEW
- [x] **Mark as Received functionality** ⭐ NEW
- [x] **Rating & Review system** ⭐ NEW
- [x] **Conditional order actions (Track/View Receipt)** ⭐ NEW
- [x] Delivery tracking screen
- [x] Profile screen
- [x] Camera search modal
- [x] AI chat modal
- [x] State persistence with AsyncStorage
- [x] Safe area handling for all devices
- [x] Responsive design for Android and iOS
- [x] Light theme with orange branding
- [x] Expo SDK 54 compatibility
- [x] TypeScript type safety
- [x] Error handling and validation
- [x] Loading states and alerts

---

## Architecture Overview

### Web Architecture

```
User Interface (React Components)
         ↓
   State Management (Zustand)
         ↓
   Business Logic (Store Actions)
         ↓
   Data Layer (localStorage / API calls)
```

**Key Patterns:**
- Component composition with shadcn/ui
- Centralized state with Zustand stores
- TypeScript for compile-time safety
- TailwindCSS for utility-first styling
- Vite for fast development and optimized builds

### Mobile Architecture

```
Navigation Layer (React Navigation)
         ↓
Screen Components (App folder)
         ↓
Reusable Components (Components folder)
         ↓
State Management (Zustand)
         ↓
Persistence Layer (AsyncStorage)
```

**Key Patterns:**
- Nested navigation (Stack in Tabs)
- Screen-level and component-level organization
- Shared state with Zustand + persist
- NativeWind for React Native styling
- Safe area context for device compatibility
- Type-safe navigation with TypeScript

### State Management Strategy

Both platforms use **Zustand** for state management:

**Advantages:**
- Minimal boilerplate
- No Provider wrapper needed
- Easy to integrate persistence
- TypeScript-friendly
- Small bundle size

**Store Organization:**
- **cartStore:** Shopping cart state (shared logic between web/mobile)
- **orderStore:** Order management (mobile specific)
- **buyerStore:** User profile (web specific)
- **sellerStore:** Seller dashboard (web specific)
- **adminStore:** Admin panel (web specific)

### Future Enhancements

**Web:**
- [ ] Real-time notifications
- [ ] Advanced search with AI
- [ ] Wishlist functionality
- [ ] Product comparison
- [ ] Live chat support
- [ ] Social media integration
- [ ] Payment gateway integration
- [ ] Email notifications
- [ ] SEO optimization
- [ ] Analytics dashboard enhancement

**Mobile:**
- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Offline mode
- [ ] Wishlist sync
- [ ] Social sharing
- [ ] Live order tracking with maps
- [ ] In-app payment processing
- [ ] Review photo uploads
- [ ] Receipt PDF download
- [ ] Email receipt functionality

**Backend (Not Yet Implemented):**
- [ ] REST API or GraphQL
- [ ] Database (MongoDB/PostgreSQL)
- [ ] Authentication (JWT/OAuth)
- [ ] File storage (AWS S3/Cloudinary)
- [ ] Payment gateway integration
- [ ] Email service
- [ ] Real-time WebSockets
- [ ] Search engine (Elasticsearch)
- [ ] Caching layer (Redis)

---

## Development Status

**Current Phase:** Core Features Complete ✅

**Web Application:** Production-ready UI with full feature set. Backend integration pending.

**Mobile Application:** Production-ready with complete buyer flow including advanced order management features (receipt viewing, ratings, reviews). Backend integration pending.

**Next Steps:**
1. Backend API development
2. Real payment gateway integration  
3. Real-time tracking with maps
4. Push notification system
5. Image upload for products and reviews
6. Advanced search with filters
7. Social features (follow sellers, share products)
8. Analytics and reporting
9. Performance optimization
10. Production deployment

---

## File Purpose Summary

### Web Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `web/src/App.tsx` | ~150 | Root component, routing setup |
| `web/src/pages/HomePage.tsx` | ~200 | Landing page with hero and products |
| `web/src/pages/ShopPage.tsx` | ~300 | Product catalog with filters |
| `web/src/pages/ProductDetailPage.tsx` | ~400 | Product details and purchase options |
| `web/src/pages/CartPage.tsx` | ~250 | Shopping cart management |
| `web/src/pages/CheckoutPage.tsx` | ~350 | Checkout form and order placement |
| `web/src/pages/OrdersPage.tsx` | ~200 | Order history display |
| `web/src/pages/SellerDashboard.tsx` | ~400 | Seller analytics and overview |
| `web/src/pages/AdminDashboard.tsx` | ~350 | Admin platform metrics |
| `web/src/stores/cartStore.ts` | ~100 | Shopping cart state |
| `web/src/stores/sellerStore.ts` | ~150 | Seller data state |
| `web/src/stores/adminStore.ts` | ~150 | Admin data state |
| `web/src/components/Header.tsx` | ~150 | Navigation header |
| `web/src/components/ProductCard.tsx` | ~100 | Product display card |
| `web/src/components/AdminSidebar.tsx` | ~120 | Admin navigation sidebar |

### Mobile Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `mobile-app/app/App.tsx` | 135 | Root navigation configuration |
| `mobile-app/app/HomeScreen.tsx` | 387 | Landing page with camera/AI features |
| `mobile-app/app/ShopScreen.tsx` | ~300 | Product browsing with search |
| `mobile-app/app/ProductDetailScreen.tsx` | 411 | Product details with purchase |
| `mobile-app/app/CartScreen.tsx` | 292 | Shopping cart with checkout |
| `mobile-app/app/CheckoutScreen.tsx` | 405 | Address and payment form |
| `mobile-app/app/OrdersScreen.tsx` | 150 | Order history tabs |
| `mobile-app/app/OrderDetailScreen.tsx` | 480 | Order details with receipt and review |
| `mobile-app/app/DeliveryTrackingScreen.tsx` | ~350 | Real-time order tracking |
| `mobile-app/stores/cartStore.ts` | 142 | Shopping cart with AsyncStorage |
| `mobile-app/stores/orderStore.ts` | 182 | Order management with persistence |
| `mobile-app/components/ProductCard.tsx` | 180 | Product card with badges |
| `mobile-app/components/OrderCard.tsx` | 195 | Order summary card |
| `mobile-app/components/CameraSearchModal.tsx` | 290 | Camera-based product search |
| `mobile-app/components/AIChatModal.tsx` | 320 | AI assistant chat interface |

---

## Dependencies

### Web Dependencies (package.json)
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "typescript": "~5.6.2",
  "vite": "^6.0.1",
  "tailwindcss": "^3.4.17",
  "zustand": "^5.0.2",
  "lucide-react": "latest",
  "framer-motion": "latest",
  "@radix-ui/*": "latest",
  "recharts": "latest"
}
```

### Mobile Dependencies (package.json)
```json
{
  "react": "18.3.1",
  "react-native": "0.81.5",
  "expo": "~54.0.0",
  "typescript": "^5.9.2",
  "@react-navigation/native": "^7.0.13",
  "@react-navigation/native-stack": "^7.2.0",
  "@react-navigation/bottom-tabs": "^7.2.0",
  "zustand": "^5.0.2",
  "nativewind": "^4.1.23",
  "react-native-gesture-handler": "~2.28.0",
  "react-native-reanimated": "~4.1.1",
  "react-native-safe-area-context": "^5.6.0",
  "lucide-react-native": "^0.468.0",
  "@react-native-async-storage/async-storage": "^2.1.0",
  "expo-camera": "latest",
  "expo-linear-gradient": "~15.0.8"
}
```

---

## Notes for Next AI

1. **Both platforms share similar business logic** but are independent codebases. Changes to one don't automatically apply to the other.

2. **Mobile app uses AsyncStorage** for persistence, while web uses localStorage. Both use Zustand's persist middleware.

3. **Navigation is different:** Web uses React Router (assumed), Mobile uses React Navigation 7.x with nested navigators.

4. **Mobile has extra features:** Camera search and AI chat modals not present in web version.

5. **Order management is more advanced in mobile** with receipt viewing, mark as received, and rating/review system fully implemented.

6. **No backend yet:** All data is mock/dummy data. Order creation works locally but doesn't persist across sessions beyond AsyncStorage (mobile) or localStorage (web).

7. **TypeScript is enforced:** Both projects have strict type checking. All components and functions are properly typed.

8. **Design system is consistent:** #FF6A00 orange primary color across both platforms.

9. **Mobile safe area handling:** Uses `useSafeAreaInsets()` throughout for device compatibility. Bottom buttons positioned at `insets.bottom + 60` to clear tab bar.

10. **Error handling:** Mobile app has comprehensive validation in orderStore and CheckoutScreen to prevent crashes from empty data.

11. **Recent mobile enhancements (Dec 16, 2025):**
    - Created OrderDetailScreen with 6 major sections
    - Implemented Mark as Received with confirmation flow
    - Added 5-star rating and review modal
    - Enhanced OrderCard with conditional buttons (Track Order vs View Receipt)
    - All order management features documented in ORDER_MANAGEMENT_FEATURES.md

12. **Testing approach:** Mobile app includes 2 dummy orders in orderStore for testing complete flow without backend.

---

**END OF DOCUMENTATION**

This document provides complete context for continuing development on either the web or mobile application. Both platforms are feature-complete for their core buyer flows and ready for backend integration.
