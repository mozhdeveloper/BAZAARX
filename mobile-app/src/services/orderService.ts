/**
 * Order Service
 * Handles all order-related database operations
 * 
 * Updated for new normalized schema (February 2026):
 * - Uses payment_status + shipment_status instead of single status
 * - Uses recipient_id FK to order_recipients instead of inline buyer info
 * - Uses address_id FK to shipping_addresses instead of inline address
 * - No seller_id on orders - determined via order_items
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Order, OrderItem, PaymentStatus, ShipmentStatus, Database } from '@/types/database.types';
import { reviewService } from './reviewService';
import { orderNotificationService } from './orderNotificationService';
import { notificationService } from './notificationService';
import { generateUUID } from '@/utils/uuid';

export type OrderInsert = Database['public']['Tables']['orders']['Insert'];
export type OrderItemInsert = Database['public']['Tables']['order_items']['Insert'];

// Legacy status mapping to new payment_status + shipment_status
const LEGACY_STATUS_MAP: Record<string, { payment_status: PaymentStatus; shipment_status: ShipmentStatus }> = {
  'pending_payment': { payment_status: 'pending_payment', shipment_status: 'waiting_for_seller' },
  'waiting_for_seller': { payment_status: 'pending_payment', shipment_status: 'waiting_for_seller' },
  'payment_failed': { payment_status: 'pending_payment', shipment_status: 'waiting_for_seller' },
  'paid': { payment_status: 'paid', shipment_status: 'processing' },
  'processing': { payment_status: 'paid', shipment_status: 'processing' },
  'ready_to_ship': { payment_status: 'paid', shipment_status: 'ready_to_ship' },
  'shipped': { payment_status: 'paid', shipment_status: 'shipped' },
  'out_for_delivery': { payment_status: 'paid', shipment_status: 'out_for_delivery' },
  'delivered': { payment_status: 'paid', shipment_status: 'delivered' },
  'failed_delivery': { payment_status: 'paid', shipment_status: 'failed_to_deliver' },
  'cancelled': { payment_status: 'refunded', shipment_status: 'returned' },
  'refunded': { payment_status: 'refunded', shipment_status: 'returned' },
  'completed': { payment_status: 'paid', shipment_status: 'received' },
};

// Reverse mapping for legacy compatibility
const getStatusFromNew = (paymentStatus: PaymentStatus, shipmentStatus: ShipmentStatus): string => {
  if (shipmentStatus === 'delivered' || shipmentStatus === 'received') return 'delivered';
  if (shipmentStatus === 'shipped') return 'shipped';
  if (shipmentStatus === 'out_for_delivery') return 'out_for_delivery';
  if (shipmentStatus === 'ready_to_ship') return 'ready_to_ship';
  if (shipmentStatus === 'processing') return paymentStatus === 'paid' ? 'processing' : 'pending_payment';
  if (paymentStatus === 'refunded') return 'cancelled';
  return 'pending_payment';
};

// Helper to map DB Order to UI Order
const mapDbOrderToOrder = (dbOrder: any) => {
  if (!dbOrder) return null;

  // Map shipment_status to UI status
  const statusMap: Record<string, string> = {
    'pending': 'pending',
    'waiting_for_seller': 'pending',
    'processing': 'processing',
    'ready_to_ship': 'processing',
    'shipped': 'shipped',
    'out_for_delivery': 'shipped',
    'delivered': 'delivered',
    'received': 'delivered',
    'cancelled': 'cancelled',
    'returned': 'cancelled',
    'failed_to_deliver': 'shipped',
  };

  const recipient = dbOrder.recipient || {};
  const address = dbOrder.shipping_address || {};

  // Construct full address string
  const fullAddress = [
    address.address_line_1,
    address.address_line_2,
    address.barangay,
    address.city,
    address.province,
    address.postal_code
  ].filter(Boolean).join(', ');

  return {
    ...dbOrder,
    id: dbOrder.id,
    orderId: dbOrder.id, // Include real UUID for database operations
    transactionId: dbOrder.order_number, // UI expects transactionId
    status: statusMap[dbOrder.shipment_status] || 'pending',
    isPaid: dbOrder.payment_status === 'paid',
    total: dbOrder.total_amount || 0,
    shippingFee: 0, // Default or calculate if tracked
    createdAt: dbOrder.created_at,
    
    // Map Items with nested product/variant info
    items: (dbOrder.order_items || []).map((item: any) => ({
      id: item.id,
      productId: item.product_id, // Include product_id for reviews
      name: item.product_name || item.product?.name || 'Unknown Product',
      price: item.price,
      quantity: item.quantity,
      image: item.primary_image_url || item.variant?.thumbnail_url || 'https://placehold.co/100',
      variant: item.variant ? {
        name: item.variant.variant_name,
        size: item.variant.size,
        color: item.variant.color
      } : undefined,
      sellerId: item.product?.seller_id || item.product?.seller?.id,
      storeName: item.product?.seller?.store_name || 'Seller'
    })),

    // Map Address
    shippingAddress: {
      name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim() || 'Customer',
      phone: recipient.phone || '',
      address: fullAddress || 'No address provided',
      city: address.city || '',
      province: address.province || '',
      postalCode: address.postal_code || '',
    },
    
    // Legacy support fields if needed
    buyer_name: `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim(),
  };
};

export class OrderService {
  private mockOrders: Order[] = [];

  /**
   * Create a POS (Point of Sale) offline order
   * Updated for new normalized schema - uses payment_status/shipment_status
   * @param buyerEmail - Optional buyer email to link order for BazCoins points
   */
  async createPOSOrder(
    sellerId: string,
    sellerName: string,
    items: {
      productId: string;
      productName: string;
      quantity: number;
      price: number;
      image: string;
      selectedColor?: string;
      selectedSize?: string;
    }[],
    total: number,
    note?: string,
    buyerEmail?: string
  ): Promise<{ orderId: string; orderNumber: string; buyerLinked?: boolean } | null> {
    // Generate order number
    const orderNumber = `POS-${Date.now().toString().slice(-8)}`;
    const orderId = generateUUID();

    // Try to find buyer by email if provided (for BazCoins points)
    let buyerId: string | null = null;
    let buyerLinked = false;

    if (buyerEmail && isSupabaseConfigured()) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, user_type')
        .eq('email', buyerEmail.toLowerCase().trim())
        .single();
      
      if (profile?.user_type === 'buyer') {
        buyerId = profile.id;
        buyerLinked = true;
      }
    }

    // If no buyer found, we need a placeholder buyer_id due to NOT NULL constraint
    const finalBuyerId = buyerId;

    // Create order data for new schema
    const orderData = {
      id: orderId,
      order_number: orderNumber,
      buyer_id: finalBuyerId, // Will be buyer's ID if email matched, null otherwise
      order_type: 'OFFLINE' as const,
      pos_note: note || (buyerEmail ? `POS Sale - ${buyerEmail}` : 'POS Walk-in Sale'),
      recipient_id: null, // No recipient for walk-in
      address_id: null, // No shipping address for in-store
      payment_status: 'paid' as PaymentStatus,
      shipment_status: 'delivered' as ShipmentStatus, // POS items delivered immediately
      paid_at: new Date().toISOString(),
      notes: buyerEmail && !buyerLinked ? `Customer email (not registered): ${buyerEmail}` : (note || null),
    };

    // Create order items with new schema structure
    const orderItems = items.map((item) => ({
      id: generateUUID(),
      order_id: orderId,
      product_id: item.productId,
      product_name: item.productName,
      primary_image_url: item.image || null,
      price: item.price,
      price_discount: 0,
      shipping_price: 0,
      shipping_discount: 0,
      quantity: item.quantity,
      variant_id: null,
      personalized_options: item.selectedColor || item.selectedSize ? {
        color: item.selectedColor,
        size: item.selectedSize
      } : null,
      rating: null,
    }));

    if (!isSupabaseConfigured()) {
      // Mock mode
      const mockOrder = {
        ...orderData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Legacy compatibility
        status: 'delivered',
        seller_id: sellerId,
        subtotal: total,
        total_amount: total,
      } as unknown as Order;
      this.mockOrders.push(mockOrder);
      return { orderId, orderNumber, buyerLinked };
    }

    try {
      // If no buyer linked and DB has NOT NULL constraint, we need to handle it
      const insertData = finalBuyerId 
        ? orderData 
        : { ...orderData, buyer_id: undefined };

      // Insert order
      let { error: orderError } = await supabase
        .from('orders')
        .insert(insertData);

      // If buyer_id constraint fails, notify user
      if (orderError?.code === '23502' && orderError.message?.includes('buyer_id')) {
        console.warn('⚠️ buyer_id NOT NULL constraint - POS order requires registered customer email');
        throw new Error(
          'Walk-in sales require a valid customer email with a BazaarPH account. ' +
          'Please ask the customer for their registered email, or they can sign up at bazaarph.com'
        );
      }

      if (orderError) {
        console.error('Error creating POS order:', orderError);
        throw orderError;
      }

      // Insert order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        await supabase.from('orders').delete().eq('id', orderId);
        throw itemsError;
      }

      // Deduct stock for each item
      for (const item of items) {
        // Deduct from the first variant of the product (POS uses simple stock tracking)
        const { data: variants } = await supabase
          .from('product_variants')
          .select('id, stock')
          .eq('product_id', item.productId)
          .order('created_at', { ascending: true })
          .limit(1);

        if (variants && variants.length > 0) {
          const variant = variants[0];
          const newStock = Math.max(0, (variant.stock || 0) - item.quantity);
          
          const { error: stockError } = await supabase
            .from('product_variants')
            .update({ stock: newStock })
            .eq('id', variant.id);

          if (stockError) {
            console.warn('Stock deduction failed for:', item.productName, stockError);
          }
        }
      }

      // Award BazCoins if buyer is linked
      if (buyerLinked && finalBuyerId) {
        const coinsEarned = Math.floor(total / 100); // 1 coin per ₱100 spent
        if (coinsEarned > 0) {
          // Get current BazCoins and add new ones
          const { data: buyerData } = await supabase
            .from('buyers')
            .select('bazcoins')
            .eq('id', finalBuyerId)
            .single();
          
          const currentCoins = buyerData?.bazcoins || 0;
          const { error: coinError } = await supabase
            .from('buyers')
            .update({ bazcoins: currentCoins + coinsEarned })
            .eq('id', finalBuyerId);
          
          if (coinError) {
            console.warn('BazCoins award failed:', coinError);
          }
        }
      }

      return { orderId, orderNumber, buyerLinked };
    } catch (error) {
      console.error('Failed to create POS order:', error);
      throw error instanceof Error ? error : new Error('Failed to create POS order. Please try again.');
    }
  }

  /**
   * Create a new order with items
   */
  async createOrder(
    orderData: OrderInsert,
    items: OrderItemInsert[]
  ): Promise<Order | null> {
    if (!isSupabaseConfigured()) {
      const newOrder = {
        ...orderData,
        id: generateUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Order;
      this.mockOrders.push(newOrder);
      return newOrder;
    }

    try {
      // Call database function to create order with items atomically
      const { data, error } = await supabase.rpc('create_order_with_items', {
        p_buyer_id: orderData.buyer_id,
        p_seller_id: orderData.seller_id,
        p_order_data: orderData,
        p_items: items,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order. Please try again.');
    }
  }

  /**
   * Get orders for a buyer
   */
  async getBuyerOrders(buyerId: string): Promise<Order[]> {
    if (!isSupabaseConfigured()) {
      return this.mockOrders.filter(o => o.buyer_id === buyerId);
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching buyer orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get orders for a buyer with proper status mapping for UI
   * Maps shipment_status from database to the status format expected by the frontend
   */
  async getOrders(buyerId: string): Promise<any[]> {
    if (!isSupabaseConfigured()) {
      return this.mockOrders.filter(o => o.buyer_id === buyerId);
    }

    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            variant:product_variants(id, variant_name, size, color, price, thumbnail_url)
          )
        `)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Map shipment_status to frontend status format
      const statusMap: Record<string, 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'> = {
        'pending': 'pending',
        'waiting_for_seller': 'pending',
        'processing': 'processing',
        'ready_to_ship': 'processing',
        'shipped': 'shipped',
        'out_for_delivery': 'shipped',
        'delivered': 'delivered',
        'received': 'delivered',
        'cancelled': 'cancelled',
        'returned': 'cancelled',
        'failed_to_deliver': 'shipped',
      };

      return (data || []).map(order => ({
        id: order.id,
        orderId: order.id, // Include real UUID for database operations
        transactionId: order.order_number,
        items: (order.order_items || []).map((item: any) => ({
          id: item.id,
          productId: item.product_id, // Include product_id for reviews
          name: item.product_name,
          price: item.variant?.price || item.price,
          quantity: item.quantity,
          image: item.variant?.thumbnail_url || item.primary_image_url || 'https://placehold.co/100?text=Product',
        })),
        total: (order.order_items || []).reduce((sum: number, item: any) => {
          return sum + ((item.variant?.price || item.price || 0) * item.quantity);
        }, 0),
        shippingFee: 0,
        status: statusMap[order.shipment_status || 'pending'] || 'pending',
        isPaid: order.payment_status === 'paid',
        scheduledDate: order.estimated_delivery_date || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        shippingAddress: {
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          region: '',
          postalCode: '',
        },
        paymentMethod: order.payment_method || 'Cash on Delivery',
        createdAt: order.created_at,
      }));
    } catch (error) {
      console.error('Error fetching orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get orders for a seller
   * Note: The normalized schema has NO seller_id on the orders table.
   * Seller orders are determined via order_items → products → seller_id.
   * We first find all product IDs for this seller, then get order_items
   * referencing those products, then fetch the full orders.
   */
  async getSellerOrders(sellerId: string): Promise<Order[]> {
    if (!isSupabaseConfigured()) {
      return this.mockOrders.filter(o => o.seller_id === sellerId);
    }

    try {
      // Step 1: Get all product IDs belonging to this seller
      const { data: sellerProducts, error: prodError } = await supabase
        .from('products')
        .select('id')
        .eq('seller_id', sellerId);

      if (prodError) {
        console.error('Error fetching seller products for orders:', prodError);
        throw prodError;
      }

      if (!sellerProducts || sellerProducts.length === 0) {
        return [];
      }

      const productIds = sellerProducts.map((p: any) => p.id);

      // Step 2: Get distinct order IDs from order_items that reference seller's products
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id')
        .in('product_id', productIds);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        throw itemsError;
      }

      if (!orderItems || orderItems.length === 0) {
        return [];
      }

      const uniqueOrderIds = [...new Set(orderItems.map((item: any) => item.order_id))];

      // Step 3: Fetch the full orders with related data
      // Note: buyers.id references profiles.id (same UUID), so we fetch buyer first
      // then get the profile separately since nested FK joins can be unreliable
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*),
          buyer:buyers!buyer_id(
            id,
            avatar_url
          ),
          recipient:order_recipients!recipient_id(
            id,
            first_name,
            last_name,
            phone,
            email
          ),
          address:shipping_addresses!address_id(
            id,
            address_line_1,
            barangay,
            city,
            province,
            region,
            postal_code
          )
        `)
        .in('id', uniqueOrderIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Step 4: Fetch buyer profiles for all ONLINE orders
      // Since buyers.id = profiles.id, we use buyer_id to get profile info
      const buyerIds = ordersData
        ?.filter((o: any) => o.order_type === 'ONLINE' && o.buyer_id)
        .map((o: any) => o.buyer_id) || [];
      
      const uniqueBuyerIds = [...new Set(buyerIds)];
      
      let profilesMap: Record<string, any> = {};
      
      if (uniqueBuyerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, first_name, last_name, phone')
          .in('id', uniqueBuyerIds);
        
        if (!profilesError && profiles) {
          profilesMap = profiles.reduce((acc: Record<string, any>, p: any) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }
      
      // Attach profile data to orders
      const data = ordersData?.map((order: any) => ({
        ...order,
        buyer_profile: order.buyer_id ? profilesMap[order.buyer_id] || null : null
      })) || [];
      
      console.log(`[OrderService] Fetched ${data?.length || 0} seller orders`);
      
      return data || [];
    } catch (error) {
      console.error('Error fetching seller orders:', error);
      throw new Error('Failed to fetch orders');
    }
  }

  /**
   * Get a single order by ID or order number
   */
  async getOrderById(orderId: string): Promise<any | null> {
    if (!isSupabaseConfigured()) {
      return this.mockOrders.find(o => o.id === orderId) || null;
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);

      // Deep fetch to populate all necessary UI fields
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id, product_id, product_name, primary_image_url, quantity, price, 
            variant:product_variants (
              id, variant_name, size, color, thumbnail_url
            ),
            product:products (
              id, name, seller:sellers ( store_name )
            )
          ),
          recipient:order_recipients (*),
          shipping_address:shipping_addresses (*)
        `)
        .eq(isUuid ? 'id' : 'order_number', orderId)
        .single();

      if (error) {
        // If single() fails because row missing, it returns error code PGRST116
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Map the DB result to the UI Order interface
      return mapDbOrderToOrder(data);

    } catch (error) {
      console.error('Error fetching order:', error);
      throw new Error('Failed to fetch order details');
    }
  }

  /**
   * Update order details (buyer name, email, notes)
   */
  async updateOrderDetails(
    orderId: string,
    details: {
      buyer_name?: string;
      buyer_email?: string;
      notes?: string;
    }
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId);
      if (order) {
        if (details.buyer_name) order.buyer_name = details.buyer_name;
        if (details.buyer_email) order.buyer_email = details.buyer_email;
        if (details.notes !== undefined) (order as any).notes = details.notes;
        order.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (details.buyer_name !== undefined) updateData.buyer_name = details.buyer_name;
      if (details.buyer_email !== undefined) updateData.buyer_email = details.buyer_email;
      if (details.notes !== undefined) updateData.notes = details.notes;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error updating order details:', error);
      throw new Error('Failed to update order details');
    }
  }

  /**
   * Update order status
   * New schema: Uses payment_status + shipment_status instead of single status field
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    note?: string,
    userId?: string,
    userRole?: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId);
      if (order) {
        order.status = status as any;
        order.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      // Get order first to get buyer info
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Map legacy status to new payment_status + shipment_status
      const newStatuses = LEGACY_STATUS_MAP[status] || LEGACY_STATUS_MAP['pending_payment'];

      // Update order with new schema fields
      const { error: orderError } = await supabase
        .from('orders')
        .update({ 
          payment_status: newStatuses.payment_status,
          shipment_status: newStatuses.shipment_status,
          updated_at: new Date().toISOString() 
        })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // Create status history entry
      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status,
          note: note || null,
          changed_by: userId || null,
          changed_by_role: userRole as any || null,
          metadata: null,
        });

      if (historyError) throw historyError;

      // Get seller ID from order items for notification
      let sellerId: string | undefined;
      if (order.items && order.items.length > 0) {
        const { data: product } = await supabase
          .from('products')
          .select('seller_id')
          .eq('id', order.items[0].product_id)
          .single();
        sellerId = product?.seller_id;
      }

      // Send notification to buyer if seller made the update
      if (userRole === 'seller' && order.buyer_id && sellerId) {
        // Send chat message
        await orderNotificationService.sendStatusUpdateNotification(
          orderId,
          status,
          sellerId,
          order.buyer_id
        );

        // Send proper notification (shows in notification bell)
        const statusMessages: Record<string, string> = {
          confirmed: `Your order #${order.order_number || orderId.substring(0, 8)} has been confirmed by the seller.`,
          processing: `Your order #${order.order_number || orderId.substring(0, 8)} is now being prepared.`,
          shipped: `Your order #${order.order_number || orderId.substring(0, 8)} has been shipped!`,
          delivered: `Your order #${order.order_number || orderId.substring(0, 8)} has been delivered!`,
          cancelled: `Your order #${order.order_number || orderId.substring(0, 8)} has been cancelled.`,
        };

        const message = statusMessages[status] || `Your order status has been updated to ${status}.`;

        await notificationService.notifyBuyerOrderStatus({
          buyerId: order.buyer_id,
          orderId: orderId,
          orderNumber: order.order_number || orderId.substring(0, 8),
          status: status,
          message: message,
        }).catch(err => {
          console.error('Failed to send buyer notification:', err);
        });
      }

      return true;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw new Error('Failed to update order status');
    }
  }

  /**
   * Mark order as shipped with tracking number
   * Updated for new schema: uses shipment_status + order_shipments table
   */
  async markOrderAsShipped(
    orderId: string,
    trackingNumber: string,
    sellerId: string
  ): Promise<boolean> {
    if (!trackingNumber?.trim()) {
      throw new Error('Tracking number is required');
    }

    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId);
      if (order) {
        order.status = 'shipped';
        order.tracking_number = trackingNumber;
        order.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      // Get order with items to verify seller owns products in this order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product:products!order_items_product_id_fkey (
              seller_id
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Order not found');
      }

      // Verify seller owns at least one product in this order
      const hasSellerProduct = order.order_items?.some(
        (item: any) => item.product?.seller_id === sellerId
      );

      if (!hasSellerProduct) {
        throw new Error('Access denied: You do not own products in this order');
      }

      // Check current status allows shipping
      const allowedStatuses = ['pending', 'waiting_for_seller', 'processing', 'ready_to_ship'];
      if (!allowedStatuses.includes(order.shipment_status)) {
        throw new Error(`Cannot ship order with status: ${order.shipment_status}`);
      }

      // Update order shipment_status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          shipment_status: 'shipped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Update shipment record - non-blocking, errors won't stop the process
      const updateShipment = async () => {
        try {
          const { data: existingShipments } = await supabase
            .from('order_shipments')
            .select('id')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })
            .limit(1);

          const existingShipment = existingShipments?.[0];

          if (existingShipment) {
            await supabase
              .from('order_shipments')
              .update({
                status: 'shipped',
                tracking_number: trackingNumber,
                shipped_at: new Date().toISOString(),
              })
              .eq('id', existingShipment.id);
          } else {
            await supabase
              .from('order_shipments')
              .insert({
                order_id: orderId,
                status: 'shipped',
                tracking_number: trackingNumber,
                shipped_at: new Date().toISOString(),
              });
          }
        } catch (error) {
          console.warn('[OrderService] Non-critical: Failed to update order_shipments:', error);
          // Don't throw - order status is already updated
        }
      };

      // Execute shipment update in parallel
      updateShipment();

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'shipped',
          note: `Order shipped with tracking number: ${trackingNumber}`,
          changed_by: sellerId,
          changed_by_role: 'seller',
          metadata: { tracking_number: trackingNumber },
        });

      if (historyError) {
        console.warn('Failed to create status history:', historyError);
      }

      // Send notifications asynchronously (fire-and-forget for performance)
      if (order.buyer_id) {
        // Don't await - send notifications in background
        Promise.allSettled([
          orderNotificationService.sendStatusUpdateNotification(
            orderId,
            'shipped',
            sellerId,
            order.buyer_id,
            trackingNumber
          ),
          notificationService.notifyBuyerOrderStatus({
            buyerId: order.buyer_id,
            orderId: orderId,
            orderNumber: order.order_number || orderId.substring(0, 8),
            status: 'shipped',
            message: `Your order #${order.order_number || orderId.substring(0, 8)} has been shipped! Tracking: ${trackingNumber}`,
          }),
        ]).catch((err) => {
          console.error('Failed to send shipped notifications:', err);
        });
      }

      return true;
    } catch (error) {
      console.error('Error marking order as shipped:', error);
      throw new Error('Failed to mark order as shipped');
    }
  }

  /**
   * Mark order as delivered and release payout
   * Updated for new schema: uses shipment_status + order_shipments table
   */
  async markOrderAsDelivered(
    orderId: string,
    sellerId: string
  ): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId);
      if (order) {
        order.status = 'delivered';
        order.completed_at = new Date().toISOString();
        order.updated_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      // Get order with items to verify seller owns products in this order
      const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_id,
            product:products!order_items_product_id_fkey (
              seller_id
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (fetchError || !order) {
        throw new Error('Order not found');
      }

      // Verify seller owns at least one product in this order
      const hasSellerProduct = order.order_items?.some(
        (item: any) => item.product?.seller_id === sellerId
      );

      if (!hasSellerProduct) {
        throw new Error('Access denied: You do not own products in this order');
      }

      if (order.shipment_status !== 'shipped') {
        throw new Error(`Cannot mark as delivered. Current status: ${order.shipment_status}`);
      }

      // Update order shipment_status
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          shipment_status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      // Update shipment record - non-blocking, errors won't stop the process
      const updateShipment = async () => {
        try {
          const { data: existingShipments } = await supabase
            .from('order_shipments')
            .select('id')
            .eq('order_id', orderId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (existingShipments && existingShipments.length > 0) {
            await supabase
              .from('order_shipments')
              .update({
                status: 'delivered',
                delivered_at: new Date().toISOString(),
              })
              .eq('id', existingShipments[0].id);
          }
        } catch (error) {
          console.warn('[OrderService] Non-critical: Failed to update order_shipments:', error);
          // Don't throw - order status is already updated
        }
      };

      // Execute shipment update in parallel
      updateShipment();

      const { error: historyError } = await supabase
        .from('order_status_history')
        .insert({
          order_id: orderId,
          status: 'delivered',
          note: 'Order delivered and completed',
          changed_by: sellerId,
          changed_by_role: 'seller',
          metadata: { completed_at: new Date().toISOString() },
        });

      if (historyError) {
        console.warn('Failed to create status history:', historyError);
      }

      // Send notifications asynchronously (fire-and-forget for performance)
      if (order.buyer_id) {
        // Don't await - send notifications in background
        Promise.allSettled([
          orderNotificationService.sendStatusUpdateNotification(
            orderId,
            'delivered',
            sellerId,
            order.buyer_id
          ),
          notificationService.notifyBuyerOrderStatus({
            buyerId: order.buyer_id,
            orderId: orderId,
            orderNumber: order.order_number || orderId.substring(0, 8),
            status: 'delivered',
            message: `Your order #${order.order_number || orderId.substring(0, 8)} has been delivered! Enjoy your purchase!`,
          }),
        ]).catch((err) => {
          console.error('Failed to send delivered notifications:', err);
        });
      }

      return true;
    } catch (error) {
      console.error('Error marking order as delivered:', error);
      throw new Error('Failed to mark order as delivered');
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId);
      if (order) {
        order.status = 'cancelled';
        order.cancelled_at = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          notes: reason,
        })
        .eq('id', orderId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      throw new Error('Failed to cancel order');
    }
  }

  /**
   * Submit order review and rating
   */
  async submitOrderReview(
    orderId: string,
    buyerId: string,
    rating: number,
    comment: string,
    images?: string[]
  ): Promise<boolean> {
    if (!orderId || !buyerId) {
      throw new Error('Order ID and Buyer ID are required');
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    if (!comment?.trim()) {
      throw new Error('Review comment is required');
    }

    if (!isSupabaseConfigured()) {
      const order = this.mockOrders.find(o => o.id === orderId && o.buyer_id === buyerId);
      if (order) {
        order.is_reviewed = true;
        order.rating = rating;
        order.review_comment = comment;
        order.review_images = images || [];
        order.review_date = new Date().toISOString();
        return true;
      }
      return false;
    }

    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            product_id
          )
        `)
        .eq('id', orderId)
        .eq('buyer_id', buyerId)
        .maybeSingle();

      if (orderError || !order) {
        throw new Error('Order not found or access denied');
      }

      if (order.status !== 'delivered' && order.status !== 'completed') {
        throw new Error('Cannot review order that is not delivered or completed');
      }

      const orderItems = order.order_items || [];
      let successCount = 0;

      for (const item of orderItems) {
        const exists = await reviewService.hasReviewForProduct(orderId, item.product_id);
        if (exists) continue;

        const reviewPayload = {
          order_id: orderId,
          product_id: item.product_id,
          buyer_id: buyerId,
          seller_id: order.seller_id,
          rating: rating,
          comment: comment.trim(),
          images: images || [],
          is_verified_purchase: true,
          helpful_count: 0,
          seller_reply: null,
          is_hidden: false,
          is_edited: false
        };

        const review = await reviewService.createReview(reviewPayload);
        if (review) successCount++;
      }

      if (successCount === 0) {
        return false;
      }

      const { error: updateError } = await supabase
        .from('orders')
        .update({
          is_reviewed: true,
          rating,
          review_comment: comment.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updateError) throw updateError;
      return true;
    } catch (error) {
      console.error('Error submitting review:', error);
      throw new Error('Failed to submit review');
    }
  }

  /**
   * Get order statistics for seller dashboard
   */
  async getSellerOrderStats(sellerId: string) {
    if (!isSupabaseConfigured()) {
      return {
        total: this.mockOrders.filter(o => o.seller_id === sellerId).length,
        pending: this.mockOrders.filter(o => o.seller_id === sellerId && o.status === 'pending_payment').length,
        processing: this.mockOrders.filter(o => o.seller_id === sellerId && o.status === 'processing').length,
        completed: this.mockOrders.filter(o => o.seller_id === sellerId && o.status === 'completed').length,
      };
    }

    try {
      const { data, error } = await supabase.rpc('get_seller_order_stats', {
        p_seller_id: sellerId,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching order stats:', error);
      throw new Error('Failed to fetch order statistics');
    }
  }
}

export const orderService = new OrderService();
