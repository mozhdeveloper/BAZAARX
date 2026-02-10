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
  RefreshControl,
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

  // Load QA products for this seller on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('[QA Products] Focused, seller.id:', seller?.id);
      if (seller?.id) {
        loadProducts(seller.id).then(() => {
          console.log('[QA Products] Loaded products for seller:', seller.id);
        });
      }
      // Don't load all products - only load seller-specific products
    }, [seller?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (seller?.id) {
      await loadProducts(seller.id);
    }
    setRefreshing(false);
  };

  // Use QA products directly - already filtered by seller ID if seller exists
  // Also support filtering by vendor name as fallback
  const sellerQAProducts = qaProducts.filter((p) => {
    if (seller?.id && p.sellerId) {
      return p.sellerId === seller.id;
    }
    // Fallback: match by store name / vendor
    if (seller?.store_name && p.vendor) {
      const vendorName = seller.store_name;
      return p.vendor.toLowerCase() === vendorName.toLowerCase();
    }
    return true; // Show all if no filter criteria
  });

  console.log('[QA Products] qaProducts:', qaProducts.length, 'sellerQAProducts:', sellerQAProducts.length);

  // Get all seller products (including those not in QA yet)
  const activeSellerProducts = sellerProducts.filter((p) => p.isActive);
  
  // Exclude products already in QA to avoid duplicates
  const qaProductIds = new Set(qaProducts.map(p => p.productId));
  const nonQASellerProducts = activeSellerProducts.filter(p => !qaProductIds.has(p.id));

  // Calculate stats
  const pendingCount = sellerQAProducts.filter((p) => p.status === 'PENDING_DIGITAL_REVIEW').length;
  const waitingCount = sellerQAProducts.filter((p) => p.status === 'WAITING_FOR_SAMPLE').length;
  const reviewCount = sellerQAProducts.filter((p) => p.status === 'IN_QUALITY_REVIEW').length;
  const verifiedCount = sellerQAProducts.filter((p) => p.status === 'ACTIVE_VERIFIED').length;
  const revisionCount = sellerQAProducts.filter((p) => p.status === 'FOR_REVISION').length;
  const rejectedCount = sellerQAProducts.filter((p) => p.status === 'REJECTED').length;

  // Apply search and filter
  const getFilteredProducts = () => {
    let filteredQA = sellerQAProducts;
    let filteredSeller = activeSellerProducts;

    // Apply status filter
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'pending':
          filteredQA = filteredQA.filter(p => p.status === 'PENDING_DIGITAL_REVIEW');
          filteredSeller = [];
          break;
        case 'waiting':
          filteredQA = filteredQA.filter(p => p.status === 'WAITING_FOR_SAMPLE');
          filteredSeller = [];
          break;
        case 'qa':
          filteredQA = filteredQA.filter(p => p.status === 'IN_QUALITY_REVIEW');
          filteredSeller = [];
          break;
        case 'revision':
          filteredQA = filteredQA.filter(p => p.status === 'FOR_REVISION');
          filteredSeller = [];
          break;
        case 'verified':
          filteredQA = filteredQA.filter(p => p.status === 'ACTIVE_VERIFIED');
          filteredSeller = [];
          break;
        case 'rejected':
          filteredQA = filteredQA.filter(p => p.status === 'REJECTED');
          filteredSeller = [];
          break;
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const safeStr = (val: any) => typeof val === 'object' ? (val?.name || '') : String(val || '');
      filteredQA = filteredQA.filter(p =>
        safeStr(p.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        safeStr(p.category).toLowerCase().includes(searchQuery.toLowerCase())
      );
      filteredSeller = filteredSeller.filter(p =>
        safeStr(p.name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        safeStr(p.category).toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { filteredQA, filteredSeller };
  };

  const { filteredQA: filteredQAProducts } = getFilteredProducts();

  const handleSubmitSample = async () => {
    if (!selectedProduct || !selectedLogistics) {
      Alert.alert('Error', 'Please select a logistics method');
      return;
    }

    try {
      await submitSample(selectedProduct, selectedLogistics);
      Alert.alert('Success', 'Your product sample has been submitted for physical QA review.');
      setSubmitModalOpen(false);
      setSelectedProduct(null);
      setSelectedLogistics('');
      setLogisticsMethod('');
      // Reload products after submission
      if (seller?.id) {
        await loadProducts(seller.id);
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit sample');
    }
  };

  const getStatusColor = (status: ProductQAStatus) => {
    switch (status) {
      case 'PENDING_DIGITAL_REVIEW':
        return '#F59E0B';
      case 'WAITING_FOR_SAMPLE':
        return '#3B82F6';
      case 'IN_QUALITY_REVIEW':
        return '#8B5CF6';
      case 'ACTIVE_VERIFIED':
        return '#10B981';
      case 'FOR_REVISION':
        return '#F97316';
      case 'REJECTED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: ProductQAStatus) => {
    switch (status) {
      case 'PENDING_DIGITAL_REVIEW':
        return 'Pending Review';
      case 'WAITING_FOR_SAMPLE':
        return 'Submit Sample';
      case 'IN_QUALITY_REVIEW':
        return 'In QA';
      case 'ACTIVE_VERIFIED':
        return 'Verified';
      case 'FOR_REVISION':
        return 'For Revision';
      case 'REJECTED':
        return 'Rejected';
      default:
        return status;
    }
  };

  const StatCard = ({ 
    count, 
    label, 
    icon: Icon, 
    isActive, 
    onPress 
  }: { 
    count: number; 
    label: string; 
    icon: any; 
    isActive: boolean; 
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{
        backgroundColor: isActive ? '#FFF7ED' : '#FFFFFF',
        borderWidth: isActive ? 2 : 1,
        borderColor: isActive ? '#FF5722' : '#E5E7EB',
        borderRadius: 12,
        padding: 16,
        flex: 1,
        minWidth: 110,
      }}
    >
      <Icon size={20} color={isActive ? '#FF5722' : '#9CA3AF'} strokeWidth={2} />
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827', marginTop: 8 }}>
        {count}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280', marginTop: 4 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Null guard for seller
  if (!seller) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#9CA3AF' }}>Loading seller information...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      {/* Seller Drawer */}
      <SellerDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
      
      {/* Header */}
      <View style={{ backgroundColor: '#FF5722', paddingTop: insets.top + 16, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20,}}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 12 }} onPress={() => setDrawerVisible(true)}>
            <Menu size={24} color="#FFFFFF" strokeWidth={2} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' }}>
              Product QA Status
            </Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 2 }}>
              Track quality assurance status
            </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={{ marginTop: 16, backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48 }}>
          <Search size={20} color="#9CA3AF" strokeWidth={2} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search products..."
            placeholderTextColor="#9CA3AF"
            style={{ flex: 1, marginLeft: 8, fontSize: 15, color: '#111827' }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Status Filter Cards */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={{ paddingVertical: 16 }}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
        >
          <StatCard
            count={pendingCount}
            label="Pending"
            icon={Clock}
            isActive={filterStatus === 'pending'}
            onPress={() => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending')}
          />
          <StatCard
            count={waitingCount}
            label="Awaiting"
            icon={Package}
            isActive={filterStatus === 'waiting'}
            onPress={() => setFilterStatus(filterStatus === 'waiting' ? 'all' : 'waiting')}
          />
          <StatCard
            count={reviewCount}
            label="QA Queue"
            icon={FileCheck}
            isActive={filterStatus === 'qa'}
            onPress={() => setFilterStatus(filterStatus === 'qa' ? 'all' : 'qa')}
          />
          <StatCard
            count={revisionCount}
            label="Revision"
            icon={RefreshCw}
            isActive={filterStatus === 'revision'}
            onPress={() => setFilterStatus(filterStatus === 'revision' ? 'all' : 'revision')}
          />
          <StatCard
            count={verifiedCount}
            label="Verified"
            icon={BadgeCheck}
            isActive={filterStatus === 'verified'}
            onPress={() => setFilterStatus(filterStatus === 'verified' ? 'all' : 'verified')}
          />
          <StatCard
            count={rejectedCount}
            label="Rejected"
            icon={XCircle}
            isActive={filterStatus === 'rejected'}
            onPress={() => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected')}
          />
        </ScrollView>

        {/* Products List */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 100 }}>
          {filteredQAProducts.length === 0 ? (
            <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 40, alignItems: 'center', marginTop: 20 }}>
              <Package size={48} color="#D1D5DB" strokeWidth={1.5} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 16 }}>
                No products found
              </Text>
              <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center' }}>
                {filterStatus !== 'all' ? 'Try changing your filter' : 'Start by adding products'}
              </Text>
            </View>
          ) : (
            filteredQAProducts.map((product) => (
              <View
                key={product.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                }}
              >
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Image
                    source={{ uri: safeImageUri(product.image) }}
                    style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                      {typeof product.name === 'object' ? (product.name as any)?.name || '' : String(product.name || '')}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                      ₱{product.price.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                      {typeof product.category === 'object' ? (product.category as any)?.name || '' : String(product.category || '')}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                      <View
                        style={{
                          backgroundColor: `${getStatusColor(product.status)}15`,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '600', color: getStatusColor(product.status) }}>
                          {getStatusLabel(product.status)}
                        </Text>
                      </View>
                    </View>

                    {/* Submit Sample Button */}
                    {product.status === 'WAITING_FOR_SAMPLE' && (
                      <TouchableOpacity
                        onPress={() => {
                          // Use productId (from products table) not id (from product_qa table)
                          setSelectedProduct(product.productId);
                          setSubmitModalOpen(true);
                        }}
                        style={{
                          backgroundColor: '#FF5722',
                          borderRadius: 8,
                          paddingVertical: 8,
                          paddingHorizontal: 12,
                          marginTop: 12,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>
                          Submit Sample
                        </Text>
                      </TouchableOpacity>
                    )}

                    {/* Rejection/Revision Reason */}
                    {(product.status === 'REJECTED' || product.status === 'FOR_REVISION') && product.rejectionReason && (
                      <View style={{ marginTop: 12, backgroundColor: '#FEF2F2', borderRadius: 8, padding: 12 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626', marginBottom: 4 }}>
                          {product.status === 'REJECTED' ? 'Rejection Reason:' : 'Revision Required:'}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#991B1B' }}>
                          {product.rejectionReason}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#B91C1C', marginTop: 4 }}>
                          Stage: {product.rejectionStage === 'digital' ? 'Digital Review' : 'Physical QA'}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Submit Sample Modal */}
      <Modal
        visible={submitModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSubmitModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>
                Submit Product Sample
              </Text>
              <TouchableOpacity onPress={() => setSubmitModalOpen(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 20 }}>
              How will you send the product sample to BazaarPH for physical quality assessment?
            </Text>

            {/* Logistics Options */}
            {['Pick-up at My Location', 'Drop-off by Courier', 'Schedule Onsite Visit'].map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => setSelectedLogistics(option)}
                style={{
                  borderWidth: 2,
                  borderColor: selectedLogistics === option ? '#FF5722' : '#E5E7EB',
                  backgroundColor: selectedLogistics === option ? '#FFF7ED' : '#FFFFFF',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                    {option}
                  </Text>
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: selectedLogistics === option ? '#FF5722' : '#D1D5DB',
                      backgroundColor: selectedLogistics === option ? '#FF5722' : '#FFFFFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {selectedLogistics === option && (
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' }} />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}

            {/* Optional Note */}
            <TextInput
              value={logisticsMethod}
              onChangeText={setLogisticsMethod}
              placeholder="Additional notes (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              style={{
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                color: '#111827',
                marginTop: 8,
                textAlignVertical: 'top',
              }}
            />

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => setSubmitModalOpen(false)}
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B7280' }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitSample}
                disabled={!selectedLogistics}
                style={{
                  flex: 1,
                  backgroundColor: selectedLogistics ? '#FF5722' : '#D1D5DB',
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
