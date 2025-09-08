// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import fs from "fs";
import path from "path";
import { type NextApiRequest, type NextApiResponse } from "next";
import { Resend } from "resend";
import { z } from "zod";

const EmailRequestSchema = z.object({
	emailList: z.string().email(),
	url: z.string().url(),
	display_name: z.string(),
	category_name: z.string(),
});

const filePath = path.join(process.cwd(), "public", "logo.png");
const base64Logo = fs.readFileSync(filePath).toString("base64");
export default async function handler(
	request: NextApiRequest,
	response: NextApiResponse,
) {
	if (request.method !== "POST") {
		response.status(405).json({ error: "Method not allowed" });
		return;
	}

	const parseResult = EmailRequestSchema.safeParse(request.body);

	if (!parseResult.success) {
		response.status(400).json({
			error: "Invalid request body",
			issues: parseResult.error.format(),
		});
		return;
	}

	const data = parseResult.data;

	const resend = new Resend(process.env.RESEND_KEY);

	try {
		const { data: emailResponse, error: emailError } = await resend.emails.send(
			{
				from: "admin@share.recollect.so",
				to: data.emailList,
				subject: "collections from recollect",
				html: `
				<!DOCTYPE html>
							<html lang="en">
							<body style="margin:0; padding:40px 0; background:#f3f4f6; font-family:'SF Pro Display','SF Pro Text','-apple-system',BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,sans-serif; text-align:center;">

									<div style="margin-bottom: 14px">
									<img src="cid:logo" width="16" height="20" />
									</div>
	
									<div style="background: white; border-radius: 16px; padding: 48px 40px; box-shadow: 0 6px 20px rgba(0,0,0,0.1); text-align: center; max-width: 600px; width: 100%; margin: 0 auto 14px auto;">
											<h1 style="font-size: 24px; font-weight: 600; color: #1f2937; margin-bottom: 16px; line-height: 1.3;">
													You have been invited to a collection
											</h1>
											<p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin-bottom: 32px;">
													<span style="color: #374151; font-weight: 500;">${data.display_name}</span> has invited you to join the 
													<span style="color: #1f2937; font-weight: 600;">${data.category_name}</span> collection
											</p>
											<a href="${data.url}" style="background: #000000; color: white; padding: 12px 28px; border-radius: 8px; font-size: 15px; font-weight: 500; text-decoration: none; display: inline-block;">
													Accept Invite
											</a>
									</div>
									
									<div style="color: #9ca3af; font-size: 14px; font-weight: 500;">
											recollect.so
									</div>
							</body>
				</html>
				`,
				attachments: [
					{
						filename: "logo.png",
						content: base64Logo,
						contentType: "image/png",
						contentId: "logo",
					},
				],
			},
		);

		if (emailError) {
			console.error("Email send error:", emailError);
			response.status(500).json({ data: `error: ${emailError.message}` });
		}

		response.status(200).json({ data: emailResponse });
	} catch (error) {
		response.status(500).json({ data: `error: ${error}` });
	}
}

// export const config = {
// 	runtime: "edge",
// };
