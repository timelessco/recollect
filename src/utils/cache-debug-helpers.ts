import { clientLogger } from "@/lib/api-helpers/axiom-client";

/**
 * Log cache misses with dev console warning and a client-side Axiom wide event.
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
  // process.env used intentionally — NODE_ENV inlined by Next.js in shared utilities
  if (process.env.NODE_ENV === "development") {
    console.warn(`[${context}] ${message}`, data);
  }

  // clientLogger (not useLogger) because logCacheMiss runs inside React Query
  // mutation callbacks, which fire outside React's render cycle — hooks are
  // disallowed there. Flush relies on ProxyTransport's autoFlush batching.
  clientLogger.warn("cache_miss", {
    operation: "cache_miss",
    cache_context: context.toLowerCase().replaceAll(/\s+/gu, "-"),
    message,
    ...data,
  });
}
