import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { USER_TAGS_KEY } from "../../../utils/constants";
import { addUserTags } from "../../supabaseCrudHelpers";

// add new tag for a user to add to bookmark
export default function useAddUserTagsMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();
	const addUserTagsMutation = useMutation({
		mutationFn: addUserTags,
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries({
				queryKey: [USER_TAGS_KEY, session?.user?.id],
			});
		},
	});

	return { addUserTagsMutation };
}
