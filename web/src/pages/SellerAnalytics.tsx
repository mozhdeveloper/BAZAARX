import { useState } from "react";
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Eye,
    Download,
    LogOut,
    ShoppingCart,
    Package,
    Users
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { useAuthStore } from "@/stores/sellerStore";
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
import { cn } from "@/lib/utils";

export function SellerAnalytics() {
    const { seller } = useAuthStore();
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
    const navigate = useNavigate();



    return (
        <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
            <SellerSidebar />
            <AnalyticsContent timeRange={timeRange} setTimeRange={setTimeRange} />
        </div>
    );
}





interface AnalyticsContentProps {
    timeRange: '7d' | '30d' | '90d' | '1y';
    setTimeRange: (range: '7d' | '30d' | '90d' | '1y') => void;
}

const AnalyticsContent = ({ timeRange, setTimeRange }: AnalyticsContentProps) => {

    // Sample data for charts
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
        { name: 'Electronics', value: 35, color: '#3b82f6' },
        { name: 'Fashion', value: 25, color: '#ef4444' },
        { name: 'Home & Living', value: 20, color: '#10b981' },
        { name: 'Beauty', value: 15, color: '#f59e0b' },
        { name: 'Others', value: 5, color: '#6366f1' }
    ];

    const topProducts = [
        { name: 'Premium Wireless Headphones', sold: 245, revenue: 735000 },
        { name: 'Smart Watch Series 5', sold: 189, revenue: 567000 },
        { name: 'Laptop Stand Pro', sold: 167, revenue: 334000 },
        { name: 'USB-C Hub Adapter', sold: 134, revenue: 268000 }
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

    return (
        <div className="flex flex-1 w-full overflow-hidden">
            <div className="flex-1 w-full h-full overflow-auto bg-gray-50">
                <div className="p-2 md:p-8 flex flex-col gap-6 w-full max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-[var(--text-headline)] font-heading tracking-tight">Analytics</h1>
                            <p className="text-[var(--text-muted)] mt-1 font-medium">Track your store performance and insights</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Time Range Selector */}
                            <div className="flex items-center gap-1 bg-white border border-gray-100 shadow-sm rounded-xl p-1">
                                {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => setTimeRange(range)}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                                            timeRange === range
                                                ? "bg-orange-50 text-[var(--brand-primary)] shadow-sm"
                                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                                        )}
                                    >
                                        {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                                    </button>
                                ))}
                            </div>
                            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all font-bold">
                                <Download className="h-4 w-4" />
                                <span className="text-sm">Export</span>
                            </button>
                        </div>
                    </div>

                    {/* Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {metrics.map((metric, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(251,140,0,0.1)] border border-transparent hover:border-orange-100 transition-all group overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:bg-orange-100 transition-colors"></div>
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                    <div className={cn(
                                        "p-3 rounded-xl transition-all",
                                        metric.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                    )}>
                                        <div className="h-5 w-5">
                                            {metric.icon}
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                                        metric.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                    )}>
                                        {metric.trend === 'up' ? (
                                            <TrendingUp className="h-3 w-3" />
                                        ) : (
                                            <TrendingDown className="h-3 w-3" />
                                        )}
                                        {metric.change}
                                    </div>
                                </div>
                                <h3 className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-wide relative z-10">{metric.title}</h3>
                                <p className="text-2xl font-black text-[var(--text-headline)] font-heading mt-1 relative z-10">{metric.value}</p>
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
                            className="lg:col-span-2 bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-transparent overflow-hidden relative"
                        >
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--text-headline)] font-heading">Revenue Overview</h3>
                                    <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Monthly revenue and order trends</p>
                                </div>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={revenueData}>
                                    <defs>
                                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                    <XAxis dataKey="date" stroke="#9ca3af" />
                                    <YAxis stroke="#9ca3af" />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'white',
                                            border: '1px solid #e5e7eb',
                                            borderRadius: '8px'
                                        }}
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
                        </motion.div>

                        {/* Category Distribution */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-transparent overflow-hidden relative"
                        >
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-[var(--text-headline)] font-heading">Sales by Category</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Distribution overview</p>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="mt-4 space-y-2">
                                {categoryData.map((category, index) => (
                                    <div key={index} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            <span className="text-sm text-gray-600">{category.name}</span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-900">{category.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* Top Products */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-transparent relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-[var(--text-headline)] font-heading">Top Selling Products</h3>
                                <p className="text-sm text-[var(--text-muted)] mt-1 font-medium">Best performers this month</p>
                            </div>
                            <button className="text-sm text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] font-bold transition-colors">
                                View All
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="text-left py-4 px-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Product</th>
                                        <th className="text-right py-4 px-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Units Sold</th>
                                        <th className="text-right py-4 px-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {topProducts.map((product, index) => (
                                        <tr key={index} className="group hover:bg-orange-50/30 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                                                        <Package className="h-6 w-6 text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors" />
                                                    </div>
                                                    <span className="text-sm font-bold text-[var(--text-headline)]">{product.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right text-sm font-medium text-[var(--text-secondary)]">{product.sold}</td>
                                            <td className="py-4 px-4 text-right text-sm font-bold text-[var(--text-headline)]">
                                                ₱{product.revenue.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

// Sidebar Logo Component
const SellerLogo = ({ open }: { open: boolean }) => (
    <Link to="/seller" className={cn(
        "flex items-center py-2 mb-6 group transition-all duration-300",
        open ? "justify-start px-2 gap-3" : "justify-center px-0 gap-0"
    )}>
        <div className="w-10 h-10 bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <img src="/BazaarX.png" alt="BazaarX Logo" className="h-6 w-6 brightness-0 invert" />
        </div>

        <motion.div
            animate={{
                opacity: open ? 1 : 0,
                width: open ? "auto" : 0,
                display: open ? "flex" : "none"
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex-col overflow-hidden whitespace-nowrap"
        >
            <span className="font-black text-xl text-[var(--text-headline)] font-heading tracking-tight leading-none">BazaarX</span>
            <span className="text-[10px] text-[var(--brand-primary)] font-bold tracking-widest uppercase">Seller Hub</span>
        </motion.div>
    </Link>
);
