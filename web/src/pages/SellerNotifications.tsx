import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bell,
  CheckCircle,
  Package,
  ShoppingBag,
  Truck,
  XCircle,
  Check,
  Trash2,
  Filter,
  Search,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/sellerStore";
import {
  notificationService,
  type Notification as DbNotification,
} from "@/services/notificationService";
import { sellerLinks } from "@/config/sellerLinks";

function getNotificationIcon(type: string) {
  if (type === "seller_new_order")
    return <ShoppingBag className="w-5 h-5 text-green-600" />;
  if (type.includes("confirmed"))
    return <CheckCircle className="w-5 h-5 text-blue-600" />;
  if (type.includes("shipped"))
    return <Truck className="w-5 h-5 text-orange-600" />;
  if (type.includes("delivered"))
    return <Package className="w-5 h-5 text-green-600" />;
  if (type.includes("cancelled"))
    return <XCircle className="w-5 h-5 text-red-600" />;
  if (type.includes("return"))
    return <Package className="w-5 h-5 text-yellow-600" />;
  return <Bell className="w-5 h-5 text-gray-600" />;
}

function getNotificationBgColor(type: string) {
  if (type === "seller_new_order") return "bg-green-50";
  if (type.includes("confirmed")) return "bg-blue-50";
  if (type.includes("shipped")) return "bg-orange-50";
  if (type.includes("delivered")) return "bg-green-50";
  if (type.includes("cancelled")) return "bg-red-50";
  if (type.includes("return")) return "bg-yellow-50";
  return "bg-gray-50";
}

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function SellerNotifications() {
  const navigate = useNavigate();
  const { seller } = useAuthStore();
  const [notifications, setNotifications] = useState<DbNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!seller?.id) return;
    setLoading(true);
    try {
      const data = await notificationService.getNotifications(
        seller.id,
        "seller",
        100
      );
      setNotifications(data);
    } catch (error) {
      console.error("[SellerNotifications] Error fetching:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [seller?.id]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !n.title.toLowerCase().includes(query) &&
          !n.message.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Type filter
      if (filterType !== "all") {
        if (filterType === "orders" && !n.type.includes("order")) return false;
        if (filterType === "returns" && !n.type.includes("return")) return false;
        if (filterType === "reviews" && !n.type.includes("review")) return false;
      }

      // Status filter
      if (filterStatus === "unread" && n.is_read) return false;
      if (filterStatus === "read" && !n.is_read) return false;

      return true;
    });
  }, [notifications, searchQuery, filterType, filterStatus]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId
          ? { ...n, is_read: true, read_at: new Date().toISOString() }
          : n
      )
    );
  };

  const handleMarkAllAsRead = async () => {
    if (!seller?.id) return;
    await notificationService.markAllAsRead(seller.id, "seller");
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
  };

  const handleNotificationClick = async (n: DbNotification) => {
    // Mark as read
    if (!n.is_read) {
      await handleMarkAsRead(n.id);
    }

    // Extract Order ID or Number from action_data
    const data = n.action_data as any;
    const orderId = data?.orderId || data?.id;
    const orderNumber = data?.orderNumber || data?.order_number;

    // Priority: Use Order Number if available, else UUID
    const targetId = orderNumber || orderId;

    // 1. For Order Notifications: Force the correct query param format "?ID"
    // This fixes both new and existing notifications in the database
    if (targetId && (n.type === "seller_new_order" || n.type.includes("order"))) {
      navigate(`/seller/orders?${targetId}`);
      return;
    }

    // 2. Fallback: Use explicit Action URL
    if (n.action_url) {
      navigate(n.action_url);
    } else {
      // 3. Final Fallback
      navigate("/seller/orders");
    }
  };

  const handleLogout = () => {
    navigate("/seller/auth");
  };

  const [open, setOpen] = useState(false);

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <SidebarLink
              link={{
                label: seller?.storeName || "Seller",
                href: "/seller/store-profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.storeName?.charAt(0) || "S"}
                    </span>
                  </div>
                ),
              }}
            />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {open && <span>Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell className="w-6 h-6 text-orange-500" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-orange-500 text-white ml-2">
                    {unreadCount} new
                  </Badge>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                Stay updated with your store activity
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotifications}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {unreadCount > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark All Read
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="returns">Returns</SelectItem>
                  <SelectItem value="reviews">Reviews</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-lg border overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No notifications
                </h3>
                <p className="text-gray-500">
                  {searchQuery || filterType !== "all" || filterStatus !== "all"
                    ? "No notifications match your filters"
                    : "You're all caught up!"}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!notification.is_read ? "bg-orange-50/50" : ""
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getNotificationBgColor(
                          notification.type
                        )}`}
                      >
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4
                              className={`text-sm font-medium ${!notification.is_read
                                ? "text-gray-900"
                                : "text-gray-700"
                                }`}
                            >
                              {notification.title}
                            </h4>
                            <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-400">
                              {formatTimeAgo(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <span className="w-2 h-2 bg-orange-500 rounded-full" />
                            )}
                          </div>
                        </div>

                        {/* Priority badge */}
                        {notification.priority === "high" ||
                          notification.priority === "urgent" ? (
                          <Badge
                            variant="outline"
                            className={`mt-2 ${notification.priority === "urgent"
                              ? "border-red-300 text-red-600"
                              : "border-orange-300 text-orange-600"
                              }`}
                          >
                            {notification.priority === "urgent"
                              ? "Urgent"
                              : "High Priority"}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {notifications.length > 0 && (
            <div className="mt-4 text-center text-sm text-gray-500">
              Showing {filteredNotifications.length} of {notifications.length}{" "}
              notifications
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      to="/seller"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img
        src="/Logo.png"
        alt="BazaarPH Logo"
        className="h-8 w-8 object-contain flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-gray-900 dark:text-white whitespace-pre"
      >
        BazaarPH Seller
      </motion.span>
    </Link>
  );
};

const LogoIcon = () => {
  return (
    <Link
      to="/seller"
      className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20"
    >
      <img
        src="/Logo.png"
        alt="BazaarPH Logo"
        className="h-8 w-8 object-contain flex-shrink-0"
      />
    </Link>
  );
};

export default SellerNotifications;
