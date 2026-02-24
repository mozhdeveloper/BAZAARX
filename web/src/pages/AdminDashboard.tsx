import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth, useAdminStats } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
} from 'recharts';
import {
  DollarSign,
  ShoppingBag,
  Users,
  Store,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Activity,
  Shield
} from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { isAuthenticated, user } = useAdminAuth();
  const { stats, recentActivity, revenueChart, topCategories, isLoading, loadDashboardData } = useAdminStats();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, loadDashboardData]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <AdminSidebar
          open={open}
          setOpen={setOpen}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      open={open}
      setOpen={setOpen}
      stats={stats}
      recentActivity={recentActivity}
      revenueChart={revenueChart}
      topCategories={topCategories}
      user={user}
    />
  );
};

interface DashboardProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  stats: any;
  recentActivity: any[];
  revenueChart: any[];
  topCategories: any[];
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({
  open,
  setOpen,
  stats,
  recentActivity,
  revenueChart,
  topCategories,
  user
}) => {
  const statsCards = [
    {
      title: 'Total Revenue',
      value: `₱${stats.totalRevenue.toLocaleString()}`,
      change: stats.revenueGrowth,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      change: stats.ordersGrowth,
      icon: ShoppingBag,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      title: 'Total Sellers',
      value: stats.totalSellers.toLocaleString(),
      change: stats.sellersGrowth,
      icon: Store,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-700'
    },
    {
      title: 'Total Buyers',
      value: stats.totalBuyers.toLocaleString(),
      change: stats.buyersGrowth,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    }
  ];

  const categoryColors = ['#FF6A00', '#FF8533', '#FFA366', '#FFBC80'];

  const pieData = topCategories.map((category, index) => ({
    name: category.name,
    value: category.revenue,
    fill: categoryColors[index % categoryColors.length]
  }));

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="w-4 h-4" />;
      case 'seller_registration':
        return <Store className="w-4 h-4" />;
      case 'product_listing':
        return <Plus className="w-4 h-4" />;
      case 'dispute':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50';
      case 'warning':
        return 'text-orange-600 bg-orange-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <AdminSidebar
        open={open}
        setOpen={setOpen}
      />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Admin Dashboard
                </h1>
                <p className="text-gray-600">
                  Welcome back, {user?.name}! Here's what's happening in your marketplace.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                  {stats.pendingApprovals} Pending Approvals
                </Badge>
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          {card.title}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                          {card.value}
                        </p>
                        <div className="flex items-center mt-2">
                          {card.change > 0 ? (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                              <span className="text-sm font-medium text-green-600">
                                +{card.change}%
                              </span>
                            </>
                          ) : (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                              <span className="text-sm font-medium text-red-600">
                                {card.change}%
                              </span>
                            </>
                          )}
                          <span className="text-sm text-gray-500 ml-1">
                            vs last month
                          </span>
                        </div>
                      </div>
                      <div className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                        <card.icon className={`w-6 h-6 ${card.textColor}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Revenue Chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="lg:col-span-2"
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Revenue Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80" style={{ minHeight: 320 }}>
                    <ResponsiveContainer width="100%" height={300} minWidth={0}>
                      <AreaChart data={revenueChart}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF6A00" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#FF6A00" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                          dataKey="date"
                          stroke="#6b7280"
                          fontSize={12}
                          tickFormatter={(date) => new Date(date).getDate().toString()}
                        />
                        <YAxis
                          stroke="#6b7280"
                          fontSize={12}
                          tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                          labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          stroke="#FF6A00"
                          strokeWidth={3}
                          fill="url(#revenueGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Top Categories */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900">
                    Top Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 mb-4" style={{ minHeight: 256 }}>
                    <ResponsiveContainer width="100%" height={240} minWidth={0}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`₱${value.toLocaleString()}`, 'Revenue']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {topCategories.map((category, index) => (
                      <div key={category.name} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: categoryColors[index] }}
                          ></div>
                          <span className="text-sm font-medium text-gray-700">
                            {category.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            ₱{category.revenue.toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600">
                            +{category.growth}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8"
          >
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={`p-2 rounded-lg ${getActivityColor(activity.status)}`}>
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {activity.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${activity.status === 'success'
                          ? 'bg-green-100 text-green-700'
                          : activity.status === 'warning'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;