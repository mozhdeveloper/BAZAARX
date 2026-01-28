import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  completeOnboarding: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

export interface SavedCard {
  id: string;
  last4: string;
  brand: string; // 'Visa', 'MasterCard', etc.
  expiry: string; // 'MM/YY'
}

// Real user interface based on Supabase profile
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  savedCards?: SavedCard[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isGuest: boolean;
  setUser: (user: User) => void; // Used after successful Supabase login
  logout: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // For testing/debugging
  loginAsGuest: () => void;
  updateProfile: (updates: Partial<User>) => void;
  // Kept for backward compatibility if any, but logic is now external
  login: (email: string, password: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      isGuest: false,

      setUser: (user: User) => {
        // Mock saved cards if none exist (for demo)
        if (!user.savedCards) {
          user.savedCards = [
            { id: 'card_1', last4: '4242', brand: 'Visa', expiry: '12/28' },
            { id: 'card_2', last4: '8888', brand: 'MasterCard', expiry: '10/26' },
          ];
        }
        set({ user, isAuthenticated: true, isGuest: false });
      },

      // Deprecated: Login logic moved to LoginScreen to handle Supabase directly
      login: async () => {
        console.warn('authStore.login is deprecated. Use LoginScreen logic.');
        return false;
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          isGuest: false,
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
          user: {
            id: 'guest',
            name: 'Guest User',
            email: 'guest@bazaarx.ph',
            phone: '',
            avatar: '',
          }
        });
      },

      updateProfile: (updates: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

