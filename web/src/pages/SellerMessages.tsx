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
  Search, Send, Image as ImageIcon,
  ChevronLeft, MessageCircle, Loader2, FileText, X,
  Paperclip, Play, ChevronDown, Reply,
} from 'lucide-react';
import ChatMediaModal, { type MediaPreview } from '../components/ChatMediaModal';
import { chatService, Conversation as DBConversation, Message as DBMessage } from '../services/chatService';
import { validateChatMedia, type ChatMediaType } from '../utils/chatMediaUtils';
import ChatListSkeleton from '../components/skeletons/ChatListSkeleton';
import { useToast } from '../hooks/use-toast';

// Extract original filename from Supabase storage URL (strips timestamp prefix)
const extractFileName = (url: string, fallback = 'Document.pdf') => {
  try {
    const raw = decodeURIComponent(url.split('/').pop()?.split('?')[0] || fallback);
    const match = raw.match(/^\d+_(.+)$/);
    return match ? match[1] : raw;
  } catch { return fallback; }
};

// Updated Interfaces to fix TypeScript errors
interface Message {
  id: string;
  senderId: string;
  text?: string;
  images?: string[];
  media_url?: string;
  media_type?: string;
  timestamp: Date;
  isRead: boolean;
  message_type?: 'user' | 'system' | 'text' | 'image';
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
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMedia, setPreviewMedia] = useState<MediaPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [dbConversations, setDbConversations] = useState<DBConversation[]>([]);
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; previewUrl: string; mediaType: ChatMediaType } | null>(null);
  const [replyingTo, setReplyingTo] = useState<DBMessage | null>(null);
  const [sellerSuspended, setSellerSuspended] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  // Smart date formatter
  const formatSmartDate = useCallback((dateStr: string | Date) => {
    const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  const useRealData = dbConversations.length > 0;

  // Sort helper — newest last_message_at first
  const sortByLastMessage = (list: DBConversation[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.last_message_at || b.updated_at).getTime() -
        new Date(a.last_message_at || a.updated_at).getTime()
    );

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

  // Clear unread badge optimistically when a conversation is opened
  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setDbConversations(prev =>
      prev.map(c => c.id === id ? { ...c, seller_unread_count: 0 } : c)
    );
  };

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

  // Real-time sidebar: keep last_message + timestamp current, always re-sorted
  useEffect(() => {
    if (!seller?.id) return;
    const unsubscribe = chatService.subscribeToConversations(
      seller.id,
      'seller',
      (updatedConv) => {
        setDbConversations(prev => {
          const exists = prev.some(c => c.id === updatedConv.id);
          const next = exists
            ? prev.map(c => {
              if (c.id !== updatedConv.id) return c;
              const merged = { ...c, ...updatedConv };
              // Increment unread badge for incoming buyer messages (unless conversation is open)
              if ((updatedConv as any)._senderType === 'buyer' && c.id !== selectedConversation) {
                merged.seller_unread_count = (c.seller_unread_count || 0) + 1;
              }
              return merged;
            })
            : [updatedConv, ...prev];
          return sortByLastMessage(next);
        });
      }
    );
    return unsubscribe;
  }, [seller?.id, selectedConversation]);

  // Check self-suspension on mount
  useEffect(() => {
    if (!seller?.id) return;
    chatService.getSellerStatus(seller.id).then(s => setSellerSuspended(s.isSuspended)).catch(() => { });
  }, [seller?.id]);

  useEffect(() => {
    if (!selectedConversation || !useRealData) return;
    const loadMessages = async () => {
      const msgs = await chatService.getMessages(selectedConversation);
      setDbMessages(msgs);
      if (seller?.id) chatService.markAsRead(selectedConversation, seller.id, 'seller');
    };
    loadMessages();
    setReplyingTo(null);
  }, [selectedConversation, useRealData, seller?.id]);

  useEffect(() => {
    if (!selectedConversation || !useRealData) return;
    const unsubscribe = chatService.subscribeToMessages(selectedConversation, (newMsg) => {
      setDbMessages(prev => prev.some(msg => msg.id === newMsg.id) ? prev : [...prev, newMsg]);
      if (newMsg.sender_type === 'buyer' && seller?.id) {
        chatService.markAsRead(selectedConversation, seller.id, 'seller');
      }
      // Always update sidebar preview + re-sort when a buyer message arrives
      if (newMsg.sender_type === 'buyer') {
        setDbConversations(prev =>
          sortByLastMessage(
            prev.map(c =>
              c.id === newMsg.conversation_id
                ? {
                  ...c,
                  last_message: newMsg.content === '[Image]' ? '📷 Photo' : newMsg.content,
                  last_message_at: newMsg.created_at,
                  // Only increment unread badge if this conversation isn't currently open
                  seller_unread_count: newMsg.conversation_id !== selectedConversation
                    ? (c.seller_unread_count || 0) + 1
                    : c.seller_unread_count,
                }
                : c
            )
          )
        );
      }
    });
    return unsubscribe;
  }, [selectedConversation, useRealData, seller?.id]);

  const normalizedDbConversations = useMemo(() => {
    return dbConversations
      .filter(conv => !!conv.last_message) // Hide blank conversations
      .map(conv => {
        const convMessages = dbMessages.filter(msg => msg.conversation_id === conv.id);
        const lastMsg = convMessages.at(-1);
        const isLastMessageFromMe = lastMsg?.sender_type === 'seller';
        return {
          id: conv.id,
          buyerName: conv.buyer_name || conv.buyer?.full_name || conv.buyer_email || 'Unknown Customer',
          buyerImage: conv.buyer_avatar || conv.buyer?.avatar_url,
          lastMessage: conv.last_message === '[Image]' ? '📷 Photo' : conv.last_message || '',
          lastMessageTime: conv.last_message_at ? new Date(conv.last_message_at) : new Date(),
          unreadCount: conv.seller_unread_count || 0,
          isOnline: conv.is_online,
          isLastMessageFromMe,
          messages: convMessages.map(msg => ({
            id: msg.id,
            senderId: msg.sender_type || '',
            text: msg.content !== '[Image]' ? msg.content : undefined,
            message_type: msg.message_type,
            images: msg.image_url ? [msg.image_url] : undefined,
            media_url: msg.media_url,
            media_type: msg.media_type,
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
      const msgText = messageText.trim();
      // Clear immediately — don’t wait for DB round-trip
      if (!textOverride) {
        setNewMessage('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
      setSending(true);
      const currentReplyTo = replyingTo;
      setReplyingTo(null);
      try {
        const result = await chatService.sendMessage(
          selectedConversation, seller.id, 'seller', msgText,
          undefined, undefined, undefined, currentReplyTo?.id
        );
        if (result) {
          setDbMessages(prev =>
            prev.some(msg => msg.id === result.id) ? prev : [...prev, result]
          );
          // Optimistic sidebar update + re-sort so sender's conv bumps to top
          setDbConversations(prev =>
            sortByLastMessage(
              prev.map(c =>
                c.id === selectedConversation
                  ? { ...c, last_message: msgText, last_message_at: new Date().toISOString() }
                  : c
              )
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

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedConversation || !seller?.id) return;

    const file = files[0];
    const { valid, mediaType, error } = validateChatMedia(file);
    if (!valid || !mediaType) {
      toast({ title: 'Invalid file', description: error || 'File type not supported.', variant: 'destructive' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (docInputRef.current) docInputRef.current.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setPendingMedia({ file, previewUrl, mediaType });

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const cancelPendingMedia = () => {
    if (pendingMedia) {
      URL.revokeObjectURL(pendingMedia.previewUrl);
      setPendingMedia(null);
    }
  };

  const confirmSendMedia = async () => {
    if (!pendingMedia || !selectedConversation || !seller?.id) return;
    const { file, mediaType } = pendingMedia;
    setPendingMedia(null);

    setUploading(true);
    const url = await chatService.uploadChatMedia(file, selectedConversation);
    setUploading(false);

    if (!url) {
      toast({ title: 'Upload failed', description: 'Could not upload file. Please try again.', variant: 'destructive' });
      return;
    }

    const placeholderMap = { image: '[Image]', video: '[Video]', document: '[Document]' } as const;
    const previewMap = { image: '📷 Photo', video: '🎬 Video', document: '📄 Document' } as const;
    const placeholder = placeholderMap[mediaType];

    const result = await chatService.sendMessage(
      selectedConversation, seller.id, 'seller', placeholder, undefined, url, mediaType
    );

    if (result) {
      setDbMessages(prev => prev.some(m => m.id === result.id) ? prev : [...prev, result]);
      setDbConversations(prev =>
        sortByLastMessage(
          prev.map(c =>
            c.id === selectedConversation
              ? { ...c, last_message: previewMap[mediaType], last_message_at: result.created_at }
              : c
          )
        )
      );
    }
  };

  const filteredConversations = normalizedDbConversations.filter(conv =>
    conv.buyerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex h-full overflow-hidden w-full p-0 md:px-8 md:py-6 gap-0 md:gap-6">
          <div className="w-full md:w-80 border-r bg-white flex flex-col md:rounded-xl md:shadow-[0_8px_30px_rgba(0,0,0,0.04)] md:border border-orange-100 overflow-hidden hidden md:flex">
            <div className="p-6 border-b border-orange-50 bg-white">
              <h2 className="text-xl font-black text-[var(--text-headline)] mb-4 tracking-tight">Messages</h2>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 group-focus-within:text-[var(--brand-primary)] transition-colors" />
                <Input placeholder="Search Buyers" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-8 bg-gray-50/50 border-transparent focus:border-orange-200 focus:bg-white focus:ring-4 focus:ring-orange-500/10 rounded-xl py-6 shadow-sm transition-all font-medium" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <ChatListSkeleton />
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <MessageCircle className="h-12 w-12 mb-2" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <div key={conv.id} onClick={() => handleSelectConversation(conv.id)} className={`p-4 cursor-pointer transition-all border-l-4 mx-2 rounded-xl my-1 ${selectedConversation === conv.id ? 'bg-orange-50 border-l-[var(--brand-primary)] shadow-sm' : 'border-l-transparent hover:bg-gray-50'}`}>
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
                        <div className="flex justify-between items-baseline gap-2 mb-1">
                          <h4 className={`font-bold truncate text-sm min-w-0 ${selectedConversation === conv.id ? 'text-[var(--brand-primary-dark)]' : 'text-gray-900'}`}>{conv.buyerName}</h4>
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide shrink-0">
                            {formatSmartDate(conv.lastMessageTime)}
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
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
                      {activeConversation.isOnline ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>

                {/* Suspended banner */}
                {sellerSuspended && (
                  <div className="bg-red-500/10 border-b border-red-200 px-4 py-2 text-center">
                    <span className="text-xs font-semibold text-red-600">⚠ Your account is suspended. You cannot send messages.</span>
                  </div>
                )}
                <div
                  key={selectedConversation}
                  ref={chatContainerRef}
                  className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 space-y-reverse bg-[var(--brand-wash)] scrollbar-hide flex flex-col-reverse relative"
                  onScroll={(e) => setShowJumpToLatest(e.currentTarget.scrollTop < -300)}
                >
                  {(() => {
                    const items: React.ReactNode[] = [];
                    let lastDateLabel = '';
                    // Iterate oldest→newest so flex-col-reverse places date labels ABOVE their group
                    activeConversation.messages.forEach((msg: any, idx: number) => {
                      const msgDate = new Date(msg.timestamp);
                      const dateLabel = msgDate.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      if (dateLabel !== lastDateLabel) {
                        items.push(
                          <div key={`sep-${idx}`} className="flex justify-center items-center my-4 w-full pointer-events-none">
                            <div className="h-px bg-orange-200/60 flex-1" />
                            <span className="mx-3 text-[10px] font-semibold text-gray-400 uppercase tracking-widest bg-[var(--brand-wash)] px-2 py-0.5 rounded-full">{dateLabel}</span>
                            <div className="h-px bg-orange-200/60 flex-1" />
                          </div>
                        );
                        lastDateLabel = dateLabel;
                      }
                      if (msg.message_type === 'system') {
                        items.push(
                          <div key={msg.id} className="flex justify-center items-center my-6 w-full opacity-90 pointer-events-none">
                            <div className="h-px bg-orange-200 flex-1"></div>
                            <div className="mx-4 bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-orange-100 shadow-sm">
                              {msg.text || msg.message_content}
                            </div>
                            <div className="h-px bg-orange-200 flex-1"></div>
                          </div>
                        );
                        return;
                      }
                      const isSeller = msg.senderId === 'seller';
                      const fullTimestamp = msgDate.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      // Find replied-to message
                      const dbMsg = dbMessages.find(m => m.id === msg.id);
                      const repliedMsg = dbMsg?.reply_to_message_id ? dbMessages.find(m => m.id === dbMsg.reply_to_message_id) : null;
                      items.push(
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={msg.id} id={`msg-${msg.id}`} className={`flex ${isSeller ? 'justify-end' : 'justify-start'} group/msg`}>
                          <div className={`max-w-[80%] flex flex-col ${isSeller ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-full px-5 py-4 shadow-sm group relative cursor-default transition-all ${isSeller ? 'bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white rounded-xl rounded-tr-sm shadow-orange-500/20' : 'bg-white text-gray-800 border border-gray-100 rounded-xl rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]'}`}
                            >
                              {/* Reply-to quote */}
                              {repliedMsg && (
                                <div
                                  className={`mb-2 px-3 py-1.5 rounded-lg text-xs border-l-2 cursor-pointer hover:opacity-80 transition-opacity ${isSeller ? 'bg-white/10 border-white/40 text-white/80' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
                                  onClick={() => {
                                    const el = document.getElementById(`msg-${repliedMsg.id}`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      el.classList.add('ring-2', 'ring-[var(--brand-primary)]');
                                      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--brand-primary)]'), 1500);
                                    }
                                  }}
                                >
                                  <p className="font-semibold text-[10px] mb-0.5">{repliedMsg.sender_type === 'seller' ? 'You' : activeConversation?.buyerName || 'Buyer'}</p>
                                  <p className="truncate">{repliedMsg.content}</p>
                                </div>
                              )}
                              {/* Image */}
                              {(msg.media_url || msg.image_url) && (msg.media_type === 'image' || msg.message_type === 'image' || (!msg.media_type && msg.image_url)) && (
                                <div className="mb-2 cursor-pointer" onClick={() => setPreviewMedia({ type: 'image', url: (msg.media_url || msg.image_url)! })}>
                                  <img loading="lazy" src={msg.media_url || msg.image_url!} alt="Sent" className="w-40 h-40 object-cover rounded-lg hover:opacity-90 transition-opacity" />
                                </div>
                              )}
                              {/* Video — thumbnail with play overlay */}
                              {msg.media_url && (msg.media_type === 'video' || msg.message_type === 'video') && (
                                <div
                                  className="relative max-w-[280px] rounded-lg overflow-hidden mb-2 cursor-pointer group"
                                  onClick={() => setPreviewMedia({ type: 'video', url: msg.media_url! })}
                                >
                                  <video src={msg.media_url} preload="metadata" className="w-full max-h-[200px] object-cover" muted playsInline />
                                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                                    <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                      <Play className="w-5 h-5 text-gray-800 ml-0.5" fill="currentColor" />
                                    </div>
                                  </div>
                                </div>
                              )}
                              {/* Document — filename card */}
                              {msg.media_url && (msg.media_type === 'document' || msg.message_type === 'document') && (
                                <div
                                  onClick={() => setPreviewMedia({ type: 'document', url: msg.media_url!, fileName: extractFileName(msg.media_url!) })}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-2 cursor-pointer transition-colors ${isSeller ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                >
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isSeller ? 'bg-white/15' : 'bg-red-50'}`}>
                                    <FileText className={`w-4 h-4 ${isSeller ? 'text-white' : 'text-red-500'}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate max-w-[180px]">{extractFileName(msg.media_url!)}</p>
                                    <p className={`text-[10px] ${isSeller ? 'text-white/50' : 'text-gray-400'}`}>PDF Document</p>
                                  </div>
                                </div>
                              )}
                              {/* Legacy images array */}
                              {msg.images && msg.images.length > 0 && !msg.media_url && !msg.image_url && (
                                <div className={`grid gap-1 mb-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                  {msg.images.map((img: string, imgIdx: number) => (
                                    <div key={imgIdx} className={`${msg.images && msg.images.length > 1 ? 'w-24 h-24' : 'w-40 h-40'} overflow-hidden rounded-lg cursor-pointer hover:opacity-90`} onClick={() => setPreviewMedia({ type: 'image', url: img })}>
                                      <img loading="lazy" src={img} alt="Sent" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                              {msg.text && !(msg.media_url && ['[Image]', '[Video]', '[Document]'].includes(msg.text)) && !(msg.image_url && msg.text === '[Image]') && <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}
                              {/* Hover timestamp + reply */}
                              <span className={`absolute bottom-full mb-1 ${isSeller ? 'right-0' : 'left-0'} hidden group-hover:block text-[10px] text-white bg-gray-700/90 rounded px-2 py-0.5 whitespace-nowrap z-10`}>
                                {fullTimestamp}
                              </span>
                              {dbMsg && (
                                <button
                                  onClick={() => setReplyingTo(dbMsg)}
                                  className={`absolute top-1/2 -translate-y-1/2 ${isSeller ? '-left-8' : '-right-8'} opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200`}
                                  title="Reply"
                                >
                                  <Reply className="w-3.5 h-3.5 text-gray-400" />
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    });
                    // Reverse so flex-col-reverse renders them visually top→bottom (oldest first)
                    return items.reverse();
                  })()}
                </div>
                {/* Jump to latest */}
                {showJumpToLatest && (
                  <button
                    onClick={() => chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 bg-[var(--brand-primary)] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 text-sm font-medium hover:bg-[var(--brand-primary-dark)] transition-colors"
                  >
                    <ChevronDown className="w-4 h-4" /> Jump to latest
                  </button>
                )}

                <div className="p-4 bg-white border-t border-orange-100">
                  {/* Reply preview bar */}
                  {replyingTo && (
                    <div className="flex items-center gap-2 px-3 py-2 mb-3 bg-orange-50 rounded-xl border border-orange-100">
                      <Reply className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-[var(--brand-primary)]">
                          {replyingTo.sender_type === 'seller' ? 'You' : activeConversation?.buyerName || 'Buyer'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{replyingTo.content}</p>
                      </div>
                      <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                  <form onSubmit={handleSendMessage} className="flex items-center gap-3 p-2 bg-gray-50/80 rounded-[20px] border border-gray-100 focus-within:border-orange-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all shadow-sm">
                    <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple className="hidden" />
                    <input type="file" ref={docInputRef} onChange={handleMediaUpload} accept="application/pdf" className="hidden" />
                    <Button type="button" variant="ghost" size="icon" className="text-gray-400 hover:text-[var(--brand-primary)] hover:bg-orange-50 rounded-full h-10 w-10 transition-colors" onClick={() => fileInputRef.current?.click()} disabled={uploading || sellerSuspended}>
                      {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="text-gray-400 hover:text-[var(--brand-primary)] hover:bg-orange-50 rounded-full h-10 w-10 transition-colors -ml-1" onClick={() => docInputRef.current?.click()} disabled={uploading || sellerSuspended}>
                      <Paperclip className="w-5 h-5" />
                    </Button>
                    <textarea
                      ref={textareaRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Reply to customer..."
                      rows={1}
                      className="flex-1 bg-transparent border-none focus-visible:ring-0 text-gray-700 shadow-none min-h-[40px] max-h-[120px] resize-none overflow-y-auto py-2.5 text-sm font-medium placeholder:text-gray-400 outline-none"
                      style={{ height: 'auto' }}
                      onInput={(e) => {
                        const t = e.currentTarget;
                        t.style.height = 'auto';
                        t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                      }}
                      disabled={sending || uploading || sellerSuspended}
                    />
                    <div className="flex items-center gap-1 pr-1">
                      <Button type="submit" className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] hover:shadow-lg hover:shadow-orange-500/30 text-white rounded-xl h-10 w-10 p-0 transition-all transform hover:scale-105 active:scale-95" disabled={!newMessage.trim() || sending || uploading || sellerSuspended}>
                        {(sending || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
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
        {pendingMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={cancelPendingMedia}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className={`relative bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${pendingMedia.mediaType === 'document' ? 'max-w-2xl' : 'max-w-md'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="text-base font-semibold text-gray-900">
                  {pendingMedia.mediaType === 'image' ? 'Send Image' : pendingMedia.mediaType === 'video' ? 'Send Video' : 'Send Document'}
                </h3>
                <button
                  onClick={cancelPendingMedia}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview area */}
              <div className="flex items-center justify-center p-5 bg-gray-50 min-h-[200px] max-h-[400px]">
                {pendingMedia.mediaType === 'image' && (
                  <img src={pendingMedia.previewUrl} alt="Preview" className="max-w-full max-h-[360px] object-contain rounded-lg" />
                )}
                {pendingMedia.mediaType === 'video' && (
                  <video src={pendingMedia.previewUrl} controls autoPlay className="max-w-full max-h-[360px] rounded-lg" />
                )}
                {pendingMedia.mediaType === 'document' && (
                  <iframe
                    src={`${pendingMedia.previewUrl}#toolbar=0`}
                    className="w-full h-[360px] rounded-lg border-0"
                    title="PDF Preview"
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-100">
                <button
                  onClick={cancelPendingMedia}
                  className="px-5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSendMedia}
                  className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatMediaModal media={previewMedia} onClose={() => setPreviewMedia(null)} />
    </div>
  );
}