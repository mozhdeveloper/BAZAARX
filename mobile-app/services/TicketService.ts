import { Ticket, TicketMessage, TicketStatus, TicketCategory } from '../app/types/ticketTypes';

// Mock Data
let MOCK_TICKETS: Ticket[] = [
  {
    id: 'TKT-1001',
    userId: 'user-1',
    category: 'Order',
    subject: 'Missing item in delivery',
    description: 'I received my order #12345 but the blue t-shirt is missing. Please help.',
    status: 'in_progress',
    priority: 'high',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    messages: [
      {
        id: 'msg-1',
        ticketId: 'TKT-1001',
        senderId: 'user-1',
        senderName: 'You',
        message: 'Hi, I received my order #12345 but the blue t-shirt is missing. Please help.',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'msg-2',
        ticketId: 'TKT-1001',
        senderId: 'support-1',
        senderName: 'Support Agent',
        message: 'We are sorry to hear that! Let me check with our logistics team.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'TKT-1002',
    userId: 'user-1',
    category: 'Account',
    subject: 'Cannot update profile picture',
    description: 'Every time I try to upload a new photo, it says error.',
    status: 'open',
    priority: 'medium',
    createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    messages: [
      {
        id: 'msg-3',
        ticketId: 'TKT-1002',
        senderId: 'user-1',
        senderName: 'You',
        message: 'Every time I try to upload a new photo, it says error.',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
      }
    ],
  },
  {
    id: 'TKT-1003',
    userId: 'user-1',
    category: 'Payment',
    subject: 'Refund not received',
    description: 'It has been 5 days since my refund was approved.',
    status: 'resolved',
    priority: 'low',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    messages: [],
  }
];

interface DbTicket {
  id: string;
  user_id: string;
  category_id: string | null;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  order_id: string | null;
  seller_id: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
  };
  seller?: {
    id: string;
    store_name: string | null;
  };
  messages?: DbTicketMessage[];
}

// Helper to map database ticket to app ticket
function mapDbTicketToTicket(dbTicket: DbTicket, currentUserId?: string): Ticket {
  return {
    id: dbTicket.id,
    userId: dbTicket.user_id,
    categoryId: dbTicket.category_id,
    categoryName: dbTicket.category?.name || null,
    subject: dbTicket.subject,
    description: dbTicket.description,
    status: dbTicket.status,
    priority: dbTicket.priority,
    orderId: dbTicket.order_id,
    sellerId: dbTicket.seller_id,
    sellerStoreName: dbTicket.seller?.store_name || null,
    createdAt: dbTicket.created_at,
    updatedAt: dbTicket.updated_at,
    resolvedAt: dbTicket.resolved_at,
    messages: (dbTicket.messages || [])
      .filter(m => !m.is_internal_note) // Don't show internal notes to users
      .map(m => ({
        id: m.id,
        ticketId: m.ticket_id,
        senderId: m.sender_id,
        senderType: m.sender_type,
        senderName: m.sender_id === currentUserId 
          ? 'You' 
          : m.sender?.first_name 
            ? `${m.sender.first_name} ${m.sender.last_name || ''}`.trim()
            : 'Support Agent',
        message: m.message,
        isInternal: m.is_internal_note,
        createdAt: m.created_at,
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  };
}

export const TicketService = {
  /**
   * Fetch all tickets for the current user
   */
  async fetchTickets(userId: string): Promise<Ticket[]> {
    if (!isSupabaseConfigured()) {
      console.warn('Supabase not configured');
      return [];
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        category:ticket_categories!support_tickets_category_id_fkey (
          id,
          name
        ),
        seller:sellers (
          id,
          store_name
        ),
        messages:ticket_messages (
          id,
          ticket_id,
          sender_id,
          sender_type,
          message,
          is_internal_note,
          created_at,
          sender:profiles!ticket_messages_sender_id_fkey (
            first_name,
            last_name
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      throw error;
    }

    return (data || []).map(ticket => mapDbTicketToTicket(ticket as DbTicket, userId));
  },

  /**
   * Get a single ticket by ID
   */
  async getTicketDetails(ticketId: string, currentUserId?: string): Promise<Ticket | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        category:ticket_categories!support_tickets_category_id_fkey (
          id,
          name
        ),
        seller:sellers (
          id,
          store_name
        ),
        messages:ticket_messages (
          id,
          ticket_id,
          sender_id,
          sender_type,
          message,
          is_internal_note,
          created_at,
          sender:profiles!ticket_messages_sender_id_fkey (
            first_name,
            last_name
          )
        )
      `)
      .eq('id', ticketId)
      .single();

    if (error) {
      console.error('Error fetching ticket details:', error);
      return null;
    }

    return data ? mapDbTicketToTicket(data as DbTicket, currentUserId) : null;
  },

  async createTicket(data: { category: TicketCategory; subject: string; description: string; priority: any; images?: string[] }): Promise<Ticket> {
    await delay(1000);
    const newTicket: Ticket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: 'user-1',
      category: data.category,
      subject: data.subject,
      description: data.description,
      status: 'open',
      priority: 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Math.random()}`,
          ticketId: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
          senderId: 'user-1',
          senderName: 'You',
          message: data.description,
          attachments: data.images,
          createdAt: new Date().toISOString(),
        }
      ],
    };
    MOCK_TICKETS.unshift(newTicket);
    return newTicket;
  },

  /**
   * Send a message on a ticket
   */
  async sendMessage(ticketId: string, senderId: string, message: string): Promise<TicketMessage | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        sender_type: 'user',
        message: message,
        is_internal_note: false
      })
      .select(`
        *,
        sender:profiles!ticket_messages_sender_id_fkey (
          first_name,
          last_name
        )
      `)
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    // Update ticket's updated_at timestamp
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (!data) return null;

    return {
      id: data.id,
      ticketId: data.ticket_id,
      senderId: data.sender_id,
      senderType: data.sender_type,
      senderName: 'You',
      message: data.message,
      isInternal: data.is_internal_note,
      createdAt: data.created_at,
    };
  },

  /**
   * Get all ticket categories
   */
  async getCategories(): Promise<TicketCategoryDb[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('ticket_categories')
      .select('id, name, description')
      .order('name');

    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Get all sellers (for store selection when creating a ticket about a store)
   */
  async getSellers(): Promise<{ id: string; store_name: string; owner_name: string | null }[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('sellers')
      .select('id, store_name, owner_name, approval_status')
      .order('store_name');

    if (error) {
      console.error('Error fetching sellers:', error);
      return [];
    }

    const ticketIndex = MOCK_TICKETS.findIndex((t) => t.id === ticketId);
    if (ticketIndex !== -1) {
      MOCK_TICKETS[ticketIndex].messages.push(formattedMessage);
      MOCK_TICKETS[ticketIndex].updatedAt = formattedMessage.createdAt;

      // Simulate auto-reply for demo
      setTimeout(() => {
        const autoReply: TicketMessage = {
          id: `msg-auto-${Date.now()}`,
          ticketId,
          senderId: 'system',
          senderName: 'Support Agent',
          message: 'Thank you for your message. We will get back to you shortly.',
          createdAt: new Date().toISOString(),
        };
        MOCK_TICKETS[ticketIndex].messages.push(autoReply);
        MOCK_TICKETS[ticketIndex].updatedAt = autoReply.createdAt;
      }, 5000);
    }

    return formattedMessage;
  },

  async resolveTicket(ticketId: string): Promise<void> {
    await delay(800);
    const ticket = MOCK_TICKETS.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = 'resolved';
      ticket.updatedAt = new Date().toISOString();
    }
  }
};
