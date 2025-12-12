import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
interface Seller {
  id: string;
  name: string;
  email: string;
  phone: string;
  storeName: string;
  storeDescription: string;
  storeAddress: string;
  isVerified: boolean;
  rating: number;
  totalSales: number;
  joinDate: string;
  avatar?: string;
}

interface SellerProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  stock: number;
  category: string;
  images: string[];
  isActive: boolean;
  sellerId: string;
  createdAt: string;
  updatedAt: string;
  sales: number;
  rating: number;
  reviews: number;
}

interface SellerOrder {
  id: string;
  buyerName: string;
  buyerEmail: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  orderDate: string;
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  trackingNumber?: string;
}

interface SellerStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  avgRating: number;
  monthlyRevenue: { month: string; revenue: number }[];
  topProducts: { name: string; sales: number; revenue: number }[];
  recentActivity: { 
    id: string; 
    type: 'order' | 'product' | 'review'; 
    message: string; 
    time: string; 
  }[];
}

interface AuthStore {
  seller: Seller | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (sellerData: Partial<Seller> & { email: string; password: string }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (updates: Partial<Seller>) => void;
}

interface ProductStore {
  products: SellerProduct[];
  addProduct: (product: Omit<SellerProduct, 'id' | 'createdAt' | 'updatedAt' | 'sales' | 'rating' | 'reviews'>) => void;
  updateProduct: (id: string, updates: Partial<SellerProduct>) => void;
  deleteProduct: (id: string) => void;
  getProduct: (id: string) => SellerProduct | undefined;
}

interface OrderStore {
  orders: SellerOrder[];
  updateOrderStatus: (id: string, status: SellerOrder['status']) => void;
  updatePaymentStatus: (id: string, status: SellerOrder['paymentStatus']) => void;
  getOrdersByStatus: (status: SellerOrder['status']) => SellerOrder[];
  addTrackingNumber: (id: string, trackingNumber: string) => void;
}

interface StatsStore {
  stats: SellerStats;
  refreshStats: () => void;
}

// Dummy data
const dummySeller: Seller = {
  id: 'seller-1',
  name: 'Juan Cruz',
  email: 'juan@example.com',
  phone: '+63 912 345 6789',
  storeName: 'Cruz Electronics',
  storeDescription: 'Premium electronics and gadgets for the modern Filipino family',
  storeAddress: 'Makati City, Metro Manila',
  isVerified: true,
  rating: 4.8,
  totalSales: 1580000,
  joinDate: '2023-01-15',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
};

const dummyProducts: SellerProduct[] = [
  {
    id: 'prod-1',
    name: 'iPhone 15 Pro Max',
    description: 'Latest iPhone with A17 Pro chip',
    price: 89990,
    originalPrice: 95990,
    stock: 25,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1696446702188-41d37c5f1c9a?w=400'],
    isActive: true,
    sellerId: 'seller-1',
    createdAt: '2024-12-01',
    updatedAt: '2024-12-10',
    sales: 45,
    rating: 4.9,
    reviews: 128
  },
  {
    id: 'prod-2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Flagship Android phone with S Pen',
    price: 79990,
    originalPrice: 85990,
    stock: 18,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400'],
    isActive: true,
    sellerId: 'seller-1',
    createdAt: '2024-11-15',
    updatedAt: '2024-12-08',
    sales: 32,
    rating: 4.7,
    reviews: 89
  },
  {
    id: 'prod-3',
    name: 'MacBook Pro M3',
    description: '14-inch MacBook Pro with M3 chip',
    price: 129990,
    originalPrice: 139990,
    stock: 12,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400'],
    isActive: true,
    sellerId: 'seller-1',
    createdAt: '2024-11-20',
    updatedAt: '2024-12-05',
    sales: 18,
    rating: 4.8,
    reviews: 42
  }
];

const dummyOrders: SellerOrder[] = [
  {
    id: 'ord-1',
    buyerName: 'Maria Santos',
    buyerEmail: 'maria@example.com',
    items: [
      {
        productId: 'prod-1',
        productName: 'iPhone 15 Pro Max',
        quantity: 1,
        price: 89990,
        image: 'https://images.unsplash.com/photo-1696446702188-41d37c5f1c9a?w=100'
      }
    ],
    total: 89990,
    status: 'pending',
    paymentStatus: 'paid',
    orderDate: '2024-12-12T10:30:00Z',
    shippingAddress: {
      fullName: 'Maria Santos',
      street: '123 Rizal Street',
      city: 'Quezon City',
      province: 'Metro Manila',
      postalCode: '1100',
      phone: '+63 917 123 4567'
    }
  },
  {
    id: 'ord-2',
    buyerName: 'Carlos Reyes',
    buyerEmail: 'carlos@example.com',
    items: [
      {
        productId: 'prod-2',
        productName: 'Samsung Galaxy S24 Ultra',
        quantity: 1,
        price: 79990,
        image: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=100'
      }
    ],
    total: 79990,
    status: 'shipped',
    paymentStatus: 'paid',
    orderDate: '2024-12-10T14:20:00Z',
    trackingNumber: 'TRK123456789',
    shippingAddress: {
      fullName: 'Carlos Reyes',
      street: '456 Bonifacio Avenue',
      city: 'Makati City',
      province: 'Metro Manila',
      postalCode: '1200',
      phone: '+63 918 987 6543'
    }
  }
];

// Auth Store
export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      seller: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (email === 'seller@bazaarph.com' && password === 'password') {
          set({ seller: dummySeller, isAuthenticated: true });
          return true;
        }
        return false;
      },
      register: async (sellerData) => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        const newSeller: Seller = {
          id: `seller-${Date.now()}`,
          name: sellerData.email?.split('@')[0] || 'New Seller',
          email: sellerData.email!,
          phone: sellerData.phone || '',
          storeName: sellerData.storeName || 'My Store',
          storeDescription: sellerData.storeDescription || '',
          storeAddress: sellerData.storeAddress || '',
          isVerified: false,
          rating: 0,
          totalSales: 0,
          joinDate: new Date().toISOString().split('T')[0]
        };
        set({ seller: newSeller, isAuthenticated: true });
        return true;
      },
      logout: () => {
        set({ seller: null, isAuthenticated: false });
      },
      updateProfile: (updates) => {
        const { seller } = get();
        if (seller) {
          set({ seller: { ...seller, ...updates } });
        }
      }
    }),
    {
      name: 'seller-auth-storage'
    }
  )
);

// Product Store
export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: dummyProducts,
      addProduct: (product) => {
        const newProduct: SellerProduct = {
          ...product,
          id: `prod-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sales: 0,
          rating: 0,
          reviews: 0
        };
        set((state) => ({ products: [...state.products, newProduct] }));
      },
      updateProduct: (id, updates) => {
        set((state) => ({
          products: state.products.map(product =>
            product.id === id
              ? { ...product, ...updates, updatedAt: new Date().toISOString() }
              : product
          )
        }));
      },
      deleteProduct: (id) => {
        set((state) => ({
          products: state.products.filter(product => product.id !== id)
        }));
      },
      getProduct: (id) => {
        return get().products.find(product => product.id === id);
      }
    }),
    {
      name: 'seller-products-storage'
    }
  )
);

// Order Store
export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: dummyOrders,
      updateOrderStatus: (id, status) => {
        set((state) => ({
          orders: state.orders.map(order =>
            order.id === id ? { ...order, status } : order
          )
        }));
      },
      updatePaymentStatus: (id, status) => {
        set((state) => ({
          orders: state.orders.map(order =>
            order.id === id ? { ...order, paymentStatus: status } : order
          )
        }));
      },
      getOrdersByStatus: (status) => {
        return get().orders.filter(order => order.status === status);
      },
      addTrackingNumber: (id, trackingNumber) => {
        set((state) => ({
          orders: state.orders.map(order =>
            order.id === id ? { ...order, trackingNumber } : order
          )
        }));
      }
    }),
    {
      name: 'seller-orders-storage'
    }
  )
);

// Stats Store
export const useStatsStore = create<StatsStore>()(() => ({
  stats: {
    totalRevenue: 1580000,
    totalOrders: 256,
    totalProducts: 45,
    avgRating: 4.8,
    monthlyRevenue: [
      { month: 'Jan', revenue: 120000 },
      { month: 'Feb', revenue: 150000 },
      { month: 'Mar', revenue: 180000 },
      { month: 'Apr', revenue: 200000 },
      { month: 'May', revenue: 160000 },
      { month: 'Jun', revenue: 220000 },
      { month: 'Jul', revenue: 250000 },
      { month: 'Aug', revenue: 180000 },
      { month: 'Sep', revenue: 190000 },
      { month: 'Oct', revenue: 210000 },
      { month: 'Nov', revenue: 240000 },
      { month: 'Dec', revenue: 170000 }
    ],
    topProducts: [
      { name: 'iPhone 15 Pro Max', sales: 45, revenue: 4049550 },
      { name: 'Samsung Galaxy S24 Ultra', sales: 32, revenue: 2559680 },
      { name: 'MacBook Pro M3', sales: 18, revenue: 2339820 }
    ],
    recentActivity: [
      {
        id: '1',
        type: 'order',
        message: 'New order from Maria Santos',
        time: '2 hours ago'
      },
      {
        id: '2',
        type: 'product',
        message: 'iPhone 15 Pro Max stock is running low',
        time: '4 hours ago'
      },
      {
        id: '3',
        type: 'review',
        message: 'New 5-star review for MacBook Pro M3',
        time: '1 day ago'
      }
    ]
  },
  refreshStats: () => {
    // In a real app, this would fetch from API
    console.log('Refreshing stats...');
  }
}));