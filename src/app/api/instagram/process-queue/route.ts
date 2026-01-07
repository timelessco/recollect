import crypto from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { processImportsQueue } from "../../../../lib/api-helpers/instagram/worker";

import { apiError, apiSuccess } from "@/lib/api-helpers/response";
import { INSTAGRAM_QUEUE_NAMES } from "@/utils/constants";
import { createServiceClient } from "@/utils/supabaseClient";

const ROUTE = "instagram-process-queue";

const ProcessQueueResponseSchema = z.object({
	success: z.boolean(),
	message: z.string(),
	messageId: z.number().nullable().optional(),
});

export type ProcessQueueResponse = z.infer<typeof ProcessQueueResponseSchema>;

export async function POST(request: NextRequest) {
	const queue_name = INSTAGRAM_QUEUE_NAMES.IMPORTS;
	const batchSize = 10;
	try {
		// Get the secret header that you manually configured in Supabase webhook
		const receivedSecret = request.headers.get("x-webhook-secret") || "";
		const expectedSecret = process.env.SUPABASE_WEBHOOK_SECRET_KEY;

		if (!expectedSecret) {
			console.error(
				"[instagram-process-queue] SUPABASE_WEBHOOK_SECRET_KEY not configured",
			);
			return Response.json(
				{ error: "Server configuration error" },
				{ status: 500 },
			);
		}

		// Use timing-safe comparison to prevent timing attacks
		const isValid =
			receivedSecret.length === expectedSecret.length &&
			crypto.timingSafeEqual(
				Buffer.from(receivedSecret),
				Buffer.from(expectedSecret),
			);

		if (!isValid) {
			console.error("[instagram-process-queue] Invalid webhook secret");
			return Response.json({ error: "Unauthorized" }, { status: 401 });
		}

		console.log(`[${ROUTE}] API called:`, {
			queue_name,
			batchSize,
		});

		const supabase = createServiceClient();

		const result = await processImportsQueue(supabase, {
			queue_name,
			batchSize,
		});

		const message = !result?.messageId
			? "Queue is empty or all queue items are processed"
			: `Queue Id: ${result.messageId} processed successfully`;

		console.log(`[${ROUTE}] ${message}`);

		return apiSuccess({
			route: ROUTE,
			data: {
				success: true,
				message,
				messageId: result?.messageId ?? null,
			},
			schema: ProcessQueueResponseSchema,
		});
	} catch (error) {
		return apiError({
			route: ROUTE,
			message: "Error processing queue",
			error,
			operation: "process_queue",
		});
	}
}
