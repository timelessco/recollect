import type { ReactNode } from "react";

import { motion, useReducedMotion } from "motion/react";

import { useLoadersStore } from "@/store/componentStore";

/**
 * Module-scoped set tracking which animating URLs have already played
 * their entry animation. Survives virtualization unmount/remount.
 */
const mountedAnimatingUrls = new Set<string>();

export function clearMountedAnimatingUrls() {
  mountedAnimatingUrls.clear();
}

export function removeMountedAnimatingUrl(url: string) {
  mountedAnimatingUrls.delete(url);
}

interface AnimatedBookmarkCardProps {
  children: ReactNode;
  url: string;
}

export function AnimatedBookmarkCard({ children, url }: AnimatedBookmarkCardProps) {
  const isAnimating = useLoadersStore((s) => s.animatingBookmarkUrls.has(url));
  const shouldReduceMotion = useReducedMotion();

  if (!isAnimating || shouldReduceMotion) {
    return children;
  }

  const hasPlayed = mountedAnimatingUrls.has(url);
  if (!hasPlayed) {
    mountedAnimatingUrls.add(url);
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={hasPlayed ? false : { opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
