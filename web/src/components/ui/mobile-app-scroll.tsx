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
      className="h-[60rem] md:h-[90rem] flex items-center justify-center relative p-4 md:p-20 bg-white overflow-hidden"
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
      }}
      className="w-full flex justify-center items-center"
    >
      <div className="relative w-auto h-auto">
        {children}
      </div>
    </motion.div>
  );
};