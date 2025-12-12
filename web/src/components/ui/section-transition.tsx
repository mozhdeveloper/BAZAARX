'use client';

import { motion } from 'framer-motion';

export function SectionTransition() {
	return (
		<motion.section 
			className="h-[60vh] bg-gradient-to-b from-white via-gray-50 to-white flex items-center justify-center relative overflow-hidden"
			initial={{ opacity: 0 }}
			whileInView={{ opacity: 1 }}
			transition={{ duration: 1.2 }}
		>
			{/* Background decoration */}
			<div className="absolute inset-0">
				<div className="absolute top-1/4 left-1/4 w-32 h-32 bg-[#FF6A00]/10 rounded-full blur-3xl" />
				<div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
				<div className="absolute top-1/2 right-1/3 w-24 h-24 bg-green-500/10 rounded-full blur-3xl" />
			</div>

			<div className="text-center z-10 max-w-4xl mx-auto px-6">
				<motion.h2 
					className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.2 }}
				>
					Get ready for an immersive experience
				</motion.h2>
				
				<motion.p 
					className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed"
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, delay: 0.4 }}
				>
					Scroll through our visual catalog where every movement reveals 
					<span className="text-[#FF6A00] font-semibold"> stunning category collections</span>
				</motion.p>

				<motion.div 
					className="flex items-center justify-center gap-3 text-sm text-gray-500"
					initial={{ opacity: 0 }}
					whileInView={{ opacity: 1 }}
					transition={{ duration: 0.8, delay: 0.6 }}
				>
					<div className="flex gap-2">
						<div className="w-2 h-2 bg-[#FF6A00] rounded-full animate-pulse" />
						<div className="w-2 h-2 bg-[#FF6A00] rounded-full animate-pulse delay-100" />
						<div className="w-2 h-2 bg-[#FF6A00] rounded-full animate-pulse delay-200" />
					</div>
					<span>Scroll to explore categories</span>
				</motion.div>
			</div>
		</motion.section>
	);
}