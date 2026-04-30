import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  RefObject,
} from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseCanvasPanOptions {
  // Per-frame catch-up factor: `current += (target - current) * damping`.
  damping?: number;
  // Suppress the gesture (e.g. while a lightbox is above the canvas).
  disabled?: boolean;
  // Pixel travel before pointermove is treated as a pan rather than a click —
  // sub-threshold motion still passes through to the underlying card/link.
  dragThreshold?: number;
  // Settle distance (px) below which the lerp loop stops.
  epsilon?: number;
  // Max absolute pan distance (px) on each axis. Target is clamped to
  // [-maxX, maxX] / [-maxY, maxY]; default Infinity = no bound.
  maxX?: number;
  maxY?: number;
}

interface UseCanvasPanReturn {
  isDragging: boolean;
  panHandlers: {
    onClickCapture: (event: ReactMouseEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
  // Attach to the element that should hold the `--pan-x` / `--pan-y` CSS
  // variables — descendants consume them.
  panLayerRef: RefObject<HTMLDivElement | null>;
}

const DEFAULT_DAMPING = 0.1;
const DEFAULT_EPSILON = 0.05;
const DEFAULT_DRAG_THRESHOLD_PX = 4;

const noopCleanup = () => {
  /* noop — placeholder when an effect short-circuits before claiming any
     resources to release. */
};

const clamp = (value: number, max: number) => Math.max(-max, Math.min(max, value));

export function useCanvasPan({
  damping = DEFAULT_DAMPING,
  epsilon = DEFAULT_EPSILON,
  dragThreshold = DEFAULT_DRAG_THRESHOLD_PX,
  disabled = false,
  maxX = Number.POSITIVE_INFINITY,
  maxY = Number.POSITIVE_INFINITY,
}: UseCanvasPanOptions = {}): UseCanvasPanReturn {
  const panLayerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Drag updates `target`; RAF lerps `current` toward it. The high-frequency
  // pointermove + RAF tick path lives entirely in refs to avoid per-frame
  // re-renders.
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const writePanVars = useCallback(() => {
    const el = panLayerRef.current;
    if (!el) {
      return;
    }
    el.style.setProperty("--pan-x", `${currentRef.current.x}px`);
    el.style.setProperty("--pan-y", `${currentRef.current.y}px`);
  }, []);

  const tick = useCallback(() => {
    const dx = targetRef.current.x - currentRef.current.x;
    const dy = targetRef.current.y - currentRef.current.y;
    currentRef.current = {
      x: currentRef.current.x + dx * damping,
      y: currentRef.current.y + dy * damping,
    };
    writePanVars();
    // Stop only when the pointer is released AND we're within epsilon —
    // an active drag must keep ticking even if the pointer holds still.
    const settled =
      Math.abs(dx) < epsilon && Math.abs(dy) < epsilon && activePointerIdRef.current === null;
    if (settled) {
      currentRef.current = { x: targetRef.current.x, y: targetRef.current.y };
      writePanVars();
      rafRef.current = null;
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [damping, epsilon, writePanVars]);

  const ensureRunning = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }
      activePointerIdRef.current = event.pointerId;
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      hasMovedRef.current = false;
      // Do NOT setPointerCapture here — capture redirects mouseup off the
      // original target, which breaks the click → card-link path. Capture
      // is deferred to onPointerMove once drag-threshold is crossed.
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (activePointerIdRef.current !== event.pointerId) {
        return;
      }
      const dx = event.clientX - lastPointerRef.current.x;
      const dy = event.clientY - lastPointerRef.current.y;
      // Below dragThreshold the gesture is still a click candidate, so the
      // child's onClick must fire on release rather than being eaten as a pan.
      if (!hasMovedRef.current) {
        const totalDx = event.clientX - dragStartRef.current.x;
        const totalDy = event.clientY - dragStartRef.current.y;
        if (Math.hypot(totalDx, totalDy) < dragThreshold) {
          return;
        }
        hasMovedRef.current = true;
        setIsDragging(true);
        // Now that we've committed to a drag, capture so subsequent
        // move/up land here even if the pointer leaves the wrapper.
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      targetRef.current = {
        x: clamp(targetRef.current.x + dx, maxX),
        y: clamp(targetRef.current.y + dy, maxY),
      };
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      ensureRunning();
    },
    [dragThreshold, ensureRunning, maxX, maxY],
  );

  // RAF keeps running until current settles to target — no manual cancel.
  const endDrag = useCallback((pointerId: number) => {
    if (activePointerIdRef.current !== pointerId) {
      return;
    }
    activePointerIdRef.current = null;
    if (hasMovedRef.current) {
      setIsDragging(false);
    }
  }, []);

  const onPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      endDrag(event.pointerId);
    },
    [endDrag],
  );

  const onPointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      endDrag(event.pointerId);
    },
    [endDrag],
  );

  // Without this, mousedown-on-card → drag → release would still navigate
  // the card's link via the synthetic click that follows pointerup.
  const onClickCapture = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (hasMovedRef.current) {
      event.preventDefault();
      event.stopPropagation();
      hasMovedRef.current = false;
    }
  }, []);

  // Body-level cursor + select-none so the grabbing cursor wins regardless
  // of which child the pointer is currently over.
  useEffect(() => {
    if (!isDragging) {
      return noopCleanup;
    }
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
  }, [isDragging]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    },
    [],
  );

  return {
    isDragging,
    panLayerRef,
    panHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onClickCapture,
    },
  };
}
