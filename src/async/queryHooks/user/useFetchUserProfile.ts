import { useQuery } from "@tanstack/react-query";

import type { ProfilesTableTypes, SupabaseSessionType } from "../../../types/apiTypes";

import { useSupabaseSession } from "../../../store/componentStore";
import { USER_PROFILE } from "../../../utils/constants";
import { fetchUserProfiles } from "../../supabaseCrudHelpers";

// fetchs user profile
export default function useFetchUserProfile() {
  const session = useSupabaseSession((state) => state.session);

  const { data: userProfileData, isLoading } = useQuery<{
    data: null | ProfilesTableTypes[];
    error: Error;
  }>({
    enabled: Boolean(session?.user?.id),
    queryFn: () =>
      fetchUserProfiles({
        session: session as SupabaseSessionType,
        userId: session?.user?.id!,
      }),
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [USER_PROFILE, session?.user?.id],
  });

  return {
    isLoading,
    userProfileData,
  };
}
