# Database Migration Guide

## Overview
This guide explains how to migrate from Zustand local storage to a real database (PostgreSQL, MySQL, MongoDB, etc.).

## Current Architecture

### Data Stores
- **sellerStore.ts**: Seller authentication, products, orders
- **cartStore.ts**: Buyer cart and orders
- **productQAStore.ts**: Product quality assurance workflow

### Data Flow
```
Buyer Checkout → Cart Store (createOrder)
                     ↓
              Seller Store (addOrder)
                     ↓
              Seller Dashboard (/seller/orders)
```

## Database Schema

### Orders Table
```sql
CREATE TABLE orders (
  id VARCHAR(50) PRIMARY KEY,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  seller_id VARCHAR(50) NOT NULL,
  total DECIMAL(10, 2) NOT NULL CHECK (total > 0),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  order_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  tracking_number VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_seller_id (seller_id),
  INDEX idx_status (status),
  INDEX idx_order_date (order_date),
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL CHECK (quantity > 0),
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  image VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_product_id (product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
```

### Shipping Addresses Table
```sql
CREATE TABLE shipping_addresses (
  id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL UNIQUE,
  full_name VARCHAR(255) NOT NULL,
  street VARCHAR(500) NOT NULL,
  city VARCHAR(100) NOT NULL,
  province VARCHAR(100) NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);
```

## Migration Steps

### 1. Backend API Setup

#### Create Order Endpoint
```typescript
// POST /api/orders
interface CreateOrderRequest {
  buyerName: string;
  buyerEmail: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
  }>;
  total: number;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  paymentMethod: {
    type: 'card' | 'gcash' | 'paymaya' | 'cod';
    details?: string;
  };
}

async function createOrder(req: CreateOrderRequest) {
  // 1. Validate input (matches validateOrder in sellerStore.ts)
  // 2. Start database transaction
  // 3. Insert order
  // 4. Insert order items
  // 5. Insert shipping address
  // 6. Commit transaction
  // 7. Return order ID
}
```

#### Get Orders Endpoint
```typescript
// GET /api/sellers/:sellerId/orders
// GET /api/sellers/:sellerId/orders?status=pending
// GET /api/sellers/:sellerId/orders/:orderId

interface GetOrdersResponse {
  orders: Order[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
```

#### Update Order Endpoint
```typescript
// PATCH /api/orders/:orderId/status
// PATCH /api/orders/:orderId/payment-status
// PATCH /api/orders/:orderId/tracking

interface UpdateOrderRequest {
  status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus?: 'pending' | 'paid' | 'refunded';
  trackingNumber?: string;
}
```

### 2. Update Zustand Stores

#### Replace sellerStore.ts addOrder
```typescript
// Before (current)
addOrder: (orderData) => {
  const orderId = generateId();
  const newOrder = { id: orderId, ...orderData };
  set((state) => ({ orders: [...state.orders, newOrder] }));
  return orderId;
}

// After (with API)
addOrder: async (orderData) => {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  
  if (!response.ok) throw new Error('Failed to create order');
  
  const { orderId, order } = await response.json();
  set((state) => ({ orders: [...state.orders, order] }));
  return orderId;
}
```

#### Replace cartStore.ts createOrder
```typescript
// Update to call both buyer and seller order APIs
createOrder: async (orderData) => {
  // 1. Create buyer order
  const buyerOrderId = await createBuyerOrder(orderData);
  
  // 2. Group by seller and create seller orders
  const sellerOrders = await Promise.all(
    Object.entries(groupedBySeller).map(([sellerId, items]) =>
      createSellerOrder({ sellerId, items, ...orderData })
    )
  );
  
  return buyerOrderId;
}
```

### 3. Add Real-time Updates (Optional)

#### WebSocket/SSE for Order Status
```typescript
// Listen for order updates
const socket = io('/orders');

socket.on('order-updated', (data) => {
  const { orderId, status } = data;
  updateOrderStatus(orderId, status);
});
```

### 4. Data Migration

#### Export Current Zustand Data
```typescript
// Run in browser console
const orders = JSON.parse(localStorage.getItem('seller-orders-storage'));
console.log(JSON.stringify(orders, null, 2));
```

#### Import to Database
```typescript
// Migration script
import orders from './exported-orders.json';

for (const order of orders.state.orders) {
  await db.insert('orders', {
    id: order.id,
    buyer_name: order.buyerName,
    buyer_email: order.buyerEmail,
    seller_id: getSellerId(order),
    total: order.total,
    status: order.status,
    payment_status: order.paymentStatus,
    order_date: order.orderDate,
    tracking_number: order.trackingNumber
  });
  
  for (const item of order.items) {
    await db.insert('order_items', {
      id: generateId(),
      order_id: order.id,
      product_id: item.productId,
      product_name: item.productName,
      quantity: item.quantity,
      price: item.price,
      image: item.image
    });
  }
  
  await db.insert('shipping_addresses', {
    id: generateId(),
    order_id: order.id,
    ...order.shippingAddress
  });
}
```

## Validation Rules (Already Implemented)

### Order Validation
- ✅ `buyerName` must not be empty
- ✅ `buyerEmail` must be valid email
- ✅ `items` array must have at least one item
- ✅ `total` must be greater than 0
- ✅ `shippingAddress` must have all required fields
- ✅ Item `quantity` must be >= 1
- ✅ Item `price` must be >= 0

### Status Transition Rules
```typescript
const validTransitions = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': ['shipped', 'cancelled'],
  'shipped': ['delivered', 'cancelled'],
  'delivered': [], // Final state
  'cancelled': []  // Final state
};
```

## Error Handling

### Current Implementation
- ✅ Try-catch blocks in all CRUD operations
- ✅ Console logging for debugging
- ✅ Validation before data modifications
- ✅ Throw errors for invalid operations

### Database Implementation
```typescript
try {
  await db.transaction(async (trx) => {
    const orderId = await trx.insert('orders', orderData);
    await trx.insert('order_items', items);
    await trx.insert('shipping_addresses', address);
  });
} catch (error) {
  if (error.code === 'ER_DUP_ENTRY') {
    throw new Error('Order already exists');
  }
  if (error.code === 'ER_NO_REFERENCED_ROW') {
    throw new Error('Invalid product or seller');
  }
  throw error;
}
```

## Performance Optimizations

### Current (Zustand)
- ✅ All data in memory (fast reads)
- ✅ LocalStorage persistence
- ❌ No pagination
- ❌ No indexing

### Database
- ✅ Indexed queries (seller_id, status, order_date)
- ✅ Pagination support
- ✅ Efficient joins
- ✅ Concurrent access handling

## Testing Checklist

- [ ] Create order flow (buyer → seller)
- [ ] Update order status
- [ ] Update payment status
- [ ] Add tracking number
- [ ] Filter orders by status
- [ ] Search orders
- [ ] Concurrent order creation
- [ ] Transaction rollback on error
- [ ] Data validation
- [ ] Status transition validation

## Rollback Plan

If migration fails:
1. Keep Zustand stores as fallback
2. Feature flag to switch between local/API
3. Export data before migration
4. Database snapshots before major changes

```typescript
const USE_API = process.env.VITE_USE_DATABASE === 'true';

const createOrder = USE_API 
  ? createOrderAPI 
  : createOrderLocal;
```

## Cost Analysis

### Current (Zustand)
- **Storage**: Free (browser localStorage, ~5-10MB limit)
- **Performance**: Instant (local)
- **Scalability**: Limited to single user/browser

### Database
- **Storage**: ~$10-50/month (cloud database)
- **Performance**: 50-200ms (network + query)
- **Scalability**: Unlimited users, concurrent access

## Next Steps

1. **Phase 1**: Set up backend API endpoints
2. **Phase 2**: Add API client functions
3. **Phase 3**: Update Zustand to use API
4. **Phase 4**: Migrate existing data
5. **Phase 5**: Remove local storage fallback
6. **Phase 6**: Add real-time updates

---

**Note**: All validation, error handling, and data integrity checks are already implemented in the current Zustand stores. The transition to a database is primarily changing the storage layer while keeping the same business logic.
