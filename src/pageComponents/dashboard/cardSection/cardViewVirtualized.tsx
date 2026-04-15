import { useVirtualizer } from "@tanstack/react-virtual";

import type { SingleListData } from "../../../types/apiTypes";

import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { getColumnCount } from "../../../utils/helpers";

interface CardViewVirtualizedProps {
  bookmarksColumns: number[];
  bookmarksList: SingleListData[];
  getScrollElement: () => HTMLElement | null;
  renderOption: (index: number) => React.ReactNode;
}

export const CardViewVirtualized = ({
  bookmarksColumns,
  bookmarksList,
  getScrollElement,
  renderOption,
}: CardViewVirtualizedProps) => {
  const { isMobile, isTablet } = useIsMobileView();

  // Calculate lanes using the helper function
  const lanes = getColumnCount(!isMobile && !isTablet, bookmarksColumns[0]);

  // Calculate total rows
  const totalRows = Math.ceil(bookmarksList.length / lanes);

  // Row virtualizer
  const rowVirtualizer = useVirtualizer({
    count: totalRows,
    estimateSize: () => {
      const containerWidth =
        typeof document !== "undefined"
          ? (document.querySelector("#scrollableDiv")?.clientWidth ?? 1200)
          : 1200;

      const cardWidth = containerWidth / lanes;

      const aspectRatio = 4 / 3;
      const cardHeight = cardWidth * aspectRatio;

      return cardHeight + 42;
    },
    getScrollElement,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 5,
  });

  return (
    <div
      className="relative"
      style={{
        height: rowVirtualizer.getTotalSize(),
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const rowIndex = virtualRow.index;
        const startIndex = rowIndex * lanes;
        const endIndex = Math.min(startIndex + lanes, bookmarksList.length);
        const rowItems = bookmarksList.slice(startIndex, endIndex);
        const columnWidth = 100 / lanes;

        return (
          <div
            className="absolute top-0 left-0 flex w-full pb-10.5"
            data-index={rowIndex}
            key={virtualRow.key}
            ref={rowVirtualizer.measureElement}
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {rowItems.map((bookmark, itemIndex) => {
              const bookmarkIndex = startIndex + itemIndex;

              return (
                <div
                  className="pr-3 pl-3"
                  key={bookmark.id}
                  style={{
                    width: `${columnWidth}%`,
                  }}
                >
                  {renderOption(bookmarkIndex)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};
