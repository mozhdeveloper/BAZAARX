import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    ArrowLeft,
    Loader2,
    RefreshCw,
    Package,
    User,
    MessageSquare,
    Send
} from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { sellerLinks } from "@/config/sellerLinks";
import { Badge } from "../components/ui/badge";
import { useAuthStore } from '@/stores/sellerStore';
import { supabase } from '@/lib/supabase';

// Logo components for sidebar
// Logo components for sidebar
const Logo = () => (
    <div className="flex items-center gap-3 px-2 py-2 mb-6 group">
        <div className="w-10 h-10 bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <img src="/BazaarX.png" alt="BazaarX Logo" className="h-6 w-6 brightness-0 invert" />
        </div>
        <div className="flex flex-col">
            <span className="font-black text-xl text-[var(--text-headline)] font-heading tracking-tight leading-none">BazaarX</span>
            <span className="text-[10px] text-[var(--brand-primary)] font-bold tracking-widest uppercase">Seller Hub</span>
        </div>
    </div>
);

const LogoIcon = () => (
    <div className="flex items-center justify-center py-2 mb-6 group">
        <div className="w-10 h-10 bg-gradient-to-tr from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
            <img src="/BazaarX.png" alt="BazaarX Logo" className="h-6 w-6 brightness-0 invert" />
        </div>
    </div>
);

interface BuyerReport {
    id: string;
    buyerName: string;
    buyerEmail: string;
    subject: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    createdAt: string;
    productName?: string;
    orderId?: string;
}

export default function SellerBuyerReports() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReport, setSelectedReport] = useState<BuyerReport | null>(null);
    const [reports, setReports] = useState<BuyerReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState('');

    const { seller } = useAuthStore();

    // Fetch buyer reports related to seller's products
    useEffect(() => {
        fetchBuyerReports();
    }, [seller?.id]);

    const fetchBuyerReports = async () => {
        if (!seller?.id) return;

        setLoading(true);
        try {
            // Fetch tickets that are explicitly about this seller's store
            // Using seller_id to show only buyer complaints about this specific seller
            const { data: tickets, error } = await supabase
                .from('support_tickets')
                .select(`
                    id,
                    subject,
                    description,
                    status,
                    priority,
                    created_at,
                    order_id,
                    seller_id,
                    user:profiles!user_id(first_name, last_name, email),
                    category:ticket_categories!category_id(name),
                    seller:sellers(store_name, owner_name)
                `)
                .eq('seller_id', seller.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching buyer reports:', error);
                return;
            }

            // Map to our report format
            const mappedReports: BuyerReport[] = (tickets || []).map((t: any) => {
                const user = t.user;
                const category = t.category;
                return {
                    id: t.id,
                    buyerName: [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Unknown Buyer',
                    buyerEmail: user?.email || '',
                    subject: t.subject,
                    description: t.description,
                    status: t.status,
                    priority: t.priority,
                    category: category?.name || 'General',
                    createdAt: new Date(t.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    orderId: t.order_id
                };
            });

            setReports(mappedReports);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchBuyerReports();
    };

    const filteredReports = reports.filter(report => {
        const matchesTab = activeTab === 'all' ||
            (activeTab === 'open' && (report.status === 'open' || report.status === 'in_progress')) ||
            (activeTab === 'resolved' && (report.status === 'resolved' || report.status === 'closed'));
        const matchesSearch = report.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'in_progress':
            case 'waiting_response': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'resolved': return 'bg-green-100 text-green-600 border-green-200';
            case 'closed': return 'bg-gray-100 text-gray-500 border-gray-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-600';
            case 'high': return 'bg-orange-100 text-orange-600';
            case 'normal': return 'bg-blue-100 text-blue-600';
            case 'low': return 'bg-gray-100 text-gray-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const tabs = [
        { key: 'all', label: 'All Reports' },
        { key: 'open', label: 'Open' },
        { key: 'resolved', label: 'Resolved' }
    ];

    return (
        <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
            {/* Sidebar */}
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10 bg-white shadow-2xl shadow-orange-900/5 z-50 transition-all duration-300">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {sellerLinks.map((link, idx) => (
                                <SidebarLink key={idx} link={link} />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-3 pt-6 border-t border-gray-50">
                        <SidebarLink
                            link={{
                                label: seller?.storeName || seller?.ownerName || "Seller",
                                href: "/seller/profile",
                                icon: <div className="h-8 w-8 flex-shrink-0 rounded-xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] flex items-center justify-center shadow-lg shadow-orange-500/20">
                                    <span className="text-white text-xs font-bold">
                                        {(seller?.storeName || "S").charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative z-10 scrollbar-hide">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-8">
                    {/* Header */}
                    <div className="mb-8">
                        <button
                            onClick={() => navigate('/seller/help-center')}
                            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-all group mb-6 font-medium"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm">Back to Help Center</span>
                        </button>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">Buyer Reports</h1>
                                    {reports.length > 0 && (
                                        <span className="bg-orange-100 text-[var(--brand-primary)] text-sm font-bold px-4 py-1.5 rounded-full border border-orange-200 shadow-sm">
                                            {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[var(--text-secondary)] font-medium">View buyer complaints and issues related to your store</p>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-[24px] p-6 flex items-start gap-4 shadow-[0_8px_30px_rgba(251,191,36,0.1)]">
                        <div className="p-2 bg-amber-100 rounded-xl text-amber-600">
                            <AlertTriangle className="flex-shrink-0" size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900 text-base mb-1">About Buyer Reports</h3>
                            <p className="text-amber-800/80 text-sm leading-relaxed font-medium">
                                These are support tickets submitted by buyers that may be related to orders from your store.
                                Responding promptly helps maintain your store rating.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Report List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100 overflow-hidden">
                                {/* Search & Tabs */}
                                <div className="p-6 border-b border-gray-100">
                                    <div className="relative mb-6">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary)]" size={20} />
                                        <input
                                            type="text"
                                            placeholder="Search by subject or buyer name..."
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 focus:border-orange-500 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all placeholder-gray-400"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                            {tabs.map(tab => (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setActiveTab(tab.key as any)}
                                                    className={`px-5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border
                                                        ${activeTab === tab.key
                                                            ? 'bg-orange-50 text-[var(--brand-primary)] border-orange-200 shadow-sm'
                                                            : 'bg-white text-gray-500 hover:text-gray-900 border-transparent hover:bg-gray-50'}`}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                        {filteredReports.length > 0 && (
                                            <span className="text-xs text-gray-400 font-bold whitespace-nowrap bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Reports */}
                                <div className="divide-y divide-gray-50">
                                    <AnimatePresence mode="popLayout">
                                        {loading ? (
                                            <div className="p-16 flex flex-col items-center justify-center">
                                                <Loader2 size={32} className="text-[var(--brand-primary)] animate-spin mb-4" />
                                                <p className="text-sm font-medium text-gray-400">Loading reports...</p>
                                            </div>
                                        ) : filteredReports.length > 0 ? (
                                            filteredReports.map((report, index) => (
                                                <motion.div
                                                    key={report.id}
                                                    layout
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.98 }}
                                                    transition={{ duration: 0.2, delay: index * 0.03 }}
                                                    className={`p-6 hover:bg-orange-50/50 transition-all group flex items-center gap-5 cursor-pointer ${selectedReport?.id === report.id ? 'bg-orange-50 border-l-4 border-l-orange-500 pl-[20px]' : 'border-l-4 border-l-transparent'
                                                        }`}
                                                    onClick={() => setSelectedReport(report)}
                                                >
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-sm ${selectedReport?.id === report.id
                                                            ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white shadow-orange-500/20'
                                                            : 'bg-white text-gray-400 border border-gray-100 group-hover:border-orange-200 group-hover:text-orange-500'
                                                        }`}>
                                                        <AlertTriangle size={20} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 rounded-lg border ${getStatusColor(report.status)}`}>
                                                                {report.status.replace('_', ' ')}
                                                            </Badge>
                                                            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider py-0.5 px-2 rounded-lg ${getPriorityColor(report.priority)}`}>
                                                                {report.priority}
                                                            </Badge>
                                                        </div>
                                                        <h3 className="text-base font-bold text-gray-900 truncate group-hover:text-[var(--brand-primary)] transition-colors mb-1">
                                                            {report.subject}
                                                        </h3>
                                                        <div className="flex items-center gap-3">
                                                            <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                                                                <User size={12} />
                                                                {report.buyerName}
                                                            </p>
                                                            <span className="text-[10px] font-bold text-gray-300">•</span>
                                                            <span className="text-xs font-medium text-gray-400">{report.category}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4">
                                                        <div className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                                                            {report.createdAt}
                                                        </div>
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${selectedReport?.id === report.id
                                                                ? 'bg-orange-100 text-[var(--brand-primary)]'
                                                                : 'bg-transparent text-gray-300 group-hover:bg-white group-hover:shadow-sm group-hover:text-[var(--brand-primary)]'
                                                            }`}>
                                                            <ChevronRight size={18} />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="p-16 flex flex-col items-center text-center">
                                                <div className="w-20 h-20 bg-green-50 rounded-[2rem] flex items-center justify-center text-green-500 mb-6 shadow-sm border border-green-100">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <h3 className="text-xl font-black text-gray-900 mb-2">No buyer reports</h3>
                                                <p className="text-sm text-gray-500 max-w-xs font-medium leading-relaxed">
                                                    Great news! There are no buyer complaints related to your store at the moment.
                                                </p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>

                        {/* Report Detail Panel */}
                        <div className="lg:col-span-1">
                            <AnimatePresence mode="wait">
                                {selectedReport ? (
                                    <motion.div
                                        key={selectedReport.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100 overflow-hidden sticky top-8"
                                    >
                                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
                                            <h3 className="font-black text-red-900 flex items-center gap-2">
                                                <AlertTriangle size={18} className="text-red-500" />
                                                Buyer Report
                                            </h3>
                                            <button
                                                onClick={() => setSelectedReport(null)}
                                                className="p-2 hover:bg-white rounded-xl text-red-400 transition-all shadow-sm"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div className="p-6 space-y-6">
                                            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Reported By</label>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 text-[var(--brand-primary)]">
                                                        <User size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900">{selectedReport.buyerName}</p>
                                                        <p className="text-xs font-medium text-gray-500">{selectedReport.buyerEmail}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5 ml-1">Subject</label>
                                                <p className="text-base font-bold text-gray-900 pl-1">{selectedReport.subject}</p>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2 ml-1">Description</label>
                                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">{selectedReport.description}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Status</label>
                                                    <Badge variant="outline" className={`${getStatusColor(selectedReport.status)} rounded-lg py-1 px-3`}>
                                                        {selectedReport.status.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                                <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">Priority</label>
                                                    <Badge variant="outline" className={`${getPriorityColor(selectedReport.priority)} rounded-lg py-1 px-3`}>
                                                        {selectedReport.priority}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {selectedReport.orderId && (
                                                <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100/50">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Related Order</label>
                                                    <button
                                                        onClick={() => navigate(`/seller/orders`)}
                                                        className="w-full text-sm bg-white text-[var(--brand-primary)] hover:text-orange-700 font-bold flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm border border-orange-100 hover:shadow-md transition-all active:scale-95"
                                                    >
                                                        <Package size={16} />
                                                        View Order Details
                                                    </button>
                                                </div>
                                            )}

                                            <div className="pt-6 border-t border-gray-100">
                                                <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-2xl">
                                                    <span className="text-lg">ℹ️</span>
                                                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                                        This report is being handled by BazaarX Support.
                                                        Contact support if you need to provide additional information.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100 border-dashed p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                                        <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300 mb-6 shadow-inset">
                                            <AlertTriangle size={32} />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 mb-1">Select a report</h3>
                                        <p className="text-sm text-gray-500 font-medium">Click on a report to view details</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
