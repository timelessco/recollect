import { useQueryClient } from "@tanstack/react-query";

import { useReactQueryMutation } from "@/hooks/use-react-query-mutation";
import { postApi } from "@/lib/api-helpers/api";
import { useSupabaseSession } from "@/store/componentStore";
import {
	BOOKMARKS_COUNT_KEY,
	BOOKMARKS_KEY,
	CATEGORIES_KEY,
	IMPORT_BOOKMARKS_MUTATION_KEY,
	RAINDROP_IMPORT_API,
} from "@/utils/constants";
import { handleSuccess } from "@/utils/error-utils/client";

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
	inserted: number;
	skipped: number;
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
		mutationKey: [IMPORT_BOOKMARKS_MUTATION_KEY],
		onSettled: (data, error) => {
			if (error) {
				return;
			}

			// Show dynamic success message based on response
			if (data) {
				const { inserted, skipped } = data;
				let message = "";

				if (inserted === 0 && skipped === 0) {
					message = "No bookmarks to import";
				} else if (inserted === 0) {
					message = `${skipped} bookmark${skipped === 1 ? "" : "s"} already imported`;
				} else if (skipped === 0) {
					message = `${inserted} bookmark${inserted === 1 ? "" : "s"} imported`;
				} else {
					message = `${inserted} bookmark${inserted === 1 ? "" : "s"} imported, ${skipped} already present/duplicate`;
				}

				handleSuccess(message);
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
		showSuccessToast: false,
	});

	return { importBookmarksMutation };
}
