---
description: "Implementation plan for refactoring the flash sale system."
created-date: 2026-03-10
---

# Implementation Plan for Flash Sale System Refactor

- [ ] Step 1: Database Schema Modifications
  - **Task**: Update the database schema to support the dual-layered flash sale hierarchy.
  - **Files**:
    - `supabase/migrations/YYYYMMDDHHMMSS_flash_sale_refactor.sql`:
      - **Description**: This migration will introduce the necessary schema changes.
      - **Pseudocode**:
        ```sql
        -- Add a scope to discount_campaigns to distinguish between global and store-level sales
        ALTER TABLE "public"."discount_campaigns" ADD COLUMN "campaign_scope" TEXT NOT NULL DEFAULT 'store';
        CREATE TYPE "public"."submission_status" AS ENUM ('pending', 'approved', 'rejected');

        -- Create a table for admins to define global flash sale event slots
        CREATE TABLE "public"."global_flash_sale_slots" (
            "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
            "name" "text" NOT NULL,
            "start_date" "timestamp with time zone" NOT NULL,
            "end_date" "timestamp with time zone" NOT NULL,
            "created_at" "timestamp with time zone" DEFAULT "now"() NOT NULL
        );

        -- Create a table for sellers to submit products to global flash sales
        CREATE TABLE "public"."flash_sale_submissions" (
            "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
            "slot_id" "uuid" NOT NULL REFERENCES "public"."global_flash_sale_slots"("id"),
            "seller_id" "uuid" NOT NULL REFERENCES "public"."sellers"("id"),
            "product_id" "uuid" NOT NULL REFERENCES "public"."products"("id"),
            "submitted_price" "numeric" NOT NULL,
            "submitted_stock" "integer" NOT NULL,
            "status" "public"."submission_status" NOT NULL DEFAULT 'pending',
            "created_at" "timestamp with time zone" DEFAULT "now"() NOT NULL
        );

        -- Add atomic stock management function
        CREATE OR REPLACE FUNCTION "public"."decrement_stock"("p_product_id" "uuid", "quantity" "integer")
        RETURNS "void" AS $$
        BEGIN
            UPDATE "public"."products"
            SET "stock" = "stock" - "quantity"
            WHERE "id" = "p_product_id" AND "stock" >= "quantity";

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Insufficient stock for product %', "p_product_id";
            END IF;
        END;
        $$ LANGUAGE "plpgsql";
        ```
  - **Dependencies**: None.

- [ ] Step 2: Backend API Development
  - **Task**: Create and update backend services to manage the new flash sale structure.
  - **Files**:
    - `c:\Users\zandrellez\BAZAARX\web\src\services\adminFlashSaleService.ts`:
      - **Description**: A new service for admin-specific flash sale operations.
      - **Pseudocode**:
        ```typescript
        // Service for managing global flash sale slots
        class AdminFlashSaleService {
          createGlobalFlashSaleSlot(name, startDate, endDate) { /* ... */ }
          getGlobalFlashSaleSlots() { /* ... */ }
          updateGlobalFlashSaleSlot(id, updates) { /* ... */ }
          deleteGlobalFlashSaleSlot(id) { /* ... */ }

          // Service for managing submissions
          getFlashSaleSubmissions(slotId) { /* ... */ }
          approveFlashSaleSubmission(submissionId) { /* ... */ }
          rejectFlashSaleSubmission(submissionId) { /* ... */ }
        }
        ```
    - `c:\Users\zandrellez\BAZAARX\web\src\services\sellerFlashSaleService.ts`:
      - **Description**: A new service for seller-specific flash sale operations.
      - **Pseudocode**:
        ```typescript
        // Service for sellers to interact with flash sales
        class SellerFlashSaleService {
          getAvailableGlobalSlots() { /* ... */ }
          submitProductToGlobalFlashSale(slotId, productId, price, stock) { /* ... */ }
          createStoreCampaign(campaignDetails) { /* ... */ }
          getStoreCampaigns(sellerId) { /* ... */ }
        }
        ```
    - `c:\Users\zandrellez\BAZAARX\web\src\services\discountService.ts`:
      - **Description**: Update the existing discount service to incorporate the new hierarchy.
      - **Pseudocode**:
        ```typescript
        // Modify getFlashSaleProducts to merge global and store sales
        class DiscountService {
          async getFlashSaleProducts() {
            // 1. Fetch active global flash sale products (from approved submissions)
            // 2. Fetch active store campaigns for all sellers
            // 3. Merge the two lists, ensuring global sale price overrides store campaign price for the same product
            // 4. Return the final list of flash sale products
          }
        }
        ```
  - **Dependencies**: `supabase-js`

- [ ] Step 3: Frontend Implementation - Admin Panel
  - **Task**: Develop the UI for admins to manage the global flash sale system.
  - **Files**:
    - `c:\Users\zandrellez\BAZAARX\web\src\pages\AdminGlobalFlashSales.tsx`:
      - **Description**: A new page for creating and managing global flash sale slots.
    - `c:\Users\zandrellez\BAZAARX\web\src\pages\AdminFlashSaleSubmissions.tsx`:
      - **Description**: A new page for viewing and managing seller submissions to global flash sales.
  - **Dependencies**: `react`

- [ ] Step 4: Frontend Implementation - Seller Dashboard
  - **Task**: Develop the UI for sellers to participate in global flash sales and manage their own campaigns.
  - **Files**:
    - `c:\Users\zandrellez\BAZAARX\web\src\pages\SellerFlashSales.tsx`:
      - **Description**: A new page for sellers to view available global slots, submit products, and manage their store campaigns.
  - **Dependencies**: `react`

- [ ] Step 5: Frontend Implementation - Mobile App
  - **Task**: Refactor the mobile app's flash sale screen to use the new data structure and optimize performance.
  - **Files**:
    - `c:\Users\zandrellez\BAZAARX\mobile-app\app\FlashSaleScreen.tsx`:
      - **Description**: Update the flash sale screen to fetch data from the updated `discountService.getFlashSaleProducts`. Use `FlashList` for the horizontal scrolling view. Implement a stable countdown timer that doesn't cause unnecessary re-renders.
      - **Pseudocode**:
        ```typescript
        // Use a custom hook for the countdown to isolate re-renders
        const useCountdown = (endDate) => {
          const [timeLeft, setTimeLeft] = useState(/* calculate time left */);
          useEffect(() => {
            const timer = setInterval(() => {
              // update timeLeft
            }, 1000);
            return () => clearInterval(timer);
          }, [endDate]);
          return timeLeft;
        };

        // Main component
        const FlashSaleCard = ({ product }) => {
          const timeLeft = useCountdown(product.endDate);
          return (
            <View>
              {/* Display product info */}
              <Text>{timeLeft}</Text>
            </View>
          );
        };

        const FlashSaleScreen = () => {
          // ... fetch flash sale products
          return (
            <FlashList
              data={products}
              renderItem={({ item }) => <FlashSaleCard product={item} />}
              estimatedItemSize={200}
            />
          );
        };
        ```
  - **Dependencies**: `@shopify/flash-list`

- [ ] Step 6: Validation and Testing
  - **Task**: Ensure the new system is robust and works as expected.
  - **Files**:
    - `tests/flash-sale.test.ts`:
      - **Description**: Create unit and integration tests for the new services and components.
      - **Pseudocode**:
        ```typescript
        // Test cases
        test('Global flash sale price should override store campaign price', () => { /* ... */ });
        test('Should not be able to purchase more than available stock', () => { /* ... */ });
        test('Seller can create and manage their own store campaign', () => { /* ... */ });
        ```
  - **Dependencies**: `jest`, `testing-library`
