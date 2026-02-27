import React from "react";
import { CheckCircle, Upload, X, Ticket as TicketIcon } from "lucide-react";
import { StoreSelector } from "./StoreSelector";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export interface TicketData {
  subject: string;
  description: string;
  category: string;
  proof: File | null;
  sellerId: string | null;
  sellerStoreName: string;
}

interface BuyerTicketModalProps {
  open: boolean;
  isSubmitted: boolean;
  ticket: TicketData;
  generatedTicketId: string;
  buyerId: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTicketChange: (next: Partial<TicketData>) => void;
  onNavigateMyTickets: () => void;
  onNavigateHelpCenter: () => void;
}

export function BuyerTicketModal({
  open,
  isSubmitted,
  ticket,
  generatedTicketId,
  buyerId,
  onClose,
  onSubmit,
  onFileUpload,
  onTicketChange,
  onNavigateMyTickets,
  onNavigateHelpCenter,
}: BuyerTicketModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    onSubmit(e);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10"
          >
            {!isSubmitted ? (
              <>
                <div className="flex items-center justify-between p-6 border-b border-gray-50 bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--brand-primary)]/10 rounded-xl flex items-center justify-center text-[var(--brand-primary)]">
                      <TicketIcon size={20} />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-gray-900 leading-tight">
                        Support Ticket
                      </h2>
                      <p className="text-xs text-[var(--text-muted)]">Submit a new request</p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="-mt-4 text-gray-400 hover:text-gray-600 transition-all active:scale-95"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Damaged Item, Missing Refund"
                      className="w-full border border-gray-200 bg-gray-50/30 p-2 rounded-xl text-sm focus:bg-white focus:border-[var(--brand-primary)] focus:ring-0 focus:ring-[var(--brand-primary)]/5 outline-none transition-all placeholder-gray-400"
                      value={ticket.subject}
                      onChange={(e) => onTicketChange({ subject: e.target.value })}
                    />
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-1.5 font-[family-name:var(--font-sans)]">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                        Category
                      </label>
                      <Select
                        value={ticket.category}
                        onValueChange={(value) => onTicketChange({ category: value })}
                      >
                        <SelectTrigger className="w-full border border-gray-200 bg-gray-50/30 p-2 h-10 rounded-xl text-sm focus:bg-white focus:border-[var(--brand-primary)] focus:ring-0 outline-none transition-all cursor-pointer">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-[var(--brand-primary)]/10 shadow-xl bg-white z-[10000]">
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="Order Issue">Order Issue</SelectItem>
                          <SelectItem value="Payment">Payment</SelectItem>
                          <SelectItem value="Shipping">Shipping</SelectItem>
                          <SelectItem value="Returns">Returns</SelectItem>
                          <SelectItem value="Product Quality">Product Quality</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <StoreSelector
                        buyerId={buyerId}
                        selectedSellerId={ticket.sellerId || undefined}
                        onSelectStore={(sellerId, storeName) =>
                          onTicketChange({ sellerId, sellerStoreName: storeName })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                      Message
                    </label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Provide as much detail as possible..."
                      className="w-full border border-gray-200 bg-gray-50/30 p-3.5 rounded-xl text-sm focus:bg-white focus:border-[var(--brand-primary)] focus:ring-0 outline-none transition-all resize-none placeholder-gray-300"
                      value={ticket.description}
                      onChange={(e) =>
                        onTicketChange({ description: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                      Proof (Attachment)
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--brand-primary)]/30 bg-gray-50/20 rounded-2xl cursor-pointer hover:border-[var(--brand-primary)] hover:bg-gray-50 hover:border-[var(--brand-primary)]/30 transition-all group overflow-hidden">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4">
                        <div className="flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform text-gray-400 group-hover:text-[var(--brand-primary)]">
                          <Upload size={18} />
                        </div>
                        <p className="text-xs text-gray-500 font-medium text-center truncate w-full">
                          {ticket.proof ? (
                            <span className="text-[var(--brand-primary)]">{ticket.proof.name}</span>
                          ) : (
                            "Click to upload image/PDF"
                          )}
                        </p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={onFileUpload}
                      />
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      className="w-full bg-[var(--brand-primary)] text-white py-4 font-bold hover:bg-[var(--brand-primary-dark)] transition-all rounded-2xl shadow-lg shadow-orange-500/10 active:scale-[0.98]"
                    >
                      Submit Ticket
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-10 text-center">
                <h3 className="text-2xl font-black text-[var(--text-headline)] mb-2 tracking-tight">
                  Ticket Submitted!
                </h3>

                <div className="px-6 py-4 my-6">
                  <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest mb-1">
                    Reference Number
                  </p>
                  <p className="text-xl text-[var(--brand-primary)] font-black tracking-widest">
                    #{generatedTicketId}
                  </p>
                </div>

                <p className="text-sm text-[var(--text-muted)] mb-8 max-w-xs leading-relaxed font-medium">
                  Your request has been queued. Our team will review it within{" "}
                  <span className="text-gray-900 font-bold">24–48 hours</span>.
                </p>

                <div className="flex flex-col gap-3 w-full">
                  <button
                    onClick={onNavigateMyTickets}
                    className="w-full bg-[var(--brand-primary)] text-white py-4 font-bold rounded-2xl hover:bg-[var(--brand-accent)] transition-all shadow-lg shadow-orange-500/10 active:scale-[0.98]"
                  >
                    View My Tickets
                  </button>
                  <button
                    onClick={onNavigateHelpCenter}
                    className="w-full bg-white text-gray-500 py-3.5 font-bold rounded-2xl hover:bg-gray-100 transition-all text-sm"
                  >
                    Back to Help Center
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
