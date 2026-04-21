# Google OAuth 2.0 Configuration for Expo Go - Complete Setup Guide

## Problem Statement

The BazaarX mobile app (React Native + Expo) was unable to complete Google Sign-In authentication. Users could authenticate with Google, but the OAuth callback never reached the app, preventing session establishment.

**Symptoms:**
- Browser opens and shows Google login ✅
- User authenticates with Google ✅
- Browser closes after authentication ✅
- **No session created in Supabase** ❌
- No deep link callback received by app ❌
- Console shows: "Session not established"

---

## Root Cause Analysis

The issue occurred because Expo Go OAuth requires a different configuration than mobile (Android/iOS) apps:

| Aspect | Android/iOS Apps | Expo Go |
|--------|-----------------|---------|
| OAuth Client Type | Android/iOS Native | **Web** |
| Redirect URI | Custom scheme (`bazaarx://auth/callback`) | Supabase managed (`https://...supabase.co/auth/v1/callback`) |
| Configuration Location | Google Cloud Console only | Google Cloud + Supabase |
| Deep Linking | Native scheme based | HTTP(S) callback |

**The mistake:** Using Android/iOS client credentials for Expo Go. Each client type has different:
- Client IDs
- Client Secrets
- Redirect URI requirements
- Authorization flow

---

## What This Configuration Achieves

This setup enables:
1. ✅ Google OAuth to work in Expo Go (development)
2. ✅ Proper session establishment in Supabase
3. ✅ User authentication flow: Google → OAuth → Supabase → App
4. ✅ Foundation for future native Android/iOS builds
5. ✅ Separation of concerns (dev credentials ≠ production credentials)

---

## Configuration Steps

### Step 1: Create a Web OAuth 2.0 Client in Google Cloud Console

**Purpose:** Expo Go uses Web OAuth flow, not native Android/iOS OAuth

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your BazaarX project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client IDs**
5. Select **Web application**
6. Name it: `BazaarX Web (Expo)`
7. Click **Create**

**Result:** You'll receive:
- **Client ID** (long alphanumeric string)
- **Client Secret** (another long string)

---

### Step 2: Configure Google Cloud Console - Authorized URIs

**Purpose:** Tell Google where OAuth redirects are allowed from

**In your Web OAuth Client:**

#### Add Authorized JavaScript origins:
These are domains that can **initiate** OAuth requests:
- Add: `https://ijdpbfrcvdflzwytxncj.supabase.co`
  - This is your Supabase domain (replace with your actual domain)
  - Format: `https://YOUR-PROJECT-ID.supabase.co`
  - Do NOT include `/auth/v1/callback` here

#### Add Authorized redirect URIs:
These are URLs where Google sends the user after authentication:
- Add: `https://ijdpbfrcvdflzwytxncj.supabase.co/auth/v1/callback`
  - This is Supabase's OAuth callback endpoint
  - Must be HTTPS (not HTTP)
  - Format: `https://YOUR-PROJECT-ID.supabase.co/auth/v1/callback`

**Note:** Settings may take 5 minutes to a few hours to propagate

---

### Step 3: Configure Supabase - Google Provider

**Purpose:** Connect your Google OAuth app to Supabase

**Steps:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your BazaarX project
3. Navigate to **Authentication** → **Providers** → **Google**
4. Click **Edit** (or enable if disabled)

**Configure these fields:**

| Field | Value |
|-------|-------|
| **Client IDs** | Paste your **Web Client ID** from Google Cloud (from Step 1) |
| **Client Secret** | Paste your **Web Client Secret** from Google Cloud (from Step 1) |
| **Callback URL** (read-only) | `https://ijdpbfrcvdflzwytxncj.supabase.co/auth/v1/callback` (auto-generated) |

**Important:**
- Remove any old Android or iOS credentials from these fields
- Only one Client ID and Secret should be active at a time
- The Web Client ID/Secret should **not** be shared with mobile clients

5. Click **Save**

---

### Step 4: Configure App Code - Supabase Client

**Purpose:** Enable OAuth session detection in the app

**File:** `mobile-app/src/lib/supabase.ts`

**Ensure this setting is enabled:**
```typescript
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,  // ✅ CRITICAL: Enable OAuth redirect detection
    storageKey: 'supabase.auth.token',
  },
});
```

**Why:** This tells Supabase to automatically detect OAuth authorization codes in redirect URLs and exchange them for sessions.

---

### Step 5: Configure App Code - Google Sign-In Handler

**Purpose:** Use Supabase's default callback instead of custom mobile redirect

**File:** `mobile-app/app/LoginScreen.tsx`

**Use this simplified flow:**
```typescript
const handleGoogleSignIn = async () => {
  setIsGoogleLoading(true);
  try {
    // Use Supabase's default callback URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: false,  // Let browser handle redirect
      },
    });

    if (error) {
      Alert.alert('Google Sign-In Error', error.message);
      setIsGoogleLoading(false);
      return;
    }

    // Open browser for user to authenticate
    const result = await WebBrowser.openBrowserAsync(data.url);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      setIsGoogleLoading(false);
      return;
    }

    // Give Supabase time to process OAuth code
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if session was established
    const { data: sessionData } = await supabase.auth.getSession();

    if (sessionData.session?.user) {
      console.log('✅ Session established for:', sessionData.session.user.email);
      navigation.replace('MainTabs', { screen: 'Home' });
    } else {
      Alert.alert('Sign-In Failed', 'Session could not be established');
      setIsGoogleLoading(false);
    }
  } catch (error) {
    Alert.alert('Google Sign-In Error', error instanceof Error ? error.message : 'Unknown error');
    setIsGoogleLoading(false);
  }
};
```

**Key differences from mobile native:**
- No custom redirect URL generation
- No deep linking required (Supabase handles it)
- Relies on `detectSessionInUrl: true` to capture session

---

## OAuth Flow Diagram

```
┌─────────────────┐
│   Expo Go App   │
│  (LoginScreen)  │
└────────┬────────┘
         │ 1. Call supabase.auth.signInWithOAuth()
         │
┌────────▼────────────────────────────┐
│    Supabase Auth Service            │
│  (ijdpbfrcvdflzwytxncj.supabase.co) │
└────────┬─────────────────────────────┘
         │ 2. Returns OAuth URL (Google endpoint)
         │
┌────────▼────────────────────────────┐
│    WebBrowser (Opens)               │
│  (User sees Google login)            │
└────────┬─────────────────────────────┘
         │ 3. User authenticates with Google
         │
┌────────▼────────────────────────────┐
│    Google OAuth Endpoint            │
│  (accounts.google.com)              │
└────────┬─────────────────────────────┘
         │ 4. Google redirects to Supabase callback
         │    with authorization code
         │
┌────────▼────────────────────────────┐
│    Supabase Auth Callback           │
│  (/auth/v1/callback?code=...)       │
└────────┬─────────────────────────────┘
         │ 5. Supabase exchanges code for JWT token
         │    Stores session in AsyncStorage
         │
┌────────▼────────────────────────────┐
│   Expo Go App (Resumed)             │
│  (detectSessionInUrl detects token) │
└────────┬─────────────────────────────┘
         │ 6. getSession() finds token
         │
┌────────▼────────────────────────────┐
│   Navigation to Home                │
│  (User is now logged in)            │
└─────────────────────────────────────┘
```

---

## Configuration Verification Checklist

### Google Cloud Console (Web Client)
- [ ] Client name: `BazaarX Web (Expo)` (or similar)
- [ ] Client Type: **Web application** (not Android/iOS)
- [ ] **Authorized JavaScript origins** includes: `https://ijdpbfrcvdflzwytxncj.supabase.co`
- [ ] **Authorized redirect URIs** includes: `https://ijdpbfrcvdflzwytxncj.supabase.co/auth/v1/callback`
- [ ] All HTTP origins changed to HTTPS
- [ ] Client ID copied correctly
- [ ] Client Secret copied correctly
- [ ] Old Android/iOS clients removed or disabled

### Supabase Dashboard
- [ ] Authentication → Providers → Google enabled
- [ ] **Client IDs** field: Contains Web Client ID (NOT Android)
- [ ] **Client Secret** field: Contains Web Client Secret (NOT Android)
- [ ] **Callback URL** shows: `https://ijdpbfrcvdflzwytxncj.supabase.co/auth/v1/callback`
- [ ] Changes saved successfully

### App Code
- [ ] `supabase.ts`: `detectSessionInUrl: true`
- [ ] `LoginScreen.tsx`: Using `skipBrowserRedirect: false`
- [ ] No custom redirect URL being passed to `signInWithOAuth()`
- [ ] Session polling checks `supabase.auth.getSession()`

---

## Testing the Configuration

### Test Steps:
1. Start Expo Go: `npx expo start --clear`
2. Open app on device/emulator
3. Go to Login screen
4. Click "Sign in with Google"
5. Authenticate with your Google account
6. Browser should close automatically
7. App should navigate to Home screen

### Success Indicators:
```
✅ [LoginScreen] Starting Google Sign-In with Supabase default redirect...
✅ [LoginScreen] OAuth URL obtained, opening browser...
✅ [LoginScreen] Browser result: opened
✅ [LoginScreen] Browser closed. Checking for session...
✅ [LoginScreen] Session check attempt 1/10: Session exists: true
✅ [LoginScreen] ✅ Session established for user: your-email@gmail.com
✅ Navigation to MainTabs
```

### Common Errors & Fixes:

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid Redirect: must end with public TLD" | IP addresses rejected | Use Supabase domain only |
| No logs after "Browser closed" | Google Cloud settings not propagated | Wait 5-60 minutes, try again |
| Session not established after retries | Wrong credentials in Supabase | Verify Web Client ID/Secret (not Android) |
| Browser won't open | OAuth URL generation failed | Check Supabase Google provider is enabled |
| Redirect URI mismatch error | Typo in Google Cloud or Supabase | Must match exactly, case-sensitive |

---

## Future: Native Android/iOS Configuration

Once Web OAuth works in Expo Go, for **production native apps**, you'll need:

1. Create **separate** Android and iOS OAuth clients in Google Cloud
2. Configure with **native redirect schemes** (`bazaarx://auth/callback`)
3. Keep Supabase Google provider pointing to **Web Client** only
4. Handle OAuth in app using native deep linking
5. Consider native builds via EAS Build (Expo's managed build service)

---

## Key Differences: Web vs Mobile OAuth

| Aspect | Web OAuth (Expo Go) | Mobile OAuth (Native) |
|--------|-------------------|----------------------|
| Client Type | Web application | Android/iOS Native |
| Redirect Mechanism | HTTP(S) callback | Deep linking (custom scheme) |
| Session Storage | Browser + app | App only |
| Configuration Location | Google Cloud only | Google Cloud + App manifest |
| Supabase Role | Handles full flow | Only validates tokens |
| Update Frequency | Production-like | Requires new build |

---

## Troubleshooting

### If Google Sign-In still fails after configuration:

1. **Clear all caches:**
   ```bash
   npx expo start --clear
   rm -rf node_modules
   npm install
   ```

2. **Check Supabase logs:**
   - Supabase Dashboard → Authentication → Auth Events
   - Look for OAuth failures or errors

3. **Verify exact URLs match:**
   ```
   Google Cloud Redirect URI:
   https://ijdpbfrcvdflzwytxncj.supabase.co/auth/v1/callback

   Supabase Callback URL (should auto-match):
   https://ijdpbfrcvdflzwytxncj.supabase.co/auth/v1/callback

   These must be IDENTICAL
   ```

4. **Check for mixed credentials:**
   - Ensure Supabase only has Web Client credentials
   - Delete Android/iOS Client ID/Secret from Supabase

5. **Test with a fresh Google account:**
   - Different Google account to rule out account-specific issues

6. **Enable debug logging in Supabase:**
   - Check Auth logs for detailed error messages

---

## Reference Information

### Current Project Setup:
- **Project:** BazaarX
- **Supabase URL:** `https://ijdpbfrcvdflzwytxncj.supabase.co`
- **App Framework:** React Native + Expo
- **OAuth Provider:** Google
- **OAuth Flow Type:** Authorization Code (Web)

### Google Cloud Project:
- **Project:** BazaarX
- **OAuth Clients Needed:**
  - ✅ Web (for Expo Go development) — CONFIGURE THIS FIRST
  - Future: Android (for native Android build)
  - Future: iOS (for native iOS build)

---

## Summary

This configuration establishes Google OAuth for Expo Go development by:

1. ✅ Creating a **Web OAuth client** (not Android/iOS) in Google Cloud
2. ✅ Registering **Supabase's callback URL** with Google
3. ✅ Adding Supabase's domain to **authorized origins**
4. ✅ Configuring Supabase with **Web Client credentials**
5. ✅ Enabling **session detection** in Supabase client
6. ✅ Simplifying app code to use **Supabase's managed callback**

The result: Users can authenticate with Google in Expo Go and get properly established sessions.
