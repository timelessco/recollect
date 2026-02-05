import * as Sentry from "@sentry/deno";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Initialize Sentry with proper configuration for Edge Functions
Sentry.init({
	dsn: Deno.env.get("SENTRY_DSN"),
	defaultIntegrations: false, // Required for Deno.serve scope limitations
	tracesSampleRate: 0.1, // Lower in production for cost
	environment: Deno.env.get("SUPABASE_URL")?.includes("localhost")
		? "development"
		: "production",
});

// Set custom tags for tracing
Sentry.setTag("region", Deno.env.get("SB_REGION") ?? "unknown");
Sentry.setTag("execution_id", Deno.env.get("SB_EXECUTION_ID") ?? "unknown");

// Keep in sync with src/utils/constants.ts RAINDROP_IMPORTS_QUEUE
const QUEUE_NAME = "raindrop_imports";
const BATCH_SIZE = 5;
const VISIBILITY_TIMEOUT = 30; // seconds
const MAX_RETRIES = 3;

interface QueueMessage {
	msg_id: number;
	read_ct: number;
	message: {
		url: string;
		type: string;
		title: string | null;
		description: string | null;
		ogImage: string | null;
		category_name: string | null;
		meta_data: Record<string, unknown>;
		user_id: string;
		// Error tracking - populated when RPC fails, used when max_retries exceeded
		last_error?: string;
		last_error_at?: string;
	};
}

type ProcessResult =
	| { type: "processed" }
	| { type: "archived"; reason: string }
	| { type: "skipped"; reason: string }
	| { type: "retry"; reason: string };

// URL validation - Raindrop bookmarks can be any valid URL
function isValidUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return parsed.protocol === "https:" || parsed.protocol === "http:";
	} catch {
		return false;
	}
}

// Type guard for validating queue message structure
function isQueueMessage(msg: unknown): msg is QueueMessage {
	if (typeof msg !== "object" || msg === null) {
		return false;
	}

	const m = msg as Record<string, unknown>;
	if (typeof m.msg_id !== "number") {
		return false;
	}
	if (typeof m.read_ct !== "number") {
		return false;
	}
	if (typeof m.message !== "object" || m.message === null) {
		return false;
	}

	const message = m.message as Record<string, unknown>;
	if (typeof message.url !== "string") {
		return false;
	}
	if (typeof message.type !== "string") {
		return false;
	}
	if (typeof message.user_id !== "string") {
		return false;
	}

	return true;
}

// Safely extract msg_id from raw pgmq message (pgmq guarantees msg_id exists)
function extractMsgId(msg: unknown): number | null {
	if (typeof msg !== "object" || msg === null) {
		return null;
	}
	const m = msg as Record<string, unknown>;
	return typeof m.msg_id === "number" ? m.msg_id : null;
}

// Process a single queue message
async function processMessage(
	// deno-lint-ignore no-explicit-any
	supabase: SupabaseClient<any, any, any>,
	msg: QueueMessage,
): Promise<ProcessResult> {
	const { msg_id, read_ct, message: bookmark } = msg;

	// Check retry count
	if (read_ct > MAX_RETRIES) {
		const lastError = bookmark.last_error;
		const archiveReason = lastError
			? `max_retries_exceeded: ${lastError}`
			: "max_retries_exceeded";

		Sentry.captureException(
			new Error(`Raindrop import failed after ${MAX_RETRIES} retries`),
			{
				extra: { msg_id, bookmark, read_ct, lastError },
				tags: { operation: "raindrop_import_archived" },
			},
		);

		const { error: archiveError } = await supabase.rpc("archive_with_reason", {
			p_queue_name: QUEUE_NAME,
			p_msg_id: msg_id,
			p_reason: archiveReason,
		});

		if (archiveError) {
			console.error(
				`[raindrop-worker] Archive failed for msg ${msg_id}:`,
				archiveError,
			);
			Sentry.captureException(new Error("Queue archive failed"), {
				extra: { msg_id, archiveError },
			});
			return { type: "retry", reason: "archive_failed" };
		}

		console.log(
			`[raindrop-worker] Archived msg ${msg_id}: max_retries_exceeded`,
		);
		return { type: "archived", reason: "max_retries" };
	}

	// Validate URL - archive invalid URLs immediately (fail fast)
	if (!isValidUrl(bookmark.url)) {
		Sentry.captureMessage("Invalid Raindrop URL archived", {
			extra: { msg_id, url: bookmark.url },
			level: "warning",
		});

		const { error: archiveError } = await supabase.rpc("archive_with_reason", {
			p_queue_name: QUEUE_NAME,
			p_msg_id: msg_id,
			p_reason: "invalid_url",
		});

		if (archiveError) {
			console.error(
				`[raindrop-worker] Archive failed for invalid URL msg ${msg_id}:`,
				archiveError,
			);
			Sentry.captureException(
				new Error("Queue archive failed for invalid URL"),
				{
					extra: { msg_id, archiveError, url: bookmark.url },
				},
			);
			return { type: "retry", reason: "archive_failed" };
		}

		console.log(
			`[raindrop-worker] Archived msg ${msg_id}: invalid_url (${bookmark.url})`,
		);
		return { type: "archived", reason: "invalid_url" };
	}

	// Call RPC for atomic processing
	const { error: rpcError } = await supabase.rpc("process_raindrop_bookmark", {
		p_url: bookmark.url,
		p_user_id: bookmark.user_id,
		p_type: bookmark.type,
		p_title: bookmark.title ?? "",
		p_description: bookmark.description ?? "",
		p_og_image: bookmark.ogImage,
		p_meta_data: bookmark.meta_data,
		p_category_name: bookmark.category_name,
		p_msg_id: msg_id,
	});

	if (rpcError) {
		const errorDetail =
			typeof rpcError === "object" && rpcError !== null && "message" in rpcError
				? String(rpcError.message)
				: JSON.stringify(rpcError);

		// Store error in message for debugging when max_retries is exceeded
		await supabase.rpc("update_queue_message_error", {
			p_queue_name: QUEUE_NAME,
			p_msg_id: msg_id,
			p_error: errorDetail,
		});

		console.error(`[raindrop-worker] RPC error for msg ${msg_id}:`, rpcError);
		return { type: "retry", reason: "rpc_error" };
	}

	console.log(`[raindrop-worker] Processed msg ${msg_id} successfully`);
	return { type: "processed" };
}

Deno.serve(async (req) => {
	// Health check endpoint (GET)
	if (req.method === "GET") {
		return Response.json(
			{ status: "ok", queue: QUEUE_NAME },
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Only POST allowed for queue processing
	if (req.method !== "POST") {
		return new Response(null, {
			status: 405,
			headers: {
				Allow: "POST, GET",
				"Content-Type": "application/json",
			},
		});
	}

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

	if (!supabaseUrl || !serviceRoleKey) {
		return Response.json(
			{ error: "Missing environment configuration" },
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	console.log("[raindrop-worker] Request received");

	// Verify service role JWT - validate token against service role key
	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
		console.error("[raindrop-worker] Auth failed: missing Bearer token");
		return Response.json(
			{ error: "Unauthorized" },
			{
				status: 401,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Extract token and validate against service role key
	const token = authHeader.slice(7); // Remove "Bearer " prefix
	if (token !== serviceRoleKey) {
		console.error("[raindrop-worker] Auth failed: invalid service role key");
		return Response.json(
			{ error: "Unauthorized" },
			{
				status: 401,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Create client with service role (disables auth auto-refresh)
	const supabase = createClient(supabaseUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	});

	let processed = 0;
	let archived = 0;

	try {
		// Read messages from queue
		const { data: messages, error: readError } = await supabase
			.schema("pgmq_public")
			.rpc("read", {
				queue_name: QUEUE_NAME,
				sleep_seconds: VISIBILITY_TIMEOUT,
				n: BATCH_SIZE,
			});

		if (readError) {
			console.error("[raindrop-worker] Queue read error:", readError);
			throw readError;
		}

		if (!messages || messages.length === 0) {
			console.log("[raindrop-worker] Queue empty");
			return Response.json(
				{ processed: 0, archived: 0, message: "Queue empty" },
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// Validate messages and count invalid ones
		const validMessages = messages.filter(isQueueMessage);
		const invalidCount = messages.length - validMessages.length;

		// Archive invalid messages to prevent poison-message loops
		const invalidMessages = messages.filter((m: unknown) => !isQueueMessage(m));
		if (invalidMessages.length > 0) {
			const archiveResults = await Promise.allSettled(
				invalidMessages.map(async (msg: unknown) => {
					const msgId = extractMsgId(msg);
					if (msgId === null) {
						Sentry.captureMessage("Invalid message without msg_id", {
							extra: { rawMessage: JSON.stringify(msg).slice(0, 500) },
							level: "error",
						});
						return null;
					}

					const { error } = await supabase.rpc("archive_with_reason", {
						p_queue_name: QUEUE_NAME,
						p_msg_id: msgId,
						p_reason: "invalid_payload",
					});

					if (error) {
						Sentry.captureException(
							new Error("Failed to archive invalid message"),
							{
								extra: {
									msgId,
									error,
									rawMessage: JSON.stringify(msg).slice(0, 500),
								},
								tags: { operation: "archive_invalid_message" },
							},
						);
						return null;
					}

					return msgId;
				}),
			);

			// Count successfully archived
			const archivedInvalid = archiveResults.filter(
				(r) => r.status === "fulfilled" && r.value !== null,
			).length;

			archived += archivedInvalid;

			Sentry.captureMessage(
				`Archived ${archivedInvalid} invalid queue messages`,
				{
					extra: {
						invalidCount,
						archivedInvalid,
						totalMessages: messages.length,
					},
					level: "warning",
				},
			);
		}

		Sentry.addBreadcrumb({
			category: "queue",
			message: `Processing batch of ${validMessages.length} messages`,
			level: "info",
			data: {
				queue: QUEUE_NAME,
				batchSize: validMessages.length,
				invalidCount,
			},
		});

		// Process all messages in parallel
		const results = await Promise.allSettled(
			validMessages.map((msg: QueueMessage) => processMessage(supabase, msg)),
		);

		// Count results
		let skipped = 0;
		let retry = 0;
		for (const [i, result] of results.entries()) {
			if (result.status === "fulfilled") {
				const r = result.value;
				if (r.type === "processed") {
					processed++;
				} else if (r.type === "archived") {
					archived++;
				} else if (r.type === "skipped") {
					skipped++;
				} else if (r.type === "retry") {
					retry++; // Message stays in queue for next invocation
				}
			} else {
				// Promise rejected - count as retry (message stays in queue)
				retry++;
				const msg = validMessages[i];
				Sentry.captureException(result.reason, {
					extra: { msg_id: msg.msg_id },
					tags: { operation: "raindrop_import_error" },
				});
			}
		}

		console.log(
			`[raindrop-worker] Completed: processed=${processed}, archived=${archived}, skipped=${skipped}, retry=${retry}`,
		);

		return Response.json(
			{ processed, archived, skipped, retry },
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("[raindrop-worker] Unexpected error:", error);
		Sentry.captureException(error);
		// Flush Sentry before returning
		await Sentry.flush(2000);

		return Response.json(
			{ error: "Internal server error" },
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
});
