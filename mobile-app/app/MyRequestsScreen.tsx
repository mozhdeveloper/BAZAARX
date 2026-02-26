import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  MessageSquare,
  Filter,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import ProductRequestModal from '../src/components/ProductRequestModal';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MyRequests'>;

interface ProductRequest {
  id: string;
  product_name: string;
  description: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  priority: string;
  votes: number;
  admin_notes?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: 'Pending Review', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  approved: { label: 'Approved', color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  in_progress: { label: 'In Progress', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  rejected: { label: 'Not Available', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
};

const StatusIcon = ({ status, size = 16 }: { status: string; size?: number }) => {
  const color = STATUS_CONFIG[status]?.color || '#6B7280';
  switch (status) {
    case 'pending': return <Clock size={size} color={color} />;
    case 'approved': return <CheckCircle2 size={size} color={color} />;
    case 'in_progress': return <Loader2 size={size} color={color} />;
    case 'rejected': return <XCircle size={size} color={color} />;
    default: return <Clock size={size} color={color} />;
  }
};

const { width } = Dimensions.get('window');

export default function MyRequestsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('product_requests')
        .select('*')
        .eq('requested_by_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const filteredRequests = filterStatus ? requests.filter((r) => r.status === filterStatus) : requests;

  const statusCounts = {
    pending: requests.filter((r) => r.status === 'pending').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    approved: requests.filter((r) => r.status === 'approved').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const StatCard = ({ label, count, statusKey, icon }: { label: string; count: number; statusKey: string; icon: React.ReactNode }) => (
    <Pressable
      onPress={() => setFilterStatus(filterStatus === statusKey ? null : statusKey)}
      style={[
        styles.statCard,
        filterStatus === statusKey && styles.statCardActive,
      ]}
    >
      <View style={[styles.statIconBox, { backgroundColor: STATUS_CONFIG[statusKey]?.bg || '#F3F4F6' }]}>
        {icon}
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* Header */}
      <View
        style={[styles.headerContainer, { paddingTop: insets.top + 5, backgroundColor: COLORS.background }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>My Requests</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Pressable
              onPress={() => setShowRequestModal(true)}
              style={styles.headerIconButton}
            >
              <Plus size={24} color={COLORS.primary} strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatCard label="Pending" count={statusCounts.pending} statusKey="pending" icon={<Clock size={18} color="#92400E" />} />
          <StatCard label="In Progress" count={statusCounts.in_progress} statusKey="in_progress" icon={<Loader2 size={18} color="#1E40AF" />} />
          <StatCard label="Approved" count={statusCounts.approved} statusKey="approved" icon={<CheckCircle2 size={18} color="#166534" />} />
          <StatCard label="Unavailable" count={statusCounts.rejected} statusKey="rejected" icon={<XCircle size={18} color="#991B1B" />} />
        </View>

        {/* Active Filter */}
        {filterStatus && (
          <View style={styles.filterBar}>
            <Filter size={14} color="#6B7280" />
            <Text style={styles.filterText}>
              Showing: <Text style={styles.filterTextBold}>{filterStatus ? STATUS_CONFIG[filterStatus]?.label : ''}</Text>
            </Text>
            <Pressable onPress={() => setFilterStatus(null)}>
              <Text style={styles.clearFilter}>Clear</Text>
            </Pressable>
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.emptyText}>Loading your requests...</Text>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <Package size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>
              {filterStatus ? 'No requests found' : 'No product requests yet'}
            </Text>
            <Text style={styles.emptyText}>
              {filterStatus
                ? 'Try a different filter or submit a new request.'
                : "Can't find what you're looking for?\nRequest a product and we'll notify you!"}
            </Text>
            <Pressable
              onPress={() => setShowRequestModal(true)}
              style={({ pressed }) => [styles.emptyActionBtn, pressed && { opacity: 0.85 }]}
            >
              <Plus size={18} color="#FFF" />
              <Text style={styles.emptyActionText}>Request a Product</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.requestsList}>
            {filteredRequests.map((request) => {
              const config = STATUS_CONFIG[request.status] || STATUS_CONFIG.pending;
              return (
                <View key={request.id} style={styles.requestCard}>
                  <View style={styles.requestCardTop}>
                    <View style={styles.requestInfo}>
                      <View style={styles.requestIconBox}>
                        <Package size={22} color={COLORS.primary} />
                      </View>
                      <View style={styles.requestTextBox}>
                        <Text style={styles.requestName} numberOfLines={1}>{request.product_name}</Text>
                        <Text style={styles.requestDesc} numberOfLines={2}>{request.description}</Text>
                        <View style={styles.requestMeta}>
                          <Clock size={12} color="#9CA3AF" />
                          <Text style={styles.requestDate}>{formatDate(request.created_at)}</Text>
                          {request.category ? (
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryBadgeText}>{request.category}</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View style={[styles.statusBadge, { backgroundColor: config.bg, borderColor: config.border }]}>
                      <StatusIcon status={request.status} size={14} />
                      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
                    </View>
                  </View>

                  {/* Admin Notes */}
                  {request.admin_notes ? (
                    <View style={styles.adminNotesBox}>
                      <MessageSquare size={14} color="#6B7280" />
                      <View style={styles.adminNotesContent}>
                        <Text style={styles.adminNotesLabel}>Admin Response</Text>
                        <Text style={styles.adminNotesText}>{request.admin_notes}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Product Request Modal */}
      <ProductRequestModal
        visible={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          loadRequests();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    zIndex: 10,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    height: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textHeadline,
  },
  headerIconButton: { padding: 4, minWidth: 40, alignItems: 'center', justifyContent: 'center' },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFFBF5',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statCount: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 2,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  filterTextBold: {
    fontWeight: '700',
    color: '#1F2937',
  },
  clearFilter: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  requestCardTop: {
    flexDirection: 'column',
    gap: 12,
  },
  requestInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  requestIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestTextBox: {
    flex: 1,
  },
  requestName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  requestDesc: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  requestMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requestDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  adminNotesBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  adminNotesContent: {
    flex: 1,
  },
  adminNotesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 4,
  },
  adminNotesText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
});
