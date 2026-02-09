import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Ticket,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    Filter,
    ArrowLeft
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

    // Get tickets from store and filter by current buyer
    const { getTicketsByBuyer, tickets } = useSupportStore();
    const { profile } = useBuyerStore();

    // Get buyer's tickets or show all if no profile
    const buyerTickets = profile?.email ? getTicketsByBuyer(profile.email) : tickets;

    const filteredTickets = buyerTickets.filter(ticket => {
        const matchesTab = activeTab === 'All' || ticket.status === activeTab;
        const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case 'Open': return 'bg-orange-100 text-orange-600 border-orange-200';
            case 'In Review': return 'bg-blue-100 text-blue-600 border-blue-200';
            case 'Resolved': return 'bg-green-100 text-green-600 border-green-200';
            case 'Closed': return 'bg-gray-100 text-gray-500 border-gray-200';
            default: return 'bg-gray-100 text-gray-800';
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
        <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-sans)]">
            <Header />

            <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
                {/* Back Link */}
                <div className="w-full max-w-5xl mb-4">
                    <button
                        onClick={() => navigate('/buyer-support')}
                        className="flex items-center gap-2 text-gray-500 hover:text-[var(--brand-primary)] transition-colors group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Help Center</span>
                    </button>
                </div>

                {/* Main Card Container */}
                <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">

                    {/* Header */}
                    <div className="p-6 flex items-center justify-between border-b border-[var(--border)] relative">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#FF4500] text-white flex items-center justify-center font-bold text-xl rounded-xl shadow-sm">
                                BX
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-gray-900">My Support Tickets</h1>
                                <p className="text-gray-500 text-xs">Track and manage your requests</p>
                            </div>
                        </div>

                        <div className="relative hidden md:block flex-1 max-w-xl mx-4">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search ID or Subject..."
                                className="w-full pl-11 pr-12 py-2.5 bg-gray-50 border-2 border-transparent focus:border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all text-sm shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
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
                        {/* Mobile Search */}
                        <div className="relative md:hidden mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search ID or Subject..."
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent focus:border-gray-300 rounded-lg text-sm shadow-inner focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all placeholder-gray-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide no-scrollbar mb-6 border-b border-gray-50">
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border
                                        ${activeTab === tab
                                            ? 'bg-orange-50 text-[var(--brand-primary)] border-[#FF4500]/20 shadow-sm'
                                            : 'bg-white text-gray-400 hover:text-gray-600 border-transparent hover:bg-gray-50'}`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Tickets List */}
                        <div className="space-y-3">
                            <AnimatePresence mode="popLayout">
                                {filteredTickets.length > 0 ? (
                                    filteredTickets.map((ticket, index) => (
                                        <motion.div
                                            key={ticket.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.98 }}
                                            transition={{ duration: 0.2, delay: index * 0.03 }}
                                            className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md hover:border-[var(--brand-primary)]/20 transition-all group flex flex-col md:flex-row md:items-center gap-4 cursor-pointer"
                                        >
                                            <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-[var(--brand-primary)] flex-shrink-0 group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-colors">
                                                <Ticket size={20} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                    <span className="text-[10px] font-black tracking-widest text-[#FF4500] uppercase">{ticket.id}</span>
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
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-gray-50/50 rounded-2xl p-12 flex flex-col items-center text-center border border-gray-100 border-dashed"
                                    >
                                        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-200 mb-4">
                                            <Ticket size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">No tickets found</h3>
                                        <p className="text-xs text-gray-400 max-w-xs">We couldn't find any tickets matching your criteria.</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Help Footer Area */}
                        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-[var(--brand-primary)]">
                                    <AlertCircle size={20} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900">Need more help?</h4>
                                    <p className="text-xs text-gray-500">Our support team is 24/7 available.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate('/buyer-support')}
                                className="bg-[var(--brand-primary)] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[var(--brand-primary-dark)] transition-all shadow-md shadow-orange-500/10 active:scale-95"
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
