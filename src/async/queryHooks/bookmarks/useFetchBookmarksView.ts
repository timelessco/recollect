import { useQuery } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import { type BookmarkViewDataTypes } from "../../../types/apiTypes";
import { BOOKMARKS_VIEW } from "../../../utils/constants";
import { fetchBookmarksViews } from "../../supabaseCrudHelpers";

// fetchs bookmarks view
export default function useFetchBookmarksView() {
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { data } = useQuery<{
		data: BookmarkViewDataTypes | null;
		error: Error;
	}>({
		queryKey: [BOOKMARKS_VIEW, CATEGORY_ID],
		queryFn: async () =>
			await fetchBookmarksViews({ category_id: CATEGORY_ID }),
	});

	return { data };
}
