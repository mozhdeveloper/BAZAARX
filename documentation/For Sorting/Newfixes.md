Mobile App Product & Order Flow Enhancement Request

    I need you to help me fix and enhance the mobile app's product details, shop, checkout, and order flow to ensure consistency and proper functionality. The mobile   
    app should align with the database schema that includes products, product variants, and proper order management.

    Current Issues to Address:

     1. Product Details Screen:
        - Need to properly display product information from the database
        - Variant selection isn't working properly with dynamic labels (variant_label_1, variant_label_2)
        - Images and pricing don't update correctly when variants are selected
        - Missing proper stock indicators

     2. Shop/Products Screen:
        - Product listings don't show accurate information from the database
        - Filtering and search functionality may not be working properly
        - Product cards should show essential details like price, ratings, and availability

     3. Checkout Process:
        - Need to show complete order details before confirmation
        - Should properly handle selected variants and quantities
        - Shipping and billing information needs to be properly collected and validated
        - Payment processing needs to be integrated properly

     4. Order History:
        - After checkout, users should be redirected to order history
        - Orders should be properly stored in the database
        - Order status tracking needs to be implemented

    Database Schema Reference:

      1 // Product table
      2 interface Product {
      3   id: string;
      4   name: string;
      5   description: string | null;
      6   category_id: string;
      7   brand: string | null;
      8   sku: string | null;
      9   specifications: Record<string, unknown>;
     10   approval_status: ProductApprovalStatus;
     11   variant_label_1: string | null;  // e.g., "Color", "Size"
     12   variant_label_2: string | null;  // e.g., "Material", "Style"
     13   price: number;
     14   low_stock_threshold: number;
     15   weight: number | null;
     16   dimensions: { length: number; width: number; height: number } | null;
     17   is_free_shipping: boolean;
     18   disabled_at: string | null;
     19   deleted_at: string | null;
     20   created_at: string;
     21   updated_at: string;
     22   image_embedding: number[] | null;
     23   // Joined fields
     24   seller_id?: string;
     25   images?: ProductImage[];
     26   variants?: ProductVariant[];
     27   category?: Category;
     28   seller?: Seller;
     29   // Calculated metrics
     30   stock?: number;
     31   rating?: number;
     32   review_count?: number;
     33   sales_count?: number;
     34 }
     35
     36 // ProductVariant table
     37 interface ProductVariant {
     38   id: string;
     39   product_id: string;
     40   sku: string;
     41   barcode: string | null;
     42   variant_name: string;
     43   size: string | null;
     44   color: string | null;
     45   option_1_value: string | null;  // Generic option field
     46   option_2_value: string | null;  // Generic option field
     47   price: number;
     48   stock: number;
     49   thumbnail_url: string | null;
     50   embedding: number[] | null;
     51   created_at: string;
     52   updated_at: string;
     53 }
     54
     55 // Order table
     56 interface Order {
     57   id: string;
     58   order_number: string;
     59   buyer_id: string;
     60   order_type: OrderType;
     61   pos_note: string | null;
     62   recipient_id: string | null;
     63   address_id: string | null;
     64   payment_status: PaymentStatus;
     65   shipment_status: ShipmentStatus;
     66   paid_at: string | null;
     67   notes: string | null;
     68   created_at: string;
     69   updated_at: string;
     70   buyer?: Buyer & { profile?: Profile };
     71   recipient?: OrderRecipient;
     72   address?: ShippingAddress;
     73   items?: OrderItem[];
     74   subtotal?: number;
     75   total_amount?: number;
     76 }
     77
     78 // OrderItem table
     79 interface OrderItem {
     80   id: string;
     81   order_id: string;
     82   product_id: string | null;
     83   product_name: string;
     84   primary_image_url: string | null;
     85   price: number;
     86   price_discount: number;
     87   shipping_price: number;
     88   shipping_discount: number;
     89   quantity: number;
     90   variant_id: string | null;
     91   personalized_options: Record<string, unknown> | null;
     92   rating: number | null;
     93   created_at: string;
     94   updated_at: string;
     95   product?: Product;
     96   variant?: ProductVariant;
     97 }

    Required Enhancements:

    1. Product Details Screen
     - [ ] Fetch and display complete product information from the database
     - [ ] Implement dynamic variant selection based on variant_label_1 and variant_label_2
     - [ ] Update product image and price when variants are selected
     - [ ] Show proper stock availability for each variant
     - [ ] Add "Add to Cart" and "Buy Now" buttons with proper variant handling
     - [ ] Display product ratings, reviews, and seller information
     - [ ] Handle cases where products have no variants (show base product info)

    2. Shop/Products Screen
     - [ ] Fetch products from the database with proper filtering and pagination
     - [ ] Display product cards with essential information (name, price, image, rating)
     - [ ] Implement search functionality that searches product names, descriptions, and categories
     - [ ] Add category filtering based on the database categories
     - [ ] Show proper loading states and error handling
     - [ ] Implement pull-to-refresh functionality

    3. Cart & Checkout Flow
     - [ ] Implement proper cart management with variant support
     - [ ] Create a checkout screen that shows complete order details
     - [ ] Collect shipping address with proper validation
     - [ ] Implement payment processing (with mock/staging for testing)
     - [ ] Show order summary with itemized breakdown (products, variants, quantities, prices)
     - [ ] Handle order creation in the database upon successful checkout

    4. Order History
     - [ ] Redirect users to order history after successful checkout
     - [ ] Fetch and display user's order history from the database
     - [ ] Show order status, items, and total amount
     - [ ] Allow users to view order details including items and shipping information
     - [ ] Implement order status tracking (pending, processing, shipped, delivered)

    Implementation Guidelines:

     1. Consistency: Ensure UI/UX is consistent across all screens
     2. Performance: Optimize data fetching and implement proper loading states
     3. Error Handling: Add proper error handling and user feedback
     4. Validation: Implement proper form validation for checkout process
     5. Responsive Design: Ensure screens work well on different device sizes
     6. Accessibility: Follow accessibility best practices

    Technical Requirements:

     - Use the existing navigation structure (React Navigation)
     - Integrate with Supabase for database operations
     - Follow the existing code patterns and architecture
     - Use the same type definitions as the web app where possible
     - Implement proper state management (Redux/Zustand if applicable)
     - Add proper TypeScript typing throughout

    Files to Modify:

    Please update the following screens/components as needed:
     - ProductDetailsScreen
     - ShopScreen/ProductsScreen
     - CartScreen
     - CheckoutScreen
     - OrderHistoryScreen
     - OrderDetailsScreen
     - Any related components or services

    Make sure all database queries use the correct field names (snake_case) and properly handle nullable fields. Also ensure that variant selection properly maps to    
    the database schema with option_1_value and option_2_value based on the product's variant_label_1 and variant_label_2.

    Provide complete, production-ready code with proper error handling, loading states, and user feedback. The solution should be scalable and maintainable.

    ---

    This prompt provides comprehensive guidance for fixing the mobile app's product and order flow while ensuring consistency with the database schema. It covers all
    the major components that need attention and provides the necessary database schema reference for proper implementation.