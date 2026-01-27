export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';
export type TicketCategory = 'Account' | 'Order' | 'Payment' | 'Technical' | 'Other';

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string; // "You" or "Support"
  message: string;
  attachments?: string[];
  createdAt: string;
  isInternal?: boolean;
}

export interface Ticket {
  id: string;
  userId: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  updatedAt: string;
  messages: TicketMessage[];
}
