/**
 * Auth Store (Mobile)
 * Manages authentication state with Supabase integration
 * Updated to use authService following Service Layer Architecture
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, type AuthResult } from '@/services/authService';
import type { Profile } from '@/types/database.types';

export interface SavedCard {
  id: string;
  last4: string;
  brand: string;
  expiry: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  savedCards?: SavedCard[];
  roles?: string[];
  bazcoins?: number;
  preferences?: Record<string, any>;
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

  // Auth Actions (using authService)
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, userData: { full_name?: string; phone?: string; user_type: 'buyer' | 'seller'; preferences?: Record<string, any> }) => Promise<boolean>;
  signOut: () => Promise<void>;

  // State setters
  setUser: (user: User) => void;
  logout: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  loginAsGuest: () => void;
  updateProfile: (updates: Partial<User>) => void;

  // Role Management
  switchRole: (role: 'buyer' | 'seller') => void;
  addRole: (role: string) => void;
  checkForSellerAccount: () => Promise<boolean>;

  // Session
  checkSession: () => Promise<void>;

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
            const user: User = {
              id: result.user.id,
              email: result.user.email || email,
              name: fullName,
              phone: profile?.phone || '',
              avatar: buyer?.avatar_url || undefined,
              roles: roles.length > 0 ? roles : ['buyer'],
              savedCards: [],
              bazcoins: buyer?.bazcoins || 0,
              preferences: buyer?.preferences || undefined
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
              preferences: userData.preferences,
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
            const profile = await authService.getUserProfile(sessionResult.user.id);
            const roles = await authService.getUserRoles(sessionResult.user.id);
            const firstName = profile?.first_name || '';
            const lastName = profile?.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim() || sessionResult.user.email?.split('@')[0] || 'User';
            const buyer = await authService.getBuyerProfile(sessionResult.user.id).catch(() => null);
            const user: User = {
              id: sessionResult.user.id,
              email: sessionResult.user.email || '',
              name: fullName,
              phone: profile?.phone || '',
              avatar: buyer?.avatar_url || undefined,
              roles: roles.length > 0 ? roles : ['buyer'],
              bazcoins: buyer?.bazcoins || 0,
              preferences: buyer?.preferences || undefined
            };
            set({
              user,
              profile,
              isAuthenticated: true,
              activeRole: roles.includes('seller') ? 'seller' : 'buyer',
            });
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
        if (!user.savedCards) {
          user.savedCards = [
            { id: 'card_1', last4: '4242', brand: 'Visa', expiry: '12/28' },
            { id: 'card_2', last4: '8888', brand: 'MasterCard', expiry: '10/26' },
          ];
        }
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
    }
  )
);
