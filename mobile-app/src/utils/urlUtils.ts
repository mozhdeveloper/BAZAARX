import * as AuthSession from 'expo-auth-session';

/**
 * Generates a dynamic redirect URI for authentication callbacks.
 * In Expo Go, this usually resolves to an exp://... URL with the local IP.
 * In a native build (Internal distribution/Production), it resolves to bazaarx://auth/callback.
 * 
 * @returns {string} The generated redirect URI
 */
export const getRedirectUri = (): string => {
  return AuthSession.makeRedirectUri({
    scheme: 'bazaarx',
    path: 'auth/callback',
  });
};

/**
 * Manually extracts the session from an auth callback URL.
 * Required when openAuthSessionAsync consumes the redirect URL on iOS.
 */
export const processAuthSessionResultUrl = async (url: string, supabase: any) => {
  if (!url) return false;
  
  try {
    if (url.includes('code=')) {
      const { error } = await supabase.auth.exchangeCodeForSession(url);
      if (error) throw error;
      return true;
    } else if (url.includes('access_token=') || url.includes('refresh_token=')) {
      const parts = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
      if (parts) {
        const params: Record<string, string> = {};
        parts.split('&').forEach(part => {
          const [key, val] = part.split('=');
          if (key && val) params[key] = decodeURIComponent(val);
        });
        if (params.access_token || params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token || '',
            refresh_token: params.refresh_token || '',
          });
          if (error) throw error;
          return true;
        }
      }
    }
  } catch (error: any) {
    // Ignore PKCE errors as the global Supabase deep link listener typically handles the code exchange automatically in the background.
    if (error?.message?.includes('code verifier should be non-empty')) {
      return false;
    }
    console.error('[urlUtils] Error processing auth URL:', error);
  }
  return false;
};

