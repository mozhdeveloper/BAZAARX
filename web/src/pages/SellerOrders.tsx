import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  Download,
  TrendingUp,
  ShoppingCart,
  Settings,
  LayoutDashboard,
  Star,
  Store,
  Wallet
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { useAuthStore, useOrderStore } from '@/stores/sellerStore';
import { Button } from '@/components/ui/button';

const sellerLinks = [
  {
    label: "Dashboard",
    href: "/seller",
    icon: <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Store Profile",
    href: "/seller/store-profile",
    icon: <Store className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Products", 
    href: "/seller/products",
    icon: <Package className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Orders",
    href: "/seller/orders",
    icon: <ShoppingCart className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Earnings",
    href: "/seller/earnings",
    icon: <Wallet className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Reviews",
    href: "/seller/reviews",
    icon: <Star className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Analytics",
    href: "/seller/analytics",
    icon: <TrendingUp className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  },
  {
    label: "Settings",
    href: "/seller/settings",
    icon: <Settings className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
  }
];

const Logo = () => (
  <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
    <img 
      src="/Logo.png" 
      alt="BazaarPH Logo" 
      className="h-8 w-8 object-contain flex-shrink-0"
    />
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-gray-900 whitespace-pre">
      BazaarPH Seller
    </motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
    <img 
      src="/Logo.png" 
      alt="BazaarPH Logo" 
      className="h-8 w-8 object-contain flex-shrink-0"
    />
  </Link>
);

const statusConfig = {
  pending: { 
    color: 'bg-yellow-100 text-yellow-700', 
    icon: Clock, 
    label: 'Pending' 
  },
  confirmed: { 
    color: 'bg-blue-100 text-blue-700', 
    icon: CheckCircle, 
    label: 'Confirmed' 
  },
  shipped: { 
    color: 'bg-purple-100 text-purple-700', 
    icon: Truck, 
    label: 'Shipped' 
  },
  delivered: { 
    color: 'bg-green-100 text-green-700', 
    icon: CheckCircle, 
    label: 'Delivered' 
  },
  cancelled: { 
    color: 'bg-red-100 text-red-700', 
    icon: XCircle, 
    label: 'Cancelled' 
  }
};

const paymentStatusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
  paid: { color: 'bg-green-100 text-green-700', label: 'Paid' },
  refunded: { color: 'bg-red-100 text-red-700', label: 'Refunded' }
};

export function SellerOrders() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  
  const { seller } = useAuthStore();
  const { orders, updateOrderStatus, addTrackingNumber } = useOrderStore();

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const handleStatusUpdate = (orderId: string, newStatus: any) => {
    updateOrderStatus(orderId, newStatus);
    
    // If shipped, add a tracking number
    if (newStatus === 'shipped') {
      const trackingNumber = `TRK${Date.now().toString().slice(-8)}`;
      addTrackingNumber(orderId, trackingNumber);
    }
  };

  const orderStats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length
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
          <div>
            <SidebarLink
              link={{
                label: seller?.name || "Seller",
                href: "/seller/profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.name?.charAt(0) || 'S'}
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
              <p className="text-gray-600 mt-1">Manage your customer orders</p>
            </div>
            <Button variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Orders
            </Button>
          </div>

          {/* Order Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-gray-900">{orderStats.total}</div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-yellow-700">{orderStats.pending}</div>
              <div className="text-sm text-yellow-600">Pending</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-blue-700">{orderStats.confirmed}</div>
              <div className="text-sm text-blue-600">Confirmed</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-purple-700">{orderStats.shipped}</div>
              <div className="text-sm text-purple-600">Shipped</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-semibold text-green-700">{orderStats.delivered}</div>
              <div className="text-sm text-green-600">Delivered</div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="px-6 py-4 bg-white border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search orders by ID, customer name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const StatusIcon = statusConfig[order.status].icon;
              const isExpanded = selectedOrder === order.id;
              
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* Order Header */}
                  <div 
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setSelectedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{order.buyerName}</h3>
                          <p className="text-sm text-gray-600">Order #{order.id}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.orderDate).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">₱{order.total.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">{order.items.length} item{order.items.length > 1 ? 's' : ''}</p>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                            statusConfig[order.status].color
                          )}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[order.status].label}
                          </span>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium",
                            paymentStatusConfig[order.paymentStatus].color
                          )}>
                            {paymentStatusConfig[order.paymentStatus].label}
                          </span>
                        </div>

                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(order.id, 'cancelled');
                              }}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              Reject
                            </Button>
                            <Button 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusUpdate(order.id, 'confirmed');
                              }}
                              className="bg-orange-500 hover:bg-orange-600 text-white"
                            >
                              Confirm
                            </Button>
                          </div>
                        )}

                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusUpdate(order.id, 'shipped');
                            }}
                            className="bg-purple-500 hover:bg-purple-600 text-white"
                          >
                            Ship Order
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Order Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-gray-200 p-6 bg-gray-50"
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Customer Info */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4">Customer Information</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Name:</span>
                              <span className="text-gray-900">{order.buyerName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Email:</span>
                              <span className="text-gray-900">{order.buyerEmail}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">Phone:</span>
                              <span className="text-gray-900">{order.shippingAddress.phone}</span>
                            </div>
                          </div>

                          <h4 className="font-medium text-gray-900 mb-4 mt-6">Shipping Address</h4>
                          <div className="text-sm text-gray-600">
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                              <div>
                                <p>{order.shippingAddress.fullName}</p>
                                <p>{order.shippingAddress.street}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.province}</p>
                                <p>{order.shippingAddress.postalCode}</p>
                              </div>
                            </div>
                          </div>

                          {order.trackingNumber && (
                            <div className="mt-6">
                              <h4 className="font-medium text-gray-900 mb-2">Tracking Number</h4>
                              <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <code className="text-sm text-gray-900">{order.trackingNumber}</code>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Order Items */}
                        <div>
                          <h4 className="font-medium text-gray-900 mb-4">Order Items</h4>
                          <div className="space-y-3">
                            {order.items.map((item, index) => (
                              <div key={index} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3">
                                <img
                                  src={item.image}
                                  alt={item.productName}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                                <div className="flex-1">
                                  <h5 className="font-medium text-gray-900 text-sm">{item.productName}</h5>
                                  <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                                </div>
                                <p className="font-medium text-gray-900 text-sm">₱{item.price.toLocaleString()}</p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-900">Total</span>
                              <span className="font-semibold text-lg text-gray-900">₱{order.total.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
              <p className="text-gray-600">
                {searchQuery || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Orders will appear here when customers make purchases'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}