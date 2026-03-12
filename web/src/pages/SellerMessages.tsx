import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/sellerStore';
import { SellerSidebar } from '@/components/seller/SellerSidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Search, Send, MoreVertical, Phone, Video, Image as ImageIcon,
  ChevronLeft, MessageCircle, Loader2,
} from 'lucide-react';
import { chatService, Conversation as DBConversation, Message as DBMessage } from '../services/chatService';

// Updated Interfaces to fix TypeScript errors
interface Message {
  id: string; 
  senderId: string; 
  text?: string; 
  images?: string[]; 
  timestamp: Date; 
  isRead: boolean; 
  message_type?: 'user' | 'system'; 
  message_content?: string;
}

interface Conversation {
  id: string; 
  buyerName: string; 
  buyerImage?: string; 
  lastMessage: string; 
  lastMessageTime: Date; 
  unreadCount: number; 
  messages: Message[]; 
  isOnline?: boolean; 
  is_online?: boolean;
}

export default function SellerMessages() {
  const { seller } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dbConversations, setDbConversations] = useState<DBConversation[]>([]);
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const useRealData = dbConversations.length > 0;

  const loadConversations = useCallback(async () => {
    if (!seller?.id) return setLoading(false);
    try {
      const convs = await chatService.getSellerConversations(seller.id);
      setDbConversations(convs);
    } catch (error) { 
      console.error(error); 
    } finally { 
      setLoading(false); 
    }
  }, [seller?.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (dbConversations.length > 0 && !selectedConversation) {
      setSelectedConversation(dbConversations[0].id);
    }
  }, [dbConversations, selectedConversation]);

  // Real-time presence: update buyer's dot without a full page reload
  useEffect(() => {
    const unsubscribe = chatService.subscribeToPresenceUpdates((userId, isOnline) => {
      setDbConversations(prev =>
        prev.map(conv =>
          conv.buyer_id === userId ? { ...conv, is_online: isOnline } : conv
        )
      );
    });
    return unsubscribe;
  }, []);

  // Real-time sidebar: keep last_message + timestamp current for all conversations
  useEffect(() => {
    if (!seller?.id) return;
    const unsubscribe = chatService.subscribeToConversations(
      seller.id,
      'seller',
      (updatedConv) => {
        setDbConversations(prev => {
          const exists = prev.some(c => c.id === updatedConv.id);
          if (exists) {
            return prev.map(c => c.id === updatedConv.id ? updatedConv : c);
          }
          return [updatedConv, ...prev];
        });
      }
    );
    return unsubscribe;
  }, [seller?.id]);

  useEffect(() => {
    if (!selectedConversation || !useRealData) return;
    const loadMessages = async () => {
      const msgs = await chatService.getMessages(selectedConversation);
      setDbMessages(msgs);
      if (seller?.id) chatService.markAsRead(selectedConversation, seller.id, 'seller');
    };
    loadMessages();
  }, [selectedConversation, useRealData, seller?.id]);

  useEffect(() => {
    if (!selectedConversation || !useRealData) return;
    const unsubscribe = chatService.subscribeToMessages(selectedConversation, (newMsg) => {
      setDbMessages(prev => prev.some(msg => msg.id === newMsg.id) ? prev : [...prev, newMsg]);
      if (newMsg.sender_type === 'buyer' && seller?.id) {
        chatService.markAsRead(selectedConversation, seller.id, 'seller');
      }
    });
    return unsubscribe;
  }, [selectedConversation, useRealData, seller?.id]);

  const normalizedDbConversations = useMemo(() => {
    return dbConversations.map(conv => {
      const convMessages = dbMessages.filter(msg => msg.conversation_id === conv.id);
      const lastMsg = convMessages.at(-1);
      const isLastMessageFromMe = lastMsg?.sender_type === 'seller';
      return {
        id: conv.id,
        buyerName: conv.buyer_name || conv.buyer?.full_name || conv.buyer_email || 'Unknown Customer',
        buyerImage: conv.buyer_avatar || conv.buyer?.avatar_url,
        lastMessage: conv.last_message || '',
        lastMessageTime: conv.last_message_at ? new Date(conv.last_message_at) : new Date(),
        unreadCount: conv.seller_unread_count || 0,
        isOnline: conv.is_online,
        isLastMessageFromMe,
        messages: convMessages.map(msg => ({
          id: msg.id, 
          senderId: msg.sender_type || '', 
          text: msg.content, 
          message_type: msg.message_type,
          images: msg.image_url ? [msg.image_url] : undefined, 
          timestamp: new Date(msg.created_at), 
          isRead: msg.is_read
        }))
      };
    });
  }, [dbConversations, dbMessages]);

  const activeConversation = useRealData
    ? normalizedDbConversations.find(c => c.id === selectedConversation)
    : undefined;

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string, imageUrls?: string[]) => {
    e?.preventDefault();
    const messageText = textOverride || newMessage;
    if (!messageText.trim() && (!imageUrls || imageUrls.length === 0) || !selectedConversation) return;

    if (useRealData && seller?.id) {
      setSending(true);
      try {
        const result = await chatService.sendMessage(selectedConversation, seller.id, 'seller', messageText.trim());
        if (result) {
          setNewMessage('');
          setDbMessages(prev =>
            prev.some(msg => msg.id === result.id) ? prev : [...prev, result]
          );
          // Optimistic sidebar update — no round-trip needed
          setDbConversations(prev =>
            prev.map(c =>
              c.id === selectedConversation
                ? { ...c, last_message: messageText.trim(), last_message_at: new Date().toISOString() }
                : c
            )
          );
        }
      } catch (error) { 
        console.error(error); 
      } finally { 
        setSending(false); 
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const uploadPromises = files.map(file => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      }));
      const urls = await Promise.all(uploadPromises);
      handleSendMessage(undefined, '', urls);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredConversations = normalizedDbConversations.filter(conv =>
    conv.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex h-full overflow-hidden max-w-7xl mx-auto w-full p-0 md:px-8 md:py-6 gap-0 md:gap-6">
          <div className="w-full md:w-80 border-r bg-white flex flex-col md:rounded-xl md:shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:border border-orange-100 overflow-hidden hidden md:flex">
            <div className="p-6 border-b border-orange-50 bg-white">
              <h2 className="text-xl font-black text-[var(--text-headline)] mb-4 tracking-tight">Messages</h2>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                <Input placeholder="Search buyers..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-gray-50/50 border-transparent focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-xl py-6 shadow-sm transition-all font-medium" />
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
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div key={conv.id} onClick={() => setSelectedConversation(conv.id)} className={`p-4 cursor-pointer transition-all border-l-4 mx-2 rounded-xl my-1 ${selectedConversation === conv.id ? 'bg-orange-50 border-l-[var(--brand-primary)] shadow-sm' : 'border-l-transparent hover:bg-gray-50'}`}>
                    <div className="flex gap-4">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-md ring-1 ring-orange-100">
                          <AvatarFallback className="bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 font-bold">
                            {conv.buyerName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {/* 👈 NEW: Conditional Online/Offline */}
                        {conv.isOnline ? (
                          <>
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-600 border-2 border-white rounded-full z-10 shadow-sm" />
                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-600 rounded-full animate-ping opacity-75" />
                          </>
                        ) : (
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-gray-400 border-2 border-white rounded-full z-10 shadow-sm" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex justify-between items-baseline mb-1">
                          <h4 className={`font-bold truncate text-sm ${selectedConversation === conv.id ? 'text-[var(--brand-primary-dark)]' : 'text-gray-900'}`}>{conv.buyerName}</h4>
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                            {conv.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-bold' : 'text-gray-500 font-medium'}`}>{conv.isLastMessageFromMe ? <span className="font-bold">You: </span> : null}{conv.lastMessage}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge className="bg-[var(--brand-primary)] shadow-lg shadow-orange-500/30 rounded-full h-5 min-w-[20px] flex items-center justify-center p-0.5 text-[10px] animate-pulse">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex-1 flex flex-col bg-white md:rounded-xl md:shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:border border-orange-100 overflow-hidden relative">
            {activeConversation ? (
              <>
                <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] p-4 flex items-center gap-4 text-white shadow-lg shadow-orange-500/20 relative z-10 transition-all">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 md:hidden rounded-full" onClick={() => setSelectedConversation(null)}>
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <div className="relative">
                    <Avatar className="h-11 w-11 border-2 border-white/30 shadow-inner">
                      <AvatarFallback className="bg-white/20 text-white font-bold backdrop-blur-sm">
                        {activeConversation.buyerName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    {/* 👈 NEW: Header avatar indicator online/offline */}
                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-orange-500 rounded-full shadow-sm ${activeConversation.isOnline ? 'bg-teal-400' : 'bg-gray-400'}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-lg leading-tight tracking-tight">{activeConversation.buyerName}</h3>
                    {/* 👈 NEW: Header text indicator online/offline */}
                    <div className="flex items-center gap-1.5 text-xs font-medium text-orange-50">
                      <span className={`w-1.5 h-1.5 rounded-full ${activeConversation.isOnline ? 'bg-teal-400 animate-pulse' : 'bg-gray-400'}`} />
                      {activeConversation.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full"><Phone className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full"><Video className="h-5 w-5" /></Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-full"><MoreVertical className="h-5 w-5" /></Button>
                  </div>
                </div>

                <div key={selectedConversation} className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 space-y-reverse bg-[var(--brand-wash)] scrollbar-hide flex flex-col-reverse">
                  {[...activeConversation.messages].reverse().map((msg: any) => {
                    if (msg.message_type === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center items-center my-6 w-full opacity-90 pointer-events-none">
                          <div className="h-px bg-orange-200 flex-1"></div>
                          <div className="mx-4 bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-orange-100 shadow-sm">
                            {msg.text || msg.message_content}
                          </div>
                          <div className="h-px bg-orange-200 flex-1"></div>
                        </div>
                      );
                    }

                    return (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${msg.senderId === 'seller' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] flex flex-col ${msg.senderId === 'seller' ? 'items-end' : 'items-start'}`}>
                          <div className={`px-5 py-4 shadow-sm ${msg.senderId === 'seller' ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white rounded-xl rounded-tr-sm shadow-orange-500/20' : 'bg-white text-gray-800 border border-gray-100 rounded-xl rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]'}`}>
                            {msg.images && msg.images.length > 0 && (
                              <div className={`grid gap-1 mb-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {msg.images.map((img: string, idx: number) => (
                                  <div key={idx} className={`${msg.images && msg.images.length > 1 ? 'w-24 h-24' : 'w-40 h-40'} overflow-hidden rounded-lg cursor-pointer hover:opacity-90`} onClick={() => setPreviewImage(img)}>
                                    <img src={img} alt="Sent" className="w-full h-full object-cover" />
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
                    );
                  })}
                </div>

                <div className="p-4 bg-white border-t border-orange-100">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-2 bg-gray-50/80 rounded-[20px] border border-gray-100 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all shadow-sm">
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                    <Button type="button" variant="ghost" size="icon" className="text-gray-400 hover:text-[var(--brand-primary)] hover:bg-orange-50 rounded-full h-10 w-10 transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <ImageIcon className="w-5 h-5" />
                    </Button>
                    <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Reply to customer..." className="flex-1 bg-transparent border-none focus-visible:ring-0 text-gray-700 shadow-none h-10 font-medium placeholder:text-gray-400" />
                    <div className="flex items-center gap-1 pr-1">
                      <Button type="submit" className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:shadow-lg hover:shadow-orange-500/30 text-white rounded-xl h-10 w-10 p-0 transition-all transform hover:scale-105 active:scale-95" disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4 ml-0.5" />
                      </Button>
                    </div>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-20 h-20 flex items-center justify-center text-orange-500 -mb-4"><MessageCircle className="h-10 w-10" /></div>
                <div><h3 className="text-xl font-bold text-gray-900">Customer Chats</h3><p className="text-gray-500 max-w-xs mx-auto">Select a conversation from the left to start replying to your customers.</p></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewImage && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setPreviewImage(null)}>
            <motion.button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full" onClick={() => setPreviewImage(null)}>
              <ChevronLeft className="w-8 h-8 rotate-180" />
            </motion.button>
            <motion.img initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} src={previewImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}