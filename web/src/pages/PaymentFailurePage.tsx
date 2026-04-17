import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CreditCard,
  Clock,
  Lock,
  Phone,
  MessageSquare,
  Home,
  ArrowRight,
  Shield,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';

// Test card scenarios from PayMongo docs
const PAYMENT_ERROR_SCENARIOS = {
  card_expired: {
    title: 'Card Expired',
    description: 'The card you used has already expired.',
    icon: CreditCard,
    color: 'red',
    testCard: '4200000000000018',
    recommendation: 'Please use a different card or request a new one from your bank.',
    details: 'Your card expiration date has passed. Payment cannot be processed with an expired card.',
  },
  cvc_invalid: {
    title: 'Invalid CVC/CVN',
    description: 'The CVC/CVN entered is incorrect for this card.',
    icon: Lock,
    color: 'amber',
    testCard: '4300000000000017',
    recommendation: 'Please check your card and verify the CVC/CVN (3-4 digits on the back) and try again.',
    details: 'The security code you entered does not match the card number provided.',
  },
  generic_decline: {
    title: 'Payment Declined',
    description: 'The payment was declined by your card issuer for unknown reasons.',
    icon: AlertCircle,
    color: 'red',
    testCard: '4400000000000016 or 4028220000001457',
    recommendation: 'Please contact your card issuing bank for more information about why your payment was declined.',
    details: 'Your bank has declined this transaction. Contact them directly to resolve the issue.',
  },
  fraudulent: {
    title: 'Transaction Blocked',
    description: 'Your payment was blocked as we detected suspicious activity.',
    icon: Shield,
    color: 'red',
    testCard: '4500000000000015',
    recommendation: 'Please verify your identity with your bank or contact our support team for assistance.',
    details: 'For security reasons, we blocked this transaction. This is not an error on your part.',
  },
  insufficient_funds: {
    title: 'Insufficient Funds',
    description: 'Your card does not have sufficient funds to complete this transaction.',
    icon: AlertCircle,
    color: 'orange',
    testCard: '5100000000000198 or 5240460000001466',
    recommendation: 'Please use a different payment method or add funds to your card and try again.',
    details: 'Your available balance is lower than the transaction amount.',
  },
  processor_blocked: {
    title: 'Payment Blocked by Processor',
    description: 'The payment processor blocked this transaction.',
    icon: XCircle,
    color: 'red',
    testCard: '5200000000000197',
    recommendation: 'Please wait a few minutes and try again, or use a different payment method.',
    details: 'This is a temporary block from the payment processor. Retry after some time.',
  },
  lost_card: {
    title: 'Card Reported as Lost',
    description: 'This card has been reported as lost.',
    icon: AlertCircle,
    color: 'red',
    testCard: '5300000000000196 or 5483530000001462',
    recommendation: 'Please request a replacement card from your bank or use a different payment method.',
    details: 'Your card issuer has reported this card as lost. You need to contact them immediately.',
  },
  stolen_card: {
    title: 'Card Reported as Stolen',
    description: 'This card has been reported as stolen.',
    icon: AlertCircle,
    color: 'red',
    testCard: '5400000000000195',
    recommendation: 'Please contact your bank immediately and request a replacement card.',
    details: 'Your card issuer has reported this card as stolen for security reasons.',
  },
  processor_unavailable: {
    title: 'Processor Temporarily Down',
    description: 'The payment processor is temporarily unavailable.',
    icon: Clock,
    color: 'yellow',
    testCard: '5500000000000194',
    recommendation: 'Please wait a few minutes and try again.',
    details: 'The payment processor is experiencing technical issues. Please retry after some time.',
  },
  blocked: {
    title: 'Payment Blocked by Security',
    description: 'Your payment was blocked by our fraud detection system.',
    icon: Shield,
    color: 'red',
    testCard: '4600000000000014',
    recommendation: 'Please contact our support team or verify your account details.',
    details: 'Our security system flagged this transaction. For security, we cannot provide details.',
  },
};

interface PaymentErrorDetail {
  type: keyof typeof PAYMENT_ERROR_SCENARIOS;
  amount: number;
  orderNumber: string;
  email: string;
}

export default function PaymentFailurePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [errorDetail, setErrorDetail] = React.useState<PaymentErrorDetail | null>(null);

  useEffect(() => {
    try {
      const encodedData = searchParams.get('data');
      if (encodedData) {
        const data = JSON.parse(atob(encodedData)) as PaymentErrorDetail;
        setErrorDetail(data);
      }
    } catch (error) {
      console.error('Failed to parse error data:', error);
    }
  }, [searchParams]);

  // For demo purposes, default to 'card_expired' if no data
  const errorType = errorDetail?.type || 'card_expired';
  const error = PAYMENT_ERROR_SCENARIOS[errorType];
  const Icon = error.icon;

  const colorClasses = {
    red: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-600',
      badge: 'bg-red-100',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-600',
      badge: 'bg-orange-100',
    },
    amber: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'text-amber-600',
      badge: 'bg-amber-100',
    },
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: 'text-yellow-600',
      badge: 'bg-yellow-100',
    },
  };

  const colors = colorClasses[error.color as keyof typeof colorClasses];

  return (
    <div className={`min-h-screen ${colors.bg}`}>
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-12"
        >
          <div className={`w-20 h-20 ${colors.badge} rounded-full flex items-center justify-center mx-auto mb-6`}>
            <Icon className={`w-12 h-12 ${colors.icon}`} />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            {error.title}
          </h1>
          <p className="text-lg text-gray-600">
            {error.description}
          </p>
        </motion.div>

        {/* Error Details Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`${colors.bg} border ${colors.border} rounded-xl p-8 mb-8`}
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">What Happened?</h2>
          <p className="text-gray-700 ml-4 border-l-4 border-current pl-4">
            {error.details}
          </p>
        </motion.div>

        {/* Order Information */}
        {errorDetail && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white border border-gray-200 rounded-xl p-6 mb-8"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Order Number:</span>
                <span className="font-mono font-medium text-gray-900">{errorDetail.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-gray-900">₱{errorDetail.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Email:</span>
                <span className="text-gray-900">{errorDetail.email}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8"
        >
          <div className="flex gap-4">
            <MessageSquare className="w-6 h-6 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">What You Can Do</h3>
              <p className="text-blue-800">{error.recommendation}</p>
            </div>
          </div>
        </motion.div>

        {/* Contact Support */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white border border-gray-200 rounded-xl p-6 mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Need Help?
          </h3>
          <p className="text-gray-600 mb-4">
            If you've tried the recommendations above and still can't process your payment, our support team is here to help.
          </p>
          <Button
            onClick={() => {
              // This could open a support chat or redirect to support page
              window.location.href = 'mailto:support@bazaarx.ph?subject=Payment%20Issue%20-%20' + errorType;
            }}
            className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
          >
            Contact Support
          </Button>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button
            onClick={() => navigate('/checkout')}
            variant="outline"
            className="flex-1"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button
            onClick={() => navigate('/shop')}
            className="flex-1 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white"
          >
            <Home className="w-4 h-4 mr-2" />
            Return to Shop
          </Button>
        </motion.div>

        {/* Test Card Info (for development) */}
        {process.env.NODE_ENV === 'development' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-8 bg-gray-100 border border-gray-300 rounded-lg p-4 text-sm text-gray-700"
          >
            <p className="font-mono">
              <strong>Test Card:</strong> {error.testCard}
            </p>
            <p className="text-xs text-gray-600 mt-2">
              Use any future expiration date and any 3-digit CVC for testing
            </p>
          </motion.div>
        )}
      </div>

      <BazaarFooter />
    </div>
  );
}
