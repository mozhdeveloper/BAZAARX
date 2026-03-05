/**
 * System Messages Type Definitions (Mobile)
 * 
 * Same types as web version but located in mobile-app directory
 * for consistency across platforms
 */

/**
 * Enum of all possible system message event types
 */
export enum SystemMessageEventType {
  ORDER_CREATED = 'order_created',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_PICKED = 'order_picked',
  ORDER_OUT_FOR_DELIVERY = 'order_out_for_delivery',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  RETURN_INITIATED = 'return_initiated',
  RETURN_APPROVED = 'return_approved',
  RETURN_REJECTED = 'return_rejected',
  RETURN_SHIPPED = 'return_shipped',
  RETURN_RECEIVED = 'return_received',
  RETURN_COMPLETED = 'return_completed',
  REFUND_INITIATED = 'refund_initiated',
  REFUND_PROCESSED = 'refund_processed',
  PAYMENT_CONFIRMED = 'payment_confirmed',
  PAYMENT_FAILED = 'payment_failed',
  INVENTORY_UPDATE = 'inventory_update',
  ITEM_OUT_OF_STOCK = 'item_out_of_stock',
  SUPPORT_TICKET_OPENED = 'support_ticket_opened',
  SUPPORT_TICKET_CLOSED = 'support_ticket_closed',
}

/**
 * Metadata stored with system messages
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
  [key: string]: any;
}

/**
 * System Message - Auto-generated platform notification
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
 * Union type for all message types
 */
export type Message = SystemMessage | RegularMessage;

/**
 * Type guard for SystemMessage
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
 * Event type labels
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
 * Event type icons
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
 * Event type colors for React Native
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
