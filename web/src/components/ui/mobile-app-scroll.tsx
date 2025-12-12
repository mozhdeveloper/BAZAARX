"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion, MotionValue } from "framer-motion";

export const MobileAppScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.6, 0.85] : [1.2, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], [25, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -80]);

  return (
    <div
      className="h-[60rem] md:h-[70rem] flex items-center justify-center relative p-4 md:p-20 bg-white"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-32 w-full relative"
        style={{
          perspective: "1200px",
        }}
      >
        <MobileHeader translate={translate} titleComponent={titleComponent} />
        <PhoneCard rotate={rotate} translate={translate} scale={scale}>
          {children}
        </PhoneCard>
      </div>
    </div>
  );
};

export const MobileHeader = ({ translate, titleComponent }: any) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="max-w-4xl mx-auto text-center mb-16"
    >
      {titleComponent}
    </motion.div>
  );
};

export const PhoneCard = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  translate: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000001a, 0 12px 25px #0000001a, 0 25px 45px #00000012, 0 45px 65px #0000000a, 0 70px 80px #00000005, 0 100px 90px #00000002",
      }}
      className="max-w-sm mx-auto h-[35rem] md:h-[45rem] w-full relative"
    >
      {/* Phone Frame */}
      <div className="h-full w-full bg-black rounded-[2.5rem] p-2 shadow-2xl relative">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-20"></div>
        
        {/* Screen */}
        <div className="h-full w-full bg-white rounded-[2rem] overflow-hidden relative">
          {children}
        </div>
        
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-300 rounded-full"></div>
      </div>
    </motion.div>
  );
};