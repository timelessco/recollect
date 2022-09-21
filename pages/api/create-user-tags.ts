// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import { createClient, PostgrestError } from '@supabase/supabase-js';
import isNull from 'lodash/isNull';
import type { NextApiRequest, NextApiResponse } from 'next';
import { UserTagsData } from '../../types/apiTypes';
import { TAG_TABLE_NAME } from '../../utils/constants';

type Data = {
  data: UserTagsData[] | null;
  error: PostgrestError | null;
};

// creats tags for a specific user

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const userId = req.body.user_id;
  const name = req.body.name;

  const { data, error } = await supabase.from(TAG_TABLE_NAME).insert([
    {
      name: name,
      user_id: userId,
    },
  ]);

  if (!isNull(error)) {
    res.status(500).json({ data: null, error: error });
  } else {
    res.status(200).json({ data: data, error: null });
  }
}
