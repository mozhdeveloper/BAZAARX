/**
 * Message Detection Utilities
 * 
 * Frontend utilities for detecting, filtering, and processing system messages.
 * Use these functions to ensure consistent message handling across the UI.
 */

import {
  Message,
  SystemMessage,
  RegularMessage,
  SystemMessageEventType,
  EVENT_TYPE_LABELS,
  EVENT_TYPE_ICONS,
  EVENT_TYPE_COLORS,
} from '../types/systemMessages';

/**
 * Detect if a message is a system message
 * 
 * @param message - Message to check
 * @returns true if message is a system message
 * 
 * @example
 * if (isSystemMessage(message)) {
 *   // Render system badge
 * } else {
 *   // Render regular chat bubble
 * }
 */
export function isSystemMessage(message: unknown): message is SystemMessage {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('is_system_message' in message)
  ) {
    return false;
  }

  const msg = message as any;
  return (
    msg.is_system_message === true &&
    msg.sender_id === null &&
    msg.sender_type === null &&
    msg.metadata?.event_type !== undefined
  );
}

/**
 * Detect if a message is a regular message
 * 
 * @param message - Message to check
 * @returns true if message is a regular message
 * 
 * @example
 * if (isRegularMessage(message)) {
 *   // Show sender avatar and name
 *   // Allow reactions
 * }
 */
export function isRegularMessage(message: unknown): message is RegularMessage {
  if (
    typeof message !== 'object' ||
    message === null ||
    !('is_system_message' in message)
  ) {
    return false;
  }

  const msg = message as any;
  return (
    msg.is_system_message === false &&
    typeof msg.sender_id === 'string' &&
    msg.sender_id.length > 0 &&
    (msg.sender_type === 'buyer' || msg.sender_type === 'seller')
  );
}

/**
 * Filter system messages from a message list
 * 
 * @param messages - Array of messages
 * @returns Only system messages
 * 
 * @example
 * const systemMessages = filterSystemMessages(allMessages);
 * console.log(`Found ${systemMessages.length} system messages`);
 */
export function filterSystemMessages(messages: Message[]): SystemMessage[] {
  return messages.filter(isSystemMessage);
}

/**
 * Filter regular messages from a message list
 * 
 * @param messages - Array of messages
 * @returns Only regular messages
 * 
 * @example
 * const userMessages = filterRegularMessages(allMessages);
 */
export function filterRegularMessages(messages: Message[]): RegularMessage[] {
  return messages.filter(isRegularMessage);
}

/**
 * Filter messages by event type
 * 
 * @param messages - Array of messages
 * @param eventType - Event type to filter by
 * @returns System messages matching the event type
 * 
 * @example
 * const shippedMessages = filterByEventType(messages, SystemMessageEventType.ORDER_SHIPPED);
 */
export function filterByEventType(
  messages: Message[],
  eventType: SystemMessageEventType
): SystemMessage[] {
  return filterSystemMessages(messages).filter(
    (msg) => msg.metadata?.event_type === eventType
  );
}

/**
 * Get event label for system message
 * 
 * @param eventType - Event type
 * @returns Human-readable label
 * 
 * @example
 * const label = getEventLabel(SystemMessageEventType.ORDER_SHIPPED);
 * // Returns: "Order Shipped"
 */
export function getEventLabel(eventType: SystemMessageEventType): string {
  return EVENT_TYPE_LABELS[eventType] || 'System Update';
}

/**
 * Get event icon for system message
 * 
 * @param eventType - Event type
 * @returns Emoji icon
 * 
 * @example
 * const icon = getEventIcon(SystemMessageEventType.ORDER_DELIVERED);
 * // Returns: "🎉"
 */
export function getEventIcon(eventType: SystemMessageEventType): string {
  return EVENT_TYPE_ICONS[eventType] || '📬';
}

/**
 * Get event color scheme for system message
 * 
 * @param eventType - Event type
 * @returns Object with bg and text colors
 * 
 * @example
 * const colors = getEventColors(SystemMessageEventType.ORDER_SHIPPED);
 * // Returns: { bg: '#BEE3F8', text: '#2C5282' }
 */
export function getEventColors(eventType: SystemMessageEventType): { bg: string; text: string } {
  return EVENT_TYPE_COLORS[eventType] || { bg: '#F0F4F8', text: '#2D3748' };
}

/**
 * Format system message for display
 * Extracts relevant info for rendering
 * 
 * @param message - System message
 * @returns Formatted data for UI
 * 
 * @example
 * const formatted = formatSystemMessage(systemMsg);
 * return (
 *   <div style={{ background: formatted.colors.bg }}>
 *     <span>{formatted.icon} {formatted.label}</span>
 *     <p>{formatted.content}</p>
 *   </div>
 * );
 */
export function formatSystemMessage(message: SystemMessage): {
  icon: string;
  label: string;
  content: string;
  colors: { bg: string; text: string };
  timestamp: Date;
  metadata: any;
} {
  const eventType = message.metadata?.event_type as SystemMessageEventType;

  return {
    icon: getEventIcon(eventType),
    label: getEventLabel(eventType),
    content: message.content,
    colors: getEventColors(eventType),
    timestamp: new Date(message.created_at),
    metadata: message.metadata,
  };
}

/**
 * Check if system message should be collapsed
 * Messages are collapsed if multiple occur in short time period
 * 
 * @param messages - Array of consecutive system messages
 * @returns true if messages should be collapsed into a group
 */
export function shouldCollapseSystemMessages(messages: SystemMessage[]): boolean {
  if (messages.length <= 1) return false;

  const timeThreshold = 5 * 60 * 1000; // 5 minutes
  const first = new Date(messages[0].created_at).getTime();
  const last = new Date(messages[messages.length - 1].created_at).getTime();

  return last - first < timeThreshold;
}

/**
 * Group consecutive system messages by time/type
 * 
 * @param messages - Array of messages
 * @returns Grouped system messages
 * 
 * @example
 * const groups = groupSystemMessages(allMessages);
 * // Returns messages grouped by proximity and type
 */
export function groupSystemMessages(
  messages: Message[]
): Array<{ count: number; messages: SystemMessage[]; firstType: SystemMessageEventType }> {
  const systemMessages = filterSystemMessages(messages);
  const groups: Array<{ count: number; messages: SystemMessage[]; firstType: SystemMessageEventType }> =
    [];

  let currentGroup: SystemMessage[] = [];
  let currentType: SystemMessageEventType | null = null;

  for (const msg of systemMessages) {
    const eventType = msg.metadata?.event_type;
    const timeDiff =
      currentGroup.length > 0
        ? new Date(msg.created_at).getTime() - new Date(currentGroup[currentGroup.length - 1].created_at).getTime()
        : 0;

    // Start new group if event type changes or time gap exceeds threshold
    if (
      currentGroup.length === 0 ||
      currentType !== eventType ||
      timeDiff > 5 * 60 * 1000
    ) {
      if (currentGroup.length > 0) {
        groups.push({
          count: currentGroup.length,
          messages: currentGroup,
          firstType: currentType!,
        });
      }
      currentGroup = [msg];
      currentType = eventType;
    } else {
      currentGroup.push(msg);
    }
  }

  if (currentGroup.length > 0) {
    groups.push({
      count: currentGroup.length,
      messages: currentGroup,
      firstType: currentType!,
    });
  }

  return groups;
}

/**
 * Extract order ID from system message
 * 
 * @param message - System message
 * @returns Order ID if available
 */
export function extractOrderId(message: SystemMessage): string | null {
  return message.metadata?.order_id || null;
}

/**
 * Extract return ID from system message
 * 
 * @param message - System message
 * @returns Return ID if available
 */
export function extractReturnId(message: SystemMessage): string | null {
  return message.metadata?.return_id || null;
}

/**
 * Extract tracking number from system message
 * 
 * @param message - System message
 * @returns Tracking number if available
 */
export function extractTrackingNumber(message: SystemMessage): string | null {
  return message.metadata?.tracking_number || null;
}

/**
 * Check if system message relates to a specific order
 * 
 * @param message - System message
 * @param orderId - Order ID to check
 * @returns true if message is related to order
 */
export function isMessageForOrder(message: SystemMessage, orderId: string): boolean {
  return extractOrderId(message) === orderId;
}

/**
 * Sort messages chronologically (system + regular)
 * 
 * @param messages - Array of messages
 * @param ascending - Sort direction (default: true for ascending)
 * @returns Sorted messages
 */
export function sortMessages(messages: Message[], ascending = true): Message[] {
  return [...messages].sort((a, b) => {
    const timeA = new Date(a.created_at).getTime();
    const timeB = new Date(b.created_at).getTime();
    return ascending ? timeA - timeB : timeB - timeA;
  });
}

/**
 * Get the most recent system message of a type
 * 
 * @param messages - Array of messages
 * @param eventType - Event type to find
 * @returns Most recent matching system message or null
 */
export function getMostRecentSystemMessage(
  messages: Message[],
  eventType: SystemMessageEventType
): SystemMessage | null {
  const matching = filterByEventType(messages, eventType);
  return matching.length > 0 ? matching[matching.length - 1] : null;
}

/**
 * Check if conversation has any system messages
 * 
 * @param messages - Array of messages
 * @returns true if any system messages exist
 */
export function hasSystemMessages(messages: Message[]): boolean {
  return filterSystemMessages(messages).length > 0;
}

/**
 * Get count of system messages in conversation
 * 
 * @param messages - Array of messages
 * @returns Count of system messages
 */
export function countSystemMessages(messages: Message[]): number {
  return filterSystemMessages(messages).length;
}

/**
 * Get percentage of system messages vs total
 * 
 * @param messages - Array of messages
 * @returns Percentage (0-100)
 */
export function getSystemMessagePercentage(messages: Message[]): number {
  if (messages.length === 0) return 0;
  const systemCount = countSystemMessages(messages);
  return (systemCount / messages.length) * 100;
}

/**
 * Validate message structure
 * Ensures message has required fields
 * 
 * @param message - Message to validate
 * @param strict - If true, check all fields strictly
 * @returns Validation result
 */
export function validateMessageStructure(
  message: unknown,
  strict = false
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (typeof message !== 'object' || message === null) {
    return { valid: false, errors: ['Message is not an object'] };
  }

  const msg = message as any;

  // Check required fields
  if (!msg.id || typeof msg.id !== 'string') {
    errors.push('Missing or invalid id');
  }

  if (!msg.conversation_id || typeof msg.conversation_id !== 'string') {
    errors.push('Missing or invalid conversation_id');
  }

  if (!msg.content || typeof msg.content !== 'string') {
    errors.push('Missing or invalid content');
  }

  if (typeof msg.is_system_message !== 'boolean') {
    errors.push('Missing or invalid is_system_message');
  }

  if (typeof msg.is_read !== 'boolean') {
    errors.push('Missing or invalid is_read');
  }

  if (!msg.created_at || typeof msg.created_at !== 'string') {
    errors.push('Missing or invalid created_at');
  }

  // Strict checks
  if (strict) {
    if (msg.is_system_message === true) {
      if (msg.sender_id !== null) {
        errors.push('System message must have null sender_id');
      }
      if (msg.sender_type !== null) {
        errors.push('System message must have null sender_type');
      }
      if (!msg.metadata || typeof msg.metadata !== 'object') {
        errors.push('System message must have metadata object');
      }
    } else if (msg.is_system_message === false) {
      if (typeof msg.sender_id !== 'string' || msg.sender_id.length === 0) {
        errors.push('Regular message must have non-empty sender_id');
      }
      if (msg.sender_type !== 'buyer' && msg.sender_type !== 'seller') {
        errors.push('Regular message must have valid sender_type');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Debug utility: Get detailed message info
 * 
 * @param message - Message to debug
 * @returns Object with detailed info for debugging
 */
export function getMessageDebugInfo(message: Message): {
  isSystem: boolean;
  isRegular: boolean;
  type: 'system' | 'regular';
  eventType?: SystemMessageEventType;
  senderId: string | null;
  senderType: string | null;
  contentLength: number;
  age: string;
  valid: boolean;
} {
  const isSystem = isSystemMessage(message);
  const isRegular = isRegularMessage(message);
  const age = new Date().getTime() - new Date(message.created_at).getTime();
  const ageStr = age < 60000 ? `${Math.round(age / 1000)}s` : `${Math.round(age / 60000)}m`;

  return {
    isSystem,
    isRegular,
    type: isSystem ? 'system' : 'regular',
    eventType: isSystem ? message.metadata?.event_type : undefined,
    senderId: message.sender_id,
    senderType: message.sender_type,
    contentLength: message.content.length,
    age: ageStr,
    valid: validateMessageStructure(message, true).valid,
  };
}
