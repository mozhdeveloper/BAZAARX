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
import { Package, ShoppingCart, Bell, X, Search, ChevronDown, Menu, RefreshCw, Edit3, Eye, Truck, CheckCircle, XCircle } from 'lucide-react-native';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { useReturnStore } from '../../../src/stores/returnStore';
import SellerDrawer from '../../../src/components/SellerDrawer';

type OrderStatus = 'all' | 'pending' | 'to-ship' | 'completed' | 'cancelled' | 'returns' | 'refunds';
type ChannelFilter = 'all' | 'online' | 'pos';

export default function SellerOrdersScreen() {
  const { orders = [], updateOrderStatus, seller, fetchOrders, ordersLoading } = useSellerStore();
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedCustomerName, setEditedCustomerName] = useState('');
  const [editedCustomerEmail, setEditedCustomerEmail] = useState('');
  const [editedNote, setEditedNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Open edit modal
  const openEditModal = (order: any) => {
    console.log('[Orders] Opening edit modal for order:', {
      orderId: order.orderId,
      status: order.status,
      customerName: order.customerName,
    });
    setSelectedOrder(order);
    setEditedCustomerName(order.customerName || '');
    setEditedCustomerEmail(order.customerEmail || '');
    setEditedNote(order.posNote || '');
    setIsEditing(false);
    setEditModalVisible(true);
  };

  // Close edit modal
  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedOrder(null);
    setIsEditing(false);
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Cancel editing - reset values
      setEditedCustomerName(selectedOrder?.customerName || '');
      setEditedCustomerEmail(selectedOrder?.customerEmail || '');
      setEditedNote(selectedOrder?.posNote || '');
    }
    setIsEditing(!isEditing);
  };

  // Save edited order details to database
  const handleSaveOrderDetails = async () => {
    if (!selectedOrder) return;
    
    setIsSaving(true);
    try {
      // Import supabase directly for the update
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Update order in database
      const { error } = await supabase
        .from('orders')
        .update({
          buyer_name: editedCustomerName,
          buyer_email: editedCustomerEmail,
          notes: editedNote,
        })
        .eq('id', selectedOrder.id);
      
      if (error) {
        console.error('[Orders] Failed to update order:', error);
        alert('Failed to save changes. Please try again.');
        return;
      }
      
      console.log('[Orders] ✅ Order details updated in database');
      
      // Update local state
      setSelectedOrder({
        ...selectedOrder,
        customerName: editedCustomerName,
        customerEmail: editedCustomerEmail,
        posNote: editedNote,
      });
      
      // Refresh orders list
      await fetchOrders(seller?.id);
      
      setIsEditing(false);
      alert('Order details saved successfully!');
    } catch (error) {
      console.error('[Orders] Error saving order:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle status update from modal
  const handleStatusUpdate = async (newStatus: 'pending' | 'to-ship' | 'completed' | 'cancelled') => {
    if (selectedOrder) {
      console.log(`[Orders] Updating order ${selectedOrder.orderId} from ${selectedOrder.status} to ${newStatus}`);
      await updateOrderStatus(selectedOrder.orderId, newStatus);
      // Update local selected order state
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      // Refresh orders
      await fetchOrders(seller?.id);
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
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    returns: pendingReturnRequests.length,
    refunds: refundRequests.length,
  };

  const filteredOrders = orders.filter((order) => {
    const matchesTab =
      selectedTab === 'all'
        ? true
        : selectedTab === 'pending' || selectedTab === 'to-ship' || selectedTab === 'completed' || selectedTab === 'cancelled'
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
              ['all', 'pending', 'to-ship', 'completed', 'cancelled', 'returns', 'refunds'] as OrderStatus[]
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
                          {order.orderId}
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
              <Text style={styles.editModalTitle}>
                {isEditing ? 'Edit Order' : 'Order Details'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {selectedOrder?.status !== 'completed' && selectedOrder?.status !== 'cancelled' && (
                  <Pressable 
                    onPress={toggleEditMode} 
                    style={[
                      styles.editToggleButton,
                      isEditing && styles.editToggleButtonActive
                    ]}
                  >
                    <Edit3 size={18} color={isEditing ? '#FFFFFF' : '#FF5722'} />
                    <Text style={[
                      styles.editToggleText,
                      isEditing && styles.editToggleTextActive
                    ]}>
                      {isEditing ? 'Cancel' : 'Edit'}
                    </Text>
                  </Pressable>
                )}
                <Pressable onPress={closeEditModal} style={styles.closeButton}>
                  <X size={24} color="#6B7280" />
                </Pressable>
              </View>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.editModalBody} showsVerticalScrollIndicator={false}>
                {/* Order ID and Type */}
                <View style={styles.editSection}>
                  <Text style={styles.editSectionTitle}>Order Information</Text>
                  <View style={styles.editInfoRow}>
                    <Text style={styles.editLabel}>Order ID</Text>
                    <Text style={styles.editValue}>{selectedOrder.orderId}</Text>
                  </View>
                  <View style={styles.editInfoRow}>
                    <Text style={styles.editLabel}>Type</Text>
                    <View style={[
                      styles.typeBadge,
                      { backgroundColor: selectedOrder.type === 'OFFLINE' ? '#FEF3C7' : '#DBEAFE' }
                    ]}>
                      <Text style={[
                        styles.typeBadgeText,
                        { color: selectedOrder.type === 'OFFLINE' ? '#D97706' : '#2563EB' }
                      ]}>
                        {selectedOrder.type === 'OFFLINE' ? 'Walk-in / POS' : 'Online Order'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.editInfoRow}>
                    <Text style={styles.editLabel}>Date</Text>
                    <Text style={styles.editValue}>
                      {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                </View>

                {/* Customer Info - Editable */}
                <View style={styles.editSection}>
                  <Text style={styles.editSectionTitle}>Customer</Text>
                  {isEditing ? (
                    <>
                      <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>Customer Name</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedCustomerName}
                          onChangeText={setEditedCustomerName}
                          placeholder="Enter customer name"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>Email</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editedCustomerEmail}
                          onChangeText={setEditedCustomerEmail}
                          placeholder="Enter email"
                          placeholderTextColor="#9CA3AF"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>Order Note</Text>
                        <TextInput
                          style={[styles.editInput, { height: 80, textAlignVertical: 'top' }]}
                          value={editedNote}
                          onChangeText={setEditedNote}
                          placeholder="Add a note for this order"
                          placeholderTextColor="#9CA3AF"
                          multiline
                          numberOfLines={3}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.editInfoRow}>
                        <Text style={styles.editLabel}>Name</Text>
                        <Text style={styles.editValue}>{selectedOrder.customerName}</Text>
                      </View>
                      <View style={styles.editInfoRow}>
                        <Text style={styles.editLabel}>Email</Text>
                        <Text style={styles.editValue}>{selectedOrder.customerEmail || 'N/A'}</Text>
                      </View>
                      {selectedOrder.posNote && (
                        <View style={styles.editInfoRow}>
                          <Text style={styles.editLabel}>Note</Text>
                          <Text style={styles.editValue}>{selectedOrder.posNote}</Text>
                        </View>
                      )}
                    </>
                  )}
                </View>

                {/* Save Button when editing */}
                {isEditing && (
                  <Pressable
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSaveOrderDetails}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <CheckCircle size={20} color="#FFFFFF" />
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                      </>
                    )}
                  </Pressable>
                )}

                {/* Order Items */}
                <View style={styles.editSection}>
                  <Text style={styles.editSectionTitle}>Items ({selectedOrder.items.length})</Text>
                  {selectedOrder.items.map((item: any, index: number) => (
                    <View key={index} style={styles.editItemRow}>
                      <Image source={{ uri: item.image }} style={styles.editItemImage} />
                      <View style={styles.editItemInfo}>
                        <Text style={styles.editItemName} numberOfLines={2}>{item.productName}</Text>
                        <Text style={styles.editItemDetails}>
                          {item.selectedColor && `Color: ${item.selectedColor}`}
                          {item.selectedColor && item.selectedSize && ' | '}
                          {item.selectedSize && `Size: ${item.selectedSize}`}
                        </Text>
                        <Text style={styles.editItemPrice}>
                          ₱{item.price.toLocaleString()} × {item.quantity}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.editSection}>
                  <View style={styles.editTotalRow}>
                    <Text style={styles.editTotalLabel}>Total Amount</Text>
                    <Text style={styles.editTotalValue}>₱{selectedOrder.total.toLocaleString()}</Text>
                  </View>
                </View>

                {/* Current Status */}
                <View style={styles.editSection}>
                  <Text style={styles.editSectionTitle}>Current Status</Text>
                  <View style={[
                    styles.currentStatusBadge,
                    { backgroundColor: getStatusBgColor(selectedOrder.status) }
                  ]}>
                    <Text style={[
                      styles.currentStatusText,
                      { color: getStatusColor(selectedOrder.status) }
                    ]}>
                      {selectedOrder.status.replace('-', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Update Status Actions */}
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' ? (
                  <View style={styles.editSection}>
                    <Text style={styles.editSectionTitle}>Update Status</Text>
                    <View style={styles.statusActionsGrid}>
                      {selectedOrder.status === 'pending' && (
                        <>
                          <Pressable
                            style={[styles.statusActionButton, { backgroundColor: '#FF5722' }]}
                            onPress={() => handleStatusUpdate('to-ship')}
                          >
                            <Truck size={20} color="#FFFFFF" />
                            <Text style={styles.statusActionText}>Mark as To Ship</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.statusActionButton, { backgroundColor: '#EF4444' }]}
                            onPress={() => handleStatusUpdate('cancelled')}
                          >
                            <XCircle size={20} color="#FFFFFF" />
                            <Text style={styles.statusActionText}>Cancel Order</Text>
                          </Pressable>
                        </>
                      )}
                      {selectedOrder.status === 'to-ship' && (
                        <>
                          <Pressable
                            style={[styles.statusActionButton, { backgroundColor: '#10B981' }]}
                            onPress={() => handleStatusUpdate('completed')}
                          >
                            <CheckCircle size={20} color="#FFFFFF" />
                            <Text style={styles.statusActionText}>Mark as Delivered</Text>
                          </Pressable>
                          <Pressable
                            style={[styles.statusActionButton, { backgroundColor: '#EF4444' }]}
                            onPress={() => handleStatusUpdate('cancelled')}
                          >
                            <XCircle size={20} color="#FFFFFF" />
                            <Text style={styles.statusActionText}>Cancel Order</Text>
                          </Pressable>
                        </>
                      )}
                    </View>
                  </View>
                ) : (
                  <View style={styles.editSection}>
                    <Text style={styles.editSectionTitle}>Order Status</Text>
                    <View style={[styles.finalStatusBadge, { 
                      backgroundColor: selectedOrder.status === 'completed' ? '#D1FAE5' : '#FEE2E2' 
                    }]}>
                      <Text style={[styles.finalStatusText, { 
                        color: selectedOrder.status === 'completed' ? '#10B981' : '#EF4444' 
                      }]}>
                        {selectedOrder.status === 'completed' ? '✓ Order Completed' : '✗ Order Cancelled'}
                      </Text>
                      <Text style={styles.finalStatusSubtext}>
                        {selectedOrder.status === 'completed' 
                          ? 'This order has been successfully delivered' 
                          : 'This order has been cancelled'}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={{ height: 20 }} />
              </ScrollView>
            )}
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
});
