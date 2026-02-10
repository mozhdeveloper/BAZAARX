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
import { ArrowLeft, MapPin, CreditCard, Shield, Tag, X, ChevronDown, Check, Plus, ShieldCheck, ChevronRight, Home, Briefcase, MapPinned, Building2, Move, Search, ChevronUp } from 'lucide-react-native';
import MapView, { Marker, Region, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { regions, provinces, cities, barangays } from 'select-philippines-address';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../src/constants/theme';
import { processCheckout } from '@/services/checkoutService';
import { addressService } from '@/services/addressService';
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
  React.useEffect(() => {
    if (isGift) {
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

  // Address Creation States (from AddressesScreen)
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'region' | 'province' | 'city' | 'barangay' | null>(null);
  const [searchText, setSearchText] = useState('');

  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  const initialAddressState: Omit<Address, 'id'> = {
    user_id: user?.id || '',
    label: '',
    first_name: '',
    last_name: '',
    phone: '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '',
    postal_code: '',
    is_default: false,
    coordinates: null,
  };

  const [newAddress, setNewAddress] = useState<Omit<Address, 'id'>>(initialAddressState);

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

  // Payments and Vouchers
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

  // VAT calculation (12%)
  const tax = Math.round(subtotal * 0.12);

  // Item-level savings (Original price vs Current price)
  const itemSavings = checkoutItems.reduce((sum, item) => {
    const original = item.original_price || item.originalPrice || item.price || 0;
    const current = item.price || 0;
    return sum + (Math.max(0, original - current) * (item.quantity || 1));
  }, 0);

  const couponSavings = discount + bazcoinDiscount;
  const grandTotalSavings = itemSavings + couponSavings;

  const total = Math.max(0, subtotal + shippingFee + tax - couponSavings);

  useEffect(() => {
    regions().then(res => setRegionList(res));
  }, []);

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

  // --- ADDRESS HANDLERS (from AddressesScreen) ---
  const attemptGeocode = async (overrideAddress?: Partial<typeof newAddress>) => {
    const current = { ...newAddress, ...overrideAddress };
    const queryParts = [current.street, current.barangay, current.city, current.province, "Philippines"].filter(Boolean);
    if (queryParts.length < 3) return;

    const query = queryParts.join(', ');
    setIsGeocoding(true);

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`, {
        headers: { 'User-Agent': 'PHAddressApp/1.0' }
      });
      const data = await response.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);

        setNewAddress(prev => ({ ...prev, coordinates: { latitude: lat, longitude: lon } }));
        setMapRegion({
          latitude: lat,
          longitude: lon,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        });
      }
    } catch (error) {
      console.log('Geocoding error:', error);
    } finally {
      setIsGeocoding(false);
    }
  };

  const toggleDropdown = (name: 'region' | 'province' | 'city' | 'barangay') => {
    if (openDropdown === name) {
      setOpenDropdown(null);
    } else {
      setSearchText('');
      setOpenDropdown(name);
    }
  };

  const onRegionChange = async (code: string) => {
    const name = regionList.find(i => i.region_code === code)?.region_name || '';
    setNewAddress({ ...newAddress, region: name, province: '', city: '', barangay: '', coordinates: null });
    setOpenDropdown(null);
    setIsLoadingLocation(true);
    const provs = await provinces(code);
    setProvinceList(provs);
    setCityList([]);
    setBarangayList([]);
    setIsLoadingLocation(false);
  };

  const onProvinceChange = async (code: string) => {
    const name = provinceList.find(i => i.province_code === code)?.province_name || '';
    setNewAddress({ ...newAddress, province: name, city: '', barangay: '', coordinates: null });
    setOpenDropdown(null);
    setIsLoadingLocation(true);
    const cts = await cities(code);
    setCityList(cts);
    setBarangayList([]);
    setIsLoadingLocation(false);
  };

  const onCityChange = async (code: string) => {
    const name = cityList.find(i => i.city_code === code)?.city_name || '';
    setNewAddress({ ...newAddress, city: name, barangay: '', coordinates: null });
    setOpenDropdown(null);
    setIsLoadingLocation(true);
    const brgys = await barangays(code);
    setBarangayList(brgys);
    setIsLoadingLocation(false);
    attemptGeocode({ city: name, barangay: '' });
  };

  const onBarangayChange = (name: string) => {
    setNewAddress({ ...newAddress, barangay: name });
    setOpenDropdown(null);
    attemptGeocode({ barangay: name });
  };

  const onStreetBlur = () => {
    if (newAddress.street.length > 3) {
      attemptGeocode();
    }
  };

  const handleOpenAddressModalForAdd = async () => {
    setOpenDropdown(null);
    setSearchText('');
    setProvinceList([]);
    setCityList([]);
    setBarangayList([]);
    
    // Try to get location details for autofill
    let prefillData: Partial<Omit<Address, 'id'>> = {};
    try {
      const storedDetails = await AsyncStorage.getItem('currentLocationDetails');
      if (storedDetails) {
        const details = JSON.parse(storedDetails);
        console.log('[Checkout] Autofilling new address form with location details:', details);
        prefillData = {
          street: details.street || '',
          barangay: details.barangay || '',
          city: details.city || '',
          province: details.province || '',
          region: details.region || '',
          postal_code: details.postalCode || '',
        };
        
        // Pre-load dropdowns based on autofilled region/province/city
        if (details.region) {
          const allRegions = await regions();
          const matchedRegion = allRegions.find((r: any) => 
            r.region_name?.toLowerCase().includes(details.region?.toLowerCase()) ||
            details.region?.toLowerCase().includes(r.region_name?.toLowerCase())
          );
          if (matchedRegion) {
            const provList = await provinces(matchedRegion.region_code);
            setProvinceList(provList);
            
            if (details.province) {
              const matchedProv = provList.find((p: any) => 
                p.province_name?.toLowerCase().includes(details.province?.toLowerCase()) ||
                details.province?.toLowerCase().includes(p.province_name?.toLowerCase())
              );
              if (matchedProv) {
                const cList = await cities(matchedProv.province_code);
                setCityList(cList);
                
                if (details.city) {
                  const matchedCity = cList.find((c: any) => 
                    c.city_name?.toLowerCase().includes(details.city?.toLowerCase()) ||
                    details.city?.toLowerCase().includes(c.city_name?.toLowerCase())
                  );
                  if (matchedCity) {
                    const bList = await barangays(matchedCity.city_code);
                    setBarangayList(bList);
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.log('[Checkout] Error loading location details for autofill:', err);
    }
    
    setNewAddress({
      ...initialAddressState,
      first_name: user?.name?.split(' ')[0] || '',
      last_name: user?.name?.split(' ').slice(1).join(' ') || '',
      phone: user?.phone || '',
      is_default: addresses.length === 0,
      ...prefillData,
    });
    setMapRegion(DEFAULT_REGION);
    setIsAddressModalOpen(true);
  };

  const handleConfirmLocation = () => {
    setNewAddress({
      ...newAddress,
      coordinates: {
        latitude: mapRegion.latitude,
        longitude: mapRegion.longitude,
      },
    });
    setIsMapModalOpen(false);
  };

  const handleSaveAddress = async () => {
    if (!user) return;
    setIsSaving(true);

    // Validate required fields
    if (!newAddress.first_name || !newAddress.phone || !newAddress.street || !newAddress.city || !newAddress.province || !newAddress.region) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields: Name, Phone, Street, Region, Province, and City.');
      setIsSaving(false);
      return;
    }

    try {
      const created = await addressService.createAddress(user.id, {
        label: newAddress.label || 'Other',
        firstName: newAddress.first_name,
        lastName: newAddress.last_name,
        phone: newAddress.phone,
        street: newAddress.street,
        barangay: newAddress.barangay,
        city: newAddress.city,
        province: newAddress.province,
        region: newAddress.region,
        zipCode: newAddress.postal_code,
        isDefault: newAddress.is_default,
        coordinates: newAddress.coordinates,
        addressType: 'residential',
        landmark: null,
        deliveryInstructions: null,
      });

      const createdLocal: Address = {
        id: created.id,
        user_id: user.id,
        label: created.label,
        first_name: created.firstName,
        last_name: created.lastName,
        phone: created.phone,
        street: created.street,
        barangay: created.barangay,
        city: created.city,
        province: created.province,
        region: created.region,
        postal_code: created.zipCode,
        is_default: created.isDefault,
        coordinates: created.coordinates,
      };

      setAddresses(prev => [createdLocal, ...prev]);
      setSelectedAddress(createdLocal);
      setTempSelectedAddress(createdLocal);
      setIsSaving(false);
      setIsAddressModalOpen(false);
      setShowAddressModal(false);
    } catch (error) {
      console.error('Error saving address:', error);
      Alert.alert('Error', 'Failed to save address. Please try again.');
      setIsSaving(false);
    }
  };

  const getAddressIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home': return Home;
      case 'office': return Briefcase;
      default: return MapPinned;
    }
  };

  // Fetch addresses and Bazcoins via service layer
  useEffect(() => {
    if (!user?.id) return;

    const fetchData = async () => {
      setIsLoadingAddresses(true);
      try {
        // Fetch all saved addresses
        const serviceAddresses = await addressService.getAddresses(user.id);
        const addressData: Address[] = (serviceAddresses || []).map(a => ({
          id: a.id,
          user_id: user.id,
          label: a.label,
          first_name: a.firstName,
          last_name: a.lastName,
          phone: a.phone,
          street: a.street,
          barangay: a.barangay,
          city: a.city,
          province: a.province,
          region: a.region,
          postal_code: a.zipCode,
          is_default: a.isDefault,
          coordinates: a.coordinates,
        }));
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
        //           2) "Current Location" from database (saved by HomeScreen)
        //           3) AsyncStorage fallback (if route params not available)
        //           4) Default saved address
        //           5) First saved address
        let homeScreenAddress = params?.deliveryAddress;
        let homeScreenCoords = params?.deliveryCoordinates;

        // If no route params, try to get from AsyncStorage or database
        if (!homeScreenAddress || homeScreenAddress === 'Select Location') {
          try {
            // First try database for "Current Location"
            const dbCurrentLoc = await addressService.getCurrentDeliveryLocation(user.id);
            if (dbCurrentLoc && dbCurrentLoc.label === 'Current Location') {
              console.log('[Checkout] Found Current Location in database');
              homeScreenAddress = `${dbCurrentLoc.street}, ${dbCurrentLoc.city}`;
              homeScreenCoords = dbCurrentLoc.coordinates;
            } else {
              // Fall back to AsyncStorage
              const storedAddress = await AsyncStorage.getItem('currentDeliveryAddress');
              const storedCoords = await AsyncStorage.getItem('currentDeliveryCoordinates');
              if (storedAddress && storedAddress !== 'Select Location') {
                console.log('[Checkout] Found address in AsyncStorage:', storedAddress);
                homeScreenAddress = storedAddress;
                homeScreenCoords = storedCoords ? JSON.parse(storedCoords) : null;
              }
            }
          } catch (storageError) {
            console.log('[Checkout] Error reading stored address:', storageError);
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
            console.log('[Checkout] Found location details from HomeScreen:', locationDetails);
          }
        } catch (detailsError) {
          console.log('[Checkout] Error reading location details:', detailsError);
        }

        if (homeScreenAddress && homeScreenAddress !== 'Select Location') {
          console.log('[Checkout] Using address from HomeScreen:', homeScreenAddress);

          // Check if this matches a saved address (including "Current Location" from DB)
          const matchingAddress = addressData.find(addr =>
            addr.label === 'Current Location' ||
            `${addr.street}, ${addr.city}` === homeScreenAddress ||
            homeScreenAddress.includes(addr.street)
          );

          if (matchingAddress) {
            // Use the matching saved address
            console.log('[Checkout] Found matching saved address:', matchingAddress.label);
            setSelectedAddress(matchingAddress);
            setTempSelectedAddress(matchingAddress);
          } else {
            // Create a temporary address object from HomeScreen's location
            // Use parsed details from map if available, otherwise parse the address string
            console.log('[Checkout] Creating temporary address from HomeScreen location');
            const tempAddr: Address = {
              id: 'temp-' + Date.now(),
              user_id: user.id,
              label: 'Current Location',
              first_name: user.name?.split(' ')[0] || 'User',
              last_name: user.name?.split(' ').slice(1).join(' ') || '',
              phone: user.phone || '',
              street: locationDetails?.street || homeScreenAddress.split(',')[0].trim(),
              barangay: locationDetails?.barangay || '',
              city: locationDetails?.city || homeScreenAddress.split(',')[1]?.trim() || '',
              province: locationDetails?.province || homeScreenAddress.split(',')[2]?.trim() || '',
              region: locationDetails?.region || '',
              postal_code: locationDetails?.postalCode || '',
              is_default: false,
              coordinates: homeScreenCoords || null,
            };
            console.log('[Checkout] Temp address with autofill:', {
              street: tempAddr.street,
              barangay: tempAddr.barangay,
              city: tempAddr.city,
              province: tempAddr.province,
              region: tempAddr.region,
            });
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

        // Fetch Bazcoins balance
        const coins = await addressService.getBazcoins(user.id);
        console.log('[Checkout] Fetched Bazcoins:', coins);
        setAvailableBazcoins(coins || 0);
      } catch (error) {
        console.error('Error fetching checkout data:', error);
      } finally {
        setIsLoadingAddresses(false);
      }
    };

    fetchData();

    // Subscribe to real-time Bazcoins updates via service
    const subscription = addressService.subscribeToBazcoinChanges(user.id, (newBalance) => {
      console.log('[Checkout] Bazcoins updated:', newBalance);
      setAvailableBazcoins(newBalance || 0);
    });

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

    // Validate required address fields
    if (!selectedAddress.city || !selectedAddress.province || !selectedAddress.region) {
      Alert.alert('Incomplete Address', 'Your address is missing required fields (City, Province, or Region). Please update your address.');
      setShowAddressModal(true);
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
          street: selectedAddress.street || '',
          barangay: selectedAddress.barangay || '',
          city: selectedAddress.city || 'Manila',
          province: selectedAddress.province || 'Metro Manila',
          region: selectedAddress.region || 'NCR',
          postalCode: selectedAddress.postal_code || '0000',
          phone: selectedAddress.phone || '',
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

      const shippingAddressForOrder: ShippingAddress = {
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
        isGift,
        isAnonymous,
        recipientId: isGift ? recipientId : undefined
      };

      // Check if online payment (GCash, PayMongo, PayMaya, Card)

      if (isOnlinePayment) {
        // Navigate to payment gateway simulation
        // Pass isQuickCheckout flag so we know what to clear later
        navigation.navigate('PaymentGateway', { paymentMethod, order, isQuickCheckout });
      } else {
        // COD - Cart items already removed per processCheckout; just clear quick order if used
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
                    {/* Show selected variant using dynamic labels if available */}
                    {item.selectedVariant?.option1Value && (
                      <View style={styles.compactVariantTag}>
                        <Text style={styles.compactVariantText}>
                          {item.selectedVariant.option1Label || 'Color'}: {item.selectedVariant.option1Value}
                        </Text>
                      </View>
                    )}
                    {item.selectedVariant?.option2Value && (
                      <View style={styles.compactVariantTag}>
                        <Text style={styles.compactVariantText}>
                          {item.selectedVariant.option2Label || 'Size'}: {item.selectedVariant.option2Value}
                        </Text>
                      </View>
                    )}
                    {/* Legacy support for color/size fields */}
                    {!item.selectedVariant?.option1Value && item.selectedVariant?.color && (
                      <View style={styles.compactVariantTag}>
                        <Text style={styles.compactVariantText}>{item.selectedVariant.color}</Text>
                      </View>
                    )}
                    {!item.selectedVariant?.option2Value && item.selectedVariant?.size && (
                      <View style={styles.compactVariantTag}>
                        <Text style={styles.compactVariantText}>{item.selectedVariant.size}</Text>
                      </View>
                    )}
                    {/* Fallback if no variant selected */}
                    {!item.selectedVariant?.option1Value && !item.selectedVariant?.option2Value && 
                     !item.selectedVariant?.color && !item.selectedVariant?.size && (
                      <Text style={styles.compactVariantText}>Standard</Text>
                    )}
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

            {isLoadingAddresses ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={{ marginTop: 8, color: '#6B7280' }}>Loading addresses...</Text>
              </View>
            ) : selectedAddress ? (
              <View>
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
                <Text style={{ marginTop: 8, fontSize: 14, fontWeight: '600', color: '#111827' }}>
                  Add Delivery Address
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>
                  Tap to add your shipping address
                </Text>
              </Pressable>
            )}
          </View>

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

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tax (12% VAT)</Text>
              <Text style={styles.summaryValue}>₱{tax.toLocaleString()}</Text>
            </View>

            {couponSavings > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discounts & Rewards</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>-₱{couponSavings.toLocaleString()}</Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabelLarge}>Total Payment</Text>
              <Text style={styles.totalAmountLarge}>₱{total.toLocaleString()}</Text>
            </View>

            {grandTotalSavings > 0 && (
              <View style={{ marginTop: 8, alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '700' }}>
                  You're saving ₱{grandTotalSavings.toLocaleString()} on this order!
                </Text>
              </View>
            )}

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
                  onPress={handleOpenAddressModalForAdd}
                >
                  <Plus size={20} color={COLORS.primary} />
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary }}>Add New Address</Text>
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
                      onPress={handleOpenAddressModalForAdd}
                    >
                      <Plus size={20} color="white" style={{ marginRight: 8 }} />
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

        {/* --- ADD NEW ADDRESS MODAL (Nested/Separate) --- */}
        <Modal
          visible={isAddressModalOpen}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setIsAddressModalOpen(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1F2937' }}>Add New Address</Text>
              <Pressable onPress={() => setIsAddressModalOpen(false)} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center' }}>
                <X size={22} color="#1F2937" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">

              {/* Type Selector */}
              <View style={checkoutStyles.typeSelectorContainer}>
                <Pressable
                  style={[checkoutStyles.typeOption, newAddress.label === 'Home' && checkoutStyles.typeOptionActive]}
                  onPress={() => setNewAddress({ ...newAddress, label: 'Home' })}
                >
                  <Home size={16} color={newAddress.label === 'Home' ? COLORS.primary : '#6B7280'} />
                  <Text style={[checkoutStyles.typeOptionText, newAddress.label === 'Home' && checkoutStyles.typeOptionTextActive]}>Home</Text>
                </Pressable>
                <Pressable
                  style={[checkoutStyles.typeOption, newAddress.label === 'Office' && checkoutStyles.typeOptionActive]}
                  onPress={() => setNewAddress({ ...newAddress, label: 'Office' })}
                >
                  <Briefcase size={16} color={newAddress.label === 'Office' ? COLORS.primary : '#6B7280'} />
                  <Text style={[checkoutStyles.typeOptionText, newAddress.label === 'Office' && checkoutStyles.typeOptionTextActive]}>Office</Text>
                </Pressable>
                <Pressable
                  style={[checkoutStyles.typeOption, (newAddress.label !== 'Home' && newAddress.label !== 'Office') && checkoutStyles.typeOptionActive]}
                  onPress={() => setNewAddress({ ...newAddress, label: 'Other' })}
                >
                  <MapPin size={16} color={(newAddress.label !== 'Home' && newAddress.label !== 'Office') ? COLORS.primary : '#6B7280'} />
                  <Text style={[checkoutStyles.typeOptionText, (newAddress.label !== 'Home' && newAddress.label !== 'Office') && checkoutStyles.typeOptionTextActive]}>Other</Text>
                </Pressable>
              </View>

              <Text style={checkoutStyles.sectionHeader}>Contact Information</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={checkoutStyles.inputLabel}>First Name</Text>
                  <TextInput value={newAddress.first_name} onChangeText={(t) => setNewAddress({ ...newAddress, first_name: t })} style={checkoutStyles.formInput} placeholder="John" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={checkoutStyles.inputLabel}>Last Name</Text>
                  <TextInput value={newAddress.last_name} onChangeText={(t) => setNewAddress({ ...newAddress, last_name: t })} style={checkoutStyles.formInput} placeholder="Doe" />
                </View>
              </View>
              <Text style={checkoutStyles.inputLabel}>Phone Number</Text>
              <TextInput value={newAddress.phone} onChangeText={(t) => setNewAddress({ ...newAddress, phone: t })} style={checkoutStyles.formInput} placeholder="+63" keyboardType="phone-pad" />

              <Text style={[checkoutStyles.sectionHeader, { marginTop: 12 }]}>Location Details</Text>

              <AddressDropdown label="Region" type="region" value={newAddress.region} list={regionList} />
              <AddressDropdown label="Province" type="province" value={newAddress.province} list={provinceList} disabled={!newAddress.region} />
              <AddressDropdown label="City / Municipality" type="city" value={newAddress.city} list={cityList} disabled={!newAddress.province} />
              <AddressDropdown label="Barangay" type="barangay" value={newAddress.barangay} list={barangayList} disabled={!newAddress.city} />

              <Text style={checkoutStyles.inputLabel}>Street / House No.</Text>
              <TextInput
                value={newAddress.street}
                onChangeText={(t) => setNewAddress({ ...newAddress, street: t })}
                onEndEditing={onStreetBlur}
                style={checkoutStyles.formInput}
                placeholder="123 Acacia St."
              />

              {/* Live Map Preview (same as AddressesScreen) */}
              <Text style={checkoutStyles.inputLabel}>Pin Location</Text>
              <View style={checkoutStyles.mapPreviewWrapper}>
                <MapView
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                  style={checkoutStyles.mapPreview}
                  region={mapRegion}
                  scrollEnabled={false}
                  zoomEnabled={false}
                >
                  {newAddress.coordinates && <Marker coordinate={newAddress.coordinates} />}
                </MapView>
                <View style={checkoutStyles.mapOverlay}>
                  <Pressable style={checkoutStyles.editPinButton} onPress={() => setIsMapModalOpen(true)}>
                    <Move size={14} color="#FFF" />
                    <Text style={checkoutStyles.editPinText}>Adjust Pin</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={checkoutStyles.inputLabel}>Postal Code</Text>
              <TextInput value={newAddress.postal_code} onChangeText={(t) => setNewAddress({ ...newAddress, postal_code: t })} style={checkoutStyles.formInput} placeholder="1000" keyboardType="number-pad" />

              <Pressable style={[checkoutStyles.checkboxContainer, newAddress.is_default && checkoutStyles.checkboxActive]} onPress={() => setNewAddress({ ...newAddress, is_default: !newAddress.is_default })}>
                <View style={[checkoutStyles.checkbox, newAddress.is_default && { borderColor: '#16A34A', backgroundColor: '#16A34A' }]}>
                  {newAddress.is_default && <View style={{ width: 8, height: 8, backgroundColor: '#FFF', borderRadius: 4 }} />}
                </View>
                <Text style={[checkoutStyles.checkboxText, newAddress.is_default && { color: '#16A34A' }]}>Set as default delivery address</Text>
              </Pressable>
            </ScrollView>

            <View style={checkoutStyles.stickyFooter}>
              <Pressable style={[checkoutStyles.confirmButton, isSaving && { opacity: 0.7 }]} onPress={handleSaveAddress} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={checkoutStyles.confirmButtonText}>Save Address</Text>}
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* --- PRECISION MAP MODAL --- */}
        <Modal visible={isMapModalOpen} animationType="slide" onRequestClose={() => setIsMapModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: '#FFF' }}>
            <MapView
              style={{ flex: 1 }}
              region={mapRegion}
              onRegionChangeComplete={(region: Region) => setMapRegion(region)}
              showsUserLocation={true}
            />
            <View style={checkoutStyles.centerMarkerContainer} pointerEvents="none">
              <MapPin size={48} color={COLORS.primary} fill={COLORS.primary} />
              <View style={checkoutStyles.markerShadow} />
            </View>
            <View style={[checkoutStyles.mapHeader, { paddingTop: insets.top + 10 }]}>
              <Pressable onPress={() => setIsMapModalOpen(false)} style={checkoutStyles.mapCloseButton}>
                <ArrowLeft size={24} color="#1F2937" />
              </Pressable>
              <Text style={checkoutStyles.mapTitle}>Adjust Location</Text>
              <View style={{ width: 40 }} />
            </View>
            <View style={checkoutStyles.mapFooter}>
              <Text style={checkoutStyles.mapInstruction}>Drag map to pin exact location</Text>
              <Pressable style={checkoutStyles.confirmButton} onPress={handleConfirmLocation}>
                <Text style={checkoutStyles.confirmButtonText}>Confirm Pin</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // --- STRICTLY FORMATTED DROPDOWN (inside CheckoutScreen) ---
  function AddressDropdown({ label, value, type, list, disabled = false, placeholder = "Select..." }: any) {
    const isOpen = openDropdown === type;
    const filteredList = list.filter((item: any) => {
      const itemName = item.region_name || item.province_name || item.city_name || item.brgy_name || '';
      return itemName.toLowerCase().includes(searchText.toLowerCase());
    });

    return (
      <View style={{ marginBottom: 12, zIndex: isOpen ? 100 : 1 }}>
        <Text style={checkoutStyles.inputLabel}>{label}</Text>
        <Pressable
          onPress={() => toggleDropdown(type)}
          disabled={disabled}
          style={[checkoutStyles.dropdownTrigger, disabled && checkoutStyles.dropdownDisabled, isOpen && checkoutStyles.dropdownActive]}
        >
          <Text style={[checkoutStyles.dropdownText, !value && checkoutStyles.placeholderText, disabled && { color: '#9CA3AF' }]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          {isLoadingLocation && isOpen ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            isOpen ? <ChevronUp size={20} color={disabled ? "#9CA3AF" : "#4B5563"} /> : <ChevronDown size={20} color={disabled ? "#9CA3AF" : "#4B5563"} />
          )}
        </Pressable>
        {isOpen && (
          <View style={checkoutStyles.dropdownListContainer}>
            <View style={checkoutStyles.searchContainer}>
              <Search size={16} color="#9CA3AF" />
              <TextInput
                style={checkoutStyles.searchInput}
                placeholder="Search..."
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={true}
              />
            </View>
            <ScrollView style={checkoutStyles.selectList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
              {filteredList.map((item: any, index: number) => {
                const key = `${type}-${index}`;
                let name = '';
                if (type === 'region') name = item.region_name;
                else if (type === 'province') name = item.province_name;
                else if (type === 'city') name = item.city_name;
                else name = item.brgy_name || item.barangay_name;

                return (
                  <Pressable
                    key={key}
                    style={({ pressed }) => [checkoutStyles.selectItem, pressed && { backgroundColor: '#FFF7ED' }]}
                    onPress={() => {
                      if (type === 'region') onRegionChange(item.region_code);
                      else if (type === 'province') onProvinceChange(item.province_code);
                      else if (type === 'city') onCityChange(item.city_code);
                      else onBarangayChange(item.brgy_name || item.barangay_name);
                    }}
                  >
                    <Text style={checkoutStyles.selectItemText}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }
}

const checkoutStyles = StyleSheet.create({
  sectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  formInput: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  typeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeOptionActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  typeOptionTextActive: {
    color: '#111827',
  },
  dropdownTrigger: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  dropdownActive: {
    borderColor: COLORS.primary,
  },
  dropdownDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#F3F4F6',
  },
  dropdownText: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  dropdownListContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginTop: -8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    maxHeight: 250,
    overflow: 'hidden',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 15,
    color: '#1F2937',
  },
  selectList: {
    backgroundColor: '#FFFFFF',
  },
  selectItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectItemText: {
    fontSize: 15,
    color: '#111827',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginTop: 8,
  },
  checkboxActive: {
    backgroundColor: '#DCFCE7',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  stickyFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mapPreviewWrapper: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
  },
  mapPreview: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  editPinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1F2937',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  editPinText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  centerMarkerContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -24,
    marginTop: -48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerShadow: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    transform: [{ scaleX: 2 }],
  },
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
    zIndex: 10,
  },
  mapCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  mapTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  mapFooter: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
  mapInstruction: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
});

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
    flexWrap: 'wrap',
  },
  compactVariantTag: {
    backgroundColor: '#FFF4ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCBB0',
  },
  compactVariantText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EA580C',
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
  // Custom Address Form Styles
  inlineFormContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
    color: '#111827',
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
    color: '#374151',
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
    color: '#111827',
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
