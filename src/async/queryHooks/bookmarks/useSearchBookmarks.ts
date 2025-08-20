import { type PostgrestError } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { find, isEmpty } from "lodash";

import useDebounce from "../../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import {
	useLoadersStore,
	useMiscellaneousStore,
	useSupabaseSession,
} from "../../../store/componentStore";
import {
	type BookmarksPaginatedDataTypes,
	type FetchSharedCategoriesData,
} from "../../../types/apiTypes";
import {
	BOOKMARKS_KEY,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { searchBookmarks } from "../../supabaseCrudHelpers";

// searches bookmarks
export default function useSearchBookmarks() {
	const searchText = useMiscellaneousStore((state) => state.searchText);
	const session = useSupabaseSession((state) => state.session);
	const aiButtonToggle = useMiscellaneousStore((state) => state.aiButtonToggle);
	const toggleIsSearchLoading = useLoadersStore(
		(state) => state.toggleIsSearchLoading,
	);

	const queryClient = useQueryClient();

	const debouncedSearch = useDebounce(searchText, 500);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const sharedCategoriesData = queryClient.getQueryData([
		SHARED_CATEGORIES_TABLE_NAME,
	]) as {
		data: FetchSharedCategoriesData[];
		error: PostgrestError;
	};

	// this tells if the collection is a shared collection or not
	const isSharedCategory = Boolean(
		find(
			sharedCategoriesData?.data,
			(item) => item?.category_id === CATEGORY_ID,
		),
	);

	const { data, isLoading } = useQuery({
		queryKey: [BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, debouncedSearch],
		enabled: !isEmpty(searchText),
		refetchOnWindowFocus: false,
		onSettled: () => {
			toggleIsSearchLoading(false);
		},
		queryFn: async () => {
			toggleIsSearchLoading(true);
			if (!aiButtonToggle && searchText) {
				return await searchBookmarks(searchText, CATEGORY_ID, isSharedCategory);
			}

			return null;
		},
	});

	return { data, isLoading };
}
