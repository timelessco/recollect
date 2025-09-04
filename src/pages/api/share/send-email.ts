// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import { type NextApiRequest, type NextApiResponse } from "next";
import { Resend } from "resend";
import { z } from "zod";

const EmailRequestSchema = z.object({
	emailList: z.string().email(),
	url: z.string().url(),
});

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
					<html>
						<body style="font-family:Arial,Helvetica,sans-serif;background:#f9fafb;padding:20px;">
							<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:auto;background:#ffffff;border-radius:8px;padding:24px;">
								<tr>
									<td>
										<h2 style="margin:0 0 12px 0;font-size:18px;color:#111827;">Recollect Invite</h2>
										<p style="margin:0 0 16px 0;font-size:14px;color:#374151;">
											A user has shared a collection of bookmarks with you.
										</p>
										<center style="margin:0 0 20px 0;">
											<a href="${data.url}" 
												style="display:inline-block;padding:10px 16px;background:black;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;">
												View Collection
											</a>
										</center>
									</td>
								</tr>
							</table>
						</body>
					</html>
				`,
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
