// React Native testing libraries are removed as we are testing services in a Node environment


// Mock Supabase client globally
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn(),
        auth: {
            getSession: jest.fn(),
            signOut: jest.fn(),
        },
    },
    isSupabaseConfigured: jest.fn(() => true),
}));

// Suppress console warnings/errors in tests (optional - can be configured per test)
const originalConsole = { ...console };

global.console = {
    ...console,
    warn: jest.fn(),
    error: jest.fn(),
    // Keep log for debugging
    log: originalConsole.log,
};

// Reset console between tests if needed
afterEach(() => {
    jest.clearAllMocks();
});

// Global test timeout (increase if needed for async operations)
jest.setTimeout(10000); // 10 seconds
