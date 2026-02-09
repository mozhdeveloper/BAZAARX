/**
 * AI Chat Service - Gemini 2.5 Flash powered professional chat assistant
 * Provides intelligent, professional responses about products, stores, and BazaarX policies
 * 
 * Features:
 * - Complete product analysis with all details
 * - Comprehensive store information
 * - Professional and helpful responses
 * - Context-aware conversation
 */

import { supabase } from '../lib/supabase';

// API Key - try environment variable first, fallback to hardcoded for development
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
// Using gemini-1.5-flash for better availability (2.0-flash-lite may have access issues)
const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Check if AI is available
const isAIAvailable = () => !!GEMINI_API_KEY;

export interface ProductContext {
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
  variants?: Array<{ size?: string; color?: string; stock?: number; price?: number }>;
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

// BazaarX Platform Policies and Information - Comprehensive
const BAZAARX_POLICIES = `
# BazaarX Platform - Complete Information & Policies

## About BazaarX
BazaarX is the Philippines' premier e-commerce marketplace, connecting Filipino buyers with trusted local and international sellers. We offer a wide selection of products across all categories including Fashion, Electronics, Home & Living, Beauty, Sports, and more. Our platform is designed to provide a seamless, secure, and enjoyable shopping experience.

## Shipping Information

### Standard Shipping
- **Metro Manila**: 3-5 business days
- **Luzon (outside Metro Manila)**: 5-7 business days
- **Visayas**: 7-10 business days
- **Mindanao**: 7-12 business days
- **Shipping Fee**: Starts at ₱50, varies by location and weight

### Express Shipping
- **Metro Manila**: 1-2 business days
- **Other Areas**: 2-4 business days
- **Additional Fee**: ₱50-100 on top of standard shipping

### Free Shipping
- Orders ₱1,500 and above qualify for free shipping (seller-dependent)
- Look for the 🚚 Free Shipping badge on products
- Some sellers offer free shipping on all orders

### Cash on Delivery (COD)
- Available in most areas nationwide
- Maximum COD limit: ₱10,000 per order
- Pay with cash upon delivery
- COD fee: ₱0-50 depending on seller

### Order Tracking
- Real-time tracking available in app and website
- SMS and email notifications at every stage
- Estimated delivery date shown at checkout

## Return & Refund Policy

### 7-Day Easy Returns
- Return window: 7 days from delivery date
- Free returns for defective/damaged items
- Return shipping may apply for change of mind

### Valid Return Reasons
1. **Defective/Damaged**: Item arrived broken or not working
2. **Wrong Item**: Received different product than ordered
3. **Incomplete**: Missing parts or accessories
4. **Not as Described**: Significant difference from listing
5. **Change of Mind**: 7-day return (buyer pays return shipping)

### Return Process
1. Submit return request in app/website
2. Wait for seller approval (24-48 hours)
3. Ship item back or schedule pickup
4. Receive refund after inspection

### Refund Options
- **Original Payment Method**: 5-7 business days
- **BazCoins Credit**: Instant (100 BazCoins = ₱1)
- **Bank Transfer**: 3-5 business days

## Payment Methods

### Credit/Debit Cards
- Visa, Mastercard, JCB, American Express
- Secure 3D verification
- Save cards for faster checkout

### E-Wallets
- GCash - Instant payment
- Maya - Instant payment
- GrabPay - Instant payment
- ShopeePay - Instant payment

### Bank Transfer
- BDO, BPI, Metrobank, UnionBank, Landbank
- InstaPay for instant transfer
- PESONet for next-day transfer

### Cash on Delivery (COD)
- Pay when you receive
- No advance payment needed
- Exact change preferred

### BazCoins
- Use earned BazCoins as payment
- 100 BazCoins = ₱1 discount
- Can be combined with other payment methods

## BazCoins Rewards Program

### Earning BazCoins
- **Purchases**: 1 BazCoin per ₱100 spent
- **Reviews**: 10 BazCoins for verified purchase reviews with photos
- **Referrals**: 100 BazCoins when friend makes first purchase
- **Daily Check-in**: 1-5 BazCoins daily
- **Special Events**: Bonus BazCoins during sales

### Using BazCoins
- Minimum 100 BazCoins to use (₱1 value)
- Maximum 50% of order value can be paid with BazCoins
- BazCoins never expire
- Cannot be converted to cash

## Buyer Protection Guarantee

### Secure Transactions
- SSL encryption on all payments
- PCI DSS compliant payment processing
- Two-factor authentication available

### Verified Sellers
- ✓ Verified badge = Business documents verified
- Identity and address confirmation
- Track record monitoring

### Quality Assurance
- All products pass digital QA review
- Counterfeit items strictly prohibited
- Report and investigation system

### Purchase Protection
- Full refund for non-delivery
- Return protection for defective items
- Dispute resolution within 7 days

## Customer Support

### Contact Channels
- **In-App Chat**: 24/7 AI + Human support
- **Email**: support@bazaarx.ph (Response: 24 hours)
- **Hotline**: 1-800-BAZAAR (Mon-Sun 8AM-10PM)
- **Social Media**: Facebook, Twitter, Instagram

### Help Center
- Extensive FAQ database
- Video tutorials
- Order tracking guide
- Return/refund guide

## Seller Ratings Explained
- ⭐⭐⭐⭐⭐ (4.8-5.0): Premium Seller - Exceptional service
- ⭐⭐⭐⭐ (4.0-4.7): Trusted Seller - Reliable and consistent
- ⭐⭐⭐ (3.0-3.9): Standard Seller - Generally satisfactory
- ⭐⭐ (2.0-2.9): Needs Improvement - Some issues reported
- ⭐ (Below 2.0): High Risk - Exercise extreme caution

## Product Authenticity
- QA team verifies all listed products
- Authenticity guarantee on branded items
- Report suspicious listings
- Full refund for counterfeit items
`;

class AIChatService {
  private conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  /**
   * Fetch complete product details from database
   */
  async getProductDetails(productId: string): Promise<ProductContext | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, brand, sku,
          specifications, low_stock_threshold, is_free_shipping,
          weight, dimensions, approval_status, disabled_at,
          category:categories!products_category_id_fkey(id, name, slug),
          images:product_images(image_url, is_primary),
          variants:product_variants(id, sku, variant_name, size, color, price, stock)
        `)
        .eq('id', productId)
        .single();

      if (error || !data) {
        console.error('Error fetching product:', error);
        return null;
      }

      const primaryImage = data.images?.find((img: any) => img.is_primary) || data.images?.[0];
      const totalStock = data.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0;
      const categoryData = data.category as any;
      const categoryName = categoryData?.name || '';

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        price: data.price,
        originalPrice: undefined,
        discountPercentage: 0,
        category: categoryName,
        brand: data.brand || '',
        colors: [...new Set(data.variants?.map((v: any) => v.color).filter(Boolean))] as string[],
        sizes: [...new Set(data.variants?.map((v: any) => v.size).filter(Boolean))] as string[],
        variants: data.variants || [],
        specifications: data.specifications || {},
        stock: totalStock,
        lowStockThreshold: data.low_stock_threshold,
        rating: 0,
        reviewCount: 0,
        salesCount: 0,
        images: data.images?.map((img: any) => img.image_url) || [],
        isFreeShipping: data.is_free_shipping,
        weight: data.weight,
        dimensions: data.dimensions,
        tags: [],
        isActive: !data.disabled_at,
        approvalStatus: data.approval_status,
      };
    } catch (error) {
      console.error('Error in getProductDetails:', error);
      return null;
    }
  }

  /**
   * Fetch complete store details from database
   */
  async getStoreDetails(sellerId: string): Promise<StoreContext | null> {
    try {
      // Try simple query first (core columns that should always exist)
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id, store_name, store_description, avatar_url, owner_name, approval_status, verified_at')
        .eq('id', sellerId)
        .single();

      if (sellerError || !seller) {
        console.warn('Could not fetch seller:', sellerError);
        return null;
      }

      // Fetch product count for this seller
      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', sellerId)
        .is('disabled_at', null)
        .eq('approval_status', 'approved');

      // Fetch follower count (handle if table doesn't exist)
      // Note: shop_followers table may not exist in this database schema
      let followerCount = 0;
      // Skip follower query since table doesn't exist in current schema

      return {
        id: seller.id,
        storeName: seller.store_name,
        businessName: seller.owner_name,
        storeDescription: seller.store_description,
        storeCategory: [],
        businessType: (seller as any).business_type || '',
        rating: 4.5,
        totalSales: 0,
        isVerified: seller.approval_status === 'approved',
        approvalStatus: seller.approval_status,
        city: (seller as any).city || '',
        province: (seller as any).province || '',
        postalCode: '',
        businessAddress: '',
        joinDate: seller.verified_at,
        productCount: productCount || 0,
        followerCount: followerCount,
        responseTime: '< 1 hour',
        policies: {
          shipping: 'Standard shipping available',
          returns: 'Returns accepted within 7 days',
          warranty: 'As per manufacturer',
        },
      };
    } catch (error) {
      console.error('Error in getStoreDetails:', error);
      return null;
    }
  }

  /**
   * Fetch review summary for product or seller
   */
  async getReviewSummary(productId?: string, sellerId?: string): Promise<ReviewSummary | null> {
    try {
      let query = supabase
        .from('reviews')
        .select(`
          rating, comment, created_at, buyer_id
        `)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (productId) {
        query = query.eq('product_id', productId);
      } else if (sellerId) {
        query = query.eq('seller_id', sellerId);
      } else {
        return null;
      }

      const { data: reviews, error } = await query;

      if (error) {
        console.error('Error fetching reviews:', error);
        return null;
      }

      // Get rating distribution
      const ratingQuery = supabase
        .from('reviews')
        .select('rating')
        .eq('is_hidden', false);

      if (productId) {
        ratingQuery.eq('product_id', productId);
      } else if (sellerId) {
        ratingQuery.eq('seller_id', sellerId);
      }

      const { data: allRatings } = await ratingQuery;

      const ratingCounts = {
        5: 0, 4: 0, 3: 0, 2: 0, 1: 0
      };

      allRatings?.forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) {
          ratingCounts[r.rating as keyof typeof ratingCounts]++;
        }
      });

      const totalReviews = allRatings?.length || 0;
      const averageRating = totalReviews > 0
        ? allRatings!.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalReviews,
        fiveStarCount: ratingCounts[5],
        fourStarCount: ratingCounts[4],
        threeStarCount: ratingCounts[3],
        twoStarCount: ratingCounts[2],
        oneStarCount: ratingCounts[1],
        recentReviews: reviews?.map(r => ({
          rating: r.rating,
          comment: r.comment || '',
          buyerName: 'Anonymous', // Simplified - can enhance later by fetching from profiles
          date: r.created_at,
        })) || [],
      };
    } catch (error) {
      console.error('Error in getReviewSummary:', error);
      return null;
    }
  }

  /**
   * Build comprehensive system prompt with all context
   */
  private buildSystemPrompt(context: ChatContext): string {
    let systemPrompt = `You are BazBot, the professional AI shopping assistant for BazaarX, the Philippines' leading e-commerce marketplace. Your role is to provide helpful, accurate, and professional assistance to buyers.

## Your Professional Standards
1. Be warm, professional, and courteous at all times
2. Provide accurate information based ONLY on the data provided - never fabricate details
3. Structure responses clearly with good formatting
4. Use appropriate emojis sparingly for friendliness (not excessively)
5. For questions you cannot answer with available data, politely suggest "Talk to Seller"
6. Always prioritize the customer's best interest

## Communication Style
- Professional yet approachable tone
- Clear and concise responses
- Use bullet points for lists
- Highlight important information (prices, stock status, shipping)
- Acknowledge the customer's question before answering

## Response Guidelines
1. **Product Questions**: Answer with specific details from the product data
2. **Store Questions**: Provide store information with trust indicators (verified status, ratings, sales)
3. **Policy Questions**: Quote specific policies accurately
4. **Comparison/Recommendations**: Only compare based on available data
5. **Price Negotiations/Custom Requests**: Direct to seller
6. **Order Issues/Shipping Updates**: Direct to seller or customer support
7. **Technical Issues**: Direct to customer support

## What You Should NEVER Do
- Make up product specifications or features not in the data
- Promise discounts or deals you cannot verify
- Share personal opinions on product quality beyond verified reviews
- Provide medical, legal, or financial advice
- Discuss competitors negatively

${BAZAARX_POLICIES}
`;

    // Add comprehensive product context
    if (context.product) {
      const p = context.product;
      const stockStatus = p.stock === 0 ? '❌ OUT OF STOCK' 
        : p.stock && p.lowStockThreshold && p.stock <= p.lowStockThreshold 
        ? `⚠️ Low Stock (${p.stock} left)` 
        : p.stock ? `✅ In Stock (${p.stock} available)` : 'Stock info unavailable';

      systemPrompt += `

## 📦 CURRENT PRODUCT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Product Name**: ${p.name}
**Product ID**: ${p.id}

### Pricing
- **Current Price**: ₱${p.price?.toLocaleString() || 'N/A'}
${p.originalPrice && p.originalPrice > p.price ? `- **Original Price**: ₱${p.originalPrice.toLocaleString()} (${p.discountPercentage}% OFF! 🔥)` : ''}

### Category & Brand
- **Category**: ${p.category || 'Not specified'}
- **Brand**: ${p.brand || 'Unbranded/Generic'}

### Availability
- **Stock Status**: ${stockStatus}
${p.sizes?.length ? `- **Available Sizes**: ${p.sizes.join(', ')}` : ''}
${p.colors?.length ? `- **Available Colors**: ${p.colors.join(', ')}` : ''}

### Shipping
- **Free Shipping**: ${p.isFreeShipping ? '✅ Yes! Free shipping on this item' : '❌ Standard shipping rates apply'}
${p.weight ? `- **Weight**: ${p.weight} kg` : ''}
${p.dimensions ? `- **Dimensions**: ${p.dimensions.length || 0}×${p.dimensions.width || 0}×${p.dimensions.height || 0} cm` : ''}

### Ratings & Reviews
- **Rating**: ${p.rating ? `⭐ ${p.rating}/5` : 'No ratings yet'}
- **Total Reviews**: ${p.reviewCount || 0}
- **Units Sold**: ${p.salesCount || 0}

### Product Description
${p.description || 'No description provided.'}

${p.specifications && Object.keys(p.specifications).length > 0 ? `### Specifications
${Object.entries(p.specifications).map(([key, value]) => `- **${key}**: ${value}`).join('\n')}` : ''}

${p.variants && p.variants.length > 0 ? `### Variant Options
${p.variants.slice(0, 10).map(v => `- ${v.color || ''} ${v.size || ''}: ${v.stock || 0} in stock${v.price ? ` (₱${v.price})` : ''}`).join('\n')}
${p.variants.length > 10 ? `\n... and ${p.variants.length - 10} more variants` : ''}` : ''}

${p.tags?.length ? `### Tags
${p.tags.join(', ')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    // Add comprehensive store context
    if (context.store) {
      const s = context.store;
      const memberSince = s.joinDate ? new Date(s.joinDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long' }) : 'Unknown';
      
      let sellerBadge = '';
      if (s.rating && s.rating >= 4.8) sellerBadge = '🏆 Premium Seller';
      else if (s.rating && s.rating >= 4.0) sellerBadge = '⭐ Trusted Seller';
      else if (s.rating && s.rating >= 3.0) sellerBadge = '✓ Standard Seller';
      else sellerBadge = 'New Seller';

      systemPrompt += `

## 🏪 STORE/SELLER INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Store Name**: ${s.storeName}
**Business Name**: ${s.businessName || s.storeName}
**Seller Badge**: ${sellerBadge}

### Trust Indicators
- **Verified Seller**: ${s.isVerified ? '✅ Yes - Business documents verified' : '❌ Not yet verified'}
- **Seller Rating**: ${s.rating ? `⭐ ${s.rating}/5` : 'No rating yet'}
- **Total Sales**: ${s.totalSales?.toLocaleString() || 0} successful orders
- **Products Listed**: ${s.productCount || 0} active products
- **Followers**: ${s.followerCount?.toLocaleString() || 0}
- **Member Since**: ${memberSince}

### Store Categories
${s.storeCategory?.length ? s.storeCategory.join(', ') : 'Various products'}

### Location
${s.city && s.province ? `📍 ${s.city}, ${s.province}` : 'Location not specified'}
${s.businessAddress ? `\n📮 ${s.businessAddress}` : ''}

### About This Store
${s.storeDescription || 'No store description available.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    // Add review context if available
    if (context.reviews && context.reviews.totalReviews > 0) {
      const r = context.reviews;
      systemPrompt += `

## 📝 REVIEW SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Average Rating**: ⭐ ${r.averageRating}/5 (${r.totalReviews} reviews)

### Rating Distribution
- ⭐⭐⭐⭐⭐ (5 stars): ${r.fiveStarCount} reviews (${Math.round(r.fiveStarCount / r.totalReviews * 100)}%)
- ⭐⭐⭐⭐ (4 stars): ${r.fourStarCount} reviews (${Math.round(r.fourStarCount / r.totalReviews * 100)}%)
- ⭐⭐⭐ (3 stars): ${r.threeStarCount} reviews (${Math.round(r.threeStarCount / r.totalReviews * 100)}%)
- ⭐⭐ (2 stars): ${r.twoStarCount} reviews (${Math.round(r.twoStarCount / r.totalReviews * 100)}%)
- ⭐ (1 star): ${r.oneStarCount} reviews (${Math.round(r.oneStarCount / r.totalReviews * 100)}%)

${r.recentReviews.length > 0 ? `### Recent Reviews
${r.recentReviews.slice(0, 3).map(rev => `- **${rev.buyerName}** (⭐${rev.rating}): "${rev.comment.slice(0, 100)}${rev.comment.length > 100 ? '...' : ''}"`).join('\n')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
    }

    return systemPrompt;
  }

  /**
   * Send message to Gemini AI and get professional response
   */
  async sendMessage(
    userMessage: string,
    context: ChatContext
  ): Promise<{ response: string; suggestTalkToSeller: boolean }> {
    if (!GEMINI_API_KEY) {
      console.error('Gemini API key not configured');
      return {
        response: "I apologize, but I'm currently unavailable. Please tap 'Talk to Seller' to get assistance directly from the seller.",
        suggestTalkToSeller: true,
      };
    }

    // Add user message to history
    this.conversationHistory.push({ role: 'user', content: userMessage });

    // Keep only last 10 messages for context
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    // Build the conversation for Gemini
    const systemPrompt = this.buildSystemPrompt(context);

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: systemPrompt }],
            },
            {
              role: 'model',
              parts: [{ text: "Understood! I'm BazBot, your professional shopping assistant. I have complete access to the product and store information provided. I'll give accurate, helpful responses and direct customers to the seller when appropriate. How may I assist you today?" }],
            },
            ...this.conversationHistory.map((msg) => ({
              role: msg.role === 'user' ? 'user' : 'model',
              parts: [{ text: msg.content }],
            })),
          ],
          generationConfig: {
            temperature: 0.6, // Slightly lower for more consistent/professional responses
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 800, // Allow longer responses for detailed answers
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn('Gemini API error:', response.status, errorData);
        
        // Provide helpful fallback response based on context
        const fallbackResponse = this.generateFallbackResponse(userMessage, context);
        return {
          response: fallbackResponse,
          suggestTalkToSeller: true,
        };
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 
        "I apologize, but I couldn't process your request. Please try again or tap 'Talk to Seller' for direct assistance.";

      // Add AI response to history
      this.conversationHistory.push({ role: 'assistant', content: aiResponse });

      // Check if AI is suggesting to talk to seller
      const suggestTalkToSeller = 
        aiResponse.toLowerCase().includes('talk to the seller') ||
        aiResponse.toLowerCase().includes('talk to seller') ||
        aiResponse.toLowerCase().includes('contact the seller') ||
        aiResponse.toLowerCase().includes('reach out to the seller') ||
        aiResponse.toLowerCase().includes('ask the seller') ||
        aiResponse.toLowerCase().includes('message the seller') ||
        aiResponse.toLowerCase().includes('directly with the seller');

      return {
        response: aiResponse,
        suggestTalkToSeller,
      };
    } catch (error) {
      console.warn('Error calling Gemini API:', error);
      const fallbackResponse = this.generateFallbackResponse(userMessage, context);
      return {
        response: fallbackResponse,
        suggestTalkToSeller: true,
      };
    }
  }
  
  /**
   * Generate a helpful fallback response when AI is unavailable
   */
  private generateFallbackResponse(userMessage: string, context: ChatContext): string {
    const lowerMessage = userMessage.toLowerCase();
    const product = context.product;
    const store = context.store;
    
    // Price-related questions
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('how much')) {
      if (product) {
        return `The ${product.name} is priced at ₱${product.price?.toLocaleString()}${product.originalPrice ? ` (was ₱${product.originalPrice.toLocaleString()})` : ''}. For more details or to negotiate, tap 'Talk to Seller'.`;
      }
    }
    
    // Stock/availability questions
    if (lowerMessage.includes('stock') || lowerMessage.includes('available') || lowerMessage.includes('left')) {
      if (product && product.stock !== undefined) {
        return `We have ${product.stock} units of ${product.name} in stock. Would you like to add it to your cart? For bulk orders, tap 'Talk to Seller'.`;
      }
    }
    
    // Size/color questions
    if (lowerMessage.includes('size') || lowerMessage.includes('color') || lowerMessage.includes('variant')) {
      if (product) {
        const sizes = product.sizes?.length ? `Sizes: ${product.sizes.join(', ')}` : '';
        const colors = product.colors?.length ? `Colors: ${product.colors.join(', ')}` : '';
        if (sizes || colors) {
          return `Available options for ${product.name}: ${[sizes, colors].filter(Boolean).join('. ')}. Select your preference and add to cart!`;
        }
      }
    }
    
    // Shipping questions
    if (lowerMessage.includes('ship') || lowerMessage.includes('delivery') || lowerMessage.includes('deliver')) {
      return `Standard shipping is available for all orders. Free shipping on orders over ₱500! For specific delivery times to your area, tap 'Talk to Seller'.`;
    }
    
    // Return/refund questions
    if (lowerMessage.includes('return') || lowerMessage.includes('refund') || lowerMessage.includes('warranty')) {
      return `Returns are accepted within 7 days of delivery for items in original condition. For warranty claims, tap 'Talk to Seller' to discuss your specific situation.`;
    }
    
    // Default fallback
    if (product) {
      return `Thank you for your interest in ${product.name}! This item is priced at ₱${product.price?.toLocaleString()}${product.stock ? ` with ${product.stock} units available` : ''}. For personalized assistance, tap 'Talk to Seller'.`;
    }
    
    if (store) {
      return `Welcome to ${store.storeName}! For any questions about products or orders, tap 'Talk to Seller' to chat directly with the shop owner.`;
    }
    
    return "I'm here to help! For personalized assistance with your shopping needs, tap 'Talk to Seller' to connect directly with the shop.";
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
      // Insert into seller_chat_requests table
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
        // Continue to create notification even if chat request fails
      }

      // Create a notification for the seller
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: sellerId,
        user_type: 'seller',
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
        is_read: false,
        priority: 'high',
        created_at: new Date().toISOString(),
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

    // Product-specific quick replies
    if (context.product) {
      const p = context.product;
      
      // Stock-related
      if (p.stock !== undefined) {
        quickReplies.push(p.stock > 0 ? 'Is this still available?' : 'When will this be restocked?');
      }
      
      // Variant-related
      if (p.sizes?.length) {
        quickReplies.push('What sizes are available?');
      }
      if (p.colors?.length) {
        quickReplies.push('What colors can I choose?');
      }
      
      // Price-related
      if (p.originalPrice && p.originalPrice > p.price) {
        quickReplies.push('How long is this sale?');
      }
      
      // Shipping
      quickReplies.push(p.isFreeShipping ? 'Tell me about shipping' : 'Is there free shipping?');
      
      // Quality
      if (p.reviewCount && p.reviewCount > 0) {
        quickReplies.push('What do buyers say about this?');
      }
    }

    // Store-specific quick replies
    if (context.store && !context.product) {
      quickReplies.push(
        'Tell me about this store',
        'Is this seller reliable?',
        'What products do they sell?',
        'Where are they located?'
      );
    }

    // Always include these general options
    if (quickReplies.length < 4) {
      quickReplies.push('What is the return policy?');
    }
    if (quickReplies.length < 4) {
      quickReplies.push('How do I track my order?');
    }
    if (quickReplies.length < 4) {
      quickReplies.push('What payment methods are accepted?');
    }

    // Return unique quick replies, max 4
    return [...new Set(quickReplies)].slice(0, 4);
  }

  /**
   * Generate a professional greeting based on context
   */
  getWelcomeMessage(context: ChatContext): string {
    if (context.product && context.store) {
      return `👋 Hi there! I'm BazBot, your AI shopping assistant.\n\nI see you're looking at **"${context.product.name}"** from **${context.store.storeName}**. I have all the details about this product and store ready for you!\n\nFeel free to ask me anything, or tap 'Talk to Seller' if you need to speak directly with the seller.`;
    } else if (context.store) {
      return `👋 Welcome! I'm BazBot, your AI shopping assistant.\n\nI can help you with any questions about **${context.store.storeName}** and their products.\n\nWhat would you like to know?`;
    } else {
      return `👋 Hello! I'm BazBot, your AI shopping assistant for BazaarX.\n\nI can help you with product information, store details, shipping policies, returns, and more.\n\nHow may I assist you today?`;
    }
  }
}

export const aiChatService = new AIChatService();
