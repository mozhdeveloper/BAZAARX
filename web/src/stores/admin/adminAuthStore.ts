/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { AdminUser } from './adminTypes';
// Admin Auth Store
interface AdminAuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAdminAuth = create<AdminAuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        // Try Supabase authentication first
        if (isSupabaseConfigured()) {
          try {
            // Sign in with Supabase
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (authError || !authData.user) {
              console.error('Admin auth error:', authError);
              set({
                error: 'Invalid credentials',
                isLoading: false
              });
              return false;
            }

            // Fetch admin profile to verify user_type
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            if (profileError || !profile) {
              console.error('Profile fetch error:', profileError);
              await supabase.auth.signOut();
              set({
                error: 'Admin profile not found',
                isLoading: false
              });
              return false;
            }

            // Verify user is an admin or QA team member
            // Priority: qa_team_members table → admins table → auth user_metadata fallback
            let userRole: 'admin' | 'qa_team' = 'admin';
            
            // First check QA team members table (higher priority for QA users)
            const { data: qaRecord } = await supabase
              .from('qa_team_members')
              .select('id')
              .eq('id', authData.user.id)
              .maybeSingle();

            if (qaRecord) {
              userRole = 'qa_team';
              console.log('✅ User identified as QA Team Member via qa_team_members table');
            } else {
              // Check admins table
              const { data: adminRecord } = await supabase
                .from('admins')
                .select('id')
                .eq('id', authData.user.id)
                .maybeSingle();

              if (adminRecord) {
                userRole = 'admin';
                console.log('✅ User identified as Admin via admins table');
              } else {
                // Final fallback: check auth user_metadata set during account creation
                const metaUserType = authData.user.user_metadata?.user_type;
                if (metaUserType === 'qa_team') {
                  userRole = 'qa_team';
                  console.log('✅ User identified as QA Team Member via user_metadata');
                } else if (metaUserType === 'admin') {
                  userRole = 'admin';
                  console.log('✅ User identified as Admin via user_metadata');
                } else {
                  // Default to admin if no specific role found but user exists in profiles
                  console.log('⚠️ No specific role found, defaulting to admin');
                  userRole = 'admin';
                }
              }
            }

            // Create admin user object
            const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || (userRole === 'qa_team' ? 'QA Team Member' : 'Admin User');
            const adminUser: AdminUser = {
              id: authData.user.id,
              email: profile.email || email,
              name: fullName,
              role: userRole,
              avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=FF6A00&color=fff`,
              lastLogin: new Date(),
              permissions: userRole === 'qa_team'
                ? [
                    { id: '1', name: 'QA Access', resource: 'products', actions: ['read', 'approve'] },
                  ]
                : [
                    { id: '1', name: 'Full Access', resource: 'users', actions: ['read', 'write', 'delete'] },
                    { id: '2', name: 'Full Access', resource: 'sellers', actions: ['read', 'write', 'delete', 'approve'] },
                    { id: '3', name: 'Full Access', resource: 'categories', actions: ['read', 'write', 'delete'] },
                    { id: '4', name: 'Full Access', resource: 'products', actions: ['read', 'write', 'delete'] },
                    { id: '5', name: 'Full Access', resource: 'orders', actions: ['read', 'write', 'delete'] },
                    { id: '6', name: 'Full Access', resource: 'analytics', actions: ['read'] },
                  ]
            };

            set({
              user: adminUser,
              isAuthenticated: true,
              isLoading: false,
              error: null
            });
            return true;

          } catch (err) {
            console.error('Login error:', err);
            set({
              error: 'Login failed. Please try again.',
              isLoading: false
            });
            return false;
          }
        }

        // Fallback to demo admin credentials if Supabase not configured
        const adminCredentials = [
          {
            email: 'admin@bazaarph.com',
            password: 'admin123',
            user: {
              id: 'admin_1',
              email: 'admin@bazaarph.com',
              name: 'Admin User',
              role: 'super_admin' as const,
              avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=FF6A00&color=fff',
              lastLogin: new Date(),
              permissions: [
                { id: '1', name: 'Full Access', resource: 'users' as const, actions: ['read', 'write', 'delete'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '2', name: 'Full Access', resource: 'sellers' as const, actions: ['read', 'write', 'delete', 'approve'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '3', name: 'Full Access', resource: 'categories' as const, actions: ['read', 'write', 'delete'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '4', name: 'Full Access', resource: 'products' as const, actions: ['read', 'write', 'delete'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '5', name: 'Full Access', resource: 'orders' as const, actions: ['read', 'write', 'delete'] as ('read' | 'write' | 'delete' | 'approve')[] },
                { id: '6', name: 'Full Access', resource: 'analytics' as const, actions: ['read'] as ('read' | 'write' | 'delete' | 'approve')[] },
              ]
            }
          }
        ];

        await new Promise(resolve => setTimeout(resolve, 1500));

        const admin = adminCredentials.find(cred => cred.email === email && cred.password === password);

        if (admin) {
          set({
            user: admin.user,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          return true;
        } else {
          set({
            error: 'Invalid credentials. Use admin@bazaarph.com / admin123',
            isLoading: false
          });
          return false;
        }
      },

      logout: async () => {
        // Sign out from Supabase if configured
        if (isSupabaseConfigured()) {
          await supabase.auth.signOut();
        }

        set({
          user: null,
          isAuthenticated: false,
          error: null
        });
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'admin-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
);

// Categories Management Store
interface CategoriesState {
  categories: Category[];
  selectedCategory: Category | null;
  isLoading: boolean;
  error: string | null;
  loadCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'productsCount'>) => Promise<void>;
  updateCategory: (id: string, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  toggleCategoryStatus: (id: string, isActive: boolean) => Promise<void>;
  selectCategory: (category: Category | null) => void;
  clearError: () => void;
}
