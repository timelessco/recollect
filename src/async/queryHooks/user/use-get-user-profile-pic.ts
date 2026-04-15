import { useQuery } from "@tanstack/react-query";

import type { UserProfilePicTypes } from "@/types/apiTypes";

import { api } from "@/lib/api-helpers/api-v2";
import { USER_PROFILE_PIC, V2_FETCH_USER_PROFILE_PIC_API } from "@/utils/constants";

export default function useGetUserProfilePic(email: string) {
  const { data: userProfilePicData } = useQuery({
    enabled: Boolean(email),
    queryFn: () =>
      api
        .get(V2_FETCH_USER_PROFILE_PIC_API, { searchParams: { email } })
        .json<UserProfilePicTypes[]>(),
    queryKey: [USER_PROFILE_PIC, email],
  });

  return {
    userProfilePicData,
  };
}
