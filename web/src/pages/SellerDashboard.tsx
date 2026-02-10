
import { useState } from "react";
import {
  LogOut,
  Search,
  Filter,
  MoreHorizontal,
  Star,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Eye,
  Download,
  ShoppingCart,
  Package,
  Flame
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {

  useAuthStore,
  useOrderStore,
  useProductStore,
} from "@/stores/sellerStore";
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { sellerLinks } from "@/config/sellerLinks";

export function SellerDashboard() {
  const { seller, logout } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/seller/auth");
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
              onClick={async () => {
                // First, check if the seller has a buyer account
                // If not, create one
                const hasBuyerAccount = await useAuthStore.getState().createBuyerAccount();
                if (hasBuyerAccount) {
                  // Navigate to buyer profile
                  navigate('/profile');
                } else {
                  console.error('Failed to create buyer account');
                  // You might want to show an error message to the user
                }
              }}
              className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
            >
              <Users className="h-5 w-5 flex-shrink-0" />
              {open && <span>Switch to Buyer Mode</span>}
            </button>
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
      <Dashboard />
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
        src="/BazaarX.png"
        alt="BazaarX Logo"
        className="h-8 w-8 object-contain flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-gray-800 dark:text-white whitespace-pre"
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
        src="/BazaarX.png"
        alt="BazaarX Logo"
        className="h-8 w-8 object-contain flex-shrink-0"
      />
    </Link>
  );
};

const Dashboard = () => {

  const { seller } = useAuthStore();
  const { orders } = useOrderStore();
  const { products } = useProductStore();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  // Analytics Data
  const revenueData = [
    { date: 'Jan', revenue: 45000, orders: 120 },
    { date: 'Feb', revenue: 52000, orders: 145 },
    { date: 'Mar', revenue: 48000, orders: 132 },
    { date: 'Apr', revenue: 61000, orders: 178 },
    { date: 'May', revenue: 55000, orders: 156 },
    { date: 'Jun', revenue: 67000, orders: 195 },
    { date: 'Jul', revenue: 72000, orders: 210 }
  ];

  const categoryData = [
    { name: 'Electronics', value: 35, color: '#94370cff' },
    { name: 'Fashion', value: 25, color: '#b74815ff' },
    { name: 'Home & Living', value: 20, color: '#d65418ff' },
    { name: 'Beauty', value: 15, color: '#e76123ff' },
    { name: 'Others', value: 5, color: '#db6d3aff' }
  ];

  const metrics = [
    {
      title: 'Total Revenue',
      value: '₱842,560',
      change: '+15.3%',
      trend: 'up',
      icon: <DollarSign className="h-5 w-5" />
    },
    {
      title: 'Total Orders',
      value: '1,245',
      change: '+10.8%',
      trend: 'up',
      icon: <ShoppingCart className="h-5 w-5" />
    },
    {
      title: 'Avg Order Value',
      value: '₱677',
      change: '+4.5%',
      trend: 'up',
      icon: <TrendingUp className="h-5 w-5" />
    },
    {
      title: 'Store Views',
      value: '12,456',
      change: '-2.3%',
      trend: 'down',
      icon: <Eye className="h-5 w-5" />
    }
  ];

  // Refresh stats when component mounts or when orders/products change
  // useEffect(() => {
  //   refreshStats();
  // }, [orders, products, refreshStats]);

  const recentOrders = orders.slice(0, 5);
  const topProducts = products.slice(0, 5);



  return (
    <div className="flex flex-1 w-full">
      <div className="p-2 md:p-8 bg-gray-50 flex-1 w-full h-full overflow-auto">
        <div className="max-w-7xl mx-auto flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Hello, {seller?.name || "Seller"}!
              </h1>
              <p className="text-gray-400 mt-1">
                View and manage your business insights.
              </p>
            </div>
            <div className="flex items-center gap-3">
            </div>
          </div>




          {/* Analytics Section */}
          <div className="flex flex-col gap-6">
            {/* Metrics & Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Time Range Selector */}
              <div className="flex items-center gap-2 bg-gray-100 shadow-sm rounded-xl p-1 w-fit">
                {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={cn(
                      "px-2 py-1 text-xs sm:text-sm rounded-xl transition-colors font-medium",
                      timeRange === range
                        ? "bg-white text-[#ff6a00] shadow-md"
                        : "text-gray-600"
                    )}
                  >
                    {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                  </button>
                ))}
              </div>

              <button className="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 shadow-sm rounded-xl hover:bg-[#ff6a00] transition-colors w-fit">
                <Download className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-white transition-colors">Export</span>
              </button>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {metrics.map((metric, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl p-5 shadow-md"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn(
                      "p-2 rounded-lg",
                    )}>
                      <div className={metric.trend === 'up' ? "text-green-600" : "text-red-600"}>
                        {metric.icon}
                      </div>
                    </div>
                    <div className={cn(
                      "flex items-center gap-1 text-sm font-medium",
                      metric.trend === 'up' ? "text-green-600" : "text-red-600"
                    )}>
                      {metric.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      {metric.change}
                    </div>
                  </div>
                  <h3 className="text-gray-500 text-sm font-medium">{metric.title}</h3>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">Revenue Overview</h3>
                    <p className="text-sm text-gray-400 mt-1 mb-6">Monitor your revenue and order trends</p>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `₱${value / 1000}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#f97316"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Category Distribution */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl p-6 shadow-md"
              >
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Top Categories</h3>
                  <p className="text-sm text-gray-400 mt-1">Your sales distribution by category</p>
                </div>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        cornerRadius={5}
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-6 space-y-3">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-sm text-gray-600">{category.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{category.value}%</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Best Selling Products */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className=""
            >
              <div className="mb-2">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Top Products
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 h-[500px]">
                {topProducts.map((product, index) => (
                  <div
                    key={product.id}
                    className={cn(
                      "relative group overflow-hidden rounded-2xl flex flex-col justify-between p-3 transition-all duration-300 border",
                      index === 0
                        ? "row-span-2 bg-gradient-to-br from-[#fff7ed] to-white border-orange-100 p-5 shadow-sm"
                        : "col-span-1 bg-white border-gray-100 shadow-sm hover:border-orange-100"
                    )}
                  >
                    {/* Fire Icon for Top Product */}
                    {index === 0 && (
                      <div className="absolute top-3 right-3 p-1.5 rounded-full bg-white/50 shadow-sm z-10">
                        <Flame className="h-6 w-6 text-[#ff6a00] fill" />
                      </div>
                    )}

                    <div className="flex-1 flex items-center justify-center py-1">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className={cn(
                          "object-contain transition-transform duration-500 group-hover:scale-105",
                          index === 0 ? "h-32 w-32 sm:h-40 sm:w-40" : "h-14 w-14 sm:h-16 sm:w-16"
                        )}
                      />
                    </div>

                    <div className="text-center mt-2 z-10 w-full px-1">
                      <h4
                        title={product.name}
                        className={cn(
                          "font-medium text-gray-900 line-clamp-2 leading-tight",
                          index === 0 ? "text-lg" : "text-sm"
                        )}>
                        {product.name}
                      </h4>
                      <p className={cn(
                        "text-[#ff6a00] font-medium",
                        index === 0 ? "text-sm mt-1" : "text-xs mt-0.5"
                      )}>
                        {product.sales} Sales
                      </p>
                    </div>
                  </div>
                ))}

                {/* Fallback empty slots if fewer than 5 products to maintain structure */}
                {Array.from({ length: Math.max(0, 5 - topProducts.length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center p-4">
                    <span className="text-gray-300 text-sm">Add Product</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Recent Orders */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-md p-6 lg:col-span-2"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Recent Orders
                  </h3>
                  <p className="text-sm text-gray-400">Latest transactions sales in real time</p>
                </div>
                <Link
                  to="/seller/orders"
                  className="flex items-center gap-2 px-3 py-2 transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-500 group-hover:text-[#ff6a00]">View All</span>
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-2 px-4 text-left text-sm font-medium text-gray-500">Order ID</th>
                      <th className="py-2 px-4 text-left text-sm font-medium text-gray-500">Product Name</th>
                      <th className="py-2 px-4 text-left text-sm font-medium text-gray-500">Order Date</th>
                      <th className="py-2 px-4 text-left text-sm font-medium text-gray-500">Price</th>
                      <th className="py-2 px-4 text-left text-sm font-medium text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const firstItem = order.items[0] || { productName: 'Unknown', image: '/placeholder.png' };
                      return (
                        <tr
                          key={order.id}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedOrder(order.id)}
                        >
                          <td className="py-4 px-4 text-sm font-medium text-gray-900">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={firstItem.image}
                                alt={firstItem.productName}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                              />
                              <span className="text-sm font-medium text-gray-900">{firstItem.productName}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">
                            {new Date(order.orderDate).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-4 px-4 text-sm font-medium text-gray-900">
                            ₱{Math.round(order.total).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 w-fit",
                              order.status === 'delivered' || order.status === 'confirmed' // Assuming confirmed is good/green for this mapping, or make distinct
                                ? "bg-green-50 text-green-600"
                                : order.status === 'cancelled'
                                  ? "bg-red-50 text-red-600"
                                  : "bg-orange-50 text-[#ff6a00]" // Pending, Shipped, etc.
                            )}>
                              <span className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                order.status === 'delivered' || order.status === 'confirmed'
                                  ? "bg-green-600"
                                  : order.status === 'cancelled'
                                    ? "bg-red-600"
                                    : "bg-[#ff6a00]"
                              )} />
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Order Details Modal */}
        <OrderDetailsModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={orders.find((o) => o.id === selectedOrder) || null}
        />
      </div>
    </div>
  );
};
