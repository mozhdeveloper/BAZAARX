import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  Search, Send, MoreVertical, ChevronLeft, Ticket, Image as ImageIcon,
  Store, Trash2, ExternalLink, MessageSquare, Loader2
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBuyerStore, demoSellers, Conversation } from '../stores/buyerStore';
import { chatService, Conversation as DBConversation, Message as DBMessage } from '../services/chatService';

export default function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, viewedSellers, conversations, addConversation, addChatMessage, deleteConversation } = useBuyerStore();
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
    if (!profile?.id) return setLoading(false);
    try {
      const convs = await chatService.getBuyerConversations(profile.id);
      setDbConversations(convs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (!selectedConversation || !useRealData) return;
    const loadMessages = async () => {
      const msgs = await chatService.getMessages(selectedConversation);
      setDbMessages(msgs);
      if (profile?.id) chatService.markAsRead(selectedConversation, profile.id, 'buyer');
    };
    loadMessages();
  }, [selectedConversation, useRealData, profile?.id]);

  useEffect(() => {
    if (!selectedConversation || !useRealData) return;
    const unsubscribe = chatService.subscribeToMessages(
      selectedConversation,
      (newMsg) => {
        setDbMessages(prev => {
          if (prev.some(msg => msg.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_type === 'seller' && profile?.id) {
          chatService.markAsRead(selectedConversation, profile.id, 'buyer');
        }
      }
    );
    return unsubscribe;
  }, [selectedConversation, useRealData, profile?.id]);

  const queryParams = new URLSearchParams(location.search);
  const initialSellerId = queryParams.get('sellerId');

  useEffect(() => {
    if (!initialSellerId) return;
    const initConversation = async () => {
      if (profile?.id) {
        try {
          const existingDbConv = dbConversations.find(c => c.seller_id === initialSellerId);
          if (existingDbConv) return setSelectedConversation(existingDbConv.id);
          const conv = await chatService.getOrCreateConversation(profile.id, initialSellerId);
          if (conv) {
            setSelectedConversation(conv.id);
            loadConversations();
            return;
          }
        } catch (error) { console.error(error); }
      }
      const existingConv = conversations.find(c => c.sellerId === initialSellerId);
      if (existingConv) setSelectedConversation(existingConv.id);
      else {
        const sellerDetails = demoSellers?.find(s => s.id === initialSellerId) || viewedSellers?.find(s => s.id === initialSellerId);
        const newConv: Conversation = {
          id: `conv-${initialSellerId}`, sellerId: initialSellerId,
          sellerName: sellerDetails?.name || 'Seller Store', sellerImage: sellerDetails?.avatar,
          lastMessage: `Welcome to ${sellerDetails?.name || 'our store'}! 🛍️`, lastMessageTime: new Date().toISOString(),
          unreadCount: 0, isOnline: true,
          messages: [{ id: `init-${Date.now()}`, senderId: 'seller', text: `Welcome! How can we help you?`, timestamp: new Date().toISOString(), isRead: true }]
        };
        addConversation(newConv);
        setSelectedConversation(newConv.id);
      }
    };
    initConversation();
  }, [initialSellerId, profile?.id, dbConversations, conversations, demoSellers, viewedSellers, addConversation, loadConversations]);

  useEffect(() => {
    if (useRealData) {
      if (!selectedConversation && dbConversations.length > 0) setSelectedConversation(dbConversations[0].id);
    } else {
      if (!selectedConversation && conversations.length > 0 && !initialSellerId) setSelectedConversation(conversations[0].id);
    }
  }, [conversations.length, dbConversations.length, selectedConversation, initialSellerId, useRealData]);

  const activeConversation = useRealData
    ? dbConversations.find(c => c.id === selectedConversation)
    : conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string, imageUrls?: string[]) => {
    e?.preventDefault();
    const messageText = textOverride || newMessage;
    if (!messageText.trim() && (!imageUrls || imageUrls.length === 0) || !selectedConversation) return;

    if (useRealData && profile?.id) {
      setSending(true);
      try {
        const result = await chatService.sendMessage(selectedConversation, profile.id, 'buyer', messageText.trim());
        if (result) setNewMessage('');
      } catch (error) { console.error(error); } finally { setSending(false); }
      return;
    }

    addChatMessage(selectedConversation, {
      id: `m${Date.now()}`, senderId: 'buyer', text: messageText, images: imageUrls,
      timestamp: new Date().toISOString(), isRead: true
    });
    if (!textOverride && !imageUrls) setNewMessage('');
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

  const filteredConversations = useRealData
    ? dbConversations.filter(conv =>
        (conv.seller_store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations.filter(conv =>
        conv.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      ).sort((a, b) => (b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0) - (a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0));

  const quickReplies = ["Is this available?", "Can I see real photos?", "Do you offer COD?", "Is this authentic?"];

  const handleDeleteConversation = () => {
    if (selectedConversation) {
      deleteConversation(selectedConversation);
      setSelectedConversation(null);
      if (initialSellerId) navigate('/messages', { replace: true });
    }
  };

  const handleVisitStore = () => {
    if (useRealData && activeConversation) navigate(`/seller/${(activeConversation as DBConversation).seller_id}`);
    else if ((activeConversation as Conversation)?.sellerId) navigate(`/seller/${(activeConversation as Conversation).sellerId}`);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--brand-wash)] overflow-hidden">
      <div className="flex flex-1 overflow-hidden w-full h-full gap-0">
        
        {/* Sidebar */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--brand-wash-gold)]/30 overflow-hidden hidden md:flex">
          <div className="p-4 border-b border-[var(--brand-wash-gold)]/20">
            <h2 className="text-xl font-bold text-[var(--text-headline)] mb-4">Messages</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] h-4 w-4" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[var(--brand-wash)] border-none focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)] rounded-xl py-5"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="h-12 w-12 text-[var(--text-muted)] mb-3" />
                <h3 className="text-[var(--text-muted)] font-medium">No messages yet</h3>
                <p className="text-[var(--text-muted)] text-sm mt-1">Start a conversation with a seller</p>
              </div>
            ) : useRealData ? (
              (filteredConversations as DBConversation[]).map((conv) => (
                <div key={conv.id} onClick={() => setSelectedConversation(conv.id)} className={`p-4 cursor-pointer hover:bg-[var(--brand-wash)] transition-all border-l-4 ${selectedConversation === conv.id ? 'bg-[var(--brand-wash)] border-l-[var(--brand-primary)]' : 'border-l-transparent'}`}>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarFallback className="bg-[var(--brand-wash)] text-[var(--brand-primary)] font-bold">
                          {(conv.seller_store_name || 'S').charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      {/* 👈 NEW: Conditional Online/Offline */}
                      {conv.is_online ? (
                        <>
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-600 border-2 border-white rounded-full z-10 shadow-sm" />
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-teal-600 rounded-full animate-ping opacity-75" />
                        </>
                      ) : (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-gray-400 border-2 border-white rounded-full z-10 shadow-sm" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-[var(--text-headline)] truncate">{conv.seller_store_name || 'Store'}</h4>
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.buyer_unread_count > 0 ? 'text-[var(--text-headline)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                        {conv.last_message || 'Start a conversation'}
                      </p>
                    </div>
                    {conv.buyer_unread_count > 0 && (
                      <Badge className="bg-[var(--brand-primary)] h-5 min-w-[20px] rounded-full flex items-center justify-center p-0.5 text-[10px]">
                        {conv.buyer_unread_count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              (filteredConversations as Conversation[]).map((conv) => (
                <div key={conv.id} onClick={() => setSelectedConversation(conv.id)} className={`p-4 cursor-pointer hover:bg-[var(--brand-wash)] transition-all border-l-4 ${selectedConversation === conv.id ? 'bg-[var(--brand-wash)] border-l-[var(--brand-primary)]' : 'border-l-transparent'}`}>
                  <div className="flex gap-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarImage src={conv.sellerImage} />
                        <AvatarFallback className="bg-[var(--brand-wash)] text-[var(--brand-primary)] font-bold">
                          {conv.sellerName.charAt(0)}
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
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-gray-900 truncate">{conv.sellerName}</h4>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase">
                          {new Date(conv.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                        {conv.lastMessage || 'Start a conversation'}
                      </p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-[var(--brand-primary)] h-5 min-w-[20px] rounded-full flex items-center justify-center p-0.5 text-[10px]">
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
        <div className="flex-1 flex flex-col bg-[var(--bg-secondary)] overflow-hidden relative">
          {activeConversation ? (
            <>
              <div className="bg-[var(--brand-primary)] p-4 flex items-center gap-4 text-white shadow-md relative z-10">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => navigate(-1)}>
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="relative">
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    <AvatarImage src={useRealData ? undefined : (activeConversation as Conversation).sellerImage} />
                    <AvatarFallback className="bg-white/20 text-white font-bold">
                      {(useRealData ? ((activeConversation as DBConversation).seller_store_name || 'S') : (activeConversation as Conversation).sellerName).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  {/* 👈 NEW: Header avatar indicator online/offline */}
                  <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[var(--brand-primary)] rounded-full ${(activeConversation as any).is_online || (activeConversation as Conversation).isOnline ? 'bg-teal-400' : 'bg-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold leading-tight">
                    {useRealData ? (activeConversation as DBConversation).seller_store_name || 'Store' : (activeConversation as Conversation).sellerName}
                  </h3>
                  {/* 👈 NEW: Header text indicator online/offline */}
                  <div className="flex items-center gap-1 text-[11px] font-medium opacity-90 text-white">
                    <span className={`w-1.5 h-1.5 rounded-full ${(activeConversation as any).is_online || (activeConversation as Conversation).isOnline ? 'bg-teal-400 animate-pulse' : 'bg-gray-400'}`} /> 
                    {(activeConversation as any).is_online || (activeConversation as Conversation).isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><Ticket className="h-5 w-5" /></Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><MoreVertical className="h-5 w-5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-gray-100 p-1">
                      <DropdownMenuItem onClick={handleVisitStore} className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors">
                        <ExternalLink className="h-4 w-4" /><span className="font-medium text-sm">Visit Store</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleDeleteConversation} className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors">
                        <Trash2 className="h-4 w-4" /><span className="font-medium text-sm">Delete Conversation</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                {useRealData ? (
                  dbMessages.map((msg) => {
                    if (msg.message_type === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center items-center my-6 w-full opacity-90 pointer-events-none">
                          <div className="h-px bg-orange-200 flex-1"></div>
                          <div className="mx-4 bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-orange-100 shadow-sm">
                            {msg.message_content}
                          </div>
                          <div className="h-px bg-orange-200 flex-1"></div>
                        </div>
                      );
                    }

                    const isBuyer = msg.sender_type === 'buyer';
                    return (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-3 rounded-2xl shadow-sm ${isBuyer ? 'bg-[var(--brand-primary)] text-white rounded-tr-sm' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--brand-wash-gold)]/20'}`}>
                            <p className="text-sm leading-relaxed">{msg.content}</p>
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1.5 px-1 font-medium">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  (activeConversation as Conversation).messages.map((msg) => {
                    const isBuyer = msg.senderId === 'buyer';
                    return (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}>
                          <div className={`px-4 py-3 rounded-2xl shadow-sm ${isBuyer ? 'bg-[var(--brand-primary)] text-white rounded-tr-none' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--brand-wash-gold)]/20 rounded-tl-none'}`}>
                            {msg.images && msg.images.length > 0 && (
                              <div className={`grid gap-1 mb-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {msg.images.map((img, idx) => (
                                  <div key={idx} className={`${msg.images && msg.images.length > 1 ? 'w-24 h-24' : 'w-40 h-40'} overflow-hidden rounded-lg cursor-pointer hover:opacity-90`} onClick={() => setPreviewImage(img)}>
                                    <img src={img} alt="Sent" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                            {msg.text && <p className="text-[15px] leading-relaxed">{msg.text}</p>}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase mt-1.5 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              <div className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--brand-wash-gold)]/20 space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                  {quickReplies.map((reply) => (
                    <button key={reply} onClick={() => handleSendMessage(undefined, reply)} className="whitespace-nowrap px-4 py-2 rounded-full border border-[var(--brand-wash-gold)]/20 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)] transition-all shadow-sm">
                      {reply}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-1 bg-[var(--brand-wash)] rounded-2xl border border-[var(--brand-wash-gold)]/20 focus-within:border-[var(--brand-primary)] transition-all">
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
                  <Button type="button" variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-[var(--brand-primary)] rounded-full" onClick={() => fileInputRef.current?.click()} disabled={sending}>
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                  <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-transparent border-none focus-visible:ring-0 text-[var(--text-primary)] shadow-none h-10" disabled={sending} />
                  <div className="flex items-center gap-1 pr-1">
                    <Button type="submit" className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl h-10 w-10 p-0 shadow-lg shadow-[var(--brand-primary)]/20" disabled={!newMessage.trim() || sending}>
                      {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
              <div className="w-20 h-20 bg-[var(--brand-wash)] rounded-full flex items-center justify-center text-[var(--brand-primary)] mb-2">
                <Store className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--text-headline)]">Your Conversations</h3>
                <p className="text-[var(--text-muted)] max-w-xs mx-auto">Select a seller from the list or visit a store to start chatting!</p>
              </div>
              <Button variant="outline" className="border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-accent)] hover:text-white rounded-xl px-6" onClick={() => navigate('/stores')}>
                Browse Stores
              </Button>
            </div>
          )}
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