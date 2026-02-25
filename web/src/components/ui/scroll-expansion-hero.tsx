'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ScrollExpansionHeroProps {
  mediaType?: 'image' | 'video';
  mediaSrc: string;
  bgImageSrc: string;
  title: string;
  date?: string;
}

const ScrollExpansionHero = ({
  mediaType = 'image',
  mediaSrc,
  bgImageSrc,
  title,
  date,
}: ScrollExpansionHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Map scroll progress to animation values
  // Use percentage values for responsive scaling
  const width = useTransform(scrollYProgress, [0, 1], ["85%", "100%"]);
  // Initial height 40vh, expanding to 80vh
  const height = useTransform(scrollYProgress, [0, 1], ["40vh", "80vh"]);

  const bgOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  const contentOpacity = useTransform(scrollYProgress, [0.8, 1], [0, 1]);
  const backgroundColor = useTransform(scrollYProgress, [0, 0.8], ["#D94F00", "#FFFFFF"]);

  const textY = useTransform(scrollYProgress, [0.6, 1], ["0%", "-20%"]);
  const textOpacity = useTransform(scrollYProgress, [0.7, 0.95], [1, 0]);

  return (
    <motion.section
      ref={containerRef}
      className="relative h-[300vh]"
      style={{ backgroundColor }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">

        {/* Background */}
        <motion.div
          className="absolute inset-0 z-0"
          style={{ opacity: bgOpacity }}
        >
          <img
            src={bgImageSrc}
            alt="Background"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </motion.div>

        {/* Center media */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <motion.div
            className="rounded-2xl overflow-hidden shadow-2xl max-w-7xl mx-auto"
            style={{ width, height }}
          >
            {mediaType === 'image' ? (
              <img
                src={mediaSrc}
                alt="Hero media"
                className="w-full h-full object-cover"
              />
            ) : (
              <video
                src={mediaSrc}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            )}
          </motion.div>
        </div>

        {/* Text */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none px-4"
          style={{ y: textY, opacity: textOpacity }}
        >
          <motion.h1
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 font-fondamento leading-tight"
            style={{
              textShadow: '0 0 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            {title}
          </motion.h1>

          {date && (
            <motion.p
              className="text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl tracking-wide font-bold font-fondamento"
            >
              {date}
            </motion.p>
          )}
        </motion.div>

        {/* Content revealed */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-30 bg-white px-4 sm:px-6 md:px-8 py-8 sm:py-12 md:py-16"
          style={{ opacity: contentOpacity }}
        >
          <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
            {/* Body copy */}
            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-gray-700">
              Today, the spirit of the bazaar lives on—reimagined for a connected
              world. BazaarX is where makers, manufacturers, and buyers meet
              without unnecessary middlemen.
            </p>

            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-gray-700">
              By bringing products straight from the source to your home,
              BazaarX turns centuries of open exchange into a seamless digital
              marketplace.
            </p>

            {/* Subheadline with line */}
            <div className="space-y-6 sm:space-y-10 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="h-0.5 bg-orange-500 w-16 sm:w-32"></div>
                <p className="text-lg sm:text-xl md:text-2xl text-orange-500 italic font-fondamento">
                  Discover more. Pay less.
                </p>
              </div>
              <div className="flex items-center justify-center text-center">
                <p className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl font-bold font-fondamento leading-tight">
                  <span className="text-orange-500 block">From global factories</span>
                  <span className="text-gray-900 block">directly to your doorstep</span>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default ScrollExpansionHero;
