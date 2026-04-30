import { useCallback, useEffect, useRef, useState } from "react";

interface UseCanvasGestureOptions {
  // Idle-reset window: if no `report` calls arrive within this many
  // milliseconds, the accumulator clears. Lets discrete gestures
  // register as separate intentions rather than summing into one.
  idleResetMs?: number;
  onAdvance: (source: GestureSource) => void;
  onRetreat: (source: GestureSource) => void;
  // Accumulated |signedDeltaY| at which a page transition fires.
  // Default 250 — covers ~3-4 mouse-wheel notches or a moderate
  // trackpad pinch.
  threshold?: number;
  // Lock duration after a transition fires. Covers the cross-fade
  // (~400ms) plus a small grace window so a sustained gesture doesn't
  // chain-fire.
  transitionLockMs?: number;
}

export type GestureSource = "keyboard" | "wheel";

interface UseCanvasGestureReturn {
  isTransitioning: boolean;
  // Call from the cross-fade's onAnimationComplete to clear the lock
  // and resume gesture processing.
  releaseLock: () => void;
  // Called from canvasView's native wheel handler with a normalized
  // signed deltaY (positive → advance intent, negative → retreat).
  report: (signedDeltaY: number) => void;
  // Direct triggers for keyboard navigation — bypass the accumulator
  // since a key press is a discrete event, not a continuous gesture.
  triggerAdvance: () => void;
  triggerRetreat: () => void;
}

const DEFAULT_THRESHOLD = 250;
const DEFAULT_IDLE_RESET_MS = 150;
const DEFAULT_TRANSITION_LOCK_MS = 600;

export function useCanvasGesture({
  onAdvance,
  onRetreat,
  threshold = DEFAULT_THRESHOLD,
  idleResetMs = DEFAULT_IDLE_RESET_MS,
  transitionLockMs = DEFAULT_TRANSITION_LOCK_MS,
}: UseCanvasGestureOptions): UseCanvasGestureReturn {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const accumulatorRef = useRef(0);
  const idleTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);
  const lockTimerRef = useRef<null | ReturnType<typeof setTimeout>>(null);

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const clearLockTimer = useCallback(() => {
    if (lockTimerRef.current) {
      clearTimeout(lockTimerRef.current);
      lockTimerRef.current = null;
    }
  }, []);

  const beginTransition = useCallback(() => {
    accumulatorRef.current = 0;
    clearIdleTimer();
    clearLockTimer();
    setIsTransitioning(true);
    // Safety release in case the cross-fade's onAnimationComplete is
    // missed (e.g. tab backgrounded mid-transition). The dead zone
    // around 0 means this can't accidentally re-fire.
    lockTimerRef.current = setTimeout(() => {
      setIsTransitioning(false);
      lockTimerRef.current = null;
    }, transitionLockMs);
  }, [clearIdleTimer, clearLockTimer, transitionLockMs]);

  const releaseLock = useCallback(() => {
    clearLockTimer();
    setIsTransitioning(false);
  }, [clearLockTimer]);

  const report = useCallback(
    (signedDeltaY: number) => {
      if (isTransitioning) {
        return;
      }
      const prev = accumulatorRef.current;
      // Sign flip → reset, don't add. Otherwise a back-then-forward
      // motion cancels itself out and the user feels nothing happened.
      const next =
        prev !== 0 && Math.sign(prev) !== Math.sign(signedDeltaY)
          ? signedDeltaY
          : prev + signedDeltaY;
      accumulatorRef.current = next;

      // Restart idle timer.
      clearIdleTimer();
      idleTimerRef.current = setTimeout(() => {
        accumulatorRef.current = 0;
        idleTimerRef.current = null;
      }, idleResetMs);

      if (next >= threshold) {
        beginTransition();
        onAdvance("wheel");
      } else if (next <= -threshold) {
        beginTransition();
        onRetreat("wheel");
      }
    },
    [
      beginTransition,
      clearIdleTimer,
      idleResetMs,
      isTransitioning,
      onAdvance,
      onRetreat,
      threshold,
    ],
  );

  const triggerAdvance = useCallback(() => {
    if (isTransitioning) {
      return;
    }
    beginTransition();
    onAdvance("keyboard");
  }, [beginTransition, isTransitioning, onAdvance]);

  const triggerRetreat = useCallback(() => {
    if (isTransitioning) {
      return;
    }
    beginTransition();
    onRetreat("keyboard");
  }, [beginTransition, isTransitioning, onRetreat]);

  useEffect(
    () => () => {
      clearIdleTimer();
      clearLockTimer();
    },
    [clearIdleTimer, clearLockTimer],
  );

  return { isTransitioning, releaseLock, report, triggerAdvance, triggerRetreat };
}
