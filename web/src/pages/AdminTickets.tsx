import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ticket,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    Filter,
    MessageSquare,
    MoreHorizontal,
    User,
    ArrowLeft,
    Send
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";

type TicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Closed';

interface SupportTicket {
    id: string;
    buyerName: string;
    email: string;
    subject: string;
    description: string;
    status: TicketStatus;
    createdAt: string;
    category: string;
}

const mockTickets: SupportTicket[] = [
    {
        id: 'BX-10234',
        buyerName: 'Michaela Bandasan',
        email: 'michaela@example.com',
        subject: 'Damaged Item on Delivery',
        description: 'The item arrived with a broken screen. I need a replacement.',
        status: 'Open',
        createdAt: '2026-02-06',
        category: 'Returns'
    },
    {
        id: 'BX-10192',
        buyerName: 'John Doe',
        email: 'john@example.com',
        subject: 'Missing Refund for Order #4492',
        description: 'My order was cancelled last week but I haven\'t seen the refund yet.',
        status: 'In Review',
        createdAt: '2026-02-01',
        category: 'Payment'
    },
    {
        id: 'BX-09845',
        buyerName: 'Sarah Smith',
        email: 'sarah@example.com',
        subject: 'Wrong Item Received',
        description: 'Received a blue shirt instead of the red one I ordered.',
        status: 'Resolved',
        createdAt: '2026-01-25',
        category: 'Order Issue'
    },
    {
        id: 'BX-08211',
        buyerName: 'Robert Wilson',
        email: 'robert@example.com',
        subject: 'Shipping Query',
        description: 'How can I change my delivery address after ordering?',
        status: 'Closed',
        createdAt: '2026-01-15',
        category: 'Shipping'
    }
];

export default function AdminTickets() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'All' | TicketStatus>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [replyText, setReplyText] = useState('');

    const filteredTickets = mockTickets.filter(ticket => {
        const matchesTab = activeTab === 'All' || ticket.status === activeTab;
        const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    const stats = {
        total: mockTickets.length,
        open: mockTickets.filter(t => t.status === 'Open').length,
        pending: mockTickets.filter(t => t.status === 'In Review').length,
        resolved: mockTickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length
    };

    const getStatusStyle = (status: TicketStatus) => {
        switch (status) {
            case 'Open': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'In Review': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'Resolved': return 'bg-green-100 text-green-700 border-green-200';
            case 'Closed': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    const tabs: ('All' | TicketStatus)[] = ['All', 'Open', 'In Review', 'Resolved', 'Closed'];

    return (
        <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden font-[family-name:var(--font-sans)]">
            <AdminSidebar open={open} setOpen={setOpen} />

            <main className="flex-1 overflow-auto">
                <div className="p-8">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Support Tickets</h1>
                            <p className="text-gray-500 mt-1">Manage and resolve buyer requests</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search ID, name, or subject..."
                                    className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm w-full md:w-80 shadow-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 text-[var(--text-primary)]">
                        <StatCard label="Total Tickets" value={stats.total} icon={<Ticket size={24} />} color="blue" />
                        <StatCard label="Open" value={stats.open} icon={<AlertCircle size={24} />} color="orange" />
                        <StatCard label="In Review" value={stats.pending} icon={<Clock size={24} />} color="purple" />
                        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 size={24} />} color="green" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Ticket List */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card className="shadow-sm border-gray-100 rounded-2xl overflow-hidden">
                                <CardHeader className="border-b border-gray-50 bg-white py-4">
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                                        {tabs.map(tab => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all
                                                    ${activeTab === tab
                                                        ? 'bg-orange-50 text-orange-600 shadow-sm border border-orange-100'
                                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border border-transparent'}`}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="divide-y divide-gray-50">
                                        <AnimatePresence mode="popLayout">
                                            {filteredTickets.map((ticket) => (
                                                <motion.div
                                                    key={ticket.id}
                                                    layout
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center gap-4 ${selectedTicket?.id === ticket.id ? 'bg-orange-50/30' : ''}`}
                                                    onClick={() => setSelectedTicket(ticket)}
                                                >
                                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-orange-500 transition-all shadow-sm">
                                                        <User size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[10px] font-black tracking-widest text-orange-600 uppercase">{ticket.id}</span>
                                                            <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter py-0 rounded-md border ${getStatusStyle(ticket.status)}`}>
                                                                {ticket.status}
                                                            </Badge>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-gray-900 truncate">{ticket.subject}</h3>
                                                        <p className="text-xs text-gray-500">{ticket.buyerName} • {ticket.category}</p>
                                                    </div>
                                                    <div className="text-right flex flex-col items-end">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                                            {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </span>
                                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Ticket Detail area */}
                        <div className="lg:col-span-1">
                            <AnimatePresence mode="wait">
                                {selectedTicket ? (
                                    <motion.div
                                        key={selectedTicket.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Card className="shadow-sm border-gray-100 rounded-2xl h-[calc(100vh-250px)] flex flex-col">
                                            <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-base font-bold text-gray-900 truncate mr-2">
                                                    Ticket Detail
                                                </CardTitle>
                                                <button
                                                    onClick={() => setSelectedTicket(null)}
                                                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                                                >
                                                    <ArrowLeft size={18} />
                                                </button>
                                            </CardHeader>
                                            <CardContent className="flex-1 overflow-auto p-6 space-y-6 scrollbar-hide">
                                                <div className="space-y-4 text-[var(--text-primary)]">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Buyer Details</label>
                                                        <p className="text-sm font-bold text-gray-900">{selectedTicket.buyerName}</p>
                                                        <p className="text-xs text-gray-500">{selectedTicket.email}</p>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject</label>
                                                        <p className="text-sm font-bold text-gray-900">{selectedTicket.subject}</p>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Message</label>
                                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-4">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Internal Status Update</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <StatusUpdateButton status="In Review" active={selectedTicket.status === 'In Review'} />
                                                        <StatusUpdateButton status="Resolved" active={selectedTicket.status === 'Resolved'} />
                                                    </div>
                                                </div>
                                            </CardContent>
                                            <div className="p-4 border-t border-gray-50 bg-gray-50/50 rounded-b-2xl">
                                                <div className="relative">
                                                    <textarea
                                                        placeholder="Write a response..."
                                                        className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all outline-none resize-none h-24"
                                                        value={replyText}
                                                        onChange={(e) => setReplyText(e.target.value)}
                                                    />
                                                    <button className="absolute right-3 bottom-3 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-sm active:scale-95 disabled:opacity-50" disabled={!replyText}>
                                                        <Send size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                ) : (
                                    <div className="h-[calc(100vh-250px)] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-gray-100 border-dashed">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-200 mb-4">
                                            <MessageSquare size={32} />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">Select a ticket</h3>
                                        <p className="text-sm text-gray-400">Click on a ticket to view details and send a response.</p>
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

const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600',
        orange: 'bg-orange-50 text-orange-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600'
    };
    return (
        <Card className="shadow-sm border-gray-100 hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4 text-[var(--text-primary)]">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors[color]}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
};

const StatusUpdateButton = ({ status, active }: { status: string, active: boolean }) => (
    <button className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
        {status}
    </button>
);
