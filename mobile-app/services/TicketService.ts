/**
 * Ticket Service - Handles all support ticket operations with Supabase
 * Mirrors the web implementation for consistency
 */
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';
import { Ticket, TicketMessage, TicketStatus, TicketPriority, CreateTicketData, TicketCategoryDb } from '../app/types/ticketTypes';

// Database response types
interface DbTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_type: 'user' | 'admin';
  message: string;
  is_internal_note: boolean;
  created_at: string;
  sender?: {
    first_name: string | null;
    last_name: string | null;
  };
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

  /**
   * Create a new ticket
   */
  async createTicket(userId: string, data: CreateTicketData): Promise<Ticket | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        subject: data.subject,
        description: data.description,
        category_id: data.categoryId || null,
        priority: data.priority || 'normal',
        order_id: data.orderId || null,
        seller_id: data.sellerId || null,
        status: 'open'
      })
      .select(`
        *,
        category:ticket_categories!support_tickets_category_id_fkey (
          id,
          name
        ),
        seller:sellers (
          id,
          store_name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      throw error;
    }

    return ticket ? mapDbTicketToTicket(ticket as DbTicket, userId) : null;
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

    return data || [];
  },

  /**
   * Get tickets where seller_id matches (for sellers to see tickets about their store)
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
        user:profiles!support_tickets_user_id_fkey (
          id,
          first_name,
          last_name,
          email
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
      console.error('Error fetching seller tickets:', error);
      throw error;
    }

    return (data || []).map(ticket => mapDbTicketToTicket(ticket as any, sellerId));
  },

  /**
   * Get count of tickets about a seller
   */
  async getTicketCountAboutSeller(sellerId: string): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    const { count, error } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', sellerId);

    if (error) {
      console.error('Error fetching seller ticket count:', error);
      return 0;
    }

    return count || 0;
  }
};
