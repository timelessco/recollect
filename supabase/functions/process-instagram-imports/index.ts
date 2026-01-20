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

// Keep in sync with src/utils/constants.ts INSTAGRAM_IMPORTS_QUEUE
const QUEUE_NAME = "instagram_imports";
const BATCH_SIZE = 5;
const VISIBILITY_TIMEOUT = 30; // seconds
const MAX_RETRIES = 3;

interface QueueMessage {
	msg_id: number;
	read_ct: number;
	message: {
		url: string;
		type: string;
		title: string;
		description: string;
		ogImage: string | null;
		meta_data: Record<string, unknown>;
		user_id: string;
		saved_at: string | null;
	};
}

type ProcessResult =
	| { type: "processed" }
	| { type: "archived"; reason: string }
	| { type: "skipped"; reason: string }
	| { type: "retry"; reason: string };

// URL validation
function isValidInstagramUrl(url: string): boolean {
	try {
		const parsed = new URL(url);
		return (
			parsed.hostname === "instagram.com" ||
			parsed.hostname === "www.instagram.com"
		);
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

// Safely extract collection names from meta_data
function extractCollectionNames(metaData: unknown): string[] {
	if (typeof metaData !== "object" || metaData === null) {
		return [];
	}

	const md = metaData as Record<string, unknown>;
	if (!Array.isArray(md.saved_collection_names)) {
		return [];
	}

	return md.saved_collection_names.filter(
		(name): name is string => typeof name === "string",
	);
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
		Sentry.captureException(
			new Error(`Instagram import failed after ${MAX_RETRIES} retries`),
			{
				extra: { msg_id, bookmark, read_ct },
				tags: { operation: "instagram_import_archived" },
			},
		);

		const { error: archiveError } = await supabase.rpc("archive_with_reason", {
			p_queue_name: QUEUE_NAME,
			p_msg_id: msg_id,
			p_reason: "max_retries_exceeded",
		});

		if (archiveError) {
			Sentry.captureException(new Error("Queue archive failed"), {
				extra: { msg_id, archiveError },
			});
			return { type: "retry", reason: "archive_failed" };
		}

		return { type: "archived", reason: "max_retries" };
	}

	// Validate URL - archive invalid URLs immediately (fail fast)
	if (!isValidInstagramUrl(bookmark.url)) {
		Sentry.captureMessage("Invalid Instagram URL archived", {
			extra: { msg_id, url: bookmark.url },
			level: "warning",
		});

		const { error: archiveError } = await supabase.rpc("archive_with_reason", {
			p_queue_name: QUEUE_NAME,
			p_msg_id: msg_id,
			p_reason: "invalid_url",
		});

		if (archiveError) {
			Sentry.captureException(
				new Error("Queue archive failed for invalid URL"),
				{
					extra: { msg_id, archiveError, url: bookmark.url },
				},
			);
			return { type: "retry", reason: "archive_failed" };
		}

		return { type: "archived", reason: "invalid_url" };
	}

	// Extract collection names
	const collectionNames = extractCollectionNames(bookmark.meta_data);

	// Call RPC for atomic processing
	const { error: rpcError } = await supabase.rpc("process_instagram_bookmark", {
		p_url: bookmark.url,
		p_user_id: bookmark.user_id,
		p_type: bookmark.type,
		p_title: bookmark.title ?? "",
		p_description: bookmark.description ?? "",
		p_og_image: bookmark.ogImage,
		p_meta_data: bookmark.meta_data,
		p_collection_names: collectionNames,
		p_msg_id: msg_id,
		p_saved_at: bookmark.saved_at,
	});

	if (rpcError) {
		console.error(`RPC error for message ${msg_id}:`, rpcError);
		return { type: "retry", reason: "rpc_error" };
	}

	console.log(`Processed message ${msg_id} successfully`);
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

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

	if (!supabaseUrl || !serviceRoleKey) {
		return Response.json(
			{ error: "Missing environment configuration" },
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}

	// Verify service role JWT - validate token against service role key
	const authHeader = req.headers.get("Authorization");
	if (!authHeader?.startsWith("Bearer ")) {
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
			console.error("Queue read error:", readError);
			throw readError;
		}

		if (!messages || messages.length === 0) {
			return Response.json(
				{ processed: 0, archived: 0, message: "Queue empty" },
				{ status: 200, headers: { "Content-Type": "application/json" } },
			);
		}

		// Validate messages and count invalid ones
		const validMessages = messages.filter(isQueueMessage);
		const invalidCount = messages.length - validMessages.length;

		if (invalidCount > 0) {
			Sentry.captureMessage(`${invalidCount} invalid queue message shapes`, {
				extra: { invalidCount, totalMessages: messages.length },
				level: "warning",
			});
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
					tags: { operation: "instagram_import_error" },
				});
			}
		}

		return Response.json(
			{ processed, archived, skipped, retry },
			{
				status: 200,
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("Worker error:", error);
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
