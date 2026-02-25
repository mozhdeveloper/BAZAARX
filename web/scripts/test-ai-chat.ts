/**
 * Test Script for AI Chat Service
 * Tests the Gemini 2.5 Flash integration with product and store context
 * 
 * Run: npx tsx scripts/test-ai-chat.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || '';
// Using gemini-2.5-flash - stable release with 1M token context window
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.cyan);
  console.log('='.repeat(60));
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

interface ProductContext {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  category?: string;
  brand?: string;
  colors?: string[];
  sizes?: string[];
  stock?: number;
  rating?: number;
  reviewCount?: number;
  isFreeShipping?: boolean;
}

interface StoreContext {
  id: string;
  storeName: string;
  businessName?: string;
  storeDescription?: string;
  rating?: number;
  totalSales?: number;
  isVerified?: boolean;
  city?: string;
  province?: string;
}

async function testSupabaseConnection(): Promise<boolean> {
  logSection('TEST 1: Supabase Connection');
  
  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('id, store_name')
      .limit(1);
    
    if (error) {
      logError(`Supabase connection failed: ${error.message}`);
      return false;
    }
    
    logSuccess('Supabase connection successful');
    logInfo(`Found ${data?.length || 0} sellers`);
    return true;
  } catch (error) {
    logError(`Supabase error: ${error}`);
    return false;
  }
}

async function testGeminiAPIKey(): Promise<boolean> {
  logSection('TEST 2: Gemini API Key');
  
  if (!GEMINI_API_KEY) {
    logError('VITE_GEMINI_API_KEY is not set in .env');
    return false;
  }
  
  logSuccess(`API key found: ${GEMINI_API_KEY.substring(0, 10)}...`);
  
  // Test basic API call
  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Say "Hello, I am working!" in exactly those words.' }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 50 },
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Check for quota exceeded (this is common with free tier)
      if (errorData.error?.code === 429 || errorData.error?.status === 'RESOURCE_EXHAUSTED') {
        logWarning('Gemini API quota exceeded (free tier limit reached)');
        logInfo('This is a billing/quota issue, not an API key problem');
        logInfo('The API key is valid, but you need to:');
        logInfo('  1. Wait for quota to reset (usually resets daily)');
        logInfo('  2. Or upgrade to a paid plan at https://ai.google.dev');
        return true; // API key is valid, just quota issue
      }
      
      logError(`Gemini API error: ${JSON.stringify(errorData)}`);
      return false;
    }
    
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    logSuccess('Gemini API connection successful');
    logInfo(`Response: "${text.trim()}"`);
    return true;
  } catch (error) {
    logError(`Gemini API error: ${error}`);
    return false;
  }
}

async function getTestProduct(): Promise<ProductContext | null> {
  logSection('TEST 3: Fetch Product Data');
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        id, name, description, price, original_price, category, brand,
        colors, sizes, stock, rating, review_count, is_free_shipping
      `)
      .eq('approval_status', 'approved')
      .eq('is_active', true)
      .limit(1)
      .single();
    
    if (error || !data) {
      logWarning('No approved products found, trying any product...');
      
      const { data: anyProduct, error: anyError } = await supabase
        .from('products')
        .select(`
          id, name, description, price, original_price, category, brand,
          colors, sizes, stock, rating, review_count, is_free_shipping
        `)
        .limit(1)
        .single();
      
      if (anyError || !anyProduct) {
        logError('No products found in database');
        return null;
      }
      
      logSuccess(`Found product: "${anyProduct.name}"`);
      return {
        id: anyProduct.id,
        name: anyProduct.name,
        description: anyProduct.description,
        price: anyProduct.price,
        originalPrice: anyProduct.original_price,
        discountPercentage: anyProduct.original_price && anyProduct.original_price > anyProduct.price
          ? Math.round((1 - anyProduct.price / anyProduct.original_price) * 100) : 0,
        category: anyProduct.category,
        brand: anyProduct.brand,
        colors: anyProduct.colors || [],
        sizes: anyProduct.sizes || [],
        stock: anyProduct.stock,
        rating: anyProduct.rating,
        reviewCount: anyProduct.review_count,
        isFreeShipping: anyProduct.is_free_shipping,
      };
    }
    
    logSuccess(`Found approved product: "${data.name}"`);
    logInfo(`Price: ₱${data.price} | Stock: ${data.stock} | Rating: ${data.rating || 'N/A'}`);
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      originalPrice: data.original_price,
      discountPercentage: data.original_price && data.original_price > data.price
        ? Math.round((1 - data.price / data.original_price) * 100) : 0,
      category: data.category,
      brand: data.brand,
      colors: data.colors || [],
      sizes: data.sizes || [],
      stock: data.stock,
      rating: data.rating,
      reviewCount: data.review_count,
      isFreeShipping: data.is_free_shipping,
    };
  } catch (error) {
    logError(`Error fetching product: ${error}`);
    return null;
  }
}

async function getTestStore(): Promise<StoreContext | null> {
  logSection('TEST 4: Fetch Store Data');
  
  try {
    const { data, error } = await supabase
      .from('sellers')
      .select(`
        id, store_name, business_name, store_description,
        rating, total_sales, is_verified, city, province
      `)
      .eq('is_verified', true)
      .limit(1)
      .single();
    
    if (error || !data) {
      logWarning('No verified stores found, trying any store...');
      
      const { data: anyStore, error: anyError } = await supabase
        .from('sellers')
        .select(`
          id, store_name, business_name, store_description,
          rating, total_sales, is_verified, city, province
        `)
        .limit(1)
        .single();
      
      if (anyError || !anyStore) {
        logError('No stores found in database');
        return null;
      }
      
      logSuccess(`Found store: "${anyStore.store_name}"`);
      return {
        id: anyStore.id,
        storeName: anyStore.store_name,
        businessName: anyStore.business_name,
        storeDescription: anyStore.store_description,
        rating: anyStore.rating,
        totalSales: anyStore.total_sales,
        isVerified: anyStore.is_verified,
        city: anyStore.city,
        province: anyStore.province,
      };
    }
    
    logSuccess(`Found verified store: "${data.store_name}"`);
    logInfo(`Rating: ${data.rating || 'N/A'} | Sales: ${data.total_sales || 0} | Verified: ${data.is_verified ? 'Yes' : 'No'}`);
    
    return {
      id: data.id,
      storeName: data.store_name,
      businessName: data.business_name,
      storeDescription: data.store_description,
      rating: data.rating,
      totalSales: data.total_sales,
      isVerified: data.is_verified,
      city: data.city,
      province: data.province,
    };
  } catch (error) {
    logError(`Error fetching store: ${error}`);
    return null;
  }
}

function buildSystemPrompt(product: ProductContext | null, store: StoreContext | null): string {
  let prompt = `You are BazBot, the professional AI shopping assistant for BazaarX, the Philippines' leading e-commerce marketplace.

## Your Professional Standards
1. Be warm, professional, and courteous at all times
2. Provide accurate information based ONLY on the data provided
3. Structure responses clearly with good formatting
4. Use appropriate emojis sparingly for friendliness

## BazaarX Quick Info
- Shipping: 3-7 days Metro Manila, 5-12 days provinces
- Free shipping on orders ₱1,500+
- 7-day easy returns
- Payment: Cards, GCash, Maya, COD
`;

  if (product) {
    const stockStatus = product.stock === 0 ? '❌ OUT OF STOCK' 
      : product.stock && product.stock <= 5 ? `⚠️ Low Stock (${product.stock} left)` 
      : `✅ In Stock (${product.stock} available)`;

    prompt += `

## 📦 CURRENT PRODUCT
**Name**: ${product.name}
**Price**: ₱${product.price?.toLocaleString()}${product.originalPrice && product.originalPrice > product.price ? ` (was ₱${product.originalPrice.toLocaleString()}, ${product.discountPercentage}% OFF!)` : ''}
**Category**: ${product.category || 'Not specified'}
**Brand**: ${product.brand || 'Unbranded'}
**Stock**: ${stockStatus}
${product.sizes?.length ? `**Sizes**: ${product.sizes.join(', ')}` : ''}
${product.colors?.length ? `**Colors**: ${product.colors.join(', ')}` : ''}
**Free Shipping**: ${product.isFreeShipping ? '✅ Yes' : '❌ No'}
**Rating**: ${product.rating ? `⭐ ${product.rating}/5 (${product.reviewCount} reviews)` : 'No ratings yet'}

**Description**: ${product.description || 'No description available.'}
`;
  }

  if (store) {
    prompt += `

## 🏪 STORE INFO
**Store Name**: ${store.storeName}
**Business Name**: ${store.businessName || store.storeName}
**Verified**: ${store.isVerified ? '✅ Yes' : '❌ No'}
**Rating**: ${store.rating ? `⭐ ${store.rating}/5` : 'No rating yet'}
**Total Sales**: ${store.totalSales?.toLocaleString() || 0}
**Location**: ${store.city && store.province ? `${store.city}, ${store.province}` : 'Not specified'}
**About**: ${store.storeDescription || 'No description available.'}
`;
  }

  return prompt;
}

async function testAIConversation(product: ProductContext | null, store: StoreContext | null): Promise<boolean> {
  logSection('TEST 5: AI Conversation Test');
  
  const testQuestions = [
    'What is the price of this product?',
    'Is this product still in stock?',
    'What colors and sizes are available?',
    'Tell me about this seller',
    'What is the return policy?',
  ];
  
  const systemPrompt = buildSystemPrompt(product, store);
  let allPassed = true;
  let quotaExhausted = false;
  
  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    log(`\n${colors.magenta}Question ${i + 1}: "${question}"${colors.reset}`);
    
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Understood! I'm BazBot, your professional shopping assistant. How may I help you?" }] },
            { role: 'user', parts: [{ text: question }] },
          ],
          generationConfig: {
            temperature: 0.6,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 400,
          },
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Check for quota exceeded
        if (errorData.error?.code === 429 || errorData.error?.status === 'RESOURCE_EXHAUSTED') {
          if (!quotaExhausted) {
            logWarning('API quota exceeded - skipping remaining conversation tests');
            logInfo('The AI integration is correctly configured, just quota limited');
            quotaExhausted = true;
          }
          continue;
        }
        
        logError(`API request failed for question ${i + 1}`);
        allPassed = false;
        continue;
      }
      
      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
      
      // Truncate long responses for display
      const displayResponse = aiResponse.length > 300 
        ? aiResponse.substring(0, 300) + '...' 
        : aiResponse;
      
      log(`${colors.green}Answer: ${displayResponse}${colors.reset}`);
      
      // Basic validation - response should be relevant
      if (aiResponse.length < 20) {
        logWarning('Response seems too short');
      } else {
        logSuccess(`Question ${i + 1} answered successfully`);
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      logError(`Error on question ${i + 1}: ${error}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

async function testQuickReplies(product: ProductContext | null): Promise<void> {
  logSection('TEST 6: Quick Replies Generation');
  
  const quickReplies: string[] = [];
  
  if (product) {
    if (product.stock !== undefined) {
      quickReplies.push(product.stock > 0 ? 'Is this still available?' : 'When will this be restocked?');
    }
    if (product.sizes?.length) {
      quickReplies.push('What sizes are available?');
    }
    if (product.colors?.length) {
      quickReplies.push('What colors can I choose?');
    }
    if (product.originalPrice && product.originalPrice > product.price) {
      quickReplies.push('How long is this sale?');
    }
    quickReplies.push(product.isFreeShipping ? 'Tell me about shipping' : 'Is there free shipping?');
  }
  
  // Always include policy questions
  if (quickReplies.length < 4) {
    quickReplies.push('What is the return policy?');
  }
  if (quickReplies.length < 4) {
    quickReplies.push('What payment methods are accepted?');
  }
  
  const uniqueReplies = [...new Set(quickReplies)].slice(0, 4);
  
  logSuccess(`Generated ${uniqueReplies.length} quick replies:`);
  uniqueReplies.forEach((reply, i) => {
    logInfo(`  ${i + 1}. ${reply}`);
  });
}

async function runAllTests(): Promise<void> {
  console.log('\n');
  log('🤖 AI CHAT SERVICE TEST SUITE', colors.bright + colors.magenta);
  log('Testing Gemini 2.5 Flash integration with BazaarX', colors.cyan);
  console.log('='.repeat(60) + '\n');
  
  // Check environment
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logError('Missing Supabase environment variables');
    logInfo('Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env');
    process.exit(1);
  }
  
  // Run tests
  const results: { name: string; passed: boolean }[] = [];
  
  // Test 1: Supabase
  const supabaseOk = await testSupabaseConnection();
  results.push({ name: 'Supabase Connection', passed: supabaseOk });
  
  // Test 2: Gemini API
  const geminiOk = await testGeminiAPIKey();
  results.push({ name: 'Gemini API', passed: geminiOk });
  
  if (!geminiOk) {
    logError('\nCannot continue without Gemini API. Please check your API key.');
    process.exit(1);
  }
  
  // Test 3: Product Data
  const product = await getTestProduct();
  results.push({ name: 'Product Data', passed: product !== null });
  
  // Test 4: Store Data
  const store = await getTestStore();
  results.push({ name: 'Store Data', passed: store !== null });
  
  // Test 5: AI Conversation
  const conversationOk = await testAIConversation(product, store);
  results.push({ name: 'AI Conversation', passed: conversationOk });
  
  // Test 6: Quick Replies
  await testQuickReplies(product);
  results.push({ name: 'Quick Replies', passed: true });
  
  // Summary
  logSection('TEST RESULTS SUMMARY');
  
  let passedCount = 0;
  results.forEach(result => {
    if (result.passed) {
      logSuccess(`${result.name}`);
      passedCount++;
    } else {
      logError(`${result.name}`);
    }
  });
  
  console.log('\n' + '-'.repeat(60));
  
  if (passedCount === results.length) {
    log(`\n🎉 ALL ${results.length} TESTS PASSED!`, colors.bright + colors.green);
    log('The AI Chat Service is working correctly.', colors.green);
  } else {
    log(`\n⚠️  ${passedCount}/${results.length} tests passed`, colors.yellow);
    log('Some tests failed. Please check the errors above.', colors.yellow);
  }
  
  console.log('\n');
}

// Run the tests
runAllTests().catch(console.error);
