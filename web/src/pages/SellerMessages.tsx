import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/sellerStore';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Star,
  BarChart3,
  Settings,
  Store,
  Wallet,
  Zap,
  Search,
  MessageSquare,
  Send,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Paperclip
} from 'lucide-react';

interface Message {
  id: string;
  senderId: string;
  text: string;
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

export default function SellerMessages() {
  const { seller } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>('1');
  const [newMessage, setNewMessage] = useState('');

  const sellerLinks = [
    {
      label: "Dashboard",
      href: "/seller",
      icon: <LayoutDashboard className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Store Profile",
      href: "/seller/store-profile",
      icon: <Store className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Products",
      href: "/seller/products",
      icon: <Package className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Orders",
      href: "/seller/orders",
      icon: <ShoppingBag className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Flash Sales",
      href: "/seller/flash-sales",
      icon: <Zap className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Messages",
      href: "/seller/messages",
      icon: <MessageSquare className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Earnings",
      href: "/seller/earnings",
      icon: <Wallet className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Reviews",
      href: "/seller/reviews",
      icon: <Star className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Analytics",
      href: "/seller/analytics",
      icon: <BarChart3 className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    },
    {
      label: "Settings",
      href: "/seller/settings",
      icon: <Settings className="text-gray-700 dark:text-gray-200 h-5 w-5 flex-shrink-0" />
    }
  ];

  const Logo = () => (
    <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-5 w-6 flex-shrink-0"
      />
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-medium text-black whitespace-pre"
      >
        BazaarPH Seller
      </motion.span>
    </Link>
  );

  const LogoIcon = () => (
    <Link to="/seller" className="font-normal flex space-x-2 items-center text-sm text-black py-1 relative z-20">
      <img 
        src="/Logo.png" 
        alt="BazaarPH Logo" 
        className="h-8 w-8 object-contain flex-shrink-0"
      />
    </Link>
  );

  // Mock Data
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: '1',
      buyerName: 'Juan Dela Cruz',
      lastMessage: 'Is this item still available?',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
      unreadCount: 1,
      messages: [
        {
          id: 'm1',
          senderId: 'buyer',
          text: 'Hi, I saw your listing for the Wireless Earbuds.',
          timestamp: new Date(Date.now() - 1000 * 60 * 60),
          isRead: true
        },
        {
          id: 'm2',
          senderId: 'buyer',
          text: 'Is this item still available?',
          timestamp: new Date(Date.now() - 1000 * 60 * 5),
          isRead: false
        }
      ]
    },
    {
      id: '2',
      buyerName: 'Maria Santos',
      lastMessage: 'Thank you for the fast delivery!',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      unreadCount: 0,
      messages: [
        {
          id: 'm3',
          senderId: 'seller',
          text: 'Your order has been shipped!',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25),
          isRead: true
        },
        {
          id: 'm4',
          senderId: 'buyer',
          text: 'Thank you for the fast delivery!',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
          isRead: true
        }
      ]
    }
  ]);

  const activeConversation = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const updatedConversations = conversations.map(c => {
      if (c.id === selectedConversation) {
        return {
          ...c,
          lastMessage: newMessage,
          lastMessageTime: new Date(),
          messages: [
            ...c.messages,
            {
              id: `m${Date.now()}`,
              senderId: 'seller',
              text: newMessage,
              timestamp: new Date(),
              isRead: true
            }
          ]
        };
      }
      return c;
    });

    setConversations(updatedConversations);
    setNewMessage('');
  };

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
          <div>
            <SidebarLink
              link={{
                label: seller?.storeName || "Store",
                href: "/seller/store-profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {seller?.storeName?.charAt(0) || 'S'}
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex h-full">
          {/* Conversations List */}
          <div className="w-80 border-r bg-white flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-xl font-bold mb-4">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input placeholder="Search messages..." className="pl-9" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation === conv.id ? 'bg-orange-50 border-l-4 border-l-orange-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarFallback>{conv.buyerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <h3 className="font-medium truncate">{conv.buyerName}</h3>
                        <span className="text-xs text-gray-500">
                          {conv.lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                    </div>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-orange-500 hover:bg-orange-600 rounded-full h-5 w-5 flex items-center justify-center p-0">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-white border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{activeConversation.buyerName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold">{activeConversation.buyerName}</h3>
                      <span className="text-xs text-green-500 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Online
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Phone className="w-5 h-5 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Video className="w-5 h-5 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-5 h-5 text-gray-500" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {activeConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderId === 'seller' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl p-3 ${
                          msg.senderId === 'seller'
                            ? 'bg-orange-500 text-white rounded-tr-none'
                            : 'bg-white border rounded-tl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                        <span className={`text-[10px] mt-1 block ${
                          msg.senderId === 'seller' ? 'text-orange-100' : 'text-gray-400'
                        }`}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="icon">
                      <ImageIcon className="w-5 h-5 text-gray-500" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon">
                      <Paperclip className="w-5 h-5 text-gray-500" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1"
                    />
                    <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
