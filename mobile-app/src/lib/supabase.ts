import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase-generated.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom fetch with 30-second timeout (increased from 10s to reduce Network request failed errors in slow connections)
const fetchWithTimeout = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30_000);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
};

/** Clear all auth-related AsyncStorage keys */
const clearAuthStorage = async () => {
  try {
    await AsyncStorage.removeItem('supabase.auth.token');
    const supabaseProject = supabaseUrl.split('//')[1]?.split('.')[0];
    if (supabaseProject) {
      await AsyncStorage.removeItem(`sb-${supabaseProject}-auth-token`);
    }
  } catch (_) {
    // Swallow — storage may already be empty
  }
};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        storageKey: 'supabase.auth.token',
    },
    global: {
        fetch: fetchWithTimeout,
    },
});

// Handle auth state changes and refresh-token errors gracefully
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    // Successful refresh — nothing to do
  } else if (event === 'SIGNED_OUT') {
    // Clean up stale tokens so the next sign-in starts fresh
    await clearAuthStorage();
  }
});

// Proactively validate the stored session on cold start.
// If the refresh token is invalid/revoked Supabase will throw; we catch
// that, wipe the stale tokens and let the app redirect to sign-in.
(async () => {
  try {
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.log('[Auth] Stale session cleared on startup');
      await clearAuthStorage();
      await supabase.auth.signOut().catch(() => {});
    }
  } catch {
    await clearAuthStorage();
    await supabase.auth.signOut().catch(() => {});
  }
})();

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.length > 0 && key.length > 0);
};

/**
 * Admin operations have been moved to Supabase Edge Functions.
 * Use supabase.functions.invoke('function-name', { body }) instead.
 *
 * @deprecated — do not use supabaseAdmin in new code
 */
export const supabaseAdmin = null;