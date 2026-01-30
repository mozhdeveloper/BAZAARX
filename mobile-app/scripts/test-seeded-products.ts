import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function logTest(name: string, passed: boolean, details?: string) {
  results.push({ name, passed, details });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) {
    console.log(`   → ${details}`);
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('TESTING SEEDED PRODUCTS');
  console.log('============================================================\n');

  // Test 1: Check products exist
  console.log('📦 Testing Product Existence...\n');
  
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('approval_status', 'approved');

  if (productsError) {
    logTest('Fetch approved products', false, productsError.message);
    return;
  }

  logTest('Fetch approved products', true, `Found ${products.length} approved products`);
  logTest('Minimum products exist (≥10)', products.length >= 10, `Count: ${products.length}`);

  // Test 2: Check specific seeded products exist
  console.log('\n📱 Testing Specific Products...\n');
  
  const expectedProducts = [
    'Wireless Bluetooth Earbuds Pro',
    'Smart Watch Series X',
    'Premium Cotton Polo Shirt',
    'Slim Fit Denim Jeans',
    'Floral Summer Dress',
    'Performance Running Shoes',
    'Yoga Mat Premium',
    'Hydrating Face Serum',
  ];

  for (const productName of expectedProducts) {
    const found = products.find(p => p.name === productName);
    logTest(`Product exists: ${productName}`, !!found);
  }

  // Test 3: Check products have real image URLs
  console.log('\n🖼️ Testing Image URLs...\n');
  
  const productsWithImages = products.filter(p => 
    p.primary_image && 
    (p.primary_image.startsWith('https://images.unsplash.com') || 
     p.primary_image.startsWith('https://'))
  );
  
  logTest('Products have real image URLs', productsWithImages.length > 0, 
    `${productsWithImages.length}/${products.length} have valid image URLs`);

  const productsWithImageArrays = products.filter(p => 
    p.images && Array.isArray(p.images) && p.images.length > 0
  );
  
  logTest('Products have image arrays', productsWithImageArrays.length > 0,
    `${productsWithImageArrays.length}/${products.length} have image arrays`);

  // Test 4: Check products have variants
  console.log('\n🎨 Testing Variants (Colors & Sizes)...\n');
  
  const productsWithColors = products.filter(p => 
    p.colors && Array.isArray(p.colors) && p.colors.length > 0
  );
  
  logTest('Products have color variants', productsWithColors.length > 0,
    `${productsWithColors.length}/${products.length} have colors`);

  const productsWithSizes = products.filter(p => 
    p.sizes && Array.isArray(p.sizes) && p.sizes.length > 0
  );
  
  logTest('Products have size variants', productsWithSizes.length > 0,
    `${productsWithSizes.length}/${products.length} have sizes`);

  // Test 5: Verify specific variant data
  console.log('\n🔍 Testing Variant Data Quality...\n');
  
  const poloShirt = products.find(p => p.name === 'Premium Cotton Polo Shirt');
  if (poloShirt) {
    const hasCorrectColors = poloShirt.colors?.includes('Navy Blue') && poloShirt.colors?.includes('White');
    logTest('Polo shirt has expected colors', hasCorrectColors, 
      `Colors: ${poloShirt.colors?.join(', ')}`);
    
    const hasCorrectSizes = poloShirt.sizes?.includes('M') && poloShirt.sizes?.includes('L');
    logTest('Polo shirt has expected sizes', hasCorrectSizes,
      `Sizes: ${poloShirt.sizes?.join(', ')}`);
  }

  const jeans = products.find(p => p.name === 'Slim Fit Denim Jeans');
  if (jeans) {
    const hasNumericSizes = jeans.sizes?.some((s: string) => !isNaN(parseInt(s)));
    logTest('Jeans have numeric sizes', hasNumericSizes,
      `Sizes: ${jeans.sizes?.join(', ')}`);
  }

  // Test 6: Check seller verification
  console.log('\n👤 Testing Seller Verification...\n');
  
  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, store_name, is_verified')
    .eq('is_verified', true);

  if (sellersError) {
    logTest('Fetch verified sellers', false, sellersError.message);
  } else {
    logTest('Verified sellers exist', sellers.length > 0, 
      `Found ${sellers.length} verified seller(s)`);
    
    if (sellers.length > 0) {
      logTest('Verified seller has store name', !!sellers[0].store_name,
        `Store: ${sellers[0].store_name}`);
    }
  }

  // Test 7: Check product pricing
  console.log('\n💰 Testing Product Pricing...\n');
  
  const productsWithValidPricing = products.filter(p => 
    p.price && p.price > 0 && typeof p.price === 'number'
  );
  
  logTest('Products have valid prices', productsWithValidPricing.length === products.length,
    `${productsWithValidPricing.length}/${products.length} have valid prices`);

  const productsWithOriginalPrice = products.filter(p => 
    p.original_price && p.original_price > p.price
  );
  
  logTest('Products have discount prices', productsWithOriginalPrice.length > 0,
    `${productsWithOriginalPrice.length}/${products.length} have original prices > current price`);

  // Test 8: Check product categories
  console.log('\n📂 Testing Product Categories...\n');
  
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  logTest('Products have categories', categories.length > 0,
    `Categories: ${categories.join(', ')}`);
  
  const expectedCategories = ['Electronics', 'Fashion', 'Home & Living', 'Sports & Fitness'];
  const hasExpectedCategories = expectedCategories.some(cat => categories.includes(cat));
  logTest('Expected categories exist', hasExpectedCategories,
    `Looking for: ${expectedCategories.join(', ')}`);

  // Test 9: Check product ratings
  console.log('\n⭐ Testing Product Ratings...\n');
  
  const productsWithRatings = products.filter(p => 
    p.rating && p.rating >= 1 && p.rating <= 5
  );
  
  logTest('Products have valid ratings (1-5)', productsWithRatings.length > 0,
    `${productsWithRatings.length}/${products.length} have ratings`);

  // Test 10: Check stock quantity
  console.log('\n📊 Testing Stock Levels...\n');
  
  const productsInStock = products.filter(p => p.stock > 0);
  logTest('Products are in stock', productsInStock.length > 0,
    `${productsInStock.length}/${products.length} in stock`);

  // Test 11: Verify image URLs are accessible (sample test)
  console.log('\n🌐 Testing Image URL Accessibility...\n');
  
  const sampleProduct = products.find(p => p.primary_image?.includes('unsplash'));
  if (sampleProduct) {
    try {
      const response = await fetch(sampleProduct.primary_image, { method: 'HEAD' });
      logTest('Sample image URL is accessible', response.ok,
        `Status: ${response.status} for ${sampleProduct.name}`);
    } catch (err) {
      logTest('Sample image URL is accessible', false, 'Network error');
    }
  }

  // Test 12: Check product descriptions
  console.log('\n📝 Testing Product Descriptions...\n');
  
  const productsWithDescriptions = products.filter(p => 
    p.description && p.description.length > 20
  );
  
  logTest('Products have meaningful descriptions', productsWithDescriptions.length > 0,
    `${productsWithDescriptions.length}/${products.length} have descriptions > 20 chars`);

  // Summary
  console.log('\n============================================================');
  console.log('TEST SUMMARY');
  console.log('============================================================');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${failed}/${total}`);
  console.log(`📊 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}${r.details ? `: ${r.details}` : ''}`);
    });
  }
  
  console.log('\n============================================================');
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
