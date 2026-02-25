# User Story: View Shared Wishlist via Link

## User Story
**As a** Buyer,
**I want to** access another buyer's wishlist,
**So that** I can easily purchase items they want as gifts and have them shipped to their preferred address.

## Acceptance Criteria
- [ ] User can open the app via a valid shared wishlist link.
- [ ] Clicking the link navigates directly to the `SharedWishlistScreen`.
- [ ] The shared view loads the specific wishlist data associated with the link ID.
- [ ] The shared view displays:
    - [ ] Registry Owner's Name (e.g., "Maria's Wishlist").
    - [ ] List of public items (Private items hidden).
    - [ ] Item details: Image, Name, Price, Desired Qty, Purchased Qty.
- [ ] "Buy as Gift" functionality:
    - [ ] Available on unfulfilled items.
    - [ ] Adds item to cart with `isGift` flag.
    - [ ] Redirects immediately to checkout.
    - [ ] Buyer’s address will be hidden (when items are purchased as gifts for safety)
    - [ ] Checkout uses the registry owner's address as the shipping destination.

## User Flow

### 1. Receive & Open Link
- User A shares their wishlist link with User B (via chat, email, etc.).
- User B tap the link `https://bazaarx.app/wishlist/list_123` on their mobile device.

### 2. Deep Link Navigation
- The BazaarX app launches automatically.
- The app detects the deep link and navigates directly to the `SharedWishlistScreen`.
- *Note: If the app is not installed, it should fallback to the app store or web view (out of scope for mobile app story, but implied context).*

### 3. View Shared List
- User B sees "User A's Wishlist".
- User B browses the items User A has added.
- User B sees which items are already "Fulfilled" by others (placed at very bottom of item list).

### 4. Select Gift
- User B taps "Buy as Gift" on an available item.

### 5. Checkout
- The app immediately navigates to the `CheckoutScreen`.
- The shipping address is pre-set to User A's address (masked for privacy).
- User B completes the payment.
