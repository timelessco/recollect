import * as Sentry from "@sentry/deno";
import { createClient } from "@supabase/supabase-js";

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

const QUEUE_NAME = "q_instagram_imports";
const BATCH_SIZE = 10;
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
	};
}

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

	// Verify service role JWT
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

	const supabaseUrl = Deno.env.get("SUPABASE_URL");
	const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

	if (!supabaseUrl || !serviceRoleKey) {
		return Response.json(
			{ error: "Missing environment configuration" },
			{ status: 500, headers: { "Content-Type": "application/json" } },
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

		Sentry.addBreadcrumb({
			category: "queue",
			message: `Processing batch of ${messages.length} messages`,
			level: "info",
			data: { queue: QUEUE_NAME, batchSize: messages.length },
		});

		// Process each message
		for (const msg of messages as QueueMessage[]) {
			const { msg_id, read_ct, message: bookmark } = msg;

			try {
				// Check retry count
				if (read_ct > MAX_RETRIES) {
					console.warn(`Message ${msg_id} exceeded max retries, archiving`);

					Sentry.captureException(
						new Error(`Instagram import failed after ${MAX_RETRIES} retries`),
						{
							extra: { msg_id, bookmark, read_ct },
							tags: { operation: "instagram_import_archived" },
						},
					);

					await supabase.schema("pgmq_public").rpc("archive", {
						queue_name: QUEUE_NAME,
						message_id: msg_id,
					});

					archived++;
					continue;
				}

				// Validate URL
				if (!isValidInstagramUrl(bookmark.url)) {
					console.warn(`Invalid Instagram URL: ${bookmark.url}`);
					// Will retry, eventually archive
					continue;
				}

				// Extract collection names from meta_data
				const metaData = bookmark.meta_data as {
					saved_collection_names?: string[];
				};
				const collectionNames = metaData?.saved_collection_names ?? [];

				// Call RPC for atomic processing
				const { error: rpcError } = await supabase.rpc(
					"process_instagram_bookmark",
					{
						p_url: bookmark.url,
						p_user_id: bookmark.user_id,
						p_type: bookmark.type,
						p_title: bookmark.title ?? "",
						p_description: bookmark.description ?? "",
						p_og_image: bookmark.ogImage,
						p_meta_data: bookmark.meta_data,
						p_collection_names: collectionNames,
					},
				);

				if (rpcError) {
					console.error(`RPC error for message ${msg_id}:`, rpcError);
					// Leave message, will retry on next invocation
					continue;
				}

				// Success - delete message
				await supabase.schema("pgmq_public").rpc("delete", {
					queue_name: QUEUE_NAME,
					message_id: msg_id,
				});

				processed++;
				console.log(`Processed message ${msg_id} successfully`);
			} catch (error) {
				console.error(`Error processing message ${msg_id}:`, error);
				Sentry.captureException(error, {
					extra: { msg_id, bookmark },
					tags: { operation: "instagram_import_error" },
				});
				// Leave message for retry
			}
		}

		return Response.json(
			{ processed, archived },
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
