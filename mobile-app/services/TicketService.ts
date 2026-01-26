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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const TicketService = {
  async fetchTickets(): Promise<Ticket[]> {
    await delay(800); // Simulate network
    return [...MOCK_TICKETS].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async getTicketDetails(ticketId: string): Promise<Ticket | null> {
    await delay(500);
    const ticket = MOCK_TICKETS.find((t) => t.id === ticketId);
    return ticket || null;
  },

  async createTicket(data: { category: TicketCategory; subject: string; description: string; priority: any }): Promise<Ticket> {
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
            createdAt: new Date().toISOString(),
        }
      ],
    };
    MOCK_TICKETS.unshift(newTicket);
    return newTicket;
  },

  async sendMessage(ticketId: string, message: string): Promise<TicketMessage> {
    await delay(600);
    const formattedMessage: TicketMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderId: 'user-1',
      senderName: 'You',
      message,
      createdAt: new Date().toISOString(),
    };

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
      if(ticket) {
          ticket.status = 'resolved';
          ticket.updatedAt = new Date().toISOString();
      }
  }
};
