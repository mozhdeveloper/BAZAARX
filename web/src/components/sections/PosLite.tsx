import { motion } from 'framer-motion';

export const POSLiteFeature = () => {
  return (
    <section className="h-auto w-full flex items-center justify-center bg-[#FFF5F2]/80 py-24 relative overflow-hidden border-y border-[#FF5722]/10">

      <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#FF5722]/10 rounded-full blur-3xl opacity-50" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#FF5722]/10 rounded-full blur-3xl opacity-50" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">

          {/* LEFT SIDE: Heading and Description */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="inline-block border border-[#FF5722]/20 bg-white text-[#FF5722] py-1.5 px-5 rounded-full text-sm font-bold tracking-widest uppercase">
              Inventory Sync
            </div>

            <h2 className="text-2xl lg:text-5xl font-black text-[#1a2b3b] leading-[1.1]">
              Your Store, <br />
              <span className="text-[#FF6A00]">Synchronized.</span>
            </h2>

            <p className="text-gray-600 text-lg leading-relaxed max-w-lg">
              Selling at a weekend bazaar or through FB Messenger? Use <strong>POS-Lite</strong> to
              deduct stock manually and keep your online inventory 100% accurate.
            </p>
          </motion.div>

          {/* RIGHT SIDE: Feature Bullets */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="flex flex-col gap-4"
          >
            {[
              { title: 'Real-time Stock Validation', desc: 'Instantly check availability before you sell.' },
              { title: 'Unified Order Management (online + offline)', desc: 'All your sales channels in one single dashboard.' },
              { title: 'Automatic Inventory Deduction', desc: 'Sync your inventory in two taps from your phone.' }
            ].map((item, index) => (
              <motion.div
                key={index}
                whileHover={{ x: 10 }}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4 group transition-all hover:shadow-md"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF5722] flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-100">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-md font-bold text-[#1a2b3b]">{item.title}</h4>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default POSLiteFeature;