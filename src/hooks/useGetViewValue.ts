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
import {
	CATEGORIES_KEY,
	infoValues,
	SHARED_CATEGORIES_TABLE_NAME,
	USER_PROFILE,
	viewValues,
} from "../utils/constants";
import { isUserInACategory } from "../utils/helpers";

import useIsUserInTweetsPage from "./useIsUserInTweetsPage";

// gets the card views for the user , like moodboard, list ....
const useGetViewValue = (
	viewType: "bookmarksView" | "cardContentViewArray" | "moodboardColumns",
	defaultReturnValue: string | [] | [number],
	isPublicPage = false,
	categoryViewsFromProps: BookmarkViewDataTypes | undefined = undefined,
) => {
	const isInTweetsPage = useIsUserInTweetsPage();
	const queryClient = useQueryClient();
	const router = useRouter();
	// cat_id reffers to cat slug here as its got from url
	const categorySlug = router?.asPath?.split("/")[1].split("?")[0] || null;

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

	if (viewType === "bookmarksView" && isInTweetsPage) {
		return viewValues.timeline;
	}

	if (viewType === "cardContentViewArray" && isInTweetsPage) {
		return infoValues;
	}

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
			return userProfilesData?.data?.[0]?.bookmarks_view?.[viewType];
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
