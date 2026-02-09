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
	inserted_at: string | null;
}

export interface ImportBookmarksRequest {
	bookmarks: ImportBookmarkPayload[];
}

export interface ImportBookmarksResponse {
	queued: number;
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
				const { queued, skipped } = data;
				let message = "";

				if (queued === 0 && skipped === 0) {
					message = "No bookmarks to import";
				} else if (queued === 0) {
					message = `${skipped} bookmark${skipped === 1 ? "" : "s"} already imported`;
				} else if (skipped === 0) {
					message = `${queued} bookmark${queued === 1 ? "" : "s"} queued for import`;
				} else {
					message = `${queued} bookmark${queued === 1 ? "" : "s"} queued for import, ${skipped} already present/duplicate`;
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
