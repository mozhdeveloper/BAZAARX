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
  createOrder: (order: Omit<Order, 'id' | 'createdAt' | 'items' | 'total'>) => string;
  getOrderById: (orderId: string) => Order | undefined;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orders: [],
      
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
        
        const newOrder: Order = {
          id: orderId,
          items: [...currentItems],
          total,
          status: 'pending',
          createdAt: new Date(),
          ...orderData,
        };
        
        set((state) => ({
          ...state,
          orders: [...state.orders, newOrder],
          items: [], // Clear cart after order
        }));
        
        return orderId;
      },
      
      getOrderById: (orderId: string) => {
        return get().orders.find(order => order.id === orderId);
      },
    }),
    {
      name: 'bazaar-cart-store',
    }
  )
);

export type { Product, CartItem, Order };