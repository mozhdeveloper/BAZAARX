# 🚀 Setup Guide for New Team Members

Welcome to BazaarX! This guide will help you get the project running on your machine.

## 📋 Prerequisites

Before you start, make sure you have installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **Git** - [Download here](https://git-scm.com/)
- **For Mobile Development**:
  - Expo CLI: `npm install -g expo-cli`
  - Expo Go app on your phone (iOS/Android)
  - Or Android Studio / Xcode for emulators

## 🔧 Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/mozhdeveloper/BAZAARX.git
cd BAZAARX
git checkout dev
```

### 2. Install Dependencies

**Web App:**
```bash
cd web
npm install
```

**Mobile App:**
```bash
cd mobile-app
npm install
```

### 3. Configure Environment Variables

**Web App:**
```bash
cd web
cp .env.example .env
```

**Mobile App:**
```bash
cd mobile-app
cp .env.example .env
```

Now edit each `.env` file with your credentials:

#### Required API Keys:

1. **Supabase** (Database & Auth)
   - URL: `https://mdawdegxofjsjrvygqbh.supabase.co`
   - Anon Key: Ask team lead for the key
   - Or get your own at [supabase.com](https://supabase.com)

2. **Google Gemini AI** (AI Chat Assistant)
   - Get your free API key at: [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Free tier: 1,500 requests/day
   - Current key: Ask team lead

## 🏃 Running the Apps

### Web App (React + Vite)

```bash
cd web
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Mobile App (React Native + Expo)

```bash
cd mobile-app
npm start
# or
npx expo start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR code with Expo Go app on your phone

## ✅ Verify Everything Works

### Test Web App:
1. Open browser to `http://localhost:5173`
2. Navigate to a product page
3. Look for purple AI chat bubble (bottom right)
4. Click it and try asking a question
5. ✅ Should get AI response in ~2 seconds

### Test Mobile App:
1. Open app in Expo Go or emulator
2. Navigate to a product
3. Look for purple AI chat button (bottom right)
4. Tap it and ask a question
5. ✅ Should get AI response

### Test AI Chat Functionality:

**Run Mobile Tests:**
```bash
cd mobile-app
node scripts/test-ai-assistant-comprehensive.js
```

**Run Web Tests:**
```bash
cd web
npx tsx scripts/test-ai-assistant-comprehensive.ts
```

Both should pass 90%+ of tests.

## 🐛 Common Issues & Fixes

### Issue: "Invalid Refresh Token" Error (Mobile)

**Solution:** This is already handled! The error is suppressed and auth is cleaned automatically.

If you still see it:
```bash
# Clear app data
# On Android: Long press app > App info > Storage > Clear data
# On iOS: Delete app and reinstall
```

### Issue: "VITE_GEMINI_API_KEY is not defined"

**Solution:** 
1. Make sure you copied `.env.example` to `.env`
2. Fill in your Gemini API key
3. Restart the dev server

### Issue: Cannot connect to Supabase

**Solution:**
1. Check your internet connection
2. Verify Supabase URL and key in `.env`
3. Ask team lead for current credentials

### Issue: Expo app won't connect

**Solution:**
1. Make sure phone and computer are on same WiFi
2. Try tunnel mode: `npx expo start --tunnel`
3. Restart Expo dev server

### Issue: npm install fails

**Solution:**
```bash
# Clear cache and retry
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

## 📚 Project Structure

```
BAZAARX/
├── web/                          # React web app
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── services/            # API services
│   │   │   └── aiChatService.ts # AI chat (Gemini)
│   │   └── lib/                 # Utilities
│   ├── scripts/                 # Test scripts
│   └── .env                     # Environment variables
│
├── mobile-app/                   # React Native app
│   ├── app/                     # Screens
│   ├── src/
│   │   ├── components/          # RN components
│   │   ├── services/            # API services
│   │   │   └── aiChatService.ts # AI chat (Gemini)
│   │   └── lib/                 # Utilities
│   ├── scripts/                 # Test scripts
│   └── .env                     # Environment variables
│
└── Documentation/               # Project docs
    ├── AI_ASSISTANT_TEST_GUIDE.md
    ├── BAZAARX_AI_ASSISTANT_DOCUMENTATION.md
    └── ...
```

## 🧪 Development Workflow

1. **Pull latest changes:**
   ```bash
   git pull origin dev
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and test:**
   ```bash
   # Run tests
   npm test
   
   # Test AI chat
   npm run test:ai
   ```

4. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request** on GitHub

## 📖 Key Documentation

- [AI Assistant Complete Guide](../BAZAARX_AI_ASSISTANT_DOCUMENTATION.md)
- [AI Chat Test Guide](../AI_ASSISTANT_TEST_GUIDE.md)
- [Mobile Auth Fix](../MOBILE_AUTH_ERROR_FIX.md)
- [Token Cost Analysis](../AI_CHAT_TOKEN_COST_ANALYSIS.md)

## 🤝 Getting Help

If you're stuck:

1. **Check documentation** in the root directory
2. **Search existing issues** on GitHub
3. **Ask in team chat** (fastest response)
4. **Create an issue** on GitHub with:
   - What you're trying to do
   - What error you're getting
   - Steps you've already tried

## 🎯 What to Work On

Check the GitHub Projects board or ask team lead for:
- Current sprint tasks
- Good first issues for new contributors
- Areas that need help

## 🔐 Important Notes

- ⚠️ **NEVER commit `.env` files** - They're in `.gitignore`
- ⚠️ **Don't share API keys** publicly
- ⚠️ Use your own Gemini API key for development (free tier is fine)
- ✅ Always test locally before pushing
- ✅ Run test scripts to verify AI features work

## 📞 Contact

- **Team Lead**: [Contact Info]
- **Repository**: https://github.com/mozhdeveloper/BAZAARX
- **Branch**: `dev` (main development branch)

---

**Welcome to the team! Happy coding! 🚀**
