import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  Star,
  TrendingUp,
  Store,
  Wallet,
  Zap,
  MessageSquare,
  FileCheck,
  CreditCard,
  RotateCcw,
  Bell,
  HelpCircle,
} from "lucide-react";

export type SellerNavLink = {
  label: string;
  href: string;
  icon: ReactNode;
};

export const sellerLinks: SellerNavLink[] = [
  {
    label: "Dashboard",
    href: "/seller",
    icon: (
      <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Store Profile",
    href: "/seller/store-profile",
    icon: (
      <Store className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Products",
    href: "/seller/products",
    icon: (
      <Package className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "QA Status",
    href: "/seller/product-status-qa",
    icon: (
      <FileCheck className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Orders",
    href: "/seller/orders",
    icon: (
      <ShoppingCart className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Notifications",
    href: "/seller/notifications",
    icon: (
      <Bell className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Returns & Refunds",
    href: "/seller/returns",
    icon: (
      <RotateCcw className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "POS Lite",
    href: "/seller/pos",
    icon: (
      <CreditCard className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "POS Settings",
    href: "/seller/pos-settings",
    icon: (
      <Settings className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Discounts",
    href: "/seller/discounts",
    icon: (
      <Zap className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Messages",
    href: "/seller/messages",
    icon: (
      <MessageSquare className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Earnings",
    href: "/seller/earnings",
    icon: (
      <Wallet className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Reviews",
    href: "/seller/reviews",
    icon: (
      <Star className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Help Center",
    href: "/seller/help-center",
    icon: (
      <HelpCircle className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Settings",
    href: "/seller/settings",
    icon: (
      <Settings className="h-5 w-5 flex-shrink-0" />
    ),
  },
];

export const unverifiedSellerLinks: SellerNavLink[] = [
  {
    label: "Checklist",
    href: "/seller/unverified",
    icon: (
      <FileCheck className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Store Profile",
    href: "/seller/store-profile",
    icon: (
      <Store className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Notifications",
    href: "/seller/notifications",
    icon: (
      <Bell className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Help Center",
    href: "/seller/help-center",
    icon: (
      <HelpCircle className="h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Settings",
    href: "/seller/settings",
    icon: (
      <Settings className="h-5 w-5 flex-shrink-0" />
    ),
  },
];
