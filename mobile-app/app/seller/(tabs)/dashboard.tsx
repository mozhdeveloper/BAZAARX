import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, TrendingDown, Package, Eye, DollarSign, Menu, Bell, Receipt, AlertCircle, ChevronRight, Store, Clock, PlusSquare, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-gifted-charts';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SellerStackParamList } from '../SellerStack';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { useReturnStore } from '../../../src/stores/returnStore';
import { chatService } from '../../../src/services/chatService';
import SellerDrawer from '../../../src/components/SellerDrawer';

const { width } = Dimensions.get('window');

export default function SellerDashboardScreen() {
  const { stats, revenueData, orders, seller } = useSellerStore();
  const getReturnRequestsBySeller = useReturnStore((state) => state.getReturnRequestsBySeller);
  // Assuming seller has an ID or name matching the return requests. 
  // For now using a hardcoded value or seller.storeName as per previous context
  const returnRequests = getReturnRequestsBySeller('TechStore Official');
  const pendingReturns = returnRequests.filter(r => r.status === 'pending_review');

  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const recentOrders = orders.slice(0, 3);

  // Fetch unread messages count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!seller?.id) return;
      
      try {
        const conversations = await chatService.getSellerConversations(seller.id);
        const totalUnread = conversations.reduce((sum, conv) => sum + (conv.seller_unread_count || 0), 0);
        setUnreadMessagesCount(totalUnread);
      } catch (error) {
        console.error('[Dashboard] Error fetching unread messages:', error);
      }
    };

    fetchUnreadCount();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [seller?.id]);

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
          {/* Left Section: Menu & Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable style={styles.iconContainer} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Seller Hub</Text>
              <Text style={styles.headerSubtitle}>{seller.storeName}</Text>
            </View>
          </View>
        </View>

        {/* Notification Button: Absolute positioned to match Settings */}
        <Pressable
          style={[styles.notificationButton, { position: 'absolute', right: 20, top: insets.top + 20 }]}
        >
          <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
          <View style={styles.notificationBadge} />
        </Pressable>
      </View>

      {/* Pending Approval Banner */}
      {seller.approval_status === 'pending' && (
        <View style={styles.pendingBanner}>
          <AlertCircle size={20} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.pendingBannerText}>
            Your account is pending approval. Please complete your profile verification.
          </Text>
        </View>
      )}

      {seller.approval_status === 'pending' ? (
        <ScrollView
          contentContainerStyle={styles.pendingContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Check if all documents are uploaded */}
          {(() => {
            const hasAllDocs = seller.business_permit_url &&
              seller.valid_id_url &&
              seller.proof_of_address_url &&
              seller.dti_registration_url &&
              seller.tax_id_url;

            if (hasAllDocs) {
              return (
                <LinearGradient
                  colors={['#FFF5F0', '#FFFFFF']}
                  style={styles.pendingHero}
                >
                  <View style={styles.pendingIconWrapper}>
                    <Clock size={40} color="#FF9800" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.pendingTitle}>Verification Pending</Text>
                  <Text style={styles.pendingDescription}>
                    Your documents have been submitted and are currently being reviewed by our team.
                    This process usually takes 1-2 business days. We'll notify you once your store is approved!
                  </Text>
                </LinearGradient>
              );
            } else {
              return (
                <View style={styles.pendingActionCard}>
                  <View style={[styles.pendingIconWrapper, { marginBottom: 20 }]}>
                    <PlusSquare size={40} color="#FF5722" strokeWidth={2.5} />
                  </View>
                  <Text style={styles.actionCardTitle}>Complete Your Profile</Text>
                  <Text style={styles.actionCardSubtitle}>
                    To start selling, you need to upload your business documents for verification.
                    Your account is currently restricted until all requirements are met.
                  </Text>
                  <Pressable
                    style={styles.verifyButton}
                    onPress={() => navigation.navigate('StoreProfile' as any)}
                  >
                    <LinearGradient
                      colors={['#FF5722', '#FF7043']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.verifyGradient}
                    >
                      <Store size={20} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.verifyButtonText}>Go to Store Profile</Text>
                      <ChevronRight size={18} color="#FFFFFF" strokeWidth={2.5} />
                    </LinearGradient>
                  </Pressable>
                </View>
              );
            }
          })()}

          <View style={styles.pendingInfoNote}>
            <AlertCircle size={16} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.infoNoteText}>
              Functions like adding products, viewing orders, and POS Lite will be enabled once your account is approved.
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View>
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

              {/* Returns Card */}
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Receipt size={24} color="#FF5722" strokeWidth={2.5} />
                </View>
                <Text style={styles.statLabel}>Pending Returns</Text>
                <Text style={styles.statValue}>{pendingReturns.length}</Text>
                <View style={styles.statChange}>
                  {pendingReturns.length > 0 ? (
                    <>
                      <AlertCircle size={14} color="#EF4444" strokeWidth={2.5} />
                      <Text style={[styles.statChangeText, { color: '#EF4444' }]}>Action Needed</Text>
                    </>
                  ) : (
                    <Text style={[styles.statChangeText, { color: '#10B981' }]}>All Good</Text>
                  )}
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

          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Floating Messages Button */}
      <Pressable 
        style={styles.floatingMessageButton} 
        onPress={() => navigation.navigate('Messages')}
      >
        <MessageCircle size={28} color="#FFF" />
        {unreadMessagesCount > 0 && (
          <View style={styles.messageBadge}>
            <Text style={styles.messageBadgeText}>
              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
            </Text>
          </View>
        )}
      </Pressable>
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
    paddingHorizontal: 20, // Increased from 16 to 20
    paddingBottom: 16,
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
  // Added the Settings icon container look
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22, // Increased from 20 to 22
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
    width: 40, // Consistent sizing
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 5,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 10,
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
  sectionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5722',
  },
  orderDate: {
    fontSize: 12,
    color: '#6B7280',
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
  pendingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  pendingHero: {
    width: '100%',
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  pendingIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
  pendingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 10,
  },
  pendingDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  pendingActionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 30,
  },
  actionCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  actionCardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
    fontWeight: '500',
  },
  verifyButton: {
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  verifyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  pendingInfoNote: {
    width: '100%',
    padding: 20,
    alignItems: 'center',
  },
  infoNoteText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  disabledContainer: {
    opacity: 0.5,
  },
  pendingBanner: {
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  pendingBannerText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  floatingMessageButton: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF5722',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
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
});
