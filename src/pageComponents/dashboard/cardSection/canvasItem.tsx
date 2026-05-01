import type { CSSProperties, ReactNode } from "react";

import { motion, useReducedMotion } from "motion/react";

import type { CanvasPosition, CanvasTuning } from "./canvas-position";

interface CanvasItemProps {
  cameraZ: number;
  children: ReactNode;
  className?: string;
  position: CanvasPosition;
  // 0-based position in the current page's render order. Used to
  // stagger each card's fade-in so they pop in one after another
  // instead of all at once.
  staggerIndex?: number;
  tuning: CanvasTuning;
  // Live wrapper size — the canvas re-measures on mount and resize and
  // forwards the latest values so cards stay correctly placed when the
  // viewport changes.
  wrapperHeight: number;
  wrapperWidth: number;
}

// Per-card fade-in duration once the stagger delay elapses.
const ENTER_DURATION_S = 0.32;
// Gap between successive cards' fade-in. 30 cards × 0.04s = ~1.2s
// total stagger span — fast enough to feel snappy, slow enough to
// read as "one by one".
export const STAGGER_PER_CARD_S = 0.04;

// Positions a card absolutely on the canvas surface. Each card is
// centered on (xFrac × wrapperWidth, yFrac × wrapperHeight) via
// translate(-50%, -50%) so its actual size doesn't shift the anchor.
// Continuous z-depth gives size hierarchy; layered shadow + z-index give
// elevation when cards overlap.
//
// The fade-in (with per-card stagger) lives here. Exit is handled by
// the parent motion.div in canvasView, which fades the whole frame to
// white before the next page mounts.
export const CanvasItem = ({
  cameraZ,
  children,
  className,
  position,
  staggerIndex = 0,
  tuning,
  wrapperHeight,
  wrapperWidth,
}: CanvasItemProps) => {
  const prefersReducedMotion = useReducedMotion();
  const wrapperClass = className ? `absolute ${className}` : "absolute";
  const depthScale = tuning.baseScale + position.depth * tuning.depthScaleBoost;
  const shadowOpacity = 0.06 + position.depth * 0.14;
  const shadowBlur = 14 + position.depth * 30;
  const shadowLift = 6 + position.depth * 18;

  const style = {
    "--card-speed": String(position.speed),
    boxShadow: `0 ${shadowLift}px ${shadowBlur}px rgba(15, 23, 42, ${shadowOpacity}), 0 1px 3px rgba(15, 23, 42, 0.06)`,
    left: wrapperWidth / 2 + (position.xFrac - 0.5) * wrapperWidth * tuning.worldWidth,
    top: wrapperHeight / 2 + (position.yFrac - 0.5) * wrapperHeight * tuning.worldHeight,
    transform: `translate(calc(var(--pan-x, 0px) * var(--card-speed, 1)), calc(var(--pan-y, 0px) * var(--card-speed, 1))) translate3d(-50%, -50%, ${position.z + cameraZ}px) scale(${depthScale})`,
    width: tuning.cardBaseWidth,
    zIndex: Math.round(position.z) + 1,
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
