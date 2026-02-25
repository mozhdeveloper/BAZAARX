import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Ticket,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    ChevronLeft,
    Loader2,
    RefreshCw,
    Send,
    MessageSquare
} from 'lucide-react';
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { Badge } from "../components/ui/badge";
import { useSupportStore, type TicketStatus, type SupportTicket } from '../stores/supportStore';
import { useAuthStore } from '@/stores/sellerStore';
import { cn } from '@/lib/utils';

export default function SellerMyTickets() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'All' | TicketStatus>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyText, setReplyText] = useState('');

    const { seller } = useAuthStore();
    const { tickets, loading, fetchUserTickets, addTicketReply } = useSupportStore();

    // Fetch user's tickets on mount
    useEffect(() => {
        if (seller?.id) {
            fetchUserTickets(seller.id);
        }
    }, [seller?.id, fetchUserTickets]);

    const handleRefresh = () => {
        if (seller?.id) {
            fetchUserTickets(seller.id);
        }
    };

    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedTicket || !seller?.id) return;

        await addTicketReply(selectedTicket.dbId || selectedTicket.id, {
            senderId: seller.id,
            senderName: seller.storeName || seller.ownerName || 'Seller',
            senderType: 'user',
            message: replyText
        });
        setReplyText('');
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesTab = activeTab === 'All' || ticket.status === activeTab;
        const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const getStatusColor = (status: TicketStatus) => {
        switch (status) {
            case 'Open': return 'bg-[var(--brand-wash)] text-[var(--brand-primary)] border-[var(--brand-accent-light)]';
            case 'In Review': return 'bg-blue-50 text-blue-500 border-blue-100';
            case 'Resolved': return 'bg-green-50 text-green-600 border-green-100';
            case 'Closed': return 'bg-gray-50 text-gray-500 border-gray-200';
            default: return 'bg-gray-50 text-gray-800';
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

    const tabs: { value: 'All' | TicketStatus; label: string }[] = [
        { value: 'All', label: 'All Tickets' },
        { value: 'Open', label: 'Open' },
        { value: 'In Review', label: 'In Review' },
        { value: 'Resolved', label: 'Resolved' },
        { value: 'Closed', label: 'Closed' },
    ];

    const getCount = (status: 'All' | TicketStatus) => {
        if (status === 'All') return tickets.length;
        return tickets.filter(t => t.status === status).length;
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
                                    <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight">My Support Tickets</h1>
                                    <p className="text-sm text-[var(--text-muted)] mt-1 -mb-2">Track and manage your support requests</p>
                                </div>
                                <button
                                    onClick={handleRefresh}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-gray-700 bg-white border border-[var(--brand-accent-light)] rounded-xl hover:bg-[var(--brand-wash)] hover:text-[var(--brand-primary)] hover:border-[var(--brand-accent-light)] transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                >
                                    {loading ? <Loader2 size={16} className="animate-spin text-[var(--brand-primary)]" /> : <RefreshCw size={16} />}
                                    Refresh List
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Ticket List */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[var(--brand-accent-light)] overflow-hidden">
                                    {/* Search & Tabs */}
                                    <div className="p-6 border-b border-gray-50">
                                        <div className="flex-1 w-full relative group mb-6">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[var(--brand-primary)] transition-colors h-4 w-4" />
                                            <input
                                                type="text"
                                                placeholder="Search by ID or subject..."
                                                className="w-full h-10 pl-10 pr-4 bg-white border border-[var(--brand-wash-gold)] shadow-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] transition-all text-sm placeholder:text-[var(--text-muted)]"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex-1 relative min-w-0">
                                            <div className="overflow-x-auto scrollbar-hide pb-0.5">
                                                <div className="inline-flex items-center p-1 bg-white rounded-full shadow-sm min-w-full md:min-w-max">
                                                    {tabs.map((tab) => (
                                                        <button
                                                            key={tab.value}
                                                            onClick={() => setActiveTab(tab.value)}
                                                            className={cn(
                                                                "px-4 py-1.5 rounded-full text-[11px] sm:text-xs whitespace-nowrap transition-all duration-300 flex items-center gap-1.5",
                                                                activeTab === tab.value
                                                                    ? "bg-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-primary)]/20"
                                                                    : "text-gray-500 hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)]/50",
                                                            )}
                                                        >
                                                            {tab.label}
                                                            <span className={cn("text-[10px]", activeTab === tab.value ? "text-white/90" : "text-gray-400")}>
                                                                ({getCount(tab.value)})
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tickets */}
                                    <div className="divide-y divide-gray-50">
                                        <AnimatePresence mode="popLayout">
                                            {loading ? (
                                                <div className="p-20 flex flex-col items-center justify-center">
                                                    <Loader2 size={40} className="text-[var(--brand-primary)] animate-spin mb-4 opacity-20" />
                                                    <p className="text-sm font-medium text-gray-400">Syncing tickets...</p>
                                                </div>
                                            ) : filteredTickets.length > 0 ? (
                                                filteredTickets.map((ticket, index) => (
                                                    <motion.div
                                                        key={ticket.id}
                                                        layout
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.98 }}
                                                        transition={{ duration: 0.2, delay: index * 0.03 }}
                                                        className={`p-5 hover:bg-[var(--brand-wash)]/30 transition-all group flex items-center gap-5 cursor-pointer border-l-4 ${selectedTicket?.id === ticket.id ? 'bg-[var(--brand-wash)]/50 border-[var(--brand-primary)]' : 'border-transparent'
                                                            }`}
                                                        onClick={() => setSelectedTicket(ticket)}
                                                    >
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all shadow-sm ${selectedTicket?.id === ticket.id
                                                            ? 'bg-[var(--brand-primary)] text-white shadow-[var(--brand-primary)]/20'
                                                            : 'bg-gray-50 text-gray-400 group-hover:bg-white group-hover:text-[var(--brand-primary)] group-hover:shadow-md'
                                                            }`}>
                                                            <Ticket size={24} />
                                                        </div>

                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span className="text-[10px] font-black tracking-widest text-[var(--brand-primary)] uppercase opacity-70 group-hover:opacity-100 transition-opacity">{ticket.id}</span>
                                                                <Badge variant="outline" className={`text-[9px] font-bold uppercase tracking-tight gap-1 py-0.5 px-2 rounded-lg border ${getStatusColor(ticket.status)}`}>
                                                                    {getStatusIcon(ticket.status)}
                                                                    {ticket.status}
                                                                </Badge>
                                                                <span className="text-[10px] text-gray-400 font-bold">• {ticket.category.toUpperCase()}</span>
                                                            </div>
                                                            <h3 className="text-[15px] font-extrabold text-[#1a1a1a] truncate group-hover:text-[var(--brand-primary)] transition-colors font-heading">
                                                                {ticket.subject}
                                                            </h3>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <div className="text-[10px] font-bold text-gray-400 tracking-wider">
                                                                {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                                                            </div>
                                                            <div className={`p-1.5 rounded-lg transition-colors ${selectedTicket?.id === ticket.id ? 'text-[var(--brand-primary)]' : 'text-gray-300 group-hover:text-[var(--brand-primary)]'}`}>
                                                                <ChevronRight size={20} />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="p-20 flex flex-col items-center text-center">
                                                    <div className="w-20 h-20 bg-[var(--brand-wash)] rounded-2xl flex items-center justify-center text-[var(--brand-primary)]/20 mb-6">
                                                        <Ticket size={40} />
                                                    </div>
                                                    <h3 className="text-xl font-black text-gray-900 mb-2 font-heading">No tickets found</h3>
                                                    <p className="text-sm text-gray-500 max-w-xs mx-auto">
                                                        {searchQuery ? "Try adjusting your search query, we couldn't find a match." : "Your support history is currently empty."}
                                                    </p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* Ticket Detail Panel */}
                            <div className="lg:col-span-1">
                                <AnimatePresence mode="wait">
                                    {selectedTicket ? (
                                        <motion.div
                                            key={selectedTicket.id}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[var(--brand-accent-light)] overflow-hidden sticky top-8"
                                        >
                                            <div className="p-5 border-b border-gray-50 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-[var(--brand-wash)] rounded-lg text-[var(--brand-primary)]">
                                                        <MessageSquare size={16} />
                                                    </div>
                                                    <h3 className="font-black text-gray-900 font-heading">Ticket Details</h3>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedTicket(null)}
                                                    className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors"
                                                >
                                                    ✕
                                                </button>
                                            </div>

                                            <div className="p-6 space-y-6">
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Reference ID</label>
                                                    <p className="text-sm font-black text-[var(--brand-primary)] font-heading">{selectedTicket.id}</p>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Subject</label>
                                                    <p className="text-sm font-extrabold text-gray-900 leading-snug">{selectedTicket.subject}</p>
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Original Inquiry</label>
                                                    <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">{selectedTicket.description}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Current Status</label>
                                                        <Badge variant="outline" className={`rounded-lg py-1 px-2.5 font-bold text-[10px] ${getStatusColor(selectedTicket.status)}`}>
                                                            {selectedTicket.status}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">Date Created</label>
                                                        <p className="text-sm text-gray-600 font-bold">{selectedTicket.createdAt}</p>
                                                    </div>
                                                </div>

                                                {/* Replies */}
                                                {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                                                    <div className="pt-4 border-t border-gray-50">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4">Conversation History</label>
                                                        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                                                            {selectedTicket.replies.map((reply) => (
                                                                <div
                                                                    key={reply.id}
                                                                    className={`p-4 rounded-xl text-sm ${reply.senderType === 'admin'
                                                                        ? 'bg-blue-50/30 border border-blue-100/50'
                                                                        : 'bg-[var(--brand-wash)]/30 border border-[var(--brand-accent-light)]/50'
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div className={`w-1.5 h-1.5 rounded-full ${reply.senderType === 'admin' ? 'bg-blue-500' : 'bg-[var(--brand-primary)]'}`} />
                                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                                                                            {reply.senderType === 'admin' ? 'Support Representative' : 'Your Response'}
                                                                        </p>
                                                                    </div>
                                                                    <p className="text-gray-700 font-medium leading-relaxed">{reply.message}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Reply Input */}
                                                {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                                                    <div className="pt-6 border-t border-gray-50">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Post a Reply</label>
                                                        <div className="relative group">
                                                            <textarea
                                                                placeholder="Type your message to support..."
                                                                className="w-full p-4 bg-gray-50/50 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:bg-white focus:border-[var(--brand-primary)] focus:ring-4 focus:ring-[var(--brand-primary)]/5 outline-none transition-all font-medium"
                                                                value={replyText}
                                                                onChange={(e) => setReplyText(e.target.value)}
                                                            />
                                                            <button
                                                                onClick={handleSendReply}
                                                                disabled={!replyText.trim()}
                                                                className="absolute right-3 bottom-3 w-10 h-10 bg-[var(--brand-primary)] text-white rounded-xl hover:bg-[var(--brand-primary-dark)] disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-[var(--brand-primary)]/20 flex items-center justify-center active:scale-90"
                                                            >
                                                                <Send size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-[var(--brand-accent-light)] border-dashed p-10 flex flex-col items-center justify-center text-center min-h-[400px]">
                                            <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 transition-transform hover:scale-110 duration-500 shadow-sm">
                                                <MessageSquare size={36} className="text-gray-200" />
                                            </div>
                                            <h3 className="text-xl font-black text-gray-900 mb-2 font-heading">Select a Ticket</h3>
                                            <p className="text-sm text-gray-400 max-w-[200px] leading-relaxed mx-auto">Click on any ticket from the list to view its details and message history</p>
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
