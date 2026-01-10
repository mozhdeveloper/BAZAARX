import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Package, Truck, CheckCircle, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { OrderNotification } from "@/stores/cartStore";

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
  const [open, setOpen] = useState(false);
  const unreadCount = notifications.filter((n) => n.read === false).length;

  console.log("Notifications:", notifications);
  console.log("Unread count:", unreadCount);

  const handleMarkAllAsRead = () => {
    notifications.forEach((notification) => {
      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    });
  };

  const handleNotificationClick = (notification: OrderNotification) => {
    markNotificationRead(notification.id);
    setOpen(false);
    // Navigate to order detail or delivery tracking based on status
    if (notification.type === "shipped" || notification.type === "delivered") {
      navigate(`/delivery-tracking/${notification.orderId}`);
    } else {
      navigate(`/orders/${notification.orderId}`);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative text-[var(--text-secondary)] hover:text-[var(--brand-primary)]"
          aria-label="Open notifications"
        >
          <Bell size={20} strokeWidth={2} aria-hidden="true" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 min-w-5 h-5 px-1 flex items-center justify-center bg-red-500 text-white border-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
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

        {notifications.length === 0 ? (
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
                onClick={() => handleNotificationClick(notification)}
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
