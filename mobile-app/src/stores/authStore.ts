import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  roles?: string[]; // 'buyer', 'seller', 'admin'
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isGuest: boolean;
  activeRole: 'buyer' | 'seller';
  
  setUser: (user: User) => void; // Used after successful Supabase login
  logout: () => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // For testing/debugging
  loginAsGuest: () => void;
  updateProfile: (updates: Partial<User>) => void;
  
  // Role Management
  switchRole: (role: 'buyer' | 'seller') => void;
  addRole: (role: string) => void;

  // Kept for backward compatibility if any, but logic is now external
  login: (email: string, password: string) => Promise<boolean>; 
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasCompletedOnboarding: false,
      isGuest: false,
      activeRole: 'buyer', // Default to buyer

      setUser: (user: User) => {
        // Mock saved cards if none exist (for demo)
        if (!user.savedCards) {
            user.savedCards = [
                { id: 'card_1', last4: '4242', brand: 'Visa', expiry: '12/28' },
                { id: 'card_2', last4: '8888', brand: 'MasterCard', expiry: '10/26' },
            ];
        }
        
        // Ensure roles exist
        if (!user.roles) {
          user.roles = ['buyer'];
        }

        set({ 
          user, 
          isAuthenticated: true, 
          isGuest: false,
          activeRole: 'buyer' // Always start as buyer on login
        });
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
          }
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
                roles: [...roles, role]
              }
            };
          }
          return state;
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

