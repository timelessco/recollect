import { useRouter } from "next/router";
import { useCallback } from "react";

import find from "lodash/find";
import isNil from "lodash/isNil";
import isNull from "lodash/isNull";

import type { BookmarkViewDataTypes, ProfilesBookmarksView } from "../types/apiTypes";
import type {
  BookmarksSortByTypes,
  BookmarksViewTypes,
  BookmarkViewCategories,
} from "../types/componentStoreTypes";

import { useUpdateCategoryOptimisticMutation } from "../async/mutationHooks/category/use-update-category-optimistic-mutation";
import useUpdateSharedCategoriesOptimisticMutation from "../async/mutationHooks/share/useUpdateSharedCategoriesOptimisticMutation";
import useUpdateUserProfileOptimisticMutation from "../async/mutationHooks/user/use-update-user-profile-optimistic-mutation";
import useFetchCategories from "../async/queryHooks/category/useFetchCategories";
import useFetchSharedCategories from "../async/queryHooks/share/use-fetch-shared-categories";
import useFetchUserProfile from "../async/queryHooks/user/useFetchUserProfile";
import { useLoadersStore, useSupabaseSession } from "../store/componentStore";
import { mutationApiCall } from "../utils/apiHelpers";
import { getPageViewData, getPageViewKey } from "../utils/bookmarksViewKeyed";
import { EVERYTHING_URL } from "../utils/constants";
import { getCategorySlugFromRouter } from "../utils/url";
import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

function ensureCardContentView(
  value: BookmarksSortByTypes | BookmarksViewTypes | number[] | string[],
  existingViewData: BookmarkViewDataTypes["cardContentViewArray"],
): BookmarkViewDataTypes["cardContentViewArray"] {
  if (value === "moodboard" && !existingViewData?.includes("cover")) {
    return ["cover", ...existingViewData];
  }

  if (value === "card" && !existingViewData?.includes("cover")) {
    return ["cover", ...existingViewData];
  }

  if (value === "list" && !existingViewData?.includes("title")) {
    return ["title", ...existingViewData];
  }

  return existingViewData;
}

export function useBookmarksViewUpdate() {
  const router = useRouter();
  const categorySlug = getCategorySlugFromRouter(router);
  const session = useSupabaseSession((state) => state.session);
  const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

  const toggleIsSortByLoading = useLoadersStore((state) => state.toggleIsSortByLoading);

  const { allCategories } = useFetchCategories();
  const { sharedCategoriesData } = useFetchSharedCategories();
  const { userProfileData } = useFetchUserProfile();

  const { updateCategoryOptimisticMutation } = useUpdateCategoryOptimisticMutation();
  const { updateSharedCategoriesOptimisticMutation } =
    useUpdateSharedCategoriesOptimisticMutation();
  const { updateUserProfileOptimisticMutation } = useUpdateUserProfileOptimisticMutation();

  const setBookmarksView = useCallback(
    (
      value: BookmarksSortByTypes | BookmarksViewTypes | number[] | string[],
      type: BookmarkViewCategories,
    ) => {
      const currentCategory = find(allCategories?.data, (item) => item?.id === CATEGORY_ID);

      const isUserTheCategoryOwner = session?.user?.id === currentCategory?.user_id?.id;

      const updateFieldMap = {
        columns: "moodboardColumns",
        info: "cardContentViewArray",
        sort: "sortBy",
        view: "bookmarksView",
      } as const;

      const updateField = updateFieldMap[type];

      if (!updateField) {
        return;
      }

      if (updateField === "sortBy") {
        toggleIsSortByLoading();
      }

      if (currentCategory && typeof CATEGORY_ID === "number") {
        if (isUserTheCategoryOwner) {
          updateCategoryOptimisticMutation.mutate({
            category_id: CATEGORY_ID,
            updateData: {
              category_views: {
                ...currentCategory.category_views,
                cardContentViewArray: ensureCardContentView(
                  value,
                  currentCategory.category_views.cardContentViewArray,
                ),
                [updateField]: value,
              },
            },
          });
        } else {
          const sharedCategoriesId = find(
            sharedCategoriesData,
            (item) => item?.category_id === CATEGORY_ID,
          )?.id;

          if (sharedCategoriesId !== undefined) {
            const existingSharedCollectionViewsData = find(
              sharedCategoriesData,
              (item) => item?.id === sharedCategoriesId,
            );

            if (!isNil(existingSharedCollectionViewsData)) {
              void mutationApiCall(
                updateSharedCategoriesOptimisticMutation.mutateAsync({
                  id: sharedCategoriesId,
                  updateData: {
                    category_views: {
                      ...existingSharedCollectionViewsData?.category_views,
                      cardContentViewArray: ensureCardContentView(
                        value,
                        existingSharedCollectionViewsData?.category_views?.cardContentViewArray,
                      ),
                      [updateField]: value,
                    },
                  },
                }),
              );
            } else {
              console.error("existing share collab data is not present");
            }
          }
        }
      } else if (!isNull(userProfileData?.data) && !isNil(userProfileData)) {
        const raw = userProfileData.data[0]?.bookmarks_view;
        const pageKey = getPageViewKey(categorySlug);
        const defaultPageView: BookmarkViewDataTypes = {
          bookmarksView: "moodboard" satisfies BookmarksViewTypes,
          cardContentViewArray: ["cover", "title", "info"],
          moodboardColumns: [30],
          sortBy: "date-sort-ascending" as BookmarksSortByTypes,
        };
        const keyed: ProfilesBookmarksView =
          !raw || typeof raw !== "object" ? { [EVERYTHING_URL]: defaultPageView } : { ...raw };

        const pageView = getPageViewData(raw, pageKey) ?? defaultPageView;
        const updatedPageView: BookmarkViewDataTypes = {
          ...pageView,
          cardContentViewArray: ensureCardContentView(
            value,
            pageView.cardContentViewArray ?? defaultPageView.cardContentViewArray,
          ),
          [updateField]: value,
        };
        const nextKeyed: ProfilesBookmarksView = {
          ...keyed,
          [pageKey]: updatedPageView,
        };

        void mutationApiCall(
          updateUserProfileOptimisticMutation.mutateAsync({
            updateData: { bookmarks_view: nextKeyed },
          }),
        );
      } else {
        console.error("user profiles data is null");
      }
    },
    [
      CATEGORY_ID,
      allCategories?.data,
      categorySlug,
      session?.user?.id,
      sharedCategoriesData,
      toggleIsSortByLoading,
      updateCategoryOptimisticMutation,
      updateSharedCategoriesOptimisticMutation,
      updateUserProfileOptimisticMutation,
      userProfileData,
    ],
  );

  return { setBookmarksView };
}
