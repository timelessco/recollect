import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { SingleListData } from "@/types/apiTypes";

import useFetchPaginatedBookmarks from "@/async/queryHooks/bookmarks/use-fetch-paginated-bookmarks";
import { PAGINATION_LIMIT } from "@/utils/constants";

import { CANVAS_H, CANVAS_W, procPos } from "./canvas-position";
import { CanvasItem } from "./canvasItem";
import { useCanvasCamera } from "./use-canvas-camera";

interface CanvasViewProps {
  bookmarksList: SingleListData[];
  renderCard: (item: SingleListData) => ReactNode;
}

const MIN_CAMERA_SCALE = 0.4;
const MAX_CAMERA_SCALE = 2;
const INITIAL_CAMERA_SCALE = 1;
const FADE_DURATION_S = 0.4;
// Transparent buffer added around the card-placement region so the camera
// has 50px of empty space at the canvas edges instead of cards flush to the limit.
const CANVAS_EDGE_BUFFER_PX = 50;

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

  const chunks = useMemo(() => chunkBookmarks(bookmarksList), [bookmarksList]);
  const [pageIndex, setPageIndex] = useState(0);
  const transformRef = useRef<null | ReactZoomPanPinchRef>(null);

  // Reset to page 0 whenever the source list changes (e.g. sort change,
  // category change). Without this, a high pageIndex from the prior list
  // can land out of range and render blank.
  useEffect(() => {
    setPageIndex(0);
  }, [bookmarksList]);

  const advance = useCallback(() => {
    setPageIndex((prev) => {
      const isLastLoadedChunk = prev + 1 >= chunks.length;
      if (isLastLoadedChunk) {
        if (hasNextPage) {
          void fetchNextPage();
          return prev + 1;
        }
        return prev;
      }
      return prev + 1;
    });
  }, [chunks.length, fetchNextPage, hasNextPage]);

  const retreat = useCallback(() => {
    setPageIndex((prev) => Math.max(0, prev - 1));
  }, []);

  // Prefetch optimization: when on the last loaded chunk and more is fetchable,
  // eagerly fetch BEFORE the user crosses the threshold so the next page is
  // ready when the cross-fade fires.
  useEffect(() => {
    const isOnLastLoadedChunk = pageIndex >= chunks.length - 1;
    if (isOnLastLoadedChunk && hasNextPage) {
      void fetchNextPage();
    }
  }, [chunks.length, fetchNextPage, hasNextPage, pageIndex]);

  const { report, releaseLock } = useCanvasCamera({
    onAdvance: advance,
    onRetreat: retreat,
  });

  // Camera reset is sequenced AFTER the cross-fade in finishes — this avoids
  // a visual snap during the page transition. Lock-release immediately follows
  // so the next zoom can fire.
  const resetCameraAndReleaseLock = useCallback(() => {
    transformRef.current?.setTransform(0, 0, INITIAL_CAMERA_SCALE);
    releaseLock();
  }, [releaseLock]);

  const currentChunk = chunks[pageIndex] ?? [];

  return (
    <div className="relative -mt-[47px] h-screen w-full overflow-hidden bg-gray-50">
      <TransformWrapper
        centerOnInit
        doubleClick={{ disabled: true }}
        initialScale={INITIAL_CAMERA_SCALE}
        limitToBounds
        maxScale={MAX_CAMERA_SCALE}
        minScale={MIN_CAMERA_SCALE}
        onInit={(ref) => {
          transformRef.current = ref;
        }}
        onTransform={(_ref: ReactZoomPanPinchRef, state: { scale: number }) => {
          report(state.scale);
        }}
        panning={{ velocityDisabled: false }}
        smooth
        wheel={{ step: 0.04 }}
      >
        <TransformComponent contentClass="!w-full !h-full" wrapperClass="!w-full !h-full">
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1 }}
              className="relative"
              exit={{ opacity: prefersReducedMotion ? 1 : 0 }}
              initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
              key={pageIndex}
              onAnimationComplete={(definition) => {
                // Only react to the fade-IN completion (opacity hits 1).
                // Fade-out (opacity 0 on exit) is the OLD page leaving — we
                // wait for the NEW page to be visible before re-arming.
                if (
                  typeof definition === "object" &&
                  definition !== null &&
                  "opacity" in definition &&
                  (definition as { opacity?: number }).opacity === 1
                ) {
                  resetCameraAndReleaseLock();
                }
              }}
              style={{
                height: CANVAS_H + CANVAS_EDGE_BUFFER_PX * 2,
                paddingLeft: CANVAS_EDGE_BUFFER_PX,
                paddingTop: CANVAS_EDGE_BUFFER_PX,
                width: CANVAS_W + CANVAS_EDGE_BUFFER_PX * 2,
              }}
              transition={{ duration: prefersReducedMotion ? 0 : FADE_DURATION_S }}
            >
              {currentChunk.map((bookmark) => (
                <CanvasItem key={bookmark.id} position={procPos(bookmark.id)}>
                  {renderCard(bookmark)}
                </CanvasItem>
              ))}
            </motion.div>
          </AnimatePresence>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

export default CanvasView;
