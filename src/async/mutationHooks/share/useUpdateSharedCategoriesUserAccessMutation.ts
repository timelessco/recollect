import { useMutation, useQueryClient } from "@tanstack/react-query";

import { SHARED_CATEGORIES_TABLE_NAME } from "../../../utils/constants";
import { updateSharedCategoriesUserAccess } from "../../supabaseCrudHelpers";

// updates shared cat user access
export default function useUpdateSharedCategoriesUserAccessMutation() {
	const queryClient = useQueryClient();

	const updateSharedCategoriesUserAccessMutation = useMutation(
		updateSharedCategoriesUserAccess,
		{
			onSuccess: () => {
				// Invalidate and refetch
				void queryClient.invalidateQueries([SHARED_CATEGORIES_TABLE_NAME]);
			},
		},
	);
	return { updateSharedCategoriesUserAccessMutation };
}
