import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { CATEGORIES_KEY, USER_PROFILE } from "../../../utils/constants";
import { updateUsername } from "../../supabaseCrudHelpers";

// update username
export default function useUpdateUsernameMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const updateUsernameMutation = useMutation(updateUsername, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
			void queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
		},
	});
	return { updateUsernameMutation };
}
