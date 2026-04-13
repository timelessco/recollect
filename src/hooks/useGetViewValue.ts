import { useRouter } from "next/router";

import { find, isEmpty } from "lodash";

import type { BookmarkViewDataTypes } from "../types/apiTypes";

import useFetchCategories from "@/async/queryHooks/category/use-fetch-categories";
import useFetchSharedCategories from "@/async/queryHooks/share/use-fetch-shared-categories";
import useFetchUserProfile from "@/async/queryHooks/user/use-fetch-user-profile";
import { getPageViewData, getPageViewKey } from "@/utils/bookmarksViewKeyed";

import { useSupabaseSession } from "../store/componentStore";
import { isUserInACategory } from "../utils/helpers";
import { getCategorySlugFromRouter } from "../utils/url";

// gets the card views for the user , like moodboard, list ....
const useGetViewValue = (
  viewType: "bookmarksView" | "cardContentViewArray" | "moodboardColumns",
  defaultReturnValue: [] | [number] | string,
  isPublicPage = false,
  categoryViewsFromProps?: BookmarkViewDataTypes,
) => {
  const router = useRouter();
  // cat_id refers to cat slug here as it's got from url
  const categorySlug = getCategorySlugFromRouter(router);

  const userData = useSupabaseSession((state) => state.session);

  const userId = userData?.user?.id;
  const userEmail = userData?.user?.email;

  const { allCategories: categoryData } = useFetchCategories();
  const { sharedCategoriesData } = useFetchSharedCategories();
  const { userProfileData: userProfilesData } = useFetchUserProfile();

  const currentCategoryData = find(categoryData, (item) => item?.category_slug === categorySlug);

  const isUserTheCategoryOwner = userId === currentCategoryData?.user_id?.id;

  const categoryIdFromSlug = find(categoryData, (item) => item?.category_slug === categorySlug)?.id;

  if (!isPublicPage) {
    if (categorySlug && isUserInACategory(categorySlug)) {
      if (isUserTheCategoryOwner) {
        // user is the owner of the category
        return currentCategoryData?.category_views?.[viewType];
      }

      if (!isEmpty(sharedCategoriesData)) {
        // the user is not the category owner
        // gets the collab users layout data for the shared collection
        const sharedCategoriesDataUserData = find(
          sharedCategoriesData,
          (item) => item?.email === userEmail && item?.category_id === categoryIdFromSlug,
        );

        return sharedCategoriesDataUserData?.category_views?.[viewType];
      }

      return defaultReturnValue;
    }

    if (!isEmpty(userProfilesData)) {
      const bookmarksView = userProfilesData?.[0]?.bookmarks_view;
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
