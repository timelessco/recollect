/**
 * @module Build-time only
 *
 * Shared OpenAPI schema objects for Supabase Edge Function workers.
 */
export const workerResponseSchema = {
	type: "object" as const,
	properties: {
		processed: { type: "integer" as const },
		archived: { type: "integer" as const },
		skipped: { type: "integer" as const },
		retry: { type: "integer" as const },
		message: { type: "string" as const },
	},
	required: ["processed", "archived", "skipped", "retry"],
};
