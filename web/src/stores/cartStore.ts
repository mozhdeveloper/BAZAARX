import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Unified Product interface for cart system
export interface Product {
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
  description?: string;
}

// Cart item with quantity
export interface CartItem extends Product {
  quantity: number;
}

// Unified order interface
export interface Order {
  id: string;
  orderNumber?: string; // User-friendly order number
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  isPaid: boolean; // Payment status
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

export interface OrderNotification {
  id: string;
  orderId: string;
  type: 'seller_confirmed' | 'shipped' | 'delivered' | 'cancelled';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface CartStore {
  items: CartItem[];
  orders: Order[];
  notifications: OrderNotification[];
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
  addNotification: (orderId: string, type: OrderNotification['type'], message: string) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  getUnreadNotifications: () => OrderNotification[];
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
    isPaid: true, // Card payment - Already paid
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
    isPaid: true, // Card - Already paid
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
  },
  {
    id: 'order_1734348000000_sample3',
    items: [
      {
        id: '10',
        name: 'Smart Watch Pro - Fitness Tracker',
        price: 1899,
        image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=300&h=300&fit=crop',
        seller: 'TechGadgets PH',
        rating: 4.6,
        category: 'Electronics',
        quantity: 1,
        isFreeShipping: true,
        isVerified: true,
        location: 'BGC, Metro Manila'
      }
    ],
    total: 1899,
    status: 'pending',
    isPaid: false, // COD - Not yet paid
    createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000),
    date: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    trackingNumber: 'BPH2024120003',
    shippingAddress: {
      fullName: 'Juan Dela Cruz',
      street: '123 Katipunan Avenue',
      city: 'Quezon City',
      province: 'Metro Manila',
      postalCode: '1108',
      phone: '+63912345678'
    },
    paymentMethod: {
      type: 'cod',
      details: 'Cash on Delivery'
    }
  },
  {
    id: 'order_1734264000000_sample4',
    items: [
      {
        id: '12',
        name: 'Wireless Gaming Mouse RGB',
        price: 1599,
        image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=300&h=300&fit=crop',
        seller: 'Gaming Pro Store',
        rating: 4.7,
        category: 'Electronics',
        quantity: 1,
        isFreeShipping: true,
        isVerified: true,
        location: 'Ortigas, Metro Manila'
      }
    ],
    total: 1599,
    status: 'confirmed',
    isPaid: true, // PayMaya - Already paid
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }),
    estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    trackingNumber: 'BPH2024120004',
    shippingAddress: {
      fullName: 'Juan Dela Cruz',
      street: '123 Katipunan Avenue',
      city: 'Quezon City',
      province: 'Metro Manila',
      postalCode: '1108',
      phone: '+63912345678'
    },
    paymentMethod: {
      type: 'paymaya',
      details: '****9876'
    }
  }
];

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      orders: [],
      notifications: [
        {
          id: 'notif-1',
          orderId: 'order-001',
          type: 'seller_confirmed',
          message: 'Your order has been confirmed by the seller!',
          timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
          read: false,
        },
        {
          id: 'notif-2',
          orderId: 'order-002',
          type: 'shipped',
          message: 'Your order is on the way! Track your delivery.',
          timestamp: new Date(Date.now() - 30 * 60000), // 30 minutes ago
          read: false,
        },
        {
          id: 'notif-3',
          orderId: 'order-003',
          type: 'delivered',
          message: 'Your order has been delivered!',
          timestamp: new Date(Date.now() - 2 * 3600000), // 2 hours ago
          read: true,
        },
      ],
      
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
          isPaid: orderData.paymentMethod?.type !== 'cod', // COD is unpaid, others are paid
          shippingAddress: orderData.shippingAddress,
          paymentMethod: orderData.paymentMethod,
        };
        
        set((state) => ({
          ...state,
          orders: [...state.orders, newOrder],
          items: [], // Clear cart after order
        }));
        
        // Also create seller orders - group items by seller
        // This is done asynchronously to not block buyer checkout
        try {
          // Dynamically import to avoid circular dependency
          import('./sellerStore').then(({ useOrderStore }) => {
            const sellerOrderStore = useOrderStore.getState();
            
            // Group cart items by seller
            const itemsBySeller: { [seller: string]: CartItem[] } = {};
            currentItems.forEach(item => {
              const seller = item.seller || 'Unknown Seller';
              if (!itemsBySeller[seller]) {
                itemsBySeller[seller] = [];
              }
              itemsBySeller[seller].push(item);
            });
            
            // Create a seller order for each seller with proper validation
            Object.entries(itemsBySeller).forEach(([sellerName, items]) => {
              try {
                const sellerTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                
                // Validate seller order data before creating
                const paymentStatus: 'pending' | 'paid' = orderData.paymentMethod?.type === 'cod' ? 'pending' : 'paid';
                
                const sellerOrderData = {
                  buyerName: orderData.shippingAddress.fullName || 'Unknown Buyer',
                  buyerEmail: 'buyer@bazaarph.com', // TODO: Get from auth when available
                  items: items.map(item => ({
                    productId: item.id,
                    productName: item.name,
                    quantity: Math.max(1, item.quantity),
                    price: Math.max(0, item.price),
                    image: item.image || 'https://placehold.co/100?text=Product'
                  })),
                  total: Math.max(0, sellerTotal),
                  status: 'pending' as const,
                  paymentStatus,
                  orderDate: createdAt.toISOString(),
                  shippingAddress: {
                    fullName: orderData.shippingAddress.fullName || 'Unknown',
                    street: orderData.shippingAddress.street || '',
                    city: orderData.shippingAddress.city || '',
                    province: orderData.shippingAddress.province || '',
                    postalCode: orderData.shippingAddress.postalCode || '',
                    phone: orderData.shippingAddress.phone || ''
                  },
                  trackingNumber
                };

                // Create the seller order
                const sellerOrderId = sellerOrderStore.addOrder(sellerOrderData);
                console.log(`Created seller order ${sellerOrderId} for ${sellerName}`);
              } catch (sellerOrderError) {
                console.error(`Failed to create seller order for ${sellerName}:`, sellerOrderError);
                // Log but don't fail - buyer order is already created
              }
            });
          }).catch(importError => {
            console.error('Failed to import seller store:', importError);
          });
        } catch (error) {
          console.error('Error in seller order creation process:', error);
          // Don't fail the buyer order if seller order creation fails
        }
        
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
      addNotification: (orderId, type, message) => {
        const notificationId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        set((state) => ({
          notifications: [
            {
              id: notificationId,
              orderId,
              type,
              message,
              timestamp: new Date(),
              read: false
            },
            ...state.notifications
          ]
        }));
      },

      markNotificationRead: (notificationId) => {
        set((state) => ({
          notifications: state.notifications.map(notif =>
            notif.id === notificationId ? { ...notif, read: true } : notif
          )
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      getUnreadNotifications: () => {
        return get().notifications.filter(n => !n.read);
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
      version: 1, // Version for migration support
      onRehydrateStorage: () => (state) => {
        // Data integrity check on rehydration
        if (state) {
          // If no orders exist after rehydration, add sample orders
          if (state.orders.length === 0) {
            state.orders = sampleOrders;
          }
          
          // Validate and clean cart items
          state.items = state.items.filter(item => 
            item.id && 
            item.name && 
            item.price > 0 && 
            item.quantity > 0
          );
          
          // Ensure all orders have required fields
          state.orders = state.orders.filter(order => 
            order.id && 
            order.items.length > 0 && 
            order.total > 0 && 
            order.shippingAddress
          );
          
          console.log('Cart store rehydrated with', state.items.length, 'items and', state.orders.length, 'orders');
        }
      },
      partialize: (state) => ({
        items: state.items,
        orders: state.orders,
        // notifications are NOT persisted - always use initial hardcoded values
      }) as Partial<CartStore>,
    }
  )
);