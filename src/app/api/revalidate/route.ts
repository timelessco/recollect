import { revalidatePath } from "next/cache";
import { type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";

import { createPostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiError, apiWarn } from "@/lib/api-helpers/response";

const ROUTE = "revalidate";

const RevalidateInputSchema = z.object({
	path: z.string().min(1, "Path is required"),
});

export type RevalidateInput = z.infer<typeof RevalidateInputSchema>;

const RevalidateOutputSchema = z.object({
	revalidated: z.boolean(),
});

export type RevalidateOutput = z.infer<typeof RevalidateOutputSchema>;

// Manual Bearer token validation wrapper
// The standard factory is designed for user auth, so we validate the token before invoking the handler
const validateRevalidateToken = (request: NextRequest) => {
	const authHeader = request.headers.get("authorization");
	const token = authHeader?.replace("Bearer ", "");

	if (!token || token !== process.env.REVALIDATE_SECRET_TOKEN) {
		console.warn(`[${ROUTE}] Invalid revalidation token attempt`, {
			hasToken: Boolean(token),
		});
		return apiWarn({
			route: ROUTE,
			message: "Invalid token",
			status: 401,
			context: { hasToken: Boolean(token) },
		});
	}

	return null;
};

export const POST = async (request: NextRequest) => {
	// Validate Bearer token before invoking the handler factory
	const tokenError = validateRevalidateToken(request);
	if (tokenError) {
		return tokenError;
	}

	// Create handler with factory pattern
	const handler = createPostApiHandler({
		route: ROUTE,
		inputSchema: RevalidateInputSchema,
		outputSchema: RevalidateOutputSchema,
		handler: async ({ input, route }) => {
			const { path } = input;

			console.log(`[${route}] Revalidating path:`, { path });

			try {
				// This should be the actual path not a rewritten path
				// e.g. for "/public/[user_name]/[id]" this should be "/public/john/my-category"
				revalidatePath(path);

				console.log(`[${route}] Successfully revalidated:`, { path });
				return { revalidated: true };
			} catch (error) {
				console.error(`[${route}] Error revalidating:`, { error, path });
				Sentry.captureException(error, {
					tags: {
						operation: "revalidate_path",
						context: "isr",
					},
					extra: { path },
				});

				return apiError({
					route,
					message: "Error revalidating",
					error,
					operation: "revalidate_path",
					extra: { path },
				});
			}
		},
	});

	return await handler(request);
};
