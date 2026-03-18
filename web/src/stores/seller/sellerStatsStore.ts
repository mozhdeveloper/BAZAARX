/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import type { SellerProduct, SellerOrder, SellerStats } from './sellerTypes';
import { useOrderStore } from './sellerOrderStore';
import { useProductStore } from './sellerProductStore';

interface StatsStore {
    stats: SellerStats;
    refreshStats: () => void;
}

export const useStatsStore = create<StatsStore>()((set) => ({
    stats: {
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        avgRating: 0,
        monthlyRevenue: [],
        topProducts: [],
        recentActivity: [],
    },
    refreshStats: () => {
        const orderStore = useOrderStore.getState();
        const productStore = useProductStore.getState();

        const orders = orderStore.orders;
        const products = productStore.products;

        // Calculate total revenue from delivered orders
        const totalRevenue = orders
            .filter((order) => order.status === "delivered")
            .reduce((sum, order) => sum + order.total, 0);

        // Total orders count
        const totalOrders = orders.length;

        // Total products count
        const totalProducts = products.length;

        // Calculate average rating from orders with ratings
        const ordersWithRatings = orders.filter((order) => order.rating);
        const avgRating =
            ordersWithRatings.length > 0
                ? ordersWithRatings.reduce(
                    (sum, order) => sum + (order.rating || 0),
                    0,
                ) / ordersWithRatings.length
                : 0;

        // Calculate monthly revenue (last 12 months)
        const monthlyRevenue = calculateMonthlyRevenue(orders);

        // Calculate top products by sales
        const topProducts = calculateTopProducts(products, orders);

        // Generate recent activity from orders and products
        const recentActivity = generateRecentActivity(orders, products);

        set({
            stats: {
                totalRevenue,
                totalOrders,
                totalProducts,
                avgRating: Math.round(avgRating * 10) / 10,
                monthlyRevenue,
                topProducts,
                recentActivity,
            },
        });
    },
}));

// Helper function to calculate monthly revenue
function calculateMonthlyRevenue(
    orders: SellerOrder[],
): { month: string; revenue: number }[] {
    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
    ];
    const currentDate = new Date();
    const monthlyData: { month: string; revenue: number }[] = [];

    for (let i = 11; i >= 0; i--) {
        const date = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - i,
            1,
        );
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();

        const revenue = orders
            .filter((order) => {
                const orderDate = new Date(order.orderDate);
                return (
                    orderDate.getMonth() === date.getMonth() &&
                    orderDate.getFullYear() === year &&
                    order.status === "delivered"
                );
            })
            .reduce((sum, order) => sum + order.total, 0);

        monthlyData.push({ month: monthName, revenue });
    }

    return monthlyData;
}

// Helper function to calculate top products
function calculateTopProducts(
    _products: SellerProduct[],
    orders: SellerOrder[],
): { name: string; sales: number; revenue: number }[] {
    const productStats = new Map<
        string,
        { name: string; sales: number; revenue: number }
    >();

    orders.forEach((order) => {
        order.items.forEach((item) => {
            const existing = productStats.get(item.productId) || {
                name: item.productName,
                sales: 0,
                revenue: 0,
            };
            existing.sales += item.quantity;
            existing.revenue += item.price * item.quantity;
            productStats.set(item.productId, existing);
        });
    });

    return Array.from(productStats.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 3);
}

// Helper function to generate recent activity
function generateRecentActivity(
    orders: SellerOrder[],
    products: SellerProduct[],
): {
    id: string;
    type: "order" | "product" | "review";
    message: string;
    time: string;
}[] {
    const activities: {
        id: string;
        type: "order" | "product" | "review";
        message: string;
        time: string;
        timestamp: Date;
    }[] = [];

    // Add recent orders
    orders.slice(-5).forEach((order) => {
        activities.push({
            id: order.id,
            type: "order",
            message: `New order from ${order.buyerName}`,
            time: getRelativeTime(order.orderDate),
            timestamp: new Date(order.orderDate),
        });
    });

    // Add low stock alerts
    products
        .filter((p) => p.stock < 10 && p.stock > 0)
        .slice(0, 3)
        .forEach((product) => {
            activities.push({
                id: product.id,
                type: "product",
                message: `${product.name} stock is running low (${product.stock} left)`,
                time: getRelativeTime(product.updatedAt),
                timestamp: new Date(product.updatedAt),
            });
        });

    // Add recent reviews
    orders
        .filter((order) => order.rating && order.reviewDate)
        .slice(-3)
        .forEach((order) => {
            activities.push({
                id: order.id,
                type: "review",
                message: `New ${order.rating}-star review for ${order.items[0]?.productName}`,
                time: getRelativeTime(order.reviewDate!),
                timestamp: new Date(order.reviewDate!),
            });
        });

    // Sort by timestamp and return top 5
    return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map(({ timestamp, ...rest }) => rest);
}

// Helper function to get relative time
function getRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
        return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
        return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    return date.toLocaleDateString();
}
