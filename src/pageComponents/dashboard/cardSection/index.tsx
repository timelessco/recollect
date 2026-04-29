import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/router";
import { useCallback, useEffect } from "react";
import { Item } from "react-stately";

import { useQueryClient } from "@tanstack/react-query";
import { find, flatten, isEmpty } from "lodash";

import type {
  BookmarkViewDataTypes,
  PaginatedBookmarks,
  SingleListData,
} from "../../../types/apiTypes";
import type { BookmarksViewTypes } from "../../../types/componentStoreTypes";
import type { Many } from "lodash";

import { buildSearchCategorySegment } from "@/hooks/use-bookmark-mutation-context";
import { usePageContext } from "@/hooks/use-page-context";
import { cn } from "@/utils/tailwind-merge";

import loaderGif from "../../../../public/loader-gif.gif";
import useFetchBookmarksCount from "../../../async/queryHooks/bookmarks/use-fetch-bookmarks-count";
import useFetchCategories from "../../../async/queryHooks/category/use-fetch-categories";
import useFetchUserProfile from "../../../async/queryHooks/user/use-fetch-user-profile";
import { PreviewLightBox } from "../../../components/lightbox/previewLightBox";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetViewValue from "../../../hooks/useGetViewValue";
import {
  useLoadersStore,
  useMiscellaneousStore,
  useSupabaseSession,
} from "../../../store/componentStore";
import { BOOKMARKS_KEY, PREVIEW_ALT_TEXT, TWEETS_URL, viewValues } from "../../../utils/constants";
import { getImgForPost, usePreferredDomainsSet } from "../../../utils/getBookmarkImageSource";
import { getBookmarkCountForCurrentPage, getPreviewPathInfo } from "../../../utils/helpers";
import { BookmarkCard } from "./bookmarkCard";
import { BookmarksSkeletonLoader } from "./bookmarksSkeleton";
import ListBox from "./listBox";
import { PublicMoodboardVirtualized } from "./public-moodboard-virtualized";

// Dynamic import keeps react-zoom-pan-pinch out of the bundle until canvas
// view is selected. CardSection itself is already client-only via next/dynamic
// from bookmarkCards.tsx, so ssr:false is for the lib's window access at module load.
const CanvasView = dynamic(() => import("./canvasView"), { ssr: false });

export interface CardSectionProps {
  categoryViewsFromProps?: BookmarkViewDataTypes;
  flattendPaginationBookmarkData?: SingleListData[];
  /**
   * When true, use discover layout (e.g. top margin) so SSR and client match without relying on router.
   */
  isDiscoverPage?: boolean;
  isLoading?: boolean;
  isPublicPage?: boolean;
  listData: SingleListData[];
  onDeleteClick?: (post: SingleListData[]) => void;
  onMoveOutOfTrashClick?: (post: SingleListData) => void;
}

const renderStatusMessage = (message: string) => (
  <div className="flex w-full items-center justify-center text-center">
    <p className="text-lg font-medium text-gray-600">{message}</p>
  </div>
);

const CardSection = ({
  categoryViewsFromProps,
  flattendPaginationBookmarkData = [],
  isDiscoverPage = false,
  isLoading = false,
  isPublicPage = false,
  listData = [],
  onDeleteClick,
  onMoveOutOfTrashClick,
}: CardSectionProps) => {
  const router = useRouter();
  const userId = useSupabaseSession((state) => state.session)?.user?.id ?? "";
  const { category_id: categoryId } = useGetCurrentCategoryId();
  const { isLoading: isLoadingProfile } = useFetchUserProfile();
  const { allCategories } = useFetchCategories();
  const { bookmarksCountData } = useFetchBookmarksCount();

  const { categorySlug, isSimilarPage } = usePageContext();
  const preferredDomainsSet = usePreferredDomainsSet();

  const showAvatar =
    !isPublicPage &&
    (find(allCategories, (item) => item?.category_slug === categorySlug)?.collabData?.length ?? 0) >
      1;
  const isBookmarkLoading = useLoadersStore((state) => state.isBookmarkAdding);
  const { lightboxId, lightboxOpen, setLightboxId, setLightboxOpen } = useMiscellaneousStore();
  // Handle route changes for lightbox
  useEffect(() => {
    const { isPreviewPath, previewId } = getPreviewPathInfo(router?.asPath, PREVIEW_ALT_TEXT);

    if (isPreviewPath && previewId) {
      // Only update if the ID has changed
      setLightboxId(previewId);

      if (!lightboxOpen) {
        setLightboxOpen(true);
      }
    } else if (lightboxOpen) {
      setLightboxOpen(false);
      setLightboxId(null);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [router?.asPath]);

  const queryClient = useQueryClient();
  const searchText = useMiscellaneousStore((state) => state.searchText);
  const setCurrentBookmarkView = useMiscellaneousStore((state) => state.setCurrentBookmarkView);

  const isSearchLoading = useLoadersStore((state) => state.isSearchLoading);
  // gets from the trigram search api
  const searchBookmarksData = queryClient.getQueryData<PaginatedBookmarks>([
    BOOKMARKS_KEY,
    userId,
    buildSearchCategorySegment(categoryId),
    searchText,
  ]);

  const bookmarksList =
    isPublicPage || isEmpty(searchText) ? listData : (searchBookmarksData?.pages?.flat() ?? []);

  const bookmarksColumns = flatten([
    useGetViewValue("moodboardColumns", [10], isPublicPage, categoryViewsFromProps) as Many<
      string | undefined
    >,
  ]) as unknown as number[];

  const cardTypeCondition = useGetViewValue(
    "bookmarksView",
    "",
    isPublicPage,
    categoryViewsFromProps,
  );

  useEffect(() => {
    if (!isEmpty(cardTypeCondition)) {
      setCurrentBookmarkView(cardTypeCondition as BookmarksViewTypes);
    }
  }, [cardTypeCondition, setCurrentBookmarkView]);

  const renderCard = useCallback(
    (item: SingleListData) => (
      <BookmarkCard
        categoryViewsFromProps={categoryViewsFromProps}
        img={getImgForPost(item, preferredDomainsSet)}
        isDiscoverPage={isDiscoverPage}
        isPublicPage={isPublicPage}
        onDeleteClick={onDeleteClick}
        onMoveOutOfTrashClick={onMoveOutOfTrashClick}
        post={item}
        showAvatar={showAvatar}
      />
    ),
    [
      categoryViewsFromProps,
      isDiscoverPage,
      isPublicPage,
      onDeleteClick,
      onMoveOutOfTrashClick,
      preferredDomainsSet,
      showAvatar,
    ],
  );

  const listWrapperClass = cn({
    "mt-[47px]": !isPublicPage || (isDiscoverPage && Boolean(userId)),
    "px-3 py-2":
      cardTypeCondition === viewValues.moodboard || cardTypeCondition === viewValues.card,

    "px-4 py-2": cardTypeCondition === viewValues.list || cardTypeCondition === viewValues.timeline,
  });

  const renderItem = () => {
    if (isLoadingProfile) {
      return (
        <div className="absolute inset-0 flex items-center justify-center dark:brightness-0 dark:invert">
          <Image
            alt="loader"
            className="h-12 w-12"
            loader={(source: { src: string }) => source.src}
            src={loaderGif}
          />
        </div>
      );
    }

    if (isLoading) {
      return (
        <BookmarksSkeletonLoader
          colCount={bookmarksColumns?.[0]}
          count={getBookmarkCountForCurrentPage(bookmarksCountData ?? undefined, categoryId)}
          type={cardTypeCondition}
        />
      );
    }

    if (isEmpty(bookmarksList) && categorySlug === TWEETS_URL) {
      return (
        <div className="p-6 text-center">
          Please install the Recollect extension to import all your tweets
        </div>
      );
    }

    // Only show "No results found" if we have search text, no results, and we're not loading anything
    if (
      !isEmpty(searchText) &&
      isEmpty(bookmarksList) &&
      !isSearchLoading &&
      !isBookmarkLoading &&
      searchBookmarksData?.pages?.length === 0
    ) {
      return renderStatusMessage("No results found");
    }

    if (cardTypeCondition === viewValues.canvas) {
      return <CanvasView bookmarksList={bookmarksList} renderCard={renderCard} />;
    }

    // Public page (and discover): use virtualized grid
    if (isPublicPage) {
      return (
        <PublicMoodboardVirtualized
          bookmarksColumns={bookmarksColumns}
          bookmarksList={bookmarksList}
          renderCard={renderCard}
        />
      );
    }

    return (
      <ListBox
        aria-label="Categories"
        bookmarksColumns={bookmarksColumns}
        bookmarksList={bookmarksList}
        cardTypeCondition={cardTypeCondition}
        flattendPaginationBookmarkData={flattendPaginationBookmarkData}
        isPublicPage={isPublicPage}
        selectionMode="multiple"
      >
        {bookmarksList?.map((item) => (
          <Item key={item?.id} textValue={item?.id?.toString()}>
            {renderCard(item)}
          </Item>
        ))}
      </ListBox>
    );
  };

  return (
    <>
      <div className={listWrapperClass}>{renderItem()}</div>
      <PreviewLightBox
        bookmarks={isPublicPage || isSimilarPage ? bookmarksList : undefined}
        id={lightboxId}
        open={lightboxOpen}
        setOpen={setLightboxOpen}
      />
    </>
  );
};

export default CardSection;
