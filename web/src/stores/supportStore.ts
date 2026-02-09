import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TicketStatus = 'Open' | 'In Review' | 'Resolved' | 'Closed';

export interface SupportTicket {
    id: string;
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
    submitTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'status'>) => string;
    updateTicketStatus: (ticketId: string, status: TicketStatus) => void;
    addTicketReply: (ticketId: string, reply: Omit<TicketReply, 'id' | 'timestamp' | 'ticketId'>) => void;
    getTicketsByBuyer: (buyerEmail: string) => SupportTicket[];
}

// Generate unique ticket ID
const generateTicketId = (): string => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `BX-${num}`;
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

            submitTicket: (ticketData) => {
                const ticketId = generateTicketId();
                const newTicket: SupportTicket = {
                    ...ticketData,
                    id: ticketId,
                    status: 'Open',
                    createdAt: new Date().toISOString().split('T')[0],
                    replies: []
                };

                set((state) => ({
                    tickets: [newTicket, ...state.tickets]
                }));

                return ticketId;
            },

            updateTicketStatus: (ticketId, status) => {
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

            getTicketsByBuyer: (buyerEmail) => {
                return get().tickets.filter((ticket) => ticket.email === buyerEmail);
            }
        }),
        {
            name: 'support-store'
        }
    )
);
