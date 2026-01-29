/**
 * Authentication Service (Mobile)
 * Handles user authentication and profile management
 * Ported from web/src/services/authService.ts
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile, Seller } from '@/types/database.types';

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
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Generate a UUID for fallback mode
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Sign up a new user
   */
  async signUp(
    email: string,
    password: string,
    userData: Omit<SignUpData, 'email' | 'password'>
  ): Promise<AuthResult | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot sign up');
      return { user: { id: this.generateUUID(), email } } as AuthResult;
    }

    try {
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
    } catch (error) {
      console.error('Error signing up:', error);
      throw new Error('Failed to create account. Please try again.');
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<AuthResult | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot sign in');
      return { user: { id: this.generateUUID(), email } } as AuthResult;
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
   * Get current session
   */
  async getSession(): Promise<any> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Get user profile by ID
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
   * Get seller profile
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
   */
  async resetPassword(email: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
    } catch (error) {
      console.error('Error resetting password:', error);
      throw new Error('Failed to send password reset email.');
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
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();
