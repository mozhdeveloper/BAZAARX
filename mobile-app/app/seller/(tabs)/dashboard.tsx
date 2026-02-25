import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  Image,
  Alert,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Menu,
  Bell,
  DollarSign,
  Package,
  Receipt,
  Store,
  Filter,
  Download,
  MessageCircle,
  AlertCircle,
  ChevronRight
} from 'lucide-react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

// Internal Store & Service Imports
import { useSellerStore } from '../../../src/stores/sellerStore';
import { useReturnStore } from '../../../src/stores/returnStore';
import { chatService } from '../../../src/services/chatService';
import { orderExportService } from '../../../src/services/orderExportService';
import { safeImageUri } from '../../../src/utils/imageUtils';
import SellerDrawer from '../../../src/components/SellerDrawer';

const { width } = Dimensions.get('window');

// --- Helper Components ---

const StatCard = ({ label, value, icon, subValue, subColor = "#10B981" }: any) => (
  <View style={styles.statCardContainer}>
    <View style={styles.statIconContainer}>{icon}</View>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={[styles.statSubValue, { color: subColor }]}>{subValue}</Text>
  </View>
);

const EmptyState = ({ message }: { message: string }) => (
  <View style={styles.emptyCard}>
    <AlertCircle size={32} color="#D1D5DB" />
    <Text style={styles.emptyText}>{message}</Text>
  </View>
);

// --- Main Screen ---

export default function SellerDashboardScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // Store Data
  const {
    seller: currentSeller,
    orders,
    products: allProducts,
    fetchOrders,
    fetchProducts
  } = (useSellerStore as any)();

  const getReturnRequestsBySeller = useReturnStore((state) => state.getReturnRequestsBySeller);

  // State Management
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [filters, setFilters] = useState<any>({
    dateLabel: 'Last 7 Days',
    startDate: new Date(new Date().setDate(new Date().getDate() - 7)),
    endDate: new Date(),
  });

  // Data Fetching
  useEffect(() => {
    if (currentSeller?.id) {
      fetchOrders(currentSeller.id, filters.startDate, filters.endDate);
      fetchProducts({ sellerId: currentSeller.id });
    }
  }, [currentSeller?.id, filters.startDate, filters.endDate]);

  // Derived Stats Logic
  const stats = React.useMemo(() => {
    const deliveredOrders = orders.filter((o: any) => o.status === 'completed' || o.status === 'delivered');
    const totalRevenue = deliveredOrders.reduce((sum: number, o: any) => sum + o.total, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const activeProductsCount = allProducts.filter((p: any) => p.isActive).length;
    const lowStockCount = allProducts.filter((p: any) => p.stock > 0 && p.stock <= 5).length;

    return {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      activeProductsCount,
      lowStockCount,
      pendingCount: orders.filter((o: any) => o.status === 'pending').length
    };
  }, [orders, allProducts]);

  // Chart Data Preparation
  const revenueChartData = React.useMemo(() => {
    const dataPoints: any[] = [];
    const dateMap = new Map();
    const start = filters.startDate || new Date(new Date().setDate(new Date().getDate() - 7));
    const end = filters.endDate || new Date();

    let curr = new Date(start);
    while (curr <= end) {
      dateMap.set(curr.toISOString().split('T')[0], 0);
      curr.setDate(curr.getDate() + 1);
    }

    orders.filter((o: any) => o.status === 'completed' || o.status === 'delivered').forEach((order: any) => {
      const dateKey = new Date(order.createdAt || order.orderDate).toISOString().split('T')[0];
      if (dateMap.has(dateKey)) {
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + order.total);
      }
    });

    dateMap.forEach((val, date) => {
      dataPoints.push({ value: val / 1000, label: date.split('-')[2] });
    });
    return dataPoints;
  }, [orders, filters]);

  // Top Products Logic
  const topProducts = React.useMemo(() => {
    return [...allProducts]
      .sort((a, b) => (b.sales || 0) - (a.sales || 0))
      .slice(0, 5);
  }, [allProducts]);

  const categoryData = React.useMemo(() => {
    const counts: any = {};
    allProducts.forEach((p: any) => counts[p.category] = (counts[p.category] || 0) + 1);
    const colors = ['#D97706', '#FBBF24', '#10B981', '#3B82F6'];
    return Object.entries(counts).map(([name, count]: any, i) => ({
      value: count,
      color: colors[i % colors.length],
      label: name,
      text: `${Math.round((count / allProducts.length) * 100)}%`
    })).slice(0, 4);
  }, [allProducts]);

  // Handlers
  const handleExport = () => {
    if (orders.length === 0) return Alert.alert("No Data", "No orders to export.");
    orderExportService.exportToCSV(orders, currentSeller?.store_name || 'Store', filters.dateLabel, 'summary');
  };

  if (!currentSeller) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color="#D97706" />
    </View>
  );

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      {/* Header Section */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconContainer} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#1F2937" />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>Seller Hub</Text>
              <Text style={styles.headerSubtitle}>{currentSeller.store_name}</Text>
            </View>
          </View>
          <Pressable onPress={() => navigation.navigate('Notifications')}>
            <Bell size={22} color="#1F2937" strokeWidth={2.5} />
            <View style={styles.notificationBadge} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Toolbar */}
        <View style={styles.actionToolbar}>
          <Pressable style={styles.filterChip} onPress={() => setShowFilterModal(true)}>
            <Filter size={16} color="#D97706" />
            <Text style={styles.filterChipText}>
              {filters.dateLabel === 'Custom Range'
                ? `${filters.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${filters.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : filters.dateLabel}
            </Text>
          </Pressable>
          <Pressable style={styles.exportButton} onPress={handleExport}>
            <Download size={16} color="#FFFFFF" />
            <Text style={styles.exportButtonText}>Export Report</Text>
          </Pressable>
        </View>

        {/* 2x2 Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatCard
              label="Revenue"
              value={`₱${stats.totalRevenue.toLocaleString()}`}
              icon={<DollarSign size={18} color="#D97706" />}
              subValue="Delivered"
            />
            <StatCard
              label="Orders"
              value={stats.totalOrders}
              icon={<Package size={18} color="#D97706" />}
              subValue={`${stats.pendingCount} Pending`}
              subColor="#FBBF24"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              label="Avg. Value"
              value={`₱${Math.round(stats.avgOrderValue).toLocaleString()}`}
              icon={<Receipt size={18} color="#D97706" />}
              subValue="Per Order"
            />
            <StatCard
              label="Active Products"
              value={stats.activeProductsCount}
              icon={<Store size={18} color="#D97706" />}
              subValue={`${stats.lowStockCount} Low Stock`}
              subColor={stats.lowStockCount > 0 ? "#EF4444" : "#10B981"}
            />
          </View>
        </View>

        {/* Revenue Overview Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.chartCard}>
            {revenueChartData.length > 0 ? (
              <LineChart
                data={revenueChartData}
                height={160}
                width={width - 80}
                areaChart
                curved
                color="#D97706"
                startFillColor="rgba(255, 87, 34, 0.3)"
                endFillColor="rgba(255, 87, 34, 0.01)"
                yAxisTextStyle={styles.chartAxisText}
                xAxisLabelTextStyle={styles.chartAxisText}
                // Add these for better fit:
                initialSpacing={10}
                endSpacing={10}
                adjustToWidth={true}
              />
            ) : (
              <EmptyState message="No revenue data found" />
            )}
          </View>
        </View>

        {/* Categories Pie Chart */}
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsCard}>
            <Text style={styles.gridCardTitle}>Sales by Category</Text>
            <View style={{ alignItems: 'center' }}>
              <PieChart
                data={categoryData}
                donut
                radius={50}
                innerRadius={35}
                centerLabelComponent={() => <Text style={styles.pieCenterText}>{allProducts.length}</Text>}
              />

              <View style={styles.miniLegend}>
                {categoryData.map((item, idx) => (
                  <View key={idx} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text style={styles.legendText}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Top Products with Images */}
        <View style={styles.fullWidthSection}>
          <Text style={styles.sectionTitle}>Top Performing Products</Text>
          {topProducts.map((product: any, idx: number) => (
            <View key={product.id} style={styles.fullProductCard}>
              <View style={styles.productImageContainer}>
                <Image source={{ uri: safeImageUri(product.images?.[0]) }} style={styles.productThumb} />
                <View style={styles.rankBadge}><Text style={styles.rankText}>{idx + 1}</Text></View>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productNameText} numberOfLines={1}>{product.name}</Text>
                <Text style={styles.productSalesText}>{product.sales || 0} units sold</Text>
              </View>
              <Text style={styles.productPriceText}>₱{product.price.toLocaleString()}</Text>
            </View>
          ))}
        </View>

        {/* Recent Transactions with Navigation */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <Pressable onPress={() => navigation.navigate('Orders')}><Text style={styles.viewAllText}>View All</Text></Pressable>
          </View>
          {orders.slice(0, 5).map((order: any) => (
            <Pressable
              key={order.id}
              style={styles.slimOrderCard}
              onPress={() => navigation.navigate('SellerOrderDetail', { orderId: order.id })}
            >
              <View style={styles.slimOrderLeft}>
                <Text style={styles.orderIdText}>{order.orderId?.slice(0, 12) || order.id.slice(0, 12)}</Text>
                <Text style={styles.orderSubText}>{order.customerName || 'Walk-in'}</Text>
              </View>
              <View style={styles.slimOrderRight}>
                <Text style={styles.orderPriceText}>₱{order.total.toLocaleString()}</Text>
                <View style={[styles.miniStatus, { backgroundColor: order.status === 'completed' ? '#D1FAE5' : '#FFF4EC' }]}>
                  <Text style={[styles.miniStatusText, { color: order.status === 'completed' ? '#10B981' : '#D97706' }]}>
                    {order.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating Chat Button */}
      <Pressable style={styles.floatingMessageButton} onPress={() => navigation.navigate('Messages')}>
        <MessageCircle size={28} color="#FFF" />
        {unreadMessagesCount > 0 && (
          <View style={styles.messageBadge}><Text style={styles.messageBadgeText}>{unreadMessagesCount}</Text></View>
        )}
      </Pressable>

      {/* Date Filter Selection Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModalContent}>
            <Text style={styles.modalTitle}>Select Date Range</Text>

            {['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'All Time', 'Custom Range'].map((label) => (
              <Pressable
                key={label}
                style={styles.modalOption}
                onPress={() => {
                  if (label === 'Custom Range') {
                    setShowStartPicker(true);
                    return;
                  }

                  // Logic to reset and switch back to standard filters
                  let start = new Date();
                  let end = new Date();

                  if (label === 'Last 7 Days') start.setDate(start.getDate() - 7);
                  else if (label === 'Last 30 Days') start.setDate(start.getDate() - 30);
                  else if (label === 'This Month') start = new Date(start.getFullYear(), start.getMonth(), 1);
                  else if (label === 'Today') start.setHours(0, 0, 0, 0);
                  else if (label === 'All Time') start = new Date(2020, 0, 1); // Set to an early date

                  setFilters({
                    dateLabel: label,
                    startDate: start,
                    endDate: end
                  });
                  setShowFilterModal(false);
                }}
              >
                <Text style={[styles.optionText, filters.dateLabel === label && styles.activeOption]}>
                  {label}
                </Text>
              </Pressable>
            ))}

            <Pressable
              style={styles.closeModalButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showStartPicker && (
        <DateTimePicker
          value={filters.startDate}
          mode="date"
          maximumDate={new Date()} // Prevent future dates
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (event.type === 'set' && date) {
              setFilters((prev: any) => ({ ...prev, startDate: date }));
              // Automatically trigger the second picker immediately
              setTimeout(() => setShowEndPicker(true), 500);
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={filters.endDate}
          mode="date"
          minimumDate={filters.startDate} // Ensure end date is after start date
          maximumDate={new Date()}
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (event.type === 'set' && date) {
              setFilters((prev: any) => ({
                ...prev,
                endDate: date,
                dateLabel: 'Custom Range'
              }));
              setShowFilterModal(false); // Close the selection modal
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFBF0',
  },
  // --- Header Styles ---
  header: {
    backgroundColor: '#FFF4EC', // Peach background
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    elevation: 3,
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
  iconContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937', // Dark Charcoal
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  notificationBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFF4EC',
  },

  // --- Layout Sections ---
  scrollView: {
    flex: 1,
  },
  actionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 6,
    maxWidth: width * 0.5, // Prevent it from pushing the Export button off-screen
  },
  filterChipText: {
    fontSize: 12, // Slightly smaller font for ranges
    fontWeight: '600',
    color: '#374151',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706', // Primary Brand Orange
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // --- 2x2 Stats Grid ---
  statsGrid: {
    paddingHorizontal: 20,
    marginTop: 15,
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  statSubValue: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },

  // --- Charts & Analytics ---
  chartSection: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 3,
  },
  chartAxisText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  analyticsGrid: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  analyticsCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
  gridCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 10,
  },
  pieCenterText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1F2937',
  },
  miniLegend: {
    marginTop: 16,
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  // --- Full-Width Product Cards ---
  fullWidthSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  fullProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
  },
  productImageContainer: {
    position: 'relative',
  },
  productThumb: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  rankBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    backgroundColor: '#D97706',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  rankText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '800',
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  productSalesText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  productPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1F2937',
  },

  // --- Navigable Recent Transactions ---
  ordersSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },
  slimOrderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 1,
  },
  slimOrderLeft: {
    flex: 1,
  },
  slimOrderRight: {
    alignItems: 'flex-end',
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  orderSubText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  orderPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D97706',
  },
  miniStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  miniStatusText: {
    fontSize: 9,
    fontWeight: '800',
  },

  // --- Floating UI Elements ---
  floatingMessageButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D97706',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  messageBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  messageBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // --- Empty & Loader States ---
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModalContent: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
  },
  activeOption: {
    color: '#D97706',
    fontWeight: '700',
  },
  closeModalButton: {
    marginTop: 15,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  closeModalText: {
    textAlign: 'center',
    color: '#EF4444',
    fontWeight: '700',
  },
});