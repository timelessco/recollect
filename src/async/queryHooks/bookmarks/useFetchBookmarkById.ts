import { useQuery } from "@tanstack/react-query";

import { BOOKMARKS_KEY } from "../../../utils/constants";
import { fetchBookmarkById } from "../../supabaseCrudHelpers";

type Bookmark = {
	[key: string]: unknown;
	id: string;
};

export const useFetchBookmarkById = (id: string) =>
	useQuery({
		queryKey: [BOOKMARKS_KEY, id],
		queryFn: () => fetchBookmarkById(id) as Promise<Bookmark>,
		enabled: Boolean(id),
	});
