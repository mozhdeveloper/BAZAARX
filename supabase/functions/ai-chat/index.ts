/**
 * Edge Function: ai-chat
 *
 * BazBot AI Chat — powered by Qwen (Alibaba Cloud Model Studio)
 * Handles all AI chat for BazaarX web and mobile clients.
 *
 * - Fetches product/store/review context server-side
 * - Builds system prompt with Bazaar-only loyalty + PH law compliance
 * - Calls Qwen API (OpenAI-compatible)
 * - Strips markdown bold from responses
 * - Returns clean, professional response
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const QWEN_API_KEY = Deno.env.get("QWEN_API_KEY") || "";
const QWEN_API_URL =
  "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
const QWEN_MODEL = "qwen-plus-latest"; // cost-effective model with strong instruction following

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RequestBody {
  message: string;
  productId?: string | null;
  sellerId?: string | null;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  productCtx: string,
  storeCtx: string,
  reviewCtx: string,
  relatedProductsCtx: string
): string {
  return `You are BazBot, the official AI shopping assistant for BazaarX — the Philippines' premier e-commerce marketplace.

IDENTITY
- Your name is BazBot. You work exclusively for BazaarX.
- You help buyers find products, understand listings, check stock, learn about stores, and navigate the platform.
- You are warm, professional, and concise.

LOYALTY RULES
- You ONLY discuss BazaarX topics — products, stores, orders, policies, and the platform.
- NEVER mention or recommend competing platforms (Shopee, Lazada, Amazon, Zalora, Temu, TikTok Shop, etc.).
- If asked about non-BazaarX topics, politely redirect: "I'm here to help you shop on BazaarX! What can I help you find?"
- When recommending products, ONLY reference items from the BazaarX database provided below.
- If no matching products exist in the data, say so honestly — never fabricate items.

FORMATTING RULES
- NEVER use ** for bold text. Write in plain, clean text only.
- NEVER use markdown headers (#, ##, ###).
- Use bullet points (- or numbers) for lists when helpful.
- Use emojis sparingly for friendliness (1-2 per message max).
- Keep responses concise — aim for 2-5 sentences unless the buyer asks for detail.
- Write naturally as if chatting with a friend, but stay professional.
- Use the peso sign ₱ for prices.

PRODUCT KNOWLEDGE
- When asked about a product, use ALL details provided: name, description, price, stock, variants, specifications, shipping, ratings, reviews.
- Explain what the product is for and its purpose based on the description and specifications.
- If asked "is this available?" or about stock, check the stock data and variant stock.
- If asked about sizes, colors, or options, list available variants with stock counts.
- If a product is out of stock, let the buyer know and suggest they check back or contact the seller.
- For questions about product quality, refer to the review data.

STORE KNOWLEDGE
- Share store information including verification status, ratings, product count, and how long they have been a member.
- Verified sellers have their business documents confirmed by BazaarX.

BUYING PROCESS
- How to buy: Browse or search for products, select variant (size/color), Add to Cart, proceed to Checkout, choose payment method, confirm order.
- After placing an order: You receive an order confirmation, the seller prepares your item, you get tracking updates, then delivery.
- Payment options: Credit/Debit cards (Visa, Mastercard, JCB, AmEx), E-wallets (GCash, Maya, GrabPay), Bank transfer (BDO, BPI, Metrobank, UnionBank, Landbank via InstaPay/PESONet), Cash on Delivery (COD up to ₱10,000).

BAZAARX POLICIES

Shipping:
- Metro Manila: 3-5 business days
- Luzon (outside Metro Manila): 5-7 business days
- Visayas: 7-10 business days
- Mindanao: 7-12 business days
- Shipping fee starts at ₱50, varies by location and weight
- Express shipping: 1-2 days Metro Manila, 2-4 days elsewhere (+₱50-100)
- Free shipping on orders ₱1,500+ (seller-dependent)
- COD available in most areas, max ₱10,000 per order

Returns and Refunds:
- 7-day return window from delivery date
- Free returns for defective/damaged items
- Valid reasons: defective, wrong item, incomplete, not as described, change of mind
- Process: Submit return request, wait for seller approval (24-48 hours), ship back, receive refund
- Refund options: Original payment method (5-7 days), BazCoins credit (instant), Bank transfer (3-5 days)

BazCoins Rewards:
- Earn: 1 BazCoin per ₱100 spent, 10 for photo reviews, 100 for referrals, 1-5 daily check-in
- Use: 100 BazCoins = ₱1 discount, max 50% of order value, never expire

Buyer Protection:
- SSL encryption, PCI DSS compliant
- Verified seller program
- All products pass digital QA review
- Full refund for non-delivery
- Dispute resolution within 7 days

Customer Support:
- In-app chat: 24/7 AI + Human support
- Email: support@bazaarx.ph (24-hour response)
- Hotline: 1-800-BAZAAR (Mon-Sun 8AM-10PM)

PHILIPPINE E-COMMERCE LAW COMPLIANCE
- BazaarX complies with Republic Act No. 7394 (Consumer Act of the Philippines) — all product listings must be truthful and not misleading.
- Under RA 8792 (E-Commerce Act), all electronic transactions on BazaarX are legally binding.
- BazaarX follows the Data Privacy Act of 2012 (RA 10173) — buyer data is collected, stored, and processed in compliance with NPC guidelines. We never share personal data with third parties without consent.
- Per DTI Administrative Order No. 08-2020 and the Internet Transactions Act (RA 11967), buyers have the right to: accurate product information, safe transactions, return defective goods, and file complaints via DTI.
- Sellers on BazaarX are required to comply with BIR registration for online selling and issue official receipts when applicable.
- If you have a complaint, you may contact DTI at 1-384 or file at dtiphilippines.gov.ph, or contact BazaarX support directly.
- BazBot does not provide legal, medical, or financial advice. For legal concerns, consult a licensed professional.

WHAT YOU SHOULD NEVER DO
- Never fabricate product details, specs, or features not in the data
- Never promise discounts or deals you cannot verify
- Never share opinions on product quality beyond verified reviews
- Never provide medical, legal, or financial advice
- Never discuss competitors
- Never use ** bold markdown
- Never make up store information

WHEN TO SUGGEST "TALK TO SELLER"
- Price negotiations or bulk order pricing
- Custom orders or special requests
- Warranty claims for specific items
- Order issues or delivery problems
- Questions about product details not in the data
- When you genuinely cannot help with the buyer's request

${productCtx}
${storeCtx}
${reviewCtx}
${relatedProductsCtx}`;
}

// ---------------------------------------------------------------------------
// Context fetchers
// ---------------------------------------------------------------------------

async function fetchProductContext(
  supabase: ReturnType<typeof createClient>,
  productId: string
): Promise<{ ctx: string; categoryId: string | null; sellerId: string | null }> {
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, description, price, brand, sku,
       specifications, low_stock_threshold, is_free_shipping,
       weight, dimensions, approval_status, disabled_at, category_id, seller_id,
       category:categories!products_category_id_fkey(id, name),
       images:product_images(image_url, is_primary),
       variants:product_variants(id, sku, variant_name, size, color, price, stock)`
    )
    .eq("id", productId)
    .single();

  if (error || !data) return { ctx: "", categoryId: null, sellerId: null };

  const totalStock =
    data.variants?.reduce(
      (sum: number, v: { stock?: number }) => sum + (v.stock || 0),
      0
    ) || 0;
  const cat = data.category as { id?: string; name?: string } | null;
  const categoryName = cat?.name || "Not specified";

  const stockStatus =
    totalStock === 0
      ? "OUT OF STOCK"
      : data.low_stock_threshold && totalStock <= data.low_stock_threshold
      ? `Low Stock (${totalStock} left)`
      : `In Stock (${totalStock} available)`;

  const sizes = [
    ...new Set(
      data.variants
        ?.map((v: { size?: string }) => v.size)
        .filter(Boolean) || []
    ),
  ];
  const colors = [
    ...new Set(
      data.variants
        ?.map((v: { color?: string }) => v.color)
        .filter(Boolean) || []
    ),
  ];

  const specLines =
    data.specifications && typeof data.specifications === "object"
      ? Object.entries(data.specifications)
          .map(([k, v]) => `  - ${k}: ${v}`)
          .join("\n")
      : "";

  const variantLines =
    data.variants && data.variants.length > 0
      ? data.variants
          .slice(0, 10)
          .map(
            (v: { color?: string; size?: string; stock?: number; price?: number }) =>
              `  - ${v.color || ""} ${v.size || ""}: ${v.stock || 0} in stock${v.price ? ` (₱${v.price})` : ""}`
          )
          .join("\n")
      : "";

  const ctx = `
CURRENT PRODUCT
  Name: ${data.name}
  Price: ₱${data.price?.toLocaleString() || "N/A"}
  Category: ${categoryName}
  Brand: ${data.brand || "Unbranded"}
  Stock: ${stockStatus}
  ${sizes.length ? `Available Sizes: ${sizes.join(", ")}` : ""}
  ${colors.length ? `Available Colors: ${colors.join(", ")}` : ""}
  Free Shipping: ${data.is_free_shipping ? "Yes" : "No"}
  ${data.weight ? `Weight: ${data.weight} kg` : ""}
  Description: ${data.description || "No description provided."}
  ${specLines ? `Specifications:\n${specLines}` : ""}
  ${variantLines ? `Variants:\n${variantLines}` : ""}`;

  return {
    ctx,
    categoryId: data.category_id || cat?.id || null,
    sellerId: data.seller_id || null,
  };
}

async function fetchStoreContext(
  supabase: ReturnType<typeof createClient>,
  sellerId: string
): Promise<string> {
  const { data: seller, error } = await supabase
    .from("sellers")
    .select(
      "id, store_name, store_description, owner_name, approval_status, verified_at, created_at"
    )
    .eq("id", sellerId)
    .single();

  if (error || !seller) return "";

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .is("disabled_at", null)
    .eq("approval_status", "approved");

  const memberSince = seller.created_at
    ? new Date(seller.created_at).toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
      })
    : "Unknown";

  const verified =
    seller.approval_status === "verified" && seller.verified_at
      ? "Yes - Business documents verified"
      : "Not yet verified";

  return `
STORE INFORMATION
  Store Name: ${seller.store_name}
  Owner: ${seller.owner_name || seller.store_name}
  Verified: ${verified}
  Products Listed: ${productCount || 0}
  Member Since: ${memberSince}
  About: ${seller.store_description || "No description available."}`;
}

async function fetchReviewContext(
  supabase: ReturnType<typeof createClient>,
  productId?: string | null,
  sellerId?: string | null
): Promise<string> {
  if (!productId && !sellerId) return "";

  let query = supabase
    .from("reviews")
    .select("rating, comment, created_at")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(5);

  if (productId) query = query.eq("product_id", productId);
  else if (sellerId) query = query.eq("seller_id", sellerId);

  const { data: reviews } = await query;
  if (!reviews || reviews.length === 0) return "";

  const totalReviews = reviews.length;
  const avg =
    Math.round(
      (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews) * 10
    ) / 10;

  const lines = reviews
    .slice(0, 3)
    .map(
      (r) =>
        `  - Rating ${r.rating}/5: "${(r.comment || "No comment").slice(0, 120)}"`
    )
    .join("\n");

  return `
REVIEWS
  Average Rating: ${avg}/5 (${totalReviews} recent reviews)
  Recent:
${lines}`;
}

async function fetchRelatedProducts(
  supabase: ReturnType<typeof createClient>,
  categoryId: string | null,
  sellerId: string | null,
  excludeId: string | null
): Promise<string> {
  const sections: string[] = [];

  // Same-category products
  if (categoryId) {
    let q = supabase
      .from("products")
      .select("id, name, price, brand")
      .eq("category_id", categoryId)
      .is("disabled_at", null)
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(5);

    if (excludeId) q = q.neq("id", excludeId);

    const { data } = await q;
    if (data && data.length > 0) {
      const lines = data
        .map(
          (p: { name: string; price: number; brand?: string }) =>
            `  - ${p.name} — ₱${p.price?.toLocaleString()}${p.brand ? ` (${p.brand})` : ""}`
        )
        .join("\n");
      sections.push(`Similar Products on BazaarX:\n${lines}`);
    }
  }

  // Same-seller products
  if (sellerId) {
    let q = supabase
      .from("products")
      .select("id, name, price, brand")
      .eq("seller_id", sellerId)
      .is("disabled_at", null)
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false })
      .limit(5);

    if (excludeId) q = q.neq("id", excludeId);

    const { data } = await q;
    if (data && data.length > 0) {
      const lines = data
        .map(
          (p: { name: string; price: number; brand?: string }) =>
            `  - ${p.name} — ₱${p.price?.toLocaleString()}${p.brand ? ` (${p.brand})` : ""}`
        )
        .join("\n");
      sections.push(`More From This Store:\n${lines}`);
    }
  }

  if (sections.length === 0) return "";
  return `\nRECOMMENDATIONS (Only suggest these BazaarX products)\n${sections.join("\n")}`;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { message, productId, sellerId, conversationHistory } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!QWEN_API_KEY) {
      return new Response(
        JSON.stringify({
          response:
            "I'm temporarily unavailable. Please tap 'Talk to Seller' for direct help.",
          suggestTalkToSeller: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create supabase client with service role for server-side fetching
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch context in parallel
    let productCtx = "";
    let storeCtx = "";
    let reviewCtx = "";
    let relatedCtx = "";
    let resolvedSellerId = sellerId || null;
    let categoryId: string | null = null;

    if (productId) {
      const product = await fetchProductContext(supabase, productId);
      productCtx = product.ctx;
      categoryId = product.categoryId;
      if (product.sellerId) resolvedSellerId = product.sellerId;
    }

    // Fetch store, reviews, and related products in parallel
    const [storeResult, reviewResult] = await Promise.all([
      resolvedSellerId
        ? fetchStoreContext(supabase, resolvedSellerId)
        : Promise.resolve(""),
      fetchReviewContext(supabase, productId, resolvedSellerId),
    ]);
    storeCtx = storeResult;
    reviewCtx = reviewResult;

    // Related products (needs categoryId from product fetch)
    relatedCtx = await fetchRelatedProducts(
      supabase,
      categoryId,
      resolvedSellerId,
      productId || null
    );

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      productCtx,
      storeCtx,
      reviewCtx,
      relatedCtx
    );

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
    ];

    // Add conversation history (max 10 messages)
    const history = (conversationHistory || []).slice(-10);
    for (const msg of history) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: message });

    // Call Qwen API
    const qwenResponse = await fetch(QWEN_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${QWEN_API_KEY}`,
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 800,
        top_p: 0.9,
      }),
    });

    if (!qwenResponse.ok) {
      const errBody = await qwenResponse.text();
      console.error("[ai-chat] Qwen API error:", qwenResponse.status, errBody);

      // Surface specific error info for debugging
      const isAuthError = qwenResponse.status === 401;
      return new Response(
        JSON.stringify({
          response: isAuthError
            ? "BazBot is being configured. Please tap 'Talk to Seller' for direct help, or try again later."
            : "I'm having a brief technical issue. Please try again in a moment, or tap 'Talk to Seller' for immediate help.",
          suggestTalkToSeller: true,
          _debug: { status: qwenResponse.status, authError: isAuthError },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const qwenData = await qwenResponse.json();
    let aiText: string =
      qwenData.choices?.[0]?.message?.content ||
      "I couldn't process your request right now. Please try again or tap 'Talk to Seller'.";

    // Strip any thinking tags from thinking models
    aiText = aiText.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

    // Strip all ** markdown bold — clean responses only
    aiText = aiText.replace(/\*\*/g, "");

    // Strip markdown headers
    aiText = aiText.replace(/^#{1,6}\s+/gm, "");

    // Detect "talk to seller" suggestion
    const lower = aiText.toLowerCase();
    const suggestTalkToSeller =
      lower.includes("talk to the seller") ||
      lower.includes("talk to seller") ||
      lower.includes("contact the seller") ||
      lower.includes("reach out to the seller") ||
      lower.includes("ask the seller") ||
      lower.includes("message the seller") ||
      lower.includes("directly with the seller");

    return new Response(
      JSON.stringify({ response: aiText, suggestTalkToSeller }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[ai-chat] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        response:
          "Something went wrong. Please try again or tap 'Talk to Seller'.",
        suggestTalkToSeller: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
