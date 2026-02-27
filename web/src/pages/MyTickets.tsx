import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Ticket,
    ChevronLeft,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    Filter,
    Loader2,
    RefreshCw
} from 'lucide-react';
import Header from '../components/Header';
import { BazaarFooter } from '../components/ui/bazaar-footer';
import { Badge } from "../components/ui/badge";
import { useSupportStore, type TicketStatus } from '../stores/supportStore';
import { useBuyerStore } from '../stores/buyerStore';



export default function MyTickets() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'All' | TicketStatus>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Get tickets from store
    const { tickets, loading, fetchUserTickets } = useSupportStore();
    const { profile } = useBuyerStore();

    // Fetch user's tickets on mount
    useEffect(() => {
        if (profile?.id) {
            fetchUserTickets(profile.id);
        }
    }, [profile?.id, fetchUserTickets]);

    // Reset to page 1 when tab or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    const filteredTickets = tickets.filter(ticket => {
        const matchesTab = activeTab === 'All' || ticket.status === activeTab;
        const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const totalItems = filteredTickets.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage);
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case 'Open': return 'bg-transparent text-orange-600 border-orange-200';
            case 'In Review': return 'bg-transparent text-blue-600 border-blue-200';
            case 'Resolved': return 'bg-transparent text-green-600 border-green-200';
            case 'Closed': return 'bg-transparent text-gray-400 border-gray-200';
            default: return 'bg-transparent text-gray-600';
        }
    };

    const getStatusIcon = (status: TicketStatus) => {
        switch (status) {
            case 'Open': return <AlertCircle size={14} />;
            case 'In Review': return <Clock size={14} />;
            case 'Resolved': return <CheckCircle2 size={14} />;
            case 'Closed': return <CheckCircle2 size={14} />;
        }
    };

    const tabs: ('All' | TicketStatus)[] = ['All', 'Open', 'In Review', 'Resolved', 'Closed'];

    return (
        <div className="min-h-screen bg-[var(--brand-wash)] font-[family-name:var(--font-sans)]">
            <Header />

            <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
                {/* Back Link */}
                <div className="w-full max-w-5xl mb-4">
                    <button
                        onClick={() => navigate('/buyer-support')}
                        className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors group"
                    >
                        <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        <span className="text-sm font-medium">Back</span>
                    </button>
                </div>

                {/* Main Card Container */}
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">

                    {/* Header */}
                    <div className="p-6 flex items-center justify-between border-b border-[var(--border)] relative">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 text-[var(--brand-primary)] flex items-center justify-center font-bold text-xl rounded-xl">
                                BX
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-gray-900">My Support Tickets</h1>
                                <p className="text-gray-500 text-xs">Track and manage your requests</p>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Notice Bar (Same as Help Center for consistency) */}
                    <div className="bg-red-50/50 px-6 py-3 flex items-start gap-3 border-b border-red-100">
                        <span className="text-red-500 text-sm mt-0.5">📢</span>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            <span className="font-bold text-gray-800">Support Update:</span> We are currently experiencing high ticket volumes. Response times may be up to 48 hours.
                        </p>
                    </div>

                    {/* Content Body */}
                    <div className="p-6">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
                            {/* Tabs */}
                            <div className="flex gap-4 overflow-x-auto scrollbar-hide no-scrollbar border-b border-gray-100 flex-1">
                                {tabs.map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-3 text-xs font-medium whitespace-nowrap transition-all relative
                                            ${activeTab === tab
                                                ? 'font-semibold text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)]'
                                                : 'text-gray-400 hover:text-gray-600 border-b border-transparent hover:border-gray-200'}`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            {/* Integrated Search */}
                            <div className="relative w-full md:max-w-xs group pb-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-[calc(50%+2px)] text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search tickets..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[var(--brand-primary)] focus:bg-white transition-all text-sm shadow-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Pagination Header */}
                        <div className="flex items-center justify-end gap-6 mb-4 px-1">
                            <div className="text-xs text-[var(--text-muted)]">
                                {totalItems > 0 ? (
                                    <>
                                        {startIndex + 1}-{endIndex} of {totalItems}
                                    </>
                                ) : (
                                    ""
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 text-gray-400 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="p-1.5 text-gray-400 hover:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/20 disabled:opacity-30 disabled:pointer-events-none transition-all"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Tickets List */}
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {paginatedTickets.length > 0 ? (
                                    paginatedTickets.map((ticket, index) => (
                                        <motion.div
                                            key={ticket.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                            className="p-4 rounded-xl border border-gray-50 shadow-sm hover:shadow-md transition-all group flex flex-col md:flex-row md:items-center gap-4 cursor-pointer"
                                        >
                                            <div className="w-8 h-8 flex items-center justify-center text-[var(--brand-primary)] flex-shrink-0 transition-colors">
                                                <Ticket size={20} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="text-[10px] font-black tracking-widest text-[var(--brand-primary-dark)] uppercase">{ticket.id}</span>
                                                    <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter gap-1 py-0 rounded-md border ${getStatusColor(ticket.status)}`}>
                                                        {getStatusIcon(ticket.status)}
                                                        {ticket.status}
                                                    </Badge>
                                                    <span className="text-[10px] text-gray-400 font-bold ml-auto md:ml-0">• {ticket.category.toUpperCase()}</span>
                                                </div>
                                                <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-[var(--brand-primary)] transition-colors">
                                                    {ticket.subject}
                                                </h3>
                                            </div>

                                            <div className="flex items-center justify-between md:flex-col md:items-end gap-1 pr-1">
                                                <div className="text-[10px] font-bold text-gray-400 tracking-wider">
                                                    {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
                                                </div>
                                                <ChevronRight size={18} className="text-gray-300 group-hover:text-[var(--brand-primary)] transition-colors" />
                                            </div>
                                        </motion.div>
                                    ))
                                ) : loading ? (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-gray-50/50 rounded-2xl p-12 flex flex-col items-center text-center border border-gray-100 border-dashed"
                                    >
                                        <Loader2 size={32} className="text-[var(--brand-primary)] animate-spin mb-4" />
                                        <p className="text-xs text-gray-400">Loading your tickets...</p>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-gray-50/50 rounded-2xl p-12 flex flex-col items-center text-center border border-gray-100 border-dashed"
                                    >
                                        <div className="w-16 h-16 flex items-center justify-center text-[var(--text-muted)]">
                                            <Ticket size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-[var(--text-headline)] mb-1">No tickets found</h3>
                                        <p className="text-xs text-[var(--text-muted)] max-w-xs">We couldn't find any tickets matching your criteria.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Help Footer Area */}
                        <div className="mt-10 pt-2 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 text-[var(--brand-primary)] flex items-center justify-center">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Need more help?</h4>
                                    <p className="text-xs text-gray-500">Our support team is 24/7 available.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/buyer-support')}
                                className="bg-[var(--brand-primary)] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[var(--brand-accent)] transition-all shadow-md shadow-orange-500/10 active:scale-95"
                            >
                                Start New Chat
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <BazaarFooter />
        </div>
    );
}
