import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { BOOKMARKS_COUNT_KEY, BOOKMARKS_KEY } from "../../../utils/constants";
import { clearBookmarksInTrash } from "../../supabaseCrudHelpers";

// clears trash
export default function useClearBookmarksInTrashMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const clearBookmarksInTrashMutation = useMutation({
		mutationFn: clearBookmarksInTrash,
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_KEY],
			});
			void queryClient.invalidateQueries({
				queryKey: [BOOKMARKS_COUNT_KEY, session?.user?.id],
			});
		},
	});

	return {
		clearBookmarksInTrashMutation,
		isPending: clearBookmarksInTrashMutation.isPending,
	};
}
