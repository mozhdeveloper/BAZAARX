'use client';

import { useScroll, useTransform, motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

interface Image {
	src: string;
	alt?: string;
	category?: string;
}

interface ZoomParallaxProps {
	/** Array of images to be displayed in the parallax effect max 7 images */
	images: Image[];
}

export function ZoomParallax({ images }: ZoomParallaxProps) {
	const container = useRef(null);
	const { scrollYProgress } = useScroll({
		target: container,
		offset: ['start start', 'end end'],
	});

	// Enhanced scale transforms with smoother curves and better visibility
	const scale1 = useTransform(scrollYProgress, [0, 0.3, 1], [1, 1.8, 4]);
	const scale2 = useTransform(scrollYProgress, [0, 0.4, 1], [1, 2.2, 5]);
	const scale3 = useTransform(scrollYProgress, [0, 0.5, 1], [1, 2.8, 6]);
	const scale4 = useTransform(scrollYProgress, [0, 0.6, 1], [1, 3.2, 7]);
	const scale5 = useTransform(scrollYProgress, [0, 0.7, 1], [1, 3.8, 8]);
	const scale6 = useTransform(scrollYProgress, [0, 0.8, 1], [1, 4.5, 9]);
	const scale7 = useTransform(scrollYProgress, [0, 0.9, 1], [1, 5.5, 12]);

	const scales = [scale1, scale2, scale3, scale4, scale5, scale6, scale7];

	// Enhanced opacity and position transforms for better visibility
	const imageOpacity = useTransform(scrollYProgress, [0, 0.05, 0.85, 1], [0.9, 1, 1, 0.2]);
	const textOpacity = useTransform(scrollYProgress, [0, 0.1, 0.6, 0.8], [1, 1, 0.3, 0]);
	const textScale = useTransform(scrollYProgress, [0, 0.3, 0.7], [1, 1.02, 0.98]);
	const textY = useTransform(scrollYProgress, [0, 0.4, 1], [0, -10, -30]);

	// Dynamic text content based on scroll progress
	const getTextContent = (progress: number) => {
		if (progress < 0.15) return { title: "Explore Categories", subtitle: "Discover thousands of products across all your favorite categories" };
		if (progress < 0.35) return { title: "Fashion & Style", subtitle: "Trendy clothing, accessories, and lifestyle products" };
		if (progress < 0.55) return { title: "Electronics & Tech", subtitle: "Latest gadgets, smartphones, and digital devices" };
		if (progress < 0.75) return { title: "Home & Living", subtitle: "Furniture, decor, and everything for your home" };
		if (progress < 0.9) return { title: "Find Your Style", subtitle: "Browse through amazing categories and collections" };
		return { title: "Scroll for More", subtitle: "Continue exploring our amazing marketplace" };
	};

	// Track current scroll progress for text updates
	const [currentText, setCurrentText] = useState(getTextContent(0));

	useEffect(() => {
		const unsubscribe = scrollYProgress.onChange((latest) => {
			setCurrentText(getTextContent(latest));
		});
		return unsubscribe;
	}, [scrollYProgress]);

	// Helper function for optimized image positioning - circular arrangement around text
	const getImageStyles = (index: number) => {
		const positions = [
			// Image 0 - Top left
			'md:[&>div]:!top-[5vh] md:[&>div]:!left-[5vw] md:[&>div]:!h-[18vh] md:[&>div]:!w-[18vw] [&>div]:!top-[8vh] [&>div]:!left-[8vw] [&>div]:!h-[15vh] [&>div]:!w-[25vw]',
			// Image 1 - Top right
			'md:[&>div]:!top-[8vh] md:[&>div]:!left-[77vw] md:[&>div]:!h-[17vh] md:[&>div]:!w-[17vw] [&>div]:!top-[12vh] [&>div]:!left-[72vw] [&>div]:!h-[14vh] [&>div]:!w-[20vw]',
			// Image 2 - Top center
			'md:[&>div]:!top-[2vh] md:[&>div]:!left-[42vw] md:[&>div]:!h-[16vh] md:[&>div]:!w-[16vw] [&>div]:!top-[3vh] [&>div]:!left-[42vw] [&>div]:!h-[13vh] [&>div]:!w-[16vw]',
			// Image 3 - Bottom right
			'md:[&>div]:!top-[75vh] md:[&>div]:!left-[75vw] md:[&>div]:!h-[18vh] md:[&>div]:!w-[18vw] [&>div]:!top-[78vh] [&>div]:!left-[70vw] [&>div]:!h-[15vh] [&>div]:!w-[22vw]',
			// Image 4 - Bottom left
			'md:[&>div]:!top-[78vh] md:[&>div]:!left-[7vw] md:[&>div]:!h-[17vh] md:[&>div]:!w-[17vw] [&>div]:!top-[80vh] [&>div]:!left-[8vw] [&>div]:!h-[14vh] [&>div]:!w-[20vw]',
			// Image 5 - Right center
			'md:[&>div]:!top-[35vh] md:[&>div]:!left-[82vw] md:[&>div]:!h-[15vh] md:[&>div]:!w-[15vw] [&>div]:!top-[38vh] [&>div]:!left-[78vw] [&>div]:!h-[12vh] [&>div]:!w-[18vw]',
			// Image 6 - Left center (this will be our "Scroll Me" zoom image)
			'md:[&>div]:!top-[40vh] md:[&>div]:!left-[3vw] md:[&>div]:!h-[20vh] md:[&>div]:!w-[20vw] [&>div]:!top-[42vh] [&>div]:!left-[5vw] [&>div]:!h-[16vh] [&>div]:!w-[22vw]'
		];
		return positions[index] || positions[0];
	};

	return (
		<div ref={container} className="relative h-[350vh]">
			<div className="sticky top-0 h-screen overflow-hidden bg-white">
				{images.map(({ src, alt, category }, index) => {
					const scale = scales[index % scales.length];
					const isScrollMeImage = index === 6; // Last image will be "Scroll Me"
					const specialScale = isScrollMeImage ? useTransform(scrollYProgress, [0.7, 1], [1, 15]) : scale;

					return (
						<motion.div
							key={index}
							style={{ 
								scale: specialScale,
								opacity: imageOpacity,
								rotate: `${index * 2}deg`
							}}
							className={`absolute top-0 flex h-full w-full items-center justify-center ${getImageStyles(index)}`}
						>
							<motion.div 
								className={`relative h-[25vh] w-[25vw] rounded-2xl overflow-hidden group shadow-2xl ${isScrollMeImage ? 'ring-4 ring-orange-400 ring-opacity-70' : ''}`}
								whileHover={{ 
									scale: isScrollMeImage ? 1.15 : 1.08,
									rotateY: 8,
									rotateX: 3,
									boxShadow: isScrollMeImage ? "0 40px 80px -12px rgba(255, 106, 0, 0.4)" : "0 30px 60px -12px rgba(0, 0, 0, 0.3)"
								}}
								transition={{ type: "spring", stiffness: 400, damping: 25 }}
							>
								<img
									src={src || '/placeholder.svg'}
									alt={alt || `${category} category`}
									className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110 group-hover:saturate-125"
								/>
								{(category || isScrollMeImage) && (
									<div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent flex items-end p-3">
										<span className={`text-white font-bold text-sm md:text-base lg:text-lg tracking-wide drop-shadow-xl ${isScrollMeImage ? 'text-orange-300' : ''}`}>
											{isScrollMeImage ? 'Scroll Me' : category}
										</span>
									</div>
								)}
								{/* Enhanced glow and depth effects */}
								<div className={`absolute inset-0 bg-gradient-to-br ${isScrollMeImage ? 'from-orange-400/25 via-transparent to-orange-600/15' : 'from-orange-400/15 via-transparent to-purple-400/10'} opacity-0 group-hover:opacity-100 transition-all duration-400 rounded-2xl`} />
								<div className={`absolute inset-0 border ${isScrollMeImage ? 'border-orange-300/40 group-hover:border-orange-300/70' : 'border-white/20 group-hover:border-white/40'} rounded-2xl transition-colors duration-300`} />
								{/* Special pulsing effect for "Scroll Me" image */}
								{isScrollMeImage && (
									<motion.div
										className="absolute inset-0 border-2 border-orange-400 rounded-2xl"
										animate={{
											opacity: [0.3, 0.8, 0.3],
											scale: [0.95, 1.05, 0.95]
										}}
										transition={{
											duration: 2,
											repeat: Infinity,
											ease: "easeInOut"
										}}
									/>
								)}
							</motion.div>
						</motion.div>
					);
				})}
				
				{/* Seamless center text without box */}
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
					<motion.div 
						className="text-center"
						style={{
							opacity: textOpacity,
							scale: textScale,
							y: textY
						}}
					>
						<motion.h2 
							key={currentText.title}
							className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight"
							style={{
								background: 'linear-gradient(135deg, #1f2937 0%, #374151 30%, #FF6A00 70%, #f97316 100%)',
								backgroundClip: 'text',
								WebkitBackgroundClip: 'text',
								WebkitTextFillColor: 'transparent',
								filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
							}}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.5, ease: "easeOut" }}
						>
							{currentText.title}
						</motion.h2>
						<motion.p 
							key={currentText.subtitle}
							className="text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto leading-relaxed font-medium"
							style={{
								filter: 'drop-shadow(1px 1px 2px rgba(0,0,0,0.2))'
							}}
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -15 }}
							transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
						>
							{currentText.subtitle}
						</motion.p>
						{currentText.title === "Scroll for More" && (
							<motion.div 
								className="mt-6 flex justify-center"
								initial={{ opacity: 0, scale: 0.8 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5, delay: 0.3 }}
							>
								<motion.div
									className="w-6 h-10 border-2 border-gray-600 rounded-full flex justify-center"
									animate={{ y: [0, -5, 0] }}
									transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
								>
									<motion.div
										className="w-1 h-3 bg-gray-600 rounded-full mt-2"
										animate={{ y: [0, 3, 0] }}
										transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
									/>
								</motion.div>
							</motion.div>
						)}
					</motion.div>
				</div>
			</div>
		</div>
	);
}