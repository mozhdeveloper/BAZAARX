/**
 * Payment Result Page (Web)
 * Displays order success/failure scenarios
 * Routes:
 *   /payment/result?status=success&orderId=...
 *   /payment/result?status=failed&errorCode=...
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle, Loader2, ChevronRight, Home, Flame, RotateCcw } from 'lucide-react';
import { Button } from '../components/ui/button';

type PaymentResultStatus = 
  | 'success' 
  | 'processing' 
  | 'failed' 
  | 'pending_3ds'
  | 'insufficient_funds'
  | 'card_expired'
  | 'invalid_cvc'
  | 'fraudulent'
  | 'generic_decline'
  | 'processor_blocked';

interface PaymentInfo {
  status: PaymentResultStatus;
  orderId?: string;
  transactionId?: string;
  amount?: number;
  paymentMethod?: string;
  earnedBazcoins?: number;
  errorCode?: string;
  errorMessage?: string;
}

export default function PaymentResultPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    status: (searchParams.get('status') as PaymentResultStatus) || 'success',
  });

  useEffect(() => {
    const status = (searchParams.get('status') as PaymentResultStatus) || 'success';
    const orderId = searchParams.get('orderId') || '';
    const transactionId = searchParams.get('txnId') || `#TXN${Math.random().toString(36).substring(7).toUpperCase()}`;
    const amount = parseInt(searchParams.get('amount') || '0');
    const paymentMethod = searchParams.get('method') || 'Card';
    const earnedBazcoins = parseInt(searchParams.get('bazcoins') || '0');
    const errorCode = searchParams.get('errorCode') || '';
    const errorMessage = searchParams.get('errorMsg') || '';

    setPaymentInfo({
      status,
      orderId,
      transactionId,
      amount,
      paymentMethod,
      earnedBazcoins,
      errorCode,
      errorMessage,
    });
  }, [searchParams]);

  const isSuccess = paymentInfo.status === 'success';
  const isFailed = paymentInfo.status === 'failed' || ['insufficient_funds', 'card_expired', 'invalid_cvc', 'fraudulent', 'generic_decline', 'processor_blocked'].includes(paymentInfo.status);
  const isProcessing = paymentInfo.status === 'processing' || paymentInfo.status === 'pending_3ds';

  const getStatusIcon = () => {
    if (isProcessing) return <Loader2 className="w-20 h-20 text-amber-500 animate-spin" />;
    if (isSuccess) return <CheckCircle className="w-20 h-20 text-green-600" strokeWidth={1.5} />;
    return <AlertCircle className="w-20 h-20 text-red-600" strokeWidth={1.5} />;
  };

  const getStatusTitle = (): string => {
    switch (paymentInfo.status) {
      case 'success':
        return 'Order Placed Successfully!';
      case 'processing':
        return 'Processing Payment...';
      case 'pending_3ds':
        return 'Complete 3D Secure';
      case 'insufficient_funds':
        return 'Insufficient Funds';
      case 'card_expired':
        return 'Card Expired';
      case 'invalid_cvc':
        return 'Invalid CVC';
      case 'fraudulent':
        return 'Transaction Blocked';
      case 'generic_decline':
        return 'Payment Declined';
      case 'processor_blocked':
        return 'Processor Blocked';
      default:
        return 'Payment Failed';
    }
  };

  const getStatusMessage = (): string => {
    if (isSuccess) {
      return `Your order has been confirmed. Payment method: ${paymentInfo.paymentMethod}`;
    }
    if (isProcessing && paymentInfo.status === 'pending_3ds') {
      return 'Please complete 3D Secure authentication to finalize your payment.';
    }
    if (isProcessing) {
      return 'Your payment is being processed. Please wait...';
    }

    // Failed scenarios
    switch (paymentInfo.status) {
      case 'insufficient_funds':
        return 'Your card does not have sufficient funds. Please use a different card or payment method.';
      case 'card_expired':
        return 'The card you used has expired. Please use a valid card.';
      case 'invalid_cvc':
        return 'The CVC/CVV you entered is incorrect. Please try again.';
      case 'fraudulent':
        return 'This transaction was flagged as suspicious. Please contact your bank.';
      case 'generic_decline':
        return 'Your payment could not be processed. Please try a different card or contact us.';
      case 'processor_blocked':
        return 'Your transaction was blocked by the payment processor. Please contact your bank.';
      default:
        return paymentInfo.errorMessage || 'Your payment could not be completed. Please try again.';
    }
  };

  const handleContinue = () => {
    if (isSuccess) {
      navigate('/orders');
    } else {
      navigate('/checkout');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Gradient */}
        <div className={`h-2 ${isSuccess ? 'bg-gradient-to-r from-green-400 to-green-600' : isFailed ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`} />

        {/* Content */}
        <div className="p-8 text-center">
          {/* Icon */}
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
            isSuccess ? 'bg-green-100' : isFailed ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            {getStatusIcon()}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            {getStatusTitle()}
          </h1>

          {/* Message */}
          <p className={`text-base mb-6 leading-relaxed ${
            isSuccess ? 'text-gray-600' : isFailed ? 'text-red-600 font-medium' : 'text-amber-700'
          }`}>
            {getStatusMessage()}
          </p>

          {/* Rewards Card (only on success) */}
          {isSuccess && paymentInfo.earnedBazcoins > 0 && (
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-4 mb-6 text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                  <Flame size={24} className="text-white fill-white" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold opacity-90">REWARDS EARNED!</p>
                  <p className="text-lg font-bold">You earned {paymentInfo.earnedBazcoins.toLocaleString()} Bazcoins</p>
                </div>
              </div>
            </div>
          )}

          {/* Order Number Card */}
          {(isSuccess || paymentInfo.orderId) && (
            <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-amber-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Order Number
              </p>
              <p className="text-3xl font-bold text-amber-600">
                #{paymentInfo.transactionId || paymentInfo.orderId}
              </p>
            </div>
          )}

          {/* Payment Info Card */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-6 border border-amber-100 text-left">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Information</h3>

            <div className="space-y-3">
              {/* Method */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Method</span>
                <span className="font-semibold text-gray-900">{paymentInfo.paymentMethod}</span>
              </div>

              <div className="h-px bg-gray-200" />

              {/* Status */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Status</span>
                <span className={`px-3 py-1 rounded-lg font-bold text-xs ${
                  isSuccess ? 'bg-green-100 text-green-700' : isFailed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {isSuccess ? 'Confirmed' : isFailed ? 'Declined' : 'Processing'}
                </span>
              </div>

              {/* Amount */}
              {paymentInfo.amount && (
                <>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Amount</span>
                    <span className="font-bold text-amber-600">
                      ₱{paymentInfo.amount.toLocaleString()}
                    </span>
                  </div>
                </>
              )}

              {/* Transaction ID */}
              {paymentInfo.transactionId && (
                <>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Transaction ID</span>
                    <span className="text-xs text-gray-500 font-mono truncate">
                      {paymentInfo.transactionId}
                    </span>
                  </div>
                </>
              )}

              {/* Error Code */}
              {paymentInfo.errorCode && (
                <>
                  <div className="h-px bg-gray-200" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Error Code</span>
                    <span className="text-xs font-semibold text-red-600">
                      {paymentInfo.errorCode}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {isSuccess ? (
              <Button
                onClick={() => navigate('/orders')}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 group"
              >
                <span>View My Orders</span>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition" />
              </Button>
            ) : isFailed ? (
              <>
                <Button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 group"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  <span>Try Again</span>
                </Button>
                <Button
                  onClick={() => navigate('/orders')}
                  variant="outline"
                  className="w-full border-2 border-amber-600 text-amber-600 hover:bg-amber-50 font-semibold py-3"
                >
                  <span>Go to Orders</span>
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate('/orders')}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3"
                disabled
              >
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>Processing...</span>
              </Button>
            )}
          </div>

          {/* Help Link */}
          <button
            onClick={() => navigate('/help-center')}
            className="mt-6 text-sm text-gray-600 hover:text-amber-600 font-medium transition"
          >
            Need help? Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
