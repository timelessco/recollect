import { useSession } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';
import { USER_PROFILE } from '../../../utils/constants';
import { fetchUserProfiles } from '../../supabaseCrudHelpers';

// fetchs user profile
export default function useFetchUserProfile() {
  const session = useSession();

  const { data: userProfileData } = useQuery(
    [USER_PROFILE, session?.user?.id],
    () => fetchUserProfiles({ userId: session?.user?.id as string, session })
  );

  return {
    userProfileData,
  };
}