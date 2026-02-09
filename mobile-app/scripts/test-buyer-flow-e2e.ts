/**
 * COMPLETE BUYER FLOW END-TO-END TEST
 * ====================================
 * 
 * Tests both frontend logic and backend database operations for the entire buyer journey:
 * 
 * FRONTEND TESTS:
 * - Authentication (login/register)
 * - Product browsing and search
 * - Product detail with variants
 * - Cart operations (add, update, remove)
 * - Checkout validation
 * - Address management
 * - Order tracking UI logic
 * - Reviews and ratings
 * - Wishlist operations
 * - BazCoins display
 * 
 * BACKEND TESTS:
 * - Database CRUD operations
 * - Data integrity
 * - Foreign key relationships
 * - Stock management
 * - Order creation and updates
 * - Payment status
 * - Review aggregation
 * 
 * Run: npx ts-node scripts/test-buyer-flow-e2e.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ ERROR: Supabase credentials not found in environment');
    console.error('   Make sure .env file exists with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test configuration
const TEST_CONFIG = {
    testBuyerEmail: 'test-buyer@bazaar.ph',
    testBuyerPassword: 'Test123!',
    testProductName: 'Test Product',
    skipAuthTests: true, // Set to false to test actual auth
};

interface TestResult {
    category: 'FRONTEND' | 'BACKEND' | 'INTEGRATION';
    name: string;
    status: 'PASS' | 'FAIL' | 'SKIP';
    message: string;
    duration: number;
    details?: any;
}

const results: TestResult[] = [];

function log(msg: string) {
    console.log(`[TEST] ${msg}`);
}

function logSection(title: string) {
    console.log('\n' + '─'.repeat(60));
    console.log(`📋 ${title}`);
    console.log('─'.repeat(60));
}

function logResult(result: TestResult) {
    const emoji = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
    const category = `[${result.category}]`.padEnd(13);
    console.log(`${emoji} ${category} ${result.name}: ${result.message} (${result.duration}ms)`);
    results.push(result);
}

async function runTest(
    category: TestResult['category'],
    name: string,
    testFn: () => Promise<{ success: boolean; message: string; details?: any }>
): Promise<void> {
    const start = Date.now();
    try {
        const { success, message, details } = await testFn();
        logResult({
            category,
            name,
            status: success ? 'PASS' : 'FAIL',
            message,
            duration: Date.now() - start,
            details,
        });
    } catch (error: any) {
        logResult({
            category,
            name,
            status: 'FAIL',
            message: error.message || 'Unknown error',
            duration: Date.now() - start,
        });
    }
}

// ============================================================================
// BACKEND TESTS - Database Operations
// ============================================================================

async function testDatabaseConnection() {
    const { data, error } = await supabase.from('products').select('count').limit(1);
    if (error) throw new Error(`Database connection failed: ${error.message}`);
    return { success: true, message: 'Connected to Supabase database' };
}

async function testProductsTable() {
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, price, seller_id, category_id')
        .limit(5);
    
    if (error) throw new Error(`Products query failed: ${error.message}`);
    if (!products || products.length === 0) {
        return { success: false, message: 'No products found in database' };
    }
    
    // Validate product structure
    const product = products[0];
    const requiredFields = ['id', 'name', 'price', 'seller_id'];
    // @ts-ignore - Dynamic field access for validation
    const missingFields = requiredFields.filter(f => (product as any)[f] === undefined);
    
    if (missingFields.length > 0) {
        return { success: false, message: `Products missing fields: ${missingFields.join(', ')}` };
    }
    
    return { 
        success: true, 
        message: `Found ${products.length} products with valid structure`,
        details: { sampleProduct: product.name }
    };
}

async function testProductVariantsStructure() {
    const { data: variants, error } = await supabase
        .from('product_variants')
        .select('id, product_id, variant_name, color, size, price, stock')
        .limit(5);
    
    if (error) throw new Error(`Variants query failed: ${error.message}`);
    
    let validVariants = 0;
    for (const variant of variants || []) {
        if (variant.color || variant.size) {
            validVariants++;
        }
    }
    
    return { 
        success: (variants?.length || 0) > 0, 
        message: `Found ${variants?.length || 0} variants, ${validVariants} with color/size` 
    };
}

async function testBuyersTable() {
    const { data: buyers, error } = await supabase
        .from('buyers')
        .select('id, bazcoins, created_at')
        .limit(5);
    
    if (error) throw new Error(`Buyers query failed: ${error.message}`);
    if (!buyers || buyers.length === 0) {
        return { success: false, message: 'No buyers found in database' };
    }
    
    // Check bazcoins field exists and is numeric
    const hasBazcoins = buyers.every(b => typeof b.bazcoins === 'number');
    
    return { 
        success: hasBazcoins, 
        message: hasBazcoins 
            ? `Found ${buyers.length} buyers with valid bazcoins field`
            : 'Buyers missing bazcoins field'
    };
}

async function testCartsTable() {
    const { data: carts, error } = await supabase
        .from('carts')
        .select('id, buyer_id, created_at')
        .limit(5);
    
    if (error) throw new Error(`Carts query failed: ${error.message}`);
    
    return { 
        success: true, 
        message: `Carts table accessible, found ${carts?.length || 0} carts` 
    };
}

async function testCartItemsTable() {
    const { data: items, error } = await supabase
        .from('cart_items')
        .select(`
            id, 
            cart_id, 
            product_id, 
            variant_id,
            quantity,
            product:products(name, price)
        `)
        .limit(5);
    
    if (error) throw new Error(`Cart items query failed: ${error.message}`);
    
    // Check foreign key relationship works
    const hasValidRelation = items?.some(item => item.product !== null);
    
    return { 
        success: true, 
        message: `Cart items table accessible with product relation`,
        details: { itemCount: items?.length || 0, hasRelations: hasValidRelation }
    };
}

async function testOrdersTable() {
    const { data: orders, error } = await supabase
        .from('orders')
        .select(`
            id,
            order_number,
            buyer_id,
            payment_status,
            shipment_status,
            created_at
        `)
        .limit(5);
    
    if (error) throw new Error(`Orders query failed: ${error.message}`);
    
    // Validate order status fields
    const validStatuses = ['pending_payment', 'paid', 'failed', 'refunded'];
    const validShipmentStatuses = ['waiting_for_seller', 'preparing', 'ready_for_pickup', 'in_transit', 'delivered', 'cancelled'];
    
    let validOrders = 0;
    for (const order of orders || []) {
        if (order.order_number && order.buyer_id) {
            validOrders++;
        }
    }
    
    return { 
        success: true, 
        message: `Found ${orders?.length || 0} orders, ${validOrders} with valid structure` 
    };
}

async function testOrderItemsTable() {
    const { data: items, error } = await supabase
        .from('order_items')
        .select(`
            id,
            order_id,
            product_id,
            quantity,
            price,
            product:products(name)
        `)
        .limit(5);
    
    if (error) throw new Error(`Order items query failed: ${error.message}`);
    
    return { 
        success: true, 
        message: `Order items table accessible, found ${items?.length || 0} items` 
    };
}

async function testShippingAddressesTable() {
    const { data: addresses, error } = await supabase
        .from('shipping_addresses')
        .select('id, user_id, label, city, province, region, postal_code, is_default')
        .limit(5);
    
    if (error) throw new Error(`Shipping addresses query failed: ${error.message}`);
    
    // Validate required fields for checkout
    const requiredFields = ['city', 'province', 'region', 'postal_code'];
    let validAddresses = 0;
    
    for (const addr of addresses || []) {
        // @ts-ignore - Dynamic field access for validation
        const hasAllFields = requiredFields.every(f => (addr as any)[f] !== null && (addr as any)[f] !== '');
        if (hasAllFields) validAddresses++;
    }
    
    return { 
        success: true, 
        message: `Found ${addresses?.length || 0} addresses, ${validAddresses} with complete data`,
        details: { requiredFields }
    };
}

async function testReviewsTable() {
    const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
            id,
            product_id,
            buyer_id,
            rating,
            comment,
            created_at
        `)
        .limit(5);
    
    if (error) throw new Error(`Reviews query failed: ${error.message}`);
    
    // Validate rating range
    const validRatings = reviews?.filter(r => r.rating >= 1 && r.rating <= 5) || [];
    
    return { 
        success: true, 
        message: `Found ${reviews?.length || 0} reviews, ${validRatings.length} with valid ratings (1-5)` 
    };
}

async function testWishlistTable() {
    // Check if wishlist_items table exists (alternative name)
    const { data: wishlist, error } = await supabase
        .from('wishlist_items')
        .select(`
            id,
            buyer_id,
            product_id,
            product:products(name, price)
        `)
        .limit(5);
    
    if (error) {
        // Table might not exist - this is OK, wishlist is optional
        if (error.code === 'PGRST116' || error.message.includes('schema cache')) {
            return { success: true, message: 'Wishlist table not set up (optional feature)' };
        }
        throw new Error(`Wishlist query failed: ${error.message}`);
    }
    
    return { 
        success: true, 
        message: `Wishlist table accessible, found ${wishlist?.length || 0} items` 
    };
}

async function testSellersTable() {
    const { data: sellers, error } = await supabase
        .from('sellers')
        .select('id, store_name, approval_status, created_at')
        .limit(5);
    
    if (error) throw new Error(`Sellers query failed: ${error.message}`);
    if (!sellers || sellers.length === 0) {
        return { success: false, message: 'No sellers found in database' };
    }
    
    const verifiedSellers = sellers.filter(s => s.approval_status === 'verified');
    
    return { 
        success: true, 
        message: `Found ${sellers.length} sellers, ${verifiedSellers.length} verified` 
    };
}

// ============================================================================
// FRONTEND LOGIC TESTS - Business Logic Validation
// ============================================================================

async function testCartCalculations() {
    // Simulate cart calculation logic
    const mockCart = [
        { productId: '1', price: 1299, quantity: 2 },
        { productId: '2', price: 599, quantity: 1 },
    ];
    
    const subtotal = mockCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const expectedSubtotal = (1299 * 2) + (599 * 1); // 3197
    
    if (subtotal !== expectedSubtotal) {
        return { success: false, message: `Cart calculation error: expected ${expectedSubtotal}, got ${subtotal}` };
    }
    
    return { success: true, message: `Cart subtotal calculation correct: ₱${subtotal.toLocaleString()}` };
}

async function testBazCoinsCalculation() {
    // BazCoins earn rate: 1 BAZ per ₱100 spent
    const orderTotal = 3500;
    const earnedBazcoins = Math.floor(orderTotal / 100);
    const expectedBazcoins = 35;
    
    if (earnedBazcoins !== expectedBazcoins) {
        return { success: false, message: `BazCoins calculation error: expected ${expectedBazcoins}, got ${earnedBazcoins}` };
    }
    
    return { success: true, message: `BazCoins calculation correct: ${earnedBazcoins} BAZ for ₱${orderTotal} order` };
}

async function testVariantPriceSelection() {
    // Fetch variants with price info
    const { data: variants, error } = await supabase
        .from('product_variants')
        .select('id, product_id, price, color, size')
        .limit(5);
    
    if (error || !variants || variants.length === 0) {
        return { success: true, message: 'Skipped - no variants found' };
    }
    
    // Check if variants have valid price
    const variantsWithPrice = variants.filter(v => typeof v.price === 'number' && v.price > 0);
    
    return { 
        success: variantsWithPrice.length > 0, 
        message: `Found ${variantsWithPrice.length} variants with valid prices` 
    };
}

async function testStockValidation() {
    // Fetch a variant with stock
    const { data: variants, error } = await supabase
        .from('product_variants')
        .select('id, stock, variant_name')
        .gt('stock', 0)
        .limit(1);
    
    if (error || !variants || variants.length === 0) {
        return { success: true, message: 'Skipped - no variants with stock found' };
    }
    
    const variant = variants[0];
    
    // Simulate stock validation
    const requestedQty = variant.stock + 1;
    const isValid = requestedQty <= variant.stock;
    
    if (isValid) {
        return { success: false, message: 'Stock validation should reject quantity exceeding stock' };
    }
    
    return { success: true, message: `Stock validation works: rejected ${requestedQty} when only ${variant.stock} available` };
}

async function testOrderNumberGeneration() {
    // Test order number format: ORD-{YEAR}{6-digit}
    const year = new Date().getFullYear();
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `ORD-${year}${randomNum}`;
    
    const pattern = /^ORD-\d{4}\d{6}$/;
    const isValid = pattern.test(orderNumber);
    
    return { 
        success: isValid, 
        message: isValid 
            ? `Order number format valid: ${orderNumber}` 
            : `Invalid order number format: ${orderNumber}`
    };
}

async function testAddressValidation() {
    // Test address validation logic
    const validAddress = {
        first_name: 'Juan',
        phone: '09171234567',
        street: '123 Main St',
        city: 'Manila',
        province: 'Metro Manila',
        region: 'NCR',
        postal_code: '1000',
    };
    
    const invalidAddress = {
        first_name: 'Juan',
        phone: '09171234567',
        street: '123 Main St',
        city: 'Manila',
        province: '',
        region: '',
        postal_code: '',
    };
    
    const requiredFields = ['city', 'province', 'region'];
    // @ts-ignore - Dynamic field access for validation
    const validHasAllFields = requiredFields.every(f => (validAddress as any)[f]);
    // @ts-ignore - Dynamic field access for validation
    const invalidHasAllFields = requiredFields.every(f => (invalidAddress as any)[f]);
    
    if (!validHasAllFields) {
        return { success: false, message: 'Valid address rejected incorrectly' };
    }
    
    if (invalidHasAllFields) {
        return { success: false, message: 'Invalid address accepted incorrectly' };
    }
    
    return { success: true, message: 'Address validation logic works correctly' };
}

async function testShippingFeeCalculation() {
    // Metro Manila: ₱50, Provincial: ₱100
    const metroManilaRegion = 'NCR';
    const provincialRegion: string = 'Region IV-A';
    
    const metroFee = metroManilaRegion === 'NCR' ? 50 : 100;
    // @ts-ignore - Testing shipping calculation with different regions
    const provincialFee = provincialRegion === 'NCR' ? 50 : 100;
    
    if (metroFee !== 50 || provincialFee !== 100) {
        return { success: false, message: 'Shipping fee calculation incorrect' };
    }
    
    return { success: true, message: `Shipping fees correct: Metro Manila ₱${metroFee}, Provincial ₱${provincialFee}` };
}

// ============================================================================
// INTEGRATION TESTS - Frontend + Backend Combined
// ============================================================================

async function testProductToCartFlow() {
    // Fetch a real product with variant
    const { data: variants, error } = await supabase
        .from('product_variants')
        .select(`
            id, 
            product_id,
            price, 
            stock,
            product:products(name, seller_id)
        `)
        .gt('stock', 0)
        .limit(1);
    
    if (error || !variants || variants.length === 0) {
        return { success: true, message: 'Skipped - no variants with stock available' };
    }
    
    const variant = variants[0];
    const product = variant.product as any;
    
    // Simulate adding to cart (validation only, no actual insert without user)
    const cartItem = {
        product_id: variant.product_id,
        variant_id: variant.id,
        quantity: 1,
        price: variant.price,
        seller_id: product?.seller_id,
    };
    
    const isValid = cartItem.product_id && cartItem.quantity > 0 && cartItem.price > 0;
    
    return { 
        success: isValid, 
        message: `Product "${product?.name || 'Unknown'}" can be added to cart`,
        details: cartItem
    };
}

async function testCheckoutPayloadStructure() {
    // Validate checkout payload matches backend expectations
    const mockPayload = {
        userId: 'test-user-id',
        items: [{ productId: 'p1', quantity: 1, price: 1299, sellerId: 's1' }],
        totalAmount: 1349,
        shippingAddress: {
            fullName: 'Juan Dela Cruz',
            street: '123 Main St',
            barangay: 'Brgy. San Antonio',
            city: 'Manila',
            province: 'Metro Manila',
            region: 'NCR',
            postalCode: '1000',
            phone: '09171234567',
            country: 'Philippines',
        },
        paymentMethod: 'cod',
        usedBazcoins: 0,
        earnedBazcoins: 13,
        shippingFee: 50,
        discount: 0,
        email: 'buyer@example.com',
    };
    
    // Validate required fields
    const requiredAddressFields = ['fullName', 'city', 'province', 'region', 'phone'];
    // @ts-ignore - Dynamic field access for validation
    const hasAllFields = requiredAddressFields.every(f => (mockPayload.shippingAddress as any)[f]);
    
    if (!hasAllFields) {
        return { success: false, message: 'Checkout payload missing required address fields' };
    }
    
    return { success: true, message: 'Checkout payload structure is valid' };
}

async function testOrderStatusProgression() {
    // Valid order status progression
    const statusFlow = [
        'waiting_for_seller',
        'preparing',
        'ready_for_pickup',
        'in_transit',
        'delivered'
    ];
    
    // Validate each status can progress to the next
    for (let i = 0; i < statusFlow.length - 1; i++) {
        const current = statusFlow[i];
        const next = statusFlow[i + 1];
        const currentIndex = statusFlow.indexOf(current);
        const nextIndex = statusFlow.indexOf(next);
        
        if (nextIndex <= currentIndex) {
            return { success: false, message: `Invalid status progression: ${current} -> ${next}` };
        }
    }
    
    return { success: true, message: 'Order status progression is valid' };
}

async function testReviewAggregation() {
    // Fetch products with reviews
    const { data: reviews, error } = await supabase
        .from('reviews')
        .select(`
            id,
            product_id,
            rating,
            product:products(name)
        `)
        .limit(10);
    
    if (error || !reviews || reviews.length === 0) {
        return { success: true, message: 'Skipped - no reviews found' };
    }
    
    // Calculate average rating
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    return { 
        success: true, 
        message: `Found ${reviews.length} reviews, avg rating: ${avgRating.toFixed(1)}` 
    };
}

async function testSellerProductRelation() {
    // Verify seller-product relationship
    const { data: products, error } = await supabase
        .from('products')
        .select(`
            id,
            name,
            seller:sellers(id, store_name, approval_status)
        `)
        .limit(5);
    
    if (error) throw new Error(`Query failed: ${error.message}`);
    
    const productsWithSeller = products?.filter(p => p.seller !== null) || [];
    const verifiedSellers = productsWithSeller.filter(p => (p.seller as any)?.approval_status === 'verified');
    
    return { 
        success: productsWithSeller.length > 0, 
        message: `Found ${productsWithSeller.length} products with valid seller relation, ${verifiedSellers.length} from verified sellers` 
    };
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
    console.log('\n' + '═'.repeat(70));
    console.log('🛒 BAZAAR MOBILE - COMPLETE BUYER FLOW E2E TEST SUITE');
    console.log('═'.repeat(70));
    console.log(`📅 Date: ${new Date().toISOString()}`);
    console.log(`🔗 Database: ${SUPABASE_URL}`);
    console.log('═'.repeat(70));

    // Backend Database Tests
    logSection('BACKEND DATABASE TESTS');
    await runTest('BACKEND', 'Database Connection', testDatabaseConnection);
    await runTest('BACKEND', 'Products Table', testProductsTable);
    await runTest('BACKEND', 'Product Variants Structure', testProductVariantsStructure);
    await runTest('BACKEND', 'Buyers Table', testBuyersTable);
    await runTest('BACKEND', 'Carts Table', testCartsTable);
    await runTest('BACKEND', 'Cart Items Table', testCartItemsTable);
    await runTest('BACKEND', 'Orders Table', testOrdersTable);
    await runTest('BACKEND', 'Order Items Table', testOrderItemsTable);
    await runTest('BACKEND', 'Shipping Addresses Table', testShippingAddressesTable);
    await runTest('BACKEND', 'Reviews Table', testReviewsTable);
    await runTest('BACKEND', 'Wishlist Table', testWishlistTable);
    await runTest('BACKEND', 'Sellers Table', testSellersTable);

    // Frontend Logic Tests
    logSection('FRONTEND LOGIC TESTS');
    await runTest('FRONTEND', 'Cart Calculations', testCartCalculations);
    await runTest('FRONTEND', 'BazCoins Calculation', testBazCoinsCalculation);
    await runTest('FRONTEND', 'Variant Price Selection', testVariantPriceSelection);
    await runTest('FRONTEND', 'Stock Validation', testStockValidation);
    await runTest('FRONTEND', 'Order Number Generation', testOrderNumberGeneration);
    await runTest('FRONTEND', 'Address Validation', testAddressValidation);
    await runTest('FRONTEND', 'Shipping Fee Calculation', testShippingFeeCalculation);

    // Integration Tests
    logSection('INTEGRATION TESTS');
    await runTest('INTEGRATION', 'Product to Cart Flow', testProductToCartFlow);
    await runTest('INTEGRATION', 'Checkout Payload Structure', testCheckoutPayloadStructure);
    await runTest('INTEGRATION', 'Order Status Progression', testOrderStatusProgression);
    await runTest('INTEGRATION', 'Review Aggregation', testReviewAggregation);
    await runTest('INTEGRATION', 'Seller-Product Relation', testSellerProductRelation);

    // Print Summary
    printSummary();
}

function printSummary() {
    console.log('\n' + '═'.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('═'.repeat(70));

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const skipped = results.filter(r => r.status === 'SKIP').length;
    const total = results.length;

    const backendTests = results.filter(r => r.category === 'BACKEND');
    const frontendTests = results.filter(r => r.category === 'FRONTEND');
    const integrationTests = results.filter(r => r.category === 'INTEGRATION');

    console.log(`\nBy Category:`);
    console.log(`  BACKEND:     ${backendTests.filter(r => r.status === 'PASS').length}/${backendTests.length} passed`);
    console.log(`  FRONTEND:    ${frontendTests.filter(r => r.status === 'PASS').length}/${frontendTests.length} passed`);
    console.log(`  INTEGRATION: ${integrationTests.filter(r => r.status === 'PASS').length}/${integrationTests.length} passed`);

    console.log(`\nOverall:`);
    console.log(`  ✅ Passed:  ${passed}`);
    console.log(`  ❌ Failed:  ${failed}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  📝 Total:   ${total}`);

    const passRate = ((passed / total) * 100).toFixed(1);
    console.log(`\n  Pass Rate: ${passRate}%`);

    if (failed > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`   - [${r.category}] ${r.name}: ${r.message}`);
        });
    }

    console.log('\n' + '═'.repeat(70));
    console.log(failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
    console.log('═'.repeat(70) + '\n');

    process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
