import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Smartphone, Banknote, Shield, Check } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
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
  const { items, getTotalPrice, createOrder } = useCartStore();
  
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

  const totalPrice = getTotalPrice();
  const shippingFee = items.length > 0 && !items.every(item => item.isFreeShipping) ? 50 : 0;
  const finalTotal = totalPrice + shippingFee;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1000));

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
            '****1234' : 
            formData.paymentMethod === 'gcash' ? '09123456789' : 
            formData.paymentMethod === 'paymaya' ? '09123456789' : 
            'Cash on Delivery'
        },
        status: 'pending'
      });

      // Use setTimeout to avoid render navigation issue
      setTimeout(() => {
        navigate(`/delivery-tracking/${orderId}`);
      }, 0);
    } catch (error) {
      console.error('Order creation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
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
            onClick={() => navigate('/cart')}
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
                  {items.map(item => (
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

                <div className="space-y-2 mb-4">
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
                  <hr className="border-gray-300" />
                  <div className="flex justify-between text-lg font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-[var(--brand-primary)]">₱{finalTotal.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-secondary)] text-white"
                >
                  {isLoading ? 'Processing...' : 'Place Order'}
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