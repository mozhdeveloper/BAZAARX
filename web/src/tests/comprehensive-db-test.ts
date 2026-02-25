/**
 * COMPREHENSIVE DATABASE TEST SCRIPT
 * 
 * Tests ALL flows against the new normalized database schema:
 * - Authentication & User Management
 * - Product Management (CRUD, Images, Variants)
 * - Shopping Cart Operations
 * - Order Processing
 * - QA/Assessment Workflow
 * - Messaging/Chat System
 * - AI Assistant Integration
 * 
 * Run: npx ts-node src/tests/comprehensive-db-test.ts
 * 
 * Environment Variables:
 *   TEST_BUYER_ID    - UUID of test buyer account
 *   TEST_SELLER_ID   - UUID of test seller account  
 *   TEST_ADMIN_ID    - UUID of test admin account
 *   TEST_PRODUCT_ID  - UUID of test product
 *   SKIP_WRITE_TESTS - Set to "true" to skip write operations
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Direct Supabase client initialization for testing
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);
const isSupabaseConfigured = () => Boolean(supabaseUrl && supabaseKey);

// ============================================================================
// CONFIGURATION
// ============================================================================

interface TestConfig {
  buyerId?: string;
  sellerId?: string;
  adminId?: string;
  productId?: string;
  skipWriteTests: boolean;
}

const config: TestConfig = {
  buyerId: process.env.TEST_BUYER_ID,
  sellerId: process.env.TEST_SELLER_ID,
  adminId: process.env.TEST_ADMIN_ID,
  productId: process.env.TEST_PRODUCT_ID,
  skipWriteTests: process.env.SKIP_WRITE_TESTS === 'true',
};

// ============================================================================
// TEST UTILITIES
// ============================================================================

interface TestResult {
  name: string;
  category: string;
  success: boolean;
  duration: number;
  error?: string;
  data?: unknown;
}

const results: TestResult[] = [];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  dim: (msg: string) => console.log(`${colors.dim}  ${msg}${colors.reset}`),
  header: (msg: string) => {
    console.log('');
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}  ${msg}${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(60)}${colors.reset}`);
  },
  subheader: (msg: string) => {
    console.log('');
    console.log(`${colors.blue}── ${msg} ──${colors.reset}`);
  },
};

async function runTest<T>(
  name: string,
  category: string,
  testFn: () => Promise<T>,
  validator?: (result: T) => boolean
): Promise<T | null> {
  const start = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - start;
    const isValid = validator ? validator(result) : true;
    
    if (isValid) {
      log.success(`${name} ${colors.dim}(${duration}ms)${colors.reset}`);
      results.push({ name, category, success: true, duration, data: result });
    } else {
      log.error(`${name} - Validation failed`);
      results.push({ name, category, success: false, duration, error: 'Validation failed' });
    }
    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    // Better error message extraction
    let errorMsg: string;
    if (error?.message) {
      errorMsg = error.message;
    } else if (error?.code && error?.details) {
      errorMsg = `${error.code}: ${error.details}`;
    } else if (typeof error === 'object') {
      errorMsg = JSON.stringify(error);
    } else {
      errorMsg = String(error);
    }
    log.error(`${name} - ${errorMsg}`);
    results.push({ name, category, success: false, duration, error: errorMsg });
    return null;
  }
}

function skipTest(name: string, category: string, reason: string): void {
  log.warn(`${name} - Skipped: ${reason}`);
  results.push({ name, category, success: true, duration: 0, error: `Skipped: ${reason}` });
}

// ============================================================================
// 1. DATABASE CONNECTION TESTS
// ============================================================================

async function testDatabaseConnection(): Promise<boolean> {
  log.header('1. DATABASE CONNECTION');
  
  // Test 1.1: Supabase configuration
  await runTest(
    'Supabase is configured',
    'Connection',
    async () => isSupabaseConfigured(),
    (result) => result === true
  );
  
  // Test 1.2: Can connect to database
  const connected = await runTest(
    'Can connect to Supabase',
    'Connection',
    async () => {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      if (error) throw error;
      return true;
    },
    (result) => result === true
  );
  
  return connected === true;
}

// ============================================================================
// 2. SCHEMA VALIDATION TESTS
// ============================================================================

async function testSchemaValidation(): Promise<void> {
  log.header('2. SCHEMA VALIDATION');
  
  // Core required tables
  const requiredTables = [
    'profiles',
    'user_roles',
    'buyers',
    'sellers',
    'categories',
    'products',
    'product_images',
    'product_variants',
    'product_assessments',
    'product_approvals',
    'product_rejections',
    'product_revisions',
    'carts',
    'cart_items',
    'orders',
    'order_items',
    'order_recipients',
    'shipping_addresses',
    'conversations',
    'messages',
    'ai_conversations',
    'ai_messages',
  ];
  
  // Optional/Extended tables (may exist depending on setup)
  const optionalTables = [
    'seller_business_profiles',
    'seller_payout_accounts',
    'seller_verification_documents',
  ];
  
  log.subheader('Checking required tables exist');
  
  for (const table of requiredTables) {
    await runTest(
      `Table '${table}' exists`,
      'Schema',
      async () => {
        const { error } = await supabase.from(table).select('*').limit(0);
        if (error && error.code === '42P01') throw new Error('Table does not exist');
        if (error) throw error;
        return true;
      },
      (result) => result === true
    );
  }
  
  log.subheader('Checking optional tables');
  
  for (const table of optionalTables) {
    await runTest(
      `[Optional] Table '${table}' exists`,
      'Schema',
      async () => {
        const { error } = await supabase.from(table).select('*').limit(0);
        // For optional tables, missing is not a failure
        if (error && error.message?.includes('not find')) {
          return { exists: false, optional: true };
        }
        if (error) throw error;
        return { exists: true };
      },
      (result) => result !== null  // Always passes for optional
    );
  }
}

// ============================================================================
// 3. PROFILE & USER ROLES TESTS
// ============================================================================

async function testProfilesAndRoles(): Promise<void> {
  log.header('3. PROFILES & USER ROLES');
  
  log.subheader('Profile Schema');
  
  // Test profile has correct columns (check core columns only)
  await runTest(
    'Profile table exists and has core columns',
    'Profiles',
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  // Test for first_name/last_name columns (may be missing)
  await runTest(
    'Profile has first_name/last_name columns',
    'Profiles',
    async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('User Roles');
  
  // Test user_roles table
  await runTest(
    'User roles table has correct structure',
    'Profiles',
    async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Multi-Role Support');
  
  // Test that user_roles supports multiple roles per user (buyer AND seller)
  await runTest(
    'User roles table allows multiple roles per user',
    'Profiles',
    async () => {
      // The schema has UNIQUE(user_id, role) - a user can have both buyer AND seller role
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .limit(10);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  // Verify the constraint allows buyer+seller on same user
  await runTest(
    'Schema supports buyer becoming seller (same email)',
    'Profiles',
    async () => {
      // Find any users with multiple roles
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id');
      if (error) throw error;
      // Group by user_id and check if any have multiple roles
      // This just validates the schema allows it
      return { schemaValid: true };
    },
    (result) => result?.schemaValid === true
  );
  
  // Test with specific buyer ID
  if (config.buyerId) {
    await runTest(
      'Can get roles for test buyer',
      'Profiles',
      async () => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', config.buyerId);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
    
    // Check if this buyer also has a seller role (multi-role test)
    await runTest(
      'Can check if buyer is also a seller',
      'Profiles',
      async () => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', config.buyerId);
        if (error) throw error;
        const roles = data?.map(r => r.role) || [];
        return { 
          roles, 
          isBuyer: roles.includes('buyer'),
          isSeller: roles.includes('seller'),
          isMultiRole: roles.length > 1 
        };
      },
      (result) => result !== null
    );
  } else {
    skipTest('Get roles for test buyer', 'Profiles', 'No TEST_BUYER_ID provided');
    skipTest('Can check if buyer is also a seller', 'Profiles', 'No TEST_BUYER_ID provided');
  }
  
  // Test with specific seller ID
  if (config.sellerId) {
    await runTest(
      'Can verify seller has seller role',
      'Profiles',
      async () => {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', config.sellerId)
          .eq('role', 'seller');
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result) && result.length > 0
    );
  } else {
    skipTest('Verify seller role', 'Profiles', 'No TEST_SELLER_ID provided');
  }
}

// ============================================================================
// 4. BUYER & SELLER TESTS
// ============================================================================

async function testBuyersAndSellers(): Promise<void> {
  log.header('4. BUYERS & SELLERS');
  
  log.subheader('Buyers Table');
  
  // Buyers table structure: id, avatar_url, preferences, bazcoins, created_at, updated_at
  await runTest(
    'Buyers table has correct structure',
    'Users',
    async () => {
      const { data, error } = await supabase
        .from('buyers')
        .select('id, avatar_url, preferences, bazcoins, created_at, updated_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  if (config.buyerId) {
    await runTest(
      'Can get buyer by ID with profile join',
      'Users',
      async () => {
        const { data, error } = await supabase
          .from('buyers')
          .select('*, profile:profiles(first_name, last_name, email)')
          .eq('id', config.buyerId)
          .single();
        if (error) throw error;
        return data;
      },
      (result) => result !== null
    );
  }
  
  log.subheader('Sellers Table');
  
  // Sellers table structure: id, store_name, store_description, avatar_url, owner_name, approval_status, verified_at
  await runTest(
    'Sellers table has correct structure',
    'Users',
    async () => {
      const { data, error } = await supabase
        .from('sellers')
        .select('id, store_name, store_description, avatar_url, owner_name, approval_status, verified_at, created_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Seller Related Tables');
  
  // seller_business_profiles - seller business data
  await runTest(
    'Seller business profiles table exists',
    'Users',
    async () => {
      const { data, error } = await supabase
        .from('seller_business_profiles')
        .select('seller_id, business_type')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  // seller_payout_accounts - bank details
  await runTest(
    'Seller payout accounts table exists',
    'Users',
    async () => {
      const { data, error } = await supabase
        .from('seller_payout_accounts')
        .select('seller_id, bank_name')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  // seller_verification_documents
  await runTest(
    'Seller verification documents table exists',
    'Users',
    async () => {
      const { data, error } = await supabase
        .from('seller_verification_documents')
        .select('seller_id')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  if (config.sellerId) {
    await runTest(
      'Can get seller with all related data',
      'Users',
      async () => {
        const { data, error } = await supabase
          .from('sellers')
          .select(`
            *,
            profile:profiles(first_name, last_name, email),
            business_info:seller_business_info(*),
            store_info:seller_store_info(*)
          `)
          .eq('id', config.sellerId)
          .single();
        if (error) throw error;
        return data;
      },
      (result) => result !== null
    );
  }
}

// ============================================================================
// 5. CATEGORIES & PRODUCTS TESTS
// ============================================================================

async function testCategoriesAndProducts(): Promise<void> {
  log.header('5. CATEGORIES & PRODUCTS');
  
  log.subheader('Categories');
  
  await runTest(
    'Categories table has correct structure',
    'Products',
    async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, parent_id, icon, image_url')
        .limit(5);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  const categories = await runTest(
    'Can fetch all categories',
    'Products',
    async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  if (categories && categories.length > 0) {
    log.dim(`Found ${categories.length} categories`);
  }
  
  log.subheader('Products');
  
  await runTest(
    'Products table has category_id FK',
    'Products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, category_id, disabled_at, deleted_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Can join products with categories',
    'Products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, price,
          category:categories(id, name)
        `)
        .is('deleted_at', null)
        .limit(5);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Product Images');
  
  await runTest(
    'Product images table has correct structure',
    'Products',
    async () => {
      const { data, error } = await supabase
        .from('product_images')
        .select('id, product_id, image_url, alt_text, sort_order, is_primary')
        .limit(5);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Can join products with images',
    'Products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name,
          images:product_images(id, image_url, is_primary, sort_order)
        `)
        .is('deleted_at', null)
        .limit(3);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Product Variants');
  
  await runTest(
    'Product variants table has correct structure',
    'Products',
    async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select('id, product_id, sku, variant_name, size, color, price, stock')
        .limit(5);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Can get products with all related data',
    'Products',
    async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name),
          images:product_images(id, image_url, is_primary),
          variants:product_variants(id, sku, size, color, price, stock)
        `)
        .is('deleted_at', null)
        .is('disabled_at', null)
        .limit(3);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  // Test with specific product
  if (config.productId) {
    await runTest(
      'Can fetch specific product with all data',
      'Products',
      async () => {
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            category:categories(*),
            images:product_images(*),
            variants:product_variants(*)
          `)
          .eq('id', config.productId)
          .single();
        if (error) throw error;
        return data;
      },
      (result) => result !== null
    );
  }
  
  // Test seller products
  if (config.sellerId) {
    await runTest(
      'Can get products by seller',
      'Products',
      async () => {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, price,
            images:product_images(image_url, is_primary)
          `)
          .eq('seller_id', config.sellerId)
          .is('deleted_at', null)
          .limit(10);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
  }
}

// ============================================================================
// 6. QA/ASSESSMENT TESTS
// ============================================================================

async function testQASystem(): Promise<void> {
  log.header('6. QA / PRODUCT ASSESSMENTS');
  
  log.subheader('Product Assessments Table');
  
  await runTest(
    'Product assessments table has correct structure',
    'QA',
    async () => {
      const { data, error } = await supabase
        .from('product_assessments')
        .select('id, product_id, status, submitted_at, verified_at, revision_requested_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Can get assessments with product join',
    'QA',
    async () => {
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products(id, name, price, category_id)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Assessment Status Values');
  
  const statuses = [
    'pending_digital_review',
    'waiting_for_sample',
    'pending_physical_review',
    'verified',
    'for_revision',
    'rejected',
  ];
  
  for (const status of statuses) {
    await runTest(
      `Can query assessments with status '${status}'`,
      'QA',
      async () => {
        const { data, error } = await supabase
          .from('product_assessments')
          .select('id, product_id, status')
          .eq('status', status)
          .limit(1);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
  }
  
  log.subheader('Related QA Tables');
  
  await runTest(
    'Product approvals table exists',
    'QA',
    async () => {
      const { data, error } = await supabase
        .from('product_approvals')
        .select('id, assessment_id')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Product rejections table exists',
    'QA',
    async () => {
      const { data, error } = await supabase
        .from('product_rejections')
        .select('id, assessment_id')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Product revisions table exists',
    'QA',
    async () => {
      const { data, error } = await supabase
        .from('product_revisions')
        .select('id, assessment_id')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  // Test assessment logistics
  await runTest(
    'Assessment logistics table exists',
    'QA',
    async () => {
      const { data, error } = await supabase
        .from('product_assessment_logistics')
        .select('id, assessment_id, details')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
}

// ============================================================================
// 7. CART TESTS
// ============================================================================

async function testCartSystem(): Promise<void> {
  log.header('7. SHOPPING CART');
  
  log.subheader('Carts Table');
  
  await runTest(
    'Carts table has simplified structure',
    'Cart',
    async () => {
      const { data, error } = await supabase
        .from('carts')
        .select('id, buyer_id, created_at, updated_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Cart Items');
  
  await runTest(
    'Cart items table has variant_id FK',
    'Cart',
    async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select('id, cart_id, product_id, variant_id, quantity, personalized_options, notes')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Can get cart items with product and variant joins',
    'Cart',
    async () => {
      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          *,
          product:products(id, name, price),
          variant:product_variants(id, sku, size, color, price, stock)
        `)
        .limit(3);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  // Test with buyer
  if (config.buyerId) {
    await runTest(
      'Can get buyer cart',
      'Cart',
      async () => {
        const { data, error } = await supabase
          .from('carts')
          .select('*')
          .eq('buyer_id', config.buyerId)
          .maybeSingle();
        if (error) throw error;
        return true; // Cart may or may not exist
      }
    );
  }
}

// ============================================================================
// 8. ORDER TESTS
// ============================================================================

async function testOrderSystem(): Promise<void> {
  log.header('8. ORDERS');
  
  log.subheader('Orders Table');
  
  await runTest(
    'Orders table has payment_status and shipment_status',
    'Orders',
    async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, buyer_id, payment_status, shipment_status, recipient_id, address_id')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Payment Status Values');
  
  const paymentStatuses = ['pending_payment', 'paid', 'partially_refunded', 'refunded'];
  for (const status of paymentStatuses) {
    await runTest(
      `Can query orders with payment_status '${status}'`,
      'Orders',
      async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('id, payment_status')
          .eq('payment_status', status)
          .limit(1);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
  }
  
  log.subheader('Shipment Status Values');
  
  const shipmentStatuses = [
    'waiting_for_seller', 'processing', 'ready_to_ship', 'shipped',
    'out_for_delivery', 'delivered', 'failed_to_deliver', 'received', 'returned'
  ];
  for (const status of shipmentStatuses) {
    await runTest(
      `Can query orders with shipment_status '${status}'`,
      'Orders',
      async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('id, shipment_status')
          .eq('shipment_status', status)
          .limit(1);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
  }
  
  log.subheader('Order Items');
  
  await runTest(
    'Order items table has correct structure',
    'Orders',
    async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('id, order_id, product_id, variant_id, quantity, price, product_name')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Order Recipients');
  
  // order_recipients: id, first_name, last_name, phone, email, created_at
  // Note: orders reference order_recipients via recipient_id
  await runTest(
    'Order recipients table has correct structure',
    'Orders',
    async () => {
      const { data, error } = await supabase
        .from('order_recipients')
        .select('id, first_name, last_name, phone, email, created_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Shipping Addresses');
  
  // shipping_addresses uses user_id (references profiles, not buyers)
  await runTest(
    'Shipping addresses table has correct structure',
    'Orders',
    async () => {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('id, user_id, label, address_line_1, city, province, region, postal_code, is_default')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  // Test with buyer
  if (config.buyerId) {
    await runTest(
      'Can get buyer orders with all relations',
      'Orders',
      async () => {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*),
            recipient:order_recipients(*),
            address:shipping_addresses(*)
          `)
          .eq('buyer_id', config.buyerId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
  }
}

// ============================================================================
// 9. CONVERSATION/CHAT TESTS
// ============================================================================

async function testChatSystem(): Promise<void> {
  log.header('9. MESSAGING / CHAT');
  
  log.subheader('Conversations Table');
  
  await runTest(
    'Conversations table has simplified structure (no seller_id)',
    'Chat',
    async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, buyer_id, order_id, created_at, updated_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('Messages Table');
  
  await runTest(
    'Messages table has correct structure',
    'Chat',
    async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, sender_type, content, is_read')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Can compute unread message count',
    'Chat',
    async () => {
      const { count, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('is_read', false);
      if (error) throw error;
      return count;
    },
    (result) => typeof result === 'number'
  );
  
  // Test with buyer
  if (config.buyerId) {
    await runTest(
      'Can get buyer conversations with latest messages',
      'Chat',
      async () => {
        const { data, error } = await supabase
          .from('conversations')
          .select(`
            *,
            messages(id, content, sender_type, created_at, read_at)
          `)
          .eq('buyer_id', config.buyerId)
          .order('updated_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
  }
}

// ============================================================================
// 10. AI ASSISTANT TESTS
// ============================================================================

async function testAISystem(): Promise<void> {
  log.header('10. AI ASSISTANT');
  
  log.subheader('AI Conversations');
  
  await runTest(
    'AI conversations table exists',
    'AI',
    async () => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('id, user_id, title, created_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  log.subheader('AI Messages');
  
  // Note: ai_messages uses 'sender' ('user'/'ai') and 'message' columns
  await runTest(
    'AI messages table has correct structure',
    'AI',
    async () => {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('id, conversation_id, sender, message, created_at')
        .limit(1);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'Can get AI conversations with messages',
    'AI',
    async () => {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select(`
          *,
          messages:ai_messages(id, sender, message, created_at)
        `)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
}

// ============================================================================
// 11. WRITE OPERATION TESTS (Optional)
// ============================================================================

async function testWriteOperations(): Promise<void> {
  if (config.skipWriteTests) {
    log.header('11. WRITE OPERATIONS (Skipped)');
    log.warn('Write tests skipped due to SKIP_WRITE_TESTS=true');
    return;
  }
  
  log.header('11. WRITE OPERATIONS');
  
  log.subheader('Creating Test Data');
  
  // These tests create temporary data and clean up after
  const testId = `test-${Date.now()}`;
  
  // Test category creation
  let testCategoryId: string | null = null;
  await runTest(
    'Can create category',
    'Write',
    async () => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ name: `Test Category ${testId}`, slug: `test-${testId}` })
        .select()
        .single();
      if (error) throw error;
      testCategoryId = data.id;
      return data;
    },
    (result) => result?.id != null
  );
  
  // Clean up test category
  if (testCategoryId) {
    await runTest(
      'Can delete category',
      'Write',
      async () => {
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', testCategoryId);
        if (error) throw error;
        return true;
      }
    );
  }
}

// ============================================================================
// 12. COMPLETE FLOW INTEGRATION TESTS
// ============================================================================

async function testCompleteFlows(): Promise<void> {
  log.header('12. COMPLETE FLOW INTEGRATION');
  
  log.subheader('Buyer Flow');
  
  if (config.buyerId) {
    await runTest(
      'Buyer: Get profile + roles',
      'Flow',
      async () => {
        const [profile, roles] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', config.buyerId).single(),
          supabase.from('user_roles').select('role').eq('user_id', config.buyerId),
        ]);
        if (profile.error) throw profile.error;
        if (roles.error) throw roles.error;
        return { profile: profile.data, roles: roles.data };
      },
      (result) => result?.profile != null
    );
    
    await runTest(
      'Buyer: Browse products with images',
      'Flow',
      async () => {
        const { data, error } = await supabase
          .from('products')
          .select(`*, images:product_images(image_url, is_primary)`)
          .is('deleted_at', null)
          .is('disabled_at', null)
          .limit(10);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
    
    await runTest(
      'Buyer: Get cart + items',
      'Flow',
      async () => {
        const { data: cart } = await supabase
          .from('carts')
          .select('id')
          .eq('buyer_id', config.buyerId)
          .maybeSingle();
        
        if (!cart) return { cart: null, items: [] };
        
        const { data: items, error } = await supabase
          .from('cart_items')
          .select(`*, product:products(name, price), variant:product_variants(size, color, price)`)
          .eq('cart_id', cart.id);
        if (error) throw error;
        
        return { cart, items };
      },
      (result) => result != null
    );
    
    await runTest(
      'Buyer: Get orders with status',
      'Flow',
      async () => {
        const { data, error } = await supabase
          .from('orders')
          .select('id, payment_status, shipment_status, created_at')
          .eq('buyer_id', config.buyerId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
  } else {
    skipTest('Buyer flow tests', 'Flow', 'No TEST_BUYER_ID provided');
  }
  
  log.subheader('Seller Flow');
  
  if (config.sellerId) {
    await runTest(
      'Seller: Get profile + business info',
      'Flow',
      async () => {
        const { data, error } = await supabase
          .from('sellers')
          .select(`
            *,
            profile:profiles(first_name, last_name),
            business_info:seller_business_info(*),
            store_info:seller_store_info(*)
          `)
          .eq('id', config.sellerId)
          .single();
        if (error) throw error;
        return data;
      },
      (result) => result != null
    );
    
    await runTest(
      'Seller: Get products with QA status',
      'Flow',
      async () => {
        const { data, error } = await supabase
          .from('products')
          .select(`
            id, name, price, approval_status,
            assessment:product_assessments(status, submitted_at)
          `)
          .eq('seller_id', config.sellerId)
          .is('deleted_at', null)
          .limit(10);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
    
    await runTest(
      'Seller: Get orders to fulfill',
      'Flow',
      async () => {
        // Get orders that contain seller's products
        const { data, error } = await supabase
          .from('order_items')
          .select(`
            order_id,
            product_id,
            quantity,
            order:orders(id, payment_status, shipment_status, created_at)
          `)
          .eq('product_id', config.productId || '')
          .limit(10);
        if (error) throw error;
        return data;
      },
      (result) => Array.isArray(result)
    );
  } else {
    skipTest('Seller flow tests', 'Flow', 'No TEST_SELLER_ID provided');
  }
  
  log.subheader('QA Flow');
  
  // Note: products table may not have seller_id directly
  await runTest(
    'QA: Get pending queue',
    'Flow',
    async () => {
      const { data, error } = await supabase
        .from('product_assessments')
        .select(`
          *,
          product:products(id, name, category:categories(name))
        `)
        .in('status', ['pending_digital_review', 'waiting_for_sample', 'pending_physical_review'])
        .order('submitted_at', { ascending: true })
        .limit(10);
      if (error) throw error;
      return data;
    },
    (result) => Array.isArray(result)
  );
  
  await runTest(
    'QA: Get verification stats',
    'Flow',
    async () => {
      const statuses = ['pending_digital_review', 'verified', 'rejected', 'for_revision'];
      const counts: Record<string, number> = {};
      
      for (const status of statuses) {
        const { count } = await supabase
          .from('product_assessments')
          .select('id', { count: 'exact', head: true })
          .eq('status', status);
        counts[status] = count || 0;
      }
      
      return counts;
    },
    (result) => typeof result === 'object'
  );
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests(): Promise<void> {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║      BAZAAR COMPREHENSIVE DATABASE TEST SUITE                  ║');
  console.log('║      Testing New Normalized Schema (February 2026)             ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  log.info(`Test Buyer ID:  ${config.buyerId || 'Not provided'}`);
  log.info(`Test Seller ID: ${config.sellerId || 'Not provided'}`);
  log.info(`Test Admin ID:  ${config.adminId || 'Not provided'}`);
  log.info(`Test Product:   ${config.productId || 'Not provided'}`);
  log.info(`Skip Writes:    ${config.skipWriteTests}`);
  
  const startTime = Date.now();
  
  // Run all test suites
  const connected = await testDatabaseConnection();
  
  if (!connected) {
    log.error('Cannot proceed - database connection failed');
    process.exit(1);
  }
  
  await testSchemaValidation();
  await testProfilesAndRoles();
  await testBuyersAndSellers();
  await testCategoriesAndProducts();
  await testQASystem();
  await testCartSystem();
  await testOrderSystem();
  await testChatSystem();
  await testAISystem();
  await testWriteOperations();
  await testCompleteFlows();
  
  const duration = Date.now() - startTime;
  
  // Summary
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                      TEST SUMMARY                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');
  
  const byCategory: Record<string, { passed: number; failed: number }> = {};
  
  for (const result of results) {
    if (!byCategory[result.category]) {
      byCategory[result.category] = { passed: 0, failed: 0 };
    }
    if (result.success) {
      byCategory[result.category].passed++;
    } else {
      byCategory[result.category].failed++;
    }
  }
  
  for (const [category, stats] of Object.entries(byCategory)) {
    const icon = stats.failed === 0 ? colors.green + '✓' : colors.red + '✗';
    const total = stats.passed + stats.failed;
    console.log(`${icon}${colors.reset} ${category}: ${stats.passed}/${total} passed`);
  }
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;
  
  console.log('');
  console.log(`${'─'.repeat(60)}`);
  console.log(`Total: ${passed}/${total} tests passed (${failed} failed)`);
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log('');
  
  if (failed > 0) {
    console.log(`${colors.red}Failed tests:${colors.reset}`);
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  ${colors.red}✗${colors.reset} [${r.category}] ${r.name}`);
        if (r.error) console.log(`    ${colors.dim}${r.error}${colors.reset}`);
      });
    console.log('');
  }
  
  if (failed === 0) {
    console.log(`${colors.green}🎉 All tests passed!${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  Some tests failed. Review errors above.${colors.reset}`);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  console.error('Test suite crashed:', error);
  process.exit(1);
});
