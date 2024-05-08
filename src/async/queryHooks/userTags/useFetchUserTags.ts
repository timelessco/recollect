import { useQuery } from "@tanstack/react-query";

import { useSupabaseSession } from "../../../store/componentStore";
import { type UserTagsData } from "../../../types/apiTypes";
import { USER_TAGS_KEY } from "../../../utils/constants";
import { fetchUserTags } from "../../supabaseCrudHelpers";

// fetchs user tags
export default function useFetchUserTags() {
	const session = useSupabaseSession((state) => state.session);

	const { data: userTags } = useQuery<{
		data: UserTagsData[] | null;
		error: Error;
	}>(
		[USER_TAGS_KEY, session?.user?.id],
		async () => await fetchUserTags(session?.user?.id ?? ""),
	);

	return {
		userTags,
	};
}
