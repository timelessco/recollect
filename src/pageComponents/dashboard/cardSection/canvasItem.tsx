import type { CSSProperties, ReactNode } from "react";

import { motion, useReducedMotion } from "motion/react";

import type { CanvasPosition, DepthPlane } from "./canvas-position";

import { PLANE_SCALE } from "./canvas-position";

interface CanvasItemProps {
  children: ReactNode;
  className?: string;
  position: CanvasPosition;
  // 0-based position in the current page's render order. Used to
  // stagger each card's fade-in so they pop in one after another
  // instead of all at once.
  staggerIndex?: number;
  // Live wrapper size — the canvas re-measures on mount and resize and
  // forwards the latest values so cards stay correctly placed when the
  // viewport changes.
  wrapperHeight: number;
  wrapperWidth: number;
}

// BookmarkCard's image is `w-full` so the whole card scales
// proportionally with this width — change the number, the aspect ratio
// is preserved.
const CARD_BASE_WIDTH = 180;

// Per-card fade-in duration once the stagger delay elapses.
const ENTER_DURATION_S = 0.32;
// Gap between successive cards' fade-in. 30 cards × 0.04s = ~1.2s
// total stagger span — fast enough to feel snappy, slow enough to
// read as "one by one".
export const STAGGER_PER_CARD_S = 0.04;

const PLANE_SHADOW: Record<DepthPlane, string> = {
  far: "0 4px 10px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)",
  near: "0 18px 36px rgba(15, 23, 42, 0.18), 0 6px 12px rgba(15, 23, 42, 0.10)",
};

const PLANE_Z_INDEX: Record<DepthPlane, number> = {
  far: 1,
  near: 10,
};

// Positions a card absolutely on the canvas surface. Each card is
// centered on (xFrac × wrapperWidth, yFrac × wrapperHeight) via
// translate(-50%, -50%) so its actual size doesn't shift the anchor.
// Per-plane scale gives size hierarchy; layered shadow + z-index give
// elevation when cards happen to overlap.
//
// The fade-in (with per-card stagger) lives here. Exit is handled by
// the parent motion.div in canvasView, which fades the whole frame to
// white before the next page mounts.
export const CanvasItem = ({
  children,
  className,
  position,
  staggerIndex = 0,
  wrapperHeight,
  wrapperWidth,
}: CanvasItemProps) => {
  const prefersReducedMotion = useReducedMotion();
  const wrapperClass = className ? `absolute ${className}` : "absolute";

  const style = {
    "--card-scale": String(PLANE_SCALE[position.plane]),
    "--card-speed": String(position.speed),
    boxShadow: PLANE_SHADOW[position.plane],
    left: position.xFrac * wrapperWidth,
    top: position.yFrac * wrapperHeight,
    transform:
      "translate(calc(var(--pan-x, 0px) * var(--card-speed, 1)), calc(var(--pan-y, 0px) * var(--card-speed, 1))) translate(-50%, -50%) scale(var(--card-scale, 1))",
    width: CARD_BASE_WIDTH,
    zIndex: PLANE_Z_INDEX[position.plane],
  } as CSSProperties;

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className={wrapperClass}
      initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
      style={style}
      transition={{
        delay: prefersReducedMotion ? 0 : staggerIndex * STAGGER_PER_CARD_S,
        duration: prefersReducedMotion ? 0 : ENTER_DURATION_S,
      }}
    >
      {children}
    </motion.div>
  );
};
