"use client";

import React from "react";
import Lenis from "@studio-freight/lenis";

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  React.useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      smoothWheel: true, // Changed to true
      wheelMultiplier: 1, // Reduced multiplier
      touchMultiplier: 2,
      infinite: false,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        lenis.stop();
      } else {
        lenis.start();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      lenis.destroy();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <>{children}</>;
}
