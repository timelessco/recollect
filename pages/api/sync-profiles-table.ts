// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { find } from 'lodash';
import { getUserNameFromEmail } from '../../utils/helpers';

type Data = {
  success: string | null;
  error: PostgrestError | null | unknown;
};

// this api syncs profiles table and with the latest data auth table
// profiles table is created as auth table data cannot be accessed in front-end as its not a public table

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const { data: authUsers } = await supabase.auth.api.listUsers();

  const { data: profilesUsers } = await supabase.from('profiles').select();

  try {
    // NOTE : delete is not needed as forgin key constraint is there for auth and profiles table
    // for insert
    authUsers?.forEach(async (authItem) => {
      const findAuthuserInProfilesTable = find(
        profilesUsers,
        (profileItem) => profileItem?.id === authItem?.id
      );

      if (!findAuthuserInProfilesTable) {
        await supabase.from('profiles').insert([
          {
            id: authItem?.id,
            email: authItem?.email,
            user_name: getUserNameFromEmail(authItem?.email || ''),
          },
        ]);
      }
    });
    res.status(200).json({ success: 'Data is synced', error: null });
  } catch (e: unknown) {
    res.status(200).json({ success: null, error: e });
  }
}
