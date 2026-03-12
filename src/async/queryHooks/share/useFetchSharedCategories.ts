import { useRouter } from "next/router";
import { useQuery } from "@tanstack/react-query";

import { type FetchSharedCategoriesData } from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { isUserInACategory } from "../../../utils/helpers";
import { getCategorySlugFromRouter } from "../../../utils/url";
import { fetchSharedCategoriesData } from "../../supabaseCrudHelpers";

// fetchs user shared categories
export default function useFetchSharedCategories() {
	const router = useRouter();
	const categorySlug = getCategorySlugFromRouter(router);
	const isInCategoryPage =
		categorySlug !== null && isUserInACategory(categorySlug);

	const { data: sharedCategoriesData } = useQuery<{
		data: FetchSharedCategoriesData[] | null;
		error: Error;
	}>({
		queryKey: [SHARED_CATEGORIES_TABLE_NAME],
		queryFn: async () => await fetchSharedCategoriesData(),
		enabled: isInCategoryPage,
	});

	return {
		sharedCategoriesData,
	};
}
