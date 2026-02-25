# 🏪 BazaarPH - Complete Project Documentation

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Directory Structure](#directory-structure)
4. [Web Application](#web-application)
5. [Mobile Application](#mobile-application)
6. [State Management](#state-management)
7. [User Flows](#user-flows)
8. [API & Data Flow](#api--data-flow)
9. [Feature Matrix](#feature-matrix)

---

## 🎯 Project Overview

**BazaarPH** is a full-stack e-commerce marketplace platform consisting of:

- **Web Application** (`/web`): React + TypeScript + Vite + Tailwind CSS
- **Mobile Application** (`/mobile-app`): React Native + Expo + TypeScript

### User Roles

| Role | Description | Platforms |
|------|-------------|-----------|
| **Buyer** | Browse, purchase products, track orders | Web + Mobile |
| **Seller** | Manage store, products, orders, POS | Web + Mobile |
| **Admin** | Manage platform, approve sellers/products | Web Only |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BAZAARPH ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   WEB CLIENT    │     │  MOBILE CLIENT  │     │   ADMIN PANEL   │       │
│  │   (React/Vite)  │     │ (React Native)  │     │     (React)     │       │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘       │
│           │                       │                       │                 │
│           └───────────────────────┴───────────────────────┘                 │
│                                   │                                         │
│                      ┌────────────▼────────────┐                           │
│                      │     ZUSTAND STORES      │                           │
│                      │  (Client-side State)    │                           │
│                      │  • sellerStore          │                           │
│                      │  • cartStore            │                           │
│                      │  • orderStore           │                           │
│                      │  • adminStore           │                           │
│                      └────────────┬────────────┘                           │
│                                   │                                         │
│                      ┌────────────▼────────────┐                           │
│                      │   LOCAL STORAGE /       │                           │
│                      │   ASYNC STORAGE         │                           │
│                      │   (Persistence Layer)   │                           │
│                      └─────────────────────────┘                           │
│                                                                             │
│  NOTE: Currently using mock data with Zustand persistence.                 │
│  Backend API integration pending.                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Directory Structure

### Root Structure

```
BAZAARX/
├── web/                    # Web application (React + Vite)
├── mobile-app/             # Mobile application (React Native + Expo)
├── src/                    # Shared source (if any)
├── *.md                    # Documentation files
├── package.json            # Root package configuration
└── .gitignore              # Git ignore rules
```

### Web Application (`/web`)

```
web/
├── public/                 # Static assets
│   └── Logo.png           # BazaarPH logo
├── src/
│   ├── App.tsx            # Main app with routes
│   ├── main.tsx           # Entry point
│   ├── components/        # Reusable components
│   │   ├── ui/            # Shadcn UI components
│   │   ├── layout/        # Layout components
│   │   ├── sections/      # Page sections
│   │   ├── Header.tsx     # Main header
│   │   ├── Footer.tsx     # Main footer
│   │   ├── ProductCard.tsx
│   │   ├── AdminSidebar.tsx
│   │   └── ...
│   ├── pages/             # Page components
│   │   ├── HomePage.tsx
│   │   ├── ShopPage.tsx
│   │   ├── Seller*.tsx    # Seller pages
│   │   └── Admin*.tsx     # Admin pages
│   ├── stores/            # Zustand state management
│   │   ├── sellerStore.ts
│   │   ├── cartStore.ts
│   │   ├── adminStore.ts
│   │   └── productQAStore.ts
│   ├── data/              # Mock data
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utility functions
│   ├── types/             # TypeScript types
│   ├── styles/            # Global styles
│   └── tests/             # Vitest tests
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

### Mobile Application (`/mobile-app`)

```
mobile-app/
├── app/                    # Screen components
│   ├── HomeScreen.tsx
│   ├── ShopScreen.tsx
│   ├── CartScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── seller/            # Seller module
│   │   ├── login.tsx
│   │   ├── SellerTabs.tsx
│   │   └── (tabs)/        # Seller tab screens
│   │       ├── dashboard.tsx
│   │       ├── products.tsx
│   │       ├── orders.tsx
│   │       ├── analytics.tsx
│   │       └── settings.tsx
│   └── ...
├── src/
│   ├── components/        # Reusable components
│   ├── stores/            # Zustand stores
│   ├── data/              # Mock data
│   └── types/             # TypeScript types
├── assets/                # Images, fonts
├── App.tsx               # Navigation setup
├── app.json              # Expo config
├── package.json
└── tsconfig.json
```

---

## 🌐 Web Application

### Buyer Pages

| Page | Route | Description |
|------|-------|-------------|
| **HomePage** | `/` | Landing page with hero, featured products, categories |
| **ShopPage** | `/shop` | Product browsing with filters and search |
| **SearchPage** | `/search` | Advanced search with filters |
| **ProductDetailPage** | `/product/:id` | Single product view with details |
| **CollectionsPage** | `/collections` | Curated product collections |
| **StoresPage** | `/stores` | List of all seller stores |
| **EnhancedCartPage** | `/enhanced-cart` | Shopping cart with enhanced UI |
| **CheckoutPage** | `/checkout` | Checkout flow with address/payment |
| **OrderConfirmationPage** | `/order-confirmation/:orderId` | Order success page |
| **OrdersPage** | `/orders` | Buyer's order history |
| **OrderDetailPage** | `/order/:orderId` | Single order details |
| **DeliveryTrackingPage** | `/delivery-tracking/:orderId` | Real-time delivery tracking |
| **BuyerProfilePage** | `/profile` | Buyer profile management |
| **SellerStorefrontPage** | `/seller/:sellerId` | Individual seller store view |
| **ReviewsPage** | `/reviews` | Product reviews page |

### Seller Pages

| Page | Route | Description |
|------|-------|-------------|
| **SellerAuthChoice** | `/seller/auth` | Choose login or register |
| **SellerLogin** | `/seller/login` | Seller login page |
| **SellerRegister** | `/seller/register` | Seller registration form |
| **SellerOnboarding** | `/seller/onboarding` | Multi-step seller setup |
| **SellerPendingApproval** | `/seller/pending-approval` | Awaiting admin approval |
| **SellerDashboard** | `/seller` | Main dashboard with stats |
| **SellerStoreProfile** | `/seller/profile` | Store profile management |
| **SellerProducts** | `/seller/products` | Product management CRUD |
| **SellerProductStatus** | `/seller/product-status-qa` | Product QA status tracking |
| **SellerOrders** | `/seller/orders` | Order management |
| **SellerPOS** | `/seller/pos` | Point-of-Sale system (POS Lite) |
| **SellerEarnings** | `/seller/earnings` | Revenue and earnings tracking |
| **SellerFlashSales** | `/seller/flash-sales` | Flash sale management |
| **SellerMessages** | `/seller/messages` | Customer messaging |
| **SellerReviews** | `/seller/reviews` | Review management |
| **SellerAnalytics** | `/seller/analytics` | Sales analytics and insights |
| **SellerSettings** | `/seller/settings` | Account settings |

### Admin Pages

| Page | Route | Description |
|------|-------|-------------|
| **AdminAuth** | `/admin/login` | Admin login |
| **AdminDashboard** | `/admin` | Main admin dashboard |
| **AdminCategories** | `/admin/categories` | Category management |
| **AdminSellers** | `/admin/sellers` | Seller management & approval |
| **AdminBuyers** | `/admin/buyers` | Buyer management |
| **AdminOrders** | `/admin/orders` | All orders overview |
| **AdminProducts** | `/admin/products` | Product management |
| **AdminProductApprovals** | `/admin/product-approvals` | Product QA approval queue |
| **AdminProductRequests** | `/admin/product-requests` | New product requests |
| **AdminVouchers** | `/admin/vouchers` | Voucher/coupon management |
| **AdminFlashSales** | `/admin/flash-sales` | Platform flash sales |
| **AdminReviewModeration** | `/admin/reviews` | Review moderation |
| **AdminPayouts** | `/admin/payouts` | Seller payout management |
| **AdminAnalytics** | `/admin/analytics` | Platform analytics |
| **AdminSettings** | `/admin/settings` | Platform settings |
| **AdminProfile** | `/admin/profile` | Admin profile |

---

## 📱 Mobile Application

### Buyer Screens

| Screen | Navigation | Description |
|--------|------------|-------------|
| **SplashScreen** | `Splash` | App loading screen |
| **OnboardingScreen** | `Onboarding` | First-time user onboarding |
| **LoginScreen** | `Login` | User authentication |
| **HomeScreen** | `MainTabs > Home` | Featured products, categories |
| **ShopScreen** | `MainTabs > Shop` | Product browsing |
| **CartScreen** | `MainTabs > Cart` | Shopping cart |
| **OrdersScreen** | `MainTabs > Orders` | Order tracking |
| **ProfileScreen** | `MainTabs > Profile` | User profile |
| **ProductDetailScreen** | `ProductDetail` | Product details |
| **CheckoutScreen** | `Checkout` | Checkout flow |
| **PaymentGatewayScreen** | `PaymentGateway` | Payment processing |
| **OrderConfirmationScreen** | `OrderConfirmation` | Order success |
| **OrderDetailScreen** | `OrderDetail` | Order details |
| **DeliveryTrackingScreen** | `DeliveryTracking` | Real-time tracking |
| **FollowingShopsScreen** | `FollowingShops` | Followed sellers |
| **AddressesScreen** | `Addresses` | Address management |
| **SettingsScreen** | `Settings` | App settings |
| **NotificationsScreen** | `Notifications` | Push notifications |
| **PaymentMethodsScreen** | `PaymentMethods` | Saved payment methods |
| **HelpSupportScreen** | `HelpSupport` | Help & FAQ |
| **PrivacyPolicyScreen** | `PrivacyPolicy` | Privacy policy |

### Seller Screens (Mobile)

| Screen | Navigation | Description |
|--------|------------|-------------|
| **SellerLoginScreen** | `SellerLogin` | Seller authentication |
| **SellerDashboardScreen** | `SellerTabs > Dashboard` | Sales overview |
| **SellerProductsScreen** | `SellerTabs > Products` | Product management |
| **SellerOrdersScreen** | `SellerTabs > Orders` | Order management |
| **SellerAnalyticsScreen** | `SellerTabs > Analytics` | Sales analytics |
| **SellerSettingsScreen** | `SellerTabs > Settings` | Account settings |

---

## 🗄️ State Management

### Zustand Stores

#### Web Stores (`/web/src/stores/`)

| Store | Purpose | Key Features |
|-------|---------|--------------|
| **sellerStore.ts** | Seller state management | Products, orders, inventory ledger, auth |
| **cartStore.ts** | Shopping cart | Items, add/remove, totals, persistence |
| **adminStore.ts** | Admin state | Dashboard data, user management |
| **productQAStore.ts** | Product QA flow | Approval workflow, status tracking |
| **buyerStore.ts** | Buyer profile | User data, addresses, preferences |

#### Mobile Stores (`/mobile-app/src/stores/`)

| Store | Purpose | Key Features |
|-------|---------|--------------|
| **sellerStore.ts** | Seller state | Products, orders, stats |
| **cartStore.ts** | Shopping cart | Cart items, AsyncStorage persistence |
| **orderStore.ts** | Order management | Order history, status tracking |
| **authStore.ts** | Authentication | User auth state |

### Key Interfaces

```typescript
// SellerProduct (Web)
interface SellerProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  images: string[];
  isActive: boolean;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  sales: number;
  rating: number;
  reviews: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected' | 'reclassified';
}

// SellerOrder (Web)
interface SellerOrder {
  id: string;
  buyerName: string;
  buyerEmail: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  orderDate: string;
  shippingAddress: ShippingAddress;
  trackingNumber?: string;
  type?: 'ONLINE' | 'OFFLINE';  // POS orders
}

// CartItem
interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  seller: string;
  category: string;
  rating: number;
}
```

---

## 🔄 User Flows

### 1. Buyer Purchase Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BUYER PURCHASE FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  Browse  │───▶│  View    │───▶│  Add to  │───▶│  Cart    │             │
│  │  Shop    │    │  Product │    │  Cart    │    │  Review  │             │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘             │
│                                                       │                     │
│                                                       ▼                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  Track   │◀───│  Order   │◀───│  Pay     │◀───│ Checkout │             │
│  │  Order   │    │ Confirm  │    │  Now     │    │  Page    │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2. Seller Product Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SELLER PRODUCT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │ Register │───▶│ Complete │───▶│  Await   │───▶│  Access  │             │
│  │  Seller  │    │Onboarding│    │ Approval │    │Dashboard │             │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘             │
│                                                       │                     │
│                                                       ▼                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  Live    │◀───│  Admin   │◀───│  Await   │◀───│   Add    │             │
│  │  Store   │    │ Approves │    │   QA     │    │ Products │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Order Fulfillment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ORDER FULFILLMENT FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     BUYER                    SELLER                    SYSTEM               │
│       │                        │                         │                  │
│       │    Places Order        │                         │                  │
│       │───────────────────────▶│                         │                  │
│       │                        │    Stock Deducted       │                  │
│       │                        │────────────────────────▶│                  │
│       │                        │                         │                  │
│       │                        │    Ledger Entry         │                  │
│       │                        │────────────────────────▶│                  │
│       │                        │                         │                  │
│       │    Order Pending       │    New Order Alert      │                  │
│       │◀───────────────────────│◀────────────────────────│                  │
│       │                        │                         │                  │
│       │                        │    Confirm Order        │                  │
│       │                        │───────────────────────▶ │                  │
│       │    Status: Confirmed   │                         │                  │
│       │◀───────────────────────│                         │                  │
│       │                        │                         │                  │
│       │                        │    Add Tracking         │                  │
│       │                        │───────────────────────▶ │                  │
│       │    Status: Shipped     │                         │                  │
│       │◀───────────────────────│                         │                  │
│       │                        │                         │                  │
│       │    Status: Delivered   │                         │                  │
│       │◀───────────────────────│◀────────────────────────│                  │
│       │                        │                         │                  │
│       │    Leave Review        │    Rating Updated       │                  │
│       │───────────────────────▶│───────────────────────▶ │                  │
│       │                        │                         │                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4. POS Lite Flow (Offline Sales)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POS LITE FLOW                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  Open    │───▶│  Search  │───▶│  Add to  │───▶│  Review  │             │
│  │   POS    │    │ Products │    │   Cart   │    │   Cart   │             │
│  └──────────┘    └──────────┘    └──────────┘    └────┬─────┘             │
│                                                       │                     │
│                                                       ▼                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│  │  View    │◀───│  Ledger  │◀───│  Stock   │◀───│ Complete │             │
│  │ Orders   │    │ Updated  │    │ Deducted │    │   Sale   │             │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘             │
│                                                                             │
│  Features:                                                                  │
│  • Split-view layout (65% catalog / 35% cart)                              │
│  • Real-time stock validation                                              │
│  • Immutable inventory ledger                                              │
│  • Instant order completion (status: delivered)                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5. Product QA Approval Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PRODUCT QA APPROVAL FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     SELLER                    ADMIN                    SYSTEM               │
│       │                        │                         │                  │
│       │    Submit Product      │                         │                  │
│       │───────────────────────▶│                         │                  │
│       │                        │                         │                  │
│       │    Status: Pending     │    Queue Updated        │                  │
│       │◀───────────────────────│◀────────────────────────│                  │
│       │                        │                         │                  │
│       │                        │    Review Product       │                  │
│       │                        │    (Quality Check)      │                  │
│       │                        │                         │                  │
│       │                        ├───────┬────────┬────────┤                  │
│       │                        │       │        │        │                  │
│       │                        ▼       ▼        ▼        │                  │
│       │                    APPROVE  REJECT  RECLASSIFY   │                  │
│       │                        │       │        │        │                  │
│       │                        │       │        │        │                  │
│       │◀───────────────────────┴───────┴────────┴────────│                  │
│       │                                                  │                  │
│       │    If Rejected:                                  │                  │
│       │    • View rejection reason                       │                  │
│       │    • Revise and resubmit                        │                  │
│       │                                                  │                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Feature Matrix

### Platform Comparison

| Feature | Web Buyer | Web Seller | Web Admin | Mobile Buyer | Mobile Seller |
|---------|-----------|------------|-----------|--------------|---------------|
| Browse Products | ✅ | - | ✅ | ✅ | - |
| Search | ✅ | - | ✅ | ✅ | - |
| Cart | ✅ | - | - | ✅ | - |
| Checkout | ✅ | - | - | ✅ | - |
| Order Tracking | ✅ | - | ✅ | ✅ | - |
| Profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Dashboard | - | ✅ | ✅ | - | ✅ |
| Product CRUD | - | ✅ | ✅ | - | ✅ |
| Order Management | - | ✅ | ✅ | - | ✅ |
| POS Lite | - | ✅ | - | - | ❌ |
| Analytics | - | ✅ | ✅ | - | ✅ |
| Flash Sales | - | ✅ | ✅ | - | ❌ |
| Messaging | - | ✅ | - | - | ❌ |
| Reviews | ✅ | ✅ | ✅ | ✅ | - |
| Seller Approval | - | - | ✅ | - | - |
| Product QA | - | ✅ | ✅ | - | - |
| Payouts | - | ✅ | ✅ | - | - |
| Vouchers | ✅ | - | ✅ | ✅ | - |

### Legend
- ✅ Implemented
- ❌ Not planned for this platform
- `-` Not applicable

---

## 🔧 Technology Stack

### Web Application

| Category | Technology |
|----------|------------|
| Framework | React 18+ |
| Build Tool | Vite |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Shadcn UI |
| State | Zustand |
| Routing | React Router v6 |
| Animation | Framer Motion |
| Testing | Vitest |
| Icons | Lucide React |

### Mobile Application

| Category | Technology |
|----------|------------|
| Framework | React Native |
| Toolchain | Expo |
| Language | TypeScript |
| Navigation | React Navigation v6 |
| State | Zustand |
| Storage | AsyncStorage |
| Icons | Lucide React Native |
| Gestures | React Native Gesture Handler |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (for mobile)

### Web Development

```bash
cd web
npm install
npm run dev
# Open http://localhost:5173
```

### Mobile Development

```bash
cd mobile-app
npm install
npx expo start
# Scan QR code with Expo Go app
```

### Running Tests

```bash
cd web
npm run test:all
# Runs all 37 tests (24 POS + 13 buyer-seller flow)
```

---

## 📝 Notes for Interns

1. **Always work on the `dev` branch** - Create feature branches from dev
2. **Test your changes locally** before pushing
3. **Follow the commit message format** (feat:, fix:, update:, etc.)
4. **Create Pull Requests** for code review
5. **Check the existing patterns** in the codebase before implementing
6. **Use TypeScript** - Don't bypass type checking with `any`
7. **Follow component structure** - See existing components for patterns

---

## 📞 Support

For questions or issues:
- Check existing documentation files in the root directory
- Review code comments and JSDoc
- Contact the lead developer

---

**Last Updated:** January 6, 2026
