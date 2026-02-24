import { useRouter } from "next/router";
import { type PostgrestError } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import find from "lodash/find";
import isEmpty from "lodash/isEmpty";

import { useSupabaseSession } from "../store/componentStore";
import {
	type CategoriesData,
	type FetchSharedCategoriesData,
	type ProfilesTableTypes,
} from "../types/apiTypes";
import { getPageViewData, getPageViewKey } from "../utils/bookmarksViewKeyed";
import {
	CATEGORIES_KEY,
	SHARED_CATEGORIES_TABLE_NAME,
	USER_PROFILE,
} from "../utils/constants";
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

	const categoryData = queryClient.getQueryData([CATEGORIES_KEY, userId]) as {
		data: CategoriesData[];
		error: PostgrestError;
	};

	const userProfilesData = queryClient.getQueryData([USER_PROFILE, userId]) as {
		data: ProfilesTableTypes[];
		error: PostgrestError;
	};

	const sharedCategoriesData = queryClient.getQueryData([
		SHARED_CATEGORIES_TABLE_NAME,
	]) as {
		data: FetchSharedCategoriesData[];
		error: PostgrestError;
	};

	const isInNonCategoryPage = typeof categoryId !== "number";

	const currentCategory = find(
		categoryData?.data,
		(item) => item?.id === categoryId,
	);

	const getSortValue = () => {
		if (!isInNonCategoryPage) {
			// user is in a category page

			// tells if the user is the category owner
			const isUserTheCategoryOwner = currentCategory?.user_id?.id === userId;

			if (isUserTheCategoryOwner) {
				// if user is the category owner then get value from category table
				return currentCategory?.category_views?.sortBy;
			} else {
				// if user is not the category owner then get value from the shared category table
				const sharedCategoryUserData = find(
					sharedCategoriesData?.data,
					(item) =>
						item?.category_id === categoryId &&
						item?.email === session?.user?.email,
				);

				return sharedCategoryUserData?.category_views?.sortBy;
			}
		}

		if (!isEmpty(userProfilesData?.data)) {
			const bookmarksView = userProfilesData.data[0]?.bookmarks_view;
			const pageKey = getPageViewKey(categorySlug);
			const pageView = getPageViewData(bookmarksView, pageKey);
			return pageView?.sortBy as string | undefined;
		}

		return undefined;
	};

	const sortBy = getSortValue();

	return { sortBy };
}
