import { useState, useEffect, useMemo } from "react";
import {
  LogOut,
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

// Stores & Services
import {
  useAuthStore,
  useOrderStore,
  useProductStore,
} from "@/stores/sellerStore";
import { orderExportService } from "../services/orders/orderExportService";

// UI Components
import { OrderDetailsModal } from "@/components/OrderDetailsModal";
import { OrderDateFilter } from "../components/orders/OrderDateFilter";
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
                label: seller?.storeName || seller?.ownerName || "Seller",
                href: "/seller/profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {(seller?.storeName || "S").charAt(0)}
                    </span>
                  </div>
                ),
              }}
            />
            <button
              onClick={async () => {
                const hasBuyerAccount = await useAuthStore.getState().createBuyerAccount();
                if (hasBuyerAccount) navigate('/profile');
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
      <DashboardContent />
    </div>
  );
}

const DashboardContent = () => {
  const { seller } = useAuthStore();
  const { orders, fetchOrders, loading: ordersLoading } = useOrderStore();
  const { products, fetchProducts } = useProductStore();
  
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [currentRangeLabel, setCurrentRangeLabel] = useState("All Time");

  // 1. Initial Fetch and Date-range logic
  useEffect(() => {
    if (seller?.id) {
      fetchProducts({ sellerId: seller.id });
      fetchOrders(seller.id, null, null);
    }
  }, [seller?.id]);

  const productsWithActualSales = useMemo(() => {
    // Create a map of product IDs to their total quantities sold in delivered orders
    const salesMap: Record<string, number> = {};
    
    orders.forEach(order => {
      // Only count sales for delivered or confirmed orders
      if (order.status === 'delivered' || order.status === 'confirmed') {
        order.items.forEach(item => {
          salesMap[item.productId] = (salesMap[item.productId] || 0) + item.quantity;
        });
      }
    });

    // Merge the calculated sales back into the products list
    return products.map(product => ({
      ...product,
      calculatedSales: salesMap[product.id] || 0
    }));
  }, [orders, products]);
  
  const handleRangeChange = (range: { start: Date | null; end: Date | null; label: string }) => {
    if (seller?.id) {
      setCurrentRangeLabel(range.label);
      fetchOrders(seller.id, range.start, range.end);
    }
  };

  // 2. Real-time Calculations from Database Data
  const metrics = useMemo(() => {
    const totalRevenue = orders
      .filter(o => o.status === 'delivered')
      .reduce((acc, o) => acc + (o.total || 0), 0);
    
    const avgOrder = orders.length > 0 ? totalRevenue / orders.length : 0;

    return [
      {
        title: 'Total Revenue',
        value: `₱${totalRevenue.toLocaleString()}`,
        change: "Actual",
        trend: 'up',
        icon: <DollarSign className="h-5 w-5" />
      },
      {
        title: 'Total Orders',
        value: orders.length.toLocaleString(),
        change: `${orders.filter(o => o.status === 'pending').length} pending`,
        trend: 'up',
        icon: <ShoppingCart className="h-5 w-5" />
      },
      {
        title: 'Avg Order Value',
        value: `₱${Math.round(avgOrder).toLocaleString()}`,
        change: "Live",
        trend: 'up',
        icon: <TrendingUp className="h-5 w-5" />
      },
      {
        title: 'Active Products',
        value: products.length.toString(),
        change: `${products.filter(p => p.stock < 10).length} low stock`,
        trend: 'up',
        icon: <Package className="h-5 w-5" />
      }
    ];
  }, [orders, products]);

  // Transform order history into chart data
  const revenueData = useMemo(() => {
    const dailyMap: Record<string, number> = {};
    orders.forEach(order => {
      const date = new Date(order.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dailyMap[date] = (dailyMap[date] || 0) + (order.status === 'delivered' ? order.total : 0);
    });
    return Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }));
  }, [orders]);

  // Compute category distribution for the Pie Chart
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    const colors = ['#94370cff', '#b74815ff', '#d65418ff', '#e76123ff', '#db6d3aff'];
    return Object.entries(counts)
      .map(([name, count], i) => ({
        name,
        value: Math.round((count / products.length) * 100),
        color: colors[i % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [products]);

  const handleExport = () => {
    orderExportService.exportToCSV(orders, seller?.storeName || "Store", currentRangeLabel, 'summary');
  };

  const recentOrders = orders.slice(0, 5);
  
  const topProducts = useMemo(() => {
    return [...productsWithActualSales]
      .sort((a, b) => b.calculatedSales - a.calculatedSales)
      .slice(0, 5);
  }, [productsWithActualSales]);
  
  return (
    <div className="flex flex-1 w-full h-full overflow-auto p-4 md:p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hello, {seller?.storeName || "Seller"}!</h1>
            <p className="text-sm text-gray-500">Insights for <span className="font-semibold text-orange-600">{currentRangeLabel}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <OrderDateFilter onRangeChange={handleRangeChange} />
            <button 
              onClick={handleExport}
              className="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-100 shadow-sm rounded-xl hover:bg-[#ff6a00] transition-colors"
            >
              <Download className="h-4 w-4 text-gray-600 group-hover:text-white transition-colors" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-white transition-colors">Export</span>
            </button>
          </div>
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
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">{metric.icon}</div>
                <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                  <TrendingUp className="h-4 w-4" />
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
          <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Revenue Overview</h3>
            <div className="h-[300px] w-full">
              {ordersLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400 italic">Loading trends...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} stroke="#9ca3af" />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} stroke="#9ca3af" tickFormatter={(v) => `₱${v/1000}k`} />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Top Categories</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
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
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="text-sm text-gray-600">{category.name}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{category.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Top Performance</h3>
            <div className="grid grid-cols-2 gap-2">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={cn(
                    "relative group overflow-hidden rounded-2xl flex flex-col justify-between p-3 border transition-all",
                    index === 0 ? "col-span-2 row-span-2 bg-orange-50/50 border-orange-100 p-5" : "bg-white border-gray-100"
                  )}
                >
                  {index === 0 && <Flame className="absolute top-3 right-3 h-6 w-6 text-[#ff6a00] fill-current" />}
                  <div className="flex-1 flex items-center justify-center">
                    <img 
                       src={product.images[0] || "https://placehold.co/200"} 
                       alt={product.name} 
                       className={index === 0 ? "h-32 object-contain" : "h-14 object-contain"} 
                    />
                  </div>
                  <div className="text-center mt-2">
                    <p className="text-sm font-bold truncate">{product.name}</p>
                    {/* Display the calculated sales instead of the static product.sales property */}
                    <p className="text-xs text-orange-600 font-medium">{product.calculatedSales} Sales</p>
                  </div>
                </div>
              ))}
              
              {topProducts.length === 0 && (
                <div className="col-span-2 py-10 text-center text-gray-400 italic">
                  No sales data available for this period.
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Recent Transactions</h3>
              <Link to="/seller/orders" className="text-sm font-medium text-orange-600 hover:underline">View All</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-3 text-sm font-medium text-gray-500">Order ID</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Customer</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Total</th>
                    <th className="pb-3 text-sm font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order.id)}>
                      <td className="py-4 text-sm font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-4 text-sm text-gray-700">{order.buyerName}</td>
                      <td className="py-4 text-sm text-gray-500">{new Date(order.orderDate).toLocaleDateString()}</td>
                      <td className="py-4 text-sm font-bold">₱{order.total.toLocaleString()}</td>
                      <td className="py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase",
                          order.status === 'delivered' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                        )}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <OrderDetailsModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={orders.find((o) => o.id === selectedOrder) || null}
      />
    </div>
  );
};

const Logo = () => (
  <Link to="/seller" className="flex items-center space-x-2 py-1">
    <img src="/BazaarX.png" alt="BazaarX Logo" className="h-8 w-8" />
    <motion.span className="font-bold text-gray-800">BazaarPH Seller</motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link to="/seller" className="flex items-center py-1">
    <img src="/BazaarX.png" alt="Logo" className="h-8 w-8" />
  </Link>
);