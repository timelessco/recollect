import { useMemo } from "react";
import type { ReactNode } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import type { ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

import type { SingleListData } from "@/types/apiTypes";

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
  const chunks = useMemo(() => chunkBookmarks(bookmarksList), [bookmarksList]);
  const firstChunk = chunks[0] ?? [];

  const { report } = useCanvasCamera({
    onAdvance: () => {
      // Page swap lands in Task 7; for now just observe threshold crossings.
      console.log("[canvas-view] would advance to next page");
    },
    onRetreat: () => {
      console.log("[canvas-view] would retreat to previous page");
    },
  });

  return (
    <div className="relative h-[calc(100vh-120px)] w-full overflow-hidden bg-gray-50">
      <TransformWrapper
        doubleClick={{ disabled: true }}
        initialScale={INITIAL_CAMERA_SCALE}
        maxScale={MAX_CAMERA_SCALE}
        minScale={MIN_CAMERA_SCALE}
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
            {firstChunk.map((bookmark) => (
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
