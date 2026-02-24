import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { useAuthStore } from "@/stores/sellerStore";
import type { SellerNavLink } from "@/config/sellerLinks";

type BaseSellerSidebarProps = {
  links: SellerNavLink[];
  subtitle: string;
};

const SellerLogo = ({
  open,
  subtitle,
}: {
  open: boolean;
  subtitle: string;
}) => (
  <Link
    to="/seller"
    className={cn(
      "flex items-center py-2 group transition-all duration-300",
      open ? "justify-start px-2 gap-3" : "justify-center px-0 gap-0"
    )}
  >
    <div className="w-10 h-10 bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
      <img
        src="/BazaarX.png"
        alt="BazaarX Logo"
        className="h-6 w-6 brightness-0 invert"
      />
    </div>

    <motion.div
      animate={{
        opacity: open ? 1 : 0,
        width: open ? "auto" : 0,
        display: open ? "flex" : "none",
      }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="flex-col overflow-hidden whitespace-nowrap"
    >
      <span className="font-black text-xl text-[var(--text-headline)] font-heading tracking-tight leading-none">
        BazaarX
      </span>
      <span className="text-[10px] text-[var(--brand-primary)] font-bold tracking-widest uppercase">
        {subtitle}
      </span>
    </motion.div>
  </Link>
);

export const BaseSellerSidebar = ({
  links,
  subtitle,
}: BaseSellerSidebarProps) => {
  const [open, setOpen] = useState(false);
  const { seller, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/seller/auth");
  };

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody className="justify-between gap-4 bg-white z-50 transition-all duration-300">
        <SellerLogo open={open} subtitle={subtitle} />

        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide pt-2">
          <div className="mt-2 flex flex-col gap-2">
            {links.map((link, idx) => (
              <SidebarLink key={idx} link={link} />
            ))}
          </div>
        </div>

        <div className="space-y-2 pt-6 border-t border-gray-50">
          <SidebarLink
            link={{
              label: seller?.storeName || seller?.ownerName || "Seller",
              href: "/seller/profile",
              icon: (
                <div className="h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <span className="text-white text-xs font-bold">
                    {(seller?.storeName || "S").charAt(0).toUpperCase()}
                  </span>
                </div>
              ),
            }}
          />

          <button
            onClick={async () => {
              const hasBuyerAccount =
                await useAuthStore.getState().createBuyerAccount();
              if (hasBuyerAccount) navigate("/profile");
            }}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-orange-50 rounded-xl transition-all group overflow-hidden"
          >
            <Users className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors" />
            <motion.span
              animate={{
                opacity: open ? 1 : 0,
                width: open ? "auto" : 0,
                display: open ? "block" : "none",
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="whitespace-nowrap overflow-hidden"
            >
              Switch to Buyer Mode
            </motion.span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group overflow-hidden"
          >
            <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
            <motion.span
              animate={{
                opacity: open ? 1 : 0,
                width: open ? "auto" : 0,
                display: open ? "block" : "none",
              }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="whitespace-nowrap overflow-hidden"
            >
              Logout
            </motion.span>
          </button>
        </div>
      </SidebarBody>
    </Sidebar>
  );
};
