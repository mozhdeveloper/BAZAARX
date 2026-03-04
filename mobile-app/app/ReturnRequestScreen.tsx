import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  Image,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, X, ShieldAlert, Package, Puzzle, FileQuestion, HelpCircle, RotateCcw, RefreshCw, Wallet } from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useReturnStore } from '../src/stores/returnStore';
import { useAuthStore } from '../src/stores/authStore';
import * as ImagePicker from 'expo-image-picker';
import {
  returnService,
  ReturnReason,
  ReturnType,
  ReturnItem,
  computeResolutionPath,
  getEstimatedResolutionDate,
  EVIDENCE_REQUIRED_REASONS,
} from '../src/services/returnService';
import { notificationService } from '../src/services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'ReturnRequest'>;

// ─── Brand tokens (aligned with BAZAAR theme.ts) ──────────────────────────
const BRAND = COLORS.primary;        // #D97706 amber
const BRAND_LIGHT = COLORS.primarySoft;    // #FFF4EC
const BRAND_DARK = COLORS.primaryHover;   // #B45309
const BG = COLORS.background;     // #FFFBF0 warm cream
const HEADLINE = COLORS.textHeadline;   // #2D2522
const BODY = COLORS.textPrimary;    // #5C3D1E
const MUTED = COLORS.textMuted;      // #9C8E83
const BORDER = '#E8DDD1';             // warm border
const CARD_BG = COLORS.surface;        // #FFFFFF

// ─── Data ──────────────────────────────────────────────────────────────────

const REASONS: { id: ReturnReason; label: string; description: string; icon: any }[] = [
  { id: 'damaged', label: 'Damaged Item', description: 'Item arrived damaged or broken', icon: ShieldAlert },
  { id: 'wrong_item', label: 'Wrong Item Received', description: 'Received a different item from what I ordered', icon: Package },
  { id: 'missing_parts', label: 'Missing Accessories', description: 'Package is missing parts or accessories', icon: Puzzle },
  { id: 'not_as_described', label: "Doesn't Match Description", description: 'Item does not match the product listing', icon: FileQuestion },
  { id: 'other', label: 'Other Reason', description: 'Any other issue not listed above', icon: HelpCircle },
];

const SOLUTIONS: { id: ReturnType; label: string; description: string; icon: any }[] = [
  { id: 'return_refund', label: 'Return & Refund', description: 'Send item back and get full refund', icon: RotateCcw },
  { id: 'replacement', label: 'Replacement', description: 'Receive the same item again', icon: RefreshCw },
  { id: 'refund_only', label: 'Refund Only', description: 'Keep item and get money back', icon: Wallet },
];

// ─── Section badge ─────────────────────────────────────────────────────────

function SectionBadge({ number }: { number: number }) {
  return (
    <View style={styles.sectionBadge}>
      <Text style={styles.sectionBadgeText}>{number}</Text>
    </View>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function ReturnRequestScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const createReturnRequest = useReturnStore((s) => s.createReturnRequest);

  const [reason, setReason] = useState<ReturnReason | ''>('');
  const [otherReasonText, setOtherReasonText] = useState('');
  const [returnType, setReturnType] = useState<ReturnType>('return_refund');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refundAmount = returnType === 'replacement' ? 0 : (order.total ?? 0);

  // ─── Image Picker ──────────────────────────────────────────────────────

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to photos to upload evidence.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });
    if (!result.canceled) setImages((prev) => [...prev, result.assets[0].uri]);
  };

  const removeImage = (i: number) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  // ─── Submit ────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!reason) {
      Alert.alert('Required', 'Please select a reason for the return.');
      return;
    }
    if (reason === 'other' && !otherReasonText.trim()) {
      Alert.alert('Required', 'Please describe the reason for your return.');
      return;
    }
    const needsEvidence = EVIDENCE_REQUIRED_REASONS.includes(reason as ReturnReason);
    if (needsEvidence && images.length === 0) {
      Alert.alert('Evidence Required', 'Please upload at least one photo showing the issue.');
      return;
    }

    setIsSubmitting(true);
    const finalDesc = reason === 'other' ? otherReasonText.trim() : description.trim();
    const itemsToReturn: ReturnItem[] = order.items.map((item: any) => ({
      orderItemId: item.id,
      productName: item.name || 'Unknown',
      quantity: item.quantity ?? 1,
      returnQuantity: item.quantity ?? 1,
      price: item.price ?? 0,
      image: item.image ?? null,
    }));

    try {
      const orderDbId: string | undefined = (order as any).orderId || (order as any).dbId || (order as any).id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderDbId ?? '');

      if (isUuid && orderDbId) {
        let evidenceUrls: string[] = [];
        if (images.length > 0) evidenceUrls = await returnService.uploadEvidence(orderDbId, images);

        await returnService.submitReturnRequest({
          orderDbId,
          reason: reason as ReturnReason,
          returnType,
          description: finalDesc,
          refundAmount,
          items: itemsToReturn,
          evidenceUrls,
        });

        const result = await returnService.submitReturnRequest({
          orderDbId,
          reason: reason as ReturnReason,
          returnType,
          description: finalDesc,
          refundAmount,
          items: itemsToReturn,
          evidenceUrls,
        });

        // Notify seller about the return (fire-and-forget)
        const sellerUuid = order.items?.[0]?.sellerId || (order as any).sellerInfo?.id;
        if (sellerUuid) {
          notificationService.notifySellerReturnRequest({
            sellerId: sellerUuid,
            orderId: orderDbId,
            returnId: (result as any)?.id || 'pending', // <-- Extract ID from result or use safe fallback
            orderNumber: (order as any).transactionId || order.id || orderDbId,
            buyerName: user?.name || 'A buyer',
            reason: finalDesc || (reason as string),
          }).catch(() => { });
        }

        const resPath = computeResolutionPath(reason as ReturnReason, refundAmount, evidenceUrls.length > 0);
        const estDate = getEstimatedResolutionDate(resPath);
        const pathLabel = resPath === 'instant' ? 'Instant Refund'
          : resPath === 'return_required' ? 'Return Required (ship item back)'
            : 'Seller Review (response within 48h)';

        Alert.alert('Request Submitted', `Resolution: ${pathLabel}\nEstimated: ${estDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        const sellerId = order.items[0]?.sellerId || order.items[0]?.seller || 'unknown';
        createReturnRequest({
          orderId: order.id,
          userId: user?.id || 'guest',
          sellerId,
          items: itemsToReturn.map((i) => ({ itemId: i.orderItemId, quantity: i.returnQuantity })),
          reason: reason as any,
          description: finalDesc,
          images,
          type: returnType,
          amount: refundAmount,
        });
        Alert.alert('Success', 'Return request submitted.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit return request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  // Order item preview (first item)
  const firstItem = order.items?.[0];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD_BG} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color={HEADLINE} strokeWidth={2.5} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Return / Refund</Text>
          <Text style={styles.headerSub}>Order {(order as any).transactionId || order.id}</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 60}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* ── Order preview ────────────────────────────────────────── */}
          {firstItem && (
            <View style={styles.orderPreviewCard}>
              {firstItem.image ? (
                <Image source={{ uri: firstItem.image }} style={styles.orderPreviewImg} />
              ) : (
                <View style={[styles.orderPreviewImg, styles.orderPreviewImgPlaceholder]}>
                  <Package size={24} color={MUTED} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.orderPreviewName} numberOfLines={2}>{firstItem.name}</Text>
                {order.items.length > 1 && (
                  <Text style={styles.orderPreviewMore}>+{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}</Text>
                )}
                <View style={styles.orderPreviewMeta}>
                  <View style={styles.orderPreviewBadge}>
                    <Text style={styles.orderPreviewBadgeText}>Delivered</Text>
                  </View>
                  <Text style={styles.orderPreviewPrice}>₱{(order.total ?? 0).toLocaleString()}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── SECTION 1: REASON ───────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <SectionBadge number={1} />
            <Text style={styles.sectionLabel}>REASON FOR RETURN</Text>
          </View>

          <View style={styles.card}>
            {REASONS.map((r, i) => {
              const sel = reason === r.id;
              const Icon = r.icon;
              const isLast = i === REASONS.length - 1;
              return (
                <View key={r.id}>
                  <Pressable
                    style={[styles.reasonRow, sel && styles.reasonRowSel, !isLast && !sel && styles.divider]}
                    onPress={() => setReason(r.id)}
                  >
                    <View style={[styles.reasonIconWrap, sel && styles.reasonIconWrapSel]}>
                      <Icon size={15} color={sel ? BRAND : MUTED} strokeWidth={2} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.reasonLabel, sel && { color: BRAND_DARK, fontWeight: '700' }]}>{r.label}</Text>
                      <Text style={styles.reasonDesc}>{r.description}</Text>
                    </View>
                    <View style={[styles.radio, sel && styles.radioSel]}>
                      {sel && <View style={styles.radioDot} />}
                    </View>
                  </Pressable>
                  {r.id === 'other' && sel && (
                    <View style={styles.otherWrap}>
                      <TextInput
                        style={styles.otherInput}
                        placeholder="Please describe your reason..."
                        placeholderTextColor={MUTED}
                        value={otherReasonText}
                        onChangeText={setOtherReasonText}
                        multiline
                        textAlignVertical="top"
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Evidence required notice */}
          {reason !== '' && EVIDENCE_REQUIRED_REASONS.includes(reason as ReturnReason) && (
            <View style={styles.evidenceNotice}>
              <ShieldAlert size={14} color="#92400E" strokeWidth={2} />
              <Text style={styles.evidenceNoticeText}>Photo evidence is required for this reason</Text>
            </View>
          )}

          {/* ── SECTION 2: SOLUTION ─────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <SectionBadge number={2} />
            <Text style={styles.sectionLabel}>PREFERRED SOLUTION</Text>
          </View>

          <View style={styles.solutionRow}>
            {SOLUTIONS.map((s) => {
              const sel = returnType === s.id;
              const Icon = s.icon;
              return (
                <Pressable key={s.id} style={[styles.solutionCard, sel && styles.solutionCardSel]} onPress={() => setReturnType(s.id)}>
                  <View style={[styles.solutionIconWrap, sel && styles.solutionIconWrapSel]}>
                    <Icon size={18} color={sel ? BRAND : MUTED} strokeWidth={2} />
                  </View>
                  <Text style={[styles.solutionLabel, sel && { color: BRAND_DARK }]}>{s.label}</Text>
                  <Text style={styles.solutionDesc}>{s.description}</Text>
                  {sel && <View style={styles.solutionCheck} />}
                </Pressable>
              );
            })}
          </View>

          {/* ── SECTION 3: DETAILS ──────────────────────────────────── */}
          <View style={styles.sectionHeader}>
            <SectionBadge number={3} />
            <Text style={styles.sectionLabel}>ADDITIONAL DETAILS</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Description / Comments</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe the issue in detail..."
              placeholderTextColor={MUTED}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.dividerLine} />

            <Text style={styles.fieldLabel}>Upload Evidence</Text>
            <Text style={styles.fieldHint}>Add photos of the issue (required for damage/wrong item)</Text>
            <View style={styles.evidenceRow}>
              {images.map((uri, idx) => (
                <View key={idx} style={styles.thumb}>
                  <Image source={{ uri }} style={styles.thumbImg} />
                  <Pressable style={styles.thumbRemove} onPress={() => removeImage(idx)} hitSlop={4}>
                    <X size={9} color="#FFF" strokeWidth={3} />
                  </Pressable>
                </View>
              ))}
              {images.length < 5 && (
                <Pressable style={styles.addEvidence} onPress={pickImage}>
                  <Camera size={20} color={MUTED} strokeWidth={1.5} />
                  <Text style={styles.addEvidenceText}>Add Photo</Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* ── Sticky Footer ───────────────────────────────────────────── */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.refundRow}>
            <View>
              <Text style={styles.refundLabel}>REFUND AMOUNT</Text>
              <Text style={styles.refundSub}>{returnType === 'replacement' ? 'No refund — item replaced' : 'Based on original order total'}</Text>
            </View>
            <Text style={styles.refundAmount}>{returnType === 'replacement' ? '—' : `₱${refundAmount.toLocaleString()}`}</Text>
          </View>
          <View style={styles.footerBtns}>
            <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.submitBtn, isSubmitting && { opacity: 0.65 }]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting
                ? <ActivityIndicator color="#FFF" size="small" />
                : <Text style={styles.submitBtnText}>Submit Request</Text>
              }
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    backgroundColor: CARD_BG,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: BORDER,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HEADLINE },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },

  // ── Scroll ───────────────────────────────────────────────────────────────
  scrollContent: { padding: 16, paddingTop: 20 },

  // ── Order preview card ───────────────────────────────────────────────────
  orderPreviewCard: {
    flexDirection: 'row',
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    gap: 12,
    marginBottom: 22,
    alignItems: 'center',
  },
  orderPreviewImg: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F3EDE3' },
  orderPreviewImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  orderPreviewName: { fontSize: 13, fontWeight: '600', color: HEADLINE, lineHeight: 18, flex: 1 },
  orderPreviewMore: { fontSize: 11, color: MUTED, marginTop: 2 },
  orderPreviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  orderPreviewBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  orderPreviewBadgeText: { fontSize: 10, fontWeight: '600', color: '#15803D' },
  orderPreviewPrice: { fontSize: 13, fontWeight: '700', color: BRAND },

  // ── Section header ────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionBadge: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: HEADLINE, letterSpacing: 1.0 },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  // ── Reason rows ───────────────────────────────────────────────────────────
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  reasonRowSel: {
    backgroundColor: BRAND_LIGHT,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginVertical: 2,
    borderRadius: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: '#F0E8DC' },
  reasonIconWrap: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#F5EFE6',
    alignItems: 'center', justifyContent: 'center',
  },
  reasonIconWrapSel: { backgroundColor: BRAND_LIGHT },
  reasonLabel: { fontSize: 14, fontWeight: '600', color: HEADLINE },
  reasonDesc: { fontSize: 11, color: MUTED, marginTop: 2, lineHeight: 15 },

  // ── Other reason ─────────────────────────────────────────────────────────
  otherWrap: { paddingLeft: 44, paddingBottom: 12, paddingTop: 4 },
  otherInput: {
    backgroundColor: BG,
    borderWidth: 1.5,
    borderColor: BRAND,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: BODY,
    minHeight: 64,
  },

  // Evidence notice
  evidenceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  evidenceNoticeText: { fontSize: 12, color: '#92400E', fontWeight: '500', flex: 1 },

  // ── Radio ─────────────────────────────────────────────────────────────────
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSel: { borderColor: BRAND },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: BRAND },

  // ── Solution cards ────────────────────────────────────────────────────────
  solutionRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  solutionCard: {
    flex: 1,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    alignItems: 'flex-start',
    gap: 4,
  },
  solutionCardSel: {
    borderColor: BRAND,
    backgroundColor: BRAND_LIGHT,
    borderWidth: 1.5,
  },
  solutionIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#F5EFE6',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  solutionIconWrapSel: { backgroundColor: '#FDE8C8' },
  solutionLabel: { fontSize: 12, fontWeight: '700', color: HEADLINE },
  solutionDesc: { fontSize: 10, color: MUTED, lineHeight: 14 },
  solutionCheck: {
    position: 'absolute', top: 10, right: 10,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: BRAND,
  },

  // ── Fields ────────────────────────────────────────────────────────────────
  fieldLabel: { fontSize: 12, fontWeight: '700', color: BODY, marginBottom: 6, marginTop: 10 },
  fieldHint: { fontSize: 11, color: MUTED, marginBottom: 10 },
  textArea: {
    backgroundColor: BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 14,
    fontSize: 13,
    color: BODY,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dividerLine: { height: 1, backgroundColor: '#F0E8DC', marginVertical: 12 },

  // ── Evidence ──────────────────────────────────────────────────────────────
  evidenceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  thumb: {
    width: 68, height: 68, borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1, borderColor: BORDER,
  },
  thumbImg: { width: '100%', height: '100%' },
  thumbRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8, width: 18, height: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  addEvidence: {
    width: 68, height: 68, borderRadius: 12,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#C8B89A',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BG, gap: 4,
  },
  addEvidenceText: { fontSize: 10, fontWeight: '500', color: MUTED },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    backgroundColor: CARD_BG,
    borderTopWidth: 1, borderTopColor: BORDER,
    paddingHorizontal: 20, paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 6,
  },
  refundRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  refundLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.8 },
  refundSub: { fontSize: 10, color: MUTED, marginTop: 2 },
  refundAmount: { fontSize: 26, fontWeight: '800', color: BRAND },
  footerBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 15, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BG,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: BODY },
  submitBtn: {
    flex: 2, paddingVertical: 15, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: BRAND,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
