import { vi } from 'vitest';

// Mock Supabase client globally for Vitest
vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        auth: {
            getSession: vi.fn(),
            signOut: vi.fn(),
        },
    },
    isSupabaseConfigured: vi.fn(() => true),
}));

// Mock console to keep test output clean
vi.stubGlobal('console', {
    ...console,
    warn: vi.fn(),
    error: vi.fn(),
    // Keep log if needed, or mock it too
    // log: vi.fn(),
});
