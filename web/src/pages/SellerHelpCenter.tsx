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
import { SellerSidebar } from "@/components/seller/SellerSidebar";
import { useSupportStore } from "../stores/supportStore";
import { useAuthStore } from "@/stores/sellerStore";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";

interface TicketData {
  subject: string;
  description: string;
  category: string;
  priority: string;
}

export function SellerHelpCenter() {
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

  const { seller } = useAuthStore();
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
    <div className="h-screen w-full flex flex-col md:flex-row bg-[var(--brand-wash)] overflow-hidden font-sans">
      <SellerSidebar />

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Decor */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-orange-100/40 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-yellow-100/40 rounded-full blur-[100px]" />
        </div>

        <div className="p-2 md:p-8 flex-1 w-full h-full overflow-auto scrollbar-hide relative z-10">
          <div className="w-full max-w-7xl mx-auto space-y-8 pb-10">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-black text-[var(--text-headline)] font-heading tracking-tight flex items-center gap-3">
                    Seller Help Center
                  </h1>
                  <p className="text-sm text-[var(--text-muted)] mt-1">Get support for your store operations</p>
                </div>
                {openTicketCount > 0 && (
                  <Badge className="bg-orange-100 text-[var(--brand-primary)] border-orange-200 px-3 py-1 text-sm font-bold rounded-full">
                    {openTicketCount} Active Ticket{openTicketCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>

            {/* Main Card Container */}
            <div className="bg-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-orange-100 overflow-hidden">
              {/* Notice Bar */}
              <div className="bg-blue-50/50 px-8 py-4 flex items-start gap-4 border-b border-blue-100">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <span className="text-blue-500 text-sm block">💡</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed font-medium">
                  <span className="font-bold text-gray-900">Seller Tip:</span>{" "}
                  Respond to buyer inquiries within 24 hours to maintain your response rate and store rating.
                </p>
              </div>

              {/* Content Body */}
              <div className="p-8">
                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-10">
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
                        className={`whitespace-nowrap pb-2 transition-colors ${activeTab === tab.key
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
                            className={`text-[10px] ${t.status === 'Open' ? 'bg-orange-50 text-orange-600 border-orange-200' :
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
                <div className="mt-10 pt-8 border-t border-gray-100">
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-xl p-8 border border-orange-100">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                          <MessageSquare className="text-white" size={28} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-gray-900">Need more help?</h3>
                          <p className="text-sm font-medium text-gray-600">Our seller support team is available 24/7</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowTicketModal(true)}
                        className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white px-8 py-3 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-orange-500/30 transition-all shadow-md active:scale-95 transform hover:-translate-y-0.5"
                      >
                        Contact Support
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
      className={`relative flex flex-col items-center gap-4 p-6 rounded-xl transition-all group duration-300 ${highlight
        ? "bg-gradient-to-b from-orange-50 to-white hover:to-orange-50/50 border border-orange-200 shadow-[0_8px_30px_rgba(255,100,0,0.1)] hover:-translate-y-1"
        : "bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-200 hover:shadow-lg hover:shadow-gray-200/50 hover:-translate-y-1"
        }`}
    >
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm ${highlight
        ? "bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-dark)] text-white shadow-orange-500/20"
        : "bg-white text-gray-400 group-hover:text-[var(--brand-primary)] group-hover:shadow-md"
        }`}>
        {icon}
      </div>
      <span className={`text-sm font-bold text-center ${highlight ? "text-[var(--brand-primary-dark)]" : "text-gray-600 group-hover:text-gray-900"
        }`}>
        {label}
      </span>
      {badge && badge > 0 && (
        <span className="absolute top-3 right-3 w-6 h-6 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm animate-pulse">
          {badge}
        </span>
      )}
    </button>
  );
}

export default SellerHelpCenter;
