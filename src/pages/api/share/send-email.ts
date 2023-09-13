// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// import nodemailer from 'nodemailer';

import { type NextRequest, type NextResponse } from "next/server";
import Email from "vercel-email";

export default async function handler(
	request: NextRequest,
	response: NextResponse,
) {
	const data = await request.json();

	try {
		const emailResponse: unknown = await Email.send({
			to: data.emailList,
			from: "noreply@tmls.dev",
			subject: "Laterpad Invite",
			text: `Please click on this invite link to join the category ${data.url}`,
		});

		console.warn("res", emailResponse);
	} catch (error) {
		console.warn("email error", error);
	}
}

export const config = {
	runtime: "edge",
};
