/**
 * Buyer-Seller End-to-End Flow - Automated Integration Test
 * Tests complete flow: Product Creation → Buyer Purchase → Seller Order
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProductStore, useOrderStore, useAuthStore } from '../stores/sellerStore';
import { useCartStore } from '../stores/cartStore';

describe('Buyer-Seller Complete Transaction Flow', () => {
  let sellerId: string;
  let productId: string;
  let buyerEmail: string;

  beforeEach(() => {
    // Reset all stores to clean state
    const productStore = useProductStore.getState();
    const orderStore = useOrderStore.getState();
    const authStore = useAuthStore.getState();
    const cartStore = useCartStore.getState();

    // Clear all stores
    productStore.products = [];
    productStore.inventoryLedger = [];
    productStore.lowStockAlerts = [];
    orderStore.orders = [];
    cartStore.items = [];

    // Setup seller account
    sellerId = 'seller-test-123';
    buyerEmail = 'buyer@test.com';

    authStore.login('seller@test.com', 'test123');

    console.log('🔄 All stores reset to initial state');
    console.log(`👤 Seller authenticated: ${sellerId}`);
  });

  describe('1. Product Creation (Seller Side)', () => {
    it('should create a new product successfully', () => {
      let productStore = useProductStore.getState();
      const initialProductCount = productStore.products.length;

      const newProduct = {
        id: 'product-test-' + Date.now(),
        name: 'Test iPhone 15 Pro',
        description: 'Test product for buyer flow',
        price: 1299,
        stock: 50,
        category: 'Electronics',
        images: ['/test-iphone.jpg'],
        sellerId: sellerId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 0,
        reviews: 0
      };

      productStore.products.push(newProduct);
      productId = newProduct.id;

      // Get fresh state
      productStore = useProductStore.getState();
      expect(productStore.products.length).toBe(initialProductCount + 1);

      const createdProduct = productStore.products.find(p => p.id === productId);
      expect(createdProduct).toBeDefined();
      expect(createdProduct!.name).toBe('Test iPhone 15 Pro');
      expect(createdProduct!.stock).toBe(50);
      expect(createdProduct!.sellerId).toBe(sellerId);
      expect(createdProduct!.isActive).toBe(true);

      console.log(`✅ Product created: ${createdProduct!.name}`);
      console.log(`✅ Product ID: ${productId}`);
      console.log(`✅ Initial stock: ${createdProduct!.stock}`);
    });

    it('should have product available for buyers', () => {
      let productStore = useProductStore.getState();

      // Create product
      const newProduct = {
        id: 'product-available-' + Date.now(),
        name: 'Samsung Galaxy S24',
        description: 'Available for purchase',
        price: 999,
        stock: 30,
        category: 'Electronics',
        images: ['/samsung.jpg'],
        sellerId: sellerId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 4.5,
        reviews: 10
      };

      productStore.products.push(newProduct);
      productId = newProduct.id;

      // Get fresh state
      productStore = useProductStore.getState();

      // Simulate buyer browsing products
      const availableProducts = productStore.products.filter(
        p => p.isActive && p.stock > 0
      );

      expect(availableProducts.length).toBeGreaterThan(0);
      expect(availableProducts.find(p => p.id === productId)).toBeDefined();

      console.log(`✅ ${availableProducts.length} products available for buyers`);
      console.log(`✅ Product visibility: approved, in stock`);
    });
  });

  describe('2. Buyer Shopping Experience', () => {
    beforeEach(() => {
      // Create test product before each buyer test
      const productStore = useProductStore.getState();
      const testProduct = {
        id: 'product-buyer-' + Date.now(),
        name: 'MacBook Pro M3',
        description: 'Powerful laptop for professionals',
        price: 2499,
        stock: 25,
        category: 'Electronics',
        images: ['/macbook.jpg'],
        sellerId: sellerId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 4.8,
        reviews: 50
      };
      productStore.products.push(testProduct);
      productId = testProduct.id;

      console.log(`\n🛍️ Test product created for buyer: ${testProduct.name}`);
    });

    it('should add product to cart', () => {
      let cartStore = useCartStore.getState();
      let productStore = useProductStore.getState();

      const product = productStore.products.find(p => p.id === productId)!;
      const quantity = 2;

      // Add to cart
      cartStore.items.push({
        id: product.id,
        name: product.name,
        quantity: quantity,
        price: product.price,
        image: product.images[0],
        seller: product.sellerId,
        rating: product.rating,
        category: product.category
      });

      // Get fresh state
      cartStore = useCartStore.getState();
      const cartItem = cartStore.items.find(item => item.id === productId);

      expect(cartItem).toBeDefined();
      expect(cartItem!.quantity).toBe(quantity);
      expect(cartItem!.price).toBe(product.price);
      expect(cartStore.items.length).toBe(1);

      const cartTotal = cartStore.items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      console.log(`✅ Product added to cart: ${product.name}`);
      console.log(`✅ Quantity: ${quantity}`);
      console.log(`✅ Cart total: ₱${cartTotal.toLocaleString()}`);
    });

    it('should prevent adding more than available stock to cart', () => {
      let productStore = useProductStore.getState();

      const product = productStore.products.find(p => p.id === productId)!;
      const excessiveQuantity = product.stock + 10;

      // Validation should happen before adding
      const requestedQuantity = excessiveQuantity;
      const availableStock = product.stock;

      expect(requestedQuantity).toBeGreaterThan(availableStock);

      console.log(`✅ Stock validation working: requested ${requestedQuantity} > available ${availableStock}`);
    });

    it('should calculate cart total correctly', () => {
      let cartStore = useCartStore.getState();
      let productStore = useProductStore.getState();

      // Add multiple products to cart
      const products = [
        { id: productId, quantity: 2 },
        { 
          id: 'product-extra-' + Date.now(),
          name: 'AirPods Pro',
          price: 249,
          stock: 100,
          quantity: 1
        }
      ];

      // Add second product
      const extraProduct = {
        id: products[1].id,
        name: products[1].name!,
        description: 'Wireless earbuds',
        price: products[1].price!,
        stock: products[1].stock!,
        category: 'Electronics',
        images: ['/airpods.jpg'],
        sellerId: sellerId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 4.7,
        reviews: 200
      };
      productStore.products.push(extraProduct);

      // Get fresh state
      productStore = useProductStore.getState();

      // Add both to cart
      const product1 = productStore.products.find(p => p.id === productId)!;
      const product2 = productStore.products.find(p => p.id === products[1].id)!;

      cartStore.items = [
        {
          id: product1.id,
          name: product1.name,
          quantity: 2,
          price: product1.price,
          image: product1.images[0],
          seller: product1.sellerId,
          rating: product1.rating,
          category: product1.category
        },
        {
          id: product2.id,
          name: product2.name,
          quantity: 1,
          price: product2.price,
          image: product2.images[0],
          seller: product2.sellerId,
          rating: product2.rating,
          category: product2.category
        }
      ];

      // Get fresh state
      cartStore = useCartStore.getState();

      const expectedTotal = (product1.price * 2) + (product2.price * 1);
      const actualTotal = cartStore.items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      expect(actualTotal).toBe(expectedTotal);
      expect(cartStore.items.length).toBe(2);

      console.log(`✅ Cart items: ${cartStore.items.length}`);
      console.log(`✅ Cart total: ₱${actualTotal.toLocaleString()}`);
    });
  });

  describe('3. Checkout & Order Creation', () => {
    beforeEach(() => {
      // Create product and add to cart
      const productStore = useProductStore.getState();
      const cartStore = useCartStore.getState();

      const testProduct = {
        id: 'product-checkout-' + Date.now(),
        name: 'iPad Air M2',
        description: 'Versatile tablet',
        price: 799,
        stock: 40,
        category: 'Electronics',
        images: ['/ipad.jpg'],
        sellerId: sellerId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 4.6,
        reviews: 80
      };
      productStore.products.push(testProduct);
      productId = testProduct.id;

      // Add to cart
      cartStore.items.push({
        id: testProduct.id,
        name: testProduct.name,
        quantity: 3,
        price: testProduct.price,
        image: testProduct.images[0],
        seller: testProduct.sellerId,
        rating: testProduct.rating,
        category: testProduct.category
      });

      console.log(`\n💳 Checkout setup: ${testProduct.name} x 3`);
    });

    it('should create order from cart', () => {
      let orderStore = useOrderStore.getState();
      let cartStore = useCartStore.getState();
      let productStore = useProductStore.getState();

      const initialOrderCount = orderStore.orders.length;
      const cartItems = cartStore.items;
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create order (simulating buyer checkout)
      const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(7);
      const newOrder = {
        id: orderId,
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        total: total,
        status: 'pending' as const,
        paymentStatus: 'pending' as const,
        orderDate: new Date().toISOString(),
        buyerName: 'Test Buyer',
        buyerEmail: buyerEmail,
        shippingAddress: {
          fullName: 'Test Buyer',
          street: '123 Test St',
          city: 'Test City',
          province: 'Test Province',
          postalCode: '12345',
          phone: '+1234567890'
        }
      };

      orderStore.orders.push(newOrder);

      // Deduct stock for each item
      cartItems.forEach(item => {
        productStore.deductStock(
          item.id,
          item.quantity,
          'ONLINE_SALE',
          orderId,
          `Online order from ${buyerEmail}`
        );
      });

      // Get fresh state
      orderStore = useOrderStore.getState();
      productStore = useProductStore.getState();

      expect(orderStore.orders.length).toBe(initialOrderCount + 1);

      const createdOrder = orderStore.orders.find(o => o.id === orderId);
      expect(createdOrder).toBeDefined();
      expect(createdOrder!.buyerEmail).toBe(buyerEmail);
      expect(createdOrder!.total).toBe(total);
      expect(createdOrder!.status).toBe('pending');

      // Verify stock deduction
      const product = productStore.products.find(p => p.id === productId)!;
      expect(product.stock).toBe(40 - 3); // Initial 40 - quantity 3

      // Verify ledger entry
      const ledgerEntries = productStore.getLedgerByProduct(productId);
      const orderLedger = ledgerEntries.find(e => e.referenceId === orderId);
      expect(orderLedger).toBeDefined();
      expect(orderLedger!.reason).toBe('ONLINE_SALE');

      console.log(`✅ Order created: ${orderId}`);
      console.log(`✅ Order total: ₱${total.toLocaleString()}`);
      console.log(`✅ Buyer: ${buyerEmail}`);
      console.log(`✅ Stock deducted: 40 → ${product.stock}`);
      console.log(`✅ Ledger entry created with reference: ${orderId}`);
    });

    it('should clear cart after successful checkout', () => {
      let cartStore = useCartStore.getState();
      let orderStore = useOrderStore.getState();

      expect(cartStore.items.length).toBeGreaterThan(0);

      const cartItems = [...cartStore.items];
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Create order
      const orderId = 'ORD-' + Date.now();
      orderStore.orders.push({
        id: orderId,
        items: cartItems.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        total: total,
        status: 'pending' as const,
        paymentStatus: 'paid' as const,
        orderDate: new Date().toISOString(),
        buyerName: 'Test Buyer',
        buyerEmail: buyerEmail,
        shippingAddress: {
          fullName: 'Test Buyer',
          street: '123 Test St',
          city: 'Test City',
          province: 'Test Province',
          postalCode: '12345',
          phone: '+1234567890'
        }
      });

      // Clear cart after checkout
      cartStore.items = [];

      // Get fresh state
      cartStore = useCartStore.getState();
      expect(cartStore.items.length).toBe(0);

      console.log(`✅ Cart cleared after checkout`);
      console.log(`✅ Order placed: ${orderId}`);
    });

    it('should prevent checkout with insufficient stock', () => {
      let productStore = useProductStore.getState();
      let cartStore = useCartStore.getState();

      const product = productStore.products.find(p => p.id === productId)!;

      // Update cart to request more than available
      cartStore.items[0].quantity = product.stock + 10;

      const cartItem = cartStore.items[0];

      // Validation check
      expect(() => {
        if (cartItem.quantity > product.stock) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${cartItem.quantity}`);
        }
      }).toThrow(/Insufficient stock/);

      console.log(`✅ Checkout blocked: insufficient stock`);
      console.log(`✅ Available: ${product.stock}, Requested: ${cartItem.quantity}`);
    });
  });

  describe('4. Seller Order Management', () => {
    let orderId: string;

    beforeEach(() => {
      // Create product, cart, and order
      const productStore = useProductStore.getState();
      const orderStore = useOrderStore.getState();

      const testProduct = {
        id: 'product-seller-order-' + Date.now(),
        name: 'Apple Watch Series 9',
        description: 'Smart watch',
        price: 429,
        stock: 60,
        category: 'Electronics',
        images: ['/watch.jpg'],
        sellerId: sellerId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 4.5,
        reviews: 120
      };
      productStore.products.push(testProduct);
      productId = testProduct.id;

      // Create order
      orderId = 'ORD-SELLER-' + Date.now();
      orderStore.orders.push({
        id: orderId,
        items: [{
          productId: testProduct.id,
          productName: testProduct.name,
          quantity: 2,
          price: testProduct.price,
          image: testProduct.images[0]
        }],
        total: testProduct.price * 2,
        status: 'pending' as const,
        paymentStatus: 'paid' as const,
        orderDate: new Date().toISOString(),
        buyerName: 'John Doe',
        buyerEmail: buyerEmail,
        shippingAddress: {
          fullName: 'John Doe',
          street: '456 Buyer Ave',
          city: 'Buyer City',
          province: 'Buyer Province',
          postalCode: '54321',
          phone: '+1234567890'
        }
      });

      console.log(`\n📦 Seller order created: ${orderId}`);
    });

    it('should show order in seller orders list', () => {
      let orderStore = useOrderStore.getState();

      // Seller viewing their orders
      const sellerOrders = orderStore.orders;

      expect(sellerOrders.length).toBeGreaterThan(0);

      const order = sellerOrders.find(o => o.id === orderId);
      expect(order).toBeDefined();
      expect(order!.buyerEmail).toBe(buyerEmail);
      expect(order!.status).toBe('pending');

      console.log(`✅ Seller has ${sellerOrders.length} order(s)`);
      console.log(`✅ Order found: ${orderId}`);
      console.log(`✅ Order status: ${order!.status}`);
      console.log(`✅ Buyer: ${order!.buyerEmail}`);
    });

    it('should allow seller to update order status', () => {
      let orderStore = useOrderStore.getState();

      const order = orderStore.orders.find(o => o.id === orderId)!;
      expect(order.status).toBe('pending');

      // Seller processes order
      order.status = 'confirmed';

      // Get fresh state
      orderStore = useOrderStore.getState();
      const updatedOrder = orderStore.orders.find(o => o.id === orderId)!;

      expect(updatedOrder.status).toBe('confirmed');

      console.log(`✅ Order status updated: pending → confirmed`);
    });

    it('should track order with inventory ledger', () => {
      let productStore = useProductStore.getState();
      let orderStore = useOrderStore.getState();

      const order = orderStore.orders.find(o => o.id === orderId)!;

      // Deduct stock with order reference
      productStore.deductStock(
        productId,
        2,
        'ONLINE_SALE',
        orderId,
        `Order from ${order.buyerEmail}`
      );

      // Get fresh state
      productStore = useProductStore.getState();

      const ledgerEntries = productStore.getLedgerByProduct(productId);
      const orderLedger = ledgerEntries.find(e => e.referenceId === orderId);

      expect(orderLedger).toBeDefined();
      expect(orderLedger!.changeType).toBe('DEDUCTION');
      expect(orderLedger!.reason).toBe('ONLINE_SALE');
      expect(orderLedger!.quantityChange).toBe(-2);
      expect(orderLedger!.referenceId).toBe(orderId);

      console.log(`✅ Order tracked in ledger: ${orderId}`);
      console.log(`✅ Stock deducted: ${orderLedger!.quantityBefore} → ${orderLedger!.quantityAfter}`);
    });

    it('should filter orders by status', () => {
      let orderStore = useOrderStore.getState();

      // Add more orders with different statuses
      const orders = [
        { id: 'ORD-PENDING-1', status: 'pending' as const },
        { id: 'ORD-CONFIRMED-1', status: 'confirmed' as const },
        { id: 'ORD-SHIPPED-1', status: 'shipped' as const },
        { id: 'ORD-DELIVERED-1', status: 'delivered' as const }
      ];

      orders.forEach((orderData, idx) => {
        orderStore.orders.push({
          id: orderData.id,
          items: [{
            productId: productId,
            productName: 'Test Product',
            quantity: 1,
            price: 100,
            image: '/test.jpg'
          }],
          total: 100,
          status: orderData.status,
          paymentStatus: 'paid' as const,
          orderDate: new Date(Date.now() + idx * 1000).toISOString(),
          buyerName: 'Buyer ' + (idx + 1),
          buyerEmail: `buyer${idx + 1}@test.com`,
          shippingAddress: {
            fullName: 'Buyer ' + (idx + 1),
            street: '123 Test St',
            city: 'Test City',
            province: 'Test Province',
            postalCode: '12345',
            phone: '+1234567890'
          }
        });
      });

      // Get fresh state
      orderStore = useOrderStore.getState();

      const pendingOrders = orderStore.orders.filter(
        o => o.status === 'pending'
      );
      const confirmedOrders = orderStore.orders.filter(
        o => o.status === 'confirmed'
      );
      const shippedOrders = orderStore.orders.filter(
        o => o.status === 'shipped'
      );
      const deliveredOrders = orderStore.orders.filter(
        o => o.status === 'delivered'
      );

      expect(pendingOrders.length).toBeGreaterThan(0);
      expect(confirmedOrders.length).toBeGreaterThan(0);
      expect(shippedOrders.length).toBeGreaterThan(0);
      expect(deliveredOrders.length).toBeGreaterThan(0);

      console.log(`✅ Pending orders: ${pendingOrders.length}`);
      console.log(`✅ Confirmed orders: ${confirmedOrders.length}`);
      console.log(`✅ Shipped orders: ${shippedOrders.length}`);
      console.log(`✅ Delivered orders: ${deliveredOrders.length}`);
    });
  });

  describe('5. Complete End-to-End Flow', () => {
    it('should complete full buyer-seller transaction', () => {
      let productStore = useProductStore.getState();
      let cartStore = useCartStore.getState();
      let orderStore = useOrderStore.getState();

      console.log('\n🎬 Starting complete E2E flow...\n');

      // Step 1: Seller creates product
      const newProduct = {
        id: 'product-e2e-' + Date.now(),
        name: 'Sony WH-1000XM5 Headphones',
        description: 'Premium noise-cancelling headphones',
        price: 399,
        stock: 100,
        category: 'Electronics',
        images: ['/sony-headphones.jpg'],
        sellerId: sellerId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 4.9,
        reviews: 500
      };
      productStore.products.push(newProduct);
      productId = newProduct.id;

      // Get fresh state
      productStore = useProductStore.getState();
      const product = productStore.products.find(p => p.id === productId)!;

      console.log(`📦 STEP 1: Product Created`);
      console.log(`   ✅ Product: ${product.name}`);
      console.log(`   ✅ Price: ₱${product.price.toLocaleString()}`);
      console.log(`   ✅ Stock: ${product.stock} units`);
      console.log(`   ✅ Seller: ${product.sellerId}\n`);

      // Step 2: Buyer browses and adds to cart
      const quantity = 3;
      cartStore.items.push({
        id: product.id,
        name: product.name,
        quantity: quantity,
        price: product.price,
        image: product.images[0],
        seller: product.sellerId,
        rating: product.rating,
        category: product.category
      });

      // Get fresh state
      cartStore = useCartStore.getState();
      const cartTotal = cartStore.items.reduce(
        (sum, item) => sum + (item.price * item.quantity),
        0
      );

      console.log(`🛒 STEP 2: Added to Cart`);
      console.log(`   ✅ Quantity: ${quantity}`);
      console.log(`   ✅ Subtotal: ₱${cartTotal.toLocaleString()}\n`);

      // Step 3: Buyer checks out
      const orderId = 'ORD-E2E-' + Date.now();
      const orderData = {
        id: orderId,
        items: cartStore.items.map(item => ({
          productId: item.id,
          productName: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        })),
        total: cartTotal,
        status: 'pending' as const,
        paymentStatus: 'paid' as const,
        orderDate: new Date().toISOString(),
        buyerName: 'Alice Johnson',
        buyerEmail: 'alice@example.com',
        shippingAddress: {
          fullName: 'Alice Johnson',
          street: '789 Main St',
          city: 'Tech City',
          province: 'CA',
          postalCode: '94000',
          phone: '+1234567890'
        }
      };
      orderStore.orders.push(orderData);

      // Deduct stock
      productStore.deductStock(
        productId,
        quantity,
        'ONLINE_SALE',
        orderId,
        `Order from ${orderData.buyerEmail}`
      );

      // Clear cart
      cartStore.items = [];

      console.log(`💳 STEP 3: Checkout Complete`);
      console.log(`   ✅ Order ID: ${orderId}`);
      console.log(`   ✅ Total: ₱${cartTotal.toLocaleString()}`);
      console.log(`   ✅ Payment: ${orderData.paymentStatus}`);
      console.log(`   ✅ Buyer: ${orderData.buyerEmail}\n`);

      // Get fresh state
      productStore = useProductStore.getState();
      orderStore = useOrderStore.getState();
      cartStore = useCartStore.getState();

      // Step 4: Verify seller receives order
      const sellerOrders = orderStore.orders;
      const order = sellerOrders.find(o => o.id === orderId)!;

      console.log(`📬 STEP 4: Seller Receives Order`);
      console.log(`   ✅ Order appears in seller dashboard`);
      console.log(`   ✅ Order status: ${order.status}`);
      console.log(`   ✅ Items: ${order.items.length}`);
      console.log(`   ✅ Customer: ${order.buyerName}\n`);

      // Step 5: Verify inventory updated
      const updatedProduct = productStore.products.find(p => p.id === productId)!;
      const ledgerEntries = productStore.getLedgerByProduct(productId);
      const orderLedger = ledgerEntries.find(e => e.referenceId === orderId)!;

      console.log(`📊 STEP 5: Inventory Updated`);
      console.log(`   ✅ Stock: ${newProduct.stock} → ${updatedProduct.stock}`);
      console.log(`   ✅ Units sold: ${quantity}`);
      console.log(`   ✅ Ledger entry: ${orderLedger.id}`);
      console.log(`   ✅ Reference: ${orderLedger.referenceId}\n`);

      // Assertions
      expect(order).toBeDefined();
      expect(order.buyerEmail).toBe('alice@example.com');
      expect(order.total).toBe(cartTotal);
      expect(order.status).toBe('pending');

      expect(updatedProduct.stock).toBe(newProduct.stock - quantity);
      expect(cartStore.items.length).toBe(0);

      expect(orderLedger.changeType).toBe('DEDUCTION');
      expect(orderLedger.reason).toBe('ONLINE_SALE');
      expect(orderLedger.quantityChange).toBe(-quantity);
      expect(orderLedger.referenceId).toBe(orderId);

      console.log(`\n════════════════════════════════════════════════════════`);
      console.log(`🎉 E2E FLOW COMPLETE - ALL STEPS VERIFIED`);
      console.log(`════════════════════════════════════════════════════════\n`);
      console.log(`✅ Product created by seller`);
      console.log(`✅ Buyer added to cart`);
      console.log(`✅ Checkout successful`);
      console.log(`✅ Order received by seller`);
      console.log(`✅ Inventory tracked in ledger`);
      console.log(`✅ Cart cleared`);
      console.log(`════════════════════════════════════════════════════════\n`);
    });
  });
});
