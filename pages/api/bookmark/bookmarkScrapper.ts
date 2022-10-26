// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from 'axios';
// import { decode } from 'base64-arraybuffer';
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../utils/supabaseClient';
import jwt from 'jsonwebtoken';

interface SuccessResponse {
  key: 'success';
  data: FinalResponse | null;
}

interface ErrorResponse {
  key: 'error';
  err: string;
}

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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// const upload = async (base64data: string) => {
//   const imgName = `img${Math.random()}.jpg`;

//   const { data, error } = await supabase.storage
//     .from('bookmarks')
//     .upload(`public/${imgName}`, decode(base64data), {
//       contentType: 'image/jpg',
//     });
//   console.log('error ', error, data);

//   const { publicURL } = await supabase.storage
//     .from('bookmarks')
//     .getPublicUrl(`public/${imgName}`);

//   return publicURL;
// };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  const {} = supabase.auth.setAuth(req.body.access_token);
  // eslint-disable-next-line prefer-const
  let finalData = {} as FinalResponse;

  await jwt.verify(
    req.body.access_token as string,
    process.env.SUPABASE_JWT_SECRET_KEY as string,
    function (err) {
      if (err) {
        res.status(500).json({ key: 'error', err: 'Invalid token' });
        return;
      }
    }
  );

  try {
    // scrapper api call
    const apiRes = await axios.post(
      'https://link-preview-livid-ten.vercel.app/api/getUrlData',
      {
        url: req.body.url,
      }
    );

    finalData.scrapperData = apiRes.data;

    // TODO : uncomment after screenshot api is fixed
    // screen shot api call
    // const screenShotRes = await axios.get(
    //   `https://s.vercel.app/api?url=${req.body.url}`,
    //   {
    //     responseType: 'arraybuffer',
    //   }
    // );

    // const base64data = Buffer.from(screenShotRes.data, 'binary').toString(
    //   'base64'
    // );

    // const publicURL = await upload(base64data);

    // finalData.screenShot = publicURL as string;

    // meta api
    const metaApiRes = await axios.get(
      `https://metagrabber.vercel.app/api?url=${req.body.url}`
    );

    finalData.metaData = metaApiRes.data;

    res.status(200).json({ key: 'success', data: finalData });
  } catch (e) {
    res.status(500).json({ key: 'error', err: `error ${e}` });
  }
}
