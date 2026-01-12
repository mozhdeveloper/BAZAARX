import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput } from 'react-native';
import { ArrowLeft, Zap, Search, Calendar, TrendingUp } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminFlashSales } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminFlashSalesScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { flashSales, isLoading, loadFlashSales } = useAdminFlashSales();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'active' | 'ended'>('all');

  useEffect(() => {
    loadFlashSales();
  }, []);

  const filteredFlashSales = flashSales.filter(sale => {
    const matchesSearch = sale.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' ? true : sale.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      scheduled: { bg: '#FEF3C7', color: '#D97706', text: 'Scheduled' },
      active: { bg: '#D1FAE5', color: '#059669', text: 'Active' },
      ended: { bg: '#E5E7EB', color: '#6B7280', text: 'Ended' },
    }[status];
    return (
      <View style={[styles.statusBadge, { backgroundColor: config?.bg }]}>
        <Text style={[styles.statusText, { color: config?.color }]}>{config?.text}</Text>
      </View>
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Flash Sales</Text>
            <Text style={styles.headerSubtitle}>Manage flash sale campaigns</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search flash sales..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {['all', 'scheduled', 'active', 'ended'].map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, filterStatus === filter && styles.filterChipActive]}
              onPress={() => setFilterStatus(filter as any)}
            >
              <Text style={[styles.filterChipText, filterStatus === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#FF5722" />
            <Text style={styles.loadingText}>Loading flash sales...</Text>
          </View>
        ) : filteredFlashSales.length === 0 ? (
          <View style={styles.centerContent}>
            <Zap size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No flash sales found</Text>
          </View>
        ) : (
          filteredFlashSales.map((sale) => (
            <View key={sale.id} style={styles.saleCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.saleName}>{sale.name}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.dateText}>
                      {formatDate(sale.startDate)} - {formatDate(sale.endDate)}
                    </Text>
                  </View>
                </View>
                {getStatusBadge(sale.status)}
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{sale.totalProducts}</Text>
                  <Text style={styles.statLabel}>Products</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>₱{sale.totalRevenue.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Revenue</Text>
                </View>
              </View>
            </View>
          ))
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
  filtersContainer: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: '#111827' },
  filterScrollView: { flexGrow: 0 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: '#FF5722' },
  filterChipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  saleCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flex: 1 },
  saleName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 13, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#FF5722', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
});
