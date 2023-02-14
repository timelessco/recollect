// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// import nodemailer from 'nodemailer';
import jwt from "jsonwebtoken";
import type { NextApiResponse } from "next";

import type {
  NextAPIReq,
  SendCollaborationEmailInviteApiPayload,
} from "../../../types/apiTypes";

// import jwt_decode from 'jwt-decode';

/**
 * Builds invite link for a user to be added as colaborator and sends it via email
 */

type Data = {
  url: string | null;
  error: string | null | jwt.VerifyErrors;
};

export default function handler(
  req: NextAPIReq<SendCollaborationEmailInviteApiPayload>,
  res: NextApiResponse<Data>,
) {
  jwt.verify(
    req.body.access_token,
    process.env.SUPABASE_JWT_SECRET_KEY,
    function (err) {
      if (err) {
        res.status(500).json({ url: null, error: err });
        throw new Error("ERROR");
      }
    },
  );

  const { emailList } = req.body;
  const hostUrl = req?.body?.hostUrl;
  const categoryId = req?.body?.category_id;
  const editAccess = req?.body?.edit_access;
  const userId = req?.body?.userId;

  // console.log('emails', emailList);

  // const transporter = nodemailer.createTransport({
  //   service: 'gmail',
  //   host: 'domain',
  //   port: 587,
  //   secure: false, // use SSL
  //   debug: true,
  //   auth: {
  //     user: 'abhishek@timeless.co',
  //     pass: '',
  //   },
  // });

  // const mailOptions = {
  //   from: 'abhishek@timeless.co',
  //   to: 'abhishekmg.12@gmail.com',
  //   subject: 'Sending Email using Node.js',
  //   text: 'That was easy!',
  // };

  // transporter.sendMail(mailOptions, function (error, info) {
  //   if (error) {
  //     console.log('err',  error);
  //   } else {
  //     console.log('Email sent: ' + info.response);
  //   }
  // });
  const token = jwt.sign(
    {
      email: emailList[0],
      category_id: categoryId,
      edit_access: editAccess,
      userId,
    },
    "shhhhh",
  );
  const url = `${hostUrl}/api/invite?token=${token}`;

  res.status(200).json({ url, error: null });
}
