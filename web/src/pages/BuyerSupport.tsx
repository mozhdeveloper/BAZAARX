import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Truck,
  Ticket,
  Zap,
  RotateCcw,
  Clock,
  Upload,
  Package,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { BazaarFooter } from "../components/ui/bazaar-footer";
import { useSupportStore } from "../stores/supportStore";
import { useBuyerStore } from "../stores/buyerStore";
import { BuyerTicketModal, TicketData } from "../components/BuyerTicketModal";
import { SupportServiceCard } from "../components/SupportServiceCard";
import { SupportChatChip } from "../components/SupportChatChip";

export function BuyerSupport() {
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [generatedTicketId, setGeneratedTicketId] = useState<string>("");
  const [ticket, setTicket] = useState<TicketData>({
    subject: "",
    description: "",
    category: "General",
    proof: null,
    sellerId: null,
    sellerStoreName: "",
  });
  const [chatMessage, setChatMessage] = useState("");
  const navigate = useNavigate();
  const { submitTicket, fetchCategories, categories } = useSupportStore();
  const { profile } = useBuyerStore();

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTicket({ ...ticket, proof: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile?.id) {
      console.error("User not logged in");
      return;
    }

    // Find category ID from name
    const category = categories.find(c => c.name === ticket.category);

    // Submit ticket to store
    try {
      const ticketId = await submitTicket({
        userId: profile.id,
        userName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'User',
        userEmail: profile?.email || "",
        subject: ticket.subject,
        description: ticket.description,
        categoryId: category?.id,
        categoryName: ticket.category,
        priority: "normal",
        sellerId: ticket.sellerId || undefined,
        sellerStoreName: ticket.sellerStoreName || undefined,
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
    // Reset state after closing animation
    setTimeout(() => {
      setIsSubmitted(false);
      setTicket({
        subject: "",
        description: "",
        sellerId: null,
        sellerStoreName: "",
        category: "General",
        proof: null,
      });
    }, 300);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    console.log("Chat message:", chatMessage);
    setChatMessage("");
    // Logic for AI assistant would go here
  };

  const handleTicketChange = (next: Partial<TicketData>) => {
    setTicket((prev) => ({ ...prev, ...next }));
  };

  return (
    <div className="min-h-screen bg-[var(--brand-wash)] font-[family-name:var(--font-sans)] text-[var(--text-primary)]">
      <Header />

      <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col items-center">
        {/* Back Link */}
        <div className="w-full max-w-5xl mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors group"
          >
            <ChevronLeft
              size={20}
              className="group-hover:-translate-x-0.5 transition-transform"
            />
            <span className="text-sm font-medium">Back</span>
          </button>
        </div>
        {/* Main Card Container */}
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in duration-300">
          {/* Header */}
          <div className="p-6 flex items-center justify-between border-b border-[var(--border)] relative">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-xl rounded-xl shadow-sm">
                BX
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[var(--text-headline)]">
                  BazaarX Help Center
                </h1>
                <p className="text-[var(--text-muted)] text-xs">We're here to help</p>
              </div>
            </div>
          </div>

          {/* Shipping Notice Bar */}
          <div className="bg-red-50/50 px-6 py-3 flex items-start gap-3 border-b border-red-100">
            <span className="text-red-500 text-sm mt-0.5">📢</span>
            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="font-bold text-gray-800">
                Shipping Delay Notice:
              </span>{" "}
              Peak season volumes may affect delivery times by 1-2 days. Thank
              you for your patience.
            </p>
          </div>

          {/* Content Body */}
          <div className="p-6">
            {/* Service Grid */}
            <div className="grid grid-cols-5 gap-4 mb-8">
              <SupportServiceCard
                icon={<Truck size={24} />}
                label="Track Order"
              />

              <button
                onClick={() => setShowTicketModal(true)}
                className="flex flex-col items-center gap-3 group transition-all p-3 rounded-xl hover:bg-[var(--brand-wash)]"
              >
                <div className="w-14 h-14 bg-[var(--brand-wash)] rounded-2xl flex items-center justify-center border border-transparent group-hover:border-[var(--brand-primary)]/20 group-hover:bg-[var(--brand-primary)]/10 transition-colors">
                  <Ticket size={24} className="text-[var(--brand-primary)]" />
                </div>
                <span className="text-[11px] font-medium text-center text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]">
                  Submit Ticket
                </span>
              </button>

              <SupportServiceCard
                icon={<Clock size={24} />}
                label="My Tickets"
                onClick={() => navigate("/my-tickets")}
              />
              <SupportServiceCard
                icon={<Zap size={24} />}
                label="Urgent Delivery"
              />
              <SupportServiceCard
                icon={<RotateCcw size={24} />}
                label="Return & Refund"
              />
            </div>

            {/* Tabs & Questions */}
            <div className="mb-6">
              <div className="flex gap-6 border-b border-[var(--brand-wash-gold)]/20 mb-4 text-sm font-medium">
                <span className="text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] pb-2 cursor-pointer transition-colors">
                  Hot Questions
                </span>
                <span className="text-[var(--text-muted)] pb-2 cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                  Pre-sale
                </span>
                <span className="text-[var(--text-muted)] pb-2 cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                  Payment
                </span>
              </div>

              <div className="space-y-2">
                {[
                  "Can I cancel my order?",
                  "Can I receive my order before a certain time?",
                  "Why is my order delayed?",
                  "Why is my item missing?",
                ].map((q, idx) => (
                  <button
                    key={idx}
                    className="w-full flex items-center justify-between text-sm py-3 px-2 rounded-lg hover:bg-[var(--brand-wash)] group transition-colors text-left"
                  >
                    <p className="flex items-center gap-4">
                      <span className="italic font-bold text-[var(--brand-primary)] w-4 text-center">
                        {idx + 1}
                      </span>
                      <span className="text-[var(--text-muted)] group-hover:text-[var(--text-headline)] font-medium">
                        {q}
                      </span>
                    </p>
                    <ChevronRight
                      size={16}
                      className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]"
                    />
                  </button>
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                <button className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors">
                  <RefreshCw size={12} /> View More Topics
                </button>
              </div>
            </div>

            {/* AI Chat Interface */}
            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-4">
              {/* Suggestion Chips */}
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide no-scrollbar mask-linear-fade">
                <SupportChatChip
                  icon={<Package size={14} />}
                  label="Select Order"
                />
                <SupportChatChip
                  icon={<Truck size={14} />}
                  label="Track Order"
                />
                <SupportChatChip
                  icon={<Zap size={14} />}
                  label="Urgent Delivery"
                />
                <SupportChatChip
                  icon={<Upload size={14} />}
                  label="Expedite Shipment"
                />
                <SupportChatChip
                  icon={<Clock size={14} />}
                  label="Service Records"
                />
                <SupportChatChip
                  icon={<RotateCcw size={14} />}
                  label="Return & Refund Record"
                />
              </div>

              {/* Input Area */}
              <form
                onSubmit={handleChatSubmit}
                className="relative flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Type your message briefly here"
                    className="w-full pl-4 pr-12 py-3 bg-white border border-gray-200 rounded-xl text-sm text-[var(--text-headline)] placeholder-[var(--text-muted)] focus:bg-[var(--bg-secondary)] focus:border-[var(--brand-primary)] focus:ring-0 focus:ring-[var(--brand-primary)]/10 outline-none transition-all"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!chatMessage.trim()}
                  className="px-6 py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-accent)] disabled:opacity-50 disabled:bg-gray-400 disabled:hover:bg-gray-400 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  Enter
                </button>
              </form>
            </div>
          </div>
        </div>

        <BuyerTicketModal
          open={showTicketModal}
          isSubmitted={isSubmitted}
          ticket={ticket}
          generatedTicketId={generatedTicketId}
          buyerId={profile?.id || ''}
          onClose={handleCloseModal}
          onSubmit={handleSubmit}
          onFileUpload={handleFileUpload}
          onTicketChange={handleTicketChange}
          onNavigateMyTickets={() => navigate("/my-tickets")}
          onNavigateHelpCenter={handleCloseModal}
        />
      </div>
      <BazaarFooter />
    </div>
  );
}
