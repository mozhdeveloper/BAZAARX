/**
 * AI Chat Service - Gemini 2.5 Flash powered professional chat assistant for Mobile
 * Provides intelligent, professional responses about products, stores, and BazaarX policies
 */

import { supabase } from '../lib/supabase';

// Gemini API configuration - Use hardcoded key as Expo env vars can be unreliable in dev builds
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyAk-VK1WTpw0KrcYAc_sI0CeGlk19xzgWc';
const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export interface ProductContext {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  discountPercentage?: number;
  category?: string;
  brand?: string;
  colors?: string[];
  sizes?: string[];
  stock?: number;
  stockQuantity?: number;
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  isFreeShipping?: boolean;
  sellerName?: string;
  sellerId?: string;
}

export interface StoreContext {
  id?: string;
  storeName: string;
  sellerId?: string;
  businessName?: string;
  storeDescription?: string;
  rating?: number;
  totalSales?: number;
  isVerified?: boolean;
  city?: string;
  province?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// BazaarX Platform Policies
const BAZAARX_POLICIES = `
# BazaarX Platform Information & Policies

## About BazaarX
BazaarX is the Philippines' premier e-commerce marketplace, connecting Filipino buyers with trusted sellers.

## Shipping Information
- **Metro Manila**: 3-5 business days
- **Luzon**: 5-7 business days
- **Visayas/Mindanao**: 7-12 business days
- **Free Shipping**: Orders ₱1,500+ (seller-dependent)
- **Cash on Delivery (COD)**: Available nationwide

## Return & Refund Policy
- **7-Day Easy Returns**: Return within 7 days of delivery
- **Valid Reasons**: Defective, wrong item, incomplete, not as described
- **Refund**: 5-7 business days to original payment method

## Payment Methods
- Credit/Debit Cards (Visa, Mastercard, JCB)
- E-Wallets (GCash, Maya, GrabPay)
- Bank Transfer
- Cash on Delivery (COD)

## Buyer Protection
- Secure encrypted payments
- Verified seller badges
- 24/7 customer support
`;

class AIChatService {
  private conversationHistory: ChatMessage[] = [];

  /**
   * Build system prompt with product and store context
   */
  private buildSystemPrompt(product?: ProductContext, store?: StoreContext): string {
    let prompt = `You are BazBot, the professional AI shopping assistant for BazaarX, the Philippines' leading e-commerce marketplace.

## Your Professional Standards
1. Be warm, professional, and courteous
2. Provide accurate information based ONLY on the data provided
3. Use appropriate emojis sparingly for friendliness
4. Keep responses concise for mobile screens
5. For questions you cannot answer, suggest "Talk to Seller"

${BAZAARX_POLICIES}
`;

    if (product) {
      const stockStatus = product.stock === 0 ? '❌ OUT OF STOCK' 
        : product.stock && product.stock <= 5 ? `⚠️ Low Stock (${product.stock} left)` 
        : `✅ In Stock (${product.stock} available)`;

      prompt += `

## 📦 CURRENT PRODUCT
**Name**: ${product.name}
**Price**: ₱${(product.price || 0).toLocaleString()}${product.originalPrice && product.price && product.originalPrice > product.price ? ` (was ₱${product.originalPrice.toLocaleString()}, ${product.discountPercentage}% OFF!)` : ''}
**Category**: ${product.category || 'Not specified'}
**Brand**: ${product.brand || 'Unbranded'}
**Stock**: ${stockStatus}
${product.colors?.length ? `**Colors**: ${product.colors.join(', ')}` : ''}
${product.sizes?.length ? `**Sizes**: ${product.sizes.join(', ')}` : ''}
**Free Shipping**: ${product.isFreeShipping ? '✅ Yes' : '❌ No'}
**Rating**: ${product.rating ? `⭐ ${product.rating}/5 (${product.reviewCount} reviews)` : 'No ratings yet'}
**Sold**: ${product.salesCount || 0} units

**Description**: ${product.description || 'No description available.'}
`;
    }

    if (store) {
      prompt += `

## 🏪 STORE INFO
**Store Name**: ${store.storeName}
**Verified**: ${store.isVerified ? '✅ Yes' : '❌ No'}
**Rating**: ${store.rating ? `⭐ ${store.rating}/5` : 'No rating yet'}
**Total Sales**: ${store.totalSales?.toLocaleString() || 0}
**Location**: ${store.city && store.province ? `${store.city}, ${store.province}` : 'Not specified'}
`;
    }

    return prompt;
  }

  /**
   * Send message to Gemini AI
   */
  async sendMessage(
    userMessage: string,
    product?: ProductContext,
    store?: StoreContext
  ): Promise<{ response: string; suggestTalkToSeller: boolean }> {
    console.log('[AI Chat] Sending message:', userMessage.substring(0, 30));
    console.log('[AI Chat] API Key available:', !!GEMINI_API_KEY, 'Length:', GEMINI_API_KEY?.length);
    
    if (!GEMINI_API_KEY) {
      console.error('[AI Chat] Gemini API key not configured');
      return {
        response: "I'm currently unavailable. Please tap 'Talk to Seller' for assistance.",
        suggestTalkToSeller: true,
      };
    }

    // Add user message to history
    this.conversationHistory.push({
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Keep only last 10 messages
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    const systemPrompt = this.buildSystemPrompt(product, store);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            { role: 'model', parts: [{ text: "Understood! I'm BazBot, your shopping assistant. How can I help?" }] },
            ...this.conversationHistory.map(msg => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }],
            })),
          ],
          generationConfig: {
            temperature: 0.6,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 500, // Shorter for mobile
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI Chat] API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('[AI Chat] Response received:', data.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 50));
      
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I couldn't process your request. Please try again or tap 'Talk to Seller'.";

      // Add AI response to history
      this.conversationHistory.push({
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      });

      const suggestTalkToSeller = 
        aiResponse.toLowerCase().includes('talk to seller') ||
        aiResponse.toLowerCase().includes('contact the seller') ||
        aiResponse.toLowerCase().includes('ask the seller');

      return { response: aiResponse, suggestTalkToSeller };
    } catch (error) {
      console.error('[AI Chat] Error calling Gemini API:', error);
      return {
        response: "I'm having trouble right now. Please tap 'Talk to Seller' for assistance.",
        suggestTalkToSeller: true,
      };
    }
  }

  /**
   * Get quick reply suggestions based on product
   */
  getQuickReplies(product?: ProductContext): string[] {
    const replies: string[] = [];

    if (product) {
      replies.push('Is this available?');
      if (product.sizes?.length) replies.push('What sizes?');
      if (product.colors?.length) replies.push('What colors?');
      if (product.originalPrice && product.price && product.originalPrice > product.price) {
        replies.push('How long is this sale?');
      }
      replies.push(product.isFreeShipping ? 'Shipping info' : 'Free shipping?');
    }

    if (replies.length < 4) replies.push('Return policy?');
    if (replies.length < 4) replies.push('Payment options?');

    return replies.slice(0, 4);
  }

  /**
   * Get welcome message
   */
  getWelcomeMessage(productName?: string, storeName?: string): string {
    if (productName && storeName) {
      return `👋 Hi! I'm BazBot, your AI shopping assistant.\n\nI can help you with questions about "${productName}" from ${storeName}.\n\nWhat would you like to know?`;
    }
    return `👋 Hi! I'm BazBot, your AI shopping assistant.\n\nHow can I help you today?`;
  }

  /**
   * Reset conversation
   */
  resetConversation(): void {
    this.conversationHistory = [];
  }
}

export const aiChatService = new AIChatService();
