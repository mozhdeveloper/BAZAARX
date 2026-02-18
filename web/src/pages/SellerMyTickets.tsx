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
    ArrowLeft,
    Loader2,
    RefreshCw,
    Send,
    MessageSquare
} from 'lucide-react';
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { Badge } from "../components/ui/badge";
import { useSupportStore, type TicketStatus, type SupportTicket } from '../stores/supportStore';
import { useAuthStore } from '@/stores/sellerStore';



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
        <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden font-[family-name:var(--font-sans)]">
            <SellerSidebar />

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
                                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">My Support Tickets</h1>
                                <p className="text-gray-500 text-sm">Track and manage your support requests</p>
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

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Ticket List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Search & Tabs */}
                                <div className="p-4 border-b border-gray-100">
                                    <div className="relative mb-4">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search by ID or subject..."
                                            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-transparent focus:border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                                        {tabs.map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border
                                                    ${activeTab === tab
                                                        ? 'bg-orange-50 text-orange-500 border-orange-200 shadow-sm'
                                                        : 'bg-white text-gray-400 hover:text-gray-600 border-transparent hover:bg-gray-50'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tickets */}
                                <div className="divide-y divide-gray-50">
                                    <AnimatePresence mode="popLayout">
                                        {loading ? (
                                            <div className="p-12 flex flex-col items-center justify-center">
                                                <Loader2 size={32} className="text-orange-500 animate-spin mb-4" />
                                                <p className="text-sm text-gray-400">Loading tickets...</p>
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
                                                    className={`p-4 hover:bg-gray-50 transition-all group flex items-center gap-4 cursor-pointer ${selectedTicket?.id === ticket.id ? 'bg-orange-50' : ''
                                                        }`}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                >
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${selectedTicket?.id === ticket.id
                                                            ? 'bg-orange-500 text-white'
                                                            : 'bg-orange-50 text-orange-500 group-hover:bg-orange-500 group-hover:text-white'
                                                        }`}>
                                                        <Ticket size={20} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                            <span className="text-[10px] font-black tracking-widest text-orange-500 uppercase">{ticket.id}</span>
                                                            <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter gap-1 py-0 rounded-md border ${getStatusColor(ticket.status)}`}>
                                                                {getStatusIcon(ticket.status)}
                                                                {ticket.status}
                                                            </Badge>
                                                            <span className="text-[10px] text-gray-400 font-bold">• {ticket.category.toUpperCase()}</span>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-gray-900 truncate group-hover:text-orange-500 transition-colors">
                                                            {ticket.subject}
                                                        </h3>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="text-[10px] font-bold text-gray-400 tracking-wider">
                                                            {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()}
                                                        </div>
                                                        <ChevronRight size={18} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                                                    </div>
                                                </motion.div>
                                            ))
                                        ) : (
                                            <div className="p-12 flex flex-col items-center text-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-300 mb-4">
                                                    <Ticket size={32} />
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-1">No tickets found</h3>
                                                <p className="text-xs text-gray-400 max-w-xs">
                                                    {searchQuery ? "Try adjusting your search criteria" : "You haven't submitted any tickets yet"}
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
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-8"
                                    >
                                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-900">Ticket Details</h3>
                                            <button
                                                onClick={() => setSelectedTicket(null)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"
                                            >
                                                ✕
                                            </button>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Ticket ID</label>
                                                <p className="text-sm font-bold text-orange-500">{selectedTicket.id}</p>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject</label>
                                                <p className="text-sm font-semibold text-gray-900">{selectedTicket.subject}</p>
                                            </div>

                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Description</label>
                                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</label>
                                                    <Badge variant="outline" className={`${getStatusColor(selectedTicket.status)}`}>
                                                        {selectedTicket.status}
                                                    </Badge>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Created</label>
                                                    <p className="text-sm text-gray-600">{selectedTicket.createdAt}</p>
                                                </div>
                                            </div>

                                            {/* Replies */}
                                            {selectedTicket.replies && selectedTicket.replies.length > 0 && (
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Conversation</label>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                                        {selectedTicket.replies.map((reply) => (
                                                            <div
                                                                key={reply.id}
                                                                className={`p-3 rounded-lg text-sm ${reply.senderType === 'admin'
                                                                        ? 'bg-blue-50 border border-blue-100'
                                                                        : 'bg-gray-50 border border-gray-100'
                                                                    }`}
                                                            >
                                                                <p className="text-[10px] font-bold text-gray-500 mb-1">
                                                                    {reply.senderType === 'admin' ? '👨‍💼 Support' : '🏪 You'}
                                                                </p>
                                                                <p className="text-gray-700">{reply.message}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Reply Input */}
                                            {selectedTicket.status !== 'Resolved' && selectedTicket.status !== 'Closed' && (
                                                <div className="pt-4 border-t border-gray-100">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Add Reply</label>
                                                    <div className="relative">
                                                        <textarea
                                                            placeholder="Type your message..."
                                                            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none h-20 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                        />
                                                        <button
                                                            onClick={handleSendReply}
                                                            disabled={!replyText.trim()}
                                                            className="absolute right-2 bottom-2 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <Send size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 border-dashed p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                                        <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 mb-4">
                                            <MessageSquare size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Select a ticket</h3>
                                        <p className="text-sm text-gray-500">Click on a ticket to view details</p>
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
