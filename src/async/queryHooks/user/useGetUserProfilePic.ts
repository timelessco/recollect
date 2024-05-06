import { useQuery } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { type UserProfilePicTypes } from "../../../types/apiTypes";
import { USER_PROFILE_PIC } from "../../../utils/constants";
import { getUserProfilePic } from "../../supabaseCrudHelpers";

// fetchs user profile
export default function useGetUserProfilePic(email: string) {
	const session = useSupabaseSession((state) => state.session);

	const { data: userProfilePicData } = useQuery<{
		data: UserProfilePicTypes[] | null;
		error: Error;
	}>(
		[USER_PROFILE_PIC, email],
		async () => await getUserProfilePic({ email, session }),
	);

	return {
		userProfilePicData,
	};
}
