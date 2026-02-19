import fs from "node:fs";
import path from "node:path";
import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

const EMAIL_FROM = "admin@share.recollect.so";
const LOG_PREFIX = "[send-collection-deleted-notification]";

export interface SendCollectionDeletedNotificationProps {
	categoryName: string;
	collaboratorEmails: string[];
	ownerDisplayName: string;
}

const resendKey = process.env.RESEND_KEY;
const resend = new Resend(resendKey);

const filePath = path.join(process.cwd(), "public", "logo.png");
const base64Logo = fs.readFileSync(filePath).toString("base64");

export async function sendCollectionDeletedNotification(
	props: SendCollectionDeletedNotificationProps,
) {
	if (process.env.NODE_ENV === "development") {
		console.log(`${LOG_PREFIX} Dev mode - skipped:`, props);
		return;
	}

	const { categoryName, collaboratorEmails, ownerDisplayName } = props;

	if (!resendKey) {
		console.warn(`${LOG_PREFIX} RESEND_KEY not configured, skipping`);
		return;
	}

	const subject = `Collection "${categoryName}" was deleted`;
	const html = buildEmailHtml({ categoryName, ownerDisplayName });

	const results = await Promise.allSettled(
		collaboratorEmails.map((email) =>
			resend.emails.send({
				from: EMAIL_FROM,
				to: email,
				subject,
				html,
				attachments: [
					{
						filename: "logo.png",
						content: base64Logo,
						contentType: "image/png",
						contentId: "logo",
					},
				],
			}),
		),
	);

	for (const result of results) {
		if (result.status === "rejected") {
			console.error(`${LOG_PREFIX} Send error:`, result.reason);
			Sentry.captureException(result.reason, {
				tags: { operation: "send_collection_deleted_notification" },
				extra: { categoryName },
			});
		}
	}

	console.log(`${LOG_PREFIX} Sent:`, {
		categoryName,
		recipientCount: collaboratorEmails.length,
	});
}

interface BuildEmailHtmlProps {
	categoryName: string;
	ownerDisplayName: string;
}

function buildEmailHtml(props: BuildEmailHtmlProps) {
	const { categoryName, ownerDisplayName } = props;

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
									A collection you collaborated on was deleted
								</h1>
								<p style="font-family:-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; font-weight:400; font-size:16px; line-height:24px; color:#6b6b6b; margin:0 0 32px 0;">
									The collection <span style="color:#000000; font-weight:600;">${categoryName}</span> you were a collaborator on was deleted by <span style="color:#323232; font-weight:500;">${ownerDisplayName}</span>. All your bookmarks have been moved to Everything.
								</p>
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
