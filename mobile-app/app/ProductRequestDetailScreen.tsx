import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Flame, ThumbsUp, DollarSign, TrendingUp, MessageSquare, CheckCircle2, ShoppingBag, ExternalLink } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { CommentSection } from '../src/components/requests/CommentSection';
import { productRequestService } from '../src/services/productRequestService';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductRequestDetail'>;

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
  estimated_demand: number;
  demand_count?: number;
  staked_bazcoins?: number;
  comments_count: number;
  requested_by_name: string;
  admin_notes?: string;
  rejection_hold_reason?: string;
  linked_product_id?: string;
  reference_links?: string[];
  created_at: string;
}

/* ── Status config: aligned with web version ──────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string; message: string }> = {
  new: {
    label: 'New', emoji: '🆕',
    color: '#1F2937', bg: '#F9FAFB', border: '#E5E7EB',
    message: 'Your request has been received and will be reviewed soon.',
  },
  under_review: {
    label: 'Under Review', emoji: '👀',
    color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
    message: 'Our team is reviewing this request before sourcing.',
  },
  approved_for_sourcing: {
    label: 'In Sourcing', emoji: '🔍',
    color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
    message: 'Suppliers are being contacted and samples are being sourced and negotiated.',
  },
  already_available: {
    label: 'Already Available', emoji: '🛒',
    color: '#166534', bg: '#F0FDF4', border: '#BBF7D0',
    message: 'This request was matched to an existing BazaarX product.',
  },
  on_hold: {
    label: 'On Hold', emoji: '⏸️',
    color: '#92400E', bg: '#FFFBEB', border: '#FDE68A',
    message: 'This request is temporarily on hold pending more information.',
  },
  converted_to_listing: {
    label: 'Listed', emoji: '🎉',
    color: '#166534', bg: '#F0FDF4', border: '#BBF7D0',
    message: 'This request has been converted into a live marketplace listing.',
  },
  pending: {
    label: 'Gathering Interest', emoji: '📍',
    color: '#92400E', bg: '#FFFBEB', border: '#FDE68A',
    message: 'Community is gathering interest. Upvote to help this reach sourcing!',
  },
  in_progress: {
    label: 'In Sourcing', emoji: '🔍',
    color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
    message: 'Suppliers are being contacted and samples are being sourced and negotiated.',
  },
  approved: {
    label: 'Verified', emoji: '✅',
    color: '#166534', bg: '#F0FDF4', border: '#BBF7D0',
    message: 'This product has been lab-verified and is ready for the marketplace.',
  },
  rejected: {
    label: 'Not Available', emoji: '❌',
    color: '#991B1B', bg: '#FEF2F2', border: '#FECACA',
    message: 'This product did not pass verification.',
  },
};

/* ── Next stage thresholds: aligned with web version ──────────────────────── */
const NEXT_STAGE: Record<string, { label: string; threshold: number }> = {
  new:         { label: 'Under Review', threshold: 80 },
  under_review:{ label: 'Sourcing',     threshold: 140 },
  approved_for_sourcing: { label: 'Verification', threshold: 260 },
  already_available: { label: 'Resolved', threshold: 1 },
  on_hold:     { label: 'Pending Review', threshold: 1 },
  converted_to_listing: { label: 'Live', threshold: 1 },
  pending:     { label: 'Sourcing', threshold: 200 },
  in_progress: { label: 'Testing',  threshold: 400 },
  approved:    { label: 'Live',     threshold: 500 },
  rejected:    { label: 'N/A',      threshold: 1   },
};

const PIPELINE_STAGES = [
  { key: 'pending',     emoji: '📍', label: 'Gathering Interest', desc: 'Community is voting and pledging to show demand.' },
  { key: 'in_progress', emoji: '🔍', label: 'Sourcing',           desc: 'Suppliers contacted, samples ordered and negotiated.' },
  { key: 'testing',     emoji: '🧪', label: 'Lab Testing',        desc: 'Bend tests, spec checks, durability testing underway.' },
  { key: 'approved',    emoji: '✅', label: 'Verified',            desc: 'All tests passed — ready for marketplace listing.' },
  { key: 'live',        emoji: '🚀', label: 'Live',               desc: 'Product is live and available for purchase.' },
];

const STAGE_ORDER = ['pending', 'in_progress', 'testing', 'approved', 'live'];

const toPipelineStatus = (status: ProductRequest['status']) => {
  if (status === 'new') return 'pending';
  if (status === 'under_review') return 'pending';
  if (status === 'approved_for_sourcing') return 'in_progress';
  if (status === 'already_available') return 'approved';
  if (status === 'converted_to_listing') return 'approved';
  if (status === 'on_hold') return 'rejected';
  return status;
};

type ActiveTab = 'discussion' | 'pipeline';

export default function ProductRequestDetailScreen({ navigation, route }: Props) {
  const { requestId } = route.params;
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [request, setRequest] = useState<ProductRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('discussion');
  const [isVoting, setIsVoting] = useState(false);
  // BX-07-012: participation state
  const [mySupport, setMySupport] = useState<{ hasUpvoted: boolean; hasPledged: boolean; stakedAmount: number } | null>(null);

  const fetchParticipation = useCallback(async (requestId: string) => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('request_supports')
      .select('support_type, bazcoin_amount')
      .eq('request_id', requestId)
      .eq('user_id', user.id);
    if (data) {
      setMySupport({
        hasUpvoted: data.some((r: any) => r.support_type === 'upvote'),
        hasPledged: data.some((r: any) => r.support_type === 'pledge'),
        stakedAmount: data
          .filter((r: any) => r.support_type === 'stake')
          .reduce((sum: number, r: any) => sum + (r.bazcoin_amount || 0), 0),
      });
    }
  }, [user?.id]);

  const fetchRequest = useCallback(async () => {
    // Try service first (uses mapRequest for camelCase DTOs), fall back to raw supabase
    let requestId_: string = requestId;
    try {
      const dto = await productRequestService.getById(requestId);
      if (dto) {
        const mapped: ProductRequest = {
          id: dto.id,
          product_name: dto.productName || dto.title,
          description: dto.description || dto.summary,
          category: dto.category,
          status: dto.status as ProductRequest['status'],
          priority: '',
          votes: dto.votes,
          estimated_demand: dto.demandCount,
          demand_count: dto.demandCount,
          staked_bazcoins: dto.stakedBazcoins,
          comments_count: dto.comments,
          requested_by_name: dto.requestedBy,
          admin_notes: dto.adminNotes ?? undefined,
          rejection_hold_reason: dto.rejectionHoldReason ?? undefined,
          linked_product_id: dto.linkedProductId ?? undefined,
          reference_links: dto.referenceLinks ?? [],
          created_at: dto.createdAt.toISOString(),
        };
        setRequest(mapped);
        requestId_ = dto.id;
        setLoading(false);
        await fetchParticipation(requestId_);
        return;
      }
    } catch (_) { /* fallback */ }
    const { data, error } = await supabase
      .from('product_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (!error && data) {
      setRequest(data as unknown as ProductRequest);
      await fetchParticipation(data.id);
    }
    setLoading(false);
  }, [requestId, fetchParticipation]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  const handleUpvote = async () => {
    if (!request) return;
    setIsVoting(true);
    try {
      const res = await productRequestService.support(request.id, 'upvote', 0);
      if (res.success) {
        await fetchRequest();
      } else if (res.error) {
        Alert.alert('Cannot upvote', res.error);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handlePledge = () => {
    if (!request) return;
    Alert.alert(
      'Pledge interest',
      'Pledging signals serious intent to buy. We will notify you when this product is verified and live.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pledge',
          onPress: async () => {
            const res = await productRequestService.support(request.id, 'pledge', 0);
            if (res.success) {
              await fetchRequest();
              Alert.alert('Pledged', 'You will be notified when this product is available.');
            } else if (res.error) {
              Alert.alert('Cannot pledge', res.error);
            }
          },
        },
      ]
    );
  };

  const handleStake = () => {
    if (!request) return;
    // Alert.prompt is iOS-only — use fixed amounts for cross-platform.
    Alert.alert(
      'Stake BazCoins',
      'Stake BazCoins to boost this request. If it becomes a real listing you may earn rewards.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Stake 50 BC', onPress: () => doStake(50) },
        { text: 'Stake 100 BC', onPress: () => doStake(100) },
        { text: 'Stake 250 BC', onPress: () => doStake(250) },
      ]
    );
  };

  const doStake = async (amount: number) => {
    if (!request) return;
    const res = await productRequestService.support(request.id, 'stake', amount);
    if (res.success) {
      Alert.alert('Staked', `${amount} BC staked. New balance: ${res.newBalance ?? '—'}`);
      fetchRequest();
    } else {
      Alert.alert('Cannot stake', res.error || 'Unknown error');
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Request not found.</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.goBackBtn}>
          <Text style={styles.goBackText}>← Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
  const heatScore = (request.votes || 0) + (request.estimated_demand || 0) + (request.demand_count || 0);
  const nextStage = NEXT_STAGE[request.status] ?? NEXT_STAGE.approved;
  const progressPct = Math.min(100, Math.round((heatScore / nextStage.threshold) * 100));
  const toGo = Math.max(0, nextStage.threshold - heatScore);
  const currentStageIdx = STAGE_ORDER.indexOf(toPipelineStatus(request.status));

  const isAlreadyAvailable = request.status === 'already_available' && !!request.linked_product_id;
  const isRejected = (request.status === 'rejected' || request.status === 'on_hold') && !!(request.rejection_hold_reason || request.admin_notes);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={COLORS.textHeadline} strokeWidth={2} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Lab Pipeline</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── HEAT SCORE CARD ── */}
        <View style={styles.heatCard}>
          <View style={styles.heatTopRow}>
            <View>
              <Text style={styles.heatEyebrow}>Heat Score</Text>
              <View style={styles.heatRow}>
                <Flame size={28} color={COLORS.primary} />
                <Text style={styles.heatNumber}>{heatScore}</Text>
              </View>
            </View>
            {request.status !== 'rejected' && (
              <View style={styles.heatNextBox}>
                <Text style={styles.heatNextLabel}>NEXT</Text>
                <Text style={styles.heatNextStage}>{nextStage.label}</Text>
                <Text style={styles.heatToGo}>{toGo} to go</Text>
              </View>
            )}
          </View>
          <View style={styles.progressWrap}>
            <View style={styles.progressTrack}>
              <LinearGradient
                colors={[COLORS.primary, '#E58C1A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progressPct}%` as any }]}
              />
            </View>
            <Text style={styles.progressPct}>{progressPct}%</Text>
          </View>
        </View>

        {/* ── STAT BOXES ── */}
        <View style={styles.statBoxRow}>
          <View style={[styles.statBox, { borderColor: '#BFDBFE' }]}>
            <Text style={styles.statBoxEyebrow}>UPVOTES</Text>
            <Text style={styles.statBoxValue}>{request.votes || 0}</Text>
          </View>
          <View style={[styles.statBox, { borderColor: `${COLORS.primary}50` }]}>
            <Text style={[styles.statBoxEyebrow, { color: COLORS.primary }]}>PLEDGES</Text>
            <Text style={styles.statBoxValue}>{request.estimated_demand || 0}</Text>
          </View>
        </View>

        {/* ── REQUEST CARD ── */}
        <View style={styles.requestCard}>
          <View style={styles.requestTopRow}>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
              <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
            </View>
            <Text style={styles.founderText}>by {request.requested_by_name || 'Anonymous'}</Text>
          </View>

          <Text style={styles.productName}>{request.product_name}</Text>
          {!!request.description && (
            <Text style={styles.description}>{request.description}</Text>
          )}

          <View style={styles.metaRow}>
            {!!request.category && (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{request.category}</Text>
              </View>
            )}
            <Text style={styles.dateText}>
              {new Date(request.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </View>

          <View style={styles.statusMessageBox}>
            <Text style={styles.statusMessage}>{cfg.message}</Text>
          </View>

          {/* BX-07-019: Rejection / hold reason */}
          {isRejected && (
            <View style={[styles.statusMessageBox, { marginTop: 8, backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
              <Text style={[styles.statusMessage, { color: '#991B1B', fontWeight: '700' }]}>
                Reason: {request.rejection_hold_reason || request.admin_notes}
              </Text>
            </View>
          )}

          {/* BX-07-018: Direct link to matched product */}
          {isAlreadyAvailable && (
            <Pressable
              style={[styles.statusMessageBox, { marginTop: 8, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', gap: 8 }]}
              onPress={async () => {
                if (!request.linked_product_id) return;
                const { data: prod } = await supabase
                  .from('products')
                  .select('*')
                  .eq('id', request.linked_product_id)
                  .maybeSingle();
                if (prod) {
                  (navigation as any).navigate('ProductDetail', { product: prod });
                } else {
                  Alert.alert('Product not found', 'The matched product may no longer be available.');
                }
              }}
            >
              <ShoppingBag size={16} color="#166534" />
              <Text style={[styles.statusMessage, { color: '#166534', fontWeight: '700', flex: 1 }]}>View matched product in marketplace →</Text>
              <ExternalLink size={14} color="#166534" />
            </Pressable>
          )}

          {/* BX-07-012: Participation badges */}
          {mySupport && (mySupport.hasUpvoted || mySupport.hasPledged || mySupport.stakedAmount > 0) && (
            <View style={styles.participationRow}>
              <Text style={styles.participationLabel}>Your participation:</Text>
              {mySupport.hasUpvoted && <View style={styles.participationBadge}><Text style={styles.participationBadgeText}>👍 Upvoted</Text></View>}
              {mySupport.hasPledged && <View style={[styles.participationBadge, { backgroundColor: '#DCFCE7' }]}><Text style={[styles.participationBadgeText, { color: '#166534' }]}>🤝 Pledged</Text></View>}
              {mySupport.stakedAmount > 0 && <View style={[styles.participationBadge, { backgroundColor: '#FEF3C7' }]}><Text style={[styles.participationBadgeText, { color: '#92400E' }]}>⚡ {mySupport.stakedAmount} BC Staked</Text></View>}
            </View>
          )}

          {/* Reference links */}
          {!!request.reference_links?.length && (
            <View style={{ marginTop: 10, gap: 4 }}>
              <Text style={[styles.participationLabel, { marginBottom: 2 }]}>Reference links:</Text>
              {request.reference_links.map((link, i) => (
                <Text key={i} style={{ fontSize: 12, color: COLORS.primary }} numberOfLines={1}>• {link}</Text>
              ))}
            </View>
          )}
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.upvoteBtn, mySupport?.hasUpvoted && { backgroundColor: '#6366F1' }, pressed && { opacity: 0.85 }]}
            onPress={handleUpvote}
            disabled={isVoting || mySupport?.hasUpvoted}
          >
            <ThumbsUp size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{mySupport?.hasUpvoted ? 'Upvoted ✓' : `Upvote (${request.votes || 0})`}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.pledgeBtn, mySupport?.hasPledged && { backgroundColor: '#059669' }, pressed && { opacity: 0.85 }]}
            onPress={handlePledge}
            disabled={mySupport?.hasPledged}
          >
            <DollarSign size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>{mySupport?.hasPledged ? 'Pledged ✓' : 'Pledge'}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.pledgeBtn, { backgroundColor: '#F59E0B' }, pressed && { opacity: 0.85 }]}
            onPress={handleStake}
          >
            <TrendingUp size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Stake BC</Text>
          </Pressable>
        </View>

        {/* ── TABS ── */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setActiveTab('discussion')}
            style={[styles.tabBtn, activeTab === 'discussion' && styles.tabBtnActive]}
          >
            <MessageSquare size={14} color={activeTab === 'discussion' ? COLORS.textHeadline : COLORS.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'discussion' && styles.tabBtnTextActive]}>
              Discussion ({request.comments_count || 0})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('pipeline')}
            style={[styles.tabBtn, activeTab === 'pipeline' && styles.tabBtnActive]}
          >
            <TrendingUp size={14} color={activeTab === 'pipeline' ? COLORS.textHeadline : COLORS.textMuted} />
            <Text style={[styles.tabBtnText, activeTab === 'pipeline' && styles.tabBtnTextActive]}>
              Lab Pipeline
            </Text>
          </Pressable>
        </View>

        {/* ── TAB CONTENT ── */}
        {activeTab === 'discussion' ? (
          <View style={styles.tabContent}>
            <Text style={styles.tabSectionTitle}>Contribute to this Request</Text>
            <CommentSection
              requestId={requestId}
              viewerUserId={user?.id ?? null}
              showForm={!!user}
            />
          </View>
        ) : (
          <View style={styles.tabContent}>
            <Text style={styles.tabSectionTitle}>Lab Pipeline Progress</Text>
            <View style={styles.pipelineList}>
              {PIPELINE_STAGES.map(({ key, emoji, label, desc }) => {
                const stageIdx = STAGE_ORDER.indexOf(key);
                const isPast = stageIdx < currentStageIdx;
                const isCurrent = stageIdx === currentStageIdx;
                return (
                  <View
                    key={key}
                    style={[
                      styles.pipelineStage,
                      isCurrent && styles.pipelineStageCurrent,
                      isPast && styles.pipelineStagePast,
                    ]}
                  >
                    <Text style={styles.pipelineEmoji}>{emoji}</Text>
                    <View style={styles.pipelineStageInfo}>
                      <View style={styles.pipelineStageRow}>
                        <Text style={[styles.pipelineStageName, isCurrent && { color: '#7C3AED' }]}>{label}</Text>
                        {isPast && (
                          <View style={styles.completedChip}>
                            <CheckCircle2 size={10} color="#166534" />
                            <Text style={styles.completedText}>Complete</Text>
                          </View>
                        )}
                        {isCurrent && <Text style={styles.currentText}>← Current</Text>}
                      </View>
                      <Text style={styles.pipelineDesc}>{desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Admin Notes */}
        {!!request.admin_notes && (
          <View style={styles.adminNotesCard}>
            <Text style={styles.adminNotesEyebrow}>TEAM UPDATE</Text>
            <Text style={styles.adminNotesText}>{request.admin_notes}</Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F5F0' },
  errorText: { fontSize: 16, color: COLORS.textMuted, marginBottom: 12 },
  goBackBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  goBackText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  container: { flex: 1, backgroundColor: '#F8F5F0' },

  /* Header */
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F0EBE3',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textHeadline, flex: 1, textAlign: 'center' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 60, gap: 12 },

  /* Heat Score card */
  heatCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: COLORS.textHeadline,
    shadowColor: '#5C3D1E', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  heatEyebrow: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 },
  heatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heatNumber: { fontSize: 40, fontWeight: '900', color: COLORS.primary },
  heatNextBox: { alignItems: 'flex-end' },
  heatNextLabel: { fontSize: 9, fontWeight: '800', color: COLORS.textMuted, letterSpacing: 2, textTransform: 'uppercase' },
  heatNextStage: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline, fontStyle: 'italic' },
  heatToGo: { fontSize: 11, color: COLORS.textMuted },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 10, backgroundColor: '#F0EBE3', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressPct: { fontSize: 12, fontWeight: '800', color: COLORS.primary, minWidth: 36, textAlign: 'right' },

  /* Stat boxes */
  statBoxRow: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1.5,
    shadowColor: '#5C3D1E', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statBoxEyebrow: { fontSize: 9, fontWeight: '800', color: '#6366F1', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  statBoxValue: { fontSize: 24, fontWeight: '900', color: COLORS.textHeadline },

  /* Request card */
  requestCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: '#E9D5FF',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  requestTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  founderText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  productName: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 8, lineHeight: 26 },
  description: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 21, marginBottom: 12 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  categoryPill: { backgroundColor: '#F0EBE3', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  categoryText: { fontSize: 12, color: COLORS.textMuted, fontWeight: '500' },
  dateText: { fontSize: 12, color: COLORS.textMuted },
  statusMessageBox: { backgroundColor: '#F8F5F0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E8E0D8' },
  statusMessage: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },

  /* Action buttons */
  actionRow: { flexDirection: 'row', gap: 10 },
  upvoteBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  pledgeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 14,
    shadowColor: '#16A34A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  /* Tabs */
  tabsRow: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#F0EBE3' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabBtnActive: { backgroundColor: '#F0EBE3' },
  tabBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMuted },
  tabBtnTextActive: { color: COLORS.textHeadline },

  /* Tab content */
  tabContent: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F0EBE3' },
  tabSectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textHeadline, marginBottom: 14 },

  /* Pipeline */
  pipelineList: { gap: 8 },
  pipelineStage: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: 12, backgroundColor: '#F8F5F0', borderWidth: 1, borderColor: '#E8E0D8' },
  pipelineStageCurrent: { backgroundColor: '#F5F3FF', borderColor: '#C4B5FD' },
  pipelineStagePast: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  pipelineEmoji: { fontSize: 22, marginTop: 2 },
  pipelineStageInfo: { flex: 1 },
  pipelineStageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  pipelineStageName: { fontSize: 13, fontWeight: '700', color: COLORS.textHeadline },
  completedChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  completedText: { fontSize: 10, fontWeight: '700', color: '#166534' },
  currentText: { fontSize: 10, fontWeight: '700', color: '#7C3AED' },
  pipelineDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },

  /* Admin Notes */
  adminNotesCard: {
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  adminNotesEyebrow: { fontSize: 9, fontWeight: '800', color: '#1E40AF', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 },
  adminNotesText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 19 },

  /* Participation */
  participationRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 },
  participationLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  participationBadge: { backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  participationBadgeText: { fontSize: 11, fontWeight: '700', color: '#5B21B6' },
});

