# V1 Screen/Page Blueprint — Completion Checklist (NO MORE, NO LESS)

Use this as the single source of truth for V1 scope.  
Goal: verify the project is **complete** by checking every required page/screen and its must-have UI elements.

---

## 🟦 BUYER WEB PAGES

### 1) Homepage
- [ ] Categories section visible
- [ ] Flash sale section visible
- [ ] Featured stores section visible
- [ ] Search bar present and usable
- [ ] Banners displayed (carousel or stacked)

### 2) Category Page
- [ ] Product grid renders products
- [ ] Filters exist and work:
  - [ ] Price filter
  - [ ] Category filter
  - [ ] Rating filter

### 3) Product Detail Page
- [ ] Product images gallery (multiple images supported)
- [ ] Price display supports:
  - [ ] Flash price (if active)
  - [ ] Normal price (if not flash)
- [ ] Ratings display (stars + count)
- [ ] Seller info shown (store name/logo/basic info)
- [ ] Add to cart works
- [ ] Follow shop button works

### 4) Search Results Page
- [ ] Displays products for query
- [ ] If no results:
  - [ ] Shows “Request Product” CTA

### 5) Product Request Pop-Up
- [ ] Search term field
- [ ] Description field
- [ ] Submit action works

### 6) Cart Page (Multi-Seller Grouped)
- [ ] Items grouped by seller (clear separation)
- [ ] Voucher input present
- [ ] Price summary present (totals)

### 7) Checkout Page
- [ ] Address selection flow exists
- [ ] Payment method selection exists
- [ ] Summary section present
- [ ] Voucher application supported
- [ ] Review order section before placing order

### 8) Order Confirmation Page
- [ ] Confirmation state shown (order placed)
- [ ] Order reference/summary visible

### 9) Orders List Page
- [ ] Lists all buyer orders
- [ ] Each item can open Order Details

### 10) Order Details Page
- [ ] Status shown clearly
- [ ] Items shown with quantities/prices
- [ ] Order-based chat entry/section exists
- [ ] Rating button exists (when applicable)

### 11) Login / Signup
- [ ] Login screen exists
- [ ] Signup screen exists
- [ ] Validation + error handling

### 12) Profile Page
- [ ] Personal info section
- [ ] Addresses management
- [ ] Following shops list/entry

---

## 🟩 BUYER MOBILE APP SCREENS (React Native)

> Same structure as Web but optimized for mobile UX.

### 1) Splash Screen
- [ ] Splash screen exists
- [ ] Branding/logo visible

### 2) Onboarding (Optional)
- [ ] Onboarding screens exist (only if included)
- [ ] Skip/continue actions work

### 3) Login / Signup
- [ ] Login screen exists
- [ ] Signup screen exists

### 4) Homepage
- [ ] Categories visible
- [ ] Flash sale visible
- [ ] Featured stores visible
- [ ] Search access present
- [ ] Banners visible

### 5) Category List
- [ ] Category list screen exists
- [ ] Navigates to Product List

### 6) Product List
- [ ] Product grid/list renders
- [ ] Filters available if required for mobile UX

### 7) Product Details
- [ ] Image gallery
- [ ] Flash/normal price logic
- [ ] Ratings display
- [ ] Seller info
- [ ] Add to cart
- [ ] Follow shop

### 8) Search + Request Product
- [ ] Search results show products
- [ ] No results → Request Product CTA
- [ ] Request Product form flow works

### 9) Cart (Multi-Seller Grouped)
- [ ] Items grouped by seller
- [ ] Voucher input available
- [ ] Price summary

### 10) Checkout
- [ ] Address selection
- [ ] Payment method selection
- [ ] Summary
- [ ] Voucher application
- [ ] Review order

### 11) Order Confirmation
- [ ] Confirmation screen exists
- [ ] Order summary/reference shown

### 12) Orders List
- [ ] Lists orders
- [ ] Opens Order Detail

### 13) Order Detail + Chat
- [ ] Order status visible
- [ ] Items visible
- [ ] Order-based chat present (text only)

### 14) Review Submission
- [ ] Review form exists
- [ ] Rating input exists
- [ ] Submit works

### 15) Profile
- [ ] Personal info
- [ ] Quick links to address book/following

### 16) Following Shops
- [ ] List of followed shops
- [ ] Ability to open shop/storefront

### 17) Address Book
- [ ] Add address
- [ ] Edit address
- [ ] Delete address
- [ ] Select default address (if supported)

---

## 🟧 SELLER DASHBOARD (Web – React)

### 1) Seller Login / Signup
- [ ] Seller login exists
- [ ] Seller signup exists

### 2) Dashboard Overview
- [ ] Stats visible:
  - [ ] Orders today
  - [ ] Revenue
  - [ ] Pending orders

### 3) Store Profile Page
- [ ] Store info editable (name/logo/details)
- [ ] Save/update works

### 4) Product Management
- [ ] Product list screen
- [ ] Add product screen/flow
- [ ] Edit product screen/flow
- [ ] Flash sale settings per product
- [ ] Deactivate product toggle/action

### 5) Order Management
- [ ] Order list screen
- [ ] Order detail screen
- [ ] Update order status works
- [ ] Order-based chat with buyer (text only)

### 6) Earnings Dashboard (View-Only Wallet)
- [ ] Total earnings shown
- [ ] Pending payout shown
- [ ] Last payout shown
- [ ] Next payout shown
- [ ] Payout history list shown

### 7) Reviews Page
- [ ] Shows ratings/reviews for seller products

---

## 🟥 ADMIN PANEL PAGES

### 1) Login
- [ ] Admin login exists

### 2) Dashboard (Overview)
- [ ] Sellers count
- [ ] Buyers count
- [ ] Sales metric
- [ ] Product requests metric

### 3) Sellers Management
- [ ] Approve seller
- [ ] Reject seller
- [ ] Suspend seller

### 4) Buyers List
- [ ] Buyers table/list exists

### 5) Products Management
- [ ] All products list
- [ ] Deactivate product action

### 6) Categories Management
- [ ] Add category
- [ ] Edit category
- [ ] Delete category

### 7) Orders Management
- [ ] List all orders
- [ ] Override statuses capability

### 8) Product Requests Dashboard
- [ ] List all requests
- [ ] Vote count shown
- [ ] Status updates supported

### 9) Voucher Management
- [ ] Create vouchers
- [ ] Edit vouchers

### 10) Flash Sale Management
- [ ] Pick products for flash sale
- [ ] Set flash price
- [ ] Set schedule (start/end)

### 11) Payout Management
- [ ] Generate payout batch
- [ ] Mark payout as paid
- [ ] Add reference number

### 12) Reviews Management
- [ ] View reviews
- [ ] Hide/delete abusive reviews

---

## ⭐ BONUS: DESIGN PRIORITY (UI Must-Haves)

### 1) Product Cards Must Be Clear
- [ ] Big product image
- [ ] Price visible
- [ ] Flash sale badge (when applicable)
- [ ] Rating visible

### 2) Clean Seller Storefront
- [ ] Logo visible
- [ ] “Follow Shop” button prominent
- [ ] Product grid clean layout

### 3) Multi-Seller Cart Grouping Must Be Obvious
- [ ] Clear seller header blocks
- [ ] Subtotals per seller (recommended)

### 4) Order Chat UX (Simple Like Messenger)
- [ ] Text-only messages
- [ ] Clean message bubbles layout
- [ ] Tied to order context

### 5) Product Request Feature Must Feel Premium
- [ ] High-quality modal/page layout
- [ ] Clear CTA and copy
- [ ] Confirmation state after submit

### 6) Flash Sale Must Feel Exciting
- [ ] Strong visual badge
- [ ] Countdown/timer (recommended)
- [ ] Prominent discount/flash pricing

### 7) Admin Panel Must Be Operationally Clean
- [ ] Tables are readable
- [ ] Filters present where needed
- [ ] Bulk actions (optional but recommended)

---

## ✅ V1 COMPLETION RULE
V1 is considered **complete** only if:
- [ ] Every page/screen above exists
- [ ] Every must-have item is implemented
- [ ] No extra pages/screens outside this scope are required for launch