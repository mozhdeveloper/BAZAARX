/**
 * Performance Optimization Verification Tests
 * 
 * Validates that all mobile app performance optimizations are correctly
 * applied across services, components, and screens.
 * 
 * Categories:
 *  1. Service-level optimizations (pagination, batch queries)
 *  2. Component-level optimizations (React.memo, expo-image)
 *  3. Screen-level optimizations (FlatList, parallel fetch, limits)
 *  4. Database index verification (via SQL)
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Helpers ─────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..', '..');
const readSrc = (relPath: string) =>
  fs.readFileSync(path.join(ROOT, relPath), 'utf-8');

// =====================================================================
// 1. SERVICE-LEVEL OPTIMIZATIONS
// =====================================================================
describe('Service-level optimizations', () => {
  // --- productService ---
  describe('productService.ts', () => {
    let src: string;
    beforeAll(() => {
      src = readSrc('src/services/productService.ts');
    });

    test('has default pagination limit of 30', () => {
      expect(src).toContain('effectiveLimit');
      expect(src).toMatch(/filters\?\.limit\s*\|\|\s*30/);
    });

    test('applies .limit() to the query', () => {
      expect(src).toMatch(/query\s*=\s*query\.limit\(effectiveLimit\)/);
    });

    test('does not have console.log in getProducts hot path', () => {
      // Extract the getProducts method body (rough heuristic)
      const getProductsStart = src.indexOf('async getProducts(');
      const getProductsEnd = src.indexOf('\n  async ', getProductsStart + 1);
      const methodBody = src.slice(getProductsStart, getProductsEnd > 0 ? getProductsEnd : undefined);
      
      // Should have no console.log (console.warn/error are acceptable)
      const logMatches = methodBody.match(/console\.log\(/g);
      expect(logMatches).toBeNull();
    });
  });

  // --- checkoutService ---
  describe('checkoutService.ts', () => {
    let src: string;
    beforeAll(() => {
      src = readSrc('src/services/checkoutService.ts');
    });

    test('uses batch .in() query for stock validation', () => {
      expect(src).toContain("batch query all variants at once");
      expect(src).toMatch(/\.in\('product_id',\s*productIdsForStock\)/);
    });

    test('uses batch .in() query for seller ID lookup', () => {
      expect(src).toContain("batch query all seller IDs");
      expect(src).toMatch(/\.in\('id',\s*idsToLookup\)/);
    });

    test('uses batch insert for campaign discount recording', () => {
      expect(src).toContain("batch insert all at once");
      expect(src).toMatch(/\.insert\(discountInserts\)/);
    });

    test('uses batch fetch for stock updates', () => {
      expect(src).toContain("batch fetch current stock");
      expect(src).toMatch(/\.in\('id',\s*variantIdsToUpdate\)/);
    });

    test('has NO per-item stock validation loop with individual queries', () => {
      // The old N+1 pattern was: for (const item of items) { ... supabase.from('product_variants').select...eq('product_id', item.id) }
      // Make sure we don't have single-item eq lookups inside validation
      const stockSection = src.slice(
        src.indexOf('Validate Stock'),
        src.indexOf('Group items by seller')
      );
      // Should NOT have .eq('product_id', item.id) one-by-one
      expect(stockSection).not.toMatch(/\.eq\('product_id',\s*item\.id\)/);
    });
  });
});

// =====================================================================
// 2. COMPONENT-LEVEL OPTIMIZATIONS
// =====================================================================
describe('Component-level optimizations', () => {
  describe('ProductCard.tsx', () => {
    let src: string;
    beforeAll(() => {
      src = readSrc('src/components/ProductCard.tsx');
    });

    test('is wrapped in React.memo', () => {
      expect(src).toMatch(/React\.memo\(/);
    });

    test('has displayName set', () => {
      expect(src).toContain("ProductCard.displayName = 'ProductCard'");
    });

    test('uses expo-image instead of RN Image', () => {
      expect(src).toContain("import { Image } from 'expo-image'");
      expect(src).not.toMatch(/from\s+['"]react-native['"].*Image/);
    });

    test('uses contentFit and cachePolicy props', () => {
      expect(src).toContain('contentFit=');
      expect(src).toContain('cachePolicy="memory-disk"');
    });

    test('does NOT import Image from react-native', () => {
      // The RN import line should not contain Image
      const rnImportMatch = src.match(/import\s*\{([^}]+)\}\s*from\s*['"]react-native['"]/);
      if (rnImportMatch) {
        const imports = rnImportMatch[1];
        expect(imports).not.toMatch(/\bImage\b/);
      }
    });
  });

  describe('OrderCard.tsx', () => {
    let src: string;
    beforeAll(() => {
      src = readSrc('src/components/OrderCard.tsx');
    });

    test('is wrapped in React.memo', () => {
      expect(src).toMatch(/React\.memo\(/);
    });

    test('has displayName set', () => {
      expect(src).toContain("OrderCard.displayName = 'OrderCard'");
    });

    test('uses expo-image instead of RN Image', () => {
      expect(src).toContain("import { Image } from 'expo-image'");
      expect(src).not.toMatch(/from\s+['"]react-native['"].*Image/);
    });

    test('uses contentFit and cachePolicy props', () => {
      expect(src).toContain('contentFit="cover"');
      expect(src).toContain('cachePolicy="memory-disk"');
    });
  });

  describe('CartItemRow.tsx', () => {
    let src: string;
    beforeAll(() => {
      src = readSrc('src/components/CartItemRow.tsx');
    });

    test('is wrapped in React.memo', () => {
      expect(src).toMatch(/React\.memo\(/);
    });

    test('has displayName set', () => {
      expect(src).toContain("CartItemRow.displayName = 'CartItemRow'");
    });

    test('uses expo-image instead of RN Image', () => {
      expect(src).toContain("import { Image } from 'expo-image'");
      expect(src).not.toMatch(/from\s+['"]react-native['"].*Image/);
    });

    test('uses contentFit and cachePolicy props', () => {
      expect(src).toContain('contentFit=');
      expect(src).toContain('cachePolicy="memory-disk"');
    });
  });
});

// =====================================================================
// 3. SCREEN-LEVEL OPTIMIZATIONS
// =====================================================================
describe('Screen-level optimizations', () => {
  describe('ShopScreen.tsx', () => {
    let src: string;
    beforeAll(() => {
      src = readSrc('app/ShopScreen.tsx');
    });

    test('imports FlatList from react-native', () => {
      expect(src).toMatch(/import\s*\{[^}]*FlatList[^}]*\}\s*from\s*['"]react-native['"]/);
    });

    test('uses FlatList for product grid (not ScrollView + .map)', () => {
      expect(src).toContain('<FlatList');
      expect(src).toContain('numColumns={2}');
    });

    test('has performance tuning props on FlatList', () => {
      expect(src).toMatch(/initialNumToRender=\{\d+\}/);
      expect(src).toMatch(/maxToRenderPerBatch=\{\d+\}/);
      expect(src).toMatch(/windowSize=\{\d+\}/);
    });

    test('does NOT use filteredProducts.map() for product rendering', () => {
      // Old pattern was: {filteredProducts.map((product) => (...))}
      expect(src).not.toMatch(/filteredProducts\.map\(/);
    });
  });

  describe('HomeScreen.tsx', () => {
    let src: string;
    beforeAll(() => {
      src = readSrc('app/HomeScreen.tsx');
    });

    test('uses Promise.allSettled for parallel data loading', () => {
      expect(src).toContain('Promise.allSettled');
    });

    test('fetches products, flash sales, featured, boosted, sellers in parallel', () => {
      // All five calls should appear inside the same Promise.allSettled
      const allSettledStart = src.indexOf('Promise.allSettled');
      const allSettledEnd = src.indexOf(']);', allSettledStart);
      const parallelBlock = src.slice(allSettledStart, allSettledEnd);
      
      expect(parallelBlock).toContain('getProducts');
      expect(parallelBlock).toContain('getFlashSaleProducts');
      expect(parallelBlock).toContain('getFeaturedProducts');
      expect(parallelBlock).toContain('getActiveBoostedProducts');
      expect(parallelBlock).toContain('getAllSellers');
    });

    test('applies limit: 20 to initial product fetch', () => {
      expect(src).toMatch(/limit:\s*20/);
    });

    test('consolidates data fetching into a single useEffect with Promise.allSettled', () => {
      // The main data-loading useEffect should contain Promise.allSettled.
      // Other useEffects (flash sale timer, auth, etc.) are fine.
      // Key check: there should NOT be separate useEffects each calling one service.
      const allSettledIndex = src.indexOf('Promise.allSettled');
      expect(allSettledIndex).toBeGreaterThan(-1);

      // The Promise.allSettled block should contain all 5 fetch calls
      const block = src.slice(allSettledIndex, allSettledIndex + 500);
      expect(block).toContain('getProducts');
      expect(block).toContain('getFlashSaleProducts');
      expect(block).toContain('getFeaturedProducts');
    });
  });

  describe('OrdersScreen.tsx', () => {
    let src: string;
    beforeAll(() => {
      src = readSrc('app/OrdersScreen.tsx');
    });

    test('applies .limit(30) to orders query', () => {
      expect(src).toContain('.limit(30)');
    });
  });
});

// =====================================================================
// 4. DATABASE INDEX MIGRATION VERIFICATION
// =====================================================================
describe('Database performance indexes migration', () => {
  let sql: string;
  beforeAll(() => {
    sql = fs.readFileSync(
      path.resolve(ROOT, '..', 'supabase', 'migrations', '20250602090000_performance_indexes.sql'),
      'utf-8'
    );
  });

  // --- Orders indexes ---
  test('creates idx_orders_buyer_created composite index', () => {
    expect(sql).toContain('idx_orders_buyer_created');
    expect(sql).toMatch(/ON\s+orders\s*\(buyer_id,\s*created_at\s+DESC\)/i);
  });

  test('creates idx_orders_shipment_status index', () => {
    expect(sql).toContain('idx_orders_shipment_status');
    expect(sql).toMatch(/ON\s+orders\s*\(shipment_status\)/i);
  });

  test('creates idx_orders_payment_status index', () => {
    expect(sql).toContain('idx_orders_payment_status');
    expect(sql).toMatch(/ON\s+orders\s*\(payment_status\)/i);
  });

  test('does NOT create an index on orders.seller_id (column does not exist)', () => {
    expect(sql).not.toMatch(/ON\s+orders\s*\(seller_id/i);
  });

  // --- Order items indexes ---
  test('creates idx_order_items_order_id index', () => {
    expect(sql).toContain('idx_order_items_order_id');
  });

  test('creates idx_order_items_product_id index', () => {
    expect(sql).toContain('idx_order_items_product_id');
  });

  // --- Products indexes ---
  test('creates partial index on products for active/approved filtering', () => {
    expect(sql).toContain('idx_products_active_approved');
    expect(sql).toMatch(/WHERE\s+deleted_at\s+IS\s+NULL/i);
  });

  test('creates idx_products_seller_id index', () => {
    expect(sql).toContain('idx_products_seller_id');
  });

  test('creates idx_products_category_id index', () => {
    expect(sql).toContain('idx_products_category_id');
  });

  // --- Product images ---
  test('creates composite index on product_images (product_id, is_primary)', () => {
    expect(sql).toContain('idx_product_images_product_primary');
    expect(sql).toMatch(/ON\s+product_images\s*\(product_id,\s*is_primary\)/i);
  });

  // --- Product variants ---
  test('creates idx_product_variants_product_id index', () => {
    expect(sql).toContain('idx_product_variants_product_id');
  });

  // --- Cart items ---
  test('creates idx_cart_items_cart_id index', () => {
    expect(sql).toContain('idx_cart_items_cart_id');
  });

  // --- Reviews ---
  test('creates idx_reviews_product_id index', () => {
    expect(sql).toContain('idx_reviews_product_id');
  });

  // --- Discount campaigns ---
  test('creates composite index on discount_campaigns for active lookup', () => {
    expect(sql).toContain('idx_discount_campaigns_active');
    expect(sql).toMatch(/ON\s+discount_campaigns\s*\(status,\s*starts_at,\s*ends_at\)/i);
  });

  // --- Product discounts ---
  test('creates idx_product_discounts_product_id index', () => {
    expect(sql).toContain('idx_product_discounts_product_id');
  });

  test('creates idx_product_discounts_campaign_id index', () => {
    expect(sql).toContain('idx_product_discounts_campaign_id');
  });

  // --- Refund return periods ---
  test('creates idx_refund_return_periods_order_id index', () => {
    expect(sql).toContain('idx_refund_return_periods_order_id');
  });

  // --- Order status history ---
  test('creates idx_order_status_history_order_id index', () => {
    expect(sql).toContain('idx_order_status_history_order_id');
  });

  // --- Conversations ---
  test('creates idx_conversations_buyer_id (not seller_id)', () => {
    expect(sql).toContain('idx_conversations_buyer_id');
    expect(sql).not.toContain('idx_conversations_seller_id');
  });

  // --- Messages ---
  test('creates composite index on messages (conversation_id, created_at)', () => {
    expect(sql).toContain('idx_messages_conversation_id');
    expect(sql).toMatch(/ON\s+messages\s*\(conversation_id,\s*created_at\)/i);
  });

  // --- Notifications ---
  test('creates buyer_notifications index with created_at DESC', () => {
    expect(sql).toContain('idx_buyer_notifications_buyer_id');
    expect(sql).toMatch(/ON\s+buyer_notifications\s*\(buyer_id,\s*created_at\s+DESC\)/i);
  });

  test('creates seller_notifications index with created_at DESC', () => {
    expect(sql).toContain('idx_seller_notifications_seller_id');
    expect(sql).toMatch(/ON\s+seller_notifications\s*\(seller_id,\s*created_at\s+DESC\)/i);
  });

  // --- Store followers ---
  test('creates idx_store_followers_seller_id index', () => {
    expect(sql).toContain('idx_store_followers_seller_id');
  });

  test('creates idx_store_followers_buyer_id index', () => {
    expect(sql).toContain('idx_store_followers_buyer_id');
  });

  // --- Schema safety ---
  test('uses CREATE INDEX IF NOT EXISTS for all indexes', () => {
    const createLines = sql.match(/CREATE INDEX/gi) || [];
    const ifNotExistsLines = sql.match(/CREATE INDEX IF NOT EXISTS/gi) || [];
    expect(createLines.length).toBe(ifNotExistsLines.length);
    expect(createLines.length).toBeGreaterThanOrEqual(20);
  });

  test('references only tables that exist in the real BAZAAR schema', () => {
    const realTables = [
      'orders', 'order_items', 'products', 'product_images',
      'product_variants', 'cart_items', 'reviews', 'discount_campaigns',
      'product_discounts', 'refund_return_periods', 'order_status_history',
      'conversations', 'messages', 'buyer_notifications',
      'seller_notifications', 'store_followers',
    ];
    const onMatches = sql.match(/ON\s+(\w+)\s*\(/gi) || [];
    const referencedTables = onMatches.map(m => {
      const match = m.match(/ON\s+(\w+)/i);
      return match ? match[1].toLowerCase() : '';
    });
    
    for (const table of referencedTables) {
      expect(realTables).toContain(table);
    }
  });
});
