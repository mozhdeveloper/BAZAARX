import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: string;
  rating: number;
  category: string;
  originalPrice?: number;
  sold?: number;
  isFreeShipping?: boolean;
  isVerified?: boolean;
  location?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  date: string; // Formatted date string
  shippingAddress: {
    fullName: string;
    street: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  };
  paymentMethod: {
    type: 'card' | 'gcash' | 'paymaya' | 'cod';
    details?: string;
  };
  estimatedDelivery: Date;
  trackingNumber?: string;
}

interface CartStore {
  items: CartItem[];
  orders: Order[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'items' | 'total' | 'date' | 'estimatedDelivery' | 'trackingNumber'>) => string;
  getOrderById: (orderId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  simulateOrderProgression: (orderId: string) => void;
}

// Sample orders for testing the complete flow
const sampleOrders: Order[] = [
  {
    id: 'order_1734516000000_sample1',
    items: [
      {
        id: '1',
        name: 'Premium Wireless Earbuds',
        price: 2499,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop',
        seller: 'TechHub Manila',
        rating: 4.8,
        category: 'Electronics',
        quantity: 1,
        isFreeShipping: true,
        isVerified: true,
        location: 'Makati, Metro Manila'
      }
    ],
    total: 2499,
    status: 'shipped',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    estimatedDelivery: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // tomorrow
    trackingNumber: 'BPH2024120001',
    shippingAddress: {
      fullName: 'Juan Dela Cruz',
      street: '123 Katipunan Avenue',
      city: 'Quezon City',
      province: 'Metro Manila',
      postalCode: '1108',
      phone: '+63912345678'
    },
    paymentMethod: {
      type: 'gcash',
      details: '****5678'
    }
  },
  {
    id: 'order_1734432000000_sample2',
    items: [
      {
        id: '3',
        name: 'Vintage Leather Bag',
        price: 3299,
        image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=300&fit=crop',
        seller: 'Manila Leather Co.',
        rating: 4.9,
        category: 'Fashion',
        quantity: 1,
        originalPrice: 4999,
        location: 'Pasig, Metro Manila'
      }
    ],
    total: 3299,
    status: 'delivered',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    estimatedDelivery: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // delivered 2 days ago
    trackingNumber: 'BPH2024120002',
    shippingAddress: {
      fullName: 'Juan Dela Cruz',
      street: '123 Katipunan Avenue',
      city: 'Quezon City',
      province: 'Metro Manila',
      postalCode: '1108',
      phone: '+63912345678'
    },
    paymentMethod: {
      type: 'card',
      details: '****1234'
    }
  }
];

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orders: sampleOrders,
      
      addToCart: (product: Product) => {
        set((state) => {
          const existingItem = state.items.find(item => item.id === product.id);
          
          if (existingItem) {
            return {
              ...state,
              items: state.items.map(item =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          } else {
            return {
              ...state,
              items: [...state.items, { ...product, quantity: 1 }],
            };
          }
        });
      },
      
      removeFromCart: (productId: string) => {
        set((state) => ({
          ...state,
          items: state.items.filter(item => item.id !== productId),
        }));
      },
      
      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }
        
        set((state) => ({
          ...state,
          items: state.items.map(item =>
            item.id === productId
              ? { ...item, quantity }
              : item
          ),
        }));
      },
      
      clearCart: () => {
        set((state) => ({ ...state, items: [] }));
      },
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
      
      createOrder: (orderData) => {
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentItems = get().items;
        const total = get().getTotalPrice();
        
        // Generate tracking number
        const trackingNumber = `BPH${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
        
        // Calculate estimated delivery (2-5 days based on shipping method)
        const deliveryDays = orderData.paymentMethod?.type === 'cod' ? 5 : 3;
        const estimatedDelivery = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);
        const createdAt = new Date();
        
        const newOrder: Order = {
          id: orderId,
          items: [...currentItems],
          total,
          createdAt,
          date: createdAt.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
          estimatedDelivery,
          trackingNumber,
          status: 'pending',
          shippingAddress: orderData.shippingAddress,
          paymentMethod: orderData.paymentMethod,
        };
        
        set((state) => ({
          ...state,
          orders: [...state.orders, newOrder],
          items: [], // Clear cart after order
        }));
        
        // Start order progression simulation
        get().simulateOrderProgression(orderId);
        
        return orderId;
      },
      
      getOrderById: (orderId: string) => {
        return get().orders.find(order => order.id === orderId);
      },
      
      updateOrderStatus: (orderId: string, status: Order['status']) => {
        set((state) => ({
          ...state,
          orders: state.orders.map(order =>
            order.id === orderId
              ? { ...order, status }
              : order
          ),
        }));
      },

      // Simulate realistic order progression
      simulateOrderProgression: (orderId: string) => {
        const updateStatus = get().updateOrderStatus;
        
        // Confirmed after 2 seconds
        setTimeout(() => {
          updateStatus(orderId, 'confirmed');
          
          // Shipped after 1 minute (for demo purposes, normally would be hours/days)
          setTimeout(() => {
            updateStatus(orderId, 'shipped');
          }, 60000); // 1 minute
          
        }, 2000); // 2 seconds
      },
    }),
    {
      name: 'bazaar-cart-store',
    }
  )
);

export type { Product, CartItem, Order };