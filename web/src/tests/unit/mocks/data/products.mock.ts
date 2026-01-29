/**
 * Mock Product Data
 * Realistic product data for testing
 */

import { Product, ProductWithSeller } from '@/types/database.types';

export const mockProduct1: Product = {
    id: 'prod-001',
    seller_id: 'seller-001',
    name: 'Sony WH-1000XM5',
    description: 'Industry-leading noise-canceling headphones',
    price: 2499.99,
    stock: 50,
    category: 'Electronics',
    sku: 'WH-1000XM5',
    images: [
        'https://example.com/images/headphones1.jpg',
        'https://example.com/images/headphones2.jpg',
    ],
    weight: 250,
    dimensions: { length: 20, width: 18, height: 8 },
    is_active: true,
    approval_status: 'approved',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
    tags: ['wireless', 'noise-canceling', 'premium'],
};

export const mockProduct2: Product = {
    id: 'prod-002',
    seller_id: 'seller-001',
    name: 'Premium Arabica Coffee',
    description: 'Freshly roasted whole bean coffee',
    price: 450.00,
    stock: 200,
    category: 'Food & Beverage',
    sku: 'COFFEE-ARB-001',
    images: ['https://example.com/images/coffee.jpg'],
    weight: 500,
    dimensions: { length: 15, width: 10, height: 5 },
    is_active: true,
    approval_status: 'approved',
    created_at: '2024-01-10T08:30:00Z',
    updated_at: '2024-01-10T08:30:00Z',
    tags: ['organic', 'fair-trade', 'arabica'],
};

export const mockProduct3Inactive: Product = {
    id: 'prod-003',
    seller_id: 'seller-002',
    name: 'Vintage Film Camera',
    description: 'Classic 35mm film camera in excellent condition',
    price: 15000.00,
    stock: 1,
    category: 'Electronics',
    sku: 'CAM-VINTAGE-80',
    images: ['https://example.com/images/camera.jpg'],
    weight: 800,
    dimensions: { length: 14, width: 10, height: 8 },
    is_active: false, // Inactive product
    approval_status: 'approved',
    created_at: '2024-01-05T14:20:00Z',
    updated_at: '2024-01-20T16:45:00Z',
    tags: ['vintage', 'collectible'],
};

export const mockProduct4Pending: Product = {
    id: 'prod-004',
    seller_id: 'seller-002',
    name: 'Smart Watch Pro',
    description: 'Advanced fitness tracking and notifications',
    price: 3999.00,
    stock: 30,
    category: 'Electronics',
    sku: 'WATCH-SMART-01',
    images: ['https://example.com/images/watch.jpg'],
    weight: 50,
    dimensions: { length: 5, width: 4, height: 1 },
    is_active: true,
    approval_status: 'pending', // Pending approval
    created_at: '2024-01-25T09:00:00Z',
    updated_at: '2024-01-25T09:00:00Z',
    tags: ['fitness', 'wearable'],
};

export const mockProducts: Product[] = [
    mockProduct1,
    mockProduct2,
    mockProduct3Inactive,
    mockProduct4Pending,
];

// For creating new products in tests
export const mockProductInsert: any = {
    seller_id: 'seller-001',
    name: 'New Test Product',
    description: 'Test product description',
    price: 999.99,
    stock: 100,
    category: 'Test Category',
    sku: 'TEST-SKU-001',
    images: [],
    is_active: true,
    approval_status: 'pending',
};

// For testing with seller data
export const mockProductWithSeller: ProductWithSeller = {
    ...mockProduct1,
    seller: {
        business_name: 'TechGear Philippines',
        store_name: 'TechGear Store',
        rating: 4.8,
        business_address: '123 Tech Street, Makati City',
    } as any,
};
