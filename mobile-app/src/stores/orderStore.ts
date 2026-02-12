import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, CartItem, ShippingAddress } from '../types';
import { orderService } from '../services/orderService';
import { authService } from '../services/authService';

// Seller Order Types
export interface SellerOrder {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress: {
    fullName?: string;
    street?: string;
    barangay?: string;
    city?: string;
    province?: string;
    region?: string;
    postalCode?: string;
    phone?: string;
  };
  items: {
    productId: string;
    productName: string;
    image: string;
    quantity: number;
    price: number;
    selectedColor?: string;
    selectedSize?: string;
  }[];
  total: number;
  status: 'pending' | 'to-ship' | 'shipped' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  trackingNumber?: string;
  createdAt: string;
  type?: 'OFFLINE' | 'ONLINE';
  posNote?: string;
}

const parseShippingAddressFromNotes = (notes?: string | null) => {
  if (!notes || !notes.includes('SHIPPING_ADDRESS:')) return null;

  try {
    const jsonPart = notes.split('SHIPPING_ADDRESS:')[1]?.split('|')[0];
    if (!jsonPart) return null;
    return JSON.parse(jsonPart) as {
      fullName?: string;
      street?: string;
      barangay?: string;
      city?: string;
      province?: string;
      postalCode?: string;
      phone?: string;
    };
  } catch {
    return null;
  }
};

interface OrderStore {
  // Buyer Orders
  orders: Order[];
  ordersLoading: boolean;
  createOrder: (
    items: CartItem[],
    shippingAddress: ShippingAddress,
    paymentMethod: string,
    options?: { isGift?: boolean; isAnonymous?: boolean; recipientId?: string }
  ) => Promise<Order>; // Changed to Promise
  fetchOrders: (userId: string) => Promise<void>; // Added fetchOrders
  getOrderById: (orderId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>; // Changed to Promise
  getActiveOrders: () => Order[];
  getCompletedOrders: () => Order[];

  // Seller Orders
  sellerOrders: SellerOrder[];
  sellerOrdersLoading: boolean;
  fetchSellerOrders: (sellerId?: string) => Promise<void>;
  updateSellerOrderStatus: (orderId: string, status: SellerOrder['status']) => Promise<void>;
  addOfflineOrder: (
    cartItems: { productId: string; productName: string; quantity: number; price: number; image: string; selectedColor?: string; selectedSize?: string }[],
    total: number,
    note?: string
  ) => Promise<string>;
  markOrderAsShipped: (orderId: string, trackingNumber: string) => Promise<void>;
}

// Dummy orders for testing - showcasing all status types with mixed payment statuses
const dummyOrders: Order[] = [
  {
    id: '1',
    transactionId: 'A238567K',
    items: [
      {
        id: '1',
        name: 'Premium Wireless Earbuds - Noise Cancelling',
        price: 2499,
        originalPrice: 3999,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400',
        rating: 4.8,
        sold: 15234,
        seller: 'TechStore Official',
        sellerRating: 4.9,
        sellerVerified: true,
        isFreeShipping: true,
        isVerified: true,
        location: 'Manila',
        category: 'Electronics',
        quantity: 1,
      },
    ],
    total: 2499,
    shippingFee: 0,
    status: 'pending',
    isPaid: false, // COD - Not yet paid
    scheduledDate: '12/22/2025',
    shippingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      address: '123 Main St, Brgy. San Antonio',
      city: 'Manila',
      region: 'Metro Manila',
      postalCode: '1000',
    },
    paymentMethod: 'Cash on Delivery',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    transactionId: 'B892341M',
    items: [
      {
        id: '2',
        name: 'Sustainable Water Bottle - BPA Free',
        price: 899,
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
        rating: 4.6,
        sold: 8921,
        seller: 'EcoLife Store',
        sellerRating: 4.7,
        sellerVerified: true,
        isFreeShipping: true,
        isVerified: true,
        location: 'Quezon City',
        category: 'Home & Living',
        quantity: 2,
      },
    ],
    total: 1848,
    shippingFee: 50,
    status: 'processing',
    isPaid: true, // GCash - Already paid
    scheduledDate: '12/21/2025',
    shippingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      address: '123 Main St, Brgy. San Antonio',
      city: 'Manila',
      region: 'Metro Manila',
      postalCode: '1000',
    },
    paymentMethod: 'GCash',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    transactionId: 'C456789X',
    items: [
      {
        id: '3',
        name: 'Minimalist Leather Wallet - Genuine Leather',
        price: 1299,
        image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400',
        rating: 4.7,
        sold: 5432,
        seller: 'LeatherCraft PH',
        sellerRating: 4.8,
        sellerVerified: true,
        isFreeShipping: true,
        isVerified: true,
        location: 'Makati',
        category: 'Fashion',
        quantity: 1,
      },
    ],
    total: 1299,
    shippingFee: 0,
    status: 'shipped',
    isPaid: true, // Credit Card - Already paid
    scheduledDate: '12/20/2025',
    shippingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      address: '123 Main St, Brgy. San Antonio',
      city: 'Manila',
      region: 'Metro Manila',
      postalCode: '1000',
    },
    paymentMethod: 'Credit Card',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    transactionId: 'D789123Y',
    items: [
      {
        id: '4',
        name: 'Smart Watch - Fitness Tracker',
        price: 3599,
        originalPrice: 4999,
        image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=400',
        rating: 4.5,
        sold: 12456,
        seller: 'Gadget Hub',
        sellerRating: 4.6,
        sellerVerified: true,
        isFreeShipping: true,
        isVerified: true,
        location: 'Pasig',
        category: 'Electronics',
        quantity: 1,
      },
    ],
    total: 3599,
    shippingFee: 0,
    status: 'delivered',
    isPaid: true, // Credit Card - Already paid
    scheduledDate: '12/15/2025',
    deliveryDate: '12/15/2025',
    shippingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      address: '123 Main St, Brgy. San Antonio',
      city: 'Manila',
      region: 'Metro Manila',
      postalCode: '1000',
    },
    paymentMethod: 'Credit Card',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    transactionId: 'E321654Z',
    items: [
      {
        id: '5',
        name: 'Organic Cotton T-Shirt - Unisex',
        price: 599,
        image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        rating: 4.4,
        sold: 3210,
        seller: 'Fashion Forward',
        sellerRating: 4.5,
        sellerVerified: false,
        isFreeShipping: false,
        isVerified: true,
        location: 'Cebu',
        category: 'Fashion',
        quantity: 3,
      },
    ],
    total: 1847,
    shippingFee: 50,
    status: 'cancelled',
    isPaid: false, // COD - Canceled before payment
    scheduledDate: '12/18/2025',
    shippingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      address: '123 Main St, Brgy. San Antonio',
      city: 'Manila',
      region: 'Metro Manila',
      postalCode: '1000',
    },
    paymentMethod: 'Cash on Delivery',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    transactionId: 'F654987W',
    items: [
      {
        id: '6',
        name: 'Portable Bluetooth Speaker - Waterproof',
        price: 1899,
        originalPrice: 2499,
        image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
        rating: 4.7,
        sold: 6543,
        seller: 'Audio Pro PH',
        sellerRating: 4.8,
        sellerVerified: true,
        isFreeShipping: true,
        isVerified: true,
        location: 'Taguig',
        category: 'Electronics',
        quantity: 1,
      },
    ],
    total: 1899,
    shippingFee: 0,
    status: 'shipped',
    isPaid: false, // COD - To be paid upon delivery
    scheduledDate: '12/21/2025',
    shippingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      address: '123 Main St, Brgy. San Antonio',
      city: 'Manila',
      region: 'Metro Manila',
      postalCode: '1000',
    },
    paymentMethod: 'Cash on Delivery',
    createdAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '7',
    transactionId: 'G123456P',
    items: [
      {
        id: '7',
        name: 'Wireless Gaming Mouse - RGB',
        price: 1599,
        originalPrice: 2299,
        image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=400',
        rating: 4.6,
        sold: 4321,
        seller: 'Gaming Gear PH',
        sellerRating: 4.9,
        sellerVerified: true,
        isFreeShipping: true,
        isVerified: true,
        location: 'Pasig',
        category: 'Electronics',
        quantity: 1,
      },
    ],
    total: 1599,
    shippingFee: 0,
    status: 'processing',
    isPaid: true, // PayMongo - Already paid
    scheduledDate: '12/23/2025',
    shippingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      address: '123 Main St, Brgy. San Antonio',
      city: 'Manila',
      region: 'Metro Manila',
      postalCode: '1000',
    },
    paymentMethod: 'PayMongo',
    createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '8',
    transactionId: 'H789012Q',
    items: [
      {
        id: '8',
        name: 'Stainless Steel Water Tumbler 500ml',
        price: 699,
        image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
        rating: 4.5,
        sold: 9876,
        seller: 'DrinkWare Plus',
        sellerRating: 4.7,
        sellerVerified: true,
        isFreeShipping: true,
        isVerified: true,
        location: 'Caloocan',
        category: 'Home & Living',
        quantity: 2,
      },
    ],
    total: 1398,
    shippingFee: 0,
    status: 'delivered',
    isPaid: true, // GCash - Already paid
    scheduledDate: '12/12/2025',
    deliveryDate: '12/14/2025',
    shippingAddress: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+63 912 345 6789',
      address: '123 Main St, Brgy. San Antonio',
      city: 'Manila',
      region: 'Metro Manila',
      postalCode: '1000',
    },
    paymentMethod: 'GCash',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const useOrderStore = create<OrderStore>()(
  persist(
    (set, get) => ({
      orders: dummyOrders,
      ordersLoading: false,

      fetchOrders: async (userId: string) => {
        set({ ordersLoading: true });
        try {
          const orders = await orderService.getOrders(userId);
          set({ orders: orders });
        } catch (error) {
          console.error('Error fetching orders:', error);
        } finally {
          set({ ordersLoading: false });
        }
      },

      createOrder: async (items, shippingAddress, paymentMethod, options) => {
        // Ensure items array is not empty
        if (!items || items.length === 0) {
          throw new Error('Cannot create order with empty cart');
        }

        const total = items.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);
        const shippingFee = total >= 1000 ? 0 : 50;
        const transactionId = `TXN${Date.now().toString().slice(-8)}`;
        const scheduledDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          .toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

        // Ensure all items have required properties
        const validatedItems = items.map(item => ({
          ...item,
          image: item.image || 'https://via.placeholder.com/400',
        }));

        const isPaidOrder = paymentMethod.toLowerCase() !== 'cash on delivery' && paymentMethod.toLowerCase() !== 'cod';

        const newOrder: Order = {
          id: Date.now().toString(),
          transactionId,
          items: validatedItems,
          total: total + shippingFee,
          shippingFee,
          status: isPaidOrder ? 'processing' : 'pending', // Paid orders start as 'processing', COD as 'pending'
          isPaid: isPaidOrder,
          scheduledDate,
          shippingAddress,
          paymentMethod,
          createdAt: new Date().toISOString(),
          isGift: options?.isGift,
          isAnonymous: options?.isAnonymous,
          recipientId: options?.recipientId,
        };

        // Add to buyer's order list
        set({ orders: [...get().orders, newOrder] });


        // SYNC TO SELLER: Also add to seller's order store (local state)
        const sellerOrder: SellerOrder = {
          id: newOrder.id,
          orderId: newOrder.transactionId,
          customerName: shippingAddress.name,
          customerEmail: shippingAddress.email,
          items: validatedItems.map(item => ({
            productId: item.id,
            productName: item.name || 'Unknown Product',
            image: item.image,
            quantity: item.quantity,
            price: item.price ?? 0,
          })),
          total: newOrder.total,
          status: isPaidOrder ? 'to-ship' : 'pending',
          paymentStatus: isPaidOrder ? 'paid' : 'pending',
          createdAt: newOrder.createdAt,
          type: 'ONLINE',
          shippingAddress: {
            fullName: shippingAddress.name,
            street: shippingAddress.address,
            city: shippingAddress.city,
            region: shippingAddress.region,
            postalCode: shippingAddress.postalCode,
            phone: shippingAddress.phone,
          },
        };

        // Add to seller's orders in local state
        set((state) => ({
          sellerOrders: [sellerOrder, ...state.sellerOrders]
        }));

        return newOrder;
      },

      getOrderById: (orderId) => {
        return get().orders.find((order) => order.id === orderId);
      },

      updateOrderStatus: async (orderId, status) => {
        set({
          orders: get().orders.map((order) =>
            order.id === orderId
              ? {
                ...order,
                status,
                deliveryDate:
                  status === 'delivered'
                    ? new Date().toLocaleDateString('en-US', {
                      month: '2-digit',
                      day: '2-digit',
                      year: 'numeric',
                    })
                    : order.deliveryDate,
              }
              : order
          ),
        });
      },

      getActiveOrders: () => {
        return get().orders.filter(
          (order) => order.status !== 'delivered'
        );
      },

      getCompletedOrders: () => {
        return get().orders.filter(
          (order) => order.status === 'delivered'
        );
      },

      // ============================================
      // SELLER ORDERS
      // ============================================
      sellerOrders: [],
      sellerOrdersLoading: false,

      fetchSellerOrders: async (sellerId?: string) => {
        let actualSellerId = sellerId;
        const isValidUUID =
          sellerId &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerId);

        if (!isValidUUID) {
          const session = await authService.getSession();
          if (session?.user?.id) {
            actualSellerId = session.user.id;
          } else {
            console.warn('[OrderStore] No authenticated session for fetchSellerOrders');
            set({ sellerOrdersLoading: false });
            return;
          }
        }

        if (!actualSellerId) {
          console.warn('[OrderStore] No seller ID available for fetchSellerOrders');
          return;
        }

        set({ sellerOrdersLoading: true });
        try {
          const rawOrders = await orderService.getSellerOrders(actualSellerId);

          // Map raw database orders to SellerOrder interface
          // DEFENSIVE: DB fields (product_name, buyer_name) may be objects like {name: "..."}
          // from JSONB columns or foreign key joins. Always extract string safely.
          const safeString = (val: any, fallback = ''): string => {
            if (val === null || val === undefined) return fallback;
            if (typeof val === 'string') return val;
            if (typeof val === 'object' && val.name) return String(val.name);
            if (typeof val === 'object' && val.full_name) return String(val.full_name);
            if (typeof val === 'object' && val.store_name) return String(val.store_name);
            return String(val);
          };

          const mappedOrders: SellerOrder[] = (rawOrders || []).map((order: any) => {
            // Map order items from database format to SellerOrder.items format
            const orderItems = Array.isArray(order.order_items) ? order.order_items : [];
            const items = orderItems.map((item: any) => ({
              productId: String(item.product_id || item.productId || ''),
              productName: safeString(item.product_name, safeString(item.productName, 'Unknown Product')),
              image: (Array.isArray(item.product_images) ? item.product_images[0] : null) || item.primary_image_url || item.image || 'https://via.placeholder.com/100',
              quantity: item.quantity || 1,
              price: parseFloat(item.price?.toString() || '0'),
              selectedColor: item.personalized_options?.color || item.selected_color || item.selectedColor,
              selectedSize: item.personalized_options?.size || item.selected_size || item.selectedSize,
            }));

            // Calculate total from items (more reliable than DB total_amount which may be 0)
            const calculatedTotal = items.reduce((sum: number, item: { price: number; quantity: number }) =>
              sum + (item.price * item.quantity), 0);
            const dbTotal = parseFloat(order.total_amount?.toString() || '0');
            const total = calculatedTotal > 0 ? calculatedTotal : dbTotal;

            // Get customer info based on order type
            // ONLINE orders: buyer_profile from profiles table  
            // OFFLINE orders: recipient info or Walk-in Customer
            const notesData = parseShippingAddressFromNotes(order.notes);

            let customerName = 'Walk-in Customer';
            let customerEmail = '';
            let customerPhone = '';

            if (order.order_type === 'ONLINE') {
              const buyerProfile = order.buyer_profile;
              if (buyerProfile?.first_name || buyerProfile?.last_name) {
                customerName = `${buyerProfile.first_name || ''} ${buyerProfile.last_name || ''}`.trim();
              } else if (buyerProfile?.email) {
                customerName = buyerProfile.email.split('@')[0];
              }
              customerEmail = buyerProfile?.email || '';
              customerPhone = buyerProfile?.phone || '';
            } else {
              // OFFLINE (POS) orders - check recipient
              const recipient = order.recipient;
              if (recipient?.first_name || recipient?.last_name) {
                customerName = `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim();
              } else if (notesData?.fullName) {
                customerName = notesData.fullName;
              }

              customerEmail = recipient?.email || '';
              customerPhone = recipient?.phone || notesData?.phone || '';
            }

            // Map status from database format
            const statusMap: Record<string, SellerOrder['status']> = {
              'pending_payment': 'pending',
              'pending': 'pending',
              'waiting_for_seller': 'pending',
              'confirmed': 'to-ship',
              'processing': 'to-ship',
              'ready_to_ship': 'to-ship',
              'shipped': 'shipped',
              'out_for_delivery': 'shipped',
              'delivered': 'completed',
              'received': 'completed',
              'completed': 'completed',
              'cancelled': 'cancelled',
              'returned': 'cancelled',
            };

            // Map payment status
            const paymentStatusMap: Record<string, SellerOrder['paymentStatus']> = {
              'pending': 'pending',
              'paid': 'paid',
              'refunded': 'refunded',
              'failed': 'pending',
            };

            // Enhanced Shipping Address Mapping
            const shippingAddressObj = {
              fullName: customerName,
              street: order.address?.address_line_1 || notesData?.street || '',
              barangay: order.address?.barangay || notesData?.barangay || '',
              city: order.address?.city || notesData?.city || '',
              province: order.address?.province || notesData?.province || '',
              postalCode: order.address?.postal_code || notesData?.postalCode || '',
              phone: customerPhone,
            };

            // If it's a simple string address in DB, try to put it in one field or use it as is
            if (!order.address && typeof order.shipping_address === 'string' && order.shipping_address) {
              shippingAddressObj.street = order.shipping_address;
            } else if (!order.address && typeof order.shipping_address === 'object' && order.shipping_address) {
              // Merge object if it exists
              Object.assign(shippingAddressObj, order.shipping_address);
            }

            return {
              id: order.id,
              orderId: String(order.order_number || order.id || ''),
              customerName,
              customerEmail,
              customerPhone,
              shippingAddress: shippingAddressObj,
              items,
              total,
              status: statusMap[order.shipment_status || order.status || 'pending'] || 'pending',
              paymentStatus: paymentStatusMap[order.payment_status || 'pending'] || 'pending',
              trackingNumber: order.tracking_number,
              createdAt: order.created_at || new Date().toISOString(),
              type: order.order_type === 'OFFLINE' ? 'OFFLINE' : 'ONLINE',
              posNote: (order.notes || order.pos_note || '').replace(/SHIPPING_ADDRESS:.*$/, '').trim(),
            };
          });

          set({ sellerOrders: mappedOrders, sellerOrdersLoading: false });
        } catch (error) {
          console.error('[OrderStore] Error fetching seller orders:', error);
          set({ sellerOrdersLoading: false });
        }
      },

      updateSellerOrderStatus: async (orderId, status) => {
        // Map UI status to database status
        const dbStatusMap: Record<string, string> = {
          pending: 'pending',
          'to-ship': 'processing',
          shipped: 'shipped',
          completed: 'delivered',
        };
        const dbStatus = dbStatusMap[status] || status;

        // Optimistically update local state
        set((state) => ({
          sellerOrders: state.sellerOrders.map((o) =>
            o.orderId === orderId || o.id === orderId ? { ...o, status } : o
          ),
        }));

        // Find the actual order ID (database UUID)
        const order = get().sellerOrders.find(o => o.orderId === orderId || o.id === orderId);
        const actualOrderId = order?.id || orderId;

        // Update in database
        try {
          await orderService.updateOrderStatus(actualOrderId, dbStatus);
          console.log(`[OrderStore] Order status updated in DB: ${orderId} -> ${dbStatus}`);
        } catch (error) {
          console.error('[OrderStore] Failed to update order status in DB:', error);
          // Revert on failure by refetching
          await get().fetchSellerOrders();
        }

        // SYNC TO BUYER: Also update the buyer's order store
        const buyerOrder = get().orders.find((o) => o.transactionId === orderId);
        if (buyerOrder) {
          const buyerStatus =
            status === 'pending' ? 'pending' :
              status === 'to-ship' ? 'processing' :
                status === 'completed' ? 'delivered' :
                  'cancelled';

          set((state) => ({
            orders: state.orders.map((o) =>
              o.id === buyerOrder.id
                ? {
                  ...o,
                  status: buyerStatus as Order['status'],
                  deliveryDate:
                    buyerStatus === 'delivered'
                      ? new Date().toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })
                      : o.deliveryDate,
                }
                : o
            ),
          }));
          console.log(`[OrderStore] Order status synced to buyer: ${orderId} -> ${buyerStatus}`);
        }
      },

      addOfflineOrder: async (cartItems, total, note) => {
        // Get seller ID from session
        const session = await authService.getSession();
        const sellerId = session?.user?.id;

        if (!sellerId) {
          throw new Error('Not authenticated. Please log in to create orders.');
        }

        // Validate cart items
        if (!cartItems || cartItems.length === 0) {
          throw new Error('Cart is empty');
        }

        if (total <= 0) {
          throw new Error('Invalid order total');
        }

        try {
          // Create POS order via orderService (saves to Supabase)
          const result = await orderService.createPOSOrder(
            sellerId,
            'Store', // sellerName placeholder
            cartItems,
            total,
            note
          );

          if (!result) {
            throw new Error('Failed to create POS order');
          }

          // Add to local state
          const newOrder: SellerOrder = {
            id: result.orderId,
            orderId: result.orderNumber,
            customerName: 'Walk-in Customer',
            customerEmail: 'pos@offline.sale',
            items: cartItems,
            total,
            status: 'completed',
            paymentStatus: 'paid', // Offline orders are paid immediately
            createdAt: new Date().toISOString(),
            type: 'OFFLINE',
            posNote: note || 'In-Store Purchase',
            shippingAddress: {
              fullName: 'Walk-in Customer',
              street: 'In-Store',
              city: '',
              province: '',
              postalCode: '',
            },
          };

          set((state) => ({
            sellerOrders: [newOrder, ...state.sellerOrders],
          }));

          console.log(`[OrderStore] Offline order created: ${result.orderNumber}`);
          return result.orderId;
        } catch (error) {
          console.error('[OrderStore] Failed to create offline order:', error);
          throw error;
        }
      },
      markOrderAsShipped: async (orderId, trackingNumber) => {
        // Optimistically update local state
        set((state) => ({
          sellerOrders: state.sellerOrders.map((o) =>
            o.orderId === orderId || o.id === orderId ? { ...o, status: 'shipped', trackingNumber } : o
          ),
        }));

        // Get seller ID from session/cache
        const session = await authService.getSession();
        const sellerId = session?.user?.id;

        if (!sellerId) {
          throw new Error('Not authenticated');
        }

        // Find the actual order ID (database UUID)
        const order = get().sellerOrders.find(o => o.orderId === orderId || o.id === orderId);
        const actualOrderId = order?.id || orderId;

        try {
          await orderService.markOrderAsShipped(actualOrderId, trackingNumber, sellerId);
          console.log(`[OrderStore] Order marked as shipped: ${orderId} with tracking ${trackingNumber}`);
        } catch (error) {
          console.error('[OrderStore] Failed to mark as shipped:', error);
          // Revert on failure
          await get().fetchSellerOrders();
          throw error;
        }

        // Sync to buyer side if possible
        const buyerOrder = get().orders.find((o) => o.transactionId === orderId);
        if (buyerOrder) {
          set((state) => ({
            orders: state.orders.map((o) =>
              o.id === buyerOrder.id
                ? { ...o, status: 'shipped', trackingNumber }
                : o
            ),
          }));
        }
      },
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
