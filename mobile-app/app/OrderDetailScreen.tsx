import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Package, MapPin, CreditCard, Receipt, CheckCircle, MessageCircle, Send, X, Truck, Clock, CheckCircle2, RotateCcw } from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { useOrderStore } from '../src/stores/orderStore';
import { supabase } from '../src/lib/supabase';
import { useReturnStore } from '../src/stores/returnStore';
import ReviewModal from '../src/components/ReviewModal';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const insets = useSafeAreaInsets();
  const updateOrderStatus = useOrderStore((state) => state.updateOrderStatus);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([
    {
      id: '1',
      sender: 'system',
      message: 'Order confirmed! Your seller will start preparing your items.',
      timestamp: new Date(Date.now() - 7200000),
    },
    {
      id: '2',
      sender: 'seller',
      message: 'Hello! Thank you for your order. We are preparing your items now.',
      timestamp: new Date(Date.now() - 5400000),
    },
  ]);

  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;
    
    const newMessage = {
      id: Date.now().toString(),
      sender: 'buyer',
      message: chatMessage,
      timestamp: new Date(),
    };
    
    setChatMessages([...chatMessages, newMessage]);
    setChatMessage('');
    
    // Simulate seller response
    setTimeout(() => {
      const response = {
        id: (Date.now() + 1).toString(),
        sender: 'seller',
        message: 'Thanks for your message! We will get back to you shortly.',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, response]);
    }, 1000);
  };

  const handleMarkAsReceived = () => {
    Alert.alert(
      'Confirm Receipt',
      'Have you received this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Received',
          onPress: () => {
            updateOrderStatus(order.id, 'delivered');
            setShowReviewModal(true);
          },
        },
      ]
    );
  };

  const handleSubmitReview = (rating: number, review: string) => {
    // In a real app, this would save to a reviews API
    console.log('Review submitted:', { rating, review, orderId: order.id });
    
    Alert.alert('Thank You!', 'Your review has been submitted successfully.', [
      { text: 'OK', onPress: () => {
        setShowReviewModal(false);
        navigation.goBack();
      }},
    ]);
  };

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel? Don\'t worry, you have not been charged for this order. You can easily buy these items again later.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              // 1. Update Supabase
              const { error } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', order.id);

              if (error) throw error;

              // 2. Update Local Store
              updateOrderStatus(order.id, 'cancelled');
              
              Alert.alert('Order Cancelled', 'Your order has been moved to the Cancelled list.', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              console.log('Error canceling order:', e);
              // Fallback
              updateOrderStatus(order.id, 'cancelled');
              Alert.alert('Order Cancelled', 'Your order has been moved to the Cancelled list (Offline Mode).', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = () => {
    switch (order.status) {
      case 'pending': return '#F59E0B';
      case 'processing': return COLORS.primary;
      case 'shipped': return '#8B5CF6';
      case 'delivered': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const getStatusText = () => {
    switch (order.status) {
      case 'pending': return 'Order Pending';
      case 'processing': return 'Being Prepared';
      case 'shipped': return 'In Transit';
      case 'delivered': return 'Delivered';
      default: return order.status;
    }
  };

  const getStatusIcon = () => {
    switch (order.status) {
      case 'pending': return Clock;
      case 'processing': return Package;
      case 'shipped': return Truck;
      case 'delivered': return CheckCircle2;
      default: return Package;
    }
  };

  const StatusIcon = getStatusIcon();

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Orange Header - BRANDED */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10, backgroundColor: COLORS.primary }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerIconButton}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: order.status !== 'delivered' ? 100 : 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Banner Card */}
        <View style={[styles.statusBanner, { backgroundColor: getStatusColor() }]}>
          <View style={styles.statusContent}>
            <View style={styles.statusLeft}>
              <Text style={styles.statusTitle}>{getStatusText()}</Text>
              <Text style={styles.statusTimestamp}>
                {order.status === 'delivered' 
                  ? `Delivered on ${order.deliveryDate}`
                  : `Last updated: ${new Date(order.createdAt).toLocaleDateString()}`
                }
              </Text>
            </View>
            <View style={styles.statusIconContainer}>
              <StatusIcon size={48} color="#FFFFFF" strokeWidth={1.5} />
            </View>
          </View>
        </View>

        {/* Chat Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.chatButton,
            pressed && styles.chatButtonPressed,
          ]}
          onPress={() => setShowChatModal(true)}
        >
          <MessageCircle size={18} color={COLORS.primary} />
          <Text style={styles.chatButtonText}>Chat with Seller</Text>
        </Pressable>

        {/* Order Items Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Package size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Order Items</Text>
          </View>
          {order.items.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <View style={styles.itemDivider} />}
              <View style={styles.itemRow}>
                <Pressable onPress={() => navigation.navigate('ProductDetail', { product: item })}>
                  <Image 
                    source={{ uri: item.image || 'https://via.placeholder.com/60' }}
                    style={styles.itemImage}
                  />
                </Pressable>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemVariant}>
                    {item.quantity} × ₱{(item.price ?? 0).toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.itemPrice}>₱{((item.price ?? 0) * item.quantity).toLocaleString()}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* Shipping Address Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <MapPin size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Shipping Address</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.addressName}>{order.shippingAddress.name}</Text>
            <Text style={styles.addressPhone}>{order.shippingAddress.phone}</Text>
            <Text style={styles.addressLine}>{order.shippingAddress.address}</Text>
            <Text style={styles.addressLine}>
              {order.shippingAddress.city}, {order.shippingAddress.region} {order.shippingAddress.postalCode}
            </Text>
          </View>
        </View>

        {/* Payment Method Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <CreditCard size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Payment Method</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.paymentText}>{order.paymentMethod}</Text>
          </View>
        </View>

        {/* Order Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconCircle}>
              <Receipt size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.cardTitle}>Order Summary</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₱{(order.total - order.shippingFee).toLocaleString()}</Text>
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
            <View style={styles.dividerLine} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₱{order.total.toLocaleString()}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      {(order.status === 'shipped' || order.status === 'delivered' || order.status === 'pending') && (
        <View style={styles.bottomBar}>
          {order.status === 'shipped' && (
            <Pressable onPress={handleMarkAsReceived} style={styles.receivedButton}>
              <CheckCircle size={20} color="#FFFFFF" />
              <Text style={styles.receivedButtonText}>Mark as Received</Text>
            </Pressable>
          )}

          {order.status === 'delivered' && (() => {
              // Safely parse date for "MM/DD/YYYY" format which can be flaky on Android
              const getDeliveryDate = (dateStr: string | undefined): Date => {
                  if (!dateStr) return new Date();
                  const parts = dateStr.split('/');
                  if (parts.length === 3) {
                      return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                  }
                  return new Date(dateStr);
              };

              const deliveryDate = getDeliveryDate(order.deliveryDate);
              const currentDate = new Date();
              
              // Calculate difference in milliseconds
              const diffTime = currentDate.getTime() - deliveryDate.getTime();
              
              // Convert to days (rounding down to be lenient for "same day" or partial days)
              const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
              
              const isReturnable = diffDays <= 7 && diffDays >= 0;

              return (
                <Pressable 
                  onPress={() => {
                    if (isReturnable) navigation.navigate('ReturnRequest', { order });
                    else Alert.alert('Return Window Closed', 'Returns are only available within 7 days of delivery.');
                  }} 
                  style={[
                    styles.receivedButton, 
                    { 
                      backgroundColor: isReturnable ? '#FFFFFF' : '#F3F4F6', 
                      borderWidth: 1, 
                      borderColor: '#D1D5DB', 
                      elevation: 0,
                      opacity: isReturnable ? 1 : 0.8
                    }
                  ]}
                >
                  <RotateCcw size={20} color={isReturnable ? "#374151" : "#9CA3AF"} />
                  <Text style={[styles.receivedButtonText, { color: isReturnable ? '#374151' : '#9CA3AF' }]}>
                    {isReturnable ? 'Return / Refund' : 'Return Window Closed'}
                  </Text>
                </Pressable>
              );
            })()
          }

          {order.status === 'pending' && (
            <Pressable onPress={handleCancelOrder} style={[styles.receivedButton, { backgroundColor: '#FEE2E2', shadowColor: '#EF4444' }]}>
              <X size={20} color="#DC2626" />
              <Text style={[styles.receivedButtonText, { color: '#DC2626' }]}>Cancel Order</Text>
            </Pressable>
          )}
        </View>
      )}

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
              style={styles.chatMessages}
              contentContainerStyle={{ padding: 16, gap: 16 }}
            >
              {chatMessages.map((msg) => (
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
              ))}
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
                style={[styles.sendButton, !chatMessage.trim() && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={!chatMessage.trim()}
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
    backgroundColor: '#F5F5F7',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
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
    color: '#111827',
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
    color: '#111827',
    marginBottom: 6,
    lineHeight: 22,
  },
  itemVariant: {
    fontSize: 13,
    color: '#6B7280',
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
    color: '#111827',
    marginBottom: 6,
  },
  addressPhone: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 8,
  },
  addressLine: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  // ===== PAYMENT METHOD =====
  paymentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
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
    color: '#4B5563',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
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
    color: '#111827',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF5722',
    letterSpacing: 0.3,
  },
  // ===== BOTTOM BAR =====
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
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
    color: '#1F2937',
    textAlign: 'center',
  },
  chatSubtitle: {
    fontSize: 12,
    color: '#6B7280',
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
    color: '#1F2937',
  },
  systemMessageText: {
    color: '#6B7280',
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
    color: '#9CA3AF',
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
    color: '#1F2937',
  },
  returnDate: {
    fontSize: 12,
    color: '#6B7280',
  },
});
