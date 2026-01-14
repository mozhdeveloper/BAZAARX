import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, Package, Eye, DollarSign, Menu, Bell } from 'lucide-react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useSellerStore } from '../../../src/stores/sellerStore';
import SellerDrawer from '../../../src/components/SellerDrawer';

const { width } = Dimensions.get('window');

export default function SellerDashboardScreen() {
  const { stats, revenueData, orders, seller } = useSellerStore();
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);

  const recentOrders = orders.slice(0, 3);

  const chartData = revenueData.map((item) => ({
    value: item.value / 1000, // Convert to thousands for better display
    label: item.date.split(' ')[1], // Just show day number
    dataPointText: `₱${(item.value / 1000).toFixed(0)}k`,
  }));

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

  const maxVal = Math.max(...chartData.map(d => d.value));
  return (
    <View style={styles.container}>
      {/* Seller Drawer */}
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      
      {/* Immersive Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuButton} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Seller Hub</Text>
              <Text style={styles.headerSubtitle}>{seller.storeName}</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton}>
            <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
            <View style={styles.notificationBadge} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScroll}
        >
          {/* Revenue Card */}
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <DollarSign size={24} color="#FF5722" strokeWidth={2.5} />
            </View>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.statValue}>₱{stats.totalRevenue.toLocaleString()}</Text>
            <View style={styles.statChange}>
              <TrendingUp size={14} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.statChangeText}>+{stats.revenueChange}%</Text>
            </View>
          </View>

          {/* Orders Card */}
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Package size={24} color="#FF5722" strokeWidth={2.5} />
            </View>
            <Text style={styles.statLabel}>Total Orders</Text>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <View style={styles.statChange}>
              <TrendingUp size={14} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.statChangeText}>+{stats.ordersChange}%</Text>
            </View>
          </View>

          {/* Visits Card */}
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Eye size={24} color="#FF5722" strokeWidth={2.5} />
            </View>
            <Text style={styles.statLabel}>Store Visits</Text>
            <Text style={styles.statValue}>{stats.totalVisits.toLocaleString()}</Text>
            <View style={styles.statChange}>
              <TrendingUp size={14} color="#10B981" strokeWidth={2.5} />
              <Text style={styles.statChangeText}>+{stats.visitsChange}%</Text>
            </View>
          </View>
        </ScrollView>

        {/* Revenue Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Last 7 Days Revenue</Text>
          <View style={styles.chartCard}>
            <LineChart
              data={chartData}
              height={180}
              width={width - 100}
              maxValue={maxVal * 1.1}
              adjustToWidth={true} 
              scrollToEnd={false}
              color="#FF5722"
              thickness={3}
              startFillColor="rgba(255, 87, 34, 0.3)"
              endFillColor="rgba(255, 87, 34, 0.05)"
              startOpacity={0.9}
              endOpacity={0.2}
              initialSpacing={15}
              endSpacing={5}
              spacing={45}
              noOfSections={4}
              yAxisColor="#E5E7EB"
              xAxisColor="#E5E7EB"
              yAxisTextStyle={styles.chartAxisText}
              xAxisLabelTextStyle={styles.chartAxisText}
              curved
              areaChart
              hideDataPoints={false}
              dataPointsColor="#FF5722"
              dataPointsRadius={5}
              textShiftY={-8}
              textShiftX={-10}
              textFontSize={11}
              textColor="#6B7280"
            />
          </View>
        </View>

        {/* Recent Orders */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <Pressable>
              <Text style={styles.viewAllText}>View All</Text>
            </Pressable>
          </View>

          {recentOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
  {/* The container for ID/Name must have flex: 1 and flexShrink: 1 */}
  <View style={styles.orderTextContainer}> 
    <Text style={styles.orderId} numberOfLines={1} ellipsizeMode="tail">
      {order.orderId}
    </Text>
    <Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
      {order.customerName}
    </Text>
  </View>

  {/* The Badge needs flexShrink: 0 so it never gets squashed */}
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
      numberOfLines={1}
    >
      {order.status.replace('-', ' ').toUpperCase()}
    </Text>
  </View>
</View>
              <View style={styles.orderFooter}>
                <Text style={styles.orderItems}>
                  {order.items.length} item{order.items.length > 1 ? 's' : ''}
                </Text>
                <Text style={styles.orderTotal}>₱{order.total.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>

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
    paddingHorizontal: 16,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
    fontSize: 20,
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
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FF5722',
  },
  scrollView: {
    flex: 1,
  },
  statsScroll: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    width: 160,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  chartSection: {
    paddingHorizontal: 20,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  chartAxisText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  ordersSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center', 
    marginBottom: 12,
    width: '100%', 
  },
  orderTextContainer: {
    flex: 1, 
    flexShrink: 1, 
    marginRight: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    flexShrink: 0,  
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  orderItems: {
    fontSize: 13,
    color: '#6B7280',
  },
  orderTotal: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF5722',
  },
});
