import type { ReactNode } from "react";

import type { CanvasPosition } from "./canvas-position";

import { normalizeZ } from "./canvas-position";

interface CanvasItemProps {
  children: ReactNode;
  position: CanvasPosition;
}

const CARD_BASE_WIDTH = 240;
const CARD_BASE_HEIGHT = 180;
const MAX_BLUR_PX = 2;
const MIN_OPACITY = 0.5;

// Positions a child (typically a BookmarkCard) absolutely on the canvas
// surface and applies depth styling — scale, blur, and opacity all derived
// from the position's z value. Crisp/large cards have z near CARD_Z_MAX;
// dim/small/blurred cards have z near CARD_Z_MIN.
export const CanvasItem = ({ children, position }: CanvasItemProps) => {
  const norm = normalizeZ(position.z);
  const opacity = MIN_OPACITY + norm * (1 - MIN_OPACITY);
  const blur = MAX_BLUR_PX * (1 - norm);

  return (
    <div
      className="absolute"
      style={{
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        height: CARD_BASE_HEIGHT,
        left: position.x,
        opacity,
        top: position.y,
        transform: `scale(${position.z})`,
        transformOrigin: "center",
        width: CARD_BASE_WIDTH,
        willChange: "transform, opacity, filter",
      }}
    >
      {children}
    </div>
  );
};
