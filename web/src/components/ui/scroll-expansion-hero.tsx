'use client';

import { useRef, ReactNode } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ScrollExpansionHeroProps {
  mediaType?: 'image' | 'video';
  mediaSrc: string;
  bgImageSrc: string;
  title: string;
  date?: string;
  children?: ReactNode;
  textBlend?: boolean;
}

const ScrollExpansionHero = ({
  mediaType = 'image',
  mediaSrc,
  bgImageSrc,
  title,
  date,
  children,
  textBlend = false,
}: ScrollExpansionHeroProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  // Map scroll progress to animation values
  // Original logic: width 320 -> 1220 (320+900)
  // height 420 -> 770 (420+350)
  const width = useTransform(scrollYProgress, [0, 1], [320, 1220]);
  const height = useTransform(scrollYProgress, [0, 1], [420, 770]);

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
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <motion.div
            className="rounded-2xl overflow-hidden shadow-2xl"
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
          className={`absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none ${textBlend ? 'mix-blend-difference' : ''
            }`}
          style={{ y: textY, opacity: textOpacity }}
        >
          <motion.h1
            className="text-5xl md:text-6xl font-bold text-white px-4 mb-6 font-fondamento"
            style={{
              textShadow: '0 0 20px rgba(0, 0, 0, 0.8)',
            }}
          >
            {title}
          </motion.h1>

          {date && (
            <motion.p
              className="text-white text-3xl md:text-4xl tracking-wide font-bold font-fondamento"
            >
              {date}
            </motion.p>
          )}
        </motion.div>

        {/* Content revealed */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-30 bg-white px-8 py-16"
          style={{ opacity: contentOpacity }}
        >
          {children}
        </motion.div>
      </div>
    </motion.section>
  );
};

export default ScrollExpansionHero;
