import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";

import useGetCurrentCategoryId from "../../../hooks/useGetCurrentCategoryId";
import { useSupabaseSession } from "../../../store/componentStore";
import { type BookmarkViewDataTypes } from "../../../types/apiTypes";
import { BOOKMARKS_VIEW } from "../../../utils/constants";
import { fetchBookmarksViews } from "../../supabaseCrudHelpers";

// fetchs bookmarks view
export default function useFetchBookmarksView() {
	const session = useSupabaseSession((state) => state.session);
	const { category_id: CATEGORY_ID } = useGetCurrentCategoryId();

	const { data } = useQuery<{
		data: BookmarkViewDataTypes | null;
		error: Error;
	}>(
		[BOOKMARKS_VIEW, CATEGORY_ID],
		async () =>
			await fetchBookmarksViews({ category_id: CATEGORY_ID, session }),
	);

	return { data };
}
