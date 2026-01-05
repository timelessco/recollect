import { useQueryClient } from "@tanstack/react-query";

import { useReactQueryMutation } from "@/hooks/use-react-query-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	RAINDROP_IMPORT_API,
} from "@/utils/constants";

export interface ImportBookmarkPayload {
	title: string | null;
	description: string | null;
	url: string;
	ogImage: string | null;
	category_name: string | null;
}

export interface ImportBookmarksRequest {
	bookmarks: ImportBookmarkPayload[];
}

export interface ImportBookmarksResponse {
	message: string;
	count: number;
}

export function useImportBookmarksMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);

	const importBookmarksMutation = useReactQueryMutation<
		ImportBookmarksResponse,
		Error,
		ImportBookmarksRequest
	>({
		mutationFn: (payload) =>
			postApi<ImportBookmarksResponse>(`/api${RAINDROP_IMPORT_API}`, payload),
		mutationKey: ["import-bookmarks"],
		onSettled: (_data, error) => {
			if (error) {
				return;
			}

			// Invalidate bookmarks, categories, and counts after successful import
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY],
			});
			void queryClient.invalidateQueries({
				queryKey: [CATEGORIES_KEY, session?.user?.id],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});
		},
		showSuccessToast: true,
		successMessage: "Bookmarks imported successfully",
	});

	return { importBookmarksMutation };
}
