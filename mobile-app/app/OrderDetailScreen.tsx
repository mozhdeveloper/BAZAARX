import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Package, MapPin, CreditCard, Receipt, CheckCircle, MessageCircle, Send, X, Truck, Clock, CheckCircle2, RotateCcw, Tag } from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useOrderStore } from '../src/stores/orderStore';
import { useCartStore } from '../src/stores/cartStore';
import { supabase } from '../src/lib/supabase';
import { useReturnStore } from '../src/stores/returnStore';
import { orderService } from '../src/services/orderService';
import { orderMutationService } from '../src/services/orders/orderMutationService';
import { useAuthStore } from '../src/stores/authStore';
import { safeImageUri } from '../src/utils/imageUtils';
import ReviewModal from '../src/components/ReviewModal';
import { BuyerBottomNav } from '../src/components/BuyerBottomNav';
import { reviewService } from '@/services/reviewService';
import { chatService } from '../src/services/chatService';
import { orderReadService } from '../src/services/orders/orderReadService';
import { usePaymentStore } from '../src/stores/paymentStore';
import { useDeliveryStore } from '../src/stores/deliveryStore';
import type { PaymentTransaction } from '../src/types/payment.types';
import type { DeliveryTrackingResult } from '../src/types/delivery.types';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { order } = route.params;
  
  // Guard clause for invalid order
  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Order not found</Text>
          <Pressable style={styles.emptyButton} onPress={() => navigation.goBack()}>
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const insets = useSafeAreaInsets();
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    sender: string;
    message: string;
    timestamp: Date;
  }>>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView>(null);
  const chatSubscriptionRef = useRef<any>(null);

  // Payment & Delivery state
  const [paymentTx, setPaymentTx] = useState<PaymentTransaction | null>(null);
  const [deliveryTracking, setDeliveryTracking] = useState<DeliveryTrackingResult | null>(null);
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const getTransactionByOrderId = usePaymentStore((s) => s.getTransactionByOrderId);
  const fetchTrackingByOrderId = useDeliveryStore((s) => s.fetchTrackingByOrderId);
  const deliveryStoreTracking = useDeliveryStore((s) => s.tracking);

  // Fetch payment transaction and delivery tracking for this order
  useEffect(() => {
    const realOrderId = (order as any).orderId || order.id;
    getTransactionByOrderId(realOrderId)
      .then((tx) => setPaymentTx(tx))
      .catch(() => { });
    fetchTrackingByOrderId(realOrderId)
      .then(() => { })
      .catch(() => { });
  }, [(order as any).orderId, order.id]);

  useEffect(() => {
    if (deliveryStoreTracking) {
      setDeliveryTracking(deliveryStoreTracking);
    }
  }, [deliveryStoreTracking]);

  // Get seller_id from order items via products
  const getSellerIdFromOrder = useCallback(async (): Promise<string | null> => {
    // First check if sellerInfo is on order object
    if ((order as any).sellerInfo?.id) return (order as any).sellerInfo.id;

    // Otherwise look up via first order item's product
    const firstItem = order.items?.[0];
    if (!firstItem) return null;
    const productId = (firstItem as any).productId || firstItem.id;
    if (!productId) return null;

    const { data } = await supabase
      .from('products')
      .select('seller_id')
      .eq('id', productId)
      .single();
    return data?.seller_id || null;
  }, [order]);

  // Load chat when modal opens
  useEffect(() => {
    if (!showChatModal) {
      // Cleanup subscription when modal closes
      if (chatSubscriptionRef.current) {
        chatSubscriptionRef.current.unsubscribe?.();
        chatSubscriptionRef.current = null;
      }
      return;
    }

    const initChat = async () => {
      setChatLoading(true);
      try {
        const { user } = useAuthStore.getState();
        if (!user?.id) {
          Alert.alert('Error', 'You must be logged in to chat');
          setShowChatModal(false);
          return;
        }

        const sellerId = await getSellerIdFromOrder();
        if (!sellerId) {
          Alert.alert('Error', 'Could not determine seller for this order');
          setShowChatModal(false);
          return;
        }

        const realOrderId = (order as any).orderId || order.id;
        const conversation = await chatService.getOrCreateConversation(user.id, sellerId, realOrderId);
        if (!conversation) {
          Alert.alert('Error', 'Could not start conversation');
          setShowChatModal(false);
          return;
        }

        setConversationId(conversation.id);

        // Load existing messages
        const messages = await chatService.getMessages(conversation.id);
        setChatMessages(messages.map((msg: any) => ({
          id: msg.id,
          sender: msg.sender_type === 'buyer' ? 'buyer' : msg.sender_type === 'system' ? 'system' : 'seller',
          message: msg.content,
          timestamp: new Date(msg.created_at),
        })));

        // Subscribe to real-time new messages
        const subscription = supabase
          .channel(`chat-${conversation.id}`)
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversation.id}`,
          }, (payload: any) => {
            const newMsg = payload.new;
            // Only add if not from current user (to avoid duplicates with optimistic add)
            if (newMsg.sender_id !== user.id) {
              setChatMessages(prev => {
                if (prev.find(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  sender: newMsg.sender_type === 'buyer' ? 'buyer' : newMsg.sender_type === 'system' ? 'system' : 'seller',
                  message: newMsg.content,
                  timestamp: new Date(newMsg.created_at),
                }];
              });
            }
          })
          .subscribe();

        chatSubscriptionRef.current = subscription;

        // Mark messages as read
        chatService.markAsRead(conversation.id, user.id, 'buyer').catch(() => { });
      } catch (error) {
        console.error('[OrderDetail] Error initializing chat:', error);
        Alert.alert('Error', 'Failed to load chat');
      } finally {
        setChatLoading(false);
      }
    };

    initChat();
  }, [showChatModal, getSellerIdFromOrder, order]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatMessages.length > 0 && chatScrollRef.current) {
      setTimeout(() => chatScrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !conversationId) return;

    const { user } = useAuthStore.getState();
    if (!user?.id) return;

    const messageText = chatMessage.trim();
    setChatMessage('');

    // Optimistic add
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      id: tempId,
      sender: 'buyer',
      message: messageText,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, optimisticMsg]);

    try {
      const sent = await chatService.sendMessage(conversationId, user.id, 'buyer', messageText);
      if (sent) {
        // Replace temp message with real one
        setChatMessages(prev => prev.map(m => m.id === tempId ? {
          id: sent.id,
          sender: 'buyer',
          message: sent.content,
          timestamp: new Date(sent.created_at),
        } : m));
      }
    } catch (error) {
      console.error('[OrderDetail] Error sending message:', error);
      // Remove optimistic message on failure
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      Alert.alert('Error', 'Failed to send message');
    }
  };

  const handlePickPhoto = async (source: 'camera' | 'gallery') => {
    try {
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera access is needed to take a proof-of-receipt photo.');
          return;
        }
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          quality: 0.8,
          allowsEditing: true,
        });
        if (!result.canceled) {
          setReceiptPhotos(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Photo library access is needed to upload a receipt photo.');
          return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.8,
          allowsMultipleSelection: true,
          selectionLimit: 5,
        });
        if (!result.canceled) {
          setReceiptPhotos(prev => [...prev, ...result.assets.map(a => a.uri)].slice(0, 5));
        }
      }
    } catch (err) {
      console.error('[OrderDetail] Photo picker error:', err);
      Alert.alert('Error', 'Failed to open photo picker. Please try again.');
    }
  };

  const handleConfirmReceipt = async () => {
    if (receiptPhotos.length === 0) {
      Alert.alert('Photo Required', 'Please take or upload at least one photo as proof of receipt.');
      return;
    }
    setIsSubmittingReceipt(true);
    try {
      const realOrderId = (order as any).orderId || order.id;
      const { user } = useAuthStore.getState();

      // Upload photos to storage
      const timestamp = Date.now();
      const buyerId = user?.id || '';
      const uploadTasks = receiptPhotos.map(async (uri, index) => {
        try {
          let fileData: ArrayBuffer;
          try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            fileData = decode(base64);
          } catch {
            const res = await fetch(uri);
            fileData = await res.arrayBuffer();
          }
          const extMatch = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
          const fileExt = (extMatch?.[1] || 'jpg').toLowerCase();
          const contentType =
            fileExt === 'png' ? 'image/png' :
              fileExt === 'webp' ? 'image/webp' :
                (fileExt === 'heic' || fileExt === 'heif') ? 'image/heic' : 'image/jpeg';
          const suffix = Math.random().toString(36).slice(2, 8);
          const fileName = `${buyerId}/${realOrderId}/receipt-${timestamp}-${index}-${suffix}.${fileExt}`;
          const { error } = await supabase.storage
            .from('review-images')
            .upload(fileName, fileData, { contentType, upsert: false });
          if (error) throw error;
          const { data } = supabase.storage.from('review-images').getPublicUrl(fileName);
          return data.publicUrl;
        } catch (err) {
          console.warn('[OrderDetail] Failed to upload receipt photo:', err);
          return null;
        }
      });
      const uploaded = (await Promise.all(uploadTasks)).filter((u): u is string => Boolean(u));

      await orderMutationService.confirmOrderReceived(realOrderId, buyerId, uploaded.length > 0 ? uploaded : undefined);

      updateOrderStatus(realOrderId, 'delivered');
      setShowReceiptModal(false);
      setReceiptPhotos([]);
      setShowReviewModal(true);
    } catch (e) {
      console.error('[OrderDetail] Error confirming receipt:', e);
      Alert.alert('Error', 'Failed to confirm receipt. Please try again.');
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  const handleMarkAsReceived = () => {
    setReceiptPhotos([]);
    setShowReceiptModal(true);
  };

  const handleSubmitReview = async (
    productId: string,
    orderItemId: string,
    rating: number,
    review: string,
    images: string[] = [],
  ) => {
    const { user } = useAuthStore.getState();
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to submit a review');
      return;
    }

    try {
      // Get the real order UUID (orderId), not order_number
      const realOrderId = (order as any).orderId || order.id;

      // Find item by productId (now correctly passed from ReviewModal)
      const item = (order.items || []).find(i =>
        i && (i.id === orderItemId || (i as any).productId === productId || i.id === productId)
      );
      if (!item) throw new Error('Product not found');

      // Create review with optional image uploads
      const result = await reviewService.submitReviewWithImages({
        product_id: productId,
        buyer_id: user.id,
        order_id: realOrderId,
        order_item_id: orderItemId,
        rating,
        comment: review || null,
        is_verified_purchase: true,
      }, images);

      if (!result) {
        throw new Error('This item has already been reviewed');
      }

      Alert.alert('Success', 'Your review has been submitted.');
    } catch (error: any) {
      console.error('[OrderDetail] Error submitting review:', error);
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    }
  };

  const { user } = useAuthStore();

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      "Are you sure you want to cancel? You won't be charged. You can buy these items again later.",
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              await orderMutationService.cancelOrder({
                orderId: order.id,
                reason: 'Cancelled by buyer',
                cancelledBy: user?.id,
              });

              // Note: Don't call updateOrderStatus here - the database is already updated.
              // The order list will be refreshed by navigation.

              Alert.alert('Order Cancelled', 'Your order has been cancelled.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e: any) {
              console.error('Error cancelling order:', e);
              Alert.alert('Error', e?.message || 'Failed to cancel order. Please try again.');
            }
          }
        }
      ]
    );
  };

  const uiStatus = order.buyerUiStatus || order.status;

  const getStatusColor = () => {
    switch (uiStatus) {
      case 'pending': return '#F59E0B';
      case 'confirmed':
      case 'processing': return COLORS.primary;
      case 'shipped': return '#8B5CF6';
      case 'delivered': return '#22C55E';
      case 'received': return '#3B82F6';
      case 'reviewed': return '#16A34A';
      case 'returned': return '#D97706';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (uiStatus) {
      case 'pending': return 'Order Pending';
      case 'confirmed':
      case 'processing': return 'Being Prepared';
      case 'shipped': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'received': return 'Order Received';
      case 'reviewed': return 'Completed';
      case 'returned': return 'Return/Refund Requested';
      case 'cancelled': return 'Cancelled';
      default: return order.status;
    }
  };

  const getStatusIcon = () => {
    switch (uiStatus) {
      case 'pending': return Clock;
      case 'confirmed':
      case 'processing': return Package;
      case 'shipped': return Truck;
      case 'delivered': return CheckCircle2;
      case 'received': return CheckCircle;
      case 'reviewed': return CheckCircle;
      case 'returned': return RotateCcw;
      case 'cancelled': return X;
      default: return Package;
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Orange Header - BRANDED */}
      <LinearGradient
        colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Soft Parchment Header
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color={COLORS.textHeadline} strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Interactive Status Banner - Hide for cancelled orders */}
        {(() => {
          const uiStatus = order.buyerUiStatus || order.status;
          const isCancelled = uiStatus === 'cancelled';
          
          if (isCancelled) return null;
          
          return (
            <Pressable
              style={[styles.statusBanner, { backgroundColor: getStatusColor() }]}
              onPress={() => navigation.navigate('DeliveryTracking', { order })}
            >
              <View style={styles.statusContent}>
                <View style={styles.statusLeft}>
                  <Text style={styles.statusTitle}>{getStatusText()}</Text>
                  <Text style={styles.tapToTrack}>Tap to Track {'>'}</Text>
                </View>
                <View style={styles.statusIconContainer}>
                  <StatusIcon size={48} color="#FFFFFF" strokeWidth={1.5} />
                </View>
              </View>
            </Pressable>
          );
        })()}

        {/* Status Timeline Card */}
        {(() => {
          const uiStatus = order.buyerUiStatus || order.status;
          const isCancelled = uiStatus === 'cancelled';
          const isShipped = ['shipped', 'delivered', 'received', 'returned', 'reviewed'].includes(uiStatus);
          const isDelivered = ['delivered', 'received', 'returned', 'reviewed'].includes(uiStatus);
          const isReturned = uiStatus === 'returned';
          const isReceived = uiStatus === 'received' || uiStatus === 'reviewed';

          const formatTs = (ts?: string | null) => {
            if (!ts) return null;
            const d = new Date(ts);
            return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
          };

          const steps = isCancelled
            ? [
              { label: 'Order Placed', ts: formatTs(order.createdAt), done: true, icon: CheckCircle2 },
              { label: 'Cancelled', ts: formatTs(order.cancelledAt) || 'Pending', done: true, icon: X, red: true },
            ]
            : [
              { label: 'Order Placed', ts: formatTs(order.createdAt), done: true, icon: CheckCircle2 },
              { label: 'Confirmed', ts: formatTs(order.confirmedAt), done: uiStatus !== 'pending', icon: CheckCircle2 },
              { label: 'Shipped', ts: formatTs(order.shippedAt), done: isShipped, icon: Truck },
              { label: 'Delivered', ts: formatTs(order.deliveredAt), done: isDelivered, icon: CheckCircle2 },
              ...(isReceived ? [{ label: 'Received', ts: formatTs((order as any).receivedAt), done: true, icon: CheckCircle2 }] : []),
              ...(isReturned ? [{ label: 'Return Requested', ts: null, done: true, icon: RotateCcw, amber: true }] : []),
            ];

          const showCancellationReason = isCancelled && (order as any).cancellationReason;

          return (
            <View style={{ backgroundColor: '#FFFFFF', marginHorizontal: 16, marginTop: 12, marginBottom: 16, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' }}>
                  <Clock size={16} color={COLORS.primary} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1a1a1a' }}>Order Timeline</Text>
              </View>
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const dotColor = !step.done ? '#d1d5db' : (step as any).red ? '#ef4444' : (step as any).amber ? COLORS.primary : COLORS.primary;
                const labelColor = !step.done ? '#9ca3af' : (step as any).red ? '#ef4444' : '#1a1a1a';
                return (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                    {/* Dot column */}
                    <View style={{ width: 24, alignItems: 'center' }}>
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: step.done ? dotColor : '#f3f4f6', justifyContent: 'center', alignItems: 'center', borderWidth: step.done ? 0 : 1.5, borderColor: '#e5e7eb' }}>
                        <StepIcon size={11} color={step.done ? '#fff' : '#9ca3af'} strokeWidth={2.5} />
                      </View>
                      {idx < steps.length - 1 && (
                        <View style={{ width: 2, height: 24, backgroundColor: step.done ? COLORS.primary + '60' : '#e5e7eb', marginTop: 2 }} />
                      )}
                    </View>
                    {/* Label column */}
                    <View style={{ flex: 1, paddingLeft: 10, paddingBottom: idx < steps.length - 1 ? 4 : 0 }}>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: labelColor }}>{step.label}</Text>
                      {step.ts ? (
                        <Text style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{step.ts}</Text>
                      ) : !step.done ? (
                        <Text style={{ fontSize: 11, color: '#d1d5db', marginTop: 1 }}>Pending</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
              {showCancellationReason && (
                <View style={{ marginTop: 8, paddingHorizontal: 34, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '500' }}>
                    {(order as any).cancellationReason}
                  </Text>
                </View>
              )}
            </View>
          );
        })()}

        {/* Order Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Package size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Order Items</Text>
          </View>
          {order.items.filter(item => item && item.name).map((item, index) => {
            const displayIndex = order.items.filter(i => i && i.name).indexOf(item);
            return (
              <React.Fragment key={item.id || index}>
                {displayIndex > 0 && <View style={styles.itemDivider} />}
                <View style={styles.itemRow}>
                  <Pressable onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                    <Image
                      source={{ uri: safeImageUri(item.image) }}
                      style={styles.itemImage}
                    />
                  </Pressable>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.selectedVariant && (item.selectedVariant.size || item.selectedVariant.color) && (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                        {item.selectedVariant.size && (
                          <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            {item.selectedVariant.size}
                          </Text>
                        )}
                        {item.selectedVariant.color && (
                          <Text style={{ fontSize: 11, color: '#6b7280', backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            {item.selectedVariant.color}
                          </Text>
                        )}
                      </View>
                    )}
                    <Text style={styles.itemVariant}>
                      {item.quantity} × ₱{(item.price ?? 0).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>₱{((item.price ?? 0) * (item.quantity || 1)).toLocaleString()}</Text>
                </View>
              </React.Fragment>
            );
          })}
        </View>

        {/* Shipping Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <MapPin size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Shipping Address</Text>
          </View>
          {order.shippingAddress && (
            <View style={styles.cardContent}>
              <View style={styles.shippingInfoBlock}>
                <Text style={styles.shippingName}>{order.shippingAddress.name}</Text>
                <Text style={styles.shippingPhone}>{order.shippingAddress.phone}</Text>
                <Text style={styles.shippingAddress}>
                  {order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}
                </Text>
                <Text style={styles.shippingEmail}>{order.shippingAddress.email}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Payment Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <CreditCard size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Payment Details</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#6B7280' }}>Method</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>{order.paymentMethod}</Text>
            </View>
            {paymentTx && (
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Status</Text>
                  <View style={{
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
                    backgroundColor: paymentTx.status === 'paid' ? '#D1FAE5' : paymentTx.status === 'failed' ? '#FEE2E2' : '#FEF3C7',
                  }}>
                    <Text style={{
                      fontSize: 11, fontWeight: '700',
                      color: paymentTx.status === 'paid' ? '#065F46' : paymentTx.status === 'failed' ? '#991B1B' : '#92400E',
                    }}>
                      {paymentTx.status.charAt(0).toUpperCase() + paymentTx.status.slice(1)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Amount</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>₱{paymentTx.amount.toLocaleString()}</Text>
                </View>
                {paymentTx.gatewayPaymentIntentId && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>Transaction ID</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                      {paymentTx.gatewayPaymentIntentId.slice(0, 16)}...
                    </Text>
                  </View>
                )}
                {paymentTx.paidAt && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>Paid On</Text>
                    <Text style={{ fontSize: 13, color: '#1F2937' }}>
                      {new Date(paymentTx.paidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>

        {/* Delivery Tracking Card - Hide for cancelled orders */}
        {deliveryTracking?.booking && uiStatus !== 'cancelled' && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconCircle}>
                <Truck size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.cardTitle}>Delivery Details</Text>
            </View>
            <View style={styles.cardContent}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Courier</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1F2937' }}>{deliveryTracking.booking.courierName}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Tracking #</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                  {deliveryTracking.booking.trackingNumber}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, color: '#6B7280' }}>Status</Text>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
                  backgroundColor: deliveryTracking.booking.status === 'delivered' ? '#D1FAE5' : '#DBEAFE',
                }}>
                  <Text style={{
                    fontSize: 11, fontWeight: '700',
                    color: deliveryTracking.booking.status === 'delivered' ? '#065F46' : '#1E40AF',
                  }}>
                    {deliveryTracking.booking.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Text>
                </View>
              </View>
              {deliveryTracking.booking.estimatedDelivery && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>Est. Delivery</Text>
                  <Text style={{ fontSize: 13, color: '#1F2937' }}>
                    {new Date(deliveryTracking.booking.estimatedDelivery).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Order Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Receipt size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Order Summary</Text>
          </View>
          <View style={styles.cardContent}>
            {/* Show original items total if there's campaign discount */}
            {((order as any).campaignDiscounts && (order as any).campaignDiscounts.length > 0) && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#6B7280' }]}>Original Price</Text>
                  <Text style={[styles.summaryValue, { color: '#6B7280', textDecorationLine: 'line-through' }]}>
                    ₱{(((order as any).subtotal || 0) + ((order as any).campaignDiscounts?.[0]?.discountAmount || 0)).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Tag size={14} color="#DC2626" />
                    <Text style={[styles.summaryLabel, { marginLeft: 4 }]}>Campaign Discount</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: '#DC2626' }]}>
                    -₱{((order as any).campaignDiscounts?.[0]?.discountAmount || 0).toLocaleString()}
                  </Text>
                </View>
              </>
            )}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₱{((order as any).subtotal || 0).toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Fee</Text>
              <Text style={[
                styles.summaryValue,
                order.shippingFee === 0 && styles.freeShipping
              ]}>
                {order.shippingFee === 0 ? 'FREE' : `₱${order.shippingFee.toLocaleString()}`}
              </Text>
            </View>
            {order.voucherInfo && (order.voucherInfo.discountAmount || 0) > 0 && (
              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Tag size={14} color="#10B981" />
                  <Text style={[styles.summaryLabel, { marginLeft: 4 }]}>Voucher</Text>
                  <Text style={[styles.summaryLabel, { marginLeft: 4, color: '#6B7280' }]}>
                    ({order.voucherInfo.code})
                  </Text>
                </View>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  -₱{order.voucherInfo.discountAmount?.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={styles.dividerLine} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₱{order.total.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar - Follows PH e-commerce standards (Shopee/Lazada) */}
      <View style={styles.bottomBar}>
        {/* PENDING: Cancel + Chat (buyer hasn't paid or order awaiting confirmation) */}
        {(order.buyerUiStatus || order.status) === 'pending' && (
          <>
            <Pressable
              onPress={() => setShowChatModal(true)}
              style={[styles.outlineButton, { flex: 1 }]}
            >
              <MessageCircle size={20} color={COLORS.primary} />
              <Text style={styles.outlineButtonText}>Chat</Text>
            </Pressable>
            <Pressable
              onPress={handleCancelOrder}
              style={[styles.solidButton, { flex: 1, backgroundColor: COLORS.primary }]}
            >
              <Text style={styles.solidButtonText}>Cancel Order</Text>
            </Pressable>
          </>
        )}

        {/* PROCESSING / TO SHIP: Chat only (seller is preparing the order) */}
        {(order.buyerUiStatus === 'confirmed' || order.status === 'processing') && (
          <Pressable
            onPress={() => setShowChatModal(true)}
            style={[styles.solidButton, { flex: 1, backgroundColor: COLORS.primary }]}
          >
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.solidButtonText}>Chat with Seller</Text>
          </Pressable>
        )}

        {/* SHIPPED / TO RECEIVE: Chat only — item is in transit, buyer cannot confirm yet */}
        {(order.buyerUiStatus === 'shipped' || (order.status === 'shipped' && order.buyerUiStatus !== 'delivered')) && (
          <Pressable
            onPress={() => setShowChatModal(true)}
            style={[styles.solidButton, { flex: 1, backgroundColor: COLORS.primary }]}
          >
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.solidButtonText}>Chat with Seller</Text>
          </Pressable>
        )}

        {/* DELIVERED: Confirm Received — item has arrived, buyer confirms receipt */}
        {order.buyerUiStatus === 'delivered' && (
          <>
            <Pressable
              onPress={() => setShowChatModal(true)}
              style={[styles.outlineButton, { flex: 1 }]}
            >
              <MessageCircle size={20} color={COLORS.primary} />
              <Text style={styles.outlineButtonText}>Chat</Text>
            </Pressable>
            <Pressable
              onPress={handleMarkAsReceived}
              style={[styles.solidButton, { flex: 1, backgroundColor: '#16A34A' }]}
            >
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.solidButtonText}>Confirm Received</Text>
            </Pressable>
          </>
        )}

        {/* RECEIVED: stacked when Return/Refund visible, side-by-side when not */}
        {order.buyerUiStatus === 'received' && (() => {
          const withinReturnWindow = (Date.now() - new Date((order as any).deliveredAt || (order as any).updatedAt || order.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000;
          const buyAgainAction = () => {
            if (order.items.length > 0) {
              const addItem = useCartStore.getState().addItem;
              Promise.all(order.items.map(item => addItem(item as any, { forceNewItem: true })))
                .then((ids) => {
                  navigation.navigate('MainTabs', {
                    screen: 'Cart',
                    params: { selectedCartItemIds: ids.filter(Boolean) as string[] }
                  });
                });
            }
          };

          // STACKED: Return/Refund visible → Buy Again (top full width), Write Review + Return/Refund below
          if (withinReturnWindow) {
            return (
              <View style={{ flex: 1, gap: 8 }}>
                <Pressable onPress={buyAgainAction} style={[styles.solidButton, { backgroundColor: COLORS.primary }]}>
                  <Text style={styles.solidButtonText}>Buy Again</Text>
                </Pressable>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => setShowReviewModal(true)}
                    style={[styles.outlineButton, { flex: 1, borderColor: '#D97706' }]}
                  >
                    <Text style={[styles.outlineButtonText, { color: '#D97706' }]}>Write Review</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => navigation.navigate('ReturnRequest', { order })}
                    style={[styles.returnButton, { flex: 1 }]}
                  >
                    <RotateCcw size={13} color="#B45309" strokeWidth={3.5} />
                    <Text style={styles.returnButtonText}>Return / Refund</Text>
                  </Pressable>

                </View>
              </View>
            );
          }

          // UNSTACKED: Return/Refund expired → Write Review (left) + Buy Again (right) side by side
          return (
            <>
              <Pressable
                onPress={() => setShowReviewModal(true)}
                style={[styles.outlineButton, { flex: 1, borderColor: '#D97706' }]}
              >
                <Text style={[styles.outlineButtonText, { color: '#D97706' }]}>Write Review</Text>
              </Pressable>
              <Pressable onPress={buyAgainAction} style={[styles.solidButton, { flex: 1, backgroundColor: COLORS.primary }]}>
                <Text style={styles.solidButtonText}>Buy Again</Text>
              </Pressable>
            </>
          );
        })()}

        {/* REVIEWED: Buy Again */}
        {order.buyerUiStatus === 'reviewed' && (
          <Pressable
            onPress={() => {
              if (order.items.length > 0) {
                const addItem = useCartStore.getState().addItem;
                Promise.all(order.items.map(item => addItem(item as any, { forceNewItem: true })))
                  .then((ids) => {
                    navigation.navigate('MainTabs', {
                      screen: 'Cart',
                      params: { selectedCartItemIds: ids.filter(Boolean) as string[] }
                    });
                  });
              }
            }}
            style={[styles.solidButton, { flex: 1, backgroundColor: COLORS.primary }]}
          >
            <Text style={styles.solidButtonText}>Buy Again</Text>
          </Pressable>
        )}
      </View>

      {/* Receipt Photo Modal */}
      <Modal
        visible={showReceiptModal}
        animationType="slide"
        transparent
        onRequestClose={() => !isSubmittingReceipt && setShowReceiptModal(false)}
      >
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptSheet}>
            {/* Header */}
            <View style={styles.receiptHeader}>
              <Text style={styles.receiptTitle}>Confirm Order Received</Text>
              <Pressable
                onPress={() => !isSubmittingReceipt && setShowReceiptModal(false)}
                hitSlop={8}
                disabled={isSubmittingReceipt}
              >
                <X size={22} color="#6B7280" />
              </Pressable>
            </View>
            <Text style={styles.receiptSubtitle}>
              Take or upload a photo as proof that your order has arrived.
            </Text>

            {/* Photo grid */}
            {receiptPhotos.length > 0 && (
              <FlatList
                data={receiptPhotos}
                horizontal
                keyExtractor={(_, i) => String(i)}
                contentContainerStyle={{ gap: 8, paddingBottom: 4, paddingTop: 4 }}
                style={{ marginBottom: 12 }}
                renderItem={({ item, index }) => (
                  <View style={styles.receiptPhotoThumb}>
                    <Image source={{ uri: item }} style={styles.receiptPhotoImg} />
                    <Pressable
                      style={styles.receiptPhotoRemove}
                      onPress={() => setReceiptPhotos(prev => prev.filter((_, i) => i !== index))}
                      hitSlop={4}
                    >
                      <X size={12} color="#FFFFFF" />
                    </Pressable>
                  </View>
                )}
              />
            )}

            {/* Picker buttons */}
            {receiptPhotos.length < 5 && (
              <View style={styles.receiptPickerRow}>
                <Pressable
                  style={styles.receiptPickerBtn}
                  onPress={() => handlePickPhoto('camera')}
                  disabled={isSubmittingReceipt}
                >
                  <Text style={styles.receiptPickerIcon}>📷</Text>
                  <Text style={styles.receiptPickerText}>Take Photo</Text>
                </Pressable>
                <Pressable
                  style={styles.receiptPickerBtn}
                  onPress={() => handlePickPhoto('gallery')}
                  disabled={isSubmittingReceipt}
                >
                  <Text style={styles.receiptPickerIcon}>🖼️</Text>
                  <Text style={styles.receiptPickerText}>Upload from Gallery</Text>
                </Pressable>
              </View>
            )}

            {/* Confirm button */}
            <Pressable
              style={[
                styles.receiptConfirmBtn,
                (receiptPhotos.length === 0 || isSubmittingReceipt) && { opacity: 0.5 },
              ]}
              onPress={handleConfirmReceipt}
              disabled={receiptPhotos.length === 0 || isSubmittingReceipt}
            >
              {isSubmittingReceipt ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : null}
              <Text style={styles.receiptConfirmText}>
                {isSubmittingReceipt ? 'Confirming...' : 'Confirm Receipt'}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      <ReviewModal
        visible={showReviewModal}
        order={order}
        onClose={() => {
          setShowReviewModal(false);
          navigation.goBack();
        }}
        onSubmit={handleSubmitReview}
      />

      {/* Chat Modal */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChatModal(false)}
      >
        <SafeAreaView style={styles.chatModalContainer}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={styles.chatHeader}>
              <Pressable
                onPress={() => setShowChatModal(false)}
                style={styles.closeButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <ArrowLeft size={24} color="#1F2937" />
              </Pressable>
              <View>
                <Text style={styles.chatTitle}>Seller Chat</Text>
                <Text style={styles.chatSubtitle}>
                  {order.transactionId.length > 20
                    ? `Order #TRK-${order.transactionId.slice(0, 8).toUpperCase()}`
                    : `Order #${order.transactionId}`}
                </Text>
              </View>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessages}
              contentContainerStyle={{ padding: 16, gap: 16 }}
            >
              {chatLoading ? (
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={{ color: '#9CA3AF', marginTop: 8 }}>Loading messages...</Text>
                </View>
              ) : chatMessages.length === 0 ? (
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <MessageCircle size={32} color="#D1D5DB" />
                  <Text style={{ color: '#9CA3AF', marginTop: 8 }}>No messages yet. Say hello!</Text>
                </View>
              ) : (
                chatMessages.map((msg) => (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageBubble,
                      msg.sender === 'buyer' ? styles.buyerMessage : styles.sellerMessage,
                      msg.sender === 'system' && styles.systemMessage
                    ]}
                  >
                    <Text style={[
                      styles.messageText,
                      msg.sender === 'buyer' ? styles.buyerMessageText : styles.sellerMessageText,
                      msg.sender === 'system' && styles.systemMessageText
                    ]}>
                      {msg.message}
                    </Text>
                    <Text style={[
                      styles.messageTime,
                      msg.sender === 'buyer' ? styles.buyerMessageTime : styles.sellerMessageTime
                    ]}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                value={chatMessage}
                onChangeText={setChatMessage}
                multiline
              />
              <Pressable
                style={[styles.sendButton, (!chatMessage.trim() || chatLoading) && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!chatMessage.trim() || chatLoading}
              >
                <Send size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // ===== EDGE-TO-EDGE HEADER =====
  headerContainer: {
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 20,
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    padding: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textHeadline, letterSpacing: 0.3 },
  // ===== SCROLL VIEW =====
  scrollView: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  // ===== STATUS BANNER =====
  statusBanner: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  statusTimestamp: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  statusIconContainer: {
    marginLeft: 16,
  },
  // ===== CHAT BUTTON =====
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    gap: 8,
  },
  chatButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  // ===== WHITE CARDS =====
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF3F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706', // Amber standard
    letterSpacing: 0.2,
  },
  cardContent: {
    gap: 6,
  },
  // ===== ORDER ITEMS =====
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 14,
  },
  itemImage: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#F9FAFB',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeadline,
    marginBottom: 6,
    lineHeight: 22,
  },
  itemVariant: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  // ===== SHIPPING ADDRESS =====
  addressName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textHeadline,
    marginBottom: 6,
  },
  addressPhone: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
    marginBottom: 8,
  },
  shippingInfoBlock: {
    gap: 4,
  },
  shippingName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeadline,
  },
  shippingPhone: {
    fontSize: 14,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  shippingAddress: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  shippingEmail: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  tapToTrack: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  addressLine: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  // ===== PAYMENT METHOD =====
  paymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textHeadline,
    textTransform: 'capitalize',
  },
  // ===== ORDER SUMMARY =====
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textHeadline,
  },
  freeShipping: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textHeadline,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 0.3,
  },
  returnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    minHeight: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  // ===== BOTTOM BAR =====
  bottomBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 30,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  receivedButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    gap: 8,
  },
  receivedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // ===== CHAT MODAL =====
  chatModalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textHeadline,
    textAlign: 'center',
  },
  chatSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  chatMessages: {
    flex: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  buyerMessage: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  sellerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 8,
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  buyerMessageText: {
    color: '#FFFFFF',
  },
  sellerMessageText: {
    color: COLORS.textHeadline,
  },
  systemMessageText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  buyerMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  sellerMessageTime: {
    color: COLORS.textMuted,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  closeButton: {
    padding: 12,
    marginLeft: -8, // Compensate for extra padding to keep visual alignment
  },
  returnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  returnStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textHeadline,
  },
  returnDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  outlineButton: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    gap: 8,
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  returnButtonText: {
    color: '#B45309',
    fontSize: 16,
    fontWeight: '600',
  },
  solidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    gap: 8,
  },
  solidButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // ===== RECEIPT PHOTO MODAL =====
  receiptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  receiptSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  receiptSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  receiptPhotoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptPhotoImg: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  receiptPhotoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 99,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  receiptPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  receiptPickerIcon: {
    fontSize: 18,
  },
  receiptPickerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  receiptConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  receiptConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textHeadline,
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
