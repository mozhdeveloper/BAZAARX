import {
    ChevronRight,
    RefreshCw,
    Truck,
    Ticket,
    Zap,
    RotateCcw,
    Clock,
    X,
    Upload
} from "lucide-react";
import React, { useState } from "react";

interface TicketData {
    subject: string;
    description: string;
    proof: File | null;
}

export function BuyerSupport() {
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [ticket, setTicket] = useState<TicketData>({
        subject: '',
        description: '',
        proof: null
    });

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setTicket({ ...ticket, proof: e.target.files[0] });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Submitting to BazaarX:', ticket);
        alert('Ticket Submitted Successfully!');
        setShowTicketModal(false);
    };

    return (
        <div className='min-h-screen bg-[var(--secondary)] p-4 md:p-10 font-[family-name:var(--font-sans)] text-[var(--text-primary)]'>
            <div className="max-w-4xl mx-auto bg-[var(--card)] rounded-[var(--radius-sm)] shadow-[var(--shadow-small)] border border-[var(--border)]"></div>
            {/* BazaarX Header */}
            <div className="p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--brand-primary)] text-white flex items-center justify-center font-bold text-xl rounded-[var(--radius-md)]">
                    BX
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)] font-[family-name:var(--font-heading)]">BazaarX</h1>
                    <p className="text-[var(--text-secondary)] text-xs">Customer Service</p>
                </div>
            </div>

            {/* Shipping Notice Bar */}
            <div className="bg-[var(--brand-primary)]/10 px-6 py-2 flex items-center gap-2 border-y border-[var(--brand-primary)]/20">
                <span className="text-[var(--brand-primary)] text-sm">📢</span>
                <p className="text-xs text-[var(--text-primary)]">Shipping Delay Notice: Peak season volumes may affect delivery times.</p>
            </div>

            <div className="p-6 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 border-b border-[var(--border)]">
                <ServiceCard icon={<Truck size={22} />} label="Track Order" />

                {/* New Ticket Card */}
                <button
                    onClick={() => setShowTicketModal(true)}
                    className="flex flex-col items-center gap-2 group transition-all"
                >
                    <div className="w-14 h-14 bg-[var(--brand-primary)]/10 rounded-[var(--radius-md)] flex items-center justify-center border border-transparent group-hover:border-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)]/20">
                        <Ticket size={22} className="text-[var(--brand-primary)] group-hover:text-[var(--brand-primary)]" />
                    </div>
                    <span className="text-[11px] text-center leading-tight text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]">Submit a Ticket</span>
                </button>

                <ServiceCard icon={<Zap size={22} />} label="Urgent Delivery" />
                <ServiceCard icon={<RotateCcw size={22} />} label="Return & Refund" />
                <ServiceCard icon={<Clock size={22} />} label="Service Records" />
            </div>

            <div className="p-6">
                <div className="flex gap-6 border-b border-[var(--border)] mb-4 text-sm font-medium">
                    <span className="text-[var(--brand-primary)] border-b-2 border-[var(--brand-primary)] pb-2 cursor-pointer">Hot Questions</span>
                    <span className="text-[var(--text-secondary)] pb-2 cursor-pointer hover:text-[var(--text-primary)]">Pre-sale</span>
                    <span className="text-[var(--text-secondary)] pb-2 cursor-pointer hover:text-[var(--text-primary)]">Payment & Account</span>
                </div>

                <div className="space-y-4">
                    {[
                        "Can I cancel my order?",
                        "Can I receive my order before a certain time?",
                        "Why is my order delayed?",
                        "Why is my item missing?"
                    ].map((q, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm py-2 group cursor-pointer border-b border-transparent hover:border-[var(--border)]">
                            <p className="flex items-center gap-3">
                                <span className="italic font-bold text-[var(--brand-primary)]">{idx + 1}</span>
                                <span className="text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">{q}</span>
                            </p>
                            <ChevronRight size={16} className="text-[var(--text-muted)]" />
                        </div>
                    ))}
                </div>

                <button className="mt-6 flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--brand-primary)] mx-auto transition-colors">
                    <RefreshCw size={12} /> Switch
                </button>
            </div>
            {showTicketModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-[var(--card)] w-full max-w-md rounded-[var(--radius-lg)] shadow-[var(--shadow-large)] animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                            <h2 className="font-bold text-lg text-[var(--text-primary)] font-[family-name:var(--font-heading)]">BazaarX Support Ticket</h2>
                            <button onClick={() => setShowTicketModal(false)} className="p-1 hover:bg-[var(--secondary)] rounded-full text-[var(--text-secondary)]"><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Subject</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g., Damaged Item, Missing Refund"
                                    className="w-full mt-1 border border-[var(--border)] p-2.5 rounded-[var(--radius-sm)] text-sm focus:ring-1 focus:ring-[var(--brand-primary)] outline-none transition-all placeholder-[var(--text-muted)]"
                                    onChange={(e) => setTicket({ ...ticket, subject: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Describe your issue</label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="Provide as much detail as possible..."
                                    className="w-full mt-1 border border-[var(--border)] p-2.5 rounded-[var(--radius-sm)] text-sm focus:ring-1 focus:ring-[var(--brand-primary)] outline-none transition-all resize-none placeholder-[var(--text-muted)]"
                                    onChange={(e) => setTicket({ ...ticket, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Attach Proof (Image/PDF)</label>
                                <label className="mt-1 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)] cursor-pointer hover:bg-[var(--secondary)] transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload size={20} className="text-[var(--text-muted)] mb-2" />
                                        <p className="text-xs text-[var(--text-secondary)]">{ticket.proof ? ticket.proof.name : 'Click to upload'}</p>
                                    </div>
                                    <input type="file" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-[var(--brand-primary)] text-white py-3 font-bold hover:bg-[var(--brand-primary-dark)] transition-colors rounded-[var(--radius-sm)] shadow-[var(--shadow-medium)] active:scale-[0.98]"
                            >
                                SUBMIT TICKET
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

const ServiceCard = ({ icon, label }: { icon: React.ReactNode, label: string }) => (
    <button className="flex flex-col items-center gap-2 group transition-all">
        <div className="w-14 h-14 bg-[var(--brand-primary)]/10 rounded-[var(--radius-md)] flex items-center justify-center border border-transparent group-hover:border-[var(--brand-primary)] group-hover:bg-[var(--brand-primary)]/20">
            <div className="text-[var(--brand-primary)] group-hover:text-[var(--brand-primary)]">{icon}</div>
        </div>
        <span className="text-[11px] text-center leading-tight text-[var(--text-secondary)] group-hover:text-[var(--brand-primary)]">{label}</span>
    </button>
);