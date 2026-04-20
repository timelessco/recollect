import fs from "node:fs";
import path from "node:path";

import { Resend } from "resend";

import { env } from "@/env/server";
import { RecollectApiError } from "@/lib/api-helpers/errors";
import { escapeHtml } from "@/lib/email/escape-html";

const EMAIL_FROM = "admin@share.recollect.so";
const LOG_PREFIX = "[send-invite-email]";

export interface SendInviteEmailProps {
  categoryName: string;
  displayName: string;
  inviteUrl: string;
  recipientEmail: string;
}

export interface SendInviteEmailResult {
  id: string;
}

const filePath = path.join(process.cwd(), "public", "logo.png");
const base64Logo = fs.readFileSync(filePath).toString("base64");

function buildEmailHtml(props: { categoryName: string; displayName: string; inviteUrl: string }) {
  const categoryName = escapeHtml(props.categoryName);
  const displayName = escapeHtml(props.displayName);
  const inviteUrl = escapeHtml(props.inviteUrl);

  return `<!DOCTYPE html>
<html lang="en">
	<body style="margin:0; background:#ececec; font-family:-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; text-align:center; -webkit-font-smoothing:antialiased;">
		<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
			<tr>
				<td align="center" style="padding:48px 16px;">
					<div style="margin-bottom:24px;">
						<img src="cid:logo" width="20" height="24" style="display:block;" alt="logo"/>
					</div>
					<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:20px; box-shadow:0 1px 12px rgba(0,0,0,0.06);">
						<tr>
							<td style="padding:56px 48px 48px 48px; text-align:center;">
								<h1 style="font-family:-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-weight:600; font-size:20px; line-height:28px; color:#111111; margin:0 0 12px 0;">
									You have been invited to a collection
								</h1>
								<p style="font-family:-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-weight:400; font-size:16px; line-height:100%; color:#6b6b6b; margin:0 0 32px 0;">
									<span style="color:#323232; font-weight:500;">${displayName}</span> has invited you to join the <span style="color:#000000; font-weight:600;">${categoryName}</span> collection
								</p>
								<a href="${inviteUrl}" style="display:inline-block; background:#000; color:#ffffff; padding:7px 10px; border-radius:12px; text-decoration:none; font-size:14px; font-weight:500;">
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
</html>`;
}

/**
 * Sends a collaboration invite email via Resend.
 *
 * This is a shared function used by both:
 * - POST /api/v2/share/send-email (thin wrapper via createPostApiHandler)
 * - POST /api/v2/share/send-collaboration-email (direct import, Plan 10-05)
 *
 * When RESEND_KEY is not configured (e.g. local dev), logs a warning and
 * returns a sentinel value instead of throwing.
 */
export async function sendInviteEmail(props: SendInviteEmailProps): Promise<SendInviteEmailResult> {
  const { categoryName, displayName, inviteUrl, recipientEmail } = props;

  const resendKey = env.RESEND_KEY;
  if (!resendKey) {
    console.warn(`${LOG_PREFIX} RESEND_KEY not configured, skipping`);
    return { id: "skipped-no-resend-key" };
  }

  const resend = new Resend(resendKey);
  const html = buildEmailHtml({ categoryName, displayName, inviteUrl });

  const { data, error } = await resend.emails.send({
    attachments: [
      {
        content: base64Logo,
        contentId: "logo",
        contentType: "image/png",
        filename: "logo.png",
      },
    ],
    from: EMAIL_FROM,
    html,
    subject: "Collections from recollect",
    to: recipientEmail,
  });

  if (error) {
    throw new RecollectApiError("service_unavailable", {
      cause: error,
      message: "Failed to send invite email",
      operation: "send_invite_email",
      context: { categoryName, recipientEmail },
    });
  }

  if (!data) {
    throw new RecollectApiError("service_unavailable", {
      message: "Resend returned no data and no error",
      operation: "send_invite_email",
      context: { categoryName, recipientEmail },
    });
  }

  console.log(`${LOG_PREFIX} Sent invite email:`, {
    categoryName,
    id: data.id,
    recipientEmail,
  });

  return { id: data.id };
}
