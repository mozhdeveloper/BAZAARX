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
import { ChevronLeft, Flame, ThumbsUp, DollarSign, TrendingUp, MessageSquare, CheckCircle2 } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { supabase } from '../src/lib/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { CommentSection } from '../src/components/requests/CommentSection';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ProductRequestDetail'>;

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

/* ── Status config: aligned with web version ──────────────────────────────── */
const STATUS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string; border: string; message: string }> = {
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

type ActiveTab = 'discussion' | 'pipeline';

export default function ProductRequestDetailScreen({ navigation, route }: Props) {
  const { requestId } = route.params;
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [request, setRequest] = useState<ProductRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('discussion');
  const [isVoting, setIsVoting] = useState(false);

  const fetchRequest = useCallback(async () => {
    const { data, error } = await supabase
      .from('product_requests')
      .select('*')
      .eq('id', requestId)
      .single();
    if (!error && data) setRequest(data as unknown as ProductRequest);
    setLoading(false);
  }, [requestId]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  const handleUpvote = async () => {
    if (!request) return;
    setIsVoting(true);
    try {
      const { error } = await supabase
        .from('product_requests')
        .update({ votes: (request.votes || 0) + 1 })
        .eq('id', request.id);
      if (!error) {
        setRequest(prev => prev ? { ...prev, votes: (prev.votes || 0) + 1 } : prev);
      }
    } finally {
      setIsVoting(false);
    }
  };

  const handlePledge = () => {
    Alert.alert(
      'Pledge $25',
      'By pledging, you signal serious interest. We notify you when this product is verified and available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pledge $25',
          onPress: async () => {
            if (!request) return;
            const { error } = await supabase
              .from('product_requests')
              .update({ estimated_demand: (request.estimated_demand || 0) + 1 })
              .eq('id', request.id);
            if (!error) {
              setRequest(prev => prev
                ? { ...prev, estimated_demand: (prev.estimated_demand || 0) + 1 }
                : prev
              );
            }
          },
        },
      ]
    );
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
  const heatScore = (request.votes || 0) + (request.estimated_demand || 0);
  const nextStage = NEXT_STAGE[request.status] ?? NEXT_STAGE.approved;
  const progressPct = Math.min(100, Math.round((heatScore / nextStage.threshold) * 100));
  const toGo = Math.max(0, nextStage.threshold - heatScore);
  const currentStageIdx = STAGE_ORDER.indexOf(request.status);

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
        </View>

        {/* ── ACTION BUTTONS ── */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.upvoteBtn, pressed && { opacity: 0.85 }]}
            onPress={handleUpvote}
            disabled={isVoting}
          >
            <ThumbsUp size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Upvote ({request.votes || 0})</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.pledgeBtn, pressed && { opacity: 0.85 }]}
            onPress={handlePledge}
          >
            <DollarSign size={18} color="#FFFFFF" />
            <Text style={styles.actionBtnText}>Pledge $25</Text>
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
});

