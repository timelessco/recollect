import { type NextApiRequest, type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";

const ROUTE = "revalidate";

type RevalidateResponse = {
	revalidated: boolean;
	message?: string;
};

export default async function handler(
	req: NextApiRequest,
	res: NextApiResponse<RevalidateResponse>,
) {
	// Only allow POST requests
	if (req.method !== "POST") {
		res.status(405).json({
			revalidated: false,
			message: "Method not allowed",
		});
		return;
	}

	// Check for secret to confirm this is a valid request
	const secret = req.headers.authorization?.replace("Bearer ", "");
	if (!secret || secret !== process.env.REVALIDATE_SECRET_TOKEN) {
		console.warn(`[${ROUTE}] Invalid revalidation token attempt`, {
			hasSecret: Boolean(secret),
			path: req.body.path,
		});
		res.status(401).json({
			revalidated: false,
			message: "Invalid token",
		});
		return;
	}

	try {
		const { path } = req.body as { path: string };

		if (!path) {
			res.status(400).json({
				revalidated: false,
				message: "Path is required",
			});
			return;
		}

		console.log(`[${ROUTE}] Revalidating path:`, { path });

		// This should be the actual path not a rewritten path
		// e.g. for "/public/[user_name]/[id]" this should be "/public/john/my-category"
		await res.revalidate(path);

		console.log(`[${ROUTE}] Successfully revalidated:`, { path });
		res.json({ revalidated: true });
	} catch (error) {
		console.error(`[${ROUTE}] Error revalidating:`, {
			error,
			path: req.body.path,
		});
		Sentry.captureException(error, {
			tags: {
				operation: "revalidate_path",
				context: "isr",
			},
			extra: { path: req.body.path },
		});
		// If there was an error, Next.js will continue
		// to show the last successfully generated page
		res.status(500).json({
			revalidated: false,
			message: "Error revalidating",
		});
	}
}
