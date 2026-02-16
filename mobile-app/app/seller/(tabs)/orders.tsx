import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Bell, X, Search, Menu, Download, ChevronRight, ChevronDown, Check } from 'lucide-react-native';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { safeImageUri } from '../../../src/utils/imageUtils';
import SellerDrawer from '../../../src/components/SellerDrawer';

// Distinguish between UI filters and actual DB states
type DBStatus = 'pending' | 'to-ship' | 'shipped' | 'completed' | 'cancelled';
type OrderStatus = 'all' | DBStatus;
type ChannelFilter = 'all' | 'online' | 'pos';

export default function SellerOrdersScreen() {
  const { orders = [], seller, fetchOrders, ordersLoading, updateOrderStatus } = useSellerStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>('all');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  useEffect(() => {
    if (seller?.id) fetchOrders(seller.id);
  }, [seller?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (seller?.id) await fetchOrders(seller.id);
    setRefreshing(false);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
    const matchesChannel = channelFilter === 'all'
      ? true
      : channelFilter === 'pos' ? order.type === 'OFFLINE' : (order.type === 'ONLINE' || !order.type);
    const q = searchQuery.toLowerCase().trim();
    return matchesStatus && matchesChannel && (!q || [order.orderId, order.customerName].some(f => String(f || '').toLowerCase().includes(q)));
  });

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; action: string | null; next: DBStatus | null }> = {
      pending: { color: '#FBBF24', action: 'Confirm', next: 'to-ship' },
      'to-ship': { color: '#FF5722', action: 'Ship Now', next: 'shipped' },
      shipped: { color: '#3B82F6', action: 'Delivered', next: 'completed' },
      completed: { color: '#10B981', action: null, next: null },
      cancelled: { color: '#DC2626', action: null, next: null },
    };
    return configs[status] || { color: '#6B7280', action: null, next: null };
  };

  const handleQuickAction = (orderId: string, nextStatus: DBStatus | null) => {
    if (!nextStatus) return;

    Alert.alert(
      "Confirm Action",
      `Are you sure you want to mark this order as ${nextStatus.replace('-', ' ')}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateOrderStatus(orderId, nextStatus);
              if (seller?.id) fetchOrders(seller.id);
            } catch (error) {
              Alert.alert("Error", "Failed to update order status.");
            }
          }
        }
      ]
    );
  };

  const SelectionModal = ({ visible, onClose, options, current, onSelect, title }: any) => (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((opt: string) => (
            <Pressable key={opt} style={styles.optionItem} onPress={() => onSelect(opt)}>
              <Text style={[styles.optionText, current === opt && styles.optionTextActive]}>
                {opt.toUpperCase().replace('-', ' ')}
              </Text>
              {current === opt && <Check size={18} color="#FF5722" />}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconContainer} onPress={() => setDrawerVisible(true)}><Menu size={24} color="#1F2937" /></Pressable>
            <View>
              <Text style={styles.headerTitle}>Orders</Text>
              <Text style={styles.headerSubtitle}>Order Management</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton} onPress={() => navigation.getParent()?.navigate('Notifications')}>
            <Bell size={22} color="#1F2937" strokeWidth={2.5} />
            <View style={styles.notificationBadge} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Order ID or Name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && <Pressable onPress={() => setSearchQuery('')}><X size={20} color="#9CA3AF" /></Pressable>}
        </View>
      </View>

      <View style={styles.actionRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionScroll}>
          <View style={styles.filterItem}>
            <Text style={styles.rowLabel}>CHANNEL:</Text>
            <Pressable style={styles.dropdownPill} onPress={() => setShowChannelMenu(true)}>
              <Text style={styles.pillLabel}>{channelFilter.toUpperCase()}</Text>
              <ChevronDown size={14} color="#6B7280" />
            </Pressable>
          </View>
          <View style={styles.filterItem}>
            <Text style={styles.rowLabel}>STATUS:</Text>
            <Pressable style={styles.dropdownPill} onPress={() => setShowStatusMenu(true)}>
              <Text style={styles.pillLabel}>{selectedStatus.toUpperCase().replace('-', ' ')}</Text>
              <ChevronDown size={14} color="#6B7280" />
            </Pressable>
          </View>
          <Pressable style={styles.exportButton}>
            <Download size={18} color="#FF5722" />
            <Text style={styles.exportButtonText}>EXPORT DATA</Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing || ordersLoading} onRefresh={onRefresh} colors={['#FF5722']} />} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.ordersList}>
          {filteredOrders.map((order) => {
            const config = getStatusConfig(order.status);
            const isWalkIn = order.type === 'OFFLINE';
            return (
              <Pressable key={order.id} style={styles.orderCard} onPress={() => navigation.navigate('SellerOrderDetail', { orderId: order.id })}>
                <View style={[styles.channelBar, { backgroundColor: isWalkIn ? '#8B5CF6' : '#3B82F6' }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderId} numberOfLines={1}>#{String(order.orderId || order.id).toUpperCase()}</Text>
                      <View style={styles.infoRow}>
                        <Text style={styles.customerName} numberOfLines={1}>{order.customerName || 'Walk-in'}</Text>
                        <Text style={styles.orderDate}> • {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                      </View>
                    </View>
                    <Text style={[styles.statusWord, { color: config.color }]}>{order.status.toUpperCase()}</Text>
                  </View>
                  <View style={styles.cardBody}>
                    <View style={styles.thumbnailStack}>
                      {order.items.slice(0, 2).map((item: any, i: number) => (
                        <View key={i} style={styles.thumbWrapper}>
                          <Image source={{ uri: safeImageUri(item.image) }} style={styles.thumbnail} />
                          <View style={styles.qtyBadge}><Text style={styles.qtyText}>x{item.quantity}</Text></View>
                        </View>
                      ))}
                      {order.items.length > 2 && <View style={styles.moreItemsBox}><Text style={styles.moreItemsText}>+{order.items.length - 2}</Text></View>}
                    </View>
                    <View style={styles.priceGroup}>
                      <Text style={styles.totalValue}>₱{order.total.toLocaleString()}</Text>
                      <Text style={styles.totalLabel}>Total Amount</Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <View style={styles.detailsBtn}><Text style={styles.detailsBtnText}>View Details</Text><ChevronRight size={14} color="#9CA3AF" /></View>
                    {config.action && (
                      <Pressable style={styles.actionBtn} onPress={() => handleQuickAction(order.id, config.next)}>
                        <Text style={styles.actionBtnText}>{config.action}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <SelectionModal visible={showChannelMenu} onClose={() => setShowChannelMenu(false)} title="Select Channel" options={['all', 'online', 'pos']} current={channelFilter} onSelect={(val: ChannelFilter) => { setChannelFilter(val); setShowChannelMenu(false); }} />
      <SelectionModal visible={showStatusMenu} onClose={() => setShowStatusMenu(false)} title="Select Status" options={['all', 'pending', 'to-ship', 'shipped', 'completed', 'cancelled']} current={selectedStatus} onSelect={(val: OrderStatus) => { setSelectedStatus(val); setShowStatusMenu(false); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: '#FFE5CC', paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 3 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  notificationButton: { position: 'relative' },
  notificationBadge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFE5CC' },
  searchSection: { paddingHorizontal: 20, marginTop: 15 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', marginLeft: 8 },
  actionRow: { paddingVertical: 15 },
  actionScroll: { paddingHorizontal: 20, gap: 15, alignItems: 'center' },
  filterItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 10, fontWeight: '800', color: '#9CA3AF' },
  dropdownPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', gap: 6 },
  pillLabel: { fontSize: 11, fontWeight: '700', color: '#374151' },
  exportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#FF5722', gap: 8 },
  exportButtonText: { fontSize: 11, fontWeight: '800', color: '#FF5722' },
  scrollViewContent: { paddingBottom: 40 },
  ordersList: { paddingHorizontal: 20 },
  orderCard: { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 3 },
  channelBar: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 18 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  orderId: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  customerName: { fontSize: 14, fontWeight: '600', color: '#4B5563', maxWidth: 120 },
  orderDate: { fontSize: 13, color: '#9CA3AF' },
  statusWord: { fontSize: 12, fontWeight: '900' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F3F4F6' },
  thumbnailStack: { flexDirection: 'row', gap: 12 },
  thumbWrapper: { position: 'relative' },
  thumbnail: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F9FAFB' },
  qtyBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#FF5722', paddingHorizontal: 6, borderRadius: 12, borderWidth: 2.5, borderColor: '#FFF', zIndex: 10 },
  qtyText: { fontSize: 10, fontWeight: '900', color: '#FFF' },
  moreItemsBox: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' },
  moreItemsText: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
  priceGroup: { alignItems: 'flex-end' },
  totalValue: { fontSize: 22, fontWeight: '900', color: '#1F2937' },
  totalLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  detailsBtnText: { fontSize: 14, color: '#9CA3AF', fontWeight: '600' },
  actionBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FF5722' },
  actionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContainer: { backgroundColor: '#FFF', width: '80%', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, color: '#1F2937' },
  optionItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  optionText: { fontSize: 15, color: '#4B5563', fontWeight: '600' },
  optionTextActive: { color: '#FF5722', fontWeight: '800' },
});