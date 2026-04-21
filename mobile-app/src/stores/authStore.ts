/**
 * Auth Store (Mobile)
 * Manages authentication state with Supabase integration
 * Updated to use authService following Service Layer Architecture
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, type AuthResult } from '@/services/authService';
import { paymentMethodService } from '@/services/paymentMethodService';
import type { Profile } from '@/types/database.types';
import { useWishlistStore } from './wishlistStore';
import { useOrderStore } from './orderStore';
import { purgeSellerData } from './sellerStore';

export interface PaymentMethod {
  id: string;
  type: 'card' | 'wallet';
  brand: string; // Visa, MasterCard, GCash, Maya, etc.
  last4?: string; // For cards
  expiry?: string; // For cards
  accountNumber?: string; // For wallets (masked)
  isDefault: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  paymentMethods?: PaymentMethod[];
  roles?: string[];
  bazcoins?: number;
  hasAcceptedTerms?: boolean;
}

export interface PendingSignupData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password?: string;
  user_type?: 'buyer' | 'seller';
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isGuest: boolean;
  activeRole: 'buyer' | 'seller';
  loading: boolean;
  error: string | null;
  pendingSignupData: PendingSignupData | null;

  // Auth Actions (using authService)
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, userData: { full_name?: string; phone?: string; user_type: 'buyer' | 'seller' }) => Promise<boolean>;
  signOut: () => Promise<void>;

  // State setters
  setUser: (user: User) => void;
  logout: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  loginAsGuest: () => void;
  updateProfile: (updates: Partial<User>) => void;

  // Payment Methods Management
  addPaymentMethod: (method: PaymentMethod) => void;
  deletePaymentMethod: (id: string) => void;
  setDefaultPaymentMethod: (id: string) => void;

  // Role Management
  switchRole: (role: 'buyer' | 'seller') => void;
  addRole: (role: string) => void;
  checkForSellerAccount: () => Promise<boolean>;

  // Session
  checkSession: () => Promise<void>;
  // True only after checkSession has run at least once this launch.
  // NOT persisted — always starts false so stale hydrated user data
  // can never trigger T&C enforcement before a fresh session check.
  sessionVerified: boolean;

  // Pending Signup
  setPendingSignup: (data: PendingSignupData) => void;
  clearPendingSignup: () => void;

  // Deprecated
  login: (email: string, password: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      isGuest: false,
      activeRole: 'buyer',
      loading: false,
      error: null,
      pendingSignupData: null,
      sessionVerified: false,

      signIn: async (email: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const result = await authService.signIn(email, password);
          if (result?.user) {
            const profile = await authService.getUserProfile(result.user.id);
            // Get user roles from user_roles table
            const roles = await authService.getUserRoles(result.user.id);
            // Use first_name + last_name (new schema, no full_name)
            const firstName = profile?.first_name || '';
            const lastName = profile?.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim() || result.user.email?.split('@')[0] || 'User';
            // Get avatar from buyer record if available
            const buyer = await authService.getBuyerProfile(result.user.id).catch(() => null);
            
            // Fetch saved payment methods from Supabase
            const savedPaymentMethods = await paymentMethodService.getSavedPaymentMethods(result.user.id).catch((err) => {
              console.log('Could not fetch payment methods:', err);
              return [];
            });
            
            // Convert saved payment methods to PaymentMethod format
            const paymentMethods: PaymentMethod[] = savedPaymentMethods.map(m => ({
              id: m.id,
              type: 'card',
              brand: m.cardBrand === 'mastercard' ? 'MasterCard' : 'Visa',
              last4: m.lastFour,
              expiry: m.expiryDate,
              isDefault: m.isDefault,
            }));
            
            const user: User = {
              id: result.user.id,
              email: result.user.email || email,
              name: fullName,
              phone: profile?.phone || '',
              avatar: buyer?.avatar_url || undefined,
              roles: roles.length > 0 ? roles : ['buyer'],
              paymentMethods,
              bazcoins: buyer?.bazcoins || 0,
              // Only treat as unaccepted if explicitly false (new sign-up mid-flow).
              // Existing accounts without this metadata field default to accepted.
              hasAcceptedTerms: result.user.user_metadata?.has_accepted_terms !== false
            };
            // Determine active role from roles
            const isSeller = roles.includes('seller');
            set({
              user,
              profile,
              isAuthenticated: true,
              isGuest: false,
              activeRole: isSeller ? 'seller' : 'buyer',
              loading: false,
            });
            // Load wishlist from Supabase after sign-in
            useWishlistStore.getState().loadWishlist(result.user.id);
            return true;
          }
          set({ loading: false });
          return false;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Sign in failed',
            loading: false,
          });
          return false;
        }
      },

      signUp: async (email, password, userData) => {
        set({ loading: true, error: null });
        try {
          const signUpData: any = { ...userData, email, password };
          const result = await authService.signUp(email, password, signUpData);
          if (result?.user) {
            const user: User = {
              id: result.user.id,
              email: email,
              name: userData.full_name || email.split('@')[0],
              phone: userData.phone || '',
              roles: [userData.user_type],
            };
            set({
              user,
              isAuthenticated: true,
              isGuest: false,
              activeRole: userData.user_type === 'seller' ? 'seller' : 'buyer',
              loading: false,
            });
            return true;
          }
          set({ loading: false });
          return false;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Sign up failed',
            loading: false,
          });
          return false;
        }
      },

      signOut: async () => {
        set({ loading: true });
        try {
          await authService.signOut();
          useWishlistStore.getState().reset();
          // Lazy import to break circular dependency
          const { useCartStore } = await import('./cartStore');
          useCartStore.getState().reset();
          useOrderStore.getState().reset();
          purgeSellerData();
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isGuest: false,
            activeRole: 'buyer',
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Sign out failed',
            loading: false,
          });
        }
      },

      checkSession: async () => {
        try {
          const sessionResult = await authService.getSession();
          if (sessionResult?.user) {
            // Fetch profile, roles, and buyer data in parallel to reduce latency
            const [profile, roles, buyer] = await Promise.all([
              authService.getUserProfile(sessionResult.user.id).catch(() => null),
              authService.getUserRoles(sessionResult.user.id).catch(() => [] as string[]),
              authService.getBuyerProfile(sessionResult.user.id).catch(() => null),
            ]);
            const firstName = profile?.first_name || '';
            const lastName = profile?.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim() || sessionResult.user.email?.split('@')[0] || 'User';
            const user: User = {
              id: sessionResult.user.id,
              email: sessionResult.user.email || '',
              name: fullName,
              phone: profile?.phone || '',
              avatar: buyer?.avatar_url || undefined,
              roles: roles.length > 0 ? roles : ['buyer'],
              bazcoins: buyer?.bazcoins || 0,
              // Only treat as unaccepted if explicitly false (new sign-up mid-flow).
              // Existing accounts without this metadata field default to accepted.
              hasAcceptedTerms: sessionResult.user.user_metadata?.has_accepted_terms !== false
            };
            const preferences = buyer?.preferences as any;
            const hasOnboarding = !!(preferences?.interests && Array.isArray(preferences.interests) && preferences.interests.length >= 3);

            set({
              user,
              profile,
              isAuthenticated: true,
              isGuest: false,
              hasCompletedOnboarding: hasOnboarding,
              activeRole: roles.includes('seller') ? 'seller' : 'buyer',
              sessionVerified: true,
            });
            // Load wishlist from Supabase after session restore
            useWishlistStore.getState().loadWishlist(sessionResult.user.id);
          } else {
            // No valid session, clear auth state
            set({
              user: null,
              profile: null,
              isAuthenticated: false,
              isGuest: false,
            });
          }
        } catch (error) {
          console.error('Error checking session:', error);
          // Clear auth state on session error (e.g., invalid refresh token)
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isGuest: false,
            error: 'Session expired. Please sign in again.',
          });
        }
      },

      setUser: (user: User) => {
        if (!user.roles) {
          user.roles = ['buyer'];
        }
        set({
          user,
          isAuthenticated: true,
          isGuest: false,
          activeRole: 'buyer',
        });
      },

      // Deprecated: use signIn instead
      login: async () => {
        console.warn('authStore.login is deprecated. Use signIn instead.');
        return false;
      },

      logout: () => {
        useWishlistStore.getState().reset();
        // Lazy import to break circular dependency
        const { useCartStore } = require('./cartStore');
        useCartStore.getState().reset();
        useOrderStore.getState().reset();
        purgeSellerData();
        set({
          user: null,
          profile: null,
          isAuthenticated: false,
          isGuest: false,
          activeRole: 'buyer',
        });
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true });
      },

      resetOnboarding: () => {
        set({ hasCompletedOnboarding: false });
      },

      loginAsGuest: () => {
        set({
          isAuthenticated: true,
          isGuest: true,
          activeRole: 'buyer',
          user: {
            id: 'guest',
            name: 'Guest User',
            email: 'guest@bazaarx.ph',
            phone: '',
            avatar: '',
            roles: ['buyer'],
          },
        });
      },

      updateProfile: (updates: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },

      addPaymentMethod: (method: PaymentMethod) => {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                paymentMethods: [...(state.user.paymentMethods || []), method],
              }
            : null,
        }));
      },

      deletePaymentMethod: (id: string) => {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                paymentMethods: (state.user.paymentMethods || []).filter(m => m.id !== id),
              }
            : null,
        }));
      },

      setDefaultPaymentMethod: (id: string) => {
        set((state) => ({
          user: state.user
            ? {
                ...state.user,
                paymentMethods: (state.user.paymentMethods || []).map(m => ({
                  ...m,
                  isDefault: m.id === id,
                })),
              }
            : null,
        }));
      },

      switchRole: (role: 'buyer' | 'seller') => {
        set({ activeRole: role });
      },

      addRole: (role: string) => {
        set((state) => {
          if (!state.user) return state;
          const roles = state.user.roles || [];
          if (!roles.includes(role)) {
            return {
              user: {
                ...state.user,
                roles: [...roles, role],
              },
            };
          }
          return state;
        });
      },

      setPendingSignup: (data: PendingSignupData) => {
        set({ pendingSignupData: data });
      },

      clearPendingSignup: () => {
        set({ pendingSignupData: null });
      },

      checkForSellerAccount: async () => {
        const { user } = get();
        if (!user) return false;

        try {
          // Check if seller profile exists in Supabase
          // authService.getSellerProfile throws if no record found (single())
          const sellerProfile = await authService.getSellerProfile(user.id);

          if (sellerProfile) {
            // User is a seller, ensure role is in local state
            const roles = user.roles || [];
            if (!roles.includes('seller')) {
              set({
                user: {
                  ...user,
                  roles: [...roles, 'seller'],
                },
              });
            }
            return true;
          }
          return false;
        } catch (error) {
          // If error is "row not found" (PGRST116), it means user is not a seller
          // console.log('Check seller account result:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Exclude sessionVerified — it must always start false on each launch
      // so stale persisted user data cannot trigger T&C before checkSession runs.
      partialize: (state) => {
        const { sessionVerified, ...rest } = state as any;
        return rest;
      },
    }
  )
);
