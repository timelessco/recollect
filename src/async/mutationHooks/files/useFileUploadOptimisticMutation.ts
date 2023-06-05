import { useMutation, useQueryClient } from "@tanstack/react-query";

import { BOOKMARKS_KEY } from "../../../utils/constants";
import { uploadFile } from "../../supabaseCrudHelpers";

// get bookmark screenshot
export default function useFileUploadOptimisticMutation() {
	const queryClient = useQueryClient();

	const fileUploadOptimisticMutation = useMutation(uploadFile, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([BOOKMARKS_KEY]);
		},
	});

	return { fileUploadOptimisticMutation };
}
