# BazaarPH Comprehensive Test Plan
## Web, Mobile, Frontend, Backend & POS Testing

**Last Updated:** January 2025  
**Version:** 1.0  

---

## 📊 TEST DATA SUMMARY

### Accounts Ready for Testing

| Role | Email | Password | Notes |
|------|-------|----------|-------|
| **Admin** | admin@bazaarph.com | Admin123! | Full admin access |
| **QA** | qa@bazaarph.com | QA123456! | QA admin access |
| **Seller 1** | seller1@bazaarph.com | Seller123! | TechHub Manila - Tech products |
| **Seller 2** | seller2@bazaarph.com | Seller123! | Fashion Forward PH - Fashion |
| **Seller 3** | seller3@bazaarph.com | Seller123! | Home & Living Co. - Home goods |
| **Buyer 1** | buyer1@bazaarph.com | Buyer123! | Ana Santos - 500 coins |
| **Buyer 2** | buyer2@bazaarph.com | Buyer123! | Juan Cruz - 1000 coins |
| **Buyer 3** | buyer3@bazaarph.com | Buyer123! | Maria Garcia - 250 coins |

### Database Contents

| Entity | Count | Details |
|--------|-------|---------|
| Categories | 8 | Electronics, Fashion, Home, etc. |
| Sellers | 3 | All verified and active |
| Buyers | 3 | With different coin balances |
| Products | 16 | ALL QA APPROVED (visible in shop) |
| Variants | 41 | Color/size/storage options |
| Total Stock | 1,110 | Units across all variants |
| Reviews | 15 | Verified purchase reviews |
| Vouchers | 4 | WELCOME10, BAZAAR50, SAVE20, TECH15 |

### Products by Seller

#### TechHub Manila (5 products)
1. iPhone 15 Pro Max - 4 variants (256GB-1TB), ₱74,990-₱99,990
2. Samsung Galaxy S24 Ultra - 3 variants, ₱69,990-₱89,990
3. AirPods Pro 2nd Gen - 1 variant, ₱14,990
4. MacBook Air M3 - 2 variants, ₱69,990-₱89,990
5. Sony WH-1000XM5 - 2 color variants, ₱19,990

#### Fashion Forward PH (5 products)
1. Premium Cotton Polo - 3 sizes, ₱1,299
2. Slim Fit Chino Pants - 3 sizes, ₱1,899
3. Floral Summer Dress - 3 sizes, ₱2,499
4. Canvas Sneakers - 3 sizes, ₱2,299
5. Leather Tote Bag - 2 colors, ₱3,499

#### Home & Living Co. (6 products)
1. Scandinavian Coffee Table - 2 colors, ₱8,999
2. Premium Cotton Bedsheet Set - 3 sizes, ₱2,999
3. Ceramic Plant Pot Set - 2 size sets, ₱1,499
4. LED Smart Light Bulb - 2 packs, ₱899
5. Aromatherapy Diffuser - 2 colors, ₱1,599
6. Bamboo Towel Set - 3 colors, ₱1,299

---

## 🧪 PHASE 1: AUTHENTICATION TESTING

### 1.1 Web Frontend - Auth Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| AUTH-W-001 | Buyer Login | 1. Go to /login<br>2. Enter buyer1@bazaarph.com / Buyer123!<br>3. Click Login | Redirected to buyer dashboard, see profile |
| AUTH-W-002 | Seller Login | 1. Go to /seller/login<br>2. Enter seller1@bazaarph.com / Seller123!<br>3. Click Login | Redirected to seller dashboard |
| AUTH-W-003 | Admin Login | 1. Go to /admin/login<br>2. Enter admin@bazaarph.com / Admin123!<br>3. Click Login | Redirected to admin dashboard |
| AUTH-W-004 | Invalid Login | Try logging with wrong password | Error message shown, no redirect |
| AUTH-W-005 | Logout Buyer | Click logout in buyer nav | Redirected to home, session cleared |
| AUTH-W-006 | Logout Seller | Click logout in seller nav | Redirected to seller login |
| AUTH-W-007 | Protected Routes | Access /seller/dashboard without login | Redirected to login page |
| AUTH-W-008 | Session Persistence | Login, refresh page | Stay logged in |

### 1.2 Mobile App - Auth Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| AUTH-M-001 | Buyer Login | Open app > Login tab > Enter credentials | Navigate to home screen |
| AUTH-M-002 | Seller Login | Open app > Seller mode > Login | Navigate to seller dashboard |
| AUTH-M-003 | Biometric Auth | Enable fingerprint, close app, reopen | Prompt for biometric, login on success |
| AUTH-M-004 | Token Refresh | Leave app idle 30min, return | Session still valid |
| AUTH-M-005 | Offline Login Error | Disconnect wifi > Try login | Show "No internet" error |
| AUTH-M-006 | Account Switch | Login as buyer > Switch to seller mode | Properly switch context |

---

## 🛒 PHASE 2: BUYER FLOW TESTING

### 2.1 Product Browsing (Web)

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| BUY-W-001 | View All Products | Go to /shop | See all 16 approved products |
| BUY-W-002 | Category Filter | Click "Electronics" category | Only tech products shown |
| BUY-W-003 | Search Products | Search "iPhone" | iPhone 15 Pro Max appears |
| BUY-W-004 | Price Filter | Set ₱1,000-₱5,000 range | Only affordable items shown |
| BUY-W-005 | Product Detail | Click on any product | See description, variants, reviews |
| BUY-W-006 | Variant Selection | Select different color/size | Price & stock updates correctly |
| BUY-W-007 | Reviews Display | View product with reviews | See star ratings and comments |
| BUY-W-008 | Image Gallery | Click product images | Gallery/lightbox opens |

### 2.2 Product Browsing (Mobile)

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| BUY-M-001 | Browse Feed | Open Home tab | Product grid displays |
| BUY-M-002 | Pull to Refresh | Pull down on product list | Products reload |
| BUY-M-003 | Infinite Scroll | Scroll to bottom | More products load |
| BUY-M-004 | Search | Tap search > Type "polo" | Polo products appear |
| BUY-M-005 | Product Detail | Tap product card | Detail screen opens |
| BUY-M-006 | Image Swipe | Swipe product images | Carousel works smoothly |
| BUY-M-007 | Variant Picker | Tap size/color options | Selection updates UI |

### 2.3 Cart & Checkout (Web)

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| CART-W-001 | Add to Cart | Click "Add to Cart" on product | Item appears in cart, count updates |
| CART-W-002 | Quantity Update | Change quantity in cart | Subtotal recalculates |
| CART-W-003 | Remove Item | Click remove on cart item | Item removed, totals update |
| CART-W-004 | Cart Persistence | Add items, refresh page | Cart items still there |
| CART-W-005 | Voucher Apply | Enter "WELCOME10" at checkout | 10% discount applied |
| CART-W-006 | Invalid Voucher | Enter "FAKECODE" | Error: "Invalid voucher" |
| CART-W-007 | Checkout Flow | Proceed to checkout | Address & payment forms show |
| CART-W-008 | Place Order | Complete checkout | Order confirmation shown |
| CART-W-009 | Order in History | After order, go to My Orders | New order appears |
| CART-W-010 | Stock Decrease | Order item, check product | Stock reduced by ordered qty |

### 2.4 Cart & Checkout (Mobile)

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| CART-M-001 | Add to Cart | Tap "Add to Cart" | Bottom sheet confirms, cart badge updates |
| CART-M-002 | View Cart | Tap cart icon | Cart screen with all items |
| CART-M-003 | Swipe to Delete | Swipe left on cart item | Delete action appears |
| CART-M-004 | Apply Voucher | Tap voucher field > Enter code | Discount applied |
| CART-M-005 | Checkout | Tap Checkout button | Address selection screen |
| CART-M-006 | Payment Method | Select payment method | Payment flow proceeds |
| CART-M-007 | Order Complete | Finish order | Success screen with order number |

### 2.5 Wishlist & Reviews

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| WISH-001 | Add to Wishlist | Click heart icon on product | Heart fills, item in wishlist |
| WISH-002 | View Wishlist | Go to My Wishlist page | All wishlisted items shown |
| WISH-003 | Remove from Wishlist | Click heart again | Item removed from wishlist |
| REV-001 | Write Review | Go to completed order > Write Review | Review form opens |
| REV-002 | Submit Review | Fill 5 stars + comment > Submit | Review appears on product |
| REV-003 | Edit Review | Click edit on own review | Can modify rating/comment |

---

## 🏪 PHASE 3: SELLER FLOW TESTING

### 3.1 Seller Dashboard (Web)

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| SELL-W-001 | Dashboard Stats | Login as seller > View dashboard | See revenue, orders, products count |
| SELL-W-002 | View Products | Go to My Products | See all seller's products |
| SELL-W-003 | Add Product | Click Add Product > Fill form | Product created (pending QA) |
| SELL-W-004 | Edit Product | Click edit on product | Form with current values |
| SELL-W-005 | Update Stock | Edit variant stock | Stock number changes |
| SELL-W-006 | Disable Product | Toggle disable on product | Product hidden from shop |
| SELL-W-007 | View Orders | Go to Orders tab | See all orders for seller |
| SELL-W-008 | Process Order | Click on pending order > Mark shipped | Order status changes |
| SELL-W-009 | Bulk Upload | Upload CSV of products | Products created from CSV |
| SELL-W-010 | Analytics | View analytics page | Charts and metrics display |

### 3.2 Seller Dashboard (Mobile)

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| SELL-M-001 | Dashboard | Open seller app | Stats cards displayed |
| SELL-M-002 | Products List | Tap Products tab | All products listed |
| SELL-M-003 | Add Product | Tap + button | Product form opens |
| SELL-M-004 | Camera Upload | Tap camera icon in form | Camera opens, can take photo |
| SELL-M-005 | Orders List | Tap Orders tab | Orders with status badges |
| SELL-M-006 | Order Detail | Tap order | Full order details |
| SELL-M-007 | Update Status | Change order status | Status updates, buyer notified |

### 3.3 Inventory Management

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| INV-001 | View Stock Levels | Go to Inventory | See all variants with stock |
| INV-002 | Low Stock Alert | Product hits low threshold | Warning indicator shown |
| INV-003 | Stock Ledger | Click stock history | See all stock movements |
| INV-004 | Adjust Stock | Manual stock adjustment | Ledger entry created |
| INV-005 | Bulk Stock Update | Upload stock CSV | Multiple products updated |

---

## 🔧 PHASE 4: POS LITE TESTING

### 4.1 POS Setup & Configuration

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| POS-001 | Access POS | Login as seller > Go to POS | POS interface loads |
| POS-002 | Product Grid | View POS product grid | Seller's products displayed |
| POS-003 | Category Tabs | Click category tabs | Products filter by category |
| POS-004 | Search Product | Type in search | Products filter in real-time |
| POS-005 | Barcode Scan | Scan product barcode | Product added to cart |

### 4.2 POS Transaction Flow

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| POS-010 | Add to Cart | Click product tile | Item added to POS cart |
| POS-011 | Change Quantity | Click +/- buttons | Quantity adjusts |
| POS-012 | Remove Item | Click X on cart item | Item removed |
| POS-013 | Apply Discount | Enter discount code/amount | Price adjusted |
| POS-014 | Select Variant | Click product with variants | Variant picker shows |
| POS-015 | Cart Total | Add multiple items | Total calculates correctly |
| POS-016 | Tax Calculation | View cart breakdown | Tax computed properly |

### 4.3 POS Payment & Checkout

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| POS-020 | Cash Payment | Select Cash > Enter amount | Change calculated |
| POS-021 | Card Payment | Select Card > Process | Payment modal/flow |
| POS-022 | GCash/Maya | Select e-wallet | QR code or input shown |
| POS-023 | Split Payment | Pay half cash, half card | Both payments recorded |
| POS-024 | Complete Sale | Click Complete Sale | Receipt generated |
| POS-025 | Print Receipt | Click Print | Receipt prints/downloads |
| POS-026 | Email Receipt | Enter email > Send | Email sent to customer |

### 4.4 POS Inventory Integration

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| POS-030 | Stock Deduction | Complete sale | Inventory reduced |
| POS-031 | Out of Stock | Try selling 0-stock item | Error: "Out of stock" |
| POS-032 | Low Stock Warning | Sell item near threshold | Warning displayed |
| POS-033 | Real-time Sync | Make web sale, check POS | Stock reflects both sales |

### 4.5 POS Reports

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| POS-040 | Daily Sales | View today's sales | Accurate total and breakdown |
| POS-041 | Transaction History | View all transactions | List with details |
| POS-042 | Void Transaction | Void a sale | Stock restored, sale reversed |
| POS-043 | End of Day | Run EOD report | Summary of all transactions |
| POS-044 | Export Report | Export to CSV | File downloads |

---

## 👨‍💼 PHASE 5: ADMIN FLOW TESTING

### 5.1 Admin Dashboard

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| ADM-001 | Dashboard Overview | Login as admin | Platform stats displayed |
| ADM-002 | Seller List | Go to Sellers | All sellers listed |
| ADM-003 | Seller Approval | Approve pending seller | Seller status changes |
| ADM-004 | Seller Suspend | Suspend a seller | Seller marked suspended |
| ADM-005 | Product QA List | Go to QA Products | Pending products shown |
| ADM-006 | Approve Product | Click Approve on product | Status → approved, visible in shop |
| ADM-007 | Reject Product | Click Reject + reason | Status → rejected, reason saved |
| ADM-008 | User Management | Go to Users | All users listed |

### 5.2 QA Approval Flow

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| QA-001 | View Pending | Go to QA queue | See all pending products |
| QA-002 | Product Preview | Click on pending product | Full product details shown |
| QA-003 | Approve Single | Click Approve button | Product now approved |
| QA-004 | Bulk Approve | Select multiple > Approve All | All selected approved |
| QA-005 | Reject with Notes | Click Reject > Add notes | Product rejected, seller notified |
| QA-006 | Seller Notification | Approve product | Seller gets notification |

### 5.3 Voucher Management

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| VOU-001 | View Vouchers | Go to Vouchers | All vouchers listed |
| VOU-002 | Create Voucher | Click Add > Fill form | New voucher created |
| VOU-003 | Edit Voucher | Edit existing voucher | Changes saved |
| VOU-004 | Deactivate Voucher | Toggle voucher off | Voucher no longer works |
| VOU-005 | Usage Stats | View voucher analytics | Redemption count shown |

---

## 📱 PHASE 6: MOBILE-SPECIFIC TESTS

### 6.1 Mobile Performance

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| MOB-001 | App Launch Time | Cold start app | Under 3 seconds |
| MOB-002 | Image Loading | Browse products | Images load progressively |
| MOB-003 | Scroll Performance | Rapid scroll product list | No jank, smooth 60fps |
| MOB-004 | Memory Usage | Use app 10 minutes | No memory leaks |
| MOB-005 | Offline Mode | Disconnect internet | Graceful offline UI |
| MOB-006 | Background Resume | Background app > Resume | State preserved |

### 6.2 Push Notifications

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| NOTIF-001 | Order Update | Seller ships order | Buyer gets push notification |
| NOTIF-002 | New Review | Buyer reviews product | Seller gets notification |
| NOTIF-003 | Low Stock | Product hits threshold | Seller gets alert |
| NOTIF-004 | Tap Notification | Tap push notification | Opens relevant screen |
| NOTIF-005 | Notification Settings | Toggle notifications | Preferences saved |

### 6.3 Mobile UI/UX

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|-----------------|
| UX-001 | Bottom Nav | Tap each nav item | Correct screen loads |
| UX-002 | Gestures | Swipe back | Navigate back works |
| UX-003 | Keyboard Handling | Open text input | Keyboard doesn't cover input |
| UX-004 | Orientation | Rotate device | UI adapts properly |
| UX-005 | Dark Mode | Toggle dark mode | All screens styled correctly |
| UX-006 | Accessibility | Use screen reader | Labels read properly |

---

## 🔌 PHASE 7: BACKEND/API TESTING

### 7.1 API Endpoints

| Test ID | Endpoint | Method | Expected Result |
|---------|----------|--------|-----------------|
| API-001 | /products | GET | Returns all approved products |
| API-002 | /products/:id | GET | Returns single product with variants |
| API-003 | /cart | POST | Adds item to cart |
| API-004 | /cart | PUT | Updates cart item quantity |
| API-005 | /orders | POST | Creates new order |
| API-006 | /orders/:id | GET | Returns order details |
| API-007 | /reviews | POST | Creates product review |
| API-008 | /auth/login | POST | Returns JWT token |
| API-009 | /seller/products | GET | Returns seller's products only |
| API-010 | /admin/products/approve | PUT | Updates approval status |

### 7.2 Data Validation

| Test ID | Description | Test Case | Expected Result |
|---------|-------------|-----------|-----------------|
| VAL-001 | Required Fields | Omit product name | 400 error: "Name required" |
| VAL-002 | Price Validation | Price = -100 | 400 error: "Invalid price" |
| VAL-003 | Stock Validation | Stock = -5 | 400 error: "Invalid stock" |
| VAL-004 | Email Format | email = "notanemail" | 400 error: "Invalid email" |
| VAL-005 | Rating Range | rating = 10 | 400 error: "Rating 1-5" |
| VAL-006 | SQL Injection | name = "'; DROP TABLE--" | Input sanitized, no error |

### 7.3 Authorization

| Test ID | Description | Test Case | Expected Result |
|---------|-------------|-----------|-----------------|
| AUTH-API-001 | No Token | Call protected endpoint | 401 Unauthorized |
| AUTH-API-002 | Invalid Token | Use expired token | 401 Unauthorized |
| AUTH-API-003 | Wrong Role | Buyer calls admin endpoint | 403 Forbidden |
| AUTH-API-004 | Seller Own Data | Seller A edits Seller B's product | 403 Forbidden |
| AUTH-API-005 | Admin Access | Admin calls any endpoint | 200 OK |

### 7.4 Database Triggers

| Test ID | Description | Trigger Action | Expected Result |
|---------|-------------|----------------|-----------------|
| DB-001 | Updated At | Update any row | updated_at auto-updates |
| DB-002 | Stock Ledger | Change variant stock | Ledger entry created |
| DB-003 | Order Total | Add order items | Order total calculated |
| DB-004 | Coin Deduction | Use coins in order | Buyer coins reduced |
| DB-005 | Review Count | Add review | Product review_count updates |

---

## 🔄 PHASE 8: INTEGRATION TESTS

### 8.1 End-to-End Flows

| Test ID | Flow | Steps | Expected Result |
|---------|------|-------|-----------------|
| E2E-001 | Complete Purchase | Browse → Cart → Checkout → Pay | Order created, stock reduced |
| E2E-002 | Seller Fulfillment | Seller sees order → Ships → Completes | Order status updates through |
| E2E-003 | Review After Purchase | Complete order → Write review | Review shows on product |
| E2E-004 | Voucher Redemption | Apply voucher → Complete order | Discount applied correctly |
| E2E-005 | Stock Management | Low stock → Restock → Sell | All stock movements tracked |
| E2E-006 | POS to Inventory | POS sale | Web inventory synced |
| E2E-007 | Admin QA Flow | Product submitted → Approved → Visible | Full approval pipeline works |

### 8.2 Concurrent Operations

| Test ID | Description | Test Case | Expected Result |
|---------|-------------|-----------|-----------------|
| CONC-001 | Stock Race | 2 buyers order last item | One succeeds, one fails |
| CONC-002 | Cart Conflict | Edit cart from 2 devices | Latest update wins |
| CONC-003 | Voucher Limit | 2 users use limited voucher | Limit enforced |

---

## ✅ TEST EXECUTION CHECKLIST

### Pre-Test Setup
- [ ] All test accounts created and verified
- [ ] Database populated with test data
- [ ] All 16 products are QA approved
- [ ] Vouchers are active
- [ ] POS is configured for test sellers
- [ ] Mobile app installed on test devices

### Test Execution Priority
1. **Critical (Run First)**
   - Authentication (Phase 1)
   - Cart & Checkout (Phase 2.3-2.4)
   - POS Transaction (Phase 4.2-4.3)
   - Admin QA Flow (Phase 5.2)

2. **High Priority**
   - Product Browsing (Phase 2.1-2.2)
   - Seller Dashboard (Phase 3.1-3.2)
   - API Authorization (Phase 7.3)

3. **Medium Priority**
   - Inventory Management (Phase 3.3)
   - POS Reports (Phase 4.5)
   - Integration Tests (Phase 8)

4. **Lower Priority**
   - Mobile Performance (Phase 6.1)
   - Push Notifications (Phase 6.2)
   - Concurrent Operations (Phase 8.2)

### Sign-Off
| Phase | Tester | Date | Status | Notes |
|-------|--------|------|--------|-------|
| Phase 1 - Auth | | | ⬜ | |
| Phase 2 - Buyer | | | ⬜ | |
| Phase 3 - Seller | | | ⬜ | |
| Phase 4 - POS | | | ⬜ | |
| Phase 5 - Admin | | | ⬜ | |
| Phase 6 - Mobile | | | ⬜ | |
| Phase 7 - Backend | | | ⬜ | |
| Phase 8 - Integration | | | ⬜ | |

---

## 📝 BUG REPORT TEMPLATE

```markdown
### Bug Title
[Clear, concise description]

### Test ID
[e.g., CART-W-005]

### Environment
- Platform: Web / Mobile iOS / Mobile Android
- Browser/Version: 
- Device:
- Test Account Used:

### Steps to Reproduce
1. 
2. 
3. 

### Expected Result
[What should happen]

### Actual Result
[What actually happened]

### Screenshots/Videos
[Attach if available]

### Severity
- [ ] Critical (Blocker)
- [ ] High (Major feature broken)
- [ ] Medium (Feature works with issues)
- [ ] Low (Minor/cosmetic)

### Additional Notes
[Any other relevant information]
```

---

*This test plan covers all major flows for BazaarPH. Execute tests in priority order and document all findings using the bug report template.*
