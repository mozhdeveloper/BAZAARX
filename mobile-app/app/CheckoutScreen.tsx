import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  FlatList,
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
  Animated,
  Easing,
  Dimensions,
  BackHandler,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, CreditCard, Shield, Tag, X, ChevronDown, Check, Plus, ShieldCheck, ChevronRight, Home, Briefcase, MapPinned, Building2, Move, Search, ChevronUp, Palmtree, Store } from 'lucide-react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { Svg, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/constants/theme';
import { PAYMENT_METHODS } from '../src/constants/paymentMethods';
import { supabase } from '../src/lib/supabase';
import { processCheckout, getCheckoutContext } from '@/services/checkoutService';
import { addressService, type Address, validateCheckoutAddress, type AddressValidationResult } from '@/services/addressService';
import { paymentMethodService, type SavedPaymentMethod } from '@/services/paymentMethodService';
import { orderMutationService } from '@/services/orders/orderMutationService';
import { voucherService, calculateVoucherDiscount, getVoucherErrorMessage } from '@/services/voucherService';
import { calculateShippingForSellers, type SellerShippingResult, type ShippingMethodOption } from '@/services/shippingService';
import AddressFormModal from '@/components/AddressFormModal';
import ShippingMethodPicker from '@/components/ShippingMethodPicker';
import { useCartStore } from '../src/stores/cartStore';
import { useAuthStore } from '../src/stores/authStore';
import { useOrderStore } from '../src/stores/orderStore';
import LocationModal from '../src/components/LocationModal';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import type { CartItem, ShippingAddress, Order, Voucher } from '../src/types';
import { safeImageUri } from '../src/utils/imageUtils';
import { generateUUID } from '../src/utils/uuid';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

export default function CheckoutScreen({ navigation, route }: Props) {
  const { items, getTotal, clearCart, quickOrder, clearQuickOrder, getQuickOrderTotal, initializeForCurrentUser } = useCartStore();
  const { user, logout } = useAuthStore();
  const { loadCheckoutContext, isCheckoutContextLoading } = useOrderStore();
  const insets = useSafeAreaInsets();

  // Extract params safely
  const params = (route.params || {}) as any;
  const isGift = params?.isGift || false;
  const recipientName = params?.recipientName || 'Registry Owner';
  const registryLocation = params?.registryLocation || 'Philippines';
  const recipientId = params?.recipientId || 'user_123'; // Mock recipient ID if not passed

  // Override address state if it's a gift
  React.useEffect(() => {
    if (isGift) {
      const registryAddress: Omit<Address, 'id'> = {
        label: 'Registry Address',
        firstName: recipientName,
        lastName: '(Hidden)',
        phone: '****',
        street: 'Confidential Registry Address',
        barangay: '',
        city: registryLocation,
        province: '',
        region: '',
        zipCode: '0000',
        landmark: '',
        deliveryInstructions: '',
        addressType: 'residential',
        isDefault: false,
        coordinates: null,
      };

      // AUTO-SELECT this address so validation passes
      setSelectedAddress(registryAddress as Address & { id: string });
      setTempSelectedAddress(registryAddress as Address & { id: string });
    }
  }, [isGift, recipientName, registryLocation, user?.id]);

  const DEFAULT_REGION = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Address states
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [tempSelectedAddress, setTempSelectedAddress] = useState<Address | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Address states
  const [isSaving, setIsSaving] = useState(false);

  // Shared AddressFormModal state (Fix Address / Add New Address)
  const [showAddressFormModal, setShowAddressFormModal] = useState(false);
  const [editingAddressForForm, setEditingAddressForForm] = useState<Address | null>(null);

  // LocationModal state for map-first address flow
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Animation refs for Address Selection Modal
  const addressFadeAnim = useRef(new Animated.Value(0)).current;
  const addressSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Animation effect for Address Selection Modal
  useEffect(() => {
    if (showAddressModal) {
      Animated.parallel([
        Animated.timing(addressFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(addressSlideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      addressFadeAnim.setValue(0);
      addressSlideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [showAddressModal]);

  const handleCloseAddressModal = () => {
    Animated.parallel([
      Animated.timing(addressFadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(addressSlideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => setShowAddressModal(false));
  };


  // Get selected items from navigation params (from CartScreen)
  // Memoize to prevent creating new array reference on every render
  const selectedItemsFromCart: CartItem[] = useMemo(() => {
    return params?.selectedItems || [];
  }, [params?.selectedItems]);

  // Determine which items to checkout: quick order takes precedence, then selected items.
  // We do NOT default to 'items' (all cart items) to avoid accidental checkout of unselected items.
  // Use useMemo to prevent recalculation on every render
  const checkoutItems = useMemo(() => {
    return quickOrder ? [quickOrder] : selectedItemsFromCart;
  }, [quickOrder, selectedItemsFromCart]);

  // Check for vacation sellers
  const [vacationSellers, setVacationSellers] = useState<string[]>([]);
  const hasVacationSeller = vacationSellers.length > 0;

  // BX-09-001 — Seller metadata for shipping zone detection
  const [sellerMetadata, setSellerMetadata] = useState<Record<string, {
    id: string;
    storeName: string;
    coords: { latitude: number; longitude: number } | null;
    province: string | null;
    region: string | null;
  }>>({});

  // BX-09-001 — Async shipping calculation state
  const [shippingResults, setShippingResults] = useState<SellerShippingResult[]>([]);
  const [isCalculatingShipping, setIsCalculatingShipping] = useState(false);
  const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
  const shippingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for unavailable items (stock validation)
  const [unavailableItems, setUnavailableItems] = useState<Array<{ id: string; name: string; reason: string }>>([]);
  const [isValidatingStock, setIsValidatingStock] = useState(false);
  const hasUnavailableItems = unavailableItems.length > 0;

  // ===== STATE DECLARATIONS MOVED TO TOP (before hooks) =====
  // Payments and Vouchers
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'gcash' | 'card' | 'paymongo' | null>('cod');
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Saved Payment Methods (for PayMongo)
  const [savedPaymentMethods, setSavedPaymentMethods] = useState<SavedPaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  // Processing State
  const [paymentComplete, setPaymentComplete] = useState(false); // Track if payment was successful
  const [paymentProcessedOrder, setPaymentProcessedOrder] = useState<any>(null); // Store order data after payment
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('Processing your order...');

  // Bazcoins
  const [useBazcoins, setUseBazcoins] = useState(false);
  const [availableBazcoins, setAvailableBazcoins] = useState(0);
  
  // Payment Method State
  const [hasSavedCard, setHasSavedCard] = useState(false);

  // Loading Animation
  const processingFadeAnim = useRef(new Animated.Value(0)).current;

  // ===== END STATE DECLARATIONS =====

  // Fetch seller metadata (vacation check + shipping origin) on mount
  // Extract and memoize seller IDs to prevent constant re-fetches
  const sellerIds = useMemo(() => {
    return [...new Set(checkoutItems.map((item: any) => item.sellerId || item.seller_id).filter(Boolean))];
  }, [checkoutItems]);

  useEffect(() => {
    const fetchSellerData = async () => {
      if (sellerIds.length === 0) {
        setVacationSellers([]);
        setSellerMetadata({});
        return;
      }

      // Fetch seller info + business profile for province/region fallback
      const { data } = await (supabase as any)
        .from('sellers')
        .select('id, store_name, is_vacation_mode, shipping_origin_lat, shipping_origin_lng, business_profile:seller_business_profiles(city, province)')
        .in('id', sellerIds);

      // Set vacation sellers (existing behavior)
      const vacationSellerNames = (data || [])
        .filter((s: any) => s.is_vacation_mode)
        .map((s: any) => s.store_name || 'Unknown Seller');
      setVacationSellers(vacationSellerNames);

      // Set seller metadata for shipping (BX-09-001)
      const meta: typeof sellerMetadata = {};
      for (const s of data || []) {
        const bp = Array.isArray(s.business_profile) ? s.business_profile[0] : s.business_profile;
        meta[s.id] = {
          id: s.id,
          storeName: s.store_name || 'Unknown Seller',
          coords: s.shipping_origin_lat && s.shipping_origin_lng
            ? { latitude: s.shipping_origin_lat, longitude: s.shipping_origin_lng }
            : null,
          province: bp?.province || null,
          region: null, // seller_business_profiles doesn't have region; text fallback uses province
        };
      }
      setSellerMetadata(meta);
    };

    fetchSellerData();
  }, [sellerIds]);

  // Validate stock for all checkout items on mount
  useEffect(() => {
    const validateCheckoutItemsStock = async () => {
      if (checkoutItems.length === 0) {
        setUnavailableItems([]);
        return;
      }

      setIsValidatingStock(true);
      const unavailable: Array<{ id: string; name: string; reason: string }> = [];

      try {
        for (const item of checkoutItems) {
          const itemId = (item as any).id || (item as any).productId;
          if (!itemId) continue;

          let currentStock = 0;

          if ((item as any).selectedVariant?.variantId) {
            const { data: variantData } = await (supabase as any)
              .from('product_variants')
              .select('stock')
              .eq('id', (item as any).selectedVariant.variantId)
              .single();

            currentStock = variantData?.stock ?? 0;
          } else {
            const { data: variantsData } = await (supabase as any)
              .from('product_variants')
              .select('stock')
              .eq('product_id', itemId);

            currentStock = (variantsData ?? []).reduce((sum: number, v: any) => sum + (v.stock ?? 0), 0);
          }

          if (currentStock < (item.quantity || 1)) {
            unavailable.push({
              id: itemId,
              name: item.name || 'Unknown Product',
              reason: currentStock === 0
                ? 'Out of stock'
                : `Only ${currentStock} available (you selected ${item.quantity})`
            });
          }
        }

        setUnavailableItems(unavailable);
      } catch (error) {
        console.error('[Checkout] Stock validation error:', error);
      } finally {
        setIsValidatingStock(false);
      }
    };

    validateCheckoutItemsStock();
  }, [checkoutItems]);

  // Animate loading modal in/out
  useEffect(() => {
    if (isProcessing) {
      Animated.loop(
        Animated.timing(processingFadeAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.linear
        })
      ).start();
    } else {
      processingFadeAnim.setValue(0);
    }
  }, [isProcessing, processingFadeAnim]);

  // Cleanup loading state when navigating away from CheckoutScreen
  useFocusEffect(
    useCallback(() => {
      // Cleanup when losing focus (navigating away)
      return () => {
        // Reset loading state if still processing
        if (isProcessing) {
          console.log('[Checkout] 🔄 Resetting loading state - navigating away from checkout');
          setIsProcessing(false);
          setProcessingMessage('Processing your order...');
          processingFadeAnim.setValue(0);
        }
      };
    }, [isProcessing, processingFadeAnim])
  );

  // Handle hardware back button - prevent back while processing
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (isProcessing) {
          Alert.alert(
            'Checkout in Progress',
            'Your order is being processed. Please wait for it to complete before going back.',
            [{ text: 'OK', onPress: () => {} }],
            { cancelable: false }
          );
          return true; // Prevent back navigation
        }
        return false; // Allow back navigation
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', backAction);

      return () => subscription.remove();
    }, [isProcessing])
  );

  // Pre-fetch addresses + seller metadata via Edge Function on mount.
  // The Edge Function uses Promise.all internally so both queries run concurrently.
  useEffect(() => {
    const productIds = checkoutItems
      .map((item) => (item as any).id ?? (item as any).productId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0);

    // Deduplicate before calling
    const uniqueIds = [...new Set(productIds)];
    if (uniqueIds.length > 0) {
      loadCheckoutContext(uniqueIds).catch(async (err: any) => {
        if (err?.message === 'AUTH_EXPIRED') {
          logout();
          await supabase.auth.signOut();
          navigation.replace('Login');
        }
      });
    }
  }, []);

  // Optimize subtotal calculation with useMemo
  const checkoutSubtotal = useMemo(() => {
    if (quickOrder) return getQuickOrderTotal();
    return checkoutItems.reduce((sum, item) => sum + ((item.price || 0) * item.quantity), 0);
  }, [quickOrder, checkoutItems, getQuickOrderTotal]);

  const isQuickCheckout = quickOrder !== null;

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');

  // Validate payment method is available (Acceptance Criteria #4, #5: Validate availability and eligibility)
  const isPaymentMethodAvailable = useCallback((method: string): boolean => {
    if (!selectedAddress) return false; // No address = no delivery = no payment
    
    // COD eligibility: Check if it's a gift (Acceptance Criteria #5: block COD for gifts)
    if (method === 'cod' && isGift) {
      return false;
    }
    
    // Online methods (PayMongo, GCash) are always available when address exists
    if (method === 'paymongo' || method === 'gcash') {
      return true;
    }
    
    // Card method is available
    if (method === 'card') {
      return true;
    }
    
    // COD is available when not a gift
    if (method === 'cod') {
      return true;
    }
    
    return false;
  }, [selectedAddress, isGift]);
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

  // Load saved payment methods when user ID is available
  useEffect(() => {
    if (!user?.id) return;

    const loadPaymentMethods = async () => {
      setLoadingPaymentMethods(true);
      try {
        const methods = await paymentMethodService.getSavedPaymentMethods(user.id);
        setSavedPaymentMethods(methods);

        // Auto-select default card if available
        const defaultCard = methods.find((m: SavedPaymentMethod) => m.isDefault);
        if (defaultCard) {
          setSelectedPaymentMethodId(defaultCard.id);
        }
      } catch (err) {
        console.error('[Checkout] Failed to load payment methods:', err);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    loadPaymentMethods();
  }, [user?.id]);

  // Bazcoins Logic (state moved to top)
  const earnedBazcoins = useMemo(() => Math.floor(checkoutSubtotal / 10), [checkoutSubtotal]);
  const maxRedeemableBazcoins = useMemo(() =>
    Math.min(availableBazcoins, checkoutSubtotal),
    [availableBazcoins, checkoutSubtotal]
  );
  const bazcoinDiscount = useMemo(() =>
    useBazcoins ? maxRedeemableBazcoins : 0,
    [useBazcoins, maxRedeemableBazcoins]
  );


  // Calculate campaign discount and original subtotal
  const { campaignDiscountTotal, originalSubtotal } = useMemo(() => {
    let campaignDiscount = 0;
    let originalTotal = 0;

    checkoutItems.forEach(item => {
      const itemOriginalPrice = item.originalPrice ?? item.price ?? 0;
      const itemDiscount = (itemOriginalPrice - (item.price ?? 0)) * item.quantity;
      campaignDiscount += itemDiscount;
      originalTotal += itemOriginalPrice * item.quantity;
    });

    return {
      campaignDiscountTotal: campaignDiscount,
      originalSubtotal: originalTotal
    };
  }, [checkoutItems]);

  // BX-09-001 — Group by seller ID (not display name) for correct per-seller shipping
  const groupedCheckoutItems = useMemo(() => {
    return checkoutItems.reduce((groups, item) => {
      const sellerId = (item as any).sellerId || (item as any).seller_id || 'unknown';
      if (!groups[sellerId]) groups[sellerId] = [];
      groups[sellerId].push(item);
      return groups;
    }, {} as Record<string, typeof checkoutItems>);
  }, [checkoutItems]);

  // Helper: resolve display name for a seller group
  const getSellerDisplayName = useCallback((sellerId: string, items: typeof checkoutItems) => {
    // Get store name from metadata first (most reliable)
    if (sellerMetadata[sellerId]?.storeName) {
      return sellerMetadata[sellerId].storeName;
    }
    
    // Fallback: extract from first item's seller property
    const firstItem = items[0];
    if (firstItem?.seller) {
      // Handle case where seller is an object with store_name/seller_name property
      if (typeof firstItem.seller === 'object' && firstItem.seller !== null) {
        return (firstItem.seller as any).store_name || (firstItem.seller as any).seller_name || 'Unknown Seller';
      }
      // Handle case where seller is already a string
      if (typeof firstItem.seller === 'string') {
        return firstItem.seller;
      }
    }
    
    return 'BazaarX Store';
  }, [sellerMetadata]);

  // ---------------------------------------------------------------------------
  // BX-09-004 — Address validation (pure, synchronous, no network)
  // ---------------------------------------------------------------------------
  const addressValidation = useMemo((): AddressValidationResult | null => {
    if (!selectedAddress) return null;
    return validateCheckoutAddress(selectedAddress);
  }, [selectedAddress]);

  // BX-09-001 — Debounced shipping recalculation.
  // Fires when selectedAddress, items, or seller metadata change.
  // Calls calculateShippingForSellers() from shippingService.ts
  // which queries shipping_zones + shipping_config from Supabase.
  useEffect(() => {
    if (shippingTimerRef.current) clearTimeout(shippingTimerRef.current);

    // Don't calculate if no address or address is invalid
    if (!selectedAddress || !addressValidation?.valid) {
      setShippingResults([]);
      setIsCalculatingShipping(false);
      return;
    }

    const sellerIds = Object.keys(groupedCheckoutItems);
    if (sellerIds.length === 0) {
      setShippingResults([]);
      setIsCalculatingShipping(false);
      return;
    }

    setIsCalculatingShipping(true);

    // Debounce 300ms as specified in BX-09-001 AC
    shippingTimerRef.current = setTimeout(async () => {
      try {
        const buyerCoords = selectedAddress.coordinates?.latitude
          ? { latitude: selectedAddress.coordinates.latitude, longitude: selectedAddress.coordinates.longitude }
          : null;

        const sellerInputs = Object.entries(groupedCheckoutItems).map(([sellerId, items]) => {
          const meta = sellerMetadata[sellerId];
          let sellerName = 'Unknown Seller';
          
          // Get store name from metadata first
          if (meta?.storeName) {
            sellerName = meta.storeName;
          } else if (items[0]?.seller) {
            // Handle case where seller is an object
            if (typeof items[0].seller === 'object' && items[0].seller !== null) {
              sellerName = (items[0].seller as any).store_name || (items[0].seller as any).seller_name || 'Unknown Seller';
            } else if (typeof items[0].seller === 'string') {
              sellerName = items[0].seller;
            }
          }
          
          return {
            sellerId,
            sellerName,
            sellerCoords: meta?.coords || null,
            sellerProvince: meta?.province,
            sellerRegion: meta?.region,
            items,
          };
        });

        const results = await calculateShippingForSellers(
          sellerInputs,
          buyerCoords,
          selectedAddress.province,
          selectedAddress.region
        );

        setShippingResults(results);

        // Auto-select default method for sellers without a selection,
        // and auto-clear stale selections whose method is no longer available.
        setSelectedMethods(prev => {
          const updated = { ...prev };
          for (const r of results) {
            if (!updated[r.sellerId] && r.defaultMethod) {
              updated[r.sellerId] = r.defaultMethod.method;
            } else if (updated[r.sellerId] && !r.methods.find(m => m.method === updated[r.sellerId])) {
              // Stale selection — auto-fallback to default
              updated[r.sellerId] = r.defaultMethod?.method ?? '';
            }
          }
          return updated;
        });
      } catch (err) {
        console.error('[Checkout] Shipping calculation failed:', err);
      } finally {
        setIsCalculatingShipping(false);
      }
    }, 300);

    return () => { if (shippingTimerRef.current) clearTimeout(shippingTimerRef.current); };
  }, [selectedAddress, groupedCheckoutItems, sellerMetadata, addressValidation?.valid]);

  // BX-09-001 — Retry shipping calculation (used by ShippingMethodPicker error state)
  const retryShipping = useCallback(() => {
    // Clear results and force recalculation by toggling the calculating state
    setShippingResults([]);
    setIsCalculatingShipping(true);
    // Clear the timer and set a short debounce to re-trigger the useEffect
    if (shippingTimerRef.current) clearTimeout(shippingTimerRef.current);
    shippingTimerRef.current = setTimeout(() => {
      // The useEffect above will fire because shippingResults was cleared
      // We manually invoke the same logic here for immediate retry
      (async () => {
        try {
          if (!selectedAddress || !addressValidation?.valid) return;

          const buyerCoords = selectedAddress.coordinates?.latitude
            ? { latitude: selectedAddress.coordinates.latitude, longitude: selectedAddress.coordinates.longitude }
            : null;

          const sellerInputs = Object.entries(groupedCheckoutItems).map(([sellerId, items]) => {
            const meta = sellerMetadata[sellerId];
            let sellerName = 'Unknown Seller';
            
            // Get store name from metadata first
            if (meta?.storeName) {
              sellerName = meta.storeName;
            } else if (items[0]?.seller) {
              // Handle case where seller is an object
              if (typeof items[0].seller === 'object' && items[0].seller !== null) {
                sellerName = (items[0].seller as any).store_name || (items[0].seller as any).seller_name || 'Unknown Seller';
              } else if (typeof items[0].seller === 'string') {
                sellerName = items[0].seller;
              }
            }
            
            return {
              sellerId,
              sellerName,
              sellerCoords: meta?.coords || null,
              sellerProvince: meta?.province,
              sellerRegion: meta?.region,
              items,
            };
          });

          const { calculateShippingForSellers } = require('@/services/shippingService');
          const results = await calculateShippingForSellers(
            sellerInputs,
            buyerCoords,
            selectedAddress.province,
            selectedAddress.region
          );

          setShippingResults(results);
          setSelectedMethods(prev => {
            const updated = { ...prev };
            for (const r of results) {
              if (!updated[r.sellerId] && r.defaultMethod) {
                updated[r.sellerId] = r.defaultMethod.method;
              }
            }
            return updated;
          });
        } catch (err) {
          console.error('[Checkout] Retry shipping failed:', err);
        } finally {
          setIsCalculatingShipping(false);
        }
      })();
    }, 100);
  }, [selectedAddress, groupedCheckoutItems, sellerMetadata, addressValidation?.valid]);

  // BX-09-001 — Per-store shipping fees derived from shippingResults
  const perStoreShippingFees = useMemo(() => {
    const fees: Record<string, number> = {};
    for (const result of shippingResults) {
      const selectedMethod = selectedMethods[result.sellerId];
      const method = result.methods.find(m => m.method === selectedMethod) || result.defaultMethod;
      fees[result.sellerId] = method?.fee ?? 0;
    }
    // Fallback: if shippingResults empty (still loading or no address), keep ₱0 per seller
    for (const sellerId of Object.keys(groupedCheckoutItems)) {
      if (!(sellerId in fees)) fees[sellerId] = 0;
    }
    return fees;
  }, [shippingResults, selectedMethods, groupedCheckoutItems]);

  // Optimize total calculation with useMemo
  const { subtotal, shippingFee, discount, total, totalSavings } = useMemo(() => {
    // subtotal is the discounted price (what customer sees)
    const subtotal = checkoutSubtotal;
    // Sum all per-store shipping fees
    const perStoreTotal = Object.values(perStoreShippingFees).reduce((sum, fee) => sum + fee, 0);
    let shippingFee = perStoreTotal;
    let discount = 0;

    // Apply voucher discount (on discounted subtotal)
    if (appliedVoucher) {
      const originalShippingFee = perStoreTotal;

      if (appliedVoucher.type === 'percentage') {
        discount = calculateVoucherDiscount(appliedVoucher, subtotal);
      } else if (appliedVoucher.type === 'fixed') {
        discount = calculateVoucherDiscount(appliedVoucher, subtotal);
      } else if (appliedVoucher.type === 'shipping') {
        shippingFee = 0;
        discount = originalShippingFee;
      }
    }

    const total = Math.max(0, subtotal + shippingFee - discount - bazcoinDiscount);
    const totalSavings = campaignDiscountTotal + (discount || 0) + (bazcoinDiscount || 0);

    return { subtotal, shippingFee, discount, total, totalSavings };
  }, [checkoutSubtotal, appliedVoucher, bazcoinDiscount, campaignDiscountTotal, perStoreShippingFees]);


  const handleApplyVoucher = useCallback(async () => {
    if (!voucherCode.trim()) {
      Alert.alert('Error', 'Please enter a voucher code');
      return;
    }

    const code = voucherCode.trim().toUpperCase();

    try {
      const result = await voucherService.validateVoucherDetailed(code, checkoutSubtotal, user?.id);

      if (result.errorCode) {
        const errorMessage = getVoucherErrorMessage(result.errorCode);
        Alert.alert('Invalid Voucher', errorMessage);
        return;
      }

      if (result.voucher) {
        setAppliedVoucher(result.voucher);
        Alert.alert('Success', `Voucher "${code}" applied successfully!`);
      }
    } catch (error) {
      console.error('Voucher validation error:', error);
      Alert.alert('Error', 'Failed to validate voucher. Please try again.');
    }
  }, [voucherCode, checkoutSubtotal, user?.id]);

  const handleRemoveVoucher = useCallback(() => {
    setAppliedVoucher(null);
    setVoucherCode('');
  }, []);

  // ---------------------------------------------------------------------------
  // handleAddNew — opens AddressFormModal in a guaranteed blank create mode.
  // Explicitly nulls out editingAddressForForm so there is zero chance of
  // stale data leaking into the "Add New Address" form.
  // ---------------------------------------------------------------------------
  const handleAddNew = useCallback(() => {
    // 1. Close the address-selection sheet first.
    handleCloseAddressModal();
    // 2. Hard-reset the editing reference so initialData will be null.
    setEditingAddressForForm(null);
    // 3. Open the form after the slide-down animation completes (300 ms).
    setTimeout(() => setShowAddressFormModal(true), 300);
  }, []);

  // Handle when location is selected from LocationModal
  const handleLocationModalSelect = useCallback(async (
    address: string,
    coords?: { latitude: number; longitude: number },
    details?: {
      address: string;
      coordinates: { latitude: number; longitude: number };
      street?: string;
      barangay?: string;
      city?: string;
      province?: string;
      region?: string;
      postalCode?: string;
    }
  ) => {
    if (!user) return;

    setIsSaving(true);

    try {
      // Check if Metro Manila/NCR (no province level)
      const isMetroManila = details?.region?.toLowerCase().includes('metro manila') ||
        details?.region?.toLowerCase().includes('ncr') ||
        details?.region?.toLowerCase().includes('national capital');

      // Prepare address data from location details
      const addressData = {
        label: 'Home',
        firstName: user.name?.split(' ')[0] || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        phone: user.phone || '',
        street: details?.street || address.split(',')[0] || '',
        barangay: details?.barangay || '',
        city: details?.city || '',
        // For Metro Manila, province field should be the region name (NCR)
        // For other regions, use the actual province
        province: isMetroManila ? (details?.region || 'NCR') : (details?.province || ''),
        region: details?.region || '',
        // Ensure postal_code has a value (database NOT NULL constraint)
        zipCode: details?.postalCode || '0000',
        landmark: null,
        deliveryInstructions: null,
        addressType: 'residential' as const,
        isDefault: addresses.length === 0,
        coordinates: coords || null,
      };

      // Save to database using addressService
      const created = await addressService.createAddress(user.id, addressData);

      if (created) {
        // Format the address for display
        const formattedAddress = [
          created.street,
          created.barangay,
          created.city,
          created.province || created.region,
        ].filter(Boolean).join(', ');

        // Create Address object for state (with camelCase fields)
        const newAddr: Address = {
          id: created.id,
          label: created.label || 'Home',
          firstName: created.firstName || '',
          lastName: created.lastName || '',
          phone: created.phone || '',
          street: created.street || '',
          barangay: created.barangay || '',
          city: created.city || '',
          province: created.province || '',
          region: created.region || '',
          zipCode: created.zipCode || '',
          isDefault: created.isDefault || false,
          coordinates: coords || null,
          deliveryInstructions: created.deliveryInstructions || '',
          landmark: created.landmark || '',
          addressType: created.addressType || 'residential',
        };

        console.log('[🔍 ADDRESS DEBUG 6] LocationModal address object created:', {
          firstName: newAddr.firstName,
          lastName: newAddr.lastName,
          phone: newAddr.phone,
          id: newAddr.id
        });

        // Update local state
        setAddresses(prev => {
          if (prev.find(a => a.id === newAddr.id)) return prev;
          return [...prev, newAddr];
        });
        console.log('[🔍 ADDRESS DEBUG 7] Addresses state updated with new address');

        setSelectedAddress(newAddr);
        console.log('[🔍 ADDRESS DEBUG 8] Selected address set to:', {
          firstName: newAddr.firstName,
          lastName: newAddr.lastName,
          phone: newAddr.phone
        });

        // Save to AsyncStorage for HomeScreen sync
        await AsyncStorage.setItem('currentDeliveryAddress', formattedAddress);
        if (coords) {
          await AsyncStorage.setItem('currentDeliveryCoordinates', JSON.stringify(coords));
        }
        await AsyncStorage.setItem('currentLocationDetails', JSON.stringify({
          street: details?.street || '',
          barangay: details?.barangay || '',
          city: details?.city || '',
          province: details?.province || '',
          region: details?.region || '',
          postalCode: details?.postalCode || '',
          coordinates: coords,
        }));

        console.log('[Checkout] Address saved from LocationModal:', formattedAddress);
      }
    } catch (error) {
      console.error('[Checkout] Error saving address from LocationModal:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setIsSaving(false);
      console.log('[🔍 ADDRESS DEBUG 9] LocationModal closing, isSaving set to false');
      setShowLocationModal(false);
      console.log('[🔍 ADDRESS DEBUG 10] showLocationModal set to false');
    }
  }, [user, addresses.length]);


  const getAddressIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home': return Home;
      case 'office': return Briefcase;
      default: return MapPinned;
    }
  };

  // Track which user had their addresses initialized to prevent re-fetching for same user
  // Reset when user changes
  const initializedUserId = useRef<string | null>(null);

  // Fetch addresses and Bazcoins via service layer
  useEffect(() => {
    if (!user?.id) return;

    // Only initialize addresses when user changes, not on every dependency update
    // This prevents re-fetching addresses for the same user
    if (initializedUserId.current === user.id) {
      // This user's addresses already loaded, don't re-fetch
      return;
    }

    // Mark as initialized immediately to prevent race conditions
    initializedUserId.current = user.id;

    const fetchData = async () => {
      setIsLoadingAddresses(true);

      try {
        // Fetch all saved addresses
        const serviceAddresses = await addressService.getAddresses(user.id);
        console.log('[🔍 ADDRESS DEBUG 1] Fetched addresses from service:', serviceAddresses?.map(a => ({
          id: a.id,
          firstName: a.firstName,
          lastName: a.lastName,
          phone: a.phone,
          isDefault: a.isDefault
        })));

        const addressData: Address[] = (serviceAddresses || []).map(a => ({
          id: a.id,
          userId: user.id,
          label: a.label,
          firstName: a.firstName,
          lastName: a.lastName,
          phone: a.phone,
          street: a.street,
          barangay: a.barangay,
          city: a.city,
          province: a.province,
          region: a.region,
          zipCode: a.zipCode,
          isDefault: a.isDefault,
          coordinates: a.coordinates,
          deliveryInstructions: a.deliveryInstructions || '',
          landmark: a.landmark || '',
          addressType: a.addressType || 'residential',
        }));
        // Deduplicate by id — guards against race conditions with optimistic updates
        const seen = new Set<string>();
        const uniqueAddressData = addressData.filter((a: any) => {
          if (seen.has(a.id)) return false;
          seen.add(a.id);
          return true;
        });
        setAddresses(uniqueAddressData);

        console.log('[🔍 ADDRESS DEBUG 2] Addresses state updated, selectedAddress is:', selectedAddress);

        // If this is a gift, DO NOT overwrite the selected address with defaults
        // The other useEffect handles setting the registry address
        if (isGift) {
          setIsLoadingAddresses(false);
          return;
        }

        // Initial Address Selection Priority (only if NO address manually selected yet):
        // 1) Default saved address (Highest reliability for regular checkout)
        // 2) Address from HomeScreen location modal (via route params)
        // 3) "Current Location" from database (saved by HomeScreen)
        // 4) AsyncStorage fallback (if route params not available)
        // 5) First saved address (last resort)
        const defaultSavedAddr = addressData.find(a => a.isDefault);

        let homeScreenAddress = params?.deliveryAddress;
        let homeScreenCoords = params?.deliveryCoordinates;

        // If no route params, try to get from AsyncStorage or database
        if (!homeScreenAddress || homeScreenAddress === 'Select Location') {
          try {
            // First try database for "Current Location"
            const dbCurrentLoc = await addressService.getCurrentDeliveryLocation(user.id);
            if (dbCurrentLoc && dbCurrentLoc.label === 'Current Location') {
              homeScreenAddress = `${dbCurrentLoc.street}, ${dbCurrentLoc.city}`;
              homeScreenCoords = dbCurrentLoc.coordinates || undefined;
            } else {
              // Fall back to AsyncStorage
              const storedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
              const storedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');
              if (storedAddress && storedAddress !== 'Select Location') {
                homeScreenAddress = storedAddress;
                homeScreenCoords = storedCoords ? JSON.parse(storedCoords) : undefined;
              }
            }
          } catch (storageError) {
            // Silent fail for storage errors
          }
        }

        // Also try to get location details for autofill
        let locationDetails: {
          street?: string;
          barangay?: string;
          city?: string;
          province?: string;
          region?: string;
          postalCode?: string;
        } | null = null;

        try {
          const storedDetails = await AsyncStorage.getItem('currentLocationDetails');
          if (storedDetails) {
            locationDetails = JSON.parse(storedDetails);
          }
        } catch (detailsError) {
          // Silent fail
        }

        // Determine which address to select (batch all decision logic here)
        let selectedAddr: Address | null = null;

        if (defaultSavedAddr) {
          selectedAddr = defaultSavedAddr;
          console.log('[🔍 ADDRESS DEBUG 5a] Setting default address:', { firstName: defaultSavedAddr.firstName, lastName: defaultSavedAddr.lastName, phone: defaultSavedAddr.phone });
        } else if (homeScreenAddress && homeScreenAddress !== 'Select Location') {
          // Check if this matches a saved address (including "Current Location" from DB)
          const matchingAddress = addressData.find(addr =>
            addr.label === 'Current Location' ||
            `${addr.street}, ${addr.city}` === homeScreenAddress ||
            homeScreenAddress.includes(addr.street)
          );

          if (matchingAddress) {
            selectedAddr = matchingAddress;
            console.log('[🔍 ADDRESS DEBUG 5b] Setting matching HomeScreen address:', { firstName: matchingAddress.firstName, lastName: matchingAddress.lastName });
          } else {
            // Create a temporary address object from HomeScreen's location
            const tempAddr: Address = {
              id: 'temp-' + Date.now(),
              label: 'Current Location',
              firstName: user.name?.split(' ')[0] || 'User',
              lastName: user.name?.split(' ').slice(1).join(' ') || '',
              phone: user.phone || '',
              street: locationDetails?.street || homeScreenAddress.split(',')[0].trim(),
              barangay: locationDetails?.barangay || '',
              city: locationDetails?.city || homeScreenAddress.split(',')[1]?.trim() || '',
              province: locationDetails?.province || homeScreenAddress.split(',')[2]?.trim() || '',
              region: locationDetails?.region || '',
              zipCode: locationDetails?.postalCode || '',
              isDefault: false,
              coordinates: homeScreenCoords || null,
              deliveryInstructions: '',
              landmark: '',
              addressType: 'residential',
            };
            selectedAddr = tempAddr;
            console.log('[🔍 ADDRESS DEBUG 5c] Creating temp address from HomeScreen location:', { firstName: tempAddr.firstName, phone: tempAddr.phone });
          }
        } else {
          // Use first saved address
          const firstAddr = addressData[0];
          if (firstAddr) {
            selectedAddr = firstAddr;
            console.log('[🔍 ADDRESS DEBUG 5d] Setting first saved address:', { firstName: firstAddr.firstName, lastName: firstAddr.lastName, phone: firstAddr.phone });
          }
        }

        // Batch state updates - only call setSelectedAddress and setTempSelectedAddress once
        if (selectedAddr) {
          setSelectedAddress(selectedAddr);
          setTempSelectedAddress(selectedAddr);
        }

        // Fetch Bazcoins balance
        const coins = await addressService.getBazcoins(user.id);
        setAvailableBazcoins(coins || 0);
      } catch (error) {
        console.error('Error fetching checkout data:', error);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchData().catch(err => console.error('[Checkout] fetchData error:', err));

    // Subscribe to real-time Bazcoins updates via service
    const subscription = addressService.subscribeToBazcoinChanges(user.id, (newBalance) => {
      setAvailableBazcoins(newBalance || 0);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const handleConfirmAddress = () => {
    if (tempSelectedAddress) {
      setSelectedAddress(tempSelectedAddress);
      handleCloseAddressModal();
    }
  };

  const handlePlaceOrder = useCallback(async () => {
    // Check for unavailable items
    if (hasUnavailableItems) {
      const itemsList = unavailableItems.map(item => `• ${item.name}\n  ${item.reason}`).join('\n\n');
      Alert.alert(
        'Items Unavailable',
        `The following items are no longer available:\n\n${itemsList}\n\nPlease update your cart.`,
        [
          { text: 'Cancel', onPress: () => { }, style: 'cancel' },
          {
            text: 'Go Back to Cart',
            onPress: () => navigation.goBack(),
            style: 'default'
          }
        ]
      );
      return;
    }

    // Check for vacation sellers
    if (hasVacationSeller) {
      Alert.alert(
        'Cannot Complete Order',
        `Some items in your cart are from sellers currently on vacation: ${vacationSellers.join(', ')}. Please remove these items to proceed.`
      );
      return;
    }

    // Validate address — BX-09-004 strict validation
    if (!selectedAddress) {
      Alert.alert(
        'No Address Selected',
        'Please select a delivery address before placing your order.',
        [{ text: 'Add Address', onPress: () => { setEditingAddressForForm(null); setShowAddressFormModal(true); }, style: 'default' }, { text: 'Cancel', style: 'cancel' }]
      );
      return;
    }

    const addrValidation = validateCheckoutAddress(selectedAddress);
    if (!addrValidation.valid) {
      const fieldErrors = addrValidation.errors
        .filter(e => e.field !== 'general')
        .map(e => `• ${e.message}`)
        .join('\n');
      Alert.alert(
        'Address Incomplete',
        `Please fix the following before continuing:\n\n${fieldErrors}`,
        [{ text: 'Fix Address', onPress: () => { setEditingAddressForForm(selectedAddress); setShowAddressFormModal(true); }, style: 'default' }, { text: 'Cancel', style: 'cancel' }]
      );
      return;
    }
    if (addrValidation.serviceable === false) {
      Alert.alert(
        'Area Not Serviceable',
        'Delivery is not available to this address. Please select a different address or update your location on the map.',
        [{ text: 'Change Address', onPress: () => setShowAddressModal(true), style: 'default' }, { text: 'Cancel', style: 'cancel' }]
      );
      return;
    }

    // BX-09-001 — Block if shipping is still calculating
    if (isCalculatingShipping) {
      Alert.alert('Please Wait', 'Shipping fees are still being calculated. Please wait a moment.');
      return;
    }

    // BX-09-001 — Block if any seller has a shipping error
    const shippingErrors = shippingResults.filter(r => r.error !== null);
    if (shippingErrors.length > 0) {
      Alert.alert(
        'Shipping Unavailable',
        `Shipping could not be calculated for: ${shippingErrors.map(e => e.sellerName).join(', ')}. Please try again or change your address.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // BX-09-001 — Block if any seller has no available shipping methods
    const noMethodSellers = shippingResults.filter(r => r.methods.length === 0 && r.error === null);
    if (noMethodSellers.length > 0) {
      Alert.alert(
        'No Shipping Available',
        `No shipping options are available for: ${noMethodSellers.map(s => s.sellerName).join(', ')}. This may be due to the delivery route or item restrictions.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // BX-09-002 — Final method revalidation
    // Catches stale selections (e.g., buyer selected same-day then changed address to non-NCR)
    for (const result of shippingResults) {
      const chosenMethod = selectedMethods[result.sellerId];
      if (chosenMethod && !result.methods.find(m => m.method === chosenMethod)) {
        Alert.alert(
          'Shipping Method Changed',
          `The selected shipping method for "${result.sellerName}" is no longer available. Please choose a different method.`,
          [{ text: 'OK' }]
        );
        return;
      }
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

    // Acceptance Criteria #6: Validate payment method is selected
    if (!paymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method to proceed with checkout.');
      return;
    }

    // Acceptance Criteria #4, #5: Validate payment method is available
    if (!isPaymentMethodAvailable(paymentMethod)) {
      Alert.alert('Payment Method Unavailable', 'The selected payment method is not available for this order. Please select another method.');
      return;
    }

    const isPayMongoPayment = paymentMethod === PAYMENT_METHODS.PAYMONGO;

    // For PayMongo with saved card: Include card ID in payload
    if (isPayMongoPayment && selectedPaymentMethodId) {
      // User selected a saved card - will be used instead of card form
    } else if (isPayMongoPayment && !selectedPaymentMethodId) {
      // User has no saved cards selected
      Alert.alert(
        'Select or Add a Card',
        'Please click "Add Card Details" to add a new card, or if you have saved cards, select one above.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsProcessing(true);
    setProcessingMessage('Processing your order...');

    try {
      console.log('[Checkout] 🔄 Starting checkout process...');
      // Prepare checkout payload
      const payload = {
        userId: user.id,
        items: checkoutItems,
        totalAmount: total,
        shippingAddress: {
          fullName: `${selectedAddress.firstName} ${selectedAddress.lastName}`,
          street: selectedAddress.street,
          barangay: selectedAddress.barangay,
          city: selectedAddress.city,
          province: selectedAddress.province,
          region: selectedAddress.region,
          postalCode: selectedAddress.zipCode,
          phone: selectedAddress.phone,
          country: 'Philippines'
        },
        paymentMethod,
        usedBazcoins: bazcoinDiscount,
        earnedBazcoins,
        shippingFee,
        discount,
        voucherId: appliedVoucher?.id || null,
        discountAmount: discount,
        email: user.email,
        // Campaign discount info
        campaignDiscountTotal,
        campaignDiscounts: checkoutItems
          .filter(item => item.campaignDiscount)
          .map(item => ({
            campaignId: item.campaignDiscount?.campaignId,
            campaignName: item.campaignDiscount?.campaignName || 'Discount',
            discountAmount: ((item.originalPrice ?? item.price ?? 0) - (item.price ?? 0)) * item.quantity,
            productId: item.id,
            quantity: item.quantity
          })),
        // BX-09-001 — Per-seller shipping breakdown
        shippingBreakdown: shippingResults.map(r => {
          const methodKey = selectedMethods[r.sellerId];
          const method = r.methods.find(m => m.method === methodKey) || r.defaultMethod;
          return {
            sellerId: r.sellerId,
            sellerName: r.sellerName,
            method: method?.method ?? 'standard',
            methodLabel: method?.label ?? 'Standard',
            fee: method?.fee ?? 0,
            breakdown: method?.breakdown ?? { baseRate: 0, weightSurcharge: 0, valuationFee: 0, odzFee: 0 },
            estimatedDays: method?.estimatedDays ?? 'N/A',
            originZone: r.originZone,
            destinationZone: r.destinationZone,
          };
        }),
        // Include saved PayMongo card ID if user selected one
        ...(isPayMongoPayment && selectedPaymentMethodId ? { savedPaymentMethodId: selectedPaymentMethodId } : {}),
      };

      const result = await processCheckout(payload);

      if (!result.success) {
        throw new Error(result.error || 'Checkout failed');
      }

      setProcessingMessage('Preparing your checkout...');

      console.log('[Checkout] ✅ processCheckout result:', {
        success: result.success,
        orderIds: result.orderIds,
        orderUuids: result.orderUuids,
        orderCount: result.orderIds?.length || 0
      });

      // Update local Bazcoins balance
      const newBalance = availableBazcoins - bazcoinDiscount + earnedBazcoins;
      setAvailableBazcoins(newBalance);

      // Refresh cart from database
      await initializeForCurrentUser();

      // Clear quick order if applicable
      if (isQuickCheckout) {
        clearQuickOrder();
      }

      // ✅ FIX: Special handling for PayMongo saved cards - skip payment gateway
      if (isPayMongoPayment && selectedPaymentMethodId) {
        console.log('[Checkout] 💳 PayMongo saved card detected - skipping PaymentGateway');
        // Saved PayMongo card - promote order to processing and go straight to My Orders
        const shippingAddressForOrder: ShippingAddress = {
          name: `${selectedAddress?.firstName || ''} ${selectedAddress?.lastName || ''}`.trim(),
          email: user.email,
          phone: selectedAddress?.phone || '',
          address: `${selectedAddress?.street || ''}${selectedAddress?.barangay ? `, ${selectedAddress.barangay}` : ''}`,
          city: selectedAddress?.city || '',
          region: selectedAddress?.province || selectedAddress?.region || '',
          postalCode: selectedAddress?.zipCode || '',
        };

        const order: Order = {
          id: result.orderIds?.[0] || 'ORD-' + Date.now(),
          orderId: result.orderUuids?.[0],
          buyerId: user.id,
          sellerId: checkoutItems[0]?.seller_id || checkoutItems[0]?.sellerId || '',
          transactionId: 'TXN' + Math.random().toString(36).slice(2, 10).toUpperCase(),
          items: checkoutItems,
          total,
          shippingFee,
          discount: discount > 0 ? discount : undefined,
          voucherInfo: appliedVoucher ? {
            code: appliedVoucher.code,
            type: appliedVoucher.type,
            discountAmount: discount
          } : undefined,
          campaignDiscounts: campaignDiscountTotal > 0 ? checkoutItems
            .filter(item => item.campaignDiscount)
            .map(item => ({
              campaignId: item.campaignDiscount?.campaignId || '',
              campaignName: item.campaignDiscount?.campaignName || 'Discount',
              discountAmount: ((item.originalPrice ?? item.price ?? 0) - (item.price ?? 0)) * item.quantity
            })) : undefined,
          status: 'processing',
          isPaid: false,
          scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
          shippingAddress: shippingAddressForOrder,
          paymentMethod: 'PayMongo',
          createdAt: new Date().toISOString(),
          isGift,
          isAnonymous,
          recipientId: isGift ? recipientId : undefined
        };

        setProcessingMessage('Confirming your order...');
        console.log('[Checkout] PayMongo saved card selected - promoting order to processing');

        if (result.orderUuids?.length) {
          await Promise.all(result.orderUuids.map((orderUuid) =>
            orderMutationService.updateOrderStatus({
              orderId: orderUuid,
              nextStatus: 'processing',
            })
          ));
        }

        navigation.replace('Orders', { initialTab: 'processing' });
        return;
      }

      // Check if online payment (GCash, PayMongo, PayMaya, Card)
      const isOnlinePayment = paymentMethod.toLowerCase() !== PAYMENT_METHODS.COD && paymentMethod.toLowerCase() !== 'cash on delivery';

      const shippingAddressForOrder: ShippingAddress = {
        name: `${selectedAddress?.firstName || ''} ${selectedAddress?.lastName || ''}`.trim(),
        email: user.email,
        phone: selectedAddress?.phone || '',
        address: `${selectedAddress?.street || ''}${selectedAddress?.barangay ? `, ${selectedAddress.barangay}` : ''}`,
        city: selectedAddress?.city || '',
        region: selectedAddress?.province || selectedAddress?.region || '',
        postalCode: selectedAddress?.zipCode || '',
      };

      // Validate and extract seller ID
      const sellerId = checkoutItems[0]?.seller_id || checkoutItems[0]?.sellerId || checkoutItems[0]?.['sellerId'] || null;
      console.log('[Checkout] Extracted sellerId:', {
        sellerId,
        item0: checkoutItems[0],
        seller_id: checkoutItems[0]?.seller_id,
        sellerId_prop: checkoutItems[0]?.sellerId,
        bracket_sellerId: checkoutItems[0]?.['sellerId']
      });
      
      if (!sellerId) {
        console.error('[Checkout] ❌ Missing seller! checkoutItems:', checkoutItems);
        throw new Error('Unable to determine seller. Please refresh and try again.');
      }

      const order: Order = {
        id: result.orderIds?.[0] || 'ORD-' + Date.now(),
        orderId: result.orderUuids?.[0],
        buyerId: user.id,
        sellerId: sellerId,
        transactionId: 'TXN' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        items: checkoutItems, // NOTE: This might not serialize properly through navigation, but checkoutPayload has all items
        total,
        shippingFee,
        discount: discount > 0 ? discount : undefined,
        voucherInfo: appliedVoucher ? {
          code: appliedVoucher.code,
          type: appliedVoucher.type,
          discountAmount: discount
        } : undefined,
        campaignDiscounts: campaignDiscountTotal > 0 ? checkoutItems
          .filter(item => item.campaignDiscount)
          .map(item => ({
            campaignId: item.campaignDiscount?.campaignId || '',
            campaignName: item.campaignDiscount?.campaignName || 'Discount',
            discountAmount: ((item.originalPrice ?? item.price ?? 0) - (item.price ?? 0)) * item.quantity
          })) : undefined,
        status: 'pending',
        isPaid: false,
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
        shippingAddress: shippingAddressForOrder,
        paymentMethod,
        createdAt: new Date().toISOString(),
        isGift,
        isAnonymous,
        recipientId: isGift ? recipientId : undefined
      };

      console.log('[Checkout] ✅ Order object created:', {
        id: order.id,
        orderId: order.orderId,
        buyerId: order.buyerId,
        sellerId: order.sellerId,
        total: order.total,
        itemCount: order.items?.length
      });

      // Create a serializable version of the order for navigation
      // React Navigation can't serialize complex objects with Date properties
      const serializableOrder = {
        ...order,
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          sellerId: item.sellerId || item.seller_id,
          cartItemId: item.cartItemId,
          selectedVariant: item.selectedVariant,
          // Skip campaignEndsAt and other Date properties
        }))
      };

      console.log('[Checkout] ✅ Serializable order created:', {
        id: serializableOrder.id,
        orderId: serializableOrder.orderId,
        itemCount: serializableOrder.items?.length
      });

      // Check if online payment (GCash, PayMongo, PayMaya, Card)

      if (isOnlinePayment) {
        setProcessingMessage('Redirecting to secure payment gateway');
        // Navigate to payment gateway simulation
        // Pass isQuickCheckout flag so we know what to clear later
        console.log('[Checkout] Navigating to PaymentGateway with serializable order:', {
          orderId: serializableOrder?.orderId,
          orderTotal: serializableOrder?.total,
          orderSellerId: serializableOrder?.sellerId,
          orderBuyerId: serializableOrder?.buyerId,
          itemCount: serializableOrder?.items?.length,
          orderShippingFee: serializableOrder?.shippingFee,
        });
        navigation.navigate('PaymentGateway', { 
          paymentMethod, 
          order: serializableOrder,  // Use serializable version for navigation
          checkoutPayload: payload, 
          isQuickCheckout, 
          earnedBazcoins,
          bazcoinDiscount,
          appliedVoucher,
          isGift,
          recipientId
        });

      } else {
        setProcessingMessage('Confirming your order...');
        // For COD: use the order already defined above
        console.log('[Checkout] Proceeding to OrderConfirmation for COD with order:', {
          orderId: order?.orderId,
          orderTotal: order?.total,
          itemCount: order?.items?.length,
        });
        navigation.replace('OrderConfirmation', { order, earnedBazcoins, isQuickCheckout });
      }

    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Checkout Failed', error.message || 'Please try again');
    } finally {
      setIsProcessing(false);
    }
  }, [hasUnavailableItems, unavailableItems, hasVacationSeller, vacationSellers, selectedAddress, checkoutItems, user, total, paymentMethod, bazcoinDiscount, earnedBazcoins, shippingFee, discount, availableBazcoins, isQuickCheckout, isGift, isAnonymous, recipientId, navigation, initializeForCurrentUser, clearQuickOrder, campaignDiscountTotal, appliedVoucher, selectedPaymentMethodId, shippingResults, selectedMethods]);

  if (isCheckoutContextLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFBF5' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: '#6B7280' }}>Preparing your checkout...</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#FFFBF5', '#FDF2E9', '#FFFBF5']} // Matching HomeScreen container gradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <ChevronLeft size={28} color={COLORS.textHeadline} strokeWidth={2.5} />
            </Pressable>
            <Text style={styles.headerTitle}>Checkout</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
            showsVerticalScrollIndicator={false}
          >
            {/* Shipping Address Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Shipping Information</Text>
              </View>

              {isLoadingAddresses ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={{ marginTop: 8, color: '#6B7280' }}>Loading addresses...</Text>
                </View>
              ) : selectedAddress ? (
                <View>
                  <Pressable
                    style={{
                      paddingVertical: 0,
                    }}
                    onPress={() => {
                      console.log('[Checkout] Opening address modal');
                      setShowAddressModal(true);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{ width: 20, paddingTop: 2 }}>
                        <Svg width="16" height="16" viewBox="0 0 24 24">
                          <Path
                            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                            fill={COLORS.primary}
                            fillRule="evenodd"
                          />
                        </Svg>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                            {selectedAddress.firstName} {selectedAddress.lastName}
                          </Text>
                          {selectedAddress.isDefault && (
                            <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 14, color: COLORS.gray500, marginBottom: 1 }}>{selectedAddress.phone}</Text>
                        <Text style={{ fontSize: 14, color: COLORS.gray500, lineHeight: 20 }}>
                          {selectedAddress.street}, {selectedAddress.barangay}, {selectedAddress.city}, {selectedAddress.province}, {selectedAddress.zipCode}
                        </Text>
                      </View>
                      <ChevronRight size={18} color={COLORS.gray400} style={{ marginTop: 2, marginLeft: 8 }} />
                    </View>
                  </Pressable>

                  {/* BX-09-004 — Inline validation banner: missing/invalid fields */}
                  {addressValidation && !addressValidation.valid && (
                    <View style={{ marginTop: 10, backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FED7AA' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, color: '#92400E', fontWeight: '700' }}>⚠ Address needs attention</Text>
                      </View>
                      {addressValidation.errors
                        .filter(e => e.field !== 'general')
                        .map((e, i) => (
                          <Text key={i} style={{ fontSize: 12, color: '#B45309', marginBottom: 2 }}>• {e.message}</Text>
                        ))}
                      <Pressable
                        onPress={() => {
                          setEditingAddressForForm(selectedAddress);
                          setShowAddressFormModal(true);
                        }}
                        style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      >
                        <Text style={{ fontSize: 12, color: '#FFF', fontWeight: '600' }}>Fix Address</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* BX-09-004 — Not serviceable banner (separate from missing-field banner) */}
                  {addressValidation && addressValidation.serviceable === false && (
                    <View style={{ marginTop: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
                      <Text style={{ fontSize: 13, color: '#991B1B', fontWeight: '700', marginBottom: 4 }}>
                        🚫 Delivery not available
                      </Text>
                      <Text style={{ fontSize: 12, color: '#B91C1C', marginBottom: 8 }}>
                        This address appears to be outside the Philippines. Please choose a different address.
                      </Text>
                      <Pressable
                        onPress={() => setShowAddressModal(true)}
                        style={{ alignSelf: 'flex-start', backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                      >
                        <Text style={{ fontSize: 12, color: '#FFF', fontWeight: '600' }}>Change Address</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* BX-09-004 — GPS pin nudge: address is valid but has no coordinates */}
                  {addressValidation && addressValidation.valid && addressValidation.serviceable === null &&
                    !selectedAddress?.coordinates?.latitude && (
                    <View style={{ marginTop: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#BFDBFE', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MapPin size={14} color="#1D4ED8" />
                      <Text style={{ flex: 1, fontSize: 11, color: '#1E40AF' }}>
                        Add a pin location to your address for more accurate delivery coverage checking.
                      </Text>
                      <Pressable
                        onPress={() => {
                          setEditingAddressForForm(selectedAddress);
                          setShowAddressFormModal(true);
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D4ED8' }}>Add Pin</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
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
                  onPress={() => setShowAddressModal(true)}
                >
                  <Plus size={24} color={COLORS.primary} />
                  <Text style={{ marginTop: 8, fontSize: 15, fontWeight: '700', color: COLORS.textHeadline }}>
                    Add Shipping Information
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>
                    Tap to add your shipping address
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Compact Order List */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Order ({checkoutItems.length})</Text>
              </View>

              {Object.entries(groupedCheckoutItems).map(([sellerId, sellerItems], groupIdx) => {
                const sellerDisplayName = getSellerDisplayName(sellerId, sellerItems);
                const sellerResult = shippingResults.find(r => r.sellerId === sellerId);
                const selectedMethodKey = selectedMethods[sellerId];
                const activeMethod = sellerResult?.methods.find(m => m.method === selectedMethodKey) || sellerResult?.defaultMethod;
                return (
                <View key={sellerId} style={groupIdx > 0 && { marginTop: 16 }}>
                  <View style={styles.sellerHeaderRow}>
                    <Store size={14} color={COLORS.gray500} />
                    <Text style={styles.sellerNameHeader}>{sellerDisplayName}</Text>
                  </View>
                  {sellerItems.map((item) => (
                    <View key={item.id} style={styles.compactOrderItem}>
                      <Image source={{ uri: safeImageUri(item.image) }} style={styles.compactThumbnail} />
                      <View style={styles.compactOrderInfo}>
                        <Text style={styles.compactProductName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.compactDetailsRow}>
                          {/* Show selected variants */}
                          {item.selectedVariant && (
                            <Text style={styles.compactVariantText}>
                              {[item.selectedVariant.option1Value, item.selectedVariant.option2Value]
                                .filter(Boolean)
                                .join(' / ')}
                            </Text>
                          )}
                        </View>
                        <View style={styles.compactPriceRow}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            {item.originalPrice && item.originalPrice > (item.price || 0) ? (
                              <>
                                <Text style={[styles.compactPrice, { color: '#DC2626' }]}>₱{(item.price || 0).toLocaleString()}</Text>
                                <Text style={styles.compactOriginalPrice}>₱{item.originalPrice.toLocaleString()}</Text>
                              </>
                            ) : (
                              <Text style={[styles.compactPrice, { color: COLORS.primary }]}>₱{(item.price || 0).toLocaleString()}</Text>
                            )}
                          </View>
                          <Text style={styles.compactQuantity}>x{item.quantity}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  {/* BX-09-002 — Shipping Method Picker (replaces static fee display) */}
                  <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
                    <ShippingMethodPicker
                      methods={sellerResult?.methods ?? []}
                      selectedMethod={(selectedMethods[sellerId] as any) ?? null}
                      onSelectMethod={(method) => {
                        setSelectedMethods(prev => ({ ...prev, [sellerId]: method }));
                      }}
                      isLoading={isCalculatingShipping}
                      error={sellerResult?.error ?? null}
                      warning={sellerResult?.warning ?? null}
                      onRetry={retryShipping}
                    />
                  </View>
                  {/* Per-Store Subtotal Including Shipping */}
                  <View style={styles.sellerFooterRow}>
                    {(() => {
                      const totalQuantity = sellerItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
                      return (
                        <Text style={[styles.sellerFooterText, { fontWeight: '600' }]}>Subtotal ({totalQuantity} {totalQuantity === 1 ? 'item' : 'items'}): </Text>
                      );
                    })()}
                    <Text style={[styles.sellerFooterAmount, { fontWeight: '600', color: COLORS.primary }]}>
                      ₱{(sellerItems.reduce((acc, i) => acc + (i.price || 0) * i.quantity, 0) + (perStoreShippingFees[sellerId] || 0)).toLocaleString()}
                    </Text>
                  </View>
                </View>
              );
              })}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Payment Method</Text>
              </View>

              <Pressable
                onPress={() => setPaymentMethod('paymongo')}
                style={[
                  styles.paymentOption,
                  paymentMethod === 'paymongo' && styles.paymentOptionActive
                ]}
              >
                <View style={styles.radio}>
                  {paymentMethod === 'paymongo' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.paymentText}>PayMongo</Text>
                  </View>
                  <Text style={styles.paymentSubtext}>Securely pay with your card</Text>
                </View>
                <Shield size={16} color={COLORS.primary} />
              </Pressable>

              {/* PayMongo Payment Method */}
              {paymentMethod === 'paymongo' && (
                <View style={styles.cardFormContainer}>
                  <Text style={styles.cardFormTitle}>💳 Payment Method</Text>

                  {/* Loading State */}
                  {loadingPaymentMethods && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.loadingText}>Loading saved cards...</Text>
                    </View>
                  )}

                  {/* Saved Cards Section */}
                  {!loadingPaymentMethods && savedPaymentMethods.length > 0 && (
                    <View style={styles.savedCardsSection}>
                      <Text style={styles.savedCardsTitle}>Your Saved Cards</Text>
                      {savedPaymentMethods.map((method) => (
                        <Pressable
                          key={method.id}
                          onPress={() => setSelectedPaymentMethodId(method.id)}
                          style={[
                            styles.savedCardOption,
                            selectedPaymentMethodId === method.id && styles.savedCardOptionSelected
                          ]}
                        >
                          <View style={styles.cardRadio}>
                            {selectedPaymentMethodId === method.id && (
                              <View style={styles.cardRadioInner} />
                            )}
                          </View>
                          <View style={styles.savedCardInfo}>
                            <Text style={styles.savedCardName}>{method.cardholderName}</Text>
                            {method.isDefault && (
                              <View style={styles.defaultBadgeSmall}>
                                <Text style={styles.defaultBadgeText}>Default</Text>
                              </View>
                            )}
                          </View>
                          <ChevronRight size={16} color={COLORS.textMuted} />
                        </Pressable>
                      ))}
                      
                      {/* Use Different Card Button - Create order and navigate to PaymentGatewayScreen */}
                      <Pressable
                        onPress={async () => {
                          try {
                            setIsProcessing(true);
                            setProcessingMessage('Redirecting to secure payment gateway');

                            // Validate required fields before proceeding to payment gateway
                            if (!user?.id) {
                              Alert.alert('Error', 'User not authenticated. Please sign in again.');
                              setIsProcessing(false);
                              return;
                            }
                            
                            if (!selectedAddress) {
                              Alert.alert('Error', 'Please select a delivery address');
                              setIsProcessing(false);
                              return;
                            }

                            const sellerId = checkoutItems[0]?.seller_id || checkoutItems[0]?.sellerId;
                            if (!sellerId) {
                              Alert.alert('Error', 'No seller found for items. Please try again.');
                              setIsProcessing(false);
                              return;
                            }

                            // Prepare checkout payload with full details
                            const payload = {
                              userId: user.id,
                              items: checkoutItems,
                              totalAmount: total,
                              shippingAddress: {
                                fullName: `${selectedAddress.firstName} ${selectedAddress.lastName}`,
                                street: selectedAddress.street || '',
                                barangay: selectedAddress.barangay || '',
                                city: selectedAddress.city || 'Manila',
                                province: selectedAddress.province || 'Metro Manila',
                                region: selectedAddress.region || 'NCR',
                                postalCode: selectedAddress.zipCode || '0000',
                                phone: selectedAddress.phone || '',
                                country: 'Philippines'
                              },
                              paymentMethod: 'paymongo',
                              usedBazcoins: bazcoinDiscount,
                              earnedBazcoins,
                              shippingFee,
                              discount,
                              voucherId: appliedVoucher?.id || null,
                              discountAmount: discount,
                              email: user.email,
                              campaignDiscountTotal,
                              campaignDiscounts: checkoutItems
                                .filter(item => item.campaignDiscount)
                                .map(item => ({
                                  campaignId: item.campaignDiscount?.campaignId,
                                  campaignName: item.campaignDiscount?.campaignName || 'Discount',
                                  discountAmount: ((item.originalPrice ?? item.price ?? 0) - (item.price ?? 0)) * item.quantity,
                                  productId: item.id,
                                  quantity: item.quantity
                                })),
                              shippingBreakdown: shippingResults.map(r => {
                                const methodKey = selectedMethods[r.sellerId];
                                const method = r.methods.find(m => m.method === methodKey) || r.defaultMethod;
                                return {
                                  sellerId: r.sellerId,
                                  sellerName: r.sellerName,
                                  method: method?.method ?? 'standard',
                                  methodLabel: method?.label ?? 'Standard',
                                  fee: method?.fee ?? 0,
                                  breakdown: method?.breakdown ?? { baseRate: 0, weightSurcharge: 0, valuationFee: 0, odzFee: 0 },
                                  estimatedDays: method?.estimatedDays ?? 'N/A',
                                  originZone: r.originZone,
                                  destinationZone: r.destinationZone,
                                };
                              })
                            };

                            // Call processCheckout to create the actual order in database
                            console.log('[Checkout] 🔄 Processing checkout for "Use Different Card" flow...');
                            const result = await processCheckout(payload);

                            if (!result.success || !result.orderUuids || result.orderUuids.length === 0) {
                              Alert.alert('Error', 'Failed to create order. Please try again.');
                              return;
                            }

                            console.log('[Checkout] ✅ processCheckout result:', {
                              success: result.success,
                              orderIds: result.orderIds,
                              orderUuids: result.orderUuids
                            });

                            // Now create the serializable order object for navigation
                            const shippingAddressForOrder: ShippingAddress = {
                              name: `${selectedAddress.firstName} ${selectedAddress.lastName}`.trim(),
                              email: user.email,
                              phone: selectedAddress.phone || '',
                              address: `${selectedAddress.street || ''}${selectedAddress.barangay ? `, ${selectedAddress.barangay}` : ''}`,
                              city: selectedAddress.city || 'Manila',
                              region: selectedAddress.province || selectedAddress.region || 'NCR',
                              postalCode: selectedAddress.zipCode || '0000',
                            };

                            const orderObject: Order = {
                              id: result.orderIds?.[0] || 'ORD-' + Date.now(),
                              orderId: result.orderUuids?.[0],
                              buyerId: user.id,
                              sellerId: sellerId,
                              transactionId: 'TXN' + Math.random().toString(36).slice(2, 10).toUpperCase(),
                              items: checkoutItems,
                              total,
                              shippingFee,
                              discount: discount > 0 ? discount : undefined,
                              voucherInfo: appliedVoucher ? {
                                code: appliedVoucher.code,
                                type: appliedVoucher.type,
                                discountAmount: discount
                              } : undefined,
                              status: 'pending',
                              isPaid: false,
                              scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
                              shippingAddress: shippingAddressForOrder,
                              paymentMethod: 'paymongo',
                              createdAt: new Date().toISOString(),
                            };

                            // Create serializable version for navigation
                            const serializableOrderForNavigation = {
                              ...orderObject,
                              items: (orderObject.items || []).map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                quantity: item.quantity,
                                image: item.image,
                                sellerId: item.sellerId || item.seller_id,
                                cartItemId: item.cartItemId,
                                selectedVariant: item.selectedVariant,
                              }))
                            };

                            console.log('[Checkout] ✅ Navigating to PaymentGateway with order:', {
                              orderId: serializableOrderForNavigation?.orderId,
                              orderTotal: serializableOrderForNavigation?.total,
                              orderSellerId: serializableOrderForNavigation?.sellerId,
                              orderBuyerId: serializableOrderForNavigation?.buyerId,
                            });

                            setProcessingMessage('Redirecting to secure payment gateway');

                            navigation.navigate('PaymentGateway', { 
                              paymentMethod: 'paymongo', 
                              order: serializableOrderForNavigation,
                              checkoutPayload: payload,
                              isQuickCheckout: false,
                              earnedBazcoins,
                              bazcoinDiscount,
                              appliedVoucher,
                              isGift: false,
                              isAnonymous: false,
                              recipientId: undefined
                            } as any);
                          } catch (error: any) {
                            setIsProcessing(false);
                            console.error('[Checkout] ❌ Error in Use Different Card:', error);
                            Alert.alert('Error', error?.message || 'Failed to process order. Please try again.');
                          }
                        }}
                        style={styles.useDifferentCardButton}
                      >
                        <Text style={styles.useDifferentCardText}>💳 Use Different Card</Text>
                      </Pressable>
                    </View>
                  )}

                  {/* No Saved Cards - Show "Add Card Details" button */}
                  {!loadingPaymentMethods && savedPaymentMethods.length === 0 && (
                    <View style={{ marginVertical: 12 }}>
                      <View style={{ marginBottom: 12, borderRadius: 12, overflow: 'hidden' }}>
                        <LinearGradient
                          colors={['#E0F2FE', '#F0F9FF']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={{
                            borderWidth: 1.5,
                            borderColor: '#0EA5E9',
                            borderRadius: 12,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0369A1', marginBottom: 6 }}>
                              No Saved Cards Yet
                            </Text>
                            <Text style={{ fontSize: 12, color: '#0369A1', lineHeight: 18, opacity: 0.85 }}>
                              Add your card securely below. It will be saved to your Payment Methods for future orders.
                            </Text>
                          </View>
                          <CreditCard size={28} color="#0EA5E9" style={{ marginLeft: 12 }} />
                        </LinearGradient>
                      </View>

                      {/* Add Card Details Button */}
                      <Pressable
                        onPress={async () => {
                          try {
                            setIsProcessing(true);
                            setProcessingMessage('Redirecting to card entry');

                            // Validate required fields before proceeding to payment gateway
                            if (!user?.id) {
                              Alert.alert('Error', 'User not authenticated. Please sign in again.');
                              setIsProcessing(false);
                              return;
                            }
                            
                            if (!selectedAddress) {
                              Alert.alert('Error', 'Please select a delivery address');
                              setIsProcessing(false);
                              return;
                            }

                            const sellerId = checkoutItems[0]?.seller_id || checkoutItems[0]?.sellerId;
                            if (!sellerId) {
                              Alert.alert('Error', 'No seller found for items. Please try again.');
                              setIsProcessing(false);
                              return;
                            }

                            // Prepare checkout payload with full details
                            const payload = {
                              userId: user.id,
                              items: checkoutItems,
                              totalAmount: total,
                              shippingAddress: {
                                fullName: `${selectedAddress.firstName} ${selectedAddress.lastName}`,
                                street: selectedAddress.street || '',
                                barangay: selectedAddress.barangay || '',
                                city: selectedAddress.city || 'Manila',
                                province: selectedAddress.province || 'Metro Manila',
                                region: selectedAddress.region || 'NCR',
                                postalCode: selectedAddress.zipCode || '0000',
                                phone: selectedAddress.phone || '',
                                country: 'Philippines'
                              },
                              paymentMethod: 'paymongo',
                              usedBazcoins: bazcoinDiscount,
                              earnedBazcoins,
                              shippingFee,
                              discount,
                              voucherId: appliedVoucher?.id || null,
                              discountAmount: discount,
                              email: user.email,
                              campaignDiscountTotal,
                              campaignDiscounts: checkoutItems
                                .filter(item => item.campaignDiscount)
                                .map(item => ({
                                  campaignId: item.campaignDiscount?.campaignId,
                                  campaignName: item.campaignDiscount?.campaignName || 'Discount',
                                  discountAmount: ((item.originalPrice ?? item.price ?? 0) - (item.price ?? 0)) * item.quantity,
                                  productId: item.id,
                                  quantity: item.quantity
                                })),
                              shippingBreakdown: shippingResults.map(r => {
                                const methodKey = selectedMethods[r.sellerId];
                                const method = r.methods.find(m => m.method === methodKey) || r.defaultMethod;
                                return {
                                  sellerId: r.sellerId,
                                  sellerName: r.sellerName,
                                  method: method?.method ?? 'standard',
                                  methodLabel: method?.label ?? 'Standard',
                                  fee: method?.fee ?? 0,
                                  breakdown: method?.breakdown ?? { baseRate: 0, weightSurcharge: 0, valuationFee: 0, odzFee: 0 },
                                  estimatedDays: method?.estimatedDays ?? 'N/A',
                                  originZone: r.originZone,
                                  destinationZone: r.destinationZone,
                                };
                              })
                            };

                            // Call processCheckout to create the actual order in database
                            console.log('[Checkout] 🔄 Processing checkout for "Add Card Details" flow...');
                            const result = await processCheckout(payload);

                            if (!result.success || !result.orderUuids || result.orderUuids.length === 0) {
                              Alert.alert('Error', 'Failed to create order. Please try again.');
                              return;
                            }

                            console.log('[Checkout] ✅ processCheckout result:', {
                              success: result.success,
                              orderIds: result.orderIds,
                              orderUuids: result.orderUuids
                            });

                            // Now create the serializable order object for navigation
                            const shippingAddressForOrder: ShippingAddress = {
                              name: `${selectedAddress.firstName} ${selectedAddress.lastName}`.trim(),
                              email: user.email,
                              phone: selectedAddress.phone || '',
                              address: `${selectedAddress.street || ''}${selectedAddress.barangay ? `, ${selectedAddress.barangay}` : ''}`,
                              city: selectedAddress.city || 'Manila',
                              region: selectedAddress.province || selectedAddress.region || 'NCR',
                              postalCode: selectedAddress.zipCode || '0000',
                            };

                            const orderObject: Order = {
                              id: result.orderIds?.[0] || 'ORD-' + Date.now(),
                              orderId: result.orderUuids?.[0],
                              buyerId: user.id,
                              sellerId: sellerId,
                              transactionId: 'TXN' + Math.random().toString(36).slice(2, 10).toUpperCase(),
                              items: checkoutItems,
                              total,
                              shippingFee,
                              discount: discount > 0 ? discount : undefined,
                              voucherInfo: appliedVoucher ? {
                                code: appliedVoucher.code,
                                type: appliedVoucher.type,
                                discountAmount: discount
                              } : undefined,
                              status: 'pending',
                              isPaid: false,
                              scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US'),
                              shippingAddress: shippingAddressForOrder,
                              paymentMethod: 'paymongo',
                              createdAt: new Date().toISOString(),
                            };

                            // Create serializable version for navigation
                            const serializableOrderForNavigation = {
                              ...orderObject,
                              items: (orderObject.items || []).map((item: any) => ({
                                id: item.id,
                                name: item.name,
                                price: item.price,
                                quantity: item.quantity,
                                image: item.image,
                                sellerId: item.sellerId || item.seller_id,
                                cartItemId: item.cartItemId,
                                selectedVariant: item.selectedVariant,
                              }))
                            };

                            console.log('[Checkout] ✅ Navigating to PaymentGateway with order:', {
                              orderId: serializableOrderForNavigation?.orderId,
                              orderTotal: serializableOrderForNavigation?.total,
                              orderSellerId: serializableOrderForNavigation?.sellerId,
                              orderBuyerId: serializableOrderForNavigation?.buyerId,
                            });

                            setProcessingMessage('Opening card entry screen');

                            navigation.navigate('PaymentGateway', { 
                              paymentMethod: 'paymongo', 
                              order: serializableOrderForNavigation,
                              checkoutPayload: payload,
                              isQuickCheckout: false,
                              earnedBazcoins,
                              bazcoinDiscount,
                              appliedVoucher,
                              isGift: false,
                              isAnonymous: false,
                              recipientId: undefined
                            } as any);
                          } catch (error: any) {
                            setIsProcessing(false);
                            console.error('[Checkout] ❌ Error in Add Card Details:', error);
                            Alert.alert('Error', error?.message || 'Failed to process order. Please try again.');
                          }
                        }}
                        style={[styles.useDifferentCardButton, { backgroundColor: COLORS.primary }]}
                      >
                        <Text style={[styles.useDifferentCardText, { color: '#FFFFFF' }]}>Add Card Details</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (isGift) {
                    Alert.alert('Not Available', 'Cash on Delivery is not available for wishlist/registry items.');
                    return;
                  }
                  setPaymentMethod('cod');
                }}
                style={[
                  styles.paymentOption,
                  paymentMethod === 'cod' && styles.paymentOptionActive,
                  isGift && { opacity: 0.5, backgroundColor: '#F3F4F6' }
                ]}
              >
                <View style={styles.radio}>
                  {paymentMethod === 'cod' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.paymentText, isGift && { color: '#9CA3AF' }]}>Cash on Delivery</Text>
                  <Text style={styles.paymentSubtext}>
                    {isGift ? 'Not available for wishlist items' : 'Pay when you receive'}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                onPress={() => { }}
                style={[styles.paymentOption, { opacity: 0.5, backgroundColor: '#F3F4F6' }]}
              >
                <View style={styles.radio}>
                  {paymentMethod === 'gcash' && <View style={styles.radioInner} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.paymentText, { color: '#9CA3AF' }]}>GCash</Text>
                    <View style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280' }}>COMING SOON</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentSubtext}>Instantly paid online</Text>
                </View>
                <Shield size={16} color="#9CA3AF" />
              </Pressable>

              <View>
                <Pressable
                  onPress={() => { }}
                  style={[styles.paymentOption, { opacity: 0.5, backgroundColor: '#F3F4F6' }]}
                >
                  <View style={styles.radio}>
                    {paymentMethod === 'card' && <View style={styles.radioInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.paymentText, { color: '#9CA3AF' }]}>Credit/Debit Card</Text>
                      <View style={{ backgroundColor: '#E5E7EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#6B7280' }}>COMING SOON</Text>
                      </View>
                    </View>
                    <Text style={styles.paymentSubtext}>Instantly paid online</Text>
                  </View>
                  <CreditCard size={16} color="#9CA3AF" />
                </Pressable>

                {/* Saved Cards List */}
                {paymentMethod === 'card' && savedPaymentMethods && savedPaymentMethods.length > 0 && (
                  <View style={styles.savedCardsContainer}>
                    {savedPaymentMethods.map((card: any) => (
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
                    <Text style={styles.appliedVoucherCode}>{appliedVoucher.code}</Text>
                    <Text style={styles.appliedVoucherDesc}>
                      {appliedVoucher.type === 'percentage'
                        ? `${appliedVoucher.value}% off`
                        : appliedVoucher.type === 'fixed'
                          ? `₱${appliedVoucher.value} off`
                          : 'Free shipping'}
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
                  <Text style={styles.voucherHint}>Enter a valid voucher code to avail discounts</Text>
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
            <View style={[styles.sectionCard, { marginBottom: 24 }]}>
              <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>Payment Details</Text>

              {/* Show original subtotal and campaign discount if applicable */}
              {campaignDiscountTotal > 0 && (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Original Price</Text>
                    <Text style={[styles.summaryValue, { color: '#000000' }]}>₱{originalSubtotal.toLocaleString()}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Campaign Discount</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.primary }]}>-₱{campaignDiscountTotal.toLocaleString()}</Text>
                  </View>
                </>
              )}

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
                  <Text style={[styles.summaryValue, { color: COLORS.primary }]}>-₱{discount.toLocaleString()}</Text>
                </View>
              )}

              {useBazcoins && bazcoinDiscount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Bazcoins Redeemed</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.primary }]}>-₱{bazcoinDiscount.toLocaleString()}</Text>
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

              {hasVacationSeller && (
                <View style={{ marginTop: 12, backgroundColor: '#FFF7ED', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFEDD5', flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                  <Palmtree size={20} color="#EA580C" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#C2410C' }}>Some sellers are currently unavailable</Text>
                    <Text style={{ fontSize: 11, color: '#EA580C', marginTop: 4 }}>
                      The following seller(s) are on vacation: <Text style={{ fontWeight: '700' }}>{vacationSellers.join(', ')}</Text>. Please remove their items from your cart to proceed.
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.totalAmount, { color: COLORS.primary }]}>₱{total.toLocaleString()}</Text>
                {totalSavings > 0 && (
                  <Text style={styles.totalSavedAmount}>Saved ₱{totalSavings.toLocaleString()}</Text>
                )}
              </View>
            </View>
            <Pressable
              onPress={handlePlaceOrder}
              disabled={isProcessing || !selectedAddress || hasVacationSeller || hasUnavailableItems}
              style={({ pressed }) => [
                styles.checkoutButton,
                pressed && styles.checkoutButtonPressed,
                (isProcessing || !selectedAddress || hasVacationSeller || hasUnavailableItems) && { opacity: 0.5 }
              ]}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.checkoutButtonText}>Place Order</Text>
              )}
            </Pressable>
          </View>

        </KeyboardAvoidingView>

        {/* Unavailable Items Alert - Fixed at bottom */}
        {hasUnavailableItems && (
          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#FECACA' }}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B', marginBottom: 8 }}>Items No Longer Available</Text>
                {unavailableItems.map((item, idx) => (
                  <Text key={`unavailable-${item.id}-${idx}`} style={{ fontSize: 11, color: '#7F1D1D', marginBottom: idx < unavailableItems.length - 1 ? 6 : 0 }}>
                    • {item.name}
                  </Text>
                ))}
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={{ marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#DC2626', borderRadius: 6 }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>Update Cart</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Modals Moved to Root for Edge-to-Edge immersion */}
      {/* --- LOCATION MODAL (Map-First Address Flow) --- */}
      <LocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={handleLocationModalSelect}
        currentAddress={selectedAddress ? `${selectedAddress.street}, ${selectedAddress.city}` : undefined}
        initialCoordinates={selectedAddress?.coordinates || null}
        statusBarTranslucent={true}
      />

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        animationType="none"
        transparent={true}
        onRequestClose={handleCloseAddressModal}
        statusBarTranslucent={true}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: addressFadeAnim }]}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                paddingBottom: insets.bottom + 20,
                transform: [{ translateY: addressSlideAnim }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Shipping Information</Text>
              <Pressable onPress={handleCloseAddressModal}>
                <X size={24} color="#1F2937" />
              </Pressable>
            </View>

            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <Pressable
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#FEF3E8',
                  paddingVertical: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#FED7AA'
                }}
                onPress={handleAddNew}
              >
                <Plus size={20} color={COLORS.primary} />
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary }}>Add New Address</Text>
              </Pressable>
            </View>
            {/* ScrollView and content remains the same */}
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
                        {addr.firstName} {addr.lastName}
                      </Text>
                      {addr.isDefault && (
                        <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 }}>
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Default</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 2 }}>{addr.label}</Text>
                    <Text style={{ fontSize: 13, color: '#6B7280' }}>{addr.phone}</Text>
                    <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                      {addr.street}, {addr.barangay}, {addr.city}, {addr.province}, {addr.zipCode}
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
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* --- SHARED ADDRESS FORM MODAL (Add New / Fix Address) --- */}
      {/* forceCreateMode is derived inside AddressFormModal from !initialData,
          but we pass it explicitly here so the checkout's "Add New" path can
          never accidentally show the saved-address chip strip. */}
      <AddressFormModal
        visible={showAddressFormModal}
        onClose={() => setShowAddressFormModal(false)}
        initialData={editingAddressForForm}
        forceCreateMode={editingAddressForForm === null}
        userId={user?.id ?? ''}
        existingCount={addresses.length}
        context="buyer"
        onSaved={(saved) => {
          // Update local address list
          setAddresses(prev => {
            const exists = prev.find(a => a.id === saved.id);
            if (exists) return prev.map(a => a.id === saved.id ? saved : a);
            return [saved, ...prev];
          });
          // Auto-select the saved address at checkout
          setSelectedAddress(saved);
          setTempSelectedAddress(saved);
          setShowAddressFormModal(false);
        }}
      />

      {/* Loading Modal Overlay - Matches Design Image */}
      <Modal
        visible={isProcessing}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Animated Spinner Arc - Single rotating element */}
            <Animated.View
              style={{
                transform: [
                  {
                    rotate: processingFadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }
                ]
              }}
            >
              <View
                style={{
                  width: 35,
                  height: 35,
                  borderRadius: 25,
                  borderWidth: 4,
                  borderColor: '#FFFFFF',
                  borderTopColor: COLORS.primary,
                }}
              />
            </Animated.View>

            {/* Loading Text - Context-aware message */}
            <Text
              style={{
                marginTop: 24,
                fontSize: 13,
                fontWeight: '500',
                color: '#999999',
                textAlign: 'center',
                letterSpacing: 0.2,
              }}
            >
              {processingMessage}
            </Text>

            {/* Animated Dots */}
            <View style={{ flexDirection: 'row', marginTop: 12, justifyContent: 'center', gap: 4 }}>
              {[0, 1, 2].map((index) => (
                <Animated.View
                  key={index}
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: COLORS.primary,
                    opacity: processingFadeAnim.interpolate({
                      inputRange: [0, 0.33, 0.66, 1],
                      outputRange: [0.3, 0.6, 0.9, 0.3]
                    })
                  }}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}


const styles = StyleSheet.create({
  // container: { // Replaced by gradient wrapper
  //   flex: 1,
  //   backgroundColor: COLORS.gray100,
  // },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 4,
    zIndex: 10,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textHeadline,
  },
  scrollContainer: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    fontWeight: '600',
    color: '#111827', // Black
  },
  shippingBadge: {
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  compactOrderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
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
    fontWeight: '500',
    color: COLORS.textHeadline,
    marginBottom: 0,
  },
  sellerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  sellerFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F9FAFB',
  },
  sellerFooterText: {
    fontSize: 14,
    color: COLORS.gray500,
  },
  sellerFooterAmount: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  sellerNameHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  compactDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  compactVariantText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textMuted,
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
  compactPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  compactOriginalPrice: {
    fontSize: 11,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  compactPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textHeadline,
  },
  compactQuantity: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.gray400,
    marginTop: 2,
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
    color: COLORS.textHeadline,
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  paymentOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(217, 119, 6, 0.05)',
  },
  radio: {
    width: 14,
    height: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  paymentText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textHeadline,
    marginBottom: 2,
  },
  paymentSubtext: {
    fontSize: 12,
    color: COLORS.textMuted,
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
  // Custom Address Form Styles
  inlineFormContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: 8,
  },
  inlineFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4FB',
  },
  inlineFormTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textHeadline,
  },
  formContainer: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginLeft: 2,
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    color: COLORS.textHeadline,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formActions: {
    marginTop: 8,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4FB',
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
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
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    justifyContent: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
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
    color: COLORS.textMuted,
  },
  removeVoucherButton: {
    padding: 4,
  },
  voucherHintContainer: {
    marginTop: 8,
  },
  voucherHint: {
    fontSize: 12,
    color: COLORS.textMuted,
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
    borderTopColor: '#F1F5F9',
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
    color: COLORS.gray500,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  totalSavedAmount: {
    fontSize: 12,
    fontWeight: '500',
    color: '#DC2626',
    marginTop: 2,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
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
    width: 14,
    height: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSmallSelected: {
    borderColor: COLORS.primary,
  },
  radioInnerSmall: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    color: COLORS.gray500,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginVertical: 10,
  },
  totalLabelLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  totalAmountLarge: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  customAddressModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
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
    width: 20,
    height: 20,
    borderRadius: 12,
    borderWidth: 1,
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
    borderRadius: 8,
    backgroundColor: COLORS.primary,
  },
  
  // PayMongo Payment Method Styles
  cardFormContainer: {
    marginBottom: 16,
    marginHorizontal: 0,
  },
  cardFormTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  savedCardsSection: {
    marginBottom: 12,
    marginHorizontal: 0,
  },
  savedCardsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  savedCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
    marginHorizontal: 0,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  savedCardOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F0',
  },
  cardRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  cardRadioSelected: {
    borderColor: COLORS.primary,
  },
  cardRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  cardCircleIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginRight: 12,
  },
  savedCardName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  defaultBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  defaultBadgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  useDifferentCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
    marginHorizontal: 0,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  useDifferentCardText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 6,
  },
});


