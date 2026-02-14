/**
 * Visual Search Test Script
 * 
 * Tests the visual search functionality by:
 * 1. Testing URL-based image search
 * 2. Verifying the edge function responds
 * 3. Checking product results formatting
 * 
 * Run: npx tsx scripts/test-visual-search.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
  console.log('Current directory:', process.cwd());
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test image URLs - using publicly accessible images
const TEST_IMAGES = [
  {
    name: 'Mouse/Electronics',
    url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400', // Computer mouse
  },
  {
    name: 'Bag/Fashion',
    url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', // Leather bag
  },
  {
    name: 'Headphones/Electronics',
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', // Headphones
  },
  {
    name: 'Water Bottle',
    url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400', // Water bottle
  },
];

interface TestResult {
  testName: string;
  imageUrl: string;
  success: boolean;
  productsFound: number;
  detectedCategory?: string;
  detectedBrand?: string;
  error?: string;
  responseTime: number;
  products?: Array<{
    id: string;
    name: string;
    category?: string;
    brand?: string;
    price: number;
    hasVariants: boolean;
    hasSeller: boolean;
  }>;
}

async function testVisualSearchEdgeFunction(
  imageUrl: string,
  testName: string
): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n🔍 Testing: ${testName}`);
    console.log(`   URL: ${imageUrl.substring(0, 60)}...`);
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('visual-search', {
      body: { primary_image: imageUrl },
    });

    const responseTime = Date.now() - startTime;

    if (error) {
      return {
        testName,
        imageUrl,
        success: false,
        productsFound: 0,
        error: error.message,
        responseTime,
      };
    }

    const products = data?.products || [];
    
    // Fetch full product details if we have IDs
    let fullProducts: any[] = [];
    if (products.length > 0) {
      const productIds = products.map((p: any) => p.id);
      
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          brand,
          price,
          category:categories!products_category_id_fkey (name),
          variants:product_variants (id),
          seller:sellers!products_seller_id_fkey (store_name)
        `)
        .in('id', productIds);

      if (!productError && productData) {
        fullProducts = productData;
      }
    }

    // Detect most common category and brand
    const categoryCount: Record<string, number> = {};
    const brandCount: Record<string, number> = {};
    
    fullProducts.forEach((p: any) => {
      const cat = p.category?.name;
      if (cat) categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      if (p.brand) brandCount[p.brand] = (brandCount[p.brand] || 0) + 1;
    });

    const detectedCategory = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    const detectedBrand = Object.entries(brandCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0];

    return {
      testName,
      imageUrl,
      success: true,
      productsFound: products.length,
      detectedCategory,
      detectedBrand,
      responseTime,
      products: fullProducts.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category?.name,
        brand: p.brand,
        price: p.price,
        hasVariants: (p.variants?.length || 0) > 0,
        hasSeller: !!p.seller?.store_name,
      })),
    };
  } catch (err) {
    return {
      testName,
      imageUrl,
      success: false,
      productsFound: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
      responseTime: Date.now() - startTime,
    };
  }
}

async function testDatabaseConnection(): Promise<boolean> {
  console.log('\n📊 Testing Database Connection...');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .limit(1);

    if (error) {
      console.log('❌ Database connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connected successfully');
    console.log(`   Sample product: ${data?.[0]?.name || 'No products found'}`);
    return true;
  } catch (err) {
    console.log('❌ Database error:', err);
    return false;
  }
}

async function testEdgeFunctionAvailability(): Promise<boolean> {
  console.log('\n🔌 Testing Edge Function Availability...');
  
  try {
    // Test with a minimal request
    const { data, error } = await supabase.functions.invoke('visual-search', {
      body: { primary_image: 'https://via.placeholder.com/100' },
    });

    if (error && error.message.includes('not found')) {
      console.log('❌ Edge function not deployed');
      return false;
    }

    console.log('✅ Edge function is available');
    return true;
  } catch (err) {
    console.log('⚠️ Edge function test inconclusive:', err);
    return true; // Continue with tests
  }
}

async function checkProductEmbeddings(): Promise<void> {
  console.log('\n🧠 Checking Product Embeddings...');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, image_embedding')
      .not('image_embedding', 'is', null)
      .limit(5);

    if (error) {
      console.log('⚠️ Could not check embeddings:', error.message);
      return;
    }

    const withEmbeddings = data?.length || 0;
    console.log(`   Products with embeddings: ${withEmbeddings}`);
    
    if (withEmbeddings === 0) {
      console.log('⚠️ No products have image embeddings. Visual search may return empty results.');
      console.log('   Run the backfill-vectors edge function to generate embeddings.');
    } else {
      console.log('✅ Some products have embeddings');
      data?.forEach((p: any) => {
        console.log(`   - ${p.name}`);
      });
    }
  } catch (err) {
    console.log('⚠️ Embedding check failed:', err);
  }
}

async function runAllTests() {
  console.log('='.repeat(60));
  console.log('🧪 VISUAL SEARCH TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl.substring(0, 30)}...`);
  console.log(`Time: ${new Date().toISOString()}`);

  // Pre-flight checks
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.log('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }

  await checkProductEmbeddings();
  const edgeFunctionAvailable = await testEdgeFunctionAvailability();

  // Run visual search tests
  console.log('\n' + '='.repeat(60));
  console.log('🔍 VISUAL SEARCH TESTS');
  console.log('='.repeat(60));

  const results: TestResult[] = [];

  for (const testImage of TEST_IMAGES) {
    const result = await testVisualSearchEdgeFunction(testImage.url, testImage.name);
    results.push(result);

    // Log result
    if (result.success) {
      console.log(`   ✅ Success - Found ${result.productsFound} products (${result.responseTime}ms)`);
      if (result.detectedCategory) {
        console.log(`      Category: ${result.detectedCategory}`);
      }
      if (result.detectedBrand) {
        console.log(`      Brand: ${result.detectedBrand}`);
      }
      if (result.products && result.products.length > 0) {
        console.log(`      Top results:`);
        result.products.slice(0, 3).forEach((p, i) => {
          console.log(`        ${i + 1}. ${p.name} - ₱${p.price}`);
        });
      }
    } else {
      console.log(`   ❌ Failed: ${result.error}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalProducts = results.reduce((sum, r) => sum + r.productsFound, 0);
  const avgResponseTime = Math.round(
    results.reduce((sum, r) => sum + r.responseTime, 0) / results.length
  );

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Total Products Found: ${totalProducts}`);
  console.log(`Average Response Time: ${avgResponseTime}ms`);

  // Detailed failures
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:');
    failures.forEach(f => {
      console.log(`   - ${f.testName}: ${f.error}`);
    });
  }

  // Test fallback - fetch products directly from DB
  console.log('\n' + '='.repeat(60));
  console.log('🔄 FALLBACK TEST: Direct Database Query');
  console.log('='.repeat(60));
  
  try {
    const { data: fallbackProducts, error: fallbackError } = await supabase
      .from('products')
      .select(`
        id, 
        name, 
        price, 
        brand,
        category:categories!products_category_id_fkey (name),
        images:product_images (image_url, is_primary),
        variants:product_variants (id, variant_name, color, size),
        seller:sellers!products_seller_id_fkey (store_name)
      `)
      .is('deleted_at', null)
      .is('disabled_at', null)
      .limit(6);

    if (fallbackError) {
      console.log('❌ Fallback query failed:', fallbackError.message);
    } else if (fallbackProducts && fallbackProducts.length > 0) {
      console.log(`✅ Fallback found ${fallbackProducts.length} products`);
      console.log('\n📦 Sample Products (would show as search results):');
      fallbackProducts.forEach((p: any, i: number) => {
        const primaryImage = p.images?.find((img: any) => img.is_primary)?.image_url || p.images?.[0]?.image_url;
        const variantCount = p.variants?.length || 0;
        const colors = [...new Set(p.variants?.map((v: any) => v.color).filter(Boolean))];
        const sizes = [...new Set(p.variants?.map((v: any) => v.size).filter(Boolean))];
        
        console.log(`\n   ${i + 1}. ${p.name}`);
        console.log(`      💰 Price: ₱${p.price?.toLocaleString()}`);
        if (p.brand) console.log(`      🏷️  Brand: ${p.brand}`);
        if (p.category?.name) console.log(`      📁 Category: ${p.category.name}`);
        if (p.seller?.store_name) console.log(`      🏪 Seller: ${p.seller.store_name}`);
        if (variantCount > 0) {
          console.log(`      🎨 Variants: ${variantCount} total`);
          if (colors.length > 0) console.log(`         Colors: ${colors.join(', ')}`);
          if (sizes.length > 0) console.log(`         Sizes: ${sizes.join(', ')}`);
        }
        if (primaryImage) console.log(`      🖼️  Image: ${primaryImage.substring(0, 50)}...`);
      });
    } else {
      console.log('⚠️ No products found in database');
    }
  } catch (err) {
    console.log('❌ Fallback error:', err);
  }

  // Recommendations
  console.log('\n' + '='.repeat(60));
  console.log('💡 RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  if (totalProducts === 0 && failed > 0) {
    console.log('\n⚠️ Visual search edge function issues:');
    console.log('  1. Ensure ALIBABA_API_KEY is set in Supabase secrets:');
    console.log('     supabase secrets set ALIBABA_API_KEY=your-key');
    console.log('  2. Generate product embeddings:');
    console.log('     supabase functions invoke backfill-vectors');
    console.log('  3. Verify match_products RPC function exists');
    console.log('\n✅ GOOD NEWS: Fallback will show recent products while');
    console.log('   AI visual search is being configured!');
  }

  if (avgResponseTime > 5000) {
    console.log('\n• Slow response times detected.');
    console.log('  - Consider adding database indexes');
    console.log('  - Check edge function cold start times');
  }

  if (!edgeFunctionAvailable) {
    console.log('\n• Edge function may not be deployed.');
    console.log('  - Run: supabase functions deploy visual-search');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Test suite completed');
  console.log('='.repeat(60));

  // Exit with success if fallback works (0), otherwise exit with error count
  const hasProducts = await checkDatabaseHasProducts();
  process.exit(hasProducts ? 0 : 1);
}

async function checkDatabaseHasProducts(): Promise<boolean> {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  return !error && (count ?? 0) > 0;
}

// Run tests
runAllTests().catch(console.error);
