import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Switch,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, CreditCard, Shield, Tag, X, ChevronDown, Check, Plus, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { COLORS } from '../src/constants/theme';
import { supabase } from '../src/lib/supabase';
import { processCheckout } from '@/services/checkoutService';
import { useCartStore } from '../src/stores/cartStore';
import { useAuthStore } from '../src/stores/authStore';
import { useOrderStore } from '../src/stores/orderStore';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { CartItem, ShippingAddress, Order } from '../src/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

type CheckoutStep = 'shipping' | 'payment' | 'confirmation';
// Dummy voucher codes
const VOUCHERS = {
  'WELCOME10': { type: 'percentage', value: 10, description: '10% off' },
  'SAVE50': { type: 'fixed', value: 50, description: '₱50 off' },
  'FREESHIP': { type: 'shipping', value: 0, description: 'Free shipping' },
  'NEWYEAR25': { type: 'percentage', value: 25, description: '25% off New Year' },
  'FLASH100': { type: 'fixed', value: 100, description: '₱100 flash discount' },
} as const;

interface Address {
  id: string;
  user_id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  region: string;
  postal_code: string;
  is_default: boolean;
  coordinates?: any;
}

export default function CheckoutScreen({ navigation, route }: Props) {
  const { items, getTotal, clearCart, quickOrder, clearQuickOrder, getQuickOrderTotal, initializeForCurrentUser } = useCartStore();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Extract params safely
  const params = (route.params || {}) as any;
  const isGift = params?.isGift || false;
  const recipientName = params?.recipientName || 'Registry Owner';
  const registryLocation = params?.registryLocation || 'Philippines';
  const recipientId = params?.recipientId || 'user_123'; // Mock recipient ID if not passed

  // Override address state if it's a gift
  // Override address state if it's a gift
  React.useEffect(() => {
    if (isGift) {
        setUseDefaultAddress(false);
        const registryAddress: Address = {
            id: 'registry-hidden-1',
            user_id: user?.id || 'guest',
            label: 'Registry Address',
            first_name: recipientName,
            last_name: '(Hidden)',
            phone: '****',
            street: 'Confidential Registry Address',
            barangay: '',
            city: registryLocation,
            province: '',
            region: '',
            postal_code: '0000',
            is_default: false
        };
        
        // AUTO-SELECT this address so validation passes
        setSelectedAddress(registryAddress);
        setTempSelectedAddress(registryAddress);
        
        // Also update the form state for good measure, though less critical if selectedAddress is used
        setAddress({
            name: `${registryAddress.first_name} ${registryAddress.last_name}`,
            email: user?.email || '',
            phone: registryAddress.phone,
            address: registryAddress.street,
            city: registryAddress.city,
            region: registryAddress.region,
            postalCode: registryAddress.postal_code
        });
    }
  }, [isGift, recipientName, registryLocation, user?.id]);

  const DEFAULT_ADDRESS: ShippingAddress = {
    name: user?.name || 'Guest User',
    email: user?.email || '',
    phone: user?.phone || '',
    address: 'Default Address',
    city: 'City',
    region: 'Region',
    postalCode: '0000',
  };

  const [useDefaultAddress, setUseDefaultAddress] = useState(true);

  const [address, setAddress] = useState<ShippingAddress>(DEFAULT_ADDRESS);

  // Update address when toggle changes
  React.useEffect(() => {
    if (useDefaultAddress) {
      setAddress(DEFAULT_ADDRESS);
    }
  }, [useDefaultAddress]);

  // Get selected items from navigation params (from CartScreen)
  const selectedItemsFromCart: CartItem[] = params?.selectedItems || [];

  console.log('[Checkout] Params selectedItems:', params?.selectedItems?.length);
  console.log('[Checkout] selectedItemsFromCart:', selectedItemsFromCart.length);
  console.log('[Checkout] quickOrder:', quickOrder ? 'Present' : 'Null');

  // Determine which items to checkout: quick order takes precedence, then selected items.
  // We do NOT default to 'items' (all cart items) to avoid accidental checkout of unselected items.
  const checkoutItems = quickOrder
    ? [quickOrder]
    : selectedItemsFromCart;

  console.log('[Checkout] Final checkoutItems:', checkoutItems.length);

  const checkoutSubtotal = quickOrder
    ? getQuickOrderTotal()
    : checkoutItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);

  const isQuickCheckout = quickOrder !== null;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');

  // Web Port Compatibility State


  const createOrder = (items: CartItem[], addr: any, payment: string, options: any) => {
    return {
      id: `ORD-${Date.now()}`,
      transactionId: `TRX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      items,
      total: total, // Use the calculated total
      shippingFee,
      totalAmount: total, // Keep for backward compatibility if needed, but 'total' is the interface
      shippingAddress: addr,
      paymentMethod: payment,
      status: 'pending',
      isPaid: false,
      scheduledDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      ...options
    };
  };

  // Address Management
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [tempSelectedAddress, setTempSelectedAddress] = useState<Address | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash' | 'card' | 'paymongo'>('cod');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<keyof typeof VOUCHERS | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);



  // Bazcoins Logic
  const earnedBazcoins = Math.floor(checkoutSubtotal / 10);
  const [useBazcoins, setUseBazcoins] = useState(false);
  const [availableBazcoins, setAvailableBazcoins] = useState(0);
  const maxRedeemableBazcoins = Math.min(availableBazcoins, checkoutSubtotal);
  const bazcoinDiscount = useBazcoins ? maxRedeemableBazcoins : 0;

  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = checkoutSubtotal;
  let shippingFee = subtotal > 500 ? 0 : 50;
  let discount = 0;

  // Apply voucher discount
  if (appliedVoucher && VOUCHERS[appliedVoucher]) {
    const voucher = VOUCHERS[appliedVoucher];
    if (voucher.type === 'percentage') {
      discount = Math.round(subtotal * (voucher.value / 100));
    } else if (voucher.type === 'fixed') {
      discount = voucher.value;
    } else if (voucher.type === 'shipping') {
      shippingFee = 0;
    }
  }

  const total = Math.max(0, subtotal + shippingFee - discount - bazcoinDiscount);

  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (VOUCHERS[code as keyof typeof VOUCHERS]) {
      setAppliedVoucher(code as keyof typeof VOUCHERS);
      Alert.alert('Success', `Voucher "${code}" applied successfully!`);
    } else {
      Alert.alert('Invalid Voucher', 'This voucher code is not valid.');
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
  };

  // Fetch addresses and Bazcoins from Supabase
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setIsLoadingAddresses(true);
      try {
        // Fetch all saved addresses
        const { data: addressData, error: addressError } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (!addressError && addressData) {
          console.log('[Checkout] Fetched addresses:', addressData.length, 'addresses');
          setAddresses(addressData);

          // If this is a gift, DO NOT overwrite the selected address with defaults
          // The other useEffect handles setting the registry address
          if (isGift) {
            console.log('[Checkout] Gift mode active, skipping default address selection');
            setIsLoadingAddresses(false);
            return;
          }

          // Priority: 1) Address from HomeScreen location modal (via route params)
          //           2) Default saved address
          //           3) First saved address
          const homeScreenAddress = params?.deliveryAddress;
          const homeScreenCoords = params?.deliveryCoordinates;

          if (homeScreenAddress && homeScreenAddress !== 'Select Location') {
            console.log('[Checkout] Using address from HomeScreen:', homeScreenAddress);

            // Check if this matches a saved address
            const matchingAddress = addressData.find(addr =>
              `${addr.street}, ${addr.city}` === homeScreenAddress ||
              homeScreenAddress.includes(addr.street)
            );

            if (matchingAddress) {
              // Use the matching saved address
              console.log('[Checkout] Found matching saved address');
              setSelectedAddress(matchingAddress);
              setTempSelectedAddress(matchingAddress);
            } else {
              // Create a temporary address object from HomeScreen's location
              console.log('[Checkout] Creating temporary address from HomeScreen location');
              const tempAddr: Address = {
                id: 'temp-' + Date.now(),
                user_id: user.id,
                label: 'Current Location',
                first_name: user.name?.split(' ')[0] || 'User',
                last_name: user.name?.split(' ').slice(1).join(' ') || '',
                phone: user.phone || '',
                street: homeScreenAddress.split(',')[0].trim(),
                barangay: '',
                city: homeScreenAddress.split(',')[1]?.trim() || '',
                province: homeScreenAddress.split(',')[2]?.trim() || '',
                region: '',
                postal_code: '',
                is_default: false,
                coordinates: homeScreenCoords || null,
              };
              setSelectedAddress(tempAddr);
              setTempSelectedAddress(tempAddr);
            }
          } else {
            // Use default or first saved address
            const defaultAddr = addressData.find(a => a.is_default) || addressData[0];
            if (defaultAddr) {
              console.log('[Checkout] Using default/first address:', defaultAddr.id);
              setSelectedAddress(defaultAddr);
              setTempSelectedAddress(defaultAddr);
            }
          }
        } else {
          console.error('[Checkout] Error fetching addresses:', addressError);
        }

        // Fetch Bazcoins from buyers table
        const { data: buyerData, error: buyerError } = await supabase
          .from('buyers')
          .select('bazcoins')
          .eq('id', user.id)
          .single();

        if (!buyerError && buyerData) {
          console.log('[Checkout] Fetched Bazcoins:', buyerData.bazcoins);
          setAvailableBazcoins(buyerData.bazcoins || 0);
        } else {
          console.error('[Checkout] Error fetching Bazcoins:', buyerError);
        }
      } catch (error) {
        console.error('Error fetching checkout data:', error);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchData();

    // Subscribe to real-time Bazcoins updates
    const subscription = supabase
      .channel('checkout_bazcoins')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'buyers',
        filter: `id=eq.${user.id}`
      }, (payload) => {
        if (payload.new && 'bazcoins' in payload.new) {
          console.log('[Checkout] Bazcoins updated:', (payload.new as any).bazcoins);
          setAvailableBazcoins((payload.new as any).bazcoins || 0);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, params?.deliveryAddress]);

  const handleConfirmAddress = () => {
    if (tempSelectedAddress) {
      setSelectedAddress(tempSelectedAddress);
      setShowAddressModal(false);
    }
  };

  const handlePlaceOrder = async () => {
    // Validate address
    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    // Check if cart is empty
    if (!checkoutItems || checkoutItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      navigation.navigate('MainTabs', { screen: 'Shop', params: {} });
      return;
    }

    if (!user?.id || !user?.email) {
      Alert.alert('Error', 'Please log in to continue');
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare checkout payload
      const payload = {
        userId: user.id,
        items: checkoutItems,
        totalAmount: total,
        shippingAddress: {
          fullName: `${selectedAddress.first_name} ${selectedAddress.last_name}`,
          street: `${selectedAddress.street}, ${selectedAddress.barangay}`,
          city: selectedAddress.city,
          province: selectedAddress.province,
          postalCode: selectedAddress.postal_code,
          phone: selectedAddress.phone,
          country: 'Philippines'
        },
        paymentMethod,
        usedBazcoins: bazcoinDiscount,
        earnedBazcoins,
        shippingFee,
        discount,
        email: user.email
      };

      const result = await processCheckout(payload);

      if (!result.success) {
        throw new Error(result.error || 'Checkout failed');
      }

      // Update local Bazcoins balance
      const newBalance = availableBazcoins - bazcoinDiscount + earnedBazcoins;
      setAvailableBazcoins(newBalance);

      // Refresh cart from database
      await initializeForCurrentUser();

      // Clear quick order if applicable
      if (isQuickCheckout) {
        clearQuickOrder();
      }

      
      // Check if online payment (GCash, PayMongo, PayMaya, Card)

      const isOnlinePayment = paymentMethod.toLowerCase() !== 'cod' && paymentMethod.toLowerCase() !== 'cash on delivery';

      const shippingAddressForOrder: ShippingAddress = isGift
        ? address
        : {
            name: `${selectedAddress?.first_name || ''} ${selectedAddress?.last_name || ''}`.trim(),
            email: user.email,
            phone: selectedAddress?.phone || '',
            address: `${selectedAddress?.street || ''}${selectedAddress?.barangay ? `, ${selectedAddress.barangay}` : ''}`,
            city: selectedAddress?.city || '',
            region: selectedAddress?.province || selectedAddress?.region || '',
            postalCode: selectedAddress?.postal_code || '',
          };

      const order: Order = {
        id: 'ORD-' + Date.now(),
        transactionId: 'TXN' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        items: checkoutItems,
        total,
        shippingFee,
        status: 'pending',
        isPaid: false,
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
        shippingAddress: shippingAddressForOrder,
        paymentMethod,
        createdAt: new Date().toISOString(),
        ...{
          isGift,
          isAnonymous,
          recipientId: isGift ? recipientId : undefined
        }
      };

      // Check if online payment (GCash, PayMongo, PayMaya, Card)

      if (isOnlinePayment) {
        // Navigate to payment gateway simulation
        // Pass isQuickCheckout flag so we know what to clear later
        navigation.navigate('PaymentGateway', { paymentMethod, order, isQuickCheckout });
      } else {
        // COD - Clear cart immediately and go to confirmation
        clearCart();
        if (isQuickCheckout) {
          clearQuickOrder();
        }
        navigation.navigate('OrderConfirmation', { order });
      }

      // Navigate to orders with success message
      Alert.alert(
        'Order Placed Successfully!',
        `Your order has been placed. You earned ${earnedBazcoins} Bazcoins!`,
        [
          {
            text: 'View Orders',
            onPress: () => navigation.navigate('MainTabs', { screen: 'Orders', params: {} })
          }
        ]
      );

    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Checkout Failed', error.message || 'Please try again');
    } finally {
      setIsProcessing(false);
    }
  };

  const ProgressStepper = () => {
    const steps: { id: CheckoutStep; label: string }[] = [
      { id: 'shipping', label: 'Shipping' },
      { id: 'payment', label: 'Payment' },
      { id: 'confirmation', label: 'Confirm' },
    ];

    const currentIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <View style={styles.stepperContainer}>
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;

          return (
            <View key={step.id} style={styles.stepWrapper}>
              {/* Step Circle */}
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted
              ]}>
                {isCompleted ? (
                  <Check size={14} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    isActive && styles.stepNumberActive
                  ]}>{index + 1}</Text>
                )}
              </View>

              {/* Step Label */}
              <Text style={[
                styles.stepLabel,
                isActive && styles.stepLabelActive,
                isCompleted && styles.stepLabelCompleted
              ]}>{step.label}</Text>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <View style={[
                  styles.stepConnector,
                  isCompleted && styles.stepConnectorActive
                ]} />
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Edge-to-Edge Orange Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ArrowLeft size={24} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Checkout</Text>
            <View style={{ width: 36 }} />
          </View>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
          showsVerticalScrollIndicator={false}
        >
          {/* Compact Order List */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Order Items ({checkoutItems.length})</Text>
            </View>

            {checkoutItems.map((item) => (
              <View key={item.id} style={styles.compactOrderItem}>
                <Image source={{ uri: item.image }} style={styles.compactThumbnail} />
                <View style={styles.compactOrderInfo}>
                  <Text style={styles.compactProductName} numberOfLines={1}>{item.name}</Text>
                  <View style={styles.compactDetailsRow}>
                    <View style={styles.compactSelector}>
                      <Text style={styles.compactSelectorText}>Color</Text>
                      <ChevronDown size={12} color="#6B7280" />
                    </View>
                    <View style={styles.compactSelector}>
                      <Text style={styles.compactSelectorText}>Size</Text>
                      <ChevronDown size={12} color="#6B7280" />
                    </View>
                    <Text style={styles.compactQuantity}>x{item.quantity}</Text>
                  </View>
                </View>
                <Text style={styles.compactPrice}>₱{((item.price || 0) * item.quantity).toLocaleString()}</Text>
              </View>
            ))}
          </View>

          {/* Shipping Address Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderWithBadge}>
              <View style={styles.sectionHeader}>
                <MapPin size={20} color={COLORS.primary} />
                <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Delivery Address</Text>
              </View>
              <View style={styles.shippingBadge}>
                <Text style={styles.shippingBadgeText}>Shipping Available</Text>
              </View>
            </View>


          
          {isGift ? (
             /* REGISTRY PRIVACY MODE */
             <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#BBF7D0' }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                   <View style={{ backgroundColor: '#DCFCE7', padding: 8, borderRadius: 20 }}>
                       <ShieldCheck size={24} color="#166534" />
                   </View>
                   <View style={{ flex: 1 }}>
                       <Text style={{ fontSize: 16, fontWeight: '700', color: '#14532D', marginBottom: 4 }}>Registry Gift Address</Text>
                       <Text style={{ fontSize: 14, fontWeight: '600', color: '#166534', marginBottom: 2 }}>Recipient: {recipientName}</Text>
                       <Text style={{ fontSize: 14, color: '#166534' }}>Location: {registryLocation}</Text>
                       
                       <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 }}>
                           <Shield size={12} color="#15803D" />
                           <Text style={{ fontSize: 11, color: '#15803D', fontStyle: 'italic' }}>
                               Full address is hidden for privacy.
                           </Text>
                       </View>
                   </View>
                </View>

                {/* Anonymous Toggle */}
                <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderColor: '#BBF7D0', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#14532D' }}>Keep me anonymous</Text>
                    <Text style={{ fontSize: 12, color: '#15803D' }}>Do not disclose my name to recipient</Text>
                  </View>
                  <Switch
                    trackColor={{ false: '#D1D5DB', true: '#166534' }}
                    thumbColor={isAnonymous ? '#FFFFFF' : '#f4f3f4'}
                    onValueChange={setIsAnonymous}
                    value={isAnonymous}
                  />
                </View>
             </View>
          ) : (
            <>
                {useDefaultAddress ? (
                    isLoadingAddresses ? (
                      <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={COLORS.primary} />
                        <Text style={{ marginTop: 8, color: '#6B7280' }}>Loading addresses...</Text>
                      </View>
                    ) : selectedAddress ? (
                      <Pressable
                        style={{
                          backgroundColor: '#FFF4ED',
                          borderRadius: 12,
                          padding: 16,
                          borderWidth: 1,
                          borderColor: '#FFE4E6'
                        }}
                        onPress={() => {
                          console.log('[Checkout] Opening address modal');
                          setShowAddressModal(true);
                        }}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                                {selectedAddress.first_name} {selectedAddress.last_name}
                              </Text>
                              {selectedAddress.is_default && (
                                <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                                  <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Default</Text>
                                </View>
                              )}
                            </View>
                            <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 2 }}>{selectedAddress.phone}</Text>
                            <Text style={{ fontSize: 14, color: '#4B5563', marginBottom: 2 }}>
                              {selectedAddress.street}, {selectedAddress.barangay}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#4B5563' }}>
                              {selectedAddress.city}, {selectedAddress.province}, {selectedAddress.postal_code}
                            </Text>
                          </View>
                          <ChevronRight size={20} color={COLORS.primary} />
                        </View>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={{
                          backgroundColor: '#F9FAFB',
                          borderRadius: 12,
                          padding: 20,
                          borderWidth: 2,
                          borderColor: '#E5E7EB',
                          borderStyle: 'dashed',
                          alignItems: 'center'
                        }}
                        onPress={() => navigation.navigate('Addresses')}
                      >
                        <Plus size={24} color={COLORS.primary} />
                        <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '600', color: '#111827' }}>
                          Add Delivery Address
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>
                          Tap to add your shipping address
                        </Text>
                      </Pressable>
                    ) 
                ) : (
                  <Pressable
                    style={{
                      backgroundColor: '#F9FAFB',
                      borderRadius: 12,
                      padding: 20,
                      borderWidth: 2,
                      borderColor: '#E5E7EB',
                      borderStyle: 'dashed',
                      alignItems: 'center'
                    }}
                    onPress={() => navigation.navigate('Addresses')}
                  >
                    <Plus size={24} color={COLORS.primary} />
                    <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '600', color: '#111827' }}>
                      Add Delivery Address
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>
                      Tap to add your shipping address
                    </Text>
                  </Pressable>
                )}
             </>
          )}
        </View>

        {/* Payment Method Card */}


          {/* Payment Method Card */}
          {/* Payment Method Card */}

          {/* Payment Method Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <CreditCard size={20} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Payment Method</Text>
            </View>

            <Pressable
              onPress={() => setPaymentMethod('gcash')}
              style={[styles.paymentOption, paymentMethod === 'gcash' && styles.paymentOptionActive]}
            >
              <View style={styles.radio}>
                {paymentMethod === 'gcash' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentText}>GCash</Text>
                <Text style={styles.paymentSubtext}>Instantly paid online</Text>
              </View>
              <Shield size={16} color="#10B981" />
            </Pressable>

            <Pressable
              onPress={() => setPaymentMethod('paymongo')}
              style={[styles.paymentOption, paymentMethod === 'paymongo' && styles.paymentOptionActive]}
            >
              <View style={styles.radio}>
                {paymentMethod === 'paymongo' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentText}>PayMongo</Text>
                <Text style={styles.paymentSubtext}>Instantly paid online</Text>
              </View>
              <Shield size={16} color="#10B981" />
            </Pressable>

            <View>
              <Pressable
                onPress={() => setPaymentMethod('card')}
                style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
              >
                <View style={styles.radio}>
                  {paymentMethod === 'card' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentText}>Credit/Debit Card</Text>
                  <Text style={styles.paymentSubtext}>Instantly paid online</Text>
                </View>
                <CreditCard size={16} color="#10B981" />
              </Pressable>

              {/* Saved Cards List */}
              {paymentMethod === 'card' && user?.savedCards && user.savedCards.length > 0 && (
                <View style={styles.savedCardsContainer}>
                  {user.savedCards.map((card) => (
                    <Pressable
                      key={card.id}
                      style={[
                        styles.savedCardItem,
                        selectedCardId === card.id && styles.savedCardItemSelected
                      ]}
                      onPress={() => setSelectedCardId(card.id)}
                    >
                      <View style={styles.savedCardRow}>
                        <View style={[
                          styles.radioSmall,
                          selectedCardId === card.id && styles.radioSmallSelected
                        ]}>
                          {selectedCardId === card.id && <View style={styles.radioInnerSmall} />}
                        </View>
                        <View style={styles.savedCardInfo}>
                          <Text style={styles.savedCardBrand}>{card.brand} •••• {card.last4}</Text>
                          <Text style={styles.savedCardExpiry}>Expires {card.expiry}</Text>
                        </View>
                      </View>
                    </Pressable>
                  ))}
                  <Pressable
                    style={styles.addNewCardButton}
                    onPress={() => {
                      setPaymentMethod('paymongo');
                      Alert.alert('Secure Checkout Selected', 'Please tap "Place Order" at the bottom to enter your card details securely via PayMongo.');
                    }}
                  >
                    <Plus size={16} color={COLORS.primary} />
                    <Text style={styles.addNewCardText}>Add New Card</Text>
                  </Pressable>
                </View>
              )}
            </View>

            <Pressable
              onPress={() => setPaymentMethod('cod')}
              style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentOptionActive]}
            >
              <View style={styles.radio}>
                {paymentMethod === 'cod' && <View style={styles.radioInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentText}>Cash on Delivery</Text>
                <Text style={styles.paymentSubtext}>Pay when you receive</Text>
              </View>
            </Pressable>

            {/* Payment Status Info */}
            <View style={styles.paymentInfoBanner}>
              <Shield size={16} color={paymentMethod === 'cod' ? '#6B7280' : '#10B981'} />
              <Text style={styles.paymentInfoText}>
                {paymentMethod === 'cod'
                  ? '💵 You will pay when you receive your order'
                  : '✅ Your payment will be processed instantly and securely'}
              </Text>
            </View>
          </View>

          {/* Voucher Code Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Tag size={20} color={COLORS.primary} />
              <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Voucher Code</Text>
            </View>

            {appliedVoucher ? (
              <View style={styles.appliedVoucherContainer}>
                <View style={styles.appliedVoucherBadge}>
                  <Tag size={16} color={COLORS.primary} />
                  <Text style={styles.appliedVoucherCode}>{appliedVoucher}</Text>
                  <Text style={styles.appliedVoucherDesc}>
                    {VOUCHERS[appliedVoucher].description}
                  </Text>
                </View>
                <Pressable onPress={handleRemoveVoucher} style={styles.removeVoucherButton}>
                  <X size={18} color="#6B7280" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.voucherInputContainer}>
                <TextInput
                  style={styles.voucherInput}
                  placeholder="Enter voucher code"
                  placeholderTextColor="#9CA3AF"
                  value={voucherCode}
                  onChangeText={setVoucherCode}
                  autoCapitalize="characters"
                />
                <Pressable
                  onPress={handleApplyVoucher}
                  style={[styles.applyButton, !voucherCode.trim() && styles.applyButtonDisabled]}
                  disabled={!voucherCode.trim()}
                >
                  <Text style={styles.applyButtonText}>Apply</Text>
                </Pressable>
              </View>
            )}

            {!appliedVoucher && (
              <View style={styles.voucherHintContainer}>
                <Text style={styles.voucherHint}>Try: WELCOME10, SAVE50, FREESHIP</Text>
              </View>
            )}
          </View>

          {/* Bazcoins Redemption Card */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EAB308', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>B</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Bazcoins</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>Balance: {availableBazcoins}</Text>
                </View>
              </View>
              {availableBazcoins > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14, color: '#111827', fontWeight: '500' }}>-₱{maxRedeemableBazcoins}</Text>
                  <Switch
                    trackColor={{ false: '#D1D5DB', true: COLORS.primary }}
                    thumbColor={useBazcoins ? '#FFFFFF' : '#f4f3f4'}
                    onValueChange={() => setUseBazcoins(prev => !prev)}
                    value={useBazcoins}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Merchandise Subtotal</Text>
              <Text style={styles.summaryValue}>₱{subtotal.toLocaleString()}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping Subtotal</Text>
              <Text style={styles.summaryValue}>₱{shippingFee.toLocaleString()}</Text>
            </View>

            {discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Voucher Discount</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>-₱{discount.toLocaleString()}</Text>
              </View>
            )}

            {useBazcoins && bazcoinDiscount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Bazcoins Redeemed</Text>
                <Text style={[styles.summaryValue, { color: '#EAB308' }]}>-₱{bazcoinDiscount.toLocaleString()}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabelLarge}>Total Payment</Text>
              <Text style={styles.totalAmountLarge}>₱{total.toLocaleString()}</Text>
            </View>

            <View style={{ marginTop: 16, backgroundColor: '#FEFCE8', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FEF08A', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#EAB308', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>B</Text>
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#854D0E' }}>You will earn {earnedBazcoins} Bazcoins</Text>
                <Text style={{ fontSize: 11, color: '#A16207' }}>Receive coins upons successful delivery</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]}>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalAmount}>₱{total.toLocaleString()}</Text>
          </View>
          <Pressable
            onPress={handlePlaceOrder}
            disabled={isProcessing || !selectedAddress}
            style={({ pressed }) => [
              styles.checkoutButton,
              pressed && styles.checkoutButtonPressed,
              (isProcessing || !selectedAddress) && { opacity: 0.5 }
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.checkoutButtonText}>Place Order</Text>
            )}
          </Pressable>
        </View>

        {/* Address Selection Modal */}
        <Modal
          visible={showAddressModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowAddressModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Delivery Address</Text>
                <Pressable onPress={() => setShowAddressModal(false)}>
                  <X size={24} color="#1F2937" />
                </Pressable>
              </View>

              <ScrollView
                style={{ flex: 1, minHeight: 200 }}
                contentContainerStyle={{ padding: 20, flexGrow: 1 }}
              >
                {addresses.map((addr) => (
                  <Pressable
                    key={addr.id}
                    style={[
                      styles.addressItem,
                      tempSelectedAddress?.id === addr.id && styles.addressItemSelected
                    ]}
                    onPress={() => setTempSelectedAddress(addr)}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                          {addr.first_name} {addr.last_name}
                        </Text>
                        {addr.is_default && (
                          <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Default</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>{addr.label}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>{addr.phone}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                        {addr.street}, {addr.barangay}, {addr.city}, {addr.province}, {addr.postal_code}
                      </Text>
                    </View>
                    <View style={[
                      styles.radioCircle,
                      tempSelectedAddress?.id === addr.id && styles.radioCircleSelected
                    ]}>
                      {tempSelectedAddress?.id === addr.id && (
                        <View style={styles.radioInner} />
                      )}
                    </View>
                  </Pressable>
                ))}

                {addresses.length === 0 && (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <MapPin size={48} color="#D1D5DB" />
                    <Text style={{ marginTop: 16, fontSize: 16, fontWeight: '600', color: '#6B7280' }}>
                      No addresses found
                    </Text>
                    <Text style={{ marginTop: 8, fontSize: 14, color: '#9CA3AF', textAlign: 'center' }}>
                      Add a delivery address to continue with checkout
                    </Text>
                    <Pressable
                      style={{
                        marginTop: 20,
                        backgroundColor: COLORS.primary,
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 12
                      }}
                      onPress={() => {
                        setShowAddressModal(false);
                        navigation.navigate('Addresses');
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: '600' }}>Add Address</Text>
                    </Pressable>
                  </View>
                )}
              </ScrollView>

              {addresses.length > 0 && (
                <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                  <Pressable
                    style={{
                      backgroundColor: COLORS.primary,
                      paddingVertical: 16,
                      borderRadius: 12,
                      alignItems: 'center'
                    }}
                    onPress={handleConfirmAddress}
                    disabled={!tempSelectedAddress}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '700' }}>
                      Confirm Address
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    backgroundColor: COLORS.primary,
    paddingBottom: 16, // Increased slightly for better proportion with rounded corners
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  stepWrapper: {
    alignItems: 'center',
    position: 'relative',
    flex: 1,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  stepCircleCompleted: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  stepNumberActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  stepLabelActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  stepLabelCompleted: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  stepConnector: {
    position: 'absolute',
    top: 14,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: -1,
  },
  stepConnectorActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  scrollContainer: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderWithBadge: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  shippingBadge: {
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  shippingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  compactOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  compactThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
  },
  compactOrderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  compactProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  compactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  compactSelectorText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  compactQuantity: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 'auto',
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 12,
  },
  autofillButton: {
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  autofillButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF4ED',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  paymentSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  paymentInfoText: {
    fontSize: 13,
    color: '#065F46',
    flex: 1,
  },
  voucherInputContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appliedVoucherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF4ED',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  appliedVoucherBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appliedVoucherCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  appliedVoucherDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  removeVoucherButton: {
    padding: 4,
  },
  voucherHintContainer: {
    marginTop: 8,
  },
  voucherHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  savedCardsContainer: {
    paddingLeft: 46,
    paddingRight: 16,
    paddingBottom: 16,
    gap: 12,
  },
  savedCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  savedCardItemSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F0',
  },
  savedCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radioSmall: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSmallSelected: {
    borderColor: COLORS.primary,
  },
  radioInnerSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  savedCardInfo: {
    flex: 1,
  },
  savedCardBrand: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  savedCardExpiry: {
    fontSize: 12,
    color: '#6B7280',
  },
  addNewCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  addNewCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  totalLabelLarge: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  totalAmountLarge: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  addressItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  addressItemSelected: {
    backgroundColor: '#FFF4ED',
    borderColor: COLORS.primary,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  radioCircleSelected: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
});
