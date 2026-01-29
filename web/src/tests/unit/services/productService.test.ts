/**
 * ProductService Tests
 * Comprehensive test suite for ProductService class
 */

import { ProductService } from '@/services/productService';
import { supabase } from '@/lib/supabase';
import {
    mockProducts,
    mockProduct1,
    mockProductWithSeller,
    mockProductInsert,
} from '../mocks/data';
import {
    mockSuccessfulQuery,
    mockSupabaseNotConfigured,
    mockSupabaseConfigured,
} from '../mocks/supabase.mock';

// Mock Supabase
jest.mock('@/lib/supabase');

describe('ProductService', () => {
    let productService: ProductService;
    const mockSupabase = supabase as jest.Mocked<typeof supabase>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSupabaseConfigured();
        // Default mock that returns the array we expect
        mockSupabase.from.mockImplementation(() => mockSuccessfulQuery(mockProducts) as any);
        productService = ProductService.getInstance();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = ProductService.getInstance();
            const instance2 = ProductService.getInstance();
            expect(instance1).toBe(instance2);
        });

        it('should throw error on direct instantiation', () => {
            expect(() => {
                // @ts-expect-error - Testing private constructor
                new ProductService();
            }).toThrow();
        });
    });

    describe('getProducts()', () => {
        it('should fetch all products successfully', async () => {
            const result = await productService.getProducts();
            expect(mockSupabase.from).toHaveBeenCalledWith('products');
            expect(result).toEqual(mockProducts);
        });

        it('should handle search query', async () => {
            const searchResults = [mockProduct1];
            mockSupabase.from.mockImplementationOnce(() => mockSuccessfulQuery(searchResults) as any);

            const result = await productService.getProducts({ searchQuery: 'headphones' });
            expect(result).toEqual(searchResults);
        });

        it('should return empty array when Supabase not configured', async () => {
            mockSupabaseNotConfigured();
            const result = await productService.getProducts();
            expect(result).toEqual([]);
        });
    });

    describe('getProductById()', () => {
        it('should fetch single product successfully', async () => {
            mockSupabase.from.mockImplementationOnce(() => mockSuccessfulQuery(mockProductWithSeller) as any);

            const result = await productService.getProductById('prod-001');

            expect(mockSupabase.from).toHaveBeenCalledWith('products');
            expect(result).toEqual(mockProductWithSeller);
        });
    });

    describe('createProduct()', () => {
        it('should create product successfully', async () => {
            const createdProduct = { ...mockProductInsert, id: 'prod-new' };
            mockSupabase.from.mockImplementationOnce(() => mockSuccessfulQuery(createdProduct) as any);

            const result = await productService.createProduct(mockProductInsert);

            expect(mockSupabase.from).toHaveBeenCalledWith('products');
            expect(result).toEqual(createdProduct);
        });
    });

    describe('Stock Management', () => {
        it('should deduct stock successfully', async () => {
            mockSupabase.rpc = jest.fn().mockResolvedValue({ data: null, error: null });

            await productService.deductStock('prod-001', 5, 'order', 'order-123');

            expect(mockSupabase.rpc).toHaveBeenCalledWith('deduct_product_stock', expect.any(Object));
        });
    });

    describe('getPublicProducts()', () => {
        it('should return approved and active products', async () => {
            const publicProducts = mockProducts.filter(p => p.is_active && p.approval_status === 'approved');
            mockSupabase.from.mockImplementationOnce(() => mockSuccessfulQuery(publicProducts) as any);

            const result = await productService.getPublicProducts();

            expect(mockSupabase.from).toHaveBeenCalledWith('products');
            expect(result).toHaveLength(publicProducts.length);
        });
    });
});
