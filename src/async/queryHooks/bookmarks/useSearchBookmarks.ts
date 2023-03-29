import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";

import useDebounce from "../../../hooks/useDebounce";
import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import { useMiscellaneousStore } from "../../../store/componentStore";
import { type BookmarksPaginatedDataTypes } from "../../../types/apiTypes";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { searchBookmarks } from "../../supabaseCrudHelpers";

// searches bookmarks
export default function useSearchBookmarks() {
	const session = useSession();
	const searchText = useMiscellaneousStore((state) => state.searchText);

	const debouncedSearch = useDebounce(searchText, 500);

	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { data } = useQuery<{
		data: BookmarksPaginatedDataTypes[] | null;
		error: Error;
	}>(
		[BOOKMARKS_KEY, session?.user?.id, CATEGORY_ID, debouncedSearch],
		async () => await searchBookmarks(searchText, CATEGORY_ID, session),
	);

	return { data };
}
