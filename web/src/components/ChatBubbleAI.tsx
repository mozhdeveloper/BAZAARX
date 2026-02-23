/**
 * ChatBubble - Floating draggable chat bubble with AI Assistant
 * Features:
 * - AI-powered chat using Gemini 2.5 Flash
 * - Product and store context awareness
 * - "Talk to Seller" feature with notifications
 * - Quick reply suggestions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Minimize2,
  Store,
  Package,
  Bot,
  User,
  Sparkles,
  Phone,
  ArrowRight,
  RefreshCw,
  Zap
} from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { useChatStore } from '@/stores/chatStore';
import { useBuyerStore } from '@/stores/buyerStore';
import { chatService, Message, Conversation } from '@/services/chatService';
import { aiChatService, ProductContext, StoreContext, ChatContext, ReviewSummary } from '../services/aiChatService';

interface ChatMessage {
  id: string;
  sender: 'buyer' | 'seller' | 'system' | 'ai';
  message: string;
  timestamp: Date;
  read: boolean;
  isTyping?: boolean;
}

type ChatMode = 'ai' | 'seller';

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
  const [chatMode, setChatMode] = useState<ChatMode>('ai');
  const [productContext, setProductContext] = useState<ProductContext | null>(null);
  const [storeContext, setStoreContext] = useState<StoreContext | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showTalkToSeller, setShowTalkToSeller] = useState(false);
  const [sellerNotified, setSellerNotified] = useState(false);
  const [isBubbleHovered, setIsBubbleHovered] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load product and store context
  useEffect(() => {
    const loadContext = async () => {
      if (!chatTarget) return;

      // Load product context if product is specified
      if (chatTarget.productId) {
        const product = await aiChatService.getProductDetails(chatTarget.productId);
        setProductContext(product);

        // Load review summary for product
        const reviews = await aiChatService.getReviewSummary(chatTarget.productId);
        setReviewSummary(reviews);
      }

      // Load store context
      if (chatTarget.sellerId) {
        const store = await aiChatService.getStoreDetails(chatTarget.sellerId);
        setStoreContext(store);
      }
    };

    loadContext();
  }, [chatTarget]);

  // Update quick replies when context changes
  useEffect(() => {
    const context: ChatContext = {
      product: productContext || undefined,
      store: storeContext || undefined,
      reviews: reviewSummary || undefined,
    };
    setQuickReplies(aiChatService.getQuickReplies(context));
  }, [productContext, storeContext, reviewSummary]);

  // Add welcome message when chat opens in AI mode
  useEffect(() => {
    if (isOpen && chatMode === 'ai' && messages.length === 0) {
      const context: ChatContext = {
        product: productContext || undefined,
        store: storeContext || undefined,
        reviews: reviewSummary || undefined,
      };
      const welcomeMessage: ChatMessage = {
        id: 'ai-welcome',
        sender: 'ai',
        message: aiChatService.getWelcomeMessage(context),
        timestamp: new Date(),
        read: true,
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, chatMode, productContext, storeContext, reviewSummary]);

  // Load conversation when switching to seller mode
  useEffect(() => {
    const loadConversation = async () => {
      if (chatMode !== 'seller' || !chatTarget?.sellerId || !profile?.id) {
        return;
      }

      setIsLoading(true);
      try {
        const conv = await chatService.getOrCreateConversation(profile.id, chatTarget.sellerId);

        if (conv) {
          setConversation(conv);

          // Load messages
          const msgs = await chatService.getMessages(conv.id);

          const formattedMessages: ChatMessage[] = msgs.map((msg: Message) => ({
            id: msg.id,
            sender: msg.sender_type as 'buyer' | 'seller',
            message: msg.content,
            timestamp: new Date(msg.created_at),
            read: msg.is_read,
          }));

          setMessages(formattedMessages);

          // Mark messages as read
          await chatService.markConversationAsRead(conv.id, 'buyer');
          setUnreadCount(0);
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && chatMode === 'seller') {
      loadConversation();
    }
  }, [isOpen, chatMode, chatTarget, profile?.id]);

  // Subscribe to real-time updates in seller mode
  useEffect(() => {
    if (chatMode !== 'seller' || !conversation?.id) return;

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
  }, [chatMode, conversation?.id, isOpen]);

  // Handle AI message
  const handleAiMessage = async (message: string) => {
    if (!message.trim() || isAiTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'buyer',
      message: message.trim(),
      timestamp: new Date(),
      read: true,
    };
    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsAiTyping(true);

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'ai-typing',
      sender: 'ai',
      message: '',
      timestamp: new Date(),
      read: true,
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    try {
      const context: ChatContext = {
        product: productContext || undefined,
        store: storeContext || undefined,
        reviews: reviewSummary || undefined,
      };

      const { response, suggestTalkToSeller } = await aiChatService.sendMessage(message, context);

      // Remove typing indicator and add real response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'ai-typing');
        return [...filtered, {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          message: response,
          timestamp: new Date(),
          read: true,
        }];
      });

      if (suggestTalkToSeller) {
        setShowTalkToSeller(true);
      }
    } catch (error) {
      console.error('AI message error:', error);
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'ai-typing');
        return [...filtered, {
          id: `ai-error-${Date.now()}`,
          sender: 'ai',
          message: "I'm having trouble right now. Would you like to talk to the seller directly?",
          timestamp: new Date(),
          read: true,
        }];
      });
      setShowTalkToSeller(true);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Handle seller message
  const handleSellerMessage = async () => {
    if (!newMessage.trim() || !conversation?.id || !profile?.id || isSending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      sender: 'buyer',
      message: messageContent,
      timestamp: new Date(),
      read: false,
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const sentMessage = await chatService.sendMessage(
        conversation.id,
        profile.id,
        'buyer',
        messageContent
      );

      // Replace temp message with real one
      if (sentMessage) {
        setMessages(prev =>
          prev.map(m => m.id === tempId ? {
            id: sentMessage.id,
            sender: 'buyer',
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

  // Handle send message based on mode
  const handleSendMessage = async () => {
    if (chatMode === 'ai') {
      await handleAiMessage(newMessage);
    } else {
      await handleSellerMessage();
    }
  };

  // Handle "Talk to Seller" button
  const handleTalkToSeller = async () => {
    if (!profile?.id || !chatTarget?.sellerId) return;

    // Get buyer's full name
    const buyerName = profile.firstName && profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.firstName || 'A buyer';

    // Notify seller
    const success = await aiChatService.notifySellerForChat(
      chatTarget.sellerId,
      profile.id,
      buyerName,
      chatTarget.productId,
      chatTarget.productName
    );

    if (success) {
      setSellerNotified(true);
      // Switch to seller chat mode
      setChatMode('seller');
      aiChatService.resetConversation();
      setMessages([]);
    }
  };

  // Handle quick reply
  const handleQuickReply = (reply: string) => {
    setNewMessage(reply);
    handleAiMessage(reply);
  };

  // Reset chat
  const handleResetChat = () => {
    aiChatService.resetConversation();
    setMessages([]);
    setChatMode('ai');
    setShowTalkToSeller(false);
    setSellerNotified(false);
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
              className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--brand-primary)] text-white text-xs font-bold rounded-full flex items-center justify-center"
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
                <Sparkles className="w-4 h-4 text-[var(--brand-primary)]" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-bold text-gray-900 block">
                  AI Assistant Ready
                </span>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">
                  Ask about: {chatTarget.productName || chatTarget.sellerName}
                </p>
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
        className="fixed bottom-4 right-4 z-[9999] w-[400px] max-w-[calc(100vw-32px)]"
      >
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col h-[550px] max-h-[calc(100vh-100px)]">
          {/* Header */}
          <div className={cn(
            "px-4 py-3 flex items-center justify-between",
            chatMode === 'ai'
              ? "bg-[var(--brand-accent)]"
              : "bg-[var(--brand-primary)]"
          )}>
            <div className="flex items-center gap-3">
              {chatMode === 'ai' ? (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              ) : chatTarget?.sellerAvatar ? (
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
                <h3 className="text-white font-semibold text-sm truncate flex items-center gap-2">
                  {chatMode === 'ai' ? (
                    <>
                      BazBot AI
                      <Sparkles className="w-3 h-3" />
                    </>
                  ) : (
                    chatTarget?.sellerName || 'Chat with Seller'
                  )}
                </h3>
                <p className={cn(
                  "text-xs",
                  chatMode === 'ai' ? "text-white/80" : "text-white/80"
                )}>
                  {chatMode === 'ai'
                    ? 'Your AI shopping assistant'
                    : 'Usually replies within minutes'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {chatMode === 'ai' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleResetChat}
                  className="text-white hover:bg-white/20 h-8 w-8"
                  title="Reset conversation"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
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
                  handleResetChat();
                }}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b">
            <button
              onClick={() => {
                setChatMode('ai');
                if (chatMode !== 'ai') {
                  setMessages([]);
                  aiChatService.resetConversation();
                }
              }}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                chatMode === 'ai'
                  ? "bg-[var(--brand-accent)] text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              <Bot className="w-4 h-4" />
              AI Assistant
            </button>
            <button
              onClick={() => {
                setChatMode('seller');
                if (chatMode !== 'seller') {
                  setMessages([]);
                }
              }}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2",
                chatMode === 'seller'
                  ? "bg-[var(--brand-primary)] text-white shadow-md"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              )}
            >
              <User className="w-4 h-4" />
              Talk to Seller
            </button>
          </div>

          {/* Product context bar */}
          {chatTarget?.productId && chatTarget?.productImage && (
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-3">
              <img
                src={chatTarget.productImage}
                alt={chatTarget.productName}
                className="w-10 h-10 rounded-lg object-cover border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Asking about:</p>
                <p className="text-sm text-gray-900 truncate">{chatTarget.productName}</p>
              </div>
              <Package className="w-4 h-4 text-gray-400" />
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center mb-3",
                  chatMode === 'ai' ? "bg-[var(--brand-primary)]/10" : "bg-[var(--brand-primary)]/10"
                )}>
                  {chatMode === 'ai' ? (
                    <Bot className="w-8 h-8 text-[var(--brand-primary)]" />
                  ) : (
                    <MessageCircle className="w-8 h-8 text-[var(--brand-primary)]" />
                  )}
                </div>
                <p className="text-gray-500 text-sm">
                  {chatMode === 'ai'
                    ? 'Ask me anything about the product or store!'
                    : 'Start a conversation with the seller'}
                </p>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.sender === 'buyer' ? 'justify-end' : 'justify-start',
                      msg.sender === 'system' && 'justify-center'
                    )}
                  >
                    {msg.sender === 'system' ? (
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full">
                        {msg.message}
                      </div>
                    ) : msg.isTyping ? (
                      <div className="bg-white text-gray-900 rounded-2xl rounded-bl-md shadow-sm border border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-[var(--brand-accent)]/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-[var(--brand-primary)]/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-[var(--brand-primary)]/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-end gap-2 max-w-[80%]">
                        {(msg.sender === 'ai' || msg.sender === 'seller') && (
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                            msg.sender === 'ai' ? "bg-[var(--brand-primary)]/10" : "bg-[var(--brand-primary)]/10"
                          )}>
                            {msg.sender === 'ai' ? (
                              <Bot className="w-3 h-3 text-[var(--brand-primary)]" />
                            ) : (
                              <Store className="w-3 h-3 text-[var(--brand-primary)]" />
                            )}
                          </div>
                        )}
                        <div
                          className={cn(
                            "px-4 py-2.5 rounded-2xl",
                            msg.sender === 'buyer'
                              ? chatMode === 'ai'
                                ? 'bg-[var(--brand-accent)] text-white rounded-br-md'
                                : 'bg-[var(--brand-primary)] text-white rounded-br-md'
                              : msg.sender === 'ai'
                                ? 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-[var(--brand-primary)]/10'
                                : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                          )}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                          <p className={cn(
                            "text-[10px] mt-1",
                            msg.sender === 'buyer' ? 'text-white/70' : 'text-gray-400'
                          )}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick replies for AI mode */}
          {chatMode === 'ai' && messages.length > 0 && messages.length <= 3 && !isAiTyping && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Quick questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickReply(reply)}
                    className="text-xs bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:bg-[var(--brand-primary)]/5 hover:border-[var(--brand-primary)]/20 hover:text-[var(--brand-primary)] transition-all"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Talk to Seller suggestion */}
          {chatMode === 'ai' && showTalkToSeller && !sellerNotified && (
            <div className="px-4 py-3 bg-[var(--brand-primary)]/[0.03] border-t border-[var(--brand-primary)]/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[var(--brand-primary)]" />
                  <span className="text-sm text-[var(--brand-primary-dark)]">Need more help?</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleTalkToSeller}
                  className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white text-xs h-8"
                >
                  Talk to Seller
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Seller notified confirmation */}
          {sellerNotified && chatMode === 'seller' && (
            <div className="px-4 py-2 bg-green-50 border-t border-green-100">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-700">
                  Seller has been notified and will respond soon!
                </span>
              </div>
            </div>
          )}

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
                  placeholder={chatMode === 'ai' ? "Ask BazBot anything..." : "Type a message..."}
                  className="flex-1 px-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:bg-white transition-all"
                  disabled={isAiTyping}
                />
                <Button
                  size="icon"
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isSending || isAiTyping}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all",
                    newMessage.trim()
                      ? chatMode === 'ai'
                        ? "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-dark,var(--brand-accent))]"
                        : "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)]"
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
