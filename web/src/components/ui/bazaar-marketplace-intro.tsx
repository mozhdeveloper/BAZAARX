
import { motion } from 'framer-motion';

export default function BazaarMarketplaceIntro() {
    return (
        <div className="h-[200vh] relative">
            <section className="h-screen sticky top-0 flex items-center justify-center py-24 px-4 overflow-hidden">
                <div className="flex flex-col items-center justify-center text-center max-w-4xl mx-auto">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.8 }}
                        className="text-xs md:text-sm text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6 font-medium"
                    >
                        your next marketplace awaits
                    </motion.span>

                    {/* Vertical Line - Shorter & Animated */}
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        whileInView={{ height: "15rem", opacity: 1 }}
                        transition={{ duration: 1, delay: 0.4, ease: "easeInOut" }}
                        className="w-px bg-gradient-to-b from-transparent via-[var(--brand-primary)] to-transparent mb-8"
                    />

                    <h2 className="font-fondamento text-7xl md:text-9xl font-extrabold text-[var(--brand-primary)] tracking-tighter drop-shadow-sm select-none">
                        BazaarX
                    </h2>

                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, duration: 0.8 }}
                        className="text-lg md:text-lg text-[var(--text-primary)] max-w-2xl px-4 mx-auto"
                    >
                        Bringing you closer to the source than ever before. See how we’ve built a smarter way to shop.
                    </motion.p>
                </div>
            </section>
        </div>
    );
}
