import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export type TicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Closed';

export interface SupportTicket {
    id: string;
    dbId?: string;
    buyerName: string;
    buyerId?: string;
    email: string;
    subject: string;
    description: string;
    status: TicketStatus;
    createdAt: string;
    category: string;
    proof?: File | null;
    replies?: TicketReply[];
}

export interface TicketReply {
    id: string;
    ticketId: string;
    senderId: string;
    senderName: string;
    senderType: 'buyer' | 'admin';
    message: string;
    timestamp: string;
}

interface SupportStore {
    tickets: SupportTicket[];
    submitTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status' | 'dbId'>) => Promise<string>;
    loadTickets: () => Promise<void>;
    updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
    addTicketReply: (ticketId: string, reply: Omit<TicketReply, 'id' | 'timestamp' | 'ticketId'>) => void;
    sendAdminReply: (ticketId: string, message: string, adminName?: string) => Promise<void>;
    getTicketsByBuyer: (buyerEmail: string) => SupportTicket[];
}

// Generate unique ticket ID
const generateTicketId = (): string => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `BX-${num}`;
};

const mapDbStatusToUi = (status: string): TicketStatus => {
    const map: Record<string, TicketStatus> = {
        open: 'Open',
        in_progress: 'In Review',
        waiting_response: 'In Review',
        resolved: 'Resolved',
        closed: 'Closed'
    };
    return map[status] ?? 'Open';
};

const mapUiStatusToDb = (status: TicketStatus): string => {
    const map: Record<TicketStatus, string> = {
        Open: 'open',
        'In Review': 'in_progress',
        Resolved: 'resolved',
        Closed: 'closed'
    };
    return map[status] ?? 'open';
};

export const useSupportStore = create<SupportStore>()(
    persist(
        (set, get) => ({
            // Initialize with existing mock tickets
            tickets: [
                {
                    id: 'BX-10234',
                    buyerName: 'Michaela Bandasan',
                    email: 'michaela@example.com',
                    subject: 'Damaged Item on Delivery',
                    description: 'The item arrived with a broken screen. I need a replacement.',
                    status: 'Open',
                    createdAt: '2026-02-06',
                    category: 'Returns',
                    replies: []
                },
                {
                    id: 'BX-10192',
                    buyerName: 'John Doe',
                    email: 'john@example.com',
                    subject: 'Missing Refund for Order #4492',
                    description: "My order was cancelled last week but I haven't seen the refund yet.",
                    status: 'In Review',
                    createdAt: '2026-02-01',
                    category: 'Payment',
                    replies: []
                },
                {
                    id: 'BX-09845',
                    buyerName: 'Sarah Smith',
                    email: 'sarah@example.com',
                    subject: 'Wrong Item Received',
                    description: 'Received a blue shirt instead of the red one I ordered.',
                    status: 'Resolved',
                    createdAt: '2026-01-25',
                    category: 'Order Issue',
                    replies: []
                },
                {
                    id: 'BX-08211',
                    buyerName: 'Robert Wilson',
                    email: 'robert@example.com',
                    subject: 'Shipping Query',
                    description: 'How can I change my delivery address after ordering?',
                    status: 'Closed',
                    createdAt: '2026-01-15',
                    category: 'Shipping',
                    replies: []
                }
            ],

            loadTickets: async () => {
                if (!isSupabaseConfigured()) return;

                try {
                    const { data, error } = await supabase
                        .from('support_tickets')
                        .select(`
                            id,
                            user_id,
                            category:ticket_categories(name),
                            priority,
                            status,
                            subject,
                            description,
                            order_id,
                            assigned_to,
                            resolved_at,
                            created_at,
                            updated_at,
                            ticket_messages ( id, sender_id, sender_type, message, created_at, is_internal_note ),
                            profiles:profiles!support_tickets_user_id_fkey ( first_name, last_name, email )
                        `)
                        .order('created_at', { ascending: false });

                    if (error) {
                        console.error('Failed to fetch support tickets:', error);
                        return;
                    }

                    const mapped: SupportTicket[] = (data || []).map((row: any) => {
                        const nameParts = [row?.profiles?.first_name, row?.profiles?.last_name].filter(Boolean);
                        const buyerName = nameParts.length ? nameParts.join(' ') : 'Buyer';
                        const email = row?.profiles?.email || 'unknown@bazaarx.com';
                        const replies: TicketReply[] = (row.ticket_messages || [])
                            .filter((msg: any) => !msg.is_internal_note)
                            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                            .map((msg: any) => ({
                                id: msg.id,
                                ticketId: row.id,
                                senderId: msg.sender_id,
                                senderName: msg.sender_type === 'admin' ? 'Admin Team' : buyerName,
                                senderType: msg.sender_type === 'admin' ? 'admin' : 'buyer',
                                message: msg.message,
                                timestamp: msg.created_at
                            }));

                        return {
                            id: row.id,
                            dbId: row.id,
                            buyerName,
                            buyerId: row.user_id,
                            email,
                            subject: row.subject,
                            description: row.description,
                            status: mapDbStatusToUi(row.status),
                            createdAt: row.created_at,
                            category: row?.category?.name || 'General',
                            replies
                        } as SupportTicket;
                    });

                    set({ tickets: mapped });
                } catch (err) {
                    console.error('Error loading tickets from Supabase:', err);
                }
            },

            submitTicket: async (ticketData) => {
                const ticketId = generateTicketId();
                const createdAt = new Date().toISOString().split('T')[0];
                let dbId: string | undefined;

                if (isSupabaseConfigured()) {
                    let userId = ticketData.buyerId;
                    if (!userId) {
                        const { data } = await supabase.auth.getUser();
                        userId = data.user?.id;
                    }

                    if (userId) {
                        const { data: category } = await supabase
                            .from('ticket_categories')
                            .select('id')
                            .eq('name', ticketData.category)
                            .maybeSingle();

                        const { data: inserted, error } = await supabase
                            .from('support_tickets')
                            .insert({
                                user_id: userId,
                                category_id: category?.id ?? null,
                                priority: 'normal',
                                status: 'open',
                                subject: ticketData.subject,
                                description: ticketData.description,
                                order_id: null,
                                assigned_to: null
                            })
                            .select('id')
                            .single();

                        if (!error) {
                            dbId = inserted?.id;
                        } else {
                            console.error('Supabase ticket insert failed:', error);
                        }
                    } else {
                        console.warn('Support ticket not synced: missing user id.');
                    }
                }

                const newTicket: SupportTicket = {
                    ...ticketData,
                    id: ticketId,
                    dbId,
                    status: 'Open',
                    createdAt,
                    replies: []
                };

                set((state) => ({
                    tickets: [newTicket, ...state.tickets]
                }));

                return ticketId;
            },

            updateTicketStatus: (ticketId, status) => {
                if (isSupabaseConfigured()) {
                    const dbStatus = mapUiStatusToDb(status);
                    supabase
                        .from('support_tickets')
                        .update({ status: dbStatus, updated_at: new Date().toISOString() })
                        .eq('id', ticketId)
                        .then(({ error }) => {
                            if (error) {
                                console.error('Failed to update ticket status in Supabase:', error);
                            }
                        });
                }

                set((state) => ({
                    tickets: state.tickets.map((ticket) =>
                        ticket.id === ticketId ? { ...ticket, status } : ticket
                    )
                }));
            },

            addTicketReply: (ticketId, replyData) => {
                const replyId = `reply-${Date.now()}`;
                const newReply: TicketReply = {
                    ...replyData,
                    id: replyId,
                    ticketId,
                    timestamp: new Date().toISOString()
                };

                set((state) => ({
                    tickets: state.tickets.map((ticket) =>
                        ticket.id === ticketId
                            ? { ...ticket, replies: [...(ticket.replies || []), newReply] }
                            : ticket
                    )
                }));
            },

            sendAdminReply: async (ticketId, message, adminName = 'Admin Team') => {
                if (!message.trim()) return;

                let senderId = 'admin-local';

                if (isSupabaseConfigured()) {
                    const { data: userData } = await supabase.auth.getUser();
                    senderId = userData.user?.id || senderId;

                    const { error } = await supabase.from('ticket_messages').insert({
                        ticket_id: ticketId,
                        sender_id: senderId,
                        sender_type: 'admin',
                        message,
                        is_internal_note: false
                    });

                    if (error) {
                        console.error('Failed to post admin reply to Supabase:', error);
                    }
                }

                const newReply: TicketReply = {
                    id: `reply-${Date.now()}`,
                    ticketId,
                    senderId,
                    senderName: adminName,
                    senderType: 'admin',
                    message,
                    timestamp: new Date().toISOString()
                };

                set((state) => ({
                    tickets: state.tickets.map((ticket) =>
                        ticket.id === ticketId
                            ? { ...ticket, replies: [...(ticket.replies || []), newReply] }
                            : ticket
                    )
                }));
            },

            getTicketsByBuyer: (buyerEmail) => {
                return get().tickets.filter((ticket) => ticket.email === buyerEmail);
            }
        }),
        {
            name: 'support-store'
        }
    )
);
