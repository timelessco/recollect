import { useQuery } from "@tanstack/react-query";
import axios from "axios";

type Bookmark = {
	[key: string]: unknown;
	// Add other bookmark properties as needed
	id: string;
};

export const useFetchBookmarkById = (id: string) =>
	useQuery<Bookmark, Error>({
		queryKey: ["bookmark", id],
		queryFn: async () => {
			if (!id) {
				throw new Error("Bookmark ID is required");
			}

			const { data } = await axios.get<Bookmark>(
				`/api/v1/bookmarks/get/fetch-by-id?id=${id}`,
			);

			return data;
		},
		// Only run the query if id exists
		enabled: Boolean(id),
	});
