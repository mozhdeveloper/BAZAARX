import { useEffect, useRef, useState } from "react";

/**
 * Returns a ref and a boolean `inView` that becomes true (permanently) once
 * the referenced element enters the viewport.
 * Useful for deferring heavy component mounts until the user scrolls to them.
 */
export function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          // Once in view, no need to keep observing
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}
