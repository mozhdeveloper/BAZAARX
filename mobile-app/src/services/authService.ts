/**
 * Authentication Service
 * Handles user authentication and profile management
 * Updated for new normalized database schema (February 2026)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile, Buyer, Seller, UserRole, UserRoleRecord, FullProfile } from '@/types/database.types';
import { generateUUID } from '@/utils/uuid';
import { getRedirectUri } from '../utils/urlUtils';

// Service-specific types
export interface SignUpData {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  user_type: UserRole;
  has_accepted_terms?: boolean;
}

// Legacy support - maps to first_name
export interface LegacySignUpData {
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  user_type: UserRole;
  has_accepted_terms?: boolean;
}

export interface AuthResult {
  user: any;
  session?: any;
}

export interface EmailRoleStatus {
  exists: boolean;
  userId: string | null;
  roles: UserRole[];
}

export class AuthService {
  /**
   * Get role status for an email for role-aware signup checks.
   */
  async getEmailRoleStatus(email: string): Promise<EmailRoleStatus> {
    if (!isSupabaseConfigured()) {
      return { exists: false, userId: null, roles: [] };
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      return { exists: false, userId: null, roles: [] };
    }

    try {
      const { data: profileRows, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .limit(1);

      if (profileError || !profileRows || profileRows.length === 0) {
        return { exists: false, userId: null, roles: [] };
      }

      const userId = (profileRows[0] as { id: string }).id;
      const { data: roleRows, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error fetching role status by email:', roleError);
        return { exists: true, userId, roles: [] };
      }

      const roles = ((roleRows ?? []) as Array<{ role: UserRole }>).map((row) => row.role);
      return { exists: true, userId, roles };
    } catch (error) {
      console.error('Unexpected email role status error:', error);
      return { exists: false, userId: null, roles: [] };
    }
  }

  /**
   * Check whether an email is already used by an existing profile.
   * Used for live signup validation.
   */
  async checkEmailExists(email: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', normalizedEmail)
        .limit(1);

      if (error) {
        console.error('Error checking email availability:', error);
        return false;
      }

      return (data ?? []).length > 0;
    } catch (error) {
      console.error('Unexpected email check error:', error);
      return false;
    }
  }

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
      return { user: { id: generateUUID(), email } } as AuthResult;
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
          emailRedirectTo: getRedirectUri(),
          data: {
            ...userData,
            first_name,
            last_name,
          },
        },
      });

      if (authError) throw authError;

      // Create or update profile (new schema - no user_type)
      // NOTE: A Supabase DB trigger (handle_new_user) also creates the profile.
      // We poll until the profile row exists before creating user_roles,
      // since user_roles has a FK chain: user_roles.user_id → profiles.id → auth.users.id
      if (authData.user) {
        const userId = authData.user.id;

        // Poll until the profile row exists (created by trigger) — max 5 seconds
        let profileExists = false;
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: profileCheck } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', userId)
            .maybeSingle();
          if (profileCheck?.id) {
            profileExists = true;
            break;
          }
        }

        if (!profileExists) {
          // Trigger didn't fire or is very slow — attempt a direct upsert as fallback
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
              {
                id: userId,
                email,
                first_name: first_name || null,
                last_name: last_name || null,
                phone: userData.phone || null,
                last_login_at: null,
              },
              { onConflict: 'id', ignoreDuplicates: false }
            );
          if (profileError) {
            console.warn('Fallback profile upsert failed (non-fatal):', profileError);
          }
        } else {
          // Profile exists — enrich it with additional data from the signup form
          await supabase
            .from('profiles')
            .update({
              first_name: first_name || null,
              last_name: last_name || null,
              phone: userData.phone || null,
            })
            .eq('id', userId);
        }

        // Create user_role entry (new normalized schema)
        await this.addUserRole(userId, userData.user_type);

        // Create user-type specific record
        await this.createUserTypeRecord(userId, userData.user_type);
      }

      return { user: authData.user, session: authData.session };
    } catch (error: any) {
      console.error('Error signing up:', error);

      if (error?.message?.includes('rate limit exceeded')) {
        throw new Error('Too many registration attempts. Please wait a while before trying again or use a different email.');
      }

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
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role)
      .single();

    if (existingRole) return; // Role already exists

    // Retry up to 3 times — user_roles has a FK to profiles which may still be
    // propagating from the auth trigger when this is called during signup.
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (!error) return;

      if (error.code === '23503' && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        continue;
      }

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
      return { user: { id: generateUUID(), email } } as AuthResult;
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
      return { url: 'bazaarx://' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUri(),
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
   * Handle Google OAuth sign-in callback
   * Called after user authorizes Google login and is redirected back to app
   * @returns Promise<AuthResult | null>
   */
  async signInWithGoogle(): Promise<AuthResult | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot sign in with Google');
      return null;
    }

    try {
      // Get current session (set by Supabase after OAuth redirect)
      const { data, error } = await supabase.auth.getSession();

      if (error) throw error;

      if (!data.session?.user) {
        throw new Error('No session established after Google sign-in');
      }

      const userId = data.session.user.id;

      // Update last login
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId);

      return { user: data.session.user, session: data.session };
    } catch (error) {
      console.error('[AuthService] Google sign-in error:', error);
      throw new Error('Failed to complete Google sign-in. Please try again.');
    }
  }

  /**
   * Get current session
   * @returns Promise with current session or null
   */
  async getSession(): Promise<{ user: any; session?: any } | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      if (data?.session?.user) {
        return { user: data.session.user, session: data.session };
      }
      return null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
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

      if (error) {
        // If error is "row not found" (PGRST116), it's a valid "empty" result
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    } catch (error: any) {
      // Don't log if it's just a row-not-found case that we might have missed in previous check
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
      return null;
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

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as Buyer;
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching buyer profile:', error);
      }
      return null;
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

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as Seller;
    } catch (error: any) {
      if (error?.code !== 'PGRST116') {
        console.error('Error fetching seller profile:', error);
      }
      return null;
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
   * Resend verification link using Supabase native auth
   * @param email - User email
   */
  async resendVerificationLink(email: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot resend link');
      return false;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: getRedirectUri(),
        }
      });

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error resending verification link:', error);
      if (error.message?.includes('rate limit exceeded')) {
        throw new Error('Resend limit reached. Please wait a while before requesting another link.');
      }
      throw new Error(error.message || 'Failed to resend verification link. Please try again.');
    }
  }

  /**
   * Check if a user's email is already verified
   * Used for the "Check Verification Status" button
   * @param email - User email to check
   */
  async checkVerificationStatus(email: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      // We can check the profile or sign in again to check status
      // But the most reliable way is check the profiles table if we have an entry,
      // or try a refresh of the session if user is logged in.

      // If we are on the verification screen, the user is likely NOT yet logged in with a session
      // (Supabase doesn't create session until email is verified if confirmation is ON)

      // So we check our 'profiles' table which is created during signUp,
      // but Supabase only marks 'email_confirmed_at' in the auth.users table (internal).

      // However, we can use signInWithPassword to check if we can get a session now.
      // But we don't have the password on the verification screen.

      // A better way is to use a dedicated check or rely on the user clicking the link
      // which should ideally deep link back and create a session.

      const { data, error } = await supabase.auth.getSession();
      if (data?.session?.user?.email_confirmed_at) {
        return true;
      }

      // If no session, the user might have just verified. Let's try to get user.
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.email_confirmed_at) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking verification status:', error);
      return false;
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
        redirectTo: getRedirectUri().replace('auth/callback', 'reset-password'),
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Error resetting password:', error);
      if (error?.message?.includes('rate limit exceeded')) {
        throw new Error('Password reset limit reached. Please wait a while before trying again.');
      }
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
        .single();

      if (!fetchError && existingBuyer) {
        // Buyer record already exists
        return true;
      }

      // Create buyer record (new normalized schema)
      const { error } = await supabase.from('buyers').upsert(
        {
          id: userId,
          avatar_url: null,
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

  /**
   * Check if user has completed onboarding (Interests selection)
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      const { data: buyer, error } = await supabase
        .from('buyers')
        .select('preferences')
        .eq('id', userId)
        .single();

      if (error || !buyer) return false;

      const preferences = buyer.preferences as Record<string, any>;
      // If interests array exists and has at least 3 items (as per CategoryPreferenceScreen validation), it's complete
      return !!(preferences?.interests && Array.isArray(preferences.interests) && preferences.interests.length >= 3);
    } catch (error) {
      // PGRST116 means no row found, which is expected for new users
      return false;
    }
  }

  /**
   * Update buyer preferences (interests)
   * @param userId - User ID
   * @param interests - Array of category IDs
   */
  async updateBuyerPreferences(userId: string, interests: string[]): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      const { data: currentBuyer } = await supabase
        .from('buyers')
        .select('preferences')
        .eq('id', userId)
        .single();

      const updatedPreferences = {
        ...(currentBuyer?.preferences as Record<string, unknown> || {}),
        interests: interests,
      };

      const { error } = await supabase
        .from('buyers')
        .upsert(
          { 
            id: userId,
            preferences: updatedPreferences 
          }, 
          { onConflict: 'id' }
        );

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating buyer preferences:', error);
      throw new Error('Failed to save interests. Please try again.');
    }
  }

  /**
   * Send OTP (One-Time Password) to user's email
   * @param email - User's email address
   * @returns Promise<boolean> - Returns true if OTP was sent successfully
   */
  async sendOTP(email: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot send OTP');
      return false;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: getRedirectUri(),
        },
      });

      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      throw new Error(error.message || 'Failed to send OTP. Please try again.');
    }
  }

  /**
   * Verify OTP code entered by user
   * @param email - User's email address
   * @param token - The OTP code (6 digits)
   * @returns Promise<AuthResult> - Returns user and session on success
   */
  async verifyOTP(email: string, token: string): Promise<AuthResult> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot verify OTP');
      return { user: { id: generateUUID(), email } };
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token,
        type: 'email',
      });

      if (error) throw error;

      if (data.user) {
        // Update last login timestamp
        try {
          await supabase
            .from('profiles')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', data.user.id);
        } catch (err) {
          console.error('Error updating last login:', err);
        }
      }

      return { user: data.user, session: data.session };
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      throw new Error(error.message || 'Invalid or expired code. Please try again.');
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
