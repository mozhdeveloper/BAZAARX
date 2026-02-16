import { create } from 'zustand';
import { ticketService, DbTicket, TicketCategory } from '../services/ticketService';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type TicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Closed';

// Status mapping between DB and UI
const dbStatusToUI = (status: string): TicketStatus => {
    switch (status) {
        case 'open': return 'Open';
        case 'in_progress':
        case 'waiting_response': return 'In Review';
        case 'resolved': return 'Resolved';
        case 'closed': return 'Closed';
        default: return 'Open';
    }
};

const uiStatusToDb = (status: TicketStatus): DbTicket['status'] => {
    switch (status) {
        case 'Open': return 'open';
        case 'In Review': return 'in_progress';
        case 'Resolved': return 'resolved';
        case 'Closed': return 'closed';
        default: return 'open';
    }
};

export interface SupportTicket {
    id: string;
    dbId: string;
    buyerName: string;
    buyerId: string;
    email: string;
    subject: string;
    description: string;
    status: TicketStatus;
    createdAt: string;
    category: string;
    categoryId?: string;
    priority: string;
    orderId?: string;
    sellerId?: string;
    sellerStoreName?: string;
    assignedTo?: string;
    replies: TicketReply[];
}

export interface TicketReply {
    id: string;
    ticketId: string;
    senderId: string;
    senderName: string;
    senderType: 'user' | 'admin';
    message: string;
    timestamp: string;
    isInternalNote?: boolean;
}

interface SupportStore {
    tickets: SupportTicket[];
    categories: TicketCategory[];
    loading: boolean;
    error: string | null;
    
    // Data fetching
    fetchAllTickets: () => Promise<void>;
    fetchUserTickets: (userId: string) => Promise<void>;
    fetchCategories: () => Promise<void>;
    
    // Actions
    submitTicket: (ticket: {
        userId: string;
        userName: string;
        userEmail: string;
        subject: string;
        description: string;
        categoryId?: string;
        categoryName?: string;
        priority?: string;
        orderId?: string;
        sellerId?: string;
        sellerStoreName?: string;
    }) => Promise<string | null>;
    
    updateTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
    addTicketReply: (ticketId: string, reply: {
        senderId: string;
        senderName: string;
        senderType: 'user' | 'admin';
        message: string;
        isInternalNote?: boolean;
    }) => Promise<void>;
    
    // Getters
    getTicketsByBuyer: (buyerEmail: string) => SupportTicket[];
    getTicketById: (ticketId: string) => SupportTicket | undefined;
}

// Generate unique display ticket ID
const generateTicketId = (): string => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `BX-${num}`;
};

// Map DB ticket to UI ticket
const mapDbTicketToUI = (dbTicket: DbTicket): SupportTicket => {
    const userName = [dbTicket.user?.first_name, dbTicket.user?.last_name]
        .filter(Boolean)
        .join(' ') || 'Unknown User';
    
    return {
        id: generateTicketId(), // Display ID
        dbId: dbTicket.id,
        buyerName: userName,
        buyerId: dbTicket.user_id,
        email: dbTicket.user?.email || '',
        subject: dbTicket.subject,
        description: dbTicket.description,
        status: dbStatusToUI(dbTicket.status),
        createdAt: new Date(dbTicket.created_at).toISOString().split('T')[0],
        category: dbTicket.category?.name || 'General',
        categoryId: dbTicket.category_id || undefined,
        priority: dbTicket.priority,
        orderId: dbTicket.order_id || undefined,
        sellerId: dbTicket.seller_id || undefined,
        sellerStoreName: dbTicket.seller?.store_name || dbTicket.seller?.owner_name || undefined,
        assignedTo: dbTicket.assigned_to || undefined,
        replies: (dbTicket.messages || [])
            .filter(m => !m.is_internal_note)
            .map(m => ({
                id: m.id,
                ticketId: m.ticket_id,
                senderId: m.sender_id,
                senderName: [m.sender?.first_name, m.sender?.last_name].filter(Boolean).join(' ') || 'Unknown',
                senderType: m.sender_type as 'user' | 'admin',
                message: m.message,
                timestamp: m.created_at,
                isInternalNote: m.is_internal_note
            }))
    };
};

export const useSupportStore = create<SupportStore>()((set, get) => ({
    tickets: [],
    categories: [],
    loading: false,
    error: null,

    fetchAllTickets: async () => {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured');
            return;
        }

        set({ loading: true, error: null });
        try {
            const dbTickets = await ticketService.getAllTickets();
            const mappedTickets = dbTickets.map(mapDbTicketToUI);
            set({ tickets: mappedTickets, loading: false });
        } catch (error: any) {
            console.error('Error fetching tickets:', error);
            set({ error: error.message, loading: false });
        }
    },

    fetchUserTickets: async (userId: string) => {
        if (!isSupabaseConfigured()) {
            return;
        }

        set({ loading: true, error: null });
        try {
            const dbTickets = await ticketService.getTicketsByUser(userId);
            const mappedTickets = dbTickets.map(mapDbTicketToUI);
            set({ tickets: mappedTickets, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    fetchCategories: async () => {
        try {
            const cats = await ticketService.getCategories();
            set({ categories: cats });
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    },

    submitTicket: async (ticketData) => {
        set({ loading: true, error: null });
        try {
            const dbTicket = await ticketService.createTicket({
                user_id: ticketData.userId,
                subject: ticketData.subject,
                description: ticketData.description,
                category_id: ticketData.categoryId,
                priority: (ticketData.priority as any) || 'normal',
                order_id: ticketData.orderId,
                seller_id: ticketData.sellerId
            });

            if (dbTicket) {
                const newTicket: SupportTicket = {
                    id: generateTicketId(),
                    dbId: dbTicket.id,
                    buyerName: ticketData.userName,
                    buyerId: ticketData.userId,
                    email: ticketData.userEmail,
                    subject: ticketData.subject,
                    description: ticketData.description,
                    status: 'Open',
                    createdAt: new Date().toISOString().split('T')[0],
                    category: ticketData.categoryName || 'General',
                    categoryId: ticketData.categoryId,
                    priority: ticketData.priority || 'normal',
                    orderId: ticketData.orderId,
                    sellerId: ticketData.sellerId,
                    sellerStoreName: ticketData.sellerStoreName,
                    replies: []
                };

                set((state) => ({
                    tickets: [newTicket, ...state.tickets],
                    loading: false
                }));

                return newTicket.id;
            }
            set({ loading: false });
            return null;
        } catch (error: any) {
            set({ error: error.message, loading: false });
            return null;
        }
    },

    updateTicketStatus: async (ticketId, status) => {
        const ticket = get().tickets.find(t => t.id === ticketId || t.dbId === ticketId);
        if (!ticket) return;

        try {
            await ticketService.updateTicketStatus(ticket.dbId, uiStatusToDb(status));
            
            set((state) => ({
                tickets: state.tickets.map((t) =>
                    (t.id === ticketId || t.dbId === ticketId) ? { ...t, status } : t
                )
            }));
        } catch (error) {
            console.error('Error updating ticket status:', error);
        }
    },

    addTicketReply: async (ticketId, replyData) => {
        const ticket = get().tickets.find(t => t.id === ticketId || t.dbId === ticketId);
        if (!ticket) return;

        try {
            const dbMessage = await ticketService.addMessage(ticket.dbId, {
                sender_id: replyData.senderId,
                sender_type: replyData.senderType,
                message: replyData.message,
                is_internal_note: replyData.isInternalNote
            });

            if (dbMessage) {
                const newReply: TicketReply = {
                    id: dbMessage.id,
                    ticketId: ticket.dbId,
                    senderId: replyData.senderId,
                    senderName: replyData.senderName,
                    senderType: replyData.senderType,
                    message: replyData.message,
                    timestamp: dbMessage.created_at,
                    isInternalNote: replyData.isInternalNote
                };

                set((state) => ({
                    tickets: state.tickets.map((t) =>
                        (t.id === ticketId || t.dbId === ticketId)
                            ? { ...t, replies: [...t.replies, newReply] }
                            : t
                    )
                }));
            }
        } catch (error) {
            console.error('Error adding reply:', error);
        }
    },

    getTicketsByBuyer: (buyerEmail) => {
        return get().tickets.filter((ticket) => ticket.email === buyerEmail);
    },

    getTicketById: (ticketId) => {
        return get().tickets.find(t => t.id === ticketId || t.dbId === ticketId);
    }
}));
