import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Menu,
  Bell,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingBag,
  DollarSign,
  AlertCircle,
} from 'lucide-react-native';
import { useAdminStats, useAdminSellers, useAdminProductQA } from '../../../src/stores/adminStore';
import AdminDrawer from '../../../src/components/AdminDrawer';

export default function AdminDashboardScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { stats, isLoading, loadDashboardData } = useAdminStats();
  const { pendingSellers } = useAdminSellers();
  const { pendingDigitalReview, inQualityReview, loadProducts } = useAdminProductQA();
  const insets = useSafeAreaInsets();

  // Reload dashboard every time screen comes into focus (e.g., when switching accounts)
  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      loadProducts();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await loadProducts();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString()}`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const statsData = [
    {
      id: '1',
      label: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      growth: stats.revenueGrowth,
      icon: <DollarSign size={24} color="#10B981" />,
      bgColor: '#D1FAE5',
      growthColor: '#10B981',
    },
    {
      id: '2',
      label: 'Total Orders',
      value: formatNumber(stats.totalOrders),
      growth: stats.ordersGrowth,
      icon: <ShoppingBag size={24} color="#3B82F6" />,
      bgColor: '#DBEAFE',
      growthColor: '#3B82F6',
    },
    {
      id: '3',
      label: 'Total Sellers',
      value: formatNumber(stats.totalSellers),
      growth: stats.sellersGrowth,
      icon: <Users size={24} color="#8B5CF6" />,
      bgColor: '#EDE9FE',
      growthColor: '#8B5CF6',
    },
    {
      id: '4',
      label: 'Total Buyers',
      value: formatNumber(stats.totalBuyers),
      growth: stats.buyersGrowth,
      icon: <Users size={24} color="#F59E0B" />,
      bgColor: '#FEF3C7',
      growthColor: '#F59E0B',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuButton} onPress={() => setDrawerVisible(true)}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <Text style={styles.headerSubtitle}>Admin Overview</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton}>
            <Bell size={22} color="#FFFFFF" strokeWidth={2} />
            {(pendingSellers.length > 0 || pendingDigitalReview.length > 0 || inQualityReview.length > 0) && (
              <View style={styles.notificationBadge} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF5722']} />
        }
      >
        {isLoading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {statsData.map((stat) => (
                <View key={stat.id} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: stat.bgColor }]}>
                    {stat.icon}
                  </View>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <View style={styles.statGrowth}>
                    {stat.growth >= 0 ? (
                      <TrendingUp size={14} color={stat.growthColor} />
                    ) : (
                      <TrendingDown size={14} color="#EF4444" />
                    )}
                    <Text style={[styles.statGrowthText, { color: stat.growth >= 0 ? stat.growthColor : '#EF4444' }]}>
                      {Math.abs(stat.growth).toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Pending Approvals */}
            {(pendingSellers.length > 0 || pendingDigitalReview.length > 0 || inQualityReview.length > 0) && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <AlertCircle size={24} color="#F59E0B" />
                  <Text style={styles.alertTitle}>Pending Approvals</Text>
                </View>
                <Text style={styles.alertText}>
                  {pendingSellers.length > 0 && (
                    <>You have {pendingSellers.length} seller application{pendingSellers.length > 1 ? 's' : ''} waiting for review{(pendingDigitalReview.length + inQualityReview.length) > 0 ? ', ' : ''}</>
                  )}
                  {pendingDigitalReview.length > 0 && (
                    <>{pendingSellers.length > 0 ? '' : 'You have '}{pendingDigitalReview.length} product{pendingDigitalReview.length > 1 ? 's' : ''} pending digital review{inQualityReview.length > 0 ? ', and ' : ''}</>
                  )}
                  {inQualityReview.length > 0 && (
                    <>{(pendingSellers.length === 0 && pendingDigitalReview.length === 0) ? 'You have ' : ''}{inQualityReview.length} product{inQualityReview.length > 1 ? 's' : ''} in physical QA queue</>
                  )}
                </Text>
                <Pressable style={styles.alertButton}>
                  <Text style={styles.alertButtonText}>Review Now</Text>
                </Pressable>
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Stats</Text>
              <View style={styles.quickStatsCard}>
                <View style={styles.quickStatRow}>
                  <Text style={styles.quickStatLabel}>Pending Sellers</Text>
                  <Text style={styles.quickStatValue}>{pendingSellers.length}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.quickStatRow}>
                  <Text style={styles.quickStatLabel}>Digital Review Queue</Text>
                  <Text style={styles.quickStatValue}>{pendingDigitalReview.length}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.quickStatRow}>
                  <Text style={styles.quickStatLabel}>Physical QA Queue</Text>
                  <Text style={styles.quickStatValue}>{inQualityReview.length}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.quickStatRow}>
                  <Text style={styles.quickStatLabel}>Active Sellers</Text>
                  <Text style={styles.quickStatValue}>{stats.totalSellers}</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.quickStatRow}>
                  <Text style={styles.quickStatLabel}>Active Buyers</Text>
                  <Text style={styles.quickStatValue}>{stats.totalBuyers}</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <AdminDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
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
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.95,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FF5722',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  statGrowth: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statGrowthText: {
    fontSize: 13,
    fontWeight: '600',
  },
  alertCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400E',
  },
  alertText: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 12,
    lineHeight: 20,
  },
  alertButton: {
    backgroundColor: '#F59E0B',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  alertButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  quickStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  quickStatLabel: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF5722',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
});
