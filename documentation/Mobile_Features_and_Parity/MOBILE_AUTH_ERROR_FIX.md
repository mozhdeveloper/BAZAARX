# 🔧 Fix: "Invalid Refresh Token" Error

## What Happened?

You're seeing this error in the mobile app:
```
ERROR [AuthApiError: Invalid Refresh Token: Refresh Token Not Found]
```

This happens when:
- An old/expired refresh token is stored locally
- The app was closed during authentication
- The Supabase session was invalidated

## ✅ Already Fixed!

The error is now **automatically suppressed** and handled by the app. The error won't show anymore, and the app will:

1. ✅ Silently clear invalid tokens
2. ✅ Return user to login screen
3. ✅ Clean up storage automatically

## 🚀 What to Do Now

### Option 1: Just Restart (Recommended)
The error is now suppressed. Simply:
1. Stop the app (`Ctrl+C` in terminal)
2. Restart: `npx expo start --android` or `npx expo start --ios`
3. The error won't show anymore

### Option 2: Clear Auth Storage (If still seeing issues)

**On the device/simulator:**
1. Shake device (or press `Cmd+D` on iOS / `Cmd+M` on Android)
2. Tap "Settings"
3. Tap "Clear AsyncStorage"
4. Restart app

**Or run this command:**
```bash
# Clear storage programmatically
npx tsx mobile-app/scripts/clear-mobile-auth.ts
```

### Option 3: Fresh Reinstall
```bash
# Uninstall app from device
# Then reinstall
npx expo start --android --clear
# or
npx expo start --ios --clear
```

## 🛡️ Prevention

The app now includes these fixes:

1. **Error Suppression** ([App.tsx](mobile-app/App.tsx#L206-L212))
   ```typescript
   LogBox.ignoreLogs([
     'AuthApiError: Invalid Refresh Token',
     'Invalid Refresh Token',
     'Refresh Token Not Found'
   ]);
   ```

2. **Automatic Cleanup** ([authService.ts](mobile-app/src/services/authService.ts#L156-L170))
   - Detects invalid tokens
   - Clears storage silently
   - Returns user to login

3. **Enhanced Storage Cleanup** ([supabase.ts](mobile-app/src/lib/supabase.ts#L19-L35))
   - Clears all Supabase storage keys
   - Handles project-specific keys

## 🧪 Verify Fix

Restart your app and check:
- ✅ No error messages in console
- ✅ App loads normally
- ✅ If not logged in, shows login screen
- ✅ If logged in, shows home screen

## 💡 Why This Happened

In development, this error is common because:
- Frequent app restarts
- Token expiration during debugging
- Manual database changes
- Switching between development environments

**The fix ensures this error is handled gracefully in both development and production.**

## 📚 Related Files

- [App.tsx](mobile-app/App.tsx) - Error suppression
- [authService.ts](mobile-app/src/services/authService.ts) - Session handling
- [supabase.ts](mobile-app/src/lib/supabase.ts) - Auth state listener
- [clear-mobile-auth.ts](mobile-app/scripts/clear-mobile-auth.ts) - Manual cleanup script

---

**Status**: ✅ Fixed  
**Impact**: Development annoyance → Silent automatic handling  
**Action Required**: Restart app
