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
import { Package, ShoppingCart, Bell, X, Search, ChevronDown, Menu, RefreshCw, Eye, Truck, CheckCircle, XCircle, MapPin, User, Phone, FileText, Download } from 'lucide-react-native';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { useReturnStore } from '../../../src/stores/returnStore';
import SellerDrawer from '../../../src/components/SellerDrawer';
import OrderDetailsModal from '../../../src/components/seller/OrderDetailsModal';
import TrackingModal from '../../../src/components/seller/TrackingModal';
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
  const [statusDropdownVisible, setStatusDropdownVisible] = useState(false);

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

  // Status counts for dropdown - Refined to reflect selected channel
  const orderCounts = {
    all: channelFilter === 'all' ? orders.length :
      channelFilter === 'pos' ? orders.filter(o => o.type === 'OFFLINE').length :
        orders.filter(o => o.type === 'ONLINE' || !o.type).length,
    pending: channelFilter === 'all' ? orders.filter(o => o.status === 'pending').length :
      channelFilter === 'pos' ? orders.filter(o => o.status === 'pending' && o.type === 'OFFLINE').length :
        orders.filter(o => o.status === 'pending' && (o.type === 'ONLINE' || !o.type)).length,
    'to-ship': channelFilter === 'all' ? orders.filter(o => o.status === 'to-ship').length :
      channelFilter === 'pos' ? orders.filter(o => o.status === 'to-ship' && o.type === 'OFFLINE').length :
        orders.filter(o => o.status === 'to-ship' && (o.type === 'ONLINE' || !o.type)).length,
    shipped: channelFilter === 'all' ? orders.filter(o => o.status === 'shipped').length :
      channelFilter === 'pos' ? orders.filter(o => o.status === 'shipped' && o.type === 'OFFLINE').length :
        orders.filter(o => o.status === 'shipped' && (o.type === 'ONLINE' || !o.type)).length,
    completed: channelFilter === 'all' ? orders.filter(o => o.status === 'completed').length :
      channelFilter === 'pos' ? orders.filter(o => o.status === 'completed' && o.type === 'OFFLINE').length :
        orders.filter(o => o.status === 'completed' && (o.type === 'ONLINE' || !o.type)).length,
    cancelled: channelFilter === 'all' ? orders.filter(o => o.status === 'cancelled').length :
      channelFilter === 'pos' ? orders.filter(o => o.status === 'cancelled' && o.type === 'OFFLINE').length :
        orders.filter(o => o.status === 'cancelled' && (o.type === 'ONLINE' || !o.type)).length,
    returns: channelFilter === 'pos' ? 0 : pendingReturnRequests.length,
    refunds: channelFilter === 'pos' ? 0 : refundRequests.length,
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
      {statusDropdownVisible && (
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setStatusDropdownVisible(false)}
        />
      )}
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

      <View style={styles.channelFilterRow}>
        <Pressable
          style={[styles.channelTab, channelFilter === 'all' && styles.channelTabActive]}
          onPress={() => setChannelFilter('all')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'all' && styles.channelTabTextActive]}>
            All Channels
          </Text>
        </Pressable>
        <View style={styles.channelSeparator} />
        <Pressable
          style={[styles.channelTab, channelFilter === 'online' && styles.channelTabActive]}
          onPress={() => setChannelFilter('online')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'online' && styles.channelTabTextActive]}>
            Online App
          </Text>
        </Pressable>
        <View style={styles.channelSeparator} />
        <Pressable
          style={[styles.channelTab, channelFilter === 'pos' && styles.channelTabActive]}
          onPress={() => setChannelFilter('pos')}
        >
          <Text style={[styles.channelTabText, channelFilter === 'pos' && styles.channelTabTextActive]}>
            POS / Offline
          </Text>
        </Pressable>
      </View>

      {/* Status Dropdown */}
      <View style={[styles.segmentedControlRow, { zIndex: 1000 }]}>
        <View style={styles.filterActionRow}>
          <Pressable
            style={styles.statusDropdownTrigger}
            onPress={() => setStatusDropdownVisible(!statusDropdownVisible)}
          >
            <View style={styles.statusDropdownLeft}>
              <Text style={styles.statusDropdownLabel}>
                {selectedTab === 'all' ? 'All Orders' :
                  selectedTab === 'to-ship' ? 'To Ship' :
                    selectedTab.charAt(0).toUpperCase() + selectedTab.slice(1).replace('-', ' ')}
              </Text>
              <View style={styles.statusCountBadge}>
                <Text style={styles.statusCountText}>({orderCounts[selectedTab]})</Text>
              </View>
            </View>
            <ChevronDown size={18} color="#6B7280" />
          </Pressable>

          <Pressable
            style={styles.exportButton}
            onPress={() => {/* Export Logic */ }}
          >
            <Download size={18} color="#FF5722" strokeWidth={2.5} />
            <Text style={styles.exportButtonText}>Export</Text>
          </Pressable>
        </View>

        {statusDropdownVisible && (
          <View style={styles.statusDropdownMenu}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              {(['all', 'pending', 'to-ship', 'shipped', 'completed', 'cancelled', 'returns', 'refunds'] as OrderStatus[]).map((tab) => (
                <Pressable
                  key={tab}
                  style={[
                    styles.statusOptionItem,
                    selectedTab === tab && styles.statusOptionItemActive
                  ]}
                  onPress={() => {
                    setSelectedTab(tab);
                    setStatusDropdownVisible(false);
                  }}
                >
                  <Text style={[
                    styles.statusOptionLabel,
                    selectedTab === tab && styles.statusOptionLabelActive
                  ]}>
                    {tab === 'all' ? 'All Orders' :
                      tab === 'to-ship' ? 'To Ship' :
                        tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                  </Text>
                  <Text style={[
                    styles.statusOptionBadgeText,
                    selectedTab === tab && styles.statusOptionBadgeTextActive
                  ]}>
                    ({orderCounts[tab]})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
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
                    <Text style={styles.customerName}>
                      {String(order.customerName || 'Walk-in')}{' '}
                      <Text style={styles.orderDateLight}>
                        | {new Date(order.createdAt).toLocaleDateString('en-US', {
                          month: 'long', day: 'numeric', year: 'numeric'
                        })}
                      </Text>
                    </Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
                    <Text style={styles.viewDetailsText}>View details</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <OrderDetailsModal
        visible={editModalVisible}
        order={selectedOrder}
        onClose={closeEditModal}
        onStatusUpdate={handleStatusUpdate}
      />

      <TrackingModal
        visible={trackingModalVisible}
        onClose={() => setTrackingModalVisible(false)}
        trackingNumber={trackingNumber}
        setTrackingNumber={setTrackingNumber}
        onSubmit={handleTrackingSubmit}
        isUpdating={isUpdating}
      />

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
    paddingHorizontal: 20,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  filterActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDropdownTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDropdownLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statusCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5722',
  },
  // Status Modal Styles
  statusDropdownMenu: {
    position: 'absolute',
    top: 50,
    left: 20, // Align exactly with the left padding of segmentedControlRow
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    zIndex: 2000,
    maxHeight: 400,
  },
  statusModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: 280,
    marginTop: 180, // Estimated position below filter bar
    marginLeft: 20,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statusModalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  statusOptionsList: {
    padding: 8,
  },
  statusOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  statusOptionItemActive: {
    backgroundColor: '#FFF5F0',
  },
  statusOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
  statusOptionLabelActive: {
    color: '#FF5722',
    fontWeight: '700',
  },
  statusOptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusOptionBadgeActive: {
  },
  statusOptionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  statusOptionBadgeTextActive: {
    color: '#FF5722',
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
    top: -100, // Cover the header area too
    left: 0,
    right: 0,
    bottom: 0,
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 2,
  },
  customerEmail: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  orderDateLight: {
    fontWeight: '400',
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
    color: '#5c5e60ff',
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  channelTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  channelSeparator: {
    width: 1,
    height: 14,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  channelTabActive: {
  },
  channelTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  channelTabTextActive: {
    color: '#FF5722',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
  },
  viewDetailsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    color: '#73767cff',
    fontWeight: '500',
  },
});
