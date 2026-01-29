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
  Dimensions
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Package, Clock, Filter, X, ShoppingCart, Check } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrderStore } from '../src/stores/orderStore';
import { useReturnStore } from '../src/stores/returnStore';
import { useCartStore } from '../src/stores/cartStore';
import { COLORS } from '../src/constants/theme';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Order } from '../src/types';
import { supabase } from '../src/lib/supabase';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Orders'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

export default function OrdersScreen({ navigation, route }: Props) {
  const { user, isGuest } = useAuthStore();
  const initialTab = route.params?.initialTab || 'toPay';
  const [activeTab, setActiveTab] = useState<'toPay' | 'toShip' | 'toReceive' | 'completed' | 'returns' | 'cancelled'>(initialTab as any);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Return Store
  const getReturnRequestsByUser = useReturnStore((state) => state.getReturnRequestsByUser);
  const returnRequests = user ? getReturnRequestsByUser(user.id) : [];

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const [selectedStatus, setSelectedStatus] = useState<Order['status'] | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  const [dbOrders, setDbOrders] = useState<Order[]>([]);
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const addItem = useCartStore((state) => state.addItem);
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = COLORS.primary;

  React.useEffect(() => {
    const loadOrders = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items (
              *,
              product:products (
                *,
                seller:sellers!products_seller_id_fkey (
                  business_name,
                  store_name,
                  business_address,
                  rating,
                  is_verified
                )
              )
            )
          `)
          .eq('buyer_id', user.id)
          .order('created_at', { ascending: false });
        if (error) {
          setDbOrders([]);
          return;
        }
        const mapped: Order[] = (data || []).map((order: any) => {
          const statusMap: Record<string, Order['status']> = {
            pending_payment: 'pending',
            paid: 'processing',
            processing: 'processing',
            ready_to_ship: 'processing',
            shipped: 'shipped',
            out_for_delivery: 'shipped',
            delivered: 'delivered',
            completed: 'delivered',
            cancelled: 'cancelled',
            canceled: 'cancelled',
            returned: 'delivered',
            refunded: 'delivered',
          };
          const items = (order.items || []).map((it: any) => {
            const p = it.product || {};
            const image =
              p.primary_image ||
              (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : '');
            const priceNum =
              typeof it.unit_price === 'number'
                ? it.unit_price
                : typeof p.price === 'number'
                  ? p.price
                  : parseFloat(p.price || '0');
            const sellerObj = p.seller || {};
            return {
              id: p.id || it.product_id,
              name: p.name || 'Product',
              price: priceNum || 0,
              originalPrice:
                typeof p.original_price === 'number'
                  ? p.original_price
                  : parseFloat(p.original_price || '0') || undefined,
              image: image || '',
              images: Array.isArray(p.images) ? p.images : [],
              rating: typeof p.rating === 'number' ? p.rating : 0,
              sold: typeof p.sold === 'number' ? p.sold : 0,
              seller: sellerObj.store_name || sellerObj.business_name || 'Official Store',
              sellerId: p.seller_id || sellerObj.id,
              sellerRating:
                typeof sellerObj.rating === 'number'
                  ? sellerObj.rating
                  : parseFloat(sellerObj.rating || '0') || 0,
              sellerVerified: !!sellerObj.is_verified,
              isFreeShipping: !!p.is_free_shipping,
              isVerified: !!p.is_verified,
              location: sellerObj.business_address || 'Philippines',
              description: p.description || '',
              category: p.category || 'general',
              stock:
                typeof p.stock === 'number'
                  ? p.stock
                  : parseInt(p.stock || '0') || undefined,
              reviews: p.reviews || [],
              quantity: it.quantity || 1,
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
          return {
            id: order.id,
            transactionId: order.order_number || order.id, // Use custom order_number instead of UUID
            items,
            total: totalNum,
            shippingFee,
            status: statusMap[order.status] || 'pending',
            isPaid: order.status === 'paid' || order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered',
            scheduledDate: new Date(order.created_at).toLocaleDateString(),
            deliveryDate: order.estimated_delivery_date || undefined,
            shippingAddress: {
              name: (order.shipping_address as any)?.fullName || order.buyer_name || user.name || 'BazaarX User',
              email: order.buyer_email || user.email || '',
              phone: (order.shipping_address as any)?.phone || user.phone || '',
              address: (order.shipping_address as any)?.street || (order.shipping_address as any)?.address || '',
              city: (order.shipping_address as any)?.city || '',
              region: (order.shipping_address as any)?.province || (order.shipping_address as any)?.region || '',
              postalCode: (order.shipping_address as any)?.postalCode || (order.shipping_address as any)?.zip_code || '',
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
                        : (order.payment_method as any)?.type || 'Pay on Delivery'),
            createdAt: order.created_at,
          } as Order;
        });
        setDbOrders(mapped);
      } catch (e) {
        setDbOrders([]);
      }
    };
    loadOrders();
  }, [user?.id]);

  const filteredOrders = useMemo(() => {
    // If Returns tab, no need to filter standard orders here, handled in render
    if (activeTab === 'returns') return [];

    let baseOrders: Order[] = [];

    switch (activeTab) {
      case 'toPay':
        // Assuming 'pending' means unpaid (e.g. awaiting payment or COD confirmation)
        baseOrders = dbOrders.filter(o => o.status === 'pending');
        break;
      case 'toShip':
        // 'processing' means paid/confirmed and waiting shipment
        baseOrders = dbOrders.filter(o => o.status === 'processing');
        break;
      case 'toReceive':
        baseOrders = dbOrders.filter(o => o.status === 'shipped');
        break;
      case 'completed':
        // Show delivered orders, BUT exclude those that have return requests (they go to Returns tab)
        baseOrders = dbOrders.filter(o =>
          o.status === 'delivered' &&
          !returnRequests.some(req => req.orderId === o.id)
        );
        break;
      case 'cancelled':
        baseOrders = dbOrders.filter(o => o.status === 'cancelled');
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
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });
  }, [activeTab, dbOrders, selectedStatus, searchQuery, sortOrder]);

  const handleBuyAgain = (order: Order) => {
    if (order.items.length > 0) {
      order.items.forEach(item => {
        addItem(item as any);
      });
      // Direct the buyer to checkout
      navigation.navigate('Checkout');
    }
  };

  const handleOrderReceived = (order: Order) => {
    setSelectedOrder(order);
    setRating(0);
    setReviewText('');
    setTimeout(() => setShowRatingModal(true), 100);
  };

  const handleSubmitRating = () => {
    if (!selectedOrder) return;
    updateOrderStatus(selectedOrder.id, 'delivered');
    setShowRatingModal(false);
    Alert.alert('Review Submitted!', 'Thank you for your feedback', [
      { text: 'OK', onPress: () => { setActiveTab('completed'); setSelectedOrder(null); } },
    ]);
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

  const renderActionButtons = (order: Order) => {
    if (activeTab === 'toReceive' && order.status === 'shipped') {
      return (
        <Pressable style={styles.primaryButton} onPress={() => handleOrderReceived(order)}>
          <Text style={styles.primaryButtonText}>Order Received</Text>
        </Pressable>
      );
    }
    if (activeTab === 'completed' && order.status === 'delivered') {
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
          <Text style={styles.orderIdText}>ID: #{returnReq.id.slice(-8)}</Text>
        </View>

        <View style={styles.cardBody}>
          <Image source={{ uri: productInfo.image }} style={styles.productThumb} />
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
        <View style={[styles.headerContainer, { paddingTop: 60, backgroundColor: COLORS.primary }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
              <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>My Orders</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header with Title only */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, paddingBottom: 15, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerIconButton} onPress={() => setShowFilterModal(true)}>
              <Filter size={22} color="#FFF" strokeWidth={2.5} />
            </Pressable>
            <Pressable style={styles.headerIconButton} onPress={() => setShowSearchModal(true)}>
              <Search size={22} color="#FFF" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>

      {/* White Tab Bar - Sticky look */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContentContainer}
        >
          {(['toPay', 'toShip', 'toReceive', 'completed', 'returns', 'cancelled'] as const).map((tab) => {
            const labelMap: Record<string, string> = {
              toPay: 'To Pay',
              toShip: 'To Ship',
              toReceive: 'To Receive',
              completed: 'Completed',
              returns: 'Return/Refund',
              cancelled: 'Cancelled'
            };
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.newTab, activeTab === tab && styles.newTabActive, { borderColor: BRAND_COLOR }]}
              >
                <Text style={[styles.newTabText, activeTab === tab ? { color: BRAND_COLOR, fontWeight: '600' } : { color: '#6B7280' }]}>
                  {labelMap[tab]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {activeTab === 'returns' ? (
          // RETURNS VIEW
          returnRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Return Requests</Text>
              <Text style={styles.emptyText}>Any return or refund requests will appear here</Text>
            </View>
          ) : (
            returnRequests.map(renderReturnItem)
          )
        ) : (
          // ORDERS VIEW
          filteredOrders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptyText}>Items you purchase will appear here</Text>
            </View>
          ) : (
            filteredOrders.map((order) => (
              <Pressable key={order.id} style={styles.orderCard} onPress={() => navigation.navigate('OrderDetail', { order })}>
                <View style={styles.cardHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeStyle(order.status).bg }]}>
                    <Text style={[styles.statusText, { color: getStatusBadgeStyle(order.status).text }]}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.orderIdText}>
                    {order.transactionId.length > 20 
                      ? `TRK-${order.transactionId.slice(0, 8).toUpperCase()}` 
                      : order.transactionId.startsWith('TXN') ? order.transactionId : `#${order.transactionId}`}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <Pressable onPress={() => navigation.navigate('ProductDetail', { product: order.items[0] })}>
                    <Image source={{ uri: order.items[0]?.image }} style={styles.productThumb} />
                  </Pressable>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={1}>{order.items[0]?.name}</Text>
                    <View style={styles.dateRow}>
                      <Clock size={12} color="#9CA3AF" />
                      <Text style={styles.dateText}>{order.scheduledDate}</Text>
                    </View>
                    <Text style={[styles.totalAmount, { color: BRAND_COLOR }]}>₱{order.total.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  {renderActionButtons(order)}
                </View>
              </Pressable>
            ))
          )
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

      {/* RATING MODAL */}
      <Modal visible={showRatingModal} animationType="slide" transparent={true}>
        <View style={styles.ratingOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.ratingContent}>
            <View style={styles.ratingHeader}>
              <Text style={styles.ratingTitle}>Rate Product</Text>
              <Pressable onPress={() => setShowRatingModal(false)}>
                <X size={24} color="#9CA3AF" />
              </Pressable>
            </View>

            {selectedOrder && (
              <View style={styles.ratingProductInfo}>
                <Image source={{ uri: selectedOrder.items[0]?.image }} style={{ width: 40, height: 40, borderRadius: 4, marginRight: 10 }} />
                <Text style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>{selectedOrder.items[0]?.name}</Text>
              </View>
            )}

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Ionicons name={rating >= star ? "star" : "star-outline"} size={32} color={rating >= star ? "#F59E0B" : "#D1D5DB"} />
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Write your review here..."
              multiline
              numberOfLines={4}
              value={reviewText}
              onChangeText={setReviewText}
            />

            <Pressable style={[styles.submitReviewBtn, { backgroundColor: rating > 0 ? BRAND_COLOR : '#D1D5DB' }]} disabled={rating === 0} onPress={handleSubmitRating}>
              <Text style={styles.submitReviewText}>Submit Review</Text>
            </Pressable>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerContainer: {
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFF',
  },
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
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#6B7280',
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
    color: '#1F2937',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
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
    color: '#374151',
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
    color: '#1F2937',
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
    color: '#1F2937',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    color: '#4B5563',
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
