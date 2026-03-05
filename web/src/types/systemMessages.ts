/**
 * System Messages Type Definitions
 * 
 * Complete type system for system message handling across the platform.
 * Ensures type safety when creating, detecting, and rendering system messages.
 */

/**
 * Enum of all possible system message event types
 * Used for categorization, deduplication, and rendering logic
 */
export enum SystemMessageEventType {
  // Order Events
  ORDER_CREATED = 'order_created',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_PICKED = 'order_picked',
  ORDER_OUT_FOR_DELIVERY = 'order_out_for_delivery',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',

  // Return Events
  RETURN_INITIATED = 'return_initiated',
  RETURN_APPROVED = 'return_approved',
  RETURN_REJECTED = 'return_rejected',
  RETURN_SHIPPED = 'return_shipped',
  RETURN_RECEIVED = 'return_received',
  RETURN_COMPLETED = 'return_completed',

  // Refund Events
  REFUND_INITIATED = 'refund_initiated',
  REFUND_PROCESSED = 'refund_processed',

  // Payment Events
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYMENT_FAILED = 'payment_failed',

  // Inventory Events
  INVENTORY_UPDATE = 'inventory_update',
  ITEM_OUT_OF_STOCK = 'item_out_of_stock',

  // Support Events
  SUPPORT_TICKET_OPENED = 'support_ticket_opened',
  SUPPORT_TICKET_CLOSED = 'support_ticket_closed',
}

/**
 * Metadata stored with system messages
 * Depends on event type - use conditional types for strict typing
 */
export interface SystemMessageMetadata {
  event_type: SystemMessageEventType;
  order_id?: string;
  return_id?: string;
  refund_id?: string;
  tracking_number?: string;
  carrier?: string;
  amount?: number;
  reason?: string;
  delivery_date?: string;
  timestamp?: string;
  // Allow additional fields
  [key: string]: any;
}

/**
 * System Message - Auto-generated platform notification
 * 
 * Key characteristics:
 * - is_system_message = true
 * - sender_id = null (no human sender)
 * - sender_type = null
 * - created by backend event handlers
 */
export interface SystemMessage {
  id: string;
  conversation_id: string;
  sender_id: null;
  sender_type: null;
  content: string;
  image_url?: null;
  is_system_message: true;
  metadata: SystemMessageMetadata;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Regular Message - Sent by user
 * 
 * Key characteristics:
 * - is_system_message = false
 * - sender_id exists (user ID)
 * - sender_type = 'buyer' | 'seller'
 */
export interface RegularMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: 'buyer' | 'seller';
  content: string;
  image_url?: string | null;
  is_system_message: false;
  metadata?: null;
  is_read: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Union type for all message types in the chat
 * Use this type for message arrays and parameters
 */
export type Message = SystemMessage | RegularMessage;

/**
 * Conversation metadata
 */
export interface Conversation {
  id: string;
  buyer_id: string;
  order_id?: string | null;
  seller_id?: string;
  created_at: string;
  updated_at: string;
  last_message?: string;
  last_message_at?: string;
  buyer_unread_count?: number;
  seller_unread_count?: number;
}

/**
 * Message display format (for UI rendering)
 * Internal format used in React components
 */
export interface ChatMessageForUI {
  id: string;
  sender: 'buyer' | 'seller' | 'system';
  message: string;
  timestamp: Date;
  read: boolean;
  isTyping?: boolean;
  metadata?: SystemMessageMetadata;
  senderName?: string;
  senderAvatar?: string;
}

/**
 * System Message creation options
 * Used when backend generates system messages
 */
export interface CreateSystemMessageOptions {
  conversationId: string;
  eventType: SystemMessageEventType;
  content: string;
  metadata?: Partial<SystemMessageMetadata>;
  orderId?: string;
}

/**
 * Message deduplication log entry
 * Prevents duplicate system messages from being sent for the same event
 */
export interface MessageDeduplicationLog {
  id: string;
  order_id: string;
  status: string; // SystemMessageEventType
  conversation_id: string;
  message_id: string;
  sent_at: string;
  created_at: string;
}

/**
 * Event emission payload for chat subscriptions
 */
export interface ChatEventPayload {
  type: 'new_message' | 'message_read' | 'typing';
  message?: Message;
  conversationId: string;
  userId: string;
}

/**
 * Type guard for SystemMessage
 * Use this to safely distinguish between message types
 */
export function isSystemMessage(message: unknown): message is SystemMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'is_system_message' in message &&
    (message as any).is_system_message === true &&
    (message as any).sender_id === null &&
    (message as any).sender_type === null
  );
}

/**
 * Type guard for RegularMessage
 * Use this to safely distinguish between message types
 */
export function isRegularMessage(message: unknown): message is RegularMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'is_system_message' in message &&
    (message as any).is_system_message === false &&
    typeof (message as any).sender_id === 'string' &&
    ((message as any).sender_type === 'buyer' || (message as any).sender_type === 'seller')
  );
}

/**
 * Mapping of event types to user-friendly labels
 */
export const EVENT_TYPE_LABELS: Record<SystemMessageEventType, string> = {
  [SystemMessageEventType.ORDER_CREATED]: 'Order Created',
  [SystemMessageEventType.ORDER_CONFIRMED]: 'Order Confirmed',
  [SystemMessageEventType.ORDER_SHIPPED]: 'Order Shipped',
  [SystemMessageEventType.ORDER_PICKED]: 'Order Picked',
  [SystemMessageEventType.ORDER_OUT_FOR_DELIVERY]: 'Out for Delivery',
  [SystemMessageEventType.ORDER_DELIVERED]: 'Order Delivered',
  [SystemMessageEventType.ORDER_CANCELLED]: 'Order Cancelled',
  [SystemMessageEventType.RETURN_INITIATED]: 'Return Initiated',
  [SystemMessageEventType.RETURN_APPROVED]: 'Return Approved',
  [SystemMessageEventType.RETURN_REJECTED]: 'Return Rejected',
  [SystemMessageEventType.RETURN_SHIPPED]: 'Return Shipped',
  [SystemMessageEventType.RETURN_RECEIVED]: 'Return Received',
  [SystemMessageEventType.RETURN_COMPLETED]: 'Return Completed',
  [SystemMessageEventType.REFUND_INITIATED]: 'Refund Started',
  [SystemMessageEventType.REFUND_PROCESSED]: 'Refund Processed',
  [SystemMessageEventType.PAYMENT_CONFIRMED]: 'Payment Confirmed',
  [SystemMessageEventType.PAYMENT_FAILED]: 'Payment Failed',
  [SystemMessageEventType.INVENTORY_UPDATE]: 'Inventory Updated',
  [SystemMessageEventType.ITEM_OUT_OF_STOCK]: 'Out of Stock',
  [SystemMessageEventType.SUPPORT_TICKET_OPENED]: 'Support Ticket Opened',
  [SystemMessageEventType.SUPPORT_TICKET_CLOSED]: 'Support Ticket Closed',
};

/**
 * Mapping of event types to display icons
 */
export const EVENT_TYPE_ICONS: Record<SystemMessageEventType, string> = {
  [SystemMessageEventType.ORDER_CREATED]: '📋',
  [SystemMessageEventType.ORDER_CONFIRMED]: '✅',
  [SystemMessageEventType.ORDER_SHIPPED]: '📦',
  [SystemMessageEventType.ORDER_PICKED]: '📦',
  [SystemMessageEventType.ORDER_OUT_FOR_DELIVERY]: '🚚',
  [SystemMessageEventType.ORDER_DELIVERED]: '🎉',
  [SystemMessageEventType.ORDER_CANCELLED]: '❌',
  [SystemMessageEventType.RETURN_INITIATED]: '🔄',
  [SystemMessageEventType.RETURN_APPROVED]: '✅',
  [SystemMessageEventType.RETURN_REJECTED]: '❌',
  [SystemMessageEventType.RETURN_SHIPPED]: '📦',
  [SystemMessageEventType.RETURN_RECEIVED]: '📬',
  [SystemMessageEventType.RETURN_COMPLETED]: '✓',
  [SystemMessageEventType.REFUND_INITIATED]: '💳',
  [SystemMessageEventType.REFUND_PROCESSED]: '💰',
  [SystemMessageEventType.PAYMENT_CONFIRMED]: '✓',
  [SystemMessageEventType.PAYMENT_FAILED]: '⚠️',
  [SystemMessageEventType.INVENTORY_UPDATE]: '📊',
  [SystemMessageEventType.ITEM_OUT_OF_STOCK]: '⛔',
  [SystemMessageEventType.SUPPORT_TICKET_OPENED]: '🎫',
  [SystemMessageEventType.SUPPORT_TICKET_CLOSED]: '✓',
};

/**
 * Color scheme for different event types
 * Used for styling system message badges
 */
export const EVENT_TYPE_COLORS: Record<SystemMessageEventType, { bg: string; text: string }> = {
  [SystemMessageEventType.ORDER_CREATED]: { bg: '#F0F4F8', text: '#2D3748' },
  [SystemMessageEventType.ORDER_CONFIRMED]: { bg: '#C6F6D5', text: '#22543D' },
  [SystemMessageEventType.ORDER_SHIPPED]: { bg: '#BEE3F8', text: '#2C5282' },
  [SystemMessageEventType.ORDER_PICKED]: { bg: '#BEE3F8', text: '#2C5282' },
  [SystemMessageEventType.ORDER_OUT_FOR_DELIVERY]: { bg: '#FED7D7', text: '#742A2A' },
  [SystemMessageEventType.ORDER_DELIVERED]: { bg: '#C6F6D5', text: '#22543D' },
  [SystemMessageEventType.ORDER_CANCELLED]: { bg: '#FED7D7', text: '#742A2A' },
  [SystemMessageEventType.RETURN_INITIATED]: { bg: '#E6FFFA', text: '#234E52' },
  [SystemMessageEventType.RETURN_APPROVED]: { bg: '#C6F6D5', text: '#22543D' },
  [SystemMessageEventType.RETURN_REJECTED]: { bg: '#FED7D7', text: '#742A2A' },
  [SystemMessageEventType.RETURN_SHIPPED]: { bg: '#BEE3F8', text: '#2C5282' },
  [SystemMessageEventType.RETURN_RECEIVED]: { bg: '#E6FFFA', text: '#234E52' },
  [SystemMessageEventType.RETURN_COMPLETED]: { bg: '#C6F6D5', text: '#22543D' },
  [SystemMessageEventType.REFUND_INITIATED]: { bg: '#FEF5E7', text: '#78350F' },
  [SystemMessageEventType.REFUND_PROCESSED]: { bg: '#C6F6D5', text: '#22543D' },
  [SystemMessageEventType.PAYMENT_CONFIRMED]: { bg: '#C6F6D5', text: '#22543D' },
  [SystemMessageEventType.PAYMENT_FAILED]: { bg: '#FED7D7', text: '#742A2A' },
  [SystemMessageEventType.INVENTORY_UPDATE]: { bg: '#F0F4F8', text: '#2D3748' },
  [SystemMessageEventType.ITEM_OUT_OF_STOCK]: { bg: '#FED7D7', text: '#742A2A' },
  [SystemMessageEventType.SUPPORT_TICKET_OPENED]: { bg: '#F0F4F8', text: '#2D3748' },
  [SystemMessageEventType.SUPPORT_TICKET_CLOSED]: { bg: '#C6F6D5', text: '#22543D' },
};
