import { useQuery } from "@tanstack/react-query";

import type { UserTagsData } from "../../../types/apiTypes";

import { useSupabaseSession } from "../../../store/componentStore";
import { USER_TAGS_KEY } from "../../../utils/constants";
import { fetchUserTags } from "../../supabaseCrudHelpers";

// fetchs user tags
export default function useFetchUserTags() {
  const session = useSupabaseSession((state) => state.session);

  const { data: userTags } = useQuery<{
    data: null | UserTagsData[];
    error: Error;
  }>({
    queryFn: () => fetchUserTags(),
    queryKey: [USER_TAGS_KEY, session?.user?.id],
  });

  return {
    userTags,
  };
}
