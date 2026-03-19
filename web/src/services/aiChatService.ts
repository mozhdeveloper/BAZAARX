/**
 * AI Chat Service — BazBot powered by Qwen via Supabase Edge Function
 * All AI logic, context fetching, and system prompt live server-side.
 * This client handles conversation history, UI helpers, and seller notifications.
 */

import { supabase } from '../lib/supabase';

export interface ProductContext {
  id: string;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  category?: string;
  brand?: string;
  variantLabel2Values?: string[];
  variantLabel1Values?: string[];
  variants?: Array<{ variantLabel1Value?: string; variantLabel2Value?: string; stock?: number; price?: number }>;
  specifications?: Record<string, any>;
  stock?: number;
  lowStockThreshold?: number;
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  images?: string[];
  isFreeShipping?: boolean;
  weight?: number;
  dimensions?: { length?: number; width?: number; height?: number };
  tags?: string[];
  isActive?: boolean;
  approvalStatus?: string;
}

export interface StoreContext {
  id: string;
  storeName: string;
  businessName?: string;
  storeDescription?: string;
  storeCategory?: string[];
  businessType?: string;
  rating?: number;
  totalSales?: number;
  isVerified?: boolean;
  approvalStatus?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  businessAddress?: string;
  joinDate?: string;
  productCount?: number;
  followerCount?: number;
  responseTime?: string;
  policies?: {
    shipping?: string;
    returns?: string;
    warranty?: string;
  };
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  recentReviews: Array<{
    rating: number;
    comment: string;
    buyerName: string;
    date: string;
  }>;
}

export interface ChatContext {
  product?: ProductContext;
  store?: StoreContext;
  reviews?: ReviewSummary;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

class AIChatService {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  /**
   * Send message to BazBot via the ai-chat Edge Function (Qwen-powered)
   */
  async sendMessage(
    userMessage: string,
    context: ChatContext
  ): Promise<{ response: string; suggestTalkToSeller: boolean }> {
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Keep only last 10 messages for context window
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    try {
      // Ensure we have a valid session before calling the edge function
      // Without this, an expired JWT causes a 401 before the function even runs
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        await supabase.auth.refreshSession();
      }

      const requestBody = {
        message: userMessage,
        productId: context.product?.id || null,
        sellerId: context.store?.id || null,
        conversationHistory: this.conversationHistory.slice(0, -1),
      };

      let data: any;

      // Try the SDK invoke first; fall back to direct fetch on auth failure
      const invokeFn = async () => {
        const result = await supabase.functions.invoke('ai-chat', {
          body: requestBody,
        });
        if (result.error) throw result.error;
        return result.data;
      };

      try {
        data = await invokeFn();
      } catch (invokeErr: any) {
        // On 401 / FunctionsHttpError, bypass SDK and call directly with anon key
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        if (supabaseUrl && supabaseAnonKey) {
          const resp = await fetch(`${supabaseUrl}/functions/v1/ai-chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'apikey': supabaseAnonKey,
            },
            body: JSON.stringify(requestBody),
          });
          if (resp.ok) {
            data = await resp.json();
          } else {
            throw new Error(`AI chat request failed: ${resp.status}`);
          }
        } else {
          throw invokeErr;
        }
      }

      if (!data) throw new Error('No response from AI chat');

      const aiResponse = data?.response ||
        "I couldn't process your request right now. Please try again or tap 'Talk to Seller'.";

      this.conversationHistory.push({ role: 'assistant', content: aiResponse });

      return {
        response: aiResponse,
        suggestTalkToSeller: data?.suggestTalkToSeller || false,
      };
    } catch (err) {
      console.warn('AI chat error:', err);
      this.conversationHistory.pop();
      return {
        response: "I'm having a brief technical issue. Please try again in a moment, or tap 'Talk to Seller' for immediate help.",
        suggestTalkToSeller: true,
      };
    }
  }

  /**
   * Send notification to seller that buyer wants to chat
   */
  async notifySellerForChat(
    sellerId: string,
    buyerId: string,
    buyerName: string,
    productId?: string,
    productName?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('seller_chat_requests').insert({
        seller_id: sellerId,
        buyer_id: buyerId,
        buyer_name: buyerName,
        product_id: productId || null,
        product_name: productName || null,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error notifying seller:', error);
      }

      const { error: notifError } = await supabase.from('seller_notifications').insert({
        seller_id: sellerId,
        type: 'chat_request',
        title: '💬 New Chat Request',
        message: `${buyerName} would like to chat with you${productName ? ` about "${productName}"` : ''}. Tap to respond.`,
        action_url: '/seller/messages',
        action_data: {
          buyer_id: buyerId,
          buyer_name: buyerName,
          product_id: productId,
          product_name: productName,
        },
        priority: 'high',
      });

      if (notifError) {
        console.error('Error creating notification:', notifError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in notifySellerForChat:', error);
      return false;
    }
  }

  /**
   * Reset conversation history
   */
  resetConversation(): void {
    this.conversationHistory = [];
  }

  /**
   * Get smart quick replies based on context
   */
  getQuickReplies(context: ChatContext): string[] {
    const quickReplies: string[] = [];

    if (context.product) {
      const p = context.product;

      if (p.stock !== undefined) {
        quickReplies.push(p.stock > 0 ? 'Is this still available?' : 'When will this be restocked?');
      }

      if (p.variantLabel1Values?.length) {
        quickReplies.push('What sizes are available?');
      }
      if (p.variantLabel2Values?.length) {
        quickReplies.push('What colors can I choose?');
      }

      if (p.originalPrice && p.originalPrice > p.price) {
        quickReplies.push('How long is this sale?');
      }

      quickReplies.push(p.isFreeShipping ? 'Tell me about shipping' : 'Is there free shipping?');

      if (p.reviewCount && p.reviewCount > 0) {
        quickReplies.push('What do buyers say about this?');
      }
    }

    if (context.store && !context.product) {
      quickReplies.push(
        'Tell me about this store',
        'Is this seller reliable?',
        'What products do they sell?',
        'Where are they located?'
      );
    }

    if (quickReplies.length < 4) {
      quickReplies.push('What is the return policy?');
    }
    if (quickReplies.length < 4) {
      quickReplies.push('How do I track my order?');
    }
    if (quickReplies.length < 4) {
      quickReplies.push('What payment methods are accepted?');
    }

    return [...new Set(quickReplies)].slice(0, 4);
  }

  /**
   * Generate a professional greeting based on context
   */
  getWelcomeMessage(context: ChatContext): string {
    if (context.product && context.store) {
      return `👋 Hi there! I'm BazBot, your AI shopping assistant.\n\nI see you're looking at "${context.product.name}" from ${context.store.storeName}. I have all the details about this product and store ready for you!\n\nFeel free to ask me anything, or tap 'Talk to Seller' if you need to speak directly with the seller.`;
    } else if (context.store) {
      return `👋 Welcome! I'm BazBot, your AI shopping assistant.\n\nI can help you with any questions about ${context.store.storeName} and their products.\n\nWhat would you like to know?`;
    } else {
      return `👋 Hello! I'm BazBot, your AI shopping assistant for BazaarX.\n\nI can help you with product information, store details, shipping policies, returns, and more.\n\nHow may I assist you today?`;
    }
  }
}

export const aiChatService = new AIChatService();
