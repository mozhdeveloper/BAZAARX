import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/stores/sellerStore";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { UnverifiedSellerSidebar } from "@/components/seller/UnverifiedSellerSidebar";
import { getSellerAccessTier } from "@/utils/sellerAccess";

export function SellerWorkspaceLayout({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { seller } = useAuthStore();
  const accessTier = getSellerAccessTier(seller);
  const SidebarComponent =
    accessTier === "approved" ? SellerSidebar : UnverifiedSellerSidebar;

  const needsResubmission = seller?.approvalStatus === "needs_resubmission";

  return (
    <div
      className={cn(
        "h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans",
        className
      )}
    >
      <SidebarComponent />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Global Rejection Banner */}
        {needsResubmission && seller?.latestRejection?.description && (
          <div className="bg-orange-50 border-b border-orange-200 px-6 py-3 flex items-center gap-3 z-50">
            <AlertTriangle className="h-5 w-5 text-orange-600 flex-shrink-0" />
            <p className="text-sm font-medium text-orange-800">
              Action Required: {seller.latestRejection.description}
            </p>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
