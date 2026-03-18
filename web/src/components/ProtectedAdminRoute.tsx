import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/stores/adminStore";
import type { AdminUser } from "@/stores/adminStore";

type AdminRole = AdminUser["role"];

export function ProtectedAdminRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  /** If omitted every authenticated admin can access; otherwise restrict to these roles */
  allowedRoles?: AdminRole[];
}) {
  const { isAuthenticated, isLoading, user } = useAdminAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Not authenticated - redirect to admin login
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Role check — if allowedRoles specified, verify user has one of them
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // QA users go to QA dashboard; others go to main admin dashboard
    const fallback = user.role === "qa_team" ? "/admin/qa-dashboard" : "/admin";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
