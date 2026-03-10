import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { AlertTriangle, ChevronRight } from "lucide-react";
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

  const isRejectedStatus =
    seller?.approvalStatus === "needs_resubmission" ||
    seller?.approvalStatus === "rejected";

  return (
    <div
      className={cn(
        "h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans",
        className
      )}
    >
      <SidebarComponent />

      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Premium Global Rejection Banner */}
        {isRejectedStatus && seller?.latestRejection?.description && (
          <div className="bg-red-50 border-l-4 border-l-red-600 border-b border-red-100 px-6 py-3 flex items-center justify-between gap-4 z-50 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-red-100/50 to-transparent pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="bg-red-100/80 p-2 rounded-full shrink-0 shadow-inner">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-900 mb-0.5">
                  {seller.approvalStatus === "rejected" ? "Application Rejected" : "Action Required"}
                </h4>
                <p className="text-sm text-red-700 font-medium">
                  {seller.latestRejection.description}
                </p>
              </div>
            </div>
            <Link
              to="/seller/store-profile"
              className="relative z-10 hidden sm:flex items-center text-xs font-bold text-red-700 hover:text-red-900 transition-colors bg-white px-3 py-1.5 rounded-full border border-red-200 shadow-sm hover:shadow"
            >
              Fix Issues <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
        )}

        {children}
      </main>
    </div>
  );
}