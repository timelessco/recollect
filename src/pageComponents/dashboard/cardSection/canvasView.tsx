import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useDialKit } from "dialkit";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { GestureSource } from "./use-canvas-gesture";
import type { SingleListData } from "@/types/apiTypes";

import useFetchPaginatedBookmarks from "@/async/queryHooks/bookmarks/use-fetch-paginated-bookmarks";
import { emitClientEvent } from "@/lib/api-helpers/axiom-client-events";
import { useMiscellaneousStore } from "@/store/componentStore";
import { PAGINATION_LIMIT } from "@/utils/constants";

import { CANVAS_DEFAULT_TUNING, procPos } from "./canvas-position";
import { CanvasItem, STAGGER_PER_CARD_S } from "./canvasItem";
import { BookmarkCardOverlay } from "./public-moodboard-virtualized";
import { useCanvasGesture } from "./use-canvas-gesture";
import { useCanvasPan } from "./use-canvas-pan";

interface CanvasViewProps {
  bookmarksList: SingleListData[];
  renderCard: (item: SingleListData) => ReactNode;
}

// Page-transition duration. Exit and entry both run for this long; with
// AnimatePresence mode="wait" the total transition is 2× this value.
const TRANSITION_DURATION_S = 0.4;
// Cards fade in one-by-one after the wrapper enter completes. Each card's
// own opacity transition is `STAGGER_PER_CARD_S * index` long, capped by
// the page size; we use this to extend the gesture lock so the user can't
// fire another transition before the last card has appeared.
const STAGGER_TAIL_S = (PAGINATION_LIMIT - 1) * STAGGER_PER_CARD_S;
// Forward direction (advance): leaving cards subtly grow + dim; entering
// cards start slightly smaller + dim, settle to base.
const FORWARD_EXIT = { opacity: 0.7, scale: 1.04 };
const FORWARD_ENTRY_INITIAL = { opacity: 0.8, scale: 0.96 };
// Backward direction (retreat): leaving cards shrink + dim; entering
// cards start slightly larger + dim, settle to base.
const BACKWARD_EXIT = { opacity: 0.7, scale: 0.9 };
const BACKWARD_ENTRY_INITIAL = { opacity: 0.9, scale: 1.05 };
const VISIBLE = { opacity: 1, scale: 1 };

const noopCleanup = () => {
  /* noop — used as cleanup placeholder when an effect's setup short-circuits */
};

function chunkBookmarks(list: SingleListData[]): SingleListData[][] {
  const chunks: SingleListData[][] = [];
  for (let i = 0; i < list.length; i += PAGINATION_LIMIT) {
    chunks.push(list.slice(i, i + PAGINATION_LIMIT));
  }
  return chunks;
}

function resolveExitTarget({
  depthProgress,
  depthThreshold,
  prefersReducedMotion,
}: {
  depthProgress: number;
  depthThreshold: number;
  prefersReducedMotion: boolean;
}) {
  if (prefersReducedMotion) {
    return { opacity: 0 };
  }
  if (depthProgress >= depthThreshold) {
    return FORWARD_EXIT;
  }
  if (depthProgress <= -depthThreshold) {
    return BACKWARD_EXIT;
  }
  return { opacity: 0 };
}

function resolveInitialTarget({
  prefersReducedMotion,
  transitionDirection,
}: {
  prefersReducedMotion: boolean;
  transitionDirection: "backward" | "forward" | null;
}) {
  if (prefersReducedMotion) {
    return { opacity: 1 };
  }
  if (transitionDirection === "forward") {
    return FORWARD_ENTRY_INITIAL;
  }
  if (transitionDirection === "backward") {
    return BACKWARD_ENTRY_INITIAL;
  }
  return { opacity: 0 };
}

const CanvasView = ({ bookmarksList, renderCard }: CanvasViewProps) => {
  const prefersReducedMotion = useReducedMotion();
  const canvasControls = useDialKit("Canvas View", {
    depth: {
      baseScale: [CANVAS_DEFAULT_TUNING.baseScale, 0.5, 1.5, 0.01],
      defaultCameraZ: [CANVAS_DEFAULT_TUNING.defaultCameraZ, -400, 200, 1],
      depthScaleBoost: [CANVAS_DEFAULT_TUNING.depthScaleBoost, -0.25, 0.8, 0.01],
      pageTurnBuffer: [CANVAS_DEFAULT_TUNING.pageTurnBuffer, 0, 800, 1],
      perspective: [CANVAS_DEFAULT_TUNING.perspective, 700, 2800, 10],
      zSpread: [CANVAS_DEFAULT_TUNING.zSpread, 0, 800, 1],
    },
    input: {
      lightboxWheelCooldownMs: [CANVAS_DEFAULT_TUNING.lightboxWheelCooldownMs, 0, 1500, 25],
      panMaxX: [CANVAS_DEFAULT_TUNING.panMaxX, 0, 2, 0.01],
      panMaxY: [CANVAS_DEFAULT_TUNING.panMaxY, 0, 2, 0.01],
      scrollSensitivity: [CANVAS_DEFAULT_TUNING.scrollSensitivity, 0.1, 4, 0.05],
    },
    layout: {
      edgeMargin: [CANVAS_DEFAULT_TUNING.edgeMargin, 0, 0.24, 0.01],
      worldHeight: [CANVAS_DEFAULT_TUNING.worldHeight, 0.9, 2.4, 0.01],
      worldWidth: [CANVAS_DEFAULT_TUNING.worldWidth, 0.9, 2.6, 0.01],
    },
    placement: {
      gridAspect: [CANVAS_DEFAULT_TUNING.gridAspect, 0.65, 2.4, 0.01],
      jitterX: [CANVAS_DEFAULT_TUNING.jitterX, 0, 1, 0.01],
      jitterY: [CANVAS_DEFAULT_TUNING.jitterY, 0, 1, 0.01],
      parallaxMax: [CANVAS_DEFAULT_TUNING.parallaxMax, 0, 1.6, 0.01],
      parallaxMin: [CANVAS_DEFAULT_TUNING.parallaxMin, 0, 1.6, 0.01],
      ySkew: [CANVAS_DEFAULT_TUNING.ySkew, 0.35, 1.6, 0.01],
    },
  });

  // Live wrapper size — tracked here (instead of further down with the
  // other refs/state) so `tuning.cardBaseWidth` can derive from it.
  const [size, setSize] = useState({ height: 0, width: 0 });

  const tuning = {
    baseScale: canvasControls.depth.baseScale,
    // 10% of viewport width, capped at 190px. Falls back to the default
    // until the wrapper has measured (size.width = 0 on first render).
    cardBaseWidth:
      size.width > 0 ? Math.min(size.width * 0.1, 190) : CANVAS_DEFAULT_TUNING.cardBaseWidth,
    defaultCameraZ: canvasControls.depth.defaultCameraZ,
    depthScaleBoost: canvasControls.depth.depthScaleBoost,
    edgeMargin: canvasControls.layout.edgeMargin,
    gridAspect: canvasControls.placement.gridAspect,
    jitterX: canvasControls.placement.jitterX,
    jitterY: canvasControls.placement.jitterY,
    lightboxWheelCooldownMs: canvasControls.input.lightboxWheelCooldownMs,
    pageTurnBuffer: canvasControls.depth.pageTurnBuffer,
    panMaxX: canvasControls.input.panMaxX,
    panMaxY: canvasControls.input.panMaxY,
    parallaxMax: Math.max(
      canvasControls.placement.parallaxMax,
      canvasControls.placement.parallaxMin,
    ),
    parallaxMin: Math.min(
      canvasControls.placement.parallaxMin,
      canvasControls.placement.parallaxMax,
    ),
    perspective: canvasControls.depth.perspective,
    scrollSensitivity: canvasControls.input.scrollSensitivity,
    worldHeight: canvasControls.layout.worldHeight,
    worldWidth: canvasControls.layout.worldWidth,
    ySkew: canvasControls.placement.ySkew,
    zSpread: canvasControls.depth.zSpread,
  };

  // Subscribes to the same React Query cache CardSection's parent already uses,
  // so this is a free read — no extra fetch.
  const { fetchNextPage, hasNextPage } = useFetchPaginatedBookmarks();

  // Gates wheel/keyboard handlers — when the lightbox is open the dialog
  // sits on top, but wheel events still bubble to the canvas underneath
  // and would otherwise flip the page behind the modal.
  const isLightboxOpen = useMiscellaneousStore((state) => state.lightboxOpen);

  const chunks = useMemo(() => chunkBookmarks(bookmarksList), [bookmarksList]);
  const [pageIndex, setPageIndex] = useState(0);
  // Drives the wrapper's exit + entry animations. Set in `advance` /
  // `retreat`; persists across the transition so the entering page can
  // start from the matching end-state. Subsequent transitions overwrite.
  const [transitionDirection, setTransitionDirection] = useState<"backward" | "forward" | null>(
    null,
  );

  // Wrapper element holds the native wheel listener (React's synthetic
  // onWheel is passive, so preventDefault would no-op) and is observed
  // for resize so card positions stay anchored to viewport fractions.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lightboxWheelResumeAtRef = useRef(0);
  const wasLightboxOpenRef = useRef(false);

  // Keep the last non-empty chunk so a momentary empty page during a
  // prefetch race doesn't render an empty cross-fade target.
  const lastNonEmptyChunkRef = useRef<SingleListData[]>([]);

  // Reset to page 0 only on a meaningful list swap (category / sort /
  // search). Keying on the first item's id avoids resetting on
  // pagination appends — those return a new array reference but keep
  // the head intact. Without this distinction, every `fetchNextPage()`
  // would teleport the user back to page 1.
  const firstBookmarkId = bookmarksList[0]?.id;
  useEffect(() => {
    setPageIndex(0);
    // Category / sort / search swaps have no meaningful direction — drop the
    // last transition's tag so the next page mounts with the default fade.
    setTransitionDirection(null);
  }, [firstBookmarkId]);

  const advance = useCallback(
    (source: GestureSource) => {
      setTransitionDirection("forward");
      // Side effect lives inside the updater because React 18 queues
      // updaters and runs them during the next render — closure variables
      // mutated inside cannot be read synchronously after `setPageIndex`
      // returns. Hoisting `fetchNextPage` outside silently breaks pagination.
      // StrictMode-dev runs the updater twice; TanStack Query dedupes the
      // second `fetchNextPage` call onto the in-flight promise.
      setPageIndex((prev) => {
        const isLastLoadedChunk = prev + 1 >= chunks.length;
        if (isLastLoadedChunk) {
          if (!hasNextPage) {
            return prev;
          }
          void fetchNextPage();
        }
        return prev + 1;
      });
      emitClientEvent("canvas_page_flip", {
        direction: "advance",
        has_next_page: hasNextPage,
        source,
      });
    },
    [chunks.length, fetchNextPage, hasNextPage],
  );

  const retreat = useCallback(
    (source: GestureSource) => {
      setTransitionDirection("backward");
      setPageIndex((prev) => Math.max(0, prev - 1));
      emitClientEvent("canvas_page_flip", {
        direction: "retreat",
        has_next_page: hasNextPage,
        source,
      });
    },
    [hasNextPage],
  );

  // Catch-up prefetch: when `pageIndex` sits at (or past) the last loaded
  // chunk and more is fetchable, pull the next page. Bounded by `hasNextPage`
  // flipping false at end-of-deck, so it does not cascade. Without this,
  // a rapid double-advance during slow network leaves `pageIndex` ahead of
  // `chunks.length` with no follow-up fetch — `advance`'s call dedupes onto
  // the in-flight request, and once that one resolves nothing pulls the
  // page after it.
  useEffect(() => {
    if (pageIndex >= chunks.length - 1 && hasNextPage) {
      void fetchNextPage();
    }
  }, [chunks.length, fetchNextPage, hasNextPage, pageIndex]);

  // Lock duration covers exit + entry (`mode="wait"` runs them sequentially)
  // plus the per-card stagger tail and a grace window so a sustained
  // gesture can't chain-fire before the last card has finished its
  // fade-in.
  const safetyLockMs = (TRANSITION_DURATION_S * 2 + STAGGER_TAIL_S) * 1000 + 100;
  const depthThreshold = Math.max(1, tuning.zSpread + tuning.pageTurnBuffer);
  const { depthProgress, releaseLock, report, resetDepth, triggerAdvance, triggerRetreat } =
    useCanvasGesture({
      depthThreshold,
      onAdvance: advance,
      onRetreat: retreat,
      scrollSensitivity: tuning.scrollSensitivity,
      transitionLockMs: safetyLockMs,
    });
  // Scroll is tied 1:1 to camera Z so cards continuously grow as the user
  // scrolls forward. `defaultCameraZ` is the resting offset, so each new
  // page opens at that zoom level (negative = zoomed out). Page flip
  // fires when `depthProgress` crosses `depthThreshold` (= `zSpread +
  // pageTurnBuffer`) — measured as a delta from rest, so the gesture
  // budget is symmetric regardless of the offset.
  const cameraZ = depthProgress + tuning.defaultCameraZ;

  useEffect(() => {
    resetDepth(0);
  }, [firstBookmarkId, resetDepth]);

  useEffect(() => {
    if (wasLightboxOpenRef.current && !isLightboxOpen) {
      resetDepth(0);
      lightboxWheelResumeAtRef.current = performance.now() + tuning.lightboxWheelCooldownMs;
    }
    wasLightboxOpenRef.current = isLightboxOpen;
  }, [isLightboxOpen, resetDepth, tuning.lightboxWheelCooldownMs]);

  // Pan layer sits outside AnimatePresence so its CSS-var-driven offset
  // survives page flips. Bounds at half the wrapper so at least half the
  // canvas stays in view at any pan extent.
  const { isDragging, panHandlers, panLayerRef } = useCanvasPan({
    disabled: isLightboxOpen,
    maxX: size.width * tuning.panMaxX,
    maxY: size.height * tuning.panMaxY,
  });

  // ResizeObserver — keeps card positions in sync with the wrapper
  // size. Initial measurement also happens here on first paint.
  // Returns a no-op cleanup on the (vanishingly rare) ref-not-set path
  // to satisfy ESLint consistent-return without a useless undefined.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      return noopCleanup;
    }
    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (!entry) {
        return;
      }
      setSize({ height: entry.contentRect.height, width: entry.contentRect.width });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Native wheel listener — must be `passive: false` so we can call
  // preventDefault to suppress browser-level page zoom on trackpad
  // pinch (which fires wheel events with ctrlKey=true).
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) {
      return noopCleanup;
    }
    const handleWheel = (event: WheelEvent) => {
      if (isLightboxOpen || performance.now() < lightboxWheelResumeAtRef.current) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      // Inverted scroll: scrolling UP (deltaY < 0) advances/zooms in;
      // scrolling DOWN (deltaY > 0) retreats/zooms out. Trackpad pinch
      // (wheel + ctrlKey) keeps its natural mapping — pinch-out (deltaY < 0)
      // is also a zoom-in intent, so the same negation applies.
      const signed = -event.deltaY;
      report(signed);
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [isLightboxOpen, report]);

  // Release the gesture lock once the frame-fade + staggered card
  // entries have had time to play out. Reduced-motion users skip the
  // wait entirely.
  useEffect(() => {
    if (prefersReducedMotion) {
      releaseLock();
      return noopCleanup;
    }
    // Exit + entry both run for `TRANSITION_DURATION_S` under mode="wait",
    // and the cards stagger in for `STAGGER_TAIL_S` after the wrapper
    // entry settles.
    const transitionMs = (TRANSITION_DURATION_S * 2 + STAGGER_TAIL_S) * 1000 + 60;
    const timer = setTimeout(() => {
      releaseLock();
    }, transitionMs);
    return () => {
      clearTimeout(timer);
    };
  }, [pageIndex, prefersReducedMotion, releaseLock]);

  // Keyboard navigation. Window-scoped so users don't have to focus the
  // canvas first; gated on lightbox state so arrow keys inside the
  // lightbox don't flip the page underneath.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (isLightboxOpen) {
        return;
      }
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        triggerAdvance();
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        triggerRetreat();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [isLightboxOpen, triggerAdvance, triggerRetreat]);

  const currentChunk = chunks[pageIndex] ?? [];
  if (currentChunk.length > 0) {
    lastNonEmptyChunkRef.current = currentChunk;
  }
  const renderChunk = currentChunk.length > 0 ? currentChunk : lastNonEmptyChunkRef.current;

  const totalKnownPages = Math.max(1, chunks.length);
  const announcementKey = `canvas-page-announcement-${pageIndex}`;

  return (
    <div
      className={`relative h-[calc(100vh-47px)] w-full touch-none overflow-hidden focus:outline-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      ref={wrapperRef}
      {...panHandlers}
    >
      {/* aria-live announcer — visually hidden, screen reader only. */}
      <div aria-live="polite" className="sr-only" key={announcementKey} role="status">
        Page {pageIndex + 1} of {totalKnownPages}
      </div>
      {/* Owns `--pan-x/y` (per-frame from useCanvasPan); cards consume them.
          `perspective` enables the page-flip exit's translateZ to render
          as actual depth — without it, `z` is a no-op. */}
      <div
        className="absolute inset-0"
        ref={panLayerRef}
        style={{ perspective: tuning.perspective }}
      >
        {/* Direction-aware page transition on the wrapper.
            Forward (advance): exit zooms LARGER, entry mirrors from large.
            Backward (retreat): exit zooms SMALLER, entry mirrors from small.
            Exit direction is derived from `depthProgress` (which is at
            ±threshold at transition start — captured by AnimatePresence
            from the held element's last render). Entry direction reads
            from `transitionDirection` state, which persists across the
            transition. mode="wait" runs exit→entry sequentially. */}
        <AnimatePresence
          mode="wait"
          // Reset camera depth only after the old wrapper finishes its
          // exit animation. Doing it synchronously inside `report` would
          // snap cards to base mid-fade.
          onExitComplete={() => {
            resetDepth(0);
          }}
        >
          <motion.div
            animate={prefersReducedMotion ? { opacity: 1 } : VISIBLE}
            className="absolute inset-0"
            exit={resolveExitTarget({
              depthProgress,
              depthThreshold,
              prefersReducedMotion: Boolean(prefersReducedMotion),
            })}
            initial={resolveInitialTarget({
              prefersReducedMotion: Boolean(prefersReducedMotion),
              transitionDirection,
            })}
            key={pageIndex}
            // The wrapper carries the camera zoom. `preserve-3d` lets the
            // pan layer's perspective reach the cards. AnimatePresence
            // freezes the held element's last render so the exit's
            // starting transform comes from the at-threshold render.
            // `will-change` promotes the wrapper to its own composited
            // layer so the page-transition opacity/scale animation
            // composites cleanly instead of repainting on each frame.
            // `marginTop: -5vh` lifts the cards' optical center up so the
            // default zoomed-out view sits comfortably in the viewport.
            style={{
              marginTop: "-5vh",
              transformStyle: "preserve-3d",
              willChange: "transform, opacity",
              z: cameraZ,
            }}
            transition={{ duration: prefersReducedMotion ? 0 : TRANSITION_DURATION_S }}
          >
            {size.width > 0 &&
              size.height > 0 &&
              renderChunk.map((bookmark, index) => (
                <CanvasItem
                  key={bookmark.id}
                  position={procPos(bookmark.id, index, renderChunk.length, tuning)}
                  staggerIndex={index}
                  tuning={tuning}
                  wrapperHeight={size.height}
                  wrapperWidth={size.width}
                >
                  <BookmarkCardOverlay bookmark={bookmark} />
                  {renderCard(bookmark)}
                </CanvasItem>
              ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CanvasView;
