// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from 'axios';
import { decode } from 'base64-arraybuffer';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../utils/supabaseClient';

type Data = {
  data: FinalResponse;
};

type scrapperDataTypes = {
  OgImage: string;
  description: string;
  favIcon: string;
  images: Array<string>;
  title: string;
  url: string;
};

type metaDataTypes = {
  title: string;
  description: string;
  url: string;
  image: string;
  success: boolean;
};

interface FinalResponse {
  scrapperData: scrapperDataTypes;
  screenShot: string;
  metaData: metaDataTypes;
}

// get screenshot from api
// put it in s3
// return that s3 url

/// just store the test in storage and check

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
  // eslint-disable-next-line prefer-const
  let finalData = {} as FinalResponse;

  try {
    // scrapper api call
    const apiRes = await axios.post(
      'https://link-preview-livid-ten.vercel.app/api/getUrlData',
      {
        url: req.body.url,
      }
    );

    finalData.scrapperData = apiRes.data;

    // screen shot api call
    const screenShotRes = await axios.get(
      `https://s.vercel.app/api?url=${req.body.url}`,
      {
        responseType: 'arraybuffer',
      }
    );

    const base64data = Buffer.from(screenShotRes.data, 'binary').toString(
      'base64'
    );

    const publicURL = await upload(base64data);

    finalData.screenShot = publicURL as string;

    // meta api
    const metaApiRes = await axios.get(
      `https://metagrabber.vercel.app/api?url=${req.body.url}`
    );

    finalData.metaData = metaApiRes.data;

    res.status(200).json({ data: finalData });
  } catch (e) {
    res.status(500).json({ err: `error ${e}` });
  }
}
