// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
import { decode } from 'base64-arraybuffer';
import axios from 'axios';
import { MAIN_TABLE_NAME, SCREENSHOT_API } from '../../../utils/constants';
import { isNull } from 'lodash';
import { SingleListData } from '../../../types/apiTypes';
import { createClient, PostgrestError } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

type Data = {
  data: SingleListData[] | null;
  error: PostgrestError | null | string | jwt.VerifyErrors;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // const {} = supabase.auth.setAuth(req.body.access_token);

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
    return;
  } else {
    res.status(500).json({ data: null, error: error });
    return;
  }
}
