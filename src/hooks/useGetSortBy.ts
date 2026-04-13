import { useRouter } from "next/router";

import { useQueryClient } from "@tanstack/react-query";
import find from "lodash/find";

import type {
  CategoriesData,
  FetchSharedCategoriesData,
  ProfilesTableTypes,
} from "../types/apiTypes";

import { useSupabaseSession } from "../store/componentStore";
import { getPageViewData, getPageViewKey } from "../utils/bookmarksViewKeyed";
import { CATEGORIES_KEY, SHARED_CATEGORIES_TABLE_NAME, USER_PROFILE } from "../utils/constants";
import { getCategorySlugFromRouter } from "../utils/url";
import useGetCurrentCategoryId from "./useGetCurrentCategoryId";

// gets the sort by value of the user
export default function useGetSortBy() {
  const session = useSupabaseSession((state) => state.session);
  const queryClient = useQueryClient();
  const router = useRouter();
  const { category_id: categoryId } = useGetCurrentCategoryId();
  const categorySlug = getCategorySlugFromRouter(router);

  const userId = session?.user?.id;

  const categoryData = queryClient.getQueryData<CategoriesData[]>([CATEGORIES_KEY, userId]);

  const userProfilesData = queryClient.getQueryData<ProfilesTableTypes[]>([USER_PROFILE, userId]);

  const sharedCategoriesData = queryClient.getQueryData<FetchSharedCategoriesData[]>([
    SHARED_CATEGORIES_TABLE_NAME,
  ]);

  const isInNonCategoryPage = typeof categoryId !== "number";

  const currentCategory = find(categoryData, (item) => item?.id === categoryId);

  const getSortValue = () => {
    if (!isInNonCategoryPage) {
      // user is in a category page

      // tells if the user is the category owner
      const isUserTheCategoryOwner = currentCategory?.user_id?.id === userId;

      if (isUserTheCategoryOwner) {
        // if user is the category owner then get value from category table
        return currentCategory?.category_views?.sortBy;
      }

      // if user is not the category owner then get value from the shared category table
      const sharedCategoryUserData = find(
        sharedCategoriesData,
        (item) => item?.category_id === categoryId && item?.email === session?.user?.email,
      );

      return sharedCategoryUserData?.category_views?.sortBy;
    }

    const bookmarksView = userProfilesData?.[0]?.bookmarks_view;
    const pageKey = getPageViewKey(categorySlug);
    const pageView = getPageViewData(bookmarksView, pageKey);
    return pageView?.sortBy as string | undefined;
  };

  const sortBy = getSortValue();

  return { sortBy };
}
