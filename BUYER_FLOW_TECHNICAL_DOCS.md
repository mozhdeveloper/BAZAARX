# BAZAAR Mobile App - Buyer Flow Technical Documentation
**Last Updated:** February 13, 2026  
**Version:** Post-bugfix (commits 271c538, cc7eea3)

---

## 📱 Buyer Journey Overview

```
Home/Shop → Product Details → Cart → Checkout → Orders → History/Reviews
           ↓                    ↓
       Chat Seller        Store Profile
```

---

## 🛒 1. Product Discovery & Details

### Entry Points to ProductDetailScreen
1. **HomeScreen** - Featured, trending products
2. **ShopScreen** - Category browsing
3. **StoreDetailScreen** - Seller's store
4. **FlashSaleScreen** - Time-limited deals
5. **WishlistScreen** - Saved products
6. **OrderDetailScreen** - From past orders

### Product Object Structure (CRITICAL)
```typescript
interface Product {
  // IDs
  id: string;                    // Product UUID
  seller_id: string;             // 🔴 REQUIRED for chat/store navigation
  sellerId?: string;             // Alias for compatibility
  
  // Basic Info
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  
  // Media
  image: string;                 // Primary image URL
  images: string[];              // All images
  
  // Seller Info
  seller: string;                // Store name for display
  sellerRating: number;
  sellerVerified: boolean;
  seller_avatar?: string;
  sellerAvatar?: string;
  
  // Variants (if any)
  variants?: ProductVariant[];
  variant_label_1?: string;      // e.g., "Color"
  variant_label_2?: string;      // e.g., "Size"
  selectedVariant?: {
    option1Label: string;
    option1Value: string;
    option2Label: string;
    option2Value: string;
    variantId: string;
  };
  
  // Metadata
  category: string;
  rating: number;
  sold: number;
  isFreeShipping: boolean;
}
```

### ProductDetailScreen Key Functions

#### 1. Chat Seller
```typescript
const handleChat = () => {
  const { isGuest } = useAuthStore.getState();
  if (isGuest) {
    setGuestModalMessage("Sign up to chat with sellers.");
    setShowGuestModal(true);
    return;
  }
  setShowChat(true);
}

// StoreChatModal receives:
<StoreChatModal
  visible={showChat}
  onClose={() => setShowChat(false)}
  storeName={product.seller || 'Store'}
  sellerId={product.seller_id || product.sellerId}  // ✅ Both checked
/>
```

**Requirements:**
- ✅ User must be logged in (not guest)
- ✅ Product must have `seller_id` or `sellerId`
- ❌ Will show error if seller_id missing

#### 2. Visit Store
```typescript
const handleVisitStore = () => {
  const sellerId = product.seller_id || product.sellerId;
  if (!sellerId) {
    Alert.alert('Store Unavailable', 'Store information is not available for this product.');
    return;
  }
  navigation.push('StoreDetail', {
    store: {
      id: sellerId,
      name: product.seller || 'Store',
      image: product.seller_avatar || product.sellerAvatar || null,
      rating: product.sellerRating || 0,
      verified: product.sellerVerified || false,
    }
  });
};
```

#### 3. Add to Cart
```typescript
// Handles variants, quantities, personalizations
// Uses Zustand store: useCartStore
addItem({
  ...product,
  quantity,
  selectedVariant: {
    option1Label,
    option1Value,
    option2Label,
    option2Value,
    variantId
  }
});
```

---

## 📦 2. Order Management

### OrdersScreen Tabs
```
To Pay → To Ship → To Receive → Completed → Returns
```

### Order Object Structure
```typescript
interface Order {
  // IDs (CRITICAL - Don't confuse these!)
  id: string;              // ❌ May be order_number (display string)
  orderId: string;         // ✅ Real UUID for DB operations
  transactionId: string;   // Order number for display
  
  // Status
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  // Note: DB uses shipment_status, mapped to status for UI
  
  // Items with CRITICAL structure
  items: OrderItem[];
  
  // Financial
  total: number;
  shippingFee: number;
  isPaid: boolean;
  
  // Dates
  scheduledDate: string;
  deliveryDate?: string;
  createdAt: string;
  
  // Address
  shippingAddress: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    region: string;
    postalCode: string;
  };
  
  // Payment
  paymentMethod: string;
}

interface OrderItem {
  // IDs (CRITICAL!)
  id: string;              // order_item UUID for UI tracking
  productId: string;       // 🔴 REQUIRED for reviews - product UUID
  
  // Product Info
  name: string;
  price: number;
  image: string;
  quantity: number;
  
  // Variant (if applicable)
  selectedVariant?: {
    size?: string;
    color?: string;
    variantId?: string;
    option1Label?: string;
    option1Value?: string;
    option2Label?: string;
    option2Value?: string;
  };
  
  // Seller Info
  seller: string;
  sellerId: string;
  sellerInfo: any;
}
```

### Database Mapping (OrdersScreen.tsx lines 100-180)
```typescript
// From raw DB order:
const rawStatus = order.shipment_status;  // ✅ Correct column
const statusMap = {
  'waiting_for_seller': 'pending',
  'processing': 'processing',
  'ready_to_ship': 'processing',
  'shipped': 'shipped',
  'out_for_delivery': 'shipped',
  'delivered': 'delivered',
  'received': 'delivered',        // ⚠️ Maps to 'delivered' for UI
  'failed_to_deliver': 'cancelled',
  'returned': 'cancelled',
};
const mappedStatus = statusMap[rawStatus] || 'pending';

// Item mapping with BOTH id and productId:
return {
  id: it.id || `${order.id}_${it.product_id}`,  // order_item id
  productId: p.id || it.product_id,              // 🔴 CRITICAL for reviews
  name: productName,
  price: priceNum,
  // ... rest of fields
};

// Order mapping:
return {
  id: order.order_number || order.id,      // display id
  orderId: order.id,                        // 🔴 real UUID for DB
  transactionId: order.order_number || order.id,
  items,
  status: mappedStatus,
  // ... rest of fields
};
```

### Tab Filtering Logic (OrdersScreen.tsx lines 289-340)
```typescript
const filteredOrders = useMemo(() => {
  let baseOrders: Order[] = [];

  switch (activeTab) {
    case 'toPay':
      baseOrders = dbOrders.filter(o => o.status === 'pending');
      break;
    case 'toShip':
      baseOrders = dbOrders.filter(o => o.status === 'processing');
      break;
    case 'toReceive':
      baseOrders = dbOrders.filter(o => o.status === 'shipped');
      break;
    case 'completed':
      baseOrders = dbOrders.filter(o =>
        o.status === 'delivered' &&  // ✅ Includes both 'delivered' and 'received'
        !returnRequests.some(req => 
          req.orderId === ((o as any).orderId || o.id)  // ✅ Uses orderId
        )
      );
      break;
    case 'cancelled':
      baseOrders = dbOrders.filter(o => o.status === 'cancelled');
      break;
  }
  
  // Apply search and sorting...
  return baseOrders;
}, [activeTab, dbOrders, returnRequests]);
```

### Mark Order as Received (OrdersScreen.tsx lines 350-385)
```typescript
const handleOrderReceived = (order: Order) => {
  Alert.alert(
    'Order Received',
    'Confirm you have received your order?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          try {
            // ✅ Use orderId (real UUID), not id (order_number)
            const realOrderId = (order as any).orderId || order.id;
            
            // ✅ Update DB with shipment_status
            const { error } = await supabase
              .from('orders')
              .update({ shipment_status: 'received' })
              .eq('id', realOrderId);

            if (error) throw error;

            // Update order store (optional)
            updateOrderStatus(realOrderId, 'delivered');

            // ✅ Update local state (maps 'received' → 'delivered')
            setDbOrders(prev => prev.map(o =>
              ((o as any).orderId || o.id) === realOrderId 
                ? { ...o, status: 'delivered' } 
                : o
            ));

            Alert.alert('Success', 'Order marked as received!');
          } catch (e) {
            console.error('Error updating order:', e);
            Alert.alert('Error', 'Failed to update order status');
          }
        },
      }
    ]
  );
};
```

**Flow:**
1. User clicks "Order Received" in To Receive tab
2. DB updated: `shipment_status = 'received'`
3. Local state updated: `status = 'delivered'`
4. Order now filters into Completed tab (status === 'delivered')

---

## ⭐ 3. Reviews System

### Review Submission Flow

#### From OrdersScreen
```typescript
const handleReview = (order: Order) => {
  setSelectedOrder(order);
  setShowRatingModal(true);  // Opens ReviewModal
};

const handleSubmitReview = async (productId: string, rating: number, review: string) => {
  if (!selectedOrder || !user?.id) return;

  try {
    // ✅ Get real order UUID
    const realOrderId = (selectedOrder as any).orderId || selectedOrder.id;
    
    // ✅ Find item by productId
    const item = selectedOrder.items.find(i => 
      (i as any).productId === productId || i.id === productId
    );
    if (!item) throw new Error('Product not found');

    // ✅ Create review (NO seller_id!)
    await reviewService.createReview({
      product_id: productId,        // ✅ Uses productId
      buyer_id: user.id,
      order_id: realOrderId,         // ✅ Uses real UUID
      rating,
      comment: review || null,
      is_verified_purchase: true,
    });

    // Mark item as reviewed
    await reviewService.markItemAsReviewed(realOrderId, productId, rating);

    Alert.alert('Success', 'Your review has been submitted.');
  } catch (error: any) {
    console.error('[OrdersScreen] Error submitting review:', error);
    Alert.alert('Error', error.message || 'Failed to submit review');
  }
};
```

#### ReviewModal.tsx
```typescript
// Load review statuses for all items in order
const loadReviewStatuses = async () => {
  if (!order) return;
  setLoading(true);
  const statuses: ProductReviewStatus = {};
  
  try {
    const realOrderId = (order as any).orderId || order.id;
    
    for (const item of order.items) {
      // ✅ Use productId for review check
      const productId = (item as any).productId || item.id;
      const hasReview = await reviewService.hasReviewForProduct(realOrderId, productId);
      statuses[item.id] = { reviewed: hasReview };  // Track by item.id for UI
    }
    setReviewStatus(statuses);
  } catch (error) {
    console.error('Error loading review statuses:', error);
  } finally {
    setLoading(false);
  }
};

// On submit
const handleSubmit = async () => {
  if (!selectedItemId) return;
  
  const item = order.items.find(i => i.id === selectedItemId);
  if (!item) throw new Error('Product not found');
  
  // ✅ Pass productId to parent, not item.id
  const productId = (item as any).productId || item.id;
  await onSubmit(productId, rating, review);
  
  // Update local UI status
  setReviewStatus(prev => ({
    ...prev,
    [selectedItemId]: { reviewed: true, rating, comment: review }
  }));
};
```

### Database Structure (reviews table)
```sql
CREATE TABLE reviews (
  id uuid PRIMARY KEY,
  product_id uuid NOT NULL,      -- ✅ Product being reviewed
  buyer_id uuid NOT NULL,        -- ✅ Who wrote the review
  order_id uuid,                 -- ✅ Verified purchase link
  rating integer NOT NULL,       -- 1-5 stars
  comment text,                  -- Review text
  helpful_count integer,
  seller_reply jsonb,
  is_verified_purchase boolean,
  is_hidden boolean,
  is_edited boolean,
  created_at timestamp,
  -- ❌ NO seller_id column!
);
```

---

## 📜 4. Purchase History

### HistoryScreen.tsx

Displays completed orders (delivered/received) for the buyer.

#### Data Fetching
```typescript
useEffect(() => {
  const loadHistory = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items (
            *,
            product:products (
              *,
              images:product_images (image_url, is_primary)
            ),
            variant:product_variants (*)
          )
        `)
        .eq('buyer_id', user.id)
        .in('shipment_status', ['delivered', 'received'])  // ✅ Completed orders
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: Order[] = (data || []).map((order: any) => {
        const items = order.items || [];
        
        return {
          id: order.id,
          orderId: order.id,
          transactionId: order.order_number || order.id,
          items: items.map((it: any) => ({
            id: it.id || `${order.id}_${it.product_id}`,  // order_item id
            productId: it.product_id,                     // ✅ CRITICAL for reviews
            name: it.product_name || it.product?.name || 'Product',
            price: it.price || 0,
            image: primaryImage,
            quantity: it.quantity || 1,
            selectedVariant: it.variant ? {
              size: it.variant.size,
              color: it.variant.color,
              variantId: it.variant.id
            } : undefined,
          })),
          total: calculatedTotal,
          status: 'delivered' as const,
          // ... rest
        };
      });

      setDbOrders(mapped);
    } catch (e) {
      console.error('History fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  loadHistory();
}, [user?.id]);
```

#### Buy Again Feature
```typescript
const handleBuyAgain = (order: Order) => {
  if (order.items.length > 0) {
    order.items.forEach(item => addItem(item as any));
    navigation.navigate('MainTabs', { screen: 'Cart' });
  }
};
```

---

## 💬 5. Chat with Seller

### chatService.ts

Uses `conversations` and `messages` tables.

#### Important: Seller ID Resolution
```typescript
/**
 * conversations table structure (NO seller_id column!):
 * - id, buyer_id, order_id, created_at, updated_at
 * 
 * Seller is determined from:
 * 1. Passed sellerId parameter
 * 2. order_id → order_items → products → seller_id
 * 3. messages → sender_id where sender_type = 'seller'
 */

async getOrCreateConversation(
  buyerId: string, 
  sellerId: string, 
  orderId?: string
): Promise<Conversation | null> {
  // Try to find existing by order_id
  if (orderId) {
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('buyer_id', buyerId)
      .eq('order_id', orderId)
      .single();

    if (existing) {
      return this.enrichConversation(existing, sellerId);
    }
  }

  // Try to find by checking messages for this seller
  const { data: convList } = await supabase
    .from('conversations')
    .select('*')
    .eq('buyer_id', buyerId);

  for (const conv of convList || []) {
    const { data: sellerMsg } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conv.id)
      .eq('sender_id', sellerId)
      .limit(1)
      .single();

    if (sellerMsg) {
      return this.enrichConversation(conv, sellerId);
    }
  }

  // Create new conversation
  const { data: newConv } = await supabase
    .from('conversations')
    .insert({
      buyer_id: buyerId,
      order_id: orderId || null,
    })
    .select()
    .single();

  return this.enrichConversation(newConv, sellerId);
}
```

### StoreChatModal.tsx

```typescript
interface StoreChatModalProps {
  visible: boolean;
  onClose: () => void;
  storeName: string;
  sellerId?: string;  // 🔴 REQUIRED
}

// Load conversation on mount
useEffect(() => {
  if (visible && sellerId && user?.id) {
    loadConversation();
  }
}, [visible, sellerId, user?.id]);

// Error states:
// - No sellerId: "Store information unavailable"
// - Not logged in: "Please log in to chat"
// - Loading: Shows spinner
```

---

## 🔍 Common Debugging Scenarios

### Issue: "Order doesn't move to Completed tab after marking as received"

**Check:**
1. ✅ DB update uses `shipment_status` column (not `status`)
2. ✅ Update uses `orderId` (real UUID), not `id` (order_number)
3. ✅ Local state update sets `status = 'delivered'`
4. ✅ Completed tab filters by `o.status === 'delivered'`
5. ✅ Return requests check uses `orderId`

### Issue: "Review submission fails"

**Check:**
1. ✅ Item has `productId` field (not just `id`)
2. ✅ Uses `order.orderId` (UUID), not `order.id` (order_number)
3. ✅ reviewService.createReview doesn't include `seller_id`
4. ✅ Database `reviews` table has no `seller_id` column

### Issue: "Chat button shows 'Store information unavailable'"

**Check:**
1. ✅ Product has `seller_id` or `sellerId` field
2. ✅ StoreChatModal receives sellerId prop
3. ✅ Product mapping from all screens includes seller_id

### Issue: "Menu button not clickable"

**Check:**
1. ✅ Button has sufficient hit area (`hitSlop` prop)
2. ✅ No overlapping elements with higher z-index
3. ✅ Pressable has `onPress` handler

---

## 📋 Checklists

### Adding New Product Screen
- [ ] Map `seller_id` AND `sellerId` in product objects
- [ ] Map `seller` (store name) for display
- [ ] Include all product images
- [ ] Handle variants if product supports them
- [ ] Pass complete product object to ProductDetailScreen

### Adding New Order Screen
- [ ] Use `shipment_status` column for DB queries
- [ ] Map to UI status using statusMap
- [ ] Include both `id` and `orderId` in order objects
- [ ] Map items with both `id` and `productId`
- [ ] Use `orderId` for all DB operations

### Testing Review Flow
- [ ] Verify item has `productId` field
- [ ] Check `order.orderId` is UUID
- [ ] Confirm review appears in database
- [ ] Verify `order_items.rating` is updated
- [ ] Check review status updates in UI

---

**End of Buyer Flow Documentation**
