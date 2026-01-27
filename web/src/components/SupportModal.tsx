import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Truck,
    Ticket,
    Zap,
    RotateCcw,
    Clock,
    ChevronRight,
    RefreshCw,
    Upload,
    Headset,
} from "lucide-react";

interface SupportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface TicketData {
    subject: string;
    description: string;
    proof: File | null;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
    const [view, setView] = useState<"main" | "ticket">("main");
    const [ticket, setTicket] = useState<TicketData>({
        subject: "",
        description: "",
        proof: null,
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setTicket({ ...ticket, proof: e.target.files[0] });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log("Submitting to BazaarX:", ticket);
        alert("Ticket Submitted Successfully!");
        setView("main");
        setTicket({ subject: "", description: "", proof: null });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[var(--card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-large)] w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col font-[family-name:var(--font-sans)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--card)]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-lg rounded-[var(--radius-md)]">
                                BX
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-[family-name:var(--font-heading)]">
                                    BazaarX Support
                                </h2>
                                <p className="text-[var(--text-secondary)] text-xs font-medium">
                                    We're here to help
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-[var(--secondary)] rounded-full transition-colors text-[var(--text-secondary)]"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="overflow-y-auto p-6 bg-[var(--secondary)]">
                        {view === "main" ? (
                            <div className="space-y-6">
                                {/* Shipping Notice Bar */}
                                <div className="bg-[var(--brand-primary)]/10 px-4 py-3 flex items-start gap-3 border border-[var(--brand-primary)]/20 rounded-[var(--radius-md)]">
                                    <span className="text-[var(--brand-primary)] text-sm mt-0.5">📢</span>
                                    <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                                        <span className="font-bold">Shipping Delay Notice:</span> Peak
                                        season volumes may affect delivery times by 1-2 days. Thank
                                        you for your patience.
                                    </p>
                                </div>

                                {/* Services Grid */}
                                <div className="grid grid-cols-4 gap-4">
                                    <ServiceCard icon={<Truck size={22} />} label="Track Order" />
                                    <button
                                        onClick={() => setView("ticket")}
                                        className="flex flex-col items-center gap-2 group transition-all bg-[var(--card)] p-4 rounded-[var(--radius-xl)] shadow-[var(--shadow-small)] border border-transparent hover:border-[var(--brand-primary)] hover:shadow-[var(--shadow-medium)]"
                                    >
                                        <div className="w-12 h-12 bg-[var(--brand-primary)]/10 rounded-full flex items-center justify-center text-[var(--brand-primary)] group-hover:scale-110 transition-transform">
                                            <Ticket size={24} />
                                        </div>
                                        <span className="text-[11px] font-medium text-center leading-tight text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]">
                                            Submit Ticket
                                        </span>
                                    </button>
                                    <ServiceCard
                                        icon={<Zap size={22} />}
                                        label="Urgent Delivery"
                                    />
                                    <ServiceCard
                                        icon={<RotateCcw size={22} />}
                                        label="Return & Refund"
                                    />
                                </div>

                                <div className="bg-[var(--card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-small)] border border-[var(--border)] overflow-hidden">
                                    <div className="flex gap-6 border-b border-[var(--border)] px-6 py-4 text-sm font-medium">
                                        <span className="text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] pb-1 cursor-pointer">
                                            Hot Questions
                                        </span>
                                        <span className="text-[var(--text-secondary)] pb-1 cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                                            Pre-sale
                                        </span>
                                        <span className="text-[var(--text-secondary)] pb-1 cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                                            Payment
                                        </span>
                                    </div>

                                    <div className="p-2">
                                        {[
                                            "Can I cancel my order?",
                                            "Can I receive my order before a certain time?",
                                            "Why is my order delayed?",
                                            "Why is my item missing?",
                                        ].map((q, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between text-sm p-4 group cursor-pointer hover:bg-[var(--secondary)] rounded-[var(--radius-md)] transition-colors"
                                            >
                                                <p className="flex items-center gap-3">
                                                    <span className="flex items-center justify-center w-5 h-5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-full text-xs font-bold">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] font-medium">
                                                        {q}
                                                    </span>
                                                </p>
                                                <ChevronRight
                                                    size={16}
                                                    className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-4 border-t border-[var(--border)] bg-[var(--secondary)]/50 flex justify-center">
                                        <button className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand-primary)] transition-colors">
                                            <RefreshCw size={12} /> View More Topics
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-[var(--card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-small)] border border-[var(--border)] overflow-hidden"
                            >
                                <div className="flex items-center gap-3 p-4 border-b border-[var(--border)]">
                                    <button
                                        onClick={() => setView("main")}
                                        className="p-1 hover:bg-[var(--secondary)] rounded-full"
                                    >
                                        <ChevronRight className="rotate-180 w-5 h-5" />
                                    </button>
                                    <h3 className="font-bold text-[var(--text-primary)]">New Support Ticket</h3>
                                </div>

                                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                            Subject
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g., Damaged Item, Missing Refund"
                                            className="w-full border border-[var(--border)] bg-[var(--secondary)]/30 p-3 rounded-[var(--radius-md)] text-sm focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] outline-none transition-all placeholder-[var(--text-muted)]"
                                            onChange={(e) =>
                                                setTicket({ ...ticket, subject: e.target.value })
                                            }
                                            value={ticket.subject}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                            Describe your issue
                                        </label>
                                        <textarea
                                            required
                                            rows={5}
                                            placeholder="Provide as much detail as possible so we can help you faster..."
                                            className="w-full border border-[var(--border)] bg-[var(--secondary)]/30 p-3 rounded-[var(--radius-md)] text-sm focus:ring-2 focus:ring-[var(--brand-primary)]/20 focus:border-[var(--brand-primary)] outline-none transition-all resize-none placeholder-[var(--text-muted)]"
                                            onChange={(e) =>
                                                setTicket({ ...ticket, description: e.target.value })
                                            }
                                            value={ticket.description}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                            Attach Proof (Optional)
                                        </label>
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)] cursor-pointer hover:bg-[var(--secondary)] hover:border-[var(--brand-primary)] transition-all group">
                                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                <div className="w-10 h-10 bg-[var(--secondary)] rounded-full flex items-center justify-center mb-3 group-hover:bg-[var(--card)] group-hover:shadow-sm transition-all">
                                                    <Upload
                                                        size={20}
                                                        className="text-[var(--text-muted)] group-hover:text-[var(--brand-primary)]"
                                                    />
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] font-medium">
                                                    {ticket.proof ? (
                                                        <span className="text-[var(--color-success)] font-bold">
                                                            {ticket.proof.name}
                                                        </span>
                                                    ) : (
                                                        "Click to upload image or PDF"
                                                    )}
                                                </p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                onChange={handleFileUpload}
                                            />
                                        </label>
                                    </div>

                                    <div className="pt-2">
                                        <button
                                            type="submit"
                                            className="w-full bg-[var(--brand-primary)] text-white py-4 font-bold rounded-[var(--radius-lg)] shadow-[var(--shadow-medium)] hover:bg-[var(--brand-primary-dark)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                        >
                                            SUBMIT TICKET
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setView("main")}
                                            className="w-full text-center text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] mt-4 font-medium"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

const ServiceCard = ({
    icon,
    label,
}: {
    icon: React.ReactNode;
    label: string;
}) => (
    <button className="flex flex-col items-center gap-2 group transition-all bg-[var(--card)] p-4 rounded-[var(--radius-xl)] shadow-[var(--shadow-small)] border border-transparent hover:border-[var(--brand-primary)] hover:shadow-[var(--shadow-medium)]">
        <div className="w-12 h-12 bg-[var(--brand-primary)]/10 rounded-full flex items-center justify-center text-[var(--brand-primary)] group-hover:scale-110 transition-transform group-hover:bg-[var(--brand-primary)]/20">
            {icon}
        </div>
        <span className="text-[11px] font-medium text-center leading-tight text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]">
            {label}
        </span>
    </button>
);
