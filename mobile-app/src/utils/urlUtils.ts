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
