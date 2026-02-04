# ✅ Intern Onboarding Checklist

Use this checklist when onboarding new team members to ensure they can pull and run the project successfully.

## 📋 Pre-Setup Checklist

- [ ] Intern has Node.js v18+ installed
- [ ] Intern has Git installed
- [ ] Intern has GitHub access to the repository
- [ ] Intern has been added to team communication channels

## 🔐 Credentials Needed

Provide these to the new team member:

- [ ] **Supabase URL**: `https://mdawdegxofjsjrvygqbh.supabase.co`
- [ ] **Supabase Anon Key**: (Share via secure channel)
- [ ] **Gemini API Key**: (They can get their own free key or share team key)
  - Free key: https://aistudio.google.com/app/apikey
  - Team key: (Share via secure channel if using shared key)

## 🚀 Setup Steps

Walk through these steps with the intern or have them follow [INTERN_SETUP_GUIDE.md](INTERN_SETUP_GUIDE.md):

### 1. Clone Repository
- [ ] Clone: `git clone https://github.com/mozhdeveloper/BAZAARX.git`
- [ ] Checkout dev: `git checkout dev`
- [ ] Verify branch: `git status` shows "On branch dev"

### 2. Install Dependencies

**Web:**
- [ ] `cd web`
- [ ] `npm install` completes without errors
- [ ] `node_modules` folder created

**Mobile:**
- [ ] `cd mobile-app`
- [ ] `npm install` completes without errors
- [ ] `node_modules` folder created

### 3. Configure Environment

**Web:**
- [ ] Copy: `cd web && cp .env.example .env`
- [ ] Edit `web/.env` with real credentials
- [ ] Verify all 3 keys are filled:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_GEMINI_API_KEY`

**Mobile:**
- [ ] Copy: `cd mobile-app && cp .env.example .env`
- [ ] Edit `mobile-app/.env` with real credentials
- [ ] Verify all 3 keys are filled:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - `EXPO_PUBLIC_GEMINI_API_KEY`

### 4. Run Web App

- [ ] `cd web && npm run dev`
- [ ] Server starts on `http://localhost:5173`
- [ ] Browser opens automatically
- [ ] No errors in terminal
- [ ] Home page loads correctly

### 5. Test Web App

- [ ] Navigate to a product page
- [ ] See purple AI chat bubble (bottom right)
- [ ] Click chat bubble - modal opens
- [ ] Type a question: "What colors are available?"
- [ ] AI responds within 2-5 seconds
- [ ] Response is relevant and professional

### 6. Run Mobile App

- [ ] Install Expo Go on phone (iOS/Android)
- [ ] `cd mobile-app && npx expo start`
- [ ] QR code appears in terminal
- [ ] Scan QR code with Expo Go
- [ ] App loads on phone
- [ ] No errors in terminal

### 7. Test Mobile App

- [ ] Navigate to a product
- [ ] See purple AI chat button (bottom right)
- [ ] Tap button - chat modal opens
- [ ] Type a question: "Is this available?"
- [ ] AI responds within 1-3 seconds
- [ ] Response is relevant

### 8. Run Test Suites

**Mobile:**
- [ ] `cd mobile-app`
- [ ] `node scripts/test-ai-assistant-comprehensive.js`
- [ ] 9-10 tests pass (90%+)
- [ ] Response time < 1 second
- [ ] No critical errors

**Web:**
- [ ] `cd web`
- [ ] `npx tsx scripts/test-ai-assistant-comprehensive.ts`
- [ ] 12-13 tests pass (92%+)
- [ ] Response time < 5 seconds
- [ ] No critical errors

## ⚠️ Common Issues to Check

If intern encounters issues:

### Issue: npm install fails
- [ ] Node version is 18+: `node --version`
- [ ] Clear cache: `npm cache clean --force`
- [ ] Delete `node_modules` and `package-lock.json`
- [ ] Try again: `npm install`

### Issue: .env not found
- [ ] Confirm `.env.example` exists
- [ ] Copy command: `cp .env.example .env` (Mac/Linux) or `copy .env.example .env` (Windows)
- [ ] Verify `.env` file created: `ls -la` or `dir`

### Issue: API key errors
- [ ] Check `.env` file has no spaces around `=`
- [ ] Verify API key is correct (no typos)
- [ ] Restart dev server after changing `.env`
- [ ] Clear browser cache or app data

### Issue: Web build fails
- [ ] Check Node version: `node --version` (should be 18+)
- [ ] Delete `dist` folder
- [ ] Delete `node_modules`
- [ ] Run `npm install` again
- [ ] Try `npm run build` again

### Issue: Expo won't connect
- [ ] Phone and computer on same WiFi
- [ ] Try tunnel mode: `npx expo start --tunnel`
- [ ] Restart Expo server
- [ ] Update Expo Go app on phone

### Issue: Auth errors (mobile)
- [ ] This is expected and handled automatically
- [ ] Error is suppressed in App.tsx
- [ ] If persists, clear app data and reinstall

## 🎯 Success Criteria

Intern setup is complete when:

- [x] Both apps run without errors
- [x] AI chat works on both platforms
- [x] Test suites pass 90%+
- [x] Intern can make git commits
- [x] Intern understands project structure

## 📝 Post-Setup

After successful setup:

- [ ] Assign first task/issue
- [ ] Add to daily standups
- [ ] Share team documentation
- [ ] Schedule code review session
- [ ] Share coding standards/guidelines

## 🆘 Escalation

If intern is stuck after 30 minutes:

1. **Check this checklist** - missed step?
2. **Review error messages** - what's the exact error?
3. **Search documentation** - is it documented?
4. **Ask in team chat** - someone may have seen this
5. **Pair program** - walk through setup together
6. **Create issue** - document for future reference

## 📞 Resources

Share these with the intern:

- [INTERN_SETUP_GUIDE.md](INTERN_SETUP_GUIDE.md) - Complete setup guide
- [BAZAARX_AI_ASSISTANT_DOCUMENTATION.md](BAZAARX_AI_ASSISTANT_DOCUMENTATION.md) - AI features
- [AI_ASSISTANT_TEST_GUIDE.md](AI_ASSISTANT_TEST_GUIDE.md) - Testing guide
- [MOBILE_AUTH_ERROR_FIX.md](MOBILE_AUTH_ERROR_FIX.md) - Auth troubleshooting

## 🎓 First Week Goals

Set these expectations:

- [ ] **Day 1**: Complete setup, run both apps
- [ ] **Day 2**: Explore codebase, run tests
- [ ] **Day 3**: Fix a small bug or typo
- [ ] **Day 4**: Add a small feature
- [ ] **Day 5**: Code review and team presentation

---

**Last Updated**: February 4, 2026  
**Maintainer**: Tech Lead  
**Next Review**: When onboarding process changes
