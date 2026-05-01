/**
 * Seller-facing demand board (mobile).
 * Suppliers see approved-for-sourcing requests + submit offers.
 */
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator,
  RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Coins, Users, TrendingUp, Package, X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useAuthStore } from '../src/stores/authStore';
import {
  productRequestService,
  supplierOfferService,
  type ProductRequestDTO,
  type SupplierOfferDTO,
} from '../src/services/productRequestService';
import { COLORS } from '../src/constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'SellerDemand'>;

export default function SellerDemandScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const [requests, setRequests] = useState<ProductRequestDTO[]>([]);
  const [myOffers, setMyOffers] = useState<SupplierOfferDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<ProductRequestDTO | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [price, setPrice] = useState('');
  const [moq, setMoq] = useState('1');
  const [leadDays, setLeadDays] = useState('7');
  const [terms, setTerms] = useState('');
  const [quality, setQuality] = useState('');

  const load = useCallback(async () => {
    const [reqs, offers] = await Promise.all([
      productRequestService.getEligibleForSuppliers(),
      user?.id ? supplierOfferService.listForSupplier(user.id) : Promise.resolve([]),
    ]);
    setRequests(reqs);
    setMyOffers(offers);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const offerFor = (rid: string) => myOffers.find((o) => o.requestId === rid);

  const submit = async () => {
    if (!user?.id || !selected) return;
    if (!price || Number(price) <= 0) { Alert.alert('Enter a valid price'); return; }
    setSubmitting(true);
    try {
      await supplierOfferService.submit({
        requestId: selected.id,
        supplierId: user.id,
        price: Number(price),
        moq: Math.max(1, Number(moq) || 1),
        leadTimeDays: Math.max(0, Number(leadDays) || 0),
        terms: terms || undefined,
        qualityNotes: quality || undefined,
      });
      Alert.alert('Offer submitted', 'BazaarX will review your offer.');
      setSelected(null); setPrice(''); setMoq('1'); setLeadDays('7'); setTerms(''); setQuality('');
      load();
    } catch (e: any) {
      Alert.alert('Failed', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={styles.backBtn}>
          <ChevronLeft size={24} color="#111" />
        </Pressable>
        <Text style={styles.headerTitle}>Sourcing Demand Board</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS?.primary || '#7c3aed'} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        >
          <Text style={styles.subtitle}>
            High-demand product requests approved for sourcing. Submit offers to win these orders.
          </Text>

          {requests.length === 0 ? (
            <View style={styles.emptyBox}>
              <Package size={36} color="#9ca3af" />
              <Text style={styles.emptyText}>No active sourcing requests right now.</Text>
            </View>
          ) : (
            requests.map((r) => {
              const existing = offerFor(r.id);
              return (
                <View key={r.id} style={styles.card}>
                  <Pressable onPress={() => navigation.navigate('ProductRequestDetail', { requestId: r.id })}>
                    <Text style={styles.cardTitle}>{r.title}</Text>
                    {r.summary ? <Text style={styles.cardSummary} numberOfLines={2}>{r.summary}</Text> : null}
                    {r.category ? <Text style={styles.category}>{r.category}</Text> : null}
                  </Pressable>

                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Users size={14} color="#6b7280" />
                      <Text style={styles.statValue}>{r.demandCount}</Text>
                      <Text style={styles.statLabel}>Backers</Text>
                    </View>
                    <View style={[styles.stat, { backgroundColor: '#FFFBEB' }]}>
                      <Coins size={14} color="#b45309" />
                      <Text style={[styles.statValue, { color: '#b45309' }]}>{r.stakedBazcoins.toLocaleString()}</Text>
                      <Text style={[styles.statLabel, { color: '#b45309' }]}>Staked</Text>
                    </View>
                    <View style={[styles.stat, { backgroundColor: '#EFF6FF' }]}>
                      <TrendingUp size={14} color="#1d4ed8" />
                      <Text style={[styles.statValue, { color: '#1d4ed8', textTransform: 'capitalize' }]}>
                        {(r.sourcingStage || 'quoting').replace(/_/g, ' ')}
                      </Text>
                      <Text style={[styles.statLabel, { color: '#1d4ed8' }]}>Stage</Text>
                    </View>
                  </View>

                  {existing ? (
                    <View style={[styles.btnPrimary, { backgroundColor: '#dcfce7' }]}>
                      <Text style={[styles.btnPrimaryText, { color: '#166534' }]}>Offer {existing.status}</Text>
                    </View>
                  ) : (
                    <Pressable style={styles.btnPrimary} onPress={() => setSelected(r)}>
                      <Text style={styles.btnPrimaryText}>Submit Offer</Text>
                    </Pressable>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Submit offer</Text>
                <Pressable onPress={() => setSelected(null)} hitSlop={10}>
                  <X size={20} color="#6b7280" />
                </Pressable>
              </View>
              <Text style={styles.modalSubtitle}>{selected?.title}</Text>

              <Text style={styles.label}>Unit Price (₱)</Text>
              <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 250" />

              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>MOQ</Text>
                  <TextInput style={styles.input} value={moq} onChangeText={setMoq} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Lead time (days)</Text>
                  <TextInput style={styles.input} value={leadDays} onChangeText={setLeadDays} keyboardType="numeric" />
                </View>
              </View>

              <Text style={styles.label}>Terms (optional)</Text>
              <TextInput style={[styles.input, { height: 60 }]} value={terms} onChangeText={setTerms} multiline />

              <Text style={styles.label}>Quality notes (optional)</Text>
              <TextInput style={[styles.input, { height: 60 }]} value={quality} onChangeText={setQuality} multiline />

              <Pressable style={[styles.btnPrimary, { marginTop: 12 }]} onPress={submit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Submit</Text>}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { alignItems: 'center', padding: 32, backgroundColor: '#fff', borderRadius: 12 },
  emptyText: { color: '#6b7280', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 4 },
  cardSummary: { fontSize: 13, color: '#4b5563', marginBottom: 6 },
  category: { fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  stat: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 8, alignItems: 'center' },
  statValue: { fontSize: 13, fontWeight: '700', color: '#111', marginTop: 2 },
  statLabel: { fontSize: 9, color: '#6b7280', textTransform: 'uppercase', marginTop: 1 },
  btnPrimary: { backgroundColor: '#f59e0b', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  modalSubtitle: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 8, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: '#111' },
});
