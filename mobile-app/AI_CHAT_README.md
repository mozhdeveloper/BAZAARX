# AI Chat Assistant - Quick Reference

## ✅ Status: ACTIVE & WORKING

**Model**: Gemini 2.5 Flash (Stable)  
**API Version**: v1beta  
**Last Tested**: February 9, 2026 ✓

## 🚀 Features

The AI Chat Assistant (BazBot) provides intelligent product assistance:

- **Complete Product Information**: Name, price, variants, stock, specifications
- **Store Details**: Seller information, ratings, verification status
- **Smart Recommendations**: Suggests when to contact seller directly
- **Professional Responses**: Helpful, accurate, and context-aware
- **Conversation Memory**: Maintains last 10 messages for context

## 📍 Where It Appears

- **Product Detail Screen**: Floating AI chat bubble in bottom-right corner
- **Accessible**: Tap the bubble to open chat interface
- **Quick Replies**: Pre-configured questions for common inquiries

## 🔧 Technical Configuration

### Model Settings

```typescript
Model: gemini-2.5-flash
Temperature: 0.6 (balanced creativity/consistency)
Max Output Tokens: 800
Safety: Block medium+ harmful content
```

### API Limits (Free Tier)

- **Requests**: 1,500 per day
- **Tokens**: 1M per minute
- **Context**: Up to 1M tokens

## 🧪 Testing

Test the API connection:

```bash
npx ts-node --esm scripts/test-gemini-api.ts
```

Expected output:
```
✅ Success! Gemini API is working.
📝 Response: [AI response here]
```

## 🔐 Security

- API key stored in `.env` file (not committed to Git)
- Detailed logging only in development mode (`__DEV__`)
- Error messages sanitized for production
- See [SECURITY.md](./SECURITY.md) for full guidelines

## 💬 Example Conversations

**User**: "What colors is this available in?"  
**BazBot**: "This product is available in Black, White, and Blue. All colors are currently in stock. Which color would you prefer?"

**User**: "Can I return this?"  
**BazBot**: "Yes! BazaarX offers a 7-day return policy. If you're not satisfied, you can return the item within 7 days of delivery for a full refund. For specific return details about this seller, I'd recommend talking to the seller directly."

**User**: "Is this authentic?"  
**BazBot**: "This product is sold by [Seller Name], a verified seller on BazaarX with a [X.X] rating. For specific authenticity guarantees, I'd suggest talking to the seller directly for their verification documents."

## 📊 Context Provided to AI

The AI has access to:

```typescript
{
  product: {
    name, description, price, originalPrice,
    category, brand, colors, sizes, variants,
    stock, specifications, rating, reviews,
    shipping info, dimensions, weight, tags
  },
  store: {
    name, description, rating, verification status
  }
}
```

## 🎯 Smart Features

1. **Automatic Seller Redirect**: Suggests contacting seller for:
   - Custom requests
   - Bulk orders
   - Authenticity verification
   - Special shipping arrangements

2. **Quick Replies**: Common questions pre-configured:
   - "What colors/sizes available?"
   - "Tell me about this product"
   - "What's the return policy?"
   - "Is shipping free?"

3. **Conversation Memory**: Maintains context across messages

## 🛠️ Troubleshooting

### API Not Working

1. **Check API Key**:
   ```bash
   # Verify .env file exists
   cat .env | grep GEMINI
   ```

2. **Test Connection**:
   ```bash
   npx ts-node --esm scripts/test-gemini-api.ts
   ```

3. **Common Issues**:
   - **403 Error**: API key leaked/disabled → Generate new key
   - **404 Error**: Wrong model name → Use `gemini-2.5-flash`
   - **No Response**: Check internet connection

### Logs Not Showing

Development logs only appear when `__DEV__` is true:
- In Expo: Development mode enabled by default
- Check Metro bundler console for logs

## 📝 Code Locations

- **Service**: `src/services/aiChatService.ts`
- **Component**: `src/components/AIChatBubble.tsx`
- **Integration**: `app/ProductDetailScreen.tsx`
- **Tests**: `scripts/test-gemini-api.ts`
- **Model List**: `scripts/list-gemini-models.ts`

## 🔄 Updates & Maintenance

### Updating the Model

To switch to a different Gemini model:

1. List available models:
   ```bash
   npx ts-node --esm scripts/list-gemini-models.ts
   ```

2. Update `src/services/aiChatService.ts`:
   ```typescript
   const GEMINI_MODEL = 'your-new-model-name';
   ```

3. Test the change:
   ```bash
   npx ts-node --esm scripts/test-gemini-api.ts
   ```

### Monitoring Usage

- Check Google AI Studio dashboard for quota usage
- Free tier limits reset daily
- Consider upgrade if approaching limits

---

**Need Help?** Check [SECURITY.md](./SECURITY.md) for security practices or contact the development team.
