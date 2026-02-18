import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  LogOut,
  Globe,
  Store as StoreIcon,
  ShoppingBag,
  MoreVertical,
  Eye,
  Printer,
  CreditCard,
  AlertCircle,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { useAuthStore, useOrderStore } from "@/stores/sellerStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { OrderDateFilter } from "@/components/orders/OrderDateFilter";
import { orderExportService } from "@/services/orders/orderExportService";



export function SellerOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [channelFilter, setChannelFilter] = useState<"all" | "online" | "pos">("all");
  const [searchParams, setSearchParams] = useSearchParams();

  const getOrderNumberFromParams = (params: URLSearchParams) => {
    for (const key of params.keys()) {
      if (
        key.startsWith("ORD-") ||
        key.startsWith("POS-") ||
        /^[0-9a-f-]{36}$/i.test(key)
      ) {
        return key;
      }
    }
    return null;
  };

  const selectedOrderNumber = getOrderNumberFromParams(searchParams);

  const setSelectedOrder = (orderNumber: string | null) => {
    setSearchParams((prev) => {
      // Remove any existing order number keys
      const current = getOrderNumberFromParams(prev);
      if (current) {
        prev.delete(current);
      }

      // Add new order number as a key (results in ?ORD-XXXX=)
      if (orderNumber) {
        prev.set(orderNumber, "");
      }
      return prev;
    });
  };

  const [trackingModal, setTrackingModal] = useState<{
    isOpen: boolean;
    orderId: string | null;
    trackingNumber: string;
    isLoading: boolean;
  }>({
    isOpen: false,
    orderId: null,
    trackingNumber: "",
    isLoading: false,
  });

  const { seller, logout } = useAuthStore();
  const {
    orders,
    loading,
    fetchOrders,
    updateOrderStatus,
    markOrderAsShipped,
    markOrderAsDelivered,
  } = useOrderStore();
  const navigate = useNavigate();

  const [dateLabel, setDateLabel] = useState("All Time");

  // Inside SellerOrders component
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });

  // Update the useEffect to include dateRange in dependencies
  useEffect(() => {
    if (seller?.id) {
      // Your store's fetchOrders needs to be updated to accept these (see step 2)
      fetchOrders(seller.id, dateRange.start, dateRange.end);
    }
  }, [seller?.id, fetchOrders, dateRange.start, dateRange.end]);

  const targetOrder = orders.find(
    (o) =>
      o.orderNumber === selectedOrderNumber ||
      o.id === selectedOrderNumber
  );

  // Show denied if we have an ID in URL, loading is done, but order wasn't found in seller's list
  const showAccessDenied = !!selectedOrderNumber && !targetOrder && !loading;



  const handleMarkAsShipped = async () => {
    if (!trackingModal.orderId || !trackingModal.trackingNumber.trim()) {
      alert("Please enter a tracking number");
      return;
    }

    setTrackingModal((prev) => ({ ...prev, isLoading: true }));

    try {
      await markOrderAsShipped(
        trackingModal.orderId,
        trackingModal.trackingNumber,
      );

      setTrackingModal({
        isOpen: false,
        orderId: null,
        trackingNumber: "",
        isLoading: false,
      });
      alert("✅ Order marked as shipped! Buyer notification sent.");
    } catch (error) {
      console.error("Error marking order as shipped:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setTrackingModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleMarkAsDelivered = async (orderId: string) => {
    if (!window.confirm("Mark this order as delivered?")) {
      return;
    }

    try {
      await markOrderAsDelivered(orderId);
      alert("✅ Order marked as delivered! Payout will be processed.");
    } catch (error) {
      console.error("Error marking order as delivered:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" || order.status === filterStatus;

    const matchesChannel =
      channelFilter === "all" ||
      (channelFilter === "online" && order.type === "ONLINE") ||
      (channelFilter === "pos" && order.type === "OFFLINE");

    return matchesSearch && matchesFilter && matchesChannel;
  });

  const handleStatusUpdate = async (
    orderId: string,
    newStatus: "confirmed" | "cancelled",
  ) => {
    try {
      await updateOrderStatus(orderId, newStatus);

      // Cross-store sync: Update buyer order status and send notification
      if (newStatus === "confirmed") {
        // Dynamically import cart store to avoid circular dependency
        import("../stores/cartStore")
          .then(({ useCartStore }) => {
            const cartStore = useCartStore.getState();
            cartStore.updateOrderStatus(orderId, "confirmed");
            cartStore.addNotification(
              orderId,
              "seller_confirmed",
              "Your order has been confirmed by the seller! Track your delivery now.",
            );
          })
          .catch((error) => {
            console.error("Failed to sync buyer notification:", error);
          });
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("Failed to update order status. Please try again.");
    }
  };

  const orderStats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    delivered: orders.filter((o) => o.status === "delivered").length,
    posToday: orders.filter((o) => {
      const isToday =
        new Date(o.orderDate).toDateString() ===
        new Date().toDateString();
      return o.type === "OFFLINE" && isToday;
    }).length,
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto scrollbar-hide relative">
          <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
            <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
          </div>
          <div className="max-w-7xl mx-auto space-y-8 relative z-10 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Orders
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  Manage all your customer orders from App and POS
                </p>
              </div>
            </div>

            {/* Modern Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Orders - Orange */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="bg-white rounded-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Total Orders</p>
                      <p className="text-3xl font-black text-[var(--text-headline)] font-heading">{orderStats.total}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-orange-50 text-[var(--brand-primary)] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <ShoppingBag className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Pending - Yellow */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <div className="bg-white rounded-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Pending</p>
                      <p className="text-3xl font-black text-[#F59E0B] font-heading">{orderStats.pending}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-yellow-50 text-[#F59E0B] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Clock className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Delivered - Green */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <div className="bg-white rounded-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">Delivered</p>
                      <p className="text-3xl font-black text-[#10B981] font-heading">{orderStats.delivered}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-green-50 text-[#10B981] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CheckCircle className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* POS Sales Today - Purple */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <div className="bg-white rounded-xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wide mb-1">POS Sales Today</p>
                      <p className="text-3xl font-black text-[#8B5CF6] font-heading">{orderStats.posToday}</p>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-purple-50 text-[#8B5CF6] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <CreditCard className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Advanced Filtering Toolbar - Now a Card */}
            <div>
              <div className="flex flex-col xl:flex-row gap-6 items-center">
                {/* Search Input */}
                <div className="flex-1 w-full xl:w-auto">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors h-5 w-5" />
                    <Input
                      type="text"
                      placeholder="Search by Order ID, Customer name, or Email..."
                      value={searchQuery}
                      onChange={(e) =>
                        setSearchQuery(e.target.value)
                      }
                      className="pl-12 w-full h-12 bg-gray-50 border-gray-100 rounded-xl focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all font-medium"
                    />
                  </div>
                </div>

                {/* Channel Filter Tabs */}
                <Tabs
                  value={channelFilter}
                  onValueChange={(value) =>
                    setChannelFilter(
                      value as "all" | "online" | "pos",
                    )
                  }
                  className="w-full xl:w-auto"
                >
                  <TabsList className="grid w-full xl:w-auto grid-cols-3 bg-gray-50 p-1.5 h-auto rounded-xl">
                    <TabsTrigger
                      value="all"
                      className="h-9 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[var(--brand-primary)] data-[state=active]:shadow-sm font-bold text-gray-500 transition-all"
                    >
                      All Channels
                    </TabsTrigger>
                    <TabsTrigger
                      value="online"
                      className="h-9 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[var(--brand-primary)] data-[state=active]:shadow-sm font-bold text-gray-500 transition-all gap-2"
                    >
                      <Globe className="h-4 w-4" />
                      Online App
                    </TabsTrigger>
                    <TabsTrigger
                      value="pos"
                      className="h-9 rounded-lg data-[state=active]:bg-white data-[state=active]:text-[var(--brand-primary)] data-[state=active]:shadow-sm font-bold text-gray-500 transition-all gap-2"
                    >
                      <StoreIcon className="h-4 w-4" />
                      POS / Offline
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Status Filter Select */}
                <div className="w-full xl:w-auto flex flex-wrap gap-3">
                  <Select
                    value={filterStatus}
                    onValueChange={setFilterStatus}
                  >
                    <SelectTrigger className="w-full sm:w-[180px] h-12 rounded-xl bg-gray-50 border-gray-100 focus:ring-2 focus:ring-[var(--brand-primary)]/20 font-medium">
                      <SelectValue placeholder="Filter Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <OrderDateFilter
                    onRangeChange={(range) => {
                      setDateRange({ start: range.start, end: range.end });
                      setDateLabel(range.label);
                    }}
                  />

                  {/* Export Button */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto h-12 px-6 rounded-xl border-gray-200 hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)] transition-all gap-2 font-bold shadow-sm">
                        <Download className="h-4 w-4" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl border-gray-100 shadow-xl p-2">
                      <div className="px-2 py-1.5 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                        Export Format
                      </div>
                      <DropdownMenuItem className="rounded-lg font-medium focus:bg-orange-50 focus:text-[var(--brand-primary)] cursor-pointer py-2.5" onClick={() => {
                        orderExportService.exportToCSV(
                          filteredOrders,
                          seller?.storeName || "Bazaar",
                          dateLabel,
                          'summary'
                        );
                      }}>
                        <Package className="h-4 w-4 mr-2" />
                        Summary (Order Rows)
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg font-medium focus:bg-orange-50 focus:text-[var(--brand-primary)] cursor-pointer py-2.5" onClick={() => {
                        orderExportService.exportToCSV(
                          filteredOrders,
                          seller?.storeName || "Bazaar",
                          dateLabel,
                          'detailed'
                        );
                      }}>
                        <ShoppingBag className="h-4 w-4 mr-2" />
                        Detailed (Product Rows)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] overflow-hidden border border-gray-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                    <TableHead className="py-5 pl-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Order ID & Date
                    </TableHead>
                    <TableHead className="py-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Customer
                    </TableHead>
                    <TableHead className="py-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Channel
                    </TableHead>
                    <TableHead className="py-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Status
                    </TableHead>
                    <TableHead className="py-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                      Payment
                    </TableHead>
                    <TableHead className="py-5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">
                      Total
                    </TableHead>
                    <TableHead className="py-5 pr-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                        No orders found matching your criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="group hover:bg-orange-50/30 transition-colors cursor-pointer border-b border-gray-50 last:border-0"
                        onClick={() =>
                          setSelectedOrder(
                            selectedOrderNumber === (order.orderNumber || order.id)
                              ? null
                              : order.orderNumber || order.id
                          )
                        }
                      >
                        {/* Order ID & Source */}
                        <TableCell className="py-4 pl-6">
                          <div className="flex items-center gap-3">
                            {order.type === "ONLINE" ? (
                              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Globe className="h-5 w-5" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                                <StoreIcon className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-[var(--text-headline)] font-mono text-sm group-hover:text-[var(--brand-primary)] transition-colors">
                                #{order.orderNumber || order.id.slice(0, 8)}
                              </p>
                              <p className="text-xs font-medium text-[var(--text-muted)] mt-0.5">
                                {new Date(order.orderDate).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Customer */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-orange-100 text-orange-600 text-xs font-medium">
                                {order.buyerName.charAt(
                                  0,
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900 text-sm">
                                {order.buyerName}
                              </p>
                              {order.type ===
                                "OFFLINE" && (
                                  <p className="text-xs text-purple-600 font-medium">
                                    Walk-in
                                  </p>
                                )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Channel Badge */}
                        <TableCell>
                          {order.type === "ONLINE" ? (
                            <Badge
                              variant="outline"
                              className="border-blue-300 text-blue-700 bg-blue-50 font-medium"
                            >
                              Online
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-purple-300 text-purple-700 bg-purple-50 font-medium"
                            >
                              POS
                            </Badge>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <OrderStatusBadge status={order.status} compact />
                            {order.reviewDate && (
                              <Badge
                                variant="outline"
                                className="border-yellow-300 text-yellow-700 bg-yellow-50"
                              >
                                <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                                {order.rating ? `${order.rating.toFixed(1)}/5` : "Reviewed"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Payment Method & Status */}
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium text-gray-900">
                              {order.paymentMethod === 'cash' && 'Cash'}
                              {order.paymentMethod === 'card' && 'Card'}
                              {order.paymentMethod === 'ewallet' && 'E-Wallet'}
                              {order.paymentMethod === 'bank_transfer' && 'Bank Transfer'}
                              {order.paymentMethod === 'cod' && 'COD'}
                              {order.paymentMethod === 'online' && 'Online'}
                              {!order.paymentMethod && (order.type === 'OFFLINE' ? 'Cash' : 'Online')}
                            </span>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "font-medium text-xs w-fit",
                                order.paymentStatus ===
                                "paid" &&
                                "bg-green-100 text-green-700 hover:bg-green-100",
                                order.paymentStatus ===
                                "pending" &&
                                "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
                                order.paymentStatus ===
                                "refunded" &&
                                "bg-red-100 text-red-700 hover:bg-red-100",
                              )}
                            >
                              {order.paymentStatus
                                .charAt(0)
                                .toUpperCase() +
                                order.paymentStatus.slice(
                                  1,
                                )}
                            </Badge>
                          </div>
                        </TableCell>

                        {/* Total */}
                        <TableCell className="text-right">
                          <p className="font-bold text-gray-900 text-base">
                            ₱{order.total.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.items.length} items
                          </p>
                        </TableCell>

                        {/* Actions Dropdown */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) =>
                                e.stopPropagation()
                              }
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48"
                            >
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // UPDATED: Pass orderNumber
                                  setSelectedOrder(order.orderNumber!);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) =>
                                  e.stopPropagation()
                                }
                              >
                                <Printer className="h-4 w-4 mr-2" />
                                Print Invoice
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {order.status ===
                                "pending" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(
                                        e,
                                      ) => {
                                        e.stopPropagation();
                                        void handleStatusUpdate(
                                          order.id,
                                          "confirmed",
                                        );
                                      }}
                                      className="text-green-600"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Confirm Order
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(
                                        e,
                                      ) => {
                                        e.stopPropagation();
                                        void handleStatusUpdate(
                                          order.id,
                                          "cancelled",
                                        );
                                      }}
                                      className="text-red-600"
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancel Order
                                    </DropdownMenuItem>
                                  </>
                                )}
                              {order.status ===
                                "confirmed" && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(
                                        e,
                                      ) => {
                                        e.stopPropagation();
                                        setTrackingModal(
                                          {
                                            isOpen: true,
                                            orderId:
                                              order.id,
                                            trackingNumber:
                                              "",
                                            isLoading: false,
                                          },
                                        );
                                      }}
                                      className="text-purple-600"
                                    >
                                      <Truck className="h-4 w-4 mr-2" />
                                      Mark as Shipped
                                    </DropdownMenuItem>
                                  </>
                                )}
                              {order.status ===
                                "shipped" && (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkAsDelivered(
                                        order.id,
                                      );
                                    }}
                                    className="text-green-600"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm Delivered
                                  </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Order Details Modal */}
            <OrderDetailsModal
              isOpen={!!selectedOrderNumber}
              onClose={() => setSelectedOrder(null)}
              order={
                orders.find(
                  (o) =>
                    o.orderNumber === selectedOrderNumber ||
                    o.id === selectedOrderNumber,
                ) || null
              }
            />

            {showAccessDenied && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] backdrop-blur-sm p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md mx-auto border border-red-100"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="h-16 w-16 rounded-full bg-red-50 flex items-center justify-center mb-2">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Access Denied</h3>
                      <p className="text-gray-500 mt-2 text-sm leading-relaxed">
                        You do not have permission to view this order, or the order ID
                        <span className="font-mono font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded mx-1">
                          {selectedOrderNumber}
                        </span>
                        does not exist.
                      </p>
                    </div>

                    <div className="w-full pt-4">
                      <Button
                        onClick={() => setSelectedOrder(null)}
                        className="w-full bg-gray-900 hover:bg-gray-800 text-white h-11 font-medium"
                      >
                        Go Back to Orders
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Tracking Number Modal */}
            {trackingModal.isOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[200]">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
                >
                  <h2 className="text-xl font-bold text-gray-900 mb-4">
                    Enter Tracking Number
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tracking Number
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g., TRK123456789"
                        value={trackingModal.trackingNumber}
                        onChange={(e) =>
                          setTrackingModal((prev) => ({
                            ...prev,
                            trackingNumber:
                              e.target.value,
                          }))
                        }
                        className="border-gray-300"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        This will be sent to the buyer for
                        tracking their package
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() =>
                          setTrackingModal({
                            isOpen: false,
                            orderId: null,
                            trackingNumber: "",
                            isLoading: false,
                          })
                        }
                        disabled={trackingModal.isLoading}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleMarkAsShipped}
                        disabled={trackingModal.isLoading}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                      >
                        {trackingModal.isLoading
                          ? "Processing..."
                          : "Mark as Shipped"}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

