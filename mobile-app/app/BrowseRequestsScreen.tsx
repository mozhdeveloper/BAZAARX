/**
 * Buyer-facing browse/community requests (mobile) — BX-07-005, BX-07-013, BX-07-021.
 * Lists open product requests sorted by demand for buyers to browse + back.
 * Accepts optional initialSearch route param for pre-filled search from DiscoverScreen.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  RefreshControl, StatusBar, TextInput, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Search, Package, Coins, Users, Flame, Plus } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { productRequestService, type ProductRequestDTO } from '../src/services/productRequestService';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'BrowseRequests'>;

const FILTERS = [
  { key: '',                    label: 'All' },
  { key: 'new',                 label: 'New' },
  { key: 'under_review',        label: 'Reviewing' },
  { key: 'approved_for_sourcing', label: 'Sourcing' },
  { key: 'in_progress',         label: 'In Progress' },
  { key: 'approved',            label: 'Verified ✅' },
];

export default function BrowseRequestsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ProductRequestDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState(route.params?.initialSearch ?? '');
  const [status, setStatus] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const rows = await productRequestService.listBrowse({
      search: search.trim() || undefined,
      status: status || undefined,
      limit: 100,
    });
    setItems(rows);
    setLoading(false);
    setRefreshing(false);
  }, [search, status]);

  useEffect(() => { load(); }, [load]);

  // Debounce search input
  const handleSearchChange = (text: string) => {
    setSearch(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setLoading(true); }, 400);
  };

  const onRefresh = () => { setRefreshing(true); load(); };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={22} color={COLORS.textHeadline} />
        </Pressable>
        <Text style={styles.headerTitle}>Community Requests</Text>
        <Pressable
          style={[styles.backBtn, { backgroundColor: COLORS.primary }]}
          onPress={() => navigation.navigate('CreateProductRequest')}
          accessibilityLabel="Submit new request"
        >
          <Plus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <Search size={16} color="#9CA3AF" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products…"
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          onSubmitEditing={load}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key || 'all'}
            onPress={() => setStatus(f.key)}
            style={[styles.filterPill, status === f.key && styles.filterPillActive]}
          >
            <Text style={[styles.filterText, status === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Package size={42} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>No requests match</Text>
          <Text style={styles.emptySub}>Try a different filter or search term.</Text>
          <Pressable
            style={styles.emptyCreateBtn}
            onPress={() => navigation.navigate('CreateProductRequest')}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text style={styles.emptyCreateText}>Submit a Request</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {items.map((r) => {
            const heat = (r.votes || 0) + (r.demandCount || 0);
            return (
              <Pressable
                key={r.id}
                onPress={() => navigation.navigate('ProductRequestDetail', { requestId: r.id })}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{r.productName || r.title}</Text>
                  <View style={styles.heatBox}>
                    <Flame size={12} color="#DC2626" />
                    <Text style={styles.heatText}>{heat}</Text>
                  </View>
                </View>
                {!!r.description && <Text style={styles.cardDesc} numberOfLines={2}>{r.description}</Text>}
                <View style={styles.statsRow}>
                  <View style={styles.stat}>
                    <Users size={12} color="#6B7280" />
                    <Text style={styles.statText}>{r.demandCount} backers</Text>
                  </View>
                  <View style={styles.stat}>
                    <Coins size={12} color="#D97706" />
                    <Text style={styles.statText}>{r.stakedBazcoins.toLocaleString()} BC</Text>
                  </View>
                  {!!r.category && (
                    <View style={[styles.stat, styles.catPill]}>
                      <Text style={styles.catText}>{r.category}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: COLORS.textHeadline },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#111827', paddingVertical: 4 },
  filterRow: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999,
    backgroundColor: '#F3F4F6', marginRight: 8,
  },
  filterPillActive: { backgroundColor: COLORS.primary },
  filterText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  filterTextActive: { color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, paddingBottom: 32 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textHeadline, marginRight: 8 },
  heatBox: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
  },
  heatText: { fontSize: 11, fontWeight: '700', color: '#991B1B' },
  cardDesc: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11, color: '#6B7280' },
  catPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: '#F3F4F6' },
  catText: { fontSize: 10, color: '#6B7280', fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginTop: 12 },
  emptySub: { fontSize: 12, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginTop: 14,
  },
  emptyCreateText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
