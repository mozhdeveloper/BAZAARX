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
import { Package, ShoppingCart, Bell, X, Search, ChevronDown, ChevronUp, Menu, RefreshCw, CreditCard, Calendar, Truck, CheckCircle, Clock } from 'lucide-react-native';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { useOrderStore } from '../../../src/stores/orderStore';
import { useReturnStore } from '../../../src/stores/returnStore';
import SellerDrawer from '../../../src/components/SellerDrawer';

type OrderStatus = 'all' | 'pending' | 'to-ship' | 'completed' | 'returns' | 'refunds';
type ChannelFilter = 'all' | 'online' | 'pos';

export default function SellerOrdersScreen() {
  // Use orderStore for orders, sellerStore for seller profile only
  const { sellerOrders: orders, updateSellerOrderStatus: updateOrderStatus, fetchSellerOrders: fetchOrders, sellerOrdersLoading: ordersLoading } = useOrderStore();
  const { seller } = useSellerStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

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
  const returnRequests = getReturnRequestsBySeller(seller.storeName);
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
    completed: orders.filter(o => o.status === 'completed').length,
    returns: pendingReturnRequests.length,
    refunds: refundRequests.length,
  };

  // Dashboard Stats
  const dashboardStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    delivered: orders.filter(o => o.status === 'completed').length,
    posToday: orders.filter(o => {
      const isToday = new Date(o.createdAt).toDateString() === new Date().toDateString();
      return o.type === 'OFFLINE' && isToday;
    }).length,
  };

  const filteredOrders = orders.filter((order) => {
    const matchesTab =
      selectedTab === 'all'
        ? true
        : selectedTab === 'pending' || selectedTab === 'to-ship' || selectedTab === 'completed'
        ? order.status === selectedTab
        : true;
    
    // Channel filter
    const matchesChannel = 
      channelFilter === 'all' ? true : 
      channelFilter === 'pos' ? order.type === 'OFFLINE' : 
      (order.type === 'ONLINE' || !order.type);
    
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ? true : (
      (order.orderId && order.orderId.toLowerCase().includes(q)) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerEmail && order.customerEmail.toLowerCase().includes(q))
    );

    return matchesTab && matchesChannel && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10B981';
      case 'to-ship':
        return '#FF5722';
      case 'pending':
        return '#FBBF24';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#D1FAE5';
      case 'to-ship':
        return '#FFF5F0';
      case 'pending':
        return '#FEF3C7';
      default:
        return '#F3F4F6';
    }
  };

  const getActionButton = (order: any) => {
    switch (order.status) {
      case 'pending':
        return (
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#FF5722' }]}
            onPress={() => updateOrderStatus(order.orderId, 'to-ship')}
          >
            <Text style={styles.actionButtonText}>Arrange Shipment</Text>
          </Pressable>
        );
      case 'to-ship':
        return (
          <Pressable
            style={[styles.actionButton, { backgroundColor: '#10B981' }]}
            onPress={() => updateOrderStatus(order.orderId, 'completed')}
          >
            <Text style={styles.actionButtonText}>Mark Shipped</Text>
          </Pressable>
        );
      case 'completed':
        return (
          <View style={[styles.actionButton, { backgroundColor: '#E5E7EB' }]}>
            <Text style={[styles.actionButtonText, { color: '#6B7280' }]}>
              Completed
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  // Helper to render the modal
  const renderOrderDetailsModal = () => {
    if (!selectedOrder) return null;

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedOrder}
        onRequestClose={() => setSelectedOrder(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Order Details</Text>
                <Text style={styles.modalSubtitle}>ID: {selectedOrder.orderId}</Text>
              </View>
              <Pressable onPress={() => setSelectedOrder(null)} style={styles.closeButton}>
                <X size={24} color="#1F2937" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
              {/* Status Section */}
              <View style={styles.modalSection}>
                <View style={[styles.statusBadge, { alignSelf: 'flex-start', backgroundColor: getStatusBgColor(selectedOrder.status), marginBottom: 16 }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(selectedOrder.status) }]}>
                    {selectedOrder.status.toUpperCase()}
                  </Text>
                </View>

                {/* Customer Info */}
                <Text style={styles.sectionTitle}>Customer Information</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{selectedOrder.customerName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{selectedOrder.customerEmail || 'N/A'}</Text>
                </View>
                {selectedOrder.posNote && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Note:</Text>
                    <Text style={styles.infoValue}>{selectedOrder.posNote}</Text>
                  </View>
                )}
              </View>

              {/* Items Section */}
              <View style={styles.modalSection}>
                 <Text style={styles.sectionTitle}>Items ({Array.isArray(selectedOrder.items) ? selectedOrder.items.length : 0})</Text>
                 {Array.isArray(selectedOrder.items) && selectedOrder.items.map((item: any, index: number) => (
                   <View key={index} style={styles.modalItemRow}>
                      <Image source={{ uri: item.image }} style={styles.modalItemImage} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalItemName} numberOfLines={2}>{item.name}</Text>
                        <Text style={styles.modalItemVariant}>{item.variant || 'Standard'}</Text>
                        <View style={styles.modalItemPriceRow}>
                           <Text style={styles.modalItemQuantity}>x{item.quantity}</Text>
                           <Text style={styles.modalItemPrice}>₱{(item.price || 0).toLocaleString()}</Text>
                        </View>
                      </View>
                   </View>
                 ))}
              </View>

              {/* Payment Section */}
              <View style={styles.modalSection}>
                <Text style={styles.sectionTitle}>Payment Details</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>₱{(selectedOrder.total || 0).toLocaleString()}</Text>
                </View>
                 {/* Assuming shipping is included or 0 for now as it's not explicitly in the type showing in snippet, 
                     but logically it should be there. Using total as subtotal for now if no breakdown exists. */}
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.modalTotalLabel}>Total Amount</Text>
                  <Text style={styles.totalAmountText}>₱{(selectedOrder.total || 0).toLocaleString()}</Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
               {getActionButton(selectedOrder)}
               <Pressable 
                  style={[styles.closeModalButton]} 
                  onPress={() => setSelectedOrder(null)}
                >
                  <Text style={styles.closeModalButtonText}>Close</Text>
               </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

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

        {/* Stats Dashboard Removed - Moved to Bottom */}

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
              ['all', 'pending', 'to-ship', 'completed', 'returns', 'refunds'] as OrderStatus[]
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
              <Pressable key={order.id} style={styles.orderCard} onPress={() => setSelectedOrder(order)}>
                <View style={styles.orderHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{ flexShrink: 1 }}>
                        <Text
                          style={styles.orderId}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {order.orderId}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 8 }}>
                        {order.type === 'OFFLINE' ? (
                          <View style={styles.walkInBadge}>
                            <Text style={styles.walkInBadgeText}>POS</Text>
                          </View>
                        ) : (
                          <View style={styles.onlineBadge}>
                            <Text style={styles.onlineBadgeText}>Online</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    
                    {/* Date & Customer */}
                    <Text style={styles.orderDate}>
                      {new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                    <Text style={styles.customerName}>{order.customerName}</Text>
                    {order.posNote ? (
                      <Text style={styles.posNote} numberOfLines={1}>
                        Note: {order.posNote}
                      </Text>
                    ) : (
                      <Text style={styles.customerEmail} numberOfLines={1}>
                        {order.customerEmail}
                      </Text>
                    )}
                  </View>
                  <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getStatusBgColor(order.status) },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(order.status) },
                        ]}
                      >
                        {order.status.replace('-', ' ').toUpperCase()}
                      </Text>
                    </View>

                    {/* Payment Status Badge */}
                    {/* <View
                      style={[
                        styles.statusBadge,
                        { 
                          backgroundColor: 
                            order.paymentStatus === 'paid' ? '#DCFCE7' : 
                            order.paymentStatus === 'refunded' ? '#FEE2E2' : '#FEF9C3' 
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { 
                            color: 
                              order.paymentStatus === 'paid' ? '#16A34A' : 
                              order.paymentStatus === 'refunded' ? '#DC2626' : '#CA8A04' 
                          },
                        ]}
                      >
                        {order.paymentStatus?.toUpperCase() || 'PENDING'}
                      </Text>
                    </View> */}
                  </View>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.thumbnailsScroll}
                >
                  {order.items.map((item, index) => (
                    <View key={index} style={styles.thumbnailContainer}>
                      <Image source={{ uri: item.image }} style={styles.thumbnail} />
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
                      ₱{order.total.toLocaleString()}
                    </Text>
                  </View>
                  {getActionButton(order)}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Collapsible Stats */}
      <Pressable 
        style={[styles.bottomStatsContainer, { paddingBottom: 12 }]} 
        onPress={() => setStatsExpanded(!statsExpanded)}
      >
        <View style={styles.bottomStatsHeader}>
          <View style={styles.bottomStatsSummary}>
            <Text style={styles.bottomStatsTitle}>Orders Summary</Text>
            <View style={styles.bottomStatsRow}>
              <Text style={styles.bottomStatsText}>
                Total: <Text style={styles.bottomStatsValue}>{dashboardStats.total}</Text>
              </Text>
              <View style={styles.bottomStatsDot} />
              <Text style={styles.bottomStatsText}>
                Pending: <Text style={[styles.bottomStatsValue, { color: '#D97706' }]}>{dashboardStats.pending}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.chevronContainer}>
            {statsExpanded ? (
              <ChevronDown size={20} color="#6B7280" />
            ) : (
              <ChevronUp size={20} color="#6B7280" />
            )}
          </View>
        </View>

        {statsExpanded && (
          <View style={styles.expandedStats}>
            {/* Row 1: Total */}
            <View style={styles.statRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <ShoppingCart size={16} color="#6B7280" />
                 <Text style={styles.statRowLabel}>Total Orders</Text>
              </View>
              <Text style={styles.statRowValue}>{dashboardStats.total}</Text>
            </View>

            {/* Row 2: Pending */}
            <View style={styles.statRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <Clock size={16} color="#CA8A04" />
                 <Text style={styles.statRowLabel}>Pending</Text>
              </View>
              <Text style={[styles.statRowValue, { color: '#CA8A04' }]}>{dashboardStats.pending}</Text>
            </View>

            {/* Row 3: Delivered */}
            <View style={styles.statRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <CheckCircle size={16} color="#16A34A" />
                 <Text style={styles.statRowLabel}>Delivered</Text>
              </View>
              <Text style={[styles.statRowValue, { color: '#16A34A' }]}>{dashboardStats.delivered}</Text>
            </View>

            {/* Row 4: POS */}
            <View style={[styles.statRow, { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <CreditCard size={16} color="#9333EA" />
                 <Text style={styles.statRowLabel}>POS Today</Text>
              </View>
              <Text style={[styles.statRowValue, { color: '#9333EA' }]}>{dashboardStats.posToday}</Text>
            </View>
          </View>
        )}
      </Pressable>
      {renderOrderDetailsModal()}
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
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderBottomLeftRadius: 24, 
    borderBottomRightRadius: 24,
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
  // Stats Dashboard
  statsScrollContent: {
    paddingTop: 16,
    gap: 12,
    paddingRight: 20,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    paddingRight: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  // Bottom Stats
  bottomStatsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomStatsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomStatsSummary: {
    flex: 1,
  },
  bottomStatsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bottomStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomStatsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  bottomStatsValue: {
    fontWeight: '700',
    color: '#1F2937',
  },
  bottomStatsDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  expandedStats: {
    paddingTop: 12,
    gap: 0,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statRowLabel: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  statRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  chevronContainer: {
    padding: 4,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  modalContent: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 60,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  modalItemRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  modalItemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  modalItemVariant: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalItemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemQuantity: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF5722',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '600',
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  totalAmountText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF5722',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
    gap: 12,
  },
  closeModalButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  closeModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
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
    marginTop: 8, // Add space from header overlap if needed, but here it's below
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
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
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
});
