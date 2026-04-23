import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Camera,
  X,
  ShieldAlert,
  Package,
  ChevronDown,
  ChevronUp,
  Video,
  CheckSquare,
  Square,
  RotateCcw,
  Calendar,
  Truck,
  Home,
  MapPin,
  Clock,
  ZoomIn,
  Phone,
  ImagePlus,
  User,
} from 'lucide-react-native';
import { Video as AVVideo, ResizeMode } from 'expo-av';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useReturnStore } from '../src/stores/returnStore';
import { useAuthStore } from '../src/stores/authStore';
import * as ImagePicker from 'expo-image-picker';
import {
  returnService,
  ReturnReason,
  ReturnType as SvcReturnType,
  ReturnItem,
  computeResolutionPath,
  getEstimatedResolutionDate,
  getEvidenceRequirements,
  getAllowedResolutions,
} from '../src/services/returnService';
import { notificationService } from '../src/services/notificationService';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';

type Props = NativeStackScreenProps<RootStackParamList, 'ReturnRequest'>;

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Brand tokens ────────────────────────────────────────────────────────────
const BRAND = COLORS.primary;
const BRAND_LIGHT = COLORS.primarySoft;
const BRAND_DARK = COLORS.primaryHover;
const BG = COLORS.background;
const HEADLINE = COLORS.textHeadline;
const BODY = COLORS.textPrimary;
const MUTED = COLORS.textMuted;
const BORDER = '#E8DDD1';
const CARD_BG = COLORS.surface;

// ─── File size limits ────────────────────────────────────────────────────────
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB
const VIDEO_MAX_BYTES = 20 * 1024 * 1024;  // 20 MB
const MAX_MEDIA_FILES = 5;

// ─── Types ───────────────────────────────────────────────────────────────────
type TopLevelReasonId = 'damaged' | 'wrong_item' | 'item_not_received';
type ReturnMethod = 'pickup' | 'self_ship';

interface MediaItem { uri: string; type: 'image' | 'video'; }

interface TopLevelReason {
  id: TopLevelReasonId; label: string; description: string; icon: any;
  subReasons?: SubReason[];
}
interface SubReason { id: ReturnReason; label: string; description: string; }

// ─── Reason config ───────────────────────────────────────────────────────────
const TOP_REASONS: TopLevelReason[] = [
  { id: 'damaged', label: 'Received Damaged Item', description: 'Item is physically damaged (scratches, dents, defects)', icon: ShieldAlert },
  { id: 'wrong_item', label: 'Received Incorrect Item', description: 'Item received does not match the order placed', icon: Package },
  {
    id: 'item_not_received', label: 'Item not Received', description: 'Issue with delivery or parcel contents', icon: Truck,
    subReasons: [
      { id: 'did_not_receive_empty', label: 'Empty Parcel', description: 'The received parcel had no contents' },
      { id: 'did_not_receive_not_delivered', label: 'Order Not Delivered', description: 'Did not receive the order despite the shipment status' },
      { id: 'did_not_receive_missing_items', label: 'Missing Item / Incomplete Order', description: 'Some items are missing from the received package' },
    ],
  },
];

const TOP_TO_REASON: Partial<Record<TopLevelReasonId, ReturnReason>> = { damaged: 'damaged', wrong_item: 'wrong_item' };

// Per-reason evidence upload descriptions
const EVIDENCE_DESCRIPTIONS: Partial<Record<ReturnReason, string>> = {
  damaged: 'Upload photos and/or a video showing the damage to the item',
  wrong_item: 'Upload photos and/or a video showing the incorrect item received',
  did_not_receive_empty: 'Upload photos and/or an unboxing video showing the empty parcel',
  did_not_receive_missing_items: 'Upload photos and/or a video showing the incomplete contents',
};

// ─── Resolution labels ──────────────────────────────────────────────────────
const RESOLUTION_LABELS: Record<SvcReturnType, { label: string; description: string }> = {
  return_refund: { label: 'Return & Refund', description: 'Ship the item back and receive a full refund' },
  refund_only: { label: 'Refund Only', description: 'Receive a refund without returning the item' },
  partial_refund: { label: 'Partial Refund', description: 'Refund only for the missing items selected' },
  replacement: { label: 'Replacement', description: 'Receive a replacement item instead of a refund' },
};

// ─── Section badge ──────────────────────────────────────────────────────────
function SectionBadge({ number }: { number: number }) {
  return <View style={styles.sectionBadge}><Text style={styles.sectionBadgeText}>{number}</Text></View>;
}

// ─── Preview Modal ──────────────────────────────────────────────────────────
function MediaPreviewModal({ item, onClose }: { item: MediaItem | null; onClose: () => void }) {
  const videoRef = useRef<AVVideo>(null);
  if (!item) return null;
  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={pvStyles.overlay}>
        <Pressable style={pvStyles.bg} onPress={onClose} />
        <View style={pvStyles.container}>
          {item.type === 'image'
            ? <Image source={{ uri: item.uri }} style={pvStyles.media} resizeMode="contain" />
            : <AVVideo ref={videoRef} source={{ uri: item.uri }} style={pvStyles.media} resizeMode={ResizeMode.CONTAIN} useNativeControls shouldPlay />}
        </View>
        <Pressable style={pvStyles.closeBtn} onPress={onClose} hitSlop={12}>
          <X size={18} color="#FFF" strokeWidth={2.5} />
        </Pressable>
      </View>
    </Modal>
  );
}

const pvStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', alignItems: 'center' },
  bg: { ...StyleSheet.absoluteFillObject },
  container: { width: SCREEN_W * 0.92, height: SCREEN_H * 0.65, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  media: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute', top: 52, right: 20, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════════════════════
export default function ReturnRequestScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const createReturnRequest = useReturnStore((s) => s.createReturnRequest);
  const scrollRef = useRef<ScrollView>(null);
  const scrollCurrentY = useRef(0);
  const descriptionRef = useRef<View>(null);
  const pendingPickerAction = useRef<(() => void) | null>(null);
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(300)).current;

  // ── Reason state ─────────
  const [topReason, setTopReason] = useState<TopLevelReasonId | ''>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [subReason, setSubReason] = useState<ReturnReason | ''>('');

  // ── Form fields ──────────
  const [description, setDescription] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedMissingItems, setSelectedMissingItems] = useState<string[]>([]);
  const [returnType, setReturnType] = useState<SvcReturnType>('return_refund');
  const [returnMethod, setReturnMethod] = useState<ReturnMethod | ''>('');

  // Pickup — read-only delivery address
  const [pickupAddress, setPickupAddress] = useState('');

  // ── UI state ─────────────
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [returnDeadline, setReturnDeadline] = useState<Date | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // ── Seller business address (fetched from DB) ──
  const [sellerDbName, setSellerDbName] = useState('');
  const [sellerDbAddress, setSellerDbAddress] = useState('');
  const [sellerDbPhone, setSellerDbPhone] = useState('');

  // ── Derived ──────────────
  const effectiveReason: ReturnReason | '' =
    topReason === 'item_not_received' ? subReason
      : topReason ? (TOP_TO_REASON[topReason] ?? '') : '';

  const requirements = effectiveReason ? getEvidenceRequirements(effectiveReason as ReturnReason) : null;
  const allowedResolutions = effectiveReason ? getAllowedResolutions(effectiveReason as ReturnReason) : [];
  const showReturnMethodSection = returnType === 'return_refund' && effectiveReason !== '';

  const imageItems = mediaItems.filter((m) => m.type === 'image');
  const videoItems = mediaItems.filter((m) => m.type === 'video');
  const needsEvidence = requirements && (requirements.photo || requirements.video);

  // ── Init pickup address from order shipping address (read-only) ──
  useEffect(() => {
    if (order.shippingAddress) {
      const a = order.shippingAddress;
      setPickupAddress(
        [a.name, a.phone, a.address, a.city, a.region].filter(Boolean).join(', '),
      );
    }
  }, []);

  // ── Auto-set returnType ──
  useEffect(() => {
    if (allowedResolutions.length === 1) setReturnType(allowedResolutions[0]);
    else if (allowedResolutions.length > 1 && !allowedResolutions.includes(returnType)) setReturnType(allowedResolutions[0]);
  }, [effectiveReason]);

  // ── Fetch deadline ──
  useEffect(() => {
    const orderDbId: string | undefined = (order as any).orderId || (order as any).dbId || (order as any).id;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderDbId ?? '');
    if (isUuid && orderDbId) returnService.getReturnWindowDeadline(orderDbId).then(setReturnDeadline).catch(() => { });
  }, []);

  // ── Reason helpers — preserve user-entered details on toggle ──
  const selectTopReason = (id: TopLevelReasonId) => {
    if (topReason === id && id !== 'item_not_received') {
      setTopReason(''); setSubReason(''); return;
    }
    setTopReason(id); setSubReason('');
    setDropdownOpen(id === 'item_not_received');
  };

  const selectSubReason = (id: ReturnReason) => {
    if (subReason === id) { setSubReason(''); }
    else { setSubReason(id); }
  };

  // ── Refund ──
  const refundAmount = (() => {
    if (returnType === 'replacement') return 0;
    if (returnType === 'partial_refund') {
      return order.items
        .filter((item: any) => selectedMissingItems.includes(item.id))
        .reduce((sum: number, item: any) => sum + ((item.price ?? 0) * (item.quantity ?? 1)), 0);
    }
    return order.total ?? 0;
  })();

  // ── Media picker — bottom sheet style UI ──
  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Needed', 'Camera access is required.'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      allowsEditing: false,
      videoMaxDuration: 30,  // ~30s keeps video well under 20 MB at standard quality
    });
    if (result.canceled || !result.assets[0]) return;
    const a = result.assets[0];
    const isVideo = a.type === 'video' || /\.(mp4|mov|avi)(\?|$)/i.test(a.uri || '');
    if (!isVideo && a.fileSize && a.fileSize > IMAGE_MAX_BYTES) { Alert.alert('File Too Large', 'Photos must be under 5 MB.'); return; }
    if (isVideo && a.fileSize && a.fileSize > VIDEO_MAX_BYTES) { Alert.alert('File Too Large', 'Video exceeds 20 MB. Try a shorter recording.'); return; }
    if (mediaItems.length >= MAX_MEDIA_FILES) { Alert.alert('Limit Reached', `Max ${MAX_MEDIA_FILES} files.`); return; }
    setMediaItems((p) => [...p, { uri: a.uri, type: isVideo ? 'video' : 'image' }]);
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission Needed', 'Media library access is required.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, MAX_MEDIA_FILES - mediaItems.length),
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const newItems: MediaItem[] = [];
    const skippedImages: string[] = [];
    const skippedVideos: string[] = [];
    for (const asset of result.assets) {
      if (mediaItems.length + newItems.length >= MAX_MEDIA_FILES) break;
      const isVideo = asset.type === 'video' || (asset.uri && /\.(mp4|mov|avi)(\?|$)/i.test(asset.uri));
      if (!isVideo && asset.fileSize && asset.fileSize > IMAGE_MAX_BYTES) {
        skippedImages.push(asset.fileName || 'photo');
        continue;
      }
      if (isVideo && asset.fileSize && asset.fileSize > VIDEO_MAX_BYTES) {
        skippedVideos.push(asset.fileName || 'video');
        continue;
      }
      newItems.push({ uri: asset.uri, type: isVideo ? 'video' : 'image' });
    }
    if (newItems.length > 0) setMediaItems((p) => [...p, ...newItems]);
    if (skippedImages.length > 0 || skippedVideos.length > 0) {
      const lines: string[] = [];
      if (skippedImages.length > 0) lines.push(`• ${skippedImages.length} photo${skippedImages.length > 1 ? 's' : ''} exceeded 5 MB`);
      if (skippedVideos.length > 0) lines.push(`• ${skippedVideos.length} video${skippedVideos.length > 1 ? 's' : ''} exceeded 20 MB`);
      Alert.alert('Some Files Skipped', lines.join('\n') + '\n\nPlease select smaller files.');
    }
  };

  const showMediaSourcePicker = () => {
    overlayAnim.setValue(0);
    sheetAnim.setValue(300);
    setShowMediaPicker(true);
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(sheetAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
    ]).start();
  };

  const hideMediaPicker = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(overlayAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetAnim, { toValue: 300, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setShowMediaPicker(false);
      pendingPickerAction.current = null;
      if (callback) setTimeout(callback, 600);
    });
  };

  const removeMediaItem = (uri: string) => setMediaItems((p) => p.filter((m) => m.uri !== uri));
  const toggleMissingItem = (itemId: string) =>
    setSelectedMissingItems((p) => p.includes(itemId) ? p.filter((id) => id !== itemId) : [...p, itemId]);

  // ── Fetch seller business profile for self-ship address ──
  useEffect(() => {
    const fetchSellerAddress = async () => {
      if (!isSupabaseConfigured()) return;
      const sellerId = order.items?.[0]?.sellerId || (order as any).sellerInfo?.id;
      if (!sellerId) return;
      try {
        const { data: seller } = await supabase
          .from('sellers')
          .select('store_name, business_profile:seller_business_profiles(address_line_1, address_line_2, city, province, postal_code)')
          .eq('id', sellerId)
          .maybeSingle();
        if (seller) {
          setSellerDbName(seller.store_name || '');
          const bp: any = Array.isArray(seller.business_profile) ? seller.business_profile[0] : seller.business_profile;
          if (bp) {
            setSellerDbAddress(
              [bp.address_line_1, bp.address_line_2, bp.city, bp.province, bp.postal_code].filter(Boolean).join(', '),
            );
          }
        }
      } catch { /* silent */ }
    };
    fetchSellerAddress();
  }, []);

  // ── Submit ──
  const handleSubmit = async () => {
    if (!topReason) { Alert.alert('Required', 'Please select a reason.'); return; }
    if (topReason === 'item_not_received' && !subReason) { Alert.alert('Required', 'Select the specific issue.'); return; }
    if (!effectiveReason) return;
    const reqs = getEvidenceRequirements(effectiveReason as ReturnReason);
    if (reqs.description && !description.trim()) { Alert.alert('Required', 'Describe the issue.'); return; }
    if ((reqs.photo || reqs.video) && mediaItems.length === 0) { Alert.alert('Evidence Required', 'Upload at least one photo or video.'); return; }
    if (reqs.itemSelection && selectedMissingItems.length === 0) { Alert.alert('Required', 'Select missing items.'); return; }
    if (showReturnMethodSection && !returnMethod) { Alert.alert('Required', 'Choose a return method.'); return; }
    if (returnMethod === 'pickup' && !pickupAddress) { Alert.alert('Required', 'Set a pickup address.'); return; }

    setIsSubmitting(true);
    const allUris = mediaItems.map((m) => m.uri);
    const itemsToReturn: ReturnItem[] = order.items.map((item: any) => ({
      orderItemId: item.id, productName: item.name || 'Unknown',
      quantity: item.quantity ?? 1, returnQuantity: item.quantity ?? 1,
      price: item.price ?? 0, image: item.image ?? null,
    }));

    try {
      const orderDbId: string | undefined = (order as any).orderId || (order as any).dbId || (order as any).id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderDbId ?? '');

      if (isUuid && orderDbId) {
        let evidenceUrls: string[] = [];
        if (allUris.length > 0) evidenceUrls = await returnService.uploadEvidence(orderDbId, allUris);
        const result = await returnService.submitReturnRequest({
          orderDbId, reason: effectiveReason as ReturnReason, returnType,
          description: description.trim() || undefined, refundAmount, items: itemsToReturn,
          evidenceUrls, missingItemIds: selectedMissingItems.length > 0 ? selectedMissingItems : undefined,
        });

        const sellerUuid = order.items?.[0]?.sellerId || (order as any).sellerInfo?.id;
        if (sellerUuid) {
          notificationService.notifySellerReturnRequest({
            sellerId: sellerUuid, orderId: orderDbId,
            returnId: (result as any)?.id || 'pending',
            orderNumber: (order as any).transactionId || order.id || orderDbId,
            buyerName: user?.name || 'A buyer',
            reason: description.trim() || (effectiveReason as string),
          }).catch(() => { });
        }

        const resPath = computeResolutionPath(effectiveReason as ReturnReason, refundAmount, evidenceUrls.length > 0);
        const estDate = getEstimatedResolutionDate(resPath);
        const pathLabel = resPath === 'instant' ? 'Instant Refund' : resPath === 'return_required' ? 'Return Required' : 'Seller Review (48h)';
        Alert.alert('Request Submitted',
          `Resolution: ${pathLabel}\nEstimated: ${estDate.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        const sellerId = order.items[0]?.sellerId || order.items[0]?.seller || 'unknown';
        createReturnRequest({
          orderId: order.id, userId: user?.id || 'guest', sellerId,
          items: itemsToReturn.map((i) => ({ itemId: i.orderItemId, quantity: i.returnQuantity })),
          reason: effectiveReason as any, description: description.trim(),
          images: imageItems.map((m) => m.uri), type: returnType as any, amount: refundAmount,
        });
        Alert.alert('Success', 'Return request submitted.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Seller info (prefer DB-fetched, fallback to order data) ──────────
  const sellerInfo = (order as any).sellerInfo || {};
  const sellerName = sellerDbName || sellerInfo.store_name || sellerInfo.name || order.items?.[0]?.seller || 'Seller';
  const sellerAddress = sellerDbAddress || sellerInfo.business_address || sellerInfo.address || 'No address on file';
  const sellerPhone = sellerDbPhone || sellerInfo.phone || sellerInfo.contact_number || '';

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════
  const firstItem = order.items?.[0];
  let sectionNum = 0;
  const nextSection = () => { sectionNum += 1; return sectionNum; };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={CARD_BG} />
      <MediaPreviewModal item={previewItem} onClose={() => setPreviewItem(null)} />

      {/* ── Header ─── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <ArrowLeft size={20} color={HEADLINE} strokeWidth={2.5} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Return / Refund</Text>
          <Text style={styles.headerSub}>Order {(order as any).transactionId || order.id}</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        scrollEventThrottle={16}
        onScroll={(e) => { scrollCurrentY.current = e.nativeEvent.contentOffset.y; }}
      >

        {/* ── Order preview ─── */}
        {firstItem && (
          <View style={styles.orderPreviewCard}>
            {firstItem.image ? (
              <Image source={{ uri: firstItem.image }} style={styles.orderPreviewImg} />
            ) : (
              <View style={[styles.orderPreviewImg, { backgroundColor: '#F3EDE3', alignItems: 'center', justifyContent: 'center' }]}>
                <Package size={24} color={MUTED} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.orderPreviewName} numberOfLines={2}>{firstItem.name}</Text>
              {order.items.length > 1 && <Text style={styles.orderPreviewMore}>+{order.items.length - 1} more item{order.items.length > 2 ? 's' : ''}</Text>}
              <View style={styles.orderPreviewMeta}>
                <View style={styles.orderPreviewBadge}><Text style={styles.orderPreviewBadgeText}>Delivered</Text></View>
                <Text style={styles.orderPreviewPrice}>₱{(order.total ?? 0).toLocaleString()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Deadline banner ─── */}
        {returnDeadline && (
          <View style={styles.deadlineBanner}>
            <Calendar size={14} color="#78350F" strokeWidth={2} />
            <Text style={styles.deadlineBannerText}>
              You can request return/refund until{' '}
              <Text style={{ fontWeight: '700' }}>{returnDeadline.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
            </Text>
          </View>
        )}

        {/* ═══ SECTION 1: REASON ═══ */}
        <View style={styles.sectionHeader}>
          <SectionBadge number={nextSection()} />
          <Text style={styles.sectionLabel}>REASON FOR RETURN</Text>
        </View>

        <View style={styles.card}>
          {TOP_REASONS.map((r, i) => {
            const sel = topReason === r.id;
            const Icon = r.icon;
            const isDropdown = r.id === 'item_not_received';
            const isLast = i === TOP_REASONS.length - 1;
            return (
              <View key={r.id}>
                <Pressable
                  style={[styles.reasonRow, sel && styles.reasonRowSel, !isLast && !sel && !(isDropdown && dropdownOpen) && styles.divider]}
                  onPress={() => isDropdown ? (sel ? setDropdownOpen((v) => !v) : selectTopReason(r.id)) : selectTopReason(r.id)}
                >
                  <View style={[styles.reasonIconWrap, sel && styles.reasonIconWrapSel]}>
                    <Icon size={15} color={sel ? BRAND : MUTED} strokeWidth={2} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reasonLabel, sel && { color: BRAND_DARK, fontWeight: '700' }]}>{r.label}</Text>
                    {!isDropdown && <Text style={styles.reasonDesc}>{r.description}</Text>}
                  </View>
                  {isDropdown
                    ? (dropdownOpen && sel ? <ChevronUp size={16} color={sel ? BRAND : MUTED} /> : <ChevronDown size={16} color={sel ? BRAND : MUTED} />)
                    : <View style={[styles.radio, sel && styles.radioSel]}>{sel && <View style={styles.radioDot} />}</View>}
                </Pressable>

                {isDropdown && sel && dropdownOpen && r.subReasons && (
                  <View style={styles.subReasonDropdown}>
                    {r.subReasons.map((sub) => {
                      const subSel = subReason === sub.id;
                      return (
                        <Pressable key={sub.id} style={[styles.subReasonFull, subSel && styles.subReasonFullSel]} onPress={() => selectSubReason(sub.id)}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.subReasonLabel, subSel && { color: BRAND_DARK, fontWeight: '700' }]}>{sub.label}</Text>
                            <Text style={styles.subReasonDesc}>{sub.description}</Text>
                          </View>
                          <View style={[styles.radio, subSel && styles.radioSel]}>{subSel && <View style={styles.radioDot} />}</View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ═══ SECTION 2: DETAILS & EVIDENCE ═══ */}
        {requirements && (
          <>
            <View style={styles.sectionHeader}>
              <SectionBadge number={nextSection()} />
              <Text style={styles.sectionLabel}>DETAILS & EVIDENCE</Text>
            </View>
            <View style={styles.card}>
              {/* Description */}
              {requirements.description && (
                <>
                  <Text style={styles.fieldLabel}>Description</Text>
                  <Text style={styles.fieldHint}>Describe the issue in as much detail as possible</Text>
                  <View ref={descriptionRef}>
                    <TextInput style={styles.textArea} placeholder="Describe the problem..." placeholderTextColor={MUTED}
                      value={description} onChangeText={setDescription} multiline numberOfLines={4} textAlignVertical="top"
                      onFocus={() => {
                        setTimeout(() => {
                          descriptionRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
                            const headerH = insets.top + 56;
                            const contentY = pageY + scrollCurrentY.current - headerH;
                            scrollRef.current?.scrollTo({ y: Math.max(0, contentY - 100), animated: true });
                          });
                        }, 300);
                      }} />
                  </View>
                </>
              )}

              {/* Missing item checklist */}
              {requirements.itemSelection && (
                <>
                  {requirements.description && <View style={styles.dividerLine} />}
                  <Text style={styles.fieldLabel}>Which items are missing?</Text>
                  <Text style={styles.fieldHint}>Tap items not received</Text>
                  {order.items.map((item: any, idx: number) => {
                    const isSel = selectedMissingItems.includes(item.id);
                    return (
                      <Pressable key={item.id || idx} style={[styles.itemSelectRow, isSel && styles.itemSelectRowSel]} onPress={() => toggleMissingItem(item.id)}>
                        {isSel ? <CheckSquare size={18} color={BRAND} strokeWidth={2} /> : <Square size={18} color={MUTED} strokeWidth={2} />}
                        {item.image
                          ? <Image source={{ uri: item.image }} style={styles.itemSelectThumb} />
                          : <View style={[styles.itemSelectThumb, { backgroundColor: '#F3EDE3', alignItems: 'center', justifyContent: 'center' }]}><Package size={14} color={MUTED} /></View>}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemSelectName} numberOfLines={1}>{item.name}</Text>
                          <Text style={styles.itemSelectMeta}>Qty: {item.quantity ?? 1} · ₱{(item.price ?? 0).toLocaleString()}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              )}

              {/* Unified evidence upload */}
              {needsEvidence && (
                <>
                  {(requirements.description || requirements.itemSelection) && <View style={styles.dividerLine} />}
                  <Text style={styles.fieldLabel}>Upload Evidence</Text>
                  <Text style={styles.fieldHint}>
                    {EVIDENCE_DESCRIPTIONS[effectiveReason as ReturnReason] || 'Upload photos or video as evidence'}
                  </Text>

                  {mediaItems.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
                      {mediaItems.map((m) => (
                        <Pressable key={m.uri} onPress={() => setPreviewItem(m)} style={styles.mediaThumbnail}>
                          {m.type === 'image'
                            ? <Image source={{ uri: m.uri }} style={styles.mediaThumbnailInner} />
                            : <View style={[styles.mediaThumbnailInner, styles.videoThumbBg]}><Video size={26} color="#FFF" strokeWidth={1.5} /><Text style={styles.videoThumbLabel}>Video</Text></View>}
                          <View style={styles.thumbPreviewHint}><ZoomIn size={9} color="#FFF" strokeWidth={2.5} /></View>
                          <Pressable style={styles.thumbRemove} onPress={() => removeMediaItem(m.uri)} hitSlop={6}>
                            <X size={8} color="#FFF" strokeWidth={3} />
                          </Pressable>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {mediaItems.length < MAX_MEDIA_FILES && (
                    <Pressable style={styles.addEvidenceBtn} onPress={showMediaSourcePicker}>
                      <Camera size={18} color={MUTED} strokeWidth={1.5} />
                      <Text style={styles.addEvidenceText}>Add Photo / Video</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {/* ═══ SECTION 3: PREFERRED RESOLUTION ═══ */}
        {effectiveReason !== '' && allowedResolutions.length > 0 && (
          <>
            <View style={styles.sectionHeader}><SectionBadge number={nextSection()} /><Text style={styles.sectionLabel}>PREFERRED RESOLUTION</Text></View>
            {allowedResolutions.length === 1 ? (
              <View style={styles.autoResolutionChip}>
                <RotateCcw size={14} color={BRAND_DARK} strokeWidth={2} />
                <Text style={styles.autoResolutionText}>{RESOLUTION_LABELS[allowedResolutions[0]].label} — {RESOLUTION_LABELS[allowedResolutions[0]].description}</Text>
              </View>
            ) : (
              <View style={styles.solutionRow}>
                {allowedResolutions.map((res) => {
                  const sel = returnType === res;
                  return (
                    <Pressable key={res} style={[styles.solutionCard, sel && styles.solutionCardSel]} onPress={() => setReturnType(res)}>
                      <RotateCcw size={16} color={sel ? BRAND : MUTED} strokeWidth={2} style={{ marginBottom: 4 }} />
                      <Text style={[styles.solutionLabel, sel && { color: BRAND_DARK }]}>{RESOLUTION_LABELS[res].label}</Text>
                      <Text style={styles.solutionDesc}>{RESOLUTION_LABELS[res].description}</Text>
                      {sel && <View style={styles.solutionDot} />}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}

        {/* ═══ SECTION 4: RETURN METHOD ═══ */}
        {showReturnMethodSection && (
          <>
            <View style={styles.sectionHeader}><SectionBadge number={nextSection()} /><Text style={styles.sectionLabel}>RETURN METHOD</Text></View>
            <View style={styles.solutionRow}>
              <Pressable style={[styles.solutionCard, returnMethod === 'pickup' && styles.solutionCardSel]} onPress={() => setReturnMethod(returnMethod === 'pickup' ? '' : 'pickup')}>
                <Home size={18} color={returnMethod === 'pickup' ? BRAND : MUTED} strokeWidth={2} style={{ marginBottom: 4 }} />
                <Text style={[styles.solutionLabel, returnMethod === 'pickup' && { color: BRAND_DARK }]}>Pickup</Text>
                <Text style={styles.solutionDesc}>Courier will collect from your address</Text>
                {returnMethod === 'pickup' && <View style={styles.solutionDot} />}
              </Pressable>
              <Pressable style={[styles.solutionCard, returnMethod === 'self_ship' && styles.solutionCardSel]} onPress={() => setReturnMethod(returnMethod === 'self_ship' ? '' : 'self_ship')}>
                <Truck size={18} color={returnMethod === 'self_ship' ? BRAND : MUTED} strokeWidth={2} style={{ marginBottom: 4 }} />
                <Text style={[styles.solutionLabel, returnMethod === 'self_ship' && { color: BRAND_DARK }]}>Self-Ship</Text>
                <Text style={styles.solutionDesc}>Ship back via J&T Express</Text>
                {returnMethod === 'self_ship' && <View style={styles.solutionDot} />}
              </Pressable>
            </View>

            {/* ─── PICKUP panel ─── */}
            {returnMethod === 'pickup' && (
              <View style={styles.methodDetailCard}>
                <View style={styles.methodStep}>
                  <View style={styles.stepBullet}><Text style={styles.stepBulletText}>1</Text></View>
                  <Text style={styles.stepTitle}>Pickup Address</Text>
                </View>

                <View style={styles.addressBox}>
                  <MapPin size={14} color={BRAND} strokeWidth={2} />
                  <Text style={[styles.addressBoxText, { flex: 1 }]}>
                    {pickupAddress || 'Delivery address not available'}
                  </Text>
                </View>

                <View style={styles.dividerLine} />
                <Text style={styles.processFlowTitle}>How Pickup Works</Text>
                {['Courier will pick up from the delivery address shown above.', 'System books a courier for collection.', 'Courier collects the parcel from your address.', 'System tracks shipment until delivery to seller.'].map((step, i) => (
                  <View key={i} style={styles.processStep}>
                    <View style={styles.processStepNum}><Text style={styles.processStepNumText}>{i + 1}</Text></View>
                    <Text style={styles.processStepText}>{step}</Text>
                  </View>
                ))}
                <View style={styles.ruleBox}>
                  <Text style={styles.ruleTitle}>Important</Text>
                  <Text style={styles.ruleText}>• Pickup is subject to courier availability.</Text>
                  <Text style={styles.ruleText}>• Item must be packed and ready when courier arrives.</Text>
                  <Text style={styles.ruleText}>• Failed pickup attempts require rescheduling.</Text>
                </View>
              </View>
            )}

            {/* ─── SELF-SHIP panel ─── */}
            {returnMethod === 'self_ship' && (
              <View style={styles.methodDetailCard}>
                <View style={styles.methodStep}>
                  <View style={styles.stepBullet}><Text style={styles.stepBulletText}>1</Text></View>
                  <Text style={styles.stepTitle}>Return Address (Seller)</Text>
                </View>

                <View style={styles.sellerDetailCard}>
                  <View style={styles.sellerRow}>
                    <User size={14} color={BRAND} strokeWidth={2} />
                    <Text style={styles.sellerLabel}>Name</Text>
                    <Text style={styles.sellerValue}>{sellerName}</Text>
                  </View>
                  <View style={styles.sellerDivider} />
                  <View style={styles.sellerRow}>
                    <MapPin size={14} color={BRAND} strokeWidth={2} />
                    <Text style={styles.sellerLabel}>Address</Text>
                    <Text style={[styles.sellerValue, { flex: 1 }]}>{sellerAddress}</Text>
                  </View>
                  {sellerPhone ? (
                    <>
                      <View style={styles.sellerDivider} />
                      <View style={styles.sellerRow}>
                        <Phone size={14} color={BRAND} strokeWidth={2} />
                        <Text style={styles.sellerLabel}>Contact</Text>
                        <Text style={styles.sellerValue}>{sellerPhone}</Text>
                      </View>
                    </>
                  ) : null}
                </View>

                <View style={styles.dividerLine} />
                <Text style={styles.processFlowTitle}>How Self-Ship Works</Text>
                {['Review the seller return address above.', 'Ship the item to the seller address.', 'Submit tracking details and proof of shipment from the Return Detail page.', 'System tracks the shipment until delivery.'].map((step, i) => (
                  <View key={i} style={styles.processStep}>
                    <View style={styles.processStepNum}><Text style={styles.processStepNumText}>{i + 1}</Text></View>
                    <Text style={styles.processStepText}>{step}</Text>
                  </View>
                ))}
                <View style={styles.ruleBox}>
                  <Text style={styles.ruleTitle}>Important</Text>
                  <Text style={styles.ruleText}>• You are responsible for arranging and paying for</Text>
                  <Text style={styles.ruleText}>shipment.</Text>
                  <Text style={styles.ruleText}>• A valid tracking number is required for processing.</Text>
                  <Text style={styles.ruleText}>• Failure to provide tracking may delay or void the request.</Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* ═══ REFUND & SUBMIT (inline) ═══ */}
        <View style={styles.inlineFooter}>
          {allowedResolutions.length > 0 && returnType && (
            <View style={styles.refundRow}>
              <View>
                <Text style={styles.refundLabel}>REFUND AMOUNT</Text>
                <Text style={styles.refundSub}>
                  {returnType === 'replacement' ? 'No refund — item replaced' : returnType === 'partial_refund' ? 'Based on selected missing items' : 'Based on original order total'}
                </Text>
              </View>
              <Text style={styles.refundAmount}>{returnType === 'replacement' ? '—' : `₱${refundAmount.toLocaleString()}`}</Text>
            </View>
          )}
          <View style={styles.footerBtns}>
            <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable style={[styles.submitBtn, isSubmitting && { opacity: 0.65 }]} onPress={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
            </Pressable>
          </View>
        </View>

        <View style={{ height: Math.max(insets.bottom, 20) }} />
      </ScrollView>

      {/* ── Media Source Picker Modal (two-layer: fade overlay + slide sheet) ── */}
      <Modal
        visible={showMediaPicker}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => hideMediaPicker()}
      >
        {/* Fading dark overlay */}
        <Animated.View style={[mpStyles.overlay, { opacity: overlayAnim }]} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => hideMediaPicker()} />
        </Animated.View>

        {/* Sliding sheet */}
        <Animated.View style={[mpStyles.sheetWrapper, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={[mpStyles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={mpStyles.handle} />
            <Text style={mpStyles.title}>Add Evidence</Text>
            <View style={mpStyles.options}>
              <Pressable style={mpStyles.option} onPress={() => hideMediaPicker(pickFromCamera)}>
                <View style={mpStyles.optionIcon}><Camera size={22} color={BRAND} strokeWidth={2} /></View>
                <Text style={mpStyles.optionLabel}>Camera</Text>
                <Text style={mpStyles.optionHint}>Photo or video</Text>
              </Pressable>
              <View style={mpStyles.optionDivider} />
              <Pressable style={mpStyles.option} onPress={() => hideMediaPicker(pickFromLibrary)}>
                <View style={mpStyles.optionIcon}><ImagePlus size={22} color={BRAND} strokeWidth={2} /></View>
                <Text style={mpStyles.optionLabel}>Media Library</Text>
                <Text style={mpStyles.optionHint}>Pick photos or videos</Text>
              </Pressable>
            </View>
            <Pressable style={mpStyles.cancelBtn} onPress={() => hideMediaPicker()}>
              <Text style={mpStyles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>

    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  header: { backgroundColor: CARD_BG, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: BORDER },
  headerTitle: { fontSize: 16, fontWeight: '700', color: HEADLINE },
  headerSub: { fontSize: 11, color: MUTED, marginTop: 1 },
  scrollContent: { padding: 16, paddingTop: 20 },

  orderPreviewCard: { flexDirection: 'row', backgroundColor: CARD_BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, gap: 12, marginBottom: 14, alignItems: 'center' },
  orderPreviewImg: { width: 60, height: 60, borderRadius: 10, backgroundColor: '#F3EDE3' },
  orderPreviewName: { fontSize: 13, fontWeight: '600', color: HEADLINE, lineHeight: 18, flex: 1 },
  orderPreviewMore: { fontSize: 11, color: MUTED, marginTop: 2 },
  orderPreviewMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  orderPreviewBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  orderPreviewBadgeText: { fontSize: 10, fontWeight: '600', color: '#15803D' },
  orderPreviewPrice: { fontSize: 13, fontWeight: '700', color: BRAND },

  deadlineBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 18, borderWidth: 1, borderColor: '#FDE68A' },
  deadlineBannerText: { fontSize: 12, color: '#78350F', flex: 1, lineHeight: 17 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 4 },
  sectionBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' },
  sectionBadgeText: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: HEADLINE, letterSpacing: 1.0 },

  card: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 16, paddingHorizontal: 16, paddingVertical: 8 },

  reasonRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  reasonRowSel: { backgroundColor: BRAND_LIGHT, marginHorizontal: -16, paddingHorizontal: 16, marginVertical: 2, borderRadius: 12 },
  divider: { borderBottomWidth: 1, borderBottomColor: '#F0E8DC' },
  reasonIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F5EFE6', alignItems: 'center', justifyContent: 'center' },
  reasonIconWrapSel: { backgroundColor: BRAND_LIGHT },
  reasonLabel: { fontSize: 14, fontWeight: '600', color: HEADLINE },
  reasonDesc: { fontSize: 11, color: MUTED, marginTop: 2, lineHeight: 15 },

  subReasonDropdown: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: '#EEE3D5', overflow: 'hidden', marginBottom: 10, marginHorizontal: -1, marginTop: 10 },
  subReasonFull: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#F0E8DC' },
  subReasonFullSel: { backgroundColor: BRAND_LIGHT },
  subReasonLabel: { fontSize: 13, fontWeight: '600', color: HEADLINE },
  subReasonDesc: { fontSize: 11, color: MUTED, marginTop: 2, lineHeight: 14 },

  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  radioSel: { borderColor: BRAND },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: BRAND },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: BODY, marginBottom: 4, marginTop: 12 },
  fieldHint: { fontSize: 11, color: MUTED, marginBottom: 10 },
  textArea: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, fontSize: 13, color: BODY, minHeight: 80, textAlignVertical: 'top' },
  dividerLine: { height: 1, backgroundColor: '#F0E8DC', marginVertical: 14 },

  itemSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F0E8DC' },
  itemSelectRowSel: { backgroundColor: BRAND_LIGHT, marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 10 },
  itemSelectThumb: { width: 40, height: 40, borderRadius: 8 },
  itemSelectName: { fontSize: 13, fontWeight: '600', color: HEADLINE },
  itemSelectMeta: { fontSize: 11, color: MUTED, marginTop: 2 },

  mediaThumbnail: { width: 80, height: 80, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: BORDER, position: 'relative' },
  mediaThumbnailInner: { width: '100%', height: '100%' },
  videoThumbBg: { backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', gap: 4 },
  videoThumbLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '500' },
  thumbPreviewHint: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 6, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  thumbRemove: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  addEvidenceBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#C8B89A', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 20, backgroundColor: BG, marginBottom: 4 },
  addEvidenceText: { fontSize: 13, color: MUTED, fontWeight: '500' },

  autoResolutionChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND_LIGHT, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A' },
  autoResolutionText: { fontSize: 13, color: BRAND_DARK, fontWeight: '600', flex: 1, lineHeight: 18 },
  solutionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  solutionCard: { flex: 1, backgroundColor: CARD_BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, alignItems: 'flex-start', gap: 4, position: 'relative' },
  solutionCardSel: { borderColor: BRAND, backgroundColor: BRAND_LIGHT, borderWidth: 1.5 },
  solutionLabel: { fontSize: 12, fontWeight: '700', color: HEADLINE },
  solutionDesc: { fontSize: 10, color: MUTED, lineHeight: 14 },
  solutionDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: BRAND },

  methodDetailCard: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 14 },
  methodStep: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stepBullet: { width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND_LIGHT, alignItems: 'center', justifyContent: 'center' },
  stepBulletText: { fontSize: 11, fontWeight: '700', color: BRAND_DARK },
  stepTitle: { fontSize: 13, fontWeight: '700', color: HEADLINE },

  addressBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 14 },
  addressBoxName: { fontSize: 13, fontWeight: '700', color: HEADLINE, marginBottom: 2 },
  addressBoxPhone: { fontSize: 11, color: MUTED, marginBottom: 4 },
  addressBoxText: { fontSize: 12, color: BODY, lineHeight: 18 },

  addAddressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: BRAND_LIGHT, borderRadius: 12, paddingVertical: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A' },
  addAddressBtnText: { fontSize: 13, fontWeight: '600', color: BRAND_DARK },

  scheduleRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  scheduleFieldLabel: { fontSize: 11, fontWeight: '600', color: MUTED, marginBottom: 6 },
  scheduleInput: { backgroundColor: BG, borderRadius: 10, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 12, paddingVertical: 10, fontSize: 12, color: BODY },

  // Seller detail card
  sellerDetailCard: { backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 14 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  sellerLabel: { fontSize: 11, fontWeight: '600', color: MUTED, width: 56 },
  sellerValue: { fontSize: 13, fontWeight: '500', color: HEADLINE },
  sellerDivider: { height: 1, backgroundColor: '#F0E8DC' },

  // J&T fixed chip
  courierFixedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND_LIGHT, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, borderWidth: 1, borderColor: '#FDE68A' },
  courierFixedText: { fontSize: 13, fontWeight: '700', color: BRAND_DARK },

  processFlowTitle: { fontSize: 12, fontWeight: '700', color: HEADLINE, marginBottom: 10 },
  processStep: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
  processStepNum: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#EEE3D5', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  processStepNumText: { fontSize: 10, fontWeight: '700', color: BRAND_DARK },
  processStepText: { fontSize: 12, color: BODY, lineHeight: 18, flex: 1 },

  ruleBox: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#FDE68A', width: '100%' },
  ruleTitle: { fontSize: 12, fontWeight: '700', color: '#92400E', marginBottom: 6 },
  ruleText: { fontSize: 11, color: '#92400E', lineHeight: 17, flexShrink: 1, flexWrap: 'wrap', width: '100%' },

  inlineFooter: { backgroundColor: CARD_BG, borderRadius: 16, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 20, paddingVertical: 20, marginTop: 8 },
  refundRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  refundLabel: { fontSize: 10, fontWeight: '700', color: MUTED, letterSpacing: 0.8 },
  refundSub: { fontSize: 10, color: MUTED, marginTop: 2 },
  refundAmount: { fontSize: 26, fontWeight: '800', color: BRAND },
  footerBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, borderWidth: 1.5, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', backgroundColor: BG },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: BODY },
  submitBtn: { flex: 2, paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND, shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});

// ── Media Source Picker styles ──
const mpStyles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheetWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: { backgroundColor: CARD_BG, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D5C9BA', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 15, fontWeight: '700', color: HEADLINE, textAlign: 'center', marginBottom: 16 },
  options: { backgroundColor: BG, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', marginBottom: 12 },
  option: { paddingVertical: 16, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14 },
  optionDivider: { height: 1, backgroundColor: '#F0E8DC', marginHorizontal: 18 },
  optionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: BRAND_LIGHT, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 14, fontWeight: '600', color: HEADLINE },
  optionHint: { fontSize: 11, color: MUTED, position: 'absolute', right: 18 },
  cancelBtn: { backgroundColor: BG, borderRadius: 14, borderWidth: 1, borderColor: BORDER, paddingVertical: 14, alignItems: 'center', marginBottom: 4 },
  cancelText: { fontSize: 15, fontWeight: '600', color: BODY },
});
