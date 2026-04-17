import { useRouter } from "next/router";

import { useVirtualizer } from "@tanstack/react-virtual";

import type { SingleListData } from "../../../types/apiTypes";

import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { useMounted } from "../../../hooks/useMounted";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { DISCOVER_URL } from "../../../utils/constants";
import { getColumnCount } from "../../../utils/helpers";
import { getCategorySlugFromRouter, getPublicPageInfo } from "../../../utils/url";
import { buildAuthenticatedPreviewUrl, buildPublicPreviewUrl } from "../../../utils/url-builders";

interface PublicMoodboardVirtualizedProps {
  bookmarksColumns: number[];
  bookmarksList: SingleListData[];
  renderCard: (bookmark: SingleListData) => React.ReactNode;
}
export const PublicMoodboardVirtualized = ({
  bookmarksColumns,
  bookmarksList,
  renderCard,
}: PublicMoodboardVirtualizedProps) => {
  const mounted = useMounted();
  const { isMobile, isTablet } = useIsMobileView();

  const lanes = getColumnCount(mounted ? !isMobile && !isTablet : true, bookmarksColumns[0]);

  const rowVirtualizer = useVirtualizer({
    count: bookmarksList.length,
    estimateSize: () => {
      const containerWidth =
        typeof document !== "undefined"
          ? (document.querySelector("#scrollableDiv")?.clientWidth ?? 1200)
          : 1200;
      const cardWidth = containerWidth / lanes;
      return cardWidth * (4 / 3);
    },
    getScrollElement,
    lanes,
    measureElement: (element) => element.getBoundingClientRect().height,
    overscan: 5,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // SSR + pre-hydration fallback: the virtualizer relies on a scroll element +
  // viewport dimensions that don't exist on the server, so its output ships
  // empty. Render a simple column-based grid instead so guest /discover HTML
  // contains indexable bookmark content for crawlers. After mount, the
  // virtualizer takes over below and the DOM swaps to absolute positioning.
  // Mirrors the pre-regression `PublicMoodboard` (removed in PR #815, commit
  // dccf0582, "replace PublicMoodboard with virtualized version for improved
  // performance" — reintroduced here as a mount-gated fallback so we keep
  // virtualization post-hydration).
  if (!mounted) {
    const columns = Array.from({ length: lanes }, (_, col) =>
      bookmarksList.map((_bookmark, idx) => idx).filter((idx) => idx % lanes === col),
    );

    return (
      <div className="relative flex w-full">
        {columns.map((indices, colIndex) => (
          <div
            className="min-w-0 flex-1 pr-3 pl-3"
            key={
              indices[0] !== undefined
                ? (bookmarksList[indices[0]]?.id ?? indices[0])
                : `moodboard-col-${colIndex}`
            }
          >
            {indices.map((idx) => {
              const bookmark = bookmarksList[idx];
              if (!bookmark) {
                return null;
              }

              return (
                <div
                  className="group relative mb-6 flex rounded-lg outline-hidden duration-150 hover:shadow-lg"
                  key={bookmark.id}
                >
                  <BookmarkCardOverlay bookmark={bookmark} />
                  {renderCard(bookmark)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
      {virtualItems.map((virtualRow) => {
        const bookmark = bookmarksList[virtualRow.index];
        if (!bookmark) {
          return null;
        }

        const columnWidth = 100 / lanes;

        return (
          <div
            className="absolute top-0 pr-3 pb-6 pl-3"
            data-index={virtualRow.index}
            key={bookmark.id}
            ref={rowVirtualizer.measureElement}
            style={{
              left: `${virtualRow.lane * columnWidth}%`,
              transform: `translateY(${virtualRow.start}px)`,
              width: `${columnWidth}%`,
            }}
          >
            <div className="group relative mb-6 flex rounded-lg outline-hidden duration-150 hover:shadow-lg">
              <BookmarkCardOverlay bookmark={bookmark} />
              {renderCard(bookmark)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const getScrollElement = (): HTMLElement | null => {
  if (typeof document === "undefined") {
    return null;
  }

  return document.querySelector("#scrollableDiv");
};

/**
 * Overlay anchor — owns router + lightbox store so route changes
 * only re-render this small component, not the whole virtualizer.
 */
function BookmarkCardOverlay({ bookmark }: { bookmark: SingleListData }) {
  const router = useRouter();
  const { setLightboxId, setLightboxOpen } = useMiscellaneousStore();

  return (
    <a
      aria-label={bookmark.title ?? "Open bookmark"}
      className="absolute inset-0 top-0 left-0 z-10 cursor-pointer rounded-lg"
      href={bookmark.url ?? "#"}
      onClick={(event) => {
        event.preventDefault();
        setLightboxId(String(bookmark.id));
        setLightboxOpen(true);
        const publicInfo = getPublicPageInfo(router);
        if (publicInfo) {
          const { as, pathname, query } = buildPublicPreviewUrl({
            bookmarkId: bookmark.id,
            publicInfo,
          });
          void router.push({ pathname, query }, as, { shallow: true });
        } else {
          const categorySlug = getCategorySlugFromRouter(router);
          if (categorySlug === DISCOVER_URL) {
            const { as, pathname, query } = buildAuthenticatedPreviewUrl({
              bookmarkId: bookmark.id,
              categorySlug,
            });
            void router.push({ pathname, query }, as, { shallow: true });
          }
        }
      }}
    />
  );
}
