## What does this PR do?
- Implemented Google Sign-In using Supabase OAuth.
- Installed `expo-auth-session` to dynamically generate redirect URLs. This allows the system to support both Standalone native builds (`bazaarx://`) and local development via Expo Go (`exp://...`).
- Automatically handles deep linking to seamlessly restore user sessions after a successful OAuth login.
- Created `MOBILE_EMAIL_AUTH.md` and updated `GOOGLE_SIGNIN_IMPLEMENTATION.md` for team reference.

## Files Changed
- `app/LoginScreen.tsx`
- `package.json` & `package-lock.json`
- `GOOGLE_SIGNIN_IMPLEMENTATION.md`
- `MOBILE_EMAIL_AUTH.md` (New)

## Screenshots (if UI changes)
[N/A - Functional API/routing changes hooked to the existing Google Login Button]

## Testing Done
- Tested Google Sign-in flow thoroughly via local console.
- Verified dynamic `redirectUrl` successfully handles the callback without crashing.
- Ensured graceful error handling when Google prompt is dismissed.

---

## 🚨 IMPORTANT QA TESTING INSTRUCTIONS 🚨

**Context:** Google Sign-In and our Email verification links rely heavily on Supabase matching the redirect URLs. 
Due to limitations with Expo Go generating dynamic local IPs (`exp://192.168.x.x`), and Supabase's strict redirect URL matching and rate limits, testing this flow locally via Expo Go is currently unstable and might result in "Route Refused to Connect" or "Email limit reached" errors.

**How to test this PR:**
Full QA testing of the Google OAuth flow will be conducted once this code is merged and a standalone APK or TestFlight app is built. Build environments inherently lock down the `bazaarx://` scheme, bypassing these dynamic IP requirements.

*Please review the codebase changes for now. Full functional testing should be performed on a staging build.*
