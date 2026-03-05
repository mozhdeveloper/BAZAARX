/**
 * SystemMessageBadge Component (Web)
 * 
 * Renders system messages as centered badges that break conversation flow.
 * Never renders as regular chat bubbles with avatars.
 */

import React from 'react';
import { SystemMessage } from '../types/systemMessages';
import {
  formatSystemMessage,
  getEventLabel,
  getEventIcon,
  getEventColors,
} from '../utils/messageUtils';

interface SystemMessageBadgeProps {
  message: SystemMessage;
  compact?: boolean;
}

/**
 * System Message Badge Component
 * 
 * Features:
 * - Center-aligned badge design
 * - Light gray background with neutral colors
 * - Icon + event label + message content
 * - No avatar, no sender info
 * - Responsive sizing
 * 
 * @example
 * <SystemMessageBadge message={systemMessage} />
 * 
 * @example
 * <SystemMessageBadge message={systemMessage} compact={true} />
 */
export function SystemMessageBadge({ message, compact = false }: SystemMessageBadgeProps) {
  const formatted = formatSystemMessage(message);

  if (compact) {
    return (
      <div className="flex justify-center my-3">
        <div
          className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
          style={{
            backgroundColor: formatted.colors.bg,
            color: formatted.colors.text,
          }}
        >
          <span>{formatted.icon}</span>
          <span>{formatted.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center my-4">
      <div
        className="px-4 py-3 rounded-lg max-w-md backdrop-blur-sm"
        style={{
          backgroundColor: formatted.colors.bg,
          color: formatted.colors.text,
          border: `1px solid ${formatted.colors.text}15`,
        }}
      >
        {/* Icon + Label */}
        <div className="flex items-center gap-2 mb-2 font-semibold text-sm">
          <span className="text-lg">{formatted.icon}</span>
          <span>{formatted.label}</span>
        </div>

        {/* Message Content */}
        <p className="text-sm leading-relaxed opacity-90">{formatted.content}</p>

        {/* Timestamp */}
        <div className="text-xs mt-2 opacity-60">
          {formatted.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * System Message Badge - Mobile Version
 * 
 * Compact mobile-optimized version of system message badge
 */
export function SystemMessageBadgeMobile({ message }: SystemMessageBadgeProps) {
  const formatted = formatSystemMessage(message);

  return (
    <div className="flex justify-center my-3 px-4">
      <div
        className="flex-1 px-3 py-2 rounded-lg"
        style={{
          backgroundColor: formatted.colors.bg,
          color: formatted.colors.text,
        }}
      >
        <div className="flex items-start gap-2">
          <span className="text-xl flex-shrink-0">{formatted.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{formatted.label}</p>
            <p className="text-xs mt-1 opacity-80 leading-snug break-words">
              {formatted.content}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * System Message Group Component
 * 
 * Renders multiple consecutive system messages as a group
 */
interface SystemMessageGroupProps {
  messages: SystemMessage[];
}

export function SystemMessageGroup({ messages }: SystemMessageGroupProps) {
  if (messages.length === 0) return null;

  return (
    <div className="space-y-2 my-4">
      {messages.map((msg) => (
        <SystemMessageBadge key={msg.id} message={msg} compact={messages.length > 1} />
      ))}
    </div>
  );
}

/**
 * Integrated Message List Item
 * 
 * A wrapper component that renders either a system message or regular message
 * Use this when rendering mixed message lists
 */
import type { Message } from '../types/systemMessages';
import { isSystemMessage } from '../utils/messageUtils';

interface MessageListItemProps {
  message: Message;
  showAvatar?: boolean;
  onReply?: (message: Message) => void;
}

export function MessageListItem({ message, showAvatar = true, onReply }: MessageListItemProps) {
  if (isSystemMessage(message)) {
    return <SystemMessageBadge message={message} />;
  }

  // Regular message rendering would go here
  // This is a placeholder - implement based on your RegularMessage component
  return (
    <div className={`flex ${message.sender_type === 'buyer' ? 'justify-start' : 'justify-end'} my-2`}>
      <div
        className={`max-w-xs px-4 py-2 rounded-lg ${
          message.sender_type === 'buyer'
            ? 'bg-gray-100 text-gray-900 rounded-bl-none'
            : 'bg-orange-500 text-white rounded-br-none'
        }`}
      >
        <p className="text-sm">{message.content}</p>
        <p className="text-xs mt-1 opacity-70">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
