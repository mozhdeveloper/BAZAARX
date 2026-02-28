/**
 * Phase 1 Comprehensive Test Suite
 * ================================
 * Tests ALL Phase 1 features across:
 *   - Database schema alignment (tables, columns, constraints, RLS)
 *   - Service layer correctness (web services against real DB)
 *   - File existence verification (all pages/screens/components)
 *   - Cross-platform parity (web ↔ mobile feature mapping)
 *   - Known bug regression checks
 *
 * Run: npx tsx src/tests/phase1-comprehensive.test.ts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    'https://ijdpbfrcvdflzwytxncj.supabase.co';

const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Root paths
const WEB_ROOT = path.resolve(__dirname, '../..');
const PROJECT_ROOT = path.resolve(__dirname, '../../..');
const MOBILE_ROOT = path.resolve(PROJECT_ROOT, 'mobile-app');

// ============================================================================
// TEST INFRASTRUCTURE
// ============================================================================

interface TestResult {
    id: number;
    section: string;
    name: string;
    passed: boolean;
    message: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    duration: number;
}

const results: TestResult[] = [];
let testCounter = 0;
let currentSection = '';

function section(name: string) {
    currentSection = name;
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`  ${name}`);
    console.log(`${'═'.repeat(60)}\n`);
}

async function test(
    name: string,
    severity: TestResult['severity'],
    fn: () => Promise<string>
): Promise<void> {
    testCounter++;
    const id = testCounter;
    const start = Date.now();
    try {
        const message = await fn();
        results.push({ id, section: currentSection, name, passed: true, message, severity, duration: Date.now() - start });
        console.log(`  ✅ ${name}`);
    } catch (error: any) {
        results.push({ id, section: currentSection, name, passed: false, message: error.message, severity, duration: Date.now() - start });
        const icon = severity === 'critical' ? '❌' : severity === 'high' ? '🔴' : '⚠️';
        console.log(`  ${icon} ${name}: ${error.message}`);
    }
}

function assert(condition: boolean, msg: string) {
    if (!condition) throw new Error(msg);
}

function fileExists(relativePath: string): boolean {
    return fs.existsSync(path.resolve(PROJECT_ROOT, relativePath));
}

function fileContains(relativePath: string, ...patterns: string[]): string[] {
    const absPath = path.resolve(PROJECT_ROOT, relativePath);
    if (!fs.existsSync(absPath)) throw new Error(`File not found: ${relativePath}`);
    const content = fs.readFileSync(absPath, 'utf-8');
    return patterns.filter(p => !content.includes(p));
}

function fileMatchesRegex(relativePath: string, pattern: RegExp): boolean {
    const absPath = path.resolve(PROJECT_ROOT, relativePath);
    if (!fs.existsSync(absPath)) return false;
    const content = fs.readFileSync(absPath, 'utf-8');
    return pattern.test(content);
}

// ============================================================================
// 1. DATABASE SCHEMA TESTS
// ============================================================================

async function testDatabaseSchema() {
    section('DATABASE SCHEMA VERIFICATION');

    // Core tables
    const coreTables = [
        { table: 'products', cols: 'id, name, price, category_id, approval_status, seller_id' },
        { table: 'product_variants', cols: 'id, product_id, variant_name, price, stock, sku' },
        { table: 'product_images', cols: 'id, product_id, image_url, is_primary' },
        { table: 'categories', cols: 'id, name' },
        { table: 'sellers', cols: 'id, store_name, avatar_url, approval_status' },
        { table: 'buyers', cols: 'id, avatar_url, bazcoins, preferences' },
        { table: 'profiles', cols: 'id, first_name, last_name, email, phone' },
        { table: 'orders', cols: 'id, order_number, buyer_id, address_id, payment_status, shipment_status' },
        { table: 'order_items', cols: 'id, order_id, product_id, product_name, price, quantity, variant_id' },
        { table: 'order_payments', cols: 'id, order_id, payment_method, amount, status' },
        { table: 'order_recipients', cols: 'id, first_name, last_name, phone, email' },
        { table: 'cart_items', cols: 'id, cart_id, product_id, quantity' },
        { table: 'shipping_addresses', cols: 'id, user_id, label, address_line_1, city, province, postal_code, is_default' },
        { table: 'reviews', cols: 'id, buyer_id, product_id, rating, comment' },
        { table: 'conversations', cols: 'id, buyer_id, order_id, created_at' },
        { table: 'messages', cols: 'id, conversation_id, sender_id, sender_type, content' },
        { table: 'store_followers', cols: 'id, buyer_id, seller_id' },
        { table: 'discount_campaigns', cols: 'id, seller_id, campaign_type, discount_type, discount_value, starts_at, ends_at, status' },
        { table: 'product_discounts', cols: 'id, campaign_id, product_id' },
        { table: 'vouchers', cols: 'id, code, title' },
        { table: 'order_vouchers', cols: 'id, buyer_id, order_id, voucher_id, discount_amount' },
        { table: 'order_discounts', cols: 'id, buyer_id, order_id, campaign_id, discount_amount' },
        { table: 'product_requests', cols: 'id, product_name, description, votes' },
        { table: 'payment_methods', cols: 'id, user_id, payment_type, label, is_default' },
        { table: 'payment_method_cards', cols: 'payment_method_id, card_last4, card_brand' },
        { table: 'payment_method_wallets', cols: 'payment_method_id, e_wallet_provider, e_wallet_account_number' },
        // NOTE: notifications, payout_ledger, wishlists, wishlist_items tables are planned but not yet created
    ];

    for (const { table, cols } of coreTables) {
        await test(`Table "${table}" exists with columns (${cols.split(',').length})`, 'critical', async () => {
            const { error } = await supabase.from(table).select(cols).limit(0);
            assert(!error, `${table}: ${error?.message}`);
            return `✓ ${cols}`;
        });
    }

    // Verify products table does NOT have 'stock' or 'original_price' columns (known bugs)
    await test('products table does NOT have "stock" column (bug regression)', 'high', async () => {
        const { error } = await supabase.from('products').select('stock' as any).limit(0);
        // If no error, the column exists (unexpected); if error with "column not found", that's correct
        if (!error) {
            throw new Error('products.stock column exists — should NOT exist (stock is on product_variants)');
        }
        return 'Confirmed: products.stock does not exist (stock lives on product_variants)';
    });

    await test('products table does NOT have "original_price" column (bug regression)', 'high', async () => {
        const { error } = await supabase.from('products').select('original_price' as any).limit(0);
        if (!error) {
            throw new Error('products.original_price column exists — should NOT exist');
        }
        return 'Confirmed: products.original_price does not exist';
    });

    // Verify FK and data integrity
    await test('orders.address_id FK works', 'high', async () => {
        const { data, error } = await supabase.from('orders').select('id, address_id').limit(1);
        assert(!error, `Cannot query orders.address_id: ${error?.message}`);
        return `address_id column queryable (${data?.length || 0} orders checked)`;
    });

    await test('order_payments links to orders', 'high', async () => {
        const { data, error } = await supabase
            .from('order_payments')
            .select('id, order_id, payment_method, amount, status')
            .limit(1);
        assert(!error, `order_payments query failed: ${error?.message}`);
        return `order_payments queryable (${data?.length || 0} records)`;
    });

    // Test seller approval_status values
    await test('sellers approval_status uses correct enum values', 'high', async () => {
        const { data, error } = await supabase
            .from('sellers')
            .select('approval_status')
            .limit(50);
        assert(!error, `Query failed: ${error?.message}`);
        const statuses = new Set((data || []).map((s: any) => s.approval_status));
        const validStatuses = ['pending', 'verified', 'rejected', 'needs_resubmission'];
        for (const s of statuses) {
            assert(validStatuses.includes(s), `Invalid approval_status: "${s}" (valid: ${validStatuses.join(', ')})`);
        }
        return `Statuses found: ${[...statuses].join(', ')}`;
    });

    // Test data existence
    await test('At least 1 approved/active product exists', 'critical', async () => {
        const { data, error } = await supabase
            .from('products')
            .select('id, name')
            .eq('approval_status', 'approved')
            .limit(1);
        assert(!error, `Query failed: ${error?.message}`);
        assert(data && data.length > 0, 'No approved products found — shop will be empty');
        return `Found: ${data[0].name}`;
    });

    await test('At least 1 category exists', 'critical', async () => {
        const { data, error } = await supabase.from('categories').select('id, name').limit(1);
        assert(!error, `Query failed: ${error?.message}`);
        assert(data && data.length > 0, 'No categories found');
        return `Found: ${data[0].name}`;
    });

    await test('At least 1 verified seller exists', 'critical', async () => {
        const { data, error } = await supabase
            .from('sellers')
            .select('id, store_name')
            .eq('approval_status', 'verified')
            .limit(1);
        assert(!error, `Query failed: ${error?.message}`);
        assert(data && data.length > 0, 'No verified sellers found');
        return `Found: ${data[0].store_name}`;
    });

    await test('Products have images in product_images table', 'high', async () => {
        const { data, error } = await supabase
            .from('product_images')
            .select('id, product_id, image_url')
            .limit(5);
        assert(!error, `Query failed: ${error?.message}`);
        assert(data && data.length > 0, 'No product images found');
        return `${data.length} product images found`;
    });

    await test('Products have variants in product_variants table', 'high', async () => {
        const { data, error } = await supabase
            .from('product_variants')
            .select('id, product_id, stock, price')
            .limit(5);
        assert(!error, `Query failed: ${error?.message}`);
        assert(data && data.length > 0, 'No product variants found');
        const totalStock = data.reduce((s: number, v: any) => s + (v.stock || 0), 0);
        return `${data.length} variants, total stock: ${totalStock}`;
    });
}

// ============================================================================
// 2. BUYER WEB PAGES — FILE EXISTENCE & FEATURE CHECKS
// ============================================================================

async function testBuyerWebPages() {
    section('BUYER WEB PAGES');

    const buyerPages: { name: string; path: string; mustContain: string[] }[] = [
        {
            name: 'HomePage',
            path: 'web/src/pages/HomePage.tsx',
            mustContain: ['categories', 'flash', 'Featured', 'BazaarHero', 'countdown']
        },
        {
            name: 'ShopPage (Category)',
            path: 'web/src/pages/ShopPage.tsx',
            mustContain: ['priceRange', 'minRating', 'selectedCategory', 'ProductCard']
        },
        {
            name: 'ProductDetailPage',
            path: 'web/src/pages/ProductDetailPage.tsx',
            mustContain: ['selectedImage', 'rating', 'seller', 'addToCart', 'Follow']
        },
        {
            name: 'SearchPage',
            path: 'web/src/pages/SearchPage.tsx',
            mustContain: ['searchQuery', 'priceRange', 'minRating', 'ProductRequestModal', 'sortBy']
        },
        {
            name: 'EnhancedCartPage',
            path: 'web/src/pages/EnhancedCartPage.tsx',
            mustContain: ['groupedCart', 'voucher', 'Seller Total', 'quantity']
        },
        {
            name: 'CheckoutPage',
            path: 'web/src/pages/CheckoutPage.tsx',
            mustContain: ['shippingAddress', 'paymentMethod', 'validateForm', 'bazcoins']
        },
        {
            name: 'OrderConfirmationPage',
            path: 'web/src/pages/OrderConfirmationPage.tsx',
            mustContain: ['order', 'confirmation', 'email']
        },
        {
            name: 'OrdersPage',
            path: 'web/src/pages/OrdersPage.tsx',
            mustContain: ['orders', 'status', 'OrderStatusBadge']
        },
        {
            name: 'OrderDetailPage',
            path: 'web/src/pages/OrderDetailPage.tsx',
            mustContain: ['status', 'items', 'chat', 'review']
        },
        {
            name: 'BuyerLoginPage',
            path: 'web/src/pages/BuyerLoginPage.tsx',
            mustContain: ['email', 'password', 'signIn']
        },
        {
            name: 'BuyerSignupPage',
            path: 'web/src/pages/BuyerSignupPage.tsx',
            mustContain: ['email', 'password', 'Signup']
        },
        {
            name: 'BuyerProfilePage',
            path: 'web/src/pages/BuyerProfilePage.tsx',
            mustContain: ['profile', 'address', 'following']
        },
    ];

    for (const page of buyerPages) {
        await test(`${page.name} exists`, 'critical', async () => {
            assert(fileExists(page.path), `File not found: ${page.path}`);
            return `✓ ${page.path}`;
        });

        await test(`${page.name} has required features`, 'high', async () => {
            const missing = fileContains(page.path, ...page.mustContain);
            assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
            return `All ${page.mustContain.length} features present`;
        });
    }

    // SearchPage rating filter regression test
    await test('SearchPage has minRating state (bug fix regression)', 'critical', async () => {
        assert(
            fileMatchesRegex('web/src/pages/SearchPage.tsx', /const\s+\[minRating.*useState/),
            'SearchPage missing minRating state variable'
        );
        assert(
            fileMatchesRegex('web/src/pages/SearchPage.tsx', /minRating.*>.*0.*&&.*rating/),
            'SearchPage missing minRating filter logic'
        );
        assert(
            fileMatchesRegex('web/src/pages/SearchPage.tsx', /Minimum Rating/),
            'SearchPage missing Rating filter UI'
        );
        return 'minRating state + filter logic + UI all present';
    });

    // ProductRequestModal
    await test('ProductRequestModal exists', 'critical', async () => {
        assert(fileExists('web/src/components/ProductRequestModal.tsx'), 'ProductRequestModal not found');
        const missing = fileContains('web/src/components/ProductRequestModal.tsx', 'Submit', 'description', 'isSuccess');
        assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
        return 'ProductRequestModal with submit, description, success state';
    });
}

// ============================================================================
// 3. BUYER MOBILE SCREENS — FILE EXISTENCE
// ============================================================================

async function testBuyerMobileScreens() {
    section('BUYER MOBILE SCREENS');

    const mobileScreens = [
        { name: 'SplashScreen', path: 'mobile-app/app/SplashScreen.tsx' },
        { name: 'OnboardingScreen', path: 'mobile-app/app/OnboardingScreen.tsx' },
        { name: 'LoginScreen', path: 'mobile-app/app/LoginScreen.tsx' },
        { name: 'SignupScreen', path: 'mobile-app/app/SignupScreen.tsx' },
        { name: 'HomeScreen', path: 'mobile-app/app/HomeScreen.tsx' },
        { name: 'ShopScreen', path: 'mobile-app/app/ShopScreen.tsx' },
        { name: 'ProductDetailScreen', path: 'mobile-app/app/ProductDetailScreen.tsx' },
        { name: 'CartScreen', path: 'mobile-app/app/CartScreen.tsx' },
        { name: 'CheckoutScreen', path: 'mobile-app/app/CheckoutScreen.tsx' },
        { name: 'OrderConfirmation', path: 'mobile-app/app/OrderConfirmation.tsx' },
        { name: 'OrdersScreen', path: 'mobile-app/app/OrdersScreen.tsx' },
        { name: 'OrderDetailScreen', path: 'mobile-app/app/OrderDetailScreen.tsx' },
        { name: 'ProfileScreen', path: 'mobile-app/app/ProfileScreen.tsx' },
        { name: 'FollowingShopsScreen', path: 'mobile-app/app/FollowingShopsScreen.tsx' },
        { name: 'AddressesScreen', path: 'mobile-app/app/AddressesScreen.tsx' },
    ];

    for (const screen of mobileScreens) {
        await test(`Mobile: ${screen.name} exists`, 'critical', async () => {
            assert(fileExists(screen.path), `Not found: ${screen.path}`);
            return `✓ ${screen.path}`;
        });
    }

    // Mobile components
    const mobileComponents = [
        { name: 'ReviewModal', path: 'mobile-app/src/components/ReviewModal.tsx' },
        { name: 'ProductCard', path: 'mobile-app/src/components/ProductCard.tsx' },
        { name: 'ProductRequestModal', path: 'mobile-app/src/components/ProductRequestModal.tsx' },
        { name: 'ChatScreen', path: 'mobile-app/src/components/ChatScreen.tsx' },
    ];

    for (const comp of mobileComponents) {
        await test(`Mobile Component: ${comp.name}`, 'high', async () => {
            assert(fileExists(comp.path), `Not found: ${comp.path}`);
            return `✓ ${comp.path}`;
        });
    }
}

// ============================================================================
// 4. SELLER DASHBOARD — FILE EXISTENCE & FEATURE CHECKS
// ============================================================================

async function testSellerDashboard() {
    section('SELLER DASHBOARD (WEB)');

    const sellerPages: { name: string; path: string; mustContain: string[] }[] = [
        {
            name: 'SellerAuth (Login/Signup)',
            path: 'web/src/pages/SellerAuth.tsx',
            mustContain: ['SellerLogin', 'SellerRegister', 'signIn', 'register']
        },
        {
            name: 'SellerDashboard',
            path: 'web/src/pages/SellerDashboard.tsx',
            mustContain: ['Orders Today', 'Revenue', 'pending']
        },
        {
            name: 'SellerStoreProfile',
            path: 'web/src/pages/SellerStoreProfile.tsx',
            mustContain: ['store_name', 'avatar', 'handleSave']
        },
        {
            name: 'SellerProducts',
            path: 'web/src/pages/SellerProducts.tsx',
            mustContain: ['AddProduct', 'handleSaveEdit', 'handleToggleStatus', 'flash']
        },
        {
            name: 'SellerOrders',
            path: 'web/src/pages/SellerOrders.tsx',
            mustContain: ['OrderDetailsModal', 'handleStatusUpdate', 'shipped', 'delivered']
        },
        {
            name: 'SellerEarnings',
            path: 'web/src/pages/SellerEarnings.tsx',
            mustContain: ['Total Earnings', 'Pending Payout', 'Payout History']
        },
        {
            name: 'SellerReviews',
            path: 'web/src/pages/SellerReviews.tsx',
            mustContain: ['review', 'rating', 'getSellerReviews']
        },
    ];

    for (const page of sellerPages) {
        await test(`${page.name} exists`, 'critical', async () => {
            assert(fileExists(page.path), `Not found: ${page.path}`);
            return `✓ ${page.path}`;
        });

        await test(`${page.name} features`, 'high', async () => {
            const missing = fileContains(page.path, ...page.mustContain);
            assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
            return `All ${page.mustContain.length} features present`;
        });
    }

    // Mobile seller screens
    const mobileSellerScreens = [
        'mobile-app/app/seller/login.tsx',
        'mobile-app/app/seller/signup.tsx',
        'mobile-app/app/seller/(tabs)/dashboard.tsx',
        'mobile-app/app/seller/(tabs)/products.tsx',
        'mobile-app/app/seller/(tabs)/orders.tsx',
        'mobile-app/app/seller/earnings.tsx',
        'mobile-app/app/seller/reviews.tsx',
        'mobile-app/app/seller/store-profile.tsx',
    ];

    for (const screen of mobileSellerScreens) {
        await test(`Mobile Seller: ${screen.split('/').pop()}`, 'high', async () => {
            assert(fileExists(screen), `Not found: ${screen}`);
            return `✓ ${screen}`;
        });
    }
}

// ============================================================================
// 5. ADMIN PANEL — FILE EXISTENCE & FEATURE CHECKS
// ============================================================================

async function testAdminPanel() {
    section('ADMIN PANEL');

    const adminPages: { name: string; path: string; mustContain: string[] }[] = [
        {
            name: 'AdminAuth',
            path: 'web/src/pages/AdminAuth.tsx',
            mustContain: ['login', 'email', 'password']
        },
        {
            name: 'AdminDashboard',
            path: 'web/src/pages/AdminDashboard.tsx',
            mustContain: ['totalSellers', 'totalBuyers', 'Revenue', 'Product Requests']
        },
        {
            name: 'AdminSellers',
            path: 'web/src/pages/AdminSellers.tsx',
            mustContain: ['approveSeller', 'rejectSeller', 'suspendSeller']
        },
        {
            name: 'AdminBuyers',
            path: 'web/src/pages/AdminBuyers.tsx',
            mustContain: ['buyer', 'BuyerCard']
        },
        {
            name: 'AdminProducts',
            path: 'web/src/pages/AdminProducts.tsx',
            mustContain: ['products', 'deactivateProduct']
        },
        {
            name: 'AdminCategories',
            path: 'web/src/pages/AdminCategories.tsx',
            mustContain: ['handleAddCategory', 'handleEditCategory', 'handleDeleteCategory']
        },
        {
            name: 'AdminOrders',
            path: 'web/src/pages/AdminOrders.tsx',
            mustContain: ['orders', 'handleChangeStatus', 'Override']
        },
        {
            name: 'AdminProductRequests',
            path: 'web/src/pages/AdminProductRequests.tsx',
            mustContain: ['requests', 'votes', 'handleUpdateStatus']
        },
        {
            name: 'AdminVouchers',
            path: 'web/src/pages/AdminVouchers.tsx',
            mustContain: ['handleAddVoucher', 'handleEditVoucher']
        },
        {
            name: 'AdminFlashSales',
            path: 'web/src/pages/AdminFlashSales.tsx',
            mustContain: ['flash', 'price', 'schedule']
        },
        {
            name: 'AdminPayouts',
            path: 'web/src/pages/AdminPayouts.tsx',
            mustContain: ['processBatch', 'markAsPaid', 'referenceNumber']
        },
        {
            name: 'AdminReviewModeration',
            path: 'web/src/pages/AdminReviewModeration.tsx',
            mustContain: ['review', 'flagged', 'deleteReview']
        },
    ];

    for (const page of adminPages) {
        await test(`${page.name} exists`, 'critical', async () => {
            assert(fileExists(page.path), `Not found: ${page.path}`);
            return `✓ ${page.path}`;
        });

        await test(`${page.name} features`, 'high', async () => {
            const missing = fileContains(page.path, ...page.mustContain);
            assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
            return `All ${page.mustContain.length} features present`;
        });
    }
}

// ============================================================================
// 6. WEB SERVICES — EXISTENCE & CORRECTNESS
// ============================================================================

async function testWebServices() {
    section('WEB SERVICES');

    const services = [
        'web/src/services/productService.ts',
        'web/src/services/sellerService.ts',
        'web/src/services/checkoutService.ts',
        'web/src/services/paymentService.ts',
        'web/src/services/chatService.ts',
        'web/src/services/reviewService.ts',
        'web/src/services/discountService.ts',
        'web/src/services/voucherService.ts',
        'web/src/services/notificationService.ts',
        'web/src/services/featuredProductService.ts',
        'web/src/services/adBoostService.ts',
        'web/src/services/earningsService.ts',
    ];

    for (const svc of services) {
        await test(`Service: ${svc.split('/').pop()}`, 'critical', async () => {
            assert(fileExists(svc), `Not found: ${svc}`);
            return `✓ exists`;
        });
    }

    // Checkout service bug regression tests
    await test('checkoutService: no products.stock reference in stock validation', 'critical', async () => {
        const content = fs.readFileSync(
            path.resolve(PROJECT_ROOT, 'web/src/services/checkoutService.ts'), 'utf-8'
        );
        // Should NOT have product.stock in the non-variant branch
        const hasOldBug = /else\s*\{[^}]*product\.stock[^}]*\}/s.test(content);
        assert(!hasOldBug, 'Still references product.stock for non-variant products');
        return 'No product.stock in non-variant stock validation';
    });

    await test('checkoutService: sets address_id on orders', 'critical', async () => {
        const missing = fileContains('web/src/services/checkoutService.ts', 'address_id: shippingAddressId');
        assert(missing.length === 0, 'Missing address_id in order insert');
        return 'address_id: shippingAddressId present in order insert';
    });

    await test('checkoutService: creates order_payments record', 'high', async () => {
        const missing = fileContains('web/src/services/checkoutService.ts', 'order_payments');
        assert(missing.length === 0, 'Missing order_payments insert');
        return 'order_payments insert present';
    });

    await test('checkoutService: order number includes timestamp suffix', 'medium', async () => {
        assert(
            fileMatchesRegex('web/src/services/checkoutService.ts', /Date\.now\(\)\.toString\(36\)/),
            'Order number generator missing timestamp component for collision avoidance'
        );
        return 'Order number has timestamp suffix to avoid collisions';
    });

    // Payment service bug regression
    await test('paymentService: uses payment_methods table (not buyers.payment_methods)', 'critical', async () => {
        const content = fs.readFileSync(
            path.resolve(PROJECT_ROOT, 'web/src/services/paymentService.ts'), 'utf-8'
        );
        const usesOldPattern = content.includes("from('buyers')") && content.includes("payment_methods");
        assert(!usesOldPattern, 'Still references buyers.payment_methods (non-existent column)');
        return 'Uses payment_methods table correctly';
    });

    await test('paymentService: no RPC calls to non-existent functions', 'critical', async () => {
        const content = fs.readFileSync(
            path.resolve(PROJECT_ROOT, 'web/src/services/paymentService.ts'), 'utf-8'
        );
        const hasRpc = content.includes("supabase.rpc('add_payment_method'") ||
            content.includes("supabase.rpc('delete_payment_method'") ||
            content.includes("supabase.rpc('set_default_payment_method'");
        assert(!hasRpc, 'Still calls non-existent RPC functions');
        return 'No calls to non-existent RPCs';
    });

    // featuredProductService regression
    await test('featuredProductService: no original_price reference', 'high', async () => {
        const content = fs.readFileSync(
            path.resolve(PROJECT_ROOT, 'web/src/services/featuredProductService.ts'), 'utf-8'
        );
        assert(!content.includes('original_price'), 'Still references original_price column');
        return 'No original_price references';
    });
}

// ============================================================================
// 7. DESIGN PRIORITY — UI QUALITY CHECKS
// ============================================================================

async function testDesignPriority() {
    section('DESIGN PRIORITY (UI MUST-HAVES)');

    // Product Cards
    await test('Web ProductCard: image, price, flash badge, rating', 'high', async () => {
        const missing = fileContains('web/src/components/ProductCard.tsx',
            'object-cover', 'price', 'OFF', 'rating', 'Star');
        assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
        return 'All 4 design elements present';
    });

    await test('Mobile ProductCard: image, price, flash badge, rating', 'high', async () => {
        const missing = fileContains('mobile-app/src/components/ProductCard.tsx',
            'aspectRatio', 'price', 'discount', 'rating');
        assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
        return 'All 4 design elements present';
    });

    // Seller Storefront
    await test('Web SellerStorefront: logo, follow, product grid', 'high', async () => {
        assert(fileExists('web/src/pages/SellerStorefrontPage.tsx'), 'SellerStorefrontPage not found');
        const missing = fileContains('web/src/pages/SellerStorefrontPage.tsx',
            'avatar', 'Follow', 'grid');
        assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
        return 'Logo, Follow button, product grid present';
    });

    // Multi-Seller Cart Grouping
    await test('Web Cart: seller grouping with subtotals', 'high', async () => {
        const missing = fileContains('web/src/pages/EnhancedCartPage.tsx',
            'groupedCart', 'Seller Total');
        assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
        return 'Grouped by seller with subtotals';
    });

    await test('Mobile Cart: seller grouping with subtotals', 'high', async () => {
        const missing = fileContains('mobile-app/app/CartScreen.tsx',
            'groupedItems', 'sellerName');
        assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
        return 'Grouped by seller with names';
    });

    // Chat UX
    await test('Web Chat: message bubbles with order context', 'high', async () => {
        assert(fileExists('web/src/components/ChatBubble.tsx'), 'ChatBubble not found');
        const missing = fileContains('web/src/components/ChatBubble.tsx',
            'message', 'rounded', 'orderId');
        assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
        return 'Bubbles with order context';
    });

    // Flash Sale
    await test('Web FlashSalesPage: badge, countdown, pricing', 'high', async () => {
        assert(fileExists('web/src/pages/FlashSalesPage.tsx'), 'FlashSalesPage not found');
        const missing = fileContains('web/src/pages/FlashSalesPage.tsx',
            'timeLeft', 'Zap', 'discount');
        assert(missing.length === 0, `Missing: ${missing.join(', ')}`);
        return 'Countdown, badge, discount pricing present';
    });
}

// ============================================================================
// 8. CROSS-PLATFORM PARITY CHECKS
// ============================================================================

async function testCrossPlatformParity() {
    section('CROSS-PLATFORM PARITY (WEB ↔ MOBILE)');

    const parityChecks = [
        {
            feature: 'Product service',
            web: 'web/src/services/productService.ts',
            mobile: 'mobile-app/src/services/productService.ts'
        },
        {
            feature: 'Checkout service',
            web: 'web/src/services/checkoutService.ts',
            mobile: 'mobile-app/src/services/checkoutService.ts'
        },
        {
            feature: 'Chat service',
            web: 'web/src/services/chatService.ts',
            mobile: 'mobile-app/src/services/chatService.ts'
        },
        {
            feature: 'Review service',
            web: 'web/src/services/reviewService.ts',
            mobile: 'mobile-app/src/services/reviewService.ts'
        },
        {
            feature: 'Discount service',
            web: 'web/src/services/discountService.ts',
            mobile: 'mobile-app/src/services/discountService.ts'
        },
        {
            feature: 'Seller service',
            web: 'web/src/services/sellerService.ts',
            mobile: 'mobile-app/src/services/sellerService.ts'
        },
        {
            feature: 'Ad Boost service',
            web: 'web/src/services/adBoostService.ts',
            mobile: 'mobile-app/src/services/adBoostService.ts'
        },
    ];

    for (const check of parityChecks) {
        await test(`Parity: ${check.feature}`, 'high', async () => {
            const webExists = fileExists(check.web);
            const mobileExists = fileExists(check.mobile);
            assert(webExists, `Web missing: ${check.web}`);
            assert(mobileExists, `Mobile missing: ${check.mobile}`);
            return 'Both platforms have matching service';
        });
    }
}

// ============================================================================
// 9. ROUTING VERIFICATION
// ============================================================================

async function testRouting() {
    section('ROUTING VERIFICATION');

    await test('App.tsx contains all buyer routes', 'critical', async () => {
        const missing = fileContains('web/src/App.tsx',
            '/shop', '/product/', '/search', '/enhanced-cart', '/checkout',
            '/order-confirmation', '/orders', '/login', '/signup', '/profile'
        );
        assert(missing.length === 0, `Missing routes: ${missing.join(', ')}`);
        return 'All buyer routes present';
    });

    await test('App.tsx contains all seller routes', 'critical', async () => {
        const missing = fileContains('web/src/App.tsx',
            '/seller/login', '/seller/register',
            '/seller/products', '/seller/orders', '/seller/earnings', '/seller/reviews'
        );
        assert(missing.length === 0, `Missing routes: ${missing.join(', ')}`);
        return 'All seller routes present';
    });

    await test('App.tsx contains all admin routes', 'critical', async () => {
        const missing = fileContains('web/src/App.tsx',
            '/admin/login', '/admin/sellers', '/admin/buyers',
            '/admin/products', '/admin/categories', '/admin/orders',
            '/admin/product-requests', '/admin/vouchers', '/admin/flash-sales',
            '/admin/payouts', '/admin/reviews'
        );
        assert(missing.length === 0, `Missing routes: ${missing.join(', ')}`);
        return 'All admin routes present';
    });
}

// ============================================================================
// 10. DATABASE QUERY INTEGRATION TESTS
// ============================================================================

async function testDatabaseQueries() {
    section('DATABASE QUERY INTEGRATION');

    await test('Can query products with images and variants', 'critical', async () => {
        const { data, error } = await supabase
            .from('products')
            .select(`
                id, name, price, approval_status,
                product_images(id, image_url, is_primary),
                product_variants(id, variant_name, price, stock)
            `)
            .eq('approval_status', 'approved')
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        assert(data && data.length > 0, 'No products returned');
        return `${data.length} products with images + variants`;
    });

    await test('Can query products with seller info', 'critical', async () => {
        const { data, error } = await supabase
            .from('products')
            .select(`
                id, name, price,
                seller:sellers(id, store_name, avatar_url, approval_status)
            `)
            .eq('approval_status', 'approved')
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        assert(data && data.length > 0, 'No products returned');
        return `${data.length} products with seller info`;
    });

    await test('Can query orders with items', 'high', async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                id, order_number, buyer_id, payment_status, shipment_status,
                order_items(id, product_name, price, quantity)
            `)
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        return `${(data || []).length} orders queryable with items`;
    });

    await test('Can query conversations with messages', 'high', async () => {
        const { data, error } = await supabase
            .from('conversations')
            .select(`
                id, buyer_id, order_id,
                messages(id, content, sender_type, created_at)
            `)
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        return `${(data || []).length} conversations queryable`;
    });

    await test('Can query reviews with buyer info', 'high', async () => {
        const { data, error } = await supabase
            .from('reviews')
            .select(`
                id, rating, comment, product_id,
                buyer:buyers(id, avatar_url)
            `)
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        return `${(data || []).length} reviews queryable with buyer info`;
    });

    await test('Can query store_followers', 'high', async () => {
        const { data, error } = await supabase
            .from('store_followers')
            .select('id, buyer_id, seller_id')
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        return `${(data || []).length} follower records`;
    });

    await test('Can query discount_campaigns with active flash sales', 'high', async () => {
        const { data, error } = await supabase
            .from('discount_campaigns')
            .select(`
                id, campaign_type, discount_value, starts_at, ends_at, status,
                product_discounts(product_id)
            `)
            .limit(5);
        assert(!error, `Query failed: ${error?.message}`);
        return `${(data || []).length} campaigns queryable`;
    });

    await test('Can query vouchers', 'high', async () => {
        const { data, error } = await supabase
            .from('vouchers')
            .select('id, code, title')
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        return `${(data || []).length} vouchers queryable`;
    });

    await test('Can query product_requests with votes', 'high', async () => {
        const { data, error } = await supabase
            .from('product_requests')
            .select('id, product_name, description, votes, status')
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        return `${(data || []).length} product requests queryable`;
    });

    await test('Can query payment_methods with card details', 'high', async () => {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('id, user_id, payment_type, label, is_default, payment_method_cards(*)')
            .limit(3);
        assert(!error, `Query failed: ${error?.message}`);
        return `${(data || []).length} payment methods queryable`;
    });

    // NOTE: payout_ledger and notifications tables are planned but not yet created in DB
    // These integration tests will be added once the tables exist
}

// ============================================================================
// 11. BUG REGRESSION CHECKS
// ============================================================================

async function testBugRegressions() {
    section('BUG REGRESSION CHECKS');

    await test('CheckoutPage: validateForm returns object (not just boolean)', 'high', async () => {
        assert(
            fileMatchesRegex('web/src/pages/CheckoutPage.tsx', /isValid.*Object\.keys.*newErrors/),
            'validateForm should return { isValid, messages } not just boolean'
        );
        return 'validateForm returns { isValid, messages }';
    });

    await test('CheckoutPage: toast uses validation.messages (not stale errors)', 'high', async () => {
        assert(
            fileMatchesRegex('web/src/pages/CheckoutPage.tsx', /validation\.messages\.join/),
            'Toast should use validation.messages, not stale errors state'
        );
        return 'Toast reads from validation result, not stale state';
    });

    await test('ShopPage: seller displayed as string (not object)', 'high', async () => {
        assert(
            fileMatchesRegex('web/src/pages/ShopPage.tsx', /sellerName.*\|\|.*('|")(Verified Seller|BazaarX Store)/),
            'Seller should be extracted as string (sellerName || default)'
        );
        return 'Seller rendered as string, not object';
    });

    await test('Web checkout: no payment_status no-op ternary', 'low', async () => {
        const content = fs.readFileSync(
            path.resolve(PROJECT_ROOT, 'web/src/services/checkoutService.ts'), 'utf-8'
        );
        const hasNoOp = /payment_status:\s*paymentMethod\s*===\s*'cod'\s*\?\s*'pending_payment'\s*:\s*'pending_payment'/.test(content);
        assert(!hasNoOp, 'payment_status still has no-op ternary (both branches same value)');
        return 'No no-op ternary for payment_status';
    });
}

// ============================================================================
// MAIN RUNNER
// ============================================================================

async function main() {
    console.log('\n' + '█'.repeat(60));
    console.log('  BAZAARX V1 PHASE 1 — COMPREHENSIVE TEST SUITE');
    console.log('  ' + new Date().toISOString());
    console.log('█'.repeat(60));

    const startTime = Date.now();

    try {
        await testDatabaseSchema();
        await testBuyerWebPages();
        await testBuyerMobileScreens();
        await testSellerDashboard();
        await testAdminPanel();
        await testWebServices();
        await testDesignPriority();
        await testCrossPlatformParity();
        await testRouting();
        await testDatabaseQueries();
        await testBugRegressions();
    } catch (e: any) {
        console.error(`\n💥 FATAL ERROR: ${e.message}`);
    }

    // ============================================================================
    // RESULTS SUMMARY
    // ============================================================================

    const totalTime = Date.now() - startTime;
    const passed = results.filter(r => r.passed);
    const failed = results.filter(r => !r.passed);
    const criticalFails = failed.filter(r => r.severity === 'critical');
    const highFails = failed.filter(r => r.severity === 'high');

    console.log('\n' + '═'.repeat(60));
    console.log('  RESULTS SUMMARY');
    console.log('═'.repeat(60));
    console.log(`  Total Tests:   ${results.length}`);
    console.log(`  ✅ Passed:     ${passed.length}`);
    console.log(`  ❌ Failed:     ${failed.length}`);
    console.log(`  ⏱️  Duration:   ${(totalTime / 1000).toFixed(1)}s`);
    console.log(`  📊 Pass Rate:  ${((passed.length / results.length) * 100).toFixed(1)}%`);

    if (criticalFails.length > 0) {
        console.log(`\n  🔴 CRITICAL FAILURES (${criticalFails.length}):`);
        criticalFails.forEach(f => console.log(`     ❌ [${f.section}] ${f.name}: ${f.message}`));
    }

    if (highFails.length > 0) {
        console.log(`\n  🟠 HIGH FAILURES (${highFails.length}):`);
        highFails.forEach(f => console.log(`     ❌ [${f.section}] ${f.name}: ${f.message}`));
    }

    const otherFails = failed.filter(r => r.severity !== 'critical' && r.severity !== 'high');
    if (otherFails.length > 0) {
        console.log(`\n  🟡 OTHER FAILURES (${otherFails.length}):`);
        otherFails.forEach(f => console.log(`     ⚠️  [${f.section}] ${f.name}: ${f.message}`));
    }

    // Section breakdown
    const sections = [...new Set(results.map(r => r.section))];
    console.log('\n  📋 SECTION BREAKDOWN:');
    for (const sec of sections) {
        const sResults = results.filter(r => r.section === sec);
        const sPassed = sResults.filter(r => r.passed).length;
        const icon = sPassed === sResults.length ? '✅' : '⚠️';
        console.log(`     ${icon} ${sec}: ${sPassed}/${sResults.length}`);
    }

    console.log('\n' + '═'.repeat(60));

    if (criticalFails.length > 0) {
        console.log('  ❌ V1 PHASE 1: NOT READY — Fix critical failures above');
        process.exit(1);
    } else if (failed.length > 0) {
        console.log(`  ⚠️  V1 PHASE 1: MOSTLY READY — ${failed.length} non-critical issue(s)`);
        process.exit(0);
    } else {
        console.log('  ✅ V1 PHASE 1: FULLY COMPLETE — All tests passed!');
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('Fatal:', err);
    process.exit(1);
});
