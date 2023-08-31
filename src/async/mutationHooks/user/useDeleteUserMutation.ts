import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CATEGORIES_KEY, USER_PROFILE } from "../../../utils/constants";
import { deleteUser } from "../../supabaseCrudHelpers";

// update username
export default function useDeleteUserMutation() {
	const queryClient = useQueryClient();
	const session = useSession();
	const deleteUserMutation = useMutation(deleteUser, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
			void queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
		},
	});
	return { deleteUserMutation };
}
