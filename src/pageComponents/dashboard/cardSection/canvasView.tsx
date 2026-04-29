import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

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

function chunkBookmarks(list: SingleListData[]): SingleListData[][] {
  const chunks: SingleListData[][] = [];
  for (let i = 0; i < list.length; i += PAGINATION_LIMIT) {
    chunks.push(list.slice(i, i + PAGINATION_LIMIT));
  }
  return chunks;
}

const CanvasView = ({ bookmarksList, renderCard }: CanvasViewProps) => {
  // Subscribes to the same React Query cache CardSection's parent already uses,
  // so this is a free read — no extra fetch.
  const { fetchNextPage, hasNextPage } = useFetchPaginatedBookmarks();

  const chunks = useMemo(() => chunkBookmarks(bookmarksList), [bookmarksList]);
  const [pageIndex, setPageIndex] = useState(0);
  const transformRef = useRef<null | ReactZoomPanPinchRef>(null);

  const resetCamera = useCallback(() => {
    transformRef.current?.setTransform(0, 0, INITIAL_CAMERA_SCALE);
  }, []);

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
    resetCamera();
  }, [chunks.length, fetchNextPage, hasNextPage, resetCamera]);

  const retreat = useCallback(() => {
    setPageIndex((prev) => Math.max(0, prev - 1));
    resetCamera();
  }, [resetCamera]);

  // Prefetch optimization: when on the last loaded chunk and more is fetchable,
  // eagerly fetch BEFORE the user crosses the threshold so the next page is
  // ready when the cross-fade fires.
  useEffect(() => {
    const isOnLastLoadedChunk = pageIndex >= chunks.length - 1;
    if (isOnLastLoadedChunk && hasNextPage) {
      void fetchNextPage();
    }
  }, [chunks.length, fetchNextPage, hasNextPage, pageIndex]);

  const { report } = useCanvasCamera({
    onAdvance: advance,
    onRetreat: retreat,
  });

  const currentChunk = chunks[pageIndex] ?? [];

  return (
    <div className="relative h-[calc(100vh-120px)] w-full overflow-hidden bg-gray-50">
      <TransformWrapper
        doubleClick={{ disabled: true }}
        initialScale={INITIAL_CAMERA_SCALE}
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
        wheel={{ step: 0.1 }}
      >
        <TransformComponent contentClass="!w-full !h-full" wrapperClass="!w-full !h-full">
          <div
            className="relative"
            style={{
              height: CANVAS_H,
              width: CANVAS_W,
            }}
          >
            {currentChunk.map((bookmark) => (
              <CanvasItem key={bookmark.id} position={procPos(bookmark.id)}>
                {renderCard(bookmark)}
              </CanvasItem>
            ))}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

export default CanvasView;
