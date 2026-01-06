import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Download, Menu, Bell } from 'lucide-react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { useSellerStore } from '../../../src/stores/sellerStore';

const { width } = Dimensions.get('window');

type TimeRange = '7d' | '30d' | '90d';

export default function SellerAnalyticsScreen() {
  const { stats, revenueData, categorySales, products } = useSellerStore();
  const insets = useSafeAreaInsets();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('7d');

  const chartData = revenueData.map((item) => ({
    value: item.value / 1000,
    label: item.date.split(' ')[1],
  }));

  const pieData = categorySales.map((item, index) => ({
    value: item.value,
    color: item.color,
    text: `${item.value}%`,
  }));

  const topProducts = products
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF5722" />
      
      {/* Immersive Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.menuButton}>
              <Menu size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Analytics</Text>
              <Text style={styles.headerSubtitle}>Store Performance</Text>
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
        {/* Time Range Pills */}
        <View style={styles.filterPills}>
          {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
            <Pressable
              key={range}
              style={[
                styles.pillButton,
                selectedRange === range && styles.pillButtonActive,
              ]}
              onPress={() => setSelectedRange(range)}
            >
              <Text
                style={[
                  styles.pillButtonText,
                  selectedRange === range && styles.pillButtonTextActive,
                ]}
              >
                {range === '7d'
                  ? '7 Days'
                  : range === '30d'
                  ? '30 Days'
                  : '90 Days'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Revenue Trend Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Revenue Trend</Text>
          <View style={styles.chartCard}>
            <LineChart
              data={chartData}
              height={200}
              width={width - 72}
              color="#FF5722"
              thickness={3}
              startFillColor="rgba(255, 87, 34, 0.4)"
              endFillColor="rgba(255, 87, 34, 0.1)"
              startOpacity={0.9}
              endOpacity={0.2}
              initialSpacing={10}
              spacing={50}
              noOfSections={5}
              yAxisColor="#E5E7EB"
              xAxisColor="#E5E7EB"
              yAxisTextStyle={styles.chartAxisText}
              xAxisLabelTextStyle={styles.chartAxisText}
              curved
              areaChart
              hideDataPoints={false}
              dataPointsColor="#FF5722"
              dataPointsRadius={6}
            />
          </View>
        </View>

        {/* Category Sales Pie Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Sales by Category</Text>
          <View style={styles.chartCard}>
            <View style={styles.pieChartContainer}>
              <PieChart
                data={pieData}
                radius={80}
                innerRadius={50}
                textColor="#FFFFFF"
                textSize={14}
                fontWeight="700"
                showText
              />
            </View>
            <View style={styles.legendContainer}>
              {categorySales.map((item, index) => (
                <View key={index} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: item.color }]}
                  />
                  <Text style={styles.legendText}>
                    {item.category} ({item.value}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Top Products Table */}
        <View style={styles.tableSection}>
          <Text style={styles.sectionTitle}>Top 5 Products</Text>
          <View style={styles.tableCard}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2 }]}>
                Product
              </Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Sold</Text>
              <Text
                style={[
                  styles.tableHeaderText,
                  { flex: 1, textAlign: 'right' },
                ]}
              >
                Revenue
              </Text>
            </View>

            {/* Table Rows */}
            {topProducts.map((product, index) => (
              <View key={product.id} style={styles.tableRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <Text
                  style={[styles.tableCell, { flex: 2 }]}
                  numberOfLines={1}
                >
                  {product.name}
                </Text>
                <Text style={[styles.tableCell, { flex: 1 }]}>
                  {product.sold}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableCellRevenue,
                    { flex: 1, textAlign: 'right' },
                  ]}
                >
                  ₱{(product.price * product.sold).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
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
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  filterPills: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 8,
  },
  pillButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  pillButtonActive: {
    backgroundColor: '#FF5722',
    borderColor: '#FF5722',
  },
  pillButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  pillButtonTextActive: {
    color: '#FFFFFF',
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
  pieChartContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  legendContainer: {
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: '#4B5563',
  },
  tableSection: {
    paddingHorizontal: 20,
  },
  tableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF5722',
  },
  tableCell: {
    fontSize: 13,
    color: '#4B5563',
  },
  tableCellRevenue: {
    fontWeight: '700',
    color: '#FF5722',
  },
});
