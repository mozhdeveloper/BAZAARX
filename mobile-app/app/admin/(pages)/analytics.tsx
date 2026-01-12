import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { ArrowLeft, DollarSign, ShoppingBag, Users, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminAnalytics } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminAnalyticsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { stats, revenueData, topProducts, isLoading, loadAnalytics } = useAdminAnalytics();

  useEffect(() => {
    loadAnalytics();
  }, []);

  const statsCards = [
    { title: 'Total Revenue', value: stats.totalRevenue, change: stats.revenueChange, isPositive: true, icon: DollarSign, color: '#10B981' },
    { title: 'Total Orders', value: stats.totalOrders, change: stats.ordersChange, isPositive: true, icon: ShoppingBag, color: '#3B82F6' },
    { title: 'Active Users', value: stats.activeUsers, change: stats.usersChange, isPositive: true, icon: Users, color: '#8B5CF6' },
    { title: 'Conversion Rate', value: stats.conversionRate, change: stats.conversionChange, isPositive: false, icon: TrendingUp, color: '#FF5722' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Analytics Dashboard</Text>
            <Text style={styles.headerSubtitle}>Platform insights and metrics</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {statsCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <View key={index} style={styles.statCard}>
                    <View style={styles.statHeader}>
                      <Text style={styles.statTitle}>{stat.title}</Text>
                      <View style={[styles.iconContainer, { backgroundColor: stat.color + '20' }]}>
                        <Icon size={20} color={stat.color} />
                      </View>
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <View style={styles.changeRow}>
                      {stat.isPositive ? (
                        <ArrowUpRight size={16} color="#10B981" />
                      ) : (
                        <ArrowDownRight size={16} color="#EF4444" />
                      )}
                      <Text style={[styles.changeText, { color: stat.isPositive ? '#10B981' : '#EF4444' }]}>
                        {stat.change}
                      </Text>
                      <Text style={styles.changePeriod}>vs last month</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Products</Text>
              {topProducts.map((product, index) => (
                <View key={index} style={styles.productCard}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <View style={styles.productStats}>
                    <View style={styles.productStat}>
                      <Text style={styles.productStatLabel}>Sales</Text>
                      <Text style={styles.productStatValue}>{product.sales}</Text>
                    </View>
                    <View style={styles.productStat}>
                      <Text style={styles.productStatLabel}>Revenue</Text>
                      <Text style={styles.productStatValue}>₱{product.revenue.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: '#FF5722', paddingHorizontal: 20, paddingBottom: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 4 },
  headerTitleContainer: { gap: 2 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#FFFFFF', opacity: 0.9 },
  scrollView: { flex: 1 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  statsGrid: { padding: 16, gap: 12 },
  statCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, elevation: 2 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  statTitle: { fontSize: 14, color: '#6B7280' },
  iconContainer: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeText: { fontSize: 14, fontWeight: '600' },
  changePeriod: { fontSize: 12, color: '#9CA3AF' },
  section: { padding: 16, paddingTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  productCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  productName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  productStats: { flexDirection: 'row', gap: 16 },
  productStat: { flex: 1 },
  productStatLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  productStatValue: { fontSize: 16, fontWeight: 'bold', color: '#FF5722' },
});
