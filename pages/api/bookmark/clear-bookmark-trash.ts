import type { NextApiRequest, NextApiResponse } from 'next';
import { SingleListData } from '../../../types/apiTypes';
import { MAIN_TABLE_NAME } from '../../../utils/constants';
import isEmpty from 'lodash/isEmpty';
import isNull from 'lodash/isNull';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import { isAccessTokenAuthenticated } from '../../../utils/apiHelpers';
import differenceInDays from 'date-fns/differenceInDays';

// this api clears trash for a single user and also takes care of CRON job to clear trash every 30 days
type Data = {
  data: Array<SingleListData> | null;
  error: PostgrestError | null | string;
  message?: string;
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
    // this is called by user then they click clear-trash button in UI , hence user_id is being checked
    // this part needs the access_token check as its called from UI and in a userbased action
    if (!isAccessTokenAuthenticated(req.body.access_token)) {
      res.status(500).json({ data: null, error: 'invalid access token' });
      return;
    }
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
    // this step does not need access token as its called from workflow
    // only if bookmark is older than 30 days fron current date - TODO
    const { data, error } = await supabase
      .from(MAIN_TABLE_NAME)
      .select('*')
      .match({ trash: true });

    if (!isNull(data)) {
      const toBeDeletedIds = data
        ?.filter((item) => {
          if (differenceInDays(new Date(), new Date(item?.inserted_at)) >= 29) {
            return true;
          }
        })
        ?.map((item) => {
          return item?.id;
        });

      if (!isEmpty(toBeDeletedIds)) {
        const { data: delData, error: delError } = await supabase
          .from(MAIN_TABLE_NAME)
          .delete()
          .in('id', toBeDeletedIds);

        if (!isNull(delError)) {
          res.status(500).json({ data: delData, error: delError });
        } else {
          res.status(200).json({
            data: delData,
            error: delError,
            message: 'CRON success , bookmarks older than 30days deleted',
          });
        }

        return;
      }

      res.status(200).json({
        data: null,
        error: null,
        message: 'No bookmarks older than 30 days to delete',
      });
    } else {
      res.status(500).json({ data, error });
    }
  }
}
