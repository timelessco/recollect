import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';
import { SingleListData } from '../../types/apiTypes';
import {
  BOOKMARK_TAGS_TABLE_NAME,
  MAIN_TABLE_NAME,
} from '../../utils/constants';
import { isNull } from 'lodash';
import { PostgrestError } from '@supabase/supabase-js';

// this is a cascading delete, deletes bookmaks from main table and all its respective joint tables

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const accessToken = req.body.access_token as string;
  const {} = supabase.auth.setAuth(accessToken);

  const bookmarkData = req.body.data;

  const {} = await supabase
    .from(BOOKMARK_TAGS_TABLE_NAME)
    .delete()
    .match({ bookmark_id: bookmarkData?.id });

  const { data, error } = await supabase
    .from(MAIN_TABLE_NAME)
    .delete()
    .match({ id: bookmarkData?.id });

  if (!isNull(data)) {
    res.status(200).json({ data, error });
  } else {
    res.status(500).json({ data, error });
  }
}
