
# 📚 BazaarX - Complete Project Documentation

Welcome to the BazaarX development team! This document serves as the comprehensive onboarding guide and architectural reference for the project. It provides a detailed overview of the system, its components, user flows, and the technical standards expected during development.

Updated as of **March 2, 2026**

---
## 📖 Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Directory Structure](#directory-structure)
4. [Services, Stores, and State Management](#services-stores-and-state-management)
5. [User Flows](#user-flows)
6. [Notes for Interns](#notes-for-interns)

---

## 🎯 Project Overview
BazaarX (formerly BazaarPH) is a full-stack e-commerce marketplace platform consisting of:
* **Web Application (`/web`):** React + TypeScript + Vite + Tailwind CSS.
* **Mobile Application (`/mobile-app`):** React Native + Expo + TypeScript.

### User Roles
* **Buyer:** The end-consumer. Can browse products, use text/visual search, interact with the AI assistant, manage carts, checkout, track orders (via AfterShip), request returns/refunds, and leave reviews. **[Web + Mobile]**
* **Seller:** The merchant. Can manage their store profile, upload products (subject to Admin QA), manage inventory, fulfill orders, generate receipts, and operate the physical storefront using POS Lite. **[Web + Mobile]**
* **Admin:** The platform moderator. Responsible for approving/rejecting product submissions (Product QA), moderating reviews, managing user tiers, creating platform-wide discount campaigns/vouchers, and monitoring analytics. **[Web Only]**

---

## 🏗️ Architecture Overview
BazaarX utilizes a modern, decoupled **Client-BaaS (Backend-as-a-Service)** architecture.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          BAZAARX ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │   WEB CLIENT    │     │  MOBILE CLIENT  │     │   ADMIN PANEL   │        │
│  │   (React/Vite)  │     │ (React Native)  │     │   (React/Web)   │        │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘        │
│           │                       │                       │                 │
│           └───────────────────────┼───────────────────────┘                 │
│                                   │                                         │
│                       ┌────────────▼────────────┐                           │
│                       │     ZUSTAND STORES      │                           │
│                       │  (Client-side State)    │                           │
│                       └────────────┬────────────┘                           │
│                                    │                                         │
│                                    ▼                                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                         SUPABASE (BaaS)                               │  │
│  │  - Auth (JWT/Sessions)       - PostgreSQL (RLS / Vector extensions)   │  │
│  │  - Storage (Buckets)         - Edge Functions (Deno / APIs)           │  │
│  └────────────────────────────────┬──────────────────────────────────────┘  │
│                                    │                                         │
│             ┌─────────────────────┼───────────────────────┐                 │
│             ▼                     ▼                       ▼                 │
│       ┌────────────┐       ┌────────────┐        ┌─────────────────┐        │
│       │ Gemini AI  │       │ AfterShip  │        │ Jina AI/Qwen AI │        │
│       │ (Chat/QA)  │       │ (Tracking) │        │  (Embeddings)   │        │
│       └────────────┘       └────────────┘        └─────────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```
---
## 📂 Directory Structure
The repository is organized into a monorepo-style structure separating the `web` and `mobile-app` environments, sharing unified database schemas and backend logic.

```text
bazaarx/
├── documentation/          # Centralized project documentation and feature guides
├── mobile-app/             # Expo/React Native mobile application
│   ├── app/                # File-based routing (Expo Router)
│   │   ├── (tabs)/         # Main buyer navigation (Home, Search, Cart, etc.)
│   │   ├── admin/          # (Deprecated) Admin features moved to Web
│   │   ├── onboarding/     # Initial user setup (Category preferences, Terms)
│   │   ├── seller/         # Seller-side features and dashboard
│   │   └── tickets/        # Customer support ticket management
│   ├── src/
│   │   ├── components/     # Mobile-specific UI (ProductCards, Modals)
│   │   ├── services/       # API logic (Orders, Auth, Visual Search)
│   │   ├── stores/         # Global state management (Zustand)
│   │   └── types/          # TypeScript definitions for mobile data
│   ├── assets/             # Images, icons, and splash screens
│   ├── scripts/            # Mobile-specific utility and seeding scripts
│   └── .env                # Supabase keys
│
├── web/                    # Vite/React web application (Admin & Seller Portals)
│   ├── public/             # Static assets (Brand logos, CSV templates)
│   ├── src/
│   │   ├── components/     # Shared web UI and feature-specific modals
│   │   ├── hooks/          # Custom web hooks (Profile, Address management)
│   │   ├── pages/          # Main application views (Dashboard, Products, Analytics)
│   │   ├── services/       # Web-specific API logic and business rules
│   │   ├── stores/         # Web state (SellerStore, AdminStore, ChatStore)
│   │   └── tests/          # Web-focused test suites and flow validations
│   ├── scripts/            # Utility scripts for data population and QA checks
│   └── .env.local          # Supabase keys
│
├── supabase/               # Backend-as-a-Service configuration
│   ├── functions/          # Edge Functions (Shipment tracking, Visual Search AI)
│   └── migrations/         # SQL scripts for database versioning and schema updates
│
├── .gitignore              # Root Git ignore rules (node_modules, logs, .env)
├── package.json            # Root workspace configuration
└── README.md               # Project overview and setup instructions
```
---
## ⚙️ Services, Stores, and State Management
BazaarX strictly separates UI components from business logic. **Components should never call Supabase directly; they must use the Service layer**.

### 🗃️ State Management (Zustand) located in `/stores`
The application uses Zustand for lightweight, reactive state management. These stores act as the single source of truth for UI states and synced data.

| Store Name | Purpose |
| :--- | :--- | :--- |
| **`authStore`** | Manages user session state, authentication tokens, and role-based permissions (Buyer, Seller, Admin). |
| **`sellerStore`** | Handles product listings, inventory status, and bulk upload progress. |
| **`cartStore`** | Manages the shopping cart, including item persistence and real-time total calculations. |
| **`productQAStore`**| Tracks products through the mandatory Quality Assurance pipeline. |
| **`adminStore`** | Oversees platform-wide metrics, seller verification queues, and analytics. |
| **`buyerStore`** | Manages buyer-specific data, such as following shops and purchase history. |
| **`chatStore`** | Manages real-time message threads and active support sessions for the web portal. |
| **`orderStore`** | Dedicated mobile store for tracking active delivery statuses and order history. |
| **`wishlistStore`** | Manages user-saved products and shared wishlist visibility. |
| **`returnStore`** | Tracks the status of return and refund requests for buyers. |
| **`sellerReturnStore`**| Dedicated to managing return requests from the seller's perspective. |
| **`shopStore`** | Caches store-specific metadata and follower counts for the mobile "Shop" view. |
| **`supportStore`** | Manages the active state of support tickets and help center navigation for web users. |

### ⚙️ Service Layer located in `/services`
The service layer abstracts complex business logic and Supabase interactions, ensuring that components remain focused purely on the UI.

| Service Name | Primary Function |
| :--- | :--- |
| **`authService`** | Handles registration, login, session persistence, and role-switching logic. |
| **`productService`** | Manages product CRUD operations, variant combinations, and catalog search. |
| **`orderService`** | Coordinates the full order lifecycle, from checkout to delivery completion. |
| **`qaService`** | Implements the logic for product assessment, approval, and rejection workflows. |
| **`discountService`** | Calculates pricing for vouchers, flash sales, and manual seller discounts. |
| **`addressService`** | Manages Philippine-specific regional address data and shipping validation. |
| **`aiChatService`** | Interfaces with AI models for automated customer assistance and product queries. |
| **`barcodeService`** | Manages SKU generation and mobile/hardware barcode scanning for the POS system. |
| **`visualSearchService`**| Handles image processing and vector embeddings for "Search by Image" features. |
| **`ticketService`** | Manages the lifecycle of support tickets for both buyers and sellers. |
| **`sellerService`** | Dedicated logic for store profile management and seller-specific operations. |
| **`adminService`** | Provides high-level administrative functions for managing the marketplace ecosystem. |
| **`cartService`** | Encapsulates logic for cart persistence and backend synchronization. |
| **`notificationService`**| Manages the creation and retrieval of in-app notifications, such as order status updates. |
| **`chatService`** | Handles real-time buyer-seller communication, message persistence, and unread counts. |
| **`checkoutService`** | Manages the end-to-end checkout process, voucher application, and order initialization. |
| **`adBoostService`** | Provides logic for sellers to promote their products using ad-boost pricing formulas. |
| **`flashSaleService`** | Manages timing, eligibility, and quantity restrictions for platform-wide flash sales. |
| **`reviewService`** | Handles product rating submissions, review moderation, and the "helpful" vote system. |
| **`earningsService`** | Tracks seller revenue, calculates platform commission deductions, and manages payouts. |
| **`returnService`** | Coordinates the lifecycle of return and refund requests, including evidence uploads. |
---
## 🔄 User Flows

### A. Buyer Purchase Flow
1. **Discovery:** User navigates `HomePage` or `ShopPage`, searches via text, or uses the `VisualSearchModal`/`CameraSearchModal`.
2. **Selection:** User adds items via `ProductDetailScreen`. Variants (color, size) are handled by the `VariantManager`.
3. **Checkout:** User proceeds to `CheckoutPage`. The system validates stock (`productService`).
4. **Payment & Details:** User selects payment method and delivery address.
5. **Tracking:** Order is written to Supabase. An AfterShip tracking ID is generated, viewable on the `DeliveryTrackingPage`.

### B. Seller Product & QA Approval Flow
1. **Submission:** Seller creates a product (`SellerProducts`), uploading details and images.
2. **Pending State:** Product enters status: `pending`. It is hidden from the storefront.
3. **Admin Review:** Admin opens `AdminProductApprovals`, reviewing images, descriptions, and assessing uniqueness via AI embeddings.
4. **Resolution:** Admin approves (goes live) or rejects (with specific feedback via `partial_seller_rejections`).
5. **Revision:** If rejected, seller receives a notification to edit and resubmit.

### C. Order Fulfillment Flow
1. **Notification:** Seller receives an alert on `SellerDashboard`.
2. **Processing:** Seller moves the order from `Pending` to `Processing` in `SellerOrders`.
3. **Shipping:** Seller packs the item, generates a waybill, updates status to `Shipped`, and inputs the tracking number.
4. **Completion:** Upon delivery, status updates to `Delivered`, prompting the buyer via `reviewService` to leave a review.

### D. POS Lite Flow (In-Store Purchases)
1. **Setup:** Staff opens `SellerPOS`, sets the physical branch, and initiates the `CashDrawerManager`.
2. **Scanning:** Staff uses `BarcodeScanner` (webcam or hardware) to add items.
3. **Transaction:** Select payment method. Inventory is deducted globally in real-time.
4. **Receipt:** Sale is recorded, and a BIR-compliant digital receipt is generated.

--- 
## 📝 Notes for Interns

1.  **Always work on the  `dev`  branch**  - Create feature branches from dev
2.  **Test your changes locally**  before pushing
3.  **Follow the commit message format**  (feat:, fix:, update:, etc.)
4.  **Create Pull Requests**  for code review
5.  **Check the existing patterns**  in the codebase before implementing
6.  **Use TypeScript**  - Don't bypass type checking with  `any`
7.  **Follow component structure**  - See existing components for patterns
8.  **Read documentations**  - Review documentations to understand the codebase and features

----------