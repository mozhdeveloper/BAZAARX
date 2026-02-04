/**
 * Mobile AI Chat Service Test Script
 * Tests all functionality of the AI chat service for mobile app
 * 
 * Run with: node scripts/test-ai-chat.js
 */

require('dotenv').config();

// Test colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function logTest(name) {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${YELLOW}TEST ${++testsRun}: ${name}${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
}

function logSuccess(message) {
  testsPassed++;
  console.log(`${GREEN}✓ ${message}${RESET}`);
}

function logError(message) {
  testsFailed++;
  console.log(`${RED}✗ ${message}${RESET}`);
}

function logInfo(message) {
  console.log(`  ${message}`);
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Mock product for testing
const mockProduct = {
  id: '1',
  name: 'Premium Wireless Headphones',
  description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
  price: 4999,
  originalPrice: 7999,
  discountPercentage: 37,
  category: 'Electronics',
  brand: 'AudioTech',
  colors: ['Black', 'White', 'Silver'],
  stock: 25,
  rating: 4.8,
  reviewCount: 342,
  isFreeShipping: true,
  sellerName: "Tech Haven Store",
};

const mockStore = {
  storeName: 'Tech Haven Store',
  rating: 4.9,
  totalSales: 15420,
  isVerified: true,
};

async function sendMessageToGemini(message, product, store) {
  const productInfo = product ? `

## 📦 CURRENT PRODUCT
**Name**: ${product.name}
**Price**: ₱${(product.price || 0).toLocaleString()}
**Category**: ${product.category || 'Not specified'}
**Stock**: ${product.stock > 0 ? '✅ In Stock' : '❌ OUT OF STOCK'}
**Rating**: ${product.rating ? `⭐ ${product.rating}/5` : 'No ratings yet'}
**Description**: ${product.description || 'No description available.'}
` : '';

  const storeInfo = store ? `

## 🏪 STORE INFO
**Name**: ${store.storeName}
**Rating**: ${store.rating ? `⭐ ${store.rating}/5` : 'Not rated'}
**Verified**: ${store.isVerified ? '✅ Yes' : '❌ No'}
` : '';

  const fullPrompt = `You are BazBot, a professional AI shopping assistant for BazaarX.${productInfo}${storeInfo}

User Question: ${message}`;

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function runTests() {
  console.log(`\n${BLUE}╔════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║  ${YELLOW}MOBILE AI CHAT SERVICE TEST SUITE${BLUE}                  ║${RESET}`);
  console.log(`${BLUE}║  ${RESET}BazaarX Mobile App - AI Shopping Assistant        ${BLUE}║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════════════════╝${RESET}`);

  // Test 1: Environment Variables
  logTest('Environment Variables');
  try {
    if (GEMINI_API_KEY) {
      logSuccess('Gemini API key is configured');
      logInfo(`Key prefix: ${GEMINI_API_KEY.substring(0, 10)}...`);
    } else {
      logError('Gemini API key not found in environment');
    }
  } catch (error) {
    logError(`Environment check failed: ${error.message}`);
  }

  // Test 2: Basic AI Response
  logTest('AI Chat - Basic Product Question');
  try {
    logInfo('Asking: "Is this available in black?"');
    const response = await sendMessageToGemini(
      'Is this available in black?',
      mockProduct,
      mockStore
    );

    if (response && response.length > 0) {
      logSuccess('AI responded to product question');
      logInfo(`Response length: ${response.length} characters`);
      logInfo(`Response preview: "${response.substring(0, 100)}..."`);
      
      if (response.toLowerCase().includes('black')) {
        logSuccess('Response is contextually relevant (mentions color)');
      }
    } else {
      logError('AI response is empty');
    }
  } catch (error) {
    logError(`AI chat failed: ${error.message}`);
    console.error(error);
  }

  // Test 3: Pricing Question
  logTest('AI Chat - Pricing Question');
  try {
    logInfo('Asking: "How much is the discount?"');
    const response = await sendMessageToGemini(
      'How much is the discount?',
      mockProduct,
      mockStore
    );

    if (response && response.length > 0) {
      logSuccess('AI responded to pricing question');
      logInfo(`Response: "${response.substring(0, 150)}..."`);
      
      const mentionsPriceInfo = 
        response.includes('₱') || 
        response.includes('4999') || 
        response.includes('37%') ||
        response.toLowerCase().includes('discount');
        
      if (mentionsPriceInfo) {
        logSuccess('Response includes pricing information');
      } else {
        logInfo('Response may not include specific price details');
      }
    } else {
      logError('AI response is empty');
    }
  } catch (error) {
    logError(`Pricing question failed: ${error.message}`);
  }

  // Test 4: Shipping Question
  logTest('AI Chat - Shipping Question');
  try {
    logInfo('Asking: "Do you offer free shipping?"');
    const response = await sendMessageToGemini(
      'Do you offer free shipping?',
      mockProduct,
      mockStore
    );

    if (response && response.length > 0) {
      logSuccess('AI responded to shipping question');
      
      const mentionsShipping = 
        response.toLowerCase().includes('shipping') ||
        response.toLowerCase().includes('delivery') ||
        response.toLowerCase().includes('free');
        
      if (mentionsShipping) {
        logSuccess('Response addresses shipping inquiry');
      }
      
      logInfo(`Response: "${response.substring(0, 120)}..."`);
    } else {
      logError('AI response is empty');
    }
  } catch (error) {
    logError(`Shipping question failed: ${error.message}`);
  }

  // Test 5: Store Question
  logTest('AI Chat - Store Question');
  try {
    logInfo('Asking: "Is this store reliable?"');
    const response = await sendMessageToGemini(
      'Is this store reliable?',
      mockProduct,
      mockStore
    );

    if (response && response.length > 0) {
      logSuccess('AI responded to store question');
      
      const mentionsStore = 
        response.includes('Tech Haven') ||
        response.toLowerCase().includes('store') ||
        response.toLowerCase().includes('verified') ||
        response.includes('4.9');
        
      if (mentionsStore) {
        logSuccess('Response includes store information');
      }
      
      logInfo(`Response: "${response.substring(0, 120)}..."`);
    } else {
      logError('AI response is empty');
    }
  } catch (error) {
    logError(`Store question failed: ${error.message}`);
  }

  // Test 6: General Question (No Context)
  logTest('AI Chat - General Question without Context');
  try {
    logInfo('Asking: "What payment methods do you accept?"');
    const response = await sendMessageToGemini(
      'What payment methods do you accept?',
      null,
      null
    );

    if (response && response.length > 0) {
      logSuccess('AI responds without product/store context');
      logInfo(`Response: "${response.substring(0, 100)}..."`);
    } else {
      logError('AI response is empty');
    }
  } catch (error) {
    logError(`General question failed: ${error.message}`);
  }

  // Final Report
  console.log(`\n${BLUE}╔════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BLUE}║  ${YELLOW}TEST RESULTS${BLUE}                                       ║${RESET}`);
  console.log(`${BLUE}╚════════════════════════════════════════════════════════╝${RESET}`);
  console.log(`\n  Total Tests: ${testsRun}`);
  console.log(`  ${GREEN}Passed: ${testsPassed}${RESET}`);
  console.log(`  ${RED}Failed: ${testsFailed}${RESET}`);
  console.log(`  Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%\n`);

  if (testsFailed === 0) {
    console.log(`${GREEN}╔════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${GREEN}║  ✓ ALL TESTS PASSED!                                  ║${RESET}`);
    console.log(`${GREEN}║  Mobile AI Chat Service is working perfectly! 🎉     ║${RESET}`);
    console.log(`${GREEN}╚════════════════════════════════════════════════════════╝${RESET}\n`);
  } else {
    console.log(`${RED}╔════════════════════════════════════════════════════════╗${RESET}`);
    console.log(`${RED}║  ⚠ SOME TESTS FAILED                                   ║${RESET}`);
    console.log(`${RED}║  Please review the errors above                       ║${RESET}`);
    console.log(`${RED}╚════════════════════════════════════════════════════════╝${RESET}\n`);
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error(`${RED}Fatal error running tests:${RESET}`, error);
  process.exit(1);
});
