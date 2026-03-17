import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  Calendar,
  Folder,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react-native';
import { useProductQAStore, ProductQAStatus } from '../../../src/stores/productQAStore';
import { useSellerStore } from '../../../src/stores/sellerStore';
import SellerDrawer from '../../../src/components/SellerDrawer';

// Helper to reliably parse logistics strings vs JSON
export const formatLogisticsInfo = (logistics: string | null | undefined): { title: string; subtitle: string | null } => {
  if (!logistics) return { title: 'Unknown Method', subtitle: null };

  const cleanLogistics = logistics.trim();

  try {
    const isJsonLike = cleanLogistics.startsWith('{') || cleanLogistics.startsWith('[');
    if (isJsonLike) {
      const parsed = JSON.parse(cleanLogistics);
      if (parsed.method === 'Drop-off by Courier' || parsed.courier !== 'Onsite Drop-off') {
        const tracking = parsed.trackingNumber ? ` • ${parsed.trackingNumber}` : '';
        return {
          title: `Courier${tracking}`,
          subtitle: parsed.courier || null
        };
      }
      if (parsed.method === 'Onsite Visit' || parsed.courier === 'Onsite Drop-off') {
        const dateRaw = parsed.trackingNumber?.replace('Scheduled for ', '') || '';
        return {
          title: `Onsite Drop-off`,
          subtitle: dateRaw ? dateRaw : null
        };
      }
      return { title: parsed.method || 'Unknown Method', subtitle: null };
    } else {
      // Handle "Method (Courier: Tracking)" format used by Store temporarily
      if (cleanLogistics.includes('Onsite Drop-off')) {
        const datePart = cleanLogistics.split('Scheduled for ')[1]?.replace(')', '') || 'Pending';
        return { title: 'Onsite Drop-off', subtitle: datePart };
      }
      if (cleanLogistics.includes('Drop-off by Courier')) {
        return { title: 'Courier', subtitle: 'Pending' };
      }

      // Legacy formatted string handler
      if (logistics.toLowerCase().includes('onsite')) return { title: 'Onsite Drop-off', subtitle: 'Pending' };
      if (logistics.toLowerCase().includes('courier')) return { title: 'Courier', subtitle: 'Pending' };
      return { title: logistics, subtitle: null };
    }
  } catch (e) {
    if (logistics.toLowerCase().includes('onsite')) return { title: 'Onsite Drop-off', subtitle: 'Pending' };
    if (logistics.toLowerCase().includes('courier')) return { title: 'Courier', subtitle: 'Pending' };
    return { title: logistics, subtitle: null };
  }
};

type FilterStatus = 'all' | 'pending' | 'waiting' | 'qa' | 'revision' | 'verified' | 'rejected';
type ReviewStep = 'choose' | 'physical';

export default function SellerProductQAScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedProductStatus, setSelectedProductStatus] = useState<string>('');
  
  // Logistics form state
  const [reviewStep, setReviewStep] = useState<ReviewStep>('choose');
  const [selectedReviewType, setSelectedReviewType] = useState<'digital' | 'physical' | null>(null);
  const [selectedLogistics, setSelectedLogistics] = useState<string>('');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [dropOffDate, setDropOffDate] = useState<Date | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Separate modals for Shipment and Drop-off (matching web)
  const [shipmentModalOpen, setShipmentModalOpen] = useState(false);
  const [shipmentProductId, setShipmentProductId] = useState<string | null>(null);
  const [dropOffModalOpen, setDropOffModalOpen] = useState(false);
  const [dropOffProductId, setDropOffProductId] = useState<string | null>(null);
  
  // Multi-select state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // Batch folder collapse
  const [collapsedBatches, setCollapsedBatches] = useState<Set<string>>(new Set());
  
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    let filteredQA = [...sellerQAProducts];

    // Sort: Newest submissions first (based on submittedAt)
    // Fallback chronology: If no submittedAt, items with ID suffix / later entries are prioritized
    filteredQA.sort((a, b) => {
      // Prioritize submittedAt if available
      const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
      const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
      
      if (dateB !== dateA) return dateB - dateA;
      
      // Secondary sort: Reverse ID to approximate arrival order if timestamps are missing or identical
      return b.id.localeCompare(a.id);
    });
    
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
      filteredQA = filteredQA.filter((p) =>
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
    setReviewStep('choose');
    setSelectedLogistics('');
    setCourierName('');
    setTrackingNumber('');
    setDropOffDate(undefined);
    setSelectedReviewType(null);
    setIsSubmitting(false);
    setSubmitModalOpen(true);
  };

  const closeModal = () => {
    setSubmitModalOpen(false);
    setSelectedProduct(null);
    setSelectedProductStatus('');
    setSelectedLogistics('');
    setCourierName('');
    setTrackingNumber('');
    setDropOffDate(undefined);
    setReviewStep('choose');
    setSelectedReviewType(null);
    setIsSubmitting(false);
  };

  const handleDigitalReview = async () => {
    if (!selectedProduct) return;
    setIsSubmitting(true);
    try {
      await submitForDigitalReview(selectedProduct);
      closeModal();
      Alert.alert('Digital Review Submitted', 'Your product has been queued for digital QA review. Our team will review your photos and listing details.');
      if (seller?.id) await loadProducts(seller.id);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit for digital review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhysicalSubmit = async () => {
    if (!selectedProduct || !selectedLogistics) {
      Alert.alert('Error', 'Please select a logistics method');
      return;
    }
    
    // Validation for Logistics Input
    if (selectedProductStatus !== 'PENDING_DIGITAL_REVIEW') {
      if (selectedLogistics === 'Drop-off by Courier') {
        if (!courierName.trim() || !trackingNumber.trim()) {
          Alert.alert('Error', 'Please provide both Courier Name and Tracking Number');
          return;
        }
      } else if (selectedLogistics === 'Onsite Visit') {
        if (!dropOffDate) {
          Alert.alert('Error', 'Please choose a drop-off date');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      if (selectedProductStatus === 'PENDING_DIGITAL_REVIEW') {
        // Step 1: Just declaring the intent
        await submitForPhysicalReview(selectedProduct, selectedLogistics);
        closeModal();
        Alert.alert('Physical Review Scheduled', 'Please send your product sample using the chosen method. We will notify you once received.');
      } else {
        // Step 2 & 3: Officially inputting tracking metrics (Waiting for Sample OR In Quality Review for reschedule)
        let payloadDetails: any;
        if (selectedLogistics === 'Onsite Visit' && dropOffDate) {
           const formattedDate = dropOffDate.toLocaleDateString('en-US', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
           });
           payloadDetails = { courier: 'Onsite Drop-off', trackingNumber: `Scheduled for ${formattedDate}` };
        } else if (selectedLogistics === 'Drop-off by Courier') {
           payloadDetails = { courier: courierName, trackingNumber };
        }
        
        await submitSample(selectedProduct, selectedLogistics, payloadDetails);
        closeModal();
        Alert.alert('Sample Confirmed', 'Your tracking information has been saved successfully.');
      }
      if (seller?.id) await loadProducts(seller.id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRescheduling = selectedProductStatus === 'IN_QUALITY_REVIEW';

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

  const statusOptions = [
    { value: 'pending' as FilterStatus, label: 'Pending', count: pendingCount },
    { value: 'waiting' as FilterStatus, label: 'Awaiting Sample', count: waitingCount },
    { value: 'qa' as FilterStatus, label: 'QA Queue', count: reviewCount },
    { value: 'revision' as FilterStatus, label: 'Revision', count: revisionCount },
    { value: 'verified' as FilterStatus, label: 'Verified', count: verifiedCount },
    { value: 'rejected' as FilterStatus, label: 'Rejected', count: rejectedCount },
    { value: 'all' as FilterStatus, label: 'All', count: sellerQAProducts.length },
  ];

  const toggleProductSelection = (productId: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) newSet.delete(productId); else newSet.add(productId);
    setSelectedProducts(newSet);
  };

  const getSubmittableIds = () => {
    return filteredProducts.filter(p => p.status === 'PENDING_DIGITAL_REVIEW').map(p => p.productId);
  };

  const toggleSelectAll = () => {
    const ids = getSubmittableIds();
    if (selectedProducts.size === ids.length && ids.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(ids));
    }
  };

  // Parse batchId from logistics JSON
  const getBatchId = (product: any): string | null => {
    if (!product.logistics) return null;
    try {
      const parsed = JSON.parse(product.logistics);
      return parsed.batchId || null;
    } catch { return null; }
  };

  const toggleBatchCollapse = (batchId: string) => {
    const s = new Set(collapsedBatches);
    if (s.has(batchId)) s.delete(batchId); else s.add(batchId);
    setCollapsedBatches(s);
  };

  // Separate shipment confirm handler
  const handleConfirmShipment = async () => {
    if (!shipmentProductId || !courierName.trim() || !trackingNumber.trim()) {
      Alert.alert('Error', 'Please provide both courier and tracking number');
      return;
    }
    setIsSubmitting(true);
    try {
      await submitSample(shipmentProductId, 'Drop-off by Courier', { courier: courierName, trackingNumber });
      setShipmentModalOpen(false);
      setShipmentProductId(null);
      setCourierName('');
      setTrackingNumber('');
      Alert.alert('Shipment Confirmed', 'Tracking information saved. Your product is now in QA review.');
      if (seller?.id) await loadProducts(seller.id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to confirm shipment.');
    } finally { setIsSubmitting(false); }
  };

  // Separate drop-off schedule handler
  const handleScheduleDropOff = async () => {
    if (!dropOffProductId || !dropOffDate) {
      Alert.alert('Error', 'Please select a drop-off date');
      return;
    }
    setIsSubmitting(true);
    try {
      const formattedDate = dropOffDate.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
      await submitSample(dropOffProductId, 'Onsite Visit', {
        courier: 'Onsite Drop-off', trackingNumber: `Scheduled for ${formattedDate}`
      });
      setDropOffModalOpen(false);
      setDropOffProductId(null);
      setDropOffDate(undefined);
      Alert.alert('Drop-off Scheduled', `Your onsite visit is scheduled for ${formattedDate}.`);
      if (seller?.id) await loadProducts(seller.id);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to schedule drop-off.');
    } finally { setIsSubmitting(false); }
  };

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
        {/* Pill Tab Navigation */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}
        >
          {statusOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setFilterStatus(opt.value)}
              style={[
                styles.tabPill,
                filterStatus === opt.value && styles.tabPillActive,
              ]}
            >
              <Text style={[
                styles.tabPillText,
                filterStatus === opt.value && styles.tabPillTextActive,
              ]}>
                {opt.label} ({opt.count})
              </Text>
            </TouchableOpacity>
          ))}
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

                  {/* Tracking Badge / Reschedule Flow */}
                  {product.status === 'IN_QUALITY_REVIEW' && product.logistics && (
                    <View style={styles.qaQueueBox}>
                      {(() => {
                        const info = formatLogisticsInfo(product.logistics);
                        
                        // Parse tracking date for onsite visits
                        let isPastDue = false;
                        if (info.title === 'Onsite Drop-off' && info.subtitle && info.subtitle !== 'Pending') {
                          try {
                            const dropDate = new Date(info.subtitle.replace('Scheduled for ', ''));
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            isPastDue = dropDate < today;
                          } catch (e) {}
                        }

                        if (isPastDue) {
                          return (
                            <>
                              <View style={[styles.logisticsBadge, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
                                <Calendar size={12} color="#EF4444" />
                                <Text style={[styles.logisticsBadgeTitle, { color: '#EF4444' }]} numberOfLines={1}>Missed Drop-off</Text>
                              </View>
                              <TouchableOpacity
                                style={[styles.submitBtn, { backgroundColor: '#EF4444', alignSelf: 'flex-start', marginTop: 8 }]}
                                onPress={() => {
                                  setDropOffProductId(product.productId);
                                  setSelectedProductStatus('IN_QUALITY_REVIEW');
                                  setDropOffDate(undefined);
                                  setDropOffModalOpen(true);
                                }}
                              >
                                <RefreshCw size={14} color="#FFFFFF" />
                                <Text style={styles.submitBtnText}>Reschedule</Text>
                              </TouchableOpacity>
                            </>
                          );
                        }

                        // Normal tracking/scheduled display
                        return (
                          <View style={styles.logisticsBadge}>
                            {info.title === 'Courier' ? <Truck size={12} color="#1D4ED8" /> : <Calendar size={12} color="#1E40AF" />}
                            <View style={{ flex: 1 }}>
                              <Text style={styles.logisticsBadgeTitle} numberOfLines={1}>{info.title}</Text>
                              {info.subtitle && <Text style={styles.logisticsBadgeSub} numberOfLines={1}>{info.subtitle}</Text>}
                            </View>
                          </View>
                        );
                      })()}
                    </View>
                  )}

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
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={() => {
                          setShipmentProductId(product.productId);
                          setShipmentModalOpen(true);
                        }}
                      >
                        <Truck size={14} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Ship</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.submitBtn, { backgroundColor: '#2B4C8C' }]}
                        onPress={() => {
                          setDropOffProductId(product.productId);
                          setDropOffModalOpen(true);
                        }}
                      >
                        <Calendar size={14} color="#FFFFFF" />
                        <Text style={styles.submitBtnText}>Drop-off</Text>
                      </TouchableOpacity>
                    </View>
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
            {/* Header */}
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
              /* ═══ STEP 1: Choose Review Type ═══ */
              <View style={styles.choiceContainer}>
                {/* Digital Review — Disabled */}
                <View style={[styles.choiceCard, { opacity: 0.6, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB' }]}>
                  <View style={[styles.choiceIcon, { backgroundColor: '#F3F4F6' }]}>
                    <Camera size={22} color="#9CA3AF" strokeWidth={2} />
                  </View>
                  <View style={styles.choiceText}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={[styles.choiceTitle, { color: '#9CA3AF' }]}>Digital Review (Suspended)</Text>
                      <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 9, fontWeight: '800', color: '#2563EB', textTransform: 'uppercase' }}>Coming Soon</Text>
                      </View>
                    </View>
                    <Text style={[styles.choiceDesc, { color: '#9CA3AF', fontStyle: 'italic' }]}>
                      This feature is temporarily unavailable while we upgrade our verification protocols.
                    </Text>
                    <View style={[styles.choiceTag, { backgroundColor: '#F3F4F6' }]}>
                      <Text style={[styles.choiceTagText, { color: '#9CA3AF' }]}>Offline Mode</Text>
                    </View>
                  </View>
                  <X size={16} color="#D1D5DB" strokeWidth={2} />
                </View>

                {/* Physical Sample — Active */}
                <TouchableOpacity
                  style={[styles.choiceCard, styles.choiceCardOrange, selectedReviewType === 'physical' && styles.choiceCardSelectedOrange]}
                  onPress={() => setSelectedReviewType('physical')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.choiceIcon, { backgroundColor: selectedReviewType === 'physical' ? '#FDE68A' : '#FFF7ED' }]}>
                    <Truck size={22} color="#D97706" strokeWidth={2} />
                  </View>
                  <View style={styles.choiceText}>
                    <Text style={styles.choiceTitle}>Physical Sample</Text>
                    <Text style={styles.choiceDesc}>Send a physical product sample to our QA facility for hands-on inspection.</Text>
                    <View style={[styles.choiceTag, { backgroundColor: '#FFF7ED' }]}>
                      <Package size={11} color="#D97706" strokeWidth={2.5} />
                      <Text style={[styles.choiceTagText, { color: '#D97706' }]}>Shipping required · 3-5 business days</Text>
                    </View>
                  </View>
                  {selectedReviewType === 'physical'
                    ? <CheckCircle size={20} color="#D97706" strokeWidth={2.5} />
                    : <ArrowRight size={18} color="#9CA3AF" strokeWidth={2} />}
                </TouchableOpacity>
              </View>
            ) : (
              /* ═══ STEP 2: Logistics Method ═══ */
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Logistics Method</Text>

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
                          ? 'Send product sample via courier service to our QA facility'
                          : 'Visit our QA facility in person to submit your product sample'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                {selectedLogistics === 'Drop-off by Courier' && (
                  <View style={[styles.addressBox, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
                    <Text style={styles.addressTitle}>Send your product to:</Text>
                    <Text style={styles.addressText}>
                      {'BazaarX QA Facility\nUnit 2B, Tech Hub Building\n1234 Innovation Drive, BGC, Taguig City\nMetro Manila, 1630'}
                    </Text>
                  </View>
                )}
                {selectedLogistics === 'Onsite Visit' && (
                  <View style={[styles.addressBox, { borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }]}>
                    <Text style={[styles.addressTitle, { color: '#92400E' }]}>Visit us at:</Text>
                    <Text style={[styles.addressText, { color: '#92400E' }]}>
                      {'BazaarX QA Facility\nUnit 2B, Tech Hub Building\n1234 Innovation Drive, BGC, Taguig City\nOperating Hours: Mon-Fri, 9AM-5PM\nProcessing Fee: ₱200'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* ═══ FOOTER BUTTONS ═══ */}
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
                disabled={isSubmitting}
              >
                <Text style={styles.modalCancelText}>
                  {reviewStep === 'physical' ? '← Back' : 'Cancel'}
                </Text>
              </TouchableOpacity>

              {reviewStep === 'choose' ? (
                <TouchableOpacity
                  style={[styles.modalSubmit, !selectedReviewType && styles.modalSubmitDisabled]}
                  disabled={!selectedReviewType || isSubmitting}
                  onPress={() => { if (selectedReviewType === 'physical') setReviewStep('physical'); }}
                >
                  <Text style={styles.modalSubmitText}>
                    {selectedReviewType === 'physical' ? 'Next →' : 'Select an Option'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalSubmit, (!selectedLogistics || isSubmitting) && styles.modalSubmitDisabled]}
                  onPress={handlePhysicalSubmit}
                  disabled={!selectedLogistics || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Submit Sample</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirm Shipment Modal */}
      <Modal visible={shipmentModalOpen} transparent animationType="slide" onRequestClose={() => setShipmentModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Shipment Details</Text>
              <TouchableOpacity onPress={() => setShipmentModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Provide tracking information for your shipped product sample</Text>
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Courier Service</Text>
                <View style={[styles.textInput, { paddingHorizontal: 0, overflow: 'hidden' }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 12, alignItems: 'center' }}>
                    {['Lalamove', 'Grab Express', 'J&T Express', 'NinjaVan', 'Flash Express', 'Other'].map((c) => (
                      <TouchableOpacity key={c} onPress={() => setCourierName(c)} style={[styles.courierChip, courierName === c && styles.courierChipActive]}>
                        <Text style={[styles.courierChipText, courierName === c && styles.courierChipTextActive]}>{c}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Tracking Number</Text>
                <TextInput style={styles.textInput} placeholder="Enter tracking number" placeholderTextColor="#9CA3AF" value={trackingNumber} onChangeText={setTrackingNumber} />
              </View>
              <View style={[styles.addressBox, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.addressTitle}>QA Facility Address</Text>
                <Text style={styles.addressText}>{'BazaarX Quality Assurance Center\n123 Commerce Ave, Makati City, Metro Manila 1234'}</Text>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShipmentModalOpen(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: '#FFB17A' }, (!courierName || !trackingNumber || isSubmitting) && styles.modalSubmitDisabled]} onPress={handleConfirmShipment} disabled={!courierName || !trackingNumber || isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>Confirm Shipment</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Drop-off Modal */}
      <Modal visible={dropOffModalOpen} transparent animationType="slide" onRequestClose={() => setDropOffModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Drop-off Date</Text>
              <TouchableOpacity onPress={() => setDropOffModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#6B7280" strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Select a date for your onsite visit to our facility</Text>
            <View style={styles.formContainer}>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                <Calendar size={18} color="#D97706" />
                <Text style={[styles.dateSelectorText, !dropOffDate && { color: '#9CA3AF' }]}>
                  {dropOffDate ? dropOffDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Tap to select a date...'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker value={dropOffDate || new Date()} mode="date" display="default" minimumDate={new Date()} onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) setDropOffDate(selectedDate); }} />
              )}
              <View style={[styles.addressBox, { borderColor: '#BFDBFE', backgroundColor: '#EFF6FF' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center' }}>
                    <Package size={16} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.addressTitle, { marginBottom: 2 }]}>QA Facility Address</Text>
                    <Text style={styles.addressText}>{'BazaarX Quality Assurance Center\n123 Commerce Ave, Makati City\nMon-Fri, 9:00 AM - 5:00 PM'}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDropOffModalOpen(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.modalSubmit, { backgroundColor: '#2B4C8C' }, (!dropOffDate || isSubmitting) && styles.modalSubmitDisabled]} onPress={handleScheduleDropOff} disabled={!dropOffDate || isSubmitting}>
                {isSubmitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalSubmitText}>Confirm Schedule</Text>}
              </TouchableOpacity>
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
  tabScroll: { marginTop: 16, marginBottom: 4 },
  tabScrollContent: { paddingHorizontal: 16, gap: 6 },
  tabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A50',
  },
  tabPillActive: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  tabPillText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  tabPillTextActive: { color: '#FFFFFF', fontWeight: '700' },
  listContainer: { paddingTop: 8, paddingHorizontal: 16, paddingBottom: 100 },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FAE8D4',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  productImage: { width: 90, height: 110, backgroundColor: '#F3F4F6' },
  productInfo: { flex: 1, padding: 14, justifyContent: 'center', gap: 6 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1F2937', letterSpacing: -0.2 },
  productPrice: { fontSize: 16, fontWeight: '800', color: '#D97706' },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  submitBtn: {
    backgroundColor: '#D97706',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  submitBtnSecondary: { backgroundColor: '#FF5722' },
  submitBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  rejectionText: { fontSize: 11, color: '#EF4444', fontStyle: 'italic', marginTop: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1F2937' },
  modalCloseBtn: { padding: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  choiceContainer: { gap: 12, marginBottom: 20 },
  choiceCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: '#DBEAFE', borderRadius: 14, padding: 16, backgroundColor: '#F0F9FF' },
  choiceCardOrange: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  choiceCardSelectedBlue: { borderColor: '#3B82F6', borderWidth: 2.5, backgroundColor: '#EFF6FF' },
  choiceCardSelectedOrange: { borderColor: '#D97706', borderWidth: 2.5, backgroundColor: '#FFF7ED' },
  choiceIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  choiceText: { flex: 1 },
  choiceTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  choiceDesc: { fontSize: 12, color: '#6B7280', marginTop: 3, lineHeight: 17 },
  choiceTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EFF6FF', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 8 },
  choiceTagText: { fontSize: 11, fontWeight: '600', color: '#3B82F6' },
  logisticsContainer: { gap: 10, marginBottom: 20, maxHeight: 300 },
  logisticsOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 2, borderColor: '#F3F4F6', borderRadius: 14, marginBottom: 10, gap: 14 },
  logisticsOptionActive: { borderColor: '#D97706', backgroundColor: '#FFFBEB' },
  radioCircle: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: '#D97706' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D97706' },
  optionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  optionDesc: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  addressBox: { borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', borderRadius: 10, padding: 14, marginTop: 4 },
  addressTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF', marginBottom: 6 },
  addressText: { fontSize: 13, color: '#1E40AF', lineHeight: 20 },
  formContainer: { gap: 16, marginTop: 4 },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#111827',
    justifyContent: 'center',
  },
  dateSelector: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateSelectorText: { fontSize: 15, color: '#111827', flex: 1 },
  qaQueueBox: { marginTop: 12 },
  logisticsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DBEAFE',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logisticsBadgeTitle: { fontSize: 12, fontWeight: '700', color: '#1E40AF', flex: 1 },
  logisticsBadgeSub: { fontSize: 11, color: '#1E3A8A', marginTop: 1 },
  courierChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  courierChipActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  courierChipText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  courierChipTextActive: { color: '#FFFFFF' },
  // Batch Styles
  batchContainer: { backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FAE8D4', overflow: 'hidden' },
  batchHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, backgroundColor: '#FFF7ED' },
  batchHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  batchTitle: { fontSize: 16, fontWeight: '800', color: '#1F2937' },
  batchSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  batchHeaderRight: { padding: 4 },
  batchContent: { padding: 12, gap: 8 },
  batchMeta: { marginBottom: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  statusBadgeSmall: { alignSelf: 'flex-start', marginBottom: 8 },
  batchLogistics: { marginTop: 4 },
  batchProductCard: { marginBottom: 6, elevation: 0, shadowOpacity: 0, borderWidth: 1, borderColor: '#F3F4F6' },
  productImageSmall: { width: 50, height: 60, borderRadius: 8 },
  productInfoSmall: { flex: 1, paddingLeft: 10, justifyContent: 'center' },
  productNameSmall: { fontSize: 13, fontWeight: '600', color: '#374151' },
  productPriceSmall: { fontSize: 14, fontWeight: '700', color: '#D97706' },
  selectionOverlay: { position: 'absolute', top: 10, left: 10, zIndex: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#D97706', borderColor: '#D97706' },
  bulkBar: { position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 50 },
  bulkBarInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FDE68A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#374151' },
  modalSubmit: { flex: 1, backgroundColor: '#D97706', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  modalSubmitDisabled: { backgroundColor: '#D1D5DB' },
  modalSubmitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
