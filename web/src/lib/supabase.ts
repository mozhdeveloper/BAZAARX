/**
 * Supabase Client Configuration
 * Initialize and export the Supabase client for use throughout the application
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Environment variables - these will be set when Supabase project is created
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Validate that environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables are not set. Running in mock mode.');
}

/**
 * Supabase Client Instance
 * This client provides access to:
 * - Authentication
 * - Database (PostgreSQL)
 * - Storage
 * - Realtime subscriptions
 * - Edge Functions
 */
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'bazaarx-web',
      },
    },
  });

/**
 * Helper function to check if Supabase is configured
 */
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Helper function to get current user
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return user;
};

/**
 * Helper function to get current session
 */
export const getCurrentSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Error getting current session:', error);
    return null;
  }
  return session;
};

/**
 * Helper to check if user is authenticated
 */
export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getCurrentSession();
  return session !== null;
};

/**
 * Helper to sign out
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Export types for convenience
export type { Database } from '@/types/database.types';
export type {
  Profile,
  Buyer,
  Seller,
  Product,
  Order,
  OrderItem,
  Cart,
  CartItem,
  Review,
  Voucher,
  Notification,
  Category,
  Address,
} from '@/types/database.types';
