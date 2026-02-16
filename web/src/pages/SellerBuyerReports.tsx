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
const Logo = () => (
  <div className="font-bold flex items-center text-sm text-black py-1 relative z-20">
    <div className="h-6 w-8 bg-orange-500 rounded-lg text-white flex items-center justify-center text-xs font-black mr-2">
      BX
    </div>
    BazaarX Seller
  </div>
);

const LogoIcon = () => (
  <div className="h-6 w-8 bg-orange-500 rounded-lg text-white flex items-center justify-center text-xs font-black">
    BX
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
        <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden font-[family-name:var(--font-sans)]">
            {/* Sidebar */}
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-2">
                            {sellerLinks.map((link, idx) => (
                                <SidebarLink key={idx} link={link} />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <SidebarLink
                            link={{
                                label: seller?.storeName || seller?.ownerName || seller?.name || "Seller",
                                href: "/seller/profile",
                                icon: (
                                    <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                                        <span className="text-white text-xs font-medium">
                                            {(seller?.storeName || seller?.ownerName || seller?.name || "S").charAt(0)}
                                        </span>
                                    </div>
                                ),
                            }}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
                    {/* Header */}
                    <div className="mb-6">
                        <button
                            onClick={() => navigate('/seller/help-center')}
                            className="flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group mb-4"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">Back to Help Center</span>
                        </button>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Buyer Reports</h1>
                                    {reports.length > 0 && (
                                        <span className="bg-orange-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                                            {reports.length} {reports.length === 1 ? 'Report' : 'Reports'}
                                        </span>
                                    )}
                                </div>
                                <p className="text-gray-500 text-sm">View buyer complaints and issues related to your store</p>
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Info Banner */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <h3 className="font-semibold text-amber-800 text-sm">About Buyer Reports</h3>
                            <p className="text-amber-700 text-xs mt-1">
                                These are support tickets submitted by buyers that may be related to orders from your store. 
                                Responding promptly helps maintain your store rating.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Report List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Search & Tabs */}
                                <div className="p-4 border-b border-gray-100">
                                    <div className="relative mb-4">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search by subject or buyer name..."
                                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mb-4">
                                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                            {tabs.map(tab => (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setActiveTab(tab.key as any)}
                                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border
                                                        ${activeTab === tab.key
                                                            ? 'bg-orange-50 text-orange-500 border-orange-200 shadow-sm'
                                                            : 'bg-white text-gray-400 hover:text-gray-600 border-transparent hover:bg-gray-50'}`}
                                                >
                                                    {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                        {filteredReports.length > 0 && (
                                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">
                                                {filteredReports.length} {filteredReports.length === 1 ? 'report' : 'reports'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Reports */}
                                <div className="divide-y divide-gray-50">
                                    <AnimatePresence mode="popLayout">
                                        {loading ? (
                                            <div className="p-12 flex flex-col items-center justify-center">
                                                <Loader2 size={32} className="text-orange-500 animate-spin mb-4" />
                                                <p className="text-sm text-gray-400">Loading reports...</p>
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
                                                    className={`p-4 hover:bg-gray-50 transition-all group flex items-center gap-4 cursor-pointer ${
                                                        selectedReport?.id === report.id ? 'bg-orange-50' : ''
                                                    }`}
                                                    onClick={() => setSelectedReport(report)}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                                        selectedReport?.id === report.id 
                                                            ? 'bg-orange-500 text-white' 
                                                            : 'bg-red-50 text-red-500 group-hover:bg-red-500 group-hover:text-white'
                                                    }`}>
                                                        <AlertTriangle size={20} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                            <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter py-0 rounded-md border ${getStatusColor(report.status)}`}>
                                                                {report.status.replace('_', ' ')}
                                                            </Badge>
                                                            <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter py-0 rounded-md ${getPriorityColor(report.priority)}`}>
                                                                {report.priority}
                                                            </Badge>
                                                            <span className="text-[10px] text-gray-400 font-bold">• {report.category}</span>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-orange-500 transition-colors">
                                                            {report.subject}
                                                        </h3>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                            <User size={12} />
                                                            {report.buyerName}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[10px] font-bold text-gray-400 tracking-wider">
                                                            {report.createdAt}
                                                        </div>
                                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                                                    </div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="p-12 flex flex-col items-center text-center">
                                                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-500 mb-4">
                                                    <CheckCircle2 size={32} />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">No buyer reports</h3>
                                                <p className="text-xs text-gray-400 max-w-xs">
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
                                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-8"
                                    >
                                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-red-50">
                                            <h3 className="font-bold text-red-800">Buyer Report</h3>
                                            <button
                                                onClick={() => setSelectedReport(null)}
                                                className="p-1.5 hover:bg-red-100 rounded-lg text-red-400"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Reported By</label>
                                                <p className="text-sm font-semibold text-gray-900">{selectedReport.buyerName}</p>
                                                <p className="text-xs text-gray-500">{selectedReport.buyerEmail}</p>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject</label>
                                                <p className="text-sm font-semibold text-gray-900">{selectedReport.subject}</p>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Description</label>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedReport.description}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</label>
                                                    <Badge variant="outline" className={`${getStatusColor(selectedReport.status)}`}>
                                                        {selectedReport.status.replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Priority</label>
                                                    <Badge variant="outline" className={`${getPriorityColor(selectedReport.priority)}`}>
                                                        {selectedReport.priority}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {selectedReport.orderId && (
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Related Order</label>
                                                    <button 
                                                        onClick={() => navigate(`/seller/orders`)}
                                                        className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1"
                                                    >
                                                        <Package size={14} />
                                                        View Order
                                                    </button>
                                                </div>
                                            )}

                                            <div className="pt-4 border-t border-gray-100">
                                                <p className="text-xs text-gray-500 text-center">
                                                    This report is being handled by BazaarX Support. 
                                                    Contact support if you need to provide additional information.
                                                </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-dashed p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                                        <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 mb-4">
                                            <AlertTriangle size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Select a report</h3>
                                        <p className="text-sm text-gray-500">Click on a report to view details</p>
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
