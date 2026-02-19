import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Bell, X, Search, Menu, Download, ChevronRight,
  ListFilter, Calendar, Layers, Tag
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useSellerStore } from '../../../src/stores/sellerStore';
import { safeImageUri } from '../../../src/utils/imageUtils';
import SellerDrawer from '../../../src/components/SellerDrawer';
import { orderExportService } from '../../../src/services/orderExportService';
import TrackingModal from '../../../src/components/seller/TrackingModal';

// Types
type DBStatus = 'pending' | 'to-ship' | 'shipped' | 'completed' | 'cancelled';
type OrderStatus = 'all' | DBStatus;
type ChannelFilter = 'all' | 'online' | 'pos';
type DateFilterLabel = 'All Time' | 'Today' | 'Last 7 Days' | 'Last 30 Days' | 'This Month' | 'Custom Range';

interface FilterState {
  status: OrderStatus;
  channel: ChannelFilter;
  dateLabel: DateFilterLabel;
  startDate: Date | null;
  endDate: Date | null;
}

export default function SellerOrdersScreen() {
  const {
    orders = [],
    seller,
    fetchOrders,
    ordersLoading,
    updateOrderStatus,
    markOrderAsShipped,
    markOrderAsDelivered,
  } = useSellerStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    channel: 'all',
    dateLabel: 'All Time',
    startDate: null,
    endDate: null
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Date Picker State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [trackingModalVisible, setTrackingModalVisible] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (seller?.id) {
      fetchOrders(seller.id, filters.startDate, filters.endDate);
    }
  }, [seller?.id, filters.startDate, filters.endDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (seller?.id) {
      await fetchOrders(seller.id, filters.startDate, filters.endDate);
    }
    setRefreshing(false);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = filters.status === 'all' || order.status === filters.status;
      const matchesChannel = filters.channel === 'all'
        ? true
        : filters.channel === 'pos' ? order.type === 'OFFLINE' : (order.type === 'ONLINE' || !order.type);

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || [
        order.orderId || order.id,
        order.buyerName
      ].some(f => String(f || '').toLowerCase().includes(q));

      return matchesStatus && matchesChannel && matchesSearch;
    });
  }, [orders, filters.status, filters.channel, searchQuery]);

  // Handle Export
  const handleExport = () => {
    if (filteredOrders.length === 0) {
      Alert.alert("No Data", "There are no orders to export.");
      return;
    }

    // Determine the label for the filename using actual dates if custom
    let exportDateLabel = filters.dateLabel;

    if (filters.dateLabel === 'Custom Range' && filters.startDate && filters.endDate) {
      // Format: YYYY-MM-DD_to_YYYY-MM-DD
      const startStr = filters.startDate.toISOString().split('T')[0];
      const endStr = filters.endDate.toISOString().split('T')[0];
      exportDateLabel = `${startStr}_to_${endStr}` as any;
    }

    Alert.alert(
      "Export Orders",
      `Export ${filteredOrders.length} orders?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Summary CSV",
          onPress: () => orderExportService.exportToCSV(
            filteredOrders,
            seller?.store_name || 'My Store',
            exportDateLabel,
            'summary'
          )
        },
        {
          text: "Detailed CSV",
          onPress: () => orderExportService.exportToCSV(
            filteredOrders,
            seller?.store_name || 'My Store',
            exportDateLabel,
            'detailed'
          )
        }
      ]
    );
  };

  const applyDatePreset = (label: DateFilterLabel) => {
    const end = new Date();
    let start = new Date();

    if (label === 'Custom Range') {
      setFilters(prev => ({
        ...prev,
        dateLabel: label,
        startDate: prev.startDate || new Date(),
        endDate: prev.endDate || new Date()
      }));
      return;
    }

    switch (label) {
      case 'Today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'Last 7 Days':
        start.setDate(end.getDate() - 7);
        break;
      case 'Last 30 Days':
        start.setDate(end.getDate() - 30);
        break;
      case 'This Month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'All Time':
        setFilters(prev => ({ ...prev, dateLabel: label, startDate: null, endDate: null }));
        return;
    }

    setFilters(prev => ({ ...prev, dateLabel: label, startDate: start, endDate: end }));
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (!selectedDate) return;

    if (datePickerMode === 'start') {
      setFilters(prev => ({ ...prev, startDate: selectedDate }));
    } else {
      setFilters(prev => ({ ...prev, endDate: selectedDate }));
    }
  };

  const openDatePicker = (mode: 'start' | 'end') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; action: string | null }> = {
      pending: { color: '#FBBF24', action: 'Confirm' },
      'to-ship': { color: '#FF5722', action: 'Ship Now' },
      shipped: { color: '#3B82F6', action: 'Deliver' },
      completed: { color: '#10B981', action: null },
      cancelled: { color: '#DC2626', action: null },
    };
    return configs[status] || { color: '#6B7280', action: null };
  };

  const handleQuickAction = (orderId: string, currentStatus: DBStatus) => {
    if (currentStatus === 'pending') {
      Alert.alert('Confirm Order', 'Mark this order as confirmed and ready to ship?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await updateOrderStatus(orderId, 'to-ship');
              if (seller?.id) await fetchOrders(seller.id);
            } catch {
              Alert.alert('Error', 'Failed to confirm order.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]);
      return;
    }

    if (currentStatus === 'to-ship') {
      setTrackingOrderId(orderId);
      setTrackingNumber('');
      setTrackingModalVisible(true);
      return;
    }

    if (currentStatus === 'shipped') {
      Alert.alert('Mark as Delivered', 'Confirm this order has been delivered?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsUpdating(true);
            try {
              await markOrderAsDelivered(orderId);
              if (seller?.id) await fetchOrders(seller.id);
            } catch {
              Alert.alert('Error', 'Failed to mark order as delivered.');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]);
    }
  };

  const handleTrackingSubmit = async () => {
    const nextTracking = trackingNumber.trim();
    if (!trackingOrderId || !nextTracking) {
      Alert.alert('Error', 'Please enter a tracking number.');
      return;
    }

    setIsUpdating(true);
    try {
      await markOrderAsShipped(trackingOrderId, nextTracking);
      setTrackingModalVisible(false);
      setTrackingOrderId(null);
      if (seller?.id) await fetchOrders(seller.id);
    } catch {
      Alert.alert('Error', 'Failed to mark order as shipped.');
    } finally {
      setIsUpdating(false);
    }
  };

  const activeFilterCount = [
    filters.status !== 'all',
    filters.channel !== 'all',
    filters.dateLabel !== 'All Time'
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconContainer} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#1F2937" />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>Orders</Text>
              <Text style={styles.headerSubtitle}>Manage & Track</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton} onPress={() => navigation.getParent()?.navigate('Notifications')}>
            <Bell size={22} color="#1F2937" strokeWidth={2.5} />
            <View style={styles.notificationBadge} />
          </Pressable>
        </View>
      </View>

      {/* Main Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <X size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </View>

        <Pressable
          style={[styles.actionBtn, activeFilterCount > 0 && styles.actionBtnActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <ListFilter size={20} color={activeFilterCount > 0 ? "#FF5722" : "#4B5563"} />
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>

        <Pressable style={styles.actionBtn} onPress={handleExport}>
          <Download size={20} color="#4B5563" />
        </Pressable>
      </View>

      {/* Active Filters Summary */}
      {(activeFilterCount > 0) && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            Showing:
            {/* UPDATED: Dynamically show date range if custom is selected */}
            <Text style={{ fontWeight: '700' }}>
              {filters.dateLabel === 'Custom Range' && filters.startDate && filters.endDate
                ? ` ${filters.startDate.toLocaleDateString()} - ${filters.endDate.toLocaleDateString()}`
                : ` ${filters.dateLabel}`
              }
            </Text>
            {filters.status !== 'all' && <Text> • {filters.status.toUpperCase()}</Text>}
            {filters.channel !== 'all' && <Text> • {filters.channel.toUpperCase()}</Text>}
          </Text>
          <Pressable onPress={() => setFilters({ status: 'all', channel: 'all', dateLabel: 'All Time', startDate: null, endDate: null })}>
            <Text style={styles.clearText}>Reset</Text>
          </Pressable>
        </View>
      )}

      {/* Orders List */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing || ordersLoading} onRefresh={onRefresh} colors={['#FF5722']} />
        }
        contentContainerStyle={styles.scrollViewContent}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No orders found matching your filters.</Text>
          </View>
        ) : (
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
                        <Text style={styles.orderId} numberOfLines={1}>#{String(order.orderId || order.id).slice(0, 10).toUpperCase()}</Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.customerName} numberOfLines={1}>{order.buyerName || 'Walk-in'}</Text>
                          <Text style={styles.orderDate}> • {new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</Text>
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
                        <Text style={styles.totalLabel}>Total</Text>
                      </View>
                    </View>
                    <View style={styles.cardFooter}>
                      <View style={styles.detailsBtn}><Text style={styles.detailsBtnText}>View Details</Text><ChevronRight size={14} color="#9CA3AF" /></View>
                      {config.action && (
                        <Pressable style={styles.actionBtn} onPress={() => handleQuickAction(order.id, order.status)}>
                          <Text style={styles.actionBtnText}>{config.action}</Text>
                        </Pressable>
                      )}
                  </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FILTER MODAL */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Orders</Text>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <X size={24} color="#374151" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* 1. Date Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Calendar size={16} color="#6B7280" />
                  <Text style={styles.sectionTitle}>DATE RANGE</Text>
                </View>
                <View style={styles.chipGrid}>
                  {['All Time', 'Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Custom Range'].map((label) => (
                    <Pressable
                      key={label}
                      style={[styles.chip, filters.dateLabel === label && styles.chipActive]}
                      onPress={() => applyDatePreset(label as DateFilterLabel)}
                    >
                      <Text style={[styles.chipText, filters.dateLabel === label && styles.chipTextActive]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Custom Date Inputs */}
                {filters.dateLabel === 'Custom Range' && (
                  <View style={styles.customDateContainer}>
                    <Pressable style={styles.dateInput} onPress={() => openDatePicker('start')}>
                      <Text style={styles.dateLabel}>Start Date</Text>
                      <Text style={styles.dateValue}>
                        {filters.startDate ? filters.startDate.toLocaleDateString() : 'Select'}
                      </Text>
                    </Pressable>
                    <View style={styles.dateDivider} />
                    <Pressable style={styles.dateInput} onPress={() => openDatePicker('end')}>
                      <Text style={styles.dateLabel}>End Date</Text>
                      <Text style={styles.dateValue}>
                        {filters.endDate ? filters.endDate.toLocaleDateString() : 'Select'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* 2. Channel Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Layers size={16} color="#6B7280" />
                  <Text style={styles.sectionTitle}>SALES CHANNEL</Text>
                </View>
                <View style={styles.chipRow}>
                  {['all', 'online', 'pos'].map((c) => (
                    <Pressable
                      key={c}
                      style={[styles.chip, filters.channel === c && styles.chipActive]}
                      onPress={() => setFilters(prev => ({ ...prev, channel: c as ChannelFilter }))}
                    >
                      <Text style={[styles.chipText, filters.channel === c && styles.chipTextActive]}>
                        {c === 'pos' ? 'POS (Walk-in)' : c.toUpperCase()}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* 3. Status Section */}
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Tag size={16} color="#6B7280" />
                  <Text style={styles.sectionTitle}>ORDER STATUS</Text>
                </View>
                <View style={styles.chipGrid}>
                  {['all', 'pending', 'to-ship', 'shipped', 'completed', 'cancelled'].map((s) => (
                    <Pressable
                      key={s}
                      style={[styles.chip, filters.status === s && styles.chipActive]}
                      onPress={() => setFilters(prev => ({ ...prev, status: s as OrderStatus }))}
                    >
                      <Text style={[styles.chipText, filters.status === s && styles.chipTextActive]}>
                        {s.toUpperCase().replace('-', ' ')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={styles.resetBtn}
                onPress={() => setFilters({ status: 'all', channel: 'all', dateLabel: 'All Time', startDate: null, endDate: null })}
              >
                <Text style={styles.resetBtnText}>Reset All</Text>
              </Pressable>
              <Pressable style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyBtnText}>Show Results</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Date Picker Component */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerMode === 'start' ? (filters.startDate || new Date()) : (filters.endDate || new Date())}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
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
  container: { flex: 1, backgroundColor: '#F5F5F7' },

  // Header
  header: { backgroundColor: '#FFE5CC', paddingHorizontal: 20, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 3 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  notificationButton: { position: 'relative' },
  notificationBadge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFE5CC' },

  // Action Bar
  actionBar: { flexDirection: 'row', paddingHorizontal: 20, marginTop: 15, gap: 10 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937', marginLeft: 8 },
  actionBtn: { width: 44, height: 44, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  actionBtnActive: { borderColor: '#FF5722', backgroundColor: '#FFF0E6' },
  badge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#FF5722', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#F5F5F7' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  // Summary Row
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 10, marginBottom: 5 },
  summaryText: { fontSize: 12, color: '#6B7280' },
  clearText: { fontSize: 12, color: '#FF5722', fontWeight: '600' },

  // List
  scrollViewContent: { paddingBottom: 40, paddingTop: 10 },
  ordersList: { paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#9CA3AF', fontSize: 14 },

  // Order Card
  orderCard: { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 15, flexDirection: 'row', overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  channelBar: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderId: { fontSize: 15, fontWeight: '800', color: '#1F2937' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  customerName: { fontSize: 13, fontWeight: '600', color: '#4B5563', maxWidth: 120 },
  orderDate: { fontSize: 12, color: '#9CA3AF' },
  statusWord: { fontSize: 11, fontWeight: '900' },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F9FAFB' },
  thumbnailStack: { flexDirection: 'row', gap: 8 },
  thumbWrapper: { position: 'relative' },
  thumbnail: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F9FAFB' },
  qtyBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: '#FF5722', paddingHorizontal: 5, borderRadius: 10, borderWidth: 2, borderColor: '#FFF', zIndex: 10 },
  qtyText: { fontSize: 9, fontWeight: '900', color: '#FFF' },
  moreItemsBox: { width: 50, height: 50, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D1D5DB' },
  moreItemsText: { fontSize: 14, fontWeight: '700', color: '#9CA3AF' },
  priceGroup: { alignItems: 'flex-end' },
  totalValue: { fontSize: 18, fontWeight: '900', color: '#1F2937' },
  totalLabel: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsBtnText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  actionBtnPrimary: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#FF5722' },
  actionBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1F2937' },
  modalBody: { padding: 20 },
  filterSection: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#9CA3AF', letterSpacing: 0.5 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#FFF0E6', borderColor: '#FF5722' },
  chipText: { fontSize: 13, color: '#4B5563', fontWeight: '600' },
  chipTextActive: { color: '#FF5722', fontWeight: '700' },

  // Custom Date Input Styles
  customDateContainer: { flexDirection: 'row', marginTop: 15, alignItems: 'center', gap: 10 },
  dateInput: { flex: 1, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  dateLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4, textTransform: 'uppercase' },
  dateValue: { fontSize: 14, color: '#1F2937', fontWeight: '600' },
  dateDivider: { width: 8, height: 1, backgroundColor: '#9CA3AF' },

  modalFooter: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6', gap: 15 },
  resetBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  resetBtnText: { color: '#4B5563', fontWeight: '700', fontSize: 15 },
  applyBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: '#FF5722' },
  applyBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
