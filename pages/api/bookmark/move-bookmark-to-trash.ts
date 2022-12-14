import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../../types/apiTypes';
import { MAIN_TABLE_NAME } from '../../../utils/constants';
import { isNull } from 'lodash';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

// this is a cascading delete, deletes bookmaks from main table and all its respective joint tables

type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  await jwt.verify(
    req.body.access_token as string,
    process.env.SUPABASE_JWT_SECRET_KEY as string,
    function (err) {
      if (err) {
        res.status(500).json({ data: null, error: err });
        return;
      }
    }
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  );

  const bookmarkData = req.body.data;

  const { data, error } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({ trash: req.body.isTrash })
    .match({ id: bookmarkData?.id })
    .select();

  if (!isNull(data)) {
    res.status(200).json({ data, error });
    return;
  } else {
    res.status(500).json({ data, error });
    return;
  }
}
