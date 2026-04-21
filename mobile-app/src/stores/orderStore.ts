import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, CartItem, ShippingAddress } from '../types';
import { orderService } from '../services/orderService';
import { orderReadService } from '../services/orders/orderReadService';
import { orderMutationService } from '../services/orders/orderMutationService';
import { authService } from '../services/authService';
import type { POSOrderCreateResult, SellerOrderSnapshot } from '../types/orders';
import { mapSellerUiToNormalizedStatus } from '../utils/orders/status';

export type SellerOrder = SellerOrderSnapshot;

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
  fetchSellerOrders: (sellerId?: string, startDate?: Date | null, endDate?: Date | null) => Promise<void>;
  updateSellerOrderStatus: (orderId: string, status: SellerOrder['status']) => Promise<void>;
  addOfflineOrder: (
    cartItems: { productId: string; productName: string; quantity: number; price: number; image: string; selectedColor?: string; selectedSize?: string }[],
    total: number,
    note?: string,
    paymentMethod?: 'cash' | 'card' | 'ewallet' | 'bank_transfer',
  ) => Promise<POSOrderCreateResult>;
  markOrderAsShipped: (orderId: string, trackingNumber: string) => Promise<void>;
  markOrderAsDelivered: (orderId: string) => Promise<void>;

  // Checkout Context — prefetched seller metadata from Edge Function
  checkoutSellerMetadata: Record<string, any>;
  isCheckoutContextLoading: boolean;
  loadCheckoutContext: (productIds: string[]) => Promise<void>;
  reset: () => void;
}

// Dummy orders for testing - showcasing all status types with mixed payment statuses
const dummyOrders: Order[] = [
  {
    id: '1',
    transactionId: 'A238567K',
    items: [
      {
        id: '1',
        cartItemId: 'cart-1',
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
        cartItemId: 'cart-2',
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
        cartItemId: 'cart-3',
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
        cartItemId: 'cart-4',
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
        cartItemId: 'cart-5',
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
        cartItemId: 'cart-6',
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
        cartItemId: 'cart-7',
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
        cartItemId: 'cart-8',
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

        // Send receipt email to buyer (non-blocking)
        if (shippingAddress.email) {
          import('../services/transactionalEmails').then(({ sendOrderReceiptEmail }) => {
            sendOrderReceiptEmail({
              buyerEmail: shippingAddress.email!,
              buyerId: newOrder.id,
              orderNumber: newOrder.transactionId,
              orderDate: new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
              buyerName: shippingAddress.name,
              itemsHtml: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${validatedItems.map(i => {
                const imgUrl = (i as any).image || (i as any).primary_image || '';
                const imgCell = imgUrl
                    ? `<td style="padding:12px 0;width:56px;vertical-align:top"><img src="${imgUrl}" alt="" width="56" height="56" style="display:block;border-radius:8px;border:1px solid #E4E4E7;object-fit:cover" /></td>`
                    : `<td style="padding:12px 0;width:56px;vertical-align:top"><div style="width:56px;height:56px;border-radius:8px;background:#F4F4F5"></div></td>`;
                return `<tr style="border-bottom:1px solid #E4E4E7">${imgCell}<td style="padding:12px 0 12px 12px;vertical-align:top"><p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18181B">${i.name}</p><p style="margin:0;font-size:13px;color:#71717A">Qty: ${i.quantity}</p></td><td align="right" style="padding:12px 0;vertical-align:top;white-space:nowrap"><span style="font-size:14px;font-weight:600;color:#18181B">₱${((i.price ?? 0) * i.quantity).toFixed(2)}</span></td></tr>`;
              }).join('')}</table>`,
              subtotal: total.toFixed(2),
              shippingFee: shippingFee.toFixed(2),
              totalAmount: (total + shippingFee).toFixed(2),
            }).catch((err: unknown) => console.warn('[OrderStore] Receipt email error:', err));
          }).catch(() => {});
        }


        // SYNC TO SELLER: Also add to seller's order store (local state)
        const sellerOrder: SellerOrder = {
          id: newOrder.id,
          orderNumber: newOrder.transactionId,
          buyerName: shippingAddress.name,
          buyerEmail: shippingAddress.email,
          items: validatedItems.map(item => ({
            productId: item.id,
            productName: item.name || 'Unknown Product',
            image: item.image,
            quantity: item.quantity,
            price: item.price ?? 0,
          })),
          total: newOrder.total,
          status: isPaidOrder ? 'confirmed' : 'pending',
          paymentStatus: isPaidOrder ? 'paid' : 'pending',
          orderDate: newOrder.createdAt,
          type: 'ONLINE',
          shippingAddress: {
            fullName: shippingAddress.name,
            street: shippingAddress.address,
            city: shippingAddress.city,
            province: shippingAddress.region,
            region: shippingAddress.region,
            postalCode: shippingAddress.postalCode,
            phone: shippingAddress.phone,
          },
          orderId: newOrder.transactionId,
          customerName: shippingAddress.name,
          customerEmail: shippingAddress.email,
          createdAt: newOrder.createdAt,
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

      fetchSellerOrders: async (sellerId?: string, startDate?: Date | null, endDate?: Date | null) => {
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
          const snapshots = await orderReadService.getSellerOrders({
            sellerId: actualSellerId,
            startDate,
            endDate,
          });
          set({ sellerOrders: snapshots, sellerOrdersLoading: false });
        } catch (error) {
          console.error('[OrderStore] Error fetching seller orders:', error);
          set({ sellerOrdersLoading: false });
        }
      },

      updateSellerOrderStatus: async (orderId, status) => {
        const target = get().sellerOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.orderId === orderId);
        if (!target) {
          throw new Error('Order not found');
        }

        const previous = { ...target };
        const actualOrderId = target.id;

        set((state) => ({
          sellerOrders: state.sellerOrders.map((order) =>
            order.id === actualOrderId ? { ...order, status } : order,
          ),
        }));

        try {
          const session = await authService.getSession();
          const actorId = session?.user?.id;
          const nextStatus = mapSellerUiToNormalizedStatus(status);

          await orderMutationService.updateOrderStatus({
            orderId: actualOrderId,
            nextStatus,
            note: `Seller updated order to ${status}`,
            actorId,
            actorRole: 'seller',
          });

          // Fire transactional email to buyer (non-blocking)
          if (target.buyerEmail) {
            import('../services/transactionalEmails').then((emails) => {
              const base = {
                buyerEmail: target.buyerEmail!,
                buyerId: target.buyer_id || '',
                orderNumber: target.orderNumber || actualOrderId,
                buyerName: target.buyerName || 'Valued Customer',
              };
              const BASE_URL = 'https://bazaar.ph';
              const trackUrl = `${BASE_URL}/orders/${actualOrderId}`;
              (
                nextStatus === 'processing' ? emails.sendOrderConfirmedEmail({ ...base, estimatedDelivery: '3\u20137 business days' }) :
                nextStatus === 'ready_to_ship' ? emails.sendOrderReadyToShipEmail({ ...base, estimatedPickup: 'Within 24 hours', trackUrl }) :
                nextStatus === 'shipped' ? emails.sendOrderShippedEmail({ ...base, trackingNumber: target.trackingNumber || 'N/A', courierName: 'courier', trackingUrl: trackUrl }) :
                nextStatus === 'out_for_delivery' ? emails.sendOrderOutForDeliveryEmail({ ...base, courierName: 'courier', trackUrl }) :
                nextStatus === 'delivered' ? emails.sendOrderDeliveredEmail(base) :
                nextStatus === 'failed_to_deliver' ? emails.sendOrderFailedDeliveryEmail({ ...base, failureReason: 'Delivery attempt failed', rescheduleUrl: trackUrl }) :
                nextStatus === 'cancelled' ? emails.sendOrderCancelledEmail({ ...base, cancelReason: 'Order cancelled' }) :
                nextStatus === 'returned' ? emails.sendOrderReturnedEmail({ ...base, refundAmount: 'Pending', refundMethod: 'Original payment method', trackUrl }) :
                Promise.resolve()
              ).catch((emailErr: unknown) => {
                console.warn('[OrderStore] Email dispatch error:', emailErr);
              });
            }).catch(() => {});
          }

          const buyerStatus =
            status === 'pending'
              ? 'pending'
              : status === 'confirmed'
                ? 'processing'
                : status === 'shipped'
                  ? 'shipped'
                  : status === 'delivered'
                    ? 'delivered'
                    : 'cancelled';

          set((state) => ({
            orders: state.orders.map((order) =>
              order.transactionId === target.orderNumber || order.orderId === actualOrderId
                ? {
                  ...order,
                  status: buyerStatus as Order['status'],
                  deliveryDate:
                    buyerStatus === 'delivered'
                      ? new Date().toLocaleDateString('en-US', {
                        month: '2-digit',
                        day: '2-digit',
                        year: 'numeric',
                      })
                      : order.deliveryDate,
                }
                : order,
            ),
          }));
        } catch (error) {
          console.error('[OrderStore] Failed to update order status:', error);
          set((state) => ({
            sellerOrders: state.sellerOrders.map((order) =>
              order.id === actualOrderId ? previous : order,
            ),
          }));
          throw error;
        }
      },

      addOfflineOrder: async (cartItems, total, note, paymentMethod) => {
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
          const sellerProfile = await authService.getSellerProfile(sellerId);
          const result = await orderMutationService.createPOSOrder({
            sellerId,
            sellerName: sellerProfile?.store_name || 'Store',
            items: cartItems,
            total,
            note,
            paymentMethod,
          });

          if (!result) {
            throw new Error('Failed to create POS order');
          }

          await get().fetchSellerOrders(sellerId);

          console.log(`[OrderStore] Offline order created: ${result.orderNumber}`);
          return result;
        } catch (error) {
          console.error('[OrderStore] Failed to create offline order:', error);
          throw error;
        }
      },
      markOrderAsShipped: async (orderId, trackingNumber) => {
        const target = get().sellerOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.orderId === orderId);
        if (!target) {
          throw new Error('Order not found');
        }

        const previous = { ...target };
        const actualOrderId = target.id;
        const nextTracking = trackingNumber.trim().toUpperCase();

        if (!nextTracking) {
          throw new Error('Tracking number is required');
        }

        set((state) => ({
          sellerOrders: state.sellerOrders.map((order) =>
            order.id === actualOrderId
              ? {
                ...order,
                status: 'shipped',
                trackingNumber: nextTracking,
                shipmentStatusRaw: 'shipped',
                shippedAt: new Date().toISOString(),
              }
              : order,
          ),
        }));

        // Get seller ID from the seller profile store (sellers table ID)
        // Lazy require breaks the sellerStore <-> orderStore require cycle.
        // We must NOT use authService.getSession().user.id because
        // auth.users.id can differ from sellers.id (sellers table ID)
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useAuthStore } = require('./sellerStore');
        const sellerId = (useAuthStore.getState().seller?.id) as string | undefined;

        if (!sellerId) {
          throw new Error('Not authenticated as seller');
        }

        try {
          await orderMutationService.markOrderShipped({
            orderId: actualOrderId,
            trackingNumber: nextTracking,
            sellerId,
          });

          // Fire shipped email to buyer (non-blocking)
          if (target.buyerEmail) {
            import('../services/transactionalEmails').then(({ sendOrderShippedEmail }) => {
              sendOrderShippedEmail({
                buyerEmail: target.buyerEmail!,
                buyerId: target.buyer_id || '',
                orderNumber: target.orderNumber || actualOrderId,
                buyerName: target.buyerName || 'Valued Customer',
                trackingNumber: nextTracking,
                courierName: 'courier',
                trackingUrl: `https://bazaar.ph/orders/${actualOrderId}`,
              }).catch((emailErr: unknown) => {
                console.warn('[OrderStore] Shipped email error:', emailErr);
              });
            }).catch(() => {});
          }
        } catch (error) {
          console.error('[OrderStore] Failed to mark as shipped:', error);
          set((state) => ({
            sellerOrders: state.sellerOrders.map((order) =>
              order.id === actualOrderId ? previous : order,
            ),
          }));
          throw error;
        }

        set((state) => ({
          orders: state.orders.map((order) =>
            order.transactionId === target.orderNumber || order.orderId === actualOrderId
              ? { ...order, status: 'shipped', trackingNumber: nextTracking }
              : order,
          ),
        }));
      },

      // ============================================
      // CHECKOUT CONTEXT
      // ============================================
      checkoutSellerMetadata: {},
      isCheckoutContextLoading: false,
      loadCheckoutContext: async (productIds: string[]) => {
        // Guard against duplicate concurrent calls
        if (get().isCheckoutContextLoading || productIds.length === 0) return;

        set({ isCheckoutContextLoading: true });
        try {
          // Single Edge Function call — addresses + sellers fetched concurrently inside
          const { getCheckoutContext } = require('../services/checkoutService');
          
          // Add timeout to prevent hanging indefinitely
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Checkout context timeout')), 8000)
          );
          
          const ctx = await Promise.race([
            getCheckoutContext(productIds),
            timeoutPromise
          ]) as any;
          
          set({ checkoutSellerMetadata: ctx.sellers ?? {} });
        } catch (error: any) {
          console.error('[OrderStore] loadCheckoutContext failed:', error);
          if (error?.message === 'AUTH_EXPIRED') {
            throw error;
          }
          // Non-fatal: checkout can proceed without prefetched seller metadata
        } finally {
          set({ isCheckoutContextLoading: false });
        }
      },

      markOrderAsDelivered: async (orderId) => {
        const target = get().sellerOrders.find((o) => o.id === orderId || o.orderNumber === orderId || o.orderId === orderId);
        if (!target) {
          throw new Error('Order not found');
        }

        const previous = { ...target };
        const actualOrderId = target.id;

        set((state) => ({
          sellerOrders: state.sellerOrders.map((order) =>
            order.id === actualOrderId
              ? {
                ...order,
                status: 'delivered',
                shipmentStatusRaw: 'delivered',
                deliveredAt: new Date().toISOString(),
              }
              : order,
          ),
        }));

        // Get seller ID from the seller profile store (sellers table ID)
        // Lazy require breaks the sellerStore <-> orderStore require cycle.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { useAuthStore } = require('./sellerStore');
        const sellerId = (useAuthStore.getState().seller?.id) as string | undefined;

        if (!sellerId) {
          throw new Error('Not authenticated as seller');
        }

        try {
          await orderMutationService.markOrderDelivered({
            orderId: actualOrderId,
            sellerId,
          });

          // Fire delivered email to buyer (non-blocking)
          if (target.buyerEmail) {
            import('../services/transactionalEmails').then(({ sendOrderDeliveredEmail }) => {
              sendOrderDeliveredEmail({
                buyerEmail: target.buyerEmail!,
                buyerId: target.buyer_id || '',
                orderNumber: target.orderNumber || actualOrderId,
                buyerName: target.buyerName || 'Valued Customer',
              }).catch((emailErr: unknown) => {
                console.warn('[OrderStore] Delivered email error:', emailErr);
              });
            }).catch(() => {});
          }
        } catch (error) {
          console.error('[OrderStore] Failed to mark as delivered:', error);
          set((state) => ({
            sellerOrders: state.sellerOrders.map((order) =>
              order.id === actualOrderId ? previous : order,
            ),
          }));
          throw error;
        }

        set((state) => ({
          orders: state.orders.map((order) =>
            order.transactionId === target.orderNumber || order.orderId === actualOrderId
              ? {
                ...order,
                status: 'delivered',
                deliveryDate: new Date().toLocaleDateString('en-US', {
                  month: '2-digit',
                  day: '2-digit',
                  year: 'numeric',
                }),
              }
              : order,
          ),
        }));
      },
      reset: () => {
        set({
          orders: [],
          ordersLoading: false,
          sellerOrders: [],
          sellerOrdersLoading: false,
          checkoutSellerMetadata: {},
        });
      },
    }),
    {
      name: 'order-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        ...state,
        isCheckoutContextLoading: false,
      }),
      merge: (persistedState, currentState) => {
        const mergedState = {
          ...currentState,
          ...(persistedState as Partial<OrderStore>),
        };

        return {
          ...mergedState,
          isCheckoutContextLoading: false,
        };
      },
    }
  )
);
