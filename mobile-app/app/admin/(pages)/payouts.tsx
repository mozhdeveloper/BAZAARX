import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Pressable,
} from 'react-native';
import { useAdminPayouts, Payout } from '../../../src/stores/adminStore';
import { Search, Filter, CheckCircle, Clock, AlertCircle, Calendar, X, ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../../src/constants/theme';

export default function PayoutsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { payouts, isLoading, loadPayouts, markAsPaid } = useAdminPayouts();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'paid' | 'failed'>('all');
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    loadPayouts();
  }, []);

  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = payout.sellerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payout.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleMarkPaidClick = (payout: Payout) => {
    setSelectedPayout(payout);
    setReferenceNumber('');
    setIsMarkPaidDialogOpen(true);
  };

  const handleConfirmMarkPaid = async () => {
    if (selectedPayout && referenceNumber) {
      await markAsPaid(selectedPayout.id, referenceNumber);
      setIsMarkPaidDialogOpen(false);
      setSelectedPayout(null);
      setReferenceNumber('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <View style={styles.statusBadge}>
            <CheckCircle size={12} color="#059669" />
            <Text style={[styles.statusText, { color: '#059669' }]}>Paid</Text>
          </View>
        );
      case 'pending':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEF3C7' }]}>
            <Clock size={12} color="#D97706" />
            <Text style={[styles.statusText, { color: '#D97706' }]}>Pending</Text>
          </View>
        );
      case 'processing':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#DBEAFE' }]}>
            <Clock size={12} color="#2563EB" />
            <Text style={[styles.statusText, { color: '#2563EB' }]}>Processing</Text>
          </View>
        );
      case 'failed':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2' }]}>
            <AlertCircle size={12} color="#DC2626" />
            <Text style={[styles.statusText, { color: '#DC2626' }]}>Failed</Text>
          </View>
        );
      default:
        return null;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2} />
          </Pressable>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Payout Management</Text>
            <Text style={styles.headerSubtitle}>Process and track seller payouts</Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search seller or reference..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View style={styles.filterRow}>
          <Filter size={20} color="#9CA3AF" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
            {['all', 'pending', 'processing', 'paid', 'failed'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  statusFilter === filter && styles.filterChipActive
                ]}
                onPress={() => setStatusFilter(filter as any)}
              >
                <Text style={[
                  styles.filterChipText,
                  statusFilter === filter && styles.filterChipTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Payouts List */}
      <ScrollView style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading payouts...</Text>
          </View>
        ) : filteredPayouts.length === 0 ? (
          <View style={styles.centerContent}>
            <Text style={styles.emptyText}>No payouts found</Text>
          </View>
        ) : (
          filteredPayouts.map((payout) => (
            <View key={payout.id} style={styles.payoutCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.referenceNumber}>{payout.referenceNumber}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={14} color="#6B7280" />
                    <Text style={styles.dateText}>{formatDate(payout.periodEnd)}</Text>
                  </View>
                </View>
                {getStatusBadge(payout.status)}
              </View>

              <View style={styles.cardDivider} />

              <View style={styles.cardBody}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Seller</Text>
                  <Text style={styles.infoValue}>{payout.sellerName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Amount</Text>
                  <Text style={styles.amountValue}>₱{payout.amount.toLocaleString()}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Bank</Text>
                  <Text style={styles.infoValue}>{payout.bankName}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Account</Text>
                  <Text style={styles.accountNumber}>{payout.accountNumber}</Text>
                </View>
              </View>

              {payout.status !== 'paid' && (
                <TouchableOpacity
                  style={styles.markPaidButton}
                  onPress={() => handleMarkPaidClick(payout)}
                >
                  <CheckCircle size={18} color="#FFFFFF" />
                  <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Mark Paid Modal */}
      <Modal
        visible={isMarkPaidDialogOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsMarkPaidDialogOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Payout</Text>
              <TouchableOpacity onPress={() => setIsMarkPaidDialogOpen(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter the transaction reference number to mark this payout as paid.
            </Text>

            <View style={styles.modalInfoBox}>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Seller:</Text>
                <Text style={styles.modalInfoValue}>{selectedPayout?.sellerName}</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Amount:</Text>
                <Text style={styles.modalAmountValue}>₱{selectedPayout?.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Text style={styles.modalInfoLabel}>Bank:</Text>
                <Text style={styles.modalInfoValue}>
                  {selectedPayout?.bankName} - {selectedPayout?.accountNumber}
                </Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Transaction Reference Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., TR-123456789"
                value={referenceNumber}
                onChangeText={setReferenceNumber}
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsMarkPaidDialogOpen(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !referenceNumber && styles.confirmButtonDisabled
                ]}
                onPress={handleConfirmMarkPaid}
                disabled={!referenceNumber}
              >
                <Text style={styles.confirmButtonText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitleContainer: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: '#111827',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  filterScrollView: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  payoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  referenceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  cardBody: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  accountNumber: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'monospace',
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  markPaidButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  modalInfoBox: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  modalAmountValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
