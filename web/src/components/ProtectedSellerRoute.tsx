import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/sellerStore';

export function ProtectedSellerRoute({ children }: { children: React.ReactNode }) {
  const { seller } = useAuthStore();
  const location = useLocation();

  if (!seller) {
    return <Navigate to="/seller/auth" replace />;
  }

  const normalizedStatus = seller.approvalStatus || (seller.isVerified ? 'verified' : 'pending');
  const isApproved =
    seller.isVerified ||
    normalizedStatus === 'verified' ||
    normalizedStatus === 'approved';

  if (!seller.storeName) {
    return <Navigate to="/seller/onboarding" replace />;
  }

  if (isApproved) {
    return <>{children}</>;
  }

  if (normalizedStatus === 'needs_resubmission') {
    const canAccessResubmissionPaths =
      location.pathname === '/seller/profile' ||
      location.pathname === '/seller/store-profile' ||
      location.pathname === '/seller/pending-approval' ||
      location.pathname === '/seller/onboarding';

    if (canAccessResubmissionPaths) {
      return <>{children}</>;
    }

    return <Navigate to="/seller/store-profile" replace />;
  }

  if (normalizedStatus === 'pending' || normalizedStatus === 'rejected') {
    return <Navigate to="/seller/pending-approval" replace />;
  }

  return <Navigate to="/seller/pending-approval" replace />;
}
