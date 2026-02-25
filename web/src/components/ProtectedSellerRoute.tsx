import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/sellerStore';
import {
  getDefaultPathForTier,
  getSellerAccessTier,
  isPathAllowedForTier,
} from '@/utils/sellerAccess';

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

  if (isPathAllowedForTier(location.pathname, accessTier)) {
    return <>{children}</>;
  }

  return <Navigate to={getDefaultPathForTier(accessTier)} replace />;
}
