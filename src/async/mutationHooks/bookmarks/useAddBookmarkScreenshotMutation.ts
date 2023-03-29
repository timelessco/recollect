import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useMiscellaneousStore } from "../../../store/componentStore";
import { BOOKMARKS_KEY } from "../../../utils/constants";
import { addBookmarkScreenshot } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useAddBookmarkScreenshotMutation() {
	const queryClient = useQueryClient();

	const setAddScreenshotBookmarkId = useMiscellaneousStore(
		(state) => state.setAddScreenshotBookmarkId,
	);

	const addBookmarkScreenshotMutation = useMutation(addBookmarkScreenshot, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([BOOKMARKS_KEY]);
			setAddScreenshotBookmarkId(undefined);
		},
	});

	return { addBookmarkScreenshotMutation };
}
