import { useMemo } from "react";
import type { ReactNode } from "react";

import type { SingleListData } from "@/types/apiTypes";

import { PAGINATION_LIMIT } from "@/utils/constants";

import { CANVAS_H, CANVAS_W, procPos } from "./canvas-position";
import { CanvasItem } from "./canvasItem";

interface CanvasViewProps {
  bookmarksList: SingleListData[];
  renderCard: (item: SingleListData) => ReactNode;
}

// Splits a flat list of bookmarks into chunks of PAGINATION_LIMIT (25).
// Each chunk is one canvas page.
function chunkBookmarks(list: SingleListData[]): SingleListData[][] {
  const chunks: SingleListData[][] = [];
  for (let i = 0; i < list.length; i += PAGINATION_LIMIT) {
    chunks.push(list.slice(i, i + PAGINATION_LIMIT));
  }
  return chunks;
}

const CanvasView = ({ bookmarksList, renderCard }: CanvasViewProps) => {
  const chunks = useMemo(() => chunkBookmarks(bookmarksList), [bookmarksList]);
  // Static rendering for now — show only the first chunk. Pan/zoom and page
  // transitions land in subsequent tasks.
  const firstChunk = chunks[0] ?? [];

  return (
    <div className="relative h-[calc(100vh-120px)] w-full overflow-hidden bg-gray-50">
      <div
        className="relative"
        style={{
          height: CANVAS_H,
          left: "50%",
          marginLeft: -CANVAS_W / 2,
          width: CANVAS_W,
        }}
      >
        {firstChunk.map((bookmark) => (
          <CanvasItem key={bookmark.id} position={procPos(bookmark.id)}>
            {renderCard(bookmark)}
          </CanvasItem>
        ))}
      </div>
    </div>
  );
};

export default CanvasView;
