/**
 * Test Multiple Gemini Models
 * Tests which models work and are free
 */

import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';

const modelsToTest = [
  'gemini-2.0-flash-exp',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

async function testModel(modelName: string) {
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
  
  const requestBody = {
    contents: [{ parts: [{ text: "Say 'OK' if you work." }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 50 }
  };

  try {
    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return { 
        model: modelName, 
        status: 'failed', 
        code: response.status,
        error: errorData.error?.message || 'Unknown error'
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
    
    return {
      model: modelName,
      status: 'success',
      code: 200,
      response: text,
      version: data.modelVersion,
      usage: data.usageMetadata
    };
  } catch (error: any) {
    return {
      model: modelName,
      status: 'error',
      error: error.message
    };
  }
}

async function testAllModels() {
  console.log('🔍 Testing Gemini Models\n');
  console.log('API Key:', GEMINI_API_KEY.substring(0, 12) + '...\n');
  
  for (const model of modelsToTest) {
    console.log(`📤 Testing ${model}...`);
    const result = await testModel(model);
    
    if (result.status === 'success') {
      console.log(`✅ ${result.model} - WORKS`);
      console.log(`   Response: ${result.response}`);
      console.log(`   Version: ${result.version}`);
      console.log(`   Tokens: ${result.usage?.totalTokenCount || 'N/A'}`);
    } else {
      console.log(`❌ ${result.model} - FAILED`);
      console.log(`   Status: ${result.code || 'N/A'}`);
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }
  
  console.log('\n📊 Summary: Test the working models above and choose one for production.');
}

testAllModels();
