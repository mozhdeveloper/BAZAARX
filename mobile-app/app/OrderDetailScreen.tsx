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
import { ArrowLeft, Package, MapPin, CreditCard, Receipt, CheckCircle, MessageCircle, Send, X, Truck, Clock, CheckCircle2, RotateCcw, Tag, ArrowRight, Store } from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';

// Helper function to format date reliably across platforms
const formatDatePH = (dateString: string | Date | null | undefined): string | null => {
  if (!dateString) return null;
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return null;
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch (error) {
    console.warn('[DateFormat] Error formatting date:', dateString, error);
    return null;
  }
};
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
import AddressFormModal from '../src/components/AddressFormModal';
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
  const { autoOpenAddressModal } = (route.params as any) || {};
  
  // Comprehensive logging of order object
  console.log('[OrderDetail] Full order object keys:', Object.keys(order || {}).join(', '));
  console.log('[OrderDetail] order.paymentMethod:', order?.paymentMethod);
  console.log('[OrderDetail] order.payments:', order?.payments);
  console.log('[OrderDetail] Full order:', JSON.stringify(order, null, 2));
  
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
  const { updateOrderStatus } = useOrderStore();
  const user = useAuthStore((state: any) => state.user);
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
  const [isTrackingError, setIsTrackingError] = useState(false);
  const [isPaymentError, setIsPaymentError] = useState(false);
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [isAddressModalVisible, setIsAddressModalVisible] = useState(false);
  const getTransactionByOrderId = usePaymentStore((s) => s.getTransactionByOrderId);
  const fetchTrackingByOrderId = useDeliveryStore((s) => s.fetchTrackingByOrderId);
  const deliveryStoreTracking = useDeliveryStore((s) => s.tracking);

  // --- BULLETPROOF GRACE PERIOD LOGIC ---
  const resolvedUiStatus = String(order?.buyerUiStatus || order?.status || 'pending').toLowerCase();
  const hasEditedAddress = Array.isArray((order as any).history) && (order as any).history.some((h: any) => h.note === 'Address Updated');

  // Fix iOS/Android Date Parsing Bug from Checkout
  const rawDate = order?.createdAt || (order as any).created_at;
  let parsedDate = new Date().getTime();
  if (rawDate) {
     const d = new Date(rawDate);
     if (!isNaN(d.getTime())) {
         parsedDate = d.getTime();
     } else {
         const safeStr = String(rawDate).replace(' ', 'T'); 
         const d2 = new Date(safeStr);
         if (!isNaN(d2.getTime())) parsedDate = d2.getTime();
     }
  }

  const timeDiff = new Date().getTime() - parsedDate;
  
  // Eligibility: 1-Hour Window + Pending/Processing Status + Not Already Edited
  const isEligibleForEdit = ['pending', 'processing'].includes(resolvedUiStatus) && timeDiff < 3600000 && !hasEditedAddress;


  // BX-09-003 — Shipment details (method, fee, ETA) from order_shipments table
  // Fixed to store array of shipments for multi-seller order support
  const [shipmentInfos, setShipmentInfos] = useState<Array<{
    seller_id: string;
    shipping_method_label: string;
    calculated_fee: number;
    estimated_days_text: string;
    origin_zone: string;
    destination_zone: string;
    tracking_number: string | null;
    status: string;
  }>>([]);

  // Fetch payment transaction and delivery tracking for this order
  useEffect(() => {
    const realOrderId = (order as any).orderId || order.id;
    
    setIsPaymentError(false);
    getTransactionByOrderId(realOrderId)
      .then((tx) => {
        setPaymentTx(tx);
        setIsPaymentError(false);
      })
      .catch(() => {
        setIsPaymentError(true);
      });
    
    setIsTrackingError(false);
    fetchTrackingByOrderId(realOrderId)
      .then(() => {
        setIsTrackingError(false);
      })
      .catch(() => {
        setIsTrackingError(true);
      });

    // BX-09-003 — Fetch ALL shipment records for multi-seller support
    (async () => {
      try {
        const { data } = await supabase
          .from('order_shipments')
          .select('seller_id, shipping_method_label, calculated_fee, estimated_days_text, origin_zone, destination_zone, tracking_number, status')
          .eq('order_id', realOrderId);
        if (data && data.length > 0) setShipmentInfos(data as any);
      } catch (err) {
        // Silently ignore shipment fetch errors
      }
    })();
  }, [(order as any).orderId, order.id]);

  useEffect(() => {
    if (deliveryStoreTracking) {
      setDeliveryTracking(deliveryStoreTracking);
    }
  }, [deliveryStoreTracking]);

  useEffect(() => {
    let isMounted = true;
    if (autoOpenAddressModal && isEligibleForEdit) {
      setTimeout(() => {
        if (isMounted) setIsAddressModalVisible(true);
      }, 600); // Increased delay for smoother transition
    }
    return () => { isMounted = false; };
  }, [autoOpenAddressModal, isEligibleForEdit]);

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

      useOrderStore.setState((state: any) => ({
        orders: state.orders.map((existingOrder: any) =>
          existingOrder.orderId === realOrderId || existingOrder.id === realOrderId
            ? {
                ...existingOrder,
                status: 'delivered',
                buyerUiStatus: 'received',
                isPaid: true,
              }
            : existingOrder,
        ),
      }));
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

  const handleCancelOrder = async () => {
    try {
      console.log('Order Object:', order);

      // 1. Tell Supabase to cancel the order
      await orderMutationService.updateOrderStatus({
        orderId: (order as any).orderId || order.id,
        nextStatus: 'cancelled',
        actorRole: 'buyer',
        note: 'Cancelled by buyer via app'
      });

      // 2. Instantly update the local UI
      await updateOrderStatus((order as any).orderId || order.id, 'cancelled');

      // 3. Notify the user
      Alert.alert('Success', 'Your order has been successfully cancelled.');

    } catch (error) {
      console.error('Cancellation error:', error);
      Alert.alert('Cancellation Failed', 'There was a problem cancelling your order. Please check your connection and try again.');
    }
  };

  const handleSaveNewAddress = async (modalData: any) => {
    // Properly combine the First and Last name from the modal
    const newName = [modalData.firstName, modalData.lastName].filter(Boolean).join(' ').trim();
    
    const formattedAddress = {
      name: newName || modalData.name || modalData.contactPerson || (order.shippingAddress as any)?.name || 'Buyer',
      fullName: newName || modalData.name || modalData.contactPerson || (order.shippingAddress as any)?.name || 'Buyer', // Passes to orderMutationService!
      phone: modalData.phone || modalData.contactNumber || order.shippingAddress?.phone || '',
      address: modalData.street || modalData.address || order.shippingAddress?.address || '',
      city: modalData.city || order.shippingAddress?.city || '',
      region: modalData.province || modalData.region || order.shippingAddress?.region || '',
      postalCode: modalData.zipCode || modalData.postalCode || order.shippingAddress?.postalCode || '',
      barangay: modalData.barangay || (order.shippingAddress as any)?.barangay || '',
    };

    const { editPendingOrder } = useOrderStore.getState();

    // Safely extract the true database UUID.
    // Fallback to order.id just in case it is already a UUID.
    const trueDatabaseId = (order as any).order_id || (order as any).orderId || (order as any).db_id || order.id;

    // Pass the true UUID to the store — let errors propagate to the modal's catch
    await editPendingOrder(trueDatabaseId, { shippingAddress: formattedAddress as any });

    // INSTANT UI UPDATE: Tell React Navigation to update the parameters
    navigation.setParams({
      order: {
        ...order,
        shippingAddress: {
          ...(order.shippingAddress as any),
          ...formattedAddress
        },
        // Instantly inject the audit log into local memory so the Edit button disappears!
        history: [...((order as any).history || []), { note: 'Address Updated' }]
      } as any
    });

    Alert.alert('Success', 'Order shipping address updated!');
    setIsAddressModalVisible(false);
  };

  const uiStatus = order.buyerUiStatus || order.status;

  const getStatusColor = () => {
    switch (uiStatus) {
      case 'pending': return '#F59E0B';
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

  // Safely extract default user address whether it's an array or a single object
  const defaultUserAddress = Array.isArray(user?.addresses) 
    ? user?.addresses.find((a: any) => a.is_default) || user?.addresses[0] 
    : user?.address;

  // Extract the order's CURRENT shipping address safely
  const orderAddr = order.shippingAddress as any || {};
  
  // Smart Name Splitter: Separates the full name so the modal can read it perfectly
  const fullNameStr = orderAddr?.name || orderAddr?.fullName || orderAddr?.contactPerson || defaultUserAddress?.contactPerson || user?.full_name || '';
  const nameParts = fullNameStr.trim().split(/\s+/);
  const derivedFirstName = nameParts[0] || '';
  const derivedLastName = nameParts.slice(1).join(' ');

  const modalInitialData = {
    // Pass the ID securely to prevent duplicating profile addresses
    id: orderAddr?.id || (order as any).address?.id || (order as any).address_id || defaultUserAddress?.id,
    firstName: derivedFirstName,
    lastName: derivedLastName,
    contactPerson: fullNameStr, // Kept as a fallback
    phone: orderAddr?.phone || orderAddr?.contactNumber || defaultUserAddress?.phone || user?.phone || '',
    contactNumber: orderAddr?.phone || orderAddr?.contactNumber || defaultUserAddress?.phone || user?.phone || '',
    street: orderAddr?.address || orderAddr?.street || defaultUserAddress?.street || '',
    city: orderAddr?.city || defaultUserAddress?.city || '',
    province: orderAddr?.region || orderAddr?.province || defaultUserAddress?.province || '',
    barangay: orderAddr?.barangay || defaultUserAddress?.barangay || '',
    zipCode: orderAddr?.postalCode || orderAddr?.zipCode || defaultUserAddress?.zip_code || '',
  };

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
        {/* SECTION 1: ORDER STATUS (Consolidated) */}
        {(() => {
          const uiStatus = order.buyerUiStatus || order.status;
          const isCancelled = uiStatus === 'cancelled';
          const isShipped = ['shipped', 'delivered', 'received', 'returned', 'reviewed'].includes(uiStatus);
          const isDelivered = ['delivered', 'received', 'returned', 'reviewed'].includes(uiStatus);
          const isReturned = uiStatus === 'returned';
          const isReceived = uiStatus === 'received' || uiStatus === 'reviewed';

          if (isCancelled) {
             return (
               <View style={styles.trackingCard}>
                  <View style={[styles.trackingBadge, { backgroundColor: '#FEE2E2' }]}>
                    <Text style={[styles.trackingBadgeText, { color: '#DC2626' }]}>CANCELLED</Text>
                  </View>
                  <Text style={styles.trackingLocationText}>Order ID #{order.id?.slice(0, 8).toUpperCase()}</Text>
                  {(order as any).cancellationReason && (
                    <Text style={[styles.trackingStatusDetail, { color: '#DC2626', marginTop: 8 }]}>
                      {(order as any).cancellationReason}
                    </Text>
                  )}
               </View>
             );
          }

          if (isTrackingError) {
             return (
               <View style={styles.trackingCard}>
                  <Text style={styles.trackingLocationText}>Tracking information is currently unavailable. Please check back later.</Text>
                  <Pressable 
                    style={[styles.solidButton, { marginTop: 16, backgroundColor: COLORS.primary }]}
                    onPress={() => {
                      const realOrderId = (order as any).orderId || order.id;
                      setIsTrackingError(false);
                      fetchTrackingByOrderId(realOrderId)
                        .then(() => setIsTrackingError(false))
                        .catch(() => setIsTrackingError(true));
                    }}
                  >
                    <Text style={styles.solidButtonText}>Tap to Retry</Text>
                  </Pressable>
               </View>
             );
          }

          const latestEvent = deliveryTracking?.events?.[0];
          const originCity = deliveryTracking?.booking?.pickupAddress?.city || 'Origin';
          const destCity = deliveryTracking?.booking?.deliveryAddress?.city || order.shippingAddress?.city || 'Destination';
          const orderIdStr = (order as any).transactionId || (order as any).orderId || order.id?.slice(0, 8).toUpperCase();
          
          let progress = 0;
          if (uiStatus === 'pending') progress = 0.1;
          else if (uiStatus === 'processing') progress = 0.3;
          else if (uiStatus === 'shipped') progress = 0.6;
          else if (['delivered', 'received', 'reviewed'].includes(uiStatus)) progress = 1;

          const formatEventTime = (ts?: string | null) => {
            if (!ts) return '';
            const d = new Date(ts);
            return d.toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
          };

          const formatTs = (ts?: string | null) => {
            if (!ts) return null;
            const d = new Date(ts);
            return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          };

          const steps = [
              { label: 'Order Placed', ts: formatTs(order.createdAt), done: true, icon: CheckCircle2 },
              { label: 'Confirmed', ts: formatTs(order.confirmedAt), done: uiStatus !== 'pending', icon: CheckCircle2 },
              { label: 'Shipped', ts: formatTs(order.shippedAt), done: isShipped, icon: Truck },
              { label: 'Delivered', ts: formatTs(order.deliveredAt), done: isDelivered, icon: CheckCircle2 },
          ];

          return (
            <View style={styles.trackingCard}>
              <Pressable onPress={() => navigation.navigate('DeliveryTracking', { order })}>
                <View style={styles.trackingBadge}>
                  <Text style={styles.trackingBadgeText}>{getStatusText().toUpperCase() || 'IN TRANSIT'}</Text>
                </View>

                <View style={styles.trackingLocationRow}>
                  <Text style={styles.trackingLocationText}>{originCity}</Text>
                  <ArrowRight size={20} color="#F59E0B" style={{ marginHorizontal: 8 }} />
                  <Text style={styles.trackingLocationText}>{destCity}</Text>
                </View>

                <Text style={styles.trackingOrderId}>Order ID #{orderIdStr}</Text>

                <View style={styles.trackingProgressContainer}>
                  <View style={[styles.trackingProgressBar, { width: `${progress * 100}%` }]} />
                </View>

                <View style={styles.trackingFooter}>
                  <Text style={styles.trackingStatusDetail}>
                    {(!deliveryTracking?.events || deliveryTracking.events.length === 0) && uiStatus === 'processing' ? 'Preparing shipment' : latestEvent?.description || getStatusText()}
                  </Text>
                  <Text style={styles.trackingTimestamp}>
                    {formatEventTime(latestEvent?.eventAt || order.createdAt)}
                  </Text>
                </View>
              </Pressable>

              <View style={[styles.sectionDivider, { backgroundColor: '#FDE68A' }]} />

              {/* Compact Timeline integrated */}
              <View style={{ gap: 12 }}>
                <Text style={styles.miniHeader}>Status History</Text>
                {steps.filter(s => s.done).reverse().slice(0, 3).map((step, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <step.icon size={14} color={COLORS.primary} />
                    <View style={{ flex: 1 }}>
                       <Text style={{ fontSize: 13, color: '#78350F', fontWeight: '500' }}>{step.label}</Text>
                       {step.ts && <Text style={{ fontSize: 11, color: '#A8A29E' }}>{step.ts}</Text>}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

        {/* SECTION 2: LOGISTICS & FULFILLMENT (Consolidated) */}
        <View style={styles.consolidatedCard}>
          <Text style={styles.cardSectionHeader}>Shipping & Delivery</Text>
          
         {/* Shipping Address Sub-section */}
          {(() => {
            // Smart Fallback: If coming from checkout, order.shippingAddress might be null, so we pull from the raw DB or user profile.
            const displayAddr = {
              name: order?.shippingAddress?.name || (order as any)?.shipping_address?.name || defaultUserAddress?.contactPerson || user?.full_name || 'Buyer',
              phone: order?.shippingAddress?.phone || (order as any)?.shipping_address?.phone || defaultUserAddress?.phone || user?.phone || '',
              address: order?.shippingAddress?.address || (order as any)?.shipping_address?.address || defaultUserAddress?.street || '',
              city: order?.shippingAddress?.city || (order as any)?.shipping_address?.city || defaultUserAddress?.city || '',
              region: order?.shippingAddress?.region || (order as any)?.shipping_address?.province || defaultUserAddress?.province || ''
            };

            return (
              <View style={{ marginBottom: 16 }}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.metaLabel}>Recipient</Text>
                  {isEligibleForEdit ? (
                     <Pressable onPress={() => setIsAddressModalVisible(true)}>
                      <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600' }}>Edit</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => setIsAddressModalVisible(true)}>
                      <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: '600' }}>View Details</Text>
                    </Pressable>
                  )}
                </View>
                <Text style={styles.primaryInfo}>{displayAddr.name}</Text>
                <Text style={styles.secondaryInfo}>{displayAddr.phone}</Text>
                <Text style={styles.secondaryInfo}>
                  {displayAddr.address}{displayAddr.city ? `, ${displayAddr.city}` : ''}{displayAddr.region ? `, ${displayAddr.region}` : ''}
                </Text>
              </View>
            );
          })()}

          {/* BX-09-003 — Shipping Method & ETA from order_shipments */}
          {shipmentInfos.length > 0 && (
            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16, marginBottom: deliveryTracking?.booking ? 0 : 0 }}>
              {shipmentInfos.map((shipment, idx) => (
                <View key={idx} style={idx > 0 ? { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' } : undefined}>
                  <Text style={styles.metaLabel}>Shipping Method</Text>
                  <Text style={styles.primaryInfo}>{shipment.shipping_method_label}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <View>
                      <Text style={styles.metaLabel}>Estimated Delivery</Text>
                      <Text style={[styles.primaryInfo, { color: COLORS.primary }]}>{shipment.estimated_days_text}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.metaLabel}>Shipping Fee</Text>
                      <Text style={styles.primaryInfo}>
                        {shipment.calculated_fee === 0 ? 'FREE' : `\u20b1${shipment.calculated_fee.toLocaleString()}`}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {shipment.origin_zone} \u2192 {shipment.destination_zone}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Delivery Details Sub-section */}
          {deliveryTracking?.booking && deliveryTracking.booking.trackingNumber && (
            <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16 }}>
               <Text style={styles.metaLabel}>Courier Information</Text>
               <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={styles.primaryInfo}>{deliveryTracking.booking.courierName}</Text>
                    <Text style={[styles.secondaryInfo, { color: COLORS.primary, fontWeight: '700' }]}>
                      {deliveryTracking.booking.trackingNumber}
                    </Text>
                  </View>
                  {deliveryTracking.booking.estimatedDelivery && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.metaLabel}>Estimated Delivery</Text>
                      <Text style={styles.primaryInfo}>
                        {new Date(deliveryTracking.booking.estimatedDelivery).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
               </View>
            </View>
          )}
        </View>

        {/* SECTION 3: ITEMS & PRICING (Consolidated) */}
        <View style={styles.consolidatedCard}>
          <Text style={styles.cardSectionHeader}>Items & Payment</Text>
          
          <Pressable 
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 }}
            onPress={() => navigation.navigate('StoreDetail', { store: { id: (order as any).sellerInfo?.id || order.items[0]?.sellerId, name: (order as any).sellerInfo?.store_name || order.items[0]?.seller, rating: 4.8, verified: false, image: 'https://via.placeholder.com/150' } })}
          >
            <Store size={20} color={COLORS.primary} />
            <Text style={[styles.primaryInfo, { fontSize: 14 }]}>{(order as any).sellerInfo?.store_name || order.items[0]?.seller || 'Shop'}</Text>
          </Pressable>
          
          {isPaymentError ? (
            <View style={{ marginVertical: 16 }}>
              <Text style={[styles.secondaryInfo, { color: '#DC2626', marginBottom: 12 }]}>
                Payment information is currently unavailable. Please check back later.
              </Text>
              <Pressable 
                style={[styles.solidButton, { marginTop: 8, backgroundColor: COLORS.primary }]}
                onPress={() => {
                  const realOrderId = (order as any).orderId || order.id;
                  setIsPaymentError(false);
                  getTransactionByOrderId(realOrderId)
                    .then((tx) => {
                      setPaymentTx(tx);
                      setIsPaymentError(false);
                    })
                    .catch(() => {
                      setIsPaymentError(true);
                    });
                }}
              >
                <Text style={styles.solidButtonText}>Tap to Retry</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ gap: 16, marginBottom: 20 }}>
                {order.items.filter(item => item && item.name).map((item, index) => (
                  <View key={item.id || index}>
                    <Pressable 
                      style={styles.compactItemRow}
                      onPress={() => navigation.navigate('ProductDetail', { product: item as any })}
                    >
                      <Image source={{ uri: safeImageUri(item.image) }} style={styles.compactItemImage} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.compactItemName} numberOfLines={1}>{item.name}</Text>
                        {(item as any).selectedVariant && ((item as any).selectedVariant.option1Value || (item as any).selectedVariant.option2Value || (item as any).selectedVariant.size || (item as any).selectedVariant.color) && (
                          <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                            {(item as any).selectedVariant.option1Value || (item as any).selectedVariant.size || (item as any).selectedVariant.color || 'Standard'}
                          </Text>
                        )}
                        {(item as any).selectedVariant && (
                          <Text style={[styles.metaLabel, { marginBottom: 4, marginTop: 4 }]}>
                            {(item as any).selectedVariant.option1Value ? `${(item as any).selectedVariant.option1Label || 'Option'}: ${(item as any).selectedVariant.option1Value}` : ''}
                            {(item as any).selectedVariant.option1Value && (item as any).selectedVariant.option2Value ? ' • ' : ''}
                            {(item as any).selectedVariant.option2Value ? `${(item as any).selectedVariant.option2Label || 'Option'}: ${(item as any).selectedVariant.option2Value}` : ''}
                            {!((item as any).selectedVariant.option1Value || (item as any).selectedVariant.option2Value) && (item as any).selectedVariant.size ? (item as any).selectedVariant.size : ''}
                            {!((item as any).selectedVariant.option1Value || (item as any).selectedVariant.option2Value) && !((item as any).selectedVariant.size) && (item as any).selectedVariant.color ? (item as any).selectedVariant.color : ''}
                          </Text>
                        )}
                        <Text style={styles.metaLabel}>{item.quantity} x ₱{item.price?.toLocaleString()}</Text>
                      </View>
                      <Text style={styles.compactItemPrice}>₱{((item.price || 0) * item.quantity).toLocaleString()}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 16, gap: 12 }}>
                 {/* Payment Method - with proper extraction and label mapping */}
                 {(() => {
                   const rawPaymentMethod = order.paymentMethod;
                   console.log('[OrderDetail] Raw paymentMethod:', rawPaymentMethod, 'Type:', typeof rawPaymentMethod);
                   
                   const getPaymentMethod = (): string => {
                     if (!rawPaymentMethod) return 'Unknown';
                     
                     if (typeof rawPaymentMethod === 'string') {
                       const pm = rawPaymentMethod.toLowerCase().trim();
                       if (pm === 'cod' || pm === 'cash on delivery') return 'Cash on Delivery';
                       if (pm === 'gcash') return 'GCash';
                       if (pm === 'card') return 'Card';
                       if (pm === 'paymongo') return 'PayMongo';
                       return rawPaymentMethod;
                     }
                     const type = (rawPaymentMethod as any)?.type?.toLowerCase();
                     if (type === 'cod') return 'Cash on Delivery';
                     if (type === 'gcash') return 'GCash';
                     if (type === 'card') return 'Card';
                     if (type === 'paymongo') return 'PayMongo';
                     return type || 'Unknown';
                   };
                   
                   const paymentMethod = getPaymentMethod();
                   const isCOD = paymentMethod === 'Cash on Delivery' || 
                                 (typeof rawPaymentMethod === 'string' && (rawPaymentMethod.toLowerCase().trim() === 'cod' || rawPaymentMethod.toLowerCase().trim() === 'cash on delivery'));
                   
                   console.log('[OrderDetail] Payment Method Result:', paymentMethod, 'isCOD:', isCOD);
                   
                   return (
                     <>
                       <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                         <Text style={styles.metaLabel}>Payment Method</Text>
                         <Text style={styles.primaryInfo}>{paymentMethod}</Text>
                       </View>
                       
                       {/* COD Payment Instruction Message - Only show when order is processing, confirmed, or shipped (not yet delivered) */}
                       {isCOD && order.buyerUiStatus !== 'delivered' && order.status !== 'delivered' && (() => {
                         const estimatedDelivery = deliveryTracking?.booking?.estimatedDelivery || order.estimatedDelivery;
                         const formattedDeadline = formatDatePH(estimatedDelivery);
                         
                         console.log('[OrderDetail COD] Payment Method:', paymentMethod, 'isCOD:', isCOD, 'estimatedDelivery:', estimatedDelivery, 'formatted:', formattedDeadline);
                         
                         return (
                           <View style={{ backgroundColor: '#FFFBF0', borderLeftWidth: 4, borderLeftColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, gap: 6, marginTop: 8 }}>
                             <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400E' }}>💳 Payment on Delivery</Text>
                             <Text style={{ fontSize: 12, color: '#7C2D12', lineHeight: 16 }}>
                               You'll pay the full amount to the delivery driver when they arrive. Please have the exact amount ready.
                             </Text>
                             {formattedDeadline && (
                               <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
                                 Estimated Payment Due: {formattedDeadline}
                               </Text>
                             )}
                             {!formattedDeadline && (
                               <Text style={{ fontSize: 11, color: '#D97706', fontStyle: 'italic' }}>
                                 Delivery date will be updated when J&T booking is confirmed
                               </Text>
                             )}
                           </View>
                         );
                       })()}
                     </>
                   );
                 })()}
                 
                 <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal</Text>
                    <Text style={styles.summaryValue}>₱{(order as any).subtotal?.toLocaleString()}</Text>
                 </View>
                 
                 {/* Per-seller Shipping Breakdown */}
                 {shipmentInfos.length > 0 ? (
                   <View style={{ gap: 12 }}>
                     {shipmentInfos.map((shipment, idx) => (
                       <View key={idx} style={{ gap: 8 }}>
                         {/* Seller shipping method and fee */}
                         <View style={styles.summaryRow}>
                           <View style={{ flex: 1 }}>
                             <Text style={styles.summaryLabel}>{shipment.shipping_method_label}</Text>
                             <Text style={[styles.metaLabel, { marginTop: 2, fontSize: 12 }]}>
                               Est: {shipment.estimated_days_text}
                             </Text>
                           </View>
                           <Text style={styles.summaryValue}>₱{shipment.calculated_fee.toLocaleString()}</Text>
                         </View>
                       </View>
                     ))}
                   </View>
                 ) : (
                   <View style={styles.summaryRow}>
                     <Text style={styles.summaryLabel}>Shipping</Text>
                     <Text style={styles.summaryValue}>{order.shippingFee === 0 ? 'FREE' : `₱${order.shippingFee.toLocaleString()}`}</Text>
                   </View>
                 )}
                 {order.voucherInfo && (
                    <View style={styles.summaryRow}>
                       <Text style={[styles.summaryLabel, { color: '#10B981' }]}>Voucher ({order.voucherInfo.code})</Text>
                       <Text style={[styles.summaryValue, { color: '#10B981' }]}>-₱{order.voucherInfo.discountAmount?.toLocaleString()}</Text>
                    </View>
                 )}

                 <View style={[styles.totalRow, { marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' }]}>
                    <Text style={styles.totalLabel}>Total Amount</Text>
                    <Text style={styles.totalValue}>₱{order.total.toLocaleString()}</Text>
                 </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom Action Bar - Follows PH e-commerce standards (Shopee/Lazada) */}
      <View style={styles.bottomBar}>
        
        {/* PENDING: Cancel + Chat */}
        {resolvedUiStatus === 'pending' && (
          <>
            <Pressable
              onPress={() =>
                Alert.alert(
                  'Cancel Order',
                  'Are you sure you want to cancel this order?',
                  [
                    { text: 'No, keep it', style: 'cancel' },
                    { text: 'Yes, cancel', style: 'destructive', onPress: handleCancelOrder },
                  ]
                )
              }
              style={[styles.outlineButton, { flex: 1 }]}
            >
              <Text style={styles.outlineButtonText}>Cancel Order</Text>
            </Pressable>
            <Pressable onPress={() => setShowChatModal(true)} style={[styles.solidButton, { flex: 1, backgroundColor: COLORS.primary }]}>
              <MessageCircle size={20} color="#FFFFFF" />
              <Text style={styles.solidButtonText}>Chat with Seller</Text>
            </Pressable>
          </>
        )}

        {/* PROCESSING / TO SHIP: Chat only (cancellation locked) */}
        {resolvedUiStatus === 'processing' && (
          <Pressable onPress={() => setShowChatModal(true)} style={[styles.solidButton, { flex: 1, backgroundColor: COLORS.primary }]}>
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.solidButtonText}>Chat with Seller</Text>
          </Pressable>
        )}

        {/* SHIPPED / TO RECEIVE: Chat only — item is in transit, buyer cannot confirm yet */}
        {resolvedUiStatus === 'shipped' && (
          <Pressable onPress={() => setShowChatModal(true)} style={[styles.solidButton, { flex: 1, backgroundColor: COLORS.primary }]}>
            <MessageCircle size={20} color="#FFFFFF" />
            <Text style={styles.solidButtonText}>Chat with Seller</Text>
          </Pressable>
        )}

        {/* DELIVERED: Confirm Received — item has arrived, buyer confirms receipt */}
        {resolvedUiStatus === 'delivered' && (
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
          const withinReturnWindow = (Date.now() - new Date((order as any).receivedAt || (order as any).deliveredAt || (order as any).updatedAt || order.createdAt).getTime()) <= 7 * 24 * 60 * 60 * 1000;
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

      <AddressFormModal 
        visible={isAddressModalVisible} 
        onClose={() => setIsAddressModalVisible(false)} 
        onSaved={handleSaveNewAddress} 
        initialData={modalInitialData}
        userId={user?.id}
        context="buyer"
        readOnly={!isEligibleForEdit}
        lockName={true} // Strict Mode: First & Last name are permanently locked post-checkout
        isOrderEdit={true} // Tells the modal this is a quick-fill, NOT a profile save!
      />

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
  // ===== CONSOLIDATED CARDS (WHITE & GRAY) =====
  consolidatedCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardSectionHeader: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  metaLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  primaryInfo: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  secondaryInfo: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '400',
  },
  miniHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#7C2D12',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  // ===== COMPACT ITEMS =====
  compactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactItemImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#FFF6E5',
  },
  compactItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  compactItemPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  // ===== TRACKING CARD STYLES =====
  trackingCard: {
    backgroundColor: '#FFFBF0',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trackingBadge: {
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  trackingBadgeText: {
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trackingLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  trackingLocationText: {
    color: '#7C2D12',
    fontSize: 22,
    fontWeight: '700',
  },
  trackingOrderId: {
    color: '#A8A29E',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 24,
  },
  trackingProgressContainer: {
    height: 10,
    backgroundColor: '#FFF6E5',
    borderRadius: 5,
    width: '100%',
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  trackingProgressBar: {
    height: '100%',
    backgroundColor: '#FB8C00',
    borderRadius: 5,
  },
  trackingFooter: {
    gap: 4,
  },
  trackingStatusDetail: {
    color: '#78350F',
    fontSize: 14,
    fontWeight: '500',
  },
  trackingTimestamp: {
    color: '#EA580C',
    fontSize: 15,
    fontWeight: '700',
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
