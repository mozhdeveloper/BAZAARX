import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { checkoutService } from "@/services/checkoutService"; // Import checkout service
import { discountService } from "@/services/discountService";
import {
  ArrowLeft,
  MapPin,
  CreditCard,
  Smartphone,
  Banknote,
  Shield,
  Check,
  Tag,
  X,
  Plus,
  ChevronRight,
  LocateFixed,
  Map,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from "@/hooks/use-toast";

import { useCartStore } from "../stores/cartStore";
import { Voucher } from "../stores/buyerStore";
import { Address, useBuyerStore } from "../stores/buyerStore";
import { Button } from "../components/ui/button";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { regions, provinces, cities, barangays } from "select-philippines-address";
import { AddressPicker } from "@/components/ui/address-picker";
import type { ActiveDiscount } from "@/types/discount";

interface CheckoutFormData {
  fullName: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  paymentMethod: "card" | "gcash" | "paymaya" | "cod";
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  gcashNumber?: string;
  paymayaNumber?: string;
}

const paymentMethods = [
  {
    id: "cod" as const,
    name: "Cash on Delivery",
    icon: Banknote,
    description: "Pay when you receive your order",
    comingSoon: false,
  },
  {
    id: "card" as const,
    name: "Credit/Debit Card",
    icon: CreditCard,
    description: "Visa, MasterCard, American Express",
    comingSoon: true,
  },
  {
    id: "gcash" as const,
    name: "GCash",
    icon: Smartphone,
    description: "Pay with your GCash wallet",
    comingSoon: true,
  },
  {
    id: "paymaya" as const,
    name: "PayMaya",
    icon: Smartphone,
    description: "Pay with your PayMaya account",
    comingSoon: true,
  },
];

export default function CheckoutPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { createOrder } = useCartStore();
  const {
    cartItems,
    getCartTotal,
    clearCart,
    quickOrder,
    clearQuickOrder,
    getQuickOrderTotal,
    profile,
    removeSelectedItems,
    addresses,
    addAddress,
    updateAddress,
    deleteAddress,
    updateRegistryItem, // Destructure this
    buyAgainItems,
    clearBuyAgainItems,
    validateVoucherDetailed,
  } = useBuyerStore();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressView, setAddressView] = useState<'list' | 'add' | 'edit'>('list');
  const [view, setView] = useState<'list' | 'add'>('list');
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Selection tracking
  const [tempSelected, setTempSelected] = useState<Address | null>(
    addresses.find(a => a.isDefault) || addresses[0] || null
  );
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(
    addresses.find(a => a.isDefault) || addresses[0] || null
  );
  const [confirmedAddress, setConfirmedAddress] = useState<Address | null>(
    addresses.find(a => a.isDefault) || addresses[0] || null
  );

  // Form state for new address
  const [isSaving, setIsSaving] = useState(false);
  const [regionList, setRegionList] = useState<any[]>([]);
  const [provinceList, setProvinceList] = useState<any[]>([]);
  const [cityList, setCityList] = useState<any[]>([]);
  const [barangayList, setBarangayList] = useState<any[]>([]);

  const [newAddr, setNewAddr] = useState({
    label: 'Home',
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    phone: profile?.phone || '',
    street: '',
    barangay: '',
    city: '',
    province: '',
    region: '', // Added region
    postalCode: '',
    isDefault: false,
    coordinates: null as { lat: number; lng: number } | null,
    landmark: '',
    deliveryInstructions: '',
  });

  // Map picker state
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    regions().then(res => setRegionList(res));
  }, []);

  const onRegionChange = (code: string) => {
    const name = regionList.find(i => i.region_code === code)?.region_name;
    setNewAddr({ ...newAddr, region: name, province: '', city: '', barangay: '' });
    provinces(code).then(res => setProvinceList(res));
  };

  const onProvinceChange = (code: string) => {
    const name = provinceList.find(i => i.province_code === code)?.province_name;
    setNewAddr({ ...newAddr, province: name, city: '', barangay: '' });
    cities(code).then(res => setCityList(res));
  };

  const onCityChange = (code: string) => {
    const name = cityList.find(i => i.city_code === code)?.city_name;
    setNewAddr({ ...newAddr, city: name, barangay: '' });
    barangays(code).then(res => setBarangayList(res));
  };

  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
      if (!selectedAddress) {
        setSelectedAddress(defaultAddr);
      }
      if (!confirmedAddress) {
        setConfirmedAddress(defaultAddr);
      }
    }
  }, [addresses]);

  const locationState = location.state as { fromBuyAgain?: boolean } | null;
  const isBuyAgainMode = !!locationState?.fromBuyAgain || (buyAgainItems && buyAgainItems.length > 0);

  // Determine which items to checkout: quick order takes precedence
  // For cart checkout, filter only selected items
  const checkoutItems = useMemo(() => {
    if (buyAgainItems && buyAgainItems.length > 0) {
      return buyAgainItems;
    }
    if (quickOrder) {
      return [quickOrder];
    }
    return cartItems.filter(item => item.selected);
  }, [buyAgainItems, quickOrder, cartItems]);

  const isQuickCheckout = quickOrder !== null || isBuyAgainMode;

  const isRegistryOrder = useMemo(() => {
    return checkoutItems.some(item => !!item.registryId);
  }, [checkoutItems]);

  // Bazcoins Logic
  // Earn 1 Bazcoin per ₱10 spent

  // Bazcoin Redemption
  const [useBazcoins, setUseBazcoins] = useState(false);
  const availableBazcoins = profile?.bazcoins || 0;
  // Redemption rate: 1 Bazcoin = ₱1

  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    phone: profile?.phone || "",
    paymentMethod: "cod", // COD is default
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
    gcashNumber: "",
    paymayaNumber: "",
  });

  // Force non-COD payment for registry orders if COD is selected
  useEffect(() => {
    if (isRegistryOrder && formData.paymentMethod === 'cod') {
      setFormData(prev => ({ ...prev, paymentMethod: 'card' }));
      toast({
        title: "Payment Method Changed",
        description: "Cash on Delivery is not available for registry gifts.",
        variant: "default", // or "warning" if available, defaults to neutral/blue
      });
    }
  }, [isRegistryOrder, formData.paymentMethod]);

  // Removed: Payment method auto-fill logic - always default to COD
  // Users can manually switch to card/gcash/paymaya if needed

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<CheckoutFormData>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [activeCampaignDiscounts, setActiveCampaignDiscounts] = useState<Record<string, ActiveDiscount>>({});

  const getOriginalUnitPrice = (item: typeof checkoutItems[number]) =>
    Number((item.selectedVariant as any)?.originalPrice || item.originalPrice || item.price || 0);

  const checkoutProductIdsKey = useMemo(() => {
    const ids = [...new Set(checkoutItems.map(item => item.id).filter(Boolean))];
    ids.sort();
    return ids.join("|");
  }, [checkoutItems]);

  useEffect(() => {
    let isMounted = true;

    const loadCampaignDiscounts = async () => {
      const productIds = checkoutProductIdsKey ? checkoutProductIdsKey.split("|") : [];
      if (productIds.length === 0) {
        if (isMounted) setActiveCampaignDiscounts({});
        return;
      }

      try {
        const discounts = await discountService.getActiveDiscountsForProducts(productIds);
        if (isMounted) {
          setActiveCampaignDiscounts(discounts);
        }
      } catch (error) {
        console.error("Failed to load active campaign discounts:", error);
        if (isMounted) {
          setActiveCampaignDiscounts({});
        }
      }
    };

    loadCampaignDiscounts();
    return () => {
      isMounted = false;
    };
  }, [checkoutProductIdsKey]);

  const DEFAULT_ADDRESS: CheckoutFormData = {
    fullName: "Juan Dela Cruz",
    street: "123 Rizal Street",
    city: "Quezon City",
    province: "Metro Manila",
    postalCode: "1100",
    phone: "+63 912 345 6789",
    paymentMethod: "cod",
  };

  // Sync formData with confirmedAddress whenever it changes
  useEffect(() => {
    if (confirmedAddress) {
      // Note: shipping_addresses table doesn't store name/phone separately
      // They may be embedded in the street field as "Name, Phone, Street"
      let fullName = confirmedAddress.fullName
        || `${confirmedAddress.firstName || ''} ${confirmedAddress.lastName || ''}`.trim()
        || (profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '');
      let phone = confirmedAddress.phone || profile?.phone || '';
      let street = confirmedAddress.street || '';

      // Try to parse name and phone from street if they look embedded
      // Format: "Name, Phone, Street..."
      const streetParts = street.split(', ');
      if (streetParts.length >= 3 && !phone) {
        const possiblePhone = streetParts[1];
        // Check if second part looks like a phone number (10-11 digits)
        const digitsOnly = possiblePhone?.replace(/\D/g, '') || '';
        if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
          if (!fullName || fullName === confirmedAddress.label) {
            fullName = streetParts[0];
          }
          phone = possiblePhone;
          street = streetParts.slice(2).join(', ');
        }
      }

      console.log('📍 Syncing formData from confirmedAddress:', {
        confirmedAddress,
        derivedFullName: fullName,
        derivedPhone: phone,
        derivedStreet: street
      });

      setFormData(prev => ({
        ...prev,
        fullName: fullName || prev.fullName,
        street: street || prev.street,
        city: confirmedAddress.city || prev.city,
        province: confirmedAddress.province || prev.province,
        postalCode: confirmedAddress.postalCode || prev.postalCode,
        phone: phone || prev.phone,
      }));
      setErrors({});
    } else if (profile && !confirmedAddress) {
      // No saved address - use profile info as fallback
      console.log('📍 No confirmedAddress, using profile as fallback:', profile);
      setFormData(prev => ({
        ...prev,
        fullName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || prev.fullName,
        phone: profile.phone || prev.phone,
      }));
    }
  }, [confirmedAddress, profile]);

  const originalSubtotal = checkoutItems.reduce((sum, item) => {
    return sum + (getOriginalUnitPrice(item) * item.quantity);
  }, 0);

  const campaignDiscountTotal = checkoutItems.reduce((sum, item) => {
    const activeDiscount = activeCampaignDiscounts[item.id] || null;
    const unitPrice = getOriginalUnitPrice(item);
    const calculation = discountService.calculateLineDiscount(unitPrice, item.quantity, activeDiscount);
    return sum + calculation.discountTotal;
  }, 0);

  const subtotalAfterCampaign = Math.max(0, originalSubtotal - campaignDiscountTotal);
  const earnedBazcoins = Math.floor(subtotalAfterCampaign / 10);

  let shippingFee =
    checkoutItems.length > 0 &&
      !checkoutItems.every((item) => item.isFreeShipping)
      ? 50
      : 0;
  let discount = 0;

  // Apply voucher discount after campaign discount
  if (appliedVoucher) {
    if (appliedVoucher.type === "percentage") {
      const percentageDiscount = subtotalAfterCampaign * (appliedVoucher.value / 100);
      discount = appliedVoucher.maxDiscount
        ? Math.min(percentageDiscount, appliedVoucher.maxDiscount)
        : Math.round(percentageDiscount);
    } else if (appliedVoucher.type === "fixed") {
      discount = Math.min(appliedVoucher.value, subtotalAfterCampaign);
    } else if (appliedVoucher.type === "shipping") {
      shippingFee = 0;
    }
  }

  const maxRedeemableBazcoins = Math.min(availableBazcoins, Math.max(0, subtotalAfterCampaign - discount));
  const bazcoinDiscount = useBazcoins ? maxRedeemableBazcoins : 0;

  // VAT calculation (12%) based on original subtotal display rule
  const tax = Math.round(originalSubtotal * 0.12);

  const couponSavings = campaignDiscountTotal + discount + bazcoinDiscount;
  const grandTotalSavings = couponSavings;

  // Final total calculation including Bazcoins
  const finalTotal = Math.max(0, originalSubtotal + shippingFee + tax - couponSavings);

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();

    try {
      const { voucher, errorCode } = await validateVoucherDetailed(code, null);

      if (voucher) {
        setAppliedVoucher(voucher);
        setVoucherCode("");
        toast({
          title: "Voucher Applied!",
          description: `${voucher.description}`,
        });
      } else {
        const errorDescriptionMap: Record<string, string> = {
          NOT_FOUND: "Voucher code not found. Please check and try again.",
          INACTIVE: "This voucher is currently inactive.",
          NOT_STARTED: "This voucher is not active yet.",
          EXPIRED: "This voucher has expired.",
          MIN_ORDER_NOT_MET: "This voucher does not meet the minimum purchase requirement.",
          SELLER_MISMATCH: "This voucher is only valid for specific seller items.",
          ALREADY_USED: "You have already used this voucher. It can only be used once per customer.",
          UNKNOWN: "Unable to validate voucher right now. Please try again.",
        };

        toast({
          title: "Invalid Voucher",
          description: errorDescriptionMap[errorCode || "UNKNOWN"],
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error applying voucher:", error);
      toast({
        title: "Error",
        description: "Failed to apply voucher. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
  };

  const validateForm = () => {
    const newErrors: any = {};

    // Before validation, try to extract phone from street if it's embedded
    let phoneToValidate = formData.phone || '';
    let fullNameToValidate = formData.fullName || '';
    let streetToValidate = formData.street || '';

    // If phone is empty, try to parse from street "Name, Phone, Street" format
    if (!phoneToValidate.trim() && streetToValidate) {
      const parts = streetToValidate.split(', ');
      if (parts.length >= 3) {
        const possiblePhone = parts[1];
        const digitsOnly = possiblePhone?.replace(/\D/g, '') || '';
        if (digitsOnly.length >= 10 && digitsOnly.length <= 11) {
          phoneToValidate = possiblePhone;
          if (!fullNameToValidate.trim() || fullNameToValidate === 'User') {
            fullNameToValidate = parts[0];
          }
          streetToValidate = parts.slice(2).join(', ');

          // Update formData with parsed values
          setFormData(prev => ({
            ...prev,
            fullName: fullNameToValidate,
            phone: phoneToValidate,
            street: streetToValidate
          }));

          console.log('📱 Parsed phone from street:', { phoneToValidate, fullNameToValidate, streetToValidate });
        }
      }
    }

    // Strict validation for shipping address
    if (!fullNameToValidate?.trim()) newErrors.fullName = "Full name is required";
    if (!streetToValidate?.trim()) newErrors.street = "Street address is required";
    if (!formData.city?.trim()) newErrors.city = "City is required";
    if (!formData.province?.trim()) newErrors.province = "Province is required";
    if (!formData.postalCode?.trim()) newErrors.postalCode = "Postal code is required";
    if (!phoneToValidate?.trim()) newErrors.phone = "Phone number is required";

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = "Please select a payment method";
    }

    // Only validate payment-specific fields for non-COD methods
    if (formData.paymentMethod === "card" && formData.cardNumber?.trim()) {
      if (!formData.cardName?.trim())
        newErrors.cardName = "Cardholder name is required";
      if (!formData.expiryDate?.trim())
        newErrors.expiryDate = "Expiry date is required";
      if (!formData.cvv?.trim()) newErrors.cvv = "CVV is required";
    } else if (formData.paymentMethod === "gcash") {
      if (!formData.gcashNumber?.trim()) {
        newErrors.gcashNumber = "GCash number is required";
      } else if (formData.gcashNumber.replace(/\D/g, '').length < 11) {
        newErrors.gcashNumber = "Valid 11-digit GCash number required";
      }
    } else if (formData.paymentMethod === "paymaya") {
      if (!formData.paymayaNumber?.trim()) {
        newErrors.paymayaNumber = "PayMaya number is required";
      } else if (formData.paymayaNumber.replace(/\D/g, '').length < 11) {
        newErrors.paymayaNumber = "Valid 11-digit PayMaya number required";
      }
    }

    console.log('📝 Form validation check:', {
      formData: { fullName: fullNameToValidate, phone: phoneToValidate, street: streetToValidate?.substring(0, 30) },
      errors: newErrors,
      hasErrors: Object.keys(newErrors).length > 0
    });

    setErrors(newErrors);
    const validationErrorMessages = Object.values(newErrors).filter(Boolean);
    return { isValid: Object.keys(newErrors).length === 0, messages: validationErrorMessages as string[] };
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Track if store has been rehydrated
  const [isStoreReady, setIsStoreReady] = useState(false);

  useEffect(() => {
    // Give zustand persist middleware time to rehydrate
    // This checks if the store has been initialized from localStorage
    const checkRehydration = () => {
      // If profile exists or we've waited long enough, mark as ready
      if (profile) {
        setIsStoreReady(true);
      } else {
        // Wait a bit for rehydration, then check again
        const timer = setTimeout(() => {
          setIsStoreReady(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    };
    checkRehydration();
  }, [profile]);

  // Redirect to login if not authenticated (only after store is ready)
  useEffect(() => {
    if (isStoreReady && !profile) {
      toast({
        title: "Login Required",
        description: "Please sign in to complete your purchase.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
    }
  }, [isStoreReady, profile, navigate, toast]);

  // Check if cart is empty after initial load with a small delay to allow for transitions
  useEffect(() => {
    // DO NOT redirect if we are in Buy Again mode - we have items in location state
    if (isStoreReady && checkoutItems.length === 0 && profile && !isBuyAgainMode) {
      const timer = setTimeout(() => {
        // Re-check after delay to ensure it's not just a transition state
        if (checkoutItems.length === 0 && !isBuyAgainMode) {
          navigate("/enhanced-cart", { replace: true });
        }
      }, 1500); // 1.5s delay
      return () => clearTimeout(timer);
    }
  }, [isStoreReady, checkoutItems.length, profile, navigate, isBuyAgainMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🛒 Place Order clicked');
    console.log('  - selectedAddress:', selectedAddress?.id);
    console.log('  - confirmedAddress:', confirmedAddress?.id);
    console.log('  - formData:', {
      fullName: formData.fullName,
      street: formData.street?.substring(0, 30) + '...',
      city: formData.city,
      province: formData.province,
      postalCode: formData.postalCode,
      phone: formData.phone,
      paymentMethod: formData.paymentMethod
    });
    console.log('  - profile:', profile?.id);
    console.log('  - checkoutItems:', checkoutItems.length);
    console.log('  - Items with variants:', checkoutItems.filter(i => i.selectedVariant).length);

    const validation = validateForm();
    if (!validation.isValid) {
      console.log('❌ Form validation failed - see validation errors above');
      // Show toast for validation errors
      toast({
        title: "Please fix the errors",
        description: validation.messages.join(', ') || "Missing required fields",
        variant: "destructive"
      });
      return;
    }

    console.log('✅ Form validation passed, proceeding with checkout...');

    setIsLoading(true);

    // Import processCheckout at top of file (I will need to add the import in a separate step or assume I can add it here if I replace enough context, but I only replaced body. I'll rely on TS to complain or I will add import in next step if missed, but let's try to add import with the other changes if possible. Unfortunately this tool only does one block. I will add import in a separate call or just rely on auto-imports if I was in an IDE, but here I must be explicit.
    // Actually I can't add import here easily without changing top of file. 
    // I will execute this change, then add the import.

    try {
      // Validate user is logged in
      if (!profile?.id) {
        toast({ title: "Login Required", description: "Please log in to continue", variant: "destructive" });
        return;
      }

      // Map checkout items to expected payload
      const payloadItems = checkoutItems.map(item => ({
        // We cast to any to satisfy the strict database type requirement 
        // since we are adapting from BuyerStore structure
        id: item.id, // This is Product ID in BuyerStore
        product_id: item.id,
        cart_id: '', // Not needed for our new cleanup logic
        quantity: item.quantity,
        selected_variant: item.selectedVariant ? {
          id: item.selectedVariant.id,
          name: item.selectedVariant.name,
          original_price: (item.selectedVariant as any).originalPrice || item.selectedVariant.price,
          price: item.selectedVariant.price,
          stock: item.selectedVariant.stock,
          image: item.selectedVariant.image
        } : null,
        product: {
          seller_id: item.sellerId,
          name: item.name,
          price: getOriginalUnitPrice(item),
          images: item.images,
          primary_image: item.image
        },
        // Required fields by type but unused in logic
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        personalized_options: null,
        notes: item.notes || null
      }));

      const payload = {
        userId: profile.id,
        items: payloadItems as any[], // Casting to match service expectation
        totalAmount: finalTotal,
        shippingAddress: {
          fullName: formData.fullName,
          street: formData.street,
          city: formData.city,
          province: formData.province,
          postalCode: formData.postalCode,
          phone: formData.phone,
          country: 'Philippines' // Default
        },
        paymentMethod: formData.paymentMethod,
        usedBazcoins: useBazcoins ? bazcoinDiscount : 0, // Deduct based on discount value (1 coin = 1 peso)
        earnedBazcoins: earnedBazcoins,
        shippingFee: shippingFee,
        discount: discount,
        email: profile.email,
        voucherId: appliedVoucher?.id ?? null,
        selectedAddressId: selectedAddress?.id ?? null
      };

      const result = await checkoutService.processCheckout(payload);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Order successful

      // Update local bazcoins if returned
      if (result.newBazcoinsBalance !== undefined) {
        useBuyerStore.getState().updateProfile({ bazcoins: result.newBazcoinsBalance });
      } else {
        // Manual update if service didn't return it
        if (useBazcoins && bazcoinDiscount > 0) {
          const newBalance = (profile?.bazcoins || 0) - bazcoinDiscount + earnedBazcoins;
          useBuyerStore.getState().updateProfile({ bazcoins: newBalance });
        } else {
          const newBalance = (profile?.bazcoins || 0) + earnedBazcoins;
          useBuyerStore.getState().updateProfile({ bazcoins: newBalance });
        }
      }

      // Update registry items if purchased
      checkoutItems.forEach(item => {
        if (item.registryId) {
          const state = useBuyerStore.getState();
          const registry = state.registries.find(r => r.id === item.registryId);
          if (registry) {
            const registryProduct = registry.products?.find(p => p.id === item.id);
            if (registryProduct) {
              const currentReceived = registryProduct.receivedQty || 0;
              updateRegistryItem(item.registryId, item.id, {
                receivedQty: currentReceived + item.quantity
              });
            }
          }
        }
      });

      // Clear local stores
      const cartStoreState = useCartStore.getState();

      // Only clear cart/selected items if we're NOT in Buy Again mode (since Buy Again bypassed the cart)
      if (!isBuyAgainMode) {
        cartStoreState.clearCart();
        if (isQuickCheckout) {
          clearQuickOrder();
        } else {
          removeSelectedItems();
        }
      } else {
        // If in Buy Again mode, clear buyAgainItems and quick order if any
        clearBuyAgainItems();
        clearQuickOrder();
      }

      // Navigate to the order detail page for the new order
      const firstOrderNumber = result.orderIds && result.orderIds.length > 0 ? result.orderIds[0] : null;

      // Show success toast
      toast({
        title: result.orderIds && result.orderIds.length > 1
          ? "Orders Placed Successfully! 🎉"
          : "Order Placed Successfully! 🎉",
        description: `You earned ${earnedBazcoins} Bazcoins across your purchases!`,
      });

      if (firstOrderNumber) {
        // If there are multiple orders, navigating to the first one is standard, 
        // or you could navigate to a general "Order History" page.
        navigate(`/order/${firstOrderNumber}`, {
          state: { fromCheckout: true, earnedBazcoins: earnedBazcoins },
          replace: true,
        });
      } else {
        navigate("/orders", { replace: true });
      }

    } catch (error: any) {
      console.error("Order creation failed:", error);
      alert(`Failed to place order: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while store is rehydrating
  if (!isStoreReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (checkoutItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      {!isAddressModalOpen && <Header />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              Checkout
            </h1>
            <p className="text-gray-600">Complete your order & earn <span className="text-[var(--brand-primary)] font-bold">{earnedBazcoins} Bazcoins</span></p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 space-y-8">
              {/* Shipping Information */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[var(--brand-primary)]" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Delivery Address</h2>
                  </div>


                </div>

                {isRegistryOrder ? (
                  <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Shield className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">Registry Address (Hidden)</h3>
                      <p className="text-gray-600 text-sm mt-1">
                        For privacy, the recipient's address is hidden.
                        <br />
                        We will deliver this gift directly to them.
                      </p>
                    </div>
                  </div>
                ) : selectedAddress ? (
                  <div
                    className="group relative p-5 rounded-xl border border-gray-100 bg-gray-50/50 cursor-pointer hover:border-orange-200 hover:bg-orange-50/30 transition-all"
                    onClick={() => setIsAddressModalOpen(true)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-lg">
                            {selectedAddress.firstName} {selectedAddress.lastName}
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-600 font-medium">{selectedAddress.phone}</span>
                          {selectedAddress.isDefault && (
                            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none text-[10px] h-5 uppercase tracking-wider font-bold">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="text-gray-600 text-sm leading-relaxed">
                          <p className="font-medium text-gray-800">{selectedAddress.label}</p>
                          <p>{selectedAddress.street}, {selectedAddress.barangay}</p>
                          <p>{selectedAddress.city}, {selectedAddress.province}, {selectedAddress.postalCode}</p>
                        </div>
                      </div>
                      <div className="p-2 rounded-full group-hover:bg-white transition-colors">
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[var(--brand-primary)]" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full py-10 border-dashed border-2 flex flex-col gap-3 hover:bg-orange-50 hover:border-[var(--brand-primary)] transition-all group"
                    onClick={() => setIsAddressModalOpen(true)}
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                      <Plus className="w-6 h-6 text-gray-400 group-hover:text-[var(--brand-primary)]" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-900">No Address Selected</p>
                      <p className="text-sm text-gray-500">Click to add or select a shipping destination</p>
                    </div>
                  </Button>
                )}
              </motion.section>

              {/* Payment Method */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-gray-200 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Payment Method
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {paymentMethods.map((method) => (
                    <div
                      key={method.id}
                      className={`border-2 rounded-xl p-4 transition-colors relative ${method.comingSoon
                        ? "border-gray-200 bg-gray-50 cursor-not-allowed opacity-60"
                        : formData.paymentMethod === method.id
                          ? "border-[var(--brand-primary)] bg-orange-50 cursor-pointer"
                          : "border-gray-200 hover:border-gray-300 cursor-pointer"
                        }`}
                      onClick={() => {
                        if (!method.comingSoon) {
                          handleInputChange("paymentMethod", method.id);
                        }
                      }}
                    >
                      {/* Coming Soon Badge */}
                      {method.comingSoon && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-gray-500 text-white text-[10px] px-2 py-0.5">
                            Coming Soon
                          </Badge>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${method.comingSoon
                            ? "border-gray-300 bg-gray-200"
                            : formData.paymentMethod === method.id
                              ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                              : "border-gray-300"
                            }`}
                        >
                          {!method.comingSoon && formData.paymentMethod === method.id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <method.icon className={`w-5 h-5 ${method.comingSoon ? "text-gray-400" : "text-gray-600"}`} />
                        <div>
                          <p className={`font-medium ${method.comingSoon ? "text-gray-400" : "text-gray-900"}`}>
                            {method.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {method.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Details - Only show when Card is selected */}
                {formData.paymentMethod === "card" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          value={formData.cardNumber || ""}
                          onChange={(e) =>
                            handleInputChange("cardNumber", e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${errors.cardNumber
                            ? "border-red-500"
                            : "border-gray-300"
                            }`}
                          placeholder="1234 5678 9012 3456"
                        />
                        {errors.cardNumber && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.cardNumber}
                          </p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cardholder Name *
                        </label>
                        <input
                          type="text"
                          value={formData.cardName || ""}
                          onChange={(e) =>
                            handleInputChange("cardName", e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${errors.cardName
                            ? "border-red-500"
                            : "border-gray-300"
                            }`}
                          placeholder="JUAN DELA CRUZ"
                        />
                        {errors.cardName && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.cardName}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date *
                        </label>
                        <input
                          type="text"
                          value={formData.expiryDate || ""}
                          onChange={(e) =>
                            handleInputChange("expiryDate", e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${errors.expiryDate
                            ? "border-red-500"
                            : "border-gray-300"
                            }`}
                          placeholder="MM/YY"
                        />
                        {errors.expiryDate && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.expiryDate}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          value={formData.cvv || ""}
                          onChange={(e) =>
                            handleInputChange("cvv", e.target.value)
                          }
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${errors.cvv ? "border-red-500" : "border-gray-300"
                            }`}
                          placeholder="123"
                        />
                        {errors.cvv && (
                          <p className="text-sm text-red-500 mt-1">
                            {errors.cvv}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {formData.paymentMethod === "gcash" && (
                  <div className="space-y-4">
                    {profile?.paymentMethods?.filter(pm => pm.type === 'wallet' && pm.brand === 'GCash').map(wallet => (
                      <div
                        key={wallet.id}
                        onClick={() => handleInputChange("gcashNumber", wallet.accountNumber || "")}
                        className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors mb-2"
                      >
                        <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${formData.gcashNumber === wallet.accountNumber ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]" : "border-gray-300"}`}>
                          {formData.gcashNumber === wallet.accountNumber && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Linked GCash: {wallet.accountNumber}</p>
                        </div>
                      </div>
                    ))}
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GCash Number *
                    </label>
                    <input
                      type="text"
                      value={formData.gcashNumber || ""}
                      onChange={(e) =>
                        handleInputChange("gcashNumber", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${errors.gcashNumber
                        ? "border-red-500"
                        : "border-gray-300"
                        }`}
                      placeholder="+63 912 345 6789"
                    />
                    {errors.gcashNumber && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.gcashNumber}
                      </p>
                    )}
                  </div>
                )}

                {formData.paymentMethod === "paymaya" && (
                  <div className="space-y-4">
                    {profile?.paymentMethods?.filter(pm => pm.type === 'wallet' && pm.brand === 'Maya').map(wallet => (
                      <div
                        key={wallet.id}
                        onClick={() => handleInputChange("paymayaNumber", wallet.accountNumber || "")}
                        className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors mb-2"
                      >
                        <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${formData.paymayaNumber === wallet.accountNumber ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]" : "border-gray-300"}`}>
                          {formData.paymayaNumber === wallet.accountNumber && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">Linked Maya: {wallet.accountNumber}</p>
                        </div>
                      </div>
                    ))}
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PayMaya Number *
                    </label>
                    <input
                      type="text"
                      value={formData.paymayaNumber || ""}
                      onChange={(e) =>
                        handleInputChange("paymayaNumber", e.target.value)
                      }
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${errors.paymayaNumber
                        ? "border-red-500"
                        : "border-gray-300"
                        }`}
                      placeholder="+63 912 345 6789"
                    />
                    {errors.paymayaNumber && (
                      <p className="text-sm text-red-500 mt-1">
                        {errors.paymayaNumber}
                      </p>
                    )}
                  </div>
                )}
              </motion.section>
            </div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="lg:col-span-1"
            >
              <div className="bg-gray-50 rounded-xl p-6 sticky top-24">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Order Summary
                </h3>

                <div className="space-y-3 mb-6">
                  {checkoutItems.map((item) => {
                    const variant = item.selectedVariant as any;
                    const originalUnitPrice = getOriginalUnitPrice(item);
                    const activeDiscount = activeCampaignDiscounts[item.id] || null;
                    const calculation = discountService.calculateLineDiscount(originalUnitPrice, item.quantity, activeDiscount);
                    const discountedUnitPrice = calculation.discountedUnitPrice;
                    const lineOriginalTotal = originalUnitPrice * item.quantity;
                    const lineDiscountedTotal = discountedUnitPrice * item.quantity;

                    // Build variant display from available fields
                    let variantParts: string[] = [];
                    if (variant) {
                      const variantName = variant.variant_name || variant.name;
                      if (variantName) variantParts.push(variantName);
                      if (variant.size) variantParts.push(`Size: ${variant.size}`);
                      if (variant.color) variantParts.push(`Color: ${variant.color}`);
                      if (variant.option_1_value) variantParts.push(variant.option_1_value);
                      if (variant.option_2_value) variantParts.push(variant.option_2_value);
                      if (variantParts.length === 0) {
                        if (variant.sku) variantParts.push(`SKU: ${variant.sku}`);
                        else if (variant.id) variantParts.push(`#${variant.id.slice(0, 8)}`);
                      }
                    }
                    const variantInfo = variantParts.length > 0 ? variantParts.join(' / ') : null;

                    return (
                      <div key={`${item.id}-${variant?.id || 'no-variant'}`} className="flex justify-between text-sm">
                        <div className="flex-1">
                          <p className="text-gray-900 font-medium line-clamp-1">
                            {item.name}
                          </p>
                          {variantInfo && (
                            <p className="text-xs text-orange-600 font-medium">
                              {variantInfo}
                            </p>
                          )}
                          <p className="text-gray-500">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-900 font-medium">
                            ₱{lineDiscountedTotal.toLocaleString()}
                          </p>
                          {lineOriginalTotal > lineDiscountedTotal && (
                            <p className="text-xs text-gray-500 line-through">
                              ₱{lineOriginalTotal.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Voucher Code Section */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-[var(--brand-primary)]" />
                    <h4 className="text-sm font-semibold text-gray-900">
                      Have a Voucher?
                    </h4>
                  </div>

                  {appliedVoucher ? (
                    <div className="flex items-center justify-between bg-orange-50 border-2 border-[var(--brand-primary)] rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[var(--brand-primary)]" />
                        <div>
                          <p className="text-sm font-bold text-[var(--brand-primary)]">
                            {appliedVoucher.code}
                          </p>
                          <p className="text-xs text-gray-600">
                            {appliedVoucher.description}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="p-1 rounded-full hover:bg-gray-200 transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={voucherCode}
                          onChange={(e) =>
                            setVoucherCode(e.target.value.toUpperCase())
                          }
                          placeholder="Enter voucher code"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleApplyVoucher}
                          disabled={!voucherCode.trim()}
                          className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg hover:bg-[var(--brand-secondary)] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 italic">
                        Try: WELCOME10, SAVE50, FREESHIP
                      </p>
                    </>
                  )}
                </div>

                {/* Bazcoins Redemption */}
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white border border-gray-200 rounded-xl p-6 mb-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">B</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Bazcoins</p>
                        <p className="text-sm text-gray-500">Balance: {availableBazcoins}</p>
                      </div>
                    </div>
                    {availableBazcoins > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="text-right mr-2">
                          <p className="text-sm font-medium text-gray-900">-₱{maxRedeemableBazcoins}</p>
                          <p className="text-xs text-gray-500">{useBazcoins ? "Applied" : "Available"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setUseBazcoins(!useBazcoins)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 ${useBazcoins ? 'bg-[var(--brand-primary)]' : 'bg-gray-200'
                            }`}
                        >
                          <span
                            className={`${useBazcoins ? 'translate-x-6' : 'translate-x-1'
                              } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                          />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No coins available</span>
                    )}
                  </div>
                </motion.section>

                <div className="space-y-2 mb-4">
                  {" "}
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₱{originalSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Shipping</span>
                    <span>
                      {shippingFee === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        `₱${shippingFee}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (12% VAT)</span>
                    <span>₱{tax.toLocaleString()}</span>
                  </div>
                  {campaignDiscountTotal > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Campaign Discount</span>
                      <span>-₱{campaignDiscountTotal.toLocaleString()}</span>
                    </div>
                  )}
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Voucher Discount</span>
                      <span>-₱{discount.toLocaleString()}</span>
                    </div>
                  )}
                  {bazcoinDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>BazCoins Applied</span>
                      <span>-₱{bazcoinDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <hr className="border-gray-300" />
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-[var(--brand-primary)]">
                      ₱{finalTotal.toLocaleString()}
                    </span>
                  </div>
                  {grandTotalSavings > 0 && (
                    <div className="mt-2 text-right">
                      <p className="text-xs text-green-600 font-semibold animate-pulse">
                        You're saving ₱{grandTotalSavings.toLocaleString()} on this order!
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                  <div className="bg-yellow-400 rounded-full w-5 h-5 flex items-center justify-center mt-0.5">
                    <span className="text-white text-xs font-bold">B</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">You will earn {earnedBazcoins} Bazcoins</p>
                    <p className="text-xs text-yellow-700">Receive coins upon successful delivery</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading || !selectedAddress}
                  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing Payment...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      Place Order
                    </span>
                  )}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <Shield className="w-4 h-4" />
                  <span>Secure checkout with 256-bit SSL encryption</span>
                </div>
              </div>
            </motion.div>
          </div>
        </form>
      </div>
      <BazaarFooter />

      <Dialog open={isAddressModalOpen} onOpenChange={(open) => {
        setIsAddressModalOpen(open);
        if (!open) setAddressView('list'); // Reset view when closed
      }}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden flex flex-col max-h-[90vh]">

          {addressView === 'list' ? (
            <>
              <DialogHeader className="p-6 pb-2">
                <DialogTitle className="text-xl font-bold">Select Delivery Address</DialogTitle>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setTempSelected(addr)}
                    className={cn(
                      "p-4 border-2 rounded-xl cursor-pointer transition-all",
                      tempSelected?.id === addr.id ? "border-[var(--brand-primary)] bg-orange-50/50" : "border-gray-100"
                    )}
                  >
                    {/* Delete Confirmation */}
                    {deleteConfirmId === addr.id ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm text-gray-700">Delete this address?</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const { addressService } = await import('../services/addressService');
                                await addressService.deleteAddress(addr.id);
                                deleteAddress(addr.id);
                                setDeleteConfirmId(null);
                                if (selectedAddress?.id === addr.id) {
                                  setSelectedAddress(addresses.find(a => a.id !== addr.id) || null);
                                }
                                if (tempSelected?.id === addr.id) {
                                  setTempSelected(addresses.find(a => a.id !== addr.id) || null);
                                }
                                toast({ title: "Address deleted", description: "The address has been removed." });
                              } catch (error: any) {
                                console.error("Error deleting address:", error);
                                toast({ title: "Error", description: "Failed to delete address", variant: "destructive" });
                              }
                            }}
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                          tempSelected?.id === addr.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]" : "border-gray-300"
                        )}>
                          {tempSelected?.id === addr.id && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900">{addr.firstName} {addr.lastName}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase font-bold border-gray-300">{addr.label}</Badge>
                            {addr.isDefault && (
                              <Badge className="text-[10px] h-4 px-1.5 bg-green-100 text-green-700 border-0">Default</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium">{addr.phone}</p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-1">{addr.street}, {addr.barangay}, {addr.city}</p>
                        </div>
                        {/* Edit & Delete Buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAddress(addr);
                              setNewAddr({
                                label: addr.label || 'Home',
                                firstName: addr.firstName || '',
                                lastName: addr.lastName || '',
                                phone: addr.phone || '',
                                street: addr.street || '',
                                barangay: addr.barangay || '',
                                city: addr.city || '',
                                province: addr.province || '',
                                region: addr.region || '',
                                postalCode: addr.postalCode || '',
                                isDefault: addr.isDefault || false,
                                coordinates: addr.coordinates || null,
                                landmark: addr.landmark || '',
                                deliveryInstructions: addr.deliveryInstructions || '',
                              });
                              setAddressView('edit');
                            }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Edit address"
                          >
                            <Pencil className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(addr.id);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                            title="Delete address"
                          >
                            <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full border-dashed border-2 py-8 text-gray-500 hover:text-white"
                  onClick={() => setAddressView('add')}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add New Address
                </Button>
              </div>

              <div className="p-4 bg-gray-50 border-t flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setIsAddressModalOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-[var(--brand-primary)] hover:bg-orange-600 font-bold text-white"
                  disabled={!tempSelected}
                  onClick={() => {
                    setSelectedAddress(tempSelected);
                    setIsAddressModalOpen(false);
                  }}
                >
                  Confirm Selection
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="p-6 pb-2">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                    setAddressView('list');
                    setShowMapPicker(false);
                    setEditingAddress(null);
                    // Reset form
                    setNewAddr({
                      label: 'Home',
                      firstName: profile?.firstName || '',
                      lastName: profile?.lastName || '',
                      phone: profile?.phone || '',
                      street: '',
                      barangay: '',
                      city: '',
                      province: '',
                      region: '',
                      postalCode: '',
                      isDefault: false,
                      coordinates: null,
                      landmark: '',
                      deliveryInstructions: '',
                    });
                  }}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <DialogTitle className="text-xl font-bold">
                    {addressView === 'edit' ? 'Edit Address' : 'New Shipping Address'}
                  </DialogTitle>
                </div>
              </DialogHeader>

              {/* Map Picker View */}
              {showMapPicker ? (
                <div className="flex-1 overflow-hidden" style={{ height: '500px' }}>
                  <AddressPicker
                    initialCoordinates={newAddr.coordinates || undefined}
                    onLocationSelect={async (location) => {
                      // Update form with map data
                      const updatedAddr = {
                        ...newAddr,
                        street: location.street || newAddr.street,
                        barangay: location.barangay || newAddr.barangay,
                        city: location.city || newAddr.city,
                        province: location.province || newAddr.province,
                        region: location.region || newAddr.region,
                        postalCode: location.postalCode || newAddr.postalCode,
                        coordinates: location.coordinates,
                      };

                      // Try to auto-select dropdowns based on map data
                      // Match region (handle Metro Manila / NCR specially)
                      const regionToMatch = location.region || location.province || '';
                      const isMetroManila = regionToMatch.toLowerCase().includes('metro manila') ||
                        regionToMatch.toLowerCase().includes('ncr') ||
                        regionToMatch.toLowerCase() === 'manila' ||
                        ['makati', 'quezon city', 'pasig', 'taguig', 'mandaluyong', 'paranaque', 'pasay', 'marikina', 'muntinlupa', 'las pinas', 'valenzuela', 'caloocan', 'malabon', 'navotas', 'san juan', 'pateros'].some(city =>
                          location.city?.toLowerCase().includes(city)
                        );

                      if (regionToMatch || isMetroManila) {
                        let matchedRegion = regionList.find(r =>
                          r.region_name?.toLowerCase().includes(regionToMatch?.toLowerCase()) ||
                          regionToMatch?.toLowerCase().includes(r.region_name?.toLowerCase())
                        );

                        // If Metro Manila area, force match to NCR
                        if (!matchedRegion && isMetroManila) {
                          matchedRegion = regionList.find(r =>
                            r.region_name?.toLowerCase().includes('ncr') ||
                            r.region_name?.toLowerCase().includes('national capital')
                          );
                        }

                        if (matchedRegion) {
                          updatedAddr.region = matchedRegion.region_name;
                          // Load provinces for this region
                          const provs = await provinces(matchedRegion.region_code);
                          setProvinceList(provs);

                          // For Metro Manila/NCR, load ALL cities from all districts
                          if (isMetroManila) {
                            let allCities: any[] = [];
                            for (const prov of provs) {
                              const provCities = await cities(prov.province_code);
                              allCities = [...allCities, ...provCities];
                            }
                            setCityList(allCities);

                            // Match city
                            if (location.city) {
                              const matchedCity = allCities.find((c: any) =>
                                c.city_name?.toLowerCase().includes(location.city?.toLowerCase()) ||
                                location.city?.toLowerCase().includes(c.city_name?.toLowerCase().replace('city of ', ''))
                              );

                              if (matchedCity) {
                                updatedAddr.city = matchedCity.city_name;
                                // Load barangays for this city
                                const brgys = await barangays(matchedCity.city_code);
                                setBarangayList(brgys);

                                // Match barangay
                                if (location.barangay) {
                                  const matchedBarangay = brgys.find((b: any) =>
                                    b.brgy_name?.toLowerCase().includes(location.barangay?.toLowerCase()) ||
                                    location.barangay?.toLowerCase().includes(b.brgy_name?.toLowerCase())
                                  );
                                  if (matchedBarangay) {
                                    updatedAddr.barangay = matchedBarangay.brgy_name;
                                  }
                                }
                              }
                            }
                          } else {
                            // Non-Metro Manila: Match province first
                            const provinceToMatch = location.province || '';
                            let matchedProvince = null;

                            if (provinceToMatch) {
                              matchedProvince = provs.find((p: any) =>
                                p.province_name?.toLowerCase().includes(provinceToMatch?.toLowerCase()) ||
                                provinceToMatch?.toLowerCase().includes(p.province_name?.toLowerCase())
                              );

                              if (matchedProvince) {
                                updatedAddr.province = matchedProvince.province_name;
                                // Load cities for this province
                                const cts = await cities(matchedProvince.province_code);
                                setCityList(cts);

                                // Match city
                                const cityToMatch = location.city || '';
                                if (cityToMatch) {
                                  const matchedCity = cts.find((c: any) =>
                                    c.city_name?.toLowerCase().includes(cityToMatch?.toLowerCase()) ||
                                    cityToMatch?.toLowerCase().includes(c.city_name?.toLowerCase())
                                  );

                                  if (matchedCity) {
                                    updatedAddr.city = matchedCity.city_name;
                                    // Load barangays for this city
                                    const brgys = await barangays(matchedCity.city_code);
                                    setBarangayList(brgys);

                                    // Match barangay
                                    if (location.barangay) {
                                      const matchedBarangay = brgys.find((b: any) =>
                                        b.brgy_name?.toLowerCase().includes(location.barangay?.toLowerCase()) ||
                                        location.barangay?.toLowerCase().includes(b.brgy_name?.toLowerCase())
                                      );
                                      if (matchedBarangay) {
                                        updatedAddr.barangay = matchedBarangay.brgy_name;
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }

                      // Autofill name and phone from profile if not already set
                      if (!updatedAddr.firstName && profile?.firstName) {
                        updatedAddr.firstName = profile.firstName;
                      }
                      if (!updatedAddr.lastName && profile?.lastName) {
                        updatedAddr.lastName = profile.lastName;
                      }
                      if (!updatedAddr.phone && profile?.phone) {
                        updatedAddr.phone = profile.phone;
                      }

                      setNewAddr(updatedAddr);
                      setShowMapPicker(false);

                      // Show toast with autofill summary
                      const filledFields = [];
                      if (updatedAddr.firstName || updatedAddr.lastName) filledFields.push('Name');
                      if (updatedAddr.phone) filledFields.push('Phone');
                      if (updatedAddr.region) filledFields.push('Region');
                      if (updatedAddr.province) filledFields.push('Province');
                      if (updatedAddr.city) filledFields.push('City');
                      if (updatedAddr.barangay) filledFields.push('Barangay');
                      if (updatedAddr.street) filledFields.push('Street');
                      if (updatedAddr.postalCode) filledFields.push('Postal Code');

                      if (filledFields.length > 0) {
                        toast({
                          title: "📍 Location Selected",
                          description: `Auto-filled: ${filledFields.join(', ')}. Please verify the details.`,
                        });
                      }
                    }}
                    onClose={() => setShowMapPicker(false)}
                  />
                </div>
              ) : (
                /* Address Form View */
                <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
                  {/* Quick Location Picker Button */}
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-500 rounded-full p-2">
                          <Map className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Pick from Map</p>
                          <p className="text-xs text-gray-500">Use GPS or search for your location</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowMapPicker(true)}
                        className="border-orange-300 text-orange-600 hover:bg-orange-50"
                      >
                        <LocateFixed className="w-4 h-4 mr-1" />
                        Open Map
                      </Button>
                    </div>
                    {newAddr.coordinates && (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Location selected: {newAddr.coordinates.lat.toFixed(4)}, {newAddr.coordinates.lng.toFixed(4)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">First Name</Label>
                      <Input placeholder="John" value={newAddr.firstName} onChange={e => setNewAddr({ ...newAddr, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Last Name</Label>
                      <Input placeholder="Doe" value={newAddr.lastName} onChange={e => setNewAddr({ ...newAddr, lastName: e.target.value })} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Phone Number</Label>
                      <Input placeholder="09123456789" value={newAddr.phone} onChange={e => setNewAddr({ ...newAddr, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Label (e.g. Home, Office)</Label>
                      <Input placeholder="Home" value={newAddr.label} onChange={e => setNewAddr({ ...newAddr, label: e.target.value })} />
                    </div>
                  </div>

                  {/* Region Select */}
                  <div className="space-y-1">
                    <Label className="text-xs">Region</Label>
                    <Select
                      value={regionList.find(r => r.region_name === newAddr.region)?.region_code}
                      onValueChange={onRegionChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Region" />
                      </SelectTrigger>
                      <SelectContent>
                        {regionList.map((r) => (
                          <SelectItem key={r.region_code} value={r.region_code}>{r.region_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Province Select */}
                  <div className="space-y-1">
                    <Label className="text-xs">Province</Label>
                    <Select
                      value={provinceList.find(p => p.province_name === newAddr.province)?.province_code}
                      onValueChange={onProvinceChange}
                      disabled={!newAddr.region}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select Province" />
                      </SelectTrigger>
                      <SelectContent>
                        {provinceList.map((p) => (
                          <SelectItem key={p.province_code} value={p.province_code}>{p.province_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* City Select */}
                    <div className="space-y-1">
                      <Label className="text-xs">City / Municipality</Label>
                      <Select
                        value={cityList.find(c => c.city_name === newAddr.city)?.city_code}
                        onValueChange={onCityChange}
                        disabled={!newAddr.province}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent>
                          {cityList.map((c) => (
                            <SelectItem key={c.city_code} value={c.city_code}>{c.city_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Barangay Select */}
                    <div className="space-y-1">
                      <Label className="text-xs">Barangay</Label>
                      <Select
                        value={barangayList.find(b => b.brgy_name === newAddr.barangay)?.brgy_code}
                        onValueChange={(v) => setNewAddr({ ...newAddr, barangay: barangayList.find(b => b.brgy_code === v)?.brgy_name })}
                        disabled={!newAddr.city}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Barangay" />
                        </SelectTrigger>
                        <SelectContent>
                          {barangayList.map((b) => (
                            <SelectItem key={b.brgy_code} value={b.brgy_code}>{b.brgy_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Street Address</Label>
                    <Input placeholder="House No., Street Name" value={newAddr.street} onChange={e => setNewAddr({ ...newAddr, street: e.target.value })} />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Landmark (Optional)</Label>
                    <Input placeholder="Near SM Mall, In front of church, etc." value={newAddr.landmark} onChange={e => setNewAddr({ ...newAddr, landmark: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div className="space-y-1">
                      <Label className="text-xs">Postal Code</Label>
                      <Input placeholder="1234" value={newAddr.postalCode} onChange={e => setNewAddr({ ...newAddr, postalCode: e.target.value })} />
                    </div>
                    <div className="flex items-center space-x-2 pt-5">
                      <Switch checked={newAddr.isDefault} onCheckedChange={checked => setNewAddr({ ...newAddr, isDefault: checked })} />
                      <Label className="text-sm cursor-pointer">Set as default</Label>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Delivery Instructions (Optional)</Label>
                    <Input
                      placeholder="Gate code, leave at door, call upon arrival, etc."
                      value={newAddr.deliveryInstructions}
                      onChange={e => setNewAddr({ ...newAddr, deliveryInstructions: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {!showMapPicker && (
                <div className="p-4 bg-gray-50 border-t flex gap-3">
                  <Button variant="ghost" className="flex-1" onClick={() => {
                    setAddressView('list');
                    setEditingAddress(null);
                    // Reset form
                    setNewAddr({
                      label: 'Home',
                      firstName: profile?.firstName || '',
                      lastName: profile?.lastName || '',
                      phone: profile?.phone || '',
                      street: '',
                      barangay: '',
                      city: '',
                      province: '',
                      region: '',
                      postalCode: '',
                      isDefault: false,
                      coordinates: null,
                      landmark: '',
                      deliveryInstructions: '',
                    });
                  }}>Back</Button>
                  <Button
                    className="flex-1 bg-[var(--brand-primary)] hover:bg-orange-600 font-bold text-white"
                    disabled={isSaving || !newAddr.firstName || !newAddr.phone}
                    onClick={async () => {
                      if (!profile) return;
                      setIsSaving(true);
                      try {
                        const { addressService } = await import('../services/addressService');

                        // Map to shipping_addresses table columns
                        const addressPayload: any = {
                          user_id: profile.id,
                          label: newAddr.label,
                          address_line_1: `${newAddr.firstName} ${newAddr.lastName}, ${newAddr.phone}, ${newAddr.street}`,
                          address_line_2: newAddr.landmark || null,
                          barangay: newAddr.barangay,
                          city: newAddr.city,
                          province: newAddr.province,
                          region: newAddr.region,
                          postal_code: newAddr.postalCode,
                          is_default: newAddr.isDefault,
                          delivery_instructions: newAddr.deliveryInstructions || null,
                          address_type: 'residential',
                        };

                        // Include coordinates if available
                        if (newAddr.coordinates) {
                          addressPayload.coordinates = newAddr.coordinates;
                        }

                        let savedAddress: Address;

                        if (addressView === 'edit' && editingAddress) {
                          // UPDATE existing address
                          const dbAddress = await addressService.updateAddress(editingAddress.id, addressPayload);
                          // Merge with user input since DB doesn't store name/phone
                          savedAddress = {
                            ...dbAddress,
                            firstName: newAddr.firstName,
                            lastName: newAddr.lastName,
                            fullName: `${newAddr.firstName} ${newAddr.lastName}`.trim(),
                            phone: newAddr.phone,
                            street: newAddr.street,
                          };
                          updateAddress(editingAddress.id, savedAddress);
                          toast({ title: "Address updated", description: "Your address has been updated successfully." });
                        } else {
                          // CREATE new address
                          const dbAddress = await addressService.createAddress(addressPayload);
                          // Merge with user input since DB doesn't store name/phone
                          savedAddress = {
                            ...dbAddress,
                            firstName: newAddr.firstName,
                            lastName: newAddr.lastName,
                            fullName: `${newAddr.firstName} ${newAddr.lastName}`.trim(),
                            phone: newAddr.phone,
                            street: newAddr.street,
                          };
                          addAddress(savedAddress);
                          toast({ title: "Address saved", description: "Your new address has been added." });
                        }

                        setSelectedAddress(savedAddress);
                        setTempSelected(savedAddress);
                        setConfirmedAddress(savedAddress);
                        setIsAddressModalOpen(false);
                        setAddressView('list');
                        setShowMapPicker(false);
                        setEditingAddress(null);
                        // Reset form
                        setNewAddr({
                          label: 'Home',
                          firstName: profile?.firstName || '',
                          lastName: profile?.lastName || '',
                          phone: profile?.phone || '',
                          street: '',
                          barangay: '',
                          city: '',
                          province: '',
                          region: '',
                          postalCode: '',
                          isDefault: false,
                          coordinates: null,
                          landmark: '',
                          deliveryInstructions: '',
                        });
                      } catch (error: any) {
                        console.error("Error saving address:", error);
                        toast({ title: "Error", description: error.message || "Failed to save address", variant: "destructive" });
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    {isSaving ? "Saving..." : (addressView === 'edit' ? "Update Address" : "Save and Use")}
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}


