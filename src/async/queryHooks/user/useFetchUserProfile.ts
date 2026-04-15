import { useQuery } from "@tanstack/react-query";

import type { ProfilesTableTypes, SupabaseSessionType } from "../../../types/apiTypes";

import { useSupabaseSession } from "../../../store/componentStore";
import { USER_PROFILE } from "../../../utils/constants";
import { fetchUserProfiles } from "../../supabaseCrudHelpers";

// fetchs user profile
export default function useFetchUserProfile() {
  const session = useSupabaseSession((state) => state.session);

  /* oxlint-disable @tanstack/query/exhaustive-deps -- session?.user?.id is the cache-relevant part, full session would over-refetch */
  const { data: userProfileData, isLoading } = useQuery<{
    data: null | ProfilesTableTypes[];
    error: Error;
  }>({
    enabled: Boolean(session?.user?.id),
    queryFn: () =>
      fetchUserProfiles({
        session: session as SupabaseSessionType,
        userId: session!.user!.id,
      }),
    queryKey: [USER_PROFILE, session?.user?.id],
  });
  /* oxlint-enable @tanstack/query/exhaustive-deps */

  return {
    isLoading,
    userProfileData,
  };
}
