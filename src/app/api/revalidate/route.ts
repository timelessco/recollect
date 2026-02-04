import { revalidatePath } from "next/cache";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { createPostApiHandler } from "@/lib/api-helpers/create-handler";
import { apiWarn } from "@/lib/api-helpers/response";

const ROUTE = "revalidate";

const RevalidateInputSchema = z.object({
	path: z.string().min(1, "Path is required"),
});

export type RevalidateInput = z.infer<typeof RevalidateInputSchema>;

const RevalidateOutputSchema = z.object({
	revalidated: z.boolean(),
});

export type RevalidateOutput = z.infer<typeof RevalidateOutputSchema>;

// Create handler once at module load time
const baseHandler = createPostApiHandler({
	route: ROUTE,
	inputSchema: RevalidateInputSchema,
	outputSchema: RevalidateOutputSchema,
	handler: async ({ input, route }) => {
		const { path } = input;

		console.log(`[${route}] Revalidating path:`, { path });

		// revalidatePath is synchronous and doesn't throw in normal operation
		// It purges the cache for the specified path
		revalidatePath(path);

		console.log(`[${route}] Successfully revalidated:`, { path });
		return { revalidated: true };
	},
});

// Wrap with Bearer token validation
// The standard factory is designed for user auth, so we validate the token manually
export const POST = async (request: NextRequest) => {
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

	// Token is valid, proceed with the handler
	return await baseHandler(request);
};
