import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Ticket,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Search,
    MessageSquare,
    User,
    ArrowLeft,
    Send,
    RefreshCw,
    Shield
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

    // Get tickets from store
    const { tickets, updateTicketStatus } = useSupportStore();

    const filteredTickets = tickets.filter(ticket => {
        const matchesTab = activeTab === 'all' || ticket.status.toLowerCase().replace(' ', '') === activeTab;
        const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ticket.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesTab && matchesSearch;
    });

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
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Support Tickets</h1>
                            <p className="text-gray-600">Review and manage buyer support requests</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { }}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Refresh
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

                    {/* Search */}
                    <Card className="mb-6 shadow-sm">
                        <CardContent className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Search by ID, name, or subject..."
                                    className="pl-10 h-10 border-gray-200 focus:border-[var(--brand-primary)] focus:ring-[var(--brand-primary)]/10"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Ticket List */}
                        <div className="lg:col-span-2 space-y-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-5 lg:w-auto mb-6">
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="open">Open</TabsTrigger>
                                    <TabsTrigger value="inreview">In Review</TabsTrigger>
                                    <TabsTrigger value="resolved">Resolved</TabsTrigger>
                                    <TabsTrigger value="closed">Closed</TabsTrigger>
                                </TabsList>

                                <Card className="shadow-sm border-gray-100 rounded-xl overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="divide-y divide-gray-50 text-[var(--font-sans)]">
                                            <AnimatePresence mode="popLayout">
                                                {filteredTickets.length > 0 ? (
                                                    filteredTickets.map((ticket) => (
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
                                                                <p className="text-xs text-gray-500">{ticket.buyerName} • {ticket.category}</p>
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
                                    </CardContent>
                                </Card>
                            </Tabs>
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
                                                    className="h-8 w-8 text-gray-400"
                                                >
                                                    <ArrowLeft size={18} />
                                                </Button>
                                            </CardHeader>
                                            <CardContent className="flex-1 p-6 space-y-6">
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Buyer Details</label>
                                                        <p className="text-sm font-semibold text-gray-900">{selectedTicket.buyerName}</p>
                                                        <p className="text-xs text-gray-500">{selectedTicket.email}</p>
                                                    </div>

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
                                                            className="w-full pl-4 pr-12 py-3 bg-white border border-[var(--brand-primary)]/20 rounded-lg text-sm shadow-sm focus:ring-2 focus:border-[var(--brand-primary)] transition-all outline-none resize-none h-24 disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400"
                                                            value={replyText}
                                                            onChange={(e) => setReplyText(e.target.value)}
                                                            disabled={selectedTicket.status === 'Resolved'}
                                                        />
                                                        <Button
                                                            size="icon"
                                                            className="absolute right-3 bottom-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white shadow-sm h-8 w-8 disabled:opacity-50 disabled:cursor-not-allowed"
                                                            disabled={!replyText || selectedTicket.status === 'Resolved'}
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
            </main>
        </div>
    );
}

const StatCard = ({ label, value, icon, color }: { label: string, value: number, icon: React.ReactNode, color: string }) => {
    const cardStyles: any = {
        blue: { bg: 'bg-[var(--brand-accent)]/10', text: 'text-[var(--brand-accent)]' },
        orange: { bg: 'bg-[var(--brand-primary)]/10', text: 'text-[var(--brand-primary)]' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-700' },
        green: { bg: 'bg-[var(--brand-primary)]/10', text: 'text-[var(--brand-primary)]' }
    };

    return (
        <Card className="relative overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                            {label}
                        </p>
                        <p className="text-2xl font-bold text-gray-900">
                            {value}
                        </p>
                    </div>
                    <div className={`w-12 h-12 ${cardStyles[color].bg} rounded-xl flex items-center justify-center`}>
                        <div className={`${cardStyles[color].text}`}>
                            {icon}
                        </div>
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
