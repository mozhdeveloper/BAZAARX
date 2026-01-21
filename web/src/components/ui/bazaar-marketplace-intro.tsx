
'use client';

import { motion } from 'framer-motion';

export default function BazaarMarketplaceIntro() {
    return (
        <section className="bg-white py-24 px-4 overflow-hidden">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                viewport={{ once: true, margin: "-100px" }}
                className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto"
            >
                <motion.span
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="text-xs md:text-sm text-gray-400 uppercase tracking-[0.3em] mb-6 font-medium"
                >
                    your next marketplace awaits
                </motion.span>

                {/* Vertical Line - Shorter & Animated */}
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    whileInView={{ height: "20rem", opacity: 1 }} // 32 * 0.25rem = 8rem = 128px vs 96 * 0.25 = 384px
                    transition={{ duration: 1, delay: 0.4, ease: "easeInOut" }}
                    className="w-px bg-gradient-to-b from-transparent via-[#FF6A00] to-transparent mb-8"
                />

                <h2 className="font-fondamento text-7xl md:text-9xl font-extrabold text-[#FF6A00] tracking-tighter mb-8 drop-shadow-sm select-none">
                    BazaarX
                </h2>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="text-lg md:text-xl text-gray-500 max-w-2xl leading-relaxed px-4 mx-auto"
                >
                    Bringing you closer to the source than ever before. See how we’ve built a smarter way to shop.
                </motion.p>
            </motion.div>
        </section>
    );
}
