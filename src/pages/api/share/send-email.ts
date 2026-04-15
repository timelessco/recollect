// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import fs from "node:fs";
import path from "node:path";

import type { NextApiRequest, NextApiResponse } from "next";

import { Resend } from "resend";
import { z } from "zod";

import { env } from "@/env/server";

const EmailRequestSchema = z.object({
  category_name: z.string(),
  display_name: z.string(),
  emailList: z.email(),
  url: z.url(),
});

const filePath = path.join(process.cwd(), "public", "logo.png");
const base64Logo = fs.readFileSync(filePath).toString("base64");
export default async function handler(request: NextApiRequest, response: NextApiResponse) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed" });
    return;
  }

  const parseResult = EmailRequestSchema.safeParse(request.body);

  if (!parseResult.success) {
    response.status(400).json({
      error: "Invalid request body",
      issues: z.treeifyError(parseResult.error),
    });
    return;
  }

  const { data } = parseResult;

  const resend = new Resend(env.RESEND_KEY);

  try {
    const { data: emailResponse, error: emailError } = await resend.emails.send({
      attachments: [
        {
          content: base64Logo,
          contentId: "logo",
          contentType: "image/png",
          filename: "logo.png",
        },
      ],
      from: "admin@share.recollect.so",
      html: `
				<!DOCTYPE html>
				<html lang="en">
					<body style="margin:0; background:#ececec; font-family:-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; text-align:center; -webkit-font-smoothing:antialiased;">
						<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
							<tr>
								<td align="center" style="padding:48px 16px;">
									<div style="margin-bottom:24px;">
										<img src="cid:logo" width="20" height="24" style="display:block;" alt="logo"/>
									</div>
									<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:20px; box-shadow:0 1px 12px rgba(0,0,0,0.06);" class="card">
										<tr>
											<td style="padding:56px 48px 48px 48px; text-align:center;">
												<h1 class="title" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-weight: 600; font-size: 20px; line-height: 28px; letter-spacing: 0; text-align: center; color: #111111; margin: 0 0 12px 0;">
													You have been invited to a collection
												</h1>
												<p class="subtitle" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-weight: 400; font-size: 16px; line-height: 100%; letter-spacing: 0; text-align: center; color: #6b6b6b; margin: 0 0 32px 0;">
													<span style="color:#323232; font-weight:500;">${data.display_name}</span> has invited you to join the <span style="color:#000000; font-weight:600;">${data.category_name}</span> collection
												</p>
												<a href="${data.url}" class="button" style="display:inline-block; background:#000; color:#ffffff; padding:7px 10px; border-radius:12px; text-decoration:none; font-size:14px; font-weight:500;">
													Accept Invite
												</a>
											</td>
										</tr>
									</table>
									<div style="color:#707070; font-size:14px; font-weight:500; margin-top:20px;">
										recollect.so
									</div>
								</td>
							</tr>
						</table>
					</body>
				</html>
			`,
      subject: "Collections from recollect",
      to: data.emailList,
    });

    if (emailError) {
      console.error("Email send error:", emailError);
      response.status(500).json({ data: `error: ${emailError.message}` });
    }

    response.status(200).json({ data: emailResponse });
  } catch (error) {
    response.status(500).json({ data: `error: ${String(error)}` });
  }
}

// export const config = {
// 	runtime: "edge",
// };
