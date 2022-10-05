import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../../types/apiTypes';
import { MAIN_TABLE_NAME } from '../../../utils/constants';
import { isNull } from 'lodash';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { isAccessTokenAuthenticated } from '../../../utils/apiHelpers';

// this is a cascading delete, deletes bookmaks from main table and all its respective joint tables

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null | string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  if (!isAccessTokenAuthenticated(req.body.access_token)) {
    res.status(500).json({ data: null, error: 'invalid access token' });
    return;
  }

  if (req.body.user_id) {
    const { data, error } = await supabase
      .from(MAIN_TABLE_NAME)
      .delete()
      .eq('user_id', req.body.user_id)
      .match({ trash: true });

    if (!isNull(data)) {
      res.status(200).json({ data, error });
    } else {
      res.status(500).json({ data, error });
    }
  } else {
    // deletes trash for all users , this happens in CRON job
    // only if bookmark is older than 30 days fron current date - TODO
    const { data, error } = await supabase
      .from(MAIN_TABLE_NAME)
      .delete()
      .match({ trash: true });

    if (!isNull(data)) {
      res.status(200).json({ data, error });
    } else {
      res.status(500).json({ data, error });
    }
  }
}
