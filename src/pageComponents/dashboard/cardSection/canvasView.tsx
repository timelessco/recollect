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

// Frame fade-out duration when the page changes — the whole canvas
// briefly goes to white before the new cards stagger in.
const FRAME_FADE_OUT_S = 0.22;
// Total transition span: frame fade-out + every card's stagger delay
// + the slowest card's enter duration. Used to keep the gesture lock
// held until the new page is fully settled.
const ENTER_DURATION_S = 0.32;

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

const CanvasView = ({ bookmarksList, renderCard }: CanvasViewProps) => {
  const prefersReducedMotion = useReducedMotion();
  const canvasControls = useDialKit("Canvas View", {
    depth: {
      baseScale: [CANVAS_DEFAULT_TUNING.baseScale, 0.5, 1.5, 0.01],
      cameraZoomZ: [CANVAS_DEFAULT_TUNING.cameraZoomZ, 0, 500, 1],
      depthScaleBoost: [CANVAS_DEFAULT_TUNING.depthScaleBoost, -0.25, 0.8, 0.01],
      pageTurnBuffer: [CANVAS_DEFAULT_TUNING.pageTurnBuffer, 0, 400, 1],
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
      cardBaseWidth: [CANVAS_DEFAULT_TUNING.cardBaseWidth, 140, 300, 1],
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
  const tuning = {
    baseScale: canvasControls.depth.baseScale,
    cameraZoomZ: canvasControls.depth.cameraZoomZ,
    cardBaseWidth: canvasControls.layout.cardBaseWidth,
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

  // Wrapper element holds the native wheel listener (React's synthetic
  // onWheel is passive, so preventDefault would no-op) and is observed
  // for resize so card positions stay anchored to viewport fractions.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ height: 0, width: 0 });
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
  }, [firstBookmarkId]);

  const advance = useCallback(
    (source: GestureSource) => {
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

  // Lock duration generously covers the worst-case stagger so a user
  // who keeps scrolling can't queue another advance before the prior
  // page has finished rendering.
  const safetyLockMs =
    FRAME_FADE_OUT_S * 1000 +
    PAGINATION_LIMIT * STAGGER_PER_CARD_S * 1000 +
    ENTER_DURATION_S * 1000 +
    200;
  const depthThreshold = Math.max(1, tuning.zSpread + tuning.pageTurnBuffer);
  const { depthProgress, releaseLock, report, resetDepth, triggerAdvance, triggerRetreat } =
    useCanvasGesture({
      depthThreshold,
      onAdvance: advance,
      onRetreat: retreat,
      scrollSensitivity: tuning.scrollSensitivity,
      transitionLockMs: safetyLockMs,
    });
  const cameraProgress = Math.min(1, depthProgress / depthThreshold);
  const cameraZ = cameraProgress * tuning.cameraZoomZ;

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
      // Trackpad pinch fires wheel + ctrlKey: deltaY < 0 → pinch out
      // (zoom-in intent → advance), deltaY > 0 → pinch in (retreat).
      // Mouse wheel: deltaY > 0 → scroll down → advance. Inverting
      // sign for ctrlKey aligns "forward intent" across both inputs.
      const signed = event.ctrlKey ? -event.deltaY : event.deltaY;
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
    const chunkLength = (chunks[pageIndex] ?? []).length;
    const transitionMs =
      FRAME_FADE_OUT_S * 1000 +
      Math.max(0, chunkLength - 1) * STAGGER_PER_CARD_S * 1000 +
      ENTER_DURATION_S * 1000 +
      60;
    const timer = setTimeout(() => {
      releaseLock();
    }, transitionMs);
    return () => {
      clearTimeout(timer);
    };
  }, [chunks, pageIndex, prefersReducedMotion, releaseLock]);

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
        {/* Page transition: the wrapper motion.div fades the entire
            frame to white on exit; the cards inside each fade IN with a
            per-index stagger so they pop in one by one. mode="wait"
            ensures the old frame is gone before the new one mounts. */}
        <AnimatePresence mode="wait">
          <motion.div
            className="absolute inset-0"
            exit={{
              opacity: prefersReducedMotion ? 1 : 0,
              // Subtle forward push — cards drift slightly toward the
              // camera as they fade, matching the calm of the entry's
              // opacity-only animation.
              z: prefersReducedMotion ? 0 : 40,
            }}
            key={pageIndex}
            transition={{ duration: prefersReducedMotion ? 0 : FRAME_FADE_OUT_S }}
          >
            {size.width > 0 &&
              size.height > 0 &&
              renderChunk.map((bookmark, index) => (
                <CanvasItem
                  cameraZ={cameraZ}
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
