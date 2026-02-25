import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ChevronRight,
    Search,
    ChevronLeft,
    Loader2,
    RefreshCw,
    Package,
    User,
} from 'lucide-react';
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { Badge } from "../components/ui/badge";
import { useAuthStore } from '@/stores/sellerStore';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';



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
            case 'open': return 'bg-[var(--brand-wash)] text-[var(--brand-primary)] border-[var(--brand-accent-light)]';
            case 'in_progress':
            case 'waiting_response': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'resolved': return 'bg-green-50 text-green-600 border-green-100';
            case 'closed': return 'bg-gray-50 text-gray-500 border-gray-100';
            default: return 'bg-gray-50 text-gray-800';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-50 text-red-500';
            case 'high': return 'bg-[var(--brand-wash)] text-[var(--brand-primary)]';
            case 'normal': return 'bg-blue-50 text-blue-500';
            case 'low': return 'bg-gray-50 text-gray-500';
            default: return 'bg-gray-50 text-gray-500';
        }
    };

    const tabs = [
        { key: 'all' as const, label: 'All Reports' },
        { key: 'open' as const, label: 'Open' },
        { key: 'resolved' as const, label: 'Resolved' }
    ];

    const getCount = (key: 'all' | 'open' | 'resolved') => {
        if (key === 'all') return reports.length;
        if (key === 'open') return reports.filter(r => r.status === 'open' || r.status === 'in_progress').length;
        return reports.filter(r => r.status === 'resolved' || r.status === 'closed').length;
    };

    return (
        <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
            <SellerSidebar />

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Background Decor */}
                <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[var(--brand-accent-light)]/40 rounded-full blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[var(--brand-wash-gold)]/40 rounded-full blur-[100px]" />
                </div>

                <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto scrollbar-hide relative z-10">
                    <div className="w-full max-w-7xl mx-auto space-y-8 pb-10">
                        {/* Header */}
                        <div>
                            <button
                                onClick={() => navigate('/seller/help-center')}
                                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--brand-primary)] mb-6"
                            >
                                <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                                <span className="text-xs">Back to Help Center</span>
                            </button>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">Buyer Reports</h1>
                                    </div>
                                    <p className="text-sm text-[var(--text-muted)] mt-1 -mb-2">View buyer complaints and issues related to your store</p>
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-[var(--brand-accent-light)] rounded-xl hover:bg-[var(--brand-primary)] hover:text-white hover:border-[var(--brand-primary)] transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin text-[var(--brand-primary)]" /> : <RefreshCw size={16} />}
                                    Refresh List
                                </button>
                            </div>
                        </div>

                        {/* Info Banner */}
                        <div className="bg-[var(--brand-wash)]/50 backdrop-blur-sm border border-[var(--brand-accent-light)]/30 rounded-xl p-6 flex items-start gap-4 shadow-sm">
                            <div className="p-2 bg-[var(--brand-wash)] rounded-xl text-[var(--brand-primary)]">
                                <AlertTriangle className="flex-shrink-0" size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-headline)] text-sm mb-1">About Buyer Reports</h3>
                                <p className="text-[var(--text-muted)] text-xs leading-relaxed font-medium">
                                    These are support tickets submitted by buyers that may be related to orders from your store.
                                    Responding promptly helps maintain your store rating.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Report List */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[var(--brand-accent-light)] overflow-hidden">
                                    {/* Search & Tabs */}
                                    <div className="p-6 border-b border-gray-50">
                                        <div className="flex-1 w-full relative group mb-6">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors h-4 w-4" />
                                            <input
                                                type="text"
                                                placeholder="Search by subject or buyer name..."
                                                className="w-full h-10 pl-10 pr-4 bg-white border border-[var(--brand-wash-gold)] shadow-none rounded-xl focus:outline-none focus:ring-0 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all text-sm placeholder:text-[var(--text-muted)]"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1 relative min-w-0">
                                            <div className="overflow-x-auto scrollbar-hide pb-0.5">
                                                <div className="inline-flex items-center p-1 bg-white rounded-full shadow-sm min-w-full md:min-w-max">
                                                    {tabs.map((tab) => (
                                                        <button
                                                            key={tab.key}
                                                            onClick={() => setActiveTab(tab.key)}
                                                            className={cn(
                                                                "px-4 py-1.5 rounded-full text-[11px] sm:text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-1.5",
                                                                activeTab === tab.key
                                                                    ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                                                                    : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-orange-50/50",
                                                            )}
                                                        >
                                                            {tab.label}
                                                            <span className={cn("text-[10px]", activeTab === tab.key ? "text-white/90" : "text-gray-400")}>
                                                                ({getCount(tab.key)})
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
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
                                                        className={`p-6 hover:bg-[var(--brand-wash)]/50 transition-all group flex items-center gap-5 cursor-pointer ${selectedReport?.id === report.id ? 'bg-[var(--brand-wash)] border-l-4 border-l-[var(--brand-primary)] pl-[20px]' : 'border-l-4 border-l-transparent'
                                                            }`}
                                                        onClick={() => setSelectedReport(report)}
                                                    >
                                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all shadow-sm ${selectedReport?.id === report.id
                                                            ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white shadow-[var(--brand-primary)]/20'
                                                            : 'bg-white text-gray-400 border border-gray-100 group-hover:border-[var(--brand-accent-light)] group-hover:text-[var(--brand-primary)]'
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
                                                                ? 'bg-[var(--brand-wash)] text-[var(--brand-primary)]'
                                                                : 'bg-transparent text-gray-300 group-hover:bg-white group-hover:shadow-sm group-hover:text-[var(--brand-primary)]'
                                                                }`}>
                                                                <ChevronRight size={18} />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="p-16 flex flex-col items-center text-center">
                                                    <h3 className="text-xl font-black text-gray-900 mb-2">No buyer reports</h3>
                                                    <p className="text-sm text-[var(--text-muted)] max-w-xs leading-relaxed">
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
                                            className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[var(--brand-accent-light)] overflow-hidden sticky top-8"
                                        >
                                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-red-50/20">
                                                <h3 className="font-black text-red-700 flex items-center gap-2">
                                                    <AlertTriangle size={18} className="text-red-500" />
                                                    Buyer Report
                                                </h3>
                                                <button
                                                    onClick={() => setSelectedReport(null)}
                                                    className="p-2 hover:bg-white rounded-xl text-red-400/70 transition-all shadow-sm"
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
                                                    <div className="p-4 bg-[var(--brand-wash)]/50 rounded-2xl border border-[var(--brand-accent-light)]/30">
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Related Order</label>
                                                        <button
                                                            onClick={() => navigate(`/seller/orders`)}
                                                            className="w-full text-sm bg-white text-[var(--brand-primary)] hover:text-[var(--brand-primary-dark)] font-bold flex items-center justify-center gap-2 py-3 rounded-xl shadow-sm border border-[var(--brand-accent-light)]/50 hover:shadow-md transition-all active:scale-95"
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
                                        <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[var(--brand-accent-light)] border-dashed p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                                            <div className="w-20 h-20 flex items-center justify-center text-gray-300 mb-6 shadow-inset">
                                                <AlertTriangle size={32} />
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900 mb-1">Select a report</h3>
                                            <p className="text-sm text-[var(--text-muted)]">Click on a report to view details</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
