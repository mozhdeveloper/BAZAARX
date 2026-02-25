import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { safeImageUri } from '../../../src/utils/imageUtils';
import {
  FileCheck,
  Clock,
  Package,
  XCircle,
  RefreshCw,
  BadgeCheck,
  Search,
  X,
  Menu,
} from 'lucide-react-native';
import { useProductQAStore, ProductQAStatus } from '../../../src/stores/productQAStore';
import { useSellerStore } from '../../../src/stores/sellerStore';
import SellerDrawer from '../../../src/components/SellerDrawer';

type FilterStatus = 'all' | 'pending' | 'waiting' | 'qa' | 'revision' | 'verified' | 'rejected';

export default function SellerProductQAScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [logisticsMethod, setLogisticsMethod] = useState('');
  const [selectedLogistics, setSelectedLogistics] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const { products: qaProducts, submitSample, loadProducts, isLoading } = useProductQAStore();
  const { seller, products: sellerProducts = [] } = useSellerStore();

  useFocusEffect(
    useCallback(() => {
      if (seller?.id) {
        loadProducts(seller.id);
      }
    }, [seller?.id])
  );

  const sellerQAProducts = qaProducts.filter((p) => {
    if (seller?.id && p.sellerId) return p.sellerId === seller.id;
    if (seller?.store_name && p.vendor) {
      return p.vendor.toLowerCase() === seller.store_name.toLowerCase();
    }
    return false;
  });

  const pendingCount = sellerQAProducts.filter((p) => p.status === 'PENDING_DIGITAL_REVIEW').length;
  const waitingCount = sellerQAProducts.filter((p) => p.status === 'WAITING_FOR_SAMPLE').length;
  const reviewCount = sellerQAProducts.filter((p) => p.status === 'IN_QUALITY_REVIEW').length;
  const verifiedCount = sellerQAProducts.filter((p) => p.status === 'ACTIVE_VERIFIED').length;
  const revisionCount = sellerQAProducts.filter((p) => p.status === 'FOR_REVISION').length;
  const rejectedCount = sellerQAProducts.filter((p) => p.status === 'REJECTED').length;

  const getFilteredProducts = () => {
    let filteredQA = sellerQAProducts;
    if (filterStatus !== 'all') {
      const statusMap: Record<string, ProductQAStatus> = {
        pending: 'PENDING_DIGITAL_REVIEW',
        waiting: 'WAITING_FOR_SAMPLE',
        qa: 'IN_QUALITY_REVIEW',
        revision: 'FOR_REVISION',
        verified: 'ACTIVE_VERIFIED',
        rejected: 'REJECTED',
      };
      filteredQA = filteredQA.filter(p => p.status === statusMap[filterStatus]);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredQA = filteredQA.filter(p =>
        String(p.name || '').toLowerCase().includes(q) ||
        String(p.category || '').toLowerCase().includes(q)
      );
    }
    return filteredQA;
  };

  const filteredQAProducts = getFilteredProducts();

  const handleSubmitSample = async () => {
    if (!selectedProduct || !selectedLogistics) {
      Alert.alert('Error', 'Please select a logistics method');
      return;
    }
    try {
      await submitSample(selectedProduct, selectedLogistics);
      Alert.alert('Success', 'Sample submitted for review.');
      setSubmitModalOpen(false);
      if (seller?.id) await loadProducts(seller.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit sample');
    }
  };

  const getStatusColor = (status: ProductQAStatus) => {
    const colors = {
      PENDING_DIGITAL_REVIEW: '#F59E0B',
      WAITING_FOR_SAMPLE: '#3B82F6',
      IN_QUALITY_REVIEW: '#8B5CF6',
      ACTIVE_VERIFIED: '#10B981',
      FOR_REVISION: '#D97706',
      REJECTED: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const StatCard = ({ count, label, icon: Icon, isActive, onPress }: any) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.statCard, isActive && styles.statCardActive]}
    >
      <Icon size={20} color={isActive ? '#D97706' : '#9CA3AF'} strokeWidth={2} />
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );

  if (!seller) return null;

  return (
    <View style={styles.container}>
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />

      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuButton} onPress={() => setDrawerVisible(true)}>
            <Menu size={24} color="#1F2937" strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle} numberOfLines={1}>Product QA Status</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>Track quality assurance status</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}><X size={20} color="#9CA3AF" /></TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statsScroll}
          contentContainerStyle={styles.statsScrollContent}
        >
          <StatCard count={pendingCount} label="Pending" icon={Clock} isActive={filterStatus === 'pending'} onPress={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')} />
          <StatCard count={waitingCount} label="Awaiting" icon={Package} isActive={filterStatus === 'waiting'} onPress={() => setFilterStatus(filterStatus === 'waiting' ? 'all' : 'waiting')} />
          <StatCard count={reviewCount} label="QA Queue" icon={FileCheck} isActive={filterStatus === 'qa'} onPress={() => setFilterStatus(filterStatus === 'qa' ? 'all' : 'qa')} />
          <StatCard count={revisionCount} label="Revision" icon={RefreshCw} isActive={filterStatus === 'revision'} onPress={() => setFilterStatus(filterStatus === 'revision' ? 'all' : 'revision')} />
          <StatCard count={verifiedCount} label="Verified" icon={BadgeCheck} isActive={filterStatus === 'verified'} onPress={() => setFilterStatus(filterStatus === 'verified' ? 'all' : 'verified')} />
          <StatCard count={rejectedCount} label="Rejected" icon={XCircle} isActive={filterStatus === 'rejected'} onPress={() => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected')} />
        </ScrollView>

        <View style={styles.listContainer}>
          {filteredQAProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            filteredQAProducts.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <Image source={{ uri: safeImageUri(product.image) }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{String(product.name || '')}</Text>
                  <Text style={styles.productPrice}>₱{product.price.toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(product.status)}15` }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(product.status) }]}>{product.status.replace(/_/g, ' ')}</Text>
                  </View>
                  {product.status === 'WAITING_FOR_SAMPLE' && (
                    <TouchableOpacity style={styles.submitBtn} onPress={() => { setSelectedProduct(product.productId); setSubmitModalOpen(true); }}>
                      <Text style={styles.submitBtnText}>Submit Sample</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={submitModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Submit Product Sample</Text>
            {['Pick-up at My Location', 'Drop-off by Courier', 'Schedule Onsite Visit'].map((option) => (
              <TouchableOpacity key={option} onPress={() => setSelectedLogistics(option)} style={[styles.logisticsOption, selectedLogistics === option && styles.logisticsOptionActive]}>
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setSubmitModalOpen(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, !selectedLogistics && styles.modalSubmitDisabled]} onPress={handleSubmitSample} disabled={!selectedLogistics}><Text style={styles.modalSubmitText}>Submit</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF4EC' },
  header: {
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    elevation: 3
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuButton: { backgroundColor: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  headerSubtitle: { fontSize: 13, color: '#4B5563', fontWeight: '500', marginTop: 2 },
  searchSection: { paddingHorizontal: 20, marginTop: 15 },
  searchBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111827' },
  statsScroll: { paddingVertical: 16 },
  statsScrollContent: { paddingHorizontal: 16, gap: 12 },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    flex: 1,
    minWidth: 110
  },
  statCardActive: { backgroundColor: '#FFF4EC', borderColor: '#D97706', borderWidth: 2 },
  statCount: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 8 },
  statLabel: { fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 4 },
  listContainer: { paddingHorizontal: 16, paddingBottom: 100 },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    gap: 12
  },
  productImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  productPrice: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  submitBtn: { backgroundColor: '#D97706', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, marginTop: 12, alignItems: 'center' },
  submitBtnText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  emptyContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  logisticsOption: { borderWidth: 2, borderColor: '#E5E7EB', borderRadius: 10, padding: 14, marginBottom: 12 },
  logisticsOptionActive: { borderColor: '#D97706', backgroundColor: '#FFF4EC' },
  optionText: { fontSize: 14, fontWeight: '600', color: '#111827' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalSubmit: { flex: 1, backgroundColor: '#D97706', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalSubmitDisabled: { backgroundColor: '#D1D5DB' },
  modalSubmitText: { color: '#FFFFFF', fontWeight: '600' }
});