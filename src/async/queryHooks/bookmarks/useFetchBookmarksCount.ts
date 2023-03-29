import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";

import { type BookmarksCountTypes } from "../../../types/apiTypes";
import { BOOKMARKS_COUNT_KEY } from "../../../utils/constants";
import { getBookmarksCount } from "../../supabaseCrudHelpers";

// fetchs user categories
export default function useFetchBookmarksCount() {
	const session = useSession();

	const { data: bookmarksCountData } = useQuery<{
		data: BookmarksCountTypes | null;
		error: Error;
	}>(
		[BOOKMARKS_COUNT_KEY, session?.user?.id as string],
		async (data) => await getBookmarksCount(data, session),
	);

	return {
		bookmarksCountData,
	};
}
