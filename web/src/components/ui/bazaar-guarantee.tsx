import React from "react";
import { motion } from "framer-motion";
import { Package, Search, CheckCircle2, Shield, ArrowUpRight } from "lucide-react";

const steps = [
    {
        icon: <Package className="w-6 h-6 text-orange-400" />,
        number: "1.",
        title: "Submit",
        description: "Sellers submit products with documentation for review",
    },
    {
        icon: <Search className="w-6 h-6 text-orange-400" />,
        number: "2.",
        title: "Inspect",
        description: "QA team checks authenticity, durability & specs",
    },
    {
        icon: <CheckCircle2 className="w-6 h-6 text-green-400" />,
        number: "3.",
        title: "Certify",
        description: "Approved listings go live with trust artifacts visible",
    },
    {
        icon: <Shield className="w-6 h-6 text-blue-400" />,
        number: "4.",
        title: "Protect",
        description: "Ongoing monitoring, spot checks & dispute resolution",
    },
];

export function BazaarGuarantee() {
    return (
        <div className="w-full py-8 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-7xl mx-auto bg-[#2c2320] rounded-[2.5rem] overflow-hidden shadow-2xl border-0 relative"
            >
                {/* Dynamic Lighting Effects */}
                <div className="absolute top-0 right-0 w-[60%] h-[100%] bg-gradient-to-bl from-[var(--brand-primary)]/20 via-transparent to-transparent pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[var(--brand-primary)]/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="flex flex-col lg:flex-row items-stretch min-h-[320px] relative z-10">
                    {/* Left Content */}
                    <div className="lg:flex-[1.6] p-8 lg:p-12 flex flex-col justify-center gap-6">
                        <div className="space-y-2">
                            <span className="text-[var(--brand-primary)] font-bold text-xs uppercase tracking-[0.2em]">
                                The BazaarX Guarantee
                            </span>
                            <h2 className="text-4xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                                Quality isn't a promise. It's a <span className="text-[var(--brand-primary)] italic font-fondamento">process.</span>
                            </h2>
                            <p className="text-[var(--text-muted)] text-medium max-w-2xl leading-relaxed">
                                Every product on BazaarX goes through our 4-step verification loop before it ever reaches a buyer. We certify so you can shop with confidence.
                            </p>
                        </div>

                        <motion.button
                            className="group flex items-center justify-center gap-2 bg-[#2d4ba3] hover:bg-[#3659c0] text-white px-8 py-4 rounded-xl font-bold transition-all w-fit shadow-lg shadow-blue-900/20"
                        >
                            <span>See how it works</span>
                            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform opacity-50" />
                        </motion.button>
                    </div>

                    {/* Right Grid */}
                    <div className="flex-1 p-6 lg:p-10 relative">
                        {/* Subtle background glow */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--brand-primary)] opacity-15 blur-[120px] pointer-events-none" />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-full">
                            {steps.map((step, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                                    className="bg-white/5 border border-white/10 py-5 px-6 rounded-3xl flex flex-col gap-3"
                                >
                                    <div className="w-fit">
                                        {step.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold text-[14px]">
                                                {step.number}
                                            </span>
                                            <h3 className="text-white font-bold text-xl">{step.title}</h3>
                                        </div>
                                        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                                            {step.description}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            </motion.div >
        </div >
    );
}
