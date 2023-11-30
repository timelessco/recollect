// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// import nodemailer from 'nodemailer';

import { type NextApiRequest, type NextApiResponse } from "next";
import sgMail from "@sendgrid/mail";

// import Email from "vercel-email";

export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	// const data = await request.json();

	const data = request.body;

	sgMail.setApiKey(process.env.SENDGRID_KEY as string);

	// try {
	// const emailResponse: unknown = await Email.send({
	// 	to: data.emailList,
	// 	from: "noreply@tmls.dev",
	// 	subject: "Laterpad Invite",
	// 	text: `Please click on this invite link to join the category ${data.url}`,
	// });

	// 	console.warn("res", emailResponse);
	// } catch (error) {
	// 	console.warn("email error", error);
	// }

	try {
		await sgMail.send({
			to: data.emailList,
			from: "abhishek@timeless.co",
			subject: "Recollect Invite",
			text: `Please click on this invite link to join the category ${data.url}`,
		});

		response.status(200).json({ data: "email sent" });
	} catch (error) {
		response.status(500).json({ data: `error: ${error}` });
	}
}

// export const config = {
// 	runtime: "edge",
// };
