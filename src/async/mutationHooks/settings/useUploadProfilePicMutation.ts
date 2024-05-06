import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { USER_PROFILE, USER_PROFILE_PIC } from "../../../utils/constants";
import { uploadProfilePic } from "../../supabaseCrudHelpers";

// uploads user profile pic
export default function useUploadProfilePicMutation() {
	const session = useSupabaseSession((state) => state.session);
	const queryClient = useQueryClient();

	const uploadProfilePicMutation = useMutation(uploadProfilePic, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
			void queryClient.invalidateQueries([
				USER_PROFILE_PIC,
				session?.user?.email,
			]);
		},
	});
	return { uploadProfilePicMutation };
}
