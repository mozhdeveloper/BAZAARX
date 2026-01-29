/**
 * SellerService Tests
 * Comprehensive test suite for SellerService class
 */

import { SellerService } from '@/services/sellerService';
import { supabase } from '@/lib/supabase';
import {
    mockSellers,
    mockSeller1,
} from '../mocks/data';
import {
    mockSuccessfulQuery,
    mockFailedQuery,
    mockSupabaseNotConfigured,
    mockSupabaseConfigured,
} from '../mocks/supabase.mock';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn(),
    },
    isSupabaseConfigured: jest.fn(() => true),
}));

// Mock helpers for config control
import { isSupabaseConfigured } from '@/lib/supabase';
const mockIsSupabaseConfigured = isSupabaseConfigured as jest.Mock;

describe('SellerService', () => {
    let sellerService: SellerService;
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockIsSupabaseConfigured.mockReturnValue(true);
        (supabase.from as jest.Mock).mockImplementation(() => mockSuccessfulQuery([]));
        sellerService = SellerService.getInstance();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = SellerService.getInstance();
            const instance2 = SellerService.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should throw error on direct instantiation', () => {
            expect(() => {
                // @ts-expect-error - Testing private constructor
                new SellerService();
            }).toThrow();
        });
    });

    describe('getSellerById()', () => {
        it('should fetch single seller successfully', async () => {
            const mockQuery = mockSuccessfulQuery(mockSeller1);
            (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery as any);

            const result = await sellerService.getSellerById('seller-001');

            expect(mockSupabase.from).toHaveBeenCalledWith('sellers');
            expect(result).toEqual(mockSeller1);
        });

        it('should return null when Supabase not configured', async () => {
            mockIsSupabaseConfigured.mockReturnValue(false);
            const result = await sellerService.getSellerById('seller-001');
            expect(result).toBeNull();
        });
    });

    describe('updateSeller()', () => {
        it('should update seller successfully', async () => {
            const updates = { store_name: 'Updated Store' };
            const updatedSeller = { ...mockSeller1, ...updates };
            const mockQuery = mockSuccessfulQuery(updatedSeller);
            (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery as any);

            const result = await sellerService.updateSeller('seller-001', updates);

            expect(mockSupabase.from).toHaveBeenCalledWith('sellers');
            expect(result).toEqual(updatedSeller);
        });
    });

    describe('Approval Management', () => {
        it('should approve seller', async () => {
            const mockQuery = mockSuccessfulQuery(null);
            (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery as any);

            await sellerService.approveSeller('seller-001');

            expect(mockSupabase.from).toHaveBeenCalledWith('sellers');
            expect(mockQuery.update).toHaveBeenCalledWith(
                expect.objectContaining({ approval_status: 'approved' })
            );
        });

        it('should reject seller', async () => {
            const mockQuery = mockSuccessfulQuery(null);
            (mockSupabase.from as jest.Mock).mockReturnValue(mockQuery as any);

            await sellerService.rejectSeller('seller-001', 'Reason');

            expect(mockSupabase.from).toHaveBeenCalledWith('sellers');
            expect(mockQuery.update).toHaveBeenCalledWith(
                expect.objectContaining({ approval_status: 'rejected', rejection_reason: 'Reason' })
            );
        });
    });

    describe('updateSellerRating()', () => {
        it('should handle rating update', async () => {
            const mockReviews = [{ rating: 5 }, { rating: 4 }];
            const mockReviewsQuery = mockSuccessfulQuery(mockReviews);
            const mockUpdateQuery = mockSuccessfulQuery(null);

            (mockSupabase.from as jest.Mock)
                .mockReturnValueOnce(mockReviewsQuery as any)
                .mockReturnValueOnce(mockUpdateQuery as any);

            await sellerService.updateSellerRating('seller-001');

            expect(mockSupabase.from).toHaveBeenCalledWith('reviews');
            expect(mockSupabase.from).toHaveBeenCalledWith('sellers');
        });
    });
});
