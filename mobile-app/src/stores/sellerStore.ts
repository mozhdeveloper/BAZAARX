import { create } from 'zustand';

export interface SellerProduct {
  id: string;
  name: string;
  price: number;
  stock: number;
  image: string;
  category: string;
  isActive: boolean;
  sold: number;
}

export interface SellerOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: {
    productId: string;
    productName: string;
    image: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'to-ship' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface RevenueData {
  date: string;
  value: number;
}

export interface CategorySales {
  category: string;
  value: number;
  color: string;
}

export interface SellerDocument {
  id: string;
  type: 'business_permit' | 'valid_id' | 'proof_of_address';
  fileName: string;
  url: string;
  uploadDate: string;
  isVerified: boolean;
}

export interface SellerProfile {
  id: string;
  // Personal
  ownerName: string;
  email: string;
  phone: string;
  
  // Business
  businessName: string;
  storeName: string;
  storeDescription: string;
  storeLogo: string;
  storeCategory: string[];
  businessType: 'sole_proprietor' | 'partnership' | 'corporation';
  businessRegistrationNumber: string;
  taxIdNumber: string;
  
  // Address
  businessAddress: string;
  city: string;
  province: string;
  postalCode: string;
  
  // Banking
  bankName: string;
  accountName: string;
  accountNumber: string;
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  documents: SellerDocument[];
}

interface SellerStats {
  totalRevenue: number;
  totalOrders: number;
  totalVisits: number;
  revenueChange: number;
  ordersChange: number;
  visitsChange: number;
}

interface SellerStore {
  // Seller Info
  seller: SellerProfile;
  
  // Stats
  stats: SellerStats;
  
  // Products
  products: SellerProduct[];
  addProduct: (product: SellerProduct) => void;
  updateProduct: (id: string, updates: Partial<SellerProduct>) => void;
  deleteProduct: (id: string) => void;
  toggleProductStatus: (id: string) => void;
  
  // Orders
  orders: SellerOrder[];
  updateOrderStatus: (orderId: string, status: SellerOrder['status']) => void;
  
  // Analytics
  revenueData: RevenueData[];
  categorySales: CategorySales[];
  
  // Settings
  updateSellerInfo: (updates: Partial<SellerStore['seller']>) => void;
}

// Dummy Data
const dummyProducts: SellerProduct[] = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    price: 75999,
    stock: 24,
    image: 'https://images.unsplash.com/photo-1696446702877-c040ff34b6d4?w=300',
    category: 'Electronics',
    isActive: true,
    sold: 156,
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    price: 69999,
    stock: 18,
    image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300',
    category: 'Electronics',
    isActive: true,
    sold: 142,
  },
  {
    id: '3',
    name: 'MacBook Pro M3',
    price: 129999,
    stock: 12,
    image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300',
    category: 'Electronics',
    isActive: true,
    sold: 89,
  },
  {
    id: '4',
    name: 'AirPods Pro (2nd Gen)',
    price: 14999,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=300',
    category: 'Accessories',
    isActive: true,
    sold: 234,
  },
  {
    id: '5',
    name: 'iPad Air M2',
    price: 42999,
    stock: 8,
    image: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=300',
    category: 'Electronics',
    isActive: false,
    sold: 67,
  },
  {
    id: '6',
    name: 'Sony WH-1000XM5',
    price: 19999,
    stock: 32,
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcf?w=300',
    category: 'Accessories',
    isActive: true,
    sold: 178,
  },
];

const dummyOrders: SellerOrder[] = [
  {
    id: '1',
    orderId: 'ORD-2024-001',
    customerName: 'Juan Dela Cruz',
    customerEmail: 'juan@example.com',
    items: [
      {
        productId: '1',
        productName: 'iPhone 15 Pro Max',
        image: 'https://images.unsplash.com/photo-1696446702877-c040ff34b6d4?w=100',
        quantity: 1,
        price: 75999,
      },
    ],
    total: 75999,
    status: 'pending',
    createdAt: '2024-12-20T10:30:00Z',
  },
  {
    id: '2',
    orderId: 'ORD-2024-002',
    customerName: 'Maria Santos',
    customerEmail: 'maria@example.com',
    items: [
      {
        productId: '4',
        productName: 'AirPods Pro (2nd Gen)',
        image: 'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=100',
        quantity: 2,
        price: 14999,
      },
    ],
    total: 29998,
    status: 'to-ship',
    createdAt: '2024-12-19T15:45:00Z',
  },
  {
    id: '3',
    orderId: 'ORD-2024-003',
    customerName: 'Carlos Garcia',
    customerEmail: 'carlos@example.com',
    items: [
      {
        productId: '3',
        productName: 'MacBook Pro M3',
        image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=100',
        quantity: 1,
        price: 129999,
      },
      {
        productId: '6',
        productName: 'Sony WH-1000XM5',
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcf?w=100',
        quantity: 1,
        price: 19999,
      },
    ],
    total: 149998,
    status: 'completed',
    createdAt: '2024-12-18T09:20:00Z',
  },
  {
    id: '4',
    orderId: 'ORD-2024-004',
    customerName: 'Ana Reyes',
    customerEmail: 'ana@example.com',
    items: [
      {
        productId: '2',
        productName: 'Samsung Galaxy S24 Ultra',
        image: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=100',
        quantity: 1,
        price: 69999,
      },
    ],
    total: 69999,
    status: 'completed',
    createdAt: '2024-12-17T14:10:00Z',
  },
  {
    id: '5',
    orderId: 'ORD-2024-005',
    customerName: 'Pedro Lim',
    customerEmail: 'pedro@example.com',
    items: [
      {
        productId: '6',
        productName: 'Sony WH-1000XM5',
        image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcf?w=100',
        quantity: 1,
        price: 19999,
      },
    ],
    total: 19999,
    status: 'pending',
    createdAt: '2024-12-20T11:00:00Z',
  },
];

const dummyRevenueData: RevenueData[] = [
  { date: 'Dec 14', value: 45000 },
  { date: 'Dec 15', value: 52000 },
  { date: 'Dec 16', value: 48000 },
  { date: 'Dec 17', value: 69999 },
  { date: 'Dec 18', value: 149998 },
  { date: 'Dec 19', value: 29998 },
  { date: 'Dec 20', value: 95998 },
];

const dummyCategorySales: CategorySales[] = [
  { category: 'Electronics', value: 65, color: '#FF5722' },
  { category: 'Accessories', value: 25, color: '#FFA726' },
  { category: 'Wearables', value: 10, color: '#FFB74D' },
];

export const useSellerStore = create<SellerStore>((set) => ({
  // Seller Info
  seller: {
    id: 'seller-001',
    // Personal
    ownerName: 'Juan Dela Cruz',
    email: 'seller@bazaarx.ph',
    phone: '+63 912 345 6789',
    
    // Business
    businessName: 'Tech Shop Philippines Inc.',
    storeName: 'Tech Shop PH',
    storeDescription: 'Your trusted source for premium electronics and gadgets. We provide the latest tech at affordable prices.',
    storeLogo: '🛍️',
    storeCategory: ['Electronics', 'Accessories'],
    businessType: 'corporation',
    businessRegistrationNumber: 'COR-2024-12345',
    taxIdNumber: '123-456-789-000',
    
    // Address
    businessAddress: '123 Tech St., Makati City',
    city: 'Makati',
    province: 'Metro Manila',
    postalCode: '1200',
    
    // Banking
    bankName: 'BDO',
    accountName: 'Tech Shop PH Inc.',
    accountNumber: '**** **** **** 1234',
    
    // Status
    status: 'approved',
    documents: [
      {
        id: 'doc-1',
        type: 'business_permit',
        fileName: 'business_permit_2024.pdf',
        url: '#',
        uploadDate: '2024-01-15',
        isVerified: true
      },
      {
        id: 'doc-2',
        type: 'valid_id',
        fileName: 'valid_id_juan.png',
        url: '#',
        uploadDate: '2024-01-15',
        isVerified: true
      }
    ]
  },

  // Stats
  stats: {
    totalRevenue: 490991,
    totalOrders: 156,
    totalVisits: 3420,
    revenueChange: 12.5,
    ordersChange: 8.3,
    visitsChange: 15.7,
  },

  // Products
  products: dummyProducts,

  addProduct: (product) =>
    set((state) => ({
      products: [...state.products, product],
    })),

  updateProduct: (id, updates) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  deleteProduct: (id) =>
    set((state) => ({
      products: state.products.filter((p) => p.id !== id),
    })),

  toggleProductStatus: (id) =>
    set((state) => ({
      products: state.products.map((p) =>
        p.id === id ? { ...p, isActive: !p.isActive } : p
      ),
    })),

  // Orders
  orders: dummyOrders,

  updateOrderStatus: (orderId, status) =>
    set((state) => ({
      orders: state.orders.map((o) =>
        o.orderId === orderId ? { ...o, status } : o
      ),
    })),

  // Analytics
  revenueData: dummyRevenueData,
  categorySales: dummyCategorySales,

  // Settings
  updateSellerInfo: (updates) =>
    set((state) => ({
      seller: { ...state.seller, ...updates },
    })),
}));
