/**
 * Authentication Service
 * Handles user authentication and profile management
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile, Buyer, Seller } from '@/types/database.types';

// Service-specific types
export interface SignUpData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  user_type: 'buyer' | 'seller' | 'admin';
}

export interface AuthResult {
  user: any;
  session?: any;
}

export class AuthService {
  /**
   * Sign up a new user
   * @param email - User email address
   * @param password - User password
   * @param userData - Additional user data including type
   * @returns Promise<AuthResult | null>
   */
  async signUp(
    email: string,
    password: string,
    userData: SignUpData
  ): Promise<AuthResult | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot sign up');
      return { user: { id: crypto.randomUUID(), email } } as AuthResult;
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

      // Create or update profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: authData.user.id,
              email,
              full_name: userData.full_name || null,
              phone: userData.phone || null,
              user_type: userData.user_type,
              avatar_url: null,
              last_login_at: null,
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false,
            }
          );

        if (profileError) throw profileError;

        // Create user-type specific record
        await this.createUserTypeRecord(authData.user.id, userData.user_type);
      }

      return { user: authData.user, session: authData.session };
    } catch (error: any) {
      console.error('Error signing up:', error);

      // Check if this is a "user already registered" error
      if (error?.message?.includes('User already registered') ||
          error?.message?.includes('already exists') ||
          error?.status === 422) {
        // Return a specific error that indicates user already exists
        const authError = new Error('User already registered');
        (authError as any).isAlreadyRegistered = true;
        throw authError;
      }

      throw new Error('Failed to create account. Please try again.');
    }
  }

  /**
   * Upgrade an existing user to a different type (e.g., buyer to seller)
   * @param userId - User ID to upgrade
   * @param newUserType - New user type to assign
   * @returns Promise<boolean>
   */
  async upgradeUserType(userId: string, newUserType: 'buyer' | 'seller' | 'admin'): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot upgrade user type');
      return true;
    }

    try {
      // Update the user type in the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_type: newUserType })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Create user-type specific record if needed
      // For seller, we don't create the record here since it's handled separately
      if (newUserType !== 'seller') {
        await this.createUserTypeRecord(userId, newUserType);
      }

      return true;
    } catch (error) {
      console.error('Error upgrading user type:', error);
      throw new Error('Failed to upgrade user type. Please try again.');
    }
  }

  /**
   * Sign in with email and password
   * @param email - User email
   * @param password - User password
   * @returns Promise<AuthResult | null>
   */
  async signIn(
    email: string,
    password: string
  ): Promise<AuthResult | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot sign in');
      return { user: { id: crypto.randomUUID(), email } } as AuthResult;
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

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Error signing in:', error);
      throw new Error('Failed to sign in. Please check your credentials.');
    }
  }

  /**
   * Sign in with OAuth provider
   * @param provider - OAuth provider (google or facebook)
   * @returns Promise with OAuth URL
   */
  async signInWithProvider(
    provider: 'google' | 'facebook'
  ): Promise<{ url: string } | null> {
    if (!isSupabaseConfigured()) {
      console.warn(`Supabase not configured - cannot use OAuth`);
      return { url: window.location.origin };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { url: data.url };
    } catch (error) {
      console.error(`Error signing in with ${provider}:`, error);
      throw new Error(`Failed to sign in with ${provider}. Please try again.`);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error);
      throw new Error('Failed to sign out. Please try again.');
    }
  }

  /**
   * Get user profile by ID
   * @param userId - User ID
   * @returns Promise<Profile | null>
   */
  async getUserProfile(userId: string): Promise<Profile | null> {
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
      throw new Error('Failed to load profile.');
    }
  }

  /**
   * Get buyer profile with related profile data
   * @param userId - User ID
   * @returns Promise<Buyer | null>
   */
  async getBuyerProfile(userId: string): Promise<Buyer | null> {
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
      throw new Error('Failed to load buyer profile.');
    }
  }

  /**
   * Get seller profile with related profile data
   * @param userId - User ID
   * @returns Promise<Seller | null>
   */
  async getSellerProfile(userId: string): Promise<Seller | null> {
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
      throw new Error('Failed to load seller profile.');
    }
  }

  /**
   * Get email from profile by user ID
   * @param userId - User ID
   * @returns Promise<string | null>
   */
  async getEmailFromProfile(userId: string): Promise<string | null> {
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
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param updates - Partial profile updates
   * @returns Promise<boolean>
   */
  async updateProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<boolean> {
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
      throw new Error('Failed to update profile.');
    }
  }

  /**
   * Send password reset email
   * @param email - User email
   */
  async resetPassword(email: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error('Failed to send password reset email.');
    }
  }

  /**
   * Update user password
   * @param newPassword - New password
   */
  async updatePassword(newPassword: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error updating password:', error);
      throw new Error('Failed to update password.');
    }
  }

  /**
   * Create or ensure a buyer account exists for the user
   * @param userId - User ID
   * @returns Promise<boolean> indicating success
   */
  async createBuyerAccount(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot create buyer account');
      return true;
    }

    try {
      // Check if buyer record already exists
      const { data: existingBuyer, error: fetchError } = await supabase
        .from('buyers')
        .select('id')
        .eq('id', userId)
        .single();

      if (!fetchError && existingBuyer) {
        // Buyer record already exists
        return true;
      }

      // Create buyer record
      const { error } = await supabase.from('buyers').upsert(
        {
          id: userId,
          shipping_addresses: [],
          payment_methods: [],
          preferences: {
            language: 'en',
            currency: 'PHP',
            notifications: {
              email: true,
              sms: false,
              push: true,
            },
            privacy: {
              showProfile: true,
              showPurchases: false,
              showFollowing: true,
            },
          },
          followed_shops: [],
          total_spent: 0,
          bazcoins: 0,
          total_orders: 0,
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Error creating buyer record:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in createBuyerAccount:', error);
      throw new Error('Failed to create buyer account. Please try again.');
    }
  }

  /**
   * Private helper: Create user-type specific record
   */
  private async createUserTypeRecord(
    userId: string,
    userType: 'buyer' | 'seller' | 'admin'
  ): Promise<void> {
    if (userType === 'buyer') {
      const { error } = await supabase.from('buyers').upsert(
        {
          id: userId,
          shipping_addresses: [],
          payment_methods: [],
          preferences: {},
          followed_shops: [],
          total_spent: 0,
          bazcoins: 0,
          total_orders: 0,
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Error creating buyer record:', error);
        throw error;
      }
    } else if (userType === 'admin') {
      const { error } = await supabase.from('admins').upsert(
        {
          id: userId,
          role: 'admin',
          permissions: {},
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Error creating admin record:', error);
        throw error;
      }
    }
    // Seller records are created separately during registration flow
    // When upgrading to seller, the seller record is created elsewhere
  }
}

// Export singleton instance
export const authService = new AuthService();
