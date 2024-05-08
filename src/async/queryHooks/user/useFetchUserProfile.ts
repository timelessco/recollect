import { useQuery } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import {
	type ProfilesTableTypes,
	type SupabaseSessionType,
} from "../../../types/apiTypes";
import { USER_PROFILE } from "../../../utils/constants";
import { fetchUserProfiles } from "../../supabaseCrudHelpers";

// fetchs user profile
export default function useFetchUserProfile() {
	const session = useSupabaseSession((state) => state.session);

	const { data: userProfileData } = useQuery<{
		data: ProfilesTableTypes[] | null;
		error: Error;
	}>(
		[USER_PROFILE, session?.user?.id],
		async () =>
			await fetchUserProfiles({
				userId: session?.user?.id as string,
				session: session as SupabaseSessionType,
			}),
	);

	return {
		userProfileData,
	};
}
