/**
 * Payment Callback Page
 * 
 * Handles redirect returns from e-wallet payments (GCash, Maya, GrabPay).
 * Routes:
 *   /payment/success?txn=<transactionId>
 *   /payment/failed?txn=<transactionId>
 *   /payment/sandbox-ewallet?src=<sourceId>  (sandbox only)
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { payMongoService } from '@/services/payMongoService';

type CallbackStatus = 'loading' | 'success' | 'failed';

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [message, setMessage] = useState('');

  const txnId = searchParams.get('txn');
  const srcId = searchParams.get('src');
  const isSandboxEwallet = location.pathname.includes('sandbox-ewallet');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Sandbox e-wallet simulation — auto-complete
        if (isSandboxEwallet && srcId) {
          payMongoService.sandboxCompleteEWalletPayment(srcId);
          setStatus('success');
          setMessage('Sandbox payment completed successfully!');
          return;
        }

        // Real callback — confirm payment
        if (txnId) {
          const result = await payMongoService.confirmPayment(txnId);
          if (result.status === 'paid') {
            setStatus('success');
            setMessage('Payment confirmed! Your order is being processed.');
          } else if (result.status === 'failed') {
            setStatus('failed');
            setMessage(result.error || 'Payment was not completed.');
          } else {
            // Still processing
            setStatus('success');
            setMessage('Payment is being verified. You will receive a confirmation shortly.');
          }
        } else {
          // Determine from path
          if (location.pathname.includes('success')) {
            setStatus('success');
            setMessage('Payment completed successfully!');
          } else {
            setStatus('failed');
            setMessage('Payment was cancelled or failed.');
          }
        }
      } catch {
        setStatus('failed');
        setMessage('Could not verify payment status. Check your orders for updates.');
      }
    };

    processCallback();
  }, [txnId, srcId, isSandboxEwallet, location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-orange-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying Payment...</h2>
            <p className="text-gray-500">Please wait while we confirm your payment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <Button
              onClick={() => navigate('/orders', { replace: true })}
              className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
            >
              View My Orders
            </Button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Failed</h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/orders', { replace: true })}
                className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
              >
                View My Orders
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/', { replace: true })}
                className="w-full"
              >
                Go Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
