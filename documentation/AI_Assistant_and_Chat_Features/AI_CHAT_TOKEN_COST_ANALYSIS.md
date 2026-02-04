# AI Chat Token Cost Analysis
**Model**: Gemini 2.5 Flash  
**Updated**: February 4, 2026  
**API Key**: AIzaSyD2RCtmiHKtWu2rGxVJv4VcYeJU7Vlor3I

---

## Gemini 2.5 Flash Pricing (Free Tier & Paid)

### Free Tier (First 128K tokens/day per project):
- **Input**: FREE (up to 128K tokens/day)
- **Output**: FREE (up to 128K tokens/day)
- **Rate Limit**: 15 requests per minute (RPM)
- **Daily Limit**: 1,500 requests per day (RPD)

### Paid Tier (Above 128K tokens/day):
- **Input**: $0.075 per 1 million tokens
- **Output**: $0.30 per 1 million tokens

---

## Our Implementation Token Usage

### **Mobile App** (React Native)
```typescript
maxOutputTokens: 500
temperature: 0.7
```

**Typical Prompt Structure:**
- System instructions: ~300 tokens
- Product context: ~150 tokens
- Store context: ~100 tokens
- BazaarX policies: ~800 tokens
- Conversation history: ~200 tokens (grows)
- User question: ~20 tokens

**Average per Request:**
- Input: ~1,570 tokens
- Output: ~300-500 tokens (max 500)
- **Total**: ~2,000 tokens per conversation turn

### **Web App** (React + Vite)
```typescript
maxOutputTokens: 800
temperature: 0.7
```

**Typical Prompt Structure:**
- System instructions: ~400 tokens
- Product context: ~200 tokens
- Store context: ~150 tokens
- Review summary: ~300 tokens
- BazaarX policies: ~800 tokens
- Conversation history: ~300 tokens (grows)
- User question: ~25 tokens

**Average per Request:**
- Input: ~2,175 tokens
- Output: ~500-800 tokens (max 800)
- **Total**: ~2,800 tokens per conversation turn

---

## Cost Calculations

### **FREE TIER USAGE (Up to 128K tokens/day)**

#### Mobile App:
- **Per conversation turn**: 2,000 tokens (free)
- **Daily capacity**: 128,000 ÷ 2,000 = **64 conversations/day FREE**
- **Monthly (30 days)**: 1,920 conversations FREE

#### Web App:
- **Per conversation turn**: 2,800 tokens (free)
- **Daily capacity**: 128,000 ÷ 2,800 = **45 conversations/day FREE**
- **Monthly (30 days)**: 1,350 conversations FREE

#### Combined (Mobile + Web):
- If evenly split: **~54 conversations/day FREE**
- If all mobile: **64 conversations/day FREE**
- If all web: **45 conversations/day FREE**

---

### **PAID TIER COSTS (Above free tier)**

#### Mobile App (per 1000 conversations):
```
Input:  1,570 tokens × 1,000 = 1,570,000 tokens
Output:   400 tokens × 1,000 =   400,000 tokens
Total:                          1,970,000 tokens

Input cost:  1.570M × $0.075 = $0.11775
Output cost: 0.400M × $0.30  = $0.12000
Total cost per 1000 conversations: $0.29775

Per conversation: $0.00030 (0.03 cents)
```

#### Web App (per 1000 conversations):
```
Input:  2,175 tokens × 1,000 = 2,175,000 tokens
Output:   650 tokens × 1,000 =   650,000 tokens
Total:                          2,825,000 tokens

Input cost:  2.175M × $0.075 = $0.16313
Output cost: 0.650M × $0.30  = $0.19500
Total cost per 1000 conversations: $0.35813

Per conversation: $0.00036 (0.036 cents)
```

---

## Cost Projections

### **Scenario 1: Light Usage (Within Free Tier)**
- **100 conversations/day** (50 mobile + 50 web)
- **Monthly**: 3,000 conversations
- **Cost**: **$0.00 (100% FREE)**
- **Tokens**: 75,000/day (well under 128K limit)

### **Scenario 2: Moderate Usage**
- **300 conversations/day** (150 mobile + 150 web)
- **Monthly**: 9,000 conversations
- **Free portion**: ~1,920 conversations/month
- **Paid portion**: ~7,080 conversations/month
- **Estimated cost**: 
  - Mobile (3,540 conv): $1.06
  - Web (3,540 conv): $1.27
  - **Total**: **~$2.33/month**

### **Scenario 3: High Usage**
- **1,000 conversations/day** (500 mobile + 500 web)
- **Monthly**: 30,000 conversations
- **Free portion**: ~1,920 conversations/month
- **Paid portion**: ~28,080 conversations/month
- **Estimated cost**:
  - Mobile (14,040 conv): $4.21
  - Web (14,040 conv): $5.03
  - **Total**: **~$9.24/month**

### **Scenario 4: Enterprise Usage**
- **5,000 conversations/day** (2,500 mobile + 2,500 web)
- **Monthly**: 150,000 conversations
- **Free portion**: ~1,920 conversations/month
- **Paid portion**: ~148,080 conversations/month
- **Estimated cost**:
  - Mobile (74,040 conv): $22.21
  - Web (74,040 conv): $26.52
  - **Total**: **~$48.73/month**

---

## Optimization Strategies

### **1. Reduce Context Size**
Current policies section: ~800 tokens
- Option: Summarize policies → Save ~400 tokens/request
- **Savings**: ~15-20% cost reduction

### **2. Smart Caching**
- Cache product details for repeat questions
- Store frequently asked Q&A pairs
- **Savings**: ~30-40% on repeat users

### **3. Rate Limiting**
- Limit to 3 messages per minute per user
- Prevents abuse and keeps costs predictable
- **Impact**: Minimal UX impact, major cost control

### **4. Fallback Responses**
- Pre-programmed answers for common questions
- Only use AI for complex/unique queries
- **Savings**: ~50% reduction for standard questions

---

## Comparison with Other Models

| Model | Input ($/1M) | Output ($/1M) | Our Avg Cost/Conv |
|-------|--------------|---------------|-------------------|
| **Gemini 2.5 Flash** | $0.075 | $0.30 | **$0.00033** |
| GPT-4o mini | $0.150 | $0.600 | $0.00066 (2x) |
| GPT-3.5 Turbo | $0.50 | $1.50 | $0.00200 (6x) |
| Claude Haiku | $0.25 | $1.25 | $0.00125 (4x) |

**Gemini 2.5 Flash is the most cost-effective option!**

---

## Recommendations

### ✅ **Current Setup is Excellent**
- Gemini 2.5 Flash provides best price/performance
- Free tier covers most small-to-medium usage
- Paid costs are extremely low (0.03 cents/conversation)

### ✅ **For Current Scale**
- Stay with Gemini 2.5 Flash
- Monitor daily token usage
- Expected cost: **$0-5/month** for typical e-commerce usage

### ✅ **If Scaling Up**
- Implement smart caching (save ~30%)
- Add rate limiting (prevent abuse)
- Consider Gemini Pro only for complex queries
- Expected cost at 1,000 conv/day: **~$9/month**

---

## Token Monitoring Commands

```bash
# Check current usage (mobile)
node mobile-app/scripts/test-ai-chat.js

# Calculate monthly projection
# Conversations/day × 30 × $0.00033 = Monthly cost

# Example: 500 conv/day
# 500 × 30 × $0.00033 = $4.95/month
```

---

## Summary

**Per Conversation Cost:**
- Mobile: **$0.00030** (0.03 cents)
- Web: **$0.00036** (0.036 cents)
- Average: **$0.00033** (0.033 cents)

**Free Tier Coverage:**
- **~54 conversations/day** completely FREE
- **~1,620 conversations/month** completely FREE

**Realistic Monthly Costs:**
- Small (100/day): **$0** (free tier)
- Medium (300/day): **$2-3**
- Large (1,000/day): **$9-10**
- Enterprise (5,000/day): **$45-50**

**Conclusion:** Extremely affordable! Even with heavy usage, costs are minimal. 🎉
