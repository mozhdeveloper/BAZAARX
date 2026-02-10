# Security Best Practices - BazaarX Mobile App

## 🔒 API Key & Credentials Security

### Critical Security Rules

1. **NEVER commit API keys or secrets to Git**
   - All sensitive credentials must be in `.env` files
   - `.env` is already in `.gitignore` to prevent accidental commits
   - Use `.env.example` for templates with placeholder values only

2. **Rotate compromised keys immediately**
   - If an API key is exposed publicly, it will be reported and disabled
   - Generate a new key and update `.env` immediately
   - Restart your development server to load new credentials

3. **Environment Variable Naming**
   - Use `EXPO_PUBLIC_*` prefix for variables accessible in React Native
   - Use `VITE_*` prefix for web compatibility
   - Never use unprefixed variables in client-side code

### API Keys Used in This Project

#### Supabase Credentials
- **URL**: `EXPO_PUBLIC_SUPABASE_URL`
- **Anon Key**: `EXPO_PUBLIC_SUPABASE_ANON_KEY` (public, but should still be protected)
- **Location**: Get from [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api)

#### Gemini AI API Key
- **Keys**: `EXPO_PUBLIC_GEMINI_API_KEY` and `VITE_GEMINI_API_KEY`
- **Location**: Get from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Free Tier Limits**: 1500 requests/day, 1M tokens/minute
- **Security**: Key will be disabled if reported as leaked

## 🛡️ Code Security Practices

### 1. Development vs Production Logging

All sensitive logging is wrapped in `__DEV__` checks:

```typescript
// ✅ Good - Only logs in development
if (__DEV__) {
  console.log('[AIChat] API Key configured:', !!GEMINI_API_KEY);
}

// ❌ Bad - Logs in production
console.log('[AIChat] API Key:', GEMINI_API_KEY); // NEVER DO THIS
```

### 2. Error Handling

```typescript
// ✅ Good - Hides implementation details in production
if (!response.ok) {
  if (__DEV__) {
    console.error('Detailed error:', errorData);
  }
  throw new Error('Service unavailable'); // Generic message for users
}
```

### 3. API Request Validation

```typescript
// Always validate API keys before making requests
if (!GEMINI_API_KEY) {
  throw new Error('Gemini API key not configured');
}
```

## 📝 Setup Instructions

### Initial Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Add your credentials to `.env`:**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key_here
   VITE_GEMINI_API_KEY=your_gemini_key_here
   ```

3. **Verify setup:**
   ```bash
   npx ts-node --esm scripts/test-gemini-api.ts
   ```

4. **Start development server:**
   ```bash
   npm start --reset-cache
   ```

### Key Rotation Procedure

If an API key is compromised:

1. **Gemini API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Delete the compromised key
   - Create a new API key
   - Update `.env` file
   - Restart server: `npm start --reset-cache`

2. **Supabase Credentials:**
   - Never expose the `service_role` key (not used in mobile app)
   - Anon key is public but should be rotated if misused
   - Update from [Supabase Dashboard](https://supabase.com/dashboard)

## 🔍 Security Checklist

Before every commit:

- [ ] No API keys in code files
- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` has placeholder values only
- [ ] Sensitive logs use `__DEV__` checks
- [ ] Error messages don't expose implementation details
- [ ] API requests validate credentials before sending

## 🚨 Incident Response

If you accidentally commit credentials:

1. **Immediate Actions:**
   ```bash
   # Remove from Git history (if just committed)
   git reset --soft HEAD~1
   git restore --staged .env
   
   # Or if already pushed
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Rotate ALL exposed credentials immediately**

3. **Force push to remove from remote:**
   ```bash
   git push origin --force --all
   ```

4. **Monitor for unauthorized usage**

## 📚 Additional Resources

- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [React Native Security](https://reactnative.dev/docs/security)
- [Google AI Studio](https://ai.google.dev/gemini-api/docs/api-key)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/going-into-prod)

## 🔐 Current Model & Configuration

- **Gemini Model**: `gemini-2.5-flash` (stable, released June 2025)
- **API Version**: `v1beta`
- **Max Output Tokens**: 800
- **Temperature**: 0.6
- **Safety Settings**: Block medium and above for all categories

---

**Last Updated**: February 9, 2026  
**Maintained By**: BazaarX Development Team
