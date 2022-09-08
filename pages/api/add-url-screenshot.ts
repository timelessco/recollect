// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';
import { decode } from 'base64-arraybuffer';
import axios from 'axios';
import { MAIN_TABLE_NAME, SCREENSHOT_API } from '../../utils/constants';
import { isNull } from 'lodash';
import { SingleListData } from '../../types/apiTypes';
import { PostgrestError } from '@supabase/supabase-js';

type Data = {
  data: SingleListData[] | null;
  error: PostgrestError | null;
};

const upload = async (base64data: string) => {
  const imgName = `img${Math.random()}.jpg`;

  const {} = await supabase.storage
    .from('bookmarks')
    .upload(`public/${imgName}`, decode(base64data), {
      contentType: 'image/jpg',
    });

  const { publicURL } = await supabase.storage
    .from('bookmarks')
    .getPublicUrl(`public/${imgName}`);

  return publicURL;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const {} = supabase.auth.setAuth(req.body.access_token);

  // screen shot api call
  const screenShotRes = await axios.get(`${SCREENSHOT_API}${req.body.url}`, {
    responseType: 'arraybuffer',
  });

  const base64data = Buffer.from(screenShotRes.data, 'binary').toString(
    'base64'
  );

  const publicURL = await upload(base64data);

  const { data, error } = await supabase
    .from(MAIN_TABLE_NAME)
    .update({ ogImage: publicURL })
    .match({ id: req.body.id });

  if (isNull(error)) {
    res.status(200).json({ data: data, error: null });
  } else {
    res.status(500).json({ data: null, error: error });
  }
}