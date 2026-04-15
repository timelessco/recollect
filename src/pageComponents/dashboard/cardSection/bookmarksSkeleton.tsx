/* oxlint-disable react/no-array-index-key */
import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { viewValues } from "../../../utils/constants";
import { getColumnCount } from "../../../utils/helpers";

// Deterministic heights to avoid hydration mismatches between server and client
const PRECOMPUTED_HEIGHTS = [
  330, 243, 691, 644, 514, 545, 408, 287, 450, 650, 332, 461, 483, 271, 726, 616, 404, 309, 586,
  552, 675, 252, 617, 614, 709, 309,
];

export const BookmarksSkeletonLoader = ({
  colCount,
  count = 26,
  type,
}: {
  colCount?: number;
  count?: number;
  type?: number[] | string | string[] | undefined;
}) => {
  const { isDesktop } = useIsMobileView();

  const skeletonHeights = Array.from({ length: count }, (_, index) => {
    const height = PRECOMPUTED_HEIGHTS[index % PRECOMPUTED_HEIGHTS.length];
    return height ?? 300;
  });
  const columnCount = getColumnCount(isDesktop, colCount);

  // List View Skeleton
  if (type === viewValues.list) {
    return (
      <div className="flex flex-col gap-4 px-2 py-2">
        {Array.from({ length: count }).map((_, index) => (
          <div className="flex items-center gap-3" key={`skeleton-list-${index}`}>
            <div className="h-12 w-20 shrink-0 animate-pulse rounded bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-1/5 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Timeline View Skeleton - Vertical column with fixed width and varying heights
  if (type === viewValues.timeline) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-[600px] space-y-6">
          {Array.from({ length: Math.min(count, 10) }).map((_, index) => (
            <div
              className="h-[500px] animate-pulse rounded-lg bg-gray-100"
              key={`skeleton-timeline-${index}`}
            />
          ))}
        </div>
      </div>
    );
  }

  const columns: number[][] = Array.from({ length: columnCount }, () => []);
  const columnHeights: number[] = Array.from({ length: columnCount }, () => 0);

  // Generate unique IDs for columns and items
  const columnKeys = Array.from({ length: columns.length }, (_, index) => `col-${index}`);

  // Card View Skeleton
  if (type === viewValues.card) {
    const itemsPerColumn = Math.ceil(count / columnCount);
    const fixedHeight = 200;

    return (
      <div className="flex gap-6">
        {Array.from({ length: columnCount }).map((_col, colIndex) => (
          <div className="flex flex-1 flex-col gap-6" key={columnKeys[colIndex]}>
            {Array.from({ length: itemsPerColumn }).map((_item, index) => (
              <div
                className="animate-pulse rounded-lg bg-gray-100"
                key={`skeleton-card-${colIndex}-${index}`}
                style={{
                  height: `${fixedHeight}px`,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default Moodboard View
  // Distribute items into columns
  for (const height of skeletonHeights) {
    const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
    columns[shortestColumnIndex].push(height);
    columnHeights[shortestColumnIndex] += height + 16;
  }

  return (
    <div className="flex gap-6">
      {columns.map((colh, colIndex) => (
        <div className="flex flex-1 flex-col gap-6" key={columnKeys[colIndex]}>
          {colh.map((height, index) => (
            <div
              className="animate-pulse rounded-lg bg-gray-100"
              key={`skeleton-moodboard-${colIndex}-${index}`}
              style={{
                height: `${height - 16}px`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
