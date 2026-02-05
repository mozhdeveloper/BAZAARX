# BazaarX Buyer Flow Guide

## 🛒 Shopping Cart Options

BazaarX provides **TWO cart experiences** to handle different shopping scenarios:

### **1. Enhanced Multi-Seller Cart** (Primary - Recommended)
- **Access**: Click the **Shopping Bag icon** 🛍️ in header → `/enhanced-cart`
- **Features**:
  - ✅ Group items by seller/store
  - ✅ Apply vouchers and promo codes
  - ✅ Follow/unfollow stores directly
  - ✅ Individual seller checkout
  - ✅ Store ratings and verification badges
  - ✅ Delivery time estimates per seller

**Use this when**:
- Shopping from multiple sellers
- Want to use vouchers/discounts
- Need seller-specific features
- Following stores and sellers

### **2. Standard Cart** (Legacy)
- **Access**: Navigate to `/cart` manually
- **Features**:
  - Basic cart functionality
  - Simple item management
  - Quick checkout

**Use this when**:
- Simple, straightforward checkout
- Testing basic cart features

---

## 📱 Complete Buyer Journey

### **Step 1: Browse & Discover**
1. **Homepage** (`/`)
   - View trending products
   - Explore categories
   - See flash sales and deals

2. **Shop Page** (`/shop`)
   - Browse all products
   - Filter by category, price, rating
   - Sort by popularity, price, newest
   - Search functionality

### **Step 2: Product Details**
3. **Product Page** (`/product/:id`)
   - View high-quality product images
   - Read detailed descriptions
   - Check reviews and ratings
   - Select variants (color, size, type)
   - Adjust quantity
   - **Add to Cart** or **Buy Now**

### **Step 3: Shopping Cart**
4. **Enhanced Cart** (`/enhanced-cart`) ⭐ RECOMMENDED
   - Items grouped by seller
   - Apply voucher codes:
     - `SAVE10` - 10% off
     - `SAVE20` - 20% off
     - `FREESHIP` - Free shipping
   - Follow stores you like
   - View seller ratings and verification
   - Proceed to checkout per seller

### **Step 4: Checkout**
5. **Checkout Page** (`/checkout`)
   - Enter shipping address
   - Select payment method:
     - Credit/Debit Card
     - GCash
     - PayMaya
     - Cash on Delivery (COD)
   - Review order summary
   - Place order

### **Step 5: Order Confirmation**
6. **Order Confirmation** (`/order-confirmation/:orderId`)
   - View order details
   - Get order ID and tracking number
   - See estimated delivery time
   - Track order button

### **Step 6: Delivery Tracking**
7. **Delivery Tracking** (`/delivery-tracking/:orderId`) 🎯
   - **Live tracking map** with animated route
   - Real-time delivery progress (4 stages):
     1. ✅ Order Confirmed
     2. 📦 Package Prepared
     3. 🚚 Out for Delivery
     4. ✨ Delivered
   - Estimated arrival time
   - Speed and distance tracking
   - Driver information
   - View full receipt
   - Contact support

### **Step 7: Rate & Review** ⭐ NEW!
8. **Review Modal** (Auto-popup after delivery)
   - Appears automatically when order is **delivered**
   - Rate your experience (1-5 stars)
   - Write detailed review
   - Upload product photos (up to 5)
   - Review submitted to seller and product page

---

## 🎯 Key Features Explained

### **Multi-Seller Cart Grouping**
Items are automatically organized by seller/store:
```
📦 TechHub Store (2 items)
  - Gaming Mouse - ₱1,299
  - Mechanical Keyboard - ₱2,499

📦 Fashion Haven (1 item)
  - Premium Watch - ₱3,999
```

### **Voucher System**
Test vouchers available:
- `SAVE10` → 10% discount
- `SAVE20` → 20% discount  
- `FREESHIP` → Free shipping

### **Store Following**
- Click **Follow** button on seller cards
- View followed stores in **Profile** → **Following** tab
- Get updates on new products and deals

### **Review System**
Reviews appear:
- Product detail pages
- Seller storefronts  
- Your profile → **Reviews** tab

---

## 🗺️ Navigation Map

```
Header Navigation:
├── Logo → Homepage (/)
├── Search Bar → Shop (/shop)
├── Shopping Bag 🛍️ → Enhanced Cart (/enhanced-cart)
├── Orders 📦 → My Orders (/orders)
├── Notifications 🔔
└── Profile Menu
    ├── My Profile → /profile
    │   ├── Personal Info Tab
    │   ├── Addresses Tab (Address book)
    │   ├── Following Tab (Followed stores)
    │   └── Settings Tab
    ├── My Orders → /orders
    ├── My Reviews → /reviews
    ├── Following → /profile (Following tab)
    └── Settings
```

---

## 🎨 Visual Guide

### **Cart Icon Indicators**
- **Shopping Bag Icon** 🛍️ with **Orange Badge** = Enhanced Cart (items from buyerStore)
- Badge shows total items across all sellers
- Hover for tooltip: "Shopping Cart (X items)"

### **Delivery Status Colors**
- 🟢 **Green** = Completed step
- 🔵 **Blue** = Current step (animated pulse)
- ⚪ **Gray** = Pending step

### **Review Modal Trigger**
- Automatically appears **2 seconds** after delivery completes (Step 4)
- Can be accessed later from:
  - Orders page → "Review Order" button
  - Profile → Reviews section

---

## 🔄 Complete Flow Example

1. Browse homepage → Click "Gaming Mouse"
2. View product details → Select color: Black → Add to Cart
3. Continue shopping → Add "Mechanical Keyboard" from same seller
4. Click Shopping Bag 🛍️ icon → Enhanced Cart opens
5. Apply voucher `SAVE10` → 10% discount applied ✅
6. Click "Proceed to Checkout" for TechHub Store
7. Enter shipping address → Select GCash payment
8. Click "Place Order" → Redirected to confirmation
9. Click "Track Order" → Live tracking page opens
10. Watch animated delivery progress (updates every 8 seconds)
11. When "Delivered" → Review modal pops up automatically
12. Rate 5 stars ⭐⭐⭐⭐⭐ → Write review → Submit
13. Success! Review appears on product page

---

## 💡 Pro Tips

### For Testing
- Use test vouchers: `SAVE10`, `SAVE20`, `FREESHIP`
- Delivery simulation runs automatically (8 seconds per stage)
- Review modal appears when status reaches "Delivered"

### For Best Experience
- Use **Enhanced Cart** for multi-seller shopping
- Enable notifications for order updates
- Follow favorite stores for personalized recommendations
- Add detailed reviews with photos to help other buyers

### Keyboard Shortcuts
- Press `Enter` in search bar → Go to Shop page
- `Esc` key → Close modals (Review, Receipt)

---

## 🛠️ Technical Notes

### Route Structure
```typescript
// Primary buyer routes
/                          → HomePage
/shop                      → Product catalog
/product/:id              → Product details
/enhanced-cart            → Multi-seller cart (PRIMARY)
/cart                     → Standard cart (legacy)
/checkout                 → Checkout flow
/order-confirmation/:id   → Order success
/delivery-tracking/:id    → Live tracking
/orders                   → Order history
/profile                  → Buyer profile
/seller/:id              → Seller storefront
/reviews                 → Review management
```

### State Management
- **Enhanced Cart**: `buyerStore.ts` (Zustand)
- **Standard Cart**: `cartStore.ts` (Zustand)
- **Reviews**: `buyerStore.ts` → `reviews` array
- **Following**: `buyerStore.ts` → `followedSellers` array

### Review Flow
```typescript
// Automatic trigger in DeliveryTrackingPage
useEffect(() => {
  if (currentStep === 4) { // Delivered
    setTimeout(() => {
      setShowReviewModal(true);
    }, 2000);
  }
}, [currentStep]);
```

---

## 🎉 Success Indicators

You'll know everything works when:
- ✅ Cart icon shows correct item count
- ✅ Vouchers apply successfully
- ✅ Delivery tracking animates smoothly
- ✅ Review modal appears after delivery
- ✅ Reviews appear on product pages
- ✅ Following stores updates in profile
- ✅ Address book saves addresses
- ✅ No console errors

---

## 📞 Need Help?

**Common Issues:**
- Cart empty? Check you're using `/enhanced-cart` not `/cart`
- Voucher not working? Use exact codes: `SAVE10`, `SAVE20`, `FREESHIP`
- Review modal not showing? Wait for delivery status to reach step 4
- Items not grouped? Enhanced cart auto-groups by seller

**Developer Mode:**
```bash
cd web
npm run dev
# Open http://localhost:5173
# Check browser console for any errors
```

---

**Last Updated**: December 13, 2025
**Status**: ✅ All features fully implemented and tested
