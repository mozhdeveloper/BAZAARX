import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  Menu,
  Bell,
  Check,
  X,
  AlertCircle,
  Package,
  Clock,
  Tag,
  ShoppingBag,
  Truck,
  MapPin,
  Calendar,
  Eye,
} from 'lucide-react-native';
import AdminDrawer from '../../../src/components/AdminDrawer';
import { useAdminProductQA } from '../../../src/stores/adminStore';
import { COLORS } from '../../../src/constants/theme';

type TabType = 'digital' | 'physical' | 'history';

export default function AdminProductApprovalsScreen() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('digital');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const insets = useSafeAreaInsets();

  const {
    pendingDigitalReview,
    inQualityReview,
    activeVerified,
    rejected,
    isLoading,
    loadProducts,
    approveForSampleSubmission,
    rejectDigitalReview,
    passQualityCheck,
    failQualityCheck,
  } = useAdminProductQA();

  // Reload products every time screen comes into focus (e.g., when switching accounts)
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleApproveForSample = (id: string) => {
    Alert.alert(
      'Approve for Sample Submission',
      'This will approve the product listing and request the seller to submit a physical sample for quality inspection.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveForSampleSubmission(
                id,
                'Product listing approved. Please submit sample for QA.'
              );
              Alert.alert('Success', 'Product approved! Seller has been notified to submit a sample.');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve product');
            }
          },
        },
      ]
    );
  };

  const handlePassQA = (id: string) => {
    Alert.alert(
      'Pass Quality Check',
      'This will verify the product and make it live on the marketplace. Buyers will be able to see and purchase this product.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pass & Publish',
          onPress: async () => {
            try {
              await passQualityCheck(
                id,
                'Product passed quality inspection. Approved for marketplace.'
              );
              Alert.alert('Success', 'Product verified and published to marketplace!');
            } catch (error) {
              Alert.alert('Error', 'Failed to pass product');
            }
          },
        },
      ]
    );
  };

  const handleReject = (id: string) => {
    setSelectedProduct(id);
    setRejectModalVisible(true);
  };

  const submitRejection = async () => {
    if (!selectedProduct || !rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      if (selectedTab === 'digital') {
        await rejectDigitalReview(selectedProduct, rejectionReason);
      } else if (selectedTab === 'physical') {
        await failQualityCheck(selectedProduct, rejectionReason);
      }

      setRejectModalVisible(false);
      setRejectionReason('');
      setSelectedProduct(null);
      Alert.alert('Success', 'Product rejected successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject product');
    }
  };

  const tabs = [
    { id: 'digital' as TabType, label: 'Digital Review', count: pendingDigitalReview.length },
    { id: 'physical' as TabType, label: 'Physical QA Queue', count: inQualityReview.length },
    {
      id: 'history' as TabType,
      label: 'History/Logs',
      count: activeVerified.length + rejected.length,
    },
  ];

  const getProducts = () => {
    switch (selectedTab) {
      case 'digital':
        return pendingDigitalReview;
      case 'physical':
        return inQualityReview;
      case 'history':
        return [...activeVerified, ...rejected];
      default:
        return [];
    }
  };

  const getLogisticsLabel = (method?: 'drop_off_courier' | 'company_pickup' | 'meetup') => {
    switch (method) {
      case 'drop_off_courier':
        return 'Drop-off / Courier';
      case 'company_pickup':
        return 'Company Pickup';
      case 'meetup':
        return 'Meetup / Onsite';
      default:
        return 'Not Set';
    }
  };

  const renderProduct = (product: any) => (
    <View key={product.id} style={styles.productCard}>
      {/* Card Header with Avatar & Timestamp */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.vendorInfo}>
          <View style={styles.vendorAvatar}>
            <Text style={styles.avatarText}>{product.sellerName.charAt(0)}</Text>
          </View>
          <View style={styles.vendorDetails}>
            <Text style={styles.vendorName} numberOfLines={1}>{product.sellerStoreName}</Text>
            <Text style={styles.vendorSubtext} numberOfLines={1}>{product.sellerName}</Text>
          </View>
        </View>
        <View style={styles.timestampContainer}>
          <Clock size={12} color="#9CA3AF" />
          <Text style={styles.timestamp}>
            {(() => {
              const hoursSince = Math.floor((new Date().getTime() - new Date(product.submittedAt).getTime()) / (1000 * 60 * 60));
              if (hoursSince < 1) return 'Just now';
              if (hoursSince < 24) return `${hoursSince}h ago`;
              const daysSince = Math.floor(hoursSince / 24);
              return `${daysSince}d ago`;
            })()}
          </Text>
        </View>
      </View>

      {/* Main Content Row - Image + Details */}
      <View style={styles.mainContentRow}>
        <Image source={{ uri: product.images[0] }} style={styles.productImageLarge} />
        <View style={styles.productDetails}>
          <Text style={styles.productTitle} numberOfLines={2}>
            {product.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText} numberOfLines={1}>{product.category}</Text>
            <View style={styles.metaDot} />
            <Text style={styles.metaText} numberOfLines={1}>{product.sku}</Text>
          </View>
          <View style={styles.stockBadge}>
            <ShoppingBag size={12} color="#6B7280" />
            <Text style={styles.stockText}>Stock: {product.stock} units</Text>
          </View>
          <Text style={styles.priceText}>₱{product.price.toLocaleString()}</Text>
          {product.compareAtPrice && (
            <Text style={styles.comparePriceText}>₱{product.compareAtPrice.toLocaleString()}</Text>
          )}
        </View>
      </View>

      {/* Additional Details Section */}
      {selectedTab === 'physical' && product.logisticsMethod && (
        <View style={styles.logisticsBox}>
          <View style={styles.logisticsHeader}>
            <Truck size={16} color={COLORS.primary} />
            <Text style={styles.logisticsTitle}>Sample Logistics</Text>
          </View>
          <Text style={styles.logisticsMethodText}>
            {getLogisticsLabel(product.logisticsMethod)}
          </Text>
          {product.logisticsAddress && (
            <View style={styles.addressRow}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.addressText}>{product.logisticsAddress}</Text>
            </View>
          )}
          {product.logisticsNotes && (
            <View style={styles.logisticsNotesBox}>
              <AlertCircle size={14} color={COLORS.primary} />
              <Text style={styles.logisticsNotesText}>{product.logisticsNotes}</Text>
            </View>
          )}
        </View>
      )}

      {/* Status Section for History Tab */}
      {selectedTab === 'history' && (
        <View style={styles.historyStatusBox}>
          <View style={[
            styles.historyStatusBadge,
            product.status === 'ACTIVE_VERIFIED' ? styles.verifiedStatusBadge : styles.rejectedStatusBadge
          ]}>
            <Text style={[
              styles.historyStatusText,
              product.status === 'ACTIVE_VERIFIED' ? styles.verifiedStatusText : styles.rejectedStatusText
            ]}>
              {product.status === 'ACTIVE_VERIFIED' ? '✓ Verified & Published' : '✗ Rejected'}
            </Text>
          </View>
          {product.qualityReviewedAt && (
            <Text style={styles.reviewedAtText}>
              Reviewed {new Date(product.qualityReviewedAt).toLocaleDateString()}
            </Text>
          )}
          {product.rejectionReason && (
            <View style={styles.rejectionReasonBox}>
              <AlertCircle size={14} color="#DC2626" />
              <Text style={styles.rejectionReasonText}>{product.rejectionReason}</Text>
            </View>
          )}
        </View>
      )}

      {/* Action Footer */}
      {selectedTab === 'digital' && (
        <>
          <View style={styles.actionSeparator} />
          <View style={styles.actionFooter}>
            <Pressable
              style={styles.primaryActionButton}
              onPress={() => handleApproveForSample(product.id)}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.primaryActionText}>Approve</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryActionButton}
              onPress={() => handleReject(product.id)}
            >
              <X size={18} color="#DC2626" strokeWidth={2.5} />
              <Text style={styles.secondaryActionText}>Reject</Text>
            </Pressable>
          </View>
        </>
      )}

      {selectedTab === 'physical' && (
        <>
          <View style={styles.actionSeparator} />
          <View style={styles.actionFooter}>
            <Pressable
              style={styles.primaryActionButton}
              onPress={() => handlePassQA(product.id)}
            >
              <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.primaryActionText}>Pass & Publish</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryActionButton}
              onPress={() => handleReject(product.id)}
            >
              <X size={18} color="#DC2626" strokeWidth={2.5} />
              <Text style={styles.secondaryActionText}>Fail QA</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );

  const products = getProducts();

  return (
    <>
      <View style={styles.container}>
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Pressable onPress={() => setDrawerVisible(true)} style={styles.menuButton}>
                <Menu size={24} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
              <View style={styles.headerTitleContainer}>
                <Text style={styles.headerTitle}>Product QA</Text>
                <Text style={styles.headerSubtitle}>Quality Approval Center</Text>
              </View>
            </View>
            <Pressable style={styles.notificationButton}>
              <Bell size={22} color="#FFFFFF" strokeWidth={2.5} />
              {(pendingDigitalReview.length + inQualityReview.length > 0) && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>
                    {pendingDigitalReview.length + inQualityReview.length}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScroll}
          >
            {tabs.map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.tab, selectedTab === tab.id && styles.activeTab]}
                onPress={() => setSelectedTab(tab.id)}
              >
                <Text style={[styles.tabText, selectedTab === tab.id && styles.activeTabText]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[styles.countBadge, selectedTab === tab.id && styles.activeCountBadge]}>
                    <Text style={[styles.countText, selectedTab === tab.id && styles.activeCountText]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {isLoading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#0066FF" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Package size={64} color="#CCC" />
              <Text style={styles.emptyTitle}>No Products</Text>
              <Text style={styles.emptyText}>
                {selectedTab === 'digital' && 'No products pending digital review'}
                {selectedTab === 'physical' && 'No products in physical QA queue'}
                {selectedTab === 'history' && 'No reviewed products yet'}
              </Text>
            </View>
          ) : (
            <View style={styles.productsList}>{products.map(renderProduct)}</View>
          )}
        </ScrollView>
      </View>

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedTab === 'digital' ? 'Reject Product Listing' : 'Fail Quality Check'}
            </Text>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for {selectedTab === 'digital' ? 'rejection' : 'failing QA'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectionReason('');
                  setSelectedProduct(null);
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalSubmitButton]}
                onPress={submitRejection}
              >
                <Text style={styles.modalSubmitText}>
                  {selectedTab === 'digital' ? 'Reject' : 'Fail QA'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AdminDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
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
    marginTop: 2,
    fontWeight: '500',
  },
  notificationButton: {
    padding: 4,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  badgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 20,
  },
  tabsScroll: {
    paddingVertical: 8,
    gap: 12,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  activeCountBadge: {
    backgroundColor: '#FFFFFF',
  },
  countText: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '700',
  },
  activeCountText: {
    color: COLORS.primary,
  },
  content: {
    flex: 1,
  },
  productsList: {
    padding: 16,
    paddingBottom: 20,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  vendorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  vendorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFF5F0',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  vendorDetails: {
    flex: 1,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  vendorSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  mainContentRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  productImageLarge: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productDetails: {
    flex: 1,
    marginLeft: 14,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
    marginHorizontal: 6,
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
  },
  comparePriceText: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginTop: 3,
  },
  logisticsBox: {
    backgroundColor: '#FFF5F0',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  logisticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logisticsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  logisticsMethodText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  logisticsNotesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  logisticsNotesText: {
    flex: 1,
    fontSize: 12,
    color: '#EA580C',
    lineHeight: 17,
  },
  historyStatusBox: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  historyStatusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  verifiedStatusBadge: {
    backgroundColor: '#D1FAE5',
  },
  rejectedStatusBadge: {
    backgroundColor: '#FEE2E2',
  },
  historyStatusText: {
    fontSize: 14,
    fontWeight: '700',
  },
  verifiedStatusText: {
    color: '#059669',
  },
  rejectedStatusText: {
    color: '#DC2626',
  },
  reviewedAtText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  rejectionReasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  rejectionReasonText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  actionSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  actionFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
  },
  primaryActionButton: {
    flex: 1,
    backgroundColor: '#FF5722',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryActionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 12,
  },
  secondaryActionText: {
    color: '#DC2626',
    fontSize: 15,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    minHeight: 120,
    marginBottom: 20,
    textAlignVertical: 'top',
    color: '#111827',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  modalSubmitButton: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
