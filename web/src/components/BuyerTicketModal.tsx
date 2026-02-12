import React from "react";
import { CheckCircle, Upload, X } from "lucide-react";

export interface TicketData {
  subject: string;
  description: string;
  category: string;
  proof: File | null;
}

interface BuyerTicketModalProps {
  open: boolean;
  isSubmitted: boolean;
  ticket: TicketData;
  generatedTicketId: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onTicketChange: (next: Partial<TicketData>) => void;
  onNavigateMyTickets: () => void;
  onNavigateHome: () => void;
}

export function BuyerTicketModal({
  open,
  isSubmitted,
  ticket,
  generatedTicketId,
  onClose,
  onSubmit,
  onFileUpload,
  onTicketChange,
  onNavigateMyTickets,
  onNavigateHome,
}: BuyerTicketModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl h-auto rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col">
        {!isSubmitted ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-bold text-lg text-gray-900">
                BazaarX Support Ticket
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Damaged Item, Missing Refund"
                  className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] outline-none transition-all placeholder-gray-300"
                  value={ticket.subject}
                  onChange={(e) => onTicketChange({ subject: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Category
                </label>
                <select
                  required
                  className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] outline-none transition-all"
                  value={ticket.category}
                  onChange={(e) => onTicketChange({ category: e.target.value })}
                >
                  <option value="General">General</option>
                  <option value="Order Issue">Order Issue</option>
                  <option value="Payment">Payment</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Returns">Returns</option>
                  <option value="Product Quality">Product Quality</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Describe your issue
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide as much detail as possible..."
                  className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:border-[#FF4500] focus:ring-1 focus:ring-[#FF4500] outline-none transition-all resize-none placeholder-gray-300"
                  value={ticket.description}
                  onChange={(e) =>
                    onTicketChange({ description: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                  Attach Proof (Image/PDF)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 hover:border-[#FF4500]/50 transition-all group">
                  <div className="flex flex-col items-center justify-center pt-6 pb-6">
                    <Upload
                      size={20}
                      className="text-gray-400 mb-2 group-hover:text-[#FF4500] transition-colors"
                    />
                    <p className="text-xs text-gray-500 group-hover:text-gray-700">
                      {ticket.proof ? ticket.proof.name : "Click to upload"}
                    </p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    onChange={onFileUpload}
                  />
                </label>
              </div>

              <button
                type="submit"
                className="w-full bg-[var(--brand-primary)] text-white py-3.5 font-bold hover:bg-[var(--brand-primary-dark)] transition-colors rounded-xl shadow-lg shadow-orange-500/20 active:scale-[0.98]"
              >
                SUBMIT TICKET
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Your ticket has been submitted successfully.
            </h3>
            <div className="bg-gray-50 px-5 py-3 rounded-xl border border-gray-200 border-dashed mb-4">
              <p className="text-sm text-gray-600">
                Ticket ID:{" "}
                <span className="text-gray-900 font-black tracking-wide">
                  #{generatedTicketId}
                </span>
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
              Our support team will review your request within{" "}
              <span className="font-semibold text-gray-700">24–48 hours</span>.
            </p>

            <div className="flex flex-col gap-3 w-full max-w-sm">
              <button
                onClick={onNavigateMyTickets}
                className="w-full bg-[var(--brand-primary)] text-white py-3.5 font-bold rounded-xl hover:bg-[var(--brand-primary-dark)] transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
              >
                View My Tickets
              </button>
              <button
                onClick={onNavigateHome}
                className="w-full bg-white text-gray-600 border border-gray-200 py-3.5 font-bold rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
