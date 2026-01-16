'use client';

import { useRef, useState } from 'react';
import { useScroll, useMotionValueEvent } from 'framer-motion';
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

  return (
    <section ref={containerRef} className="relative h-[300vh] bg-white">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Left: paragraph */}
            <div className="order-2 md:order-1">
              <div className="max-w-3xl mx-auto">
                <div
                  className="py-20 border-t-4 border-b-4"
                  style={{ borderColor: "var(--accent-2, #FF8A4D)" }}
                >
                  <p className="text-gray-600 text-xl md:text-2xl leading-loose text-justify">
                    Over time, the Persian bazaar model spread across the Middle East, North Africa, and beyond, giving rise to iconic marketplaces such as the Turkish bazaars and the Arabic sūqs. Wherever it traveled, the bazaar retained its core purpose: a place where people come together. It thrived as a center of trade, showcased local craft, and fostered vibrant social gatherings—bringing goods, artisans, and communities into one shared space.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: stacked reveal words (responsive) */}
            <div className="order-1 md:order-2 flex flex-col gap-4 items-end">
              <div className="w-full md:w-auto">
                <RevealImageListItem text="trade" images={TRADE_IMAGES[0]} isActive={activeIndex === 0} />
              </div>
              <div className="w-full md:w-auto">
                <RevealImageListItem text="craft" images={TRADE_IMAGES[1]} isActive={activeIndex === 1} />
              </div>
              <div className="w-full md:w-auto">
                <RevealImageListItem text="gathering" images={TRADE_IMAGES[2]} isActive={activeIndex === 2} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}