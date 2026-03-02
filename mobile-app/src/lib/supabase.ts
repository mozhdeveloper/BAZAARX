import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.EXPO_PUBLIC_SUPABASE_SERVICE_KEY || '';

// Custom fetch with 10-second timeout to prevent Expo Go from hanging indefinitely
const fetchWithTimeout = (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        // Handle refresh token errors gracefully
        storageKey: 'supabase.auth.token',
    },
    global: {
        fetch: fetchWithTimeout,
    },
});

// Set up auth state change listener to handle token refresh errors
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Auth token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    // Clear all auth-related storage keys
    try {
      await AsyncStorage.removeItem('supabase.auth.token');
      // Also clear the Supabase-specific storage key
      const supabaseProject = supabaseUrl.split('//')[1]?.split('.')[0];
      if (supabaseProject) {
        await AsyncStorage.removeItem(`sb-${supabaseProject}-auth-token`);
      }
    } catch (error) {
      console.error('Error clearing auth token:', error);
    }
  } else if (event === 'USER_UPDATED') {
    console.log('User updated');
  }
});

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url && key && url.length > 0 && key.length > 0);
};

/**
 * Admin Supabase Client (service role)
 * Used for public-facing inserts that bypass RLS (e.g., product requests)
 * NOTE: For V1 only. In production, use Edge Functions or a backend API.
 */
export const supabaseAdmin = supabaseServiceKey
  ? createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
        global: {
          fetch: fetchWithTimeout,
        },
      }
    )
  : null;