import {
  ChevronRight,
  RefreshCw,
  Ticket,
  Zap,
  Clock,
  Package,
  Wallet,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  FileText,
  Send,
  Star,
  TrendingUp,
  Loader2,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { sellerLinks } from "@/config/sellerLinks";
import { useSupportStore } from "../stores/supportStore";
import { useAuthStore } from "@/stores/sellerStore";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

// Logo components for sidebar
const Logo = () => (
  <div className="font-bold flex items-center text-sm text-black py-1 relative z-20">
    <div className="h-6 w-8 bg-orange-500 rounded-lg text-white flex items-center justify-center text-xs font-black mr-2">
      BX
    </div>
    BazaarX Seller
  </div>
);

const LogoIcon = () => (
  <div className="h-6 w-8 bg-orange-500 rounded-lg text-white flex items-center justify-center text-xs font-black">
    BX
  </div>
);

interface TicketData {
  subject: string;
  description: string;
  category: string;
  priority: string;
}

export function SellerHelpCenter() {
  const [open, setOpen] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string>("");
  const [ticket, setTicket] = useState<TicketData>({
    subject: "",
    description: "",
    category: "General",
    priority: "normal",
  });
  const [activeTab, setActiveTab] = useState("hot");
  const [buyerReportCount, setBuyerReportCount] = useState(0);
  const navigate = useNavigate();
  
  const { seller, logout } = useAuthStore();
  const { submitTicket, fetchCategories, categories, tickets, fetchUserTickets, loading } = useSupportStore();

  // Fetch categories and user tickets on mount
  useEffect(() => {
    fetchCategories();
    if (seller?.id) {
      fetchUserTickets(seller.id);
      fetchBuyerReportCount();
    }
  }, [fetchCategories, fetchUserTickets, seller?.id]);

  const fetchBuyerReportCount = async () => {
    if (!seller?.id) return;
    
    try {
      const { count, error } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', seller.id);
      
      if (!error && count !== null) {
        setBuyerReportCount(count);
      }
    } catch (error) {
      console.error('Error fetching buyer report count:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!seller?.id) {
      console.error("Seller not logged in");
      return;
    }

    // Find category ID from name
    const category = categories.find(c => c.name === ticket.category);

    try {
      const ticketId = await submitTicket({
        userId: seller.id,
        userName: seller.storeName || seller.ownerName || seller.name || "Seller",
        userEmail: seller.email || "",
        subject: ticket.subject,
        description: ticket.description,
        categoryId: category?.id,
        categoryName: ticket.category,
        priority: ticket.priority,
      });

      if (ticketId) {
        setGeneratedTicketId(ticketId);
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error("Ticket submission failed:", error);
    }
  };

  const handleCloseModal = () => {
    setShowTicketModal(false);
    setTimeout(() => {
      setIsSubmitted(false);
      setTicket({
        subject: "",
        description: "",
        category: "General",
        priority: "normal",
      });
    }, 300);
  };

  const handleLogout = () => {
    logout();
    navigate("/seller/auth");
  };

  // Seller-specific FAQ questions
  const faqCategories = {
    hot: [
      "How do I add or update my bank payout details?",
      "Why is my product stuck in pending approval?",
      "How can I respond to a buyer complaint?",
      "When will I receive my weekly payout?",
    ],
    products: [
      "How do I list a new product?",
      "Why was my product rejected?",
      "How do I add product variants?",
      "How to update product pricing?",
    ],
    orders: [
      "How do I process an order?",
      "What happens if shipping fails?",
      "How do I handle a return request?",
      "How to cancel an order?",
    ],
    payouts: [
      "When are payouts processed?",
      "Why is my payout on hold?",
      "How to update bank details?",
      "What are the payout fees?",
    ],
  };

  const openTicketCount = tickets.filter(t => t.status === 'Open' || t.status === 'In Review').length;

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-gray-50 overflow-hidden font-[family-name:var(--font-sans)]">
      {/* Sidebar */}
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
                label: seller?.storeName || seller?.ownerName || seller?.name || "Seller",
                href: "/seller/profile",
                icon: (
                  <div className="h-7 w-7 flex-shrink-0 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                      {(seller?.storeName || seller?.ownerName || seller?.name || "S").charAt(0)}
                    </span>
                  </div>
                ),
              }}
            />
          </div>
        </SidebarBody>
      </Sidebar>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Seller Help Center</h1>
                <p className="text-gray-500 text-sm">Get support for your store operations</p>
              </div>
              {openTicketCount > 0 && (
                <Badge className="bg-orange-100 text-orange-600 border-orange-200">
                  {openTicketCount} Active Ticket{openTicketCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Main Card Container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Notice Bar */}
            <div className="bg-blue-50/50 px-6 py-3 flex items-start gap-3 border-b border-blue-100">
              <span className="text-blue-500 text-sm mt-0.5">💡</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-bold text-gray-800">Seller Tip:</span>{" "}
                Respond to buyer inquiries within 24 hours to maintain your response rate and store rating.
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6">
              {/* Quick Actions Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <QuickActionCard
                  icon={<Ticket size={24} />}
                  label="Submit Ticket"
                  onClick={() => setShowTicketModal(true)}
                  highlight
                />
                <QuickActionCard
                  icon={<Clock size={24} />}
                  label="My Tickets"
                  onClick={() => navigate("/seller/my-tickets")}
                  badge={openTicketCount > 0 ? openTicketCount : undefined}
                />
                <QuickActionCard
                  icon={<AlertTriangle size={24} />}
                  label="Buyer Reports"
                  onClick={() => navigate("/seller/buyer-reports")}
                  badge={buyerReportCount > 0 ? buyerReportCount : undefined}
                />
                <QuickActionCard
                  icon={<Wallet size={24} />}
                  label="Payout Help"
                  onClick={() => navigate("/seller/earnings")}
                />
                <QuickActionCard
                  icon={<FileText size={24} />}
                  label="Policies"
                />
              </div>

              {/* FAQ Section */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
                <div className="flex gap-4 border-b border-gray-100 mb-4 text-sm font-medium overflow-x-auto pb-1">
                  {[
                    { key: "hot", label: "Hot Questions" },
                    { key: "products", label: "Products" },
                    { key: "orders", label: "Orders" },
                    { key: "payouts", label: "Payouts" },
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`whitespace-nowrap pb-2 transition-colors ${
                        activeTab === tab.key
                          ? "text-orange-500 border-b-2 border-orange-500"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {faqCategories[activeTab as keyof typeof faqCategories]?.map((q, idx) => (
                    <button
                      key={idx}
                      className="w-full flex items-center justify-between text-sm py-3 px-3 rounded-lg hover:bg-gray-50 group transition-colors text-left"
                    >
                      <p className="flex items-center gap-4">
                        <span className="italic font-bold text-orange-500 w-4 text-center">
                          {idx + 1}
                        </span>
                        <span className="text-gray-600 group-hover:text-gray-900 font-medium">
                          {q}
                        </span>
                      </p>
                      <ChevronRight
                        size={16}
                        className="text-gray-300 group-hover:text-orange-500"
                      />
                    </button>
                  ))}
                </div>

                <div className="mt-4 flex justify-center">
                  <button className="flex items-center gap-2 text-xs text-gray-400 hover:text-orange-500 transition-colors">
                    <RefreshCw size={12} /> View More Topics
                  </button>
                </div>
              </div>

              {/* Recent Tickets Section */}
              {tickets.length > 0 && (
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Recent Tickets</h2>
                    <button 
                      onClick={() => navigate("/seller/my-tickets")}
                      className="text-xs text-orange-500 hover:text-orange-600 font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {tickets.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        onClick={() => navigate("/seller/my-tickets")}
                      >
                        <div className="flex items-center gap-3">
                          <Ticket size={16} className="text-orange-500" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] md:max-w-xs">
                              {t.subject}
                            </p>
                            <p className="text-xs text-gray-500">{t.createdAt}</p>
                          </div>
                        </div>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] ${
                            t.status === 'Open' ? 'bg-orange-50 text-orange-600 border-orange-200' :
                            t.status === 'In Review' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                            t.status === 'Resolved' ? 'bg-green-50 text-green-600 border-green-200' :
                            'bg-gray-50 text-gray-500 border-gray-200'
                          }`}
                        >
                          {t.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact Section */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-xl p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                        <MessageSquare className="text-white" size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Need more help?</h3>
                        <p className="text-sm text-gray-600">Our seller support team is available 24/7</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowTicketModal(true)}
                      className="bg-orange-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-orange-600 transition-all shadow-md active:scale-95"
                    >
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Ticket Modal */}
      <AnimatePresence>
        {showTicketModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-xl rounded-2xl shadow-2xl"
            >
              {!isSubmitted ? (
                <>
                  <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="font-bold text-lg text-gray-900">
                      Seller Support Ticket
                    </h2>
                    <button
                      onClick={handleCloseModal}
                      className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="p-5 space-y-4">
                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                        Subject
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Payout Issue, Product Approval"
                        className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder-gray-300"
                        value={ticket.subject}
                        onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                          Category
                        </label>
                        <select
                          required
                          className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                          value={ticket.category}
                          onChange={(e) => setTicket({ ...ticket, category: e.target.value })}
                        >
                          <option value="General">General</option>
                          <option value="Order Issue">Order Issue</option>
                          <option value="Payment">Payment/Payout</option>
                          <option value="Shipping">Shipping</option>
                          <option value="Product Quality">Product Listing</option>
                          <option value="Returns">Returns & Refunds</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                          Priority
                        </label>
                        <select
                          className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all"
                          value={ticket.priority}
                          onChange={(e) => setTicket({ ...ticket, priority: e.target.value })}
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                        Description
                      </label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Please describe your issue in detail..."
                        className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none transition-all placeholder-gray-300 resize-none"
                        value={ticket.description}
                        onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleCloseModal}
                        className="flex-1 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
                      >
                        <Send size={16} />
                        Submit Ticket
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="text-green-600" size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Ticket Submitted!</h2>
                  <p className="text-gray-500 text-sm mb-4">
                    Your ticket ID is <span className="font-bold text-orange-500">{generatedTicketId}</span>
                  </p>
                  <p className="text-gray-400 text-xs mb-6">
                    Our support team will respond within 24-48 hours.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => navigate("/seller/my-tickets")}
                      className="flex-1 py-3 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      View My Tickets
                    </button>
                    <button
                      onClick={handleCloseModal}
                      className="flex-1 py-3 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Quick Action Card Component
function QuickActionCard({ 
  icon, 
  label, 
  onClick, 
  highlight = false,
  badge 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick?: () => void;
  highlight?: boolean;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center gap-3 p-4 rounded-xl transition-all group ${
        highlight 
          ? "bg-orange-50 hover:bg-orange-100 border border-orange-200" 
          : "bg-gray-50 hover:bg-gray-100 border border-transparent"
      }`}
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
        highlight
          ? "bg-orange-500 text-white"
          : "bg-white text-orange-500 group-hover:bg-orange-500 group-hover:text-white"
      }`}>
        {icon}
      </div>
      <span className={`text-xs font-medium text-center ${
        highlight ? "text-orange-700" : "text-gray-600"
      }`}>
        {label}
      </span>
      {badge && badge > 0 && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

export default SellerHelpCenter;
