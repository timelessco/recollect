import { useQuery } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { type FetchSharedCategoriesData } from "../../../types/apiTypes";
import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { fetchSharedCategoriesData } from "../../supabaseCrudHelpers";

// fetchs user shared categories
export default function useFetchSharedCategories() {
	const session = useSupabaseSession((state) => state.session);

	const { data: sharedCategoriesData } = useQuery<{
		data: FetchSharedCategoriesData[] | null;
		error: Error;
	}>(
		[SHARED_CATEGORIES_TABLE_NAME],
		async () => await fetchSharedCategoriesData(session),
	);

	return {
		sharedCategoriesData,
	};
}
