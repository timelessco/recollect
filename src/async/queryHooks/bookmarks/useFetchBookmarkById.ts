import { useQuery } from "@tanstack/react-query";
import axios from "axios";

import { BOOKMARKS_KEY, NO_BOOKMARKS_ID_ERROR } from "../../../utils/constants";

type Bookmark = {
	[key: string]: unknown;
	// Add other bookmark properties as needed
	id: string;
};

export const useFetchBookmarkById = (id: string) =>
	useQuery<Bookmark, Error>({
		queryKey: [BOOKMARKS_KEY, id],
		queryFn: async () => {
			if (!id) {
				throw new Error(NO_BOOKMARKS_ID_ERROR);
			}

			const { data } = await axios.get<Bookmark>(
				`/api/v1/bookmarks/get/fetch-by-id?id=${id}`,
			);

			return data;
		},
		// Only run the query if id exists
		enabled: Boolean(id),
	});
