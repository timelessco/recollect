import { useQuery } from "@tanstack/react-query";

import type { UserTagsData } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import { useSupabaseSession } from "@/store/componentStore";
import { USER_TAGS_KEY, V2_FETCH_USER_TAGS_API } from "@/utils/constants";

export default function useFetchUserTags() {
  const session = useSupabaseSession((state) => state.session);

  const { data: userTags } = useQuery({
    queryFn: () => api.get(V2_FETCH_USER_TAGS_API).json<UserTagsData[]>(),
    queryKey: [USER_TAGS_KEY, session?.user?.id],
  });

  return {
    userTags,
  };
}
