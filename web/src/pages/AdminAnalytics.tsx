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
  ArrowDownRight
} from 'lucide-react';

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
    { name: 'Electronics', value: 35, color: '#FF6A00' },
    { name: 'Fashion', value: 25, color: '#FF8533' },
    { name: 'Home & Garden', value: 20, color: '#FFA366' },
    { name: 'Books', value: 12, color: '#FFBC80' },
    { name: 'Others', value: 8, color: '#FFD4A6' }
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
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">Comprehensive platform insights and metrics</p>
              </div>
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500">
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>Last year</option>
                <option>All time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statsCards.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm text-gray-600">{stat.title}</p>
                        <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                          <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 mb-2">{stat.value}</p>
                      <div className="flex items-center gap-1 text-sm">
                        {stat.isPositive ? (
                          <ArrowUpRight className="w-4 h-4 text-green-600" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-red-600" />
                        )}
                        <span className={stat.isPositive ? 'text-green-600' : 'text-red-600'}>
                          {stat.change}
                        </span>
                        <span className="text-gray-500">vs last period</span>
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
                          <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
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
                        stroke="#FF6A00"
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
                    <Bar dataKey="sales" fill="#FF6A00" name="Units Sold" />
                    <Bar dataKey="revenue" fill="#FFA366" name="Revenue (₱)" />
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
