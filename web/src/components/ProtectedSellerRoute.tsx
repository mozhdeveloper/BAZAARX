import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/sellerStore';
import { useAdminSellers } from '@/stores/adminStore';

export function ProtectedSellerRoute({ children }: { children: React.ReactNode }) {
  const { seller } = useAuthStore();
  const { sellers } = useAdminSellers();
  
  if (!seller) {
    return <Navigate to="/seller/auth" replace />;
  }

  // Check seller's approval status from admin store
  const sellerStatus = sellers.find(s => s.id === seller.id);
  
  // If seller is pending or rejected, redirect to pending approval page
  if (sellerStatus && (sellerStatus.status === 'pending' || sellerStatus.status === 'rejected' || sellerStatus.status === 'suspended')) {
    return <Navigate to="/seller/pending-approval" replace />;
  }

  // If seller is not verified yet (hasn't completed onboarding)
  if (!seller.isVerified && !seller.storeName) {
    return <Navigate to="/seller/onboarding" replace />;
  }
  
  return <>{children}</>;
}
