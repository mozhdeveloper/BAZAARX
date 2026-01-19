/**
 * Authentication Service
 * Handles user authentication and profile management
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile, Buyer, Seller, Database } from '@/types/database.types';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

/**
 * Sign up a new user
 */
export const signUp = async (
  email: string,
  password: string,
  userData: {
    full_name?: string;
    phone?: string;
    user_type: 'buyer' | 'seller' | 'admin';
  }
): Promise<{ user: any; error: any }> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - mock signup');
    return { user: { id: crypto.randomUUID(), email }, error: null };
  }

  try {
    // Sign up with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
      },
    });

    if (authError) throw authError;

    // Create or update profile (use upsert to avoid conflicts)
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email,
          full_name: userData.full_name || null,
          phone: userData.phone || null,
          user_type: userData.user_type,
          avatar_url: null,
          last_login_at: null,
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (profileError) {
        console.error('Profile upsert error:', profileError);
        throw profileError;
      }

      // Create user-type specific record
      if (userData.user_type === 'buyer') {
        const { error: buyerError } = await supabase.from('buyers').upsert({
          id: authData.user.id,
          shipping_addresses: [],
          payment_methods: [],
          preferences: {},
          followed_shops: [],
        }, { onConflict: 'id' });
        
        if (buyerError) console.error('Buyer profile error:', buyerError);
      } else if (userData.user_type === 'seller') {
        // Seller record created separately during registration flow
      } else if (userData.user_type === 'admin') {
        const { error: adminError } = await supabase.from('admins').upsert({
          id: authData.user.id,
          role: 'admin',
          permissions: {},
        }, { onConflict: 'id' });
        
        if (adminError) console.error('Admin profile error:', adminError);
      }
    }

    return { user: authData.user, error: null };
  } catch (error: any) {
    console.error('Signup error:', error);
    return { user: null, error };
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string) => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured - mock signin');
    return { user: { id: crypto.randomUUID(), email }, error: null };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Update last login
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);
    }

    return { user: data.user, session: data.session, error: null };
  } catch (error: any) {
    console.error('Signin error:', error);
    return { user: null, session: null, error };
  }
};

/**
 * Sign out
 */
export const signOutUser = async () => {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error: any) {
    console.error('Signout error:', error);
    return { error };
  }
};

/**
 * Get current user profile
 */
export const getUserProfile = async (userId: string): Promise<Profile | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
};

/**
 * Get buyer profile
 */
export const getBuyerProfile = async (userId: string): Promise<Buyer | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('buyers')
      .select('*, profile:profiles(*)')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching buyer profile:', error);
    return null;
  }
};

/**
 * Get seller profile
 */
export const getSellerProfile = async (userId: string): Promise<Seller | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('sellers')
      .select('*, profile:profiles(*)')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching seller profile:', error);
    return null;
  }
};

/**
 * Get email from profiles table by user ID
 * Query: select email from profiles where id = $1
 */
export const getEmailFromProfile = async (userId: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.email || null;
  } catch (error) {
    console.error('Error fetching email from profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  userId: string,
  updates: Partial<Profile>
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

/**
 * Reset password
 */
export const resetPassword = async (email: string) => {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    return { error };
  } catch (error: any) {
    console.error('Reset password error:', error);
    return { error };
  }
};

/**
 * Update password
 */
export const updatePassword = async (newPassword: string) => {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    return { error };
  } catch (error: any) {
    console.error('Update password error:', error);
    return { error };
  }
};
