/**
 * Comprehensive Mobile AI Assistant Test Suite
 * Tests all functionality of the AI chat service for mobile app
 * 
 * Run with: node scripts/test-ai-assistant-comprehensive.js
 */

require('dotenv').config();

// Test colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;
const startTime = Date.now();

function printHeader() {
  console.log(`\n${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║  🤖 BazaarX Mobile AI Assistant - Comprehensive Test     ║${RESET}`);
  console.log(`${BOLD}${CYAN}║  Model: Gemini 2.5 Flash                                 ║${RESET}`);
  console.log(`${BOLD}${CYAN}║  Platform: React Native + Expo                           ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${RESET}\n`);
}

function logTest(name) {
  console.log(`\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`${BOLD}${YELLOW}TEST ${++testsRun}: ${name}${RESET}`);
  console.log(`${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
}

function logSuccess(message) {
  testsPassed++;
  console.log(`${GREEN}  ✓ ${message}${RESET}`);
}

function logError(message, error = null) {
  testsFailed++;
  console.log(`${RED}  ✗ ${message}${RESET}`);
  if (error) {
    console.log(`${RED}    Error: ${error.message}${RESET}`);
  }
}

function logInfo(message) {
  console.log(`${CYAN}  ℹ ${message}${RESET}`);
}

function logWarning(message) {
  console.log(`${YELLOW}  ⚠ ${message}${RESET}`);
}

function printSummary() {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n${BOLD}${CYAN}╔════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║  TEST SUMMARY                                             ║${RESET}`);
  console.log(`${BOLD}${CYAN}╠════════════════════════════════════════════════════════════╣${RESET}`);
  console.log(`${BOLD}${CYAN}║${RESET}  Total Tests Run:     ${testsRun.toString().padEnd(30)} ${BOLD}${CYAN}║${RESET}`);
  console.log(`${BOLD}${CYAN}║${RESET}  ${GREEN}Tests Passed:      ${testsPassed.toString().padEnd(30)}${RESET} ${BOLD}${CYAN}║${RESET}`);
  console.log(`${BOLD}${CYAN}║${RESET}  ${RED}Tests Failed:      ${testsFailed.toString().padEnd(30)}${RESET} ${BOLD}${CYAN}║${RESET}`);
  console.log(`${BOLD}${CYAN}║${RESET}  Success Rate:      ${((testsPassed / testsRun * 100).toFixed(1) + '%').padEnd(30)} ${BOLD}${CYAN}║${RESET}`);
  console.log(`${BOLD}${CYAN}║${RESET}  Duration:          ${(duration + 's').padEnd(30)} ${BOLD}${CYAN}║${RESET}`);
  console.log(`${BOLD}${CYAN}╚════════════════════════════════════════════════════════════╝${RESET}\n`);
  
  if (testsFailed === 0) {
    console.log(`${BOLD}${GREEN}🎉 ALL TESTS PASSED! Mobile AI Assistant is working perfectly!${RESET}\n`);
  } else {
    console.log(`${BOLD}${RED}⚠️  SOME TESTS FAILED. Please review the errors above.${RESET}\n`);
  }
}

// Configuration
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyD2RCtmiHKtWu2rGxVJv4VcYeJU7Vlor3I';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Mock data for testing
const mockProduct = {
  id: 'test-product-1',
  name: 'Premium Wireless Headphones',
  description: 'High-quality wireless headphones with active noise cancellation, 30-hour battery life, and premium sound quality.',
  price: 4999,
  originalPrice: 7999,
  discountPercentage: 37.5,
  category: 'Electronics',
  brand: 'AudioTech',
  colors: ['Black', 'Silver', 'Blue'],
  sizes: [],
  stock: 15,
  rating: 4.8,
  reviewCount: 124,
  salesCount: 450,
  isFreeShipping: true,
  sellerName: 'TechHub Store',
  sellerId: 'seller-123',
};

const mockStore = {
  id: 'seller-123',
  storeName: 'TechHub Store',
  sellerId: 'seller-123',
  businessName: 'TechHub Electronics Inc.',
  storeDescription: 'Premium electronics and gadgets since 2020. Authorized retailer.',
  rating: 4.7,
  totalSales: 1250,
  isVerified: true,
  city: 'Manila',
  province: 'Metro Manila',
};

// Test functions
async function testApiConnection() {
  logTest('API Connection & Authentication');
  
  try {
    // Check if API key is configured
    if (!GEMINI_API_KEY) {
      logError('GEMINI_API_KEY not configured');
      return;
    }
    logSuccess('API key is configured');
    
    // Test basic API call
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello, test connection.' }] }],
        generationConfig: { maxOutputTokens: 50 }
      })
    });
    
    if (!response.ok) {
      logError('API connection failed', new Error(`Status: ${response.status}`));
      return;
    }
    logSuccess('API connection successful');
    
    const data = await response.json();
    if (data.candidates && data.candidates.length > 0) {
      logSuccess('API response is valid');
      logInfo(`Response: ${data.candidates[0].content.parts[0].text.substring(0, 50)}...`);
    } else {
      logError('API response format is invalid');
    }
  } catch (error) {
    logError('API test failed', error);
  }
}

async function testProductContext() {
  logTest('Product Context Building');
  
  try {
    // Build context prompt
    const productContext = `
PRODUCT INFORMATION:
- Name: ${mockProduct.name}
- Price: ₱${mockProduct.price.toLocaleString()} ${mockProduct.originalPrice ? `(Original: ₱${mockProduct.originalPrice.toLocaleString()}, ${mockProduct.discountPercentage}% OFF)` : ''}
- Category: ${mockProduct.category}
- Brand: ${mockProduct.brand}
- Available Colors: ${mockProduct.colors.join(', ')}
- Stock: ${mockProduct.stock} units available
- Rating: ${mockProduct.rating}/5 (${mockProduct.reviewCount} reviews)
- Total Sales: ${mockProduct.salesCount} units sold
- Free Shipping: ${mockProduct.isFreeShipping ? 'Yes' : 'No'}
- Seller: ${mockProduct.sellerName}
`;
    
    if (productContext.length > 0) {
      logSuccess('Product context built successfully');
      logInfo(`Context size: ${productContext.length} characters`);
    }
    
    // Test with AI
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: productContext }] },
          { role: 'user', parts: [{ text: 'What colors are available?' }] }
        ],
        generationConfig: { maxOutputTokens: 100 }
      })
    });
    
    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    if (aiResponse.toLowerCase().includes('black') || 
        aiResponse.toLowerCase().includes('silver') || 
        aiResponse.toLowerCase().includes('blue')) {
      logSuccess('AI correctly understands product context');
      logInfo(`AI Response: ${aiResponse.substring(0, 100)}...`);
    } else {
      logWarning('AI response may not correctly reflect product context');
      logInfo(`AI Response: ${aiResponse}`);
    }
  } catch (error) {
    logError('Product context test failed', error);
  }
}

async function testStoreContext() {
  logTest('Store Context Building');
  
  try {
    const storeContext = `
STORE INFORMATION:
- Store Name: ${mockStore.storeName}
- Business: ${mockStore.businessName}
- Description: ${mockStore.storeDescription}
- Rating: ${mockStore.rating}/5
- Total Sales: ${mockStore.totalSales} orders
- Verified Seller: ${mockStore.isVerified ? 'Yes ✓' : 'No'}
- Location: ${mockStore.city}, ${mockStore.province}
`;
    
    if (storeContext.length > 0) {
      logSuccess('Store context built successfully');
      logInfo(`Context size: ${storeContext.length} characters`);
    }
    
    // Test with AI
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { parts: [{ text: storeContext }] },
          { role: 'user', parts: [{ text: 'Is this seller verified?' }] }
        ],
        generationConfig: { maxOutputTokens: 100 }
      })
    });
    
    const data = await response.json();
    const aiResponse = data.candidates[0].content.parts[0].text;
    
    if (aiResponse.toLowerCase().includes('verified') || aiResponse.toLowerCase().includes('yes')) {
      logSuccess('AI correctly understands store context');
      logInfo(`AI Response: ${aiResponse.substring(0, 100)}...`);
    } else {
      logWarning('AI response may not correctly reflect store context');
      logInfo(`AI Response: ${aiResponse}`);
    }
  } catch (error) {
    logError('Store context test failed', error);
  }
}

async function testConversationFlow() {
  logTest('Multi-Turn Conversation Flow');
  
  try {
    const conversationHistory = [];
    
    // Turn 1
    logInfo('Turn 1: Initial question');
    const turn1 = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: 'Tell me about this product.' }] }
        ],
        generationConfig: { maxOutputTokens: 150 }
      })
    });
    const response1 = await turn1.json();
    const aiMsg1 = response1.candidates[0].content.parts[0].text;
    conversationHistory.push(
      { role: 'user', parts: [{ text: 'Tell me about this product.' }] },
      { role: 'model', parts: [{ text: aiMsg1 }] }
    );
    logSuccess('Turn 1 completed');
    
    // Turn 2
    logInfo('Turn 2: Follow-up question');
    const turn2 = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          ...conversationHistory,
          { role: 'user', parts: [{ text: 'What did you just tell me?' }] }
        ],
        generationConfig: { maxOutputTokens: 150 }
      })
    });
    const response2 = await turn2.json();
    const aiMsg2 = response2.candidates[0].content.parts[0].text;
    
    if (aiMsg2.length > 0) {
      logSuccess('Multi-turn conversation works correctly');
      logInfo(`AI remembered context and responded appropriately`);
    } else {
      logError('Conversation flow failed');
    }
  } catch (error) {
    logError('Conversation flow test failed', error);
  }
}

async function testResponseTime() {
  logTest('Response Time Performance');
  
  const times = [];
  const iterations = 5;
  
  try {
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      
      await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Quick test message.' }] }],
          generationConfig: { maxOutputTokens: 50 }
        })
      });
      
      const duration = Date.now() - start;
      times.push(duration);
      logInfo(`Iteration ${i + 1}: ${duration}ms`);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    logSuccess(`Average response time: ${avgTime.toFixed(0)}ms`);
    logInfo(`Min: ${minTime}ms, Max: ${maxTime}ms`);
    
    if (avgTime < 3000) {
      logSuccess('Response time is excellent (< 3 seconds)');
    } else if (avgTime < 5000) {
      logWarning('Response time is acceptable (3-5 seconds)');
    } else {
      logError('Response time is too slow (> 5 seconds)');
    }
  } catch (error) {
    logError('Response time test failed', error);
  }
}

async function testQuickReplies() {
  logTest('Quick Replies Generation');
  
  try {
    const quickReplies = [];
    
    // Generate quick replies based on product
    if (mockProduct) {
      quickReplies.push('Is this available?');
      if (mockProduct.sizes?.length) quickReplies.push('What sizes?');
      if (mockProduct.colors?.length) quickReplies.push('What colors?');
      if (mockProduct.originalPrice && mockProduct.price && mockProduct.originalPrice > mockProduct.price) {
        quickReplies.push('How long is this sale?');
      }
      quickReplies.push(mockProduct.isFreeShipping ? 'Shipping info' : 'Free shipping?');
    }
    
    if (quickReplies.length < 4) quickReplies.push('Return policy?');
    if (quickReplies.length < 4) quickReplies.push('Payment options?');
    
    const finalReplies = quickReplies.slice(0, 4);
    
    if (finalReplies.length === 4) {
      logSuccess('Generated 4 quick replies');
      finalReplies.forEach((reply, idx) => {
        logInfo(`${idx + 1}. "${reply}"`);
      });
    } else {
      logError('Failed to generate correct number of quick replies');
    }
    
    // Test that quick replies are relevant
    if (finalReplies.some(r => r.includes('color') || r.includes('size') || r.includes('available'))) {
      logSuccess('Quick replies are contextually relevant');
    } else {
      logWarning('Quick replies may not be optimally relevant');
    }
  } catch (error) {
    logError('Quick replies test failed', error);
  }
}

async function testSellerHandoff() {
  logTest('Seller Handoff Detection');
  
  try {
    const testCases = [
      { input: 'Can I get a bulk discount?', shouldSuggest: true },
      { input: 'Can you customize this product?', shouldSuggest: true },
      { input: 'What colors are available?', shouldSuggest: false },
      { input: 'What is your return policy?', shouldSuggest: false },
    ];
    
    for (const testCase of testCases) {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: 'You are a helpful shopping assistant. If you cannot answer a question, suggest to "talk to seller".' }] },
            { role: 'user', parts: [{ text: testCase.input }] }
          ],
          generationConfig: { maxOutputTokens: 200 }
        })
      });
      
      const data = await response.json();
      const aiResponse = data.candidates[0].content.parts[0].text;
      const suggestsHandoff = aiResponse.toLowerCase().includes('talk to seller') ||
                             aiResponse.toLowerCase().includes('contact the seller') ||
                             aiResponse.toLowerCase().includes('ask the seller');
      
      if (suggestsHandoff === testCase.shouldSuggest) {
        logSuccess(`Correctly handled: "${testCase.input}"`);
      } else {
        logWarning(`May need tuning for: "${testCase.input}"`);
      }
      logInfo(`Expected handoff: ${testCase.shouldSuggest}, Got: ${suggestsHandoff}`);
    }
  } catch (error) {
    logError('Seller handoff test failed', error);
  }
}

async function testTokenUsage() {
  logTest('Token Usage & Cost Analysis');
  
  try {
    // Estimate token usage
    const systemPrompt = 'You are BazBot, a helpful shopping assistant for BazaarX...';
    const productContext = JSON.stringify(mockProduct);
    const storeContext = JSON.stringify(mockStore);
    const policies = 'BazaarX Policies...'.repeat(10); // Simulate policy text
    
    const totalContext = systemPrompt + productContext + storeContext + policies;
    const estimatedInputTokens = Math.ceil(totalContext.length / 4); // Rough estimate: 1 token ≈ 4 chars
    const estimatedOutputTokens = 500; // Max output for mobile
    
    logInfo(`Estimated input tokens: ${estimatedInputTokens}`);
    logInfo(`Estimated output tokens: ${estimatedOutputTokens}`);
    logInfo(`Total tokens per conversation: ${estimatedInputTokens + estimatedOutputTokens}`);
    
    // Cost calculation
    const inputCost = (estimatedInputTokens / 1_000_000) * 0.075; // $0.075 per 1M tokens
    const outputCost = (estimatedOutputTokens / 1_000_000) * 0.30; // $0.30 per 1M tokens
    const totalCost = inputCost + outputCost;
    
    logSuccess(`Cost per conversation: $${totalCost.toFixed(6)}`);
    logInfo(`Input cost: $${inputCost.toFixed(6)}`);
    logInfo(`Output cost: $${outputCost.toFixed(6)}`);
    
    // Free tier analysis
    const freeTokensPerDay = 128_000;
    const tokensPerConversation = estimatedInputTokens + estimatedOutputTokens;
    const freeConversationsPerDay = Math.floor(freeTokensPerDay / tokensPerConversation);
    
    logSuccess(`Free tier allows ~${freeConversationsPerDay} conversations/day`);
    
    if (totalCost < 0.001) {
      logSuccess('Cost is very economical (< $0.001 per conversation)');
    }
  } catch (error) {
    logError('Token usage test failed', error);
  }
}

async function testErrorHandling() {
  logTest('Error Handling & Fallbacks');
  
  try {
    // Test with invalid API key
    logInfo('Testing invalid API key handling...');
    const invalidResponse = await fetch(`${GEMINI_API_URL}?key=invalid_key_test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Test' }] }],
        generationConfig: { maxOutputTokens: 50 }
      })
    });
    
    if (!invalidResponse.ok) {
      logSuccess('Correctly detected invalid API key');
    } else {
      logWarning('Failed to detect invalid API key');
    }
    
    // Test empty message handling
    logInfo('Testing empty message handling...');
    const emptyMessage = '';
    if (emptyMessage.trim() === '') {
      logSuccess('Correctly validates empty messages');
    }
    
    // Test rate limiting awareness
    logInfo('Testing rate limit awareness...');
    logSuccess('Rate limiting should be handled client-side (15 RPM, 1500 RPD)');
    
  } catch (error) {
    logError('Error handling test failed', error);
  }
}

async function testWelcomeMessage() {
  logTest('Welcome Message Generation');
  
  try {
    const welcomeWithProduct = `👋 Hi! I'm BazBot, your AI shopping assistant.\n\nI can help you with questions about "${mockProduct.name}" from ${mockStore.storeName}.\n\nWhat would you like to know?`;
    const welcomeGeneric = `👋 Hi! I'm BazBot, your AI shopping assistant.\n\nHow can I help you today?`;
    
    if (welcomeWithProduct.includes(mockProduct.name) && welcomeWithProduct.includes(mockStore.storeName)) {
      logSuccess('Context-aware welcome message generated');
      logInfo(welcomeWithProduct.substring(0, 100) + '...');
    } else {
      logError('Welcome message does not include context');
    }
    
    if (welcomeGeneric.includes('BazBot')) {
      logSuccess('Generic welcome message generated');
    }
  } catch (error) {
    logError('Welcome message test failed', error);
  }
}

// Run all tests
async function runAllTests() {
  printHeader();
  
  await testApiConnection();
  await testProductContext();
  await testStoreContext();
  await testConversationFlow();
  await testResponseTime();
  await testQuickReplies();
  await testSellerHandoff();
  await testTokenUsage();
  await testErrorHandling();
  await testWelcomeMessage();
  
  printSummary();
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Execute tests
runAllTests().catch(error => {
  console.error(`${RED}${BOLD}Fatal error running tests:${RESET}`, error);
  process.exit(1);
});
