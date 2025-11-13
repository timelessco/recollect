import { useQuery } from "@tanstack/react-query";

import { type UserProfilePicTypes } from "../../../types/apiTypes";
import { USER_PROFILE_PIC } from "../../../utils/constants";
import { getUserProfilePic } from "../../supabaseCrudHelpers";

// fetchs user profile
export default function useGetUserProfilePic(email: string) {
	const { data: userProfilePicData } = useQuery<{
		data: UserProfilePicTypes[] | null;
		error: Error;
	}>({
		queryKey: [USER_PROFILE_PIC, email],
		queryFn: async () => await getUserProfilePic({ email }),
	});

	return {
		userProfilePicData,
	};
}
