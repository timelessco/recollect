import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  AddBookmarkMinDataPayloadTypes,
  CategoriesData,
  PaginatedBookmarks,
  SingleListData,
} from "../../../types/apiTypes";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import useGetSortBy from "../../../hooks/useGetSortBy";
import { recentlyAddedUrls } from "../../../pageComponents/dashboard/cardSection/animatedBookmarkImage";
import { useLoadersStore, useSupabaseSession } from "../../../store/componentStore";
import {
  BOOKMARKS_COUNT_KEY,
  BOOKMARKS_KEY,
  CATEGORIES_KEY,
  DOCUMENTS_URL,
  IMAGES_URL,
  menuListItemName,
  PDF_MIME_TYPE,
  TWEETS_URL,
  URL_PDF_CHECK_PATTERN,
  VIDEOS_URL,
} from "../../../utils/constants";
import { handlePdfThumbnailAndUpload } from "../../../utils/file-upload";
import { checkIfUrlAnImage } from "../../../utils/helpers";
import { errorToast, successToast } from "../../../utils/toastMessages";
import { addBookmarkMinData, getMediaType } from "../../supabaseCrudHelpers";
import useAddBookmarkScreenshotMutation from "./useAddBookmarkScreenshotMutation";

// adds bookmark min data
export default function useAddBookmarkMinDataOptimisticMutation() {
  const session = useSupabaseSession((state) => state.session);

  const queryClient = useQueryClient();

  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  // We'll initialize the mutation with a default value and update it when we have the actual ID
  const { addBookmarkScreenshotMutation } = useAddBookmarkScreenshotMutation();
  const { sortBy } = useGetSortBy();
  const { addLoadingBookmarkId, removeLoadingBookmarkId, setIsBookmarkAdding } = useLoadersStore();

  const addBookmarkMinDataOptimisticMutation = useMutation<
    unknown,
    { previousData: PaginatedBookmarks },
    AddBookmarkMinDataPayloadTypes,
    { previousData: unknown; tempId: number }
  >({
    mutationKey: ["add-bookmark-min-data"],
    mutationFn: addBookmarkMinData,
    // If the mutation fails, use the context returned from onMutate to roll back
    onMutate: async (data) => {
      setIsBookmarkAdding(true);
      // Cancel only the current view's query (not all bookmark queries)
      await queryClient.cancelQueries({
        queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        BOOKMARKS_KEY,
        session?.user?.id,
        CATEGORY_ID,
        sortBy,
      ]);

      // Fetch category from cache to build addedCategories
      const allCategories =
        queryClient.getQueryData<{ data: CategoriesData[] }>([CATEGORIES_KEY, session?.user?.id])
          ?.data ?? [];

      const categoryEntry = allCategories.find((cat) => cat.id === data?.category_id);

      // Build addedCategories array (empty if category not in cache)
      const addedCategories = categoryEntry
        ? [
            {
              id: categoryEntry.id,
              category_name: categoryEntry.category_name,
              category_slug: categoryEntry.category_slug,
              icon: categoryEntry.icon,
              icon_color: categoryEntry.icon_color,
            },
          ]
        : [];

      // Negative temp ID prevents key={undefined} collisions in React lists
      // and gives each concurrent optimistic entry a unique key
      const tempId = -Date.now();

      // Optimistically update to the new value
      queryClient.setQueryData<PaginatedBookmarks>(
        [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
        (old) => {
          if (typeof old === "object") {
            return {
              ...old,
              pages: old?.pages?.map((page, index) => {
                if (index === 0) {
                  return [
                    {
                      id: tempId,
                      url: data?.url,
                      addedCategories,
                      addedTags: [],
                      description: "",
                      inserted_at: new Date().toISOString(),
                      make_discoverable: null,
                      meta_data: {},
                      ogImage: "",
                      screenshot: "",
                      title: "",
                      trash: null,
                      type: "",
                      user_id: {
                        id: session?.user?.id ?? "",
                        profile_pic: "",
                      },
                    },
                    ...page,
                  ];
                }

                return page;
              }),
            } as PaginatedBookmarks;
          }
        },
      );

      // Mark URL for animation — BookmarkImageWithAnimation consumes this
      // via recentlyAddedUrls.delete() on its first render.
      // Safe in onMutate (not in render body) for React concurrent mode.
      recentlyAddedUrls.add(data?.url);

      // Return a context object with the snapshotted value
      return { previousData, tempId };
    },
    onError: (_error, variables, context) => {
      queryClient.setQueryData(
        [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
        context?.previousData,
      );
      // Clean up animation tracking on failure
      recentlyAddedUrls.delete(variables.url);
    },
    onSettled: (apiResponse, error) => {
      setIsBookmarkAdding(false);

      // Always invalidate count
      void queryClient.invalidateQueries({
        queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
      });

      // Guard bookmarks invalidation — only when this is the last pending mutation.
      // Prevents concurrent rapid adds from stomping each other's optimistic entries.
      // Pattern: use-react-query-optimistic-mutation.ts:214-220
      if (queryClient.isMutating({ mutationKey: ["add-bookmark-min-data"] }) === 1) {
        void queryClient.invalidateQueries({
          queryKey: [BOOKMARKS_KEY, session?.user?.id],
        });
      }

      // On error or missing data, skip post-processing
      if (error) {
        return;
      }

      const response = apiResponse as { data: { data: SingleListData[] } };
      if (!response?.data?.data) {
        return;
      }

      const [data] = response.data.data;
      const url = data?.url;

      // Heavy processing (media check, PDF thumbnail, screenshot) runs as
      // fire-and-forget so it doesn't block the render cycle
      void (async () => {
        const isUrlOfMimeType = await checkIfUrlAnImage(url);
        if (isUrlOfMimeType) {
          return;
        }

        const mediaType = await getMediaType(url);
        // Audio URLs already have ogImage fallback set in add-bookmark-min-data
        if (mediaType?.includes("audio")) {
          return;
        }

        if (mediaType === PDF_MIME_TYPE || URL_PDF_CHECK_PATTERN.test(url)) {
          try {
            addLoadingBookmarkId(data.id);
            successToast("Generating thumbnail");
            await handlePdfThumbnailAndUpload({
              fileId: data.id,
              fileUrl: data.url,
              sessionUserId: session?.user?.id,
            });
          } catch {
            try {
              errorToast("retry thumbnail generation");
              await handlePdfThumbnailAndUpload({
                fileId: data.id,
                fileUrl: data.url,
                sessionUserId: session?.user?.id,
              });
            } catch (retryError) {
              console.error("PDF thumbnail upload failed after retry:", retryError);
              errorToast("thumbnail generation failed");
            }
          } finally {
            void queryClient.invalidateQueries({
              queryKey: [BOOKMARKS_KEY, session?.user?.id],
            });
            removeLoadingBookmarkId(data.id);
          }
          return;
        }

        if (data?.id) {
          addLoadingBookmarkId(data.id);
        }
        addBookmarkScreenshotMutation.mutate({ id: data.id, url: data.url });
      })();
    },
    onSuccess: (apiResponse, _variables, context) => {
      const response = apiResponse as { data: { data: SingleListData[] }; status: number };

      if (response?.data?.data?.[0]) {
        const [serverBookmark] = response.data.data;

        // Re-add URL for animation continuity across key change (temp → real id).
        // The remounted component consumes this via recentlyAddedUrls.delete().
        recentlyAddedUrls.add(serverBookmark.url);

        // Replace optimistic entry with real server data in a single synchronous
        // cache update — avoids the async refetch gap that causes flicker.
        queryClient.setQueryData<PaginatedBookmarks>(
          [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, sortBy],
          (old) => {
            if (!old) {
              return old;
            }
            return {
              ...old,
              pages: old.pages.map((page) =>
                page.map((bookmark) => {
                  if (bookmark.id === context?.tempId) {
                    return {
                      ...serverBookmark,
                      // Preserve optimistic addedCategories — server response
                      // doesn't include junction table data
                      addedCategories: bookmark.addedCategories,
                    } as SingleListData;
                  }
                  return bookmark;
                }),
              ),
            } as PaginatedBookmarks;
          },
        );
      }

      if (
        (CATEGORY_ID === VIDEOS_URL ||
          CATEGORY_ID === DOCUMENTS_URL ||
          CATEGORY_ID === TWEETS_URL ||
          CATEGORY_ID === IMAGES_URL) &&
        response?.status === 200
      ) {
        successToast(`This bookmark will be added to ${menuListItemName?.links}`);
      }
    },
  });

  return { addBookmarkMinDataOptimisticMutation };
}
