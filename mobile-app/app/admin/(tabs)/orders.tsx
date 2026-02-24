import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Menu, Bell, ShoppingBag, Search, Package, Truck, CheckCircle, XCircle, Phone, Mail } from 'lucide-react-native';
import AdminDrawer from '../../../src/components/AdminDrawer';
import { useAdminOrders } from '../../../src/stores/adminStore';
import { COLORS } from '../../../src/constants/theme';

export default function AdminOrdersScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { orders, isLoading, loadOrders, selectedOrder, selectOrder } = useAdminOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detailsVisible, setDetailsVisible] = useState(false);
  const insets = useSafeAreaInsets();

  // Reload orders every time screen comes into focus (e.g., when switching accounts)
  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.buyer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    const configs = {
      pending: { bg: '#FEF3C7', color: '#D97706', text: 'Pending', Icon: Package },
      confirmed: { bg: '#DBEAFE', color: '#2563EB', text: 'Confirmed', Icon: CheckCircle },
      shipped: { bg: '#E0E7FF', color: '#6366F1', text: 'Shipped', Icon: Truck },
      delivered: { bg: '#D1FAE5', color: '#059669', text: 'Delivered', Icon: CheckCircle },
      cancelled: { bg: '#FEE2E2', color: '#DC2626', text: 'Cancelled', Icon: XCircle },
    };
    return configs[status as keyof typeof configs] || configs.pending;
  };

  const handleViewDetails = (order: any) => {
    selectOrder(order);
    setDetailsVisible(true);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuButton} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Orders</Text>
              <Text style={styles.headerSubtitle}>{orders.length} total orders</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton}>
            <Bell size={22} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {['all', 'pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.centerContent}>
            <ShoppingBag size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No orders found</Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const statusConfig = getStatusConfig(order.status);
            const StatusIcon = statusConfig.Icon;
            return (
              <Pressable key={order.id} style={styles.orderCard} onPress={() => handleViewDetails(order)}>
                <View style={styles.cardHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.date)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                    <StatusIcon size={12} color={statusConfig.color} />
                    <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.text}</Text>
                  </View>
                </View>

                <View style={styles.buyerInfo}>
                  <Text style={styles.buyerName}>{order.buyer.name}</Text>
                  <Text style={styles.buyerContact}>{order.buyer.email}</Text>
                </View>

                <View style={styles.itemsContainer}>
                  {order.items.map((item, idx) => (
                    <Text key={idx} style={styles.itemText}>
                      {item.quantity}x {item.name}
                    </Text>
                  ))}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalAmount}>₱{order.total.toLocaleString()}</Text>
                  </View>
                  <Text style={styles.paymentMethod}>{order.paymentMethod}</Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Order Details Modal */}
      <Modal visible={detailsVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <Pressable onPress={() => setDetailsVisible(false)}>
                <XCircle size={24} color="#6B7280" />
              </Pressable>
            </View>
            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Order Number</Text>
                  <Text style={styles.detailValue}>{selectedOrder.orderNumber}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Text style={[styles.detailValue, { color: getStatusConfig(selectedOrder.status).color }]}>
                    {getStatusConfig(selectedOrder.status).text}
                  </Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Buyer</Text>
                  <Text style={styles.detailValue}>{selectedOrder.buyer.name}</Text>
                  <View style={styles.contactRow}>
                    <Mail size={14} color="#6B7280" />
                    <Text style={styles.contactText}>{selectedOrder.buyer.email}</Text>
                  </View>
                  <View style={styles.contactRow}>
                    <Phone size={14} color="#6B7280" />
                    <Text style={styles.contactText}>{selectedOrder.buyer.phone}</Text>
                  </View>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Items</Text>
                  
                  {/* Product Items */}
                  {selectedOrder.items.map((item, idx) => (
                    <View key={idx} style={styles.productItemCard}>
                      <View style={styles.productImageContainer}>
                        <Package size={32} color="#D1D5DB" />
                      </View>
                      <View style={styles.productDetails}>
                        <Text style={styles.productName}>{item.name}</Text>
                        <Text style={styles.productVariant}>{item.variant || 'Default variant'}</Text>
                        <Text style={styles.productQuantity}>x{item.quantity}</Text>
                      </View>
                      <View style={styles.productPricing}>
                        {item.originalPrice && typeof item.originalPrice === 'number' && item.originalPrice > item.price && (
                          <Text style={styles.originalPrice}>₱{item.originalPrice}</Text>
                        )}
                        <Text style={styles.itemPrice}>₱{item.price}</Text>
                      </View>
                    </View>
                  ))}
                </View>
                <View style={styles.detailSection}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>₱{selectedOrder.subtotal}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Shipping</Text>
                    <Text style={styles.summaryValue}>₱{selectedOrder.shippingFee}</Text>
                  </View>
                  {selectedOrder.discount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Discount</Text>
                      <Text style={[styles.summaryValue, { color: '#059669' }]}>-₱{selectedOrder.discount}</Text>
                    </View>
                  )}
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalAmount}>₱{selectedOrder.total}</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <AdminDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 20 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: { padding: 4 },
  headerTitleContainer: { gap: 2 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.95, fontWeight: '500' },
  notificationButton: { padding: 4 },
  filtersContainer: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#111827' },
  filterScrollView: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  orderInfo: { gap: 4 },
  orderNumber: { fontSize: 16, fontWeight: '600', color: '#111827' },
  orderDate: { fontSize: 12, color: '#6B7280' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '600' },
  buyerInfo: { marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  buyerName: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  buyerContact: { fontSize: 12, color: '#6B7280' },
  itemsContainer: { marginBottom: 12 },
  itemText: { fontSize: 13, color: '#374151', marginBottom: 4 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalLabel: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  totalAmount: { fontSize: 18, fontWeight: 'bold', color: COLORS.primary },
  paymentMethod: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20 },
  detailSection: { marginBottom: 20 },
  detailLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 6, textTransform: 'uppercase' },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '500', marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  contactText: { fontSize: 13, color: '#6B7280' },
  productItemCard: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  productImageContainer: { width: 60, height: 60, backgroundColor: '#F9FAFB', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  productDetails: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 14, color: '#111827', fontWeight: '500', marginBottom: 4 },
  productVariant: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  productQuantity: { fontSize: 12, color: '#6B7280' },
  productPricing: { justifyContent: 'center', alignItems: 'flex-end' },
  originalPrice: { fontSize: 11, color: '#9CA3AF', textDecorationLine: 'line-through', marginBottom: 2 },
  itemPrice: { fontSize: 14, color: '#111827', fontWeight: '500' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, color: '#111827', fontWeight: '500' },
  totalRow: { paddingTop: 12, marginTop: 6, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
});