import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import {
    Search,
    Send,
    MoreVertical,
    ChevronLeft,
    Ticket,
    Image as ImageIcon,
    Paperclip,
    Smile,
    Store,
    Trash2,
    ExternalLink,
    MessageSquare,
    Loader2
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBuyerStore, demoSellers, Message, Conversation } from '../stores/buyerStore';
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
    
    // Real data state
    const [dbConversations, setDbConversations] = useState<DBConversation[]>([]);
    const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    
    // Check if using real data
    const useRealData = dbConversations.length > 0;

    // Load real conversations from Supabase
    const loadConversations = useCallback(async () => {
        if (!profile?.id) {
            setLoading(false);
            return;
        }
        
        try {
            const convs = await chatService.getBuyerConversations(profile.id);
            setDbConversations(convs);
        } catch (error) {
            console.error('[MessagesPage] Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    }, [profile?.id]);
    
    useEffect(() => {
        loadConversations();
    }, [loadConversations]);
    
    // Load messages when conversation is selected
    useEffect(() => {
        if (!selectedConversation || !useRealData) return;
        
        const loadMessages = async () => {
            const msgs = await chatService.getMessages(selectedConversation);
            setDbMessages(msgs);
            
            // Mark as read
            if (profile?.id) {
                chatService.markAsRead(selectedConversation, profile.id, 'buyer');
            }
        };
        
        loadMessages();
    }, [selectedConversation, useRealData, profile?.id]);
    
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
                
                if (newMsg.sender_type === 'seller' && profile?.id) {
                    chatService.markAsRead(selectedConversation, profile.id, 'buyer');
                }
            }
        );
        
        return unsubscribe;
    }, [selectedConversation, useRealData, profile?.id]);

    // Extract sellerId from URL if present
    const queryParams = new URLSearchParams(location.search);
    const initialSellerId = queryParams.get('sellerId');

    // Handle sellerId from URL only when it changes or on mount
    useEffect(() => {
        if (!initialSellerId) return;
        
        const initConversation = async () => {
            // If user is logged in, try to use real database
            if (profile?.id) {
                try {
                    // Check if conversation already exists in dbConversations
                    const existingDbConv = dbConversations.find(c => c.seller_id === initialSellerId);
                    if (existingDbConv) {
                        setSelectedConversation(existingDbConv.id);
                        return;
                    }
                    
                    // Create or get conversation from database
                    const conv = await chatService.getOrCreateConversation(profile.id, initialSellerId);
                    if (conv) {
                        setSelectedConversation(conv.id);
                        // Reload conversations to include the new one
                        loadConversations();
                        return;
                    }
                } catch (error) {
                    console.error('[MessagesPage] Error creating conversation:', error);
                }
            }
            
            // Fallback to local store for demo/guest mode
            const existingConv = conversations.find(c => c.sellerId === initialSellerId);
            if (existingConv) {
                setSelectedConversation(existingConv.id);
            } else {
                const sellerDetails =
                    demoSellers?.find(s => s.id === initialSellerId) ||
                    viewedSellers?.find(s => s.id === initialSellerId);

                const newConv: Conversation = {
                    id: `conv-${initialSellerId}`,
                    sellerId: initialSellerId,
                    sellerName: sellerDetails?.name || 'Seller Store',
                    sellerImage: sellerDetails?.avatar,
                    lastMessage: `Welcome to ${sellerDetails?.name || 'our store'}! 🛍️`,
                    lastMessageTime: new Date().toISOString(),
                    unreadCount: 0,
                    isOnline: true,
                    messages: [
                        {
                            id: `init-${Date.now()}`,
                            senderId: 'seller',
                            text: `Welcome to ${sellerDetails?.name || 'our store'}! 🛍️ How can we help you today? We usually reply within minutes.`,
                            timestamp: new Date().toISOString(),
                            isRead: true
                        }
                    ]
                };
                addConversation(newConv);
                setSelectedConversation(newConv.id);
            }
        };
        
        initConversation();
    }, [initialSellerId, profile?.id, dbConversations, conversations, demoSellers, viewedSellers, addConversation, loadConversations]);

    // Handle default selection of first conversation if none selected
    useEffect(() => {
        if (useRealData) {
            if (!selectedConversation && dbConversations.length > 0) {
                setSelectedConversation(dbConversations[0].id);
            }
        } else {
            if (!selectedConversation && conversations.length > 0 && !initialSellerId) {
                setSelectedConversation(conversations[0].id);
            }
        }
    }, [conversations.length, dbConversations.length, selectedConversation, initialSellerId, useRealData]);

    const activeConversation = useRealData
        ? dbConversations.find(c => c.id === selectedConversation)
        : conversations.find(c => c.id === selectedConversation);

    const handleSendMessage = async (e?: React.FormEvent, textOverride?: string, imageUrls?: string[]) => {
        e?.preventDefault();
        const messageText = textOverride || newMessage;
        if (!messageText.trim() && (!imageUrls || imageUrls.length === 0) || !selectedConversation) return;

        // Real data mode
        if (useRealData && profile?.id) {
            setSending(true);
            try {
                const result = await chatService.sendMessage(
                    selectedConversation,
                    profile.id,
                    'buyer',
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
        addChatMessage(selectedConversation, {
            id: `m${Date.now()}`,
            senderId: 'buyer',
            text: messageText,
            images: imageUrls,
            timestamp: new Date().toISOString(),
            isRead: true
        });

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

            // Clear input so same file can be selected again
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // Filtered conversations (supports both mock and real data)
    const filteredConversations = useRealData
        ? dbConversations.filter(conv =>
            (conv.seller_store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            conv.last_message.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : conversations
            .filter(conv =>
                conv.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => {
                const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                return timeB - timeA;
            });

    const quickReplies = [
        "Is this available?",
        "Can I see real photos?",
        "Do you offer COD?",
        "Is this authentic?"
    ];

    const handleDeleteConversation = () => {
        if (selectedConversation) {
            deleteConversation(selectedConversation);
            setSelectedConversation(null);
            // If the deleted conversation was the one in the URL, clear the URL
            if (initialSellerId) {
                navigate('/messages', { replace: true });
            }
        }
    };

    const handleVisitStore = () => {
        if (useRealData && activeConversation) {
            navigate(`/seller/${(activeConversation as DBConversation).seller_id}`);
        } else if ((activeConversation as Conversation)?.sellerId) {
            navigate(`/seller/${(activeConversation as Conversation).sellerId}`);
        }
    };

    return (
        <div className="flex flex-col h-screen w-screen bg-gray-50 overflow-hidden">
            <div className="flex flex-1 overflow-hidden w-full h-full gap-0">
                {/* Conversations List Sidebar */}
                <div className="w-full md:w-80 lg:w-96 flex flex-col bg-white border-r border-gray-100 overflow-hidden hidden md:flex">
                    <div className="p-4 border-b border-gray-50">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-orange-500 rounded-xl py-5"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                                <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                                <h3 className="text-gray-500 font-medium">No messages yet</h3>
                                <p className="text-gray-400 text-sm mt-1">Start a conversation with a seller</p>
                            </div>
                        ) : useRealData ? (
                            (filteredConversations as DBConversation[]).map((conv) => (
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
                                                    {(conv.seller_store_name || 'S').charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h4 className="font-bold text-gray-900 truncate">{conv.seller_store_name || 'Store'}</h4>
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase">
                                                    {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className={`text-sm truncate ${conv.buyer_unread_count > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                                {conv.last_message || 'Start a conversation'}
                                            </p>
                                        </div>
                                        {conv.buyer_unread_count > 0 && (
                                            <Badge className="bg-orange-500 hover:bg-orange-600 h-5 min-w-[20px] rounded-full flex items-center justify-center p-0.5 text-[10px]">
                                                {conv.buyer_unread_count}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            (filteredConversations as Conversation[]).map((conv) => (
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
                                                <AvatarImage src={conv.sellerImage} />
                                                <AvatarFallback className="bg-orange-100 text-orange-600 font-bold">
                                                    {conv.sellerName.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            {conv.isOnline && (
                                                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
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
                                            <Badge className="bg-orange-500 hover:bg-orange-600 h-5 min-w-[20px] rounded-full flex items-center justify-center p-0.5 text-[10px]">
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
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                    {activeConversation ? (
                        <>
                            {/* Custom Chat Header */}
                            <div className="bg-[#ff6a00] p-4 flex items-center gap-4 text-white shadow-md relative z-10">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white hover:bg-white/10"
                                    onClick={() => navigate(-1)}
                                    title="Go Back"
                                >
                                    <ChevronLeft className="h-6 w-6" />
                                </Button>

                                <div className="relative">
                                    <Avatar className="h-10 w-10 border-2 border-white/20">
                                        <AvatarImage src={useRealData ? undefined : (activeConversation as Conversation).sellerImage} />
                                        <AvatarFallback className="bg-white/20 text-white font-bold">
                                            {(useRealData 
                                                ? ((activeConversation as DBConversation).seller_store_name || 'S')
                                                : (activeConversation as Conversation).sellerName
                                            ).charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-[#ff6a00] rounded-full" />
                                </div>

                                <div className="flex-1">
                                    <h3 className="font-bold leading-tight">
                                        {useRealData 
                                            ? (activeConversation as DBConversation).seller_store_name || 'Store'
                                            : (activeConversation as Conversation).sellerName
                                        }
                                    </h3>
                                    <div className="flex items-center gap-1 text-[11px] font-medium opacity-90">
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                        Online
                                    </div>
                                </div>

                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                                        <Ticket className="h-5 w-5" />
                                    </Button>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                                                <MoreVertical className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-gray-100 p-1">
                                            <DropdownMenuItem
                                                onClick={handleVisitStore}
                                                className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer hover:bg-orange-50 hover:text-orange-600 transition-colors"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                                <span className="font-medium text-sm">Visit Store</span>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={handleDeleteConversation}
                                                className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer hover:bg-red-50 text-gray-800 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                <span className="font-medium text-sm">Delete Conversation</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>

                            {/* Messages Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
                                {useRealData ? (
                                    dbMessages.map((msg) => {
                                        const isBuyer = msg.sender_type === 'buyer';
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={msg.id}
                                                className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[80%] flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}>
                                                    <div className={`
                                                        px-4 py-3 rounded-2xl shadow-sm
                                                        ${isBuyer
                                                            ? 'bg-orange-500 text-white rounded-tr-sm'
                                                            : 'bg-white text-gray-800 rounded-tl-sm border border-gray-100'
                                                        }
                                                    `}>
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
                                    (activeConversation as Conversation).messages.map((msg, idx) => {
                                        const isBuyer = msg.senderId === 'buyer';
                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                            key={msg.id}
                                            className={`flex ${isBuyer ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div className={`max-w-[80%] flex flex-col ${isBuyer ? 'items-end' : 'items-start'}`}>
                                                <div className={`
                          px-4 py-3 rounded-2xl shadow-sm
                          ${isBuyer
                                                        ? 'bg-[#ff6a00] text-white rounded-tr-none'
                                                        : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                                                    }
                        `}>
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
                                                <span className="text-[10px] font-bold text-gray-400 uppercase mt-1.5 px-1">
                                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                    })
                                )}
                            </div>

                            {/* Input Area Section */}
                            <div className="p-4 bg-white border-t border-gray-100 space-y-4">
                                {/* Quick Replies / Chips */}
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide no-scrollbar">
                                    {quickReplies.map((reply) => (
                                        <button
                                            key={reply}
                                            onClick={() => handleSendMessage(undefined, reply)}
                                            className="whitespace-nowrap px-4 py-2 rounded-full border border-gray-200 text-sm font-medium text-gray-600 hover:border-orange-200 hover:text-orange-500 hover:bg-orange-50 transition-all shadow-sm"
                                        >
                                            {reply}
                                        </button>
                                    ))}
                                </div>

                                {/* Message Input */}
                                <form
                                    onSubmit={handleSendMessage}
                                    className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-orange-300 transition-all"
                                >
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
                                        className="text-gray-400 hover:text-[#ff6a00] rounded-full hover:bg-base"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={sending}
                                    >
                                        <ImageIcon className="h-5 w-5" />
                                    </Button>

                                    <Input
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message..."
                                        className="flex-1 bg-transparent border-none focus-visible:ring-0 text-gray-700 shadow-none h-10"
                                        disabled={sending}
                                    />

                                    <div className="flex items-center gap-1 pr-1">
                                        <Button
                                            type="submit"
                                            className="bg-[#ff6a00] hover:bg-[#e65e00] text-white rounded-xl h-10 w-10 p-0 shadow-lg shadow-orange-500/20"
                                            disabled={!newMessage.trim() || sending}
                                        >
                                            {sending ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Send className="h-5 w-5" />
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4">
                            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-2">
                                <Store className="h-10 w-10" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Your Conversations</h3>
                                <p className="text-gray-500 max-w-xs mx-auto">
                                    Select a seller from the list or visit a store to start chatting!
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                className="border-orange-200 text-orange-600 hover:bg-orange-50 rounded-xl px-6"
                                onClick={() => navigate('/stores')}
                            >
                                Browse Stores
                            </Button>
                        </div>
                    )}
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
