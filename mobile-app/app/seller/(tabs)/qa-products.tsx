import React, { useState, useCallback } from 'react';
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
  Camera,
  Truck,
  ArrowRight,
  CheckCircle,
} from 'lucide-react-native';
import { useProductQAStore, ProductQAStatus } from '../../../src/stores/productQAStore';
import { useSellerStore } from '../../../src/stores/sellerStore';
import SellerDrawer from '../../../src/components/SellerDrawer';

type FilterStatus = 'all' | 'pending' | 'waiting' | 'qa' | 'revision' | 'verified' | 'rejected';
type ReviewStep = 'choose' | 'physical';

export default function SellerProductQAScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedProductStatus, setSelectedProductStatus] = useState<string>('');
  const [selectedLogistics, setSelectedLogistics] = useState<string>('');
  const [reviewStep, setReviewStep] = useState<ReviewStep>('choose');
  const insets = useSafeAreaInsets();

  const {
    products: qaProducts,
    submitSample,
    submitForDigitalReview,
    submitForPhysicalReview,
    loadProducts,
    isLoading,
  } = useProductQAStore();
  const { seller } = useSellerStore();

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

  const pendingCount = sellerQAProducts.filter((p) => p.status === 'PENDING_ADMIN_REVIEW').length;
  const waitingCount = sellerQAProducts.filter((p) => p.status === 'WAITING_FOR_SAMPLE' || p.status === 'PENDING_DIGITAL_REVIEW').length;
  const reviewCount = sellerQAProducts.filter((p) => p.status === 'IN_QUALITY_REVIEW').length;
  const verifiedCount = sellerQAProducts.filter((p) => p.status === 'ACTIVE_VERIFIED').length;
  const revisionCount = sellerQAProducts.filter((p) => p.status === 'FOR_REVISION').length;
  const rejectedCount = sellerQAProducts.filter((p) => p.status === 'REJECTED').length;

  const getFilteredProducts = () => {
    let filteredQA = sellerQAProducts;
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        filteredQA = filteredQA.filter((p) => p.status === 'PENDING_ADMIN_REVIEW');
      } else if (filterStatus === 'waiting') {
        filteredQA = filteredQA.filter((p) => p.status === 'WAITING_FOR_SAMPLE' || p.status === 'PENDING_DIGITAL_REVIEW');
      } else {
        const statusMap: Record<string, ProductQAStatus> = {
          qa: 'IN_QUALITY_REVIEW',
          revision: 'FOR_REVISION',
          verified: 'ACTIVE_VERIFIED',
          rejected: 'REJECTED',
        };
        const target = statusMap[filterStatus];
        if (target) filteredQA = filteredQA.filter((p) => p.status === target);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredQA = filteredQA.filter(
        (p) =>
          String(p.name || '').toLowerCase().includes(q) ||
          String(p.category || '').toLowerCase().includes(q)
      );
    }
    return filteredQA;
  };

  const filteredProducts = getFilteredProducts();

  const openSubmitModal = (productId: string, productStatus: string) => {
    setSelectedProduct(productId);
    setSelectedProductStatus(productStatus);
    setReviewStep(productStatus === 'WAITING_FOR_SAMPLE' ? 'physical' : 'choose');
    setSelectedLogistics('');
    setSubmitModalOpen(true);
  };

  const closeModal = () => {
    setSubmitModalOpen(false);
    setSelectedProduct(null);
    setSelectedProductStatus('');
    setSelectedLogistics('');
    setReviewStep('choose');
  };

  const handleDigitalReview = async () => {
    if (!selectedProduct) return;
    try {
      await submitForDigitalReview(selectedProduct);
      closeModal();
      Alert.alert('Digital Review Submitted', 'Your product has been queued for digital QA review. Our team will review your photos and listing details.');
      if (seller?.id) await loadProducts(seller.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit for digital review. Please try again.');
    }
  };

  const handlePhysicalSubmit = async () => {
    if (!selectedProduct || !selectedLogistics) {
      Alert.alert('Error', 'Please select a logistics method');
      return;
    }
    try {
      if (selectedProductStatus === 'PENDING_DIGITAL_REVIEW') {
        await submitForPhysicalReview(selectedProduct, selectedLogistics);
        closeModal();
        Alert.alert('Physical Review Scheduled', 'Please send your product sample using the chosen method. We will notify you once received.');
      } else {
        await submitSample(selectedProduct, selectedLogistics);
        closeModal();
        Alert.alert('Sample Confirmed', 'Your product sample submission has been confirmed. Our QA team will inspect it shortly.');
      }
      if (seller?.id) await loadProducts(seller.id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit. Please try again.');
    }
  };

  const getStatusLabel = (status: ProductQAStatus): string => {
    const labels: Record<string, string> = {
      PENDING_ADMIN_REVIEW: 'Pending Admin Review',
      PENDING_DIGITAL_REVIEW: 'Awaiting Sample',
      WAITING_FOR_SAMPLE: 'Awaiting Sample',
      IN_QUALITY_REVIEW: 'In QA Review',
      ACTIVE_VERIFIED: 'Verified',
      FOR_REVISION: 'Needs Revision',
      REJECTED: 'Rejected',
    };
    return labels[status] || status.replace(/_/g, ' ');
  };

  const getStatusColor = (status: ProductQAStatus) => {
    const colors: Record<string, string> = {
      PENDING_ADMIN_REVIEW: '#6B7280',
      PENDING_DIGITAL_REVIEW: '#D97706',
      WAITING_FOR_SAMPLE: '#D97706',
      IN_QUALITY_REVIEW: '#8B5CF6',
      ACTIVE_VERIFIED: '#10B981',
      FOR_REVISION: '#D97706',
      REJECTED: '#EF4444',
    };
    return colors[status] || '#6B7280';
  };

  const StatCard = ({ count, label, icon: Icon, isActive, onPress }: {
    count: number; label: string; icon: any; isActive: boolean; onPress: () => void;
  }) => (
    <TouchableOpacity onPress={onPress} style={[styles.statCard, isActive && styles.statCardActive]}>
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
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
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
          {isLoading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#D97706" />
              <Text style={styles.emptyText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No products found</Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <Image source={{ uri: safeImageUri(product.image) }} style={styles.productImage} />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>{String(product.name || '')}</Text>
                  <Text style={styles.productPrice}>P{product.price.toLocaleString()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(product.status)}18` }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(product.status) }]}>
                      {getStatusLabel(product.status)}
                    </Text>
                  </View>

                  {product.status === 'PENDING_DIGITAL_REVIEW' && (
                    <TouchableOpacity
                      style={styles.submitBtn}
                      onPress={() => openSubmitModal(product.productId, product.status)}
                    >
                      <Text style={styles.submitBtnText}>Submit for QA</Text>
                      <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}

                  {product.status === 'WAITING_FOR_SAMPLE' && (
                    <TouchableOpacity
                      style={[styles.submitBtn, styles.submitBtnSecondary]}
                      onPress={() => openSubmitModal(product.productId, product.status)}
                    >
                      <Text style={styles.submitBtnText}>Confirm Sample Sent</Text>
                    </TouchableOpacity>
                  )}

                  {product.status === 'REJECTED' && product.rejectionReason && (
                    <Text style={styles.rejectionText} numberOfLines={2}>
                      Reason: {product.rejectionReason}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={submitModalOpen} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {reviewStep === 'choose' ? 'Submit for QA Review' : 'Physical Sample Submission'}
              </Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalCloseBtn}>
                <X size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {reviewStep === 'choose'
                ? "Choose how you'd like to submit your product for quality review"
                : "Select how you'll send your product sample to our facility"}
            </Text>

            {reviewStep === 'choose' ? (
              <View style={styles.choiceContainer}>
                <TouchableOpacity style={styles.choiceCard} onPress={handleDigitalReview}>
                  <View style={[styles.choiceIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Camera size={22} color="#3B82F6" strokeWidth={2} />
                  </View>
                  <View style={styles.choiceText}>
                    <Text style={styles.choiceTitle}>Digital Review</Text>
                    <Text style={styles.choiceDesc}>Our QA team reviews your listing photos and details online. No shipping needed.</Text>
                    <View style={styles.choiceTag}>
                      <CheckCircle size={11} color="#3B82F6" strokeWidth={2.5} />
                      <Text style={styles.choiceTagText}>Free - 1-2 business days</Text>
                    </View>
                  </View>
                  <ArrowRight size={18} color="#9CA3AF" strokeWidth={2} />
                </TouchableOpacity>

                <TouchableOpacity style={[styles.choiceCard, styles.choiceCardOrange]} onPress={() => setReviewStep('physical')}>
                  <View style={[styles.choiceIcon, { backgroundColor: '#FFF7ED' }]}>
                    <Truck size={22} color="#D97706" strokeWidth={2} />
                  </View>
                  <View style={styles.choiceText}>
                    <Text style={styles.choiceTitle}>Physical Sample</Text>
                    <Text style={styles.choiceDesc}>Send a physical product sample to our QA facility for hands-on inspection.</Text>
                    <View style={[styles.choiceTag, { backgroundColor: '#FFF7ED' }]}>
                      <Package size={11} color="#D97706" strokeWidth={2.5} />
                      <Text style={[styles.choiceTagText, { color: '#D97706' }]}>Shipping required - 3-5 days</Text>
                    </View>
                  </View>
                  <ArrowRight size={18} color="#9CA3AF" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.logisticsContainer}>
                {['Drop-off by Courier', 'Onsite Visit'].map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setSelectedLogistics(option)}
                    style={[styles.logisticsOption, selectedLogistics === option && styles.logisticsOptionActive]}
                  >
                    <View style={[styles.radioCircle, selectedLogistics === option && styles.radioCircleActive]}>
                      {selectedLogistics === option && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.optionTitle}>{option}</Text>
                      <Text style={styles.optionDesc}>
                        {option === 'Drop-off by Courier'
                          ? 'Send via courier to our QA facility'
                          : 'Visit our QA facility in person (P200 fee)'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {selectedLogistics === 'Drop-off by Courier' && (
                  <View style={styles.addressBox}>
                    <Text style={styles.addressTitle}>Send your product to:</Text>
                    <Text style={styles.addressText}>
                      {'BazaarX QA Facility\nUnit 2B, Tech Hub Building\n1234 Innovation Drive, BGC, Taguig City\nMetro Manila, 1630'}
                    </Text>
                  </View>
                )}

                {selectedLogistics === 'Onsite Visit' && (
                  <View style={[styles.addressBox, { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }]}>
                    <Text style={styles.addressTitle}>Visit us at:</Text>
                    <Text style={styles.addressText}>
                      {'BazaarX QA Facility\nUnit 2B, Tech Hub Building\n1234 Innovation Drive, BGC, Taguig City\nMon-Fri 9AM-5PM | Processing Fee: P200'}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => {
                  if (reviewStep === 'physical') {
                    setReviewStep('choose');
                    setSelectedLogistics('');
                  } else {
                    closeModal();
                  }
                }}
              >
                <Text style={styles.modalCancelText}>{reviewStep === 'physical' ? 'Back' : 'Cancel'}</Text>
              </TouchableOpacity>

              {reviewStep === 'physical' && (
                <TouchableOpacity
                  style={[styles.modalSubmit, !selectedLogistics && styles.modalSubmitDisabled]}
                  onPress={handlePhysicalSubmit}
                  disabled={!selectedLogistics}
                >
                  <Text style={styles.modalSubmitText}>
                    {selectedProductStatus === 'WAITING_FOR_SAMPLE' ? 'Confirm Sent' : 'Schedule Pickup'}
                  </Text>
                </TouchableOpacity>
              )}
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
    elevation: 3,
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
    gap: 8,
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
    minWidth: 110,
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
    gap: 12,
  },
  productImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  productPrice: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  submitBtn: {
    backgroundColor: '#D97706',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 14,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  submitBtnSecondary: { backgroundColor: '#FF5722' },
  submitBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  rejectionText: { fontSize: 12, color: '#EF4444', marginTop: 8, fontStyle: 'italic' },
  emptyContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 40, alignItems: 'center', marginTop: 20 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  modalCloseBtn: { padding: 4 },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 18 },
  choiceContainer: { gap: 12, marginBottom: 20 },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 2,
    borderColor: '#DBEAFE',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#F0F9FF',
  },
  choiceCardOrange: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  choiceIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1 },
  choiceTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  choiceDesc: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 17 },
  choiceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 8,
  },
  choiceTagText: { fontSize: 11, fontWeight: '600', color: '#3B82F6' },
  logisticsContainer: { gap: 10, marginBottom: 20 },
  logisticsOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  logisticsOptionActive: { borderColor: '#D97706', backgroundColor: '#FFF4EC' },
  radioCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  radioCircleActive: { borderColor: '#D97706' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D97706' },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  optionDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  addressBox: { borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14 },
  addressTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  addressText: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalSubmit: { flex: 1, backgroundColor: '#D97706', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  modalSubmitDisabled: { backgroundColor: '#D1D5DB' },
  modalSubmitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
