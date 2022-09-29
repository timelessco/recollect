import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../../types/apiTypes';
import {
  BOOKMAKRS_STORAGE_NAME,
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
} from '../../../utils/constants';
import { isNull } from 'lodash';
import { createClient, PostgrestError } from '@supabase/supabase-js';

// this is a cascading delete, deletes bookmaks from main table and all its respective joint tables

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

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
