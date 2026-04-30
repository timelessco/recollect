import { useQuery } from "@tanstack/react-query";

import type { ProfilesTableTypes } from "../../../types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";

import { useSupabaseSession } from "../../../store/componentStore";
import { USER_PROFILE, V2_FETCH_USER_PROFILE_API } from "../../../utils/constants";

export default function useFetchUserProfile() {
  const session = useSupabaseSession((state) => state.session);

  const avatarUrl = session?.user?.user_metadata?.avatar_url;

  /* oxlint-disable @tanstack/query/exhaustive-deps -- avatarUrl is a one-time server-side sync param, not a cache dimension */
  const { data: userProfileData, isLoading } = useQuery({
    enabled: Boolean(session?.user?.id),
    queryFn: async () => {
      const data = await api
        .get(
          V2_FETCH_USER_PROFILE_API,
          typeof avatarUrl === "string" ? { searchParams: { avatar: avatarUrl } } : {},
        )
        .json<ProfilesTableTypes[]>();
      return data;
    },
    queryKey: [USER_PROFILE, session?.user?.id],
  });
  /* oxlint-enable @tanstack/query/exhaustive-deps */

  return {
    isLoading,
    userProfileData,
  };
}
