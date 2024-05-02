import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import {
	CATEGORIES_KEY,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { updateSharedCategoriesUserAccess } from "../../supabaseCrudHelpers";

// updates shared cat user access
export default function useUpdateSharedCategoriesUserAccessMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);

	const updateSharedCategoriesUserAccessMutation = useMutation(
		updateSharedCategoriesUserAccess,
		{
			onSuccess: () => {
				// Invalidate and refetch
				void queryClient.invalidateQueries([SHARED_CATEGORIES_TABLE_NAME]);
				void queryClient.invalidateQueries([CATEGORIES_KEY, session?.user.id]);
			},
		},
	);
	return { updateSharedCategoriesUserAccessMutation };
}
