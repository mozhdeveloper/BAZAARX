/**
 * Supabase Mock Helpers
 * Reusable mock functions for Supabase query builder
 * Separate from data mocks for better organization
 */

/**
 * Creates a mock Supabase query builder chain
 * @param returnData - Data to return from the query
 * @param returnError - Error to return (if any)
 */
export const createMockSupabaseQuery = (returnData: any = null, returnError: any = null) => {
    const mockQuery: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lt: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        like: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation(function () {
            return Promise.resolve({ data: returnData, error: returnError });
        }),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
    };

    // Make the entire chain awaitable (thenable)
    // This allows doing: const { data, error } = await supabase.from('...').select('...')
    mockQuery.then = (onFulfilled: any) => {
        return Promise.resolve({ data: returnData, error: returnError }).then(onFulfilled);
    };

    // For catch blocks
    mockQuery.catch = (onRejected: any) => {
        return Promise.resolve({ data: returnData, error: returnError }).catch(onRejected);
    };

    return mockQuery;
};

/**
 * Creates a mock for Supabase RPC calls
 * @param returnData - Data to return from RPC
 * @param returnError - Error to return (if any)
 */
export const createMockSupabaseRpc = (returnData: any = null, returnError: any = null) => ({
    rpc: jest.fn().mockResolvedValue({ data: returnData, error: returnError }),
});

/**
 * Mock Supabase error
 */
export const createSupabaseError = (message: string, code?: string) => ({
    message,
    code: code || 'PGRST116',
    details: null,
    hint: null,
});

/**
 * Helper to mock successful query
 */
export const mockSuccessfulQuery = (data: any) =>
    createMockSupabaseQuery(data, null);

/**
 * Helper to mock failed query
 */
export const mockFailedQuery = (errorMessage: string) =>
    createMockSupabaseQuery(null, createSupabaseError(errorMessage));

/**
 * Helper to mock empty result
 */
export const mockEmptyQuery = () =>
    createMockSupabaseQuery([], null);

/**
 * Mock Supabase not configured
 */
export const mockSupabaseNotConfigured = () => {
    const { isSupabaseConfigured } = require('@/lib/supabase');
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
};

/**
 * Mock Supabase configured
 */
export const mockSupabaseConfigured = () => {
    const { isSupabaseConfigured } = require('@/lib/supabase');
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
};
