import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../stores/adminStore';
import AdminSidebar from '../components/AdminSidebar';
import { supabase } from '@/lib/supabase';
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
  Filter,
  Loader2
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PERIOD_DAYS: Record<string, number | null> = {
  '30': 30,
  '90': 90,
  'year': 365,
  'all': null,
};

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PIE_COLORS = ['#D97706', '#E58C1A', '#F5DDB0', '#EDD9A3', '#FDE8C8', '#FBBF24', '#F59E0B', '#D97706'];

const AdminAnalytics: React.FC = () => {
  const { isAuthenticated } = useAdminAuth();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);

  const [revenueData, setRevenueData] = useState<{ month: string; revenue: number; orders: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [topProductsData, setTopProductsData] = useState<{ name: string; sales: number; revenue: number }[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, activeUsers: 0 });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const days = PERIOD_DAYS[period];
      const since = days ? new Date(Date.now() - days * 86400000).toISOString() : undefined;

      // Fetch orders with items in parallel
      const orderFilter = supabase.from('orders').select('id, created_at, order_items(price, price_discount, quantity)');
      const ordersQuery = since ? orderFilter.gte('created_at', since) : orderFilter;

      const [ordersRes, categoriesRes, usersRes] = await Promise.all([
        ordersQuery,
        supabase.from('categories').select('id, name').eq('is_active', true),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ]);

      const orders = ordersRes.data || [];
      const categories = categoriesRes.data || [];
      const activeUsers = usersRes.count || 0;

      // Calculate total revenue & orders
      let totalRevenue = 0;
      orders.forEach((o: any) => {
        (o.order_items || []).forEach((item: any) => {
          totalRevenue += (Number(item.price) - Number(item.price_discount || 0)) * Number(item.quantity);
        });
      });

      setStats({ totalRevenue, totalOrders: orders.length, activeUsers });

      // Monthly revenue breakdown
      const monthlyMap = new Map<string, { revenue: number; orders: number }>();
      orders.forEach((o: any) => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${d.getMonth()}`;
        const entry = monthlyMap.get(key) || { revenue: 0, orders: 0 };
        entry.orders += 1;
        (o.order_items || []).forEach((item: any) => {
          entry.revenue += (Number(item.price) - Number(item.price_discount || 0)) * Number(item.quantity);
        });
        monthlyMap.set(key, entry);
      });

      const sortedMonths = Array.from(monthlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([key, data]) => ({
          month: MONTH_NAMES[parseInt(key.split('-')[1])],
          revenue: Math.round(data.revenue),
          orders: data.orders,
        }));
      setRevenueData(sortedMonths);

      // Category distribution — count products per category
      if (categories.length > 0) {
        const catIds = categories.map(c => c.id);
        const { data: products } = await supabase
          .from('products')
          .select('category_id')
          .in('category_id', catIds)
          .is('deleted_at', null);

        const catCount = new Map<string, number>();
        (products || []).forEach((p: any) => {
          catCount.set(p.category_id, (catCount.get(p.category_id) || 0) + 1);
        });

        const catData = categories
          .map((c, i) => ({
            name: c.name,
            value: catCount.get(c.id) || 0,
            color: PIE_COLORS[i % PIE_COLORS.length],
          }))
          .filter(c => c.value > 0)
          .sort((a, b) => b.value - a.value)
          .slice(0, 6);
        setCategoryData(catData);
      }

      // Top products by sold quantity
      const { data: topProducts } = await supabase
        .from('order_items')
        .select('product_name, price, price_discount, quantity');

      if (topProducts) {
        const productMap = new Map<string, { sales: number; revenue: number }>();
        topProducts.forEach((item: any) => {
          const name = item.product_name;
          const entry = productMap.get(name) || { sales: 0, revenue: 0 };
          entry.sales += Number(item.quantity);
          entry.revenue += (Number(item.price) - Number(item.price_discount || 0)) * Number(item.quantity);
          productMap.set(name, entry);
        });

        const sorted = Array.from(productMap.entries())
          .map(([name, data]) => ({ name, sales: data.sales, revenue: Math.round(data.revenue) }))
          .sort((a, b) => b.sales - a.sales)
          .slice(0, 5);
        setTopProductsData(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAnalytics();
    }
  }, [isAuthenticated, fetchAnalytics]);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  const statsCards = [
    {
      title: 'Total Revenue',
      value: `₱${stats.totalRevenue.toLocaleString()}`,
      change: '',
      isPositive: true,
      icon: DollarSign,
      color: 'green'
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      change: '',
      isPositive: true,
      icon: ShoppingBag,
      color: 'blue'
    },
    {
      title: 'Registered Users',
      value: stats.activeUsers.toLocaleString(),
      change: '',
      isPositive: true,
      icon: Users,
      color: 'purple'
    },
    {
      title: 'Avg Order Value',
      value: stats.totalOrders > 0 ? `₱${Math.round(stats.totalRevenue / stats.totalOrders).toLocaleString()}` : '₱0',
      change: '',
      isPositive: true,
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
                {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                <Filter className="text-gray-400 w-4 h-4" />
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger className="h-9 w-[150px] bg-white rounded-xl border-gray-200 focus:ring-0 text-gray-600">
                    <SelectValue placeholder="Period" />
                  </SelectTrigger>
                  <SelectContent className="border-none shadow-xl">
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
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
                          <p className="text-xl font-bold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors">{stat.value}</p>
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
