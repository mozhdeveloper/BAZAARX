/**
 * Gemini API Test Script for Web
 * Tests the Gemini 2.5 Flash API connectivity and response
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

async function testGeminiAPI() {
  console.log('🔍 Gemini API Test\n');
  console.log('API Key:', GEMINI_API_KEY.substring(0, 12) + '...');
  console.log('Model:', GEMINI_MODEL);
  console.log('API URL:', GEMINI_API_URL);
  console.log('---\n');

  if (!GEMINI_API_KEY) {
    console.error('❌ Error: VITE_GEMINI_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('📤 Sending test request to Gemini API...\n');

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: "Say 'Hello' if you can hear me."
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 100,
    }
  };

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📥 Response status:', response.status, response.statusText);
    console.log('');

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', JSON.stringify(errorData, null, 2));
      process.exit(1);
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    
    console.log('✅ Success! Gemini API is working.\n');
    console.log('📝 Response:');
    console.log(aiResponse);
    console.log('\n✨ Full response data:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testGeminiAPI();
