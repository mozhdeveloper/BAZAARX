# Mobile App Updates

## 1. Data Synchronization
- Synced `mobile-app/src/data/products.ts` with `web/src/data/products.ts` to ensure data parity between platforms.

## 2. Home Screen Enhancements
- Added **Flash Sale Section**:
  - Gradient background (`#FF6A00` to `#FF4D00`).
  - Countdown Timer.
  - Horizontal scrollable list of products.
  - "View All" link.

## 3. Order Detail Screen Enhancements
- Added **Seller Chat Feature**:
  - "Chat with Seller" button in the order details view.
  - Full-screen Chat Modal with:
    - Message history (Buyer, Seller, System messages).
    - Real-time message input.
    - Simulated seller response.
    - Order context (Transaction ID).

## 4. Profile Screen Enhancements
- Added **Following Shops** menu item to the profile navigation.

## 5. Dependencies
- Used `expo-linear-gradient` for the Flash Sale banner.
- Used `lucide-react-native` for new icons (`Timer`, `MessageCircle`, `Send`, `Store`).
