/**
 * DiscoverScreen — BazaarX Product Request Hub (Epic 7)
 * Entry-point tab for the Lab / Product-Request ecosystem.
 * Mirrors the web BazaarX page: hero search, trending, trust section,
 * active-request feed, community stats, how-it-works.
 *
 * Cross-platform: safe-area insets, Platform shadows, Android elevation.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  FlaskConical,
  ShieldCheck,
  Flame,
  TrendingUp,
  Users,
  CheckCircle2,
  Package,
  Plus,
  ChevronRight,
  Zap,
  Star,
} from 'lucide-react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import type { TabParamList, RootStackParamList } from '../App';
import { productRequestService, type ProductRequestDTO } from '../src/services/productRequestService';
import { COLORS } from '../src/constants/theme';

type Props = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Discover'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Typed navigation hook for navigating to root-stack screens from a tab
type RootNav = NativeStackScreenProps<RootStackParamList>['navigation'];

const TRENDING_CHIPS = [
  'Durable phone accessories',
  'Ergonomic home office',
  'Local artisan products',
  'Eco-friendly packaging',
  'Fresh farm produce',
  'Kitchen appliances',
];

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    color: '#7C3AED',
    bg: '#F3F0FF',
    title: 'Spec Verification',
    desc: 'Every claim is independently checked against published specs.',
  },
  {
    icon: FlaskConical,
    color: '#0EA5E9',
    bg: '#E0F2FE',
    title: 'Durability Testing',
    desc: 'Bend tests, drop tests, and real-world simulations.',
  },
  {
    icon: CheckCircle2,
    color: '#16A34A',
    bg: '#F0FDF4',
    title: 'Authenticity Checks',
    desc: 'Anti-counterfeit verification before any product goes live.',
  },
];

const HOW_IT_WORKS = [
  { step: '01', emoji: '💡', title: 'Request', desc: 'Submit a product you want. Community votes and pledges.' },
  { step: '02', emoji: '🔍', title: 'Source', desc: 'Our team contacts suppliers and negotiates pricing.' },
  { step: '03', emoji: '🧪', title: 'Lab Tests', desc: 'Products undergo rigorous physical + spec verification.' },
  { step: '04', emoji: '🛒', title: 'Buy Confident', desc: 'Lab-verified listing goes live. Stakers earn rewards.' },
];

export default function DiscoverScreen(_: Props) {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<RootNav>();
  const [search, setSearch] = useState('');
  const [topRequests, setTopRequests] = useState<ProductRequestDTO[]>([]);
  const [stats, setStats] = useState({ votes: 0, pledges: 0, verified: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const rows = await productRequestService.listBrowse({ limit: 50 });
    setTopRequests(rows.slice(0, 3));
    const votes = rows.reduce((s, r) => s + (r.votes || 0), 0);
    const pledges = rows.reduce((s, r) => s + (r.demandCount || 0), 0);
    const verified = rows.filter((r) => r.status === 'approved' || r.status === 'converted_to_listing').length;
    setStats({ votes, pledges, verified, total: rows.length });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load().catch(() => undefined); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handleSearch = () => {
    if (search.trim()) {
      rootNav.navigate('BrowseRequests', { initialSearch: search.trim() });
    } else {
      rootNav.navigate('BrowseRequests');
    }
  };

  const handleTrendingChip = (chip: string) => {
    rootNav.navigate('BrowseRequests', { initialSearch: chip });
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />}
        contentContainerStyle={styles.scrollContent}
        stickyHeaderIndices={[0]}
      >
        {/* ── GRADIENT HERO (sticky on Android, normal on iOS) ── */}
        <LinearGradient
          colors={['#4C1D95', '#6D28D9', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.labBadge}>
              <FlaskConical size={14} color="#C4B5FD" />
              <Text style={styles.labBadgeText}>BazaarX Lab</Text>
            </View>
            <Pressable
              onPress={() => rootNav.navigate('MyRequests')}
              style={styles.myRequestsBtn}
            >
              <Text style={styles.myRequestsBtnText}>My Requests</Text>
              <ChevronRight size={13} color="#C4B5FD" />
            </Pressable>
          </View>

          <Text style={styles.heroTitle}>What quality product{'\n'}are you hunting for?</Text>
          <Text style={styles.heroSub}>
            Community-powered sourcing. Every product tested before it goes live.
          </Text>

          {/* Search bar */}
          <View style={styles.searchBox}>
            <Search size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search or describe a product…"
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {search.trim().length > 0 && (
              <Pressable style={styles.searchGoBtn} onPress={handleSearch}>
                <Text style={styles.searchGoText}>Go</Text>
              </Pressable>
            )}
          </View>

          {/* Trending chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {TRENDING_CHIPS.map((chip) => (
              <Pressable
                key={chip}
                style={styles.chip}
                onPress={() => handleTrendingChip(chip)}
              >
                <Zap size={10} color="#DDD6FE" />
                <Text style={styles.chipText}>{chip}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </LinearGradient>

        {/* ── COMMUNITY STATS ── */}
        {loading ? (
          <View style={styles.statsLoading}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.statsRow}>
            {[
              { label: 'Community Votes', value: stats.votes.toLocaleString(), icon: TrendingUp, color: '#7C3AED' },
              { label: 'Active Pledges', value: stats.pledges.toLocaleString(), icon: Users, color: '#0EA5E9' },
              { label: 'Lab Verified', value: stats.verified, icon: CheckCircle2, color: '#16A34A' },
            ].map(({ label, value, icon: Icon, color }) => (
              <View key={label} style={styles.statCard}>
                <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
                  <Icon size={16} color={color} />
                </View>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.actionGrid}>
            <Pressable
              style={[styles.actionCard, { borderColor: '#DDD6FE' }]}
              onPress={() => rootNav.navigate('BrowseRequests')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3F0FF' }]}>
                <Package size={20} color="#7C3AED" />
              </View>
              <Text style={styles.actionTitle}>Browse All</Text>
              <Text style={styles.actionSub}>{stats.total} requests</Text>
            </Pressable>

            <Pressable
              style={[styles.actionCard, { borderColor: '#BAE6FD' }]}
              onPress={() => rootNav.navigate('LabPipeline')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#E0F2FE' }]}>
                <FlaskConical size={20} color="#0EA5E9" />
              </View>
              <Text style={styles.actionTitle}>Lab Pipeline</Text>
              <Text style={styles.actionSub}>Track progress</Text>
            </Pressable>

            <Pressable
              style={[styles.actionCard, { borderColor: '#FDE68A' }]}
              onPress={() => rootNav.navigate('MyRequests')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFFBEB' }]}>
                <Star size={20} color="#D97706" />
              </View>
              <Text style={styles.actionTitle}>My Requests</Text>
              <Text style={styles.actionSub}>Track yours</Text>
            </Pressable>

            <Pressable
              style={[styles.actionCard, { borderColor: '#BBF7D0' }]}
              onPress={() => rootNav.navigate('CreateProductRequest')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F0FDF4' }]}>
                <Plus size={20} color="#16A34A" />
              </View>
              <Text style={styles.actionTitle}>Submit Request</Text>
              <Text style={styles.actionSub}>Add yours now</Text>
            </Pressable>
          </View>
        </View>

        {/* ── ACTIVE REQUESTS PREVIEW ── */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Trending Requests</Text>
            <Pressable onPress={() => rootNav.navigate('BrowseRequests')}>
              <Text style={styles.sectionLink}>See all</Text>
            </Pressable>
          </View>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
          ) : topRequests.length === 0 ? (
            <View style={styles.emptyRequests}>
              <Package size={32} color={COLORS.gray300} />
              <Text style={styles.emptyText}>No requests yet — be the first!</Text>
            </View>
          ) : (
            topRequests.map((r) => {
              const heat = (r.votes || 0) + (r.demandCount || 0);
              return (
                <Pressable
                  key={r.id}
                  style={({ pressed }) => [styles.requestCard, pressed && { opacity: 0.85 }]}
                  onPress={() => rootNav.navigate('ProductRequestDetail', { requestId: r.id })}
                >
                  <View style={styles.requestCardTop}>
                    <Text style={styles.requestCardTitle} numberOfLines={1}>
                      {r.productName || r.title}
                    </Text>
                    <View style={styles.heatBadge}>
                      <Flame size={11} color="#DC2626" />
                      <Text style={styles.heatText}>{heat}</Text>
                    </View>
                  </View>
                  {!!r.summary && (
                    <Text style={styles.requestCardDesc} numberOfLines={2}>{r.summary}</Text>
                  )}
                  <View style={styles.requestCardFooter}>
                    {!!r.category && (
                      <View style={styles.categoryPill}>
                        <Text style={styles.categoryText}>{r.category}</Text>
                      </View>
                    )}
                    <View style={styles.requestStatRow}>
                      <TrendingUp size={11} color="#7C3AED" />
                      <Text style={styles.requestStatText}>{r.votes || 0} votes</Text>
                      <Users size={11} color="#6B7280" style={{ marginLeft: 8 }} />
                      <Text style={styles.requestStatText}>{r.demandCount || 0} pledges</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* ── TRUST DIFFERENCE ── */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>The Trust Difference</Text>
          <Text style={styles.sectionSubtitle}>
            Every Product Tested. Every Claim Verified.
          </Text>
          {TRUST_ITEMS.map(({ icon: Icon, color, bg, title, desc }) => (
            <View key={title} style={styles.trustCard}>
              <View style={[styles.trustIconWrap, { backgroundColor: bg }]}>
                <Icon size={20} color={color} />
              </View>
              <View style={styles.trustText}>
                <Text style={styles.trustTitle}>{title}</Text>
                <Text style={styles.trustDesc}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── HOW WE OPERATE ── */}
        <View style={[styles.sectionWrap, styles.howItWorksWrap]}>
          <Text style={[styles.sectionTitle, { color: '#FFFFFF' }]}>How We Operate</Text>
          <Text style={[styles.sectionSubtitle, { color: '#C4B5FD' }]}>
            Four steps from idea to lab-verified listing.
          </Text>
          <View style={styles.stepsGrid}>
            {HOW_IT_WORKS.map(({ step, emoji, title, desc }) => (
              <View key={step} style={styles.stepCard}>
                <Text style={styles.stepNum}>{step}</Text>
                <Text style={styles.stepEmoji}>{emoji}</Text>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepDesc}>{desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── CTA BANNER ── */}
        <Pressable
          style={({ pressed }) => [styles.ctaBanner, pressed && { opacity: 0.9 }]}
          onPress={() => rootNav.navigate('CreateProductRequest')}
        >
          <View>
            <Text style={styles.ctaTitle}>Can't find what you need?</Text>
            <Text style={styles.ctaSub}>Request a product — community decides what gets sourced.</Text>
          </View>
          <View style={styles.ctaBtn}>
            <Plus size={18} color="#FFFFFF" />
          </View>
        </Pressable>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  android: { elevation: 3 },
  default: {},
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F3FF' },
  scrollContent: { flexGrow: 1 },

  // Hero
  hero: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  labBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  labBadgeText: { fontSize: 11, fontWeight: '700', color: '#C4B5FD', letterSpacing: 0.5 },
  myRequestsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  myRequestsBtnText: { fontSize: 12, fontWeight: '600', color: '#DDD6FE' },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 30,
    marginBottom: 8,
  },
  heroSub: {
    fontSize: 13,
    color: '#C4B5FD',
    lineHeight: 18,
    marginBottom: 16,
  },

  // Search
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  searchGoBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  searchGoText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },

  // Chips
  chipsRow: { gap: 8, paddingRight: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chipText: { fontSize: 11, color: '#EDE9FE', fontWeight: '600' },

  // Stats
  statsLoading: { paddingVertical: 24, alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: COLORS.textHeadline },
  statLabel: { fontSize: 10, color: COLORS.textMuted, textAlign: 'center', fontWeight: '600' },

  // Sections
  sectionWrap: {
    backgroundColor: '#FFFFFF',
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textHeadline,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 16,
  },
  sectionLink: { fontSize: 13, color: '#7C3AED', fontWeight: '600' },

  // Action grid
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  actionCard: {
    width: '47%',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    alignItems: 'flex-start',
    ...shadow,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textHeadline, marginBottom: 2 },
  actionSub: { fontSize: 11, color: COLORS.textMuted },

  // Request cards
  requestCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadow,
  },
  requestCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  requestCardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textHeadline, marginRight: 8 },
  heatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  heatText: { fontSize: 11, fontWeight: '700', color: '#991B1B' },
  requestCardDesc: { fontSize: 12, color: COLORS.textMuted, marginBottom: 8, lineHeight: 18 },
  requestCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  categoryPill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  requestStatRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  requestStatText: { fontSize: 11, color: COLORS.textMuted },

  // Trust section
  trustCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  trustIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  trustText: { flex: 1 },
  trustTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textHeadline, marginBottom: 4 },
  trustDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  // How it works
  howItWorksWrap: { backgroundColor: '#4C1D95' },
  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  stepCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  stepNum: { fontSize: 10, fontWeight: '800', color: '#A78BFA', letterSpacing: 1, marginBottom: 4 },
  stepEmoji: { fontSize: 22, marginBottom: 8 },
  stepTitle: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  stepDesc: { fontSize: 11, color: '#DDD6FE', lineHeight: 16 },

  // CTA banner
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    ...shadow,
  },
  ctaTitle: { fontSize: 14, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  ctaSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 16 },
  ctaBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty
  emptyRequests: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, color: COLORS.textMuted },
});

