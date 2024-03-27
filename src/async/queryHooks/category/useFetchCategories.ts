import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";

import { type CategoriesData } from "../../../types/apiTypes";
import { CATEGORIES_KEY } from "../../../utils/constants";
import { fetchCategoriesData } from "../../supabaseCrudHelpers";

// fetchs user categories
export default function useFetchCategories() {
	const session = useSession();

	const {
		data: allCategories,
		isLoading: isLoadingCategories,
		isFetching: isFetchingCategories,
	} = useQuery<{
		data: CategoriesData[] | null;
		error: Error;
	}>(
		[CATEGORIES_KEY, session?.user?.id],
		async () =>
			await fetchCategoriesData(
				session?.user?.id ?? "",
				session?.user?.email ?? "",
				session,
			),
	);

	return {
		allCategories,
		isLoadingCategories,
		isFetchingCategories,
	};
}
