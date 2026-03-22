import { useRouter } from "next/router";

import { useQueryClient } from "@tanstack/react-query";
import { find, isEmpty } from "lodash";

import type {
  BookmarkViewDataTypes,
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
} from "../types/apiTypes";

import { getPageViewData, getPageViewKey } from "@/utils/bookmarksViewKeyed";

import { useSupabaseSession } from "../store/componentStore";
import { CATEGORIES_KEY, SHARED_CATEGORIES_TABLE_NAME, USER_PROFILE } from "../utils/constants";
import { isUserInACategory } from "../utils/helpers";
import { getCategorySlugFromRouter } from "../utils/url";

// gets the card views for the user , like moodboard, list ....
const useGetViewValue = (
  viewType: "bookmarksView" | "cardContentViewArray" | "moodboardColumns",
  defaultReturnValue: [] | [number] | string,
  isPublicPage = false,
  categoryViewsFromProps?: BookmarkViewDataTypes,
) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  // cat_id refers to cat slug here as it's got from url
  const categorySlug = getCategorySlugFromRouter(router);

  const userData = useSupabaseSession((state) => state.session);

  const userId = userData?.user?.id;
  const userEmail = userData?.user?.email;

  const categoryData = queryClient.getQueryData<{ data: CategoriesData[] }>([
    CATEGORIES_KEY,
    userId,
  ]);

  const sharedCategoriesData = queryClient.getQueryData<{ data: FetchSharedCategoriesData[] }>([
    SHARED_CATEGORIES_TABLE_NAME,
  ]);

  const userProfilesData = queryClient.getQueryData<{ data: ProfilesTableTypes[] }>([
    USER_PROFILE,
    userId,
  ]);

  const currentCategoryData = find(
    categoryData?.data,
    (item) => item?.category_slug === categorySlug,
  );

  const isUserTheCategoryOwner = userId === currentCategoryData?.user_id?.id;

  const categoryIdFromSlug = find(
    categoryData?.data,
    (item) => item?.category_slug === categorySlug,
  )?.id;

  if (!isPublicPage) {
    if (categorySlug && isUserInACategory(categorySlug)) {
      if (isUserTheCategoryOwner) {
        // user is the owner of the category
        return currentCategoryData?.category_views?.[viewType];
      }

      if (!isEmpty(sharedCategoriesData?.data)) {
        // the user is not the category owner
        // gets the collab users layout data for the shared collection
        const sharedCategoriesDataUserData = find(
          sharedCategoriesData?.data,
          (item) => item?.email === userEmail && item?.category_id === categoryIdFromSlug,
        );

        return sharedCategoriesDataUserData?.category_views?.[viewType];
      }

      return defaultReturnValue;
    }

    if (!isEmpty(userProfilesData?.data)) {
      const bookmarksView = userProfilesData?.data[0]?.bookmarks_view;
      const pageKey = getPageViewKey(categorySlug);
      const pageView = getPageViewData(bookmarksView, pageKey);
      const value = pageView?.[viewType];
      return value ?? defaultReturnValue;
    }
  } else {
    // we are in a public page

    return categoryViewsFromProps ? categoryViewsFromProps[viewType] : defaultReturnValue;
  }

  return defaultReturnValue;
};

export default useGetViewValue;
