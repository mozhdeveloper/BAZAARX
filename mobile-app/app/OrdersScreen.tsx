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
import { useCartStore } from '../src/stores/cartStore'; 
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList } from '../App';
import type { Order } from '../src/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Orders'>,
  NativeStackScreenProps<RootStackParamList>
>;

const { width } = Dimensions.get('window');

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
  const addItem = useCartStore((state) => state.addItem); 
  const insets = useSafeAreaInsets();
  const BRAND_COLOR = '#FF5722';

  React.useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab as 'active' | 'toReceive' | 'history');
    }
  }, [route.params]);

  const activeOrders = getActiveOrders();
  const completedOrders = getCompletedOrders();
  const toReceiveOrders = activeOrders.filter(order => order.status === 'shipped');
  const activeTabOrders = activeOrders.filter(order => order.status !== 'shipped');
  
  const filteredOrders = useMemo(() => {
    let baseOrders: Order[] = [];
    if (activeTab === 'active') baseOrders = activeTabOrders;
    else if (activeTab === 'toReceive') baseOrders = toReceiveOrders;
    else baseOrders = completedOrders;
    
    if (selectedStatus !== 'all') baseOrders = baseOrders.filter(order => order.status === selectedStatus);
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      baseOrders = baseOrders.filter(order => 
        order.transactionId.toLowerCase().includes(query) || 
        order.items.some(item => item.name.toLowerCase().includes(query))
      );
    }
    
    return [...baseOrders].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });
  }, [activeTab, activeTabOrders, toReceiveOrders, completedOrders, selectedStatus, searchQuery, sortOrder]);

  const handleBuyAgain = (order: Order) => {
    if (order.items.length > 0) {
      order.items.forEach(item => {
        addItem(item as any); 
      });
      Alert.alert('Added to Cart', 'Items have been added back to your cart.', [
        { text: 'View Cart', onPress: () => navigation.navigate('MainTabs', { screen: 'Cart' }) },
        { text: 'OK', style: 'cancel' }
      ]);
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
      { text: 'OK', onPress: () => { setActiveTab('history'); setSelectedOrder(null); } },
    ]);
  };

  const getStatusBadgeStyle = (status: Order['status']) => {
    switch (status) {
      case 'pending': return { bg: '#FFF4ED', text: BRAND_COLOR };
      case 'delivered': return { bg: '#F0FDF4', text: '#166534' };
      case 'canceled': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F3F4F6', text: '#374151' };
    }
  };

  const renderActionButtons = (order: Order) => {
    if (activeTab === 'toReceive' && order.status === 'shipped') {
      return (
        <Pressable style={styles.primaryButton} onPress={() => handleOrderReceived(order)}>
          <Text style={styles.primaryButtonText}>Order Received</Text>
        </Pressable>
      );
    }
    if (activeTab === 'history' && order.status === 'delivered') {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
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

        <View style={styles.tabsContainer}>
          {(['active', 'toReceive', 'history'] as const).map((tab) => (
            <Pressable 
                key={tab} 
                onPress={() => setActiveTab(tab)} 
                style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && { color: BRAND_COLOR }]}>
                {tab === 'toReceive' ? 'To Receive' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {filteredOrders.length === 0 ? (
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
                <Text style={styles.orderIdText}>#{order.transactionId}</Text>
              </View>
              
              <View style={styles.cardBody}>
                <Image source={{ uri: order.items[0]?.image }} style={styles.productThumb} />
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
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Rate Your Order</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <Pressable key={s} onPress={() => setRating(s)}>
                  <Ionicons name={rating >= s ? 'star' : 'star-outline'} size={40} color={BRAND_COLOR} />
                </Pressable>
              ))}
            </View>
            <TextInput style={styles.reviewInput} placeholder="Tell us more about the product..." multiline value={reviewText} onChangeText={setReviewText} />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setShowRatingModal(false)}><Text>Cancel</Text></Pressable>
              <Pressable style={[styles.modalSubmit, { backgroundColor: BRAND_COLOR }]} onPress={handleSubmitRating}><Text style={{ color: '#FFF', fontWeight: '700' }}>Submit</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerContainer: { paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerIconButton: { padding: 5 },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#FFF' },
  tabText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  orderCard: { backgroundColor: '#FFF', borderRadius: 20, padding: 16, marginBottom: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#F1F1F1' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  orderIdText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  cardBody: { flexDirection: 'row', gap: 12, marginBottom: 15 },
  productThumb: { width: 70, height: 70, borderRadius: 12, backgroundColor: '#F3F4F6' },
  productInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  totalAmount: { fontSize: 18, fontWeight: '900' },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { backgroundColor: '#FF5722', paddingVertical: 12, borderRadius: 12, alignItems: 'center', width: '100%' },
  primaryButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  outlineButton: { borderWidth: 1, borderColor: '#E5E7EB', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  outlineButtonText: { color: '#6B7280', fontWeight: '700' },
  buyAgainButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#FF5722', paddingVertical: 12, borderRadius: 12 },
  buyAgainText: { fontWeight: '800', fontSize: 14 },
  
  // RESTORED EMPTY STATE STYLES
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#374151', marginTop: 15 },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginTop: 5 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  searchModalContent: { backgroundColor: '#FFF', flex: 1 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalSearchInput: { flex: 1, fontSize: 16, color: '#1F2937' },
  filterModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  filterTitle: { fontSize: 18, fontWeight: '800' },
  filterLabel: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 15 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#EEE' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  applyBtn: { margin: 20, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  ratingOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  ratingCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24 },
  ratingTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 5, marginBottom: 20 },
  reviewInput: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 15, height: 100, textAlignVertical: 'top', borderWidth: 1, borderColor: '#F3F4F6' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center', backgroundColor: '#F3F4F6' },
  modalSubmit: { flex: 1, paddingVertical: 15, borderRadius: 12, alignItems: 'center' },
});