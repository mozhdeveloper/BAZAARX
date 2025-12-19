"use client";
import { motion, useInView, Variants } from "framer-motion";
import React, { RefObject } from "react";

interface TimelineContentProps {
  children: React.ReactNode;
  animationNum: number;
  timelineRef: RefObject<HTMLDivElement | null>;
  customVariants?: Variants;
  as?: React.ElementType;
  className?: string;
}

export const TimelineContent: React.FC<TimelineContentProps> = ({
  children,
  animationNum,
  timelineRef,
  customVariants,
  as: Component = "div",
  className = "",
}) => {
  const isInView = useInView(timelineRef, { once: true, amount: 0.4 });

  const defaultVariants: Variants = {
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.2,
        duration: 0.5,
      },
    }),
    hidden: { opacity: 0, y: 20 },
  };

  const variants = customVariants || defaultVariants;

  return (
    <motion.div
      custom={animationNum}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {typeof Component === "string" ? (
        React.createElement(Component as string, { className }, children)
      ) : (
        children
      )}
    </motion.div>
  );
};
