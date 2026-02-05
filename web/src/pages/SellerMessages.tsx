import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/sellerStore';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { sellerLinks } from '@/config/sellerLinks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Paperclip,
  LogOut,
  ChevronLeft,
  MessageCircle,
  Clock,
  User,
  Loader2
} from 'lucide-react';
import { chatService, Conversation as DBConversation, Message as DBMessage } from '../services/chatService';

interface Message {
  id: string;
  senderId: string;
  text: string;
  images?: string[];
  timestamp: Date;
  isRead: boolean;
}

interface Conversation {
  id: string;
  buyerName: string;
  buyerImage?: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

// Logo components
const Logo = () => (
  <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
    <img src="/Logo.png" alt="BazaarPH Logo" className="h-5 w-6 flex-shrink-0" />
    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium text-black whitespace-pre">
      BazaarPH Seller
    </motion.span>
  </Link>
);

const LogoIcon = () => (
  <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
    <img src="/Logo.png" alt="BazaarPH Logo" className="h-8 w-8 object-contain flex-shrink-0" />
  </Link>
);

export default function SellerMessages() {
  const { seller, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/seller/auth');
  };

  // Mock Data
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      buyerName: 'Juan Dela Cruz',
      lastMessage: 'Is this item still available?',
      lastMessageTime: new Date('2025-12-23T11:55:00'),
      unreadCount: 1,
      messages: [
        {
          id: 'm1',
          senderId: 'buyer',
          text: 'Hi, I saw your listing for the Wireless Earbuds.',
          timestamp: new Date('2025-12-23T11:00:00'),
          isRead: true
        },
        {
          id: 'm2',
          senderId: 'buyer',
          text: 'Is this item still available?',
          timestamp: new Date('2025-12-23T11:55:00'),
          isRead: false
        }
      ]
    },
    {
      id: '2',
      buyerName: 'Maria Santos',
      lastMessage: 'Thank you for the fast delivery!',
      lastMessageTime: new Date('2025-12-22T12:00:00'),
      unreadCount: 0,
      messages: [
        {
          id: 'm3',
          senderId: 'seller',
          text: 'Your order has been shipped!',
          timestamp: new Date('2025-12-22T11:00:00'),
          isRead: true
        },
        {
          id: 'm4',
          senderId: 'buyer',
          text: 'Thank you for the fast delivery!',
          timestamp: new Date('2025-12-22T12:00:00'),
          isRead: true
        }
      ]
    }
  ]);

  // Real data state
  const [dbConversations, setDbConversations] = useState<DBConversation[]>([]);
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Check if using real data
  const useRealData = dbConversations.length > 0;

  // Load real conversations from Supabase
  const loadConversations = useCallback(async () => {
    if (!seller?.id) {
      setLoading(false);
      return;
    }

    try {
      const convs = await chatService.getSellerConversations(seller.id);
      setDbConversations(convs);
    } catch (error) {
      console.error('[SellerMessages] Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [seller?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Auto-select first conversation when conversations load
  useEffect(() => {
    if (dbConversations.length > 0 && !selectedConversation) {
      setSelectedConversation(dbConversations[0].id);
    }
  }, [dbConversations, selectedConversation]);

  // Load messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation || !useRealData) return;

    const loadMessages = async () => {
      const msgs = await chatService.getMessages(selectedConversation);
      setDbMessages(msgs);

      // Mark as read
      if (seller?.id) {
        chatService.markAsRead(selectedConversation, seller.id, 'seller');
      }
    };

    loadMessages();
  }, [selectedConversation, useRealData, seller?.id]);

  // Subscribe to new messages
  useEffect(() => {
    if (!selectedConversation || !useRealData) return;

    const unsubscribe = chatService.subscribeToMessages(
      selectedConversation,
      (newMsg) => {
        // Prevent duplicates
        setDbMessages(prev => {
          const exists = prev.some(msg => msg.id === newMsg.id);
          if (exists) return prev;
          return [...prev, newMsg];
        });

        if (newMsg.sender_type === 'buyer' && seller?.id) {
          chatService.markAsRead(selectedConversation, seller.id, 'seller');
        }
      }
    );

    return unsubscribe;
  }, [selectedConversation, useRealData, seller?.id]);

  // Normalize db conversations to match expected format
  const normalizedDbConversations = useMemo(() => {
    return dbConversations.map(conv => ({
      id: conv.id,
      buyerName: conv.buyer_name || conv.buyer?.full_name || conv.buyer_email || 'Unknown Customer',
      buyerImage: conv.buyer_avatar || conv.buyer?.avatar_url,
      lastMessage: conv.last_message || '',
      lastMessageTime: conv.last_message_at ? new Date(conv.last_message_at) : new Date(),
      unreadCount: conv.seller_unread_count || 0,
      messages: dbMessages
        .filter(msg => msg.conversation_id === conv.id)
        .map(msg => ({
          id: msg.id,
          senderId: msg.sender_type,
          text: msg.content,
          images: msg.image_url ? [msg.image_url] : undefined,
          timestamp: new Date(msg.created_at),
          isRead: msg.is_read
        }))
    }));
  }, [dbConversations, dbMessages]);

  const activeConversation = useRealData
    ? normalizedDbConversations.find(c => c.id === selectedConversation)
    : conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string, imageUrls?: string[]) => {
    e?.preventDefault();
    const messageText = textOverride || newMessage;
    if (!messageText.trim() && (!imageUrls || imageUrls.length === 0) || !selectedConversation) return;

    // Real data mode
    if (useRealData && seller?.id) {
      setSending(true);
      try {
        const result = await chatService.sendMessage(
          selectedConversation,
          seller.id,
          'seller',
          messageText.trim()
        );
        if (result) {
          setNewMessage('');
        }
      } catch (error) {
        console.error('Error sending message:', error);
      } finally {
        setSending(false);
      }
      return;
    }

    // Mock data mode
    const updatedConversations = conversations.map(c => {
      if (c.id === selectedConversation) {
        return {
          ...c,
          lastMessage: messageText ? `You: ${messageText}` : (imageUrls && imageUrls.length > 0 ? `You sent ${imageUrls.length > 1 ? `${imageUrls.length} images` : 'an image'}` : messageText),
          lastMessageTime: new Date(),
          messages: [
            ...c.messages,
            {
              id: `m${Date.now()}`,
              senderId: 'seller',
              text: messageText,
              images: imageUrls,
              timestamp: new Date(),
              isRead: true
            }
          ]
        };
      }
      return c;
    });

    setConversations(updatedConversations);
    if (!textOverride && !imageUrls) setNewMessage('');
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const uploadPromises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.readAsDataURL(file);
        });
      });

      const urls = await Promise.all(uploadPromises);
      handleSendMessage(undefined, '', urls);

      // Clear input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtered conversations (supports both mock and real data)
  const filteredConversations = useRealData
    ? normalizedDbConversations.filter(conv =>
      conv.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : conversations
      .filter(conv =>
        conv.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const timeA = a.lastMessageTime ? a.lastMessageTime.getTime() : 0;
        const timeB = b.lastMessageTime ? b.lastMessageTime.getTime() : 0;
        return timeB - timeA;
      });

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-2">
              {sellerLinks.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <SidebarLink
              link={{
                label: seller?.storeName || "Store",
                href: "/seller/store-profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-medium">
                    {seller?.storeName?.charAt(0) || 'S'}
                  </div>
                ),
              }}
            />
            <button onClick={handleLogout} className="flex items-center gap-2 w-full px-2 py-2 text-sm text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors">
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {open && <span>Logout</span>}
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex h-full overflow-hidden max-w-7xl mx-auto w-full p-0 md:p-6 gap-0 md:gap-6">
          {/* Conversations List Sidebar */}
          <div className="w-full md:w-80 border-r bg-white flex flex-col md:rounded-2xl md:shadow-sm md:border border-gray-100 overflow-hidden hidden md:flex">
            <div className="p-4 border-b border-gray-50 bg-white">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search buyers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-orange-500 rounded-xl py-5 shadow-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm">Loading conversations...</p>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <MessageCircle className="h-12 w-12 mb-2" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs text-gray-400 mt-1">Your customer chats will appear here</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-all border-l-4 ${selectedConversation === conv.id
                      ? 'bg-orange-50 border-l-orange-500'
                      : 'border-l-transparent'
                      }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarFallback className="bg-orange-100 text-orange-600 font-bold">
                            {conv.buyerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <h4 className="font-bold text-gray-900 truncate">{conv.buyerName}</h4>
                          <span className="text-[10px] font-semibold text-gray-400 uppercase">
                            {conv.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                          {conv.lastMessage}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-orange-500 hover:bg-orange-600 rounded-full h-5 min-w-[20px] flex items-center justify-center p-0.5 text-[10px]">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-white md:rounded-2xl md:shadow-sm md:border border-gray-100 overflow-hidden relative">
            {activeConversation ? (
              <>
                {/* Chat Header - Mobile Style Orange */}
                <div className="bg-[#ff6a00] p-4 flex items-center gap-4 text-white shadow-lg relative z-10 transition-all">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 md:hidden" onClick={() => setSelectedConversation(null)}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>

                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-white/20">
                      <AvatarFallback className="bg-white/20 text-white font-bold">
                        {activeConversation.buyerName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#ff6a00] rounded-full" />
                  </div>

                  <div className="flex-1">
                    <h3 className="font-bold leading-tight">{activeConversation.buyerName}</h3>
                    <div className="flex items-center gap-1 text-[11px] font-medium opacity-90">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                      Online
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                      <Phone className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                      <Video className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 scrollbar-hide">
                  {activeConversation.messages.map((msg) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={msg.id}
                      className={`flex ${msg.senderId === 'seller' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[80%] flex flex-col ${msg.senderId === 'seller' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl shadow-sm ${msg.senderId === 'seller'
                            ? 'bg-[#ff6a00] text-white rounded-tr-none shadow-orange-500/10'
                            : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-gray-200/50'
                            }`}
                        >
                          {msg.images && msg.images.length > 0 && (
                            <div className={`grid gap-1 mb-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                              {msg.images.map((img, idx) => (
                                <div
                                  key={idx}
                                  className={`${msg.images && msg.images.length > 1 ? 'w-24 h-24' : 'w-40 h-40'} overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity`}
                                  onClick={() => setPreviewImage(img)}
                                >
                                  <img
                                    src={img}
                                    alt="Sent"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          {msg.text && <p className="text-[15px] leading-relaxed">{msg.text}</p>}
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 mt-1.5 px-1 uppercase tracking-wider">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-orange-300 transition-all">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      multiple
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-orange-500 rounded-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon className="w-5 h-5" />
                    </Button>

                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Reply to customer..."
                      className="flex-1 bg-transparent border-none focus-visible:ring-0 text-gray-700 shadow-none h-10"
                    />

                    <div className="flex items-center gap-1 pr-1">
                      <Button
                        type="submit"
                        className="bg-[#ff6a00] hover:bg-[#e65e00] text-white rounded-xl h-10 w-10 p-0 shadow-lg shadow-orange-500/20"
                        disabled={!newMessage.trim()}
                      >
                        <Send className="w-4 h-4 ml-0.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-2">
                  <MessageCircle className="h-10 w-10" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Customer Chats</h3>
                  <p className="text-gray-500 max-w-xs mx-auto">
                    Select a conversation from the left to start replying to your customers.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Screen Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.button
              className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full"
              onClick={() => setPreviewImage(null)}
            >
              <ChevronLeft className="w-8 h-8 rotate-180" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={previewImage}
              alt="Full preview"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
