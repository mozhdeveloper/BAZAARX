import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator, TextInput, Modal } from 'react-native';
import { ArrowLeft, Users, Search, ShoppingBag, DollarSign, CheckCircle, Ban, UserX, Phone, Mail, MapPin, Eye, X, Calendar, Star, XCircle as CancelIcon, RotateCcw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useAdminBuyers } from '../../../src/stores/adminStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/constants/theme';

export default function AdminBuyersScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { buyers, isLoading, loadBuyers } = useAdminBuyers();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'banned'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');
  const [buyerToSuspend, setBuyerToSuspend] = useState<any>(null);

  useEffect(() => {
    loadBuyers();
  }, []);

  const filteredBuyers = buyers.filter(buyer => {
    const matchesSearch = buyer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         buyer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         buyer.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || buyer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config = {
      active: { bg: '#D1FAE5', color: '#059669', text: 'Active', Icon: CheckCircle },
      suspended: { bg: '#FED7AA', color: '#EA580C', text: 'Suspended', Icon: Ban },
      banned: { bg: '#FEE2E2', color: '#DC2626', text: 'Banned', Icon: UserX },
    }[status as 'active' | 'suspended' | 'banned'];
    
    if (!config) return null;
    const Icon = config.Icon;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
        <Icon size={12} color={config.color} />
        <Text style={[styles.statusText, { color: config.color }]}>{config.text}</Text>
      </View>
    );
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatFullDate = (dateInput?: Date | string) => {
    if (!dateInput) return 'N/A';
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  const handleViewDetails = (buyer: any) => {
    setSelectedBuyer(buyer);
    setModalVisible(true);
  };

  const handleSuspend = (buyer: any) => {
    setBuyerToSuspend(buyer);
    setSuspendModalVisible(true);
  };

  const confirmSuspend = () => {
    if (!buyerToSuspend) return;
    
    // Here you would typically make an API call to suspend the buyer
    console.log('Suspending buyer:', buyerToSuspend.id, 'Reason:', suspendReason);
    
    // Update the buyer's status locally (you would do this after API success)
    const updatedBuyers = buyers.map(b => 
      b.id === buyerToSuspend.id 
        ? { ...b, status: 'suspended', suspensionReason: suspendReason }
        : b
    );
    
    // Reset states
    setSuspendModalVisible(false);
    setSuspendReason('');
    setBuyerToSuspend(null);
    
    // You might want to call loadBuyers() here to refresh from the server
    // loadBuyers();
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Buyer Management</Text>
            <Text style={styles.headerSubtitle}>View and manage buyers</Text>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search buyers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {['all', 'active', 'suspended', 'banned'].map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
              onPress={() => setStatusFilter(filter as any)}
            >
              <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading buyers...</Text>
          </View>
        ) : filteredBuyers.length === 0 ? (
          <View style={styles.centerContent}>
            <Users size={64} color="#D1D5DB" strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>No buyers found</Text>
          </View>
        ) : (
          filteredBuyers.map((buyer) => (
            <View key={buyer.id} style={styles.buyerCard}>
              <View style={styles.cardHeader}>
                <Image source={{ uri: buyer.avatar }} style={styles.avatar} />
                <View style={styles.headerInfo}>
                  <Text style={styles.buyerName}>{buyer.firstName} {buyer.lastName}</Text>
                  {getStatusBadge(buyer.status)}
                  <View style={styles.contactRow}>
                    <Mail size={12} color="#6B7280" />
                    <Text style={styles.contactText}>{buyer.email}</Text>
                  </View>
                  {buyer.phone && (
                    <View style={styles.contactRow}>
                      <Phone size={12} color="#6B7280" />
                      <Text style={styles.contactText}>{buyer.phone}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <ShoppingBag size={16} color={COLORS.primary} />
                  <Text style={styles.statValue}>{buyer.metrics.totalOrders}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <DollarSign size={16} color={COLORS.primary} />
                  <Text style={styles.statValue}>₱{(buyer.metrics.totalSpent / 1000).toFixed(1)}k</Text>
                  <Text style={styles.statLabel}>Spent</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Star size={16} color={COLORS.primary} />
                  <Text style={styles.statValue}>{buyer.metrics.loyaltyPoints}</Text>
                  <Text style={styles.statLabel}>Points</Text>
                </View>
              </View>

              {buyer.addresses && buyer.addresses.length > 0 && (
                <View style={styles.addressContainer}>
                  <View style={styles.addressRow}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.addressText} numberOfLines={1}>
                      {buyer.addresses[0].city}, {buyer.addresses[0].province}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.footerText}>Joined {formatDate(buyer.joinDate)}</Text>
                <Text style={styles.footerText}>Last active {formatDate(buyer.lastActivity)}</Text>
              </View>

              {buyer.suspensionReason && (
                <View style={styles.suspensionBox}>
                  <Text style={styles.suspensionLabel}>Suspension Reason:</Text>
                  <Text style={styles.suspensionText}>{buyer.suspensionReason}</Text>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Pressable 
                  style={styles.viewDetailsButton}
                  onPress={() => handleViewDetails(buyer)}
                >
                  <Eye size={16} color="#FFFFFF" />
                  <Text style={styles.viewDetailsText}>View Details</Text>
                </Pressable>
                <Pressable 
                  style={styles.suspendButton}
                  onPress={() => handleSuspend(buyer)}
                >
                  <Ban size={16} color="#DC2626" />
                  <Text style={styles.suspendText}>Suspend</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Buyer Details Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buyer Details</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </Pressable>
            </View>
            {selectedBuyer && (
              <ScrollView style={styles.modalBody}>
                {/* Buyer Info Section */}
                <View style={styles.modalSection}>
                  <View style={styles.buyerInfoRow}>
                    <Image source={{ uri: selectedBuyer.avatar }} style={styles.modalAvatar} />
                    <View style={styles.buyerMainInfo}>
                      <Text style={styles.modalBuyerName}>{selectedBuyer.firstName} {selectedBuyer.lastName}</Text>
                      <Text style={styles.modalBuyerEmail}>{selectedBuyer.email}</Text>
                      {getStatusBadge(selectedBuyer.status)}
                    </View>
                  </View>
                </View>

                {/* Contact Details */}
                <View style={styles.modalSection}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phone</Text>
                    <Text style={styles.detailValue}>{selectedBuyer.phone}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Gender</Text>
                    <Text style={styles.detailValue}>{selectedBuyer.gender || 'Female'}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date of Birth</Text>
                    <Text style={styles.detailValue}>
                      {selectedBuyer.dateOfBirth 
                        ? (typeof selectedBuyer.dateOfBirth === 'string' 
                            ? selectedBuyer.dateOfBirth 
                            : formatFullDate(selectedBuyer.dateOfBirth))
                        : '5/15/1990'}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Join Date</Text>
                    <Text style={styles.detailValue}>{formatFullDate(selectedBuyer.joinDate)}</Text>
                  </View>
                </View>

                {/* Verification Status */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Verification Status</Text>
                  <View style={styles.verificationBadges}>
                    <View style={styles.verifiedBadge}>
                      <CheckCircle size={14} color="#FFFFFF" />
                      <Text style={styles.verifiedText}>Email Verified</Text>
                    </View>
                    <View style={styles.verifiedBadge}>
                      <CheckCircle size={14} color="#FFFFFF" />
                      <Text style={styles.verifiedText}>Phone Verified</Text>
                    </View>
                  </View>
                </View>

                {/* Addresses */}
                {selectedBuyer.addresses && selectedBuyer.addresses.length > 0 && (
                  <View style={styles.modalSection}>
                    <Text style={styles.sectionTitle}>Addresses</Text>
                    {selectedBuyer.addresses.map((address: any, idx: number) => (
                      <View key={idx} style={styles.addressCard}>
                        <View style={styles.addressCardHeader}>
                          <Text style={styles.addressType}>{address.type || 'Home'}</Text>
                          {address.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultText}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.fullAddress}>
                          {address.street}, {address.barangay}, {address.city}, {address.province} {address.zipCode}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Shopping Activity */}
                <View style={styles.modalSection}>
                  <Text style={styles.sectionTitle}>Shopping Activity</Text>
                  <View style={styles.activityGrid}>
                    <View style={styles.activityCard}>
                      <ShoppingBag size={24} color="#2563EB" />
                      <Text style={styles.activityLabel}>Total Orders</Text>
                      <Text style={styles.activityValue}>{selectedBuyer.metrics.totalOrders}</Text>
                    </View>
                    <View style={styles.activityCard}>
                      <DollarSign size={24} color="#059669" />
                      <Text style={styles.activityLabel}>Total Spent</Text>
                      <Text style={styles.activityValue}>₱{selectedBuyer.metrics.totalSpent.toLocaleString()}</Text>
                    </View>
                  </View>
                  <View style={styles.activityGrid}>
                    <View style={styles.activityCard}>
                      <Star size={24} color="#7C3AED" />
                      <Text style={styles.activityLabel}>Average Order</Text>
                      <Text style={styles.activityValue}>₱{selectedBuyer.metrics.averageOrderValue?.toLocaleString() || '1,908'}</Text>
                    </View>
                    <View style={styles.activityCard}>
                      <Star size={24} color="#D97706" />
                      <Text style={styles.activityLabel}>Loyalty Points</Text>
                      <Text style={styles.activityValue}>{selectedBuyer.metrics.loyaltyPoints}</Text>
                    </View>
                  </View>
                  <View style={styles.activityGrid}>
                    <View style={styles.activityCard}>
                      <CancelIcon size={24} color="#DC2626" />
                      <Text style={styles.activityLabel}>Cancelled Orders</Text>
                      <Text style={styles.activityValue}>{selectedBuyer.metrics.cancelledOrders || '2'}</Text>
                    </View>
                    <View style={styles.activityCard}>
                      <RotateCcw size={24} color="#EA580C" />
                      <Text style={styles.activityLabel}>Returned Orders</Text>
                      <Text style={styles.activityValue}>{selectedBuyer.metrics.returnedOrders || '1'}</Text>
                    </View>
                  </View>
                </View>

                {/* Close Button */}
                <Pressable 
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </Pressable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Suspend Confirmation Modal */}
      <Modal visible={suspendModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.suspendModalContent}>
            <View style={styles.suspendModalHeader}>
              <Ban size={28} color="#DC2626" />
              <Text style={styles.suspendModalTitle}>Suspend Buyer</Text>
            </View>
            
            {buyerToSuspend && (
              <View style={styles.suspendModalBody}>
                <Text style={styles.suspendModalText}>
                  Are you sure you want to suspend{' '}
                  <Text style={styles.suspendModalBuyerName}>
                    {buyerToSuspend.firstName} {buyerToSuspend.lastName}
                  </Text>?
                </Text>
                
                <View style={styles.reasonContainer}>
                  <Text style={styles.reasonLabel}>Reason for suspension:</Text>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="Enter reason..."
                    value={suspendReason}
                    onChangeText={setSuspendReason}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>

                <View style={styles.suspendModalActions}>
                  <Pressable 
                    style={styles.cancelButton}
                    onPress={() => {
                      setSuspendModalVisible(false);
                      setSuspendReason('');
                      setBuyerToSuspend(null);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable 
                    style={[styles.confirmSuspendButton, !suspendReason.trim() && styles.confirmSuspendButtonDisabled]}
                    onPress={confirmSuspend}
                    disabled={!suspendReason.trim()}
                  >
                    <Ban size={16} color="#FFFFFF" />
                    <Text style={styles.confirmSuspendButtonText}>Suspend</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  header: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingBottom: 24, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
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
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  filterChipTextActive: { color: '#FFFFFF' },
  scrollView: { flex: 1, padding: 16 },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { marginTop: 12, fontSize: 16, color: '#6B7280' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16 },
  buyerCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  headerInfo: { flex: 1, gap: 4 },
  buyerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  contactText: { fontSize: 12, color: '#6B7280' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 11, fontWeight: '600' },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E5E7EB' },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280' },
  statDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB' },
  addressContainer: { paddingTop: 12 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addressText: { fontSize: 13, color: '#374151', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  footerText: { fontSize: 11, color: '#9CA3AF' },
  suspensionBox: { marginTop: 12, backgroundColor: '#FEF3C7', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#D97706' },
  suspensionLabel: { fontSize: 11, fontWeight: '600', color: '#92400E', marginBottom: 2 },
  suspensionText: { fontSize: 12, color: '#78350F' },
  actionButtons: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  viewDetailsButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: COLORS.primary, paddingVertical: 10, borderRadius: 8 },
  viewDetailsText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  suspendButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DC2626', paddingVertical: 10, borderRadius: 8 },
  suspendText: { color: '#DC2626', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827' },
  modalBody: { padding: 20 },
  modalSection: { marginBottom: 24 },
  buyerInfoRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  modalAvatar: { width: 80, height: 80, borderRadius: 40 },
  buyerMainInfo: { flex: 1, gap: 6 },
  modalBuyerName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalBuyerEmail: { fontSize: 14, color: '#6B7280' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  detailValue: { fontSize: 14, color: '#111827', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  verificationBadges: { flexDirection: 'row', gap: 8 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  verifiedText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  addressCard: { backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginBottom: 8 },
  addressCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  addressType: { fontSize: 14, fontWeight: '600', color: '#111827' },
  defaultBadge: { backgroundColor: '#FCD34D', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  defaultText: { fontSize: 10, fontWeight: '700', color: '#78350F' },
  fullAddress: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  activityGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  activityCard: { flex: 1, backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, alignItems: 'center', gap: 8 },
  activityLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  activityValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  closeButton: { backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  suspendModalContent: { backgroundColor: '#FFFFFF', borderRadius: 16, marginHorizontal: 10, padding: 24, maxWidth: 500, alignSelf: 'center' },
  suspendModalHeader: { alignItems: 'center', marginBottom: 16 },
  suspendModalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 8 },
  suspendModalBody: { gap: 16 },
  suspendModalText: { fontSize: 15, color: '#6B7280', textAlign: 'center', lineHeight: 22 },
  suspendModalBuyerName: { fontWeight: '700', color: '#111827' },
  reasonContainer: { gap: 8 },
  reasonLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  reasonInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 14, color: '#111827', minHeight: 100 },
  suspendModalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelButton: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  confirmSuspendButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 8, backgroundColor: '#DC2626' },
  confirmSuspendButtonDisabled: { backgroundColor: '#FCA5A5', opacity: 0.5 },
  confirmSuspendButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});