import { useState } from "react";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Settings, 
  Users, 
  TrendingUp,
  MoreHorizontal,
  Star,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { useStatsStore, useAuthStore, useOrderStore, useProductStore } from "@/stores/sellerStore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export function SellerDashboard() {
  const { seller } = useAuthStore();
  const [open, setOpen] = useState(false);

  const links = [
    {
      label: "Dashboard",
      href: "/seller",
      icon: <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
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

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {links.map((link, idx) => (
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

const Dashboard = () => {
  const { stats } = useStatsStore();
  const { seller } = useAuthStore();
  const { orders } = useOrderStore();
  const { products } = useProductStore();

  const recentOrders = orders.slice(0, 4);
  const topProducts = products.slice(0, 4);

  // Stats cards data
  const statsCards = [
    {
      title: "Total Revenue",
      value: `₱${(stats.totalRevenue / 1000).toFixed(0)}k`,
      change: "+15.3%",
      isPositive: true,
      icon: <TrendingUp className="h-6 w-6 text-green-600" />
    },
    {
      title: "Total Orders", 
      value: stats.totalOrders.toLocaleString(),
      change: "+10.8%",
      isPositive: true,
      icon: <ShoppingCart className="h-6 w-6 text-blue-600" />
    },
    {
      title: "Total Products",
      value: products.length.toString(),
      change: "-3.2%",
      isPositive: false,
      icon: <Package className="h-6 w-6 text-orange-600" />
    },
    {
      title: "Avg Rating",
      value: stats.avgRating.toString(),
      change: "+5.9%", 
      isPositive: true,
      icon: <Star className="h-6 w-6 text-yellow-600" />
    }
  ];

  return (
    <div className="flex flex-1 w-full">
      <div className="p-2 md:p-8 bg-gray-50 flex flex-col gap-6 flex-1 w-full h-full overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Good morning, {seller?.name || 'Seller'}! 
            </h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your store today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input 
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 w-64"
              />
            </div>
            <div className="h-8 w-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {seller?.name?.charAt(0) || 'S'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {stat.icon}
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-sm font-medium",
                  stat.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {stat.isPositive ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {stat.change}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Revenue Report</h3>
                <p className="text-sm text-gray-600">Monthly revenue overview</p>
              </div>
              <select className="border border-gray-300 rounded-lg px-3 py-1 text-sm">
                <option>6 Months</option>
                <option>1 Year</option>
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FF6A00" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#FF6A00" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <button className="text-orange-600 text-sm font-medium hover:text-orange-700">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="h-2 w-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Selling Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Best Selling Products</h3>
                <p className="text-sm text-gray-600">Top performing items this month</p>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <Filter className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                  <MoreHorizontal className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-500 w-8">#{index + 1}</div>
                  <img 
                    src={product.images[0]} 
                    alt={product.name}
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">₱{product.price.toLocaleString()}</p>
                    <p className="text-sm text-gray-600">{product.sales} sold</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600">{product.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <p className="text-sm text-gray-600">Latest customer orders</p>
              </div>
              <Link 
                to="/seller/orders"
                className="text-orange-600 text-sm font-medium hover:text-orange-700"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg">
                  <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{order.buyerName}</h4>
                    <p className="text-sm text-gray-600">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">₱{order.total.toLocaleString()}</p>
                    <p className={cn(
                      "text-xs font-medium px-2 py-1 rounded-full",
                      order.status === 'pending' && "bg-yellow-100 text-yellow-700",
                      order.status === 'confirmed' && "bg-blue-100 text-blue-700", 
                      order.status === 'shipped' && "bg-purple-100 text-purple-700",
                      order.status === 'delivered' && "bg-green-100 text-green-700",
                      order.status === 'cancelled' && "bg-red-100 text-red-700"
                    )}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};