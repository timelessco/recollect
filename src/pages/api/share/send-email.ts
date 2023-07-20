// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// import nodemailer from 'nodemailer';

import { type NextRequest } from "next/server";
import Email from "vercel-email";

export default async function handler(request: NextRequest) {
	const data = await request.json();

	await Email.send({
		to: data.emailList,
		from: "noreply@laterpad.tmls.dev",
		subject: "Laterpad Invite",
		text: `Please click on this invite link to join the category ${data?.url}`,
	});
}

export const config = {
	runtime: "edge",
};
