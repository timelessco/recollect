/**
 * @module Build-time only
 *
 * Type definitions for endpoint supplement data objects.
 * Supplements provide human-authored metadata (tags, summary, description,
 * security, examples) that gets merged onto auto-inferred schemas.
 */

export interface EndpointSupplement {
	path: string;
	method: string;
	tags?: string[];
	summary?: string;
	description?: string;
	security?: Array<Record<string, string[]>>;
	requestExample?: Record<string, unknown>;
	requestExamples?: Record<
		string,
		{ summary?: string; description?: string; value: unknown }
	>;
	responseExample?: Record<string, unknown>;
	responseExamples?: Record<
		string,
		{ summary?: string; description?: string; value: unknown }
	>;
	response400Example?: Record<string, unknown>;
	response400Examples?: Record<
		string,
		{ summary?: string; description?: string; value: unknown }
	>;
	additionalResponses?: Record<number, { description: string }>;
	parameterExamples?: Record<
		string,
		Record<string, { summary?: string; description?: string; value: unknown }>
	>;
}
