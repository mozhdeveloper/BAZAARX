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
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Warehouse, Home, Truck, CheckCircle, Package, Clock, Plane, MapPin } from 'lucide-react-native';
import { useOrderStore } from '../src/stores/orderStore';
import { useAuthStore } from '../src/stores/authStore';
import { GuestLoginModal } from '../src/components/GuestLoginModal';
import { COLORS } from '../src/constants/theme';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';

type Props = NativeStackScreenProps<RootStackParamList, 'DeliveryTracking'>;

const { width } = Dimensions.get('window');

// Enhanced delivery statuses matching the requirements
const DELIVERY_STATUSES = [
  { id: 1, title: 'Order Placed', time: 'Dec 14, 10:30 AM', icon: Package },
  { id: 2, title: 'Departed China Sorting Center', time: 'Dec 14, 11:00 AM', icon: Plane },
  { id: 3, title: 'Arrived at Manila Logistics Hub', time: 'Dec 15, 9:15 AM', icon: Warehouse },
  { id: 4, title: 'Out for Delivery', time: '', icon: Truck },
  { id: 5, title: 'Successfully Received', time: '', icon: Home },
];

export default function DeliveryTrackingScreen({ route, navigation }: Props) {
  const { order } = route.params;
  const insets = useSafeAreaInsets();
  const { updateOrderStatus } = useOrderStore();
  const { isGuest } = useAuthStore();

  if (isGuest) {
      return (
          <View style={styles.container}>
            {/* Edge-to-Edge Orange Header */}
            <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
                <View style={styles.headerContent}>
                <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                    <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
                </Pressable>
                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Track Order</Text>
                </View>
                <View style={{ width: 40 }} />
                </View>
            </View>
            <GuestLoginModal
                visible={true}
                onClose={() => navigation.navigate('MainTabs', { screen: 'Home' })}
                message="Sign up to track this order."
                hideCloseButton={true}
                cancelText="Go back to Home"
            />
          </View>
      );
  }
  
  // Phase state management
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0); // Start from Order Placed
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDelivered, setIsDelivered] = useState(false);
  const [showRedirectPopup, setShowRedirectPopup] = useState(false);
  const simulationInterval = useRef<NodeJS.Timeout | null>(null);
  
  const progressAnim = useRef(new Animated.Value(0)).current; // Start at 0%
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Calculate progress (0 to 1)
  const getProgress = () => {
    return currentStatusIndex / (DELIVERY_STATUSES.length - 1);
  };

  useEffect(() => {
    // Animate progress bar
    Animated.spring(progressAnim, {
      toValue: getProgress(),
      useNativeDriver: false,
      friction: 8,
    }).start();
  }, [currentStatusIndex]);

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

  const startSimulation = () => {
    if (isSimulating) return;
    
    setIsSimulating(true);
    setCurrentStatusIndex(0); // Start from Order Placed
    setIsDelivered(false);
    setShowRedirectPopup(false);
    
    simulationInterval.current = setInterval(() => {
      setCurrentStatusIndex((prev) => {
        if (prev >= DELIVERY_STATUSES.length - 1) {
          if (simulationInterval.current) {
            clearInterval(simulationInterval.current);
          }
          setIsSimulating(false);
          setIsDelivered(true);
          // Update order status to 'shipped' so it appears in To Receive tab
          updateOrderStatus(order.id, 'shipped');
          // Show redirect popup instead of going to proof directly
          setTimeout(() => setShowRedirectPopup(true), 500);
          return prev;
        }
        return prev + 1;
      });
    }, 2000); // Advance every 2 seconds
  };

  const stopSimulation = () => {
    if (simulationInterval.current) {
      clearInterval(simulationInterval.current);
    }
    setIsSimulating(false);
  };

  const handleGoToToReceive = () => {
    setShowRedirectPopup(false);
    navigation.navigate('MainTabs', { 
      screen: 'Orders',
      params: { initialTab: 'toReceive' }
    });
  };

  useEffect(() => {
    return () => {
      if (simulationInterval.current) {
        clearInterval(simulationInterval.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Edge-to-Edge Orange Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.headerContent}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Track Order</Text>
            <Text style={styles.headerSubtitle}>#{order.transactionId}</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
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
          ) : (
            // In-Transit State: Show Journey Progress
            <>
              {/* Estimate Section */}
              <View style={styles.estimateSection}>
                <Text style={styles.estimateLabel}>Estimated Delivery</Text>
                <Text style={styles.estimateDate}>{order.scheduledDate || 'Dec 16, 2024'}</Text>
              </View>

              {/* Three-Stage Horizontal Progress */}
              <View style={styles.journeyContainer}>
            {/* Node Icons Row */}
            <View style={styles.nodesRow}>
              {/* Node 1: Overseas */}
              <View style={styles.nodeWrapper}>
                <View style={[styles.nodeCircle, currentStatusIndex >= 1 && styles.nodeCircleActive]}>
                  <Plane size={20} color={currentStatusIndex >= 1 ? '#FFFFFF' : '#9CA3AF'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nodeLabel, currentStatusIndex >= 1 && styles.nodeLabelActive]}>
                  Overseas{'\n'}Sorting Ctr
                </Text>
              </View>

              {/* Node 2: Warehouse */}
              <View style={styles.nodeWrapper}>
                <View style={[styles.nodeCircle, currentStatusIndex >= 2 && styles.nodeCircleActive]}>
                  <Warehouse size={20} color={currentStatusIndex >= 2 ? '#FFFFFF' : '#9CA3AF'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nodeLabel, currentStatusIndex >= 2 && styles.nodeLabelActive]}>
                  Manila{'\n'}Warehouse
                </Text>
              </View>

              {/* Node 3: Destination */}
              <View style={styles.nodeWrapper}>
                <View style={[styles.nodeCircle, currentStatusIndex >= 4 && styles.nodeCircleActive]}>
                  <Home size={20} color={currentStatusIndex >= 4 ? '#FFFFFF' : '#9CA3AF'} strokeWidth={2.5} />
                </View>
                <Text style={[styles.nodeLabel, currentStatusIndex >= 4 && styles.nodeLabelActive]}>
                  Ready for{'\n'}Delivery
                </Text>
              </View>
            </View>

            {/* Progress Bar Container */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressTrack}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>

              {/* Truck Icon on Progress */}
              <Animated.View
                style={[
                  styles.truckContainer,
                  {
                    left: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              >
                <View style={styles.truckIconCircle}>
                  <Truck size={18} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              </Animated.View>
            </View>
          </View>
            </>
          )}
        </View>

        {/* Enhanced Delivery Timeline Card */}
        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Delivery Timeline</Text>
          
          {DELIVERY_STATUSES.map((status, index) => {
            const isCompleted = index < currentStatusIndex;
            const isCurrent = index === currentStatusIndex;
            const isFuture = index > currentStatusIndex;
            const isLast = index === DELIVERY_STATUSES.length - 1;
            const StatusIcon = status.icon;

            return (
              <View key={status.id} style={styles.timelineItem}>
                {/* Left Column (Icon & Line) */}
                <View style={styles.timelineLeft}>
                  {/* Icon Circle */}
                  {isCurrent ? (
                    <Animated.View
                      style={[
                        styles.currentStepRing,
                        { transform: [{ scale: pulseAnim }] },
                      ]}
                    >
                      <View style={styles.currentStepCenter}>
                        <StatusIcon size={16} color={COLORS.primary} strokeWidth={2.5} />
                      </View>
                    </Animated.View>
                  ) : isCompleted ? (
                    <View style={styles.completedStep}>
                      <CheckCircle size={20} color="#FFFFFF" strokeWidth={3} fill={COLORS.primary} />
                    </View>
                  ) : (
                    <View style={styles.futureStep}>
                      <StatusIcon size={16} color="#D1D5DB" strokeWidth={2} />
                    </View>
                  )}
                  
                  {/* Connecting Line */}
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        (isCompleted || isCurrent) && styles.timelineLineActive,
                        isFuture && styles.timelineLineFuture,
                      ]}
                    />
                  )}
                </View>

                {/* Right Column (Content) */}
                <View style={styles.timelineRight}>
                  <Text
                    style={[
                      styles.timelineStepTitle,
                      isCurrent && styles.timelineStepTitleCurrent,
                      isFuture && styles.timelineStepTitleFuture,
                    ]}
                  >
                    {status.title}
                  </Text>
                  {status.time && (isCompleted || isCurrent) && (
                    <Text style={styles.timelineStepTime}>{status.time}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed Footer Action Bar */}
      <View style={[styles.footerBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed
          ]}
          onPress={isSimulating ? stopSimulation : startSimulation}
        >
          <Text style={styles.primaryButtonText}>
            {isSimulating ? 'Stop Simulation' : 'Complete Delivery Simulation'}
          </Text>
        </Pressable>
      </View>

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
    backgroundColor: '#F5F5F7',
  },
  
  // ===== EDGE-TO-EDGE ORANGE HEADER =====
  header: {
    backgroundColor: COLORS.primary,
    paddingBottom: 20,
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
    marginBottom: 28,
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
  
  // ===== THREE-STAGE HORIZONTAL PROGRESS =====
  journeyContainer: {
    marginTop: 12,
  },
  nodesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  nodeWrapper: {
    alignItems: 'center',
    width: 80,
  },
  nodeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  nodeCircleActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  nodeLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 14,
  },
  nodeLabelActive: {
    color: '#374151',
  },
  
  // Progress Bar
  progressBarContainer: {
    position: 'relative',
    height: 50,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  truckContainer: {
    position: 'absolute',
    width: 48,
    height: 48,
    marginLeft: -24,
  },
  truckIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
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
  
  // Future Step: Grey outline circle
  futureStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
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
  timelineLineFuture: {
    backgroundColor: '#E5E7EB',
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
  timelineStepTitleFuture: {
    color: '#9CA3AF',
    fontWeight: '500',
  },
  timelineStepTime: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  
  // ===== FIXED FOOTER ACTION BAR =====
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  
  // Primary Solid Orange Button
  primaryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 25,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
    gap: 8,
  },
  primaryButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // ===== REDIRECT POPUP =====
  popupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 15,
  },
  checkmarkCircle: {
    marginBottom: 24,
  },
  popupTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  popupBody: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
  },
  popupButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  popupButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  popupButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
});
