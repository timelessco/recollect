import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { USER_PROFILE } from "../../../utils/constants";
import { updateUsername } from "../../supabaseCrudHelpers";

// update username
export default function useUpdateUsernameMutation() {
	const queryClient = useQueryClient();
	const session = useSession();
	const updateUsernameMutation = useMutation(updateUsername, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
		},
	});
	return { updateUsernameMutation };
}
