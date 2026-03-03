import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCircle, Clock, XCircle, Package, AlertCircle, Truck, ShieldAlert, DollarSign } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import {
  returnService,
  MobileReturnRequest,
  getStatusLabel as svcStatusLabel,
  getStatusColor as svcStatusColor,
} from '../src/services/returnService';

type Props = NativeStackScreenProps<RootStackParamList, 'ReturnDetail'>;

const getStatusColor = (status: string) => svcStatusColor(status as any);

const getStatusLabel = (s: string | null | undefined) => {
  if (!s) return '—';
  return svcStatusLabel(s as any);
};

const formatReturnType = (t: string | null | undefined): string => {
  if (!t) return '—';
  const map: Record<string, string> = {
    return_refund: 'Return & Refund',
    refund_only: 'Refund Only',
    replacement: 'Replacement',
  };
  return map[t] || t;
};

const formatReturnReason = (r: string | null | undefined): string => {
  if (!r) return '—';
  const map: Record<string, string> = {
    damaged: 'Damaged',
    wrong_item: 'Wrong Item',
    not_as_described: 'Not as Described',
    defective: 'Defective',
    missing_parts: 'Missing Parts',
    changed_mind: 'Changed Mind',
    duplicate_order: 'Duplicate Order',
    other: 'Other',
  };
  return map[r] || r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const formatOrderStatus = (s: string | null | undefined): string => {
  if (!s) return '—';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'approved' || status === 'refunded') return <CheckCircle size={28} color={COLORS.success} />;
  if (status === 'rejected') return <XCircle size={28} color={COLORS.error} />;
  if (status === 'escalated') return <ShieldAlert size={28} color="#7C3AED" />;
  if (status === 'return_in_transit' || status === 'return_received') return <Truck size={28} color="#3B82F6" />;
  if (status === 'counter_offered') return <DollarSign size={28} color="#D97706" />;
  return <Clock size={28} color={COLORS.warning} />;
};

export default function ReturnDetailScreen({ route, navigation }: Props) {
  const { returnId } = route.params;
  const insets = useSafeAreaInsets();

  const [returnRequest, setReturnRequest] = useState<MobileReturnRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = () => {
    setLoading(true);
    returnService.getReturnRequestById(returnId)
      .then(data => {
        if (!data) setFetchError('Return request not found.');
        else setReturnRequest(data);
      })
      .catch(() => setFetchError('Failed to load return details. Please try again.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [returnId]);

  const handleAcceptCounter = async () => {
    if (!returnRequest) return;
    Alert.alert('Accept Counter-Offer', `Accept ₱${returnRequest.counterOfferAmount?.toLocaleString()} partial refund?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          setActionLoading(true);
          try {
            await returnService.acceptCounterOffer(returnRequest.id);
            loadData();
          } catch { Alert.alert('Error', 'Failed to accept counter-offer.'); }
          finally { setActionLoading(false); }
        },
      },
    ]);
  };

  const handleDeclineCounter = async () => {
    if (!returnRequest) return;
    Alert.alert('Decline & Escalate', 'Declining will escalate this to BAZAAR admin for review.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline & Escalate', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await returnService.declineCounterOffer(returnRequest.id);
            loadData();
          } catch { Alert.alert('Error', 'Failed to escalate.'); }
          finally { setActionLoading(false); }
        },
      },
    ]);
  };

  const handleEscalate = async () => {
    if (!returnRequest) return;
    Alert.alert('Escalate to Admin', 'This will escalate your case to BAZAAR admin for review.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Escalate', onPress: async () => {
          setActionLoading(true);
          try {
            await returnService.escalateReturn(returnRequest.id, 'Buyer escalated rejected return');
            loadData();
          } catch { Alert.alert('Error', 'Failed to escalate.'); }
          finally { setActionLoading(false); }
        },
      },
    ]);
  };

  const Header = () => (
    <LinearGradient
      colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
    >
      <View style={styles.headerTop}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
          <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Return Details</Text>
        <View style={{ width: 40 }} />
      </View>
    </LinearGradient>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  if (fetchError || !returnRequest) {
    return (
      <SafeAreaView style={styles.container}>
        <Header />
        <View style={styles.center}>
          <AlertCircle size={40} color={COLORS.error} />
          <Text style={styles.errorText}>{fetchError || 'Return request not found.'}</Text>
          <Pressable style={styles.retryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.retryText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = getStatusColor(returnRequest.status);
  const deadlineText = returnRequest.sellerDeadline
    ? returnService.formatDeadlineRemaining(returnRequest.sellerDeadline)
    : null;

  return (
    <SafeAreaView style={styles.container}>
      <Header />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Status Card */}
        <View style={styles.card}>
          <View style={styles.statusHeader}>
            <View style={styles.statusLeft}>
              <StatusIcon status={returnRequest.status} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.statusTitle}>Return Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {getStatusLabel(returnRequest.status)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Deadline countdown */}
          {deadlineText && returnRequest.status === 'seller_review' && (
            <View style={{ marginTop: 12, backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10 }}>
              <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
                Seller deadline: {deadlineText}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* Timeline */}
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={[styles.timelineDot, { backgroundColor: statusColor }]} />
                <View style={styles.timelineLine} />
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStatus}>Return Requested</Text>
                <Text style={styles.timelineDate}>
                  {new Date(returnRequest.createdAt).toLocaleString('en-PH', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                {returnRequest.resolutionPath && (
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                    Path: {returnRequest.resolutionPath.split('_').join(' ')}
                  </Text>
                )}
              </View>
            </View>

            {returnRequest.status !== 'pending' && returnRequest.status !== 'seller_review' && (
              <View style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, { backgroundColor: statusColor }]} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineStatus}>
                    {getStatusLabel(returnRequest.status)}
                  </Text>
                  {returnRequest.refundDate && (
                    <Text style={styles.timelineDate}>
                      {new Date(returnRequest.refundDate).toLocaleString('en-PH', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Order Info */}
        {returnRequest.orderNumber && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Order Info</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Order Number</Text>
              <Text style={styles.value}>#{returnRequest.orderNumber}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Order Status</Text>
              <Text style={styles.value}>{formatOrderStatus(returnRequest.orderStatus)}</Text>
            </View>
          </View>
        )}

        {/* Refund Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Refund Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Refund Amount</Text>
            <Text style={[styles.value, { color: COLORS.primary, fontWeight: '700' }]}>
              {returnRequest.refundAmount != null
                ? `₱${returnRequest.refundAmount.toLocaleString()}`
                : 'To be determined'}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Return Type</Text>
            <Text style={styles.value}>{formatReturnType(returnRequest.returnType)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Return Window</Text>
            <Text style={styles.value}>{returnRequest.returnWindowDays} days</Text>
          </View>
          {returnRequest.refundDate && (
            <View style={styles.row}>
              <Text style={styles.label}>Refund Date</Text>
              <Text style={styles.value}>
                {new Date(returnRequest.refundDate).toLocaleDateString('en-PH', {
                  month: 'long', day: 'numeric', year: 'numeric',
                })}
              </Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Reason</Text>
            <Text style={[styles.value, { flex: 1, textAlign: 'right' }]}>
              {formatReturnReason(returnRequest.returnReason)}
            </Text>
          </View>
          {returnRequest.description && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>Description</Text>
              <Text style={{ fontSize: 13, color: '#374151', marginTop: 4 }}>{returnRequest.description}</Text>
            </View>
          )}
        </View>

        {/* Evidence Photos */}
        {(returnRequest.evidenceUrls ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Evidence Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {returnRequest.evidenceUrls!.map((url, idx) => (
                <Image
                  key={idx}
                  source={{ uri: url }}
                  style={{ width: 90, height: 90, borderRadius: 12, marginRight: 10, backgroundColor: '#F3F4F6' }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Counter-Offer Card */}
        {returnRequest.status === 'counter_offered' && returnRequest.counterOfferAmount != null && (
          <View style={[styles.card, { borderColor: '#FDE68A', borderWidth: 1 }]}>
            <Text style={styles.sectionTitle}>Counter-Offer from Seller</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#D97706', marginBottom: 8 }}>
              ₱{returnRequest.counterOfferAmount.toLocaleString()}
            </Text>
            {returnRequest.sellerNote && (
              <Text style={{ fontSize: 13, color: '#4B5563', marginBottom: 12 }}>"{returnRequest.sellerNote}"</Text>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                style={[{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: COLORS.primary }, actionLoading && { opacity: 0.6 }]}
                onPress={handleAcceptCounter}
                disabled={actionLoading}
              >
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>Accept</Text>
              </Pressable>
              <Pressable
                style={[{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#DC2626' }, actionLoading && { opacity: 0.6 }]}
                onPress={handleDeclineCounter}
                disabled={actionLoading}
              >
                <Text style={{ color: '#DC2626', fontWeight: '700', fontSize: 14 }}>Decline & Escalate</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Return Shipping Info */}
        {(returnRequest.status === 'return_in_transit' || returnRequest.status === 'return_received') && (
          <View style={[styles.card, { borderColor: '#93C5FD', borderWidth: 1 }]}>
            <Text style={styles.sectionTitle}>Return Shipping</Text>
            {returnRequest.returnTrackingNumber && (
              <View style={styles.row}>
                <Text style={styles.label}>Tracking</Text>
                <Text style={[styles.value, { fontWeight: '700' }]}>{returnRequest.returnTrackingNumber}</Text>
              </View>
            )}
            {returnRequest.returnLabelUrl && (
              <Pressable style={{ marginTop: 8, backgroundColor: '#EFF6FF', padding: 10, borderRadius: 10 }}>
                <Text style={{ fontSize: 13, color: '#1E40AF', fontWeight: '600' }}>Download Return Label</Text>
              </Pressable>
            )}
            {returnRequest.buyerShippedAt && (
              <View style={[styles.row, { marginTop: 8 }]}>
                <Text style={styles.label}>Shipped At</Text>
                <Text style={styles.value}>{new Date(returnRequest.buyerShippedAt).toLocaleDateString('en-PH')}</Text>
              </View>
            )}
            {returnRequest.returnReceivedAt && (
              <View style={[styles.row, { marginTop: 4 }]}>
                <Text style={styles.label}>Received At</Text>
                <Text style={styles.value}>{new Date(returnRequest.returnReceivedAt).toLocaleDateString('en-PH')}</Text>
              </View>
            )}
          </View>
        )}

        {/* Items */}
        {(returnRequest.items ?? []).length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Items</Text>
            {(returnRequest.items ?? []).map((item: any, idx: number) => (
              <View
                key={idx}
                style={[
                  styles.itemRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginTop: 4 },
                ]}
              >
                <View style={styles.itemThumb}>
                  <Package size={22} color="#9CA3AF" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                  <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₱{item.price.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Status messages */}
        {(returnRequest.status === 'pending' || returnRequest.status === 'seller_review') && (
          <View style={[styles.card, { backgroundColor: '#FFFBF0', borderColor: '#FDE68A', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <Clock size={20} color="#D97706" />
              <Text style={{ fontSize: 13, color: '#92400E', flex: 1, lineHeight: 18 }}>
                Your return request is under seller review. They have 48 hours to respond. If no response, it will auto-escalate to admin.
              </Text>
            </View>
          </View>
        )}

        {(returnRequest.status === 'approved' || returnRequest.status === 'refunded') && (
          <View style={[styles.card, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <CheckCircle size={20} color={COLORS.success} />
              <Text style={{ fontSize: 13, color: '#065F46', flex: 1, lineHeight: 18 }}>
                Your refund has been approved and will be processed to your original payment method within 7 business days.
              </Text>
            </View>
          </View>
        )}

        {returnRequest.status === 'rejected' && (
          <View style={[styles.card, { backgroundColor: '#FFF1F2', borderColor: '#FECDD3', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <XCircle size={20} color={COLORS.error} />
              <Text style={{ fontSize: 13, color: '#9B1C1C', flex: 1, lineHeight: 18 }}>
                {returnRequest.rejectedReason
                  ? `Rejected: ${returnRequest.rejectedReason}`
                  : 'Your return request was rejected.'}
              </Text>
            </View>
            <Pressable
              style={{ marginTop: 12, backgroundColor: '#7C3AED', paddingVertical: 10, borderRadius: 10, alignItems: 'center' }}
              onPress={handleEscalate}
              disabled={actionLoading}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Escalate to Admin</Text>
            </Pressable>
          </View>
        )}

        {returnRequest.status === 'escalated' && (
          <View style={[styles.card, { backgroundColor: '#F5F3FF', borderColor: '#C4B5FD', borderWidth: 1 }]}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
              <ShieldAlert size={20} color="#7C3AED" />
              <Text style={{ fontSize: 13, color: '#5B21B6', flex: 1, lineHeight: 18 }}>
                This case has been escalated to BAZAAR admin. We'll contact you within 24 hours.
              </Text>
            </View>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerIconButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorText: { fontSize: 15, color: '#6B7280', textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: COLORS.primary, borderRadius: 12 },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFF', borderRadius: 16, padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  statusTitle: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
  statusText: { fontSize: 12, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  timeline: {},
  timelineItem: { flexDirection: 'row', marginBottom: 8 },
  timelineLeft: { alignItems: 'center', width: 20, marginRight: 12 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: 8 },
  timelineStatus: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  timelineDate: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 14, color: '#6B7280' },
  value: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemThumb: {
    width: 48, height: 48, borderRadius: 10,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },
  itemName: { fontSize: 14, color: '#1F2937', fontWeight: '500' },
  itemMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});

