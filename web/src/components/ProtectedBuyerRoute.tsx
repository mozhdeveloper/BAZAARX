import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useBuyerStore } from "@/stores/buyerStore";
import { supabase } from "@/lib/supabase";

export function ProtectedBuyerRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useBuyerStore();
  const [isChecking, setIsChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setHasSession(!!session);
      } catch (error) {
        console.error('Auth check error:', error);
        setHasSession(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  // Show loading while checking auth
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // No session - redirect to login
  if (!hasSession && !profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
