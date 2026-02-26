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
  Flame,
  CalendarCheck,
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
import { SellerWorkspaceLayout } from "@/components/seller/SellerWorkspaceLayout";
import { isSellerApproved } from "@/utils/sellerAccess";

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
export function SellerDashboard() {

  return (
    <SellerWorkspaceLayout>
      <DashboardContent />
    </SellerWorkspaceLayout>
  );
}

const DashboardContent = () => {
  const { seller } = useAuthStore();
  const isApprovedSeller = isSellerApproved(seller);
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

    const today = new Date().toDateString();
    const ordersToday = orders.filter(o => new Date(o.orderDate).toDateString() === today).length;

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
        title: 'Orders Today',
        value: ordersToday.toLocaleString(),
        change: "Today",
        trend: ordersToday > 0 ? 'up' : 'neutral',
        icon: <CalendarCheck className="h-5 w-5" />
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
    <div className="flex flex-1 w-full h-full overflow-y-auto overflow-x-hidden p-4 md:p-8 relative scrollbar-hide">

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col gap-8 w-full relative z-10 pb-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold font-heading text-[var(--text-headline)] tracking-tight">
              Hello, {seller?.storeName || "Seller"}!
            </h1>
            <p className="text-sm text-[var(--text-muted)] mt-1 flex items-center gap-2">
              Here's your performance for <span className="px-0.5 py-0.5 rounded-md font-bold text-[var(--brand-primary)]">{currentRangeLabel}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrderDateFilter onRangeChange={handleRangeChange} />
            <button
              onClick={handleExport}
              className="group flex items-center gap-2 px-6 h-9 bg-white shadow-md rounded-xl text-[var(--brand-primary)] hover:bg-[var(--brand-primary)] hover:text-white hover:shadow-lg hover:shadow-orange-500/20 transition-all active:scale-95 font-bold text-sm"
            >
              <Download className="h-4 w-4 text-current transition-colors" />
              Export Report
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 -mb-2">
          {metrics.map((metric, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl p-6 shadow-md hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] relative overflow-hidden group transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="text-[var(--secondary-foreground)] group-hover:text-[var(--brand-primary)] transition-all">{metric.icon}</div>
              </div>
              <div>
                <h3 className="text-[var(--text-muted)] text-sm relative z-10">{metric.title}</h3>
                <div className="flex items-end gap-3 mt-1 relative z-10">
                  <p className="text-2xl font-black text-[var(--text-headline)] font-heading group-hover:text-[var(--brand-primary)] transition-all">{metric.value}</p>
                  <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600 mb-1.5">
                    <TrendingUp className="h-3 w-3" />
                    {metric.change}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Revenue Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl p-8 shadow-md relative overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-headline)] font-heading">Revenue Overview</h3>
                <p className="text-sm text-[var(--text-muted)]">Monitor your revenue trends</p>
              </div>
            </div>

            <div className="h-[320px] w-full" style={{ minHeight: 320 }}>
              {ordersLoading ? (
                <div className="h-full flex items-center justify-center text-gray-400 font-medium italic">Loading trends...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300} minWidth={0}>
                  <AreaChart data={revenueData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FB8C00" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#FB8C00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      stroke="#9ca3af"
                      dy={10}
                      tick={{ fill: '#9CA3AF', fontWeight: 500 }}
                    />
                    <YAxis
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      stroke="#9ca3af"
                      tickFormatter={(v) => `₱${v / 1000}k`}
                      dx={-10}
                      tick={{ fill: '#9CA3AF', fontWeight: 500 }}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.1)' }}
                      itemStyle={{ color: '#FB8C00', fontWeight: 'bold' }}
                      cursor={{ stroke: '#FB8C00', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#FB8C00" fill="url(#colorRevenue)" strokeWidth={3} activeDot={{ r: 6, strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl p-8 shadow-md flex flex-col">
            <h3 className="text-xl font-bold text-[var(--text-headline)] font-heading mb-1">Top Categories</h3>
            <p className="text-sm text-[var(--text-muted)] mb-6">Your sales distribution by category</p>

            <div className="h-[220px] w-full flex-1" style={{ minHeight: 220 }}>
              <ResponsiveContainer width="100%" height={200} minWidth={0}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    cornerRadius={6}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-3">
              {categoryData.map((category, index) => (
                <div key={index} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: category.color }} />
                    <span className="text-sm font-semibold text-[var(--text-secondary)]">{category.name}</span>
                  </div>
                  <span className="text-xs font-bold text-[var(--text-secondary)] bg-gray-100 px-2 py-0.5 rounded-md">{category.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Top Products */}
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-[var(--text-headline)] font-heading">Top Products</h3>
            </div>

            <div className="grid grid-cols-2 grid-rows-3 gap-3 flex-1 h-full min-h-[400px]">
              {topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className={cn(
                    "relative group overflow-hidden rounded-2xl flex flex-col items-center justify-center p-3 transition-all hover:shadow-[0_0_25px_-5px_rgba(251,140,0,0.4)] hover:-translate-y-1 duration-300 bg-white border border-gray-100/50 shadow-sm hover:border-[var(--brand-primary)]/50",
                    index === 0 ? "row-span-2 hover:shadow-[0_0_40px_-10px_rgba(255,165,0,0.6)]" : ""
                  )}
                >
                  {index === 0 && <Flame className="absolute top-3 right-3 h-6 w-6 text-[var(--brand-primary)] fill-current animate-pulse" />}
                  <div className="flex-1 flex items-center justify-center w-full min-h-0">
                    <img
                      src={product.images[0] || "https://placehold.co/200"}
                      alt={product.name}
                      className={cn(
                        "object-contain transition-transform group-hover:scale-110 duration-500",
                        index === 0 ? "max-h-[150px]" : "max-h-[60px]"
                      )}
                    />
                  </div>
                  <div className="text-center mt-2 w-full">
                    <p className="text-[14px] font-bold line-clamp-2 h-9 flex items-center justify-center text-[var(--text-headline)] px-1 leading-tight">
                      {product.name}
                    </p>
                    <p className="text-[12px] text-[var(--brand-primary)] mt-0.5">
                      {product.calculatedSales} Sales
                    </p>
                  </div>
                </div>
              ))}

              {topProducts.length === 0 && (
                <div className="col-span-2 row-span-3 flex items-center justify-center text-gray-400 italic font-medium bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  No sales data available.
                </div>
              )}
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-md p-8 h-fit">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-[var(--text-headline)] font-heading">Recent Transactions</h3>
                <p className="text-sm text-[var(--text-muted)]">Latest orders from your shop</p>
              </div>
              {isApprovedSeller ? (
                <Link to="/seller/orders" className="text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] flex items-center gap-1 transition-all">
                  View All
                </Link>
              ) : (
                <Link to="/seller/unverified" className="text-sm font-bold text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] flex items-center gap-1 transition-all">
                  Verification Status
                </Link>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 pl-4">Order ID</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Customer</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Date</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</th>
                    <th className="pb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-orange-50/30 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order.id)}>
                      <td className="py-5 pl-4 text-sm font-bold text-[var(--text-headline)] font-mono group-hover:text-[var(--brand-primary)] transition-colors">#{order.id.slice(0, 8).toUpperCase()}</td>
                      <td className="py-5 text-sm font-medium text-[var(--text-secondary)]">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {order.buyerName.charAt(0)}
                          </div>
                          {order.buyerName}
                        </div>
                      </td>
                      <td className="py-5 text-sm text-gray-500 font-medium">{new Date(order.orderDate).toLocaleDateString()}</td>
                      <td className="py-5 text-sm font-bold text-[var(--text-headline)]">₱{order.total.toLocaleString()}</td>
                      <td className="py-5 pr-4">
                        <span className={cn(
                          "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-sm inline-flex items-center gap-1.5",
                          order.status === 'delivered' ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", order.status === 'delivered' ? "bg-green-500" : "bg-orange-500")}></span>
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

