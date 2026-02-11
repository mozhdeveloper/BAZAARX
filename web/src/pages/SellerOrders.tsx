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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
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
import { sellerLinks } from "@/config/sellerLinks";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";

const Logo = () => (
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
      className="font-semibold text-gray-900 whitespace-pre"
    >
      BazaarPH Seller
    </motion.span>
  </Link>
);

const LogoIcon = () => (
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

export function SellerOrders() {
  const [open, setOpen] = useState(false);
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

  // Fetch orders when component mounts or seller changes
  useEffect(() => {
    if (seller?.id) {
      fetchOrders(seller.id);
    }
  }, [seller?.id, fetchOrders]);

  const targetOrder = orders.find(
    (o) =>
      o.orderNumber === selectedOrderNumber ||
      o.id === selectedOrderNumber
  );

  // Show denied if we have an ID in URL, loading is done, but order wasn't found in seller's list
  const showAccessDenied = !!selectedOrderNumber && !targetOrder && !loading;

  const handleLogout = () => {
    logout();
    navigate("/seller/auth");
  };

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
                label: seller?.name || "Seller",
                href: "/seller/profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.name?.charAt(0) || "S"}
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-2 md:p-8 bg-gray-50 flex-1 w-full h-full overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Orders - Orange */}
              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Total Orders
                      </p>
                      <p className="text-3xl font-bold text-gray-900">
                        {orderStats.total}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <ShoppingBag className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Pending - Yellow */}
              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Pending
                      </p>
                      <p className="text-3xl font-bold text-yellow-600">
                        {orderStats.pending}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                      <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Delivered - Green */}
              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        Delivered
                      </p>
                      <p className="text-3xl font-bold text-green-600">
                        {orderStats.delivered}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* POS Sales Today - Purple */}
              <Card className="border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">
                        POS Sales Today
                      </p>
                      <p className="text-3xl font-bold text-purple-600">
                        {orderStats.posToday}
                      </p>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Advanced Filtering Toolbar - Now a Card */}
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4 items-center">
                  {/* Search Input */}
                  <div className="flex-1 w-full lg:w-auto">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        type="text"
                        placeholder="Search by Order ID, Customer name, or Email..."
                        value={searchQuery}
                        onChange={(e) =>
                          setSearchQuery(e.target.value)
                        }
                        className="pl-10 w-full border-gray-300 focus-visible:ring-orange-500"
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
                    className="w-full lg:w-auto"
                  >
                    <TabsList className="grid w-full lg:w-auto grid-cols-3 bg-gray-100">
                      <TabsTrigger
                        value="all"
                        className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                      >
                        All Channels
                      </TabsTrigger>
                      <TabsTrigger
                        value="online"
                        className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                      >
                        <Globe className="h-4 w-4 mr-1" />
                        Online App
                      </TabsTrigger>
                      <TabsTrigger
                        value="pos"
                        className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
                      >
                        <StoreIcon className="h-4 w-4 mr-1" />
                        POS / Offline
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {/* Status Filter Select */}
                  <div className="w-full lg:w-auto flex gap-2">
                    <Select
                      value={filterStatus}
                      onValueChange={setFilterStatus}
                    >
                      <SelectTrigger className="w-full lg:w-[180px] border-gray-300">
                        <SelectValue placeholder="Filter Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">
                          All Status
                        </SelectItem>
                        <SelectItem value="pending">
                          Pending
                        </SelectItem>
                        <SelectItem value="confirmed">
                          Confirmed
                        </SelectItem>
                        <SelectItem value="shipped">
                          Shipped
                        </SelectItem>
                        <SelectItem value="delivered">
                          Delivered
                        </SelectItem>
                        <SelectItem value="cancelled">
                          Cancelled
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Export Button */}
                    <Button
                      variant="outline"
                      className="w-full lg:w-auto border-gray-300 hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card className="border border-gray-200 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 hover:bg-gray-50">
                    <TableHead className="font-semibold text-gray-700">
                      Order ID & Date
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Customer
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Channel
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700">
                      Payment
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">
                      Total
                    </TableHead>
                    <TableHead className="font-semibold text-gray-700 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() =>
                        setSelectedOrder(
                          selectedOrderNumber === (order.orderNumber || order.id)
                            ? null
                            : order.orderNumber || order.id
                        )
                      }
                    >
                      {/* Order ID & Source */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {order.type === "ONLINE" ? (
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <Globe className="h-4 w-4 text-blue-600" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                              <StoreIcon className="h-4 w-4 text-purple-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">
                              #{order.orderNumber || order.id.slice(0, 8)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(
                                order.orderDate,
                              ).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
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
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-medium",
                            order.status ===
                            "pending" &&
                            "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
                            order.status ===
                            "confirmed" &&
                            "bg-blue-100 text-blue-700 hover:bg-blue-100",
                            order.status ===
                            "shipped" &&
                            "bg-purple-100 text-purple-700 hover:bg-purple-100",
                            order.status ===
                            "delivered" &&
                            "bg-green-100 text-green-700 hover:bg-green-100",
                            order.status ===
                            "cancelled" &&
                            "bg-red-100 text-red-700 hover:bg-red-100",
                          )}
                        >
                          {order.status
                            .charAt(0)
                            .toUpperCase() +
                            order.status.slice(1)}
                        </Badge>
                      </TableCell>

                      {/* Payment Status */}
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "font-medium",
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
                  ))}
                </TableBody>
              </Table>

              {/* Empty State */}
              {filteredOrders.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No orders found
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {searchQuery || filterStatus !== "all"
                      ? "Try adjusting your search or filters"
                      : "When you receive orders, they will appear here"}
                  </p>
                </div>
              )}
            </Card>

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
