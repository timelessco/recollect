import { useSession } from "@supabase/auth-helpers-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
	CATEGORIES_KEY,
	SHARED_CATEGORIES_TABLE_NAME,
} from "../../../utils/constants";
import { sendCollaborationEmailInvite } from "../../supabaseCrudHelpers";

// dels user in a shared category
export default function useSendCollaborationEmailInviteMutation() {
	const session = useSession();
	const queryClient = useQueryClient();

	const sendCollaborationEmailInviteMutation = useMutation(
		sendCollaborationEmailInvite,
		{
			onSuccess: () => {
				// Invalidate and refetch
				void queryClient.invalidateQueries([SHARED_CATEGORIES_TABLE_NAME]);
				void queryClient.invalidateQueries([CATEGORIES_KEY, session?.user?.id]);
			},
		},
	);
	return { sendCollaborationEmailInviteMutation };
}
