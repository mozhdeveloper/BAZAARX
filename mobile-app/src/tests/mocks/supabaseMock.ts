/**
 * Supabase Mock for Jest Tests
 * Provides mock data and functions for testing without hitting the real database
 */

// Mock product data
export const mockProducts = [
  {
    id: 'prod-1',
    name: 'Test Product 1',
    price: 1500,
    original_price: 2000,
    colors: ['Red', 'Blue'],
    sizes: ['S', 'M', 'L'],
    images: ['https://example.com/image1.jpg'],
    primary_image: 'https://example.com/image1.jpg',
    stock: 50,
    description: 'Test product description',
    category: 'Electronics',
    seller_id: 'seller-1',
    is_active: true,
    approval_status: 'approved',
    rating: 4.5,
    sales_count: 100,
    seller: {
      id: 'seller-1',
      store_name: 'Test Store',
      business_name: 'Test Business',
      rating: 4.8,
      is_verified: true,
      business_address: 'Manila, Philippines',
    },
  },
  {
    id: 'prod-2',
    name: 'Test Product 2',
    price: 2500,
    colors: ['Black', 'White'],
    sizes: [],
    images: ['https://example.com/image2.jpg'],
    primary_image: 'https://example.com/image2.jpg',
    stock: 30,
    description: 'Another test product',
    category: 'Fashion',
    seller_id: 'seller-1',
    is_active: true,
    approval_status: 'approved',
    rating: 4.2,
    sales_count: 50,
    seller: {
      id: 'seller-1',
      store_name: 'Test Store',
      business_name: 'Test Business',
      rating: 4.8,
      is_verified: true,
      business_address: 'Manila, Philippines',
    },
  },
];

// Mock buyer data
export const mockBuyer = {
  id: 'buyer-1',
  user_id: 'user-1',
  full_name: 'Test Buyer',
  email: 'buyer@test.com',
  phone: '+639171234567',
  avatar_url: null,
  bazcoins: 500,
  created_at: '2025-01-01T00:00:00Z',
};

// Mock addresses
export const mockAddresses = [
  {
    id: 'addr-1',
    buyer_id: 'buyer-1',
    label: 'Home',
    street: '123 Test Street',
    city: 'Manila',
    province: 'Metro Manila',
    postal_code: '1000',
    is_default: true,
    coordinates: { latitude: 14.5995, longitude: 120.9842 },
  },
  {
    id: 'addr-2',
    buyer_id: 'buyer-1',
    label: 'Current Location',
    street: 'Kamagong Street',
    city: 'Industrial Valley',
    province: 'Metro Manila',
    postal_code: '1000',
    is_default: false,
    coordinates: { latitude: 14.6, longitude: 120.99 },
  },
];

// Mock cart items
export const mockCartItems = [
  {
    id: 'cart-1',
    buyer_id: 'buyer-1',
    product_id: 'prod-1',
    quantity: 2,
    selected_variant: { color: 'Red', size: 'M' },
    created_at: '2025-01-15T00:00:00Z',
  },
];

// Mock orders
export const mockOrders = [
  {
    id: 'order-1',
    order_number: 'ORD-2026010001',
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    status: 'delivered',
    subtotal: 3000,
    shipping_fee: 50,
    discount: 0,
    total: 3050,
    shipping_address: {
      street: '123 Test Street',
      city: 'Manila',
      province: 'Metro Manila',
    },
    payment_method: 'cod',
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2025-01-15T00:00:00Z',
  },
];

// Mock order items
export const mockOrderItems = [
  {
    id: 'item-1',
    order_id: 'order-1',
    product_id: 'prod-1',
    quantity: 2,
    unit_price: 1500,
    selected_variant: { color: 'Red', size: 'M' },
    is_reviewed: false,
  },
];

// Mock reviews
export const mockReviews = [
  {
    id: 'review-1',
    product_id: 'prod-1',
    buyer_id: 'buyer-1',
    seller_id: 'seller-1',
    order_id: 'order-1',
    rating: 5,
    comment: 'Great product!',
    images: [],
    helpful_count: 10,
    is_hidden: false,
    is_edited: false,
    created_at: '2025-01-16T00:00:00Z',
    updated_at: '2025-01-16T00:00:00Z',
  },
];

// Mock Supabase client
export const createMockSupabaseClient = () => {
  const mockFrom = (table: string) => {
    const chain: any = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
    };

    // Return appropriate mock data based on table
    const getMockData = () => {
      switch (table) {
        case 'products':
          return { data: mockProducts, error: null, count: mockProducts.length };
        case 'buyers':
          return { data: mockBuyer, error: null };
        case 'addresses':
          return { data: mockAddresses, error: null, count: mockAddresses.length };
        case 'cart_items':
          return { data: mockCartItems, error: null };
        case 'orders':
          return { data: mockOrders, error: null, count: mockOrders.length };
        case 'order_items':
          return { data: mockOrderItems, error: null };
        case 'reviews':
          return { data: mockReviews, error: null, count: mockReviews.length };
        default:
          return { data: [], error: null };
      }
    };

    // Override terminal methods to return mock data
    chain.select = jest.fn(() => {
      const innerChain = { ...chain };
      innerChain.then = (resolve: Function) => resolve(getMockData());
      return innerChain;
    });

    return chain;
  };

  return {
    from: mockFrom,
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } }, error: null })),
      signIn: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
    },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
    })),
    removeChannel: jest.fn(),
  };
};
