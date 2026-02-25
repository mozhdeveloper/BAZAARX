/**
 * Singleton Pattern Tests
 * Tests for the Singleton implementation across all service classes
 */

import { ProductService } from '@/services/productService';
import { SellerService } from '@/services/sellerService';

describe('Singleton Pattern Implementation', () => {
    describe('ProductService Singleton', () => {
        it('should always return the same instance', () => {
            const instance1 = ProductService.getInstance();
            const instance2 = ProductService.getInstance();
            const instance3 = ProductService.getInstance();

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
            expect(instance1).toBe(instance3);
        });

        it('should maintain state across getInstance calls', () => {
            const instance1 = ProductService.getInstance();
            const instance2 = ProductService.getInstance();

            // Both instances should reference the same object
            expect(instance1).toStrictEqual(instance2);
        });

        it('should prevent direct instantiation', () => {
            // This test verifies that the constructor is private
            expect(() => {
                // @ts-expect-error - Testing private constructor
                new ProductService();
            }).toThrow();
        });

        it('should be instance of ProductService', () => {
            const instance = ProductService.getInstance();
            expect(instance).toBeInstanceOf(ProductService);
        });
    });

    describe('SellerService Singleton', () => {
        it('should always return the same instance', () => {
            const instance1 = SellerService.getInstance();
            const instance2 = SellerService.getInstance();
            const instance3 = SellerService.getInstance();

            expect(instance1).toBe(instance2);
            expect(instance2).toBe(instance3);
            expect(instance1).toBe(instance3);
        });

        it('should maintain state across getInstance calls', () => {
            const instance1 = SellerService.getInstance();
            const instance2 = SellerService.getInstance();

            expect(instance1).toStrictEqual(instance2);
        });

        it('should prevent direct instantiation', () => {
            expect(() => {
                // @ts-expect-error - Testing private constructor
                new SellerService();
            }).toThrow();
        });

        it('should be instance of SellerService', () => {
            const instance = SellerService.getInstance();
            expect(instance).toBeInstanceOf(SellerService);
        });
    });

    describe('Cross-Service Singleton Isolation', () => {
        it('should maintain separate instances for different services', () => {
            const productService = ProductService.getInstance();
            const sellerService = SellerService.getInstance();

            // Different services should not be the same instance
            expect(productService).not.toBe(sellerService);
        });

        it('should not share state between different service singletons', () => {
            const productService = ProductService.getInstance();
            const sellerService = SellerService.getInstance();

            // Verify they are distinct objects
            expect(productService.constructor.name).toBe('ProductService');
            expect(sellerService.constructor.name).toBe('SellerService');
        });
    });

    describe('Singleton Thread Safety (Conceptual)', () => {
        it('should handle concurrent getInstance calls', () => {
            // JavaScript is single-threaded, but we can simulate concurrent calls
            const instances = Array.from({ length: 100 }, () =>
                ProductService.getInstance()
            );

            // All instances should be the same
            const firstInstance = instances[0];
            instances.forEach(instance => {
                expect(instance).toBe(firstInstance);
            });
        });

        it('should handle rapid getInstance calls for SellerService', () => {
            const instances = Array.from({ length: 100 }, () =>
                SellerService.getInstance()
            );

            const firstInstance = instances[0];
            instances.forEach(instance => {
                expect(instance).toBe(firstInstance);
            });
        });
    });

    describe('Singleton Memory Management', () => {
        it('should reuse the same instance without creating new ones', () => {
            const instance1 = ProductService.getInstance();
            const instance2 = ProductService.getInstance();

            // Verify object identity (same reference)
            expect(Object.is(instance1, instance2)).toBe(true);
        });

        it('should maintain singleton across different scopes', () => {
            function getSingletonInScope1() {
                return ProductService.getInstance();
            }

            function getSingletonInScope2() {
                return ProductService.getInstance();
            }

            const fromScope1 = getSingletonInScope1();
            const fromScope2 = getSingletonInScope2();

            expect(fromScope1).toBe(fromScope2);
        });
    });
});
