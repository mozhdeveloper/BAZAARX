/**
 * Ticket Service - Handles all support ticket operations with Supabase
 */
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface DbTicket {
    id: string;
    user_id: string;
    category_id: string | null;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
    subject: string;
    description: string;
    order_id: string | null;
    seller_id: string | null;
    assigned_to: string | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
    // Joined fields
    user?: {
        id: string;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
    };
    category?: {
        id: string;
        name: string;
    };
    seller?: {
        id: string;
        store_name: string | null;
        owner_name: string | null;
    };
    messages?: DbTicketMessage[];
}

export interface DbTicketMessage {
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

export interface TicketCategory {
    id: string;
    name: string;
    description: string | null;
}

class TicketService {
    /**
     * Fetch all tickets (admin view)
     */
    async getAllTickets(): Promise<DbTicket[]> {
        if (!isSupabaseConfigured()) {
            console.warn('Supabase not configured');
            return [];
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                *,
                user:profiles!support_tickets_user_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                category:ticket_categories!support_tickets_category_id_fkey (
                    id,
                    name
                ),
                seller:sellers (
                    id,
                    store_name,
                    owner_name
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
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Fetch tickets for a specific user
     */
    async getTicketsByUser(userId: string): Promise<DbTicket[]> {
        if (!isSupabaseConfigured()) {
            return [];
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .select(`
                *,
                user:profiles!support_tickets_user_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                category:ticket_categories!support_tickets_category_id_fkey (
                    id,
                    name
                ),
                seller:sellers (
                    id,
                    store_name,
                    owner_name
                ),
                messages:ticket_messages (
                    id,
                    ticket_id,
                    sender_id,
                    sender_type,
                    message,
                    is_internal_note,
                    created_at
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching user tickets:', error);
            throw error;
        }

        return data || [];
    }

    /**
     * Create a new ticket
     */
    async createTicket(ticket: {
        user_id: string;
        subject: string;
        description: string;
        category_id?: string | null;
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        order_id?: string | null;
        seller_id?: string | null;
    }): Promise<DbTicket | null> {
        if (!isSupabaseConfigured()) {
            return null;
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .insert({
                user_id: ticket.user_id,
                subject: ticket.subject,
                description: ticket.description,
                category_id: ticket.category_id || null,
                priority: ticket.priority || 'normal',
                order_id: ticket.order_id || null,
                seller_id: ticket.seller_id || null,
                status: 'open'
            })
            .select(`
                *,
                user:profiles!support_tickets_user_id_fkey (
                    id,
                    first_name,
                    last_name,
                    email
                ),
                category:ticket_categories!support_tickets_category_id_fkey (
                    id,
                    name
                ),
                seller:sellers (
                    id,
                    store_name,
                    owner_name
                )
            `)
            .single();

        if (error) {
            console.error('Error creating ticket:', error);
            throw error;
        }

        return data;
    }

    /**
     * Update ticket status
     */
    async updateTicketStatus(ticketId: string, status: DbTicket['status']): Promise<DbTicket | null> {
        if (!isSupabaseConfigured()) {
            return null;
        }

        const updates: any = {
            status,
            updated_at: new Date().toISOString()
        };

        if (status === 'resolved' || status === 'closed') {
            updates.resolved_at = new Date().toISOString();
        }

        const { data, error } = await supabase
            .from('support_tickets')
            .update(updates)
            .eq('id', ticketId)
            .select()
            .single();

        if (error) {
            console.error('Error updating ticket:', error);
            throw error;
        }

        return data;
    }

    /**
     * Add a message/reply to a ticket
     */
    async addMessage(ticketId: string, message: {
        sender_id: string;
        sender_type: 'user' | 'admin';
        message: string;
        is_internal_note?: boolean;
    }): Promise<DbTicketMessage | null> {
        if (!isSupabaseConfigured()) {
            return null;
        }

        const { data, error } = await supabase
            .from('ticket_messages')
            .insert({
                ticket_id: ticketId,
                sender_id: message.sender_id,
                sender_type: message.sender_type,
                message: message.message,
                is_internal_note: message.is_internal_note || false
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
            console.error('Error adding message:', error);
            throw error;
        }

        // Update ticket's updated_at timestamp
        await supabase
            .from('support_tickets')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', ticketId);

        return data;
    }

    /**
     * Get all ticket categories
     */
    async getCategories(): Promise<TicketCategory[]> {
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
    }

    /**
     * Assign ticket to admin
     */
    async assignTicket(ticketId: string, adminId: string): Promise<boolean> {
        if (!isSupabaseConfigured()) {
            return false;
        }

        const { error } = await supabase
            .from('support_tickets')
            .update({
                assigned_to: adminId,
                status: 'in_progress',
                updated_at: new Date().toISOString()
            })
            .eq('id', ticketId);

        return !error;
    }
}

export const ticketService = new TicketService();
