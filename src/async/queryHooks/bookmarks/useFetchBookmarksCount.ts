import { useQuery } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { type BookmarksCountTypes } from "../../../types/apiTypes";
import { BOOKMARKS_COUNT_KEY } from "../../../utils/constants";
import { getBookmarksCount } from "../../supabaseCrudHelpers";

// fetchs user categories
export default function useFetchBookmarksCount() {
	const session = useSupabaseSession((state) => state.session);

	const { data: bookmarksCountData } = useQuery<{
		data: BookmarksCountTypes | null;
		error: Error;
	}>({
		// eslint-disable-next-line @tanstack/query/exhaustive-deps
		queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id as string],
		queryFn: async (data) =>
			// @ts-expect-error - Todo fix this
			await getBookmarksCount(data, session ?? { user: null }),
	});

	return {
		bookmarksCountData,
	};
}
