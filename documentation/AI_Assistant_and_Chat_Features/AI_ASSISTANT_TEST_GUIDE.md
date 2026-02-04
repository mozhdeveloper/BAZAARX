# AI Assistant Test Suite

Comprehensive test scripts to verify the AI shopping assistant works properly on both mobile and web platforms.

## Test Scripts

### Mobile (React Native + Expo)
**File**: `mobile-app/scripts/test-ai-assistant-comprehensive.js`

### Web (React + Vite)
**File**: `web/scripts/test-ai-assistant-comprehensive.ts`

---

## Running Tests

### Mobile Tests

```bash
cd mobile-app
node scripts/test-ai-assistant-comprehensive.js
```

### Web Tests

```bash
cd web
npx tsx scripts/test-ai-assistant-comprehensive.ts
```

---

## What Gets Tested

### Both Platforms

✅ **API Connection**
- Gemini API authentication
- API key validation
- Request/response validation

✅ **Context Building**
- Product context generation
- Store context generation
- Policy injection
- Conversation history management

✅ **Conversation Flow**
- Multi-turn conversations
- Context retention
- Follow-up questions

✅ **Performance**
- Response time (< 3 seconds target)
- Token usage estimation
- Cost calculation

✅ **Quick Replies**
- Contextual suggestions generation
- Relevance validation

✅ **Seller Handoff**
- Detection of complex queries
- "Talk to Seller" suggestions

✅ **Error Handling**
- API errors
- Invalid inputs
- Fallback messages

✅ **Token & Cost Analysis**
- Input token estimation
- Output token limits
- Cost per conversation
- Free tier calculations

### Web-Specific Tests

✅ **Supabase Integration**
- Database connection
- Product data fetching
- Store data fetching
- Review aggregation

✅ **Enhanced Context**
- Extended product details
- Review summaries
- Store analytics

✅ **Chat Mode Toggle**
- AI/Seller mode switching
- Theme changes
- Mode-specific behavior

✅ **Chat Tracking**
- Database logging
- Analytics capture

✅ **Draggable Bubble**
- Position state management
- Persistence testing

---

## Expected Results

### Mobile
```
╔════════════════════════════════════════════════════════════╗
║  🤖 BazaarX Mobile AI Assistant - Comprehensive Test     ║
║  Model: Gemini 2.5 Flash                                 ║
║  Platform: React Native + Expo                           ║
╚════════════════════════════════════════════════════════════╝

Total Tests Run:     10
Tests Passed:        10
Tests Failed:        0
Success Rate:        100.0%
Duration:            ~15-20s

🎉 ALL TESTS PASSED!
```

### Web
```
╔════════════════════════════════════════════════════════════╗
║  🌐 BazaarX Web AI Assistant - Comprehensive Test        ║
║  Model: Gemini 2.5 Flash                                 ║
║  Platform: React + Vite + TypeScript                     ║
╚════════════════════════════════════════════════════════════╝

Total Tests Run:     13
Tests Passed:        13
Tests Failed:        0
Success Rate:        100.0%
Duration:            ~20-25s

🎉 ALL TESTS PASSED!
```

---

## Test Coverage

| Category | Mobile | Web | Description |
|----------|--------|-----|-------------|
| **API Tests** | 3 tests | 3 tests | Connection, auth, responses |
| **Context Tests** | 2 tests | 3 tests | Product, store, reviews |
| **Conversation** | 1 test | 1 test | Multi-turn flow |
| **Performance** | 1 test | 1 test | Response time |
| **Features** | 2 tests | 2 tests | Quick replies, handoff |
| **Database** | - | 3 tests | Supabase integration |
| **UI State** | 1 test | 1 test | Component state |
| **Error Handling** | 1 test | 1 test | Fallbacks |
| **Analytics** | 1 test | 2 tests | Token usage, cost |

**Mobile Total**: 10 tests  
**Web Total**: 13 tests

---

## Troubleshooting

### Test Failures

**API Connection Failed**
- Check `.env` file has correct `GEMINI_API_KEY`
- Verify API key is active in Google AI Studio
- Check internet connection

**Supabase Connection Failed** (Web only)
- Check `VITE_SUPABASE_URL` in `.env`
- Check `VITE_SUPABASE_ANON_KEY` in `.env`
- Verify Supabase project is active

**Response Time Too Slow**
- Check internet connection speed
- Verify no rate limiting
- Consider reducing maxOutputTokens

**Database Queries Fail** (Web only)
- Ensure tables exist (products, sellers, reviews)
- Check Row Level Security (RLS) policies
- Verify test data exists

### Common Issues

**"RESOURCE_EXHAUSTED" Error**
- Hit free tier limit (1500 requests/day)
- Wait for quota reset or upgrade to paid plan
- Error handling will show fallback message

**Empty Database Warnings**
- Normal for new installations
- Add test data using admin panel
- Tests will pass with warnings

**TypeScript Errors** (Web only)
- Run `npm install` to ensure dependencies
- Check TypeScript version compatibility

---

## Performance Benchmarks

### Mobile
- **Average Response Time**: 1.4-2.0s
- **Context Size**: ~1,570 tokens
- **Output Tokens**: 500 max
- **Cost per conversation**: $0.00030

### Web
- **Average Response Time**: 1.7-2.5s
- **Context Size**: ~2,175 tokens
- **Output Tokens**: 800 max
- **Cost per conversation**: $0.00036

---

## Environment Requirements

### Mobile
```env
EXPO_PUBLIC_GEMINI_API_KEY=your_api_key_here
VITE_GEMINI_API_KEY=your_api_key_here
```

### Web
```env
VITE_GEMINI_API_KEY=your_api_key_here
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test-ai.yml
name: Test AI Assistant

on: [push, pull_request]

jobs:
  test-mobile:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd mobile-app && npm install
      - run: cd mobile-app && node scripts/test-ai-assistant-comprehensive.js
        env:
          EXPO_PUBLIC_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
  
  test-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd web && npm install
      - run: cd web && npx tsx scripts/test-ai-assistant-comprehensive.ts
        env:
          VITE_GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          VITE_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
```

---

## Next Steps

After tests pass:

1. ✅ **Deploy to staging** - Test with real user interactions
2. ✅ **Monitor performance** - Track response times and costs
3. ✅ **Gather feedback** - User satisfaction surveys
4. ✅ **Optimize prompts** - Fine-tune based on usage patterns
5. ✅ **Scale testing** - Load testing for high traffic

---

## Support

If tests fail or you need help:

1. Check this README first
2. Review error messages carefully
3. Verify environment variables
4. Check API quotas and limits
5. Review implementation in:
   - `mobile-app/src/services/aiChatService.ts`
   - `web/src/services/aiChatService.ts`

---

**Last Updated**: February 4, 2026  
**Test Suite Version**: 2.0  
**AI Model**: Gemini 2.5 Flash
