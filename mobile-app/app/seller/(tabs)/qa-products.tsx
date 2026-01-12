import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  FileCheck,
  Clock,
  Package,
  XCircle,
  RefreshCw,
  BadgeCheck,
  Search,
  X,
} from 'lucide-react-native';
import { useProductQAStore, ProductQAStatus } from '../../../src/stores/productQAStore';
import { useSellerStore } from '../../../src/stores/sellerStore';

type FilterStatus = 'all' | 'pending' | 'waiting' | 'qa' | 'revision' | 'verified' | 'rejected';

export default function SellerProductQAScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [logisticsMethod, setLogisticsMethod] = useState('');
  const [selectedLogistics, setSelectedLogistics] = useState<string>('');
  const insets = useSafeAreaInsets();

  const { products: qaProducts, submitSample } = useProductQAStore();
  const { seller, products: sellerProducts } = useSellerStore();

  // Filter QA products for this seller
  const sellerQAProducts = qaProducts.filter(
    (p) => p.vendor === (seller?.storeName || 'Tech Shop PH')
  );

  // Get all seller products (including those not in QA yet)
  const activeSellerProducts = sellerProducts.filter((p) => p.isActive);

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
      filteredQA = filteredQA.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      filteredSeller = filteredSeller.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { filteredQA, filteredSeller };
  };

  const { filteredQA: filteredQAProducts } = getFilteredProducts();

  const handleSubmitSample = () => {
    if (!selectedProduct || !selectedLogistics) {
      Alert.alert('Error', 'Please select a logistics method');
      return;
    }

    try {
      submitSample(selectedProduct, selectedLogistics);
      Alert.alert('Success', 'Your product sample has been submitted for physical QA review.');
      setSubmitModalOpen(false);
      setSelectedProduct(null);
      setSelectedLogistics('');
      setLogisticsMethod('');
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
      <Text style={{ fontSize: 11, fontWeight: '600', color: '#6B7280', marginTop: 4 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      
      {/* Header */}
      <View style={{ backgroundColor: '#FF5722', paddingTop: insets.top + 16, paddingBottom: 20, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 12, borderRadius: 12 }}>
            <FileCheck size={24} color="#FFFFFF" strokeWidth={2} />
          </View>
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
                    source={{ uri: product.image }}
                    style={{ width: 80, height: 80, borderRadius: 8, backgroundColor: '#F3F4F6' }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                      {product.name}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
                      ₱{product.price.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>
                      {product.category}
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
                          setSelectedProduct(product.id);
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
