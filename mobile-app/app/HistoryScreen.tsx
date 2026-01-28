import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Image,
  Modal,
  TextInput,
  StatusBar,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Search, Filter, X, Clock, ShoppingCart } from 'lucide-react-native';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { useOrderStore } from '../src/stores/orderStore';
import { useCartStore } from '../src/stores/cartStore';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { Order } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'History'>;

export default function HistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const BRAND_COLOR = COLORS.primary;
  
  // State
  const [dbOrders, setDbOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

  // Stores
  const orders = useOrderStore((state) => state.orders);
  const addItem = useCartStore((state) => state.addItem);

  // Fetche delivered orders from supabase
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.id) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items (
              *,
              product:products (*)
            )
          `)
          .eq('buyer_id', user.id)
          .eq('status', 'delivered') // Strictly history
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped: Order[] = (data || []).map((order: any) => ({
          id: order.id,
          transactionId: order.order_number || order.id,
          items: (order.items || []).map((it: any) => ({
            id: it.product?.id,
            name: it.product?.name || 'Product',
            price: it.unit_price,
            image: it.product?.primary_image || '',
            quantity: it.quantity,
          })),
          total: order.total_amount,
          shippingFee: order.shipping_cost || 0,
          status: 'delivered',
          isPaid: true,
          scheduledDate: new Date(order.created_at).toLocaleDateString(),
          createdAt: order.created_at,
          paymentMethod: order.payment_method?.type || 'Paid',
        })) as Order[];

        setDbOrders(mapped);
      } catch (e) {
        console.error('History fetch error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, [user?.id]);

  // Filter Logic
  const filteredHistory = useMemo(() => {
    let filtered = [...dbOrders];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(order => 
        order.transactionId.toLowerCase().includes(query) || 
        order.items.some(item => item.name.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });
  }, [dbOrders, searchQuery, sortOrder]);

  const handleBuyAgain = (order: Order) => {
     if (order.items.length > 0) {
       order.items.forEach(item => addItem(item as any));
       navigation.navigate('MainTabs', { screen: 'Cart' });
     }
  };

  const getStatusBadgeStyle = (status: Order['status']) => {
      // History screen mostly deals with 'delivered' but robust handling
      switch (status) {
        case 'delivered': return { bg: '#F0FDF4', text: '#166534' }; // Green
        default: return { bg: '#F3F4F6', text: '#374151' }; // Gray
      }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 1. Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: BRAND_COLOR }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#FFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Purchase History</Text>
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

      {/* 2. Content */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={BRAND_COLOR} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Clock size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No purchase history</Text>
              <Text style={styles.emptyText}>Completed orders will appear here.</Text>
            </View>
          ) : (
            filteredHistory.map((order) => (
              <Pressable key={order.id} style={styles.orderCard} onPress={() => navigation.navigate('OrderDetail', { order })}>
                <View style={styles.cardHeader}>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>DELIVERED</Text>
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
                  <View style={styles.buttonRow}>
                     <Pressable style={[styles.outlineButton, { flex: 1 }]} onPress={() => navigation.navigate('OrderDetail', { order })}>
                       <Text style={styles.outlineButtonText}>Details</Text>
                     </Pressable>
                     <Pressable style={[styles.buyAgainButton, { flex: 1.5 }]} onPress={() => handleBuyAgain(order)}>
                       <ShoppingCart size={16} color={BRAND_COLOR} strokeWidth={2.5} />
                       <Text style={[styles.buyAgainText, { color: BRAND_COLOR }]}>Buy Again</Text>
                     </Pressable>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}

      {/* SEARCH MODAL */}
      <Modal visible={showSearchModal} animationType="fade" transparent={true} onRequestClose={() => setShowSearchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.searchModalContent, { paddingTop: insets.top + 10 }]}>
            <View style={styles.searchBarContainer}>
              <Pressable onPress={() => setShowSearchModal(false)}><ArrowLeft size={24} color="#1F2937" /></Pressable>
              <TextInput 
                style={styles.modalSearchInput} 
                placeholder="Search history..." 
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
      <Modal visible={showFilterModal} animationType="slide" transparent={true} onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
             <View style={styles.filterHeader}>
               <Text style={styles.filterTitle}>Filter History</Text>
               <Pressable onPress={() => setShowFilterModal(false)}><X size={24} color="#1F2937" /></Pressable>
             </View>
             <ScrollView style={{ padding: 20 }}>
               <Text style={styles.filterLabel}>Sort By Date</Text>
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

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
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
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  headerIconButton: { padding: 4 },
  headerActions: { flexDirection: 'row', gap: 8 },
  
  scrollContent: { padding: 16, paddingBottom: 50 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // Card Styles
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
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
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  orderIdText: { fontSize: 12, color: '#6B7280' },
  
  cardBody: { flexDirection: 'row', marginBottom: 16 },
  productThumb: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#F3F4F6' },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dateText: { fontSize: 12, color: '#9CA3AF', marginLeft: 4 },
  totalAmount: { fontSize: 14, fontWeight: '700' },
  
  cardFooter: { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  
  // Buttons
  primaryButton: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  primaryButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  outlineButton: { borderWidth: 1, borderColor: '#D1D5DB', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  outlineButtonText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  buyAgainButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#FFF' },
  buyAgainText: { fontSize: 13, fontWeight: '600' },

  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  // Modals (Reused simple styles)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  searchModalContent: { flex: 1, backgroundColor: '#FFF' },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', gap: 12 },
  modalSearchInput: { flex: 1, fontSize: 16, color: '#1F2937' },
  
  filterModalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '40%' },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  filterTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  filterLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  filterChip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFF' },
  filterChipText: { fontSize: 13, color: '#4B5563' },
  applyBtn: { margin: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
