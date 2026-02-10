/**
 * Test Gemini API connection
 * Run with: npx ts-node --esm scripts/test-gemini-api.ts
 */

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

console.log('\n🔍 Gemini API Test\n');
console.log('API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('Model:', GEMINI_MODEL);
console.log('API URL:', GEMINI_API_URL);
console.log('\n---\n');

async function testGeminiAPI() {
  if (!GEMINI_API_KEY) {
    console.error('❌ No API key found! Check your .env file.');
    console.error('Expected: EXPO_PUBLIC_GEMINI_API_KEY=your_key_here');
    return;
  }

  try {
    console.log('📤 Sending test request to Gemini API...\n');

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Say "Hello! I am working correctly." in one sentence.' }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 50,
        },
      }),
    });

    console.log('📥 Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('\n❌ API Error:');
      console.error(JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log('\n✅ Success! Gemini API is working.');
    console.log('\n📝 Response:');
    console.log(aiResponse);
    console.log('\n✨ Full response data:');
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('\n❌ Error testing Gemini API:');
    console.error(error instanceof Error ? error.message : String(error));
  }
}

testGeminiAPI();
