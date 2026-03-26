import type { ReactNode } from "react";

import { isNil } from "lodash";
import { motion, useReducedMotion } from "motion/react";

interface AnimatedBookmarkCardProps {
  children: ReactNode;
  id: number;
}

/**
 * Wraps a bookmark card with an entry animation (fade + slide) when
 * the bookmark is optimistic (isNil(id)). Existing cards with an ID
 * render children directly with zero overhead.
 */
export function AnimatedBookmarkCard({ children, id }: AnimatedBookmarkCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const isOptimistic = isNil(id);

  if (!isOptimistic || shouldReduceMotion) {
    return children;
  }

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
