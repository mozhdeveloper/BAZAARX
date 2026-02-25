# User Story: Buyer Wishlist Management

## 1. User Story

**As a** Buyer  
**I want to** create and maintain a personal wishlist of items  
**So that** I can save products I'm interested in for future purchase, organize them into specific lists, and optionally share them with others as a gift registry.

---

## 2. Acceptance Criteria

### 2.1. Basic Wishlist Management

- [ ] **Add to Wishlist**: The user can add a product to their wishlist from the Product Detail page.
- [ ] **Remove from Wishlist**: The user can remove a product from their wishlist.
- [ ] **View Wishlist**: The user can view all saved items in a dedicated Wishlist screen.
- [ ] **Empty State**: If the wishlist is empty, a prompt to "Start Shopping" is displayed.

### 2.2. Multiple Lists (Categories)

- [ ] **Create List**: Users can create multiple custom lists (e.g., "Birthday", "Holiday", "Home Decor").
- [ ] **Default List**: A "General Favorites" list exists by default and cannot be deleted.
- [ ] **Delete List**: Users can delete a custom list. Items in a deleted list are automatically moved to the default list, preventing data loss.
- [ ] **Privacy Settings**: Lists are **Private** by default. Sharing is restricted to the creator sharing a direct link. There is no public directory of wishlists.

### 2.3. Item Customization & Registry Features

- [ ] **Desired Quantity**: Users can specify the quantity of an item they want (e.g., for a registry).
- [ ] **Purchased Tracking**: The system tracks how many units of an item have been purchased by others (for registry functionality).
- [ ] **Item Privacy**: Individual items within a shared list can be marked as **Private**, hiding them from public view.
- [ ] **No COD**: Items purchased from a shared wishlist (registry) cannot be paid for using Cash on Delivery (COD).

### 2.4. Sharing

- [ ] **Share List**: Only the creator can initiate sharing by generating a unique URL.
- [ ] **No Public Search**: Users cannot search for other users' registries/wishlists publicly. Sharing is strictly link-based.
- [ ] **Social Sharing**: The app integrates with the device's native sharing sheet to send the link via messaging apps or social media.

---

## 3. Technical Implementation Details

### Data Model (`WishlistItem`)

The `WishlistItem` extends the base `Product` type with specific metadata:

- `priority`: 'low' | 'medium' | 'high'
- `desiredQty`: number
- `purchasedQty`: number (tracks fulfillment)
- `categoryId`: links the item to a specific `WishlistCategory`
- `isPrivate`: boolean (item-level privacy override)

### State Management (`wishlistStore.ts`)

- **Persistence**: Uses `zustand` with `persist` middleware backed by `AsyncStorage`.
- **Actions**:
    - `addItem`, `removeItem`, `updateItem`
    - `createCategory`, `deleteCategory`, `updateCategory`
    - `shareWishlist` (generates deep link)

### UI Components (`WishlistScreen.tsx`)

- **Layout**: Uses a categorized view where users first see their lists, then drill down into items.
- **Modals**:
    - `CreateListModal`: For adding new categories.
    - `ItemEditModal`: For adjusting quantity and privacy.
    - `EditCategoryModal`: For renaming or changing privacy of a list.
- **Navigation**: Accessible via the main tab bar or profile menu.

### Registry Integration

- The wishlist effectively functions as a registry/gift list system due to the `desiredQty` vs `purchasedQty` logic.
- The wishlist effectively functions as a registry/gift list system due to the `desiredQty` vs `purchasedQty` logic.
- **Removed**: "Find Registry" feature. The system is private-first. Sharing is done solely via direct URL generation.

---

## 4. Future Enhancements (Backlog)

- [ ] **Price Drop Alerts**: Notify users when a wishlist item goes on sale.
- [ ] **Move Items**: easier UI to move items between different lists.
- [ ] **Collaborative Lists**: Allow multiple users to edit a single list (e.g., a couple planning a wedding).

---

## 5. User Flow

### 1. Add to Wishlist

1. User browses Product Detail Page.
2. User taps **Gift Icon** (Add to Wishlist).
3. **Decision**:
    - If User has multiple lists: modal appears to select list (default is 'General Favorites').
    - If User has only default list: toast appears "Added to General Favorites".

### 2. Manage Lists

1. User navigates to **Wishlist Screen**.
2. Displays grid of **Wishlist Categories** (Categories View).
3. User taps **Create (+) Button** -> enters Name -> selects Privacy -> New List created.

### 3. Manage Items (Registry Mode)

1. User taps a Category card -> Enters **Item View**.
2. User taps an Item.
3. User selects **Edit** option.
4. User adjusts:
    - **Desired Quantity** (for registry).
    - **Privacy** (hide from shared view).
5. User saves changes.

### 4. Share Registry

1. User is in a specific List View.
2. User taps **Share Icon** in header.
3. Native Share Sheet opens with unique URL.
