import * as Sentry from "@sentry/nextjs";

/**
 * Log cache misses with dev console warning and Sentry breadcrumb.
 * Provides observability for silent cache update failures.
 * @param context - Context label (e.g., "Cache Update", "Optimistic Update")
 * @param message - Descriptive message about the cache miss
 * @param data - Additional data to include in the log
 */
export function logCacheMiss(
	context: string,
	message: string,
	data: Record<string, unknown>,
): void {
	if (process.env.NODE_ENV === "development") {
		console.warn(`[${context}] ${message}`, data);
	}

	Sentry.addBreadcrumb({
		category: context.toLowerCase().replaceAll(/\s+/gu, "-"),
		message,
		level: "warning",
		data,
	});
}
