# Google Sign-In Implementation Guide

**Project:** BazaarX Mobile
**Feature:** OAuth 2.0 Google Sign-In
**Status:** Implemented & Ready for Testing
**Last Updated:** April 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Design Choices](#design-choices)
3. [Architecture](#architecture)
4. [OAuth Flow Diagram](#oauth-flow-diagram)
5. [Component Flow](#component-flow)
6. [Implementation Details](#implementation-details)
7. [File Modifications](#file-modifications)
8. [Setup Requirements](#setup-requirements)
9. [Testing Guide](#testing-guide)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What Was Built

A production-ready Google OAuth 2.0 sign-in system for BazaarX Mobile that allows users to authenticate using their Google account. The implementation integrates with Supabase's OAuth provider and uses Expo's native browser capabilities for secure authentication.

### Why Google Sign-In?

- **User Convenience:** Reduces sign-up friction (1-2 taps vs. form filling)
- **Security:** Leverages Google's OAuth infrastructure + Supabase server-side validation
- **Cross-Platform:** Works on iOS, Android, and web with same codebase
- **Data Privacy:** Google handles credentials; app never sees passwords

---

## Design Choices

### 1. **OAuth Provider: Supabase (Over Manual Google SDK)**

**Choice:** Use Supabase's built-in OAuth provider instead of implementing manual Google authentication.

**Rationale:**
- ✅ **Simpler Integration:** Supabase handles OAuth server-side validation
- ✅ **Fewer Dependencies:** No extra Google SDK packages needed
- ✅ **Server-Side Validation:** Reduces client-side security burden
- ✅ **Existing Session Management:** Reuses current AsyncStorage token persistence
- ✅ **Multi-Provider Ready:** Can add Facebook, GitHub, etc. with minimal changes

**Trade-off:**
- Less control over OAuth flow specifics
- Dependent on Supabase infrastructure
- Can't customize scopes beyond what Supabase exposes

**Alternative Considered:** `expo-google-sign-in` library
- More control but requires custom JWT handling
- More complex session management
- Abandoned for this simpler approach

---

### 2. **Browser Approach: Native Browser (Over WebView)**

**Choice:** Use `expo-web-browser` to open the system browser instead of embedding OAuth in WebView.

**Rationale:**
- ✅ **Better UX:** User sees familiar system browser, not embedded WebView
- ✅ **Pre-Login State:** Browser might have existing Google login (faster signup)
- ✅ **Security:** System browser is more trusted than app WebView
- ✅ **Compliance:** Matches OAuth best practices & platform guidelines
- ✅ **Performance:** Lighter than embedding full browser in app

**Trade-off:**
- User leaves app briefly (better than feeling trapped in WebView)
- Requires deep linking configuration
- Slightly slower than WebView (system browser startup time)

**Alternative Considered:** In-app WebView
- Would keep user in app entirely
- But: Less secure, slower, poor UX

---

### 3. **Session Restore: Automatic via Deep Linking**

**Choice:** Rely on deep link handling + `onAuthStateChange` listener instead of manual session parsing.

**Rationale:**
- ✅ **Automatic:** App OS automatically routes `bazaarx://auth/callback?...` back to app
- ✅ **Supabase Handles:** `onAuthStateChange('SIGNED_IN')` fires automatically
- ✅ **Less Boilerplate:** No need to manually parse URL, exchange codes, store tokens
- ✅ **Consistent:** Reuses existing session management code
- ✅ **Testable:** Same flow as password login → predictable behavior

**Flow:**
```
OAuth Redirect (bazaarx://auth/callback?code=...)
  ↓ [Deep linking auto-routes to app]
App receives deep link
  ↓ [Expo linking listener triggers]
Supabase validates auth code
  ↓ [Token stored automatically]
onAuthStateChange('SIGNED_IN') fires
  ↓ [triggersd checkSession()]
Auth store synced
  ↓
User logged in ✅
```

**Alternative Considered:** Manual URL parsing in LoginScreen
- Would require parsing `bazaarx://...` in LoginScreen
- Extra complexity for same result
- Abandoned for cleaner approach

---

### 4. **User Profile Loading: Parallel Fetch**

**Choice:** Load profile, roles, and buyer data in parallel after session established.

**Rationale:**
- ✅ **Performance:** Faster than sequential queries (3 parallel queries vs. 3 sequential)
- ✅ **Consistent:** Same as existing `signIn()` method
- ✅ **Complete Data:** All required fields populated before navigation

**Implementation:**
```typescript
const [profile, roles, buyer] = await Promise.all([
  authService.getUserProfile(userId),
  authService.getUserRoles(userId),
  authService.getBuyerProfile(userId),
]);
```

---

### 5. **Error Handling: User-Visible Alerts**

**Choice:** Show clear alerts for each failure scenario with actionable messages.

**Rationale:**
- ✅ **User Clarity:** Users understand what went wrong
- ✅ **Retry Options:** Users can tap button again
- ✅ **Developer Debugging:** Console logs also included for dev diagnostics
- ✅ **Graceful Degradation:** Always fall back to email/password login

**Scenarios Handled:**
- OAuth provider not configured → Alert + console error
- User denies Google permission → Silent return to login
- Network timeout → Alert suggests retry
- Session not established → Alert suggests trying again

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                     BazaarX Mobile App                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │  LoginScreen     │         │  authService     │              │
│  │                  │         │                  │              │
│  │ • Google button  │────────→│ • signInWithGoogle
│  │ • OAuth flow     │         │ • getUserProfile │              │
│  │ • Error alerts   │         │ • getUserRoles   │              │
│  └──────────────────┘         │ • getBuyerProfile│              │
│           ↓                    └────────┬─────────┘              │
│           │                             │                        │
│  ┌──────────────────────────┐          │                        │
│  │  @react-native/supabase  │          │                        │
│  │  - auth.signInWithOAuth  │←─────────┘                        │
│  │  - auth.getSession       │                                   │
│  │  - from('profiles'...)   │                                   │
│  └──────────────────────────┘                                   │
│           ↓                                                      │
│    ┌──────────────────────┐                                     │
│    │   Auth Store (zustand)                                     │
│    │   - setUser()        │←──── Updates on session restore    │
│    │   - isGuest: false   │                                     │
│    │   - user: {...}      │                                     │
│    └──────────────────────┘                                     │
│           ↓                                                      │
│    ┌──────────────────────┐                                     │
│    │    MainTabs Screen   │                                     │
│    │    (HomeScreen)      │                                     │
│    └──────────────────────┘                                     │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
         ↑                                    ↑
         │                                    │
         └────────────────────────────────────┘
              Deep Link Handler
            (bazaarx://auth/callback)
```

### Data Flow

```
Google OAuth Credentials
  ↓
App Initialization
  ├─ supabase.auth.onAuthStateChange() listener
  ├─ Supabase configured with Google OAuth provider
  └─ Deep linking configured for bazaarx:// scheme
  ↓
User Interaction
  └─ Clicks "Continue with Google" button
  ↓
OAuth Request
  ├─ supabase.auth.signInWithOAuth('google')
  ├─ Returns Google OAuth URL
  └─ WebBrowser opens URL in native browser
  ↓
User Authenticates
  ├─ Google consent screen shown
  ├─ User confirms permissions
  └─ Google redirects to: bazaarx://auth/callback?code=...&state=...
  ↓
Deep Link Callback
  ├─ System OS routes to app automatically
  ├─ Supabase receives deep link redirect
  ├─ Auth code exchanged for JWT token
  └─ Token stored in AsyncStorage
  ↓
Auth State Change
  ├─ supabase.auth.onAuthStateChange('SIGNED_IN') triggered
  ├─ checkSession() called automatically
  ├─ Profile + roles + buyer data fetched in parallel
  └─ Auth store updated with full user object
  ↓
Navigation
  ├─ LoginScreen detects session established
  ├─ User logged in (isGuest: false)
  └─ Navigate to MainTabs → HomeScreen
  ↓
User Logged In
  ├─ HomeScreen console logs user data
  ├─ ProfileScreen displays user details
  └─ Session persists across app restart
```

---

## OAuth Flow Diagram

### Complete OAuth Sequence

```
┌─────────┐                                              ┌──────────┐
│   App   │                                              │  Google  │
└────┬────┘                                              └────▲─────┘
     │                                                        │
     │  1. User clicks "Continue with Google"                │
     ├──────────────────────────────────────────────────────→ Get OAuth URL
     │                                                        │
     │ 2. supabase.auth.signInWithOAuth('google')            │
     │    Returns OAuth URL                                   │
     │←──────────────────────────────────────────────────────│
     │                                                        │
     │ 3. WebBrowser.openBrowserAsync(url)                   │
     │    Opens native browser with OAuth URL                │
     │                                                        │
┌────▼────────────────────────────────────────────────────┐  │
│  User sees Google login screen                          │  │
│  (May be pre-populated if user logged into Google)      │  │
│                                                         │  │
│  4. User enters email/password                          │  │
│     (Optional if already logged into Google)            │  │
│                                                         │  │
│  5. User confirms permissions                           │  │
│     "Continue as [name]"                                │  │
└────┬────────────────────────────────────────────────────┘  │
     │                                                        │
     │ 6. Google validates credentials                       │
     │    Generates auth code                                │
     └──────────────────────────────────────────────────────→│
     │                                                        │
     │ 7. Google redirects to:                               │
     │    bazaarx://auth/callback?code=AUTH_CODE&state=...   │
     │←──────────────────────────────────────────────────────│

┌─────────────────────────────────────────────────────────┐
│  App Deep Link Receiver                                 │
│  • OS routes redirect back to app                       │
│  • Authorization code captured                           │
└───────────────┬───────────────────────────────────────────┘
                │
        ┌───────▼────────────┐
        │   Supabase         │
        │   Auth Backend     │
        └───────┬────────────┘
                │
     8. Exchange auth code for JWT
        supabase.auth with code
                │
     9. Validate code + generate session token
                │
    10. Store token in AsyncStorage (via supabase.auth)
                │
    11. Trigger onAuthStateChange('SIGNED_IN')
                │
        ┌───────▼────────────────┐
        │  App Session Handler   │
        │  (App.tsx)             │
        └───────┬────────────────┘
                │
   12. checkSession() called automatically
       • Fetch profile from profiles table
       • Fetch roles from user_roles table
       • Fetch buyer data from buyers table
                │
        ┌───────▼────────────────┐
        │  Auth Store (zustand)  │
        │  User data synced:     │
        │  • id, name, email     │
        │  • phone, avatar       │
        │  • roles, bazcoins     │
        │  • isGuest: false ✓    │
        └───────┬────────────────┘
                │
        ┌───────▼────────────────┐
        │  LoginScreen           │
        │  Detects session       │
        │  Navigates to MainTabs │
        └───────┬────────────────┘
                │
        ┌───────▼────────────────┐
        │  HomeScreen            │
        │  User logged in! ✅    │
        └────────────────────────┘
```

---

## Component Flow

### LoginScreen OAuth Handler

```typescript
handleGoogleSignIn()
  ├─ Set loading = true
  ├─ Call supabase.auth.signInWithOAuth('google')
  │  └─ Returns { url: 'https://accounts.google.com/...' }
  │
  ├─ Open browser with WebBrowser.openBrowserAsync(url)
  │  └─ User sees Google login & consent screens
  │
  ├─ Wait for browser to close or redirect
  │  └─ Deep link handler processes redirect automatically
  │
  ├─ Wait 800ms for session to settle
  │  └─ Gives Supabase time to store token & trigger onAuthStateChange
  │
  ├─ Check supabase.auth.getSession()
  │  ├─ Session exists? ✓
  │  │  └─ Navigate to MainTabs ('Home')
  │  └─ No session?
  │     └─ Alert user & return to LoginScreen
  │
  └─ Set loading = false
```

### App.tsx Auth State Change

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    // OAuth redirect came through
    // Trigger session sync automatically
    useAuthStore.getState().checkSession?.()
  }

  if (event === 'SIGNED_OUT') {
    useAuthStore.getState().logout()
  }
})
```

### Auth Store Session Check

```typescript
checkSession() {
  ├─ Get current session from supabase
  ├─ Fetch profile, roles, buyer in parallel
  ├─ Build user object
  │  └─ id, name, email, phone, avatar, roles, bazcoins
  ├─ Update auth store:
  │  ├─ user: { ... full user data ... }
  │  ├─ isAuthenticated: true
  │  ├─ isGuest: false ← KEY FIX
  │  └─ activeRole: from roles[0]
  └─ Load wishlist from Supabase
}
```

---

## Implementation Details

### Files Modified

#### 1. **src/utils/googleAuth.ts** (NEW)

**Purpose:** OAuth utilities and browser handling helpers

**Key Functions:**
- `createGoogleAuthRequest()` — Generates OAuth request config
- `startGoogleOAuthFlow()` — Opens browser and handles OAuth
- `handleGoogleOAuthRedirect()` — Parses redirect URL for code
- `getSupabaseGoogleOAuthURL()` — Gets Supabase OAuth endpoint

**Status:** Library/utility—not directly called in current implementation
**Future Use:** Can be imported if additional OAuth flows needed

#### 2. **app/LoginScreen.tsx** (UPDATED)

**Changes:**
```typescript
// Added imports
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Added state
const [isGoogleLoading, setIsGoogleLoading] = useState(false);

// Added handler
const handleGoogleSignIn = async () => {
  // 1. Get OAuth URL from Supabase
  const { url } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: 'bazaarx://auth/callback',
      skipBrowserRedirect: false,
    },
  });

  // 2. Open browser
  const result = await WebBrowser.openBrowserAsync(url);

  // 3. Wait for session to settle
  await new Promise(resolve => setTimeout(resolve, 800));

  // 4. Check if session established
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) {
    navigation.replace('MainTabs', { screen: 'Home' });
  }
};

// Updated Google button
<Pressable onPress={handleGoogleSignIn} disabled={isGoogleLoading}>
  {isGoogleLoading ? (
    <ActivityIndicator />
  ) : (
    <>
      <Image src={googleIcon} />
      <Text>Sign in with Google</Text>
    </>
  )}
</Pressable>
```

**Before:** Alert showed "Google Sign-In will be available soon."
**After:** Actual OAuth flow with browser integration

#### 3. **src/services/authService.ts** (UPDATED)

**Added Method:** `signInWithGoogle()`

```typescript
async signInWithGoogle(): Promise<AuthResult | null> {
  // Get current session (set by Supabase after OAuth redirect)
  const { data, error } = await supabase.auth.getSession();

  if (!data.session?.user) {
    throw new Error('No session established after Google sign-in');
  }

  // Update last login timestamp
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.session.user.id);

  return { user: data.session.user, session: data.session };
}
```

**Purpose:** Placeholder method for potential future use
**Current Usage:** Session is automatically handled by `checkSession()`

#### 4. **App.tsx** (UPDATED)

**Change:** Enhanced deep link configuration comments

```typescript
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['bazaarx://'],
  config: {
    screens: {
      ResetPassword: 'reset-password',
      PaymentCallback: { path: 'payment/:type' },
      // OAuth callback deep link for Google Sign-In redirect
      // When Supabase redirects after Google auth, it will call:
      // bazaarx://auth/callback?code=...&state=...
      // This matches the redirectTo in LoginScreen's signInWithOAuth call
    },
  },
};
```

**Why Deep Link Handling Already Works:**
- `NavigationContainer` with `linking` prop auto-handles all deep links
- Deep links route to appropriate screens based on config
- Our OAuth redirect (`bazaarx://auth/callback`) is automatically captured
- No explicit screen needed—redirect is processed server-side by Supabase

---

## Setup Requirements

### Pre-Implementation (Already Done ✅)

- ✅ `expo-web-browser` dependency available
- ✅ `expo-auth-session` available
- ✅ Deep linking configured in `app.json` with `"scheme": "bazaarx"`
- ✅ Bundle IDs correct: `com.bazaarx.mobile` (iOS & Android)
- ✅ Supabase client configured

### Required Before Testing

#### 1. Create Google OAuth Credentials

**Step 1:** Go to https://console.cloud.google.com/apis/credentials

**Step 2:** Click "Create Credentials" → "OAuth 2.0 Client IDs"

**Step 3:** Create TWO client IDs (one for each platform):

For **iOS**:
```
Application type: iOS App
Name: BazaarX iOS
Bundle ID: com.bazaarx.mobile
Save → Get Client ID
```

For **Android**:
```
Application type: Android App
Name: BazaarX Android
Package name: com.bazaarx.mobile
SHA-1 certificate fingerprint: [Get from Android build]
Save → Get Client ID
```

#### 2. Add Credentials to Supabase

**Step 1:** Open Supabase dashboard → Authentication → Providers

**Step 2:** Find Google provider → Click "Edit"

**Step 3:** Enable → Add credentials:

```
Client IDs: [Paste Web Client ID], [Paste iOS Client ID], [Paste Android Client ID]
(Note: Do not delete existing Web Client IDs or Secrets. Just add your new mobile Client IDs to the same input field, separated by commas).

Redirect URL: https://YOUR_PROJECT.supabase.co/auth/v1/callback
(Auto-generated, no manual entry)
```

**Step 4:** Save

#### 3. (Android Only) Get SHA-1 Fingerprint

If building for Android DevBuild:

```bash
# Generate keystore
keytool -genkey -v -keystore release.keystore \
  -keyalg RSA -keysize 2048 -validity 10000

# Get SHA-1
keytool -list -v -keystore release.keystore
# Look for: SHA1: XX:XX:XX:...
```

---

## Testing Guide

### Test Environment

- **Device:** iOS Simulator, Android Emulator, or Physical Device
- **Expo:** Expo Go or Development Build
- **Command:** `npx expo start`

### Test Scenarios

#### Scenario 1: Basic OAuth Flow ✓

**Steps:**
1. Launch app
2. Navigate to LoginScreen
3. Click "Continue with Google" button
4. Verify browser opens with Google login (NOT alert)
5. Enter Google credentials
6. Tap "Continue as [name]"
7. Verify redirect back to app
8. Check HomeScreen console: `isGuest: false` ✓
9. Navigate to ProfileScreen—verify user data displayed ✓

**Expected Result:** User fully logged in with all profile data

#### Scenario 2: Session Persistence

**Steps:**
1. Complete OAuth login (Scenario 1) ✓
2. Fully close app (force stop on mobile)
3. Reopen app
4. Verify user still logged in
5. Check HomeScreen console: session restored ✓

**Expected Result:** No re-authentication needed

#### Scenario 3: Permission Denial

**Steps:**
1. Click "Continue with Google"
2. Browser opens
3. Click "Cancel" or "Deny" at Google consent
4. Verify graceful return to LoginScreen
5. Verify no errors or crashes

**Expected Result:** User returned to login, can retry or use email/password

#### Scenario 4: Network Error

**Steps:**
1. Device in airplane mode (simulate network error)
2. Click "Continue with Google"
3. Verify alert shown: "Google Sign-In failed..."
4. Disable airplane mode
5. Retry Google Sign-In
6. Verify succeeds

**Expected Result:** Graceful error handling, retry works

#### Scenario 5: Cross-Platform Consistency

**Steps:**
1. iOS: Complete OAuth login from iOS simulator ✓
2. Android: Complete same OAuth login on Android emulator ✓
3. Verify both create same user profile
4. Verify both can login again

**Expected Result:** Same behavior across platforms

### Verification Checklist

```
Browser OAuth Flow
  ☐ "Continue with Google" button visible on LoginScreen
  ☐ Clicking button opens native browser (not alert)
  ☐ Google login page appears
  ☐ User can enter credentials
  ☐ User can confirm permissions
  ☐ Redirects back to app (no crash)

Session Restoration
  ☐ App navigates to MainTabs after OAuth
  ☐ HomeScreen console shows isGuest: false
  ☐ HomeScreen console shows populated user data
  ☐ ProfileScreen displays user name & email
  ☐ Session persists after app restart

Error Handling
  ☐ Denying permissions returns to LoginScreen
  ☐ Network errors show alert
  ☐ Can retry after error
  ☐ No console errors or crashes

Cross-Platform
  ☐ iOS simulator works
  ☐ Android emulator works
  ☐ Same OAuth credentials work on both
  ☐ User data consistent across platforms
```

---

## Troubleshooting

### Issue: "Failed to initialize Google Sign-In"

**Root Causes:**
1. Google OAuth provider not enabled in Supabase
2. Credentials not added to Supabase
3. Wrong Client IDs pasted

**Solution:**
1. Go to Supabase → Authentication → Providers → Google
2. Check "Enabled" is ON (green toggle)
3. Verify Client IDs are filled in (not placeholder text)
4. Save changes
5. Try again

---

### Issue: "Continue with Google" button shows alert instead of browser

**Root Cause:** Code not updated or incorrect import

**Solution:**
1. Verify [app/LoginScreen.tsx](app/LoginScreen.tsx) has `handleGoogleSignIn` function
2. Verify Google button calls `onPress={handleGoogleSignIn}`
3. Verify imports include `expo-web-browser`
4. Restart Expo: `npx expo start` (clear cache if needed)

---

### Issue: Browser opens but shows "Invalid Request"

**Root Cause:** Redirect URI mismatch between Google Cloud and Supabase

**Solution:**
1. In Google Cloud Console → Credentials → OAuth 2.0 Client IDs
2. Verify Authorized redirect URIs include Supabase callback
3. Should be: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. Verify exact URL (no trailing slash, correct domain)
5. Save
6. Try again

---

### Issue: Still showing "Guest User" after Google login

**Root Cause:** `isGuest: false` not being set in auth store

**Solution:**
1. Check [app/LoginScreen.tsx](app/LoginScreen.tsx) line after OAuth successful
2. Verify `useAuthStore.getState().setUser(...)` is called (if manual flow)
3. Verify auth store's `setUser()` sets `isGuest: false`
4. Verify [src/stores/authStore.ts](src/stores/authStore.ts) line ~263 has `isGuest: false`
5. Check console logs for auth store updates

---

### Issue: HomeScreen console shows empty user data

**Root Cause:** Session established but profile not loaded

**Solution:**
1. Verify `checkSession()` is being called (check App.tsx line ~296)
2. Verify `onAuthStateChange('SIGNED_IN')` event fires (add console.log)
3. Verify profile table has entry for Google user ID
4. Check Supabase database → profiles for user row
5. If missing, manually create:
   ```sql
   INSERT INTO profiles (id, email, first_name, last_name)
   VALUES ('google-user-id', 'user@gmail.com', 'First', 'Last');
   ```

---

### Issue: Redirect loop (keeps redirecting back to LoginScreen)

**Root Cause:** Deep link not configured correctly

**Solution:**
1. Verify `app.json` has: `"scheme": "bazaarx"`
2. Verify `App.tsx` linking config includes OAuth
3. Verify Supabase redirect URL is exactly:
   `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
4. Verify NO typos in scheme name
5. Clear cache: `npx expo start --clear`

---

### Issue: "Route refused to connect" or app crashes upon Google redirect

**Root Cause:** You are testing inside **Expo Go** (`npx expo start`), but you hardcoded a custom native scheme (`bazaarx://`) as the redirect URL. Expo Go does not recognize custom schemes. It only recognizes `exp://`.

**Solution 1 (Recommended for Native Testing):**
Compile a native development build. This registers `bazaarx://` natively to your OS.
Ensure you have Android Studio/Java set up, and run:
```bash
npx expo run:android
```

**Solution 2 (If you must use Expo Go):**
Dynamically generate the redirect URL via `expo-auth-session` and whitelist it in Supabase temporarily.
```typescript
import * as AuthSession from 'expo-auth-session';

const redirectUrl = AuthSession.makeRedirectUri({ path: 'auth/callback' });
// Pass redirectUrl to signInWithOAuth instead of 'bazaarx://auth/callback'
```
*(Remember: You must add the generated `exp://192.168...` URL to the Redirect URIs in Supabase for this to work).*

---

### Issue: "User already exists" error

**Root Cause:** Same email used for both OAuth and email signup

**Solution (Current Behavior):**
- User tries to Google login with email `user@gmail.com`
- But they already have email/password account with same email
- Creates two separate accounts

**Future Enhancement (Account Linking):**
- Implement logic to merge accounts with same email
- Ask user if they want to link instead of creating duplicate
- One user object, two auth methods

---

## Future Enhancements

### Account Linking

**Goal:** If user exists with password auth + same email, link instead of duplicate

**Implementation:**
```typescript
// In authService.signUp()
const existingUser = await getEmailRoleStatus(email);
if (existingUser.exists) {
  // Instead of error, offer to link accounts
  // Link both auth methods to same user ID
}
```

---

### Additional OAuth Providers

**Goal:** Add Facebook, GitHub, etc.

**Implementation:**
```typescript
// In LoginScreen
const handleFacebookSignIn = async () => {
  const { url } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',  // ← Change provider
    options: { redirectTo: 'bazaarx://auth/callback' },
  });
  // Rest same as Google
};
```

**New Providers Already Supported by Supabase:**
- Facebook
- GitHub
- Discord
- Apple
- Twitch
- Microsoft
- LinkedIn

---

### Magic Link (Passwordless Email)

**Goal:** Email link authentication as passwordless option

**Implementation:**
```typescript
const handleMagicLink = async (email: string) => {
  await supabase.auth.signInWithOtp({ email });
  // Send link to user's email
};
```

---

## References

- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login)
- [Expo Web Browser API](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [Expo Auth Session API](https://docs.expo.dev/guides/authentication/#expo-auth-session)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [React Native Deep Linking](https://reactnative.dev/docs/linking)

---

## Summary

### What Was Accomplished

✅ Google OAuth 2.0 integration using Supabase + Expo
✅ Native browser OAuth flow (better UX)
✅ Automatic session restoration via deep linking
✅ Full user profile loaded after authentication
✅ `isGuest: false` flag correctly set
✅ Error handling with user feedback
✅ Cross-platform (iOS/Android) support

### Next Steps

1. **Get Google OAuth Credentials** (if not already done)
2. **Add to Supabase Dashboard** (if not already done)
3. **Test OAuth Flow** on device
4. **Verify Session Persistence**
5. **Test Error Scenarios**
6. **Deploy to Production** (when ready)

### Testing Status

- [ ] OAuth Browser Opens
- [ ] Google Login Screen Appears
- [ ] Redirect Back to App Works
- [ ] User Data Loads Successfully
- [ ] isGuest: false Verified
- [ ] Session Persists After Restart
- [ ] Error Handling Works
- [ ] Cross-Platform Tested

---

**Implementation Date:** April 2026
**Status:** Ready for Testing
**Owner:** BazaarX Mobile Team
