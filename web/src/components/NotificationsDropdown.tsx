import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PopoverArrow } from "@radix-ui/react-popover";
import {
  Bell,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  ShoppingBag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { OrderNotification } from "@/stores/cartStore";
import { getCurrentUser, isSupabaseConfigured } from "@/lib/supabase";
import {
  notificationService,
  type Notification as DbNotification,
} from "@/services/notificationService";
import { cn } from "@/lib/utils";

// --- Helper Functions ---

function getNotificationStyles(type: string) {
  const t = type.toLowerCase();

  if (t.includes("delivered") || t.includes("shipped") || t === "shipped") {
    return {
      icon: <Truck className="w-5 h-5 text-orange-600" />,
      bg: "bg-orange-100",
      borderColor: "border-orange-200"
    };
  }
  if (t.includes("placed") || t.includes("confirmed") || t === "seller_confirmed") {
    return {
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      bg: "bg-green-100",
      borderColor: "border-green-200"
    };
  }
  if (t.includes("cancelled")) {
    return {
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      bg: "bg-red-100",
      borderColor: "border-red-200"
    };
  }
  if (t.includes("processing")) {
    return {
      icon: <Package className="w-5 h-5 text-blue-600" />,
      bg: "bg-blue-100",
      borderColor: "border-blue-200"
    };
  }

  return {
    icon: <Bell className="w-5 h-5 text-gray-600" />,
    bg: "bg-gray-100",
    borderColor: "border-gray-200"
  };
}

function getTimeAgo(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(timestamp).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function NotificationsDropdown() {
  const navigate = useNavigate();
  const { notifications, markNotificationRead } = useCartStore();
  const [open, setOpen] = useState(false);
  const [dbNotifications, setDbNotifications] = useState<DbNotification[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [buyerId, setBuyerId] = useState<string | null>(null);

  // Initialize buyer ID on mount
  useEffect(() => {
    let mounted = true;
    async function initBuyerId() {
      try {
        const user = await getCurrentUser();
        if (mounted && user?.id) {
          setBuyerId(user.id);
        }
      } catch (e) {
        console.error("Failed to get user", e);
      }
    }
    initBuyerId();
    return () => { mounted = false; };
  }, []);

  // Fetch notifications
  useEffect(() => {
    let mounted = true;
    async function loadNotifications() {
      if (!isSupabaseConfigured() || !buyerId) return;

      setDbLoading(true);
      try {
        const rows = await notificationService.getNotifications(buyerId, "buyer", 50);
        if (mounted) setDbNotifications(rows);
      } catch (e) {
        console.error("Failed to load notifications:", e);
      } finally {
        if (mounted) setDbLoading(false);
      }
    }

    loadNotifications();

    // Poll for updates if open
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    if (open) {
      pollInterval = setInterval(loadNotifications, 15000);
    }
    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [buyerId, open]);

  // Combined counts
  const unreadCount = dbNotifications.filter(n => !n.is_read).length +
    notifications.filter(n => !n.read).length;

  const handleMarkAllAsRead = async () => {
    notifications.forEach(n => !n.read && markNotificationRead(n.id));
    if (buyerId) {
      await notificationService.markAllAsRead(buyerId, "buyer");
      setDbNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleNotificationClickDb = async (n: DbNotification) => {
    if (!n.is_read) {
      setDbNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      await notificationService.markAsRead(n.id, "buyer");
    }
    setOpen(false);

    const data = n.action_data as any;
    if (data?.orderNumber) {
      navigate(`/order/${data.orderNumber}`);
    } else if (n.action_url) {
      navigate(n.action_url);
    } else {
      navigate("/orders");
    }
  };

  const handleNotificationClickLocal = (n: OrderNotification) => {
    markNotificationRead(n.id);
    setOpen(false);
    const targetId = n.orderNumber || n.orderId;
    if (n.type === "shipped" || n.type === "delivered") {
      navigate(`/delivery-tracking/${targetId}`);
    } else {
      navigate(`/order/${targetId}`);
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
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0 shadow-xl border-gray-100 rounded-xl overflow-hidden" align="end" sideOffset={8}>
        <PopoverArrow className="fill-white w-4 h-2 drop-shadow-sm" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-gray-900">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 px-1.5 py-0 h-5 text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-xs font-medium text-orange-600 hover:text-orange-700 hover:underline transition-colors"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* Scrollable Content Area */}
        <div className="max-h-[65vh] overflow-y-auto bg-gray-50/50">
          {dbLoading && dbNotifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <div className="animate-pulse bg-gray-200 h-8 w-8 rounded-full mb-3" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : dbNotifications.length === 0 && notifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-center px-6">
              <div className="bg-gray-100 p-4 rounded-full mb-3">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h5 className="text-gray-900 font-medium mb-1">No notifications yet</h5>
              <p className="text-xs text-gray-500 max-w-[200px]">
                When you place orders or receive updates, they will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* DB Notifications */}
              {dbNotifications.map((n) => {
                const style = getNotificationStyles(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClickDb(n)}
                    className={cn(
                      "group flex gap-4 p-4 border-b border-gray-100 cursor-pointer transition-all",
                      // Apply specific hover color requested: #FFD4A3
                      "hover:bg-[#E8E9EB]",
                      !n.is_read ? "bg-white" : "bg-gray-50"
                    )}
                  >
                    {/* Icon Box */}
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
                      style.bg,
                      style.borderColor
                    )}>
                      {style.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <p className={cn(
                          "text-sm leading-none truncate pr-2",
                          !n.is_read ? "font-semibold text-gray-900" : "font-medium text-gray-700"
                        )}>
                          {n.title}
                        </p>
                        {!n.is_read && <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className={cn(
                        "text-xs line-clamp-2",
                        !n.is_read ? "text-gray-600" : "text-gray-500"
                      )}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 pt-1">
                        {getTimeAgo(new Date(n.created_at))}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Local Notifications */}
              {notifications.map((n) => {
                const style = getNotificationStyles(n.type);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClickLocal(n)}
                    className={cn(
                      "group flex gap-4 p-4 border-b border-gray-100 cursor-pointer transition-all",
                      // Apply specific hover color requested: #FFD4A3
                      "hover:bg-[#E8E9EB]",
                      !n.read ? "bg-white" : "bg-white"
                    )}
                  >
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border",
                      style.bg,
                      style.borderColor
                    )}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className={cn(
                          "text-sm leading-none font-medium",
                          !n.read ? "text-gray-900 font-semibold" : "text-gray-700"
                        )}>
                          Order Update
                        </p>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 mt-1" />}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 pt-1">
                        {getTimeAgo(n.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}