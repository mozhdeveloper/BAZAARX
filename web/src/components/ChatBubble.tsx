/**
 * ChatBubble - Floating draggable chat bubble like Shopee
 * Allows buyers to chat with sellers from anywhere in the app
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Image as ImageIcon,
  ChevronDown,
  Store,
  Package
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';
import { useBuyerStore } from '@/stores/buyerStore';
import { chatService, Message, Conversation } from '@/services/chatService';

interface ChatMessage {
  id: string;
  sender: 'buyer' | 'seller' | 'system';
  message: string;
  timestamp: Date;
  read: boolean;
}

export function ChatBubble() {
  const {
    isOpen,
    isMiniMode,
    chatTarget,
    unreadCount,
    position,
    openChat,
    closeChat,
    toggleChat,
    setMiniMode,
    setUnreadCount,
    setPosition,
    clearChatTarget
  } = useChatStore();

  const { profile } = useBuyerStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isBubbleHovered, setIsBubbleHovered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load conversation when chat target changes
  useEffect(() => {
    const loadConversation = async () => {
      if (!chatTarget?.sellerId || !profile?.id) {
        return;
      }

      setIsLoading(true);
      try {
        // If seller-initiated (has buyerId), use buyerId and sellerId correctly
        const buyerId = chatTarget.buyerId || profile.id;
        const sellerId = chatTarget.buyerId ? chatTarget.sellerId : chatTarget.sellerId;
        const conv = await chatService.getOrCreateConversation(buyerId, sellerId, chatTarget.orderId);

        if (conv) {
          setConversation(conv);

          // Load messages
          const msgs = await chatService.getMessages(conv.id);

          // Determine current user type for display
          const currentUserType = chatTarget.buyerId ? 'seller' : 'buyer';

          const formattedMessages: ChatMessage[] = msgs.map((msg: Message) => ({
            id: msg.id,
            sender: msg.sender_type as 'buyer' | 'seller',
            message: msg.content,
            timestamp: new Date(msg.created_at),
            read: msg.is_read,
          }));

          // Add product context message if product specified
          if (chatTarget.productId && formattedMessages.length === 0) {
            formattedMessages.unshift({
              id: 'system-product-inquiry',
              sender: 'system',
              message: `Inquiry about: ${chatTarget.productName || 'Product'}`,
              timestamp: new Date(),
              read: true,
            });
          }

          // Add order context for seller-initiated chats
          if (chatTarget.orderId && formattedMessages.length === 0) {
            formattedMessages.unshift({
              id: 'system-order-inquiry',
              sender: 'system',
              message: `Regarding: ${chatTarget.productName || 'Order'}`,
              timestamp: new Date(),
              read: true,
            });
          }

          setMessages(formattedMessages);

          // Mark messages as read
          await chatService.markConversationAsRead(conv.id, currentUserType);
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && chatTarget) {
      loadConversation();
    }
  }, [isOpen, chatTarget, profile?.id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversation?.id) return;

    const subscription = chatService.subscribeToConversation(
      conversation.id,
      (newMessage: Message) => {
        const formattedMessage: ChatMessage = {
          id: newMessage.id,
          sender: newMessage.sender_type as 'buyer' | 'seller',
          message: newMessage.content,
          timestamp: new Date(newMessage.created_at),
          read: newMessage.is_read,
        };

        setMessages(prev => {
          if (prev.some(m => m.id === newMessage.id)) return prev;
          return [...prev, formattedMessage];
        });

        if (newMessage.sender_type === 'seller') {
          if (!isOpen) {
            setUnreadCount(unreadCount + 1);
          } else {
            chatService.markConversationAsRead(conversation.id, 'buyer');
          }
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [conversation?.id, isOpen]);

  // Handle send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation?.id || !profile?.id || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Determine sender type based on chat initiation
    const senderType = chatTarget?.buyerId ? 'seller' : 'buyer';

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender: senderType,
      message: messageContent,
      timestamp: new Date(),
      read: false,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const sentMessage = await chatService.sendMessage(
        conversation.id,
        profile.id,
        senderType,
        messageContent
      );

      // Replace temp message with real one
      if (sentMessage) {
        setMessages(prev =>
          prev.map(m => m.id === tempId ? {
            id: sentMessage.id,
            sender: senderType,
            message: sentMessage.content,
            timestamp: new Date(sentMessage.created_at),
            read: sentMessage.is_read,
          } : m)
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // Handle drag
  const handleDragEnd = useCallback((event: any, info: any) => {
    const newX = Math.max(0, Math.min(window.innerWidth - 64, position.x + info.offset.x));
    const newY = Math.max(0, Math.min(window.innerHeight - 64, position.y + info.offset.y));
    setPosition({ x: newX, y: newY });
    setIsDragging(false);
  }, [position, setPosition]);

  // Don't render if no chat target and not open
  if (!chatTarget && !isOpen) {
    return null;
  }

  // Mini bubble mode (just the floating icon)
  if (isMiniMode || !isOpen) {
    return (
      <motion.div
        ref={bubbleRef}
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        onMouseEnter={() => setIsBubbleHovered(true)}
        onMouseLeave={() => setIsBubbleHovered(false)}
        style={{
          position: 'fixed',
          right: 20,
          bottom: 30,
          zIndex: 9999,
          touchAction: 'none',
        }}
        className="cursor-grab active:cursor-grabbing"
      >
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            if (!isDragging) {
              toggleChat();
            }
          }}
          className={cn(
            "relative w-14 h-14 rounded-full shadow-lg flex items-center justify-center",
            "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]",
            "transition-all duration-200"
          )}
        >
          <MessageCircle className="w-6 h-6 text-white" />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}

          {/* Pulse animation when has target */}
          {chatTarget && (
            <span className="absolute inset-0 rounded-full bg-[var(--brand-primary)] animate-ping opacity-25" />
          )}
        </motion.button>

        {/* Mini preview tooltip */}
        {chatTarget && !isOpen && isBubbleHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute bottom-full right-0 mb-4 bg-white rounded-2xl shadow-2xl p-4 min-w-[240px] pointer-events-none border border-[var(--brand-primary)]/10"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <Store className="w-4 h-4 text-[var(--brand-primary)]" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-gray-900 block truncate">
                  {chatTarget.sellerName}
                </span>
                {chatTarget.productName && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
                    About: {chatTarget.productName}
                  </p>
                )}
              </div>
            </div>
            {/* Simple arrow */}
            <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-white border-r border-b border-[var(--brand-primary)]/10 rotate-45" />
          </motion.div>
        )}
      </motion.div>
    );
  }

  // Full chat window
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-[9999] w-[380px] max-w-[calc(100vw-32px)]"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col h-[500px] max-h-[calc(100vh-100px)]">
          {/* Header */}
          <div className="bg-[var(--brand-primary)] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {chatTarget?.sellerAvatar ? (
                <img
                  src={chatTarget.sellerAvatar}
                  alt={chatTarget.sellerName}
                  className="w-10 h-10 rounded-full border-2 border-white/30 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold text-sm truncate">
                  {chatTarget?.sellerName || 'Chat with Seller'}
                </h3>
                <p className="text-white/80 text-xs">Usually replies within minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMiniMode(true)}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  closeChat();
                  clearChatTarget();
                }}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Product context bar */}
          {chatTarget?.productId && chatTarget?.productImage && (
            <div className="bg-[var(--brand-primary)]/[0.03] px-4 py-2 border-b border-[var(--brand-primary)]/10 flex items-center gap-3">
              <img
                src={chatTarget.productImage}
                alt={chatTarget.productName}
                className="w-10 h-10 rounded-lg object-cover border border-[var(--brand-primary)]/10"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--brand-primary)] font-medium">Inquiry about:</p>
                <p className="text-sm text-gray-900 truncate">{chatTarget.productName}</p>
              </div>
              <Package className="w-4 h-4 text-[var(--brand-primary)]/50" />
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 bg-[var(--brand-primary)]/10 rounded-full flex items-center justify-center mb-3">
                  <MessageCircle className="w-8 h-8 text-[var(--brand-primary)]" />
                </div>
                <p className="text-gray-500 text-sm">Start a conversation with the seller</p>
                <p className="text-gray-400 text-xs mt-1">Ask about products, shipping, or anything else</p>
              </div>
            ) : (
              <>
                {messages.map((msg) => {
                  // "my message" = same sender type as current user
                  const isMine = chatTarget?.buyerId
                    ? msg.sender === 'seller'  // seller-initiated: seller messages on right
                    : msg.sender === 'buyer';  // buyer-initiated: buyer messages on right
                  return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      isMine ? 'justify-end' : 'justify-start',
                      msg.sender === 'system' && 'justify-center'
                    )}
                  >
                    {msg.sender === 'system' ? (
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full">
                        {msg.message}
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "max-w-[75%] px-4 py-2.5 rounded-2xl",
                          isMine
                            ? 'bg-[var(--brand-primary)] text-white rounded-br-md'
                            : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                        )}
                      >
                        <p className="text-sm leading-relaxed">{msg.message}</p>
                        <p className={cn(
                          "text-[10px] mt-1",
                          isMine ? 'text-white/70' : 'text-gray-400'
                        )}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    )}
                  </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 bg-white p-3">
            {!profile?.id ? (
              <div className="text-center py-2">
                <p className="text-sm text-gray-500 mb-2">Please log in to chat</p>
                <Button
                  size="sm"
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                  onClick={() => window.location.href = '/login'}
                >
                  Sign In
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:bg-white transition-all"
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all",
                    newMessage.trim()
                      ? "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
                      : "bg-gray-200 text-gray-400"
                  )}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
