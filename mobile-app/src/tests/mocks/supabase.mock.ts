/**
 * Supabase Mock Helpers for Mobile Tests
 * Reusable mock functions for Supabase query builder chain
 */

/**
 * Creates a mock Supabase query builder chain
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
    maybeSingle: jest.fn().mockImplementation(function () {
      return Promise.resolve({ data: returnData, error: returnError });
    }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
  };

  // Make awaitable (thenable)
  mockQuery.then = (onFulfilled: any) => {
    return Promise.resolve({ data: returnData, error: returnError }).then(onFulfilled);
  };

  mockQuery.catch = (onRejected: any) => {
    return Promise.resolve({ data: returnData, error: returnError }).catch(onRejected);
  };

  return mockQuery;
};

/** Mock Supabase error */
export const createSupabaseError = (message: string, code?: string) => ({
  message,
  code: code || 'PGRST116',
  details: null,
  hint: null,
});
