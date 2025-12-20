import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Smartphone, Banknote, Shield, Check, Tag, X } from 'lucide-react';

// Dummy voucher codes
const VOUCHERS = {
  'WELCOME10': { type: 'percentage', value: 10, description: '10% off your order' },
  'SAVE50': { type: 'fixed', value: 50, description: '₱50 off' },
  'FREESHIP': { type: 'shipping', value: 0, description: 'Free shipping' },
  'NEWYEAR25': { type: 'percentage', value: 25, description: '25% off New Year Special' },
  'FLASH100': { type: 'fixed', value: 100, description: '₱100 flash discount' },
} as const;
import { useCartStore } from '../stores/cartStore';
import { useBuyerStore } from '../stores/buyerStore';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';

interface CheckoutFormData {
  fullName: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  paymentMethod: 'card' | 'gcash' | 'paymaya' | 'cod';
  cardNumber?: string;
  cardName?: string;
  expiryDate?: string;
  cvv?: string;
  gcashNumber?: string;
  paymayaNumber?: string;
}

const provinces = [
  'Metro Manila', 'Laguna', 'Cavite', 'Bulacan', 'Rizal', 'Bataan', 'Batangas',
  'Cebu', 'Davao del Sur', 'Iloilo', 'Negros Occidental', 'Pangasinan'
];

const paymentMethods = [
  {
    id: 'card' as const,
    name: 'Credit/Debit Card',
    icon: CreditCard,
    description: 'Visa, MasterCard, American Express'
  },
  {
    id: 'gcash' as const,
    name: 'GCash',
    icon: Smartphone,
    description: 'Pay with your GCash wallet'
  },
  {
    id: 'paymaya' as const,
    name: 'PayMaya',
    icon: Smartphone,
    description: 'Pay with your PayMaya account'
  },
  {
    id: 'cod' as const,
    name: 'Cash on Delivery',
    icon: Banknote,
    description: 'Pay when you receive your order'
  }
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { createOrder } = useCartStore();
  const { cartItems, getCartTotal, clearCart } = useBuyerStore();
  
  const [formData, setFormData] = useState<CheckoutFormData>({
    fullName: '',
    street: '',
    city: '',
    province: '',
    postalCode: '',
    phone: '',
    paymentMethod: 'card',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<CheckoutFormData>>({});
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<keyof typeof VOUCHERS | null>(null);

  const totalPrice = getCartTotal();
  let shippingFee = cartItems.length > 0 && !cartItems.every(item => item.isFreeShipping) ? 50 : 0;
  let discount = 0;

  // Apply voucher discount
  if (appliedVoucher && VOUCHERS[appliedVoucher]) {
    const voucher = VOUCHERS[appliedVoucher];
    if (voucher.type === 'percentage') {
      discount = Math.round(totalPrice * (voucher.value / 100));
    } else if (voucher.type === 'fixed') {
      discount = voucher.value;
    } else if (voucher.type === 'shipping') {
      shippingFee = 0;
    }
  }

  const finalTotal = totalPrice + shippingFee - discount;

  const handleApplyVoucher = () => {
    const code = voucherCode.trim().toUpperCase();
    if (VOUCHERS[code as keyof typeof VOUCHERS]) {
      setAppliedVoucher(code as keyof typeof VOUCHERS);
    } else {
      alert('Invalid voucher code. Please try again.');
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
  };

  const validateForm = () => {
    const newErrors: any = {};

    // For testing purposes, make validation less strict
    // Only require payment method selection
    if (!formData.paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    }

    // Only validate payment-specific fields if they are provided
    if (formData.paymentMethod === 'card' && formData.cardNumber?.trim()) {
      if (!formData.cardName?.trim()) newErrors.cardName = 'Cardholder name is required';
      if (!formData.expiryDate?.trim()) newErrors.expiryDate = 'Expiry date is required';
      if (!formData.cvv?.trim()) newErrors.cvv = 'CVV is required';
    } else if (formData.paymentMethod === 'gcash' && formData.gcashNumber?.trim()) {
      if (formData.gcashNumber.length < 11) newErrors.gcashNumber = 'Valid GCash number required';
    } else if (formData.paymentMethod === 'paymaya' && formData.paymayaNumber?.trim()) {
      if (formData.paymayaNumber.length < 11) newErrors.paymayaNumber = 'Valid PayMaya number required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CheckoutFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Check if cart is empty on initial load only
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/enhanced-cart', { replace: true });
    }
  }, []); // Empty dependency array - only runs once on mount

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Sync buyerStore items to cartStore for order creation
      const cartStoreState = useCartStore.getState();
      
      // Clear cart store first to ensure fresh order
      cartStoreState.clearCart();
      
      // Add items from buyer cart to cart store
      cartItems.forEach(item => {
        cartStoreState.addToCart({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          seller: item.seller.name,
          rating: item.rating,
          category: item.category,
          isFreeShipping: item.isFreeShipping,
          isVerified: item.seller.isVerified,
          location: item.location
        });
        if (item.quantity > 1) {
          cartStoreState.updateQuantity(item.id, item.quantity);
        }
      });

      // Create the order
      const orderId = createOrder({
        shippingAddress: {
          fullName: formData.fullName || 'John Doe',
          street: formData.street || '123 Sample Street',
          city: formData.city || 'Manila',
          province: formData.province || 'Metro Manila',
          postalCode: formData.postalCode || '1000',
          phone: formData.phone || '09123456789',
        },
        paymentMethod: {
          type: formData.paymentMethod || 'cod',
          details: formData.paymentMethod === 'card' ? 
            `**** ${formData.cardNumber?.slice(-4) || '1234'}` : 
            formData.paymentMethod === 'gcash' ? formData.gcashNumber || '09123456789' : 
            formData.paymentMethod === 'paymaya' ? formData.paymayaNumber || '09123456789' : 
            'Cash on Delivery'
        },
        status: 'pending'
      });

      // Clear buyer cart after successful order
      clearCart();
      
      // Navigate to orders page with the new order ID
      navigate('/orders', { 
        state: { 
          newOrderId: orderId,
          fromCheckout: true
        },
        replace: true 
      });
    } catch (error) {
      console.error('Order creation failed:', error);
      alert('Failed to place order. Please try again.');
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
            onClick={() => navigate('/enhanced-cart')}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600">Complete your order</p>
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
                className="bg-white border border-gray-200 rounded-xl p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Shipping Information</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                        errors.fullName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Juan Dela Cruz"
                    />
                    {errors.fullName && <p className="text-sm text-red-500 mt-1">{errors.fullName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+63 912 345 6789"
                    />
                    {errors.phone && <p className="text-sm text-red-500 mt-1">{errors.phone}</p>}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                        errors.street ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123 Rizal Street, Barangay San Jose"
                    />
                    {errors.street && <p className="text-sm text-red-500 mt-1">{errors.street}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Quezon City"
                    />
                    {errors.city && <p className="text-sm text-red-500 mt-1">{errors.city}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Province *
                    </label>
                    <select
                      value={formData.province}
                      onChange={(e) => handleInputChange('province', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                        errors.province ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Province</option>
                      {provinces.map(province => (
                        <option key={province} value={province}>{province}</option>
                      ))}
                    </select>
                    {errors.province && <p className="text-sm text-red-500 mt-1">{errors.province}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Postal Code *
                    </label>
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => handleInputChange('postalCode', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                        errors.postalCode ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="1100"
                    />
                    {errors.postalCode && <p className="text-sm text-red-500 mt-1">{errors.postalCode}</p>}
                  </div>
                </div>
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
                  <h2 className="text-xl font-semibold text-gray-900">Payment Method</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {paymentMethods.map(method => (
                    <div
                      key={method.id}
                      className={`border-2 rounded-xl p-4 cursor-pointer transition-colors ${
                        formData.paymentMethod === method.id
                          ? 'border-[var(--brand-primary)] bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleInputChange('paymentMethod', method.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          formData.paymentMethod === method.id
                            ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]'
                            : 'border-gray-300'
                        }`}>
                          {formData.paymentMethod === method.id && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <method.icon className="w-5 h-5 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">{method.name}</p>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Details */}
                {formData.paymentMethod === 'card' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Card Number *
                        </label>
                        <input
                          type="text"
                          value={formData.cardNumber || ''}
                          onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                            errors.cardNumber ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="1234 5678 9012 3456"
                        />
                        {errors.cardNumber && <p className="text-sm text-red-500 mt-1">{errors.cardNumber}</p>}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cardholder Name *
                        </label>
                        <input
                          type="text"
                          value={formData.cardName || ''}
                          onChange={(e) => handleInputChange('cardName', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                            errors.cardName ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="JUAN DELA CRUZ"
                        />
                        {errors.cardName && <p className="text-sm text-red-500 mt-1">{errors.cardName}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date *
                        </label>
                        <input
                          type="text"
                          value={formData.expiryDate || ''}
                          onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                            errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="MM/YY"
                        />
                        {errors.expiryDate && <p className="text-sm text-red-500 mt-1">{errors.expiryDate}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV *
                        </label>
                        <input
                          type="text"
                          value={formData.cvv || ''}
                          onChange={(e) => handleInputChange('cvv', e.target.value)}
                          className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                            errors.cvv ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="123"
                        />
                        {errors.cvv && <p className="text-sm text-red-500 mt-1">{errors.cvv}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {formData.paymentMethod === 'gcash' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GCash Number *
                    </label>
                    <input
                      type="text"
                      value={formData.gcashNumber || ''}
                      onChange={(e) => handleInputChange('gcashNumber', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                        errors.gcashNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+63 912 345 6789"
                    />
                    {errors.gcashNumber && <p className="text-sm text-red-500 mt-1">{errors.gcashNumber}</p>}
                  </div>
                )}

                {formData.paymentMethod === 'paymaya' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      PayMaya Number *
                    </label>
                    <input
                      type="text"
                      value={formData.paymayaNumber || ''}
                      onChange={(e) => handleInputChange('paymayaNumber', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent ${
                        errors.paymayaNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+63 912 345 6789"
                    />
                    {errors.paymayaNumber && <p className="text-sm text-red-500 mt-1">{errors.paymayaNumber}</p>}
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                
                <div className="space-y-3 mb-6">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium line-clamp-1">{item.name}</p>
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
                    <h4 className="text-sm font-semibold text-gray-900">Have a Voucher?</h4>
                  </div>
                  
                  {appliedVoucher ? (
                    <div className="flex items-center justify-between bg-orange-50 border-2 border-[var(--brand-primary)] rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-[var(--brand-primary)]" />
                        <div>
                          <p className="text-sm font-bold text-[var(--brand-primary)]">{appliedVoucher}</p>
                          <p className="text-xs text-gray-600">{VOUCHERS[appliedVoucher].description}</p>
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
                          onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
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

                <div className="space-y-2 mb-4">\n                  <div className="flex justify-between text-gray-600">
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
                  <hr className="border-gray-300" />
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-[var(--brand-primary)]">₱{finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
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
    </div>
  );
}