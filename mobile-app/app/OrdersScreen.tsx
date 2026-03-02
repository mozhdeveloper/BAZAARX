import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Package, Clock, Filter, X, ShoppingCart, Check } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrderStore } from '../src/stores/orderStore';
import { useReturnStore } from '../src/stores/returnStore';
import { useCartStore } from '../src/stores/cartStore';
import { COLORS } from '../src/constants/theme';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { OrderCard } from '../src/components/OrderCard';
import ReviewModal from '../src/components/ReviewModal';
import { orderService } from '../src/services/orderService';
import type { CompositeScreenProps } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Order } from '../src/types';
import { safeImageUri } from '../src/utils/imageUtils';
import { supabase } from '../src/lib/supabase';
import { reviewService } from '../src/services/reviewService';

type Props = NativeStackScreenProps<RootStackParamList, 'Orders'>;

const { width } = Dimensions.get('window');

type OrdersTab = 'all' | 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | 'reviewed';

const normalizeInitialTab = (tab?: string): OrdersTab => {
  const normalized = (tab || 'pending').toLowerCase();

  if (normalized === 'topay') return 'pending';
  if (normalized === 'toship') return 'confirmed';
  if (normalized === 'toreceive') return 'shipped';
  if (normalized === 'toreview') return 'delivered';
  if (normalized === 'completed') return 'reviewed';
  if (normalized === 'returns') return 'returned';

  if (
    normalized === 'all' ||
    normalized === 'pending' ||
    normalized === 'confirmed' ||
    normalized === 'shipped' ||
    normalized === 'delivered' ||
    normalized === 'returned' ||
    normalized === 'cancelled' ||
    normalized === 'reviewed'
  ) {
    return normalized;
  }

  return 'pending';
};

const mapBuyerUiStatusFromNormalized = (
  paymentStatus?: string | null,
  shipmentStatus?: string | null,
  hasCancellationRecord?: boolean,
  isReviewed?: boolean,
): 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'returned' | 'cancelled' | 'reviewed' => {
  if (isReviewed) return 'reviewed';

  if (shipmentStatus === 'delivered' || shipmentStatus === 'received') {
    return 'delivered';
  }

  if (shipmentStatus === 'shipped' || shipmentStatus === 'out_for_delivery') {
    return 'shipped';
  }

  if (shipmentStatus === 'processing' || shipmentStatus === 'ready_to_ship') {
    return 'confirmed';
  }

  if (shipmentStatus === 'failed_to_deliver') {
    return 'cancelled';
  }

  if (shipmentStatus === 'returned') {
    return hasCancellationRecord ? 'cancelled' : 'returned';
  }

  if (paymentStatus === 'refunded' || paymentStatus === 'partially_refunded') {
    return hasCancellationRecord ? 'cancelled' : 'returned';
  }

  return 'pending';
};

export default function OrdersScreen({ navigation, route }: Props) {
  const { user, isGuest } = useAuthStore();
  const initialTab = normalizeInitialTab(route.params?.initialTab);
  const [activeTab, setActiveTab] = useState<OrdersTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Return Store
  const getReturnRequestsByUser = useReturnStore((state) => state.getReturnRequestsByUser);
  const returnRequests = user ? getReturnRequestsByUser(user.id) : [];

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  /* Removed unused state: rating, reviewText */

  const [selectedStatus, setSelectedStatus] = useState<Order['status'] | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  const [dbOrders, setDbOrders] = useState<Order[]>([]);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const addItem = useCartStore((state) => state.addItem);
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;

  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          address:shipping_addresses!address_id (
            id,
            label,
            address_line_1,
            address_line_2,
            city,
            province,
            region,
            postal_code
          ),
          items:order_items (
            *,
            product:products (
              id,
              name,
              description,
              price,
              brand,
              is_free_shipping,
              seller_id,
              seller:sellers!products_seller_id_fkey (
                id,
                store_name,
                store_description,
                avatar_url
              ),
              images:product_images (
                image_url,
                is_primary,
                sort_order
              )
            )
          ),
          reviews (
            *
          ),
          cancellations:order_cancellations (
            id
          ),
          vouchers:order_vouchers (
            *,
            voucher:vouchers (code, title, voucher_type)
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[OrdersScreen] Error loading orders:', error);
        setDbOrders([]);
        return;
      }

      const mapped: Order[] = (data || []).map((order: any) => {
        const hasReviews = Array.isArray(order.reviews) && order.reviews.length > 0;
        const hasCancellationRecord =
          (Array.isArray(order.cancellations) && order.cancellations.length > 0) ||
          Boolean(order.cancellation_reason || order.cancelled_at);
        const buyerUiStatus = mapBuyerUiStatusFromNormalized(
          order.payment_status,
          order.shipment_status,
          hasCancellationRecord,
          hasReviews || Boolean(order.is_reviewed),
        );

        const statusByBuyerUiStatus: Record<string, Order['status']> = {
          pending: 'pending',
          confirmed: 'processing',
          shipped: 'shipped',
          delivered: 'delivered',
          reviewed: 'delivered',
          returned: 'delivered',
          cancelled: 'cancelled',
        };

        const mappedStatus = statusByBuyerUiStatus[buyerUiStatus] || 'pending';
        const isReviewed = buyerUiStatus === 'reviewed';

        // Get seller from first order item's product (orders don't have direct seller_id)
        const firstItem = order.items?.[0];
        const firstProduct = firstItem?.product || {};
        const productSeller = firstProduct.seller || {};
        const sellerName = productSeller.store_name || 'Shop';
        const sellerId = productSeller.id || firstProduct.seller_id;

        // Get address from the linked shipping_address
        const linkedAddress = order.address || {};

        const items = (order.items || []).map((it: any) => {
          const p = it.product || {};
          const productName = p.name || it.product_name || 'Product Unavailable';

          // Get primary image from product_images
          const productImages = p.images || [];
          const primaryImg = productImages.find((img: any) => img.is_primary);
          const firstImg = productImages.sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))[0];
          const image = it.primary_image_url || primaryImg?.image_url || firstImg?.image_url || '';

          const priceNum = typeof it.price === 'number' ? it.price :
            (typeof it.unit_price === 'number' ? it.unit_price :
              (typeof p.price === 'number' ? p.price : 0));

          // Calculate original price from discounted price + discount
          const priceDiscount = typeof it.price_discount === 'number' ? it.price_discount : 0;
          const itemOriginalPrice = priceDiscount > 0 ? priceNum + priceDiscount : (typeof p.original_price === 'number' ? p.original_price : undefined);

          // Get seller info from product
          const itemSeller = p.seller || productSeller;
          const itemSellerName = itemSeller.store_name || sellerName;
          const itemSellerId = itemSeller.id || sellerId;

          // Map personalized_options to selectedVariant format
          const personalizedOptions = it.personalized_options || {};
          const selectedVariant = Object.keys(personalizedOptions).length > 0 ? {
            option1Label: personalizedOptions.option1Label,
            option1Value: personalizedOptions.option1Value,
            option2Label: personalizedOptions.option2Label,
            option2Value: personalizedOptions.option2Value,
            color: personalizedOptions.color,
            size: personalizedOptions.size,
            variantId: personalizedOptions.variantId || it.variant_id,
          } : it.selected_variant || null;

          return {
            id: it.id || `${order.id}_${it.product_id}`, // order_item id for unique identification
            productId: p.id || it.product_id, // actual product id for reviews
            name: productName,
            price: priceNum,
            originalPrice: itemOriginalPrice,
            image: image,
            images: productImages.map((img: any) => img.image_url),
            rating: typeof p.rating === 'number' ? p.rating : 0,
            sold: typeof p.sold === 'number' ? p.sold : 0,
            seller: itemSellerName,
            sellerId: itemSellerId,
            sellerInfo: itemSeller,
            sellerRating: itemSeller.rating || 0,
            sellerVerified: !!itemSeller.is_verified,
            isFreeShipping: !!p.is_free_shipping,
            isVerified: !!p.is_verified,
            location: 'Philippines',
            description: p.description || '',
            category: p.category || 'general',
            stock: typeof p.stock === 'number' ? p.stock : 0,
            reviews: p.reviews || [],
            quantity: it.quantity || 1,
            selectedVariant: selectedVariant,
          };
        });
        const shippingFee =
          typeof order.shipping_cost === 'number'
            ? order.shipping_cost
            : parseFloat(order.shipping_cost || '0') || 0;
        const totalNum =
          typeof order.total_amount === 'number'
            ? order.total_amount
            : parseFloat(order.total_amount || '0') || items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0) + shippingFee;

        // Parse name and phone from address_line_1 which stores "Name, Phone, Street"
        const addressLine1 = linkedAddress.address_line_1 || '';
        const addressParts = addressLine1.split(', ');
        let addressName = user.name || 'User';
        let addressPhone = '';
        let addressStreet = addressLine1;

        if (addressParts.length >= 2) {
          // Check if second part looks like a phone number
          const possiblePhone = addressParts[1];
          if (/^\d{10,11}$/.test(possiblePhone?.replace(/\D/g, ''))) {
            addressName = addressParts[0] || user.name || 'User';
            addressPhone = possiblePhone;
            addressStreet = addressParts.slice(2).join(', ');
          }
        }

        // Get voucher info if any
        const orderVouchers = order.vouchers || [];
        const voucherInfo = orderVouchers.length > 0 ? {
          code: orderVouchers[0].voucher?.code || 'VOUCHER',
          type: orderVouchers[0].voucher?.voucher_type || 'fixed',
          discountAmount: orderVouchers.reduce((sum: number, v: any) => sum + (v.discount_amount || 0), 0)
        } : null;
        
        // Calculate campaign discount from order items (price_discount)
        const campaignDiscount = (order.items || []).reduce((sum: number, it: any) => {
          const priceDiscount = typeof it.price_discount === 'number' ? it.price_discount : 0;
          return sum + (priceDiscount * (it.quantity || 1));
        }, 0);

        // Original items total (before campaign discount)
        const itemsSubtotal = items.reduce((sum: number, i: any) => sum + ((i.price || 0) * i.quantity), 0);
        
        // subtotal = original price - campaign discount
        const subtotal = itemsSubtotal;
        
        // total = subtotal + shipping - voucher
        const total = subtotal + shippingFee - (voucherInfo?.discountAmount || 0);

        return {
          id: order.order_number || order.id,
          orderId: order.id,
          transactionId: order.order_number || order.id,
          items,
          sellerInfo: productSeller,
          total,
          subtotal,
          shippingFee,
          discount: campaignDiscount + (voucherInfo?.discountAmount || 0),
          voucherInfo,
          campaignDiscounts: campaignDiscount > 0 ? [{
            campaignId: 'campaign',
            campaignName: 'Campaign Discount',
            discountAmount: campaignDiscount
          }] : undefined,
          status: mappedStatus,
          isPaid: order.payment_status === 'paid',
          scheduledDate: new Date(order.created_at).toLocaleDateString(),
          deliveryDate: order.estimated_delivery_date || undefined,
          shippingAddress: {
            name: addressName,
            email: user.email || '',
            phone: addressPhone,
            address: addressStreet,
            city: linkedAddress.city || '',
            region: linkedAddress.province || linkedAddress.region || '',
            postalCode: linkedAddress.postal_code || '',
          },
          paymentMethod: typeof order.payment_method === 'string'
            ? order.payment_method
            : ((order.payment_method as any)?.type === 'cod'
              ? 'Cash on Delivery'
              : (order.payment_method as any)?.type === 'gcash'
                ? 'GCash'
                : (order.payment_method as any)?.type === 'card'
                  ? 'Card'
                  : (order.payment_method as any)?.type === 'paymongo'
                    ? 'PayMongo'
                    : (order.payment_method as any)?.type || 'Cash on Delivery'),
          createdAt: order.created_at,
          buyerUiStatus,
          isReviewed,
          review: order.reviews && order.reviews.length > 0 ? order.reviews[0] : null,
        } as Order & { review?: any };
      });
      setDbOrders(mapped);
    } catch (e) {
      console.error('[OrdersScreen] Unexpected error:', e);
      setDbOrders([]);
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [user?.id])
  );

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [user?.id]);

  const filteredOrders = useMemo(() => {
    let baseOrders: Order[] = [];

    switch (activeTab) {
      case 'all':
        baseOrders = dbOrders;
        break;
      case 'pending':
        baseOrders = dbOrders.filter(o => o.buyerUiStatus === 'pending');
        break;
      case 'confirmed':
        baseOrders = dbOrders.filter(o => o.buyerUiStatus === 'confirmed');
        break;
      case 'shipped':
        baseOrders = dbOrders.filter(o => o.buyerUiStatus === 'shipped');
        break;
      case 'delivered':
        baseOrders = dbOrders.filter(o => o.buyerUiStatus === 'delivered');
        break;
      case 'reviewed':
        baseOrders = dbOrders.filter(o => o.buyerUiStatus === 'reviewed');
        break;
      case 'returned':
        baseOrders = dbOrders.filter(o => o.buyerUiStatus === 'returned');
        break;
      case 'cancelled':
        baseOrders = dbOrders.filter(o => o.buyerUiStatus === 'cancelled');
        break;
      default:
        baseOrders = [];
    }

    if (selectedStatus !== 'all') baseOrders = baseOrders.filter(order => order.status === selectedStatus);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      baseOrders = baseOrders.filter(order =>
        order.transactionId.toLowerCase().includes(query) ||
        order.items.some(item => item.name?.toLowerCase().includes(query))
      );
    }

    return [...baseOrders].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      // Primary sort by date, secondary sort by transaction ID for deterministic order
      if (dateA !== dateB) {
        return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
      }
      // If same date, sort by transaction ID descending (higher number = more recent)
      return sortOrder === 'latest' 
        ? b.transactionId.localeCompare(a.transactionId) 
        : a.transactionId.localeCompare(b.transactionId);
    });
  }, [activeTab, dbOrders, selectedStatus, searchQuery, sortOrder]);

  const handleBuyAgain = (order: Order) => {
    if (order.items.length > 0) {
      order.items.forEach(item => {
        addItem(item as any);
      });
      navigation.navigate('Checkout', {});
    }
  };

  const handleOrderReceived = (order: Order) => {
    Alert.alert(
      'Order Received',
      'Confirm you have received your order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              // Use shipment_status column (orders table doesn't have 'status' column)
              // Use orderId (real UUID) not id (which may be order_number)
              const realOrderId = (order as any).orderId || order.id;
              const { error } = await supabase
                .from('orders')
                .update({ shipment_status: 'received' })
                .eq('id', realOrderId);

              if (error) throw error;

              updateOrderStatus(realOrderId, 'delivered');

              setDbOrders(prev => prev.map(o =>
                ((o as any).orderId || o.id) === realOrderId ? { ...o, status: 'delivered' } : o
              ));

              Alert.alert('Success', 'Order marked as received!');
            } catch (e) {
              console.error('Error updating order:', e);
              Alert.alert('Error', 'Failed to update order status');
            }
          },
        }
      ]
    );
  };

  const handleReview = (order: Order) => {
    setSelectedOrder(order);
    setShowRatingModal(true);
  };

  /* Removed unused local state for inline modal: rating, setRating, reviewText, setReviewText */
  /* Instead of setReviewText, we use the logic inside ReviewModal */

  const handleSubmitReview = async (
    productId: string,
    orderItemId: string,
    rating: number,
    review: string,
    images: string[] = [],
  ) => {
    if (!selectedOrder || !user?.id) return;

    try {
      // Get the real order UUID (orderId), not order_number
      const realOrderId = (selectedOrder as any).orderId || selectedOrder.id;
      
      // Find item by productId (now correctly passed from ReviewModal)
      const item = selectedOrder.items.find(i => 
        i.id === orderItemId || (i as any).productId === productId || i.id === productId
      );
      if (!item) throw new Error('Product not found');

      // Create review with optional image uploads
      const result = await reviewService.submitReviewWithImages({
        product_id: productId,
        buyer_id: user.id,
        order_id: realOrderId,
        order_item_id: orderItemId,
        rating,
        comment: review || null,
        is_verified_purchase: true,
      }, images);

      if (!result) {
        throw new Error('This item has already been reviewed');
      }

      await loadOrders();
      setActiveTab('reviewed');
      Alert.alert('Success', 'Your review has been submitted.');
    } catch (error: any) {
      console.error('[OrdersScreen] Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review');
    }
  };

  const getStatusBadgeStyle = (status: Order['status'] | string) => {
    switch (status) {
      case 'pending': return { bg: '#FFF4ED', text: BRAND_COLOR }; // Orange
      case 'delivered':
      case 'approved':
      case 'refunded': return { bg: '#F0FDF4', text: '#166534' }; // Green
      case 'canceled':
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' }; // Red
      case 'pending_review': return { bg: '#FEF3C7', text: '#D97706' }; // Yellow
      default: return { bg: '#F3F4F6', text: '#374151' }; // Gray
    }
  };

  const handleCancelOrder = (order: Order) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel? Don/t worry, you have not been charged for this order. You can easily buy these items again later.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Update Supabase
              const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', order.id);

              if (error) throw error;

              // 2. Update Local Store
              updateOrderStatus(order.id, 'cancelled');

              // 3. Update Local State (dbOrders) to reflect change immediately
              setDbOrders(prev => prev.map(o =>
                o.id === order.id ? { ...o, status: 'cancelled' } : o
              ));

              Alert.alert('Order Cancelled', 'Your order has been moved to the Cancelled list.');
            } catch (e) {
              console.log('Error canceling order:', e);
              // Fallback for demo/offline: just update local state
              updateOrderStatus(order.id, 'cancelled');
              setDbOrders(prev => prev.map(o =>
                o.id === order.id ? { ...o, status: 'cancelled' } : o
              ));
              Alert.alert('Order Cancelled', 'Your order has been moved to the Cancelled list (Offline Mode).');
            }
          }
        }
      ]
    );
  };

  const renderOrderCard = (order: Order) => (
    <OrderCard
      key={order.id}
      order={order}
      onPress={() => navigation.navigate('OrderDetail', { order })}
      onCancel={() => handleCancelOrder(order)}
      onReceive={() => handleOrderReceived(order)}
      onReview={order.buyerUiStatus === 'delivered' ? () => handleReview(order) : undefined}
      onShopPress={(shopId) => {
        const targetOrder = filteredOrders.find(o => o.items.some(i => i.sellerId === shopId)) || order;
        const sellerInfo = dbOrders.find(o => o.id === targetOrder.id)?.sellerInfo || {};

        const storeObj = {
          id: shopId,
          name: sellerInfo.store_name || sellerInfo.business_name || 'Shop',
          rating: sellerInfo.rating || 4.8,
          verified: !!sellerInfo.is_verified,
          image: 'https://via.placeholder.com/150',
          followers: 100,
          description: sellerInfo.business_address || ''
        };

        navigation.navigate('StoreDetail', { store: storeObj });
      }}
    />
  );

  const renderActionButtons = (order: Order) => {
    if (activeTab === 'shipped' && order.status === 'shipped') {
      return (
        <Pressable style={styles.primaryButton} onPress={() => handleOrderReceived(order)}>
          <Text style={styles.primaryButtonText}>Order Received</Text>
        </Pressable>
      );
    }
    if (activeTab === 'reviewed' && order.status === 'delivered') {
      return (
        <View style={styles.buttonRow}>
          <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => navigation.navigate('OrderDetail', { order })}>
            <Text style={styles.outlineButtonText}>Details</Text>
          </Pressable>
          <Pressable style={[styles.buyAgainButton, { flex: 1.5 }]} onPress={() => handleBuyAgain(order)}>
            <ShoppingCart size={16} color={BRAND_COLOR} strokeWidth={2.5} />
            <Text style={[styles.buyAgainText, { color: BRAND_COLOR }]}>Buy Again</Text>
          </Pressable>
        </View>
      );
    }
    switch (order.status) {
      case 'pending':
        return (
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.outlineButton, { flex: 1, borderColor: '#EF4444', marginRight: 8, backgroundColor: '#FEF2F2' }]}
              onPress={() => handleCancelOrder(order)}
            >
              <Text style={[styles.outlineButtonText, { color: '#EF4444' }]}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => navigation.navigate('OrderDetail', { order })}>
              <Text style={styles.outlineButtonText}>View Details</Text>
            </Pressable>
          </View>
        );
      case 'processing':
      case 'shipped':
        return (
          <Pressable style={styles.primaryButton} onPress={() => navigation.navigate('DeliveryTracking', { order })}>
            <Text style={styles.primaryButtonText}>Track Order</Text>
          </Pressable>
        );
      default:
        return (
          <Pressable style={styles.outlineButton} onPress={() => navigation.navigate('OrderDetail', { order })}>
            <Text style={styles.outlineButtonText}>View Details</Text>
          </Pressable>
        );
    }
  };

  const renderReturnItem = (returnReq: any) => {
    const firstItem = returnReq.items?.[0];
    const originalOrder = dbOrders.find((o: Order) => o.id === returnReq.orderId);
    const productInfo = originalOrder?.items.find((i: any) => i.id === firstItem?.itemId) || {
      name: `Item from Order #${returnReq.orderId}`,
      image: returnReq.images?.[0] || 'https://via.placeholder.com/150',
      price: returnReq.amount || 0
    };

    const statusStyle = getStatusBadgeStyle(returnReq.status);

    return (
      <Pressable
        key={returnReq.id}
        style={styles.orderCard}
        onPress={() => navigation.navigate('ReturnDetail', { returnId: returnReq.id })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {returnReq.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.orderIdText}>#{returnReq.id.slice(-8)}</Text>
        </View>

        <View style={styles.cardBody}>
          <Image source={{ uri: safeImageUri(productInfo.image) }} style={styles.productThumb} />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>{productInfo.name}</Text>
            <View style={styles.dateRow}>
              <Clock size={12} color="#9CA3AF" />
              <Text style={styles.dateText}>Requested: {new Date(returnReq.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={[styles.totalAmount, { color: BRAND_COLOR }]}>Refund: ₱{returnReq.amount.toLocaleString()}</Text>
          </View>
        </View>
        <View style={styles.cardFooter}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Reason: {returnReq.reason}</Text>
            <Pressable style={[styles.outlineButton, { paddingVertical: 8, paddingHorizontal: 16 }]} onPress={() => navigation.navigate('ReturnDetail', { returnId: returnReq.id })}>
              <Text style={styles.outlineButtonText}>Details</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  if (isGuest) {
    return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: 60, paddingBottom: 15 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>
      <GuestLoginModal
        visible={true}
        onClose={() => navigation.navigate('MainTabs', { screen: 'Home' })} // Explicit navigation
        message="Sign up to track your orders."
        hideCloseButton={true}
        cancelText="Go back to Home"
      />
    </View>
    );
  }

  return (
    <View
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />

      {/* Header with Title only */}
      {/* Header with Title only */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 10, paddingBottom: 15 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerIconButton} onPress={() => setShowFilterModal(true)}>
              <Filter size={22} color={COLORS.textHeadline} strokeWidth={2.5} />
            </Pressable>
            <Pressable style={styles.headerIconButton} onPress={() => setShowSearchModal(true)}>
              <Search size={22} color={COLORS.textHeadline} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      {/* White Tab Bar - Sticky look */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContentContainer}
        >
          {(['all', 'pending', 'confirmed', 'shipped', 'delivered', 'reviewed', 'returned', 'cancelled'] as const).map((tab) => {
            const labelMap: Record<string, string> = {
              all: 'All Orders',
              pending: 'Pending',
              confirmed: 'Processing',
              shipped: 'Shipped',
              delivered: 'Delivered',
              reviewed: 'Reviewed',
              returned: 'Return/Refund',
              cancelled: 'Cancelled'
            };
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.newTab, activeTab === tab && styles.newTabActive, { borderColor: BRAND_COLOR }]}
              >
                <Text style={[styles.newTabText, activeTab === tab ? { color: BRAND_COLOR, fontWeight: '600' } : { color: COLORS.textMuted }]}>
                  {labelMap[tab]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND_COLOR]} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptyText}>Items you purchase will appear here</Text>
          </View>
        ) : (
          filteredOrders.map(renderOrderCard)
        )}
      </ScrollView>

      {/* SEARCH MODAL */}
      <Modal visible={showSearchModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.searchModalContent, { paddingTop: insets.top + 10 }]}>
            <View style={styles.searchBarContainer}>
              <Pressable onPress={() => setShowSearchModal(false)}><ArrowLeft size={24} color="#1F2937" /></Pressable>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by ID or product..."
                autoFocus
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}><X size={20} color="#9CA3AF" /></Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* FILTER MODAL */}
      <Modal visible={showFilterModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Orders</Text>
              <Pressable onPress={() => setShowFilterModal(false)}><X size={24} color="#1F2937" /></Pressable>
            </View>
            <ScrollView style={{ padding: 20 }}>
              <Text style={styles.filterLabel}>Sort By</Text>
              <View style={styles.filterRow}>
                {['latest', 'oldest'].map(o => (
                  <Pressable key={o} onPress={() => setSortOrder(o as any)} style={[styles.filterChip, sortOrder === o && { borderColor: BRAND_COLOR, backgroundColor: BRAND_COLOR + '10' }]}>
                    <Text style={[styles.filterChipText, sortOrder === o && { color: BRAND_COLOR }]}>{o === 'latest' ? 'Newest First' : 'Oldest First'}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <Pressable style={[styles.applyBtn, { backgroundColor: BRAND_COLOR }]} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* REVIEW MODAL (Replaces previous inline Rating Modal) */}
      <ReviewModal
        visible={showRatingModal}
        order={selectedOrder}
        onClose={() => setShowRatingModal(false)}
        onSubmit={handleSubmitReview}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF0', // Warm Ivory
  },
  headerContainer: {
    paddingHorizontal: 20,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    zIndex: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textHeadline, letterSpacing: 0.5 },
  headerIconButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  tabsWrapper: {
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsContentContainer: {
    paddingHorizontal: 16,
  },
  newTab: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginRight: 0,
    borderBottomWidth: 0,
  },
  newTabActive: {
    borderBottomWidth: 2,
  },
  newTabText: {
    fontSize: 14,
    fontWeight: '500',
  },

  // Previous Styles (kept for cards/modals)
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textHeadline,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  orderIdText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardBody: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textHeadline,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineButtonText: {
    color: COLORS.textHeadline,
    fontSize: 13,
    fontWeight: '600',
  },
  buyAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  buyAgainText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  searchModalContent: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textHeadline,
  },
  filterModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '60%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textHeadline,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textHeadline,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  filterChipText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  applyBtn: {
    margin: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Rating Modal
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  ratingContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  ratingTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  ratingProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitReviewBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitReviewText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  // Removed old styles
  tabsContainer: {
    // Legacy style removed/replaced
  },
  tab: {
    // Legacy style removed/replaced 
  },
  tabText: {
    // Legacy style removed/replaced
  },
  activeTab: {
    // Legacy
  },
});
