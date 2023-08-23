import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { USER_PROFILE } from "../../../utils/constants";
import { uploadProfilePic } from "../../supabaseCrudHelpers";

// uploads user profile pic
export default function useUploadProfilePicMutation() {
	const session = useSession();
	const queryClient = useQueryClient();

	const uploadProfilePicMutation = useMutation(uploadProfilePic, {
		onSuccess: () => {
			// Invalidate and refetch
			void queryClient.invalidateQueries([USER_PROFILE, session?.user?.id]);
		},
	});
	return { uploadProfilePicMutation };
}
