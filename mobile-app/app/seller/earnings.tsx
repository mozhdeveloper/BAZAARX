// EARNINGS PAGE - Matches web exactly with same data and functionality
import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet, DollarSign, TrendingUp, Calendar, Clock, Download, CheckCircle, AlertCircle, RotateCcw } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/sellerStore';

interface EarningsSummary {
  totalEarnings: number;
  pendingPayout: number;
  availableBalance: number;
  pendingRefunds: number;
  totalOrders: number;
  earningsGrowthPercent: number;
}

interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  status: string;
  method: string;
  reference: string;
}

export default function EarningsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { seller } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<EarningsSummary>({
    totalEarnings: 0, pendingPayout: 0, availableBalance: 0, pendingRefunds: 0,
    totalOrders: 0, earningsGrowthPercent: 0
  });
  const [payoutHistory, setPayoutHistory] = useState<PayoutRecord[]>([]);

  const fetchEarningsData = async () => {
    if (!seller?.id) return;
    
    try {
      // 1. Fetch Order Items for Total Earnings & Pending Payouts
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          price, price_discount, quantity, created_at,
          product:products!inner(seller_id),
          order:orders!inner(id, payment_status, shipment_status, created_at)
        `)
        .eq('product.seller_id', seller.id);

      if (itemsError) throw itemsError;

      // 2. Fetch Active Return Requests for Pending Refunds
      const { data: returnRequests, error: returnsError } = await supabase
        .from('refund_return_periods')
        .select(`
          refund_amount, status,
          order:orders!inner(id, order_items!inner(product:products!inner(seller_id)))
        `)
        .eq('order.order_items.product.seller_id', seller.id)
        .in('status', ['pending', 'seller_review', 'counter_offered', 'return_in_transit', 'return_received']);

      if (returnsError) throw returnsError;

      // Calculate totals
      let totalEarnings = 0;
      let pendingPayout = 0;
      let refundedAmount = 0;
      const uniqueOrders = new Set();

      (orderItems || []).forEach((item: any) => {
        const lineTotal = (item.price - (item.price_discount || 0)) * item.quantity;
        const order = item.order;
        uniqueOrders.add(order.id);

        if (order.payment_status === 'paid') {
          totalEarnings += lineTotal;
          if (['delivered', 'received'].includes(order.shipment_status)) {
            pendingPayout += lineTotal;
          }
        } else if (order.payment_status === 'refunded') {
          refundedAmount += lineTotal;
        }
      });

      const pendingRefunds = (returnRequests || []).reduce((sum, req) => sum + (req.refund_amount || 0), 0);

      setSummary({
        totalEarnings,
        pendingPayout,
        pendingRefunds,
        availableBalance: totalEarnings - refundedAmount - pendingRefunds,
        totalOrders: uniqueOrders.size,
        earningsGrowthPercent: 0 // Placeholder
      });

      // 3. Payout History (Mocked for now as per web pattern)
      const weeklyPayouts: PayoutRecord[] = [];
      // (Implementation matching web service could go here)
      setPayoutHistory([]);

    } catch (err) {
      console.error('Failed to fetch earnings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, [seller?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D97706" />
      </View>
    );
  }

  const lastPayout = payoutHistory.find(p => p.status === 'completed');

  return (
    <View style={styles.container}>
      <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
                <ArrowLeft size={24} color="#1F2937" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Earnings Dashboard</Text>
            <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Earnings Cards */}
        <View style={styles.cardsGrid}>
          <View style={styles.totalCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconOrange}><DollarSign size={24} color="#FFF" strokeWidth={2} /></View>
              <View style={styles.growthBadge}><TrendingUp size={14} color="#FFF" /><Text style={styles.growthText}>+{summary.earningsGrowthPercent}%</Text></View>
            </View>
            <Text style={styles.cardLabel}>Total Earnings</Text>
            <Text style={styles.cardValueWhite}>₱{summary.totalEarnings.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtext}>Lifetime earnings from sales</Text>
          </View>

          <View style={styles.availableCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconGreen}><Wallet size={24} color="#10B981" strokeWidth={2} /></View>
              <CheckCircle size={20} color="#10B981" />
            </View>
            <Text style={styles.cardLabelGray}>Available Balance</Text>
            <Text style={styles.cardValueDark}>₱{summary.availableBalance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtextGray}>Ready for payout (minus pending refunds)</Text>
          </View>

          <View style={styles.pendingCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconYellow}><Clock size={24} color="#F59E0B" strokeWidth={2} /></View>
              <AlertCircle size={20} color="#F59E0B" />
            </View>
            <Text style={styles.cardLabelGray}>Pending Payout</Text>
            <Text style={styles.cardValueDark}>₱{summary.pendingPayout.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtextGray}>Processing orders</Text>
          </View>

          {/* Pending Refunds Card */}
          <View style={[styles.pendingCard, { borderColor: '#F87171', backgroundColor: '#FEF2F2' }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconYellow, { backgroundColor: '#FEE2E2' }]}><RotateCcw size={24} color="#EF4444" strokeWidth={2} /></View>
              <AlertCircle size={20} color="#EF4444" />
            </View>
            <Text style={styles.cardLabelGray}>Pending Refunds</Text>
            <Text style={styles.cardValueDark}>₱{summary.pendingRefunds.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.cardSubtextGray}>Requests under review</Text>
          </View>

          {/* Last Payout Card */}
          {lastPayout && (
            <View style={[styles.availableCard, { borderLeftColor: '#3B82F6', borderLeftWidth: 3 }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIconGreen, { backgroundColor: '#EFF6FF' }]}><Calendar size={24} color="#3B82F6" strokeWidth={2} /></View>
                <CheckCircle size={20} color="#3B82F6" />
              </View>
              <Text style={styles.cardLabelGray}>Last Payout</Text>
              <Text style={styles.cardValueDark}>₱{lastPayout.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
              <Text style={styles.cardSubtextGray}>{new Date(lastPayout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
            </View>
          )}
        </View>

        {/* Payout Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View><Text style={styles.sectionTitle}>Payout Schedule</Text><Text style={styles.sectionSubtitle}>Automatic payouts every Friday</Text></View>
            <View style={styles.nextPayoutBadge}><Calendar size={14} color="#10B981" /><Text style={styles.nextPayoutText}>Friday, Jan 26</Text></View>
          </View>
          <View style={styles.scheduleGrid}>
            <View style={styles.scheduleCard}><View style={styles.scheduleIcon}><Calendar size={20} color="#3B82F6" /></View><Text style={styles.scheduleLabel}>Payout Frequency</Text><Text style={styles.scheduleValue}>Weekly</Text><Text style={styles.scheduleSubtext}>Every Friday at 5:00 PM PHT</Text></View>
            <View style={styles.scheduleCard}><View style={styles.scheduleIcon}><Clock size={20} color="#8B5CF6" /></View><Text style={styles.scheduleLabel}>Processing Time</Text><Text style={styles.scheduleValue}>1-3 Business Days</Text><Text style={styles.scheduleSubtext}>Funds arrive in your account</Text></View>
            <View style={styles.scheduleCard}><View style={styles.scheduleIcon}><DollarSign size={20} color="#D97706" /></View><Text style={styles.scheduleLabel}>Minimum Payout</Text><Text style={styles.scheduleValue}>₱500.00</Text><Text style={styles.scheduleSubtext}>Required minimum balance</Text></View>
          </View>
        </View>

        {/* Bank Account */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Bank Account</Text><TouchableOpacity style={styles.updateButton}><Text style={styles.updateButtonText}>Update Account</Text></TouchableOpacity></View>
          <View style={styles.bankCard}>
            <View style={styles.bankRow}><Text style={styles.bankLabel}>Account Name</Text><Text style={styles.bankValue}>My Awesome Store</Text></View>
            <View style={styles.bankRow}><Text style={styles.bankLabel}>Bank Name</Text><Text style={styles.bankValue}>BDO Unibank</Text></View>
            <View style={styles.bankRow}><Text style={styles.bankLabel}>Account Number</Text><Text style={[styles.bankValue, styles.monoText]}>****7890</Text></View>
          </View>
        </View>

        {/* Payout History */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Payout History</Text><TouchableOpacity style={styles.downloadButton}><Download size={16} color="#6B7280" /><Text style={styles.downloadText}>Download Report</Text></TouchableOpacity></View>
          {payoutHistory.map(payout => (<View key={payout.id} style={styles.payoutRow}><View style={styles.payoutInfo}><Text style={styles.payoutDate}>{new Date(payout.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</Text><Text style={styles.payoutReference}>{payout.reference}</Text></View><View style={styles.payoutRight}><Text style={styles.payoutAmount}>₱{payout.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text><View style={styles.completedBadge}><CheckCircle size={12} color="#10B981" /><Text style={styles.completedText}>Completed</Text></View></View></View>))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF4EC',
  },
  headerContainer: {
    backgroundColor: '#FFF4EC',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: { 
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: 10,
    borderRadius: 12,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  scrollView: {
    flex: 1,
  },
  cardsGrid: {
    padding: 16,
    gap: 12,
  },
  totalCard: {
    backgroundColor: '#D97706',
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  availableCard: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A7F3D0',
    padding: 20,
    borderRadius: 12,
  },
  pendingCard: {
    backgroundColor: '#FEF3C7',
    borderWidth: 2,
    borderColor: '#FDE68A',
    padding: 20,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconOrange: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconGreen: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardIconYellow: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  growthText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFF',
  },
  cardLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  cardLabelGray: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  cardValueWhite: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
  },
  cardValueDark: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
  },
  cardSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 6,
  },
  cardSubtextGray: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  lastSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  nextPayoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nextPayoutText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#10B981',
  },
  scheduleGrid: {
    gap: 12,
  },
  scheduleCard: {
    backgroundColor: '#FFF4EC',
    padding: 12,
    borderRadius: 8,
  },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  scheduleValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  scheduleSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  updateButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  updateButtonText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  bankCard: {
    backgroundColor: '#FFF4EC',
    borderRadius: 8,
    padding: 12,
    gap: 10,
  },
  bankRow: {
    paddingVertical: 4,
  },
  bankLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  bankValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  monoText: {
    fontFamily: 'monospace',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  downloadText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  payoutInfo: {
    flex: 1,
  },
  payoutDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  payoutReference: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  payoutRight: {
    alignItems: 'flex-end',
  },
  payoutAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '500',
  },
});