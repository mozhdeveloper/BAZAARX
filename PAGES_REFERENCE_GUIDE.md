# 📖 BazaarPH - Page-by-Page Reference Guide

This document provides detailed information about every page and screen in both the web and mobile applications.

---

## 🌐 WEB APPLICATION PAGES

### 📦 Buyer Pages

---

#### **HomePage** (`/`)
**File:** `web/src/pages/HomePage.tsx`

**Purpose:** Landing page that showcases the platform's products and features.

**Features:**
- Hero section with promotional banners
- Featured products carousel
- Category navigation
- Flash sale highlights
- Trust indicators and testimonials
- Mobile app download section

**Components Used:**
- `HeroSection`
- `ProductCard`
- `FeaturedCollections`
- `CategoriesFooterStrip`

---

#### **ShopPage** (`/shop`)
**File:** `web/src/pages/ShopPage.tsx`

**Purpose:** Main product browsing page with filtering and sorting capabilities.

**Features:**
- Product grid with infinite scroll
- Category filters (sidebar)
- Price range filter
- Rating filter
- Sort options (price, popularity, newest)
- Search integration
- Product quick view

**Components Used:**
- `ProductCard`
- Filter components
- `ScrollArea`

---

#### **SearchPage** (`/search`)
**File:** `web/src/pages/SearchPage.tsx`

**Purpose:** Advanced search with AI-powered features.

**Features:**
- Text search with autocomplete
- Visual search (camera)
- AI chat assistant
- Search suggestions
- Recent searches
- Filter by category/price/rating

**Components Used:**
- `VisualSearchModal`
- `AIChatModal`
- `ProductCard`

---

#### **ProductDetailPage** (`/product/:id`)
**File:** `web/src/pages/ProductDetailPage.tsx`

**Purpose:** Displays complete product information.

**Features:**
- Product image gallery
- Price and discount display
- Stock availability
- Size/variant selection
- Add to cart functionality
- Seller information
- Customer reviews
- Related products
- Q&A section

**Components Used:**
- Image carousel
- `ReviewModal`
- `ProductCard` (related)

---

#### **EnhancedCartPage** (`/enhanced-cart`)
**File:** `web/src/pages/EnhancedCartPage.tsx`

**Purpose:** Shopping cart with enhanced UX.

**Features:**
- Cart item list with images
- Quantity adjustment
- Remove items
- Price calculations (subtotal, shipping, total)
- Voucher/coupon application
- Save for later
- Continue shopping link

**Store:** `cartStore.ts`

---

#### **CheckoutPage** (`/checkout`)
**File:** `web/src/pages/CheckoutPage.tsx`

**Purpose:** Complete checkout flow.

**Features:**
- Shipping address form
- Address book selection
- Payment method selection
- Order summary
- Apply vouchers
- Order notes
- Terms acceptance

**Integrations:**
- `cartStore` - Cart items
- `orderStore` - Order creation

---

#### **OrderConfirmationPage** (`/order-confirmation/:orderId`)
**File:** `web/src/pages/OrderConfirmationPage.tsx`

**Purpose:** Post-purchase confirmation.

**Features:**
- Order success message
- Order number display
- Estimated delivery date
- Order summary
- Track order button
- Continue shopping link

---

#### **OrdersPage** (`/orders`)
**File:** `web/src/pages/OrdersPage.tsx`

**Purpose:** Buyer's order history.

**Features:**
- Order list with status
- Filter by status (pending, shipped, delivered)
- Order search
- Quick actions (track, reorder, review)
- Pagination

---

#### **OrderDetailPage** (`/order/:orderId`)
**File:** `web/src/pages/OrderDetailPage.tsx`

**Purpose:** Single order details view.

**Features:**
- Order timeline
- Item details
- Payment information
- Shipping address
- Tracking information
- Cancel/return options
- Contact seller

---

#### **DeliveryTrackingPage** (`/delivery-tracking/:orderId`)
**File:** `web/src/pages/DeliveryTrackingPage.tsx`

**Purpose:** Real-time delivery tracking.

**Features:**
- Live tracking map
- Delivery status timeline
- Driver information
- Estimated arrival
- Delivery updates
- Contact driver option

---

#### **BuyerProfilePage** (`/profile`)
**File:** `web/src/pages/BuyerProfilePage.tsx`

**Purpose:** Buyer account management.

**Features:**
- Profile information
- Address book
- Payment methods
- Order history link
- Wishlist
- Account settings
- Notifications preferences

---

#### **SellerStorefrontPage** (`/seller/:sellerId`)
**File:** `web/src/pages/SellerStorefrontPage.tsx`

**Purpose:** Individual seller's public store page.

**Features:**
- Store banner and logo
- Seller information
- Rating and reviews count
- Product listings
- Category filters
- Follow seller
- Contact seller

---

### 🏪 Seller Pages

---

#### **SellerAuthChoice** (`/seller/auth`)
**File:** `web/src/pages/SellerAuthChoice.tsx`

**Purpose:** Entry point for seller authentication.

**Features:**
- Login option
- Register option
- Benefits of selling
- Quick start guide link

---

#### **SellerLogin** (`/seller/login`)
**File:** `web/src/pages/SellerAuth.tsx`

**Purpose:** Seller login form.

**Features:**
- Email/password login
- Remember me
- Forgot password link
- Social login options
- Register link

---

#### **SellerRegister** (`/seller/register`)
**File:** `web/src/pages/SellerAuth.tsx`

**Purpose:** Seller registration form.

**Features:**
- Basic information collection
- Email verification
- Password creation
- Terms acceptance
- Continue to onboarding

---

#### **SellerOnboarding** (`/seller/onboarding`)
**File:** `web/src/pages/SellerOnboarding.tsx`

**Purpose:** Multi-step seller setup wizard.

**Steps:**
1. **Business Information**
   - Business name
   - Business type (sole proprietor, partnership, corporation)
   - Registration number
   - Tax ID

2. **Store Setup**
   - Store name
   - Store description
   - Store logo upload
   - Categories selection

3. **Address Details**
   - Business address
   - City, province, postal code

4. **Banking Information**
   - Bank name
   - Account name
   - Account number

5. **Document Upload**
   - Business permit
   - Valid ID
   - Proof of address

---

#### **SellerPendingApproval** (`/seller/pending-approval`)
**File:** `web/src/pages/SellerPendingApproval.tsx`

**Purpose:** Waiting screen for seller approval.

**Features:**
- Approval status indicator
- Estimated review time
- Document status checklist
- Edit application option
- Contact support link

---

#### **SellerDashboard** (`/seller`)
**File:** `web/src/pages/SellerDashboard.tsx`

**Purpose:** Main seller control panel.

**Features:**
- Revenue overview (today, week, month)
- Order statistics
- Sales chart
- Recent orders
- Low stock alerts
- Quick actions
- Performance metrics

**Components:**
- Sidebar navigation
- Stats cards
- Charts (revenue, orders)
- Order list

---

#### **SellerProducts** (`/seller/products`)
**File:** `web/src/pages/SellerProducts.tsx`

**Purpose:** Product management interface.

**Features:**
- Product list with filters
- Add new product
- Edit product
- Delete product
- Toggle active status
- Stock management
- Bulk actions
- Search products

**CRUD Operations:**
- Create: Add product with images, details, pricing
- Read: View product list and details
- Update: Edit product information
- Delete: Remove products

---

#### **SellerProductStatus** (`/seller/product-status-qa`)
**File:** `web/src/pages/SellerProductStatus.tsx`

**Purpose:** Track product QA approval status.

**Features:**
- Products pending review
- Approved products
- Rejected products (with reasons)
- Reclassified products
- Revision workflow
- Resubmit rejected products

**Statuses:**
- `pending` - Awaiting admin review
- `approved` - Live on marketplace
- `rejected` - Needs revision
- `reclassified` - Category changed by admin

---

#### **SellerOrders** (`/seller/orders`)
**File:** `web/src/pages/SellerOrders.tsx`

**Purpose:** Order management system.

**Features:**
- Order list with tabs (pending, confirmed, shipped, delivered)
- Order details modal
- Update order status
- Add tracking number
- Print shipping label
- Order search and filters
- Bulk status update

**Order Actions:**
- Confirm order
- Mark as shipped (add tracking)
- Cancel order
- View order history

---

#### **SellerPOS** (`/seller/pos`)
**File:** `web/src/pages/SellerPOS.tsx`

**Purpose:** Point-of-Sale system for in-person sales.

**Layout:** Split-view (65% catalog / 35% cart)

**Features:**
- Product catalog with search
- Quick add to cart
- Cart management
- Stock validation
- Complete sale
- Order notes
- Inventory ledger tracking
- Low stock alerts

**Components:**
- Product grid with cards
- Cart sidebar
- Product details modal
- Success dialog

**Store Integration:**
- `sellerStore.addOfflineOrder()`
- `sellerStore.deductStock()`
- Inventory ledger entries

---

#### **SellerEarnings** (`/seller/earnings`)
**File:** `web/src/pages/SellerEarnings.tsx`

**Purpose:** Revenue and payout tracking.

**Features:**
- Earnings overview
- Revenue by period
- Pending payouts
- Completed payouts
- Transaction history
- Export reports
- Payout schedule

---

#### **SellerFlashSales** (`/seller/flash-sales`)
**File:** `web/src/pages/SellerFlashSales.tsx`

**Purpose:** Create and manage flash sales.

**Features:**
- Create flash sale
- Select products
- Set discount percentage
- Set duration
- Schedule start time
- View active sales
- Analytics per sale

---

#### **SellerMessages** (`/seller/messages`)
**File:** `web/src/pages/SellerMessages.tsx`

**Purpose:** Customer communication.

**Features:**
- Message inbox
- Conversation threads
- Reply to customers
- Quick replies/templates
- Message search
- Mark as read/unread
- Attachments

---

#### **SellerReviews** (`/seller/reviews`)
**File:** `web/src/pages/SellerReviews.tsx`

**Purpose:** Manage customer reviews.

**Features:**
- Review list
- Reply to reviews
- Filter by rating
- Flag inappropriate reviews
- Review analytics
- Average rating display

---

#### **SellerAnalytics** (`/seller/analytics`)
**File:** `web/src/pages/SellerAnalytics.tsx`

**Purpose:** Sales and performance analytics.

**Features:**
- Sales trends chart
- Revenue by category
- Top selling products
- Customer demographics
- Traffic sources
- Conversion rates
- Compare periods

---

#### **SellerSettings** (`/seller/settings`)
**File:** `web/src/pages/SellerSettings.tsx`

**Purpose:** Account and store settings.

**Features:**
- Profile settings
- Store settings
- Notification preferences
- Security (password, 2FA)
- Banking information
- Tax settings
- API keys (if applicable)

---

#### **SellerStoreProfile** (`/seller/profile`)
**File:** `web/src/pages/SellerStoreProfile.tsx`

**Purpose:** Public store profile management.

**Features:**
- Store banner upload
- Store logo
- Store description
- Business hours
- Return policy
- Shipping policy
- Social media links

---

### 👑 Admin Pages

---

#### **AdminAuth** (`/admin/login`)
**File:** `web/src/pages/AdminAuth.tsx`

**Purpose:** Admin authentication.

**Features:**
- Email/password login
- Admin-only access
- 2FA verification
- Session management

---

#### **AdminDashboard** (`/admin`)
**File:** `web/src/pages/AdminDashboard.tsx`

**Purpose:** Platform overview and control center.

**Features:**
- Platform statistics
- Revenue overview
- Active users count
- Pending approvals count
- Recent activities
- Quick action buttons
- System health status

---

#### **AdminCategories** (`/admin/categories`)
**File:** `web/src/pages/AdminCategories.tsx`

**Purpose:** Category management.

**Features:**
- Category tree view
- Add category
- Edit category
- Delete category
- Reorder categories
- Category icons
- Subcategories

---

#### **AdminSellers** (`/admin/sellers`)
**File:** `web/src/pages/AdminSellers.tsx`

**Purpose:** Seller management and approval.

**Features:**
- Seller list with filters
- Pending approvals queue
- Approve/reject sellers
- View seller details
- Document verification
- Suspend/unsuspend sellers
- Seller analytics

---

#### **AdminBuyers** (`/admin/buyers`)
**File:** `web/src/pages/AdminBuyers.tsx`

**Purpose:** Buyer account management.

**Features:**
- Buyer list
- Search buyers
- View buyer details
- Order history
- Suspend accounts
- Buyer analytics

---

#### **AdminOrders** (`/admin/orders`)
**File:** `web/src/pages/AdminOrders.tsx`

**Purpose:** Platform-wide order management.

**Features:**
- All orders list
- Filter by status/seller/date
- Order details
- Dispute resolution
- Refund processing
- Order analytics

---

#### **AdminProducts** (`/admin/products`)
**File:** `web/src/pages/AdminProducts.tsx`

**Purpose:** Product oversight.

**Features:**
- All products list
- Search and filter
- Product moderation
- Remove products
- Featured products
- Product statistics

---

#### **AdminProductApprovals** (`/admin/product-approvals`)
**File:** `web/src/pages/AdminProductApprovals.tsx`

**Purpose:** Product QA queue.

**Features:**
- Pending products queue
- Quality review interface
- Approve product
- Reject with reason
- Reclassify category
- Bulk actions
- Review history

**Actions:**
- ✅ Approve - Product goes live
- ❌ Reject - Send back to seller with reason
- 🔄 Reclassify - Change category

---

#### **AdminVouchers** (`/admin/vouchers`)
**File:** `web/src/pages/AdminVouchers.tsx`

**Purpose:** Voucher/coupon management.

**Features:**
- Create vouchers
- Voucher codes
- Discount types (%, fixed)
- Usage limits
- Expiration dates
- Usage tracking
- Deactivate vouchers

---

#### **AdminFlashSales** (`/admin/flash-sales`)
**File:** `web/src/pages/AdminFlashSales.tsx`

**Purpose:** Platform flash sales management.

**Features:**
- Platform-wide sales
- Featured sale slots
- Approve seller sales
- Schedule sales
- Sale analytics

---

#### **AdminReviewModeration** (`/admin/reviews`)
**File:** `web/src/pages/AdminReviewModeration.tsx`

**Purpose:** Review moderation queue.

**Features:**
- Flagged reviews
- Review moderation
- Remove inappropriate reviews
- Warn users
- Review guidelines

---

#### **AdminPayouts** (`/admin/payouts`)
**File:** `web/src/pages/AdminPayouts.tsx`

**Purpose:** Seller payout management.

**Features:**
- Pending payouts
- Process payouts
- Payout history
- Transaction details
- Bank verification
- Payout schedule settings

---

#### **AdminAnalytics** (`/admin/analytics`)
**File:** `web/src/pages/AdminAnalytics.tsx`

**Purpose:** Platform analytics.

**Features:**
- GMV (Gross Merchandise Value)
- Active users
- Seller metrics
- Revenue trends
- Category performance
- Traffic analytics
- Export reports

---

#### **AdminSettings** (`/admin/settings`)
**File:** `web/src/pages/AdminSettings.tsx`

**Purpose:** Platform configuration.

**Features:**
- General settings
- Commission rates
- Shipping settings
- Payment gateway config
- Email templates
- Notification settings
- Feature toggles

---

## 📱 MOBILE APPLICATION SCREENS

### 📦 Buyer Screens

---

#### **SplashScreen**
**File:** `mobile-app/app/SplashScreen.tsx`

**Purpose:** App loading and initialization.

**Features:**
- App logo display
- Loading animation
- Auth state check
- Navigation to appropriate screen

---

#### **OnboardingScreen**
**File:** `mobile-app/app/OnboardingScreen.tsx`

**Purpose:** First-time user introduction.

**Features:**
- Feature highlights
- Swipeable pages
- Skip option
- Get started button

---

#### **LoginScreen**
**File:** `mobile-app/app/LoginScreen.tsx`

**Purpose:** User authentication.

**Features:**
- Phone/email login
- Social login (Google, Facebook)
- OTP verification
- Register link
- Seller login link

---

#### **HomeScreen**
**File:** `mobile-app/app/HomeScreen.tsx`

**Purpose:** Main dashboard for buyers.

**Features:**
- Search bar
- Category icons
- Flash deals
- Featured products
- Recommended for you
- Pull to refresh

---

#### **ShopScreen**
**File:** `mobile-app/app/ShopScreen.tsx`

**Purpose:** Product browsing.

**Features:**
- Product grid
- Category tabs
- Filter modal
- Sort options
- Search integration
- AI/Camera search

---

#### **ProductDetailScreen**
**File:** `mobile-app/app/ProductDetailScreen.tsx`

**Purpose:** Product details view.

**Features:**
- Image carousel
- Product info
- Add to cart
- Buy now
- Seller info
- Reviews
- Share product

---

#### **CartScreen**
**File:** `mobile-app/app/CartScreen.tsx`

**Purpose:** Shopping cart.

**Features:**
- Cart items list
- Quantity adjustment
- Swipe to delete
- Price summary
- Checkout button
- Empty cart state

---

#### **CheckoutScreen**
**File:** `mobile-app/app/CheckoutScreen.tsx`

**Purpose:** Checkout flow.

**Features:**
- Address selection
- Payment method
- Order summary
- Voucher input
- Place order

---

#### **PaymentGatewayScreen**
**File:** `mobile-app/app/PaymentGatewayScreen.tsx`

**Purpose:** Payment processing.

**Features:**
- Payment method display
- Card input (if applicable)
- GCash/PayMaya integration
- Processing state
- Success/failure handling

---

#### **OrderConfirmationScreen**
**File:** `mobile-app/app/OrderConfirmationScreen.tsx`

**Purpose:** Order success page.

**Features:**
- Success animation
- Order details
- Track order button
- Continue shopping

---

#### **OrdersScreen**
**File:** `mobile-app/app/OrdersScreen.tsx`

**Purpose:** Order history and tracking.

**Features:**
- Order tabs (active, to receive, history)
- Order cards
- Status indicators
- Quick actions

---

#### **OrderDetailScreen**
**File:** `mobile-app/app/OrderDetailScreen.tsx`

**Purpose:** Single order details.

**Features:**
- Order timeline
- Item list
- Total breakdown
- Track order
- Contact seller
- Cancel order

---

#### **DeliveryTrackingScreen**
**File:** `mobile-app/app/DeliveryTrackingScreen.tsx`

**Purpose:** Live delivery tracking.

**Features:**
- Tracking timeline
- Delivery status
- Driver info
- ETA
- Map view (if available)

---

#### **ProfileScreen**
**File:** `mobile-app/app/ProfileScreen.tsx`

**Purpose:** User profile and settings hub.

**Features:**
- User info display
- Orders shortcut
- Following shops
- Addresses
- Payment methods
- Settings link
- Help & support
- Logout

---

### 🏪 Seller Screens (Mobile)

---

#### **SellerLoginScreen**
**File:** `mobile-app/app/seller/login.tsx`

**Purpose:** Seller authentication on mobile.

**Features:**
- Email/password login
- Register link
- Forgot password

---

#### **SellerDashboardScreen**
**File:** `mobile-app/app/seller/(tabs)/dashboard.tsx`

**Purpose:** Seller overview on mobile.

**Features:**
- Revenue summary
- Order count
- Quick stats
- Recent orders
- Performance chart

---

#### **SellerProductsScreen**
**File:** `mobile-app/app/seller/(tabs)/products.tsx`

**Purpose:** Product management on mobile.

**Features:**
- Product list
- Add product
- Edit product
- Toggle active
- Stock count

---

#### **SellerOrdersScreen**
**File:** `mobile-app/app/seller/(tabs)/orders.tsx`

**Purpose:** Order management on mobile.

**Features:**
- Order list by status
- Update status
- Order details
- Contact buyer

---

#### **SellerAnalyticsScreen**
**File:** `mobile-app/app/seller/(tabs)/analytics.tsx`

**Purpose:** Sales analytics on mobile.

**Features:**
- Sales charts
- Top products
- Revenue breakdown

---

#### **SellerSettingsScreen**
**File:** `mobile-app/app/seller/(tabs)/settings.tsx`

**Purpose:** Seller settings on mobile.

**Features:**
- Profile settings
- Store settings
- Notifications
- Logout

---

## 🔗 Navigation Summary

### Web Routes

```
/ ─────────────────────── HomePage
├── /shop ─────────────── ShopPage
├── /search ───────────── SearchPage
├── /collections ──────── CollectionsPage
├── /stores ───────────── StoresPage
├── /product/:id ──────── ProductDetailPage
├── /enhanced-cart ────── EnhancedCartPage
├── /checkout ─────────── CheckoutPage
├── /order-confirmation/:orderId ── OrderConfirmationPage
├── /delivery-tracking/:orderId ─── DeliveryTrackingPage
├── /orders ───────────── OrdersPage
├── /order/:orderId ───── OrderDetailPage
├── /profile ──────────── BuyerProfilePage
├── /seller/:sellerId ─── SellerStorefrontPage
├── /reviews ──────────── ReviewsPage
│
├── /seller/auth ──────── SellerAuthChoice
├── /seller/login ─────── SellerLogin
├── /seller/register ──── SellerRegister
├── /seller/onboarding ── SellerOnboarding
├── /seller/pending-approval ── SellerPendingApproval
├── /seller ───────────── SellerDashboard
├── /seller/profile ───── SellerStoreProfile
├── /seller/products ──── SellerProducts
├── /seller/product-status-qa ── SellerProductStatus
├── /seller/orders ────── SellerOrders
├── /seller/pos ───────── SellerPOS
├── /seller/earnings ──── SellerEarnings
├── /seller/flash-sales ─ SellerFlashSales
├── /seller/messages ──── SellerMessages
├── /seller/reviews ───── SellerReviews
├── /seller/analytics ─── SellerAnalytics
├── /seller/settings ──── SellerSettings
│
├── /admin/login ──────── AdminAuth
├── /admin ────────────── AdminDashboard
├── /admin/categories ─── AdminCategories
├── /admin/sellers ────── AdminSellers
├── /admin/buyers ─────── AdminBuyers
├── /admin/orders ─────── AdminOrders
├── /admin/products ───── AdminProducts
├── /admin/product-approvals ── AdminProductApprovals
├── /admin/vouchers ───── AdminVouchers
├── /admin/flash-sales ── AdminFlashSales
├── /admin/reviews ────── AdminReviewModeration
├── /admin/payouts ────── AdminPayouts
├── /admin/analytics ──── AdminAnalytics
└── /admin/settings ───── AdminSettings
```

### Mobile Navigation

```
Splash ──► Onboarding ──► Login
                            │
                            ├──► MainTabs (Buyer)
                            │      ├── Home
                            │      ├── Shop
                            │      ├── Cart
                            │      ├── Orders
                            │      └── Profile
                            │
                            └──► SellerTabs (Seller)
                                   ├── Dashboard
                                   ├── Products
                                   ├── Orders
                                   ├── Analytics
                                   └── Settings
```

---

**Document Version:** 1.0  
**Last Updated:** January 6, 2026
