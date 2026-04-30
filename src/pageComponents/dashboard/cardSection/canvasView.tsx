import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { GestureSource } from "./use-canvas-gesture";
import type { SingleListData } from "@/types/apiTypes";

import useFetchPaginatedBookmarks from "@/async/queryHooks/bookmarks/use-fetch-paginated-bookmarks";
import { emitClientEvent } from "@/lib/api-helpers/axiom-client-events";
import { useMiscellaneousStore } from "@/store/componentStore";
import { PAGINATION_LIMIT } from "@/utils/constants";

import { procPos } from "./canvas-position";
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
      let didAdvance = false;
      let nextIndex = 0;
      setPageIndex((prev) => {
        const isLastLoadedChunk = prev + 1 >= chunks.length;
        if (isLastLoadedChunk) {
          if (hasNextPage) {
            void fetchNextPage();
            didAdvance = true;
            nextIndex = prev + 1;
            return nextIndex;
          }
          return prev;
        }
        didAdvance = true;
        nextIndex = prev + 1;
        return nextIndex;
      });
      if (didAdvance) {
        emitClientEvent("canvas_page_flip", {
          direction: "advance",
          has_next_page: hasNextPage,
          page_index: nextIndex,
          source,
        });
      }
    },
    [chunks.length, fetchNextPage, hasNextPage],
  );

  const retreat = useCallback(
    (source: GestureSource) => {
      let didRetreat = false;
      let nextIndex = 0;
      setPageIndex((prev) => {
        if (prev === 0) {
          return prev;
        }
        didRetreat = true;
        nextIndex = prev - 1;
        return nextIndex;
      });
      if (didRetreat) {
        emitClientEvent("canvas_page_flip", {
          direction: "retreat",
          has_next_page: hasNextPage,
          page_index: nextIndex,
          source,
        });
      }
    },
    [hasNextPage],
  );

  // Prefetch optimization: when on the last loaded chunk and more is
  // fetchable, eagerly fetch BEFORE the user crosses the threshold so
  // the next page is ready when the cross-fade fires.
  useEffect(() => {
    const isOnLastLoadedChunk = pageIndex >= chunks.length - 1;
    if (isOnLastLoadedChunk && hasNextPage) {
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
  const { report, releaseLock, triggerAdvance, triggerRetreat } = useCanvasGesture({
    onAdvance: advance,
    onRetreat: retreat,
    transitionLockMs: safetyLockMs,
  });

  // Pan layer sits outside AnimatePresence so its CSS-var-driven offset
  // survives page flips. Bounds at half the wrapper so at least half the
  // canvas stays in view at any pan extent.
  const { isDragging, panHandlers, panLayerRef } = useCanvasPan({
    disabled: isLightboxOpen,
    maxX: size.width / 2,
    maxY: size.height / 2,
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
      if (isLightboxOpen) {
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
      <div className="absolute inset-0" ref={panLayerRef} style={{ perspective: "1500px" }}>
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
                  key={bookmark.id}
                  position={procPos(bookmark.id, index, renderChunk.length)}
                  staggerIndex={index}
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
