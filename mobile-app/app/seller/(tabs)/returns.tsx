import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Pressable,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Bell, X, Search, ArrowLeft, ChevronRight,
  ListFilter, RotateCcw, Package
} from 'lucide-react-native';

import { useReturnStore } from '../../../src/stores/returnStore';
import { useSellerStore } from '../../../src/stores/sellerStore';
import { safeImageUri } from '../../../src/utils/imageUtils';

import { getStatusLabel, getStatusColor } from '../../../src/services/returnService';

type ReturnStatusFilter = 'all' | 'pending' | 'seller_review' | 'counter_offered' | 'approved' | 'rejected' | 'escalated' | 'return_in_transit' | 'refunded';

export default function SellerReturnsScreen() {
  const { seller } = useSellerStore();
  const {
    sellerReturns = [],
    isLoading,
    fetchSellerReturns,
  } = useReturnStore();
  
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [statusFilter, setStatusFilter] = useState<ReturnStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    if (seller?.id) {
      fetchSellerReturns(seller.id);
    }
  }, [seller?.id]);

  const onRefresh = async () => {
    if (seller?.id) {
      setRefreshing(true);
      await fetchSellerReturns(seller.id);
      setRefreshing(false);
    }
  };

  const filteredReturns = useMemo(() => {
    return sellerReturns.filter((req) => {
      const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
      
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || [
        req.id,
        req.orderNumber,
        req.buyerName,
        req.buyerEmail
      ].some(f => String(f || '').toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [sellerReturns, statusFilter, searchQuery]);

  const statusOptions: { label: string; value: ReturnStatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Review', value: 'seller_review' },
    { label: 'Counter', value: 'counter_offered' },
    { label: 'Approved', value: 'approved' },
    { label: 'Transit', value: 'return_in_transit' },
    { label: 'Refunded', value: 'refunded' },
    { label: 'Rejected', value: 'rejected' },
  ];

  const renderReturnItem = useCallback(({ item: req }: { item: any }) => {
    const statusColor = getStatusColor(req.status);
    const firstItem = req.itemsJson?.[0] || req.items?.[0];

    return (
      <Pressable 
        style={styles.returnCard} 
        onPress={() => navigation.navigate('ReturnDetail', { returnId: req.id })}
      >
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.returnId}>#{req.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.orderNumber}>Order: {req.orderNumber || req.orderId}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(req.status).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.cardBody}>
            <View style={styles.itemInfo}>
              <Image 
                source={{ uri: safeImageUri(firstItem?.image) }} 
                style={styles.itemThumbnail}
                contentFit="cover"
              />
              <View style={styles.itemTextContainer}>
                <Text style={styles.buyerName} numberOfLines={1}>{req.buyerName || 'Buyer'}</Text>
                <Text style={styles.reasonText} numberOfLines={1}>{req.returnReason || 'No reason'}</Text>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>Refund</Text>
              <Text style={styles.amountValue}>₱{(req.refundAmount || 0).toLocaleString()}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.dateText}>
              {new Date(req.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
            <View style={styles.viewRow}>
              <Text style={styles.viewText}>View Details</Text>
              <ChevronRight size={14} color="#9CA3AF" />
            </View>
          </View>
        </View>
      </Pressable>
    );
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Pressable style={styles.iconContainer} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#1F2937" />
            </Pressable>
            <View>
              <Text style={styles.headerTitle}>Returns</Text>
              <Text style={styles.headerSubtitle}>Refund Requests</Text>
            </View>
          </View>
          <Pressable style={styles.notificationButton} onPress={() => navigation.getParent()?.navigate('Notifications')}>
            <Bell size={22} color="#1F2937" strokeWidth={2.5} />
            <View style={styles.notificationBadge} />
          </Pressable>
        </View>
      </View>

      {/* Action Bar */}
      <View style={styles.actionBar}>
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Returns..."
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
      </View>

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {statusOptions.map((option) => (
            <Pressable
              key={option.value}
              style={[styles.tab, statusFilter === option.value && styles.tabActive]}
              onPress={() => setStatusFilter(option.value)}
            >
              <Text style={[styles.tabText, statusFilter === option.value && styles.tabTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredReturns}
        keyExtractor={(item) => item.id}
        renderItem={renderReturnItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing || isLoading} onRefresh={onRefresh} colors={['#D97706']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {isLoading ? (
              <ActivityIndicator size="large" color="#D97706" />
            ) : (
              <>
                <RotateCcw size={48} color="#E5E7EB" strokeWidth={1} />
                <Text style={styles.emptyText}>No return requests found.</Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFBF0' },
  header: { 
    backgroundColor: '#FFF4EC', 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30, 
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 10
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#4B5563', fontWeight: '500' },
  notificationButton: { position: 'relative' },
  notificationBadge: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF4EC' },
  
  actionBar: { paddingHorizontal: 20, marginTop: 15 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 15, 
    paddingHorizontal: 15, 
    height: 48, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937', marginLeft: 10 },
  
  tabsContainer: { marginTop: 15 },
  tabsScroll: { paddingHorizontal: 20, gap: 10, paddingBottom: 5 },
  tab: { 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    backgroundColor: '#FFF', 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  tabActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#4B5563' },
  tabTextActive: { color: '#FFF' },
  
  listContent: { padding: 20, paddingBottom: 40 },
  returnCard: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    marginBottom: 15, 
    flexDirection: 'row', 
    overflow: 'hidden', 
    elevation: 3, 
    shadowColor: '#000', 
    shadowOpacity: 0.08, 
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }
  },
  statusIndicator: { width: 5 },
  cardContent: { flex: 1, padding: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  returnId: { fontSize: 14, fontWeight: '800', color: '#1F2937' },
  orderNumber: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '900' },
  
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  itemThumbnail: { width: 45, height: 45, borderRadius: 10, backgroundColor: '#F3F4F6' },
  itemTextContainer: { flex: 1 },
  buyerName: { fontSize: 14, fontWeight: '700', color: '#374151' },
  reasonText: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  amountContainer: { alignItems: 'flex-end' },
  amountLabel: { fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase' },
  amountValue: { fontSize: 16, fontWeight: '800', color: '#D97706' },
  
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingTop: 12, 
    borderTopWidth: 1, 
    borderTopColor: '#F3F4F6' 
  },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  viewRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewText: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 60, gap: 15 },
  emptyText: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
});
