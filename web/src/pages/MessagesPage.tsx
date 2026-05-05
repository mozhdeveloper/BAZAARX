import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
  Search, Send, MoreVertical, ChevronLeft, Ticket, Image as ImageIcon,
  Store, Trash2, ExternalLink, MessageSquare, Loader2, FileText, X,
  Paperclip, Play, ChevronDown, Download, Reply,
} from 'lucide-react';
import ChatMediaModal, { type MediaPreview } from '../components/ChatMediaModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBuyerStore, demoSellers, Conversation } from '../stores/buyerStore';
import Header from '../components/Header';
import ChatListSkeleton from '../components/skeletons/ChatListSkeleton';
import { useToast } from '../hooks/use-toast';
import { getAvailableReplies, setCooldown as setQRCooldown } from '../utils/quickReplyCooldown';

const ALL_QUICK_REPLIES = ["Is this available?", "Can I see real photos?", "Do you offer COD?", "Is this authentic?"];
import { chatService, Conversation as DBConversation, Message as DBMessage } from '../services/chatService';
import { validateChatMedia, type ChatMediaType } from '../utils/chatMediaUtils';
import InvalidFileModal from '../components/InvalidFileModal';

// Extract original filename from Supabase storage URL (strips timestamp prefix)
const extractFileName = (url: string, fallback = 'Document.pdf') => {
  try {
    const raw = decodeURIComponent(url.split('/').pop()?.split('?')[0] || fallback);
    const match = raw.match(/^\d+_(.+)$/);
    return match ? match[1] : raw;
  } catch { return fallback; }
};

export default function MessagesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, viewedSellers, conversations, addConversation, addChatMessage, deleteConversation } = useBuyerStore();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  // Clear unread badge optimistically when a conversation is opened
  const handleSelectConversation = (id: string) => {
    setSelectedConversation(id);
    setDbConversations(prev =>
      prev.map(c => c.id === id ? { ...c, buyer_unread_count: 0 } : c)
    );
    if (profile?.id) chatService.markAsRead(id, profile.id, 'buyer').catch(console.error);
  };
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewMedia, setPreviewMedia] = useState<MediaPreview | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const isSendingMediaRef = useRef(false);

  const [dbConversations, setDbConversations] = useState<DBConversation[]>([]);
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<{ file: File; previewUrl: string; mediaType: ChatMediaType } | null>(null);
  const [replyingTo, setReplyingTo] = useState<DBMessage | null>(null);
  const [sellerSuspended, setSellerSuspended] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);
  const [qrCooldownTick, setQrCooldownTick] = useState(0); // force re-render when cooldown expires
  const [inputBarHeight, setInputBarHeight] = useState(140);
  const [invalidFileError, setInvalidFileError] = useState<string | null>(null);

  // Track input bar height instantly via ResizeObserver so Jump button repositions without delay
  useEffect(() => {
    const el = inputBarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setInputBarHeight(entry.borderBoxSize?.[0]?.blockSize ?? el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedConversation]);

  const useRealData = dbConversations.length > 0;

  // Guard: only treat IDs that look like real UUIDs as DB-backed
  const isValidUUID = (id: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  // Sort helper — newest last_message_at first
  const sortByLastMessage = (list: DBConversation[]) =>
    [...list].sort(
      (a, b) =>
        new Date(b.last_message_at || b.updated_at).getTime() -
        new Date(a.last_message_at || a.updated_at).getTime()
    );

  // Smart date formatter: today=time, this year=Apr 15, older=Apr 15, 2025
  const formatSmartDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }, []);

  // Available quick replies (filtered by cooldown)
  const availableQuickReplies = useMemo(() => {
    if (!selectedConversation) return ALL_QUICK_REPLIES;
    // qrCooldownTick forces recalculation when cooldown expires
    void qrCooldownTick;
    return getAvailableReplies(selectedConversation, ALL_QUICK_REPLIES);
  }, [selectedConversation, qrCooldownTick]);

  const filteredConversations = useMemo(() => {
    if (useRealData) {
      const bySellerMap = new Map<string, DBConversation>();
      for (const conv of dbConversations) {
        if (!conv.seller_id && !conv.last_message) continue;
        const key = conv.seller_id || conv.id;
        const existing = bySellerMap.get(key);
        if (!existing || new Date(conv.last_message_at || 0).getTime() > new Date(existing.last_message_at || 0).getTime()) {
          bySellerMap.set(key, conv);
        }
      }
      return [...bySellerMap.values()]
        .filter(conv =>
          (conv.seller_store_name || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    return conversations
      .filter(conv =>
        conv.lastMessage &&
        conv.sellerName.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => (b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0) - (a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0));
  }, [useRealData, dbConversations, conversations, searchQuery]);

  const activeConversation = useMemo(() =>
    useRealData
      ? dbConversations.find(c => c.id === selectedConversation)
      : conversations.find(c => c.id === selectedConversation),
    [useRealData, dbConversations, conversations, selectedConversation]
  );

  const reversedDbMessages = useMemo(() => [...dbMessages].reverse(), [dbMessages]);
  const reversedLocalMessages = useMemo(() =>
    activeConversation && !useRealData ? [...((activeConversation as Conversation).messages || [])].reverse() : [],
    [activeConversation, useRealData]
  );

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
    if (!selectedConversation || !useRealData || !isValidUUID(selectedConversation)) return;
    const loadMessages = async () => {
      setMessagesLoading(true);
      const msgs = await chatService.getMessages(selectedConversation);
      setDbMessages(msgs);
      setMessagesLoading(false);
      if (profile?.id) chatService.markAsRead(selectedConversation, profile.id, 'buyer');
    };
    loadMessages();
    // Reset reply state when switching conversations
    setReplyingTo(null);
  }, [selectedConversation, useRealData, profile?.id]);

  // Check seller suspension status when conversation changes
  useEffect(() => {
    if (!selectedConversation || !useRealData) { setSellerSuspended(false); return; }
    const conv = dbConversations.find(c => c.id === selectedConversation);
    if (!conv?.seller_id) { setSellerSuspended(false); return; }
    chatService.getSellerStatus(conv.seller_id).then(s => setSellerSuspended(s.isSuspended)).catch(() => setSellerSuspended(false));
  }, [selectedConversation, useRealData, dbConversations]);

  useEffect(() => {
    if (!selectedConversation || !useRealData || !isValidUUID(selectedConversation)) return;
    const unsubscribe = chatService.subscribeToMessages(
      selectedConversation,
      (newMsg) => {
        console.log('📩 [MessagesPage] subscribeToMessages callback fired:', newMsg.sender_type, newMsg.id?.slice(0, 8));
        setDbMessages(prev => {
          if (prev.some(msg => msg.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_type === 'seller' && profile?.id) {
          chatService.markAsRead(selectedConversation, profile.id, 'buyer');
        }
        // Always update sidebar preview + re-sort when a seller message arrives
        if (newMsg.sender_type === 'seller') {
          setDbConversations(prev =>
            sortByLastMessage(
              prev.map(c =>
                c.id === newMsg.conversation_id
                  ? {
                    ...c,
                    last_message: newMsg.content === '[Image]' ? '📷 Photo' : newMsg.content,
                    last_message_at: newMsg.created_at,
                    // Only increment unread badge if this conversation isn't open
                    buyer_unread_count: newMsg.conversation_id !== selectedConversation
                      ? (c.buyer_unread_count || 0) + 1
                      : c.buyer_unread_count,
                  }
                  : c
              )
            )
          );
        }
      }
    );
    return unsubscribe;
  }, [selectedConversation, useRealData, profile?.id]);

  const queryParams = new URLSearchParams(location.search);
  const initialSellerId = queryParams.get('sellerId');

  useEffect(() => {
    if (!initialSellerId || !profile?.id || loading) return;

    // Conversations are now loaded — check if one already exists for this seller
    const existingDbConv = dbConversations.find(c => c.seller_id === initialSellerId);
    if (existingDbConv) {
      setSelectedConversation(existingDbConv.id);
      return;
    }

    // No existing conversation found — look up or create via lite
    const initConversation = async () => {
      try {
        const conv = await chatService.getOrCreateConversationLite(profile.id, initialSellerId);
        if (conv) {
          const storeNameParam = queryParams.get('storeName');
          setSelectedConversation(conv.id);
          // Inject a synthetic entry immediately so the header shows the correct
          // store name without waiting for loadConversations() to finish
          setDbConversations(prev => {
            if (prev.some(c => c.id === conv.id)) return prev;
            return [{
              id: conv.id,
              buyer_id: profile.id,
              seller_id: initialSellerId,
              seller_store_name: storeNameParam ? decodeURIComponent(storeNameParam) : '',
              seller_avatar: undefined,
              last_message: '',
              last_message_at: new Date().toISOString(),
              buyer_unread_count: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            } as DBConversation, ...prev];
          });
          loadConversations(); // Refresh list so seller info is resolved from DB
        }
      } catch (error) { console.error(error); }
    };
    initConversation();
  }, [initialSellerId, profile?.id, loading]);

  // *** NO auto-selection: users must click a conversation ***

  // ---------------------------------------------------------
  // THE X-RAY PRESENCE LISTENER
  // ---------------------------------------------------------
  useEffect(() => {
    if (!useRealData) return;

    const unsubscribe = chatService.subscribeToPresenceUpdates((incomingUserId, isNowOnline) => {
      setDbConversations(prevConversations => {
        return prevConversations.map(conv => {
          if (conv.seller_id === incomingUserId) {
            return { ...conv, is_online: isNowOnline, isOnline: isNowOnline };
          }
          return conv;
        });
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [useRealData]);

  // Real-time sidebar: keep last_message + timestamp current, always re-sorted
  useEffect(() => {
    if (!profile?.id) return;
    const unsubscribe = chatService.subscribeToConversations(
      profile.id,
      'buyer',
      (updatedConv) => {
        setDbConversations(prev => {
          const exists = prev.some(c => c.id === updatedConv.id);
          const next = exists
            ? prev.map(c => {
              if (c.id !== updatedConv.id) return c;
              const merged = { ...c, ...updatedConv };
              // Increment unread badge for incoming seller messages (unless conversation is open)
              if ((updatedConv as any)._senderType === 'seller' && c.id !== selectedConversation) {
                merged.buyer_unread_count = (c.buyer_unread_count || 0) + 1;
              }
              return merged;
            })
            : [updatedConv, ...prev];
          return sortByLastMessage(next);
        });
      }
    );
    return unsubscribe;
  }, [profile?.id, selectedConversation]);



  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string, imageUrls?: string[]) => {
    e?.preventDefault();
    const messageText = textOverride || newMessage;
    if (!messageText.trim() && (!imageUrls || imageUrls.length === 0) || !selectedConversation) return;

    // Block if seller is suspended
    if (sellerSuspended) {
      toast({ title: 'Cannot send message', description: "This seller's account is suspended.", variant: 'destructive' });
      return;
    }

    // Quick reply cooldown
    if (textOverride && ALL_QUICK_REPLIES.includes(textOverride)) {
      setQRCooldown(selectedConversation, textOverride);
      setQrCooldownTick(t => t + 1);
      // Re-check after 5min
      setTimeout(() => setQrCooldownTick(t => t + 1), 5 * 60 * 1000 + 100);
    }

    if (useRealData && profile?.id) {
      const msgText = messageText.trim();
      const activeConv = dbConversations.find(c => c.id === selectedConversation);
      if (!textOverride) {
        setNewMessage('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
      const currentReplyTo = replyingTo;
      setReplyingTo(null);
      setSending(true);
      try {
        const result = await chatService.sendMessage(
          selectedConversation, profile.id, 'buyer', msgText,
          undefined, undefined, undefined,
          currentReplyTo?.id, activeConv?.seller_id || undefined
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
                  ? { ...c, last_message: msgText, last_message_at: new Date().toISOString(), last_sender_type: 'buyer' }
                  : c
              )
            )
          );
        }
      } catch (error) { console.error(error); } finally { setSending(false); }
      return;
    }

    addChatMessage(selectedConversation, {
      id: `m${Date.now()}`, senderId: 'buyer', text: messageText, images: imageUrls,
      timestamp: new Date().toISOString(), isRead: true
    });
    if (!textOverride && !imageUrls) setNewMessage('');
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !selectedConversation || !profile?.id) return;

    const file = files[0]; // Preview one at a time
    const { valid, mediaType, error } = validateChatMedia(file);
    if (!valid || !mediaType) {
      setInvalidFileError(error || 'File type not supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (docInputRef.current) docInputRef.current.value = '';
      return;
    }

    // Stage for preview instead of sending immediately
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
    if (!pendingMedia || !selectedConversation || !profile?.id || isSendingMediaRef.current) return;
    isSendingMediaRef.current = true;
    const { file, mediaType } = pendingMedia;
    setPendingMedia(null); // Close modal immediately

    setUploading(true);
    const url = await chatService.uploadChatMedia(file, selectedConversation);
    setUploading(false);

    if (!url) {
      toast({ title: 'Upload failed', description: 'Could not upload file. Please try again.', variant: 'destructive' });
      // Keep pendingMedia open so user can retry
      setPendingMedia({ file, previewUrl: URL.createObjectURL(file), mediaType });
      return;
    }

    const placeholderMap = { image: '[Image]', video: '[Video]', document: '[Document]' } as const;
    const previewMap = { image: '📷 Photo', video: '🎬 Video', document: '📄 Document' } as const;
    const placeholder = placeholderMap[mediaType];

    const tempId = `temp-${Date.now()}`;
    const tempMsg: DBMessage = {
      id: tempId,
      conversation_id: selectedConversation,
      sender_id: profile.id,
      sender_type: 'buyer',
      content: placeholder,
      media_url: url,
      media_type: mediaType,
      is_read: false,
      created_at: new Date().toISOString(),
      message_type: mediaType,
    };
    setDbMessages(prev => [...prev, tempMsg]);

    const activeConv = dbConversations.find(c => c.id === selectedConversation);
    const result = await chatService.sendMessage(
      selectedConversation, profile.id, 'buyer', placeholder, undefined, url, mediaType,
      undefined, activeConv?.seller_id || undefined
    );

    if (result) {
      setDbMessages(prev =>
        prev.some(m => m.id === result.id)
          ? prev.filter(m => m.id !== tempId)
          : prev.map(m => m.id === tempId ? result : m)
      );
      setDbConversations(prev =>
        sortByLastMessage(
          prev.map(c =>
            c.id === selectedConversation
              ? { ...c, last_message: previewMap[mediaType], last_message_at: result.created_at, last_sender_type: 'buyer' }
              : c
          )
        )
      );
    }
    isSendingMediaRef.current = false;
  };





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
      <Header />
      <div className="flex flex-1 overflow-hidden w-full gap-0">

        {/* Sidebar */}
        <div className={`w-full md:w-80 lg:w-96 flex-col bg-[var(--bg-secondary)] border-r border-[var(--brand-wash-gold)]/30 overflow-hidden ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-[var(--brand-wash-gold)]/20">
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="icon" className="md:hidden text-[var(--text-primary)] -ml-2 hover:bg-[var(--brand-wash)]" onClick={() => navigate(-1)}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h2 className="text-xl font-bold text-[var(--text-headline)]">Messages</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] h-4 w-4" />
              <Input
                placeholder="Search Conversations"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 bg-[var(--brand-wash)] border-none focus-visible:ring-1 focus-visible:ring-[var(--brand-primary)] rounded-xl py-5"
              />
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
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <MessageSquare className="h-12 w-12 text-[var(--text-muted)] mb-3" />
                <h3 className="text-[var(--text-muted)] font-medium">No messages yet</h3>
                <p className="text-[var(--text-muted)] text-sm mt-1">Start a conversation with a seller</p>
              </div>
            ) : useRealData ? (
              (filteredConversations as DBConversation[]).map((conv) => (
                <div key={conv.id} onClick={() => handleSelectConversation(conv.id)} className={`p-4 cursor-pointer hover:bg-[var(--brand-wash)] transition-all border-l-4 ${selectedConversation === conv.id ? 'bg-[var(--brand-wash)] border-l-[var(--brand-primary)]' : 'border-l-transparent'}`}>
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
                      <div className="flex justify-between items-baseline gap-2 mb-0.5">
                        <h4 className="font-bold text-[var(--text-headline)] truncate min-w-0">{conv.seller_store_name || 'Store'}</h4>
                        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase shrink-0">
                          {formatSmartDate(conv.last_message_at)}
                        </span>
                      </div>
                      <p className={`text-sm truncate ${conv.buyer_unread_count > 0 ? 'text-[var(--text-headline)] font-semibold' : 'text-[var(--text-muted)]'}`}>
                        {conv.last_sender_type === 'buyer' ? <span className="font-medium">You: </span> : null}{conv.last_message === '[Image]' ? '📷 Photo' : (conv.last_message || 'Start a conversation')}
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
        <div className={`flex-1 flex-col bg-[var(--bg-secondary)] overflow-hidden relative ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {activeConversation ? (
            <>
              <div className="bg-[var(--brand-primary)] p-4 flex items-center gap-4 text-white shadow-md relative z-10">
                <div className="relative">
                  <Avatar className="h-10 w-10 border-2 border-white/20">
                    <AvatarImage src={useRealData ? undefined : (activeConversation as Conversation).sellerImage} />
                    <AvatarFallback className="bg-white/20 text-white font-bold">
                      {(useRealData ? ((activeConversation as DBConversation).seller_store_name || 'S') : (activeConversation as Conversation).sellerName).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[var(--brand-primary)] rounded-full ${(activeConversation as any).is_online || (activeConversation as Conversation).isOnline ? 'bg-teal-400' : 'bg-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold leading-tight">
                    {useRealData ? (activeConversation as DBConversation).seller_store_name || 'Unknown Store' : (activeConversation as Conversation).sellerName}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
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

              {/* Suspended seller banner */}
              {sellerSuspended && (
                <div className="bg-red-500/10 border-b border-red-200 px-4 py-2 text-center">
                  <span className="text-xs font-semibold text-red-600">⚠ This seller's account is suspended. You cannot send messages.</span>
                </div>
              )}


              <div
                ref={chatContainerRef}
                className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 space-y-reverse bg-gray-50/50 flex flex-col-reverse relative"
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setShowJumpToLatest(el.scrollTop < -300);
                }}
              >
                {useRealData ? (
                  (() => {
                    const items: React.ReactNode[] = [];
                    let lastDateLabel = '';
                    dbMessages.forEach((msg, idx) => {
                      const msgDate = new Date(msg.created_at);
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
                        if (!msg.content) return; // Skip empty anchor messages (init markers)
                        items.push(
                          <div key={msg.id} className="flex justify-center my-2">
                            <div className="bg-white border border-gray-100 text-[var(--brand-accent)] text-xs px-4 py-2 rounded-2xl shadow-sm max-w-[80%] text-center">
                              {msg.content}
                            </div>
                          </div>
                        );
                        return;
                      }
                      const isBuyer = msg.sender_type === 'buyer';
                      const fullTimestamp = msgDate.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                      // Find replied-to message
                      const repliedMsg = msg.reply_to_message_id ? dbMessages.find(m => m.id === msg.reply_to_message_id) : null;
                      items.push(
                        <div key={msg.id} id={`msg-${msg.id}`} className={`flex ${isBuyer ? 'justify-end' : 'justify-start'} group/msg`}>
                          <div className={`max-w-[80%] flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`max-w-full px-4 py-3 rounded-2xl shadow-sm cursor-default group relative transition-all ${isBuyer ? 'bg-[var(--brand-primary)] text-white rounded-tr-sm' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-tl-sm border border-[var(--brand-wash-gold)]/20'}`}
                            >
                              {/* Reply-to quote block */}
                              {repliedMsg && (
                                <div
                                  className={`mb-2 px-3 py-1.5 rounded-lg text-xs border-l-2 cursor-pointer hover:opacity-80 transition-opacity ${isBuyer ? 'bg-white/10 border-white/40 text-white/80' : 'bg-gray-100 border-gray-300 text-gray-500'}`}
                                  onClick={() => {
                                    const el = document.getElementById(`msg-${repliedMsg.id}`);
                                    if (el) {
                                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                      el.classList.add('ring-2', 'ring-[var(--brand-primary)]');
                                      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--brand-primary)]'), 1500);
                                    }
                                  }}
                                >
                                  <p className="font-semibold text-[10px] mb-0.5">{repliedMsg.sender_type === 'buyer' ? 'You' : (activeConversation as DBConversation)?.seller_store_name || 'Seller'}</p>
                                  <p className="truncate">{repliedMsg.content}</p>
                                </div>
                              )}
                              {/* Image */}
                              {(msg.media_url || msg.image_url) && (msg.message_type === 'image' || msg.media_type === 'image' || (!msg.media_type && msg.image_url)) && (
                                <img
                                  src={msg.media_url || msg.image_url!}
                                  alt="Attachment"
                                  loading="lazy"
                                  className="max-w-[220px] max-h-[220px] rounded-lg object-cover cursor-pointer mb-1 border border-white/10 hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewMedia({ type: 'image', url: (msg.media_url || msg.image_url)! })}
                                />
                              )}
                              {/* Video — thumbnail with play overlay */}
                              {msg.media_url && (msg.message_type === 'video' || msg.media_type === 'video') && (
                                <div
                                  className="relative max-w-[280px] rounded-lg overflow-hidden mb-1 cursor-pointer group"
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
                              {msg.media_url && (msg.message_type === 'document' || msg.media_type === 'document') && (
                                <div
                                  onClick={() => setPreviewMedia({ type: 'document', url: msg.media_url!, fileName: extractFileName(msg.media_url!) })}
                                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 cursor-pointer transition-colors ${isBuyer ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                >
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isBuyer ? 'bg-white/15' : 'bg-red-50'}`}>
                                    <FileText className={`w-4 h-4 ${isBuyer ? 'text-white' : 'text-red-500'}`} />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate max-w-[180px]">{extractFileName(msg.media_url!)}</p>
                                    <p className={`text-[10px] ${isBuyer ? 'text-white/50' : 'text-gray-400'}`}>PDF Document</p>
                                  </div>
                                </div>
                              )}
                              {msg.content && !(msg.media_url && ['[Image]', '[Video]', '[Document]'].includes(msg.content)) && !(msg.image_url && msg.content === '[Image]') && (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                              )}
                              {/* Hover timestamp tooltip + reply button */}
                              <span className={`absolute bottom-full mb-1 ${isBuyer ? 'right-0' : 'left-0'} hidden group-hover:block text-[10px] text-white bg-gray-700/90 rounded px-2 py-0.5 whitespace-nowrap z-10`}>
                                {fullTimestamp}
                              </span>
                              {/* Reply icon on hover */}
                              <button
                                onClick={() => setReplyingTo(msg)}
                                className={`absolute top-1/2 -translate-y-1/2 ${isBuyer ? '-left-8' : '-right-8'} opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 rounded-full hover:bg-gray-200`}
                                title="Reply"
                              >
                                <Reply className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    });
                    // Reverse so flex-col-reverse renders them visually top→bottom (oldest first)
                    return items.reverse();
                  })()
                ) : (
                  reversedLocalMessages.map((msg) => {
                    const isBuyer = msg.senderId === 'buyer';
                    return (
                      <div key={msg.id} className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-full px-4 py-3 rounded-2xl shadow-sm ${isBuyer ? 'bg-[var(--brand-primary)] text-white rounded-tr-none' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--brand-wash-gold)]/20 rounded-tl-none'}`}>
                            {msg.images && msg.images.length > 0 && (
                              <div className={`grid gap-1 mb-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                {msg.images.map((img, idx) => (
                                  <div key={idx} className={`${msg.images && msg.images.length > 1 ? 'w-24 h-24' : 'w-40 h-40'} overflow-hidden rounded-lg cursor-pointer hover:opacity-90`} onClick={() => setPreviewMedia({ type: 'image', url: img })}>
                                    <img loading="lazy" src={img} alt="Sent" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                              </div>
                            )}
                            {msg.text && <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 uppercase mt-1.5 px-1">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {/* Jump to latest button */}
              {showJumpToLatest && (
                <button
                  onClick={() => chatContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="absolute left-1/2 -translate-x-1/2 z-20 bg-[var(--brand-primary)] text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 text-sm font-medium hover:bg-[var(--brand-primary-dark)] transition-colors"
                  style={{ bottom: `${inputBarHeight + 16}px` }}
                >
                  <ChevronDown className="w-4 h-4" /> Jump to latest
                </button>
              )}

              <div ref={inputBarRef} className="p-4 bg-[var(--bg-secondary)] border-t border-[var(--brand-wash-gold)]/20 space-y-4">
                {/* Reply preview bar */}
                {replyingTo && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-[var(--brand-wash)] rounded-xl border border-[var(--brand-wash-gold)]/20">
                    <Reply className="w-4 h-4 text-[var(--brand-primary)] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-[var(--brand-primary)]">
                        {replyingTo.sender_type === 'buyer' ? 'You' : (activeConversation as DBConversation)?.seller_store_name || 'Seller'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{replyingTo.content}</p>
                    </div>
                    <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                  </div>
                )}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                  {availableQuickReplies.map((reply) => (
                    <button key={reply} onClick={() => handleSendMessage(undefined, reply)} disabled={sellerSuspended} className="whitespace-nowrap px-4 py-2 rounded-full border border-[var(--brand-wash-gold)]/20 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:bg-[var(--brand-wash)] transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                      {reply}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 p-1 bg-[var(--brand-wash)] rounded-2xl border border-[var(--brand-wash-gold)]/20 focus-within:border-[var(--brand-primary)] transition-all">
                  <input type="file" ref={fileInputRef} onChange={handleMediaUpload} accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" multiple className="hidden" />
                  <input type="file" ref={docInputRef} onChange={handleMediaUpload} accept="application/pdf" className="hidden" />
                  <Button type="button" variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-[var(--brand-primary)] rounded-full" onClick={() => fileInputRef.current?.click()} disabled={sending || uploading || sellerSuspended}>
                    {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="text-[var(--text-muted)] hover:text-[var(--brand-primary)] rounded-full -ml-1" onClick={() => docInputRef.current?.click()} disabled={sending || uploading || sellerSuspended}>
                    <Paperclip className="h-5 w-5" />
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
                    placeholder="Type a message..."
                    rows={1}
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 text-[var(--text-primary)] shadow-none min-h-[40px] max-h-[120px] resize-none overflow-y-auto py-2.5 text-sm font-medium placeholder:text-gray-400 outline-none"
                    style={{ height: 'auto' }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = 'auto';
                      t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
                    }}
                    disabled={sending || uploading || sellerSuspended}
                  />
                  <div className="flex items-center gap-1 pr-1">
                    <Button type="submit" className="bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white rounded-xl h-10 w-10 p-0 shadow-lg shadow-[var(--brand-primary)]/20" disabled={!newMessage.trim() || sending || uploading || sellerSuspended}>
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
                  <img
                    src={pendingMedia.previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-[360px] object-contain rounded-lg"
                  />
                )}
                {pendingMedia.mediaType === 'video' && (
                  <video
                    src={pendingMedia.previewUrl}
                    controls
                    autoPlay
                    className="max-w-full max-h-[360px] rounded-lg"
                  />
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
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-dark)] text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      <InvalidFileModal error={invalidFileError} onClose={() => setInvalidFileError(null)} />
    </div>
  );
}