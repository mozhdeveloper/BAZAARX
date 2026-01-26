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
} from "lucide-react";

export const sellerLinks = [
  {
    label: "Dashboard",
    href: "/seller",
    icon: (
      <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Store Profile",
    href: "/seller/store-profile",
    icon: (
      <Store className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Products",
    href: "/seller/products",
    icon: (
      <Package className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "QA Status",
    href: "/seller/product-status-qa",
    icon: (
      <FileCheck className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Orders",
    href: "/seller/orders",
    icon: (
      <ShoppingCart className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Returns & Refunds",
    href: "/seller/returns",
    icon: (
      <RotateCcw className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "POS Lite",
    href: "/seller/pos",
    icon: (
      <CreditCard className="text-orange-600 dark:text-orange-400 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Discounts",
    href: "/seller/discounts",
    icon: (
      <Zap className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Messages",
    href: "/seller/messages",
    icon: (
      <MessageSquare className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Earnings",
    href: "/seller/earnings",
    icon: (
      <Wallet className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Reviews",
    href: "/seller/reviews",
    icon: (
      <Star className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Analytics",
    href: "/seller/analytics",
    icon: (
      <TrendingUp className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Settings",
    href: "/seller/settings",
    icon: (
      <Settings className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    ),
  },
];
