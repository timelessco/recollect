// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next';
// import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
// import jwt_decode from 'jwt-decode';

type Data = {
  url: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const emailList = req.body.emailList;
  const hostUrl = req?.body?.hostUrl;
  const category_id = req?.body?.category_id;
  const edit_access = req?.body?.edit_access;

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
    { email: emailList[0], category_id: category_id, edit_access: edit_access },
    'shhhhh'
  );
  const url = `${hostUrl}/api/invite?token=${token}`;

  res.status(200).json({ url: url });
}
