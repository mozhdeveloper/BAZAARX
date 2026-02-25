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
  // Initial width 85%, expanding to 100%, then shrinking slightly to 90%
  const width = useTransform(scrollYProgress, [0, 0.4, 0.7], ["85%", "100%", "92%"]);
  // Initial height 40vh, expanding to 75vh, then shrinking to 40vh to make room for text
  const height = useTransform(scrollYProgress, [0, 0.4, 0.7], ["40vh", "75vh", "40vh"]);
  // Move media significantly up as text reveals
  const mediaY = useTransform(scrollYProgress, [0.4, 0.7], ["0vh", "-25vh"]);

  const bgOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const contentOpacity = useTransform(scrollYProgress, [0.5, 0.7], [0, 1]);
  const backgroundColor = "var(--brand-wash)";

  const textY = useTransform(scrollYProgress, [0.4, 0.7], ["0%", "-20%"]);
  const textOpacity = useTransform(scrollYProgress, [0.4, 0.65], [1, 0]);

  return (
    <motion.section
      ref={containerRef}
      className="relative h-[500vh]"
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
            style={{ width, height, y: mediaY }}
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

        <motion.div
          className="absolute inset-0 z-30 flex flex-col items-center justify-start bg-transparent px-4 sm:px-6 md:px-8 pointer-events-none"
          style={{ opacity: contentOpacity }}
        >
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pt-[52vh]">
            {/* Body copy */}
            <p className="text-base sm:text-lg md:text-xl leading-relaxed text-[var(--text-primary)] text-justify font-small">
              Today, the spirit of the bazaar lives on—reimagined for a connected
              world. BazaarX is where makers, manufacturers, and buyers meet
              without unnecessary middlemen. By bringing products straight from the source to your home,
              BazaarX turns centuries of open exchange into a seamless digital
              marketplace.
            </p>

            {/* Subheadline with line */}
            <div className="space-y-6 sm:space-y-10 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="h-0.5 bg-[var(--brand-primary)] w-16 sm:w-32"></div>
                <p className="text-lg sm:text-xl md:text-2xl text-[var(--brand-primary)] italic font-fondamento">
                  Discover more. Pay less.
                </p>
              </div>
              <div className="flex items-center justify-center text-center">
                <p className="text-xl sm:text-2xl md:text-3xl lg:text-5xl font-bold font-fondamento leading-tight">
                  <span className="text-[var(--brand-primary)] block">Inspired by ancient bazaars.</span>
                  <span className="text-[var(--text-headline)] block">Reimagined as the modern crossroads for global trade.</span>
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
