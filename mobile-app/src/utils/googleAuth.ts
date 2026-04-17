/**
 * Google OAuth Authentication Helper
 * Manages OAuth request generation and token exchange for Google Sign-In
 * Works with Expo Auth Session and Supabase OAuth
 */

import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Complete the web browser request when redirected back to app
WebBrowser.maybeCompleteAuthSession();

// Redirect URI must match app scheme + deep link path
// Set in app.json scheme and Supabase redirect configuration
const REDIRECT_URI = AuthSession.getRedirectUrl();

/**
 * Get Google OAuth request configuration
 * Returns auth request for use with Expo Auth Session
 */
export function createGoogleAuthRequest() {
    const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    return {
        clientId: 'YOUR_GOOGLE_CLIENT_ID', // Will be injected via env or app config
        redirectUrl: REDIRECT_URI,
        scopes: ['profile', 'email'],
        usePKCE: true,
        discovery,
    };
}

/**
 * Open browser and initiate Google OAuth flow
 * @param authRequest - Auth request configuration from createGoogleAuthRequest()
 * @returns Promise with access token and user info on success
 */
export async function startGoogleOAuthFlow(authRequest: any) {
    try {
        // Use Expo Auth Session to handle OAuth flow with native browser
        const result = await (AuthSession as any).startAsync(authRequest);

        if (result.type === 'success') {
            const { authentication } = result;
            if (authentication?.accessToken) {
                return {
                    success: true,
                    accessToken: authentication.accessToken,
                    idToken: authentication.idToken,
                    refreshToken: authentication.refreshToken,
                };
            }
        } else if (result.type === 'dismiss') {
            return {
                success: false,
                error: 'User canceled Google Sign-In',
            };
        } else if (result.type === 'error') {
            return {
                success: false,
                error: result.error?.message || 'OAuth flow error',
            };
        }

        return {
            success: false,
            error: 'Unknown error during Google Sign-In',
        };
    } catch (error) {
        console.error('[GoogleAuth] OAuth flow error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to initiate Google Sign-In',
        };
    }
}

/**
 * Alternative: Use Supabase OAuth endpoint directly via deep link handler
 * This is called in App.tsx or LoginScreen to parse the OAuth redirect
 *
 * Usage:
 * 1. After user confirms Google consent, browser redirects to app deep link
 * 2. App parses URL parameters for auth code
 * 3. This function exchanges code for session via Supabase
 */
export async function handleGoogleOAuthRedirect(url: string) {
    try {
        // Extract auth code from redirect URL
        // Format: bazaarx://auth/callback?code=AUTH_CODE&state=STATE
        const parsed = new URL(url);
        const code = parsed.searchParams.get('code');
        const error = parsed.searchParams.get('error');

        if (error) {
            return {
                success: false,
                error: error || 'OAuth error from provider',
            };
        }

        if (!code) {
            return {
                success: false,
                error: 'No authorization code received',
            };
        }

        return {
            success: true,
            code,
        };
    } catch (err) {
        console.error('[GoogleAuth] Redirect handler error:', err);
        return {
            success: false,
            error: err instanceof Error ? err.message : 'Failed to parse OAuth redirect',
        };
    }
}

/**
 * Get Supabase OAuth URL for manual flow
 * Use this if Expo Auth Session doesn't work well for your setup
 *
 * User flow:
 * 1. Open this URL in browser
 * 2. User confirms with Google
 * 3. Supabase redirects to: bazaarx://auth/callback?access_token=...&expires_in=...
 * 4. Handle redirect in app to extract access token
 */
export function getSupabaseGoogleOAuthURL(supabaseUrl: string): string {
    const params = new URLSearchParams({
        provider: 'google',
        redirect_to: 'bazaarx://auth/callback',
    });
    return `${supabaseUrl}/auth/v1/authorize?${params.toString()}`;
}
