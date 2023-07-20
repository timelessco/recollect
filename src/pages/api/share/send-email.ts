// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

// import nodemailer from 'nodemailer';

import { type NextRequest } from "next/server";
import Email from "vercel-email";

export default async function handler(request: NextRequest) {
	const data = await request.json();

	console.warn("dddd", data.emailList, data.url);

	const response: unknown = await Email.send({
		to: data.emailList,
		from: "noreply@laterpad.tmls.dev",
		subject: "Laterpad Invite",
		text: `Please click on this invite link to join the category ${data.url}`,
	});

	console.warn("res", response);
}

export const config = {
	runtime: "edge",
};
