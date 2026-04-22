import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DraggableItemProps } from "react-aria";

import { useQueryClient } from "@tanstack/react-query";

import type { PaginatedBookmarks, SingleListData } from "../../types/apiTypes";

import { buildSearchCategorySegment } from "../../hooks/use-bookmark-mutation-context";
import { usePageContext } from "../../hooks/use-page-context";
import useGetCurrentCategoryId from "../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../hooks/useGetSortBy";
import { useMiscellaneousStore, useSupabaseSession } from "../../store/componentStore";
import { BOOKMARKS_KEY, DISCOVER_URL, EVERYTHING_URL } from "../../utils/constants";
import { getCategorySlugFromRouter, getPublicPageInfo } from "../../utils/url";
import {
  buildAuthenticatedCategoryUrl,
  buildPublicCategoryUrl,
  buildSimilarUrl,
} from "../../utils/url-builders";
import { useLightboxPrefetch } from "./hooks/useLightboxPrefetch";
import { CustomLightBox } from "./LightBox";

interface PreviewLightBoxProps {
  bookmarks?: SingleListData[];
  id: DraggableItemProps["key"] | null;
  open: boolean;
  setOpen: (value: boolean) => void;
}

export const PreviewLightBox = ({
  bookmarks: bookmarksProp,
  id,
  open,
  setOpen,
}: PreviewLightBoxProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSupabaseSession((state) => state.session);
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();
  const [activeIndex, setActiveIndex] = useState(-1);
  const { sortBy } = useGetSortBy();
  const searchText = useMiscellaneousStore((state) => state.searchText);

  const { isDiscoverPage, isPublicPage, isSimilarPage } = usePageContext();

  // Determine the correct query key based on whether we're on discover page
  let queryKey;
  if (isDiscoverPage) {
    queryKey = searchText
      ? [BOOKMARKS_KEY, session?.user?.id, DISCOVER_URL, searchText]
      : [BOOKMARKS_KEY, DISCOVER_URL];
  } else {
    queryKey = searchText
      ? [BOOKMARKS_KEY, session?.user?.id, buildSearchCategorySegment(CATEGORY_ID), searchText]
      : [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy];
  }

  // if there is text in searchbar we get the cache of searched data else we get from everything
  // Skip query cache lookup for public pages since bookmarks are provided via props
  const previousData = isPublicPage
    ? undefined
    : queryClient.getQueryData<PaginatedBookmarks>(queryKey);
  // Get and transform bookmarks from query cache or use provided bookmarks prop
  const bookmarks = useMemo(() => {
    // If bookmarks are provided as prop (e.g., for public pages), use them
    if (bookmarksProp) {
      return bookmarksProp;
    }

    // Otherwise, get from query cache (for logged-in users)
    return previousData?.pages?.flat() ?? [];
  }, [bookmarksProp, previousData?.pages]);

  // Prefetch next page when approaching the end of current data
  // For public pages, pass undefined pages to skip prefetching since all data is provided via props
  useLightboxPrefetch({
    activeIndex,
    bookmarksLength: bookmarks?.length ?? 0,
    open: open && !isPublicPage,
    pages: isPublicPage ? undefined : previousData?.pages,
  });

  // Only update activeIndex when the lightbox is being opened
  useEffect(() => {
    if (!bookmarks?.length) {
      return;
    }

    if (open) {
      const newIndex = bookmarks?.findIndex((bookmark) => String(bookmark?.id) === String(id));
      if (newIndex !== -1) {
        setActiveIndex(newIndex);
      }
    }
  }, [open, bookmarks, id]);

  // Handle close animation and cleanup
  const handleClose = useCallback(() => {
    setOpen(false);

    // Update URL to remove preview segment for both authenticated and public pages
    if (isPublicPage && !isDiscoverPage) {
      const publicInfo = getPublicPageInfo(router);
      if (publicInfo) {
        const { as, pathname, query } = buildPublicCategoryUrl(publicInfo);
        void router.push({ pathname, query }, as, { shallow: true });
      }
    } else if (isSimilarPage) {
      const sourceId = typeof router.query.id === "string" ? router.query.id : undefined;
      if (sourceId) {
        const { as, pathname, query } = buildSimilarUrl(sourceId);
        void router.push({ pathname, query }, as, { shallow: true });
      }
    } else {
      // Update URL without page reload for logged-in users
      const categorySlug = getCategorySlugFromRouter(router) ?? EVERYTHING_URL;
      const { as, pathname, query } = buildAuthenticatedCategoryUrl(categorySlug);
      void router.push({ pathname, query }, as, { shallow: true });
    }

    // Reset state after animation
    setActiveIndex(-1);
  }, [setOpen, router, isPublicPage, isDiscoverPage, isSimilarPage]);

  // Only render CustomLightBox when activeIndex is valid
  if (!open || activeIndex === -1) {
    return null;
  }

  return (
    <CustomLightBox
      activeIndex={activeIndex}
      bookmarks={bookmarks}
      handleClose={handleClose}
      isOpen={open}
      isPage
      setActiveIndex={setActiveIndex}
    />
  );
};
