# BAZAAR Quick Bug Fix Reference Guide
**For AI Agents** - Common Issues & Solutions

---

## 🚨 Most Common Bugs

### 1. Order Received Button Doesn't Move Order to Completed Tab

**Symptoms:**
- User clicks "Order Received"
- Success message shows
- Order still in "To Receive" tab
- Doesn't appear in "Completed" tab

**Root Causes:**
- ❌ Using `status` column instead of `shipment_status`
- ❌ Using `order.id` (order_number) instead of `orderId` (UUID)
- ❌ Status mapping wrong (received → pending instead of delivered)
- ❌ Completed filter using `o.id` instead of `o.orderId`

**Fix:**
```typescript
// ✅ CORRECT
const realOrderId = (order as any).orderId || order.id;  // Get UUID

const { error } = await supabase
  .from('orders')
  .update({ shipment_status: 'received' })  // ✅ shipment_status column
  .eq('id', realOrderId);                    // ✅ Use UUID

// Update local state to 'delivered' (not 'received')
setDbOrders(prev => prev.map(o =>
  ((o as any).orderId || o.id) === realOrderId 
    ? { ...o, status: 'delivered' }  // ✅ Maps to 'delivered'
    : o
));

// Completed tab filter
baseOrders = dbOrders.filter(o =>
  o.status === 'delivered' &&  // ✅ Includes 'received' status
  !returnRequests.some(req => 
    req.orderId === ((o as any).orderId || o.id)  // ✅ Use orderId
  )
);
```

**Files to Check:**
- `mobile-app/app/OrdersScreen.tsx` lines 350-385 (handleOrderReceived)
- `mobile-app/app/OrdersScreen.tsx` lines 289-340 (filteredOrders)

---

### 2. Review Submission Fails / "Product not found"

**Symptoms:**
- User clicks "Review"
- Selects product
- Clicks submit
- Error: "Product not found" or "Failed to submit review"

**Root Causes:**
- ❌ Item only has `id` (order_item UUID), no `productId`
- ❌ ReviewModal trying to create review with `item.id` instead of `productId`
- ❌ Using `order.id` (order_number) instead of `orderId`
- ❌ Trying to insert `seller_id` in reviews table (column doesn't exist)

**Fix:**
```typescript
// ✅ CORRECT item mapping (OrdersScreen.tsx, HistoryScreen.tsx)
return {
  id: it.id || `${order.id}_${it.product_id}`,  // order_item id for UI
  productId: p.id || it.product_id,              // ✅ CRITICAL: product UUID
  name: productName,
  // ... rest
};

// ✅ CORRECT review submission
const realOrderId = (order as any).orderId || order.id;  // UUID
const item = order.items.find(i => 
  (i as any).productId === productId || i.id === productId
);

await reviewService.createReview({
  product_id: productId,      // ✅ Use productId
  buyer_id: user.id,
  order_id: realOrderId,      // ✅ Use UUID
  rating,
  comment: review || null,
  is_verified_purchase: true,
  // ❌ NO seller_id!
});
```

**Files to Check:**
- `mobile-app/app/OrdersScreen.tsx` lines 140-200 (item mapping)
- `mobile-app/app/HistoryScreen.tsx` lines 80-100 (item mapping)
- `mobile-app/src/components/ReviewModal.tsx` lines 60-110
- `mobile-app/src/services/reviewService.ts` (Review interface)

**Database:**
```sql
-- ✅ Reviews table has NO seller_id column
CREATE TABLE reviews (
  id uuid,
  product_id uuid,    -- ✅
  buyer_id uuid,      -- ✅
  order_id uuid,      -- ✅
  rating integer,
  comment text
  -- ❌ NO seller_id!
);
```

---

### 3. Chat Seller Shows "Store information unavailable"

**Symptoms:**
- User clicks "Chat Seller" button
- Modal opens but shows error message
- Can't start conversation

**Root Causes:**
- ❌ Product missing `seller_id` field
- ❌ Product only has `sellerId` but StoreChatModal checks `seller_id`
- ❌ Product mapping incomplete from some screens

**Fix:**
```typescript
// ✅ CORRECT: Product mapping in ALL screens
// (HomeScreen, ShopScreen, StoreDetailScreen, FlashSaleScreen)
return {
  id: row.id,
  name: row.name,
  seller_id: row.seller_id || row.seller?.id,  // ✅ snake_case
  sellerId: row.seller_id || row.seller?.id,   // ✅ camelCase alias
  seller: row.seller?.store_name || 'Store',   // ✅ Display name
  // ... rest
};

// ✅ CORRECT: StoreChatModal prop
<StoreChatModal
  visible={showChat}
  onClose={() => setShowChat(false)}
  storeName={product.seller || 'Store'}
  sellerId={product.seller_id || product.sellerId}  // ✅ Check both
/>

// ✅ CORRECT: Visit Store also needs seller_id
const handleVisitStore = () => {
  const sellerId = product.seller_id || product.sellerId;
  if (!sellerId) {
    Alert.alert('Store Unavailable', 'Store information is not available.');
    return;
  }
  navigation.push('StoreDetail', {
    store: { id: sellerId, name: product.seller, /* ... */ }
  });
};
```

**Files to Check:**
- `mobile-app/app/HomeScreen.tsx` lines 160-190 (product mapping)
- `mobile-app/app/StoreDetailScreen.tsx` lines 130-160 (product mapping)
- `mobile-app/app/ProductDetailScreen.tsx` lines 1095-1105 (StoreChatModal)
- `mobile-app/app/ProductDetailScreen.tsx` lines 515-530 (handleVisitStore)

---

### 4. Menu Button (3 dots) Not Clickable

**Symptoms:**
- User taps menu button (3 dots next to cart)
- Nothing happens
- Button appears but doesn't respond

**Root Causes:**
- ❌ Hit area too small (4px dots are hard to tap)
- ❌ Overlapping transparent elements
- ❌ Missing `onPress` handler

**Fix:**
```typescript
// ✅ CORRECT: Add hitSlop and padding
<Pressable 
  style={[styles.iconButton, { padding: 8, marginLeft: 4 }]} 
  onPress={() => setShowMenu(true)}
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}  // ✅
>
  <View style={{ gap: 3 }}>
    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
    <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFF' }} />
  </View>
</Pressable>

// ✅ Menu Modal must exist
<Modal
  visible={showMenu}
  transparent
  animationType="fade"
  onRequestClose={() => setShowMenu(false)}
>
  {/* Menu items */}
</Modal>
```

**Files to Check:**
- `mobile-app/app/ProductDetailScreen.tsx` lines 595-605 (menu button)
- `mobile-app/app/ProductDetailScreen.tsx` lines 1105-1135 (menu modal)

---

### 5. Shop Profile / Store Detail Error Fetching

**Symptoms:**
- User clicks "Visit Store"
- Loads but shows errors
- Follower count missing
- Can't follow store

**Root Causes:**
- ❌ `sellerService.getSellerById()` throws instead of returning null
- ❌ Error not caught when seller doesn't exist
- ❌ Missing seller_id in product object

**Fix:**
```typescript
// ✅ CORRECT: sellerService should return null, not throw
async getSellerById(sellerId: string): Promise<SellerData | null> {
  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('...')
      .eq('id', sellerId)
      .single();

    // ✅ Handle "not found" error gracefully
    if (error) {
      if (error.code === 'PGRST116') {  // No rows returned
        return null;
      }
      throw error;
    }
    
    return this.transformSeller(data);
  } catch (error) {
    console.error('Error fetching seller:', error);
    return null;  // ✅ Return null, don't throw
  }
}

// ✅ CORRECT: Handle null in StoreDetailScreen
try {
  const seller = await sellerService.getSellerById(store.id);
  if (seller) {
    setStoreData(seller);
  }
  
  // Non-critical: follower count
  try {
    const count = await sellerService.getFollowerCount(store.id);
    setFollowerCount(count);
  } catch (e) {
    console.warn('Could not fetch follower count:', e);
  }
} catch (error) {
  console.error('Error fetching store data:', error);
}
```

**Files to Check:**
- `mobile-app/src/services/sellerService.ts` lines 125-155 (getSellerById)
- `mobile-app/app/StoreDetailScreen.tsx` lines 70-110 (fetchStoreData)

---

### 6. Purchase History Error Fetching

**Symptoms:**
- History tab shows error or empty
- Past orders not loading

**Root Causes:**
- ❌ Using `status` column instead of `shipment_status`
- ❌ Querying for wrong status values
- ❌ Not handling null items

**Fix:**
```typescript
// ✅ CORRECT: Query with shipment_status
const { data, error } = await supabase
  .from('orders')
  .select(`
    *,
    items:order_items (
      *,
      product:products (
        *,
        images:product_images (image_url, is_primary)
      )
    )
  `)
  .eq('buyer_id', user.id)
  .in('shipment_status', ['delivered', 'received'])  // ✅ shipment_status
  .order('created_at', { ascending: false });

// ✅ Map with productId
items: items.map((it: any) => ({
  id: it.id || `${order.id}_${it.product_id}`,
  productId: it.product_id,  // ✅ CRITICAL
  name: it.product_name || it.product?.name || 'Product',
  // ... rest
}))
```

**Files to Check:**
- `mobile-app/app/HistoryScreen.tsx` lines 48-120 (loadHistory)

---

## 🔧 Quick Debug Commands

### Check Order in Database
```sql
SELECT id, order_number, shipment_status, payment_status, created_at
FROM orders 
WHERE buyer_id = 'USER_UUID_HERE'
ORDER BY created_at DESC
LIMIT 10;
```

### Check Review Exists
```sql
SELECT * FROM reviews
WHERE order_id = 'ORDER_UUID_HERE' 
  AND product_id = 'PRODUCT_UUID_HERE';
```

### Check Seller Exists
```sql
SELECT id, store_name, approval_status, verified_at
FROM sellers
WHERE id = 'SELLER_UUID_HERE';
```

### Check Conversation
```sql
SELECT c.*, 
       (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
FROM conversations c
WHERE buyer_id = 'BUYER_UUID_HERE';
```

---

## 📝 Pre-Commit Checklist

Before committing changes that affect buyer flow:

### Product Mapping
- [ ] Both `seller_id` and `sellerId` included
- [ ] `seller` name for display
- [ ] All images mapped correctly
- [ ] Variants preserved

### Order Mapping
- [ ] Both `id` and `orderId` fields
- [ ] Uses `shipment_status` not `status`
- [ ] Status mapped correctly (received → delivered)
- [ ] Items have both `id` and `productId`

### Review Flow
- [ ] Item has `productId` field
- [ ] Uses `orderId` (UUID) not `id`
- [ ] NO `seller_id` in review data
- [ ] Error handling for missing product

### Chat Flow
- [ ] Product has `seller_id` or `sellerId`
- [ ] StoreChatModal checks both variants
- [ ] Handles guest users gracefully

### Error Handling
- [ ] Services return null, don't throw on not found
- [ ] UI handles null/undefined gracefully
- [ ] User-friendly error messages
- [ ] Console logs for debugging

---

## 🎯 Testing Checklist

### Order Flow
1. [ ] Add product to cart
2. [ ] Checkout and create order
3. [ ] See order in "To Pay" tab
4. [ ] Mark as received
5. [ ] Verify moves to "Completed" tab
6. [ ] Review product from completed order

### Review Flow
1. [ ] Open completed order
2. [ ] Click "Review" button
3. [ ] Select product
4. [ ] Submit rating and comment
5. [ ] Verify review appears in database
6. [ ] Verify "Already Reviewed" badge shows

### Chat Flow
1. [ ] Open product detail
2. [ ] Click "Chat Seller"
3. [ ] Send message
4. [ ] Verify message in database
5. [ ] Check real-time updates work

### Store Navigation
1. [ ] Click "Visit Store" from product
2. [ ] Verify store loads correctly
3. [ ] Check follower count
4. [ ] Test follow/unfollow

---

**End of Quick Reference**
