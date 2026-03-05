/**
 * System Message Service
 * 
 * Backend service for creating, tracking, and managing system messages.
 * Ensures deduplication and proper event tracking.
 */

import { supabase } from '../lib/supabase';
import {
  Message,
  SystemMessageEventType,
  CreateSystemMessageOptions,
  SystemMessageMetadata,
} from '../types/systemMessages';

interface SystemMessageOptions extends CreateSystemMessageOptions {
  conversationId: string;
  eventType: SystemMessageEventType;
  content: string;
  metadata?: Record<string, any>;
  orderId?: string;
}

class SystemMessageService {
  /**
   * Create a system message for a platform event
   * 
   * Features:
   * - Automatic deduplication (prevents duplicate messages for same event)
   * - Proper NULL sender fields
   * - Event metadata tracking
   * - Conversation timestamp update
   * 
   * @param options - Message creation options
   * @returns Created system message or null if duplicate
   * 
   * @example
   * const msg = await systemMessageService.createSystemMessage({
   *   conversationId: 'conv_123',
   *   eventType: SystemMessageEventType.ORDER_SHIPPED,
   *   content: 'Order shipped with DHL',
   *   metadata: { tracking_number: 'TRK123' },
   *   orderId: 'ord_456',
   * });
   */
  async createSystemMessage(options: SystemMessageOptions): Promise<Message | null> {
    const {
      conversationId,
      eventType,
      content,
      metadata = {},
      orderId,
    } = options;

    try {
      // STEP 1: Check for existing message (prevent duplicates)
      if (orderId) {
        const exists = await this.hasEventMessage(orderId, eventType, conversationId);
        if (exists) {
          console.log(
            `[SystemMessageService] Duplicate prevented: ${eventType} for order ${orderId}`
          );
          return null;
        }
      }

      // STEP 2: Insert system message
      // Key: sender_id = null, sender_type = null, is_system_message = true
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: null, // NO HUMAN SENDER
          sender_type: null,
          content,
          is_system_message: true, // SYSTEM MESSAGE FLAG
          metadata: {
            event_type: eventType,
            ...metadata,
          },
          is_read: false,
        })
        .select()
        .single();

      if (msgError) {
        console.error('[SystemMessageService] Error creating message:', msgError);
        return null;
      }

      console.log(`[SystemMessageService] Created ${eventType} message: ${message.id}`);

      // STEP 3: Log to deduplication table
      if (orderId) {
        await this.logMessageSent(orderId, eventType, conversationId, message.id);
      }

      // STEP 4: Update conversation timestamp
      await this.updateConversationTimestamp(conversationId);

      return message as Message;
    } catch (error) {
      console.error('[SystemMessageService] Unexpected error:', error);
      return null;
    }
  }

  /**
   * Get all system messages in a conversation
   * 
   * @param conversationId - Conversation ID
   * @returns Array of system messages
   */
  async getSystemMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_system_message', true)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[SystemMessageService] Error fetching:', error);
        return [];
      }

      return (data as Message[]) || [];
    } catch (error) {
      console.error('[SystemMessageService] Unexpected error:', error);
      return [];
    }
  }

  /**
   * Get system messages of a specific type
   * 
   * @param conversationId - Conversation ID
   * @param eventType - Event type to filter
   * @returns Array of matching system messages
   */
  async getSystemMessagesByType(
    conversationId: string,
    eventType: SystemMessageEventType
  ): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_system_message', true)
        .contains('metadata', { event_type: eventType })
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[SystemMessageService] Error fetching by type:', error);
        return [];
      }

      return (data as Message[]) || [];
    } catch (error) {
      console.error('[SystemMessageService] Unexpected error:', error);
      return [];
    }
  }

  /**
   * Check if system message already exists for an event
   * 
   * @param orderId - Order ID
   * @param eventType - Event type
   * @param conversationId - Conversation ID
   * @returns true if message already sent
   */
  async hasEventMessage(
    orderId: string,
    eventType: SystemMessageEventType,
    conversationId: string
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('message_deduplication_log')
        .select('id')
        .eq('order_id', orderId)
        .eq('status', eventType)
        .eq('conversation_id', conversationId)
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch (error) {
      console.error('[SystemMessageService] Error checking event:', error);
      return false;
    }
  }

  /**
   * Log message to deduplication table
   * 
   * @internal
   */
  private async logMessageSent(
    orderId: string,
    eventType: SystemMessageEventType,
    conversationId: string,
    messageId: string
  ): Promise<void> {
    try {
      const { error } = await supabase.from('message_deduplication_log').insert({
        order_id: orderId,
        status: eventType,
        conversation_id: conversationId,
        message_id: messageId,
      });

      if (error) {
        console.warn('[SystemMessageService] Failed to log message:', error);
      }
    } catch (error) {
      console.warn('[SystemMessageService] Error logging message:', error);
    }
  }

  /**
   * Update conversation's last_message_at timestamp
   * 
   * @internal
   */
  private async updateConversationTimestamp(conversationId: string): Promise<void> {
    try {
      await supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } catch (error) {
      console.warn('[SystemMessageService] Failed to update conversation timestamp:', error);
    }
  }

  /**
   * Get the most recent system message of a type for an order
   * 
   * @param orderId - Order ID
   * @param eventType - Event type
   * @returns Most recent system message or null
   */
  async getMostRecentEventMessage(
    orderId: string,
    eventType: SystemMessageEventType
  ): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('message_deduplication_log')
        .select('message_id, messages(*)')
        .eq('order_id', orderId)
        .eq('status', eventType)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      // The join should give us the message data
      const message = (data as any).messages;
      return message ? (message as Message) : null;
    } catch (error) {
      console.error('[SystemMessageService] Error fetching recent message:', error);
      return null;
    }
  }

  /**
   * Get system message statistics for a conversation
   * 
   * @param conversationId - Conversation ID
   * @returns Statistics about system messages
   */
  async getSystemMessageStats(conversationId: string): Promise<{
    totalSystemMessages: number;
    byEventType: Record<string, number>;
    firstMessage: Message | null;
    lastMessage: Message | null;
  }> {
    try {
      const messages = await this.getSystemMessages(conversationId);

      const stats = {
        totalSystemMessages: messages.length,
        byEventType: {} as Record<string, number>,
        firstMessage: messages.length > 0 ? messages[0] : null,
        lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
      };

      // Count by event type
      for (const msg of messages) {
        const eventType = (msg.metadata?.event_type as string) || 'unknown';
        stats.byEventType[eventType] = (stats.byEventType[eventType] || 0) + 1;
      }

      return stats;
    } catch (error) {
      console.error('[SystemMessageService] Error getting stats:', error);
      return {
        totalSystemMessages: 0,
        byEventType: {},
        firstMessage: null,
        lastMessage: null,
      };
    }
  }

  /**
   * Create multiple system messages (batch)
   * 
   * Useful for creating multiple related messages in one operation
   * 
   * @param messages - Array of message options
   * @returns Array of created messages (skips duplicates)
   */
  async createSystemMessagesBatch(messages: SystemMessageOptions[]): Promise<Message[]> {
    const results: Message[] = [];

    for (const msgOptions of messages) {
      const created = await this.createSystemMessage(msgOptions);
      if (created) {
        results.push(created);
      }
    }

    return results;
  }

  /**
   * Delete a system message (use with caution)
   * 
   * @param messageId - Message ID to delete
   * @returns true if deleted successfully
   */
  async deleteSystemMessage(messageId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('messages').delete().eq('id', messageId);

      if (error) {
        console.error('[SystemMessageService] Error deleting message:', error);
        return false;
      }

      // Also remove from dedup log
      await supabase
        .from('message_deduplication_log')
        .delete()
        .eq('message_id', messageId);

      return true;
    } catch (error) {
      console.error('[SystemMessageService] Unexpected error deleting:', error);
      return false;
    }
  }

  /**
   * Clear all system messages for an order
   * Use with caution - typically for testing only
   * 
   * @param orderId - Order ID
   * @returns Number of messages deleted
   */
  async clearSystemMessagesForOrder(orderId: string): Promise<number> {
    try {
      // Get all dedup entries for this order
      const { data: dedupEntries, error: dedupError } = await supabase
        .from('message_deduplication_log')
        .select('message_id')
        .eq('order_id', orderId);

      if (dedupError) return 0;

      let deleted = 0;

      // Delete each message
      for (const entry of dedupEntries || []) {
        const success = await this.deleteSystemMessage(entry.message_id);
        if (success) deleted++;
      }

      return deleted;
    } catch (error) {
      console.error('[SystemMessageService] Error clearing messages:', error);
      return 0;
    }
  }

  /**
   * Validate system message structure
   * 
   * @param message - Message to validate
   * @returns Validation result
   */
  validateSystemMessage(message: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message.id) errors.push('Missing id');
    if (!message.conversation_id) errors.push('Missing conversation_id');
    if (!message.content) errors.push('Missing content');
    if (message.is_system_message !== true) errors.push('is_system_message must be true');
    if (message.sender_id !== null) errors.push('sender_id must be null');
    if (message.sender_type !== null) errors.push('sender_type must be null');
    if (!message.metadata?.event_type) errors.push('Missing metadata.event_type');

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const systemMessageService = new SystemMessageService();
