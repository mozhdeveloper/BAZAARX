/**
 * List available Gemini models
 * Run with: npx ts-node --esm scripts/list-gemini-models.ts
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

console.log('\n🔍 Listing Available Gemini Models\n');
console.log('API Key:', GEMINI_API_KEY ? `${GEMINI_API_KEY.substring(0, 10)}...` : 'NOT FOUND');
console.log('\n---\n');

async function listModels() {
  if (!GEMINI_API_KEY) {
    console.error('❌ No API key found! Check your .env file.');
    return;
  }

  try {
    console.log('📤 Fetching available models...\n');

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:');
      console.error(JSON.stringify(errorData, null, 2));
      return;
    }

    const data = await response.json();
    
    console.log('✅ Available Models:\n');
    
    if (data.models && Array.isArray(data.models)) {
      data.models.forEach((model: any) => {
        console.log(`📦 ${model.name}`);
        console.log(`   Display Name: ${model.displayName || 'N/A'}`);
        console.log(`   Description: ${model.description || 'N/A'}`);
        console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
        console.log('');
      });
      
      console.log(`\nTotal models found: ${data.models.length}`);
      
      // Look for models that support generateContent
      const generateContentModels = data.models.filter((m: any) => 
        m.supportedGenerationMethods?.includes('generateContent')
      );
      
      console.log(`\n✨ Models supporting generateContent: ${generateContentModels.length}`);
      generateContentModels.forEach((m: any) => {
        console.log(`   - ${m.name}`);
      });
    } else {
      console.log('No models found or unexpected response format.');
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('\n❌ Error listing models:');
    console.error(error instanceof Error ? error.message : String(error));
  }
}

listModels();
