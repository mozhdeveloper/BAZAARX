import type { SellerData } from '@/services/sellerService';

/**
 * Mock Sellers
 * Realistic test data matching database schema
 */

export const mockSeller1: SellerData = {
    id: 'seller-001',
    business_name: 'TechGear Philippines Inc.',
    store_name: 'TechGear Store',
    store_description: 'Your one-stop shop for premium electronics and gadgets',
    store_category: ['Electronics', 'Gadgets', 'Audio'],
    business_type: 'Corporation',
    business_registration_number: 'BRN-2023-001234',
    tax_id_number: 'TIN-123-456-789',
    business_address: '123 Tech Street, Salcedo Village',
    city: 'Makati City',
    province: 'Metro Manila',
    postal_code: '1227',
    bank_name: 'BDO Unibank',
    account_name: 'TechGear Philippines Inc.',
    account_number: '1234567890',
    is_verified: true,
    approval_status: 'approved',
    rejection_reason: null,
    rating: 4.8,
    total_sales: 125000,
    join_date: '2023-06-15T00:00:00Z',
    created_at: '2023-06-15T08:30:00Z',
    updated_at: '2024-01-20T10:15:00Z',
};

export const mockSeller2: SellerData = {
    id: 'seller-002',
    business_name: 'Vintage Finds Co.',
    store_name: 'Retro Treasures',
    store_description: 'Curated vintage and collectible items',
    store_category: ['Collectibles', 'Vintage', 'Electronics'],
    business_type: 'Sole Proprietorship',
    business_registration_number: 'BRN-2023-005678',
    tax_id_number: 'TIN-987-654-321',
    business_address: '456 Heritage Lane, Quezon City',
    city: 'Quezon City',
    province: 'Metro Manila',
    postal_code: '1100',
    bank_name: 'BPI',
    account_name: 'Juan Dela Cruz',
    account_number: '0987654321',
    is_verified: true,
    approval_status: 'approved',
    rejection_reason: null,
    rating: 4.5,
    total_sales: 75000,
    join_date: '2023-08-20T00:00:00Z',
    created_at: '2023-08-20T14:00:00Z',
    updated_at: '2024-01-18T16:45:00Z',
};

export const mockSeller3Pending: SellerData = {
    id: 'seller-003',
    business_name: 'New Seller Business',
    store_name: 'Fresh Start Store',
    store_description: 'New store selling various items',
    store_category: ['General'],
    business_type: 'Partnership',
    business_registration_number: 'BRN-2024-000123',
    tax_id_number: 'TIN-111-222-333',
    business_address: '789 New Street, Pasig City',
    city: 'Pasig City',
    province: 'Metro Manila',
    postal_code: '1600',
    bank_name: 'Metrobank',
    account_name: 'New Seller Business',
    account_number: '5555666677',
    is_verified: false,
    approval_status: 'pending', // Pending approval
    rejection_reason: null,
    rating: 0,
    total_sales: 0,
    join_date: '2024-01-28T00:00:00Z',
    created_at: '2024-01-28T09:00:00Z',
    updated_at: '2024-01-28T09:00:00Z',
};

export const mockSeller4Rejected: SellerData = {
    id: 'seller-004',
    business_name: 'Rejected Seller Co.',
    store_name: 'Rejected Store',
    store_description: 'This store was rejected',
    store_category: ['Test'],
    business_type: 'Sole Proprietorship',
    business_registration_number: 'BRN-2024-999999',
    tax_id_number: 'TIN-999-999-999',
    business_address: '999 Test Street',
    city: 'Test City',
    province: 'Test Province',
    postal_code: '9999',
    bank_name: 'Test Bank',
    account_name: 'Test Account',
    account_number: '9999999999',
    is_verified: false,
    approval_status: 'rejected',
    rejection_reason: 'Incomplete business registration documents',
    rating: 0,
    total_sales: 0,
    join_date: '2024-01-20T00:00:00Z',
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-22T14:30:00Z',
};

export const mockSellers: SellerData[] = [
    mockSeller1,
    mockSeller2,
    mockSeller3Pending,
    mockSeller4Rejected,
];

// For creating/updating sellers in tests
export const mockNewSellerData = {
    id: 'seller-new',
    business_name: 'Test New Business',
    store_name: 'Test New Store',
    store_description: 'A new test store',
    is_verified: false,
    approval_status: 'pending' as const,
    rating: 0,
    total_sales: 0,
};
