import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
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

  return (
    <div
      className={cn(
        "h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans",
        className
      )}
    >
      <SidebarComponent />
      {children}
    </div>
  );
}
