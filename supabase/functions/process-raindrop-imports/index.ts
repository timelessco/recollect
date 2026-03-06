import * as Sentry from "@sentry/deno";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Initialize Sentry with proper configuration for Edge Functions
Sentry.init({
	dsn: Deno.env.get("SENTRY_DSN"),
	defaultIntegrations: false, // Required for Deno.serve scope limitations
	tracesSampleRate: 0.1,
	environment: Deno.env.get("SUPABASE_URL")?.includes("localhost")
		? "development"
		: "production",
});

Sentry.setTag("region", Deno.env.get("SB_REGION") ?? "unknown");
Sentry.setTag("execution_id", Deno.env.get("SB_EXECUTION_ID") ?? "unknown");

// Keep in sync with src/utils/constants.ts RAINDROP_IMPORTS_QUEUE
const QUEUE_NAME = "raindrop_imports";
const BATCH_SIZE = 15;
const VISIBILITY_TIMEOUT = 30; // seconds
const MAX_RETRIES = 3;
const SANITIZE_TIMEOUT = 5000; // 5s for HTTP calls

const BROWSER_USER_AGENT =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

interface QueueMessage {
	msg_id: number;
	read_ct: number;
	message: {
		bookmark_id: number;
		url: string;
		ogImage: string | null;
		raindrop_category_name: string | null;
		user_id: string;
		inserted_at?: string; // ISO datetime string
		// Error tracking
		last_error?: string;
		last_error_at?: string;
	};
}

interface SanitizedData {
	favicon: string | null;
	ogImage: string | null;
	mediaType: string | null;
}

type ProcessResult =
	| { type: "processed" }
	| { type: "archived"; reason: string }
	| { type: "skipped"; reason: string }
	| { type: "retry"; reason: string };

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
	if (typeof message.bookmark_id !== "number") {
		return false;
	}
	if (typeof message.url !== "string") {
		return false;
	}
	if (typeof message.user_id !== "string") {
		return false;
	}

	return true;
}

// Safely extract msg_id from raw pgmq message
function extractMsgId(msg: unknown): number | null {
	if (typeof msg !== "object" || msg === null) {
		return null;
	}
	const m = msg as Record<string, unknown>;
	return typeof m.msg_id === "number" ? m.msg_id : null;
}

// Fetch favicon URL from Google S2 service
async function fetchFavicon(url: string): Promise<string | null> {
	try {
		const { hostname } = new URL(url);
		const res = await fetch(
			`https://www.google.com/s2/favicons?sz=128&domain_url=${hostname}`,
			{ signal: AbortSignal.timeout(SANITIZE_TIMEOUT) },
		);
		return res.ok ? res.url : null;
	} catch {
		return null;
	}
}

// Validate ogImage URL returns an image content-type
async function validateOgImage(ogImage: string | null): Promise<string | null> {
	if (!ogImage) {
		return null;
	}

	try {
		const res = await fetch(ogImage, {
			method: "HEAD",
			signal: AbortSignal.timeout(SANITIZE_TIMEOUT),
			headers: { "User-Agent": BROWSER_USER_AGENT },
		});

		if (!res.ok) {
			return null;
		}

		const contentType = res.headers.get("content-type");
		return contentType?.includes("image/") ? ogImage : null;
	} catch {
		return null;
	}
}

// Detect media type of a URL via HEAD request
async function detectMediaType(url: string): Promise<string | null> {
	try {
		const res = await fetch(url, {
			method: "HEAD",
			signal: AbortSignal.timeout(SANITIZE_TIMEOUT),
			headers: { "User-Agent": BROWSER_USER_AGENT },
		});

		if (!res.ok) {
			return null;
		}

		return res.headers.get("content-type") ?? null;
	} catch {
		return null;
	}
}

// Sanitize a bookmark: favicon, ogImage validation, mediaType detection
async function sanitizeBookmark(
	url: string,
	ogImage: string | null,
): Promise<SanitizedData> {
	// Run all sanitization in parallel for speed
	const [favicon, validatedOgImage, mediaType] = await Promise.all([
		fetchFavicon(url),
		validateOgImage(ogImage),
		detectMediaType(url),
	]);

	return { favicon, ogImage: validatedOgImage, mediaType };
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

	// Sanitize bookmark via HTTP calls
	const sanitized = await sanitizeBookmark(bookmark.url, bookmark.ogImage);

	// Call RPC for atomic processing
	const { error: rpcError } = await supabase.rpc("process_raindrop_bookmark", {
		p_bookmark_id: bookmark.bookmark_id,
		p_user_id: bookmark.user_id,
		p_category_name: bookmark.raindrop_category_name,
		p_favicon: sanitized.favicon,
		p_og_image: sanitized.ogImage,
		p_media_type: sanitized.mediaType,
		p_inserted_at: bookmark.inserted_at || null,
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

	// Verify service role JWT
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

	const token = authHeader.slice(7);
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

	// Create client with service role
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
					retry++;
				}
			} else {
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
