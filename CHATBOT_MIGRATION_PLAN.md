# BazBot Chatbot Migration Plan
## Gemini → Qwen (Edge Function Architecture)

---

## Overview

Migrate BazBot from client-side Google Gemini 2.5 Flash to a server-side Supabase Edge Function powered by Alibaba Cloud Qwen API. This secures the API key, enforces Bazaar-only loyalty, eliminates markdown bold formatting, and enables smarter product/store recommendations from the database.

---

## Current Architecture

```
[Web Client]  ──→  Gemini API (direct, VITE_GEMINI_API_KEY exposed)
[Mobile App]  ──→  Gemini API (direct, EXPO_PUBLIC_GEMINI_API_KEY exposed)
```

- **Model**: `gemini-2.5-flash`
- **API Key**: Exposed in client-side environment variables
- **System Prompt**: Built client-side with product/store/review context
- **Conversation History**: 10-message sliding window, client-side only
- **Files**:
  - `web/src/services/aiChatService.ts` (851 lines)
  - `mobile-app/src/services/aiChatService.ts` (274 lines)
  - `web/src/components/AIChatModal.tsx`
  - `mobile-app/src/components/AIChatModal.tsx`
  - `mobile-app/src/components/AIChatBubble.tsx`

---

## Target Architecture

```
[Web Client]  ──→  supabase.functions.invoke('ai-chat')  ──→  Qwen API
[Mobile App]  ──→  supabase.functions.invoke('ai-chat')  ──→  Qwen API
```

- **Model**: `qwen-turbo-latest` (cheapest, fastest production model)
- **API Key**: Server-side only (Edge Function secret)
- **Endpoint**: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions` (OpenAI-compatible)
- **Philippine Law Compliance**: RA 7394, RA 8792, RA 10173, RA 11967

---

## Implementation Steps

### Step 1: Create the Edge Function ✅ COMPLETED

**File**: `supabase/functions/ai-chat/index.ts`

**Responsibilities**:
- Receive user message, context IDs (productId, sellerId), and conversation history from client
- Fetch product/store/review data server-side from Supabase (no longer trust client context)
- Build system prompt with Bazaar-loyal rules and clean formatting directives
- Call Qwen API via OpenAI-compatible endpoint
- Strip any `**` from the response before returning
- Return AI response + suggestTalkToSeller flag

**Request body**:
```json
{
  "message": "Is this available?",
  "productId": "uuid-or-null",
  "sellerId": "uuid-or-null",
  "conversationHistory": [
    { "role": "user", "content": "Hi" },
    { "role": "assistant", "content": "Hello!" }
  ]
}
```

**Response body**:
```json
{
  "response": "Yes, this item is currently in stock with 15 units available.",
  "suggestTalkToSeller": false
}
```

**Qwen API call format** (OpenAI-compatible):
```typescript
const response = await fetch(
  'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${QWEN_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'qwen-turbo-latest',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ],
      temperature: 0.6,
      max_tokens: 800,
      top_p: 0.9,
    }),
  }
);

const data = await response.json();
let aiText = data.choices[0].message.content;

// Strip all ** markdown bold
aiText = aiText.replace(/\*\*/g, '');
```

---

### Step 2: Set Edge Function Secret ✅ COMPLETED

```bash
supabase secrets set QWEN_API_KEY=sk-ba4d24a6a1c14b83ad3ff93293babdc3
```

No client-side env vars needed. The API key never leaves the server.

---

### Step 3: Updated System Prompt ✅ COMPLETED

The system prompt moves server-side. Key changes from current:

**Bazaar loyalty rule** (new):
```
You are BazBot, the official AI assistant for BazaarX. You ONLY help with BazaarX-related topics.

STRICT RULES:
- ONLY recommend products and stores that exist on BazaarX
- NEVER mention or suggest competing platforms (Shopee, Lazada, Amazon, Zalora, etc.)
- If asked about non-BazaarX topics, politely redirect: "I'm here to help you shop on BazaarX! What product are you looking for?"
- When recommending products, ONLY use data from the BazaarX database provided in context
- If no matching products exist in the data, say so honestly rather than making up items
```

**Clean formatting rule** (new):
```
FORMATTING RULES:
- NEVER use ** for bold text. Write in plain, clean text only.
- Use bullet points (- or numbers) for lists
- Use emojis sparingly for warmth
- Keep responses concise and scannable
- No headers or horizontal rules in responses
- Write naturally as if texting a friend, but stay professional
```

**Full system prompt structure**:
1. Identity and loyalty rules (BazBot, BazaarX only)
2. Clean formatting rules (no **)
3. Communication guidelines (warm, professional, concise)
4. Response rules by topic (product, store, policy, etc.)
5. What BazBot should NEVER do
6. BazaarX policies (shipping, returns, payments, BazCoins, support)
7. Dynamic product context (fetched server-side)
8. Dynamic store context (fetched server-side)
9. Dynamic review summary (fetched server-side)
10. Related product recommendations (new - fetched from same category/seller)

---

### Step 4: Server-Side Context Fetching + Recommendations ✅ COMPLETED

Move all context fetching to the Edge Function. Currently the client does 3 separate queries (product, store, reviews) and sends the results. Instead:

**Edge Function fetches**:
1. Product details (if productId provided) - same query as current `getProductDetails()`
2. Store/seller details (from product's seller_id or provided sellerId) - same query as current `getStoreDetails()`
3. Review summary (from productId or sellerId) - same query as current `getReviewSummary()`
4. **NEW: Related products** for recommendations:
   ```sql
   SELECT id, name, price, brand
   FROM products
   WHERE category_id = <current_product_category_id>
     AND id != <current_product_id>
     AND disabled_at IS NULL
     AND approval_status = 'approved'
   ORDER BY created_at DESC
   LIMIT 5
   ```
5. **NEW: Top store products** (if viewing a store):
   ```sql
   SELECT id, name, price, brand
   FROM products
   WHERE seller_id = <sellerId>
     AND disabled_at IS NULL
     AND approval_status = 'approved'
   ORDER BY created_at DESC
   LIMIT 5
   ```

This data is appended to the system prompt so BazBot can recommend specific BazaarX products.

---

### Step 5: Simplify Web Client Service ✅ COMPLETED

**File**: `web/src/services/aiChatService.ts`

**Changes**:
- Remove `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_API_URL` constants
- Remove `getProductDetails()` method (moved to Edge Function)
- Remove `getStoreDetails()` method (moved to Edge Function)
- Remove `getReviewSummary()` method (moved to Edge Function)
- Remove `buildSystemPrompt()` method (moved to Edge Function)
- Remove `generateFallbackResponse()` (Edge Function handles errors)
- Simplify `sendMessage()` to call `supabase.functions.invoke('ai-chat')`
- Keep `notifySellerForChat()` (still client-side, writes to DB)
- Keep `getQuickReplies()` (UI logic, stays client-side)
- Keep `getWelcomeMessage()` (UI logic, stays client-side)
- Keep `resetConversation()`
- Keep `conversationHistory` management

**New `sendMessage()` implementation**:
```typescript
async sendMessage(
  userMessage: string,
  context: ChatContext
): Promise<{ response: string; suggestTalkToSeller: boolean }> {
  this.conversationHistory.push({ role: 'user', content: userMessage });
  if (this.conversationHistory.length > 10) {
    this.conversationHistory = this.conversationHistory.slice(-10);
  }

  try {
    const { data, error } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: userMessage,
        productId: context.product?.id || null,
        sellerId: context.store?.id || null,
        conversationHistory: this.conversationHistory.slice(0, -1), // exclude current message
      },
    });

    if (error) throw error;

    const aiResponse = data.response;
    this.conversationHistory.push({ role: 'assistant', content: aiResponse });

    return {
      response: aiResponse,
      suggestTalkToSeller: data.suggestTalkToSeller || false,
    };
  } catch (err) {
    console.warn('AI chat error:', err);
    return {
      response: "I'm having trouble right now. Please tap 'Talk to Seller' for direct help.",
      suggestTalkToSeller: true,
    };
  }
}
```

**Estimated reduction**: ~851 lines → ~250 lines

---

### Step 6: Simplify Mobile Client Service ✅ COMPLETED

**File**: `mobile-app/src/services/aiChatService.ts`

Same changes as web:
- Remove Gemini config, context-fetching methods, `buildSystemPrompt()`, `generateFallbackResponse()`
- Replace `sendMessage()` with Edge Function call
- Keep `notifySellerForChat()`, `getQuickReplies()`, `getWelcomeMessage()`, `resetConversation()`

**Estimated reduction**: ~274 lines → ~150 lines

---

### Step 7: Update Welcome Message Formatting ✅ COMPLETED

Both web and mobile `getWelcomeMessage()` currently use `**` for bold:
```typescript
// BEFORE
return `...looking at **"${context.product.name}"** from **${context.store.storeName}**...`;

// AFTER
return `...looking at "${context.product.name}" from ${context.store.storeName}...`;
```

Same for `getQuickReplies()` - verify no `**` in quick reply text.

---

### Step 8: Remove Gemini Environment Variables

**Remove from `.env` / `.env.local`**:
```
VITE_GEMINI_API_KEY=...
EXPO_PUBLIC_GEMINI_API_KEY=...
```

These are no longer needed. The Qwen key lives as a Supabase Edge Function secret only.

---

### Step 9: Update UI Components (No `**` Rendering) ✅ COMPLETED

Check these files for markdown rendering that displays `**`:
- `web/src/components/AIChatModal.tsx` - if it renders markdown, simplify to plain text
- `mobile-app/src/components/AIChatModal.tsx` - same check
- `mobile-app/src/components/AIChatBubble.tsx` - same check

If any component uses a markdown renderer (e.g., `react-markdown`, `react-native-markdown-display`), either:
1. Strip `**` before rendering (already done server-side, but double-safe)
2. Or replace the markdown renderer with plain `Text` / `<p>` for AI responses

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/ai-chat/index.ts` | CREATE | New Edge Function: Qwen API, context fetch, system prompt, response cleaning |
| `web/src/services/aiChatService.ts` | MODIFY | Remove Gemini calls, use `supabase.functions.invoke('ai-chat')`, remove context fetchers |
| `mobile-app/src/services/aiChatService.ts` | MODIFY | Same simplification as web |
| `web/src/components/AIChatModal.tsx` | MODIFY | Remove `**` from welcome messages, verify plain text rendering |
| `mobile-app/src/components/AIChatModal.tsx` | MODIFY | Same as web |
| `mobile-app/src/components/AIChatBubble.tsx` | VERIFY | Ensure no markdown bold rendering |
| `.env` / `.env.local` | MODIFY | Remove `VITE_GEMINI_API_KEY` and `EXPO_PUBLIC_GEMINI_API_KEY` |

---

## Qwen Model Selection

| Model | Best For | Input (1M tokens) | Notes |
|-------|----------|-------------------|-------|
| `qwen3-235b-a22b-thinking-2507` | Deepest reasoning, complex questions | Free quota | Most powerful, thinking model |
| `qwen-max` | Fast, reliable, general purpose | Free quota | Stable production choice |
| `qwen3.5-plus-2026-02-15` | Balance of speed and quality | Free quota | Latest generation |
| `qwen-mt-flash` | Ultra-fast responses | Free quota | Best latency |

**Recommendation**: Use `qwen-turbo-latest` as default for cheapest, fastest production performance. Fall back gracefully if rate-limited.

---

## Security Improvements

1. API key moves from client env vars to server-side Edge Function secret
2. Context fetched server-side (clients can no longer inject fake product/store data)
3. Rate limiting can be added at the Edge Function level
4. User authentication verified via Supabase auth headers automatically

---

## Testing Checklist

- [x] Edge Function deploys and responds to health check
- [x] Qwen API returns valid responses with system prompt
- [x] Product context loads correctly server-side
- [x] Store context loads correctly server-side
- [x] Review summary loads correctly server-side
- [x] Related product recommendations appear in responses
- [x] No `**` in any AI response
- [x] BazBot refuses to discuss non-BazaarX topics
- [x] BazBot refuses to recommend competing platforms
- [x] "Talk to Seller" suggestion detection works
- [x] Web sendMessage works end-to-end
- [x] Mobile sendMessage works end-to-end
- [x] Conversation history persists within session
- [x] Fallback response when Edge Function errors
- [x] Welcome messages display without `**` formatting
- [x] Quick replies still work
- [x] notifySellerForChat still works
- [x] Old Gemini env vars removed, no client-side API key leakage
