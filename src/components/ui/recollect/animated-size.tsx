"use client";

import { useEffect, useRef, useState } from "react";

import { motion, useReducedMotion } from "motion/react";

interface AnimatedSizeProps {
  children: React.ReactNode;
}

/**
 * Wraps children in a container that smoothly animates width/height changes
 * using ResizeObserver + Framer Motion spring animation.
 * Respects prefers-reduced-motion.
 */
export function AnimatedSize({ children }: AnimatedSizeProps) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{
    height: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return () => {
        /* intentional no-op — useEffect cleanup when ref is null */
      };
    }

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) {
        return;
      }

      const { height, width } = entry.contentRect;
      // Skip zero sizes (popup closing) — let parent CSS animation handle exit
      if (height > 0 && width > 0) {
        setSize({ height, width });
      }
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <motion.div
      animate={size ?? undefined}
      style={{ overflow: "clip" }}
      transition={
        shouldReduceMotion ? { duration: 0 } : { bounce: 0.2, duration: 0.2, type: "spring" }
      }
    >
      <div className="w-fit" ref={ref}>
        {children}
      </div>
    </motion.div>
  );
}
