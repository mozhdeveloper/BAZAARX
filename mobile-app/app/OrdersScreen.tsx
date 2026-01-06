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
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Package, Clock, Filter, X } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOrderStore } from '../src/stores/orderStore';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Order } from '../src/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Orders'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function OrdersScreen({ navigation, route }: Props) {
  const [activeTab, setActiveTab] = useState<'active' | 'toReceive' | 'history'>('toReceive');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<Order['status'] | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');
  const { getActiveOrders, getCompletedOrders, updateOrderStatus } = useOrderStore();
  const insets = useSafeAreaInsets();

  // Check for initialTab from navigation params
  React.useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab as 'active' | 'toReceive' | 'history');
    }
  }, [route.params]);

  const activeOrders = getActiveOrders();
  const completedOrders = getCompletedOrders();

  // Get orders for each tab
  const toReceiveOrders = activeOrders.filter(order => order.status === 'shipped');
  const activeTabOrders = activeOrders.filter(order => order.status !== 'shipped');
  
  // Filter and search logic
  const filteredOrders = useMemo(() => {
    let baseOrders: Order[] = [];
    
    if (activeTab === 'active') {
      baseOrders = activeTabOrders;
    } else if (activeTab === 'toReceive') {
      baseOrders = toReceiveOrders;
    } else {
      baseOrders = completedOrders;
    }
    
    // Apply status filter
    if (selectedStatus !== 'all') {
      baseOrders = baseOrders.filter(order => order.status === selectedStatus);
    }
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      baseOrders = baseOrders.filter(order => {
        const matchesId = order.transactionId.toLowerCase().includes(query);
        const matchesProduct = order.items.some(item => 
          item.name.toLowerCase().includes(query)
        );
        return matchesId || matchesProduct;
      });
    }
    
    // Apply sort order (Latest first by default)
    const sortedOrders = [...baseOrders].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });
    
    return sortedOrders;
  }, [activeTab, activeTabOrders, toReceiveOrders, completedOrders, selectedStatus, searchQuery, sortOrder]);

  const orders = filteredOrders;

  // Dynamic action button renderer
  const renderActionButtons = (order: Order) => {
    // For To Receive tab, show Order Received button
    if (activeTab === 'toReceive' && order.status === 'shipped') {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            styles.fullWidthButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => handleOrderReceived(order)}
        >
          <Text style={styles.primaryButtonText}>Order Received</Text>
        </Pressable>
      );
    }

    switch (order.status) {
      case 'pending':
        return (
          <View style={styles.buttonRow}>
            <Pressable
              style={({ pressed }) => [
                styles.outlineButton,
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?')}
            >
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => navigation.navigate('DeliveryTracking', { order })}
            >
              <Text style={styles.primaryButtonText}>Track Order</Text>
            </Pressable>
          </View>
        );
      
      case 'processing':
      case 'shipped':
        return (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              styles.fullWidthButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('DeliveryTracking', { order })}
          >
            <Text style={styles.primaryButtonText}>Track Order</Text>
          </Pressable>
        );
      
      case 'delivered':
        return (
          <Pressable
            style={({ pressed }) => [
              styles.outlineButton,
              styles.fullWidthButton,
              styles.orangeOutlineButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('OrderDetail', { order })}
          >
            <Text style={styles.orangeOutlineButtonText}>See Details</Text>
          </Pressable>
        );
      
      case 'canceled':
        return (
          <Pressable
            style={({ pressed }) => [
              styles.outlineButton,
              styles.fullWidthButton,
              styles.greyOutlineButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => navigation.navigate('OrderDetail', { order })}
          >
            <Text style={styles.greyOutlineButtonText}>View Details</Text>
          </Pressable>
        );
      
      default:
        return null;
    }
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return { bg: '#FFF4ED', text: '#FF5722' };
      case 'processing':
        return { bg: '#F0F4F8', text: '#374151' };
      case 'shipped':
        return { bg: '#F0F4F8', text: '#374151' };
      case 'delivered':
        return { bg: '#FFF4ED', text: '#FF5722' };
      case 'canceled':
        return { bg: '#FEE2E2', text: '#DC2626' };
      default:
        return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const getStatusText = (status: Order['status']) => {
    const statusMap: Record<Order['status'], string> = {
      pending: 'Pending',
      processing: 'In Progress',
      shipped: 'To Receive',
      delivered: 'Completed',
      canceled: 'Canceled',
    };
    return statusMap[status] || status;
  };

  const handleClearAll = () => {
    setSelectedStatus('all');
    setSortOrder('latest');
    setSearchQuery('');
  };

  const handleOrderReceived = (order: Order) => {
    console.log('Opening rating modal for order:', order.id);
    setSelectedOrder(order);
    setRating(0);
    setReviewText('');
    // Use setTimeout to ensure state updates before showing modal
    setTimeout(() => {
      setShowRatingModal(true);
    }, 100);
  };

  const handleSubmitRating = () => {
    if (!selectedOrder) {
      console.error('No order selected for rating');
      return;
    }

    console.log('Submitting rating for order:', selectedOrder.id, 'Rating:', rating);
    
    // Update order status to delivered when rating is submitted
    updateOrderStatus(selectedOrder.id, 'delivered');
    
    // Close modal first
    setShowRatingModal(false);
    
    // Show success message
    Alert.alert(
      'Review Submitted!',
      'Thank you for your feedback',
      [
        {
          text: 'OK',
          onPress: () => {
            // Switch to History tab to show the completed order
            setActiveTab('history');
            // Reset states
            setSelectedOrder(null);
            setRating(0);
            setReviewText('');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Orange Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerTop}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => setShowFilterModal(true)}>
              <Filter size={22} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Pressable style={styles.iconButton} onPress={() => setShowSearchModal(true)}>
              <Search size={22} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>

        {/* Segmented Control Tabs - 3 Tabs */}
        <View style={styles.tabsContainer}>
          <Pressable
            onPress={() => setActiveTab('active')}
            style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
              Active
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('toReceive')}
            style={[styles.tab, activeTab === 'toReceive' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'toReceive' && styles.activeTabText]}>
              To Receive
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('history')}
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              History
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Orders List with Grey Background */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Package size={64} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyTitle}>
              {searchQuery || selectedStatus !== 'all' ? 'No Orders Found' : 'No Orders Yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery || selectedStatus !== 'all'
                ? 'Try adjusting your search or filter'
                : activeTab === 'active'
                ? 'Your active orders will appear here'
                : 'Your order history will appear here'}
            </Text>
            {(searchQuery || selectedStatus !== 'all') && (
              <Pressable
                style={styles.clearFiltersButton}
                onPress={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                }}
              >
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {orders.map((order) => {
              const firstItem = order.items[0];
              const statusStyle = getStatusBadgeStyle(order.status);
              
              return (
                <Pressable
                  key={order.id}
                  style={({ pressed }) => [
                    styles.orderCard,
                    order.status === 'canceled' && styles.orderCardCanceled,
                    pressed && styles.orderCardPressed,
                  ]}
                  onPress={() => navigation.navigate('OrderDetail', { order })}
                >
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={styles.headerBadges}>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                          {getStatusText(order.status)}
                        </Text>
                      </View>
                      {!order.isPaid && order.status !== 'canceled' && (
                        <View style={styles.paymentBadge}>
                          <Text style={styles.paymentBadgeText}>Pending Payment</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.orderId}>ID: #{order.transactionId}</Text>
                  </View>

                  {/* Card Body */}
                  <View style={styles.cardBody}>
                    <Image
                      source={{ uri: firstItem?.image || 'https://via.placeholder.com/80' }}
                      style={styles.productImage}
                    />
                    <View style={styles.productDetails}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {firstItem?.name || 'Product'}
                      </Text>
                      <View style={styles.dateRow}>
                        <Clock size={14} color="#9CA3AF" />
                        <Text style={styles.dateText}>{order.scheduledDate}</Text>
                      </View>
                      <Text style={styles.totalAmount}>₱{order.total.toLocaleString()}</Text>
                    </View>
                  </View>

                  {/* Dynamic Action Buttons */}
                  <View style={styles.cardFooter}>
                    {renderActionButtons(order)}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowSearchModal(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowSearchModal(false)}
        >
          <Pressable 
            style={[styles.searchModalContent, { paddingTop: insets.top + 12 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search Orders</Text>
              <Pressable onPress={() => setShowSearchModal(false)} style={styles.closeButton}>
                <X size={24} color="#374151" strokeWidth={2.5} />
              </Pressable>
            </View>
            
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#FF5722" strokeWidth={2.5} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by order ID or product name"
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <X size={18} color="#9CA3AF" />
                </Pressable>
              )}
            </View>

            {searchQuery.trim() && (
              <View style={styles.searchResults}>
                <Text style={styles.searchResultsText}>
                  {filteredOrders.length} {filteredOrders.length === 1 ? 'result' : 'results'} found
                </Text>
              </View>
            )}

            <Pressable
              style={styles.footerApplyButton}
              onPress={() => setShowSearchModal(false)}
            >
              <Text style={styles.footerApplyText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Filter Modal - Bottom Sheet Design */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable 
          style={styles.filterModalOverlay}
          onPress={() => setShowFilterModal(false)}
        >
          <Pressable 
            style={styles.filterBottomSheet}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drag Handle */}
            <View style={styles.dragHandle} />
            
            {/* Header */}
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Orders</Text>
              <Pressable onPress={() => setShowFilterModal(false)} style={styles.filterCloseButton}>
                <X size={24} color="#6B7280" strokeWidth={2.5} />
              </Pressable>
            </View>

            <ScrollView 
              style={styles.filterContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Sort By Section - Modern Cards */}
              <Text style={styles.sectionTitle}>SORT BY</Text>
              <View style={styles.sortCardsContainer}>
                <Pressable
                  style={[
                    styles.sortCard,
                    sortOrder === 'latest' && styles.sortCardActive,
                  ]}
                  onPress={() => setSortOrder('latest')}
                >
                  <Text
                    style={[
                      styles.sortCardText,
                      sortOrder === 'latest' && styles.sortCardTextActive,
                    ]}
                  >
                    Latest First
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.sortCard,
                    sortOrder === 'oldest' && styles.sortCardActive,
                  ]}
                  onPress={() => setSortOrder('oldest')}
                >
                  <Text
                    style={[
                      styles.sortCardText,
                      sortOrder === 'oldest' && styles.sortCardTextActive,
                    ]}
                  >
                    Oldest First
                  </Text>
                </Pressable>
              </View>

              {/* Status Section - Choice Chips */}
              <Text style={[styles.sectionTitle, { marginTop: 32 }]}>STATUS</Text>
              <View style={styles.chipsContainer}>
                {[
                  { value: 'all' as const, label: 'All Orders' },
                  { value: 'pending' as const, label: 'Pending' },
                  { value: 'processing' as const, label: 'In Progress' },
                  { value: 'shipped' as const, label: 'To Receive' },
                  { value: 'delivered' as const, label: 'Completed' },
                  { value: 'canceled' as const, label: 'Canceled' },
                ].map((option) => (
                  <Pressable
                    key={option.value}
                    style={[
                      styles.statusChip,
                      selectedStatus === option.value && styles.statusChipActive,
                    ]}
                    onPress={() => setSelectedStatus(option.value)}
                  >
                    <Text
                      style={[
                        styles.statusChipText,
                        selectedStatus === option.value && styles.statusChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Bottom padding for scroll */}
              <View style={{ height: 100 }} />
            </ScrollView>

            {/* Fixed Footer Action Bar */}
            <View style={styles.filterFooter}>
              <Pressable
                style={styles.footerClearButton}
                onPress={handleClearAll}
              >
                <Text style={styles.footerClearText}>Clear All</Text>
              </Pressable>
              <Pressable
                style={styles.footerApplyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.footerApplyText}>Apply Filter</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rating Modal - Rebuilt Simple & Clean */}
      <Modal
        visible={showRatingModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRatingModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.ratingModalOverlay}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.ratingModalCard}>
                  {/* Header */}
                  <View style={styles.ratingModalHeader}>
                    <Text style={styles.ratingModalTitle}>Rate Your Experience</Text>
                    <Text style={styles.ratingModalSubtitle}>Help others make better decisions</Text>
                  </View>

                  {/* Product Info */}
                  {selectedOrder && (
                    <View style={styles.ratingProductInfo}>
                      <Image
                        source={{ uri: selectedOrder.items[0].image }}
                        style={styles.ratingProductImage}
                      />
                      <Text style={styles.ratingProductName} numberOfLines={2}>
                        {selectedOrder.items[0].name}
                      </Text>
                    </View>
                  )}

                  {/* Star Rating */}
                  <View style={styles.ratingStarsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable
                        key={star}
                        onPress={() => {
                          Keyboard.dismiss();
                          setRating(star);
                        }}
                        style={styles.starButton}
                      >
                        <Ionicons
                          name={rating >= star ? 'star' : 'star-outline'}
                          size={48}
                          color={rating >= star ? '#FF5722' : '#D1D5DB'}
                        />
                      </Pressable>
                    ))}
                  </View>

                  {/* Review Text Input */}
                  <TextInput
                    style={styles.ratingTextInput}
                    placeholder="Write your review (optional)"
                    placeholderTextColor="#9CA3AF"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    value={reviewText}
                    onChangeText={setReviewText}
                    maxLength={500}
                    returnKeyType="done"
                    blurOnSubmit={true}
                  />

                  {/* Action Buttons */}
                  <View style={styles.ratingModalActions}>
                    <Pressable
                      style={styles.ratingCancelButton}
                      onPress={() => {
                        Keyboard.dismiss();
                        setShowRatingModal(false);
                        setRating(0);
                        setReviewText('');
                      }}
                    >
                      <Text style={styles.ratingCancelText}>Cancel</Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.ratingSubmitBtn,
                        rating === 0 && styles.ratingSubmitBtnDisabled
                      ]}
                      onPress={() => {
                        Keyboard.dismiss();
                        handleSubmitRating();
                      }}
                      disabled={rating === 0}
                    >
                      <Text style={styles.ratingSubmitText}>Submit Rating</Text>
                    </Pressable>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  
  // Edge-to-Edge Orange Header
  header: {
    backgroundColor: '#FF5722',
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  searchButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Segmented Control Tabs (Inside Orange Header)
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTabText: {
    color: '#FF5722',
  },
  
  // Order List Container
  scrollContainer: {
    flex: 1,
  },
  ordersContainer: {
    padding: 16,
    gap: 16,
  },
  
  // Bento-Style Order Card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  orderCardCanceled: {
    opacity: 0.8,
  },
  orderCardPressed: {
    opacity: 0.7,
  },
  
  // Card Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerBadges: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FEF3E8',
    borderWidth: 1,
    borderColor: '#FF5722',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF5722',
  },
  orderId: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginLeft: 8,
  },
  
  // Card Body
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  productDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    lineHeight: 20,
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF5722',
    letterSpacing: 0.3,
  },
  
  // Card Footer (Action Buttons)
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FF5722',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  outlineButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  cancelButton: {
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
  },
  fullWidthButton: {
    flex: undefined,
    width: '100%',
  },
  orangeOutlineButton: {
    borderColor: '#FF5722',
  },
  orangeOutlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF5722',
    letterSpacing: 0.2,
  },
  greyOutlineButton: {
    borderColor: '#D1D5DB',
  },
  greyOutlineButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.2,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: 20,
    backgroundColor: '#FF5722',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  clearFiltersButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  
  // Search & Filter Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: 300,
    marginTop: 'auto',
  },
  searchModalContent: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Search Input
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF5722',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    padding: 0,
  },
  searchResults: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  searchResultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  
  // Modern Filter Bottom Sheet
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterBottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  filterCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContent: {
    paddingHorizontal: 20,
  },
  
  // Section Title (Small Caps)
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 12,
  },
  
  // Sort Cards (Row Layout)
  sortCardsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sortCard: {
    flex: 1,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sortCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FF5722',
  },
  sortCardText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  sortCardTextActive: {
    color: '#FF5722',
  },
  
  // Status Chips (Flex Wrap)
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  statusChipActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  statusChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  statusChipTextActive: {
    color: '#FFFFFF',
  },
  
  // Fixed Footer Action Bar
  filterFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  footerClearButton: {
    flex: 0.4,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerClearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF5722',
  },
  footerApplyButton: {
    flex: 1,
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerApplyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ===== RATING MODAL - SIMPLE & CLEAN =====
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  ratingModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  ratingModalHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  ratingModalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  ratingModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingProductInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  ratingProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginRight: 12,
  },
  ratingProductName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  ratingStarsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  ratingTextInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#111827',
    height: 100,
    marginBottom: 24,
  },
  ratingModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingCancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  ratingCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  ratingSubmitBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#FF5722',
  },
  ratingSubmitBtnDisabled: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
  },
  ratingSubmitText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
