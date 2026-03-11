import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Search,
  FlaskConical,
  Flame,
  TrendingUp,
  Package,
  Plus,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { supabase } from '../src/lib/supabase';
import ProductRequestModal from '../src/components/ProductRequestModal';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'LabPipeline'>;

interface ProductRequest {
  id: string;
  product_name: string;
  description: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected' | 'in_progress';
  priority: string;
  votes: number;
  estimated_demand: number;
  comments_count: number;
  requested_by_name: string;
  admin_notes?: string;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  pending:     { label: 'Gathering',  emoji: '📍', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
  in_progress: { label: 'Sourcing',   emoji: '🔍', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  approved:    { label: 'Verified',   emoji: '✅', color: '#166534', bg: '#F0FDF4', border: '#BBF7D0' },
  rejected:    { label: 'Rejected',   emoji: '❌', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA' },
};

const FILTER_TABS = [
  { key: null,          label: 'All' },
  { key: 'pending',     label: 'Gathering 📍' },
  { key: 'in_progress', label: 'Sourcing 🔍' },
  { key: 'approved',    label: 'Verified ✅' },
] as const;

export default function LabPipelineScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [requests, setRequests] = useState<ProductRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from('product_requests')
      .select('*')
      .neq('status', 'rejected')
      .order('votes', { ascending: false });

    if (!error && data) setRequests(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests();
  }, [fetchRequests]);

  /* ── Derived data ──────────────────────────── */

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return requests
      .filter(r => {
        const matchSearch = !q ||
          r.product_name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.category?.toLowerCase().includes(q);
        const matchStatus = !filterStatus || r.status === filterStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => (b.votes + b.estimated_demand) - (a.votes + a.estimated_demand));
  }, [requests, searchQuery, filterStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, in_progress: 0, approved: 0 };
    requests.forEach(r => { if (r.status in c) c[r.status]++; });
    return c;
  }, [requests]);

  const totalVotes = useMemo(() => requests.reduce((s, r) => s + (r.votes || 0), 0), [requests]);
  const totalPledges = useMemo(() => requests.reduce((s, r) => s + (r.estimated_demand || 0), 0), [requests]);

  const labProgress = (r: ProductRequest) => {
    if (r.status === 'approved') return 100;
    if (r.status === 'in_progress') return 35;
    return 10;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      {/* ── GRADIENT HEADER ── */}
      <LinearGradient
        colors={['#6B46C1', '#805AD5', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientHeader}
      >
        {/* Nav row */}
        <View style={styles.navRow}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <View style={styles.headerTitleRow}>
            <View style={styles.flaskIcon}>
              <FlaskConical size={18} color="#FFFFFF" />
            </View>
            <Text style={styles.headerTitle}>Bazaarx Lab Pipeline</Text>
          </View>
          <View style={styles.backBtn} />
        </View>
        <Text style={styles.headerSubtitle}>
          Community-requested products • verified before they go live
        </Text>

        {/* Stat chips */}
        <View style={styles.statRow}>
          {[
            { label: 'Requests', value: requests.length },
            { label: 'Sourcing', value: counts.in_progress },
            { label: 'Verified', value: counts.approved },
          ].map(({ label, value }) => (
            <View key={label} style={styles.statChip}>
              <Text style={styles.statValue}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── SEARCH BAR ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Search size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products in the pipeline..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* ── FILTER TABS ── */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {FILTER_TABS.map(({ key, label }) => {
            const count = key ? counts[key] ?? 0 : requests.length;
            const active = filterStatus === key;
            return (
              <Pressable
                key={label}
                onPress={() => setFilterStatus(key)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── LIST ── */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={40} color={COLORS.gray300} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No results found' : 'No requests yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different keyword' : 'Be the first to request a product!'}
            </Text>
            <Pressable style={styles.requestCta} onPress={() => setShowRequestModal(true)}>
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.requestCtaText}>Request a Product</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {filtered.map(r => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
              const heat = (r.votes || 0) + (r.estimated_demand || 0);
              const progress = labProgress(r);
              return (
                <Pressable
                  key={r.id}
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => navigation.navigate('ProductRequestDetail', { requestId: r.id })}
                >
                  {/* Top row: status + heat */}
                  <View style={styles.cardTopRow}>
                    <View style={[styles.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                      <Text style={[styles.statusText, { color: cfg.color }]}>
                        {cfg.emoji} {cfg.label}
                      </Text>
                    </View>
                    <View style={styles.heatChip}>
                      <Flame size={13} color={COLORS.primary} />
                      <Text style={styles.heatValue}>{heat}</Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.cardTitle} numberOfLines={2}>{r.product_name}</Text>

                  {/* Description */}
                  {!!r.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{r.description}</Text>
                  )}

                  {/* Stats row */}
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <TrendingUp size={12} color="#6366F1" />
                      <Text style={styles.statItemText}>{r.votes || 0} upvotes</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statItemText}>💰 {r.estimated_demand || 0} pledges</Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>Lab Progress</Text>
                    <View style={styles.progressTrack}>
                      <LinearGradient
                        colors={[COLORS.primary, '#E58C1A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.progressFill, { width: `${progress}%` as any }]}
                      />
                    </View>
                    <Text style={styles.progressPct}>{progress}%</Text>
                  </View>

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    {r.category ? (
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryText}>{r.category}</Text>
                      </View>
                    ) : null}
                    <Text style={styles.founderText}>
                      by {r.requested_by_name || 'Anonymous'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}

            {/* ── MARKETPLACE ACTIVITY ── */}
            <View style={styles.activityBar}>
              {[
                { value: totalVotes.toLocaleString(), label: 'Community Votes' },
                { value: totalPledges.toLocaleString(), label: 'Active Pledges' },
                { value: String(counts.approved ?? 0), label: 'Lab Verified' },
              ].map(({ value, label }) => (
                <View key={label} style={styles.activityItem}>
                  <Text style={styles.activityValue}>{value}</Text>
                  <Text style={styles.activityLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {/* ── TRUST SECTION ── */}
            <LinearGradient
              colors={[COLORS.textHeadline, '#1A1210']}
              style={styles.trustCard}
            >
              <Text style={styles.trustEyebrow}>The Trust Difference</Text>
              <Text style={styles.trustTitle}>Every Product Tested. Every Claim Verified.</Text>
              <View style={styles.trustBadges}>
                {[
                  { icon: ShieldCheck, label: 'Spec Verification' },
                  { icon: CheckCircle2, label: 'Authenticity Checks' },
                ].map(({ icon: Icon, label }) => (
                  <View key={label} style={styles.trustBadge}>
                    <Icon size={14} color={COLORS.primary} />
                    <Text style={styles.trustBadgeText}>{label}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>

            {/* ── REQUEST CTA ── */}
            <View style={styles.ctaSection}>
              <Text style={styles.ctaTitle}>Don't see what you need?</Text>
              <Text style={styles.ctaSubtitle}>Request it — the community votes, we source + test it.</Text>
              <Pressable
                style={({ pressed }) => [styles.requestCta, { marginTop: 14 }, pressed && { opacity: 0.85 }]}
                onPress={() => setShowRequestModal(true)}
              >
                <Plus size={18} color="#FFFFFF" />
                <Text style={styles.requestCtaText}>Request a Product</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <ProductRequestModal
        visible={showRequestModal}
        onClose={() => {
          setShowRequestModal(false);
          fetchRequests();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F5F0' },

  /* Header */
  gradientHeader: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  flaskIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: 16 },
  statRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  statLabel: { fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  /* Search */
  searchWrapper: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0EBE3' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8F5F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: '#E8E0D8',
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textHeadline },

  /* Tabs */
  tabsWrapper: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0EBE3' },
  tabs: { paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: '#F8F5F0', borderWidth: 1, borderColor: '#E8E0D8',
  },
  tabActive: { backgroundColor: COLORS.textHeadline, borderColor: COLORS.textHeadline },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: '#FFFFFF' },

  /* List */
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40, gap: 12 },
  centered: { paddingVertical: 60, alignItems: 'center' },

  /* Empty */
  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textHeadline, marginTop: 8 },
  emptySubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },

  /* Card */
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    shadowColor: '#5C3D1E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#F0EBE3',
  },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  heatChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF4EC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  heatValue: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  cardTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 6, lineHeight: 22 },
  cardDesc: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statItemText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  progressLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, width: 76 },
  progressTrack: { flex: 1, height: 8, backgroundColor: '#F0EBE3', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressPct: { fontSize: 11, fontWeight: '800', color: COLORS.primary, width: 30, textAlign: 'right' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryPill: { backgroundColor: '#F0EBE3', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  categoryText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },
  founderText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  /* Marketplace activity */
  activityBar: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#F0EBE3',
    shadowColor: '#5C3D1E', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  activityItem: { flex: 1, alignItems: 'center' },
  activityValue: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline },
  activityLabel: { fontSize: 10, fontWeight: '600', color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },

  /* Trust card */
  trustCard: { borderRadius: 16, padding: 20 },
  trustEyebrow: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.5)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  trustTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 14, lineHeight: 22 },
  trustBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  trustBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  trustBadgeText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },

  /* CTA */
  ctaSection: { alignItems: 'center', paddingVertical: 24 },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textHeadline },
  ctaSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginTop: 4 },
  requestCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 14,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  requestCtaText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
