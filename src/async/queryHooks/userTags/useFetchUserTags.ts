import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";

import type { UserTagsData } from "../../../types/apiTypes";
import { USER_TAGS_KEY } from "../../../utils/constants";
import { fetchUserTags } from "../../supabaseCrudHelpers";

// fetchs user tags
export default function useFetchUserTags() {
  const session = useSession();

  const { data: userTags } = useQuery<{
    data: UserTagsData[] | null;
    error: Error;
  }>([USER_TAGS_KEY, session?.user?.id], () =>
    fetchUserTags(session?.user?.id || "", session),
  );

  return {
    userTags,
  };
}
