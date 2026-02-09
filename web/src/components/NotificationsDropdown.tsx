import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Bell,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  ShoppingBag,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { OrderNotification } from "@/stores/cartStore";
import { useAuthStore } from "@/stores/sellerStore";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase";
import {
  notificationService,
  type Notification as DbNotification,
} from "@/services/notificationService";

function Dot({ className }: { className?: string }) {
  return (
    <svg
      width="6"
      height="6"
      fill="currentColor"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

function getNotificationIcon(type: OrderNotification["type"]) {
  switch (type) {
    case "seller_confirmed":
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    case "shipped":
      return <Truck className="w-4 h-4 text-blue-600" />;
    case "delivered":
      return <Package className="w-4 h-4 text-orange-600" />;
    case "cancelled":
      return <XCircle className="w-4 h-4 text-red-600" />;
    default:
      return <Bell className="w-4 h-4 text-gray-600" />;
  }
}

function getDbNotificationIcon(n: DbNotification) {
  // Map DB notification types to icons
  if (n.type === "seller_new_order")
    return <ShoppingBag className="w-4 h-4 text-green-600" />;
  if (n.type.startsWith("order_")) {
    const status = n.type.replace("order_", "");
    if (status === "placed")
      return <ShoppingBag className="w-4 h-4 text-green-600" />;
    if (status === "confirmed")
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (status === "processing")
      return <Package className="w-4 h-4 text-purple-600" />;
    if (status === "shipped")
      return <Truck className="w-4 h-4 text-blue-600" />;
    if (status === "delivered")
      return <Package className="w-4 h-4 text-orange-600" />;
    if (status === "cancelled")
      return <XCircle className="w-4 h-4 text-red-600" />;
  }
  return <Bell className="w-4 h-4 text-gray-600" />;
}

function getTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead } = useCartStore();
  const { seller } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [dbNotifications, setDbNotifications] = useState<DbNotification[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const location = useLocation();

  // Determine current user context: seller (from auth store) or buyer (from supabase auth)
  // Only use seller context if we're actually on a seller route
  const userContext = useMemo(() => {
    const isSellerRoute = location.pathname.startsWith('/seller');
    if (seller?.id && isSellerRoute) {
      console.log("[Notifications] Seller context detected:", seller.id);
      return { userId: seller.id, userType: "seller" as const };
    }
    console.log("[Notifications] Buyer context (seller route:", isSellerRoute, ")");
    return null; // Fallback to buyer via supabase below
  }, [seller?.id, location.pathname]);

  // Initialize buyer ID on mount
  useEffect(() => {
    let mounted = true;
    async function initBuyerId() {
      if (userContext) {
        console.log(
          "[Notifications] Using seller context, skipping buyer ID init",
        );
        return;
      }
      try {
        const user = await getCurrentUser();
        if (mounted) {
          if (user?.id) {
            console.log("[Notifications] Buyer ID initialized:", user.id);
            setBuyerId(user.id);
          } else {
            console.log("[Notifications] No authenticated buyer found");
          }
        }
      } catch (e) {
        console.error("[Notifications] Failed to get current user:", e);
      }
    }
    initBuyerId();
    return () => {
      mounted = false;
    };
  }, [userContext]);

  // Fetch notifications on mount and when dropdown opens
  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      if (!isSupabaseConfigured()) {
        console.log("[Notifications] Supabase not configured, skipping fetch");
        return;
      }

      setDbLoading(true);
      try {
        const userId = userContext?.userId || buyerId;
        const userType = userContext?.userType || "buyer";

        if (!userId) {
          console.log("[Notifications] No userId available, skipping fetch");
          setDbNotifications([]);
          setDbLoading(false);
          return;
        }

        console.log("[Notifications] Fetching notifications for:", {
          userId,
          userType,
        });
        const rows = await notificationService.getNotifications(userId, userType, 50);
        if (mounted) {
          console.log("[Notifications] Fetched", rows.length, "notifications");
          setDbNotifications(rows);
        }
      } catch (e) {
        console.error(
          "[Notifications] Failed to load notifications from DB:",
          e,
        );
      } finally {
        if (mounted) setDbLoading(false);
      }
    }

    loadNotifications();

    // Refresh every 30 seconds when dropdown is open
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (open) {
      console.log("[Notifications] Dropdown opened, starting poll");
      pollInterval = setInterval(() => {
        loadNotifications();
      }, 30000);
    }

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [userContext?.userId, userContext?.userType, buyerId, open]);

  const unreadCountLocal = notifications.filter((n) => n.read === false).length;
  const unreadCountDb = dbNotifications.filter(
    (n) => n.is_read === false,
  ).length;
  const unreadCount = unreadCountDb || unreadCountLocal;

  const handleMarkAllAsRead = async () => {
    // Mark local store notifications
    notifications.forEach((notification) => {
      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    });
    // Mark DB notifications
    try {
      const userId = userContext?.userId || buyerId;
      const userType = userContext?.userType || "buyer";
      if (userId) {
        console.log("[Notifications] Marking all as read for:", {
          userId,
          userType,
        });
        await notificationService.markAllAsRead(userId, userType);
        setDbNotifications((prev) =>
          prev.map((n) => ({
            ...n,
            is_read: true,
            read_at: new Date().toISOString(),
          })),
        );
      }
    } catch (e) {
      console.error(
        "[Notifications] Failed to mark all notifications read in DB:",
        e,
      );
    }
  };

  const handleNotificationClickLocal = (notification: OrderNotification) => {
    markNotificationRead(notification.id);
    setOpen(false);
    if (notification.type === "shipped" || notification.type === "delivered") {
      navigate(`/delivery-tracking/${notification.orderId}`);
    } else {
      navigate(`/order/${notification.orderId}`);
    }
  };

  const handleNotificationClickDb = async (n: DbNotification) => {
    try {
      await notificationService.markAsRead(n.id);
      setDbNotifications((prev) =>
        prev.map((x) =>
          x.id === n.id
            ? { ...x, is_read: true, read_at: new Date().toISOString() }
            : x,
        ),
      );
    } catch (e) {
      console.error("[Notifications] Failed to mark notification read:", e);
    }
    setOpen(false);
    if (n.action_url) {
      navigate(n.action_url);
      return;
    }
    // Fallback navigation based on type
    if (n.type.startsWith("order_")) {
      navigate(`/order/${(n.action_data as any)?.orderId ?? ""}`);
    } else if (n.type === "seller_new_order") {
      navigate(`/seller/orders/${(n.action_data as any)?.orderId ?? ""}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 text-gray-700 hover:text-[#ff6a00] hover:bg-gray-50 rounded-full transition-colors outline-none"
          aria-label="Open notifications"
        >
          <Bell className="w-6 h-6" strokeWidth={2} aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute top-0 right-0 min-w-[1.25rem] h-5 px-1 flex items-center justify-center bg-red-500 text-white border-none rounded-full text-xs">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-1" align="end">
        <div className="flex items-baseline justify-between gap-4 px-3 py-2">
          <div className="text-sm font-semibold">Notifications</div>
          {unreadCount > 0 && (
            <button
              className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </button>
          )}
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          className="-mx-1 my-1 h-px bg-border"
        ></div>

        {dbLoading ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>Loading notifications…</p>
          </div>
        ) : dbNotifications.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto">
            {dbNotifications.map((n) => (
              <div
                key={n.id}
                className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent cursor-pointer"
                onClick={() => handleNotificationClickDb(n)}
              >
                <div className="relative flex items-start gap-3 pe-3">
                  <div className="mt-0.5">{getDbNotificationIcon(n)}</div>
                  <div className="flex-1 space-y-1">
                    <p className="text-foreground/90 leading-snug">{n.title}</p>
                    <p className="text-muted-foreground text-xs">{n.message}</p>
                    <div className="text-xs text-muted-foreground">
                      {getTimeAgo(new Date(n.created_at))}
                    </div>
                  </div>
                  {!n.is_read && (
                    <div className="absolute end-0 top-1">
                      <span className="sr-only">Unread</span>
                      <Dot className="text-[var(--brand-primary)]" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent cursor-pointer"
                onClick={() => handleNotificationClickLocal(notification)}
              >
                <div className="relative flex items-start gap-3 pe-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-foreground/90 leading-snug">
                      {notification.message}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {getTimeAgo(notification.timestamp)}
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="absolute end-0 top-1">
                      <span className="sr-only">Unread</span>
                      <Dot className="text-[var(--brand-primary)]" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
