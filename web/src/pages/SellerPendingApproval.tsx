import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/sellerStore';
import { useAdminSellers } from '@/stores/adminStore';
import { Clock, CheckCircle, XCircle, AlertCircle, RefreshCw, Mail, Home } from 'lucide-react';

export function SellerPendingApproval() {
  const navigate = useNavigate();
  const { seller, logout, updateSellerDetails, authenticateSeller } = useAuthStore();
  const { sellers, approveSeller } = useAdminSellers();
  const [isApproving, setIsApproving] = useState(false);

  // Find the seller's status from admin store
  const sellerStatus = sellers.find(s => s.id === seller?.id);

  useEffect(() => {
    // If approved, redirect to dashboard
    if (sellerStatus?.status === 'approved') {
      navigate('/seller');
    }
  }, [sellerStatus, navigate]);

  if (!seller) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to view your application status</p>
          <Link to="/seller/login" className="text-orange-600 hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  const handleReapply = () => {
    navigate('/seller/onboarding');
  };

  const handleLogout = () => {
    logout();
    navigate('/seller/auth');
  };

  const handleCheckStatus = async () => {
    if (!seller || !sellerStatus) return;
    
    setIsApproving(true);
    
    // Simulate approval process (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Approve the seller in admin store
    await approveSeller(seller.id);
    
    // Update seller store to mark as verified and approved
    updateSellerDetails({
      isVerified: true,
      approvalStatus: 'approved'
    });
    
    // Authenticate the seller so they can access dashboard
    authenticateSeller();
    
    setIsApproving(false);
    
    // Redirect to dashboard
    navigate('/seller');
  };

  // Pending status
  if (!sellerStatus || sellerStatus.status === 'pending') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-6">
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
                  <Clock className="h-8 w-8 text-white animate-pulse" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white text-center">Application Under Review</h1>
              <p className="text-orange-100 text-center mt-2">
                Your seller application is being reviewed by our team
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Status Timeline */}
              <div className="mb-8">
                <div className="flex items-center mb-6">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Application Submitted</h3>
                    <p className="text-sm text-gray-600">Your information has been received</p>
                  </div>
                </div>

                <div className="flex items-center mb-6 relative">
                  <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200 -translate-y-6"></div>
                  <div className="flex-shrink-0 relative z-10">
                    <div className="h-10 w-10 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">Under Review</h3>
                    <p className="text-sm text-gray-600">Admin is reviewing your documents and information</p>
                  </div>
                </div>

                <div className="flex items-center opacity-50">
                  <div className="absolute left-5 top-0 h-full w-0.5 bg-gray-200 -translate-y-6"></div>
                  <div className="flex-shrink-0 relative z-10">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-gray-500" />
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-semibold text-gray-500">Approval</h3>
                    <p className="text-sm text-gray-400">Waiting for admin decision</p>
                  </div>
                </div>
              </div>

              {/* Demo Mode Notice */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-green-900 mb-2">🎮 Demo Mode Active</h3>
                    <p className="text-sm text-green-800 mb-2">
                      Click "Check Status" below to instantly approve your application and access your seller dashboard!
                    </p>
                    <p className="text-xs text-green-700">
                      In production, this would wait for real admin approval (1-3 business days).
                    </p>
                  </div>
                </div>
              </div>

              {/* Information Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">What happens next? (Production Flow)</h3>
                    <ul className="text-sm text-blue-800 space-y-2">
                      <li>• Our admin team will review your business documents</li>
                      <li>• We'll verify your business registration and bank details</li>
                      <li>• You'll receive an email notification once approved or if changes are needed</li>
                      <li>• This usually takes 1-3 business days</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Application Details */}
              <div className="border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Application Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Store Name:</span>
                    <span className="font-medium text-gray-900">{seller.storeName || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Business Name:</span>
                    <span className="font-medium text-gray-900">{seller.businessName || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{seller.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending Review
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleCheckStatus}
                  disabled={isApproving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-orange-500 text-orange-600 font-medium rounded-lg hover:bg-orange-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApproving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-5 w-5" />
                      Check Status (Auto-Approve)
                    </>
                  )}
                </button>
                <Link
                  to="/"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Home className="h-5 w-5" />
                  Browse BazaarPH
                </Link>
              </div>

              {/* Logout */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Sign out
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Rejected status
  if (sellerStatus.status === 'rejected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-8 py-6">
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
                  <XCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white text-center">Application Needs Revision</h1>
              <p className="text-red-100 text-center mt-2">
                Your seller application requires some changes
              </p>
            </div>

            {/* Content */}
            <div className="p-8">
              {/* Rejection Reason */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-900 mb-2">Admin Feedback</h3>
                    <p className="text-sm text-red-800 leading-relaxed">
                      {sellerStatus.rejectionReason || 'Please review and update your application documents.'}
                    </p>
                    {sellerStatus.rejectedAt && (
                      <p className="text-xs text-red-700 mt-2">
                        Reviewed on: {new Date(sellerStatus.rejectedAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Common Issues */}
              <div className="border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Common Issues to Check</h3>
                <ul className="text-sm text-gray-600 space-y-2">
                  <li>✓ Business permit is current and not expired</li>
                  <li>✓ Valid ID is clear and readable</li>
                  <li>✓ Proof of address matches business address</li>
                  <li>✓ Bank account details are accurate</li>
                  <li>✓ All required documents are uploaded</li>
                </ul>
              </div>

              {/* Application Details */}
              <div className="border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Your Current Information</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Store Name:</span>
                    <span className="font-medium text-gray-900">{seller.storeName || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Business Name:</span>
                    <span className="font-medium text-gray-900">{seller.businessName || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium text-gray-900">{seller.email}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleReapply}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <RefreshCw className="h-5 w-5" />
                  Update Application
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Sign Out
                </button>
              </div>

              {/* Contact Support */}
              <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                <p className="text-sm text-gray-600 mb-2">Need help with your application?</p>
                <a
                  href="mailto:seller-support@bazaarph.com"
                  className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium"
                >
                  <Mail className="h-4 w-4" />
                  Contact Support
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Suspended status
  if (sellerStatus.status === 'suspended') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-8 py-6">
              <div className="flex items-center justify-center mb-4">
                <div className="h-16 w-16 bg-white/20 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white text-center">Account Suspended</h1>
              <p className="text-gray-200 text-center mt-2">
                Your seller account has been temporarily suspended
              </p>
            </div>

            <div className="p-8">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Suspension Reason</h3>
                <p className="text-sm text-gray-700">
                  {sellerStatus.suspensionReason || 'Please contact support for more information.'}
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  For inquiries about your account suspension, please contact our support team.
                </p>
                <a
                  href="mailto:seller-support@bazaarph.com"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <Mail className="h-5 w-5" />
                  Contact Support
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
