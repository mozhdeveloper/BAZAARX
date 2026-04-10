import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Animated,
  Image,
  Modal,
  Platform,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Warehouse, Home, Truck, CheckCircle, Package, Plane, MapPin, Phone, MessageCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDeliveryStore } from '../src/stores/deliveryStore';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';
import type { DeliveryTrackingResult } from '../src/types/delivery.types';
import OrderTrackingMap from '../src/components/delivery/OrderTrackingMap';
import { STATIC_CHECKPOINTS } from '../src/data/delivery/static-checkpoints';
import type { Checkpoint } from '../src/data/delivery/static-checkpoints';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryTracking'>;

interface OrderStatusEntry {
  id: string;
  status: string;
  description?: string;
  created_at: string;
  location?: string;
}

// Status bucket mapping - groups similar statuses into buckets
const STATUS_BUCKETS: Record<string, string[]> = {
  'Order Placed': ['placed', 'pending', 'confirmed'],
  'Processing': ['processing', 'preparing', 'ready_to_ship'],
  'Shipped': ['shipped', 'dispatched', 'in_transit'],
  'Out for Delivery': ['out_for_delivery', 'out_for_delivery', 'with_courier'],
  'Delivered': ['delivered', 'received', 'completed'],
  'Cancelled': ['cancelled', 'canceled'],
};

// Helper function to get the bucket name for a status
const getStatusBucket = (status: string): string | null => {
  const normalizedStatus = status.toLowerCase().replace(/[_\s]+/g, '_');
  for (const [bucketName, keywords] of Object.entries(STATUS_BUCKETS)) {
    if (keywords.some(keyword => normalizedStatus.includes(keyword))) {
      return bucketName;
    }
  }
  return null;
};

const { width, height } = Dimensions.get('window');
const BOTTOM_CARD_MIN_HEIGHT = height * 0.42;

export default function DeliveryTrackingScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const insets = useSafeAreaInsets();
  const [timeline, setTimeline] = useState<OrderStatusEntry[]>([]);
  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryTrackingResult | null>(null);
  const fetchTrackingByOrderId = useDeliveryStore((s) => s.fetchTrackingByOrderId);
  const deliveryStoreTracking = useDeliveryStore((s) => s.tracking);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const cardTranslateY = useRef(new Animated.Value(0)).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Determine cancellation status at component level for use in render
  const uiStatus = order.buyerUiStatus || order.status;
  const isCancelled = uiStatus === 'cancelled';

  useEffect(() => {
    // Pulsing animation for current step
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    initializeTimeline();

    // Fetch delivery booking/tracking from deliveryStore
    const orderUuid = order.orderId || order.id;
    fetchTrackingByOrderId(orderUuid).catch(() => { });

    if (isSupabaseConfigured()) {
      fetchTimelineHistory();

      const orderUuid = order.orderId || order.id;
      const subscription = supabase
        .channel(`order_status_${orderUuid}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter: `order_id=eq.${orderUuid}`
        }, (payload) => {
          console.log('New status update:', payload);

          const newEntry: OrderStatusEntry = {
            id: payload.new.id,
            status: payload.new.status,
            description: payload.new.description,
            created_at: payload.new.created_at,
            location: payload.new.location
          };

          // Get the bucket for this status
          const newBucket = getStatusBucket(payload.new.status);

          setTimeline(prev => {
            // If delivered, show popup
            if (payload.new.status.toLowerCase().includes('delivered')) {
              setShowRedirectPopup(true);
            }

            // If no bucket found, just add it (unknown status)
            if (!newBucket) {
              return [...prev, newEntry].sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }

            // Check if this bucket is already filled
            const existingBucketIndex = prev.findIndex(item => {
              const itemBucket = getStatusBucket(item.status);
              return itemBucket === newBucket;
            });

            if (existingBucketIndex !== -1) {
              // Bucket already filled - update existing entry instead of adding new
              const updated = [...prev];
              updated[existingBucketIndex] = newEntry;
              return updated.sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }

            // Bucket not filled - add new entry
            return [...prev, newEntry].sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [order.id, order.orderId]);

  useEffect(() => {
    if (deliveryStoreTracking) {
      setDeliveryInfo(deliveryStoreTracking);
    }
  }, [deliveryStoreTracking]);

  const initializeTimeline = () => {
    // Fail-safe initialization: Hardcode the first node as "Order Placed"
    const initialNode: OrderStatusEntry = {
      id: 'initial_placed',
      status: 'Order Placed',
      description: 'Your order has been successfully placed.',
      created_at: order.createdAt || new Date().toISOString(),
    };
    setTimeline([initialNode]);
  };

  const fetchTimelineHistory = async () => {
    try {
      const orderUuid = order.orderId || order.id;

      // Check if order is cancelled - if so, simplify timeline
      const uiStatus = order.buyerUiStatus || order.status;
      const isCancelled = uiStatus === 'cancelled';

      // For cancelled orders, fetch cancellation info and show simplified timeline
      if (isCancelled) {
        const { data: cancellationData } = await supabase
          .from('order_cancellations')
          .select('*')
          .eq('order_id', orderUuid)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Build simplified timeline for cancelled orders
        const cancelledNode: OrderStatusEntry = {
          id: 'cancelled',
          status: 'Order Cancelled',
          description: cancellationData?.reason || 'Order was cancelled',
          created_at: cancellationData?.cancelled_at || cancellationData?.created_at || new Date().toISOString(),
        };

        setTimeline(prev => [
          ...prev.filter(entry => entry.id !== 'cancelled'),
          cancelledNode,
        ]);
        return;
      }

      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderUuid)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Merge with initial node, removing duplicate buckets
        setTimeline(prev => {
          const combined = [...prev, ...data];

          // Remove duplicate buckets - keep only the latest entry for each bucket
          const bucketMap = Object.create(null);
          for (const item of combined) {
            const bucket = getStatusBucket(item.status);
            if (bucket) {
              const existing = bucketMap[bucket];
              if (!existing || new Date(item.created_at).getTime() > new Date(existing.created_at).getTime()) {
                bucketMap[bucket] = item;
              }
            } else {
              bucketMap[item.id] = item;
            }
          }

          const unique = Object.values(bucketMap) as OrderStatusEntry[];
          return unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });
      }
    } catch (err) {
      console.error('Error fetching timeline:', err);
    }
  };

  const handleGoToToReceive = () => {
    setShowRedirectPopup(false);
    navigation.navigate('Orders', {
      initialTab: 'shipped'
    });
  };

  const getStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('placed')) return Package;
    if (s.includes('cancelled') || s.includes('cancel')) return Package;
    if (s.includes('sorting') || s.includes('overseas')) return Plane;
    if (s.includes('warehouse') || s.includes('hub')) return Warehouse;
    if (s.includes('out') || s.includes('delivery')) return Truck;
    if (s.includes('received') || s.includes('delivered') || s.includes('completed')) return Home;
    return Package; // Default
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
  };

  const isDelivered = timeline.some(t => t.status.toLowerCase().includes('delivered') || t.status.toLowerCase().includes('received'));
  const currentStatusIndex = timeline.length - 1;

  // Determine which checkpoint route to use based on order status
  const getCheckpointRoute = () => {
    // Phase 2: Replace with real data from database
    if (isCancelled) return null;
    return STATIC_CHECKPOINTS.metro_manila;
  };

  // Handle marker press on map
  const handleMarkerPress = (checkpoint: Checkpoint) => {
    setSelectedCheckpoint(checkpoint);
    console.log('[DeliveryTrackingScreen] Marker pressed:', checkpoint.label);
  };

  const checkpointRoute = getCheckpointRoute();

  // Debug: Log timeline with bucket info
  useEffect(() => {
    console.log('[DeliveryTrackingScreen] Timeline:', timeline.map((item, index) => ({
      id: item.id, status: item.status, bucket: getStatusBucket(item.status), index,
    })));
  }, [timeline]);

  // Get the current status label for the top card
  const currentStatusLabel = timeline.length > 0 ? timeline[timeline.length - 1].status : 'Loading...';
  const currentStatusBucket = getStatusBucket(currentStatusLabel);

  const toggleCard = () => {
    const toValue = isCardCollapsed ? 0 : BOTTOM_CARD_MIN_HEIGHT - 100;
    Animated.spring(cardTranslateY, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    setIsCardCollapsed(!isCardCollapsed);
  };

  return (
    <View style={styles.container}>

      {/* ── LAYER 1: Full-screen background map ── */}
      {!isCancelled && checkpointRoute ? (
        <View style={StyleSheet.absoluteFill}>
          <OrderTrackingMap
            origin={checkpointRoute.origin}
            destination={checkpointRoute.destination}
            checkpoints={checkpointRoute.checkpoints}
            currentStep={currentStatusIndex}
            showCourierMarker={false}
            onMarkerPress={handleMarkerPress}
            height={height}
          />
        </View>
      ) : (
        // Fallback background for cancelled orders
        <LinearGradient
          colors={['#F3F4F6', '#E5E7EB']}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* ── LAYER 2: Top gradient scrim so the header is legible ── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.1)', 'transparent']}
        style={[styles.topScrim, { height: insets.top + 100 }]}
        pointerEvents="none"
      />

      {/* ── LAYER 3: Floating Header ── */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerIconBtn}>
          <ArrowLeft size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>

        <Text style={styles.headerTitle}>Tracking</Text>

        <Pressable style={styles.headerIconBtn}>
          <MapPin size={20} color="#FFFFFF" strokeWidth={2.5} />
        </Pressable>
      </View>

      {/* ── LAYER 4: Bottom Details Sheet ── */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            paddingBottom: insets.bottom + 16,
            transform: [{ translateY: cardTranslateY }]
          }
        ]}
      >
        {/* ── Toggle Handle Button ── */}
        <Pressable
          onPress={toggleCard}
          style={styles.toggleHandle}
          hitSlop={{ top: 20, bottom: 40, left: 20, right: 20 }}
        >
          <View style={styles.handleBar} />
        </Pressable>

        {/* ── Order Number Row ── */}
        <View style={styles.orderRow}>
          <View>
            <Text style={styles.orderLabel}>Order Number</Text>
            <Text style={styles.orderNumber}>#{order.transactionId || order.orderId || order.id?.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.distanceChip}>
            <MapPin size={14} color={COLORS.primary} />
            <Text style={styles.distanceText}>{isCancelled ? 'Cancelled' : (currentStatusBucket || currentStatusLabel)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Scrollable Details ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
          style={styles.scrollArea}
        >
          {/* ── Courier Info Row ── */}
          {deliveryInfo?.booking ? (
            <View style={styles.courierRow}>
              {/* Avatar */}
              <View style={styles.courierAvatar}>
                <Truck size={22} color={COLORS.primary} strokeWidth={2} />
              </View>

              <View style={styles.courierInfo}>
                <Text style={styles.courierName}>{deliveryInfo.booking.courierName}</Text>
                <Text style={styles.courierRole}>{deliveryInfo.booking.serviceType.replace(/_/g, ' ').toUpperCase()}</Text>
              </View>

              <View style={styles.courierActions}>
                <Pressable style={styles.actionBtnOutline}>
                  <MessageCircle size={18} color={COLORS.primary} strokeWidth={2} />
                </Pressable>
                <Pressable style={styles.actionBtnFilled}>
                  <Phone size={18} color="#FFFFFF" strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.courierRow}>
              <View style={styles.courierAvatar}>
                <Truck size={22} color={COLORS.primary} strokeWidth={2} />
              </View>
              <View style={styles.courierInfo}>
                <Text style={styles.courierName}>Courier</Text>
                <Text style={styles.courierRole}>STANDARD DELIVERY</Text>
              </View>
            </View>
          )}

          {/* ── Info Items ── */}
          <View style={styles.infoSection}>
            {/* Address */}
            <View style={styles.infoItem}>
              <View style={styles.infoIconWrap}>
                <MapPin size={16} color={COLORS.primary} strokeWidth={2} />
              </View>
              <View style={styles.infoVertLine} />
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>Delivery address</Text>
                <Text style={styles.infoValue} numberOfLines={2}>
                  {deliveryInfo?.booking?.deliveryAddress
                    ? `${(deliveryInfo.booking.deliveryAddress as any).city || ''}, ${(deliveryInfo.booking.deliveryAddress as any).province || ''}`
                    : 'Your address'}
                </Text>
              </View>
            </View>

            {/* ETA / Estimated Delivery */}
            <View style={[styles.infoItem, { marginBottom: 0 }]}>
              <View style={styles.infoIconWrap}>
                <Package size={16} color={COLORS.primary} strokeWidth={2} />
              </View>
              <View style={styles.infoTextWrap}>
                <Text style={styles.infoLabel}>
                  {isCancelled ? 'Status' : isDelivered ? 'Delivered on' : 'Estimated delivery'}
                </Text>
                <Text style={styles.infoValue}>
                  {isCancelled
                    ? 'Order was cancelled'
                    : isDelivered
                      ? 'Package delivered'
                      : deliveryInfo?.booking?.estimatedDelivery
                        ? new Date(deliveryInfo.booking.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : order.scheduledDate || 'Calculating...'}
                </Text>
              </View>
            </View>

            {/* Tracking Number if available */}
            {deliveryInfo?.booking?.trackingNumber && !isCancelled && (
              <View style={[styles.infoItem, { marginBottom: 0, marginTop: 12 }]}>
                <View style={styles.infoIconWrap}>
                  <Home size={16} color={COLORS.primary} strokeWidth={2} />
                </View>
                <View style={styles.infoTextWrap}>
                  <Text style={styles.infoLabel}>Tracking number</Text>
                  <Text style={[styles.infoValue, { color: COLORS.primary, fontWeight: '700' }]}>
                    {deliveryInfo.booking.trackingNumber}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* ── Proof of Delivery (if Delivered) ── */}
          {isDelivered && (
            <View style={styles.proofCard}>
              <Text style={styles.proofLabel}>Proof of Delivery</Text>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=600&h=400&fit=crop' }}
                style={styles.proofImage}
                resizeMode="cover"
              />
              <Text style={styles.proofCaption}>Photo captured by driver at delivery.</Text>
            </View>
          )}

          {/* ── Delivery Timeline ── */}
          <View style={styles.timelineSection}>
            <Text style={styles.timelineTitle}>Delivery Timeline</Text>
            {timeline.length === 0 ? (
              <Text style={{ color: '#6B7280', textAlign: 'center', paddingVertical: 16 }}>Loading tracking info...</Text>
            ) : (
              timeline.map((item, index) => {
                const isLast = index === timeline.length - 1;
                const StatusIcon = getStatusIcon(item.status);
                const isCancelledItem = item.status.toLowerCase().includes('cancelled');

                return (
                  <View key={item.id || index} style={styles.timelineItem}>
                    {/* Left Column */}
                    <View style={styles.timelineLeft}>
                      {isLast ? (
                        <Animated.View
                          style={[
                            styles.currentStepRing,
                            isCancelledItem && { backgroundColor: '#EF4444', shadowColor: '#EF4444' },
                            { transform: [{ scale: pulseAnim }] },
                          ]}
                        >
                          <View style={[styles.currentStepCenter, isCancelledItem && { backgroundColor: '#EF4444' }]}>
                            <StatusIcon size={14} color="#FFFFFF" strokeWidth={2.5} />
                          </View>
                        </Animated.View>
                      ) : (
                        <View style={[styles.completedStep, isCancelledItem && { backgroundColor: '#EF4444' }]}>
                          <CheckCircle size={18} color="#FFFFFF" strokeWidth={3} fill={isCancelledItem ? '#EF4444' : COLORS.primary} />
                        </View>
                      )}
                      {index < timeline.length - 1 && (
                        <View style={[styles.timelineLine, isCancelledItem ? { backgroundColor: '#EF4444' } : styles.timelineLineActive]} />
                      )}
                    </View>

                    {/* Right Column */}
                    <View style={styles.timelineRight}>
                      <Text
                        style={[
                          styles.timelineStepTitle,
                          isLast ? styles.timelineStepTitleCurrent : styles.timelineStepTitleCompleted,
                          isCancelledItem && { color: '#EF4444' },
                        ]}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace(/_/g, ' ')}
                      </Text>
                      <Text style={styles.timelineStepTime}>{formatDate(item.created_at)}</Text>
                      {item.description && (
                        <Text style={styles.timelineDescription}>{item.description}</Text>
                      )}
                      {item.location && (
                        <Text style={styles.timelineLocation}>📍 {item.location}</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* ── Package Arrived Popup ── */}
      <Modal
        visible={showRedirectPopup}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRedirectPopup(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            <View style={styles.checkmarkCircle}>
              <CheckCircle size={64} color="#10B981" strokeWidth={2.5} />
            </View>
            <Text style={styles.popupTitle}>Package Arrived!</Text>
            <Text style={styles.popupBody}>
              Your order has been delivered successfully. Please confirm receipt in your orders page.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.popupButton, pressed && styles.popupButtonPressed]}
              onPress={handleGoToToReceive}
            >
              <Text style={styles.popupButtonText}>Go to To-Receive</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8EDF2',
  },

  // ── TOP GRADIENT SCRIM ──
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },

  // ── FLOATING HEADER ──
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // ── BOTTOM SHEET ──
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    minHeight: BOTTOM_CARD_MIN_HEIGHT,
    maxHeight: BOTTOM_CARD_MIN_HEIGHT + 60,
    paddingTop: 10,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
  },

  toggleHandle: {
    alignSelf: 'center',
    paddingTop: 2,
    paddingBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
  },

  // ── ORDER ROW ──
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  orderNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: 0.5,
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },

  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: 14,
  },

  scrollArea: {
    flex: 1,
  },

  // ── COURIER ROW ──
  courierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  courierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierInfo: {
    flex: 1,
  },
  courierName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  courierRole: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  courierActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnOutline: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnFilled: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── INFO SECTION ──
  infoSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 2,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  infoVertLine: {
    position: 'absolute',
    left: 14,
    top: 34,
    width: 2,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  infoTextWrap: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  // ── PROOF OF DELIVERY ──
  proofCard: {
    marginBottom: 16,
  },
  proofLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 10,
  },
  proofImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  proofCaption: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── TIMELINE ──
  timelineSection: {
    paddingBottom: 8,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 14,
    width: 30,
  },
  completedStep: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentStepRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  currentStepCenter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E5E7EB',
    marginVertical: 6,
  },
  timelineLineActive: {
    backgroundColor: COLORS.primary,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  timelineStepTitleCurrent: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  timelineStepTitleCompleted: {
    color: '#374151',
    fontWeight: '600',
  },
  timelineStepTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  timelineDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginTop: 2,
  },
  timelineLocation: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // ── POPUP ──
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  checkmarkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  popupBody: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  popupButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  popupButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  popupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
