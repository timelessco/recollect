/**
 * @module Build-time only
 *
 * Per-path server overrides for Supabase Edge Function endpoints.
 * Scalar uses these to send requests to the correct host instead of
 * resolving relative to the page origin.
 */
export const edgeFunctionServers = [
	{
		url: "http://127.0.0.1:54321/functions/v1",
		description: "Local",
	},
	{
		url: "https://cjsdfdveobrpffjbkpca.supabase.co/functions/v1",
		description: "Dev",
	},
	{
		url: "https://fgveraehgourpwwzlzhy.supabase.co/functions/v1",
		description: "Prod",
	},
];
