# Branch Changes: Mobile Account Switching (`feat/mobiile-account-switch`)

This branch implements a robust mechanism for users to switch between Buyer and Seller roles within the mobile application, ensuring that profiles and data are correctly synchronized.

## Core Objectives
1.  **Portal Unification**: Allow sellers to log in through the buyer portal seamlessly.
2.  **Data Synchronization**: Ensure the `AuthStore` (Buyer Profile) is populated regardless of which portal is used for login.
3.  **Real Data vs. Mock Data**: Replace "John Doe" / "Jonathan Doe" dummy data with real user information from Supabase.
4.  **Persistent Sessions**: Ensure order history is fetched immediately upon authentication.

## Detailed Changes

### 1. Authentication Layer
- **Unified Login (`app/LoginScreen.tsx`)**:
    - Removed the explicit block for 'seller' account types.
    - Added logic to sync full profile details (name, email, phone, avatar) to the global `AuthStore`.
    - Triggered `fetchOrders` on login to ensure immediate data availability.
- **Enhanced Seller Login (`app/seller/login.tsx`)**:
    - Updated to fetch all profile fields.
    - Populates the buyer profile state in `AuthStore` even when logging in as a seller, ensuring a smooth role switch later.
    - Synchronizes `SellerStore` and `AuthStore` roles simultaneously.

### 2. Role Switching Logic
- **Seller Settings (`app/seller/(tabs)/settings.tsx`)**:
    - Enhanced the "Switch to Buyer" handler to check for missing buyer data.
    - Automatically triggers a fetch for buyer orders if dummy data is detected during the transition.
- **Auth Store (`src/stores/authStore.ts`)**:
    - Updated `switchRole` to handle navigation and state transitions more reliably.
    - Added `checkForSellerAccount` to verify seller status with Supabase before switching.

### 3. UI and Data Persistence
- **Profile Screen (`app/ProfileScreen.tsx`)**:
    - Replaced mock name "Jonathan Doe" with "BazaarX User" as the fallback.
    - Updated name-splitting logic to handle various name formats correctly.
    - Ensured profile fields use real data from the `AuthStore`.
- **Order Management**:
    - Modified `OrderStore.ts` and login services to prioritize real database records over `dummyOrders`.
    - Integrated real-time order fetching into both registration and login flows.

### 4. New Features
- **Become a Seller Flow (`app/seller/BecomeSellerScreen.tsx`)**:
    - [NEW] Implemented a dedicated onboarding flow for buyers to register as sellers.
    - Integrated with Supabase for business detail submission and verification status.

## Verification
- Verified that sellers can now access their profile and orders in the buyer view without seeing "John Doe".
- Verified that switching roles updates the UI state correctly and navigates to the appropriate dashboard.
