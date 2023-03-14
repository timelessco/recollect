import { useSession } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";

import type { UserProfilePicTypes } from "../../../types/apiTypes";
import { USER_PROFILE_PIC } from "../../../utils/constants";
import { getUserProfilePic } from "../../supabaseCrudHelpers";

// fetchs user profile
export default function useGetUserProfilePic(email: string) {
  const session = useSession();

  const { data: userProfilePicData } = useQuery<{
    data: UserProfilePicTypes[] | null;
    error: Error;
  }>([USER_PROFILE_PIC, email], () => getUserProfilePic({ email, session }));

  return {
    userProfilePicData,
  };
}
