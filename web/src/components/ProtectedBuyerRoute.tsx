import { Navigate } from "react-router-dom";
import { useBuyerStore } from "@/stores/buyerStore";

export function ProtectedBuyerRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useBuyerStore();

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
