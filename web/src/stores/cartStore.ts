import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { notificationService } from '@/services/notificationService';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Unified Product interface for cart system
export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  seller: string;
  sellerId?: string; // Seller UUID for database notifications
  seller_id?: string;
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
  cartItemId?: string; // DB cart_item id
  variant?: {
    id?: string;
    name?: string;
    size?: string;
    color?: string;
    sku?: string;
  };
}

// Unified order interface
export interface Order {
  id: string;
  orderNumber?: string; // User-friendly order number
  items: CartItem[];
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'reviewed';
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
  deliveryDate?: Date; // Actual delivery date
  trackingNumber?: string;
  returnRequest?: {
    reason: string;
    solution: string;
    comments: string;
    files: File[];
    refundAmount: number;
    submittedAt: Date;
  };
  review?: {
    rating: number;
    comment: string;
    images: string[];
    submittedAt: Date;
  };
}

export interface OrderNotification {
  id: string;
  orderId: string;
  type:
  | 'seller_confirmed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  // Seller notifications
  | 'seller_new_order'
  | 'seller_cancellation_request'
  | 'seller_return_request'
  | 'seller_return_approved'
  | 'seller_return_rejected';
  message: string;
  timestamp: Date;
  read: boolean;
}

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  isLoading: boolean;
  orders: Order[];
  notifications: OrderNotification[];
  initializeCart: (userId: string) => Promise<void>;
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
  addSellerNotification: (orderId: string, type: 'seller_new_order' | 'seller_cancellation_request' | 'seller_return_request' | 'seller_return_approved' | 'seller_return_rejected', message: string) => void;
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  getUnreadNotifications: () => OrderNotification[];
  updateOrderWithReturnRequest: (orderId: string, returnRequest: Order['returnRequest']) => void;
  updateOrderWithReview: (orderId: string, review: Order['review']) => void;
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
    deliveryDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // delivered 2 days ago
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

// Helper for local-only cart add (fallback when no DB)
function addToCartLocal(set: any, get: any, product: Product) {
  set((state: any) => {
    const existingItem = state.items.find((item: CartItem) => item.id === product.id);
    if (existingItem) {
      return {
        ...state,
        items: state.items.map((item: CartItem) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ),
      };
    } else {
      return {
        ...state,
        items: [...state.items, { ...product, quantity: 1 }],
      };
    }
  });
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      isLoading: false,
      orders: [],
      notifications: [],

      initializeCart: async (userId: string) => {
        if (!isSupabaseConfigured()) return;
        set({ isLoading: true });
        try {
          // Get or create cart
          let { data: cart } = await supabase
            .from('carts')
            .select('id')
            .eq('buyer_id', userId)
            .maybeSingle();

          if (!cart) {
            const { data: newCart, error } = await supabase
              .from('carts')
              .insert({ buyer_id: userId })
              .select('id')
              .single();
            if (error) throw error;
            cart = newCart;
          }

          set({ cartId: cart!.id });

          // Fetch cart items with product details
          const { data: rawItems, error } = await supabase
            .from('cart_items')
            .select(`
              *,
              product:products (
                id, name, description, price, seller_id, is_free_shipping,
                variant_label_1, variant_label_2,
                category:categories (name),
                images:product_images (image_url, is_primary, sort_order),
                seller:sellers!products_seller_id_fkey (id, store_name, avatar_url)
              ),
              variant:product_variants (
                id, sku, variant_name, size, color, option_1_value, option_2_value,
                price, stock, thumbnail_url
              )
            `)
            .eq('cart_id', cart!.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Map DB rows to flat CartItem format
          const items: CartItem[] = (rawItems || []).map((ci: any) => {
            const product = ci.product || {};
            const variant = ci.variant || null;
            const productImages = product.images || [];
            const primaryImg = productImages.find((img: any) => img.is_primary);
            const firstImg = [...productImages].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))[0];
            const imageUrl = variant?.thumbnail_url || primaryImg?.image_url || firstImg?.image_url || '';
            const price = (variant?.price != null && variant.price > 0) ? variant.price : (product.price || 0);
            const seller = product.seller || {};

            return {
              id: product.id || ci.product_id,
              cartItemId: ci.id,
              name: product.name || 'Product',
              price,
              image: imageUrl,
              seller: seller.store_name || 'Shop',
              sellerId: seller.id || product.seller_id || '',
              seller_id: seller.id || product.seller_id || '',
              rating: 0,
              category: product.category?.name || '',
              description: product.description || '',
              isFreeShipping: !!product.is_free_shipping,
              quantity: ci.quantity || 1,
              variant: variant ? {
                id: variant.id,
                name: variant.variant_name,
                size: variant.size,
                color: variant.color,
                sku: variant.sku,
              } : undefined,
            } as CartItem;
          });

          set({ items });
        } catch (e: any) {
          console.error('[WebCartStore] Failed to init cart:', e);
        } finally {
          set({ isLoading: false });
        }
      },

      addToCart: (product: Product) => {
        const cartId = get().cartId;
        
        if (cartId && isSupabaseConfigured()) {
          // DB-backed add
          (async () => {
            try {
              const variantId = (product as any).variant?.id || (product as any).selectedVariant?.variantId || null;
              
              // Check for existing item
              let query = supabase
                .from('cart_items')
                .select('id, quantity')
                .eq('cart_id', cartId)
                .eq('product_id', product.id);
              
              if (variantId) {
                query = query.eq('variant_id', variantId);
              } else {
                query = query.is('variant_id', null);
              }
              
              const { data: existing } = await query.maybeSingle();
              
              if (existing) {
                await supabase
                  .from('cart_items')
                  .update({ quantity: existing.quantity + 1 })
                  .eq('id', existing.id);
              } else {
                await supabase
                  .from('cart_items')
                  .insert({
                    cart_id: cartId,
                    product_id: product.id,
                    quantity: 1,
                    variant_id: variantId,
                  });
              }
              
              // Re-fetch items to get full product details
              // Get the user from supabase auth
              const { data: { user } } = await supabase.auth.getUser();
              if (user) await get().initializeCart(user.id);
            } catch (e) {
              console.error('[WebCartStore] DB add failed, using local:', e);
              // Fallback to local
              addToCartLocal(set, get, product);
            }
          })();
        } else {
          // Local-only fallback
          addToCartLocal(set, get, product);
        }
      },

      removeFromCart: (productId: string) => {
        const cartId = get().cartId;
        
        if (cartId && isSupabaseConfigured()) {
          (async () => {
            try {
              const item = get().items.find(i => i.id === productId);
              if (item?.cartItemId) {
                await supabase.from('cart_items').delete().eq('id', item.cartItemId);
              } else {
                // Fallback: find by product_id
                const { data } = await supabase
                  .from('cart_items')
                  .select('id')
                  .eq('cart_id', cartId)
                  .eq('product_id', productId);
                if (data?.[0]) {
                  await supabase.from('cart_items').delete().eq('id', data[0].id);
                }
              }
              set((state) => ({ items: state.items.filter(i => i.id !== productId) }));
            } catch (e) {
              console.error('[WebCartStore] DB remove failed:', e);
              set((state) => ({ items: state.items.filter(i => i.id !== productId) }));
            }
          })();
        } else {
          set((state) => ({ items: state.items.filter(i => i.id !== productId) }));
        }
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeFromCart(productId);
          return;
        }

        const cartId = get().cartId;
        
        if (cartId && isSupabaseConfigured()) {
          (async () => {
            try {
              const item = get().items.find(i => i.id === productId);
              if (item?.cartItemId) {
                await supabase
                  .from('cart_items')
                  .update({ quantity })
                  .eq('id', item.cartItemId);
              }
              set((state) => ({
                items: state.items.map(i => i.id === productId ? { ...i, quantity } : i)
              }));
            } catch (e) {
              console.error('[WebCartStore] DB update qty failed:', e);
              set((state) => ({
                items: state.items.map(i => i.id === productId ? { ...i, quantity } : i)
              }));
            }
          })();
        } else {
          set((state) => ({
            items: state.items.map(i => i.id === productId ? { ...i, quantity } : i)
          }));
        }
      },

      clearCart: () => {
        const cartId = get().cartId;
        if (cartId && isSupabaseConfigured()) {
          supabase.from('cart_items').delete().eq('cart_id', cartId).then(() => {
            set({ items: [] });
          }).catch(() => set({ items: [] }));
        } else {
          set({ items: [] });
        }
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },

      createOrder: (orderData) => {
        console.log('📋 createOrder called with:', { orderData });
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const currentItems = get().items;
        const total = get().getTotalPrice();

        console.log('📋 Order items:', { count: currentItems.length, items: currentItems });

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
            console.log('🛍️ Processing seller orders:', { sellerCount: Object.keys(itemsBySeller).length, sellers: Object.keys(itemsBySeller) });
            Object.entries(itemsBySeller).forEach(([sellerName, items]) => {
              try {
                console.log(`🏪 Creating seller order for: ${sellerName} with ${items.length} items`);
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
                console.log(`✅ Created seller order ${sellerOrderId} for ${sellerName}`);

                // Send seller notification about new order (both local and database)
                get().addSellerNotification(
                  orderId,
                  'seller_new_order',
                  `New order #${orderId.slice(-8)} from ${orderData.shippingAddress.fullName}. Total: ₱${sellerTotal.toLocaleString()}`
                );

                // Save notification to database if we have seller_id
                const firstItem = items[0];
                console.log('🔍 First item for seller notification:', firstItem);
                console.log('🔍 First item keys:', firstItem ? Object.keys(firstItem) : 'null');
                console.log('🔍 First item sellerId:', firstItem?.sellerId);
                if (firstItem?.sellerId) {
                  console.log('✅ Saving seller notification to database for seller:', firstItem.sellerId);
                  notificationService.notifySellerNewOrder({
                    sellerId: firstItem.sellerId,
                    orderId,
                    orderNumber: orderId.slice(-8),
                    buyerName: orderData.shippingAddress.fullName || 'Unknown Buyer',
                    total: sellerTotal
                  }).catch(error => {
                    console.error('Failed to save seller notification to database:', error);
                  });
                } else {
                  console.warn('⚠️ No sellerId found in items, skipping DB notification');
                }
              } catch (sellerOrderError) {
                console.error(`❌ Failed to create seller order for ${sellerName}:`, sellerOrderError);
                // Log but don't fail - buyer order is already created
              }
            });
          }).catch(importError => {
            console.error('❌ Failed to import seller store:', importError);
          });
        } catch (error) {
          console.error('❌ Error in seller order creation process:', error);
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

        // Auto-generate seller notifications based on status change
        const order = get().orders.find(o => o.id === orderId);
        if (order) {
          const sellerName = order.items[0]?.seller || 'Seller';

          // Map status changes to seller notification types
          let notificationType: OrderNotification['type'] | null = null;
          let notificationMessage = '';

          switch (status) {
            case 'confirmed':
              notificationType = 'seller_confirmed';
              notificationMessage = `Order #${orderId.slice(-8)} has been confirmed. Please prepare for shipment.`;
              break;
            case 'shipped':
              notificationType = 'shipped';
              notificationMessage = `Order #${orderId.slice(-8)} has been marked as shipped.`;
              break;
            case 'delivered':
              notificationType = 'delivered';
              notificationMessage = `Order #${orderId.slice(-8)} has been delivered to the customer.`;
              break;
            case 'cancelled':
              notificationType = 'cancelled';
              notificationMessage = `Order #${orderId.slice(-8)} has been cancelled.`;
              break;
            case 'returned':
              notificationType = 'seller_return_approved';
              notificationMessage = `Order #${orderId.slice(-8)} has been returned by the customer.`;
              break;
            default:
              break;
          }

          if (notificationType) {
            get().addNotification(orderId, notificationType, notificationMessage);
          }
        }
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

      addSellerNotification: (orderId, type, message) => {
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

      updateOrderWithReturnRequest: (orderId: string, returnRequest: Order['returnRequest']) => {
        set((state) => ({
          ...state,
          orders: state.orders.map(order =>
            order.id === orderId
              ? { ...order, status: 'returned' as const, returnRequest }
              : order
          ),
        }));
      },

      updateOrderWithReview: (orderId: string, review: Order['review']) => {
        set((state) => ({
          ...state,
          orders: state.orders.map(order =>
            order.id === orderId
              ? { ...order, status: 'reviewed' as const, review }
              : order
          ),
        }));
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