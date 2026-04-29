import { useCallback, useRef, useState } from "react";

interface UseCanvasCameraOptions {
  onAdvance: () => void;
  onRetreat: () => void;
  // Scale at and above which the camera has zoomed past the upper threshold.
  // Default 1.99 (within 1% of max scale 2.0) — page swap fires only when
  // the camera is essentially saturated, so mid-zoom exploration never trips it.
  thresholdIn?: number;
  // Scale at and below which the camera has zoomed past the lower threshold.
  // Default 0.41 (within 2.5% of min scale 0.4) — symmetric to thresholdIn.
  thresholdOut?: number;
  // Lock duration after a transition fires, in ms. Prevents rapid camera
  // changes from triggering oscillating advance/retreat firings.
  // Default 600 (covers a 400ms cross-fade + 200ms grace).
  transitionLockMs?: number;
}

interface UseCanvasCameraReturn {
  isTransitioning: boolean;
  // Call after the page swap (cross-fade) has finished and the camera has
  // been reset to its initial scale, so the lock can release.
  releaseLock: () => void;
  // Call from react-zoom-pan-pinch's onTransformed callback with the current
  // camera scale. No-op while a transition is in flight.
  report: (scale: number) => void;
}

export function useCanvasCamera({
  thresholdIn = 1.99,
  thresholdOut = 0.41,
  transitionLockMs = 600,
  onAdvance,
  onRetreat,
}: UseCanvasCameraOptions): UseCanvasCameraReturn {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const fallbackTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);

  const beginTransition = useCallback(() => {
    setIsTransitioning(true);
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
    }
    // Safety release in case releaseLock is never called (e.g. animation
    // event missed). The dead zone between thresholdOut and thresholdIn
    // contains the reset target (1.0), so post-fallback the camera will
    // sit comfortably inside the dead zone.
    fallbackTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
    }, transitionLockMs);
  }, [transitionLockMs]);

  const releaseLock = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    setIsTransitioning(false);
  }, []);

  const report = useCallback(
    (scale: number) => {
      if (isTransitioning) {
        return;
      }
      if (scale >= thresholdIn) {
        beginTransition();
        onAdvance();
        return;
      }
      if (scale <= thresholdOut) {
        beginTransition();
        onRetreat();
      }
    },
    [beginTransition, isTransitioning, onAdvance, onRetreat, thresholdIn, thresholdOut],
  );

  return { isTransitioning, releaseLock, report };
}
