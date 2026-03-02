import { Ticket, TicketMessage, TicketStatus, TicketCategory, TicketPriority, TicketCategoryDb } from '../app/types/ticketTypes';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';

// Utility delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Data
let MOCK_TICKETS: Ticket[] = [
  {
    id: 'TKT-1001',
    userId: 'user-1',
    categoryId: 'cat-order',
    categoryName: 'Order',
    subject: 'Missing item in delivery',
    description: 'I received my order #12345 but the blue t-shirt is missing. Please help.',
    status: 'in_progress',
    priority: 'high',
    orderId: null,
    sellerId: null,
    sellerStoreName: null,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    updatedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    resolvedAt: null,
    messages: [
      {
        id: 'msg-1',
        ticketId: 'TKT-1001',
        senderId: 'user-1',
        senderType: 'user',
        senderName: 'You',
        message: 'Hi, I received my order #12345 but the blue t-shirt is missing. Please help.',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 'msg-2',
        ticketId: 'TKT-1001',
        senderId: 'support-1',
        senderType: 'admin',
        senderName: 'Support Agent',
        message: 'We are sorry to hear that! Let me check with our logistics team.',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
  },
  {
    id: 'TKT-1002',
    userId: 'user-1',
    categoryId: 'cat-account',
    categoryName: 'Account',
    subject: 'Cannot update profile picture',
    description: 'Every time I try to upload a new photo, it says error.',
    status: 'open',
    priority: 'normal',
    orderId: null,
    sellerId: null,
    sellerStoreName: null,
    createdAt: new Date(Date.now() - 43200000).toISOString(), // 12 hours ago
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
    resolvedAt: null,
    messages: [
      {
        id: 'msg-3',
        ticketId: 'TKT-1002',
        senderId: 'user-1',
        senderType: 'user',
        senderName: 'You',
        message: 'Every time I try to upload a new photo, it says error.',
        createdAt: new Date(Date.now() - 43200000).toISOString(),
      }
    ],
  },
  {
    id: 'TKT-1003',
    userId: 'user-1',
    categoryId: 'cat-payment',
    categoryName: 'Payment',
    subject: 'Refund not received',
    description: 'It has been 5 days since my refund was approved.',
    status: 'resolved',
    priority: 'low',
    orderId: null,
    sellerId: null,
    sellerStoreName: null,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    resolvedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    messages: [],
  }
];

interface DbTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  sender_name: string;
  message: string;
  is_internal: boolean | null;
  created_at: string;
}

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
      .filter(m => !m.is_internal) // Don't show internal notes to users
      .map(m => ({
        id: m.id,
        ticketId: m.ticket_id,
        senderId: m.sender_id,
        senderType: m.sender_type,
        senderName: m.sender_id === currentUserId 
          ? 'You' 
          : m.sender_name || 'Support Agent',
        message: m.message,
        isInternal: m.is_internal ?? undefined,
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

    return (data || []).map((ticket: any) => mapDbTicketToTicket(ticket as DbTicket, userId));
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

  async createTicket(userId: string, data: { categoryId?: string | null; subject: string; description: string; priority: TicketPriority; images?: string[] }): Promise<Ticket> {
    if (!isSupabaseConfigured()) {
      // Mock implementation
      await delay(1000);
      const newTicket: Ticket = {
        id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
        userId: userId,
        categoryId: data.categoryId || null,
        categoryName: data.categoryId || 'General',
        subject: data.subject,
        description: data.description,
        status: 'open',
        priority: data.priority || 'normal',
        orderId: null,
        sellerId: null,
        sellerStoreName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        resolvedAt: null,
        messages: [
          {
            id: `msg-${Math.random()}`,
            ticketId: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
            senderId: userId,
            senderType: 'user',
            senderName: 'You',
            message: data.description,
            createdAt: new Date().toISOString(),
          }
        ],
      };
      MOCK_TICKETS.unshift(newTicket);
      return newTicket;
    }

    // Real implementation
    const { data: ticketData, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        category_id: data.categoryId,
        subject: data.subject,
        description: data.description,
        priority: data.priority,
        status: 'open',
      })
      .select(`
        *,
        category:ticket_categories!support_tickets_category_id_fkey (
          id,
          name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }

    return mapDbTicketToTicket(ticketData as DbTicket, userId);
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
        is_internal: false
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
      isInternal: data.is_internal,
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

    return data || [];
  },

  async resolveTicket(ticketId: string): Promise<void> {
    await delay(800);
    const ticket = MOCK_TICKETS.find(t => t.id === ticketId);
    if (ticket) {
      ticket.status = 'resolved';
      ticket.updatedAt = new Date().toISOString();
    }
  },

  /**
   * Get tickets about a specific seller (for sellers to see reports about them)
   */
  async getTicketsAboutSeller(sellerId: string): Promise<Ticket[]> {
    if (!isSupabaseConfigured()) {
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
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets about seller:', error);
      return [];
    }

    return (data || []).map((ticket: any) => mapDbTicketToTicket(ticket as DbTicket));
  },

  /**
   * Get count of tickets about a specific seller
   */
  async getTicketCountAboutSeller(sellerId: string): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    const { count, error } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId)
      .in('status', ['open', 'in_progress', 'waiting_response']);

    if (error) {
      console.error('Error fetching ticket count about seller:', error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Admin: Get all tickets across all users (no user filter)
   */
  async getAllTickets(): Promise<Ticket[]> {
    if (!isSupabaseConfigured()) {
      return MOCK_TICKETS;
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
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching all tickets (admin):', error);
      throw error;
    }

    return (data || []).map((t: any) => mapDbTicketToTicket(t as DbTicket));
  },

  /**
   * Admin: Send a reply as a support agent
   */
  async sendAdminMessage(ticketId: string, adminId: string, message: string): Promise<TicketMessage | null> {
    if (!isSupabaseConfigured()) {
      const msg: TicketMessage = {
        id: `msg-${Math.random()}`,
        ticketId,
        senderId: adminId,
        senderType: 'admin',
        senderName: 'Support Agent',
        message,
        createdAt: new Date().toISOString(),
      };
      const ticket = MOCK_TICKETS.find((t) => t.id === ticketId);
      if (ticket) ticket.messages.push(msg);
      return msg;
    }

    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_id: adminId,
        sender_type: 'admin',
        message,
        is_internal: false,
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
      console.error('Error sending admin message:', error);
      throw error;
    }

    // Mark ticket as in_progress when admin first replies and update timestamp
    await supabase
      .from('support_tickets')
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .eq('status', 'open');

    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (!data) return null;

    return {
      id: data.id,
      ticketId: data.ticket_id,
      senderId: data.sender_id,
      senderType: 'admin',
      senderName: 'Support Agent',
      message: data.message,
      isInternal: false,
      createdAt: data.created_at,
    };
  },

  /**
   * Admin: Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
    if (!isSupabaseConfigured()) {
      const ticket = MOCK_TICKETS.find((t) => t.id === ticketId);
      if (ticket) {
        ticket.status = status;
        ticket.updatedAt = new Date().toISOString();
      }
      return;
    }

    const { error } = await supabase
      .from('support_tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    if (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  },
};
