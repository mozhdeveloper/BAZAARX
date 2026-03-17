---
description: "Project-wide AI assistant standard for BAZAARX. Governs all prompts, planning, and code generation."
---

# BAZAARX — AI Assistant Standard

## Project Context

- **Project**: BAZAARX — a full-stack marketplace platform
- **Developer**: Full-stack developer (sole owner of all decisions)
- **Stack**: React.js + Vite (web), Expo React Native (mobile), Supabase (backend/database)
- **Structure**: `web/` (web app), `mobile-app/` (mobile app), `supabase/` (database/functions)

---

## Global Rules (Apply to Every Prompt)

- Keep implementations **simple** — do not over-architect
- Make **only the changes requested** — do not refactor unrelated code
- Do **not** add unnecessary comments, docstrings, or type annotations to untouched code
- Do **not** create new files unless strictly necessary — prefer editing existing files
- Always consider **security** (OWASP Top 10) and **accessibility** in every change
- Never start implementation without the developer's explicit permission when a plan is involved
- When in doubt, **ask** before assuming scope

---

## Workflow: When to Use Each Standard

### Planning a Feature or Change → Follow `plan.md`

When the request involves designing, scoping, or planning new functionality:

1. Read `plan.md` for the full planning standard
2. Output the plan into `/docs/plans/<requirement_name>.plan.md`
3. Iterate with the developer until the plan is approved
4. **Do NOT implement until given permission**

### Implementing / Generating Code → Follow `codegen.md`

When the request involves writing, modifying, or generating actual code:

1. Read `codegen.md` for the full code generation standard
2. Work step-by-step through the implementation plan (if one exists)
3. Limit changes to **no more than 20 files per step**
4. End each step with a summary and any required user instructions

---

## Project Conventions

- Environment variables live in `.env` — never commit them
- Supabase migrations go in `supabase-migrations/`
- Shared documentation goes in `docs/`
- Plans go in `docs/plans/`
- Always validate against the existing database schema before modifying Supabase queries
- Mobile and web share Supabase as the single source of truth — keep logic consistent across both

---

## Files Excluded from Git

The following files are local AI standards and are **never committed**:

- `general.md`
- `plan.md`
- `codegen.md`

---

## Session Log — March 9, 2026

### Feature — Seller `notifySellerOrderReceived` + Seller Badge Real-Time Subscriptions

**Prompt:** Add seller notification when buyer confirms receipt of an order. Fix seller notification badge to update in real-time.

**Files Changed:**
1. `web/src/services/notificationService.ts`
   - Added `notifySellerOrderReceived()` method
2. Web seller badge subscription components
   - Fixed real-time Supabase subscriptions for seller notification badges in web and mobile

---

### Feature — Buyer Notifications: New Messages + Badges (Web + Mobile)

**Prompt:** "Do the same to the buyer's end. Add badge to bell icon AND message icon."

**Files Changed:**
1. `web/src/services/notificationService.ts`
   - Added `notifyBuyerNewMessage()` method
2. `web/src/services/chatService.ts`
   - Added seller→buyer notification call inside `sendMessage()` so buyer gets notified of new seller messages
3. `web/src/components/Header.tsx`
   - Added Messages icon badge using real-time `subscribeToNotifications` for unread message count
4. `web/src/components/NotificationsDropdown.tsx`
   - Added real-time subscription to auto-refresh on new notifications
   - Added icon style handling for `return` and `message` notification types
5. `web/src/components/OrderDetailsModal.tsx`
   - Fixed confirm action to fire `notifyBuyerOrderStatus` to the DB (not just local state)
6. `web/src/pages/SellerOrders.tsx`
   - Same fix as `OrderDetailsModal` — confirm fires DB notification to buyer
7. `mobile-app/src/components/BuyerBottomNav.tsx`
   - Added Messages badge with 30-second polling for unread message count
8. `mobile-app/App.tsx`
   - Added `tabBarBadge` to the Messages tab using same 30-second interval

---

### Bug Fix — Mobile SellerDrawer Message Badge Not Showing

**Prompt:** "The message notification badge in mobile side bar for seller is not showing."

**Root Cause:** Badge count was fetched only once on mount and never updated. Also, the seller `chatService.getUnreadCount` only queried conversations directly linked to seller ID, missing conversations linked via `products → order_items → orders → conversations`.

**Files Changed:**
1. `mobile-app/src/components/SellerDrawer.tsx`
   - Added real-time Supabase listener for new messages
   - Added refresh trigger when drawer opens (re-fetches badge count on open)
2. `mobile-app/src/services/chatService.ts`
   - Fixed `getUnreadCount` for seller to also query conversations via the `products → order_items → orders → conversations` join path

---

### Bug Fix — Mobile Buyer Notification Routing (Message → Chat, Return → ReturnDetail)

**Prompt:** "In buyer mobile notification, for example notification of new messages when I click it, it is redirecting to different tabs not in messages. Fix all of it."

**Root Cause:** Message notifications were navigating to `Orders` screen. Return notifications were also navigating to `Orders` instead of `ReturnDetail`.

**Files Changed:**
1. `mobile-app/app/NotificationsScreen.tsx`
   - Message notifications (`type.includes('message')`) now look up the conversation by `conversationId` from `action_data` and navigate to `Chat` screen with the correct conversation object
   - Return notifications with a `returnId` now navigate to `ReturnDetail` instead of `Orders`

---

## Session Log — March 10, 2026

### Bug Fix 1 — `OrderDetailPage.tsx:92 "Order not found or access denied"` (Web)

**Prompt:** "Check all the codes that are related to this. Don't change the code I just want you to check in web also it has error: `OrderDetailPage.tsx:92 Order not found or access denied`. Fix all of it."

**Root Cause:**
- `sellerStore.ts` was passing `id.slice(-8)` (a truncated UUID fragment, e.g. `"cf3a4b2e"`) as `orderNumber` to `notifyBuyerOrderStatus`
- `notificationService` stored `action_data.orderNumber = "cf3a4b2e"` and `action_url = "/order/cf3a4b2e"`
- `NotificationsDropdown.tsx` navigated to `/order/cf3a4b2e`
- `orderReadService.getOrderDetail` detected it was not a full UUID → queried `order_number = "cf3a4b2e"` → found no match or a wrong order → returned `null`
- `OrderDetailPage` logged the error and redirected to `/orders`

**Files Changed:**
1. `web/src/components/NotificationsDropdown.tsx`
   - Changed `handleNotificationClickDb` to prefer `data.orderId` (full UUID, always correct) over `data.orderNumber` for navigation
   - Return notifications (`return_*` type) now use `action_url` directly (which already contains the correct return detail URL)
2. `web/src/stores/sellerStore.ts` (line ~1994)
   - Changed `orderNumber: id.slice(-8)` → `orderNumber: order.orderNumber || id.slice(-8)` so the real DB order number is used when available

**Known Remaining Minor Issue:**
- `web/src/services/orderService.ts` `getOrderNumberLabel()` has a fallback `orderId.substring(0, 8)` — only affects notification display text, not navigation (safe)

---

### Investigation 2 — Cancelled Order Notification Routing (Web, Read-Only)

**Prompt:** "Check all the codes that are related to this. Don't change the code I just want you to check the notifications in web and in buyer cancelled order when I click it, it is directing to different product not the one that is really cancelled."

**Finding:**
- The same root cause as Bug Fix 1 above — the `id.slice(-8)` fragment stored as `orderNumber` could coincidentally match another order's `order_number` column in the DB, causing the wrong order to load
- The two fixes already applied in Bug Fix 1 resolve this as well:
  - `NotificationsDropdown.tsx` now navigates via `data.orderId` (UUID) — always routes to the correct order
  - `sellerStore.ts` now passes the real `order.orderNumber` when available
- No additional code changes were required

---

### Bug Fix 3 — Mobile Seller Notifications — All Icons Were `Bell` (Mobile)

**Prompt:** "Check all the codes that are related to this. Don't change the code I just want you to check the mobile seller, make it similar to other notifications that icons is different from each other. Check the notification code in web for reference. Fix it."

**Root Cause:**
- `mobile-app/app/seller/notifications.tsx` used a hardcoded `<Bell>` icon for every notification card regardless of type
- The buyer `NotificationsScreen.tsx` already had a `getStyles()` helper with per-type icon/color/background logic

**File Changed:**
- `mobile-app/app/seller/notifications.tsx`
  - Added imports: `ShoppingBag`, `XCircle`, `CheckCircle`, `RotateCcw`, `MessageSquare`, `Package`, `Star`, `Truck`
  - Added `getNotificationStyles(type)` helper matching the same pattern as the buyer screen:
    - `new_order` → `ShoppingBag`, green
    - `received` → `CheckCircle`, teal
    - `cancelled` / `cancellation` → `XCircle`, red
    - `return` → `RotateCcw`, orange
    - `message` → `MessageSquare`, purple
    - `product` / `verification` / `sample` → `Package`, indigo
    - `review` → `Star`, amber
    - `shipped` / `delivered` → `Truck`, orange
    - default → `Bell`, gray
  - Updated `renderItem` to call `getNotificationStyles(item.type)` and render a colored + bordered icon circle
  - Removed the static `backgroundColor: '#F3F4F6'` from the `notificationIcon` style (now applied dynamically per type)

---

## Session Log — March 11, 2026

### Feature — `BackToShopButton` on Flash Sale Screens (Mobile + Web)

**Prompt:** "Add a Back to Shop button on the Flash Sale screen."

**Root Cause / Context:**
- `BackToShopButton.tsx` had never been committed — it existed only as an untracked file
- `FlashSaleScreen.tsx` had a stash that only contained the import but not the JSX placement
- The web `FlashSalesPage.tsx` "Back" button navigated to `'/'` instead of `'/shop'`

**Files Changed:**
1. `mobile-app/src/components/BackToShopButton.tsx` *(new file — committed for first time)*
   - Navigates to `MainTabs → Shop` on press, styled with brand orange
2. `mobile-app/app/FlashSaleScreen.tsx`
   - Added `BackToShopButton` import
   - Added JSX placement between `</LinearGradient>` header and `<ScrollView>` with `paddingHorizontal: 16, paddingTop: 12` wrapper
3. `web/src/pages/FlashSalesPage.tsx`
   - Changed "Back" button to `navigate('/shop')` and updated label to "Back to Shop"

**Commit:** `feat: add BackToShopButton to FlashSale screens` — pushed to `origin/dev`

---

### Bug Fix — JSX Syntax Error in `FlashSaleScreen.tsx`

**Prompt:** (Bundling error surfaced after push)

**Root Cause:**
- `{/* Products Area */` was missing the closing `}`, making `<ScrollView>` an adjacent sibling JSX element
- Error: `Adjacent JSX elements must be wrapped in an enclosing tag` at line 221

**File Changed:**
1. `mobile-app/app/FlashSaleScreen.tsx`
   - Fixed `{/* Products Area */` → `{/* Products Area */}`

---

### Bug Fix — `invalid input syntax for type uuid: "2"` in `ProductDetailScreen` (Mobile)

**Prompt:** (Runtime error surfaced when tapping a product card in FlashSaleScreen)

**Root Cause:**
- `ProductDetailScreen.tsx` imported `trendingProducts` from the local mock data file `src/data/products.ts`
- That file uses numeric string IDs (`'1'`, `'2'`, `'3'`, …) instead of UUIDs
- The "You Might Also Like" section rendered those mock products; tapping one navigated with `id: "2"`
- Supabase rejected `"2"` as `invalid input syntax for type uuid`

**File Changed:**
1. `mobile-app/app/ProductDetailScreen.tsx`
   - Removed `import { trendingProducts } from '../src/data/products'`
   - Removed `const relatedProducts = trendingProducts.filter(...).slice(0, 4)` computed variable
   - Added `const [relatedProducts, setRelatedProducts] = useState<any[]>([])`
   - Added `useEffect` keyed on `product.category_id` that calls `productService.getProducts({ categoryId, limit: 5 })`, filters out the current product, slices to 4, and normalizes `image` / `seller` fields for `ProductCard` compatibility

---

### Feature — `BackToShopButton` on Mobile `ProductDetailScreen`

**Prompt:** "Add back to shop button to the mobile buyer module, in every product detail page."

**Files Changed:**
1. `mobile-app/app/ProductDetailScreen.tsx`
   - Added `import BackToShopButton from '../src/components/BackToShopButton'`
   - Replaced standalone `ArrowLeft` back-arrow `Pressable` with a row (`flexDirection: 'row', justifyContent: 'space-between'`) containing the back arrow on the left and `<BackToShopButton navigation={navigation} />` on the right

---

### Feature — Web Buyer Back Buttons → "Back to Shop" (Web)

**Prompt:** "In web buyer module, make the back button shown as back to shop button for all the pages like cart, orders etc., then make the route of back to shop button to shop."

**Files Changed (all changed `navigate(-1)` → `navigate('/shop')` and label "Back" → "Back to Shop"):**
1. `web/src/pages/EnhancedCartPage.tsx`
2. `web/src/pages/OrdersPage.tsx`
3. `web/src/pages/OrderDetailPage.tsx`
4. `web/src/pages/CheckoutPage.tsx`
5. `web/src/pages/ProductDetailPage.tsx` *(both back buttons — main page and "not found" fallback)*
6. `web/src/pages/BuyerProfilePage.tsx`
7. `web/src/pages/BuyerReviewsPage.tsx`
8. `web/src/pages/BuyerSettingsPage.tsx`
9. `web/src/pages/BuyerSupport.tsx`
10. `web/src/pages/BuyerAnnouncementsPage.tsx`
11. `web/src/pages/BuyerProductRequestsPage.tsx`
12. `web/src/pages/BuyerFollowingPage.tsx` *(was icon-only; added "Back to Shop" label)*

---

### Bug Fix — `messages` 400 Error (`GET /messages?select=content%2C...`)

**Prompt:** (Runtime error surfaced after messages fix from previous session)

**Root Cause:**
- `chatService.ts` called `.select('content, message_content, message_type, created_at')` on the `messages` table
- Live DB only has `content` — `message_content` and `message_type` do not exist → Supabase returns 400 when selecting non-existent columns

**Files Changed:**
1. `web/src/services/chatService.ts`
   - `getConversationStats()` select: `'content, message_content, message_type, created_at'` → `'content, created_at'`
   - `getConversationStats()` display logic: removed `message_type === 'system'` branch → `lastMsg?.content || ''`
   - `getMessages()` map: removed `message_type === 'system' ? message_content : content` → just `msg.content`
   - `subscribeToMessages()` real-time handler: removed dead `message_type` branch

---

### Bug Fix — Notification Badges Not Showing (Web + Mobile, Buyer + Seller)

**Prompt:** "In web and mobile buyer's module the notification badge in messages is not showing. The in mobile the notification badge of notification and messages in the sidebar of the seller is not showing as well. Then the icon of notification in seller is not updated."

**Root Cause:**
- Web `Header.tsx`: Messages button had no badge or unread count logic at all
- Mobile `App.tsx`: Messages tab had no `tabBarBadge`
- Mobile `SellerDrawer.tsx`: Notifications and Messages menu items had no badge indicators
- Mobile `seller/notifications.tsx`: `renderItem` used a hardcoded `<Bell>` for every notification regardless of type

**Files Changed:**
1. `web/src/components/Header.tsx`
   - Added import for `chatService`
   - Added `unreadMessageCount` state with 30-second polling via `chatService.getUnreadCount(profile.id, 'buyer')`
   - Clears count automatically when user navigates to `/messages`
   - Added `<Badge>` (red, 9+) on the Messages button
2. `mobile-app/App.tsx`
   - In `MainTabs()`: added `unreadMsgCount` state polling `chatService.getUnreadCount(user.id, 'buyer')` every 30s
   - Added `tabBarBadge` to the Messages tab (shows `9+` above 9)
3. `mobile-app/src/components/SellerDrawer.tsx`
   - Added imports for `chatService` and `notificationService`
   - Added `unreadMsgCount` + `unreadNotifCount` states, fetched when `visible` becomes `true`
   - Renders a red `badgePill` next to the Notifications and Messages menu items
   - Added `badgePill` / `badgePillText` styles (red bg, white text, rounded)
4. `mobile-app/app/seller/notifications.tsx`
   - Added icon imports: `ShoppingBag`, `XCircle`, `CheckCircle`, `RotateCcw`, `MessageSquare`, `Package`, `Star`, `Truck`
   - Added `getNotificationStyles(type)` helper with per-type icon/color/bg/border
   - Updated `renderItem` to use computed icon and colors with colored bordered circle (read state dims to gray)
   - Removed static `backgroundColor: '#F3F4F6'` from `notificationIcon` style (now set dynamically)

---

### Git — Rebase `feat/notification-badge` onto `origin/dev`

**Prompt:** `git rebase origin/dev` → `error: cannot rebase: You have unstaged changes.`

**Root Cause:**
- All March 11 changes were unstaged (modified but not yet committed) across both `web/` and `mobile-app/`
- Git blocks rebase when there are unstaged changes

**Resolution:**
```bash
git stash
git rebase origin/dev
git stash pop
git push origin feat/notification-badge
```

**Outcome:** Branch `feat/notification-badge` successfully pushed to `origin`. Pull request available at `https://github.com/mozhdeveloper/BAZAARX/pull/new/feat/notification-badge`.

---

## Session Log — March 13, 2026

### Feature + Bug Fix — Buy Again Should Add to Cart First (Web + Mobile)

**Prompt:** "I want that if clicked the items will go to the cart first then the buyer can change the variant, color, sizes etc. that they prefer before proceeding to checkout."

**Scope Implemented:**
- Buy Again now adds order items to cart first (instead of immediate checkout bypass)
- Cart becomes the editing step for variants/options before checkout

**Files Changed:**
1. `web/src/pages/OrderDetailPage.tsx`
   - Updated Buy Again handler to add items into cart and route to enhanced cart
2. `web/src/pages/OrdersPage.tsx`
   - Applied the same cart-first Buy Again behavior

---

### Bug Fix — FK Constraint Error on Buy Again for Missing Products

**Prompt:** Runtime failure while adding reordered items to cart:
`insert or update on table "cart_items" violates foreign key constraint ... product_id ... is not present in table "products"`

**Root Cause:**
- Some historical order items referenced products no longer present in `products`
- Buy Again attempted direct DB insert, causing FK violation

**Files Changed:**
1. `web/src/stores/buyerStore.ts`
   - Added product existence checks and safe fallback behavior when product is missing
2. `mobile-app/src/services/cartService.ts`
   - Added product existence verification before insert to avoid FK failures
3. `mobile-app/src/stores/cartStore.ts`
   - Added graceful local fallback for missing-product reorder items

---

### Bug Fix — Duplicate Error/Warn Logs During Fallback

**Prompt:** "There are redundant logs and warnings."

**Root Cause:**
- Error handling/logging occurred in multiple layers for the same missing-product event

**Files Changed:**
1. `mobile-app/src/services/cartService.ts`
   - Consolidated error flow and rethrow strategy
2. `mobile-app/src/stores/cartStore.ts`
   - Simplified fallback logging path to avoid duplicate console noise

---

### Bug Fix — Mobile Buy Again Navigated Before Cart Add Completed

**Prompt:** "In mobile it is not adding to the cart, it is just rerouting there."

**Root Cause:**
- `addItem()` was effectively fire-and-forget from Buy Again handlers
- Navigation to Cart happened before async item adds completed

**Files Changed:**
1. `mobile-app/src/stores/cartStore.ts`
   - Made `addItem()` async-returning and awaitable
2. `mobile-app/app/OrdersScreen.tsx`
   - Updated `handleBuyAgain()` to await all add operations before navigation
3. `mobile-app/app/HistoryScreen.tsx`
   - Applied the same await-all behavior

---

### Bug Fix — Reordered Items Appeared Then Disappeared in Mobile Cart

**Prompt:** "It is showing then it is disappearing again"

**Root Cause:**
- Cart refresh replaced local fallback items with DB-only results on focus
- Local fallback items were removed by subsequent refreshes/DB sync paths

**Files Changed:**
1. `mobile-app/src/stores/cartStore.ts`
   - Added merge strategy to preserve local fallback items during DB refresh
   - Updated remove/update/remove-multiple logic to handle local-only cart rows safely

---

### Feature — Auto-Select Buy Again Items in Mobile Cart

**Prompt:** "I want that if the item added to cart when I clicked buy again, it will auto select it also."

**Implementation:**
- Buy Again now tracks returned `cartItemId` values for newly added items
- Cart screen receives those IDs via navigation params and auto-selects them on arrival

**Files Changed:**
1. `mobile-app/src/stores/cartStore.ts`
   - `addItem()` now returns the created/updated cart item ID (or local fallback ID)
2. `mobile-app/app/OrdersScreen.tsx`
   - Passes `autoSelectCartItemIds` param to Cart after Buy Again
3. `mobile-app/app/HistoryScreen.tsx`
   - Passes `autoSelectCartItemIds` param to Cart after Buy Again
4. `mobile-app/app/CartScreen.tsx`
   - Reads `autoSelectCartItemIds`, applies selection, then clears param

---

### Status Snapshot (End of March 13 Session)

- Buy Again cart-first behavior is implemented on web and mobile
- Missing-product reorder flow no longer crashes on FK insert
- Mobile Buy Again now awaits item insertion before route transition
- Local fallback cart items persist and are no longer wiped on refresh
- Newly added Buy Again items auto-select in mobile cart
- Pending follow-up: remove remaining checkout bypass logic still tied to buy-again mode in web checkout path

---

## Session Log — March 17, 2026

### Feature — Realtime Notifications Architecture (Parallelization + Realtime-First Pattern)

**Prompt:** "Order Confirmed by Seller notification is real time but slow to appear" → "Message notification and badge in mobile and web is not real time or just slow" → "In mobile seller's module notification and notification badges, it is slow to appear" → "If buyer cancel the order, should notify seller AND make seller notification page no need to load and automatically appear"

**Root Cause / Context (Multi-Phase Issue):**
- Order status notifications awaited sequential dispatches (chat message → bell notification) instead of parallel
- Chat subscription only partially listened to message inserts; badge consumers relied on 20-30s polling
- Notification subscription callbacks still queried count instead of instant state increment
- Buyer cancellation had NO seller notification path in web atomic RPC — only in mobile orderService
- Seller notification pages required manual refresh UI to see new notifications

**Phase 1 — Parallelized Order Status Notifications:**
1. `web/src/services/orderService.ts` + `mobile-app/src/services/orderService.ts`
   - Changed `dispatchStatusNotifications()`: `Promise.allSettled()` for chat message + bell notification in parallel instead of sequential await

**Phase 2 — Extended Chat Subscriptions + Badge Realtime:**
1. `web/src/services/chatService.ts` + `mobile-app/src/services/chatService.ts`
   - `subscribeToConversations()`: Now listens to both conversations table (all events) AND messages table (INSERT only)
   - Consolidated change handler for both event types
2. `web/src/components/Header.tsx`
   - Added buyer message badge with realtime `subscribeToConversations()` callback
   - Fallback polling reduced to 5s (was 30s)
3. `web/src/components/seller/BaseSellerSidebar.tsx`
   - Added realtime subscriptions for both chat AND notifications (separate subscriptions)
   - Fallback polling reduced to 5s (was 20-30s)
4. `mobile-app/App.tsx`
   - Added buyer message badge realtime subscription
   - Fallback polling reduced to 5s (was 30s)
5. `mobile-app/src/components/SellerDrawer.tsx`
   - Added notification badge with instant increment pattern: callback increments state immediately, then background reconciles with DB count
   - Fallback polling reduced to 1s (was 2-5s)
6. `mobile-app/app/seller/(tabs)/dashboard.tsx`
   - Added notification badge with same instant-increment + background-reconcile pattern
   - Fallback polling reduced to 1s (was 2-5s)

**Phase 3 — Notification Subscription Robustness:**
1. `mobile-app/src/services/notificationService.ts`
   - `subscribeToNotifications()`: Unique channel names `${table}_${userId}_${Date.now()}` to prevent collision
   - Listens to both INSERT AND UPDATE events on notification table
   - Subscription status logging added

**Phase 4 — Buyer Cancellation → Seller Notification:**
1. `web/src/services/notificationService.ts` + `mobile-app/src/services/notificationService.ts`
   - Added `notifySellerOrderCancelled()` helper with type `'seller_order_cancelled'`, icon `'XCircle'`, priority `'high'`
2. `mobile-app/src/services/orderService.ts`
   - `cancelOrder()`: Detects buyer-initiated cancellation, resolves seller from order_items, fetches buyer profile name, calls `notifySellerOrderCancelled()`
3. `web/src/services/orders/orderMutationService.ts` (Critical RPC Path Fix)
   - After `supabase.rpc("cancel_order_atomic")` succeeds, added logic to:
     - Detect if `changedByRole === "buyer"` and `cancelledBy` exists
     - Fetch order with buyer_id + order_items with seller_id
     - Fetch buyer profile for name
     - Call `notifySellerOrderCancelled()` fire-and-forget
   - This patch was critical because web's atomic RPC completely bypassed orderService notification logic

**Phase 5 — Remove Manual Refresh UI from Seller Notifications:**
1. `mobile-app/app/seller/notifications.tsx`
   - Removed `RefreshControl` import, `refreshing` state, `onRefresh()` handler, `refreshControl` prop from FlatList
   - Changed `addNotificationToState()` → `upsertNotificationInState()` to handle both new inserts and mark-as-read updates
   - Kept 1s background polling as silent safety net; realtime is primary
2. `web/src/pages/SellerNotifications.tsx`
   - Removed `RefreshCw` icon import and Refresh button from filter controls
   - Added realtime subscription in `useEffect`: `notificationService.subscribeToNotifications()` triggers `upsertNotificationInState()`
   - Replaced loading spinner icon from `<RefreshCw>` to CSS-based spinner
   - Notifications now update automatically when new notifications arrive via Supabase realtime

**Realtime Architecture Summary:**
- Chat subscriptions: Listen to conversations table (all events) + messages table (INSERT only)
- Notification subscriptions: Listen to notifications table (INSERT + UPDATE) with unique channel names
- Badge update pattern: Callback increments state instantly → background polling reconciles with DB count
- Fallback polling: 5s (web badges), 1s (mobile seller badges), 1s (seller notifications page)

**Files Changed Summary (11 files):**
1. `web/src/services/orderService.ts` — Parallelize status notifications
2. `web/src/services/chatService.ts` — Extend subscription to message inserts
3. `web/src/services/notificationService.ts` — Add `notifySellerOrderCancelled()` helper
4. `web/src/components/Header.tsx` — Realtime message badge subscription
5. `web/src/components/seller/BaseSellerSidebar.tsx` — Realtime chat + notification subscriptions
6. `web/src/pages/SellerNotifications.tsx` — Remove refresh button, add realtime subscription
7. `web/src/services/orders/orderMutationService.ts` — Patch atomic RPC path for buyer cancellation notification
8. `mobile-app/src/services/orderService.ts` — Parallelize status + add cancellation notification
9. `mobile-app/src/services/chatService.ts` — Extend subscription to message inserts
10. `mobile-app/src/services/notificationService.ts` — Robustify subscriptions, add `notifySellerOrderCancelled()`
11. `mobile-app/App.tsx` — Realtime message badge subscription
12. `mobile-app/src/components/SellerDrawer.tsx` — Instant badge increment + background polling
13. `mobile-app/app/seller/(tabs)/dashboard.tsx` — Instant badge increment + background polling
14. `mobile-app/app/seller/notifications.tsx` — Remove refresh UI, add realtime upsert subscription

**Testing / Validation:**
- All modified files compile without errors (TypeScript)
- No new runtime errors introduced
- Realtime subscriptions remain in place with fallback polling as safety net

**Known Limitations:**
- Fallback polling still in place (1-5s); realtime might miss rare events — acceptable per design
- Notification page still does 1s polling as background reconciliation (UI-primary is realtime)

**Continuation Context:**
All user requests from this session have been completed:
1. ✅ Order Confirmed notification now appears faster (parallelized dispatch)
2. ✅ Message notifications and badges now real-time on web and mobile
3. ✅ Seller mobile notification badges now instant
4. ✅ Buyer cancellation now notifies seller on both web (RPC path) and mobile (orderService path)
5. ✅ Seller notification pages now automatically update in real-time without manual refresh

Realtime notification system is now primary with polling as secondary safety net across all surfaces.

---

### Feature — Seller Notification When Buyer Confirms Order Receipt (Web + Mobile)

**Prompt:** "Confirm Order by the buyer is not notifying to the seller in both web and mobile."

**Root Cause:**
- `confirmOrderReceived()` method existed in both orderService files
- Method updated shipment_status and order_status_history correctly
- **Missing**: No seller notification dispatch after confirmation

**Implementation:**
1. `web/src/services/notificationService.ts` + `mobile-app/src/services/notificationService.ts`
   - Added `notifySellerOrderReceived()` helper with:
     - Type: `'seller_order_received'`
     - Icon: `'CheckCircle'` (green-500)
     - Title: "Order Received by Buyer"
     - Priority: `'normal'`
     - Signature: `{ sellerId, orderId, orderNumber, buyerName? }`

2. `web/src/services/orderService.ts`
   - `confirmOrderReceived()`: Added fire-and-forget async block after order_status_history insert
   - Fetches order_items with seller_id via products join
   - Resolves unique sellers (supports multi-seller orders)
   - Fetches buyer name
   - Calls `notifySellerOrderReceived()` for each seller without blocking confirmation

3. `mobile-app/src/services/orderService.ts`
   - Applied same fire-and-forget pattern as web
   - Resolves sellers from order_items, sends notifications asynchronously

**Result:**
- When buyer confirms receipt of delivered order, seller receives notification instantly (realtime) or within 10s (polling fallback)
- Works for single-seller and multi-seller orders
- Notification routes seller to order detail page

---

### Bug Fix — Mobile Seller Notification Icon Consistency for "Order Received"

**Prompt:** "The icon of order received by buyer notification is not same as in web. Make it always the same icon."

**Root Cause:**
- Mobile `getNotificationStyles()` used teal colors for 'received' notifications (CheckCircle with #0D9488)
- Web used green colors for the same (CheckCircle with green-600)
- Color mismatch made notifications visually inconsistent across platforms

**Files Changed:**
1. `web/src/pages/SellerNotifications.tsx`
   - Added explicit check for `type.includes("received")` → CheckCircle (green-600), bg-green-50
   - Ensures "order received" notifications render with consistent green styling

2. `mobile-app/app/seller/notifications.tsx`
   - Changed 'received' notification colors from teal to green:
     - Icon color: #0D9488 (teal) → #16A34A (green)
     - Background: #CCFBF1 (teal) → #F0FDF4 (light green)
     - Border: #99F6E4 (teal) → #DCFCE7 (green)

**Result:**
- "Order Received by Buyer" notifications now display with identical green CheckCircle icon on both web and mobile
- Visual consistency maintained across platforms

