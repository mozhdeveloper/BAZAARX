import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/sellerStore';
import { getSellerAccessTier, isPathAllowedForTier } from '@/utils/sellerAccess';

export function ProtectedSellerRoute({ children }: { children: React.ReactNode }) {
  const { seller } = useAuthStore();
  const location = useLocation();

  if (!seller) {
    return <Navigate to="/seller/auth" replace />;
  }

  if (!seller.storeName) {
    return <Navigate to="/seller/onboarding" replace />;
  }

  const accessTier = getSellerAccessTier(seller);

  if (accessTier === 'blocked') {
    if (location.pathname === '/seller/account-blocked') {
      return <>{children}</>;
    }

    return <Navigate to="/seller/account-blocked" replace />;
  }

  if (accessTier === 'approved') {
    if (location.pathname === '/seller/unverified' || location.pathname === '/seller/account-blocked') {
      return <Navigate to="/seller" replace />;
    }

    return <>{children}</>;
  }

  if (isPathAllowedForTier(location.pathname, accessTier)) {
    return <>{children}</>;
  }

  return <Navigate to="/seller/unverified" replace />;
}
