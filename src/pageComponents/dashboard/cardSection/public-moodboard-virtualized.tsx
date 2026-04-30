import { useRouter } from "next/router";

import { useVirtualizer } from "@tanstack/react-virtual";

import type { SingleListData } from "../../../types/apiTypes";

import { useIsMobileView } from "../../../hooks/useIsMobileView";
import { useMounted } from "../../../hooks/useMounted";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { DISCOVER_URL } from "../../../utils/constants";
import { getColumnCount } from "../../../utils/helpers";
import { getCategorySlugFromRouter, getPublicPageInfo } from "../../../utils/url";
import {
  buildAuthenticatedPreviewUrl,
  buildPublicDiscoverPreviewUrl,
  buildPublicPreviewUrl,
} from "../../../utils/url-builders";

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

  // SSR + pre-hydration fallback: the virtualizer depends on a scroll element +
  // viewport dimensions that don't exist server-side, so its output ships
  // empty — crawlers would see no bookmark content. Render the same
  // lane-based column layout the old (pre-PR-#815) `PublicMoodboard` used, so
  // the SSR HTML carries real bookmark cards. After mount, the virtualizer
  // below takes over and the DOM swaps to the absolute-positioned layout.
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
 *
 * Reused by CanvasView as the click target for canvas-mode bookmarks.
 */
export function BookmarkCardOverlay({ bookmark }: { bookmark: SingleListData }) {
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
          return;
        }
        const categorySlug = getCategorySlugFromRouter(router);
        if (categorySlug !== DISCOVER_URL) {
          return;
        }
        const isPublicDiscover = router.asPath?.startsWith("/public/");
        const { as, pathname, query } = isPublicDiscover
          ? buildPublicDiscoverPreviewUrl({ bookmarkId: bookmark.id })
          : buildAuthenticatedPreviewUrl({ bookmarkId: bookmark.id, categorySlug });
        void router.push({ pathname, query }, as, { shallow: true });
      }}
    />
  );
}
