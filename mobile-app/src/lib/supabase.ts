import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase-generated.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Custom fetch with 45-second timeout (increased from 30s for slow networks and code exchange operations)
// Code exchange may be slower due to email verification processing on Supabase backend
const fetchWithTimeout = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);
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
    detectSessionInUrl: false,  // Disable to avoid conflicts with custom React Native deep link handling
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

// Note: Cold start session validation is now handled primarily by authStore.checkSession()
// in conjunction with SplashScreen.tsx to ensure a single, raced startup flow.

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
