import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle,
  Package,
  Flame,
  ArrowRight,
  Home,
  Share2,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';

interface PaymentSuccessDetail {
  orderNumber: string;
  amount: number;
  bazcoinsEarned: number;
  paymentMethod: string;
  transactionId?: string;
  email: string;
}

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [successDetail, setSuccessDetail] = React.useState<PaymentSuccessDetail | null>(null);

  useEffect(() => {
    try {
      const encodedData = searchParams.get('data');
      if (encodedData) {
        const data = JSON.parse(atob(encodedData)) as PaymentSuccessDetail;
        setSuccessDetail(data);
      }
    } catch (error) {
      console.error('Failed to parse success data:', error);
    }
  }, [searchParams]);

  // Demo data if no params provided
  const orderNumber = successDetail?.orderNumber || '#TXNO8IRI0F5';
  const amount = successDetail?.amount || 1000;
  const bazcoinsEarned = successDetail?.bazcoinsEarned || 100;
  const paymentMethod = successDetail?.paymentMethod || 'paymongo';
  const email = successDetail?.email || 'customer@bazaarx.ph';

  const getPaymentMethodDisplay = (method: string) => {
    switch (method.toLowerCase()) {
      case 'paymongo':
        return 'PayMongo';
      case 'gcash':
        return 'GCash';
      case 'maya':
        return 'Maya';
      case 'cod':
        return 'Cash on Delivery';
      default:
        return method;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-orange-50">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Icon & Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-16 h-16 text-orange-600" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            Order Placed Successfully!
          </h1>
          <p className="text-lg text-gray-600 mb-2">
            Your order has been confirmed. Payment method:
          </p>
          <p className="text-lg font-semibold text-[var(--brand-primary)]">
            {getPaymentMethodDisplay(paymentMethod)}
          </p>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bazcoins Rewards Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200 rounded-2xl p-6 shadow-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-orange-700 mb-1">REWARDS EARNED!</p>
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                  You earned {bazcoinsEarned} Bazcoins
                </h2>
              </div>
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Flame className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm text-orange-700">
              Use Bazcoins to get discounts on future purchases
            </p>
          </motion.div>

          {/* Order Number Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-orange-200 rounded-2xl p-6 shadow-lg"
          >
            <p className="text-sm font-semibold text-gray-600 mb-2">ORDER NUMBER</p>
            <p className="text-2xl lg:text-3xl font-bold text-orange-600 font-mono mb-4">
              {orderNumber}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(orderNumber);
                alert('Order number copied to clipboard!');
              }}
              className="text-sm text-gray-600 hover:text-[var(--brand-primary)] transition-colors"
            >
              Click to copy
            </button>
          </motion.div>
        </div>

        {/* Payment Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md mb-8"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Package className="w-5 h-5 text-[var(--brand-primary)]" />
            Payment Information
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-gray-600">Method</span>
              <span className="font-semibold text-gray-900">{getPaymentMethodDisplay(paymentMethod)}</span>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-gray-600">Status</span>
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                <CheckCircle className="w-4 h-4" />
                Confirmed
              </span>
            </div>

            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <span className="text-gray-600">Amount</span>
              <span className="text-2xl font-bold text-[var(--brand-primary)]">
                ₱{amount.toLocaleString()}
              </span>
            </div>

            {successDetail?.transactionId && (
              <div className="flex justify-between items-center pt-2">
                <span className="text-gray-600 text-sm">Transaction ID</span>
                <span className="text-gray-900 font-mono text-sm break-all">
                  {successDetail.transactionId}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8"
        >
          <h3 className="text-lg font-bold text-blue-900 mb-4">What Happens Next?</h3>
          <ul className="space-y-3">
            <li className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-bold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-blue-900">Order Confirmation</p>
                <p className="text-sm text-blue-800">A confirmation email will be sent to {email}</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-bold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-blue-900">Seller Preparation</p>
                <p className="text-sm text-blue-800">Your seller will start preparing your items</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-bold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-blue-900">Shipment</p>
                <p className="text-sm text-blue-800">You'll receive tracking information once dispatched</p>
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0 text-blue-900 font-bold text-sm">
                4
              </div>
              <div>
                <p className="font-medium text-blue-900">Delivery</p>
                <p className="text-sm text-blue-800">Receive & enjoy your order!</p>
              </div>
            </li>
          </ul>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <Button
            onClick={() => navigate('/orders')}
            className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white py-6 text-lg"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            Track Order
          </Button>

          <Button
            onClick={() => navigate('/shop')}
            variant="outline"
            className="flex-1 py-6 text-lg border-gray-300"
          >
            <Home className="w-5 h-5 mr-2" />
            Continue Shopping
          </Button>

          <Button
            onClick={() => {
              const shareText = `I just placed an order on BazaarX and earned ${bazcoinsEarned} Bazcoins! 🔥 Check it out!`;
              if (navigator.share) {
                navigator.share({
                  text: shareText,
                });
              } else {
                alert('Share feature not available on this device');
              }
            }}
            variant="outline"
            className="py-6 border-gray-300"
            size="icon"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>

      <BazaarFooter />
    </div>
  );
}
