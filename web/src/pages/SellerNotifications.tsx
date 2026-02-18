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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
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

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto relative z-10 scrollbar-hide">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight flex items-center gap-3">
                  Notifications
                  {unreadCount > 0 && (
                    <div className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg shadow-orange-500/20 translate-y-0.5">
                      {unreadCount} new
                    </div>
                  )}
                </h1>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  Stay updated with your store activity
                </p>
              </div>


            </div>

            {/* Filters */}
            <div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors h-4 w-4" />
                  <Input
                    placeholder="Search notifications..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-12 w-full h-9 border border-orange-200 bg-white rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all shadow-sm"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-[160px] h-9 rounded-xl bg-white border-0 text-gray-700 focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all shadow-md font-medium">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-orange-100 shadow-xl bg-white">
                    <SelectItem value="all" className="focus:bg-[var(--brand-primary)] focus:text-white cursor-pointer rounded-lg">All Types</SelectItem>
                    <SelectItem value="orders" className="focus:bg-[var(--brand-primary)] focus:text-white cursor-pointer rounded-lg">Orders</SelectItem>
                    <SelectItem value="returns" className="focus:bg-[var(--brand-primary)] focus:text-white cursor-pointer rounded-lg">Returns</SelectItem>
                    <SelectItem value="reviews" className="focus:bg-[var(--brand-primary)] focus:text-white cursor-pointer rounded-lg">Reviews</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] h-9 rounded-xl bg-white border-0 text-gray-700 focus:ring-2 focus:ring-orange-100 focus:border-orange-300 transition-all shadow-md font-medium">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-orange-100 shadow-xl bg-white">
                    <SelectItem value="all" className="focus:bg-[var(--brand-primary)] focus:text-white cursor-pointer rounded-lg">All</SelectItem>
                    <SelectItem value="unread" className="focus:bg-[var(--brand-primary)] focus:text-white cursor-pointer rounded-lg">Unread</SelectItem>
                    <SelectItem value="read" className="focus:bg-[var(--brand-primary)] focus:text-white cursor-pointer rounded-lg">Read</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button
                    className="h-9 px-4 rounded-xl border-0 bg-white text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all gap-2 font-bold shadow-md group whitespace-nowrap"
                    onClick={fetchNotifications}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                  <Button
                    className="h-9 px-4 rounded-xl border-0 bg-white text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white transition-all gap-2 font-bold shadow-md group whitespace-nowrap"
                    onClick={handleMarkAllAsRead}
                    disabled={unreadCount === 0}
                  >
                    <Check className="w-4 h-4" />
                    Mark All Read
                  </Button>
                </div>
              </div>
            </div>

            <div>
              {/* Summary */}
              {notifications.length > 0 && (
                <div className="mb-1 text-left text-sm text-gray-500 ml-1">
                  Showing {filteredNotifications.length} of {notifications.length}{" "}
                  notifications
                </div>
              )}

              {/* Notifications List */}
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors group ${!notification.is_read ? "bg-orange-50/50" : ""
                          }`}
                      >
                        <div className="flex items-start gap-4">

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4
                                  className={`text-sm transition-colors group-hover:text-[var(--brand-primary)] ${!notification.is_read
                                    ? "text-[var(--text-accent)] font-bold"
                                    : "text-gray-700 font-medium"
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
            </div>


          </div>
        </div>
      </div>
    </div>
  );
}

export default SellerNotifications;