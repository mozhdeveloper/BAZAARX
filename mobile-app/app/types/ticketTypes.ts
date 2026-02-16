// Ticket Types - Matching database schema
export type TicketStatus = 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'Account' | 'Order' | 'Payment' | 'Technical' | 'Other';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'admin';
  senderName: string;
  message: string;
  isInternal?: boolean;
  createdAt: string;
}

export interface TicketCategoryDb {
  id: string;
  name: string;
  description: string | null;
}

export interface Ticket {
  id: string;
  userId: string;
  categoryId: string | null;
  categoryName: string | null;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  orderId: string | null;
  sellerId: string | null;
  sellerStoreName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  messages: TicketMessage[];
}

// For creating a ticket
export interface CreateTicketData {
  subject: string;
  description: string;
  categoryId?: string | null;
  priority?: TicketPriority;
  orderId?: string | null;
  sellerId?: string | null;
}
