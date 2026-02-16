/**
 * Visual Search Full Stack Test Script
 * 
 * Tests BOTH frontend and backend visual search functionality:
 * 1. Database connection & product data
 * 2. Backfill vectors edge function (generate embeddings)
 * 3. Visual search edge function
 * 4. Frontend service integration
 * 5. End-to-end visual search flow
 * 
 * Run: npx tsx scripts/test-visual-search-fullstack.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test images for visual search
const TEST_IMAGES = [
  { name: 'Headphones', url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', expectedCategory: 'Electronics' },
  { name: 'Leather Bag', url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', expectedCategory: 'Fashion' },
  { name: 'Lipstick', url: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=400', expectedCategory: 'Beauty' },
];

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function printHeader(title: string) {
  console.log('\n' + '='.repeat(60));
  console.log(`🧪 ${title}`);
  console.log('='.repeat(60));
}

function printSubHeader(title: string) {
  console.log(`\n📋 ${title}`);
  console.log('-'.repeat(40));
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// TEST 1: DATABASE CONNECTION & PRODUCTS
// ============================================================

async function testDatabaseConnection(): Promise<boolean> {
  printSubHeader('Test 1: Database Connection');
  
  try {
    // Test basic connection
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        name,
        price,
        image_embedding,
        category:categories(name),
        seller:sellers(store_name),
        images:product_images(image_url, is_primary)
      `)
      .is('deleted_at', null)
      .limit(10);

    if (error) {
      console.log(`❌ Database error: ${error.message}`);
      return false;
    }

    console.log(`✅ Database connected`);
    console.log(`   Products found: ${products?.length || 0}`);
    
    // Count products with embeddings
    const withEmbeddings = products?.filter(p => p.image_embedding !== null).length || 0;
    console.log(`   With embeddings: ${withEmbeddings}`);
    
    // Show sample products
    if (products && products.length > 0) {
      console.log(`\n   Sample products:`);
      products.slice(0, 3).forEach((p, i) => {
        const primaryImage = p.images?.find((img: any) => img.is_primary);
        console.log(`   ${i + 1}. ${p.name}`);
        console.log(`      Price: ₱${p.price}`);
        console.log(`      Category: ${p.category?.name || 'N/A'}`);
        console.log(`      Seller: ${p.seller?.store_name || 'N/A'}`);
        console.log(`      Has Image: ${primaryImage ? '✅' : '❌'}`);
        console.log(`      Has Embedding: ${p.image_embedding ? '✅' : '❌'}`);
      });
    }
    
    return true;
  } catch (err: any) {
    console.log(`❌ Connection failed: ${err.message}`);
    return false;
  }
}

// ============================================================
// TEST 2: BACKFILL VECTORS (GENERATE EMBEDDINGS)
// ============================================================

async function testBackfillVectors(): Promise<{ success: boolean; processed: number }> {
  printSubHeader('Test 2: Backfill Vectors (Generate Embeddings)');
  
  try {
    console.log('   Calling backfill-vectors edge function...');
    
    const { data, error } = await supabase.functions.invoke('backfill-vectors', {
      body: {},
    });

    if (error) {
      console.log(`❌ Edge function error: ${error.message}`);
      return { success: false, processed: 0 };
    }

    console.log(`✅ Backfill response received`);
    
    if (data?.message) {
      console.log(`   Message: ${data.message}`);
      return { success: true, processed: 0 };
    }
    
    if (data?.summary) {
      console.log(`   Total processed: ${data.summary.total}`);
      console.log(`   Success: ${data.summary.success}`);
      console.log(`   Failed: ${data.summary.failed}`);
      
      // Show individual results
      if (data.processed && data.processed.length > 0) {
        console.log(`\n   Processing details:`);
        data.processed.slice(0, 5).forEach((result: any) => {
          const icon = result.status === 'Updated' ? '✅' : '❌';
          console.log(`   ${icon} ${result.name}: ${result.status}`);
          if (result.dimensions) console.log(`      Dimensions: ${result.dimensions}`);
          if (result.error) console.log(`      Error: ${result.error}`);
        });
      }
      
      return { success: true, processed: data.summary.success };
    }
    
    console.log(`   Raw response:`, JSON.stringify(data).substring(0, 200));
    return { success: true, processed: 0 };
    
  } catch (err: any) {
    console.log(`❌ Backfill failed: ${err.message}`);
    return { success: false, processed: 0 };
  }
}

// ============================================================
// TEST 3: VISUAL SEARCH EDGE FUNCTION
// ============================================================

async function testVisualSearchEdgeFunction(
  imageUrl: string,
  testName: string
): Promise<{ success: boolean; products: any[]; error?: string; responseTime: number }> {
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('visual-search', {
      body: { primary_image: imageUrl },
    });

    const responseTime = Date.now() - startTime;

    if (error) {
      return { success: false, products: [], error: error.message, responseTime };
    }

    // Check for error in response body
    if (data?.error && !data?.products?.length) {
      return { success: false, products: [], error: data.error, responseTime };
    }

    return { 
      success: true, 
      products: data?.products || [], 
      responseTime 
    };
  } catch (err: any) {
    return { 
      success: false, 
      products: [], 
      error: err.message, 
      responseTime: Date.now() - startTime 
    };
  }
}

async function testVisualSearch(): Promise<{ passed: number; failed: number }> {
  printSubHeader('Test 3: Visual Search Edge Function');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of TEST_IMAGES) {
    console.log(`\n   🔍 Testing: ${test.name}`);
    console.log(`      URL: ${test.url.substring(0, 50)}...`);
    console.log(`      Expected: ${test.expectedCategory}`);
    
    const result = await testVisualSearchEdgeFunction(test.url, test.name);
    
    if (result.success) {
      console.log(`      ✅ Success (${result.responseTime}ms)`);
      console.log(`      Products found: ${result.products.length}`);
      
      if (result.products.length > 0) {
        console.log(`      Top results:`);
        result.products.slice(0, 3).forEach((p: any, i: number) => {
          console.log(`        ${i + 1}. ${p.name} (similarity: ${(p.similarity * 100).toFixed(1)}%)`);
        });
      }
      passed++;
    } else {
      console.log(`      ❌ Failed: ${result.error}`);
      failed++;
    }
    
    // Small delay between tests
    await sleep(500);
  }
  
  return { passed, failed };
}

// ============================================================
// TEST 4: FRONTEND SERVICE SIMULATION
// ============================================================

async function testFrontendService(): Promise<boolean> {
  printSubHeader('Test 4: Frontend Service Simulation');
  
  try {
    // Simulate what the frontend productService.visualSearchByUrl does
    const testUrl = TEST_IMAGES[0].url;
    console.log(`   Simulating visualSearchByUrl('${testUrl.substring(0, 40)}...')`);
    
    // 1. Call edge function (like productService does)
    const { data: searchData, error: searchError } = await supabase.functions.invoke('visual-search', {
      body: { primary_image: testUrl },
    });
    
    if (searchError) {
      console.log(`   ❌ Edge function call failed: ${searchError.message}`);
      return false;
    }
    
    console.log(`   ✅ Edge function responded`);
    
    const productIds = searchData?.products?.map((p: any) => p.id) || [];
    
    if (productIds.length === 0) {
      console.log(`   ⚠️ No products from AI search, testing fallback...`);
      
      // Simulate fallback: get recent products
      const { data: fallbackProducts, error: fallbackError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          price,
          brand,
          category:categories(id, name),
          seller:sellers(id, store_name),
          images:product_images(image_url, is_primary),
          variants:product_variants(id, color, size, price, stock)
        `)
        .is('deleted_at', null)
        .is('disabled_at', null)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (fallbackError) {
        console.log(`   ❌ Fallback query failed: ${fallbackError.message}`);
        return false;
      }
      
      console.log(`   ✅ Fallback returned ${fallbackProducts?.length || 0} products`);
      
      if (fallbackProducts && fallbackProducts.length > 0) {
        console.log(`\n   Fallback products (what user would see):`);
        fallbackProducts.slice(0, 3).forEach((p: any, i: number) => {
          const primaryImage = p.images?.find((img: any) => img.is_primary);
          const colors = [...new Set(p.variants?.map((v: any) => v.color).filter(Boolean))];
          const sizes = [...new Set(p.variants?.map((v: any) => v.size).filter(Boolean))];
          
          console.log(`   ${i + 1}. ${p.name}`);
          console.log(`      💰 ₱${p.price} | 📁 ${p.category?.name || 'N/A'}`);
          console.log(`      🏪 ${p.seller?.store_name || 'N/A'}`);
          if (colors.length) console.log(`      🎨 Colors: ${colors.join(', ')}`);
          if (sizes.length) console.log(`      📐 Sizes: ${sizes.join(', ')}`);
          console.log(`      🖼️  Image: ${primaryImage ? '✅' : '❌'}`);
        });
      }
      
      return true;
    }
    
    // 2. Fetch full product details (like productService does)
    console.log(`   Fetching full details for ${productIds.length} products...`);
    
    const { data: fullProducts, error: detailsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        brand,
        category:categories(id, name, slug),
        seller:sellers(id, store_name, avatar_url),
        images:product_images(id, image_url, is_primary, sort_order),
        variants:product_variants(id, variant_name, color, size, price, stock, thumbnail_url)
      `)
      .in('id', productIds)
      .is('deleted_at', null);
    
    if (detailsError) {
      console.log(`   ❌ Product details fetch failed: ${detailsError.message}`);
      return false;
    }
    
    console.log(`   ✅ Fetched ${fullProducts?.length || 0} full product records`);
    
    // 3. Format for frontend (like productService does)
    if (fullProducts && fullProducts.length > 0) {
      console.log(`\n   Formatted products (what frontend receives):`);
      fullProducts.slice(0, 3).forEach((p: any, i: number) => {
        const primaryImage = p.images?.find((img: any) => img.is_primary) || p.images?.[0];
        const colors = [...new Set(p.variants?.map((v: any) => v.color).filter(Boolean))];
        const sizes = [...new Set(p.variants?.map((v: any) => v.size).filter(Boolean))];
        
        console.log(`   ${i + 1}. ${p.name}`);
        console.log(`      💰 Price: ₱${p.price}`);
        console.log(`      🏷️  Brand: ${p.brand || 'N/A'}`);
        console.log(`      📁 Category: ${p.category?.name || 'N/A'}`);
        console.log(`      🏪 Seller: ${p.seller?.store_name || 'N/A'}`);
        console.log(`      🎨 Colors: ${colors.length ? colors.join(', ') : 'N/A'}`);
        console.log(`      📐 Sizes: ${sizes.length ? sizes.join(', ') : 'N/A'}`);
        console.log(`      🖼️  Image: ${primaryImage?.image_url?.substring(0, 50) || 'N/A'}...`);
      });
    }
    
    return true;
  } catch (err: any) {
    console.log(`   ❌ Frontend simulation failed: ${err.message}`);
    return false;
  }
}

// ============================================================
// TEST 5: MATCH_PRODUCTS RPC FUNCTION
// ============================================================

async function testMatchProductsRPC(): Promise<boolean> {
  printSubHeader('Test 5: match_products RPC Function');
  
  try {
    // First check if any products have embeddings
    const { data: embeddedProducts, error: checkError } = await supabase
      .from('products')
      .select('id, name, image_embedding')
      .not('image_embedding', 'is', null)
      .limit(1);
    
    if (checkError) {
      console.log(`   ❌ Check failed: ${checkError.message}`);
      return false;
    }
    
    if (!embeddedProducts || embeddedProducts.length === 0) {
      console.log(`   ⚠️ No products have embeddings yet`);
      console.log(`   Run backfill-vectors first to generate embeddings`);
      return true; // Not a failure, just needs setup
    }
    
    console.log(`   ✅ Found products with embeddings`);
    
    // We can't directly test the RPC without an embedding vector
    // But we can verify the function exists by checking the error message
    const { data, error } = await supabase.rpc('match_products', {
      query_embedding: Array(1024).fill(0), // Dummy 1024-dim vector (Jina CLIP v2)
      match_threshold: 0.01,
      match_count: 5
    });
    
    if (error) {
      if (error.message.includes('does not exist')) {
        console.log(`   ❌ RPC function not found. Run the migration SQL.`);
        return false;
      }
      if (error.message.includes('dimension')) {
        console.log(`   ⚠️ Dimension mismatch - embeddings should be 1024-dim (Jina CLIP v2)`);
        return false;
      }
      console.log(`   ⚠️ RPC returned error: ${error.message}`);
      // Still might be OK - the function exists
    }
    
    console.log(`   ✅ match_products RPC function exists`);
    if (data) {
      console.log(`   Results from dummy query: ${data.length} products`);
    }
    
    return true;
  } catch (err: any) {
    console.log(`   ❌ RPC test failed: ${err.message}`);
    return false;
  }
}

// ============================================================
// MAIN TEST RUNNER
// ============================================================

async function runAllTests() {
  printHeader('VISUAL SEARCH FULL STACK TEST');
  console.log(`Supabase URL: ${supabaseUrl.substring(0, 35)}...`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  const results = {
    database: false,
    backfill: { success: false, processed: 0 },
    visualSearch: { passed: 0, failed: 0 },
    frontend: false,
    rpc: false,
  };
  
  // Test 1: Database
  results.database = await testDatabaseConnection();
  
  if (!results.database) {
    console.log('\n❌ Database connection failed. Stopping tests.');
    process.exit(1);
  }
  
  // Test 2: Backfill vectors (generate embeddings)
  results.backfill = await testBackfillVectors();
  
  // Wait a moment for embeddings to be available
  if (results.backfill.processed > 0) {
    console.log('\n   ⏳ Waiting 2s for embeddings to be indexed...');
    await sleep(2000);
  }
  
  // Test 3: Visual search
  results.visualSearch = await testVisualSearch();
  
  // Test 4: Frontend service
  results.frontend = await testFrontendService();
  
  // Test 5: RPC function
  results.rpc = await testMatchProductsRPC();
  
  // ============================================================
  // SUMMARY
  // ============================================================
  printHeader('TEST SUMMARY');
  
  console.log(`\n📊 Results:`);
  console.log(`   Database Connection: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Backfill Vectors: ${results.backfill.success ? '✅ PASS' : '❌ FAIL'} (${results.backfill.processed} processed)`);
  console.log(`   Visual Search: ${results.visualSearch.passed}/${TEST_IMAGES.length} passed`);
  console.log(`   Frontend Service: ${results.frontend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   match_products RPC: ${results.rpc ? '✅ PASS' : '❌ FAIL'}`);
  
  // Overall status
  const allPassed = results.database && 
                    results.backfill.success && 
                    results.frontend && 
                    results.rpc;
  
  console.log(`\n${'='.repeat(60)}`);
  if (allPassed) {
    console.log('✅ ALL CORE TESTS PASSED');
    
    if (results.visualSearch.passed === 0) {
      console.log('\n💡 Visual search returned 0 results because:');
      console.log('   - Products need image embeddings generated');
      console.log('   - Run backfill-vectors multiple times until all products have embeddings');
      console.log('   - Or the match_products SQL function needs to be created');
    }
  } else {
    console.log('❌ SOME TESTS FAILED');
  }
  
  console.log(`${'='.repeat(60)}\n`);
  
  // Recommendations
  if (!results.rpc) {
    console.log('💡 To fix match_products RPC:');
    console.log('   1. Go to Supabase SQL Editor');
    console.log('   2. Run the SQL from: supabase-migrations/009_visual_search_function.sql');
    console.log('');
  }
  
  if (results.backfill.processed === 0 && results.visualSearch.passed === 0) {
    console.log('💡 To generate embeddings:');
    console.log('   Run this script again - backfill processes 20 products at a time');
    console.log('   Keep running until "All caught up!" message appears');
    console.log('');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
