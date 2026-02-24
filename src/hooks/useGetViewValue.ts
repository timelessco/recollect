import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { find, isEmpty } from "lodash";

import { useSupabaseSession } from "../store/componentStore";
import {
	type BookmarkViewDataTypes,
	type CategoriesData,
	type FetchSharedCategoriesData,
	type ProfilesTableTypes,
} from "../types/apiTypes";
import { getPageViewData, getPageViewKey } from "@/utils/bookmarksViewKeyed";
import {
	CATEGORIES_KEY,
	SHARED_CATEGORIES_TABLE_NAME,
	USER_PROFILE,
} from "../utils/constants";
import { isUserInACategory } from "../utils/helpers";
import { getCategorySlugFromRouter } from "../utils/url";

// gets the card views for the user , like moodboard, list ....
const useGetViewValue = (
	viewType: "bookmarksView" | "cardContentViewArray" | "moodboardColumns",
	defaultReturnValue: string | [] | [number],
	isPublicPage = false,
	categoryViewsFromProps: BookmarkViewDataTypes | undefined = undefined,
) => {
	const queryClient = useQueryClient();
	const router = useRouter();
	// cat_id refers to cat slug here as it's got from url
	const categorySlug = getCategorySlugFromRouter(router);

	const userData = useSupabaseSession((state) => state.session);

	const userId = userData?.user?.id;
	const userEmail = userData?.user?.email;

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const sharedCategoriesData = queryClient.getQueryData([
		SHARED_CATEGORIES_TABLE_NAME,
	]) as {
		data: FetchSharedCategoriesData[];
		error: PostgrestError;
	};

	const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

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
		if (isUserInACategory(categorySlug as string)) {
			if (isUserTheCategoryOwner) {
				// user is the owner of the category
				return currentCategoryData?.category_views?.[viewType];
			}

			if (!isEmpty(sharedCategoriesData?.data)) {
				// the user is not the category owner
				// gets the collab users layout data for the shared collection
				const sharedCategoriesDataUserData = find(
					sharedCategoriesData?.data,
					(item) =>
						item?.email === userEmail &&
						item?.category_id === categoryIdFromSlug,
				);

				return sharedCategoriesDataUserData?.category_views?.[viewType];
			}

			return defaultReturnValue;
		}

		if (!isEmpty(userProfilesData?.data)) {
			const bookmarksView = userProfilesData.data[0]?.bookmarks_view;
			const pageKey = getPageViewKey(categorySlug);
			const pageView = getPageViewData(bookmarksView, pageKey);
			const value = pageView?.[viewType];
			return value !== undefined && value !== null ? value : defaultReturnValue;
		}
	} else {
		// we are in a public page

		return categoryViewsFromProps
			? categoryViewsFromProps[viewType]
			: defaultReturnValue;
	}

	return defaultReturnValue;
};

export default useGetViewValue;
