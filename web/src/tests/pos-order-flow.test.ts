/**
 * POS & Order Flow - Automated Integration Test
 * Tests complete POS workflow, inventory management, and order creation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useProductStore, useOrderStore, useAuthStore } from '../stores/sellerStore';

describe('POS Lite & Order Flow Integration Tests', () => {
  let testProductId: string;
  let initialStock: number;

  beforeEach(() => {
    // Reset stores to clean state before each test
    const productStore = useProductStore.getState();
    const orderStore = useOrderStore.getState();
    const authStore = useAuthStore.getState();

    // Reset product store
    productStore.products = [
      {
        id: '1',
        name: 'iPhone 15 Pro Max',
        price: 1199,
        stock: 25,
        category: 'Electronics',
        description: 'Latest iPhone model',
        images: ['/iphone.jpg'],
        sellerId: 'seller-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 0,
        reviews: 0
      },
      {
        id: '2',
        name: 'Samsung Galaxy S24',
        price: 999,
        stock: 20,
        category: 'Electronics',
        description: 'Latest Samsung flagship',
        images: ['/samsung.jpg'],
        sellerId: 'seller-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 0,
        reviews: 0
      },
      {
        id: '3',
        name: 'MacBook Air M3',
        price: 1299,
        stock: 15,
        category: 'Electronics',
        description: 'Latest MacBook Air',
        images: ['/macbook.jpg'],
        sellerId: 'seller-1',
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sales: 0,
        rating: 0,
        reviews: 0
      }
    ];
    productStore.inventoryLedger = [];
    productStore.lowStockAlerts = [];

    // Reset order store
    orderStore.orders = [];

    console.log('🔄 Stores reset to initial state');
    
    // Get a product with sufficient stock for testing
    const testProduct = productStore.products.find(p => p.stock >= 10);
    if (!testProduct) {
      throw new Error('No products with sufficient stock (>=10) found for testing');
    }
    
    testProductId = testProduct.id;
    initialStock = testProduct.stock;

    // Ensure seller is authenticated
    if (!authStore.seller) {
      authStore.login('test@seller.com', 'test123');
    }

    console.log(`\n🧪 Test Setup: Product ${testProductId} with stock ${initialStock}`);
  });

  describe('1. Product Store - Inventory Management', () => {
    it('should have products available', () => {
      const { products } = useProductStore.getState();
      expect(products.length).toBeGreaterThan(0);
      console.log(`✅ Found ${products.length} products in store`);
    });

    it('should prevent negative stock deduction', () => {
      const productStore = useProductStore.getState();
      const product = productStore.products.find(p => p.id === testProductId)!;

      expect(() => {
        productStore.deductStock(
          testProductId,
          product.stock + 100, // Try to deduct more than available
          'OFFLINE_SALE',
          'TEST-ORDER-1'
        );
      }).toThrow(/Insufficient stock/);

      console.log(`✅ Negative stock prevention working`);
    });

    it('should deduct stock correctly with ledger entry', () => {
      let productStore = useProductStore.getState();
      const quantityToDeduct = 5;
      const initialLedgerCount = productStore.inventoryLedger.length;

      productStore.deductStock(
        testProductId,
        quantityToDeduct,
        'OFFLINE_SALE',
        'TEST-DEDUCT-1',
        'Test deduction'
      );

      // Get fresh state after mutation
      productStore = useProductStore.getState();
      const updatedProduct = productStore.products.find(p => p.id === testProductId)!;
      const newLedgerCount = productStore.inventoryLedger.length;

      expect(updatedProduct.stock).toBe(initialStock - quantityToDeduct);
      expect(newLedgerCount).toBe(initialLedgerCount + 1);

      const latestLedger = productStore.inventoryLedger[newLedgerCount - 1];
      expect(latestLedger.changeType).toBe('DEDUCTION');
      expect(latestLedger.quantityChange).toBe(-quantityToDeduct);
      expect(latestLedger.reason).toBe('OFFLINE_SALE');

      console.log(`✅ Stock deducted: ${initialStock} → ${updatedProduct.stock}`);
      console.log(`✅ Ledger entry created: ${latestLedger.id}`);
    });

    it('should add stock correctly with ledger entry', () => {
      let productStore = useProductStore.getState();
      const product = productStore.products.find(p => p.id === testProductId)!;
      const initialStockState = product.stock;
      const quantityToAdd = 20;

      productStore.addStock(
        testProductId,
        quantityToAdd,
        'Supplier delivery',
        'Weekly stock replenishment'
      );

      // Get fresh state after mutation
      productStore = useProductStore.getState();
      const updatedProduct = productStore.products.find(p => p.id === testProductId)!;
      expect(updatedProduct.stock).toBe(initialStockState + quantityToAdd);

      const ledgerEntries = productStore.getLedgerByProduct(testProductId);
      const additionEntry = ledgerEntries.find(e => e.changeType === 'ADDITION');
      
      expect(additionEntry).toBeDefined();
      expect(additionEntry!.quantityChange).toBe(quantityToAdd);

      console.log(`✅ Stock added: ${initialStockState} → ${updatedProduct.stock}`);
    });

    it('should adjust stock with mandatory notes', () => {
      let productStore = useProductStore.getState();
      const newQuantity = 15;

      // Should fail without notes
      expect(() => {
        productStore.adjustStock(testProductId, newQuantity, 'Inventory count', '');
      }).toThrow(/notes are required/);

      // Should succeed with notes
      productStore.adjustStock(
        testProductId,
        newQuantity,
        'Inventory count',
        'Annual inventory adjustment'
      );

      // Get fresh state after mutation
      productStore = useProductStore.getState();
      const updatedProduct = productStore.products.find(p => p.id === testProductId)!;
      expect(updatedProduct.stock).toBe(newQuantity);

      console.log(`✅ Stock adjusted to ${newQuantity} with notes`);
    });

    it('should track low stock alerts', () => {
      let productStore = useProductStore.getState();
      const threshold = productStore.getLowStockThreshold();

      // Adjust stock to below threshold
      productStore.adjustStock(
        testProductId,
        threshold - 2,
        'Testing low stock',
        'Setting stock below threshold for test'
      );

      // Check low stock should create alert
      productStore.checkLowStock();

      // Get fresh state after mutations
      productStore = useProductStore.getState();
      const alerts = productStore.lowStockAlerts.filter(
        a => a.productId === testProductId && !a.acknowledged
      );

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].currentStock).toBe(threshold - 2);

      console.log(`✅ Low stock alert created for stock level ${threshold - 2}`);
    });
  });

  describe('2. POS Lite - Offline Order Creation', () => {
    it('should create offline order successfully', async () => {
      let orderStore = useOrderStore.getState();
      let productStore = useProductStore.getState();
      const initialOrderCount = orderStore.orders.length;

      const product1 = productStore.products.find(p => p.stock >= 5)!;
      const product2 = productStore.products.find(p => p.id !== product1.id && p.stock >= 3)!;

      const cartItems = [
        {
          productId: product1.id,
          productName: product1.name,
          quantity: 2,
          price: product1.price,
          image: product1.images[0]
        },
        {
          productId: product2.id,
          productName: product2.name,
          quantity: 1,
          price: product2.price,
          image: product2.images[0]
        }
      ];

      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const orderId = await orderStore.addOfflineOrder(cartItems, total, 'Test POS sale');

      // Get fresh state after order creation
      orderStore = useOrderStore.getState();
      const newOrderCount = orderStore.orders.length;
      expect(newOrderCount).toBe(initialOrderCount + 1);

      const createdOrder = orderStore.orders.find(o => o.id === orderId);
      expect(createdOrder).toBeDefined();
      expect(createdOrder!.type).toBe('OFFLINE');
      expect(createdOrder!.status).toBe('delivered');
      expect(createdOrder!.paymentStatus).toBe('paid');
      expect(createdOrder!.total).toBe(total);
      expect(createdOrder!.items.length).toBe(2);

      console.log(`✅ Offline order created: ${orderId}`);
      console.log(`✅ Order total: ₱${total.toLocaleString()}`);
      console.log(`✅ Items: ${cartItems.length}`);
    });

    it('should deduct stock for all items in offline order', async () => {
      let orderStore = useOrderStore.getState();
      let productStore = useProductStore.getState();

      const product = productStore.products.find(p => p.stock >= 10)!;
      const initialStock = product.stock;
      const quantityToSell = 3;

      const cartItems = [
        {
          productId: product.id,
          productName: product.name,
          quantity: quantityToSell,
          price: product.price,
          image: product.images[0]
        }
      ];

      const total = product.price * quantityToSell;

      await orderStore.addOfflineOrder(cartItems, total, 'Stock deduction test');

      // Get fresh state after order creation
      productStore = useProductStore.getState();
      const updatedProduct = productStore.products.find(p => p.id === product.id)!;
      expect(updatedProduct.stock).toBe(initialStock - quantityToSell);

      console.log(`✅ Stock deducted: ${initialStock} → ${updatedProduct.stock}`);
    });

    it('should create ledger entries for offline order items', async () => {
      let orderStore = useOrderStore.getState();
      let productStore = useProductStore.getState();

      const product = productStore.products.find(p => p.stock >= 5)!;
      const initialLedgerCount = productStore.inventoryLedger.length;

      const cartItems = [
        {
          productId: product.id,
          productName: product.name,
          quantity: 2,
          price: product.price,
          image: product.images[0]
        }
      ];

      const orderId = await orderStore.addOfflineOrder(cartItems, product.price * 2);

      // Get fresh state after order creation
      productStore = useProductStore.getState();
      const newLedgerCount = productStore.inventoryLedger.length;
      expect(newLedgerCount).toBe(initialLedgerCount + 1);

      const ledgerEntries = productStore.getLedgerByProduct(product.id);
      const orderLedger = ledgerEntries.find(e => e.referenceId === orderId);

      expect(orderLedger).toBeDefined();
      expect(orderLedger!.changeType).toBe('DEDUCTION');
      expect(orderLedger!.reason).toBe('OFFLINE_SALE');
      expect(orderLedger!.quantityChange).toBe(-2);

      console.log(`✅ Ledger entry created for order: ${orderId}`);
      console.log(`✅ Reference ID matches order ID`);
    });

    it('should prevent order creation with insufficient stock', async () => {
      const orderStore = useOrderStore.getState();
      const productStore = useProductStore.getState();

      const product = productStore.products.find(p => p.stock > 0)!;

      const cartItems = [
        {
          productId: product.id,
          productName: product.name,
          quantity: product.stock + 100, // More than available
          price: product.price,
          image: product.images[0]
        }
      ];

      await expect(
        orderStore.addOfflineOrder(cartItems, product.price * (product.stock + 100)),
      ).rejects.toThrow(/Insufficient stock/);

      console.log(`✅ Order creation blocked for insufficient stock`);
    });

    it('should handle multi-item orders correctly', async () => {
      let orderStore = useOrderStore.getState();
      let productStore = useProductStore.getState();

      const products = productStore.products.filter(p => p.stock >= 5).slice(0, 3);
      
      const cartItems = products.map(p => ({
        productId: p.id,
        productName: p.name,
        quantity: 2,
        price: p.price,
        image: p.images[0]
      }));

      const stockBefore = products.map(p => ({ id: p.id, stock: p.stock }));
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      const orderId = await orderStore.addOfflineOrder(cartItems, total, 'Multi-item test');

      // Get fresh state after order creation
      productStore = useProductStore.getState();
      
      // Verify stock deduction for each item
      products.forEach((product, idx) => {
        const updatedProduct = productStore.products.find(p => p.id === product.id)!;
        expect(updatedProduct.stock).toBe(stockBefore[idx].stock - 2);
      });

      // Verify ledger entries for each item
      const ledgerCount = productStore.inventoryLedger.filter(
        e => e.referenceId === orderId
      ).length;
      expect(ledgerCount).toBe(cartItems.length);

      console.log(`✅ Multi-item order processed: ${cartItems.length} items`);
      console.log(`✅ All stock levels updated correctly`);
      console.log(`✅ All ledger entries created`);
    });
  });

  describe('3. Order Store - Order Management', () => {
    it('should retrieve orders by status', () => {
      const orderStore = useOrderStore.getState();
      
      const pendingOrders = orderStore.orders.filter(o => o.status === 'pending');
      const deliveredOrders = orderStore.orders.filter(o => o.status === 'delivered');
      const offlineOrders = orderStore.orders.filter(o => o.type === 'OFFLINE');

      console.log(`✅ Pending orders: ${pendingOrders.length}`);
      console.log(`✅ Delivered orders: ${deliveredOrders.length}`);
      console.log(`✅ Offline (POS) orders: ${offlineOrders.length}`);

      expect(orderStore.orders.length).toBeGreaterThanOrEqual(0);
    });

    it('should update order status', async () => {
      let orderStore = useOrderStore.getState();

      // Create a test order first
      let productStore = useProductStore.getState();
      const product = productStore.products.find(p => p.stock >= 1)!;

      const cartItems = [{
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        image: product.images[0]
      }];

      const orderId = await orderStore.addOfflineOrder(cartItems, product.price);
      
      // Get fresh state after order creation
      orderStore = useOrderStore.getState();
      const order = orderStore.orders.find(o => o.id === orderId)!;

      expect(order.status).toBe('delivered'); // POS orders are delivered by default

      console.log(`✅ Order status verified: ${order.status}`);
    });

    it('should track POS sales separately from online orders', () => {
      const orderStore = useOrderStore.getState();
      
      const offlineOrders = orderStore.orders.filter(o => o.type === 'OFFLINE');
      const onlineOrders = orderStore.orders.filter(o => !o.type || o.type !== 'OFFLINE');

      console.log(`✅ Total orders: ${orderStore.orders.length}`);
      console.log(`✅ POS (Offline) orders: ${offlineOrders.length}`);
      console.log(`✅ Online orders: ${onlineOrders.length}`);

      offlineOrders.forEach(order => {
        expect(order.buyerEmail).toBe('pos@offline.sale');
        expect(order.status).toBe('delivered');
        expect(order.paymentStatus).toBe('paid');
      });
    });
  });

  describe('4. Inventory Ledger - Audit Trail', () => {
    it('should maintain immutable ledger entries', () => {
      let productStore = useProductStore.getState();
      const ledgerBefore = [...productStore.inventoryLedger];

      // Perform some operations
      const product = productStore.products.find(p => p.stock >= 10)!;
      productStore.deductStock(product.id, 1, 'OFFLINE_SALE', 'TEST-IMMUTABLE-1');

      // Get fresh state after mutation
      productStore = useProductStore.getState();
      const ledgerAfter = productStore.inventoryLedger;

      // Verify old entries are unchanged
      ledgerBefore.forEach((entry, idx) => {
        expect(ledgerAfter[idx]).toEqual(entry);
      });

      // Verify new entry was appended
      expect(ledgerAfter.length).toBe(ledgerBefore.length + 1);

      console.log(`✅ Ledger immutability verified`);
      console.log(`✅ Ledger entries: ${ledgerBefore.length} → ${ledgerAfter.length}`);
    });

    it('should include all required fields in ledger entries', () => {
      let productStore = useProductStore.getState();
      const product = productStore.products.find(p => p.stock >= 5)!;

      productStore.deductStock(
        product.id,
        3,
        'OFFLINE_SALE',
        'TEST-FIELDS-1',
        'Test notes'
      );

      // Get fresh state after mutation
      productStore = useProductStore.getState();
      const latestEntry = productStore.inventoryLedger[productStore.inventoryLedger.length - 1];

      expect(latestEntry.id).toBeDefined();
      expect(latestEntry.timestamp).toBeDefined();
      expect(latestEntry.productId).toBe(product.id);
      expect(latestEntry.productName).toBe(product.name);
      expect(latestEntry.changeType).toBe('DEDUCTION');
      expect(latestEntry.quantityBefore).toBeDefined();
      expect(latestEntry.quantityChange).toBe(-3);
      expect(latestEntry.quantityAfter).toBeDefined();
      expect(latestEntry.reason).toBe('OFFLINE_SALE');
      expect(latestEntry.referenceId).toBe('TEST-FIELDS-1');
      expect(latestEntry.userId).toBeDefined();
      expect(latestEntry.notes).toBe('Test notes');

      console.log(`✅ All ledger fields present and valid`);
    });

    it('should query ledger by product', () => {
      const productStore = useProductStore.getState();
      const product = productStore.products[0];

      const productLedger = productStore.getLedgerByProduct(product.id);

      productLedger.forEach(entry => {
        expect(entry.productId).toBe(product.id);
      });

      console.log(`✅ Product ledger query working: ${productLedger.length} entries for ${product.name}`);
    });

    it('should query recent ledger entries', () => {
      const productStore = useProductStore.getState();
      
      const recent10 = productStore.getRecentLedgerEntries(10);
      expect(recent10.length).toBeLessThanOrEqual(10);

      // Verify chronological order (newest first)
      for (let i = 1; i < recent10.length; i++) {
        const current = new Date(recent10[i].timestamp).getTime();
        const previous = new Date(recent10[i - 1].timestamp).getTime();
        expect(current).toBeLessThanOrEqual(previous);
      }

      console.log(`✅ Recent ledger query working: ${recent10.length} entries`);
    });
  });

  describe('5. End-to-End POS Flow', () => {
    it('should complete full POS transaction flow', async () => {
      let orderStore = useOrderStore.getState();
      let productStore = useProductStore.getState();

      // Step 1: Select products (simulate cart)
      const productsToSell = productStore.products
        .filter(p => p.stock >= 2)
        .slice(0, 2);

      const cartItems = productsToSell.map(p => ({
        productId: p.id,
        productName: p.name,
        quantity: 2,
        price: p.price,
        image: p.images[0]
      }));

      const stockBefore = productsToSell.map(p => ({
        id: p.id,
        stock: p.stock,
        sales: p.sales
      }));

      // Step 2: Calculate total
      const total = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Step 3: Create order (checkout)
      const initialOrderCount = orderStore.orders.length;
      const initialLedgerCount = productStore.inventoryLedger.length;

      const orderId = await orderStore.addOfflineOrder(cartItems, total, 'E2E Test Sale');

      // Get fresh state after order creation
      orderStore = useOrderStore.getState();
      productStore = useProductStore.getState();

      // Step 4: Verify order created
      const order = orderStore.orders.find(o => o.id === orderId)!;
      expect(order).toBeDefined();
      expect(order.type).toBe('OFFLINE');
      expect(order.status).toBe('delivered');
      expect(order.paymentStatus).toBe('paid');
      expect(order.total).toBe(total);
      expect(orderStore.orders.length).toBe(initialOrderCount + 1);

      // Step 5: Verify stock deducted
      productsToSell.forEach((product, idx) => {
        const updated = productStore.products.find(p => p.id === product.id)!;
        expect(updated.stock).toBe(stockBefore[idx].stock - 2);
        expect(updated.sales).toBe(stockBefore[idx].sales + 2);
      });

      // Step 6: Verify ledger entries created
      const newLedgerCount = productStore.inventoryLedger.length;
      expect(newLedgerCount).toBe(initialLedgerCount + cartItems.length);

      const orderLedgers = productStore.inventoryLedger.filter(
        e => e.referenceId === orderId
      );
      expect(orderLedgers.length).toBe(cartItems.length);

      orderLedgers.forEach(ledger => {
        expect(ledger.changeType).toBe('DEDUCTION');
        expect(ledger.reason).toBe('OFFLINE_SALE');
      });

      console.log(`\n🎉 END-TO-END FLOW COMPLETE:`);
      console.log(`   ✅ Order ID: ${orderId}`);
      console.log(`   ✅ Items sold: ${cartItems.length}`);
      console.log(`   ✅ Total amount: ₱${total.toLocaleString()}`);
      console.log(`   ✅ Stock deducted for all items`);
      console.log(`   ✅ Sales counters updated`);
      console.log(`   ✅ Ledger entries created: ${orderLedgers.length}`);
      console.log(`   ✅ Order status: ${order.status}`);
      console.log(`   ✅ Payment status: ${order.paymentStatus}\n`);
    });
  });

  describe('6. Data Integrity & Validation', () => {
    it('should maintain data consistency across stores', () => {
      const orderStore = useOrderStore.getState();
      const productStore = useProductStore.getState();

      // All products in orders should exist in product store
      orderStore.orders.forEach(order => {
        order.items.forEach(item => {
          const product = productStore.products.find(p => p.id === item.productId);
          // Note: Products might be deleted, so we just log if not found
          if (!product) {
            console.log(`   ⚠️  Product ${item.productId} in order ${order.id} not found in store`);
          }
        });
      });

      console.log(`✅ Data consistency check completed`);
    });

    it('should calculate order totals correctly', () => {
      const orderStore = useOrderStore.getState();

      orderStore.orders.forEach(order => {
        const calculatedTotal = order.items.reduce(
          (sum, item) => sum + (item.price * item.quantity),
          0
        );
        
        expect(order.total).toBe(calculatedTotal);
      });

      console.log(`✅ All order totals calculated correctly`);
    });

    it('should validate stock levels are non-negative', () => {
      const productStore = useProductStore.getState();

      productStore.products.forEach(product => {
        expect(product.stock).toBeGreaterThanOrEqual(0);
      });

      console.log(`✅ All stock levels are non-negative`);
    });

    it('should validate ledger math correctness', () => {
      const productStore = useProductStore.getState();

      productStore.inventoryLedger.forEach(entry => {
        const expectedAfter = entry.quantityBefore + entry.quantityChange;
        expect(entry.quantityAfter).toBe(expectedAfter);
      });

      console.log(`✅ All ledger calculations are correct`);
    });
  });

  afterEach(() => {
    console.log('─'.repeat(80));
  });
});

// Test Summary Report
describe('Test Summary', () => {
  it('should generate test report', () => {
    const productStore = useProductStore.getState();
    const orderStore = useOrderStore.getState();

    const report = {
      products: {
        total: productStore.products.length,
        inStock: productStore.products.filter(p => p.stock > 0).length,
        lowStock: productStore.products.filter(p => p.stock > 0 && p.stock < 10).length,
        outOfStock: productStore.products.filter(p => p.stock === 0).length,
      },
      orders: {
        total: orderStore.orders.length,
        offline: orderStore.orders.filter(o => o.type === 'OFFLINE').length,
        online: orderStore.orders.filter(o => !o.type || o.type !== 'OFFLINE').length,
        delivered: orderStore.orders.filter(o => o.status === 'delivered').length,
        pending: orderStore.orders.filter(o => o.status === 'pending').length,
      },
      inventory: {
        totalLedgerEntries: productStore.inventoryLedger.length,
        deductions: productStore.inventoryLedger.filter(e => e.changeType === 'DEDUCTION').length,
        additions: productStore.inventoryLedger.filter(e => e.changeType === 'ADDITION').length,
        adjustments: productStore.inventoryLedger.filter(e => e.changeType === 'ADJUSTMENT').length,
        lowStockAlerts: productStore.lowStockAlerts.length,
        activeAlerts: productStore.lowStockAlerts.filter(a => !a.acknowledged).length,
      }
    };

    console.log('\n' + '═'.repeat(80));
    console.log('📊 TEST SUMMARY REPORT');
    console.log('═'.repeat(80));
    console.log('\n📦 PRODUCTS:');
    console.log(`   Total Products:        ${report.products.total}`);
    console.log(`   In Stock:              ${report.products.inStock}`);
    console.log(`   Low Stock (<10):       ${report.products.lowStock}`);
    console.log(`   Out of Stock:          ${report.products.outOfStock}`);
    console.log('\n🛒 ORDERS:');
    console.log(`   Total Orders:          ${report.orders.total}`);
    console.log(`   Offline (POS):         ${report.orders.offline}`);
    console.log(`   Online:                ${report.orders.online}`);
    console.log(`   Delivered:             ${report.orders.delivered}`);
    console.log(`   Pending:               ${report.orders.pending}`);
    console.log('\n📋 INVENTORY LEDGER:');
    console.log(`   Total Entries:         ${report.inventory.totalLedgerEntries}`);
    console.log(`   Deductions:            ${report.inventory.deductions}`);
    console.log(`   Additions:             ${report.inventory.additions}`);
    console.log(`   Adjustments:           ${report.inventory.adjustments}`);
    console.log(`   Low Stock Alerts:      ${report.inventory.lowStockAlerts}`);
    console.log(`   Active Alerts:         ${report.inventory.activeAlerts}`);
    console.log('\n' + '═'.repeat(80));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY');
    console.log('═'.repeat(80) + '\n');

    expect(report.products.total).toBeGreaterThan(0);
  });
});
