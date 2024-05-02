import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { USER_PROFILE, USER_PROFILE_PIC } from "../../../utils/constants";
import { removeUserProfilePic } from "../../supabaseCrudHelpers";

// update username
export default function useRemoveUserProfilePicMutation() {
	const queryClient = useQueryClient();
	const session = useSupabaseSession((state) => state.session);
	const removeProfilePic = useMutation(removeUserProfilePic, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
			void queryClient.invalidateQueries([
				USER_PROFILE_PIC,
				session?.user?.email,
			]);
		},
	});
	return { removeProfilePic };
}
