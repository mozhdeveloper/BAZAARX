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
          className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none"
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
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Body copy */}
            <p className="text-lg md:text-xl leading-relaxed text-gray-700">
              Today, the spirit of the bazaar lives on—reimagined for a connected
              world. BazaarX is where makers, manufacturers, and buyers meet
              without unnecessary middlemen.
            </p>

            <p className="text-lg md:text-xl leading-relaxed text-gray-700">
              By bringing products straight from the source to your home,
              BazaarX turns centuries of open exchange into a seamless digital
              marketplace.
            </p>

            {/* Subheadline with line */}
            <div className="space-y-10 pt-4">
              <div className="flex items-center gap-4">
                <div className="h-0.5 bg-orange-500 w-32"></div>
                <p className="text-lg md:text-2xl text-orange-500 italic whitespace-nowrap font-fondamento">
                  Discover more. Pay less.
                </p>
              </div>
              <div className="flex items-center gap-6 justify-center">
                <p className="text-4xl md:text-6xl font-bold whitespace-nowrap font-fondamento">
                  <span className="text-orange-500">From global factories </span>
                  <span className="text-gray-900">directly to your doorstep</span>
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
