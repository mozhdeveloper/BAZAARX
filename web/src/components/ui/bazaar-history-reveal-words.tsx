'use client';


import { useRef, useState } from 'react';
import { useScroll, useMotionValueEvent, useTransform, motion } from 'framer-motion';
import { RevealImageListItem, type ImageSource } from "./reveal-images";

const TRADE_IMAGES: [[ImageSource, ImageSource], [ImageSource, ImageSource], [ImageSource, ImageSource]] = [
  [
    { src: 'https://thumbs.dreamstime.com/b/shiraz-iran-october-fragrant-spices-herbs-nus-dried-fruits-stall-vakil-bazaar-spice-store-107836400.jpg', alt: 'trade2' },
    { src: 'https://thumbs.dreamstime.com/b/fabrics-trade-grand-bazaar-tehran-iran-tehran-iran-april-iranian-man-sells-textile-to-woman-hijab-fabric-shop-110166806.jpg', alt: 'trade1' },
  ],
  [
    { src: 'https://tasteiran.net/Files/isfahan-bazaar-walking-tour-experience-mps-574b2f.jpg', alt: 'craft1' },
    { src: 'https://res.cloudinary.com/enchanting/q_70,f_auto,w_1000,h_668,c_fit/exodus-web/2021/12/craftsman-shiraz-bazaar.jpg', alt: 'craft2' },
  ],
  [
    { src: 'https://st4.depositphotos.com/20044298/28779/i/450/depositphotos_287797782-stock-photo-2019-tehran-tehran-province-iran.jpg', alt: 'gather' },
    { src: 'https://thumbs.dreamstime.com/b/people-grand-bazaar-iran-tehran-may-walking-crowded-rows-counters-colorful-goods-148766237.jpg', alt: 'community' },
  ],
];

export default function BazaarRevealWords() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (latest < 0.2) {
      setActiveIndex(-1);
    } else if (latest < 0.4) {
      setActiveIndex(0);
    } else if (latest < 0.6) {
      setActiveIndex(1);
    } else if (latest < 0.8) {
      setActiveIndex(2);
    } else {
      setActiveIndex(-1);
    }
  });

  // Background transition: Orange (#D94F00) -> White (#ffffff)
  const backgroundColor = useTransform(scrollYProgress, [0.15, 0.25], ["#D94F00", "#ffffff"]);

  // Reveal Words Color: White -> Orange (accent #FF6A00)
  const revealTextColor = useTransform(scrollYProgress, [0.15, 0.25], ["#ffffff", "#FF6A00"]);

  // Paragraph Color: White -> Gray 600 (#4b5563)
  const paragraphColor = useTransform(scrollYProgress, [0.15, 0.25], ["#ffffff", "#4b5563"]);

  // Border Color: White/Light Orange -> Orange (#FF8A4D)
  const borderColor = useTransform(scrollYProgress, [0.15, 0.25], ["#ffffff", "#FF8A4D"]);

  // Border Gradient: Uses the dynamic borderColor to create a fade-out gradient
  const borderGradient = useTransform(borderColor, color => `linear-gradient(to right, transparent, ${color}, transparent)`);

  return (
    <motion.section
      ref={containerRef}
      className="relative h-[400vh]"
      style={{ backgroundColor }}
    >
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-12 items-center">
            {/* Left: paragraph */}
            <div className="order-2 md:order-1">
              <div className="max-w-3xl mx-auto">
                <motion.div
                  className="relative py-12 sm:py-16 md:py-20"
                >
                  {/* Top Gradient Line */}
                  <motion.div
                    className="absolute top-0 left-0 w-full h-px"
                    style={{ background: borderGradient }}
                  />

                  <motion.p
                    className="text-base sm:text-lg md:text-xl lg:text-2xl leading-relaxed sm:leading-loose text-justify px-2 sm:px-0"
                    style={{ color: paragraphColor }}
                  >
                    Over time, the Persian bazaar model spread across the Middle East, North Africa, and beyond, giving rise to iconic marketplaces such as the Turkish bazaars and the Arabic sūqs. Wherever it traveled, the bazaar retained its core purpose: a place where people come together. It thrived as a center of trade, showcased local craft, and fostered vibrant social gatherings—bringing goods, artisans, and communities into one shared space.
                  </motion.p>

                  {/* Bottom Gradient Line */}
                  <motion.div
                    className="absolute bottom-0 left-0 w-full h-px"
                    style={{ background: borderGradient }}
                  />
                </motion.div>
              </div>
            </div>

            {/* Right: stacked reveal words (responsive) */}
            <div className="order-1 md:order-2 flex flex-col gap-3 sm:gap-4 items-end">
              <div className="w-full md:w-auto">
                <RevealImageListItem
                  text="trade"
                  images={TRADE_IMAGES[0]}
                  isActive={activeIndex === 0}
                  style={{ color: revealTextColor }}
                />
              </div>
              <div className="w-full md:w-auto">
                <RevealImageListItem
                  text="craft"
                  images={TRADE_IMAGES[1]}
                  isActive={activeIndex === 1}
                  style={{ color: revealTextColor }}
                />
              </div>
              <div className="w-full md:w-auto">
                <RevealImageListItem
                  text="gathering"
                  images={TRADE_IMAGES[2]}
                  isActive={activeIndex === 2}
                  style={{ color: revealTextColor }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}