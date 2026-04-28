/**
 * Authentication Service
 * Handles user authentication and profile management
 * Updated for new normalized database schema (February 2026)
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Profile, Buyer, Seller, UserRole, UserRoleRecord, FullProfile } from '@/types/database.types';
import { sendWelcomeEmail } from '@/services/transactionalEmails';
import { validatePassword } from '@/utils/validation';

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

export interface EmailRoleStatus {
  exists: boolean;
  userId: string | null;
  roles: UserRole[];
}

export interface PendingSignup {
  email: string;
  user_type: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
  // Seller specific
  storeName?: string;
  storeDescription?: string;
  storeAddress?: string;
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
   * Check whether an email is already used by an existing profile.
   * Used for live signup validation (buyer/seller).
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
   * Get role status for an email (used by seller signup rules and role-switch checks).
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

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors[0] || 'Password does not meet minimum security requirements.');
    }

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
            } as any,
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

        // Welcome email (fire-and-forget)
        const buyerName = `${first_name || ''} ${last_name || ''}`.trim() || 'Valued Customer';
        sendWelcomeEmail({ buyerEmail: email, buyerId: authData.user.id, buyerName }).catch(console.error);
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
   * Phase 1 signup — creates auth.users entry and sends verification email.
   * Does NOT create profiles, user_roles, or buyers records.
   * DB writes are deferred to AuthCallbackPage after email verification.
   * @param email - User email address
   * @param password - User password
   * @param metadata - Auth metadata (first_name, last_name, phone, user_type)
   */
  async initiateSignUp(
    email: string,
    password: string,
    metadata: {
      first_name?: string;
      last_name?: string;
      phone?: string;
      user_type: string;
    }
  ): Promise<{ userId: string; session: any | null } | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot initiate signup');
      return { userId: crypto.randomUUID(), session: null };
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors[0] || 'Password does not meet minimum security requirements.');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        },
      });

      if (error) {
        if (error?.message?.includes('User already registered') || (error as any)?.status === 422) {
          const already = new Error('User already registered');
          (already as any).isAlreadyRegistered = true;
          throw already;
        }
        throw error;
      }

      return data.user ? { userId: data.user.id, session: data.session } : null;
    } catch (error: any) {
      console.error('Error initiating signup:', error);
      if ((error as any).isAlreadyRegistered) throw error;
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
          avatar_url: null,
          approval_status: 'pending', // New sellers start as pending
        } as any)
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
      .insert({ user_id: userId, role } as any);

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

    return (data as Array<{ role: UserRole }> | null)?.map(r => r.role) || [];
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
   * Check if user is a QA team member
   * @param userId - User ID
   * @returns Promise<boolean>
   */
  async isUserQATeam(userId: string): Promise<boolean> {
    return this.hasRole(userId, 'qa_team');
  }

  /**
   * Check if user onboarding is complete (preferences exist)
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { data, error } = await supabase
        .from('buyers')
        .select('preferences')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) return false;
      
      const preferences = (data as any).preferences;
      return !!(preferences && preferences.interestedCategories && preferences.interestedCategories.length > 0);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
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

      // Ensure profile exists and update last login
      if (data.user) {
        const normalizedEmail = data.user.email || email;
        const lastLoginAt = new Date().toISOString();

        // Source-of-truth rule: do not overwrite existing profile names from auth metadata.
        // Use metadata only to bootstrap when the profile row does not exist yet.
        const { data: existingProfileRaw, error: existingProfileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .maybeSingle();
        const existingProfile = existingProfileRaw as { id: string } | null;

        if (existingProfileError) {
          console.error('Error checking existing profile during sign in:', existingProfileError);
        } else if (existingProfile && existingProfile.id) {
          const { error: profileUpdateError } = await (supabase
            .from('profiles') as any)
            .update({
              email: normalizedEmail,
              last_login_at: lastLoginAt,
            })
            .eq('id', data.user.id);

          if (profileUpdateError) {
            console.error('Error updating profile during sign in:', profileUpdateError);
          }
        } else {
          const { error: profileInsertError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              email: normalizedEmail,
              first_name: data.user.user_metadata?.first_name || null,
              last_name: data.user.user_metadata?.last_name || null,
              phone: data.user.user_metadata?.phone || null,
              last_login_at: lastLoginAt,
            } as any);

          if (profileInsertError) {
            console.error('Error inserting profile during sign in:', profileInsertError);
          }
        }

        // Also ensure buyer record exists for buyer role users
        const { error: buyerError } = await supabase
          .from('buyers')
          .upsert(
            {
              id: data.user.id,
              preferences: {},
              bazcoins: 0,
            } as any,
            { onConflict: 'id', ignoreDuplicates: true }
          );

        if (buyerError) {
          console.error('Error upserting buyer record:', buyerError);
        }

        await this.ensureUserRolesFromRecords(data.user.id);
      }

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  }

  async sendOTP(email: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot send OTP');
      return true;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
      });

      if (error) {
        console.error('Error sending OTP:', error);
        throw new Error('Failed to send OTP. Please try again.');
      } else {
        console.log('OTP sent successfully to', email);
        return true;
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      throw new Error('Failed to send OTP. Please try again.');
    }
  }

  /**
 * Verify OTP code sent to user's email
 * @param email - User email
 * @param token - OTP code
 * @returns Promise with user session data or null
 */
  async verifyOTP(email: string, token: string): Promise<{ user: any; session: any } | null> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured - cannot verify OTP');
      return null;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) throw error;

      // Update last login
      if (data.user) {
        await (supabase
          .from('profiles') as any)
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      return { user: data.user, session: data.session };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw new Error('Invalid or expired OTP. Please try again.');
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
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
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
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      return null; // Return null instead of throwing to allow caller to handle missing record
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
      const { data: profileContactData, error } = await supabase
        .from('profiles')
        .select('email, phone')
        .eq('id', userId)
        .maybeSingle();
      const data = profileContactData as ProfileContact | null;

      if (error) throw error;
      if (!data) return null;
      return {
        email: data.email || null,
        phone: data.phone || null,
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
      const { error } = await (supabase
        .from('profiles') as any)
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
      const configuredBaseUrl = (import.meta as any)?.env?.VITE_PUBLIC_APP_URL as string | undefined;
      const resetBaseUrl = configuredBaseUrl && configuredBaseUrl.trim().length > 0
        ? configuredBaseUrl.replace(/\/$/, '')
        : window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${resetBaseUrl}/reset-password`,
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

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors[0] || 'Password does not meet minimum security requirements.');
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
        // Buyer record already exists - still ensure role integrity
        await this.addUserRole(userId, 'buyer');
        return true;
      }

      // Create buyer record (new normalized schema)
      const { error } = await supabase.from('buyers').upsert(
        {
          id: userId,
          avatar_url: null,
          preferences: defaultBuyerPreferences,
          bazcoins: 0,
        } as any,
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
    business_address?: string;
  }): Promise<{ userId: string }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured');
    }

    const { data: authData, error: authError } = await supabase.auth.getUser();
    const user = authData.user;

    if (authError || !user?.id) {
      throw new Error('Auth session missing');
    }

    const { data: existingProfileRaw } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, phone')
      .eq('id', user.id)
      .maybeSingle();
    const existingProfile = existingProfileRaw as Pick<Profile, 'email' | 'first_name' | 'last_name' | 'phone'> | null;

    await this.addUserRole(user.id, 'seller');

    const { error: sellerError } = await supabase
      .from('sellers')
      .upsert(
        {
          id: user.id,
          store_name: payload.store_name,
          store_description: payload.store_description || null,
          approval_status: 'pending',
        } as any,
        { onConflict: 'id' },
      );

    if (sellerError) {
      console.error('Error creating/updating seller during role switch:', sellerError);
      throw new Error('Failed to initialize seller profile.');
    }

    const phoneToSave = payload.phone?.trim();
    if (phoneToSave && phoneToSave !== (existingProfile ? existingProfile.phone : null)) {
      const { error: profileUpdateError } = await (supabase
        .from('profiles') as any)
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
        } as any,
        { onConflict: 'id' },
      );

    if (buyerError) {
      console.error('Error creating/updating buyer during role switch:', buyerError);
      throw new Error('Failed to initialize buyer profile.');
    }

    const { data: existingProfileRaw } = await supabase
      .from('profiles')
      .select('email, phone')
      .eq('id', user.id)
      .maybeSingle();
    const existingProfile = existingProfileRaw as Pick<Profile, 'email' | 'phone'> | null;

    const profileUpsert = {
      id: user.id,
      email: (existingProfile ? existingProfile.email : null) || payload.email || user.email || null,
      first_name: payload.first_name.trim(),
      last_name: payload.last_name.trim(),
      phone: (existingProfile ? existingProfile.phone : null) || payload.phone || null,
      last_login_at: new Date().toISOString(),
    };

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileUpsert as any, { onConflict: 'id' });

    if (profileError) {
      console.error('Error updating profile during buyer upgrade:', profileError);
      throw new Error('Failed to update profile details.');
    }

    return { userId: user.id };
  }

  /**
   * Ensure user_roles is aligned with existing normalized role tables.
   * Used to heal missing role rows for legacy accounts and OAuth callbacks.
   */
  async ensureUserRolesFromRecords(userId: string): Promise<void> {
    if (!isSupabaseConfigured()) return;

    const [{ data: buyerRow, error: buyerError }, { data: sellerRow, error: sellerError }] = await Promise.all([
      supabase
        .from('buyers')
        .select('id')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('sellers')
        .select('id')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    if (buyerError) {
      console.error('Error checking buyer record for role sync:', buyerError);
    } else if (buyerRow) {
      await this.addUserRole(userId, 'buyer');
    }

    if (sellerError) {
      console.error('Error checking seller record for role sync:', sellerError);
    } else if (sellerRow) {
      await this.addUserRole(userId, 'seller');
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
        } as any,
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
        } as any,
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
          emailRedirectTo: `${window.location.origin}/auth/callback`,
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
   * Used for the "Check Verification Status" button/polling
   * @param email - User email to check
   */
  async checkVerificationStatus(email: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;

    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user;
      
      if (sessionUser?.email_confirmed_at && 
          sessionUser.email?.toLowerCase() === email.toLowerCase()) {
        return true;
      }

      // If no session, the user might have just verified. Let's try to get user.
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (user?.email_confirmed_at && 
          user.email?.toLowerCase() === email.toLowerCase()) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking verification status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
