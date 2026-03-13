# Slot-Based Marketplace Flash Sale Model

This document outlines the architecture and implementation of the new slot-based marketplace flash sale model.

## 1. Overview

The new model shifts from a product-centric to a slot-centric approach for flash sales. Instead of admins hand-picking products for a flash sale, they now create "slots" that sellers can join. This empowers sellers and creates a more dynamic marketplace.

## 2. Key Concepts

*   **Flash Sale Slot:** A time-bound event created by an admin, defined by a name, start/end time, campaign type, and a minimum discount percentage. Sellers can submit their products to these slots.
*   **Submission:** A product submitted by a seller to a flash sale slot. Each submission includes the product, its original price, the submitted discounted price, and the available stock.
*   **Store-Scoped Campaign:** A campaign created by a seller that is independent of the marketplace-wide flash sales. These campaigns are only visible on the seller's store profile.
*   **Price Priority:** A system that determines the final price of a product when multiple discounts are active. The priority is as follows:
    1.  Global Flash Sale Price
    2.  Store Campaign Price
    3.  Regular Price

## 3. Admin Experience

### 3.1. Creating a Flash Sale Slot

Admins can create new flash sale slots from the "Flash Sales" tab in the admin panel. The creation form includes the following fields:

*   **Event Name:** The name of the flash sale (e.g., "Summer Kick-off Sale").
*   **Start/End Time:** The duration of the flash sale.
*   **Campaign Type:** Can be "Slot-Based" or "Store-Wide".
*   **Minimum Discount %:** The minimum discount percentage that sellers must offer to join the slot.

### 3.2. Managing Submissions

Once a flash sale slot is created, admins can view and manage the submissions from sellers. For each submission, the admin can see:

*   Store Name
*   Submitted Price vs. Original Price
*   Stock

Admins can then **Approve** or **Reject** each submission. Approved products will be included in the flash sale.

## 4. Seller Experience

### 4.1. Joining a Flash Sale Slot

Sellers can view all available admin-created flash sale slots in their "Discounts" tab. To join a slot, a seller must:

1.  Click the "Join" button on the desired slot.
2.  Select products from their inventory.
3.  Set a discounted price for each product that meets the minimum discount requirement.

### 4.2. Creating Store-Scoped Campaigns

Sellers can also create their own independent campaigns from the "Discounts" tab. These campaigns are scoped to their own store and will not appear in the marketplace-wide flash sales. When creating a store-scoped campaign, the `campaign_scope` is set to `store`.

## 5. Buyer Experience

### 5.1. Store Profile Banner

If a seller has an active store-scoped campaign, a promotional banner will be displayed at the top of their store profile. This banner will highlight the campaign and allow buyers to easily filter for the products included in it.

### 5.2. Product Cards

All products with an active discount (whether from a global flash sale or a store-scoped campaign) will display a red "Discount Badge" and the crossed-out original price next to the new, discounted price.

## 6. Backend Logic

### 6.1. Price Priority

The backend is responsible for resolving the final price of a product based on the established priority logic. This is achieved through the `active_promotions` view, which calculates the lowest valid price for each product based on all active campaigns.

### 6.2. `getProductPrice` Function

The `discountService` now includes a `getProductPrice` function that takes a `productId` as input and returns the final price and original price for that product. This function queries the `active_promotions` view to get the correct prices.
