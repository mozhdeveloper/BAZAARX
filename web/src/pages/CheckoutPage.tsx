import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { processCheckout } from "@/services/checkoutService"; // Import checkout service
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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Dummy voucher codes
const VOUCHERS = {
  WELCOME10: {
    type: "percentage",
    value: 10,
    description: "10% off your order",
  },
  SAVE50: { type: "fixed", value: 50, description: "₱50 off" },
  FREESHIP: { type: "shipping", value: 0, description: "Free shipping" },
  NEWYEAR25: {
    type: "percentage",
    value: 25,
    description: "25% off New Year Special",
  },
  FLASH100: { type: "fixed", value: 100, description: "₱100 flash discount" },
} as const;
import { useCartStore } from "../stores/cartStore";
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
    id: "card" as const,
    name: "Credit/Debit Card",
    icon: CreditCard,
    description: "Visa, MasterCard, American Express",
  },
  {
    id: "gcash" as const,
    name: "GCash",
    icon: Smartphone,
    description: "Pay with your GCash wallet",
  },
  {
    id: "paymaya" as const,
    name: "PayMaya",
    icon: Smartphone,
    description: "Pay with your PayMaya account",
  },
  {
    id: "cod" as const,
    name: "Cash on Delivery",
    icon: Banknote,
    description: "Pay when you receive your order",
  },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
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
  } = useBuyerStore();
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addressView, setAddressView] = useState<'list' | 'add'>('list');
  const [view, setView] = useState<'list' | 'add'>('list');

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
    isDefault: false
  });

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
    if (!selectedAddress && addresses.length > 0) {
      setSelectedAddress(addresses.find(a => a.isDefault) || addresses[0]);
    }
  }, [addresses]);

  // Determine which items to checkout: quick order takes precedence
  // For cart checkout, filter only selected items
  const checkoutItems = quickOrder
    ? [quickOrder]
    : cartItems.filter(item => item.selected);
  const checkoutTotal = quickOrder
    ? getQuickOrderTotal()
    : cartItems
      .filter(item => item.selected)
      .reduce((sum, item) => sum + (item.selectedVariant?.price || item.price) * item.quantity, 0);
  const isQuickCheckout = quickOrder !== null;

  // Bazcoins Logic
  // Earn 1 Bazcoin per ₱10 spent
  const earnedBazcoins = Math.floor(checkoutTotal / 10);

  // Bazcoin Redemption
  const [useBazcoins, setUseBazcoins] = useState(false);
  const availableBazcoins = profile?.bazcoins || 0;
  // Redemption rate: 1 Bazcoin = ₱1
  const maxRedeemableBazcoins = Math.min(availableBazcoins, checkoutTotal);
  const bazcoinDiscount = useBazcoins ? maxRedeemableBazcoins : 0;

  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: profile ? `${profile.firstName} ${profile.lastName}` : "",
    street: "",
    city: "",
    province: "",
    postalCode: "",
    phone: profile?.phone || "",
    paymentMethod: "card",
  });

  // Demo: Ensure saved cards exist
  useEffect(() => {
    if (profile) {
      let updates: any = {};
      if (!profile.savedCards || profile.savedCards.length === 0) {
        updates.savedCards = [
          { id: 'card_demo_1', last4: '4242', brand: 'Visa', expiry: '12/28' },
          { id: 'card_demo_2', last4: '8888', brand: 'MasterCard', expiry: '10/26' },
        ];
      }

      if (Object.keys(updates).length > 0) {
        useBuyerStore.getState().updateProfile(updates);
      }
    }
  }, [profile]);

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<CheckoutFormData>>({});
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<
    keyof typeof VOUCHERS | null
  >(null);

  const totalPrice = checkoutTotal;

  const DEFAULT_ADDRESS: CheckoutFormData = {
    fullName: "Juan Dela Cruz",
    street: "123 Rizal Street",
    city: "Quezon City",
    province: "Metro Manila",
    postalCode: "1100",
    phone: "+63 912 345 6789",
    paymentMethod: "card",
  };

  // Sync formData with confirmedAddress whenever it changes
  useEffect(() => {
    if (confirmedAddress) {
      setFormData(prev => ({
        ...prev,
        fullName: confirmedAddress.fullName,
        street: confirmedAddress.street,
        city: confirmedAddress.city,
        province: confirmedAddress.province,
        postalCode: confirmedAddress.postalCode,
        phone: confirmedAddress.phone,
      }));
      setErrors({});
    }
  }, [confirmedAddress]);

  let shippingFee =
    checkoutItems.length > 0 &&
      !checkoutItems.every((item) => item.isFreeShipping)
      ? 50
      : 0;
  let discount = 0;

  // Apply voucher discount
  if (appliedVoucher && VOUCHERS[appliedVoucher]) {
    const voucher = VOUCHERS[appliedVoucher];
    if (voucher.type === "percentage") {
      discount = Math.round(totalPrice * (voucher.value / 100));
    } else if (voucher.type === "fixed") {
      discount = voucher.value;
    } else if (voucher.type === "shipping") {
      shippingFee = 0;
    }
  }

  // Final total calculation including Bazcoins
  const finalTotal = Math.max(0, totalPrice + shippingFee - discount - bazcoinDiscount);

  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (VOUCHERS[code as keyof typeof VOUCHERS]) {
      setAppliedVoucher(code as keyof typeof VOUCHERS);
    } else {
      alert("Invalid voucher code. Please try again.");
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode("");
  };

  const validateForm = () => {
    const newErrors: any = {};

    // Strict validation for shipping address
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.street.trim()) newErrors.street = "Street address is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.province.trim()) newErrors.province = "Province is required";
    if (!formData.postalCode.trim()) newErrors.postalCode = "Postal code is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";

    if (!formData.paymentMethod) {
      newErrors.paymentMethod = "Please select a payment method";
    }

    // Only validate payment-specific fields if they are provided
    if (formData.paymentMethod === "card" && formData.cardNumber?.trim()) {
      if (!formData.cardName?.trim())
        newErrors.cardName = "Cardholder name is required";
      if (!formData.expiryDate?.trim())
        newErrors.expiryDate = "Expiry date is required";
      if (!formData.cvv?.trim()) newErrors.cvv = "CVV is required";
    } else if (
      formData.paymentMethod === "gcash" &&
      formData.gcashNumber?.trim()
    ) {
      if (formData.gcashNumber.length < 11)
        newErrors.gcashNumber = "Valid GCash number required";
    } else if (
      formData.paymentMethod === "paymaya" &&
      formData.paymayaNumber?.trim()
    ) {
      if (formData.paymayaNumber.length < 11)
        newErrors.paymayaNumber = "Valid PayMaya number required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Check if cart is empty on initial load only
  useEffect(() => {
    if (checkoutItems.length === 0) {
      navigate("/enhanced-cart", { replace: true });
    }
  }, [checkoutItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    // Import processCheckout at top of file (I will need to add the import in a separate step or assume I can add it here if I replace enough context, but I only replaced body. I'll rely on TS to complain or I will add import in next step if missed, but let's try to add import with the other changes if possible. Unfortunately this tool only does one block. I will add import in a separate call or just rely on auto-imports if I was in an IDE, but here I must be explicit.
    // Actually I can't add import here easily without changing top of file. 
    // I will execute this change, then add the import.

    try {
      // Validate user is logged in
      if (!profile?.id) {
        // Should not happen if protected route, but safety check
        alert("Please log in to continue");
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
          price: item.selectedVariant.price,
          stock: item.selectedVariant.stock,
          image: item.selectedVariant.image
        } : null,
        product: {
          seller_id: item.sellerId,
          name: item.name,
          price: item.price,
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
        email: profile.email
      };

      const result = await processCheckout(payload);

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

      // Clear local stores
      const cartStoreState = useCartStore.getState();
      cartStoreState.clearCart();

      if (isQuickCheckout) {
        clearQuickOrder();
      } else {
        removeSelectedItems();
      }

      // Navigate to orders (using the first order ID if multiple)
      const mainOrderId = result.orderIds && result.orderIds.length > 0 ? result.orderIds[0] : 'new';

      navigate("/orders", {
        state: {
          newOrderId: mainOrderId,
          fromCheckout: true,
          earnedBazcoins: earnedBazcoins,
        },
        replace: true,
      });

    } catch (error: any) {
      console.error("Order creation failed:", error);
      alert(`Failed to place order: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

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

                {selectedAddress ? (
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
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${formData.paymentMethod === method.id
                        ? "border-[var(--brand-primary)] bg-orange-50"
                        : "border-gray-200 hover:border-gray-300"
                        }`}
                      onClick={() =>
                        handleInputChange("paymentMethod", method.id)
                      }
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${formData.paymentMethod === method.id
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]"
                            : "border-gray-300"
                            }`}
                        >
                          {formData.paymentMethod === method.id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <method.icon className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">
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

                {/* Payment Details */}
                {formData.paymentMethod === "card" && (
                  <div className="space-y-4">
                    {profile?.savedCards && profile.savedCards.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Saved Cards</label>
                        <div className="space-y-2">
                          {profile.savedCards.map((card) => (
                            <div
                              key={card.id}
                              onClick={() => {
                                handleInputChange("cardNumber", `**** **** **** ${card.last4}`);
                                handleInputChange("expiryDate", card.expiry);
                                handleInputChange("cvv", "***");
                                // In a real app we wouldn't auto-fill CVV, requiring user input
                              }}
                              className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                              <div className={`w-4 h-4 rounded-full border mr-3 flex items-center justify-center ${formData.cardNumber?.endsWith(card.last4) ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]" : "border-gray-300"
                                }`}>
                                {formData.cardNumber?.endsWith(card.last4) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">{card.brand} ending in {card.last4}</p>
                                <p className="text-xs text-gray-500">Expires {card.expiry}</p>
                              </div>
                            </div>
                          ))}
                          <div
                            onClick={() => {
                              handleInputChange("cardNumber", "");
                              handleInputChange("expiryDate", "");
                              handleInputChange("cvv", "");
                            }}
                            className="text-sm text-[var(--brand-primary)] font-medium cursor-pointer mt-2 hover:underline"
                          >
                            + Use a new card
                          </div>
                        </div>
                      </div>
                    )}

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
                  <div>
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
                  <div>
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
                  {checkoutItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium line-clamp-1">
                          {item.name}
                        </p>
                        <p className="text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="text-gray-900 font-medium">
                        ₱{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
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
                            {appliedVoucher}
                          </p>
                          <p className="text-xs text-gray-600">
                            {VOUCHERS[appliedVoucher].description}
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
                  \n{" "}
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span>₱{totalPrice.toLocaleString()}</span>
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
                  {discount > 0 && (
                    <div className="flex justify-between text-[var(--brand-primary)] font-medium">
                      <span>Voucher Discount</span>
                      <span>-₱{discount.toLocaleString()}</span>
                    </div>
                  )}
                  {useBazcoins && bazcoinDiscount > 0 && (
                    <div className="flex justify-between text-yellow-600 font-medium">
                      <span>Bazcoins Redeemed</span>
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
                      "p-4 border-2 rounded-xl cursor-pointer transition-all flex items-start gap-3",
                      tempSelected?.id === addr.id ? "border-[var(--brand-primary)] bg-orange-50/50" : "border-gray-100"
                    )}
                  >
                    <div className={cn(
                      "mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center",
                      tempSelected?.id === addr.id ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]" : "border-gray-300"
                    )}>
                      {tempSelected?.id === addr.id && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{addr.firstName} {addr.lastName}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 uppercase font-bold border-gray-300">{addr.label}</Badge>
                      </div>
                      <p className="text-xs text-gray-500 font-medium">{addr.phone}</p>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-1">{addr.street}, {addr.barangay}, {addr.city}</p>
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  className="w-full border-dashed border-2 py-8 text-gray-500 hover:text-[var(--brand-primary)]"
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
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setAddressView('list')}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <DialogTitle className="text-xl font-bold">New Shipping Address</DialogTitle>
                </div>
              </DialogHeader>

              {/* Replace the existing New Shipping Address form body with this: */}
              <div className="flex-1 overflow-y-auto p-6 pt-2 space-y-4">
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
                  <Select onValueChange={onRegionChange}>
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
                  <Select onValueChange={onProvinceChange} disabled={!newAddr.region}>
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
                    <Select onValueChange={onCityChange} disabled={!newAddr.province}>
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
                    <Select onValueChange={(v) => setNewAddr({ ...newAddr, barangay: barangayList.find(b => b.brgy_code === v)?.brgy_name })} disabled={!newAddr.city}>
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
              </div>

              <div className="p-4 bg-gray-50 border-t flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setAddressView('list')}>Back</Button>
                <Button
                  className="flex-1 bg-[var(--brand-primary)] hover:bg-orange-600 font-bold text-white"
                  disabled={isSaving || !newAddr.firstName || !newAddr.phone}
                  onClick={async () => {
                    if (!profile) return;
                    setIsSaving(true);
                    try {
                      const { addressService } = await import('../services/addressService');

                      const addressPayload = {
                        user_id: profile.id,
                        label: newAddr.label,
                        first_name: newAddr.firstName,
                        last_name: newAddr.lastName,
                        phone: newAddr.phone,
                        street: newAddr.street,
                        barangay: newAddr.barangay,
                        city: newAddr.city,
                        province: newAddr.province,
                        region: newAddr.region,
                        zip_code: newAddr.postalCode,
                        is_default: newAddr.isDefault,
                      };

                      const savedAddress = await addressService.createAddress(addressPayload);

                      addAddress(savedAddress);
                      setSelectedAddress(savedAddress);
                      setIsAddressModalOpen(false);
                      toast({ title: "Address saved successfully" });
                    } catch (error: any) {
                      console.error("Error saving address:", error);
                      toast({ title: "Error", description: error.message || "Failed to save address", variant: "destructive" });
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                >
                  {isSaving ? "Saving..." : "Save and Use"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
