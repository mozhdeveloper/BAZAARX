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
import { productRequestService } from '../src/services/productRequestService';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'MyRequests'>;
type Tab = 'mine' | 'supported';

interface SupportMeta { types: string[]; staked: number; rewarded: boolean }

interface ProductRequest {
  id: string;
  product_name: string;
  description: string;
  category: string;
  status:
    | 'new'
    | 'under_review'
    | 'approved_for_sourcing'
    | 'already_available'
    | 'on_hold'
    | 'converted_to_listing'
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'in_progress';
  priority: string;
  votes: number;
  admin_notes?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  new:         { label: 'New',                color: '#1F2937', bg: '#F9FAFB', border: '#E5E7EB' },
  under_review:{ label: 'Under Review',       color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  approved_for_sourcing: { label: 'In Sourcing', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  already_available: { label: 'Already Available', color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  on_hold:     { label: 'On Hold',            color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  converted_to_listing: { label: 'Listed',    color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  pending:     { label: 'Gathering Interest', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  approved:    { label: 'Verified',            color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  in_progress: { label: 'In Sourcing',         color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  rejected:    { label: 'Not Available',       color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
};

const normalizeStatus = (status: ProductRequest['status']) => {
  if (status === 'new') return 'pending';
  if (status === 'under_review') return 'in_progress';
  if (status === 'approved_for_sourcing') return 'in_progress';
  if (status === 'already_available') return 'approved';
  if (status === 'converted_to_listing') return 'approved';
  if (status === 'on_hold') return 'rejected';
  return status;
};

const StatusIcon = ({ status, size = 16 }: { status: string; size?: number }) => {
  const normalized = normalizeStatus(status as ProductRequest['status']);
  const color = STATUS_CONFIG[normalized]?.color || '#6B7280';
  switch (normalized) {
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
  const [supported, setSupported] = useState<ProductRequest[]>([]);
  const [supportMeta, setSupportMeta] = useState<Record<string, SupportMeta>>({});
  const [tab, setTab] = useState<Tab>('mine');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [{ data, error }, supRows] = await Promise.all([
        supabase
          .from('product_requests')
          .select('*')
          .eq('requested_by_id', user.id)
          .order('created_at', { ascending: false }),
        productRequestService.listSupportedByUser(user.id),
      ]);

      if (!error && data) {
        setRequests(data as unknown as ProductRequest[]);
      }

      const ownIds = new Set((data || []).map((r: any) => r.id));
      const meta: Record<string, SupportMeta> = {};
      const supList: ProductRequest[] = [];
      for (const s of supRows) {
        if (ownIds.has(s.request.id)) continue;
        meta[s.request.id] = { types: s.supportTypes, staked: s.staked, rewarded: s.rewarded };
        supList.push({
          id: s.request.id,
          product_name: s.request.productName,
          description: s.request.description,
          category: s.request.category,
          status: (s.request.status as any),
          priority: '',
          votes: s.request.votes,
          admin_notes: s.request.rejectionHoldReason || undefined,
          created_at: s.request.createdAt.toISOString(),
        });
      }
      setSupported(supList);
      setSupportMeta(meta);
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

  const sourceList = tab === 'mine' ? requests : supported;
  const filteredRequests = filterStatus ? sourceList.filter((r) => normalizeStatus(r.status) === filterStatus) : sourceList;

  const statusCounts = {
    pending: sourceList.filter((r) => normalizeStatus(r.status) === 'pending').length,
    in_progress: sourceList.filter((r) => normalizeStatus(r.status) === 'in_progress').length,
    approved: sourceList.filter((r) => normalizeStatus(r.status) === 'approved').length,
    rejected: sourceList.filter((r) => normalizeStatus(r.status) === 'rejected').length,
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
              onPress={() => navigation.navigate('BrowseRequests')}
              style={styles.headerIconButton}
              accessibilityLabel="Browse community requests"
            >
              <Package size={22} color={COLORS.primary} strokeWidth={2.2} />
            </Pressable>
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
        {/* Tabs: Mine vs Supported */}
        <View style={styles.tabsRow}>
          {([
            { key: 'mine', label: `Mine (${requests.length})` },
            { key: 'supported', label: `Supported (${supported.length})` },
          ] as { key: Tab; label: string }[]).map((t) => (
            <Pressable
              key={t.key}
              onPress={() => { setTab(t.key); setFilterStatus(null); }}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

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
              const normalizedStatus = normalizeStatus(request.status);
              const config = STATUS_CONFIG[normalizedStatus] || STATUS_CONFIG.pending;
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
                      <StatusIcon status={normalizedStatus} size={14} />
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

                  {/* Participation badges (Supported tab) */}
                  {tab === 'supported' && supportMeta[request.id] && (
                    <View style={styles.metaRow}>
                      {supportMeta[request.id].types.map((t) => (
                        <View key={t} style={styles.metaPill}>
                          <Text style={styles.metaPillText}>
                            {t === 'upvote'
                              ? '👍 Upvoted'
                              : t === 'pledge'
                                ? '🙋 Pledged'
                                : `💰 Staked ${supportMeta[request.id].staked} BC`}
                          </Text>
                        </View>
                      ))}
                      {supportMeta[request.id].rewarded && (
                        <View style={[styles.metaPill, { backgroundColor: '#D1FAE5' }]}>
                          <Text style={[styles.metaPillText, { color: '#065F46' }]}>🎉 Rewarded</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* View Contributions */}
                  <View style={styles.viewContributionsRow}>
                    <Pressable
                      style={({ pressed }) => [styles.viewContributionsBtn, pressed && { opacity: 0.75 }]}
                      onPress={() => navigation.navigate('ProductRequestDetail', { requestId: request.id })}
                    >
                      <MessageSquare size={13} color={COLORS.primary} strokeWidth={2} />
                      <Text style={styles.viewContributionsText}>View Contributions</Text>
                    </Pressable>
                  </View>
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
  viewContributionsRow: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'flex-end',
  },
  viewContributionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
    backgroundColor: `${COLORS.primary}08`,
  },
  viewContributionsText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabBtnActive: {
    backgroundColor: COLORS.primary,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#F3E8FF',
  },
  metaPillText: {
    fontSize: 10,
    color: '#6B21A8',
    fontWeight: '600',
  },
});
