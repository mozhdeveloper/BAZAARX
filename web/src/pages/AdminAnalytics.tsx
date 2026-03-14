import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const AdminAnalytics: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Sample data for charts
  const revenueData = [
    { month: 'Jan', revenue: 45000, orders: 120 },
    { month: 'Feb', revenue: 52000, orders: 145 },
    { month: 'Mar', revenue: 48000, orders: 132 },
    { month: 'Apr', revenue: 61000, orders: 168 },
    { month: 'May', revenue: 55000, orders: 151 },
    { month: 'Jun', revenue: 67000, orders: 189 },
    { month: 'Jul', revenue: 72000, orders: 203 },
    { month: 'Aug', revenue: 68000, orders: 195 },
    { month: 'Sep', revenue: 75000, orders: 218 },
    { month: 'Oct', revenue: 82000, orders: 241 },
    { month: 'Nov', revenue: 78000, orders: 229 },
    { month: 'Dec', revenue: 89000, orders: 267 }
  ];

  const categoryData = [
    { name: 'Electronics', value: 35, color: '#D97706' },
    { name: 'Fashion', value: 25, color: '#E58C1A' },
    { name: 'Home & Garden', value: 20, color: '#F5DDB0' },
    { name: 'Books', value: 12, color: '#EDD9A3' },
    { name: 'Others', value: 8, color: '#FDE8C8' }
  ];

  const topProductsData = [
    { name: 'Wireless Earbuds', sales: 234, revenue: 584166 },
    { name: 'Leather Bag', sales: 189, revenue: 623511 },
    { name: 'Smart Watch', sales: 156, revenue: 779844 },
    { name: 'Running Shoes', sales: 143, revenue: 428857 },
    { name: 'Coffee Maker', sales: 128, revenue: 383872 }
  ];

  const statsCards = [
    {
      title: 'Total Revenue',
      value: '₱823,000',
      change: '+12.5%',
      isPositive: true,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Total Orders',
      value: '2,357',
      change: '+8.2%',
      isPositive: true,
      icon: ShoppingBag,
      color: 'blue'
    },
    {
      title: 'Active Users',
      value: '1,289',
      change: '+15.3%',
      isPositive: true,
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Conversion Rate',
      value: '3.24%',
      change: '-2.1%',
      isPositive: false,
      icon: TrendingUp,
      color: 'orange'
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar open={open} setOpen={setOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Analytics Dashboard</h1>
                <p className="text-[var(--text-muted)]">Comprehensive platform insights and metrics</p>
              </div>
              <div className="flex items-center gap-3">
                <Filter className="text-gray-400 w-4 h-4" />
                <Select defaultValue="30">
                  <SelectTrigger className="h-9 w-[150px] bg-white rounded-xl border-gray-200 focus:ring-0 text-gray-600">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent className="border-none shadow-xl">
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statsCards.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="border-none shadow-md hover:shadow-[0_20px_40px_rgba(229,140,26,0.1)] transition-all duration-300 rounded-xl bg-white overflow-hidden group relative">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--brand-accent-light)]/50 to-[var(--brand-primary)]/10 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-[var(--brand-accent-light)] transition-colors"></div>
                    <CardContent className="p-6 relative z-10">
                      <div className="flex flex-col gap-4">
                        <div className="text-gray-500 group-hover:text-[var(--brand-primary)] transition-all">
                          <stat.icon className="h-5 w-5" />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-400">{stat.title}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xl font-bold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors">{stat.value}</p>
                            <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${stat.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {stat.isPositive ? <ArrowUpRight className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
                              {stat.change}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue & Orders Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#D97706" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#D97706"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        name="Revenue (₱)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Sales by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Top Products Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topProductsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#888" />
                    <YAxis stroke="#888" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sales" fill="#D97706" name="Units Sold" />
                    <Bar dataKey="revenue" fill="#E58C1A" name="Revenue (₱)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
