// // Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// import axios from 'axios';
// import type { NextApiRequest, NextApiResponse } from 'next';
// import { addData } from '../../utils/supabaseCrudHelpers';

// type Data = {
//   name: string;
// };

// export default function handler(
//   req: NextApiRequest,
//   res: NextApiResponse<Data>
// ) {

//   const add = async () => {
//     const { data, error } = await addData(
//       { id: req.body.userId },
//       'testone'
//     );
//     console.log('api', data, error);

//     res.status(200).json({ data: data });
//   }

//   if (req.method === 'POST') {

//     add();

//     // axios
//     //   .post('https://link-preview-livid-ten.vercel.app/api/getUrlData', {
//     //     url: req.body.url,
//     //   })
//     //   .then(async (apiRes) => {
//     //     try {
//     //       // const { data, error } = await addData({ id: req.body.userId }, apiRes?.data?.title);
//     //       const { data, error } = await addData(
//     //         { id: req.body.userId },
//     //         'testone'
//     //       );

//     //       console.log('api', data, error);
//     //       if (data !== null) {
//     //         res.status(200).json({ data: data });
//     //       } else {
//     //         res.status(500).json({ error: `Supabase api fail ${error}` });
//     //       }
//     //     } catch (e) {
//     //       res.status(500).json({ error: `Supabase api fail ${e}` });
//     //     }
//     //   })
//     //   .catch((err) =>
//     //     res.status(500).json({ error: `Scrapper api error ${err}` })
//     //   );
//   }
// }

// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';

type Data = {
  name: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  res.status(200).json({ name: 'John Doe' });
}
