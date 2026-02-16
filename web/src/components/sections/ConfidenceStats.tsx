import React from 'react';
import { motion } from 'framer-motion';

const ConfidenceStats: React.FC = () => {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 lg:pb-24">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                viewport={{ once: true }}
                className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-12 border-t border-[var(--brand-primary)]/10 pt-16"
            >
                {[
                    { label: "24/7", sub: "Customer Support" },
                    { label: "Fast", sub: "Nationwide Delivery" },
                    { label: "100%", sub: "Secure Payments" },
                    { label: "Free", sub: "Returns & Exchange" }
                ].map((stat, i) => (
                    <div key={i} className="text-center">
                        <div className="text-4xl font-black text-[var(--brand-primary)] mb-1">{stat.label}</div>
                        <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.2em]">{stat.sub}</div>
                    </div>
                ))}
            </motion.div>
        </div>
    );
};

export default ConfidenceStats;
