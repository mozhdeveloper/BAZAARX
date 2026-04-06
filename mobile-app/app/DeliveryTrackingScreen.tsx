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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Warehouse, Home, Truck, CheckCircle, Package, Plane } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useOrderStore } from '../src/stores/orderStore';
import { useDeliveryStore } from '../src/stores/deliveryStore';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';
import type { DeliveryTrackingResult } from '../src/types/delivery.types';

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

const { width } = Dimensions.get('window');

export default function DeliveryTrackingScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const insets = useSafeAreaInsets();
  const [timeline, setTimeline] = useState<OrderStatusEntry[]>([]);
  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryTrackingResult | null>(null);
  const fetchTrackingByOrderId = useDeliveryStore((s) => s.fetchTrackingByOrderId);
  const deliveryStoreTracking = useDeliveryStore((s) => s.tracking);

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
              console.log(`[DeliveryTracking] Bucket "${newBucket}" already filled, updating existing entry`);
              const updated = [...prev];
              updated[existingBucketIndex] = newEntry;
              return updated.sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
            }

            // Bucket not filled - add new entry
            console.log(`[DeliveryTracking] Adding new bucket "${newBucket}"`);
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
          const bucketMap = new Map<string, OrderStatusEntry>();
          for (const item of combined) {
            const bucket = getStatusBucket(item.status);
            if (bucket) {
              // If bucket exists, keep the one with the latest created_at
              const existing = bucketMap.get(bucket);
              if (!existing || new Date(item.created_at).getTime() > new Date(existing.created_at).getTime()) {
                bucketMap.set(bucket, item);
              }
            } else {
              // Unknown bucket - keep as is with ID as key
              bucketMap.set(item.id, item);
            }
          }

          const unique = Array.from(bucketMap.values());
          return unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        });

        // Check if already delivered
        if (data.some(item => item.status.toLowerCase().includes('delivered'))) {
          // Maybe show delivered state immediately
        }
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

  // Debug: Log timeline with bucket info
  useEffect(() => {
    console.log('[DeliveryTrackingScreen] Timeline Map:', timeline.map((item, index) => ({
      id: item.id,
      status: item.status,
      bucket: getStatusBucket(item.status),
      description: item.description,
      created_at: item.created_at,
      location: item.location,
      index,
      isLast: index === timeline.length - 1,
    })));
  }, [timeline]);


  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Soft Amber Header */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <View style={styles.headerContent}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: COLORS.textHeadline }]}>Track Order</Text>
            <Text style={[styles.headerSubtitle, { color: COLORS.textPrimary }]}>#{order.transactionId}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Courier Info Card */}
        {deliveryInfo?.booking && (
          <View style={[styles.deliveryCard, { marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                <Truck size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#1F2937' }}>{deliveryInfo.booking.courierName}</Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>{deliveryInfo.booking.serviceType.replace('_', ' ').toUpperCase()}</Text>
              </View>
              <View style={{
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
                backgroundColor: deliveryInfo.booking.status === 'delivered' ? '#D1FAE5' : '#DBEAFE',
              }}>
                <Text style={{
                  fontSize: 11, fontWeight: '700',
                  color: deliveryInfo.booking.status === 'delivered' ? '#065F46' : '#1E40AF',
                }}>
                  {deliveryInfo.booking.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Text>
              </View>
            </View>
            {deliveryInfo.booking.trackingNumber && !isCancelled && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Tracking #</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>{deliveryInfo.booking.trackingNumber}</Text>
              </View>
            )}
            {deliveryInfo.booking.estimatedDelivery && !isCancelled && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Est. Delivery</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>
                  {new Date(deliveryInfo.booking.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Delivery Estimate & Visual Journey Card */}
        <View style={styles.deliveryCard}>
          {isDelivered ? (
            // Delivered State: Show Proof of Delivery
            <>
              <View style={styles.deliveredHeader}>
                <Text style={styles.deliveredTitle}>Item Delivered</Text>
              </View>

              <View style={styles.proofSection}>
                <Text style={styles.proofLabel}>Proof of Delivery:</Text>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=600&h=400&fit=crop' }}
                  style={styles.proofImage}
                  resizeMode="cover"
                />
                <Text style={styles.proofCaption}>Photo captured by driver at delivery.</Text>
              </View>
            </>
          ) : isCancelled ? (
            // Cancelled State: Show cancellation message
            <View style={styles.estimateSection}>
              <Text style={[styles.estimateLabel, { color: '#DC2626' }]}>Order Cancelled</Text>
              <Text style={[styles.estimateDate, { color: '#6B7280' }]}>No delivery will be made</Text>
            </View>
          ) : (
            <View style={styles.estimateSection}>
              <Text style={styles.estimateLabel}>Estimated Delivery</Text>
              <Text style={styles.estimateDate}>{order.scheduledDate || 'Calculating...'}</Text>
            </View>
          )}
        </View>

        {/* Dynamic Delivery Timeline Card */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Delivery Timeline</Text>
          {timeline.length === 0 ? (
            <Text style={{ color: '#6B7280', textAlign: 'center' }}>Loading tracking info...</Text>
          ) : (
            timeline.map((item, index) => {
              const isLast = index === timeline.length - 1;
              const StatusIcon = getStatusIcon(item.status);
              const isCancelledItem = item.status.toLowerCase().includes('cancelled');

              return (
                <View key={item.id || index} style={styles.timelineItem}>
                  {/* Left Column (Icon & Line) */}
                  <View style={styles.timelineLeft}>
                    {/* Icon Circle */}
                    {isLast ? (
                      <Animated.View
                        style={[
                          styles.currentStepRing,
                          { transform: [{ scale: pulseAnim }] },
                        ]}
                      >
                        <View style={[styles.currentStepCenter, isCancelledItem && { backgroundColor: '#EF4444' }]}>
                          <StatusIcon size={16} color="#FFFFFF" strokeWidth={2.5} />
                        </View>
                      </Animated.View>
                    ) : (
                      <View style={[styles.completedStep, isCancelledItem && { backgroundColor: '#EF4444' }]}>
                        <CheckCircle size={20} color="#FFFFFF" strokeWidth={3} fill={isCancelledItem ? '#EF4444' : COLORS.primary} />
                      </View>
                    )}

                    {/* Connecting Line */}
                    {index < timeline.length - 1 && (
                      <View style={[styles.timelineLine, isCancelledItem ? { backgroundColor: '#EF4444' } : styles.timelineLineActive]} />
                    )}
                  </View>

                  {/* Right Column (Content) */}
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
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Redirect Popup - Package Arrived */}
      <Modal
        visible={showRedirectPopup}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRedirectPopup(false)}
      >
        <View style={styles.popupOverlay}>
          <View style={styles.popupContainer}>
            {/* Green Checkmark Icon */}
            <View style={styles.checkmarkCircle}>
              <CheckCircle size={64} color="#10B981" strokeWidth={2.5} />
            </View>

            {/* Title */}
            <Text style={styles.popupTitle}>Package Arrived!</Text>

            {/* Body */}
            <Text style={styles.popupBody}>
              Your order has been delivered successfully. Please confirm receipt in your orders page.
            </Text>

            {/* Go to To-Receive Button */}
            <Pressable
              style={({ pressed }) => [
                styles.popupButton,
                pressed && styles.popupButtonPressed
              ]}
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
    backgroundColor: COLORS.background,
  },

  // ===== EDGE-TO-EDGE ORANGE HEADER =====
  header: {
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    fontWeight: '500',
  },

  // ===== SCROLL VIEW =====
  scrollView: {
    flex: 1,
  },

  // ===== DELIVERY ESTIMATE & JOURNEY CARD =====
  deliveryCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  estimateSection: {
    marginBottom: 0,
  },
  estimateLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 6,
  },
  estimateDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.3,
  },

  // ===== DELIVERED STATE =====
  deliveredHeader: {
    marginBottom: 24,
  },
  deliveredTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 0.3,
  },
  proofSection: {
    marginTop: 8,
  },
  proofLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 12,
  },
  proofImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
  },
  proofCaption: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'center',
  },

  // ===== ENHANCED VERTICAL TIMELINE CARD =====
  timelineCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 32,
  },

  // Completed Step: Solid orange circle with white tick
  completedStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Current Step: Larger glowing orange ring with solid center
  currentStepRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  currentStepCenter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Timeline Connecting Lines
  timelineLine: {
    flex: 1,
    width: 3,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  timelineLineActive: {
    backgroundColor: COLORS.primary,
  },

  timelineRight: {
    flex: 1,
    paddingBottom: 24,
  },
  timelineStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  timelineStepTitleCurrent: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  timelineStepTitleCompleted: {
    color: '#374151',
    fontWeight: '600',
  },
  timelineStepTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 2,
  },
  timelineDescription: {
    fontSize: 13,
    color: '#6B7280',
  },

  // ===== POPUP MODAL =====
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
