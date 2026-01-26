import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Package, ShoppingCart, Bell, X, Search, ChevronDown, Menu } from 'lucide-react-native';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { useReturnStore } from '../../../src/stores/returnStore';
import SellerDrawer from '../../../src/components/SellerDrawer';

type OrderStatus = 'all' | 'pending' | 'to-ship' | 'completed' | 'returns' | 'refunds';

export default function SellerOrdersScreen() {
  const { orders, updateOrderStatus, seller } = useSellerStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<OrderStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [walkFilter, setWalkFilter] = useState<'all' | 'walkin' | 'online'>('all');
  const [isWalkFilterOpen, setIsWalkFilterOpen] = useState(false);

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

  const orderCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    'to-ship': orders.filter(o => o.status === 'to-ship').length,
    completed: orders.filter(o => o.status === 'completed').length,
    returns: pendingReturnRequests.length,
    refunds: refundRequests.length,
  };

  const filteredOrders = orders.filter((order) => {
    const matchesTab =
      selectedTab === 'all'
        ? true
        : selectedTab === 'pending' || selectedTab === 'to-ship' || selectedTab === 'completed'
        ? order.status === selectedTab
        : true;
    const matchesWalk = walkFilter === 'all' ? true : (walkFilter === 'walkin' ? order.type === 'OFFLINE' : order.type === 'ONLINE');
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ? true : (
      (order.orderId && order.orderId.toLowerCase().includes(q)) ||
      (order.customerName && order.customerName.toLowerCase().includes(q)) ||
      (order.customerEmail && order.customerEmail.toLowerCase().includes(q))
    );

    return matchesTab && matchesWalk && matchesSearch;
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

        <View style={styles.segmentDivider} />

        <View style={styles.filterWrapper}>
          <Pressable
            style={styles.filterDropdownButton}
            onPress={() => setIsWalkFilterOpen((p) => !p)}
          >
            <Text style={styles.filterDropdownButtonText}>
              {walkFilter === 'all' ? 'All' : walkFilter === 'walkin' ? 'Walk-in' : 'Online'}
            </Text>
            <ChevronDown size={16} color="#FFFFFF" />
          </Pressable>

          {isWalkFilterOpen && (
            <>
              <Pressable style={styles.dropdownOverlay} onPress={() => setIsWalkFilterOpen(false)} />
              <View style={styles.filterDropdownMenu}>
                <Pressable
                  style={styles.filterDropdownItem}
                  onPress={() => { setWalkFilter('all'); setIsWalkFilterOpen(false); }}
                >
                  <Text style={[styles.filterDropdownItemText, walkFilter === 'all' && styles.filterDropdownItemTextSelected]}>All</Text>
                </Pressable>
                <Pressable
                  style={styles.filterDropdownItem}
                  onPress={() => { setWalkFilter('walkin'); setIsWalkFilterOpen(false); }}
                >
                  <Text style={[styles.filterDropdownItemText, walkFilter === 'walkin' && styles.filterDropdownItemTextSelected]}>Walk-in</Text>
                </Pressable>
                <Pressable
                  style={styles.filterDropdownItem}
                  onPress={() => { setWalkFilter('online'); setIsWalkFilterOpen(false); }}
                >
                  <Text style={[styles.filterDropdownItemText, walkFilter === 'online' && styles.filterDropdownItemTextSelected]}>Online</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {isReturnTab ? (
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
              <View key={order.id} style={styles.orderCard}>
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
                      {order.status.replace('-', ' ').toUpperCase()}
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
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
});
