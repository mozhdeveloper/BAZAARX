import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  MessageCircle, 
  DollarSign, 
  Package, 
  Truck,
  ExternalLink,
  Clock,
} from 'lucide-react-native';
import { COLORS } from '../../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SellerStackParamList } from './SellerStack';
import { useReturnStore } from '../../src/stores/returnStore';
import { safeImageUri } from '../../src/utils/imageUtils';
import { getStatusLabel, getStatusColor } from '../../src/services/returnService';

type Props = NativeStackScreenProps<SellerStackParamList, 'ReturnDetail'>;

// ─── Brand tokens ──────────────────────────────────────────────────────────
const BRAND = '#D97706';
const BRAND_LIGHT = '#FFF4EC';
const BG = '#FFF4EC';
const HEADLINE = '#1F2937';
const BODY = '#4B5563';
const MUTED = '#9CA3AF';
const BORDER = '#E8DDD1';
const CARD_BG = '#FFFFFF';
const HEADER_BG = '#FFE5D9';

export default function SellerReturnDetailScreen({ route, navigation }: Props) {
  const { returnId } = route.params;
  const insets = useSafeAreaInsets();
  
  const returnRequest = useReturnStore((state) => state.getSellerReturnById(returnId));
  const { 
    approveReturn, 
    rejectReturn, 
    counterOfferReturn, 
    requestItemBack, 
    confirmReturnReceived,
    isLoading 
  } = useReturnStore();

  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterNote, setCounterNote] = useState('');

  // ─── Not Found State ─────────────────────────────────────────────────────
  if (!returnRequest) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <ArrowLeft size={24} color={HEADLINE} />
            </Pressable>
            <Text style={styles.headerTitle}>Return Request</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>
        <View style={styles.center}>
          <Text style={{ color: MUTED, fontSize: 15 }}>Return request not found.</Text>
        </View>
      </View>
    );
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleApprove = () => {
    Alert.alert(
      'Approve Request',
      'This will process the refund immediately. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await approveReturn(returnRequest.id);
              Alert.alert('Success', 'Return approved and refund processed.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve return.');
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection.');
      return;
    }
    try {
      await rejectReturn(returnRequest.id, rejectReason);
      setRejectModalVisible(false);
      Alert.alert('Success', 'Return request rejected.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reject return.');
    }
  };

  const handleCounterOffer = async () => {
    const amount = parseFloat(counterAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }
    if (!counterNote.trim()) {
      Alert.alert('Error', 'Please provide a note for your offer.');
      return;
    }
    try {
      await counterOfferReturn(returnRequest.id, amount, counterNote);
      setCounterModalVisible(false);
      Alert.alert('Success', 'Counter offer sent to buyer.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send counter offer.');
    }
  };

  const handleRequestItemBack = () => {
    Alert.alert(
      'Request Item Back',
      'Ask the buyer to ship the item back for inspection before refunding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            try {
              await requestItemBack(returnRequest.id);
              Alert.alert('Success', 'Buyer notified to ship the item back.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to request item back.');
            }
          },
        },
      ]
    );
  };

  const handleConfirmReceived = () => {
    Alert.alert(
      'Confirm Received',
      'Confirm you have received the item and are ready to release the refund?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await confirmReturnReceived(returnRequest.id);
              Alert.alert('Success', 'Refund processed.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to confirm received.');
            }
          },
        },
      ]
    );
  };

  const statusColor = getStatusColor(returnRequest.status);
  const items = returnRequest.itemsJson || returnRequest.items || [];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ─── Header (matching OrderDetailScreen) ─────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={24} color={HEADLINE} />
          </Pressable>
          <Text style={styles.headerTitle}>Return Details</Text>
          {isLoading ? <ActivityIndicator size="small" color={BRAND} /> : <View style={{ width: 40 }} />}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 180 }} showsVerticalScrollIndicator={false}>
        {/* ─── Status Card ──────────────────────────────────────────────── */}
        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: statusColor }]}>
          <View style={styles.row}>
            <Text style={styles.statusLabel}>STATUS</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(returnRequest.status).toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.returnIdText}>Request ID: {returnRequest.id}</Text>
          <Text style={styles.orderIdText}>Order: {returnRequest.orderNumber || returnRequest.orderId}</Text>
          
          {returnRequest.sellerDeadline && (
            <View style={styles.deadlineRow}>
              <Clock size={14} color="#EF4444" />
              <Text style={styles.deadlineText}>
                Deadline: {new Date(returnRequest.sellerDeadline).toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        {/* ─── Buyer Info ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Buyer Information</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>NAME</Text>
              <Text style={styles.infoValue}>{returnRequest.buyerName || 'N/A'}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>EMAIL</Text>
              <Text style={styles.infoValue}>{returnRequest.buyerEmail || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* ─── Request Details ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Request Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reason</Text>
            <Text style={styles.detailValue}>{returnRequest.returnReason || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Resolution Path</Text>
            <Text style={styles.detailValue}>{returnRequest.resolutionPath?.replace('_', ' ').toUpperCase() || 'STANDARD'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Refund Type</Text>
            <Text style={styles.detailValue}>{returnRequest.returnType?.replace('_', ' ').toUpperCase() || 'REFUND ONLY'}</Text>
          </View>
          <View style={[styles.detailRow, styles.totalRowLine]}>
            <Text style={styles.totalLabel}>Amount Requested</Text>
            <Text style={styles.totalValue}>₱{(returnRequest.refundAmount || 0).toLocaleString()}</Text>
          </View>
        </View>

        {/* ─── Note & Evidence ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Buyer's Note & Evidence</Text>
          <Text style={styles.descriptionText}>{returnRequest.description || 'No additional description provided.'}</Text>
          
          {returnRequest.evidenceUrls && returnRequest.evidenceUrls.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {returnRequest.evidenceUrls.map((url, index) => (
                <Pressable key={index} onPress={() => Linking.openURL(url)}>
                  <Image source={{ uri: url }} style={styles.proofImage} contentFit="cover" />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ─── Items ────────────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Items in this Return</Text>
          {items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Image source={{ uri: safeImageUri(item.image) }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>{item.productName}</Text>
                <View style={styles.itemMetaRow}>
                  <Text style={styles.itemMeta}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemMeta}> • </Text>
                  <Text style={styles.itemMeta}>₱{(item.price || 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ─── Shipping Info (if return in transit) ─────────────────────── */}
        {(returnRequest.status === 'return_in_transit' || returnRequest.returnTrackingNumber) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Return Shipping</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tracking #</Text>
              <Text style={styles.detailValue}>{returnRequest.returnTrackingNumber || 'Pending'}</Text>
            </View>
            {returnRequest.returnLabelUrl && (
              <Pressable style={styles.labelLink} onPress={() => Linking.openURL(returnRequest.returnLabelUrl!)}>
                <ExternalLink size={16} color="#3B82F6" />
                <Text style={styles.labelText}>View Return Label</Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* ─── Action Footer ──────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Pending / Seller Review State */}
        {(returnRequest.status === 'pending' || returnRequest.status === 'seller_review') && (
          <View style={styles.footerActions}>
            {/* Row 1: Approve (full width primary) */}
            <Pressable style={styles.approveBtn} onPress={handleApprove}>
              <CheckCircle size={18} color="#FFF" />
              <Text style={styles.approveBtnText}>Approve & Refund</Text>
            </Pressable>

            {/* Row 2: Secondary actions — 2 columns */}
            <View style={styles.secondaryRow}>
              <Pressable style={styles.counterBtn} onPress={() => setCounterModalVisible(true)}>
                <DollarSign size={16} color={BRAND} />
                <Text style={styles.counterBtnText}>Counter Offer</Text>
              </Pressable>
              <Pressable style={styles.itemBackBtn} onPress={handleRequestItemBack}>
                <Package size={16} color={BODY} />
                <Text style={styles.itemBackBtnText}>Request Item Back</Text>
              </Pressable>
            </View>

            {/* Row 3: Reject (outline) */}
            <Pressable style={styles.rejectBtn} onPress={() => setRejectModalVisible(true)}>
              <XCircle size={16} color={COLORS.error} />
              <Text style={styles.rejectBtnText}>Reject Request</Text>
            </Pressable>
          </View>
        )}

        {/* Counter Offered — Waiting */}
        {returnRequest.status === 'counter_offered' && (
          <View style={styles.statusBox}>
            <MessageCircle size={20} color={BRAND} />
            <Text style={styles.statusBoxText}>Waiting for buyer to respond to your counter offer of ₱{(returnRequest.counterOfferAmount || 0).toLocaleString()}</Text>
          </View>
        )}

        {/* Return In Transit */}
        {returnRequest.status === 'return_in_transit' && (
          <Pressable style={styles.approveBtn} onPress={handleConfirmReceived}>
            <Truck size={18} color="#FFF" />
            <Text style={styles.approveBtnText}>Confirm Received & Refund</Text>
          </Pressable>
        )}

        {/* Resolved */}
        {(returnRequest.status === 'refunded' || returnRequest.status === 'rejected') && (
          <View style={styles.statusBox}>
            <CheckCircle size={20} color={returnRequest.status === 'refunded' ? COLORS.success : COLORS.error} />
            <Text style={styles.statusBoxText}>This request is {returnRequest.status}.</Text>
          </View>
        )}
      </View>

      {/* ─── Reject Modal ───────────────────────────────────────────────── */}
      <Modal visible={rejectModalVisible} transparent animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Request</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for rejecting this return:</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Enter reason e.g. Item not within return window..."
              placeholderTextColor={MUTED}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirmBtn} onPress={handleReject}>
                <Text style={styles.modalConfirmText}>Confirm Reject</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── Counter Offer Modal ────────────────────────────────────────── */}
      <Modal visible={counterModalVisible} transparent animationType="fade" onRequestClose={() => setCounterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Send Counter Offer</Text>
            <Text style={styles.modalSubtitle}>Propose a partial refund to resolve the issue without a full return.</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Offer Amount (₱)</Text>
              <TextInput
                style={styles.priceInput}
                keyboardType="numeric"
                value={counterAmount}
                onChangeText={setCounterAmount}
                placeholder="0.00"
                placeholderTextColor={MUTED}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Note to Buyer</Text>
              <TextInput
                style={styles.modalInput}
                multiline
                numberOfLines={3}
                value={counterNote}
                onChangeText={setCounterNote}
                placeholder="Explain why you are offering this amount..."
                placeholderTextColor={MUTED}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={styles.modalCancelBtn} onPress={() => setCounterModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalConfirmBtn, { backgroundColor: BRAND }]} onPress={handleCounterOffer}>
                <Text style={styles.modalConfirmText}>Send Offer</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Header (aligned with OrderDetailScreen) ──────────────────────────────
  header: {
    backgroundColor: HEADER_BG,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 20,
    paddingBottom: 15,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: HEADLINE,
    textAlign: 'center',
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: HEADLINE,
    marginBottom: 15,
    letterSpacing: 0.3,
  },

  // ── Status ─────────────────────────────────────────────────────────────────
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusLabel: { fontSize: 10, fontWeight: '800', color: MUTED, letterSpacing: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '900' },
  returnIdText: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  orderIdText: { fontSize: 13, fontWeight: '600', color: HEADLINE },

  deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#FEF2F2', padding: 8, borderRadius: 8 },
  deadlineText: { fontSize: 12, color: '#EF4444', fontWeight: '700' },

  // ── Info grid ──────────────────────────────────────────────────────────────
  infoGrid: { flexDirection: 'row', gap: 20 },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 10, color: MUTED, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  infoValue: { fontSize: 14, color: HEADLINE, fontWeight: '600' },

  // ── Detail rows ────────────────────────────────────────────────────────────
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailLabel: { fontSize: 14, color: '#6B7280' },
  detailValue: { fontSize: 14, fontWeight: '600', color: HEADLINE },
  totalRowLine: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  totalLabel: { fontSize: 15, fontWeight: '700', color: HEADLINE },
  totalValue: { fontSize: 18, fontWeight: '900', color: BRAND },

  // ── Description & Evidence ─────────────────────────────────────────────────
  descriptionText: { fontSize: 14, color: BODY, lineHeight: 22, marginBottom: 15 },
  imageScroll: { flexDirection: 'row', gap: 10 },
  proofImage: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#F3F4F6', marginRight: 10 },

  // ── Items ──────────────────────────────────────────────────────────────────
  itemRow: { flexDirection: 'row', marginBottom: 15, gap: 12 },
  itemImage: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F3F4F6' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '600', color: HEADLINE, marginBottom: 4 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center' },
  itemMeta: { fontSize: 13, color: '#6B7280' },

  // ── Shipping ───────────────────────────────────────────────────────────────
  labelLink: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, padding: 12, backgroundColor: '#EFF6FF', borderRadius: 10 },
  labelText: { fontSize: 14, color: '#3B82F6', fontWeight: '700' },

  // ── Footer ─────────────────────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: CARD_BG,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  footerActions: { gap: 10 },

  // Approve button — full-width primary
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  approveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 15 },

  // Secondary row — 2 buttons side by side
  secondaryRow: { flexDirection: 'row', gap: 10 },
  counterBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BRAND,
    backgroundColor: '#FFFBEB',
  },
  counterBtnText: { color: BRAND, fontWeight: '700', fontSize: 13 },
  itemBackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: '#F9FAFB',
  },
  itemBackBtnText: { color: BODY, fontWeight: '700', fontSize: 13 },

  // Reject button — outline at bottom
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  rejectBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 13 },

  // Status info box
  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F9FAFB', padding: 15, borderRadius: 12 },
  statusBoxText: { flex: 1, fontSize: 14, color: BODY, fontWeight: '600' },

  // ── Modals ─────────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: CARD_BG, borderRadius: 24, padding: 24, elevation: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: HEADLINE, marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 12, fontWeight: '800', color: MUTED, marginBottom: 8, letterSpacing: 0.5 },
  priceInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    fontWeight: '700',
    color: BRAND,
    backgroundColor: '#F9FAFB',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 15,
    minHeight: 80,
    fontSize: 14,
    color: HEADLINE,
    backgroundColor: '#F9FAFB',
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 10 },
  modalCancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  modalCancelText: { color: '#6B7280', fontSize: 15, fontWeight: '700' },
  modalConfirmBtn: { backgroundColor: COLORS.error, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12 },
  modalConfirmText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
});
