import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { SellerStackParamList } from '../SellerStack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Bell } from 'lucide-react-native';
import { LineChart, PieChart } from 'react-native-gifted-charts';
import { useSellerStore } from '../../../src/stores/sellerStore';

const { width } = Dimensions.get('window');

type TimeRange = '7d' | '30d' | '90d';

export default function SellerAnalyticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  
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
    .sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0))
    .slice(0, 5);

  return (
    <View style={styles.container}>
      {/* Immersive Edge-to-Edge Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          {/* Left Section: Icon and Titles */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity 
              style={styles.iconContainer} 
              onPress={() => navigation.goBack()}
            >
              {/* Replace ArrowLeft with Menu or SettingsIcon depending on the screen */}
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
            </TouchableOpacity>
            
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Analytics</Text>
              <Text style={styles.headerSubtitle}>Store performance</Text>
            </View>
          </View>
        </View>

        {/* Notification Button: Positioned absolutely to match Settings.tsx */}
        <Pressable
          style={[styles.notificationButton, { position: 'absolute', right: 20, top: insets.top + 20 }]}
        >
          <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
          <View style={styles.notificationBadge} />
        </Pressable>
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Revenue Trend</Text>
          </View>          
          <View style={styles.chartCard}>
            <LineChart
              data={chartData}
              height={180}
              width={width - 100}
              color="#FF5722"
              thickness={3}
              startFillColor="rgba(255, 87, 34, 0.4)"
              endFillColor="rgba(255, 87, 34, 0.1)"
              startOpacity={0.9}
              endOpacity={0.2}
              initialSpacing={5}
              endSpacing={5}
              spacing={50}
              maxValue={Math.max(...chartData.map(d => d.value)) * 1.1}
              noOfSections={4}
              yAxisColor="#E5E7EB"
              xAxisColor="#E5E7EB"
              yAxisTextStyle={styles.chartAxisText}
              xAxisLabelTextStyle={styles.chartAxisText}
              curved
              areaChart
              focusEnabled
              hideDataPoints={false}
              dataPointsColor="#FF5722"
              dataPointsRadius={6}
            />
          </View>
        </View>

        {/* Category Sales Pie Chart */}
        <View style={styles.chartSection}>
          <View style={styles.sectionHeaderRow}>  
            <Text style={styles.sectionTitle}>Sales by Category</Text>
          </View>          
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Top 5 Products</Text>
            <TouchableOpacity onPress={() => {/* Navigation logic */}}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tableCard}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 2.5 }]}>Product</Text>
              <Text style={[styles.tableHeaderText, { flex: 1, textAlign: 'center' }]}>Sold</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5, textAlign: 'right' }]}>Revenue</Text>
            </View>

            {/* Table Rows */}
            {topProducts.map((product, index) => (
              <View key={product.id} style={styles.tableRow}>
                <View style={{ flex: 2.5, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.tableNameCell} numberOfLines={1}>
                    {product.name}
                  </Text>
                </View>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>
                  {product.sales ?? 0}
                </Text>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.tableCellRevenue} numberOfLines={1} ellipsizeMode="tail">
                    ₱{(product.price * (product.sales ?? 0)).toLocaleString()}
                  </Text>
                </View>
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
    backgroundColor: '#FF5722', // Theme Primary Orange
    paddingHorizontal: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderBottomLeftRadius: 20, 
    borderBottomRightRadius: 20, // Rounded bottom corners for the "Card" look
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconContainer: {
    backgroundColor: 'rgba(255,255,255,0.2)', // Translucent white background
    padding: 12,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 22, // Large bold title
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
    width: 40,
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
    backgroundColor: '#EF4444', // Red badge
    borderWidth: 1.5,
    borderColor: '#FF5722', // Border matches header background to prevent cutoff look
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllText: {
    color: '#FF5722',
    fontSize: 14,
    fontWeight: '600',
  },
  tableNameCell: {
    flex: 1, // Allows text to fill space then truncate
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
    paddingRight: 8,
  },
  tableCellRevenue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5722',
    textAlign: 'right',
  },
  // Update sectionTitle to remove bottom margin since it's now in sectionHeaderRow
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
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
});
