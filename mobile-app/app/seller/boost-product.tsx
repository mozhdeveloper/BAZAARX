import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Megaphone,
  Rocket,
  Search,
  Star,
  TrendingUp,
  Sparkles,
  Eye,
  MousePointerClick,
  ShoppingCart,
  Clock,
  Pause,
  Play,
  X,
  Package,
  BarChart3,
  Check,
} from 'lucide-react-native';
import { useSellerStore } from '../../src/stores/sellerStore';
import {
  adBoostService,
  calculateBoostPrice,
  BOOST_TYPE_LABELS,
  BOOST_TYPE_DESCRIPTIONS,
  DURATION_OPTIONS,
  type BoostType,
  type BoostStatus,
  type AdBoostMobile,
} from '../../src/services/adBoostService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_COLORS: Record<BoostStatus, { bg: string; text: string }> = {
  draft: { bg: '#F3F4F6', text: '#6B7280' },
  active: { bg: '#DCFCE7', text: '#15803D' },
  paused: { bg: '#FEF3C7', text: '#A16207' },
  ended: { bg: '#DBEAFE', text: '#1D4ED8' },
  cancelled: { bg: '#FEE2E2', text: '#DC2626' },
};

const BOOST_TYPE_COLORS: Record<BoostType, string> = {
  featured: '#F97316',
  search_priority: '#3B82F6',
  homepage_banner: '#A855F7',
  category_spotlight: '#10B981',
};

export default function BoostProductScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SellerStackParamList>>();
  const insets = useSafeAreaInsets();
  const { seller } = useSellerStore();

  const [boosts, setBoosts] = useState<AdBoostMobile[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // Create modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedBoostType, setSelectedBoostType] = useState<BoostType>('featured');
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [productSearch, setProductSearch] = useState('');

  const priceEstimate = useMemo(
    () => calculateBoostPrice(selectedBoostType, selectedDuration),
    [selectedBoostType, selectedDuration],
  );

  const stats = useMemo(() => ({
    active: boosts.filter((b) => b.status === 'active').length,
    totalImpressions: boosts.reduce((s, b) => s + (b.impressions || 0), 0),
    totalClicks: boosts.reduce((s, b) => s + (b.clicks || 0), 0),
    totalOrders: boosts.reduce((s, b) => s + (b.orders_generated || 0), 0),
  }), [boosts]);

  const filteredBoosts = useMemo(() => {
    if (filter === 'all') return boosts;
    return boosts.filter((b) => b.status === filter);
  }, [boosts, filter]);

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p: any) => p.name?.toLowerCase().includes(q));
  }, [products, productSearch]);

  // Fetch
  const fetchData = async () => {
    if (!seller?.id) return;
    try {
      const [boostData, productsData] = await Promise.all([
        adBoostService.getSellerBoosts(seller.id),
        adBoostService.getBoostableProducts(seller.id),
      ]);
      setBoosts(boostData);
      setProducts(productsData);
    } catch (err) {
      console.error('Failed to load boost data:', err);
    }
  };

  useEffect(() => {
    if (seller?.id) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [seller?.id]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Actions
  const handleCreateBoost = async () => {
    if (!seller?.id || !selectedProduct) return;
    setCreating(true);
    try {
      const result = await adBoostService.createBoost({
        productId: selectedProduct.id,
        sellerId: seller.id,
        boostType: selectedBoostType,
        durationDays: selectedDuration,
      });
      if (result) {
        Alert.alert('Success', `${selectedProduct.name} is now being boosted!`);
        setIsCreateOpen(false);
        resetForm();
        fetchData();
      } else {
        Alert.alert('Error', 'Failed to create boost.');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    } finally {
      setCreating(false);
    }
  };

  const handlePause = async (id: string) => {
    if (!seller?.id) return;
    const ok = await adBoostService.pauseBoost(id, seller.id);
    if (ok) fetchData();
  };

  const handleResume = async (id: string) => {
    if (!seller?.id) return;
    const ok = await adBoostService.resumeBoost(id, seller.id);
    if (ok) fetchData();
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Boost', 'Are you sure you want to cancel this boost?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (!seller?.id) return;
          const ok = await adBoostService.cancelBoost(id, seller.id);
          if (ok) fetchData();
        },
      },
    ]);
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setSelectedBoostType('featured');
    setSelectedDuration(7);
    setProductSearch('');
  };

  const getProductImage = (product: any) => {
    if (!product?.images?.length) return null;
    const primary = product.images.find((img: any) => img.is_primary);
    return primary?.image_url || product.images[0]?.image_url || null;
  };

  const getTimeLeft = (endsAt: string) => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return 'Ended';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    if (d > 0) return `${d}d ${h}h left`;
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={22} color="#1a1a2e" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Boost Products</Text>
          <Text style={styles.headerSubtitle}>Advertise to reach more buyers</Text>
        </View>
        <TouchableOpacity
          onPress={() => setIsCreateOpen(true)}
          style={styles.createBtn}
        >
          <Rocket size={18} color="#FFF" />
          <Text style={styles.createBtnText}>Boost</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6A00" />}
        showsVerticalScrollIndicator={false}
      >
        {/* FREE Beta Banner */}
        <View style={styles.betaBanner}>
          <Sparkles size={20} color="#FFF" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.betaTitle}>🎉 FREE Beta Period!</Text>
            <Text style={styles.betaSubtitle}>All boosts are FREE. Prices shown are simulated.</Text>
          </View>
          <View style={styles.betaBadge}>
            <Text style={styles.betaBadgeText}>₱0.00</Text>
          </View>
        </View>

        {/* Stats */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
          {[
            { label: 'Active', value: stats.active, color: '#10B981' },
            { label: 'Impressions', value: stats.totalImpressions, color: '#3B82F6' },
            { label: 'Clicks', value: stats.totalClicks, color: '#F97316' },
            { label: 'Orders', value: stats.totalOrders, color: '#A855F7' },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {['all', 'active', 'paused', 'ended', 'cancelled'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, filter === s && styles.filterTabActive]}
              onPress={() => setFilter(s)}
            >
              <Text style={[styles.filterTabText, filter === s && styles.filterTabTextActive]}>
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Boost List */}
        {loading ? (
          <ActivityIndicator size="large" color="#FF6A00" style={{ marginTop: 40 }} />
        ) : filteredBoosts.length === 0 ? (
          <View style={styles.emptyState}>
            <Megaphone size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No boosts yet</Text>
            <Text style={styles.emptySubtitle}>Boost your products to increase visibility</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setIsCreateOpen(true)}>
              <Rocket size={16} color="#FFF" />
              <Text style={styles.emptyBtnText}>Create First Boost</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.boostList}>
            {filteredBoosts.map((boost) => {
              const img = getProductImage(boost.product);
              const ctr = boost.impressions > 0 ? ((boost.clicks / boost.impressions) * 100).toFixed(1) : '0.0';
              const statusColor = STATUS_COLORS[boost.status];
              return (
                <View key={boost.id} style={styles.boostCard}>
                  <View style={styles.boostCardRow}>
                    {img ? (
                      <Image source={{ uri: img }} style={styles.boostImg} />
                    ) : (
                      <View style={[styles.boostImg, styles.boostImgPlaceholder]}>
                        <Package size={24} color="#D1D5DB" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.boostProductName} numberOfLines={1}>
                        {boost.product?.name || 'Unknown'}
                      </Text>
                      <View style={styles.boostBadges}>
                        <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>
                            {boost.status.charAt(0).toUpperCase() + boost.status.slice(1)}
                          </Text>
                        </View>
                        <View style={[styles.typeBadge, { borderColor: BOOST_TYPE_COLORS[boost.boost_type] }]}>
                          <Text style={[styles.typeBadgeText, { color: BOOST_TYPE_COLORS[boost.boost_type] }]}>
                            {BOOST_TYPE_LABELS[boost.boost_type]}
                          </Text>
                        </View>
                      </View>
                      {/* Metrics */}
                      <View style={styles.metricsRow}>
                        <Text style={styles.metricText}>{boost.impressions || 0} views</Text>
                        <Text style={styles.metricText}>{boost.clicks || 0} clicks</Text>
                        <Text style={styles.metricText}>{ctr}% CTR</Text>
                      </View>
                    </View>
                  </View>
                  {/* Actions */}
                  <View style={styles.boostActions}>
                    {boost.status === 'active' && (
                      <>
                        <Text style={styles.timeLeftText}>
                          <Clock size={12} color="#F97316" /> {getTimeLeft(boost.ends_at)}
                        </Text>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => handlePause(boost.id)}>
                          <Pause size={16} color="#A16207" />
                        </TouchableOpacity>
                      </>
                    )}
                    {boost.status === 'paused' && (
                      <TouchableOpacity style={styles.actionBtn} onPress={() => handleResume(boost.id)}>
                        <Play size={16} color="#15803D" />
                      </TouchableOpacity>
                    )}
                    {(boost.status === 'active' || boost.status === 'paused') && (
                      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FCA5A5' }]} onPress={() => handleCancel(boost.id)}>
                        <X size={16} color="#DC2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ─── Create Boost Modal ──────────────────────────────────────────────── */}
      <Modal visible={isCreateOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { paddingTop: insets.top + 10 }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setIsCreateOpen(false); resetForm(); }}>
              <X size={22} color="#1a1a2e" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Boost</Text>
            <View style={{ width: 22 }} />
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Step 1: Select Product */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>① Select Product</Text>
              {selectedProduct ? (
                <View style={styles.selectedProductCard}>
                  {getProductImage(selectedProduct) ? (
                    <Image source={{ uri: getProductImage(selectedProduct)! }} style={styles.selectedProductImg} />
                  ) : (
                    <View style={[styles.selectedProductImg, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                      <Package size={20} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedProductName} numberOfLines={1}>{selectedProduct.name}</Text>
                    <Text style={styles.selectedProductPrice}>₱{selectedProduct.price?.toFixed(2)}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedProduct(null)}>
                    <X size={18} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.searchInputContainer}>
                    <Search size={16} color="#9CA3AF" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search products..."
                      value={productSearch}
                      onChangeText={setProductSearch}
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={styles.productList}>
                    {filteredProducts.slice(0, 8).map((product: any) => (
                      <TouchableOpacity
                        key={product.id}
                        style={styles.productItem}
                        onPress={() => setSelectedProduct(product)}
                      >
                        {getProductImage(product) ? (
                          <Image source={{ uri: getProductImage(product)! }} style={styles.productItemImg} />
                        ) : (
                          <View style={[styles.productItemImg, { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' }]}>
                            <Package size={16} color="#D1D5DB" />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.productItemName} numberOfLines={1}>{product.name}</Text>
                          <Text style={styles.productItemPrice}>₱{product.price?.toFixed(2)}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                    {filteredProducts.length === 0 && (
                      <Text style={styles.noProductsText}>No approved products found</Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Step 2: Boost Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>② Boost Type</Text>
              <View style={styles.boostTypeGrid}>
                {(Object.keys(BOOST_TYPE_LABELS) as BoostType[]).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.boostTypeCard,
                      selectedBoostType === type && { borderColor: '#FF6A00', borderWidth: 2, backgroundColor: '#FFF7ED' },
                    ]}
                    onPress={() => setSelectedBoostType(type)}
                  >
                    {selectedBoostType === type && (
                      <View style={styles.boostTypeCheck}>
                        <Check size={12} color="#FFF" />
                      </View>
                    )}
                    <View style={[styles.boostTypeIcon, { backgroundColor: BOOST_TYPE_COLORS[type] }]}>
                      {type === 'featured' && <Star size={18} color="#FFF" />}
                      {type === 'search_priority' && <TrendingUp size={18} color="#FFF" />}
                      {type === 'homepage_banner' && <Megaphone size={18} color="#FFF" />}
                      {type === 'category_spotlight' && <Sparkles size={18} color="#FFF" />}
                    </View>
                    <Text style={styles.boostTypeName}>{BOOST_TYPE_LABELS[type]}</Text>
                    <Text style={styles.boostTypeDesc} numberOfLines={2}>
                      {BOOST_TYPE_DESCRIPTIONS[type]}
                    </Text>
                    <View style={styles.boostTypePriceRow}>
                      <Text style={styles.boostTypePriceCross}>
                        ₱{calculateBoostPrice(type, selectedDuration).costPerDay.toFixed(0)}/day
                      </Text>
                      <View style={styles.freeBadgeMini}>
                        <Text style={styles.freeBadgeMiniText}>FREE</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Step 3: Duration */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>③ Duration</Text>
              <View style={styles.durationRow}>
                {DURATION_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.days}
                    style={[
                      styles.durationCard,
                      selectedDuration === opt.days && { borderColor: '#FF6A00', borderWidth: 2, backgroundColor: '#FFF7ED' },
                    ]}
                    onPress={() => setSelectedDuration(opt.days)}
                  >
                    <Text style={styles.durationValue}>{opt.days}</Text>
                    <Text style={styles.durationLabel}>days</Text>
                    {opt.discount > 0 && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountBadgeText}>-{opt.discount}%</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Summary */}
            <View style={styles.priceSummary}>
              <Text style={styles.priceSummaryTitle}>Price Summary</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Boost Type</Text>
                <Text style={styles.priceValue}>{BOOST_TYPE_LABELS[selectedBoostType]}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Duration</Text>
                <Text style={styles.priceValue}>{selectedDuration} days</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Rate / Day</Text>
                <Text style={[styles.priceValue, { textDecorationLine: 'line-through', color: '#9CA3AF' }]}>
                  ₱{priceEstimate.costPerDay.toFixed(2)}
                </Text>
              </View>
              {priceEstimate.discountPercent > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: '#15803D' }]}>Duration Discount</Text>
                  <Text style={[styles.priceValue, { color: '#15803D' }]}>-{priceEstimate.discountPercent}%</Text>
                </View>
              )}
              <View style={[styles.priceRow, { borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10, marginTop: 4 }]}>
                <Text style={[styles.priceLabel, { fontWeight: '700' }]}>Total</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16, textDecorationLine: 'line-through', color: '#9CA3AF' }}>
                    ₱{priceEstimate.totalCost.toFixed(2)}
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#15803D' }}>₱0.00</Text>
                </View>
              </View>
              <View style={styles.freeNote}>
                <Sparkles size={14} color="#15803D" />
                <Text style={styles.freeNoteText}>Free during beta — no charges</Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>

          {/* Bottom CTA */}
          <View style={[styles.modalFooter, { paddingBottom: insets.bottom + 10 }]}>
            <TouchableOpacity
              style={[styles.activateBtn, (!selectedProduct || creating) && { opacity: 0.5 }]}
              disabled={!selectedProduct || creating}
              onPress={handleCreateBoost}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Rocket size={18} color="#FFF" />
              )}
              <Text style={styles.activateBtnText}>{creating ? 'Activating...' : 'Activate Boost'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  headerSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 1 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FF6A00', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  createBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  scrollView: { flex: 1 },

  // Beta Banner
  betaBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FF6A00', marginHorizontal: 16, marginTop: 16, borderRadius: 12, padding: 14 },
  betaTitle: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  betaSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  betaBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  betaBadgeText: { color: '#FFF', fontWeight: '700', fontSize: 12 },

  // Stats
  statsRow: { marginTop: 16, marginBottom: 12 },
  statCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, width: (SCREEN_WIDTH - 62) / 4, minWidth: 80, borderTopWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 10, color: '#6B7280', marginTop: 2 },

  // Filters
  filterRow: { marginBottom: 12 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  filterTabActive: { backgroundColor: '#FF6A00', borderColor: '#FF6A00' },
  filterTabText: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  filterTabTextActive: { color: '#FFF' },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF6A00', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 20 },
  emptyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Boost List
  boostList: { paddingHorizontal: 16, gap: 10 },
  boostCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  boostCardRow: { flexDirection: 'row', gap: 12 },
  boostImg: { width: 56, height: 56, borderRadius: 10 },
  boostImgPlaceholder: { backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  boostProductName: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  boostBadges: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  typeBadgeText: { fontSize: 10, fontWeight: '600' },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  metricText: { fontSize: 11, color: '#6B7280' },
  boostActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  timeLeftText: { flex: 1, fontSize: 12, color: '#F97316', fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },

  // Product Selector
  selectedProductCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FFF7ED', borderRadius: 12, borderWidth: 1, borderColor: '#FED7AA' },
  selectedProductImg: { width: 44, height: 44, borderRadius: 8 },
  selectedProductName: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  selectedProductPrice: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#1a1a2e' },
  productList: { marginTop: 8, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden' },
  productItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  productItemImg: { width: 36, height: 36, borderRadius: 6 },
  productItemName: { fontSize: 13, fontWeight: '500', color: '#1a1a2e' },
  productItemPrice: { fontSize: 11, color: '#6B7280', marginTop: 1 },
  noProductsText: { padding: 16, textAlign: 'center', fontSize: 13, color: '#9CA3AF' },

  // Boost Type
  boostTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  boostTypeCard: { width: (SCREEN_WIDTH - 42) / 2, backgroundColor: '#FFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  boostTypeCheck: { position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#FF6A00', alignItems: 'center', justifyContent: 'center' },
  boostTypeIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  boostTypeName: { fontSize: 12, fontWeight: '700', color: '#1a1a2e' },
  boostTypeDesc: { fontSize: 10, color: '#6B7280', marginTop: 2, lineHeight: 14 },
  boostTypePriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  boostTypePriceCross: { fontSize: 10, color: '#9CA3AF', textDecorationLine: 'line-through' },
  freeBadgeMini: { backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  freeBadgeMiniText: { fontSize: 9, fontWeight: '700', color: '#15803D' },

  // Duration
  durationRow: { flexDirection: 'row', gap: 10 },
  durationCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  durationValue: { fontSize: 20, fontWeight: '900', color: '#1a1a2e' },
  durationLabel: { fontSize: 11, color: '#6B7280' },
  discountBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  discountBadgeText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },

  // Price Summary
  priceSummary: { marginHorizontal: 16, marginTop: 20, backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  priceSummaryTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 10 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  priceLabel: { fontSize: 13, color: '#6B7280' },
  priceValue: { fontSize: 13, fontWeight: '600', color: '#1a1a2e' },
  freeNote: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', borderRadius: 8, padding: 8, marginTop: 8 },
  freeNoteText: { fontSize: 11, color: '#15803D', fontWeight: '500' },

  // Footer
  modalFooter: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  activateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF6A00', paddingVertical: 14, borderRadius: 12 },
  activateBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
});
