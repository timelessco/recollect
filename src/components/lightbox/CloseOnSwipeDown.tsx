import { useEffect, useRef } from "react";

import { useController } from "yet-another-react-lightbox";

// Distance threshold at which we close the lightbox (px)
const THRESHOLD = 200;
// Point at which opacity starts decreasing
const OPACITY_START = THRESHOLD * 0.5;
// Velocity threshold for quick-flick close on mobile (px/s)
const VELOCITY_THRESHOLD = 800;
const INTERACTIVE_SELECTOR = "media-controller, video, audio, iframe, object, [data-no-swipe]";

export const PullEffect = ({ enabled }: { enabled?: boolean }): null => {
  // Lightbox controller: lets us subscribe to user input sensors,
  // close the lightbox, and access current slide dimensions
  const { close, slideRect, subscribeSensors } = useController();

  // Tracks how far the user has pulled down (Y offset in px)
  const offsetRef = useRef(0);

  // Used to debounce/reset animations after inactivity
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Touch tracking refs
  const pointerStartYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const rafRef = useRef(0);
  const activePointerIdRef = useRef<null | number>(null);

  // Velocity tracking for mobile flick-to-close
  // Stores a sample point ~80ms behind the current pointer for stable velocity calculation
  const velocitySampleRef = useRef({ time: 0, y: 0 });
  const prevMoveRef = useRef({ time: 0, y: 0 });

  useEffect(() => {
    if (!enabled) {
      return () => {
        /* intentional no-op — useEffect cleanup when not enabled */
      };
    }

    // Cap pull distance at the close threshold, regardless of slide size.
    // This guarantees users can always reach a closable distance on release.
    const maxOffset = THRESHOLD;

    // Reset styles back to default (no offset, full opacity, normal scale)
    const reset = (element: HTMLElement) => {
      offsetRef.current = 0;
      element.style.setProperty("--yarl-pull-offset", "0px");
      element.style.setProperty("--yarl-pull-opacity", "1");
      element.style.setProperty("--yarl-pull-scale", "1");
    };

    // Apply pull offset, opacity fade, and scale to the element
    const applyOffset = (element: HTMLElement) => {
      // Update CSS variables for translation
      element.style.setProperty("--yarl-pull-offset", `${offsetRef.current}px`);

      // Fade out gradually after crossing opacityStart
      const opacity =
        offsetRef.current > OPACITY_START
          ? Math.max(
              0.5,
              1 - ((offsetRef.current - OPACITY_START) / (THRESHOLD - OPACITY_START)) * 0.5,
            )
          : 1;
      element.style.setProperty("--yarl-pull-opacity", `${opacity}`);

      // Scale down slightly as we pull further
      const scale = Math.max(0.5, 1 - (offsetRef.current / THRESHOLD) * 0.2);
      element.style.setProperty("--yarl-pull-scale", `${scale}`);
    };

    // Subscribe to wheel events from the lightbox (Desktop: wheel/trackpad)
    const unsubscribeWheel = subscribeSensors("onWheel", (event) => {
      const element = event.currentTarget;
      event.preventDefault();
      event.stopPropagation();

      // --- Ignore horizontal swipes (left/right) ---
      // If horizontal movement is stronger than vertical, do nothing
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        return;
      }

      // Update offset: clamp between 0 and maxOffset (slide height)
      offsetRef.current = Math.min(Math.max(offsetRef.current + event.deltaY, 0), maxOffset);

      applyOffset(element);

      // Close the lightbox if pull distance exceeds threshold
      if (offsetRef.current >= THRESHOLD) {
        close();
        return;
      }

      // Animate back to neutral if user stops pulling
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        reset(element);
      }, 200);
    });

    // Mobile: pointer events (touch)
    const getSlideWrapper = (container: HTMLElement) =>
      container.querySelector<HTMLElement>(".slide-wrapper");

    const isInteractiveTarget = (event: React.PointerEvent<HTMLDivElement>) =>
      event.target instanceof HTMLElement && event.target.closest(INTERACTIVE_SELECTOR) !== null;

    const unsubscribePointerDown = subscribeSensors("onPointerDown", (event) => {
      if (event.pointerType !== "touch" || isInteractiveTarget(event)) {
        return;
      }
      if (activePointerIdRef.current !== null && activePointerIdRef.current !== event.pointerId) {
        return;
      }

      activePointerIdRef.current = event.pointerId;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Some browsers may throw if pointer capture isn't available; continue gracefully.
      }

      pointerStartYRef.current = event.clientY;
      isDraggingRef.current = false;
      offsetRef.current = 0;
      velocitySampleRef.current = {
        time: event.timeStamp,
        y: event.clientY,
      };
      prevMoveRef.current = {
        time: event.timeStamp,
        y: event.clientY,
      };
    });

    const unsubscribePointerMove = subscribeSensors("onPointerMove", (event) => {
      if (
        event.pointerType !== "touch" ||
        isInteractiveTarget(event) ||
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }

      const deltaY = event.clientY - pointerStartYRef.current;
      const element = event.currentTarget;

      if (deltaY <= 0) {
        if (isDraggingRef.current) {
          cancelAnimationFrame(rafRef.current);
          reset(element);
          delete getSlideWrapper(element)?.dataset.pulling;
          isDraggingRef.current = false;
        }

        return;
      }

      if (!isDraggingRef.current) {
        const wrapper = getSlideWrapper(element);
        if (wrapper) {
          wrapper.dataset.pulling = "";
        }
      }

      isDraggingRef.current = true;
      offsetRef.current = Math.min(deltaY, maxOffset);

      // Advance the velocity sample window: keep a point ~80ms behind current
      if (event.timeStamp - velocitySampleRef.current.time > 80) {
        velocitySampleRef.current = { ...prevMoveRef.current };
      }

      prevMoveRef.current = {
        time: event.timeStamp,
        y: event.clientY,
      };

      // Batch style updates to next frame to prevent iOS jitter
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        applyOffset(element);
      });
    });

    const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType !== "touch" || event.pointerId !== activePointerIdRef.current) {
        return;
      }

      const element = event.currentTarget;
      if (activePointerIdRef.current !== null) {
        try {
          element.releasePointerCapture(activePointerIdRef.current);
        } catch {
          // Ignore if the pointer capture was already released.
        } finally {
          activePointerIdRef.current = null;
        }
      }

      if (!isDraggingRef.current) {
        return;
      }

      cancelAnimationFrame(rafRef.current);
      isDraggingRef.current = false;
      delete getSlideWrapper(element)?.dataset.pulling;

      // Check velocity: close on quick downward flick even if distance < THRESHOLD
      const sample = velocitySampleRef.current;
      const dt = event.timeStamp - sample.time;
      const dy = event.clientY - sample.y;
      if (offsetRef.current >= THRESHOLD) {
        close();
        return;
      }

      if (dt > 0 && dy > 0) {
        const velocity = (dy / dt) * 1000;
        if (velocity > VELOCITY_THRESHOLD && offsetRef.current > 30) {
          close();
          return;
        }
      }

      reset(element);
    };

    const unsubscribePointerUp = subscribeSensors("onPointerUp", handlePointerEnd);
    const unsubscribePointerLeave = subscribeSensors("onPointerLeave", handlePointerEnd);
    const unsubscribePointerCancel = subscribeSensors("onPointerCancel", handlePointerEnd);

    // Cleanup on unmount or dependency change
    return () => {
      unsubscribeWheel();
      unsubscribePointerDown();
      unsubscribePointerMove();
      unsubscribePointerUp();
      unsubscribePointerLeave();
      unsubscribePointerCancel();
      cancelAnimationFrame(rafRef.current);
      activePointerIdRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [subscribeSensors, slideRect, close, enabled]);

  return null;
};
