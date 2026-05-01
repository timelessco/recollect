import { useCallback, useEffect, useRef, useState } from "react";

interface UseCanvasGestureOptions {
  // Logical camera depth at which the user has moved beyond every
  // bookmark on the current page and a page transition can fire.
  depthThreshold: number;
  onAdvance: (source: GestureSource) => void;
  onRetreat: (source: GestureSource) => void;
  scrollSensitivity?: number;
  // Lock duration after a transition fires. Covers the cross-fade
  // (~400ms) plus a small grace window so a sustained gesture doesn't
  // chain-fire.
  transitionLockMs?: number;
}

export type GestureSource = "keyboard" | "wheel";

interface UseCanvasGestureReturn {
  depthProgress: number;
  isTransitioning: boolean;
  // Call from the cross-fade's onAnimationComplete to clear the lock
  // and resume gesture processing.
  releaseLock: () => void;
  // Called from canvasView's native wheel handler with a normalized
  // signed deltaY (positive → advance intent, negative → retreat).
  report: (signedDeltaY: number) => void;
  resetDepth: (nextDepth?: number) => void;
  // Direct triggers for keyboard navigation — bypass the accumulator
  // since a key press is a discrete event, not a continuous gesture.
  triggerAdvance: () => void;
  triggerRetreat: () => void;
}

const DEFAULT_TRANSITION_LOCK_MS = 600;
const DEFAULT_SCROLL_SENSITIVITY = 1;

export function useCanvasGesture({
  depthThreshold,
  onAdvance,
  onRetreat,
  scrollSensitivity = DEFAULT_SCROLL_SENSITIVITY,
  transitionLockMs = DEFAULT_TRANSITION_LOCK_MS,
}: UseCanvasGestureOptions): UseCanvasGestureReturn {
  const [depthProgress, setDepthProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lockTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const depthProgressRef = useRef(0);
  // Synchronous mirror of `isTransitioning` — `report`/`triggerAdvance`/
  // `triggerRetreat` read this instead of the state value so the lock takes
  // effect immediately, before React commits the next render. Without this,
  // a fast trackpad fling can fire multiple advances within one render cycle
  // because their stale closures see `isTransitioning === false`.
  const isTransitioningRef = useRef(false);

  const clearLockTimer = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const beginTransition = useCallback(() => {
    clearLockTimer();
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    // Safety release in case the cross-fade's onAnimationComplete is
    // missed (e.g. tab backgrounded mid-transition). The dead zone
    // around 0 means this can't accidentally re-fire.
    lockTimerRef.current = setTimeout(() => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
      lockTimerRef.current = null;
    }, transitionLockMs);
  }, [clearLockTimer, transitionLockMs]);

  const updateDepthProgress = useCallback(
    (nextDepth: number) => {
      // Symmetric range — backward scroll pushes depth negative so cards
      // continuously shrink, mirroring the forward zoom-in.
      const clampedDepth = Math.max(-depthThreshold, Math.min(depthThreshold, nextDepth));
      depthProgressRef.current = clampedDepth;
      setDepthProgress(clampedDepth);
    },
    [depthThreshold],
  );

  const releaseLock = useCallback(() => {
    clearLockTimer();
    isTransitioningRef.current = false;
    setIsTransitioning(false);
  }, [clearLockTimer]);

  const resetDepth = useCallback(
    (nextDepth = 0) => {
      updateDepthProgress(nextDepth);
    },
    [updateDepthProgress],
  );

  const report = useCallback(
    (signedDeltaY: number) => {
      if (isTransitioningRef.current) {
        return;
      }
      const next = depthProgressRef.current + signedDeltaY * scrollSensitivity;

      if (next >= depthThreshold) {
        // Lock synchronously to block subsequent wheel events while we
        // wait for the depth-at-threshold render to commit.
        isTransitioningRef.current = true;
        updateDepthProgress(depthThreshold);
        // Defer the page change one frame so React commits the
        // depth=threshold render *first* with the old pageIndex. That
        // becomes the "last seen" element AnimatePresence holds for the
        // exit — without this, depth=threshold and pageIndex=newIndex
        // batch into one render and the held wrapper snapshots at the
        // previous wheel event's depth instead of threshold.
        requestAnimationFrame(() => {
          beginTransition();
          onAdvance("wheel");
        });
      } else if (next <= -depthThreshold) {
        isTransitioningRef.current = true;
        updateDepthProgress(-depthThreshold);
        requestAnimationFrame(() => {
          beginTransition();
          onRetreat("wheel");
        });
      } else {
        updateDepthProgress(next);
      }
    },
    [beginTransition, depthThreshold, onAdvance, onRetreat, scrollSensitivity, updateDepthProgress],
  );

  const triggerAdvance = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }
    // Same two-phase commit as the wheel path so the wrapper renders at
    // +threshold before the pageIndex change, giving AnimatePresence a
    // held element at the right z.
    isTransitioningRef.current = true;
    updateDepthProgress(depthThreshold);
    requestAnimationFrame(() => {
      beginTransition();
      onAdvance("keyboard");
    });
  }, [beginTransition, depthThreshold, onAdvance, updateDepthProgress]);

  const triggerRetreat = useCallback(() => {
    if (isTransitioningRef.current) {
      return;
    }
    isTransitioningRef.current = true;
    updateDepthProgress(-depthThreshold);
    requestAnimationFrame(() => {
      beginTransition();
      onRetreat("keyboard");
    });
  }, [beginTransition, depthThreshold, onRetreat, updateDepthProgress]);

  useEffect(
    () => () => {
      clearLockTimer();
    },
    [clearLockTimer],
  );

  return {
    depthProgress,
    isTransitioning,
    releaseLock,
    report,
    resetDepth,
    triggerAdvance,
    triggerRetreat,
  };
}
