import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Package, ShoppingCart, Bell, X, Search, ChevronDown, Menu, RefreshCw, Eye, Truck, CheckCircle, XCircle, MapPin, User, Phone } from 'lucide-react-native';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { useReturnStore } from '../../../src/stores/returnStore';
import SellerDrawer from '../../../src/components/SellerDrawer';
import { safeImageUri } from '../../../src/utils/imageUtils';

type OrderStatus = 'all' | 'pending' | 'to-ship' | 'shipped' | 'completed' | 'cancelled' | 'returns' | 'refunds';
type ChannelFilter = 'all' | 'online' | 'pos';

export default function SellerOrdersScreen() {
  const { orders = [], updateOrderStatus, markOrderAsShipped, seller, fetchOrders, ordersLoading } = useSellerStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Open modal
  const openEditModal = (order: any) => {
    console.log('[Orders] Opening details modal for order:', {
      orderId: order.orderId,
      status: order.status,
      customerName: order.customerName,
    });
    setSelectedOrder(order);
    setEditModalVisible(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedOrder(null);
  };

  // Handle status update from modal
  const handleStatusUpdate = async (newStatus: 'pending' | 'to-ship' | 'shipped' | 'completed' | 'cancelled') => {
    if (selectedOrder) {
      if (newStatus === 'shipped') {
        setTrackingNumber('');
        setTrackingModalVisible(true);
        return;
      }

      console.log(`[Orders] Updating order ${selectedOrder.orderId} from ${selectedOrder.status} to ${newStatus}`);
      await updateOrderStatus(selectedOrder.orderId, newStatus);
      // Update local selected order state
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      // Refresh orders
      await fetchOrders(seller?.id);
    }
  };

  const handleTrackingSubmit = async () => {
    if (!trackingNumber.trim()) {
      alert('Please enter a tracking number');
      return;
    }

    if (selectedOrder) {
      setIsUpdating(true);
      try {
        console.log(`[Orders] Marking order ${selectedOrder.orderId} as shipped with tracking: ${trackingNumber}`);
        await markOrderAsShipped(selectedOrder.orderId, trackingNumber);

        // Update local state
        setSelectedOrder({
          ...selectedOrder,
          status: 'shipped',
          trackingNumber: trackingNumber
        });

        setTrackingModalVisible(false);
        await fetchOrders(seller?.id);
      } catch (error) {
        console.error('[Orders] Failed to mark as shipped:', error);
        alert('Failed to update tracking number');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  // Fetch orders from database on mount
  useEffect(() => {
    if (seller?.id) {
      fetchOrders(seller.id);
    }
  }, [seller?.id]);



  // Pull-to-refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchOrders(seller?.id);
    } finally {
      setRefreshing(false);
    }
  };

  const getReturnRequestsBySeller = useReturnStore((state) => state.getReturnRequestsBySeller);
  const returnRequests = seller ? getReturnRequestsBySeller(seller.store_name) : [];
  const pendingReturnRequests = returnRequests.filter(
    (req) => req.status === 'pending_review' || req.status === 'seller_response_required'
  );
  const refundRequests = returnRequests.filter(
    (req) =>
      req.status === 'approved' ||
      req.status === 'refund_processing' ||
      req.status === 'refunded' ||
      req.status === 'item_returned'
  );

  const isReturnTab = selectedTab === 'returns' || selectedTab === 'refunds';
  const currentReturnRequests =
    selectedTab === 'returns'
      ? pendingReturnRequests
      : selectedTab === 'refunds'
        ? refundRequests
        : [];

  // Channel counts for tabs
  const channelCounts = {
    all: orders.length,
    online: orders.filter(o => o.type === 'ONLINE' || !o.type).length,
    pos: orders.filter(o => o.type === 'OFFLINE').length,
  };

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    'to-ship': orders.filter(o => o.status === 'to-ship').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    returns: pendingReturnRequests.length,
    refunds: refundRequests.length,
  };

  const filteredOrders = orders.filter((order) => {
    const matchesTab =
      selectedTab === 'all'
        ? true
        : ['pending', 'to-ship', 'shipped', 'completed', 'cancelled'].includes(selectedTab)
          ? order.status === selectedTab
          : true;

    // Channel filter
    const matchesChannel =
      channelFilter === 'all' ? true :
        channelFilter === 'pos' ? order.type === 'OFFLINE' :
          (order.type === 'ONLINE' || !order.type);

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ? true : (
      (order.orderId && String(order.orderId).toLowerCase().includes(q)) ||
      (order.customerName && String(order.customerName).toLowerCase().includes(q)) ||
      (order.customerEmail && String(order.customerEmail).toLowerCase().includes(q))
    );

    return matchesTab && matchesChannel && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'shipped':
        return '#3B82F6'; // Blue for shipped
      case 'to-ship':
        return '#FF5722';
      case 'pending':
        return '#FBBF24';
      case 'cancelled':
        return '#DC2626';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#D1FAE5';
      case 'shipped':
        return '#DBEAFE'; // Light blue for shipped
      case 'to-ship':
        return '#FFF5F0';
      case 'pending':
        return '#FEF3C7';
      case 'cancelled':
        return '#FEE2E2';
      default:
        return '#F3F4F6';
    }
  };

  // Null guard for seller
  if (!seller) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 16, color: '#9CA3AF' }}>Loading seller information...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Seller Drawer */}
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Immersive Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable style={styles.iconContainer} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Orders</Text>
              <Text style={styles.headerSubtitle}>Order Management</Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        {/* Notification (aligned to search end) */}
        <Pressable
          style={[styles.notificationButton, { position: 'absolute', right: 20, top: insets.top + 20 }]}
          onPress={() => navigation.getParent()?.navigate('Notifications')}
        >
          <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
          <View style={styles.notificationBadge} />
        </Pressable>
      </View>

      {/* Segmented Control + Filter */}
      <View style={styles.segmentedControlRow}>
        <View style={{ flex: 1 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentedScrollContent}
          >
            {(
              ['all', 'pending', 'to-ship', 'shipped', 'completed', 'cancelled', 'returns', 'refunds'] as OrderStatus[]
            ).map((tab) => (
              <Pressable
                key={tab}
                style={[
                  styles.segmentButton,
                  selectedTab === tab && styles.segmentButtonActive,
                ]}
                onPress={() => setSelectedTab(tab)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    selectedTab === tab && styles.segmentButtonTextActive,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                </Text>
                <View
                  style={[
                    styles.countBadge,
                    selectedTab === tab && styles.countBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.countBadgeText,
                      selectedTab === tab && styles.countBadgeTextActive,
                    ]}
                  >
                    {orderCounts[tab]}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Channel Filter Tabs - Like Web Version */}
      <View style={styles.channelFilterRow}>
        <Pressable
          style={[styles.channelTab, channelFilter === 'all' && styles.channelTabActive]}
          onPress={() => setChannelFilter('all')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'all' && styles.channelTabTextActive]}>
            All Channels
          </Text>
          <View style={[styles.channelBadge, channelFilter === 'all' && styles.channelBadgeActive]}>
            <Text style={[styles.channelBadgeText, channelFilter === 'all' && styles.channelBadgeTextActive]}>
              {channelCounts.all}
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.channelTab, channelFilter === 'online' && styles.channelTabActive]}
          onPress={() => setChannelFilter('online')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'online' && styles.channelTabTextActive]}>
            Online App
          </Text>
          <View style={[styles.channelBadge, channelFilter === 'online' && styles.channelBadgeActive]}>
            <Text style={[styles.channelBadgeText, channelFilter === 'online' && styles.channelBadgeTextActive]}>
              {channelCounts.online}
            </Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.channelTab, channelFilter === 'pos' && styles.channelTabActive]}
          onPress={() => setChannelFilter('pos')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'pos' && styles.channelTabTextActive]}>
            POS / Offline
          </Text>
          <View style={[styles.channelBadge, channelFilter === 'pos' && styles.channelBadgeActive]}>
            <Text style={[styles.channelBadgeText, channelFilter === 'pos' && styles.channelBadgeTextActive]}>
              {channelCounts.pos}
            </Text>
          </View>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || ordersLoading}
            onRefresh={onRefresh}
            colors={['#FF5722']}
            tintColor="#FF5722"
          />
        }
      >
        {ordersLoading && orders.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={styles.emptyStateTitle}>Loading orders...</Text>
          </View>
        ) : isReturnTab ? (
          currentReturnRequests.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={64} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>
                {selectedTab === 'returns' ? 'No return requests' : 'No refund requests'}
              </Text>
              <Text style={styles.emptyStateText}>
                {selectedTab === 'returns'
                  ? 'Return requests from buyers will appear here'
                  : 'Refund-related requests will appear here'}
              </Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {currentReturnRequests.map((req) => (
                <Pressable
                  key={req.id}
                  style={styles.orderCard}
                  onPress={() =>
                    navigation.getParent()?.navigate('ReturnDetail', {
                      returnId: req.id,
                    })
                  }
                >
                  <View style={styles.orderHeader}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.orderId} numberOfLines={1} ellipsizeMode="tail">
                        Order #{req.orderId}
                      </Text>
                      <Text
                        style={styles.customerName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        Reason: {req.reason.split('_').join(' ')}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            selectedTab === 'returns' ? '#FEF3C7' : '#E0F2FE',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color: selectedTab === 'returns' ? '#D97706' : '#0369A1',
                          },
                        ]}
                      >
                        {req.status.split('_').join(' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.orderFooter}>
                    <View>
                      <Text style={styles.totalLabel}>Request Date</Text>
                      <Text style={styles.customerEmail}>
                        {new Date(req.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.totalLabel}>Amount</Text>
                      <Text style={styles.totalAmount}>
                        ₱{req.amount.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyStateTitle}>
              No {selectedTab === 'all' ? '' : selectedTab} orders
            </Text>
            <Text style={styles.emptyStateText}>
              {selectedTab === 'all'
                ? 'Orders will appear here once customers make purchases'
                : `No orders with "${selectedTab.replace('-', ' ')}" status`}
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => (
              <Pressable
                key={order.id}
                style={styles.orderCard}
                onPress={() => openEditModal(order)}
              >
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexShrink: 1 }}>
                        <Text
                          style={styles.orderId}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {String(order.orderId || order.id || '')}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {order.type === 'OFFLINE' && (
                          <View style={styles.walkInBadge}>
                            <Text style={styles.walkInBadgeText}>Walk-in</Text>
                          </View>
                        )}
                        {order.type === 'ONLINE' && (
                          <View style={styles.onlineBadge}>
                            <Text style={styles.onlineBadgeText}>Online</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={styles.customerName}>{String(order.customerName || '')}</Text>
                    {order.posNote ? (
                      <Text style={styles.posNote} numberOfLines={1}>
                        Note: {String(order.posNote || '')}
                      </Text>
                    ) : (
                      <Text style={styles.customerEmail} numberOfLines={1}>
                        {String(order.customerEmail || '')}
                      </Text>
                    )}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBgColor(order.status), flexShrink: 0 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(order.status) },
                      ]}
                    >
                      {String(order.status || 'pending').replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.thumbnailsScroll}
                >
                  {order.items.map((item, index) => (
                    <View key={index} style={styles.thumbnailContainer}>
                      <Image source={{ uri: safeImageUri(item.image) }} style={styles.thumbnail} />
                      <View style={styles.quantityBadge}>
                        <Text style={styles.quantityText}>x{item.quantity}</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.orderFooter}>
                  <View>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalAmount}>
                      ₱{(
                        order.total > 0
                          ? order.total
                          : order.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0)
                      ).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.viewDetailsHint}>
                    <Text style={styles.viewDetailsText}>Tap to view details</Text>
                    <Eye size={16} color="#9CA3AF" />
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Order Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            {/* Modal Header */}
            <View style={styles.editModalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 12 }}>
                  <Text style={styles.modalOrderId}>Order #{String(selectedOrder?.orderId || selectedOrder?.id || '').toUpperCase()}</Text>
                  {selectedOrder && (
                    <View style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusBgColor(selectedOrder.status) }
                    ]}>
                      <Text style={[
                        styles.statusText,
                        { color: getStatusColor(selectedOrder.status), fontSize: 11 }
                      ]}>
                        {String(selectedOrder.status || 'pending').replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.modalOrderDate}>
                  {selectedOrder?.createdAt && new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </Text>
              </View>
              <Pressable onPress={closeEditModal} style={styles.closeButton}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>

            {selectedOrder && (
              <>
                <ScrollView style={styles.editModalBody} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

                  <View style={[styles.detailCard, { marginTop: 0 }]}>
                    <View style={styles.detailCardHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.detailCardTitle}>Order Summary</Text>
                      </View>
                    </View>
                    <View style={styles.detailCardContent}>
                      {/* Items List */}
                      {selectedOrder.items.map((item: any, index: number) => (
                        <View key={index} style={styles.summaryItemRow}>
                          <Image source={{ uri: safeImageUri(item.image) }} style={styles.summaryItemImage} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.summaryItemName} numberOfLines={2}>{String(item.productName || 'Unknown Product')}</Text>
                            {(item.selectedColor || item.selectedSize) && (
                              <Text style={styles.summaryItemVariant}>
                                {item.selectedColor ? item.selectedColor : ''}
                                {item.selectedColor && item.selectedSize ? ' • ' : ''}
                                {item.selectedSize ? item.selectedSize : ''}
                              </Text>
                            )}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.summaryItemPrice}>₱{(item.price || 0).toLocaleString()}</Text>
                            <Text style={styles.summaryItemQty}>x{item.quantity}</Text>
                          </View>
                        </View>
                      ))}

                      {/* Divider */}
                      <View style={styles.summaryDivider} />

                      {/* Breakdown */}
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Subtotal</Text>
                        <Text style={styles.breakdownValue}>
                          ₱{(selectedOrder.total > 0 ? selectedOrder.total : selectedOrder.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0)).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>Tax (0%)</Text>
                        <Text style={styles.breakdownValue}>₱0.00</Text>
                      </View>
                      <View style={[styles.breakdownRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }]}>
                        <Text style={styles.totalLabelLarge}>Total Amount</Text>
                        <Text style={styles.totalValueLarge}>
                          ₱{(selectedOrder.total > 0 ? selectedOrder.total : selectedOrder.items.reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0)).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Text style={styles.detailCardTitle}>Customer</Text>
                    </View>
                    <View style={styles.detailCardContent}>
                      <Text style={styles.customerNameLarge}>
                        {selectedOrder.customerName || 'Walk-in Customer'}
                      </Text>
                      <Text style={styles.customerEmailText}>
                        {selectedOrder.customerEmail || 'No email provided'}
                      </Text>
                    </View>
                  </View>

                  {/* Delivery Information */}
                  <View style={styles.detailCard}>
                    <View style={styles.detailCardHeader}>
                      <Text style={styles.detailCardTitle}>Delivery Information</Text>
                    </View>
                    <View style={styles.detailCardContent}>
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ padding: 8, backgroundColor: '#F3F4F6', borderRadius: 8, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={18} color="#9CA3AF" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.deliveryLabel}>Ship to</Text>
                          <Text style={styles.addressText}>
                            {[
                              selectedOrder.shippingAddress?.street,
                              selectedOrder.shippingAddress?.barangay,
                              selectedOrder.shippingAddress?.city,
                              selectedOrder.shippingAddress?.province,
                              selectedOrder.shippingAddress?.postalCode
                            ].filter(Boolean).join(', ') || 'No address provided'}
                          </Text>
                          <Text style={styles.addressCountry}>Philippines</Text>

                          {(selectedOrder.shippingAddress?.phone || selectedOrder.customerPhone) && (
                            <View style={styles.contactContainer}>
                              <View style={styles.phoneRow}>
                                <Phone size={14} color="#9CA3AF" />
                                <Text style={styles.phoneText}>
                                  {selectedOrder.shippingAddress?.phone || selectedOrder.customerPhone}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Shipment Status / Dynamic based on status */}
                      <View style={styles.trackingContainer}>
                        {selectedOrder.status === 'completed' ? (
                          <View style={styles.shipmentPending}>
                            <View style={{ padding: 8, backgroundColor: '#D1FAE5', borderRadius: 8, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                              <CheckCircle size={18} color="#10B981" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.pendingTitle, { color: '#059669' }]}>Delivered Successfully</Text>
                              <Text style={styles.pendingText}>This order has been received by the customer.</Text>
                            </View>
                          </View>
                        ) : selectedOrder.status === 'shipped' ? (
                          <View>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                              <View style={{ padding: 8, backgroundColor: '#DBEAFE', borderRadius: 8, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                                <Truck size={18} color="#3B82F6" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.pendingTitle, { color: '#2563EB' }]}>In Transit</Text>
                                <Text style={styles.pendingText}>The package is currently with the courier for delivery.</Text>
                                {selectedOrder.trackingNumber && (
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                    <Text style={[styles.pendingText, { color: '#6B7280', flex: 0 }]}>Tracking Number:</Text>
                                    <Text style={{ fontWeight: '600', color: '#1F2937', fontSize: 14 }}>{selectedOrder.trackingNumber}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </View>
                        ) : selectedOrder.status === 'to-ship' ? (
                          <View style={styles.shipmentPending}>
                            <View style={{ padding: 8, backgroundColor: '#FFF5F0', borderRadius: 8, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                              <Package size={18} color="#FF5722" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.pendingTitle, { color: '#E44E1F' }]}>Preparing for Shipment</Text>
                              <Text style={styles.pendingText}>Please pack the items and prepare the shipping label.</Text>
                            </View>
                          </View>
                        ) : selectedOrder.status === 'cancelled' ? (
                          <View style={styles.shipmentPending}>
                            <View style={{ padding: 8, backgroundColor: '#FEE2E2', borderRadius: 8, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                              <XCircle size={18} color="#DC2626" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.pendingTitle, { color: '#DC2626' }]}>Shipment Cancelled</Text>
                              <Text style={styles.pendingText}>The order has been cancelled and will not be shipped.</Text>
                            </View>
                          </View>
                        ) : (
                          <View style={styles.shipmentPending}>
                            <View style={{ padding: 8, backgroundColor: '#FEF3C7', borderRadius: 8, height: 36, width: 36, alignItems: 'center', justifyContent: 'center' }}>
                              <RefreshCw size={18} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.pendingTitle, { color: '#B45309' }]}>Awaiting Confirmation</Text>
                              <Text style={styles.pendingText}>Please review and confirm the order to start processing.</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>


                </ScrollView>

                {/* Sticky Action Footer */}
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' ? (
                  <View style={styles.stickyFooter}>
                    {selectedOrder.status === 'pending' && (
                      <View style={styles.footerActionRow}>
                        <Pressable
                          style={[styles.footerButton, { backgroundColor: '#FF5722' }]}
                          onPress={() => handleStatusUpdate('to-ship')}
                        >
                          <Text style={styles.footerButtonText}>Confirm Order</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.footerButton, styles.footerButtonOutline]}
                          onPress={() => handleStatusUpdate('cancelled')}
                        >
                          <Text style={[styles.footerButtonText, { color: '#EF4444' }]}>Cancel</Text>
                        </Pressable>
                      </View>
                    )}
                    {selectedOrder.status === 'to-ship' && (
                      <View style={styles.footerActionRow}>
                        <Pressable
                          style={[styles.footerButton, { backgroundColor: '#FF5722' }]}
                          onPress={() => handleStatusUpdate('shipped')}
                        >
                          <Text style={styles.footerButtonText}>Ship Order</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.footerButton, styles.footerButtonOutline]}
                          onPress={() => handleStatusUpdate('cancelled')}
                        >
                          <Text style={[styles.footerButtonText, { color: '#EF4444' }]}>Cancel</Text>
                        </Pressable>
                      </View>
                    )}
                    {selectedOrder.status === 'shipped' && (
                      <View style={styles.footerActionRow}>
                        <Pressable
                          style={[styles.footerButton, { backgroundColor: '#10B981' }]}
                          onPress={() => handleStatusUpdate('completed')}
                        >
                          <Text style={styles.footerButtonText}>Mark as Delivered</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Tracking Number Input Modal */}
      <Modal
        visible={trackingModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setTrackingModalVisible(false)}
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptContent}>
            <View style={styles.promptHeader}>
              <Text style={styles.promptTitle}>Enter Tracking Number</Text>
              <Text style={styles.promptSubtitle}>Please provide the tracking details for this shipment.</Text>
            </View>

            <View style={styles.promptBody}>
              <TextInput
                style={styles.promptInput}
                value={trackingNumber}
                onChangeText={setTrackingNumber}
                placeholder="e.g. BAX-12345678"
                autoFocus
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.promptFooter}>
              <Pressable
                style={[styles.promptButton, styles.promptButtonOutline]}
                onPress={() => setTrackingModalVisible(false)}
              >
                <Text style={[styles.promptButtonText, { color: '#6B7280' }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.promptButton, styles.promptButtonPrimary]}
                onPress={handleTrackingSubmit}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.promptButtonText}>Confirm Shipment</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 20,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    padding: 4,
  },
  headerTitleContainer: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    fontWeight: '500',
  },
  notificationButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 5,
    marginRight: 0,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FF5722',
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
  },
  segmentedControl: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  // Header search
  searchBar: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
    marginBottom: 0,
    marginHorizontal: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  // Segmented + Filter Row
  segmentedControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 3,
    backgroundColor: '#FFFFFF',
  },
  segmentDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  filterWrapper: {
    position: 'relative',
  },
  filterDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FF5722',
    borderRadius: 10,
  },
  filterDropdownButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterDropdownMenu: {
    position: 'absolute',
    top: 48,
    right: 0,
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 1000,
  },
  filterDropdownItem: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  filterDropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterDropdownItemTextSelected: {
    color: '#FF5722',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 44,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 900,
  },
  segmentedScrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  segmentButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  segmentButtonActive: {
    backgroundColor: '#FF5722',
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  countBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  countBadgeTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 100,
  },
  ordersList: {
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  posNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  walkInBadge: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  walkInBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  onlineBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  thumbnailsScroll: {
    marginBottom: 16,
  },
  thumbnailContainer: {
    marginRight: 8,
    position: 'relative',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
  },
  quantityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  quantityText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  totalLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF5722',
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Channel filter tabs
  channelFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  channelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  channelTabActive: {
    backgroundColor: '#FF5722',
  },
  channelTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  channelTabTextActive: {
    color: '#FFFFFF',
  },
  channelBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  channelBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  channelBadgeTextActive: {
    color: '#FFFFFF',
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  editModalBody: {
    padding: 20,
  },
  editSection: {
    marginBottom: 20,
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  editLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  editValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    maxWidth: '60%',
    textAlign: 'right',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  editItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  editItemInfo: {
    flex: 1,
  },
  editItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  editItemDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  editItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5722',
  },
  editTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  editTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  editTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF5722',
  },
  currentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  currentStatusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusActionsGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  statusActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  statusActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finalStatusBadge: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finalStatusText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  finalStatusSubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  viewDetailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  // Edit toggle button
  editToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  editToggleButtonActive: {
    backgroundColor: '#6B7280',
    borderColor: '#6B7280',
  },
  editToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
  editToggleTextActive: {
    color: '#FFFFFF',
  },
  // Edit input styles
  editInputGroup: {
    marginBottom: 16,
  },
  editInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  // Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // New Styles for Detailed View
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    overflow: 'hidden',
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000ff',
  },
  detailCardContent: {
    padding: 16,
  },
  customerNameLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerEmailText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  customerPhoneText: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 4,
  },
  addressCountry: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 12,
  },
  contactContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phoneText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  trackingContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  shipmentPending: {
    flexDirection: 'row',
    gap: 12,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 2,
  },
  pendingText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  // Modal Hero Header
  modalHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginTop: 4,
  },
  modalOrderId: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 2,
  },
  modalOrderDate: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Summary Items
  summaryItemRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  summaryItemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  summaryItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
    lineHeight: 20,
  },
  summaryItemVariant: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  summaryItemQty: {
    fontSize: 12,
    color: '#6B7280',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },

  // Breakdown
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  totalLabelLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalValueLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF5722',
  },

  // Sticky Footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
    paddingBottom: 20, // Extra padding for safety
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  footerButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EF4444',
    shadowOpacity: 0.05,
  },
  footerButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Prompt Modal Styles
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  promptContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  promptHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  promptIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  promptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  promptSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  promptBody: {
    marginBottom: 24,
  },
  promptInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  promptFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  promptButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promptButtonPrimary: {
    backgroundColor: '#FF5722',
  },
  promptButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  promptButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
