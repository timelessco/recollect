import { useQuery } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { type CategoriesData } from "../../../types/apiTypes";
import { CATEGORIES_KEY } from "../../../utils/constants";
import { fetchCategoriesData } from "../../supabaseCrudHelpers";

// fetchs user categories
export default function useFetchCategories(shouldFetch?: boolean) {
	const session = useSupabaseSession((state) => state.session);

	const {
		data: allCategories,
		isLoading: isLoadingCategories,
		isFetching: isFetchingCategories,
	} = useQuery<{
		data: CategoriesData[] | null;
		error: Error;
	}>(
		[CATEGORIES_KEY, session?.user?.id],
		async () => await fetchCategoriesData(),
		{
			enabled: shouldFetch,
		},
	);

	return {
		allCategories,
		isLoadingCategories,
		isFetchingCategories,
	};
}
