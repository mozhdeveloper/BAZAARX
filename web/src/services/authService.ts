/**
 * Authentication Service
 * Handles user authentication and profile management
 * Updated for new normalized database schema (February 2026)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile, Buyer, Seller, UserRole, UserRoleRecord, FullProfile } from '@/types/database.types';

// Service-specific types
export interface SignUpData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_type: UserRole;
}

// Legacy support - maps to first_name
export interface LegacySignUpData extends Omit<SignUpData, 'first_name' | 'last_name'> {
  full_name?: string;
}

export interface AuthResult {
  user: any;
  session?: any;
}

export interface ProfileContact {
  email: string | null;
  phone: string | null;
}

const defaultBuyerPreferences = {
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
};

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
    userData: SignUpData | LegacySignUpData
  ): Promise<AuthResult | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot sign up');
      return { user: { id: crypto.randomUUID(), email } } as AuthResult;
    }

    // Handle legacy full_name format
    const first_name = 'first_name' in userData ? userData.first_name : 
                       ('full_name' in userData ? (userData as LegacySignUpData).full_name?.split(' ')[0] : null);
    const last_name = 'last_name' in userData ? userData.last_name :
                      ('full_name' in userData ? (userData as LegacySignUpData).full_name?.split(' ').slice(1).join(' ') : null);

    try {
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...userData,
            first_name,
            last_name,
          },
        },
      });

      if (authError) throw authError;

      // Create or update profile (new schema - no user_type)
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: authData.user.id,
              email,
              first_name: first_name || null,
              last_name: last_name || null,
              phone: userData.phone || null,
              last_login_at: null,
            },
            {
              onConflict: 'id',
              ignoreDuplicates: false,
            }
          );

        if (profileError) throw profileError;

        // Create user_role entry (new normalized schema)
        await this.addUserRole(authData.user.id, userData.user_type);

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
   * Uses user_roles table for multi-role support (users can be BOTH buyer AND seller)
   * @param userId - User ID to upgrade
   * @param newUserType - New user type to add
   * @returns Promise<boolean>
   */
  async upgradeUserType(userId: string, newUserType: UserRole): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot upgrade user type');
      return true;
    }

    try {
      // Add new role (doesn't replace existing roles)
      await this.addUserRole(userId, newUserType);

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
   * Register an existing buyer as a seller (same email, multi-role)
   * This allows a buyer to also become a seller while keeping their buyer account
   * @param userId - User ID (must already be a buyer)
   * @param sellerData - Seller registration data
   * @returns Promise<Seller | null>
   */
  async registerBuyerAsSeller(
    userId: string,
    sellerData: {
      store_name: string;
      store_description?: string;
      owner_name?: string;
    }
  ): Promise<any | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot register as seller');
      return null;
    }

    try {
      // 1. Verify user exists and is a buyer
      const isBuyer = await this.isUserBuyer(userId);
      if (!isBuyer) {
        throw new Error('User must be a buyer first');
      }

      // 2. Check if already a seller
      const isSeller = await this.isUserSeller(userId);
      if (isSeller) {
        throw new Error('User is already registered as a seller');
      }

      // 3. Add seller role
      await this.addUserRole(userId, 'seller');

      // 4. Create seller record with proper schema fields
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .insert({
          id: userId,
          store_name: sellerData.store_name,
          store_description: sellerData.store_description || null,
          owner_name: sellerData.owner_name || null,
          avatar_url: null,
          approval_status: 'pending', // New sellers start as pending
        })
        .select()
        .single();

      if (sellerError) {
        // Rollback role if seller creation fails
        await supabase.from('user_roles').delete()
          .eq('user_id', userId)
          .eq('role', 'seller');
        throw sellerError;
      }

      return seller;
    } catch (error: any) {
      console.error('Error registering buyer as seller:', error);
      if (error.message?.includes('duplicate key') || error.message?.includes('unique')) {
        throw new Error('A store with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Add a role to a user (new normalized schema)
   * @param userId - User ID
   * @param role - Role to add
   */
  async addUserRole(userId: string, role: UserRole): Promise<void> {
    if (!isSupabaseConfigured()) return;

    // Check if role already exists
    const { data: existingRole, error: existingRoleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .maybeSingle();

    if (existingRoleError) {
      console.error('Error checking existing user role:', existingRoleError);
      throw existingRoleError;
    }

    if (existingRole) return; // Role already exists

    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role });

    if (error) {
      console.error('Error adding user role:', error);
      throw error;
    }
  }

  /**
   * Get all roles for a user
   * @param userId - User ID
   * @returns Promise<UserRole[]>
   */
  async getUserRoles(userId: string): Promise<UserRole[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }

    return data?.map(r => r.role as UserRole) || [];
  }

  /**
   * Check if user has a specific role
   * @param userId - User ID
   * @param role - Role to check
   * @returns Promise<boolean>
   */
  async hasRole(userId: string, role: UserRole): Promise<boolean> {
    const roles = await this.getUserRoles(userId);
    return roles.includes(role);
  }

  /**
   * Check if user is a seller
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isUserSeller(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'seller');
  }

  /**
   * Check if user is a buyer
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isUserBuyer(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'buyer');
  }

  /**
   * Check if user is an admin
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isUserAdmin(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'admin');
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

      // Ensure profile exists and update last login
      if (data.user) {
        // Upsert profile to ensure it exists (handles legacy users without profiles)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email || email,
              first_name: data.user.user_metadata?.first_name || null,
              last_name: data.user.user_metadata?.last_name || null,
              phone: data.user.user_metadata?.phone || null,
              last_login_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (profileError) {
          console.error('Error upserting profile:', profileError);
        }

        // Also ensure buyer record exists for buyer role users
        const { error: buyerError } = await supabase
          .from('buyers')
          .upsert(
            {
              id: data.user.id,
              preferences: {},
              bazcoins: 0,
            },
            { onConflict: 'id', ignoreDuplicates: true }
          );

        if (buyerError) {
          console.error('Error upserting buyer record:', buyerError);
        }
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
   * Get profile contact info by user ID
   * @param userId - User ID
   * @returns Promise<ProfileContact | null>
   */
  async getProfileContact(userId: string): Promise<ProfileContact | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return {
        email: data?.email || null,
        phone: data?.phone || null,
      };
    } catch (error) {
      console.error('Error fetching profile contact:', error);
      return null;
    }
  }

  /**
   * Get email from profile by user ID
   * @param userId - User ID
   * @returns Promise<string | null>
   */
  async getEmailFromProfile(userId: string): Promise<string | null> {
    const contact = await this.getProfileContact(userId);
    return contact?.email || null;
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
   * Updated for new normalized schema - buyers table only has preferences, avatar_url, bazcoins
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
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking buyer record:', fetchError);
        throw fetchError;
      }

      if (existingBuyer) {
        // Buyer record already exists
        return true;
      }

      // Create buyer record (new normalized schema)
      const { error } = await supabase.from('buyers').upsert(
        {
          id: userId,
          avatar_url: null,
          preferences: defaultBuyerPreferences,
          bazcoins: 0,
        },
        { onConflict: 'id' }
      );

      if (error) {
        console.error('Error creating buyer record:', error);
        throw error;
      }

      // Also ensure user has buyer role
      await this.addUserRole(userId, 'buyer');

      return true;
    } catch (error) {
      console.error('Error in createBuyerAccount:', error);
      throw new Error('Failed to create buyer account. Please try again.');
    }
  }

  /**
   * Upgrade currently authenticated user to seller role/profile.
   * Used by role switch flow to avoid password re-entry.
   */
  async upgradeCurrentUserToSeller(payload: {
    store_name: string;
    store_description?: string;
    phone?: string;
    owner_name?: string;
  }): Promise<{ userId: string }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user?.id) {
      throw new Error('Auth session missing');
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, phone')
      .eq('id', user.id)
      .maybeSingle();

    const ownerNameFromProfile = [existingProfile?.first_name, existingProfile?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();
    const ownerName = payload.owner_name?.trim() || ownerNameFromProfile || null;

    await this.addUserRole(user.id, 'seller');

    const { error: sellerError } = await supabase
      .from('sellers')
      .upsert(
        {
          id: user.id,
          store_name: payload.store_name,
          store_description: payload.store_description || null,
          owner_name: ownerName,
          approval_status: 'pending',
        },
        { onConflict: 'id' },
      );

    if (sellerError) {
      console.error('Error creating/updating seller during role switch:', sellerError);
      throw new Error('Failed to initialize seller profile.');
    }

    const phoneToSave = payload.phone?.trim();
    if (phoneToSave && (!existingProfile?.phone || existingProfile.phone.trim().length === 0)) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ phone: phoneToSave })
        .eq('id', user.id);

      if (profileUpdateError) {
        console.error('Error updating profile phone during seller upgrade:', profileUpdateError);
      }
    }

    return { userId: user.id };
  }

  /**
   * Upgrade currently authenticated user to buyer role/profile.
   * Used by role switch flow to avoid password re-entry.
   */
  async upgradeCurrentUserToBuyer(payload: {
    first_name: string;
    last_name: string;
    phone?: string;
    email?: string;
  }): Promise<{ userId: string }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user?.id) {
      throw new Error('Auth session missing');
    }

    await this.addUserRole(user.id, 'buyer');

    const { error: buyerError } = await supabase
      .from('buyers')
      .upsert(
        {
          id: user.id,
          avatar_url: null,
          preferences: defaultBuyerPreferences,
          bazcoins: 0,
        },
        { onConflict: 'id' },
      );

    if (buyerError) {
      console.error('Error creating/updating buyer during role switch:', buyerError);
      throw new Error('Failed to initialize buyer profile.');
    }

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('email, phone')
      .eq('id', user.id)
      .maybeSingle();

    const profileUpsert = {
      id: user.id,
      email: existingProfile?.email || payload.email || user.email || null,
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      phone: existingProfile?.phone || payload.phone || null,
      last_login_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileUpsert, { onConflict: 'id' });

    if (profileError) {
      console.error('Error updating profile during buyer upgrade:', profileError);
      throw new Error('Failed to update profile details.');
    }

    return { userId: user.id };
  }

  /**
   * Private helper: Create user-type specific record
   * Updated for new normalized schema
   */
  private async createUserTypeRecord(
    userId: string,
    userType: UserRole
  ): Promise<void> {
    if (userType === 'buyer') {
      const { error } = await supabase.from('buyers').upsert(
        {
          id: userId,
          avatar_url: null,
          preferences: {},
          bazcoins: 0,
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
