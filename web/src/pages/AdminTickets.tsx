import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ticket,
    ChevronRight,
    ChevronLeft,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    MessageSquare,
    User,
    ArrowLeft,
    Send,
    RefreshCw,
    Shield,
    Loader2,
    Store
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSupportStore, type TicketStatus } from '../stores/supportStore';



export default function AdminTickets() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [replyText, setReplyText] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;
    const filterRowRef = useRef<HTMLDivElement>(null);

    // Get tickets from store
    const { tickets, loading, error, updateTicketStatus, fetchAllTickets, addTicketReply } = useSupportStore();

    // Fetch tickets on mount
    useEffect(() => {
        fetchAllTickets();
    }, [fetchAllTickets]);

    // Handle refresh
    const handleRefresh = () => {
        fetchAllTickets();
    };

    // Handle reply submission
    const handleSendReply = async () => {
        if (!replyText.trim() || !selectedTicket) return;

        await addTicketReply(selectedTicket.dbId || selectedTicket.id, {
            senderId: 'admin',
            senderName: 'Admin',
            senderType: 'admin',
            message: replyText
        });
        setReplyText('');
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesTab = activeTab === 'all' || ticket.status.toLowerCase().replace(' ', '') === activeTab;
        const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

    // Reset to page 1 when filter/search changes
    useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);

    // Scroll to filter row on page change
    useEffect(() => {
        filterRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [currentPage]);

    const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
    const paginatedTickets = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'Open').length,
        pending: tickets.filter(t => t.status === 'In Review').length,
        resolved: tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length
    };

    const getStatusStyle = (status: TicketStatus) => {
        switch (status) {
            case 'Open': return 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20';
            case 'In Review': return 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20';
            case 'Resolved': return 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20';
            case 'Closed': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden font-[family-name:var(--font-sans)]">
            <AdminSidebar open={open} setOpen={setOpen} />

            <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto px-8 py-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 text-[var(--font-sans)]">
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-headline)] mb-2">Support Tickets</h1>
                            <p className="text-[var(--text-muted)]">Review and manage buyer support requests</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={loading}
                                className="flex items-center gap-2"
                            >
                                {loading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                {loading ? 'Loading...' : 'Refresh'}
                            </Button>
                            <Badge className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)]/20">
                                {stats.open} Open Tickets
                            </Badge>
                            <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-xl flex items-center justify-center shadow-lg">
                                <Shield className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard label="Total Tickets" value={stats.total} icon={<Ticket className="w-6 h-6" />} color="blue" />
                        <StatCard label="Open" value={stats.open} icon={<AlertCircle className="w-6 h-6" />} color="orange" />
                        <StatCard label="In Review" value={stats.pending} icon={<Clock className="w-6 h-6" />} color="orange" />
                        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="w-6 h-6" />} color="orange" />
                    </div>

                    {/* Filter row: pill tabs + search */}
                    <div ref={filterRowRef} className="flex items-center justify-between gap-6 mb-6 scroll-mt-6">
                        <div className="bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-full p-0.5">
                            <div className="flex items-center gap-0.5">
                                {[
                                    { id: 'all', label: 'All', count: tickets.length },
                                    { id: 'open', label: 'Open', count: stats.open },
                                    { id: 'inreview', label: 'In Review', count: stats.pending },
                                    { id: 'resolved', label: 'Resolved', count: stats.resolved },
                                    { id: 'closed', label: 'Closed', count: tickets.filter(t => t.status === 'Closed').length },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`relative px-4 h-7 text-xs font-medium transition-all duration-300 rounded-full flex items-center gap-1.5 whitespace-nowrap z-10 ${activeTab === tab.id ? 'text-white' : 'text-gray-500 hover:text-[var(--brand-primary)]'
                                            }`}
                                    >
                                        {tab.label}
                                        <span className={`text-[10px] font-normal ${activeTab === tab.id ? 'text-white/80' : 'text-[var(--text-muted)]/60'}`}>
                                            ({tab.count})
                                        </span>
                                        {activeTab === tab.id && (
                                            <motion.div
                                                layoutId="ticketTabPill"
                                                className="absolute inset-0 bg-[var(--brand-primary)] rounded-full -z-10"
                                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative w-[320px] group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--brand-primary)]" />
                            <Input
                                placeholder="Search by ID, name, or subject..."
                                className="pl-10 h-9 bg-white border-gray-200 rounded-xl shadow-sm focus:border-[var(--brand-primary)] focus:ring-0 placeholder:text-gray-400 text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Ticket List */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card className="shadow-sm border-gray-100 rounded-xl overflow-hidden">
                                <CardContent className="p-0">
                                    <div className="divide-y divide-gray-50 text-[var(--font-sans)]">
                                        <AnimatePresence mode="popLayout">
                                            {paginatedTickets.length > 0 ? (
                                                paginatedTickets.map((ticket) => (
                                                    <motion.div
                                                        key={ticket.id}
                                                        layout
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        exit={{ opacity: 0 }}
                                                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group flex items-center gap-4 ${selectedTicket?.id === ticket.id ? 'bg-[var(--brand-primary)]/5' : ''}`}
                                                        onClick={() => setSelectedTicket(ticket)}
                                                    >
                                                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-[var(--brand-primary)] transition-all shadow-sm">
                                                            <User size={20} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] font-bold text-[var(--brand-primary)] uppercase">{ticket.id}</span>
                                                                <Badge variant="outline" className={`text-[9px] uppercase tracking-tighter py-0 rounded-md border ${getStatusStyle(ticket.status)}`}>
                                                                    {ticket.status}
                                                                </Badge>
                                                            </div>
                                                            <h3 className="text-sm font-semibold text-gray-900 truncate">{ticket.subject}</h3>
                                                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                <span>{ticket.buyerName}</span>
                                                                <span>•</span>
                                                                <span>{ticket.category}</span>
                                                                {ticket.sellerStoreName && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <Store size={12} className="text-[var(--brand-primary)]" />
                                                                        <span className="text-[var(--brand-primary)] font-medium">{ticket.sellerStoreName}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="text-right flex flex-col items-end">
                                                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1">
                                                                {new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                            <ChevronRight size={16} className="text-gray-300 group-hover:text-[var(--brand-primary)] transition-colors" />
                                                        </div>
                                                    </motion.div>
                                                ))
                                            ) : (
                                                <div className="p-12 text-center">
                                                    <Ticket className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                                                    <h3 className="text-lg font-medium text-gray-900 mb-1">No tickets found</h3>
                                                    <p className="text-sm text-gray-500">Try adjusting your search or filters.</p>
                                                </div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    {/* Pagination footer */}
                                    {filteredTickets.length > PAGE_SIZE && (
                                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50">
                                            <span className="text-xs text-gray-400">
                                                {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredTickets.length)} of {filteredTickets.length}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <ChevronLeft size={14} />
                                                </button>
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <button
                                                        key={page}
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`w-7 h-7 text-xs rounded-lg transition-colors ${page === currentPage
                                                            ? 'bg-[var(--brand-primary)] text-white font-semibold'
                                                            : 'text-gray-500 hover:bg-gray-100'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                ))}
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                                        <Card className="shadow-sm border-gray-100 rounded-xl flex flex-col">
                                            <CardHeader className="border-b border-gray-50 flex flex-row items-center justify-between py-4">
                                                <CardTitle className="text-base font-semibold text-gray-900 truncate mr-2">
                                                    Ticket Detail
                                                </CardTitle>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setSelectedTicket(null)}
                                                    className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-transparent"
                                                >
                                                    <ArrowLeft size={18} />
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="flex-1 p-6 space-y-4">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Buyer Details</label>
                                                        <p className="text-sm font-semibold text-gray-900">{selectedTicket.buyerName}</p>
                                                        <p className="text-xs text-gray-500">{selectedTicket.email}</p>
                                                    </div>

                                                    {selectedTicket.sellerStoreName && (
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">About Store</label>
                                                            <div className="flex items-center gap-2 bg-orange-50 p-3 rounded-lg border border-orange-200">
                                                                <Store size={16} className="text-[var(--brand-primary)]" />
                                                                <p className="text-sm font-semibold text-gray-900">{selectedTicket.sellerStoreName}</p>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Subject</label>
                                                        <p className="text-sm font-semibold text-gray-900">{selectedTicket.subject}</p>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Message</label>
                                                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTicket.description}</p>
                                                        </div>
                                                    </div>
                                                </div>


                                                {/* Write Response Section */}
                                                <div className="pt-4 border-t border-gray-50">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Write a Response</label>
                                                    <div className="relative">
                                                        <textarea
                                                            placeholder={selectedTicket.status === 'Resolved' ? 'Ticket is resolved' : 'Write a response...'}
                                                            className="w-full pl-4 pr-12 py-3 bg-white border border-[var(--brand-primary)]/20 rounded-lg text-sm shadow-sm focus:ring-0 focus:border-[var(--brand-primary)] transition-all outline-none resize-none h-24 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            disabled={selectedTicket.status === 'Resolved'}
                                                        />
                                                        <Button
                                                            size="icon"
                                                            className="absolute right-3 bottom-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-sm h-8 w-8 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            disabled={!replyText || selectedTicket.status === 'Resolved'}
                                                            onClick={handleSendReply}
                                                        >
                                                            <Send size={16} />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Status Update Section */}
                                                <div className="pt-4 border-t border-gray-50">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-3">Internal Status Update</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <StatusUpdateButton
                                                            status="In Review"
                                                            active={selectedTicket.status === 'In Review'}
                                                            onClick={() => {
                                                                updateTicketStatus(selectedTicket.id, 'In Review');
                                                                setSelectedTicket({ ...selectedTicket, status: 'In Review' });
                                                            }}
                                                        />
                                                        <StatusUpdateButton
                                                            status="Resolved"
                                                            active={selectedTicket.status === 'Resolved'}
                                                            onClick={() => {
                                                                updateTicketStatus(selectedTicket.id, 'Resolved');
                                                                setSelectedTicket({ ...selectedTicket, status: 'Resolved' });
                                                                alert(`Notification sent to ${selectedTicket.buyerName}: Your ticket #${selectedTicket.id} has been resolved!`);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </motion.div>
                                ) : (
                                    <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-gray-100 border-dashed">
                                        <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center text-gray-300 mb-4">
                                            <MessageSquare size={32} />
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">Select a ticket</h3>
                                        <p className="text-sm text-gray-500">Click on a ticket to view details and send a response.</p>
                                    </div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
}

const StatCard = ({ label, value, icon }: { label: string, value: number, icon: React.ReactNode, color: string }) => {
    return (
        <Card className="border-none shadow-md hover:shadow-[0_20px_40px_rgba(229,140,26,0.1)] transition-all duration-300 rounded-xl bg-white overflow-hidden group relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-50 to-orange-100/50 rounded-full blur-2xl -mr-10 -mt-10 group-hover:opacity-80 transition-opacity" />
            <CardContent className="p-6 relative z-10">
                <div className="flex flex-col gap-4">
                    <div className="text-gray-400 group-hover:text-[var(--brand-primary)] transition-colors">
                        {icon}
                    </div>
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-400">{label}</p>
                        <p className="text-xl font-bold text-gray-900 group-hover:text-[var(--brand-primary)] transition-colors">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const StatusUpdateButton = ({ status, active, onClick }: { status: string, active: boolean, onClick?: () => void }) => {
    const baseStyles = "w-full font-bold text-sm transition-all duration-200 h-11 rounded-lg";

    return (
        <Button
            variant={active ? 'default' : 'outline'}
            size="default"
            onClick={onClick}
            className={`${baseStyles} ${active
                ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white hover:bg-white hover:text-[var(--brand-primary)] focus:bg-white focus:text-[var(--brand-primary)] shadow-sm'
                : 'text-[var(--brand-primary)] border-gray-200 hover:bg-[var(--brand-primary)]/5 hover:text-[var(--brand-primary)] focus:bg-[var(--brand-primary)]/5 focus:text-[var(--brand-primary)] hover:border-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)]/30'
                }`}
        >
            {status}
        </Button>
    );
};
